"use client";

import { useState } from "react";
import { Check } from "@/components/ui/icons";
import type { Tier } from "@/lib/catalog";
import { PERSONAS } from "@/lib/personas";
import { DemoCheckout, type DemoBuyer } from "./demo-checkout";
import type { TierId } from "@/lib/types";

type Mode = "paypal" | "simulated";

export function SubscribeForm({
  tiers,
  checkoutAvailable,
  demoBuyer,
}: {
  tiers: Tier[];
  checkoutAvailable: boolean;
  demoBuyer: DemoBuyer | null;
}) {
  const [selected, setSelected] = useState<TierId>("standard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [persona, setPersona] = useState<string>("regular");
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plan = tiers.find((t) => t.id === selected)!;

  const ready = Boolean(name.trim() && email.trim());

  /** "paypal" opens the PayPal sandbox; "simulated" is the instant demo on KeepAlive's PayPal simulator. */
  async function subscribe(mode: Mode) {
    if (busy || (mode === "paypal" && !checkoutAvailable)) return;
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected, name: name.trim(), email: email.trim(), persona, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.approveUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  return (
    <form
      className="shop-grid"
      onSubmit={(e) => {
        e.preventDefault();
        subscribe("paypal");
      }}
    >
      <div className="shop-main">
        <fieldset>
          <legend>Choose a plan</legend>
          <div className="shop-plans" role="radiogroup" aria-label="Plan">
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected === t.id}
                className="shop-plan"
                onClick={() => setSelected(t.id)}
              >
                <span className="shop-plan-top">
                  <span className="shop-plan-name">{t.name}</span>
                  <span className="shop-radio" aria-hidden="true" />
                </span>
                <span className="shop-plan-price">
                  <span className="display num">${t.priceUsd}</span>
                  <small>a month</small>
                </span>
                <span className="shop-plan-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Your details</legend>
          <div className="shop-fields">
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
          </div>
        </fieldset>
      </div>

      <aside className="card shop-summary" aria-label="Your subscription">
        <p className="shop-sum-name">Brewbox {plan.name}</p>
        <p className="shop-sum-price">
          <span className="display num">${plan.priceUsd}</span>
          <small>a month</small>
        </p>
        <ul className="shop-perks">
          {plan.perks.map((perk) => (
            <li key={perk}>
              <Check />
              {perk}
            </li>
          ))}
        </ul>
        <button className="btn btn-paypal btn-lg shop-pay" type="submit" disabled={!checkoutAvailable || !!busy || !ready}>
          {!checkoutAvailable
            ? "PayPal checkout is offline"
            : busy === "paypal"
              ? "Opening PayPal sandbox…"
              : `Subscribe to ${plan.name} with PayPal`}
        </button>
        <button className="btn btn-line btn-lg shop-pay" type="button" onClick={() => subscribe("simulated")} disabled={!!busy || !ready}>
          {busy === "simulated" ? "Starting the instant demo…" : "Try the instant demo (no PayPal login)"}
        </button>
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <DemoCheckout buyer={demoBuyer} />
      </aside>
    </form>
  );
}
