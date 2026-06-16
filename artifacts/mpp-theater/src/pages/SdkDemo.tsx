import { Link } from "wouter";

const demoSrc = `${import.meta.env.BASE_URL}mpp-demo.html`;

export default function SdkDemo() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">TIPT SDK Demo</h1>
          <p className="text-xs text-muted-foreground">
            Standalone payment playground embedded in the sandbox.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-primary hover:underline"
        >
          Back to experiments
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="h-[calc(100vh-8.5rem)] min-h-[36rem] rounded-xl border border-border overflow-hidden bg-card">
          <iframe
            src={demoSrc}
            title="TIPT SDK Demo"
            className="w-full h-full"
          />
        </div>
      </main>
    </div>
  );
}
