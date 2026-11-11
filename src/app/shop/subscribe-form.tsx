"use client";

import { useMemo, useState, type ReactNode } from "react";
import { OrreryView } from "@/components/orrery/orrery-view";
import type { OrbitBody } from "@/components/orrery/states";
import type { Tier } from "@/lib/catalog";
import { PERSONAS } from "@/lib/personas";
import type { TierId } from "@/lib/types";

export function SubscribeForm({
  tiers,
  bodies,
  checkoutAvailable,
  intro,
}: {
  tiers: Tier[];
  bodies: OrbitBody[];
  checkoutAvailable: boolean;
  intro: ReactNode;
}) {
  const [selected, setSelected] = useState<TierId>("standard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<string>("regular");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = tiers.find((t) => t.id === selected)!;
  const focus = useMemo(() => ({ tier: selected, state: "new" as const }), [selected]);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected, name, email, persona }),
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
    <div className="shop-grid">
      <div className="shop-main">
        <header className="page-head shop-head">{intro}</header>

        <fieldset className="shop-plans">
          <legend>Choose a plan</legend>
          <div role="radiogroup" aria-label="Plan">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected === t.id}
                className="shop-plan"
                onClick={() => setSelected(t.id)}
              >
                <span className="shop-plan-name">{t.name}</span>
                <span className="shop-plan-price num">
                  ${t.priceUsd}
                  <small>a month</small>
                </span>
                <span className="shop-plan-desc">{t.description}</span>
                <span className="shop-plan-perks">{t.perks.join(", ")}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <form
          className="panel shop-form"
          onSubmit={(e) => {
            e.preventDefault();
            subscribe();
          }}
        >
          <label>
            <span className="label">Name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Chen" autoComplete="name" />
          </label>
          <label>
            <span className="label">Email</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@example.com"
              autoComplete="email"
            />
          </label>
          <label className="shop-persona">
            <span className="label">For the demo: what Brewbox already knows about you</span>
            <select className="field" value={persona} onChange={(e) => setPersona(e.target.value)}>
              {Object.entries(PERSONAS).map(([id, p]) => (
                <option key={id} value={id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-paypal shop-pay" type="submit" disabled={!checkoutAvailable || busy || !name || !email}>
            {!checkoutAvailable ? "PayPal checkout is offline" : busy ? "Opening PayPal…" : `Subscribe to ${plan.name} with PayPal`}
          </button>
          {error && (
            <p className="shop-error" role="alert">
              {error}
            </p>
          )}
          <p className="shop-fine">
            Sandbox only. Approve with a PayPal sandbox personal account; no real money moves.
          </p>
        </form>
      </div>

      <div className="panel shop-orrery">
        <OrreryView
          className="shop-orrery-view"
          label={`Brewbox's subscribers in orbit, with your place on the ${plan.name} ring`}
          bodies={bodies}
          focus={focus}
          focusLabel={`Your place on ${plan.name}`}
          highlight={selected}
          zoom={0.98}
        />
        <p className="shop-orrery-caption">
          Every Brewbox subscriber orbits on their plan&apos;s ring. Pick a plan to see where you would join.
        </p>
      </div>
    </div>
  );
}
