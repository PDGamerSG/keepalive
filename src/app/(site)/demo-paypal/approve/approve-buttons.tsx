"use client";

import { useState } from "react";

export function ApproveButtons({ subscriptionId, approveLabel }: { subscriptionId: string; approveLabel: string }) {
  const [busy, setBusy] = useState<"approve" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "cancel") {
    if (busy) return;
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch("/api/demo-paypal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not record your choice.");
      window.location.href = data.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection lost. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="sim-actions">
      <button type="button" className="btn btn-paypal btn-lg" onClick={() => decide("approve")} disabled={!!busy}>
        {busy === "approve" ? "Approving…" : approveLabel}
      </button>
      <button type="button" className="btn btn-line" onClick={() => decide("cancel")} disabled={!!busy}>
        {busy === "cancel" ? "Returning…" : "Cancel and return to Brewbox"}
      </button>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
