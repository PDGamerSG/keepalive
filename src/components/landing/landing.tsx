import Link from "next/link";
import { Arrow } from "../ui/icons";
import { AgentSequence } from "./agent-sequence";
import { FlowDiagram } from "./flow-diagram";
import { GuardLab } from "./guard-lab";
import { SavePreview } from "./save-preview";
import "./landing.css";

const APIS: [api: string, use: string][] = [
  ["Catalog Products + Billing Plans", "Set up the merchant's three plans"],
  ["Subscriptions: create + approve", "Subscriber checkout"],
  ["suspend / activate", "Pause, then resume on schedule"],
  ["revise (plan_id) + buyer re-consent", "Switch plan, with the subscriber approving inside PayPal"],
  ["PATCH pricing_scheme", "Time-boxed retention discount"],
  ["cancel", "One-click cancellation, always"],
  ["Webhooks + verify-webhook-signature", "Stay in sync with PayPal"],
];

/** The home page. Static: every interactive piece on it runs in the browser and calls nothing. */
export function Landing({ mcpUrl }: { mcpUrl: string }) {
  return (
    <div className="lp">
      <section className="lp-hero">
        <div className="shell lp-hero-grid">
          <div>
            <h1 className="display lp-h1">
              When a subscriber hits{" "}
              <span className="lp-chip">
                Cancel subscription
                <Cursor />
              </span>
              <span className="sr-only">,</span> make one fair offer.
            </h1>
            <p className="lede lp-lede">
              KeepAlive is the retention desk for merchants who bill with PayPal Subscriptions. It asks why, proposes
              one offer inside your limits, and carries it out on PayPal. The exit stays one click away.
            </p>
            <div className="lp-actions">
              <Link href="/agent" className="btn btn-ink btn-lg btn-arrow">
                Watch two agents negotiate
                <span className="btn-arrow-box">
                  <Arrow />
                </span>
              </Link>
              <Link href="/shop" className="btn btn-line btn-lg">
                Try it as a subscriber
              </Link>
            </div>
            <p className="lp-foot">
              <span className="live-dot" />
              Runs against the PayPal sandbox. Built for the PayPal AI Hackathon.
            </p>
          </div>
          <SavePreview />
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="shell">
          <div className="lp-split">
            <h2 className="display lp-h2">What happens between the click and PayPal</h2>
            <p>
              PayPal Subscriptions gives a merchant a cancel button and nothing before it. Stripe, Braintree, Chargebee
              and Paddle all have a retention layer. KeepAlive is that layer for PayPal, and this is the whole path.
            </p>
          </div>
          <FlowDiagram />
        </div>
      </section>

      <section className="lp-section" id="guardrails">
        <div className="shell">
          <div className="lp-split">
            <h2 className="display lp-h2">The AI proposes. Your limits decide.</h2>
            <p>
              Every offer passes through a deterministic check before it can reach PayPal. The model never holds PayPal
              credentials. Move the sliders and try to get a bad offer through.
            </p>
          </div>
          <GuardLab />
          <p className="lp-fine">
            This panel runs <code className="code">checkOffer()</code> from <code className="code">src/lib/policy.ts</code>, the
            same function the server uses.
          </p>
        </div>
      </section>

      <section className="lp-section" id="agent">
        <div className="shell">
          <div className="lp-split">
            <h2 className="display lp-h2">Soon the click comes from their AI.</h2>
            <div>
              <p>
                A subscriber&apos;s own agent can ask to cancel over MCP. It gets the same offers under the same limits,
                and it must ask its human before it accepts anything.
              </p>
              <p className="lp-cmd-label">Connect your own agent</p>
              <code className="code lp-cmd">npx -y mcp-remote {mcpUrl}</code>
            </div>
          </div>
          <AgentSequence />
          <Link href="/agent" className="lp-more">
            Run this live with two AI agents
            <Arrow size={14} />
          </Link>
        </div>
      </section>

      <section className="lp-section" id="paypal">
        <div className="shell lp-split">
          <div>
            <h2 className="display lp-h2">Every PayPal API it touches</h2>
            <p>
              Each step of a save is a Subscriptions API call against the PayPal sandbox. This page is
              a model of the product and calls nothing.
            </p>
          </div>
          <table className="lp-apis">
            <tbody>
              {APIS.map(([api, use]) => (
                <tr key={api}>
                  <th scope="row">{api}</th>
                  <td>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="lp-section">
        <div className="shell">
          <div className="lp-close">
            <h2 className="display lp-h2">The exit is always open.</h2>
            <p>
              If someone wants to go, one decline and it is cancelled on PayPal. No maze and no guilt. KeepAlive only
              earns a save by making a better offer.
            </p>
            <div className="lp-actions">
              <Link href="/agent" className="btn btn-ink btn-lg">
                Watch two agents negotiate
              </Link>
              <Link href="/shop" className="btn btn-line btn-lg">
                Try it as a subscriber
              </Link>
              <Link href="/merchant" className="btn btn-line btn-lg">
                Open the merchant desk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Cursor() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3.5 2.5l13 6-5.4 1.9-2 5.6z" fill="#0a0a0a" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
