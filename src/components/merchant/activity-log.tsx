"use client";

import { useState } from "react";
import type { AuditEvent } from "@/lib/types";
import { eventTone } from "./labels";

type Filter = "all" | "paypal" | "offer" | "dim";

const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["paypal", "PayPal calls"],
  ["offer", "Guardrails"],
  ["dim", "Everything else"],
];

/** One row of the audit log. `compact` drops the debug ID for the overview. */
export function EventRow({ event, compact }: { event: AuditEvent; compact?: boolean }) {
  const debugId =
    typeof event.detail === "object" && event.detail !== null && "debugId" in event.detail
      ? (event.detail as { debugId?: string }).debugId
      : undefined;
  return (
    <li>
      <time>{new Date(event.at).toLocaleString()}</time>
      <span className={`badge badge-${eventTone(event.type)}`}>{event.type}</span>
      <span className="log-text">{event.summary}</span>
      {!compact && debugId && <span className="mono log-id">debug_id {debugId}</span>}
    </li>
  );
}

/** Every PayPal call, webhook and guardrail decision, newest first. */
export function ActivityLog({ events }: { events: AuditEvent[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? events : events.filter((e) => eventTone(e.type) === filter);

  if (events.length === 0) return <p className="dash-none">PayPal calls and webhooks are logged here as they happen.</p>;

  return (
    <>
      <div className="dash-tools">
        <div className="seg" role="radiogroup" aria-label="Filter activity">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={filter === value} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="dash-none">Nothing of this kind has been logged yet.</p>
      ) : (
        <ol className="card log">
          {shown.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </ol>
      )}
    </>
  );
}
