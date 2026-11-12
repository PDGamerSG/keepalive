"use client";

import { useState } from "react";
import { Slider, Toggle } from "@/components/ui/controls";
import type { MerchantPolicy } from "@/lib/policy";
import { adminToken } from "./admin";

/** The merchant's hard limits and the guidance the AI reads. Saved to /api/policy. */
export function PolicyEditor({ initial }: { initial: MerchantPolicy }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MerchantPolicy>(k: K) => (v: MerchantPolicy[K]) => setP({ ...p, [k]: v });

  async function save() {
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken() },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      setMsg(
        res.ok
          ? { text: "Guardrails saved. The retention agent uses them from its next message.", ok: true }
          : { text: data.error ?? "Could not save the guardrails.", ok: false },
      );
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="policy">
      <section className="card dash-card">
        <div>
          <h2>Hard limits</h2>
          <p className="dash-note">Enforced in code before anything reaches PayPal. The AI cannot talk its way past them.</p>
        </div>
        <div className="policy-limits">
          <div>
            <Toggle label="Allow pauses" checked={p.allowPause} onChange={set("allowPause")} />
            <Slider label="Longest pause" value={p.maxPauseMonths} min={1} max={6} unit=" months" disabled={!p.allowPause} onChange={set("maxPauseMonths")} />
          </div>
          <div>
            <Toggle label="Allow plan switches" checked={p.allowDowngrade} onChange={set("allowDowngrade")} />
            <p className="dash-note">The subscriber always approves a plan change again inside PayPal.</p>
          </div>
          <div>
            <Toggle label="Allow discounts" checked={p.allowDiscount} onChange={set("allowDiscount")} />
            <Slider label="Biggest discount" value={p.maxDiscountPct} min={5} max={75} step={5} unit="%" disabled={!p.allowDiscount} onChange={set("maxDiscountPct")} />
            <Slider label="For up to" value={p.maxDiscountMonths} min={1} max={12} unit=" months" disabled={!p.allowDiscount} onChange={set("maxDiscountMonths")} />
            <Slider
              label="Only after"
              value={p.minTenureDaysForDiscount}
              min={0}
              max={365}
              step={5}
              unit=" days"
              disabled={!p.allowDiscount}
              onChange={set("minTenureDaysForDiscount")}
            />
            <label>
              <span className="label">Monthly discount budget, in dollars</span>
              <input
                className="field"
                type="number"
                min={0}
                value={p.monthlyDiscountBudgetUsd}
                disabled={!p.allowDiscount}
                onChange={(e) => set("monthlyDiscountBudgetUsd")(Number(e.target.value))}
              />
            </label>
          </div>
          <div>
            <Slider label="Offers per conversation" value={p.maxOffersPerSession} min={0} max={3} unit="" onChange={set("maxOffersPerSession")} />
          </div>
        </div>
      </section>

      <section className="card dash-card">
        <div>
          <h2>Guidance for the AI</h2>
          <p className="dash-note">How it should sound and what you prefer. Advice, not limits.</p>
        </div>
        <label>
          <span className="label">Brand voice</span>
          <textarea className="field" rows={3} value={p.brandVoice} onChange={(e) => set("brandVoice")(e.target.value)} />
        </label>
        <label>
          <span className="label">Notes for the retention agent</span>
          <textarea className="field" rows={6} value={p.merchantNotes} onChange={(e) => set("merchantNotes")(e.target.value)} />
        </label>
        <div className="policy-save">
          <button className="btn btn-ink" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save guardrails"}
          </button>
          {msg && (
            <p className={`notice ${msg.ok ? "notice-ok" : "notice-error"}`} role="status">
              {msg.text}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
