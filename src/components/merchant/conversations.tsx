"use client";

import { useState } from "react";
import { LocalTime } from "@/components/ui/local-time";
import type { RetentionSession } from "@/lib/types";
import { OUTCOME_LABEL, OUTCOME_TONE, REASON_LABEL } from "./labels";

/** Every cancellation conversation: the list on the left, the one you picked on the right. */
export function Conversations({ sessions, names }: { sessions: RetentionSession[]; names: Record<string, string> }) {
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);
  const open = sessions.find((s) => s.id === openId);

  if (sessions.length === 0) {
    return <p className="dash-none">Conversations appear here when a subscriber, or their agent, asks to cancel.</p>;
  }

  return (
    <div className="convo">
      <ul className="card convo-list" aria-label="Conversations">
        {sessions.map((s) => (
          <li key={s.id}>
            <button type="button" aria-current={s.id === openId ? "true" : undefined} onClick={() => setOpenId(s.id)}>
              <span className="convo-row-top">
                <strong>{names[s.subscriptionId] ?? s.subscriptionId}</strong>
                <span className={`badge badge-${OUTCOME_TONE[s.outcome] ?? "dim"}`}>{OUTCOME_LABEL[s.outcome] ?? s.outcome}</span>
              </span>
              <span className="convo-row-sub">
                {REASON_LABEL[s.reason ?? ""] ?? "Reason not given yet"}
                {s.channel === "agent" && ", through their AI agent"}
              </span>
              <LocalTime iso={s.startedAt} />
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <article className="card convo-detail" aria-live="polite">
          <header>
            <div>
              <h2>{names[open.subscriptionId] ?? open.subscriptionId}</h2>
              <p>
                {open.channel === "agent" ? "Through their AI agent" : "On the web"}, <LocalTime iso={open.startedAt} />
              </p>
            </div>
            <span className={`badge badge-${OUTCOME_TONE[open.outcome] ?? "dim"}`}>{OUTCOME_LABEL[open.outcome] ?? open.outcome}</span>
          </header>

          <ol className="convo-transcript">
            {open.messages.map((msg, i) => (
              <li key={i} data-role={msg.role}>
                <b>
                  {msg.role === "subscriber"
                    ? open.channel === "agent"
                      ? "Customer's agent"
                      : "Customer"
                    : msg.role === "keepalive"
                      ? "KeepAlive"
                      : "PayPal"}
                </b>
                <span>{msg.text}</span>
              </li>
            ))}
          </ol>

          <div className="convo-side">
            <section>
              <h3>Offers</h3>
              {open.offers.length === 0 && <p className="dash-none">None made.</p>}
              {open.offers.map((o) => (
                <div key={o.id} className="convo-offer">
                  <strong>{o.label}</strong>
                  <span>{o.status.replaceAll("_", " ")}</span>
                  {o.guardrailNotes.length > 0 && <em>Guardrail: {o.guardrailNotes.join("; ")}</em>}
                </div>
              ))}
            </section>
            <section>
              <h3>The AI&apos;s reasoning, shown only to you</h3>
              {open.rationale.length === 0 ? (
                <p className="dash-none">None recorded.</p>
              ) : (
                <ul className="convo-why">
                  {open.rationale.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </article>
      )}
    </div>
  );
}
