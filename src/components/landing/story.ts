import type { CheckResult, OfferProposal } from "@/lib/policy";

/**
 * The landing page is one scroll story told on the orrery.
 * Beats: 0 hero, 1 cancel, 2 why, 3 offers, 4 guardrails, 5 PayPal, 6 agent, 7 close.
 */
export const BEAT = { hero: 0, cancel: 1, why: 2, offers: 3, guardrails: 4, paypal: 5, agent: 6, close: 7 } as const;

export type AgentChoice = "approve" | "cancel" | null;

/** What the guardrail playground decided, reduced to what the gate in the exit lane shows. */
export interface GuardView {
  verdict: "pass" | "clamped" | "rejected";
  /** Size of what the AI asked for, 0..1. */
  asked: number;
  /** Size of the merchant's limit for that kind of offer, 0..1. */
  limit: number;
  /** Size of what actually goes through, 0..1. */
  passed: number;
}

const size = {
  pause: (months: number) => months / 12,
  discount: (pct: number) => pct / 90,
  downgrade: (to: "lite" | "premium") => (to === "lite" ? 0.32 : 0.8),
};

export function guardView(
  proposal: OfferProposal,
  limits: { maxPause: number; maxDiscount: number },
  result: CheckResult,
): GuardView {
  let asked: number;
  let limit: number;
  if (proposal.type === "pause") {
    asked = size.pause(proposal.months ?? 1);
    limit = size.pause(limits.maxPause);
  } else if (proposal.type === "discount") {
    asked = size.discount(proposal.discountPct ?? 10);
    limit = size.discount(limits.maxDiscount);
  } else {
    asked = size.downgrade(proposal.toTier === "premium" ? "premium" : "lite");
    limit = 0.4;
  }
  if (!result.ok) return { verdict: "rejected", asked, limit, passed: 0 };
  const o = result.offer;
  const passed =
    o.type === "pause" ? size.pause(o.months ?? 1) : o.type === "discount" ? size.discount(o.discountPct ?? 5) : size.downgrade("lite");
  return { verdict: o.guardrailNotes.length > 0 ? "clamped" : "pass", asked, limit, passed };
}
