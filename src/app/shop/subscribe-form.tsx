"use client";

import { useState } from "react";
import type { Tier } from "@/lib/catalog";
import type { TierId } from "@/lib/types";
import { PERSONAS } from "@/lib/personas";

export function SubscribeForm({ tiers, checkoutAvailable }: { tiers: Tier[]; checkoutAvailable: boolean }) {
  const [selected, setSelected] = useState<TierId>("standard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<string>("regular");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (busy || !checkoutAvailable) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected, name: name.trim(), email: email.trim(), persona }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start PayPal checkout");
      window.location.href = data.approveUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form className="mt-10" onSubmit={e => { e.preventDefault(); subscribe(); }}>
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <button
            type="button"
            key={t.id}
            aria-pressed={selected === t.id}
            onClick={() => setSelected(t.id)}
            className="plan-option card p-6 text-left hover:bg-crema/40"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold text-lg">{t.name}</h3>
              <div>
                <span className="text-3xl font-[family-name:var(--font-display)]">${t.priceUsd}</span>
                <span className="text-muted text-sm">/mo</span>
              </div>
            </div>
            <p className="text-sm text-muted mt-1">{t.description}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {t.perks.map((p) => (
                <li key={p} className="flex gap-2"><span aria-hidden="true" className="text-save">—</span>{p}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <div className="card mt-6 p-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
        <label className="text-sm">
          Name
          <input className="input mt-1" name="name" autoComplete="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Chen" disabled={busy} />
        </label>
        <label className="text-sm">
          Email
          <input className="input mt-1" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maya@example.com" disabled={busy} />
        </label>
        <button type="submit" className="btn btn-paypal" disabled={!checkoutAvailable || busy || !name.trim() || !email.trim()}>
          {!checkoutAvailable ? "PayPal checkout unavailable" : busy ? "Opening PayPal…" : "Subscribe with PayPal"}
        </button>
      </div>
      <p className="mt-3 text-sm text-muted" aria-live="polite">{tiers.find(t => t.id === selected)?.name} plan · ${tiers.find(t => t.id === selected)?.priceUsd} per month. Confirm your subscription in PayPal.</p>
      <label className="mt-3 flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
        Demo only: customer history the merchant already knows
        <select className="input w-auto text-xs py-1" value={persona} onChange={(e) => setPersona(e.target.value)} disabled={busy}>
          {Object.entries(PERSONAS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert" className="notice notice-error mt-3">{error}</p>}
    </form>
  );
}
