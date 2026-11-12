import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, expect, it, vi } from "vitest";
import { makeSession, makeSub } from "./helpers";
import { DEFAULT_POLICY } from "@/lib/policy";

const calls = vi.hoisted(() => ({ parse: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/ai", () => ({
  MODEL: "claude-haiku-5-5",
  anthropic: () => ({ beta: { messages: calls } }),
  aiConfigured: () => true,
}));

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "keepalive-ai-test-"));
vi.stubEnv("DATA_DIR", dataDir);
vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
afterAll(() => { vi.unstubAllEnvs(); fs.rmSync(dataDir, { recursive: true, force: true }); });

it("retention requests cache the stable instructions and record actual provider cache usage", async () => {
  calls.parse.mockResolvedValue({
    model: "claude-opus-5-5", stop_reason: "end_turn",
    usage: { input_tokens: 90, output_tokens: 30, cache_creation_input_tokens: 0, cache_read_input_tokens: 1500 },
    parsed_output: { reason_category: "other", reason_summary: "Leaving", action: "accept_cancellation", offer: null, reply: "You can cancel below.", rationale: "Respect the decision." },
  });
  const { decide } = await import("@/lib/retention/agent");
  const result = await decide(makeSub(), DEFAULT_POLICY, makeSession());
  expect(result.action).toBe("accept_cancellation");
  const request = calls.parse.mock.calls[0][0];
  // Most stable first: fixed instructions + merchant voice cached, then the per-conversation
  // subscriber block cached, then the per-turn transcript after the last breakpoint.
  expect(request.system.at(-1).cache_control).toEqual({ type: "ephemeral" });
  expect(request.system.at(-1).text).toContain("## Merchant voice");
  const [session, turn] = request.messages[0].content;
  expect(session.cache_control).toEqual({ type: "ephemeral" });
  expect(session.text).toContain("## Subscriber");
  expect(turn.cache_control).toBeUndefined();
  expect(turn.text).toContain("## Conversation so far");
  // No automatic breakpoint: it would write the per-turn block to the cache on every call.
  expect(request.cache_control).toBeUndefined();
  // Haiku has no server-side refusal fallback; sending one is a 400.
  expect(request.fallbacks).toBeUndefined();
  expect(request.betas).toBeUndefined();
  const { readStore } = await import("@/lib/store");
  const usage = (await readStore()).events.find((e) => e.type === "ai.usage");
  expect(usage?.detail).toMatchObject({ cacheReadInputTokens: 1500, outputTokens: 30 });
});

it("an agent run survives another function instance while cached tool context is reused", async () => {
  calls.create.mockResolvedValue({
    model: "claude-opus-5-5", stop_reason: "tool_use",
    usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 1800, cache_read_input_tokens: 0 },
    content: [{ type: "tool_use", id: "ask-human", name: "ask_my_human", input: { question: "Is a pause useful?", offer_id: null } }],
  });
  const { upsertSubscriber } = await import("@/lib/store");
  await upsertSubscriber(makeSub());
  const { startAgentRun } = await import("@/lib/agents/consumer");
  const initial = await startAgentRun("I-TEST", "I am travelling.");
  expect(initial.status).toBe("waiting_human");
  delete (globalThis as Record<string, unknown>).__keepaliveRuns;
  vi.resetModules();
  const { getRun } = await import("@/lib/agents/consumer");
  const reloaded = await getRun(initial.id);
  expect(reloaded?.pendingQuestion?.question).toBe("Is a pause useful?");
  expect(reloaded?.pendingToolUseId).toBe("ask-human");
  expect(calls.create.mock.calls[0][0].cache_control).toEqual({ type: "ephemeral" });
  expect(calls.create.mock.calls[0][0].system[0].cache_control).toEqual({ type: "ephemeral" });
});
