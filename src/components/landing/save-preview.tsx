"use client";

import { useState } from "react";
import { offerLabel } from "@/lib/policy";
import type { Tone } from "@/lib/subscriber-state";

interface Call {
  /** The request line, or a plain sentence for a step that happens inside PayPal. */
  req: string;
  res: string;
  plain?: boolean;
}

interface Scenario {
  id: string;
  tab: string;
  said: string;
  reply: string;
  offer: string;
  offerNote: string;
  calls: Call[];
  after: { tone: Tone; badge: string; result: string };
}

const SUB = "/v1/billing/subscriptions/I-…";

const SCENARIOS: Scenario[] = [
  {
    id: "travel",
    tab: "Travelling",
    said: "I'm backpacking for two months, cancel my coffee.",
    reply: "Have a great trip! Want me to pause Brewbox for 2 months instead? No charges, and it restarts automatically.",
    offer: offerLabel({ type: "pause", months: 2 }),
    offerNote: "No charges while paused. It restarts on its own.",
    calls: [
      { req: `POST ${SUB}/suspend`, res: "204 No Content" },
      { req: `GET ${SUB}`, res: "status: SUSPENDED" },
    ],
    after: { tone: "paused", badge: "Paused", result: "Paused on PayPal. Resumes in 2 months." },
  },
  {
    id: "volume",
    tab: "Too much coffee",
    said: "Bags are piling up. I only drink coffee on weekends now.",
    reply: "That makes sense. Lite is one bag a month for $12. Want to switch instead of cancelling?",
    offer: offerLabel({ type: "downgrade", toTier: "lite" }),
    offerNote: "New price $12.00 a month",
    calls: [
      { req: `POST ${SUB}/revise`, res: "200 OK, approval link" },
      { req: "Maya approves the change inside PayPal", res: "consent given", plain: true },
      { req: `GET ${SUB}`, res: "plan: Lite" },
    ],
    after: { tone: "ok", badge: "Active on Lite", result: "Switched to Lite on PayPal. $12 a month stays." },
  },
  {
    id: "price",
    tab: "Too expensive",
    said: "It costs too much right now.",
    reply: "Understood. I can take 30% off for the next 3 months. After that it goes back to $22.",
    offer: offerLabel({ type: "discount", discountPct: 30, months: 3 }),
    offerNote: "New price $15.40 a month",
    calls: [
      { req: `PATCH ${SUB}`, res: "204 No Content" },
      { req: `GET ${SUB}`, res: "price: 15.40 USD" },
    ],
    after: { tone: "offer", badge: "On a discount", result: "Discounted on PayPal. Back to $22 after 3 months." },
  },
];

const CANCEL: Pick<Scenario, "calls" | "after"> = {
  calls: [
    { req: `POST ${SUB}/cancel`, res: "204 No Content" },
    { req: `GET ${SUB}`, res: "status: CANCELLED" },
  ],
  after: { tone: "gone", badge: "Cancelled", result: "Cancelled on PayPal, straight away." },
};

type Answer = "accept" | "cancel" | null;

/** One cancellation, start to finish. The visitor answers the offer as Maya. */
export function SavePreview() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer>(null);
  const s = SCENARIOS[index];
  const { calls, after } = answer === "cancel" ? CANCEL : s;
  const live = answer !== null;

  return (
    <div className="sp">
      <div className="card sp-frame">
        <header className="sp-bar">
          <span className="sp-who">
            <span className="sp-avatar" aria-hidden="true">
              M
            </span>
            <span>
              Maya Chen
              <small>Standard, $22 a month</small>
            </span>
          </span>
          <span className={`badge badge-${live ? after.tone : "ok"}`}>{live ? after.badge : "Active"}</span>
        </header>

        <div className="sp-reasons" role="tablist" aria-label="Why Maya wants to cancel">
          <span aria-hidden="true">She wants to cancel because</span>
          {SCENARIOS.map((x, i) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => {
                setIndex(i);
                setAnswer(null);
              }}
            >
              {x.tab}
            </button>
          ))}
        </div>

        <div key={s.id} className="sp-chat" role="tabpanel">
          <p className="sp-msg sp-mine rise">{s.said}</p>
          <p className="sp-msg sp-desk rise">{s.reply}</p>
          <div className="sp-offer rise">
            <strong>{s.offer}</strong>
            <span>{s.offerNote}</span>
            {answer === null ? (
              <div className="sp-offer-actions">
                <button type="button" className="btn btn-ok btn-sm" onClick={() => setAnswer("accept")}>
                  Yes, do this
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setAnswer("cancel")}>
                  No thanks, cancel
                </button>
              </div>
            ) : (
              <em>{answer === "accept" ? "Accepted" : "Declined"}</em>
            )}
          </div>
        </div>

        <section className="sp-paypal" aria-label="What reaches PayPal" aria-live="polite">
          <p className="sp-paypal-title">
            {live && <span className="live-dot" />}
            {live ? "Sent to PayPal" : "Runs on PayPal if she accepts"}
          </p>
          <ol key={`${s.id}-${answer}`} className="sp-calls" data-live={live}>
            {calls.map((c, i) => (
              <li key={c.req} style={{ "--i": i } as React.CSSProperties}>
                {c.plain ? <span className="sp-plain">{c.req}</span> : <code>{c.req}</code>}
                {live && <span className="sp-res">{c.res}</span>}
              </li>
            ))}
          </ol>
          {live && (
            <div key={`${s.id}-${answer}-done`} className="sp-result" style={{ "--i": calls.length } as React.CSSProperties}>
              <p>{after.result}</p>
              <button type="button" onClick={() => setAnswer(null)}>
                Answer again
              </button>
            </div>
          )}
        </section>
      </div>
      <p className="sp-caption">Try it: you are Maya. Pick a reason, then answer the offer.</p>
    </div>
  );
}
