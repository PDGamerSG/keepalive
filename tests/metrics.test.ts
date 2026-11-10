import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/metrics";
import type { Offer, StoreShape } from "@/lib/types";
import { makeSession, makeSub } from "./helpers";

const executed = (mrrKeptUsd: number): Offer =>
  ({ id: "o1", type: "discount", label: "x", status: "executed", mrrKeptUsd }) as Offer;

const store = (over: Partial<StoreShape>): StoreShape => ({ config: { plans: {} }, subscribers: [], sessions: [], events: [], webhookIds: [], ...over }) as StoreShape;

describe("computeMetrics", () => {
  it("counts saves per subscriber, using the latest save", () => {
    const m = computeMetrics(
      store({
        subscribers: [makeSub({ id: "A" })],
        sessions: [
          makeSession({ id: "1", subscriptionId: "A", outcome: "saved", offers: [executed(22)] }),
          makeSession({ id: "2", subscriptionId: "A", outcome: "saved", offers: [executed(15.4)] }),
        ],
      }),
    );
    expect(m.saved).toBe(1);
    expect(m.mrrSavedUsd).toBe(15.4);
    expect(m.saveRatePct).toBe(100);
  });

  it("a subscriber saved earlier who later cancelled is a loss, not a save", () => {
    const m = computeMetrics(
      store({
        subscribers: [makeSub({ id: "A", status: "CANCELLED" }), makeSub({ id: "B" })],
        sessions: [
          makeSession({ id: "1", subscriptionId: "A", outcome: "saved", offers: [executed(22)] }),
          makeSession({ id: "2", subscriptionId: "A", outcome: "cancelled" }),
          makeSession({ id: "3", subscriptionId: "B", outcome: "open" }),
        ],
      }),
    );
    expect(m.saved).toBe(0);
    expect(m.cancelled).toBe(1);
    expect(m.open).toBe(1);
    expect(m.mrrSavedUsd).toBe(0);
    expect(m.saveRatePct).toBe(0);
  });
});
