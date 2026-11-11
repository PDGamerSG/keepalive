"use client";

import { useState } from "react";
import type { MerchantPolicy } from "@/lib/policy";

export function PolicyEditor({ initial, adminToken }: { initial: MerchantPolicy; adminToken: string }) {
  const [policy, setPolicy] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const number = (key: keyof MerchantPolicy, label: string, min: number, max: number, step = 1) => (
    <label className="field-label" key={key}>
      {label}
      <input className="input" type="number" min={min} max={max} step={step} required value={String(policy[key])}
        onChange={e => setPolicy({ ...policy, [key]: e.target.value === "" ? "" : Number(e.target.value) })} />
    </label>
  );
  return (
    <form className="card policy-panel" onSubmit={async e => {
      e.preventDefault();
      setBusy(true); setMessage(null); setFailed(false);
      try {
        const res = await fetch("/api/policy", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-token": adminToken }, body: JSON.stringify(policy) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not save your guardrails.");
        setMessage("Guardrails saved. New messages use these limits.");
      } catch (error) {
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Connection lost. Please try saving again.");
      } finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="policy-columns">
        <div>
          <h2 className="font-semibold">Offer limits</h2>
          <p className="policy-help">Every offer must pass these checks before it reaches PayPal.</p>
          <label className="policy-option"><input type="checkbox" checked={policy.allowPause} onChange={e => setPolicy({ ...policy, allowPause: e.target.checked })} />Allow subscription pauses</label>
          <div className="field-grid">{number("maxPauseMonths", "Longest pause (months)", 1, 6)}</div>
          <label className="policy-option"><input type="checkbox" checked={policy.allowDowngrade} onChange={e => setPolicy({ ...policy, allowDowngrade: e.target.checked })} />Allow a switch to a cheaper plan</label>
          <p className="policy-help">Plan changes always need the subscriber’s approval in PayPal.</p>
          <label className="policy-option"><input type="checkbox" checked={policy.allowDiscount} onChange={e => setPolicy({ ...policy, allowDiscount: e.target.checked })} />Allow retention discounts</label>
          <div className="field-grid">
            {number("maxDiscountPct", "Biggest discount (%)", 5, 75)}
            {number("maxDiscountMonths", "Discount length (months)", 1, 12)}
            {number("minTenureDaysForDiscount", "Minimum tenure (days)", 0, 365)}
            {number("monthlyDiscountBudgetUsd", "Monthly discount budget ($)", 0, 100000, .01)}
            {number("maxOffersPerSession", "Offers per conversation", 0, 3)}
          </div>
        </div>
        <div className="space-y-4">
          <div><h2 className="font-semibold">How KeepAlive speaks</h2><p className="policy-help">Guide the conversation. Your offer limits remain in control.</p></div>
          <label className="field-label">Brand voice<textarea className="input h-28" maxLength={400} value={policy.brandVoice} onChange={e => setPolicy({ ...policy, brandVoice: e.target.value })} /></label>
          <label className="field-label">Merchant notes<textarea className="input h-40" maxLength={1000} value={policy.merchantNotes} onChange={e => setPolicy({ ...policy, merchantNotes: e.target.value })} /></label>
          <p className="policy-help">Subscribers can always cancel, even after an offer or while paused.</p>
        </div>
      </fieldset>
      <div className="policy-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving guardrails…" : "Save guardrails"}</button>
        {message && <p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-danger" : "text-save"}`}>{message}</p>}
      </div>
    </form>
  );
}
