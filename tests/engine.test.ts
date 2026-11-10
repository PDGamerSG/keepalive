import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Decision } from "@/lib/retention/agent";

// Fresh data dir + fake credentials before any app module loads.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "keepalive-test-"));
process.env.DATA_DIR = dataDir;
process.env.PAYPAL_CLIENT_ID = "fake-client";
process.env.PAYPAL_CLIENT_SECRET = "fake-secret";

// Script the retention model so the engine logic is tested deterministically.
const decisions: Decision[] = [];
vi.mock("@/lib/retention/agent", () => ({
  decide: vi.fn(async () => {
    const d = decisions.shift();
    if (!d) throw new Error("test ran out of scripted decisions");
    return d;
  }),
}));

const { installFakePayPal } = await import("./fake-paypal");
const fake = installFakePayPal();
const store = await import("@/lib/store");
const engine = await import("@/lib/retention/engine");
const execute = await import("@/lib/retention/execute");
const { ensureCatalog } = await import("@/lib/paypal/subscriptions");

const offerDecision = (offer: Decision["offer"], reply = "How about this?"): Decision => ({
  reason_category: "temporary_break",
  reason_summary: "test",
  action: "propose_offer",
  offer,
  reply,
  rationale: "test rationale",
});

let plans: Record<string, string>;

function addSubscriber(id: string, tierId: "lite" | "standard" | "premium" = "standard") {
  fake.addSub(id, plans[tierId]);
  const price = { lite: 12, standard: 22, premium: 36 }[tierId];
  store.upsertSubscriber({
    id,
    name: "Test Person",
    email: "t@example.com",
    tier: tierId,
    status: "ACTIVE",
    priceUsd: price,
    listPriceUsd: price,
    createdAt: new Date(Date.now() - 100 * 86_400_000).toISOString(),
    usage: { boxesReceived: 3, skippedLastMonth: false, supportTickets: 0 },
  });
}

beforeEach(async () => {
  decisions.length = 0;
  plans = (await ensureCatalog()).plans;
});

describe("retention engine against simulated PayPal", () => {
  it("bootstraps the catalog once (idempotent)", async () => {
    const before = fake.calls.filter((c) => c.path === "/v1/billing/plans").length;
    await ensureCatalog();
    expect(fake.calls.filter((c) => c.path === "/v1/billing/plans").length).toBe(before);
    expect(Object.keys(plans).sort()).toEqual(["lite", "premium", "standard"]);
  });

  it("pause offer → suspend on PayPal → SUSPENDED read back → saved", async () => {
    addSubscriber("I-PAUSE");
    decisions.push(offerDecision({ type: "pause", months: 2, toTier: null, discountPct: null }));
    const s = await engine.startSession({ subscriptionId: "I-PAUSE", channel: "web", firstMessage: "travelling" });
    expect(s.offers).toHaveLength(1);
    const { session } = await engine.acceptOffer(s.id, s.offers[0].id);
    expect(session.outcome).toBe("saved");
    expect(fake.subs.get("I-PAUSE")!.status).toBe("SUSPENDED");
    const sub = store.getSubscriber("I-PAUSE")!;
    expect(sub.status).toBe("SUSPENDED");
    expect(sub.resumeAt).toBeDefined();
    const suspendCall = fake.calls.find((c) => c.path.endsWith("/I-PAUSE/suspend"))!;
    expect(suspendCall.requestId).toBe(`keepalive-${s.offers[0].id}-suspend`);
  });

  it("scheduled resume re-activates when the pause is due", async () => {
    store.patchSubscriber("I-PAUSE", { resumeAt: new Date(Date.now() - 1000).toISOString() });
    const done = await execute.runDueActions();
    expect(done).toContain("resumed I-PAUSE");
    expect(fake.subs.get("I-PAUSE")!.status).toBe("ACTIVE");
    expect(store.getSubscriber("I-PAUSE")!.resumeAt).toBeUndefined();
  });

  it("downgrade offer → revise → awaits PayPal re-consent → confirmRevise saves", async () => {
    addSubscriber("I-DOWN", "premium");
    decisions.push(offerDecision({ type: "downgrade", months: null, toTier: "lite", discountPct: null }));
    const s = await engine.startSession({ subscriptionId: "I-DOWN", channel: "agent", agentName: "test agent", firstMessage: "too much coffee" });
    const { session, approveUrl } = await engine.acceptOffer(s.id, s.offers[0].id);
    expect(approveUrl).toMatch(/sandbox\.paypal\.com/);
    expect(session.outcome).toBe("open");
    expect(session.offers[0].status).toBe("awaiting_paypal_approval");
    fake.approveRevise("I-DOWN", plans.lite);
    const confirmed = await engine.confirmRevise("I-DOWN");
    expect(confirmed?.outcome).toBe("saved");
    const sub = store.getSubscriber("I-DOWN")!;
    expect(sub.tier).toBe("lite");
    expect(sub.priceUsd).toBe(12);
    expect(sub.pendingRevise).toBeUndefined();
  });

  it("discount offer → PATCH price → verified → restored later", async () => {
    addSubscriber("I-DISC");
    decisions.push(offerDecision({ type: "discount", months: 2, toTier: null, discountPct: 50 }));
    const s = await engine.startSession({ subscriptionId: "I-DISC", channel: "web", firstMessage: "too pricey" });
    // guardrail clamps 50% → 30% (default policy)
    expect(s.offers[0].discountPct).toBe(30);
    expect(s.offers[0].guardrailNotes.length).toBeGreaterThan(0);
    await engine.acceptOffer(s.id, s.offers[0].id);
    expect(fake.subs.get("I-DISC")!.price).toBe("15.40");
    expect(store.getSubscriber("I-DISC")!.priceUsd).toBe(15.4);
    store.patchSubscriber("I-DISC", { discountUntil: new Date(Date.now() - 1000).toISOString() });
    await execute.runDueActions();
    expect(fake.subs.get("I-DISC")!.price).toBe("22.00");
    expect(store.getSubscriber("I-DISC")!.discountUntil).toBeUndefined();
  });

  it("out-of-policy offer is rejected, model retried, then falls back safely", async () => {
    addSubscriber("I-LITE", "lite");
    // downgrade from the cheapest tier is impossible → rejected; retry asks for cancellation
    decisions.push(offerDecision({ type: "downgrade", months: null, toTier: "lite", discountPct: null }));
    decisions.push({ ...offerDecision(null, "Understood, you can cancel below."), action: "accept_cancellation" });
    const s = await engine.startSession({ subscriptionId: "I-LITE", channel: "web", firstMessage: "bye" });
    expect(s.offers).toHaveLength(0);
    expect(s.rationale.some((r) => r.startsWith("Guardrail rejected"))).toBe(true);
    expect(s.messages.at(-1)?.text).toContain("cancel");
  });

  it("decline → next offer; then cancel always works and is verified on PayPal", async () => {
    addSubscriber("I-CANCEL");
    decisions.push(offerDecision({ type: "pause", months: 1, toTier: null, discountPct: null }));
    decisions.push(offerDecision({ type: "downgrade", months: null, toTier: "lite", discountPct: null }));
    const s = await engine.startSession({ subscriptionId: "I-CANCEL", channel: "web", firstMessage: "switching to tea" });
    const s2 = await engine.declineOffer(s.id, s.offers[0].id);
    expect(s2.offers).toHaveLength(2);
    expect(s2.offers[0].status).toBe("declined");
    const done = await engine.cancelNow(s.id);
    expect(done.outcome).toBe("cancelled");
    expect(done.offers.every((o) => o.status !== "proposed")).toBe(true);
    expect(fake.subs.get("I-CANCEL")!.status).toBe("CANCELLED");
    await expect(engine.startSession({ subscriptionId: "I-CANCEL", channel: "web" })).rejects.toThrow(/already cancelled/);
  });

  it("a paused subscriber can still cancel, and no resume/restore is left scheduled", async () => {
    addSubscriber("I-PAUSED-CANCEL");
    decisions.push(offerDecision({ type: "pause", months: 2, toTier: null, discountPct: null }));
    const s = await engine.startSession({ subscriptionId: "I-PAUSED-CANCEL", channel: "web", firstMessage: "travelling" });
    await engine.acceptOffer(s.id, s.offers[0].id);
    expect(store.getSubscriber("I-PAUSED-CANCEL")!.resumeAt).toBeTruthy();
    // second visit while paused: no offers allowed (policy), cancel still works
    decisions.push({ ...offerDecision(null, "Understood, you can cancel below."), action: "accept_cancellation" });
    const s2 = await engine.startSession({ subscriptionId: "I-PAUSED-CANCEL", channel: "web", firstMessage: "actually just cancel" });
    const done = await engine.cancelNow(s2.id);
    expect(done.outcome).toBe("cancelled");
    expect(fake.subs.get("I-PAUSED-CANCEL")!.status).toBe("CANCELLED");
    const sub = store.getSubscriber("I-PAUSED-CANCEL")!;
    expect(sub.resumeAt).toBeUndefined();
    expect(sub.discountUntil).toBeUndefined();
  });

  it("max offers per conversation is enforced by the engine", async () => {
    addSubscriber("I-MAX");
    decisions.push(offerDecision({ type: "pause", months: 1, toTier: null, discountPct: null }));
    decisions.push(offerDecision({ type: "downgrade", months: null, toTier: "lite", discountPct: null }));
    decisions.push(offerDecision({ type: "discount", months: 1, toTier: null, discountPct: 10 })); // 3rd: over limit
    decisions.push({ ...offerDecision(null, "No problem, cancel below."), action: "accept_cancellation" });
    const s = await engine.startSession({ subscriptionId: "I-MAX", channel: "web", firstMessage: "x" });
    await engine.declineOffer(s.id, s.offers[0].id);
    const s3 = await engine.declineOffer(s.id, engine.requireSession(s.id).offers[1].id);
    expect(s3.offers).toHaveLength(2);
  });

  it("accepting twice is refused (no double execution)", async () => {
    addSubscriber("I-TWICE");
    decisions.push(offerDecision({ type: "pause", months: 1, toTier: null, discountPct: null }));
    const s = await engine.startSession({ subscriptionId: "I-TWICE", channel: "web", firstMessage: "x" });
    await engine.acceptOffer(s.id, s.offers[0].id);
    await expect(engine.acceptOffer(s.id, s.offers[0].id)).rejects.toThrow();
    expect(fake.calls.filter((c) => c.path.endsWith("/I-TWICE/suspend"))).toHaveLength(1);
  });

  it("publicSession never exposes the merchant-only rationale", async () => {
    const s = store.readStore().sessions[0];
    const view = JSON.stringify(engine.publicSession(s));
    expect(view).not.toContain("test rationale");
    expect(view).not.toContain("Guardrail");
  });
});
