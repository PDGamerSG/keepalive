"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResumeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <button
        className="btn btn-ghost w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/account/resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not resume your subscription.");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Connection lost. Please try again.");
          } finally { setBusy(false); }
        }}
      >
        {busy ? "Resuming on PayPal…" : "Resume my subscription now"}
      </button>
      {error && <p role="alert" className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}
