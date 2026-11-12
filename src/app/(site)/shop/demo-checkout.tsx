"use client";

import { useState } from "react";

export interface DemoBuyer {
  email: string;
  password: string;
}

/**
 * Tells visitors (and hackathon judges) that checkout is a demo: the button opens
 * PayPal's sandbox, and they log in there with a shared sandbox test buyer.
 */
export function DemoCheckout({ buyer }: { buyer: DemoBuyer | null }) {
  return (
    <section className="demo-box" aria-labelledby="demo-checkout-title">
      <h3 id="demo-checkout-title">
        Demo checkout <span className="badge badge-paypal">PayPal sandbox</span>
      </h3>
      <p>
        The button opens PayPal&apos;s sandbox, a test copy of PayPal. No real money moves, and real PayPal logins
        don&apos;t work there.
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
      <p className="demo-fine">After approving you come back here, and you can cancel in one click at any time.</p>
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
