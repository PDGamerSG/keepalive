import { Chat, Gate, Ledger, Pointer } from "../ui/icons";

const NODES = [
  {
    icon: <Pointer size={18} />,
    title: "Subscriber",
    note: "Clicks cancel, or sends their own AI agent to do it.",
    code: "request_cancellation",
  },
  {
    icon: <Chat size={18} />,
    title: "KeepAlive desk",
    note: "The AI asks why once, then proposes one offer that fits the reason.",
    code: "propose_offer",
  },
  {
    icon: <Gate size={18} />,
    title: "Your limits",
    note: "Plain code checks the offer. Too big gets cut down. Not allowed gets turned back.",
    code: "checkOffer()",
  },
  {
    icon: <Ledger size={18} />,
    title: "PayPal Subscriptions",
    note: "The matching call runs. Then the subscription is read back to confirm it.",
    code: "suspend / revise / PATCH",
  },
];

/** What travels along each arrow. */
const EDGES = ["reason", "proposal", "safe offer"];

const ROUTES: [said: string, offer: string, call: string, after: string][] = [
  ["I'm travelling", "Pause for 2 months", "POST …/suspend", "activate runs when the pause ends"],
  ["I have too much coffee", "Switch to Lite, $12 a month", "POST …/revise", "The subscriber approves inside PayPal"],
  ["It costs too much", "30% off for 3 months", "PATCH …/{id}", "List price returns when the discount ends"],
  ["Just cancel", "Nothing more", "POST …/cancel", "Cancelled on PayPal, straight away"],
];

/** The path of one cancellation, from the click to PayPal and back. */
export function FlowDiagram() {
  return (
    <figure className="fd">
      <div className="board fd-board">
        <p className="fd-rail fd-rail-out">
          <span>
            Decline at any point and <code>cancel</code> runs. One click.
          </span>
        </p>
        <ol className="fd-track">
          {NODES.map((n, i) => (
            <li key={n.title} className="fd-node">
              <span className="fd-icon">{n.icon}</span>
              <strong>{n.title}</strong>
              <span className="fd-note">{n.note}</span>
              <code>{n.code}</code>
              {EDGES[i] && (
                <span className="fd-edge" aria-hidden="true">
                  <i>{EDGES[i]}</i>
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="fd-rail fd-rail-back">
          <span>The confirmed result goes back to the subscriber</span>
        </p>
      </div>

      <figcaption className="sr-only">
        A cancellation goes from the subscriber to the KeepAlive desk, through the merchant&apos;s limits, to PayPal
        Subscriptions, and the confirmed result returns to the subscriber. Declining runs cancel directly.
      </figcaption>

      <table className="fd-routes">
        <thead>
          <tr>
            <th scope="col">They say</th>
            <th scope="col">KeepAlive offers</th>
            <th scope="col">PayPal call</th>
            <th scope="col">Then</th>
          </tr>
        </thead>
        <tbody>
          {ROUTES.map(([said, offer, call, after]) => (
            <tr key={said}>
              <th scope="row" data-label="They say">
                &ldquo;{said}&rdquo;
              </th>
              <td data-label="KeepAlive offers">{offer}</td>
              <td data-label="PayPal call">
                <code className="code">{call}</code>
              </td>
              <td data-label="Then">{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
