"use client";

/** Error boundary for the root layout itself (rare). Plain markup: the layout's styles may be missing. */
import { resetSavedGameAndReload } from "@/lib/client/resetStorage";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const btn: React.CSSProperties = {
    minHeight: 48,
    padding: "0 20px",
    margin: 6,
    border: "2px solid #111418",
    borderRadius: 14,
    background: "#fff",
    color: "#111418",
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
  };
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#111418" }}>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 30, margin: "0 0 12px" }}>Something broke</h1>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "#3a4149", margin: "0 0 20px" }}>
              Try again. If it keeps happening, reset the saved game on this device.
            </p>
            <button type="button" style={{ ...btn, background: "#F26B1D" }} onClick={reset}>
              Try again
            </button>
            <button type="button" style={btn} onClick={resetSavedGameAndReload}>
              Reset saved game
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
