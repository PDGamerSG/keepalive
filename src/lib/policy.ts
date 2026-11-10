import { z } from "zod";
import { cheaperTiers, tier, TIER_ORDER } from "./catalog";
import type { Offer, OfferType, RetentionSession, Subscriber, TierId } from "./types";

/**
 * Merchant retention policy + deterministic guardrails.
 * The AI *proposes* offers; checkOffer() decides. Nothing outside this policy
 * can ever reach PayPal.
 */

export const MerchantPolicySchema = z.object({
  allowPause: z.boolean(),
  maxPauseMonths: z.number().int().min(1).max(6),
  allowDowngrade: z.boolean(),
  allowDiscount: z.boolean(),
  maxDiscountPct: z.number().int().min(5).max(75),
  maxDiscountMonths: z.number().int().min(1).max(12),
  minTenureDaysForDiscount: z.number().int().min(0).max(365),
  monthlyDiscountBudgetUsd: z.number().min(0).max(100000),
  maxOffersPerSession: z.number().int().min(0).max(3),
  brandVoice: z.string().max(400),
  merchantNotes: z.string().max(1000),
});

export type MerchantPolicy = z.infer<typeof MerchantPolicySchema>;

export const DEFAULT_POLICY: MerchantPolicy = {
  allowPause: true,
  maxPauseMonths: 3,
  allowDowngrade: true,
  allowDiscount: true,
  maxDiscountPct: 30,
  maxDiscountMonths: 3,
  minTenureDaysForDiscount: 0,
  monthlyDiscountBudgetUsd: 150,
  maxOffersPerSession: 2,
  brandVoice: "Warm, brief and honest, like a friendly barista. No guilt-tripping, no pressure.",
  merchantNotes:
    "Pauses are cheapest for us, so prefer a pause for travel or temporary reasons. Prefer a downgrade when the customer has too much coffee. Use discounts only when price is the real problem.",
};

export interface OfferProposal {
  type: OfferType;
  months?: number | null;
  toTier?: TierId | null;
  discountPct?: number | null;
}

export type CheckResult =
  | { ok: true; offer: Omit<Offer, "id" | "status"> }
  | { ok: false; reason: string };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function offerLabel(o: { type: OfferType; months?: number; toTier?: TierId; discountPct?: number }): string {
  switch (o.type) {
    case "pause":
      return `Pause for ${o.months} month${o.months === 1 ? "" : "s"}`;
    case "downgrade":
      return `Switch to ${tier(o.toTier!).name} ($${tier(o.toTier!).priceUsd}/mo)`;
    case "discount":
      return `${o.discountPct}% off for ${o.months} month${o.months === 1 ? "" : "s"}`;
  }
}

/** Dollars per month currently being given away through active retention discounts. */
export function activeDiscountSpend(subscribers: Subscriber[]): number {
  return subscribers
    .filter((s) => s.discountUntil && s.status === "ACTIVE")
    .reduce((acc, s) => acc + Math.max(0, s.listPriceUsd - s.priceUsd), 0);
}

export function checkOffer(
  proposal: OfferProposal,
  sub: Subscriber,
  policy: MerchantPolicy,
  session: RetentionSession,
  allSubscribers: Subscriber[],
): CheckResult {
  const notes: string[] = [];
  const proposedCount = session.offers.length;
  if (proposedCount >= policy.maxOffersPerSession) {
    return { ok: false, reason: `offer limit reached (${policy.maxOffersPerSession} per conversation)` };
  }
  if (sub.status !== "ACTIVE") {
    return { ok: false, reason: `subscription is ${sub.status}, offers need an ACTIVE subscription` };
  }
  const tenureDays = (Date.now() - new Date(sub.createdAt).getTime()) / 86_400_000;

  if (proposal.type === "pause") {
    if (!policy.allowPause) return { ok: false, reason: "pauses are disabled by merchant policy" };
    const requested = Math.round(proposal.months ?? 1);
    const months = clamp(requested, 1, policy.maxPauseMonths);
    if (months !== requested) notes.push(`clamped pause ${requested} → ${months} months (policy max ${policy.maxPauseMonths})`);
    if (session.offers.some((o) => o.type === "pause" && o.months === months)) {
      return { ok: false, reason: "that exact pause was already offered" };
    }
    return {
      ok: true,
      offer: { type: "pause", months, label: offerLabel({ type: "pause", months }), mrrKeptUsd: sub.priceUsd, guardrailNotes: notes },
    };
  }

  if (proposal.type === "downgrade") {
    if (!policy.allowDowngrade) return { ok: false, reason: "downgrades are disabled by merchant policy" };
    const options = cheaperTiers(sub.tier);
    if (options.length === 0) return { ok: false, reason: `already on the cheapest tier (${tier(sub.tier).name})` };
    let toTier = proposal.toTier ?? undefined;
    if (!toTier || !options.some((t) => t.id === toTier)) {
      const fallback = options[options.length - 1].id; // next tier down
      notes.push(`target tier ${toTier ?? "none"} not cheaper than ${sub.tier}; using ${fallback}`);
      toTier = fallback;
    }
    if (session.offers.some((o) => o.type === "downgrade" && o.toTier === toTier)) {
      return { ok: false, reason: "that downgrade was already offered" };
    }
    return {
      ok: true,
      offer: {
        type: "downgrade",
        toTier,
        label: offerLabel({ type: "downgrade", toTier }),
        mrrKeptUsd: tier(toTier).priceUsd,
        guardrailNotes: notes,
      },
    };
  }

  // discount
  if (!policy.allowDiscount) return { ok: false, reason: "discounts are disabled by merchant policy" };
  if (tenureDays < policy.minTenureDaysForDiscount) {
    return { ok: false, reason: `discounts need ${policy.minTenureDaysForDiscount} days of tenure (has ${Math.floor(tenureDays)})` };
  }
  if (sub.discountUntil) return { ok: false, reason: "subscriber already has an active retention discount" };
  const requestedPct = Math.round(proposal.discountPct ?? 10);
  let pct = clamp(Math.round(requestedPct / 5) * 5, 5, policy.maxDiscountPct);
  if (pct !== requestedPct) notes.push(`adjusted discount ${requestedPct}% → ${pct}% (policy max ${policy.maxDiscountPct}%, steps of 5)`);
  const requestedMonths = Math.round(proposal.months ?? 1);
  const months = clamp(requestedMonths, 1, policy.maxDiscountMonths);
  if (months !== requestedMonths) notes.push(`clamped discount length ${requestedMonths} → ${months} months`);

  const spend = activeDiscountSpend(allSubscribers);
  let cost = (sub.priceUsd * pct) / 100;
  while (spend + cost > policy.monthlyDiscountBudgetUsd && pct > 5) {
    pct -= 5;
    cost = (sub.priceUsd * pct) / 100;
    notes.push(`reduced to ${pct}% to stay within the monthly discount budget ($${policy.monthlyDiscountBudgetUsd})`);
  }
  if (spend + cost > policy.monthlyDiscountBudgetUsd) {
    return { ok: false, reason: "monthly discount budget exhausted" };
  }
  if (session.offers.some((o) => o.type === "discount" && o.discountPct === pct)) {
    return { ok: false, reason: "that discount was already offered" };
  }
  const newPrice = Math.round(sub.priceUsd * (100 - pct)) / 100;
  return {
    ok: true,
    offer: {
      type: "discount",
      discountPct: pct,
      months,
      label: offerLabel({ type: "discount", discountPct: pct, months }),
      mrrKeptUsd: newPrice,
      guardrailNotes: notes,
    },
  };
}

/** Describe what the policy allows, in plain text, for the model prompt. */
export function describePolicy(policy: MerchantPolicy, sub: Subscriber): string {
  const lines: string[] = [];
  lines.push(`- Pause: ${policy.allowPause ? `allowed, 1–${policy.maxPauseMonths} months` : "NOT allowed"}`);
  const cheaper = cheaperTiers(sub.tier);
  lines.push(
    `- Downgrade: ${
      policy.allowDowngrade && cheaper.length
        ? `allowed to ${cheaper.map((t) => `${t.id} ($${t.priceUsd}/mo)`).join(", ")}`
        : "NOT available"
    }`,
  );
  lines.push(
    `- Discount: ${
      policy.allowDiscount ? `allowed, up to ${policy.maxDiscountPct}% for up to ${policy.maxDiscountMonths} months` : "NOT allowed"
    }`,
  );
  lines.push(`- At most ${policy.maxOffersPerSession} offers per conversation. Cancellation must always remain available.`);
  if (policy.merchantNotes) lines.push(`- Merchant guidance: ${policy.merchantNotes}`);
  return lines.join("\n");
}

export const ALL_TIERS = TIER_ORDER;
