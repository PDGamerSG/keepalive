"use client";

import { useState } from "react";

export interface DemoBuyer {
  email: string;
  password: string;
}

/**
 * Explains the two ways to try checkout: the PayPal sandbox (optionally with a
 * shared sandbox test buyer) and the instant demo on KeepAlive's PayPal simulator.
 */
export function DemoCheckout({ buyer }: { buyer: DemoBuyer | null }) {
  return (
    <section className="demo-box" aria-labelledby="demo-checkout-title">
      <h3 id="demo-checkout-title">Two ways to try checkout</h3>

      <div className="demo-way">
        <p className="demo-way-title">
          Subscribe with PayPal <span className="badge badge-paypal">PayPal sandbox</span>
        </p>
        <p>
          Opens PayPal&apos;s sandbox, a test copy of PayPal. No real money moves, and real PayPal logins don&apos;t
          work there.
        </p>
        {buyer ? (
          <>
            <p>Log in on PayPal with this demo buyer:</p>
            <dl className="demo-creds">
              <CopyRow label="Email" value={buyer.email} />
              <CopyRow label="Password" value={buyer.password} />
            </dl>
          </>
        ) : (
          <p>Log in with a PayPal sandbox personal account.</p>
        )}
      </div>

      <div className="demo-way">
        <p className="demo-way-title">
          Instant demo <span className="badge badge-offer">No login</span>
        </p>
        <p>
          Skips PayPal&apos;s page: you approve on a simulated PayPal step, then pausing, discounts, plan changes and
          cancelling run on KeepAlive&apos;s PayPal simulator.
        </p>
      </div>

      <p className="demo-fine">Either way you can cancel in one click at any time.</p>
    </section>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <dt>{label}</dt>
      <dd className="demo-copy-cell">
        <button
          type="button"
          className="demo-copy"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // Clipboard can be blocked; the value is visible to copy by hand.
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </dd>
      <dd className="mono">{value}</dd>
    </>
  );
}
