import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, expect, it, vi } from "vitest";
import { installFakePayPal } from "./fake-paypal";
import { makeSub } from "./helpers";

const model = vi.hoisted(() => ({ create: vi.fn(), decide: vi.fn() }));
vi.mock("@/lib/ai", () => ({ MODEL: "test-model", FALLBACK_BETA: "test", anthropic: () => ({ beta: { messages: { create: model.create } } }) }));
vi.mock("@/lib/retention/agent", () => ({ decide: model.decide }));
const originalFetch = globalThis.fetch;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "keepalive-consumer-"));
let fake: ReturnType<typeof installFakePayPal>;

function tool(name: string, input: Record<string, unknown>) {
  return { model: "test-model", usage: { input_tokens: 20, output_tokens: 10 }, stop_reason: "tool_use", content: [{ type: "tool_use", id: `tool-${name}`, name, input }] };
}
beforeEach(async () => {
  vi.resetModules(); model.create.mockReset(); model.decide.mockReset();
  process.env.DATA_DIR = dir;
  process.env.PAYPAL_CLIENT_ID = "test-client"; process.env.PAYPAL_CLIENT_SECRET = "test-secret";
  delete process.env.BLOB_READ_WRITE_TOKEN; delete process.env.VERCEL;
  fs.rmSync(path.join(dir, "store.json"), { force: true });
  fake = installFakePayPal();
  const { ensureCatalog } = await import("@/lib/paypal/subscriptions");
  const { upsertSubscriber } = await import("@/lib/store");
  const { plans } = await ensureCatalog();
  fake.addSub("I-TEST", plans.standard);
  await upsertSubscriber(makeSub());
  model.decide.mockResolvedValue({ reason_category: "temporary_break", reason_summary: "travel", action: "propose_offer", offer: { type: "pause", months: 2 }, reply: "Pause for two months?", rationale: "Travel is temporary." });
});
afterAll(() => { globalThis.fetch = originalFetch; fs.rmSync(dir, { recursive: true, force: true }); });

function negotiate(askHuman: boolean) {
  model.create.mockResolvedValueOnce(tool("request_cancellation", { reason: "I am travelling for two months." }));
  model.create.mockImplementationOnce((req: { messages: { content: { content: string }[] }[] }) => {
    const session = JSON.parse(req.messages.at(-1)!.content[0].content);
    const offer_id = session.offers[0].offer_id;
    return tool(askHuman ? "ask_my_human" : "accept_offer", askHuman ? { question: "Would you like this pause?", offer_id } : { offer_id });
  });
}

it("requires an existing subscriber before starting a paid AI run", async () => {
  const { startAgentRun } = await import("@/lib/agents/consumer");
  await expect(startAgentRun("I-MISSING", "Cancel please")).rejects.toMatchObject({ status: 404 });
  const { readStore } = await import("@/lib/store");
  expect(Object.keys((await readStore()).agentRuns ?? {})).toHaveLength(0);
  expect(model.create).not.toHaveBeenCalled();
});

it("refuses an agent's attempt to accept before asking its human", async () => {
  negotiate(false);
  model.create.mockResolvedValueOnce(tool("finish", { summary: "No changes made." }));
  const { startAgentRun } = await import("@/lib/agents/consumer");
  const run = await startAgentRun("I-TEST", "I am travelling.");
  expect(fake.subs.get("I-TEST")?.status).toBe("ACTIVE");
  expect(JSON.stringify(run.messages)).toContain("your human has not approved");
  expect(run.approvedOfferIds).toEqual([]);
});

it("waits for explicit human approval, then executes and verifies the accepted offer", async () => {
  negotiate(true);
  const { startAgentRun, answerHuman, getRun, publicRun } = await import("@/lib/agents/consumer");
  const waiting = await startAgentRun("I-TEST", "I am travelling.");
  expect(waiting.status).toBe("waiting_human");
  expect(fake.subs.get("I-TEST")?.status).toBe("ACTIVE");
  expect((await getRun(waiting.id))?.pendingQuestion?.offerId).toBeTruthy();
  model.create.mockResolvedValueOnce(tool("accept_offer", { offer_id: waiting.pendingQuestion!.offerId }));
  model.create.mockResolvedValueOnce(tool("finish", { summary: "Paused for two months." }));
  const done = await answerHuman(waiting.id, "Yes please", true);
  expect(done.status).toBe("done");
  expect(fake.subs.get("I-TEST")?.status).toBe("SUSPENDED");
  const { getSubscriber } = await import("@/lib/store");
  expect((await getSubscriber("I-TEST"))?.resumeAt).toBeTruthy();
  expect(publicRun(done)).not.toHaveProperty("messages");
});

it("keeps a declined offer unauthorized even if the model tries to accept it", async () => {
  negotiate(true);
  const { startAgentRun, answerHuman } = await import("@/lib/agents/consumer");
  const waiting = await startAgentRun("I-TEST", "I am travelling.");
  model.create.mockResolvedValueOnce(tool("accept_offer", { offer_id: waiting.pendingQuestion!.offerId }));
  model.create.mockResolvedValueOnce(tool("cancel_subscription", {}));
  model.create.mockResolvedValueOnce(tool("finish", { summary: "Cancelled as requested." }));
  const done = await answerHuman(waiting.id, "Just cancel", false);
  expect(done.approvedOfferIds).toEqual([]);
  expect(JSON.stringify(done.messages)).toContain("your human has not approved");
  expect(fake.subs.get("I-TEST")?.status).toBe("CANCELLED");
});

it("persists a provider failure as an error instead of claiming completion", async () => {
  model.create.mockRejectedValue(new Error("Provider unavailable"));
  const { startAgentRun, getRun } = await import("@/lib/agents/consumer");
  const run = await startAgentRun("I-TEST", "Cancel please");
  expect((await getRun(run.id))?.status).toBe("error");
  expect(run.transcript.at(-1)).toMatchObject({ kind: "error", text: "Provider unavailable" });
  expect(fake.subs.get("I-TEST")?.status).toBe("ACTIVE");
});

it("reports the step limit as an unfinished run", async () => {
  model.create.mockResolvedValue(tool("reply_to_merchant", { message: "Hello" }));
  const { startAgentRun } = await import("@/lib/agents/consumer");
  const run = await startAgentRun("I-TEST", "Help me cancel");
  expect(run.status).toBe("error");
  expect(run.transcript.at(-1)?.kind).toBe("error");
  expect(fake.subs.get("I-TEST")?.status).toBe("ACTIVE");
});
