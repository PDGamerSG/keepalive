import type { CheckResult, OfferProposal } from "@/lib/policy";

/** What the guardrail playground decided, reduced to the three lengths its bar draws. */
export interface GuardView {
  verdict: "pass" | "clamped" | "rejected";
  /** Size of what the AI asked for, 0..1. */
  asked: number;
  /** Size of the merchant's limit for that kind of offer, 0..1. */
  limit: number;
  /** Size of what actually goes through, 0..1. */
  passed: number;
}

/** The far end of each bar: the longest pause and the deepest discount the playground can ask for. */
export const SCALE = { pauseMonths: 12, discountPct: 90 };

export function guardView(
  proposal: OfferProposal,
  limits: { maxPause: number; maxDiscount: number },
  result: CheckResult,
): GuardView {
  const verdict = !result.ok ? "rejected" : result.offer.guardrailNotes.length > 0 ? "clamped" : "pass";
  if (proposal.type === "pause") {
    return {
      verdict,
      asked: (proposal.months ?? 1) / SCALE.pauseMonths,
      limit: limits.maxPause / SCALE.pauseMonths,
      passed: result.ok ? (result.offer.months ?? 1) / SCALE.pauseMonths : 0,
    };
  }
  if (proposal.type === "discount") {
    return {
      verdict,
      asked: (proposal.discountPct ?? 10) / SCALE.discountPct,
      limit: limits.maxDiscount / SCALE.discountPct,
      passed: result.ok ? (result.offer.discountPct ?? 5) / SCALE.discountPct : 0,
    };
  }
  // A plan switch has no size to measure: it is allowed or it is not.
  return { verdict, asked: 0, limit: 0, passed: 0 };
}
