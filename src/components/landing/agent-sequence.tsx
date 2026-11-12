"use client";

import { useState } from "react";

const LANES = ["Leo", "Leo's agent", "KeepAlive", "PayPal"] as const;
const LANE_NOTE = ["The subscriber", "AI agent, acting for Leo", "Brewbox's desk, over MCP", "Subscriptions API"];

type Lane = 0 | 1 | 2 | 3;

interface Message {
  from: Lane;
  to: Lane;
  /** A tool or API call, set in monospace. */
  code?: string;
  text?: string;
}

const OPENING: Message[] = [
  { from: 0, to: 1, text: "Cancel Brewbox. I have too much coffee." },
  { from: 1, to: 2, code: "request_cancellation" },
  { from: 2, to: 1, text: "One offer: switch to Lite, $12 a month" },
  { from: 1, to: 0, code: "ask_my_human", text: "Accept the switch to Lite?" },
];

const ENDINGS: Record<"approve" | "cancel", Message[]> = {
  approve: [
    { from: 1, to: 2, code: "accept_offer" },
    { from: 2, to: 3, code: "POST …/revise" },
    { from: 3, to: 0, text: "Approval link. Leo confirms the new plan inside PayPal." },
  ],
  cancel: [
    { from: 1, to: 2, code: "cancel_subscription" },
    { from: 2, to: 3, code: "POST …/cancel" },
    { from: 3, to: 2, text: "204. Cancelled on PayPal." },
  ],
};

/** A sequence diagram of one agent-to-agent cancellation. The visitor answers as Leo. */
export function AgentSequence() {
  const [choice, setChoice] = useState<"approve" | "cancel" | null>(null);

  return (
    <div className="board sq" role="group" aria-label="An agent-to-agent cancellation, step by step">
      <ol className="sq-lanes" aria-hidden="true">
        {LANES.map((name, i) => (
          <li key={name}>
            <b>{name}</b>
            <small>{LANE_NOTE[i]}</small>
          </li>
        ))}
      </ol>

      <ol className="sq-body">
        {OPENING.map((m, i) => (
          <Row key={i} m={m} />
        ))}

        <li className="sq-ask">
          {choice === null ? (
            <>
              <span>You are Leo. What do you tell your agent?</span>
              <span className="sq-ask-actions">
                <button type="button" className="btn btn-ok btn-sm" onClick={() => setChoice("approve")}>
                  Approve
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setChoice("cancel")}>
                  Just cancel
                </button>
              </span>
            </>
          ) : (
            <>
              <span>You said: {choice === "approve" ? "approve" : "just cancel"}.</span>
              <button type="button" className="sq-again" onClick={() => setChoice(null)}>
                Answer again
              </button>
            </>
          )}
        </li>

        {choice !== null && ENDINGS[choice].map((m, i) => <Row key={`${choice}-${i}`} m={m} delay={i} />)}
      </ol>
    </div>
  );
}

function Row({ m, delay }: { m: Message; delay?: number }) {
  const left = Math.min(m.from, m.to);
  const span = Math.abs(m.to - m.from);
  return (
    <li
      className={delay === undefined ? "sq-msg" : "sq-msg rise"}
      data-dir={m.to > m.from ? "right" : "left"}
      style={
        {
          "--from": left,
          "--span": span,
          animationDelay: delay === undefined ? undefined : `${delay * 0.3}s`,
        } as React.CSSProperties
      }
    >
      <span className="sq-route">
        {LANES[m.from]} to {LANES[m.to]}
      </span>
      <span className="sq-label">
        {m.code && <code>{m.code}</code>}
        {m.text}
      </span>
      <i className="sq-arrow" aria-hidden="true" />
    </li>
  );
}
