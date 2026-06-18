import {
  createLightningMppExtensionClient,
  probeLightningMppExtension,
} from "lightning-mpp-extension-sdk";

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
  console.log("[mpp] probeExtension: probing via SDK");
  try {
    const response = await probeLightningMppExtension({ timeoutMs });
    console.log("[mpp] probeExtension: extension responded", response);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("[mpp] probeExtension: failed", message);
    return false;
  }
}

export async function unlockStream(): Promise<StreamResult> {
  console.log("[mpp] unlockStream: requesting paid stream via SDK client");
  const client = createLightningMppExtensionClient({
    polyfill: false,
    extensionProbeTimeoutMs: 1500,
  });

  const response = await client.fetch(`${BASE}/theater/stream`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Stream unlock failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as StreamResult;
  console.log("[mpp] unlockStream: success! URL:", result.url);
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
