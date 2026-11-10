import { describe, expect, it } from "vitest";
import { activeDiscountSpend, checkOffer, DEFAULT_POLICY } from "@/lib/policy";
import type { Offer } from "@/lib/types";
import { makeSession, makeSub } from "./helpers";

const policy = DEFAULT_POLICY;

function offer(o: Partial<Offer>): Offer {
  return { id: "x", type: "pause", label: "", mrrKeptUsd: 0, guardrailNotes: [], status: "declined", ...o };
}

describe("checkOffer guardrails", () => {
  it("approves an in-policy pause and labels it", () => {
    const r = checkOffer({ type: "pause", months: 2 }, makeSub(), policy, makeSession(), []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.offer.months).toBe(2);
      expect(r.offer.label).toBe("Pause for 2 months");
      expect(r.offer.guardrailNotes).toEqual([]);
    }
  });

  it("clamps a pause longer than policy allows", () => {
    const r = checkOffer({ type: "pause", months: 12 }, makeSub(), policy, makeSession(), []);
    expect(r.ok && r.offer.months).toBe(policy.maxPauseMonths);
    expect(r.ok && r.offer.guardrailNotes.length).toBe(1);
  });

  it("rejects pauses when disabled", () => {
    const r = checkOffer({ type: "pause", months: 1 }, makeSub(), { ...policy, allowPause: false }, makeSession(), []);
    expect(r.ok).toBe(false);
  });

  it("only downgrades to a cheaper tier", () => {
    const up = checkOffer({ type: "downgrade", toTier: "premium" }, makeSub({ tier: "standard" }), policy, makeSession(), []);
    expect(up.ok && up.offer.toTier).toBe("lite");
    const fromLite = checkOffer({ type: "downgrade", toTier: "lite" }, makeSub({ tier: "lite" }), policy, makeSession(), []);
    expect(fromLite.ok).toBe(false);
  });

  it("computes the kept MRR for a downgrade", () => {
    const r = checkOffer({ type: "downgrade", toTier: "lite" }, makeSub({ tier: "premium" }), policy, makeSession(), []);
    expect(r.ok && r.offer.mrrKeptUsd).toBe(12);
  });

  it("clamps discounts to the policy maximum in 5% steps", () => {
    const r = checkOffer({ type: "discount", discountPct: 63, months: 9 }, makeSub(), policy, makeSession(), []);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.offer.discountPct).toBe(policy.maxDiscountPct);
      expect(r.offer.months).toBe(policy.maxDiscountMonths);
      expect(r.offer.mrrKeptUsd).toBeCloseTo(22 * 0.7, 2);
    }
  });

  it("respects the discount tenure rule", () => {
    const newSub = makeSub({ createdAt: new Date().toISOString() });
    const r = checkOffer({ type: "discount", discountPct: 10, months: 1 }, newSub, { ...policy, minTenureDaysForDiscount: 30 }, makeSession(), []);
    expect(r.ok).toBe(false);
  });

  it("shrinks or rejects a discount that would exceed the monthly budget", () => {
    const others = [makeSub({ id: "A", priceUsd: 10, listPriceUsd: 36, discountUntil: new Date(Date.now() + 1e9).toISOString() })];
    expect(activeDiscountSpend(others)).toBe(26);
    const tight = { ...policy, monthlyDiscountBudgetUsd: 30 };
    const r = checkOffer({ type: "discount", discountPct: 30, months: 1 }, makeSub(), tight, makeSession(), others);
    // 26 already spent, $4 left: 30% of $22 = 6.6 too much → 15% = 3.3 fits
    expect(r.ok && r.offer.discountPct).toBe(15);
    const none = checkOffer({ type: "discount", discountPct: 30, months: 1 }, makeSub(), { ...policy, monthlyDiscountBudgetUsd: 26.5 }, makeSession(), others);
    expect(none.ok).toBe(false);
  });

  it("enforces max offers per conversation", () => {
    const session = makeSession({ offers: [offer({ type: "pause", months: 1 }), offer({ type: "downgrade", toTier: "lite" })] });
    const r = checkOffer({ type: "discount", discountPct: 10, months: 1 }, makeSub(), policy, session, []);
    expect(r.ok).toBe(false);
  });

  it("never repeats an identical offer", () => {
    const session = makeSession({ offers: [offer({ type: "pause", months: 2 })] });
    const r = checkOffer({ type: "pause", months: 2 }, makeSub(), policy, session, []);
    expect(r.ok).toBe(false);
  });

  it("refuses offers for non-active subscriptions", () => {
    const r = checkOffer({ type: "pause", months: 1 }, makeSub({ status: "SUSPENDED" }), policy, makeSession(), []);
    expect(r.ok).toBe(false);
  });
});
