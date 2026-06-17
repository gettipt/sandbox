const BASE = "/api";

export interface FilmInfo {
  title: string;
  year: number;
  duration: number;
  description: string;
  thumbnail: string;
  price: string;
  currency: string;
}

export interface StreamResult {
  url: string;
  title: string;
  year: number;
  duration: number;
}

export async function fetchFilmInfo(): Promise<FilmInfo> {
  const res = await fetch(`${BASE}/theater/info`);
  if (!res.ok) throw new Error("Failed to fetch film info");
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const body = await res.text();
    if (body.startsWith("<!DOCTYPE") || body.startsWith("<html")) {
      throw new Error(
        "API returned HTML instead of JSON. Ensure api-server is running and /api is proxied to it.",
      );
    }
  }
  return res.json();
}

export async function probeExtension(timeoutMs = 1500): Promise<boolean> {
  console.log("[mpp] probeExtension: sending mpp:extension request event");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("mpp:extension", handler);
      console.log("[mpp] probeExtension: timed out — no extension response");
      resolve(false);
    }, timeoutMs);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === "response") {
        clearTimeout(timer);
        window.removeEventListener("mpp:extension", handler);
        console.log("[mpp] probeExtension: extension responded", detail);
        resolve(true);
      }
    };

    window.addEventListener("mpp:extension", handler);
    window.dispatchEvent(
      new CustomEvent("mpp:extension", {
        detail: {
          type: "request",
          paymentMethods: ["lightning"],
          intents: ["charge"],
        },
      })
    );
  });
}

function parseWwwAuthField(header: string, name: string): string | undefined {
  return header.match(new RegExp(`${name}="([^"]+)"`))?.[1];
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mpp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function unlockStream(): Promise<StreamResult> {
  console.log("[mpp] step 1 — requesting stream (expecting 402)");
  const r1 = await fetch(`${BASE}/theater/stream`);
  console.log("[mpp] step 1 response:", r1.status);

  if (r1.ok) {
    console.log("[mpp] stream already unlocked");
    return r1.json();
  }
  if (r1.status !== 402) {
    throw new Error(`Unexpected response: ${r1.status}`);
  }

  const wwwAuth = r1.headers.get("WWW-Authenticate");
  console.log("[mpp] step 2 — WWW-Authenticate:", wwwAuth);
  if (!wwwAuth) throw new Error("No payment challenge in server response");

  const id      = parseWwwAuthField(wwwAuth, "id");
  const method  = parseWwwAuthField(wwwAuth, "method") ?? "lightning";
  const realm   = parseWwwAuthField(wwwAuth, "realm") ?? "";
  const reqB64  = parseWwwAuthField(wwwAuth, "request");
  const expires = parseWwwAuthField(wwwAuth, "expires");

  console.log("[mpp] step 2 — parsed fields: id:", id, "| method:", method, "| realm:", realm, "| expires:", expires, "| request length:", reqB64?.length);
  if (!id || !reqB64) throw new Error("Could not parse id/request from WWW-Authenticate");

  let invoice: string;
  let amountSats: number | undefined;
  try {
    const payload = JSON.parse(atob(reqB64));
    console.log("[mpp] step 2 — decoded request payload:", payload);
    invoice = payload.methodDetails?.invoice;
    const amt = payload.amount;
    if (amt && /^\d+$/.test(String(amt))) amountSats = Number(amt);
  } catch {
    throw new Error("Could not decode payment challenge payload");
  }

  if (!invoice) throw new Error("No BOLT11 invoice in payment challenge");
  console.log("[mpp] step 2 — invoice:", invoice, "| amountSats:", amountSats);

  const requestId = randomId();
  const challengeDetail = {
    requestId,
    invoice,
    amountSats,
    scheme: "Payment" as const,
    challenge: {
      id,
      realm,
      method,
      intent: "charge",
      request: reqB64,
      expires,
    },
  };

  console.log("[mpp] step 3 — dispatching mpp:challenge with requestId:", requestId, "| full detail:", challengeDetail);

  const credential = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Payment timed out after 90 seconds")),
      90_000
    );

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      console.log("[mpp] step 3 — mpp:credential event received:", detail);

      if (detail.requestId !== undefined && detail.requestId !== requestId) {
        console.log("[mpp] step 3 — ignoring credential, requestId mismatch:", detail.requestId, "!= expected:", requestId);
        return;
      }

      clearTimeout(timer);
      window.removeEventListener("mpp:credential", handler);

      if (detail.approved === false) {
        reject(new Error(detail.error ?? "MPP extension declined the payment"));
        return;
      }
      if (!detail.credential) {
        reject(new Error("Extension approved but returned no credential string"));
        return;
      }
      console.log("[mpp] step 3 — credential received:", detail.credential);
      resolve(detail.credential as string);
    };

    window.addEventListener("mpp:credential", handler);
    window.dispatchEvent(new CustomEvent("mpp:challenge", { detail: challengeDetail }));
  });

  console.log("[mpp] step 4 — submitting proof, Authorization:", credential);
  const r2 = await fetch(`${BASE}/theater/stream`, {
    headers: { Authorization: credential },
  });
  console.log("[mpp] step 4 response:", r2.status);

  if (!r2.ok) {
    throw new Error(`Stream unlock failed: ${r2.status} ${r2.statusText}`);
  }

  const result = await r2.json();
  console.log("[mpp] step 4 — success! URL:", result.url);
  return result;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m ${s > 0 ? `${s}s` : ""}`.trim();
}
