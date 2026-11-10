import Link from "next/link";

const steps = [
  {
    title: "Subscriber clicks Cancel, or their AI agent does",
    body: "Through the web cancel flow, or through KeepAlive's MCP endpoint, which any AI agent can call.",
  },
  {
    title: "Claude finds the real reason",
    body: "Travelling? Too much coffee? Price? One short, honest conversation, and one offer that fits.",
  },
  {
    title: "Guardrails decide",
    body: "The merchant sets limits (max pause, max discount, monthly budget). The AI proposes, deterministic code approves.",
  },
  {
    title: "PayPal executes",
    body: "Pause → suspend. Downgrade → revise with PayPal re-consent. Discount → price override. Read back from PayPal before success.",
  },
];

const apis = [
  ["Catalog Products + Billing Plans", "bootstrap the merchant's tiers"],
  ["Subscriptions: create + approve", "subscriber checkout"],
  ["suspend / activate", "pause & automatic resume"],
  ["revise (plan_id) + buyer re-consent", "downgrade with the human in the loop"],
  ["PATCH pricing_scheme", "time-boxed retention discount"],
  ["cancel", "one-click cancellation, always"],
  ["Webhooks + verify-webhook-signature", "stay in sync with PayPal"],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="py-16 grid gap-10 md:grid-cols-[1.3fr_1fr] items-center">
        <div>
          <p className="pill bg-save-soft text-save mb-5">For merchants who bill with PayPal Subscriptions</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight">
            When a subscriber, <em>or their AI agent</em>, tries to cancel, KeepAlive saves the relationship.
          </h1>
          <p className="mt-5 text-lg text-muted max-w-xl">
            An AI retention desk that negotiates one fair offer inside your limits and executes it live on PayPal. Cancel is
            always one click away.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-primary">Try it as a subscriber →</Link>
            <Link href="/agent" className="btn btn-ghost">Watch two AI agents negotiate</Link>
            <Link href="/merchant" className="btn btn-ghost">Merchant dashboard</Link>
          </div>
        </div>
        <div className="card p-5 rise">
          <div className="text-xs uppercase tracking-wider text-muted mb-3">Live example</div>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-crema px-3 py-2 w-fit max-w-[85%]">I&apos;m backpacking for two months, cancel my coffee.</div>
            <div className="rounded-xl bg-espresso text-white px-3 py-2 ml-auto w-fit max-w-[85%]">
              Have a great trip! Want me to pause Brewbox for 2 months instead? No charges, and it restarts automatically.
            </div>
            <div className="flex items-center gap-2 text-save font-medium">
              <span className="h-2 w-2 rounded-full bg-save" /> PayPal: subscription SUSPENDED · resumes in 2 months
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4 pb-14">
        {steps.map((s, i) => (
          <div key={s.title} className="card p-5">
            <div className="text-xs font-mono text-muted">0{i + 1}</div>
            <h3 className="mt-2 font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-muted">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 md:grid-cols-2 pb-20">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl">Why this matters</h2>
          <ul className="mt-4 space-y-3 text-muted">
            <li>
              <b className="text-foreground">PayPal merchants have no retention layer.</b> Cancel-flow tools are built for
              Stripe, Braintree, Chargebee and Paddle.
            </li>
            <li>
              <b className="text-foreground">Agents are about to cancel for people.</b> When a customer&apos;s AI calls to cancel,
              KeepAlive answers over MCP with structured offers, and the human still approves.
            </li>
            <li>
              <b className="text-foreground">Trust by design.</b> The AI never holds PayPal credentials, never exceeds policy, and
              cancellation is never blocked.
            </li>
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">PayPal APIs used</h3>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {apis.map(([api, why]) => (
                <tr key={api} className="border-t border-line">
                  <td className="py-2 pr-3 font-mono text-[12px] text-paypal">{api}</td>
                  <td className="py-2 text-muted">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
