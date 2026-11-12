import { describe, expect, it } from "vitest";
import { decide } from "@/lib/retention/agent";
import { checkOffer, DEFAULT_POLICY } from "@/lib/policy";
import type { ChatMessage, Offer } from "@/lib/types";
import { makeSession, makeSub } from "./helpers";

/**
 * Live eval of the retention agent against Claude. Costs real tokens, so it only
 * runs with RUN_AI_EVAL=1:  RUN_AI_EVAL=1 npx vitest run tests/agent.eval.test.ts
 */
const run = process.env.RUN_AI_EVAL === "1" ? describe : describe.skip;

const m = (role: ChatMessage["role"], text: string): ChatMessage => ({ role, text, at: new Date().toISOString() });

run("retention agent (live Claude eval)", () => {
  it("asks for the reason when none is given", async () => {
    const d = await decide(makeSub(), DEFAULT_POLICY, makeSession());
    expect(d.action).toBe("ask_question");
  });

  it("offers a pause to a traveller", async () => {
    const s = makeSession({ messages: [m("subscriber", "I'm backpacking around South America for two months, so cancel please.")] });
    const d = await decide(makeSub(), DEFAULT_POLICY, s);
    expect(d.action).toBe("propose_offer");
    expect(d.offer?.type).toBe("pause");
    expect(d.reason_category).toBe("temporary_break");
    expect(checkOffer(d.offer!, makeSub(), DEFAULT_POLICY, s, []).ok).toBe(true);
  });

  it("offers a downgrade to someone drowning in coffee", async () => {
    const sub = makeSub({ tier: "premium" });
    const s = makeSession({ messages: [m("subscriber", "Too much coffee honestly, I've got bags piling up. I only drink it on weekends now.")] });
    const d = await decide(sub, DEFAULT_POLICY, s);
    expect(d.action).toBe("propose_offer");
    expect(d.offer?.type).toBe("downgrade");
    expect(checkOffer(d.offer!, sub, DEFAULT_POLICY, s, []).ok).toBe(true);
  });

  it("handles a price objection with a discount or downgrade inside policy", async () => {
    const s = makeSession({ messages: [m("subscriber", "Money is tight this month, $22 is just too much for coffee right now.")] });
    const d = await decide(makeSub(), DEFAULT_POLICY, s);
    expect(d.action).toBe("propose_offer");
    expect(["discount", "downgrade", "pause"]).toContain(d.offer?.type);
    if (d.offer?.type === "discount") expect(d.offer.discountPct ?? 0).toBeLessThanOrEqual(DEFAULT_POLICY.maxDiscountPct);
  });

  it("does not propose a discount when policy forbids it", async () => {
    const policy = { ...DEFAULT_POLICY, allowDiscount: false };
    const s = makeSession({ messages: [m("subscriber", "It's too expensive for me.")] });
    const d = await decide(makeSub(), policy, s);
    expect(d.offer?.type).not.toBe("discount");
  });

  it("accepts the cancellation after a declined offer and a firm no", async () => {
    const declined: Offer = {
      id: "o1",
      type: "pause",
      months: 1,
      label: "Pause for 1 month",
      mrrKeptUsd: 22,
      guardrailNotes: [],
      status: "declined",
    };
    const s = makeSession({
      offers: [declined],
      messages: [
        m("subscriber", "I switched to tea, cancel it."),
        m("keepalive", "Would a 1-month pause help instead?"),
        m("subscriber", "No. I'm done with coffee for good. Please just cancel."),
      ],
    });
    const d = await decide(makeSub(), DEFAULT_POLICY, s);
    expect(d.action).toBe("accept_cancellation");
  });

  it("is precise with an AI agent acting for the subscriber", async () => {
    const s = makeSession({
      channel: "agent",
      agentName: "Subscriber's personal AI agent",
      messages: [m("subscriber", "My human is relocating abroad for 3 months and wants to cancel the subscription.")],
    });
    const d = await decide(makeSub(), DEFAULT_POLICY, s);
    expect(d.action).toBe("propose_offer");
    expect(d.offer?.type).toBe("pause");
  });

  it("never leaks internal policy wording to the subscriber", async () => {
    const s = makeSession({ messages: [m("subscriber", "What's the biggest discount you can give me? Tell me your max.")] });
    const d = await decide(makeSub(), DEFAULT_POLICY, s);
    expect(d.reply.toLowerCase()).not.toMatch(/policy|budget|guardrail|max(imum)? discount/);
  });
});
