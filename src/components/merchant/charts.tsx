import type { Metrics } from "@/lib/metrics";
import { STATE_LABEL, subscriberState, type SubscriberState } from "@/lib/subscriber-state";
import type { Subscriber } from "@/lib/types";
import { planName, REASON_LABEL } from "./labels";

/** Fixed order, so a state keeps its place and colour whatever the counts are. */
export const STATE_ORDER: SubscriberState[] = ["active", "paused", "offer", "pending", "new", "cancelled"];

export function countStates(subscribers: Subscriber[]): Record<SubscriberState, number> {
  const counts: Record<SubscriberState, number> = { active: 0, paused: 0, offer: 0, pending: 0, new: 0, cancelled: 0 };
  for (const s of subscribers) counts[subscriberState(s)]++;
  return counts;
}

/** The four numbers a merchant looks at first. */
export function Kpis({ m }: { m: Metrics }) {
  return (
    <dl className="card kpis">
      <div>
        <dt>Monthly revenue on PayPal</dt>
        <dd className="display">${m.mrrUsd.toFixed(2)}</dd>
        <span>From {m.activeSubscribers} active subscriptions</span>
      </div>
      <div>
        <dt>Kept by saves</dt>
        <dd className="display">${m.mrrSavedUsd.toFixed(2)}</dd>
        <span>A month that would have cancelled</span>
      </div>
      <div>
        <dt>Save rate</dt>
        <dd className="display">{m.saveRatePct === null ? "–" : `${m.saveRatePct}%`}</dd>
        <span>{m.saveRatePct === null ? "No decisions yet" : `${m.saved} saved, ${m.cancelled} cancelled, ${m.open} open`}</span>
      </div>
      <div>
        <dt>Conversations with AI agents</dt>
        <dd className="display">{m.agentSessions}</dd>
        <span>Customers who sent their own agent</span>
      </div>
    </dl>
  );
}

/** One bar split by subscriber state, with the count beside each legend entry. */
export function StateBar({ subscribers }: { subscribers: Subscriber[] }) {
  const counts = countStates(subscribers);
  return (
    <>
      <div className="stack" role="img" aria-label={STATE_ORDER.map((s) => `${STATE_LABEL[s]} ${counts[s]}`).join(", ")}>
        {STATE_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <i key={s} data-state={s} style={{ flexGrow: counts[s] }} title={`${STATE_LABEL[s]}: ${counts[s]}`} />
        ))}
      </div>
      <ul className="stack-legend">
        {STATE_ORDER.map((s) => (
          <li key={s}>
            <i data-state={s} />
            {STATE_LABEL[s]}
            <b className="num">{counts[s]}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ReasonBars({ reasons }: { reasons: Metrics["reasons"] }) {
  const rows = Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className="dash-none">Reasons appear here after the first cancellation conversation.</p>;
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <ul className="bars">
      {rows.map(([k, v]) => (
        <li key={k} title={`${REASON_LABEL[k] ?? k}: ${v}`}>
          <span>{REASON_LABEL[k] ?? k}</span>
          <span className="bar-track">
            <i style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <b className="num">{v}</b>
        </li>
      ))}
    </ul>
  );
}

export function OfferPairs({ offers }: { offers: Metrics["offersByType"] }) {
  const rows = Object.entries(offers);
  if (rows.length === 0) return <p className="dash-none">Offers appear here once the AI has proposed one.</p>;
  const max = Math.max(1, ...rows.map(([, v]) => v.proposed));
  return (
    <>
      <ul className="pair-key">
        <li className="is-made">Made</li>
        <li className="is-taken">Taken</li>
      </ul>
      <ul className="bars">
        {rows.map(([type, v]) => (
          <li key={type} title={`${planName(type)}: ${v.accepted} of ${v.proposed} taken`}>
            <span>{planName(type)}</span>
            <span className="pair-bars">
              <i className="is-made" style={{ width: `${(v.proposed / max) * 100}%` }} />
              <i className="is-taken" style={{ width: `${(v.accepted / max) * 100}%` }} />
            </span>
            <b className="num">
              {v.accepted} of {v.proposed}
            </b>
          </li>
        ))}
      </ul>
    </>
  );
}
