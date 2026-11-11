"use client";

import { useMemo, useState } from "react";
import { checkOffer, DEFAULT_POLICY, type OfferProposal } from "@/lib/policy";
import type { RetentionSession, Subscriber } from "@/lib/types";
import { Slider, Toggle } from "../ui/controls";
import { guardView, type GuardView } from "./guard";

/** The example subscriber the playground checks offers for. Fixed values: nothing is fetched. */
const MAYA: Subscriber = {
  id: "I-DEMO",
  name: "Maya",
  email: "maya@example.com",
  tier: "standard",
  status: "ACTIVE",
  priceUsd: 22,
  listPriceUsd: 22,
  createdAt: "2026-05-11T00:00:00.000Z",
  usage: { boxesReceived: 6, skippedLastMonth: false, supportTickets: 0 },
};

const EMPTY_SESSION: RetentionSession = {
  id: "landing",
  subscriptionId: MAYA.id,
  channel: "web",
  startedAt: "2026-11-11T00:00:00.000Z",
  messages: [],
  offers: [],
  outcome: "open",
  rationale: [],
};

type ProposalType = OfferProposal["type"];

const TYPES: [ProposalType, string][] = [
  ["pause", "Pause"],
  ["downgrade", "Switch plan"],
  ["discount", "Discount"],
];

const TARGETS: ["lite" | "premium", string][] = [
  ["lite", "To Lite, $12"],
  ["premium", "To Premium, $36"],
];

const ALLOW_LABEL: Record<ProposalType, string> = {
  pause: "Pauses allowed",
  downgrade: "Plan switches allowed",
  discount: "Discounts allowed",
};

const VERDICT_TONE = { pass: "ok", clamped: "offer", rejected: "gone" } as const;
const VERDICT_TITLE = { pass: "Approved as asked", clamped: "Cut down to fit", rejected: "Turned back" } as const;

/** The guardrail playground: the real checkOffer(), run in the browser. */
export function GuardLab() {
  const [type, setType] = useState<ProposalType>("discount");
  const [pauseMonths, setPauseMonths] = useState(9);
  const [toTier, setToTier] = useState<"lite" | "premium">("lite");
  const [discountPct, setDiscountPct] = useState(50);
  const [discountMonths, setDiscountMonths] = useState(6);
  const [maxPause, setMaxPause] = useState(DEFAULT_POLICY.maxPauseMonths);
  const [maxDiscount, setMaxDiscount] = useState(DEFAULT_POLICY.maxDiscountPct);
  const [allowed, setAllowed] = useState<Record<ProposalType, boolean>>({ pause: true, downgrade: true, discount: true });

  const { verdict, guard } = useMemo(() => {
    const proposal: OfferProposal =
      type === "pause"
        ? { type, months: pauseMonths }
        : type === "downgrade"
          ? { type, toTier }
          : { type, discountPct, months: discountMonths };
    const policy = {
      ...DEFAULT_POLICY,
      maxPauseMonths: maxPause,
      maxDiscountPct: maxDiscount,
      allowPause: allowed.pause,
      allowDowngrade: allowed.downgrade,
      allowDiscount: allowed.discount,
    };
    const result = checkOffer(proposal, MAYA, policy, EMPTY_SESSION, [MAYA]);
    return { verdict: result, guard: guardView(proposal, { maxPause, maxDiscount }, result) };
  }, [type, pauseMonths, toTier, discountPct, discountMonths, maxPause, maxDiscount, allowed]);

  return (
    <div className="card lab">
      <fieldset>
        <legend>The AI asks for</legend>
        <div className="seg" role="radiogroup" aria-label="Offer type">
          {TYPES.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => setType(value)}>
              {label}
            </button>
          ))}
        </div>
        {type === "pause" && (
          <Slider label="Pause length" value={pauseMonths} min={1} max={12} unit=" months" onChange={setPauseMonths} />
        )}
        {type === "downgrade" && (
          <div className="seg" role="radiogroup" aria-label="Target plan">
            {TARGETS.map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={toTier === value} onClick={() => setToTier(value)}>
                {label}
              </button>
            ))}
          </div>
        )}
        {type === "discount" && (
          <>
            <Slider label="Discount" value={discountPct} min={5} max={90} step={5} unit="%" onChange={setDiscountPct} />
            <Slider label="For" value={discountMonths} min={1} max={12} unit=" months" onChange={setDiscountMonths} />
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>Your limits</legend>
        <Toggle label={ALLOW_LABEL[type]} checked={allowed[type]} onChange={(v) => setAllowed({ ...allowed, [type]: v })} />
        <Slider label="Longest pause" value={maxPause} min={1} max={6} unit=" months" onChange={setMaxPause} />
        <Slider label="Biggest discount" value={maxDiscount} min={5} max={75} step={5} unit="%" onChange={setMaxDiscount} />
      </fieldset>

      <div className="lab-verdict" aria-live="polite">
        <span className={`badge badge-${VERDICT_TONE[guard.verdict]}`}>{VERDICT_TITLE[guard.verdict]}</span>
        {verdict.ok ? (
          <>
            <p className="display lab-offer">{verdict.offer.label}</p>
            {type !== "downgrade" && <GuardBar guard={guard} />}
            {verdict.offer.guardrailNotes.length > 0 ? (
              <ul>
                {verdict.offer.guardrailNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p>Inside every limit, passed through unchanged.</p>
            )}
            <p className="lab-kept">Keeps ${verdict.offer.mrrKeptUsd.toFixed(2)} a month of Maya&apos;s $22.</p>
          </>
        ) : (
          <>
            <p className="display lab-offer">Nothing reaches PayPal</p>
            {type !== "downgrade" && <GuardBar guard={guard} />}
            <p>{verdict.reason}.</p>
          </>
        )}
      </div>
    </div>
  );
}

/** What the AI asked for (hatched), your limit (the rule), and what goes through (solid). */
function GuardBar({ guard }: { guard: GuardView }) {
  return (
    <div className="lab-bar-wrap" data-verdict={guard.verdict} aria-hidden="true">
      <div className="lab-bar">
        <i className="lab-bar-asked" style={{ width: `${guard.asked * 100}%` }} />
        <i className="lab-bar-passed" style={{ width: `${guard.passed * 100}%` }} />
        <i className="lab-bar-limit" style={{ left: `${guard.limit * 100}%` }} />
      </div>
      <div className="lab-bar-key">
        <span className="is-asked">Asked for</span>
        <span className="is-passed">Goes through</span>
        <span className="is-limit">Your limit</span>
      </div>
    </div>
  );
}
