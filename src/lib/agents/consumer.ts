import "server-only";
import { randomUUID } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, FALLBACK_BETA, MODEL } from "@/lib/ai";
import * as store from "@/lib/store";
import {
  acceptOffer,
  cancelNow,
  declineOffer,
  publicSession,
  RetentionError,
  sendMessage,
  startSession,
} from "@/lib/retention/engine";

/**
 * The *subscriber's* AI agent: a Claude tool-use loop that negotiates with the
 * merchant's KeepAlive endpoint on behalf of a human. It talks to the merchant
 * through exactly the same operations the public MCP server exposes, and it must
 * get the human's explicit approval before accepting any offer.
 */

type MessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type ToolUnion = Anthropic.Beta.Messages.BetaToolUnion;

export type TranscriptEntry =
  | { kind: "agent"; text: string; at: string }
  | { kind: "tool"; name: string; input: unknown; at: string }
  | { kind: "merchant"; text: string; offers?: { offer_id: string; label: string; status: string }[]; at: string }
  | { kind: "human"; text: string; at: string }
  | { kind: "paypal"; text: string; approveUrl?: string; at: string }
  | { kind: "error"; text: string; at: string };

export interface AgentRun {
  id: string;
  subscriptionId: string;
  brief: string;
  status: "running" | "waiting_human" | "done" | "error";
  messages: MessageParam[];
  transcript: TranscriptEntry[];
  sessionId?: string;
  pendingToolUseId?: string;
  pendingQuestion?: { question: string; offerId?: string; offerLabel?: string };
  approvedOfferIds: string[];
  summary?: string;
}

const runs: Map<string, AgentRun> =
  ((globalThis as Record<string, unknown>).__keepaliveRuns as Map<string, AgentRun>) ?? new Map();
(globalThis as Record<string, unknown>).__keepaliveRuns = runs;

export function getRun(id: string) {
  return runs.get(id);
}

const AGENT_NAME = "Claude (subscriber's personal agent)";

const SYSTEM = `You are a personal AI assistant acting on behalf of your human. Your human asked you to deal with one of their subscriptions. You talk to the merchant's retention desk through tools.

Rules:
- Follow your human's brief. Represent their interests, not the merchant's.
- Start with request_cancellation, giving the human's reason in plain words.
- When the merchant makes an offer, judge it against the brief. If it plausibly fits, you MUST call ask_my_human with a one-sentence summary and the offer_id before accepting. Never accept without the human's explicit approval.
- If the human approves, call accept_offer. If the human declines, or the offer clearly conflicts with the brief, call decline_offer or cancel_subscription.
- If the human wants to cancel, cancel_subscription always works; do not let the merchant stall you.
- If accept_offer returns a PayPal approval link, tell your human to open it (PayPal asks them to confirm any plan change), then finish.
- Keep messages short. When the matter is settled, call finish with a one-line summary for your human.`;

const TOOLS: ToolUnion[] = [
  {
    name: "request_cancellation",
    description: "Open a cancellation request with the merchant for the human's subscription. Returns the merchant's response and any offers.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string", description: "Why the human wants to cancel, in their words." } },
      required: ["reason"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "reply_to_merchant",
    description: "Send a message to the merchant's retention desk (e.g. answer its question).",
    input_schema: {
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "ask_my_human",
    description:
      "Ask your human a question and wait for the answer. Required before accepting any offer: pass the offer_id you want approved.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string" },
        offer_id: { type: ["string", "null"], description: "The offer you want the human to approve, if any." },
      },
      required: ["question", "offer_id"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "accept_offer",
    description: "Accept a merchant offer (only after the human approved this exact offer_id). Executes on PayPal.",
    input_schema: {
      type: "object",
      properties: { offer_id: { type: "string" } },
      required: ["offer_id"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "decline_offer",
    description: "Decline a merchant offer. The merchant may reply with something else or accept the cancellation.",
    input_schema: {
      type: "object",
      properties: { offer_id: { type: "string" } },
      required: ["offer_id"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: "cancel_subscription",
    description: "Cancel the subscription immediately on PayPal. Always available.",
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
    strict: true,
  },
  {
    name: "finish",
    description: "End the task with a one-line summary for your human.",
    input_schema: {
      type: "object",
      properties: { summary: { type: "string" } },
      required: ["summary"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const now = () => new Date().toISOString();

function merchantEntries(run: AgentRun, view: ReturnType<typeof publicSession>, fromIndex: number) {
  const msgs = view.messages.slice(fromIndex);
  for (const m of msgs) {
    if (m.from === "keepalive") {
      const offer = m.offer_id ? view.offers.find((o) => o.offer_id === m.offer_id) : undefined;
      run.transcript.push({
        kind: "merchant",
        text: m.text,
        offers: offer ? [{ offer_id: offer.offer_id, label: offer.label, status: offer.status }] : undefined,
        at: now(),
      });
    } else if (m.from === "system") {
      run.transcript.push({ kind: "paypal", text: m.text, at: now() });
    }
  }
}

async function runTool(run: AgentRun, name: string, input: Record<string, unknown>): Promise<string | { wait: true }> {
  const sub = store.getSubscriber(run.subscriptionId);
  try {
    switch (name) {
      case "request_cancellation": {
        if (run.sessionId) return "A cancellation request is already open. Use reply_to_merchant.";
        const s = await startSession({
          subscriptionId: run.subscriptionId,
          channel: "agent",
          agentName: AGENT_NAME,
          firstMessage: String(input.reason ?? ""),
        });
        run.sessionId = s.id;
        const view = publicSession(s);
        merchantEntries(run, view, 0);
        return JSON.stringify(view);
      }
      case "reply_to_merchant": {
        if (!run.sessionId) return "No open request. Call request_cancellation first.";
        const before = publicSession(store.getSession(run.sessionId)!).messages.length;
        const s = await sendMessage(run.sessionId, String(input.message ?? ""));
        const view = publicSession(s);
        merchantEntries(run, view, before + 1);
        return JSON.stringify(view);
      }
      case "ask_my_human": {
        const offerId = (input.offer_id as string | null) ?? undefined;
        const session = run.sessionId ? store.getSession(run.sessionId) : undefined;
        const offer = offerId ? session?.offers.find((o) => o.id === offerId) : undefined;
        run.pendingQuestion = { question: String(input.question ?? ""), offerId: offer?.id, offerLabel: offer?.label };
        return { wait: true };
      }
      case "accept_offer": {
        const offerId = String(input.offer_id ?? "");
        if (!run.approvedOfferIds.includes(offerId)) {
          return "Refused: your human has not approved this offer. Call ask_my_human with this offer_id first.";
        }
        if (!run.sessionId) return "No open request.";
        const before = store.getSession(run.sessionId)!.messages.length;
        const { session, approveUrl } = await acceptOffer(run.sessionId, offerId);
        const view = publicSession(session);
        merchantEntries(run, view, before);
        if (approveUrl) {
          run.transcript.push({ kind: "paypal", text: "PayPal needs the human to confirm this plan change.", approveUrl, at: now() });
        }
        return JSON.stringify({ ...view, paypal_approval_url: approveUrl ?? null });
      }
      case "decline_offer": {
        if (!run.sessionId) return "No open request.";
        const before = store.getSession(run.sessionId)!.messages.length;
        const s = await declineOffer(run.sessionId, String(input.offer_id ?? ""));
        const view = publicSession(s);
        merchantEntries(run, view, before + 1);
        return JSON.stringify(view);
      }
      case "cancel_subscription": {
        if (!run.sessionId) {
          const s = await startSession({ subscriptionId: run.subscriptionId, channel: "agent", agentName: AGENT_NAME });
          run.sessionId = s.id;
        }
        const before = store.getSession(run.sessionId)!.messages.length;
        const s = await cancelNow(run.sessionId);
        merchantEntries(run, publicSession(s), before);
        return JSON.stringify(publicSession(s));
      }
      case "finish": {
        run.summary = String(input.summary ?? "");
        run.status = "done";
        return "ok";
      }
      default:
        return `Unknown tool ${name}`;
    }
  } catch (e) {
    const message = e instanceof RetentionError || e instanceof Error ? e.message : String(e);
    run.transcript.push({ kind: "error", text: `${name}: ${message}`, at: now() });
    return `Error: ${message}${sub ? "" : " (unknown subscription)"}`;
  }
}

/** Drive the loop until the agent needs its human or finishes. */
async function drive(run: AgentRun) {
  for (let step = 0; step < 12 && run.status === "running"; step++) {
    const response = await anthropic().beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      tools: TOOLS,
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      output_config: { effort: "low" },
      messages: run.messages,
    });
    run.messages.push({ role: "assistant", content: response.content as Anthropic.Beta.Messages.BetaContentBlockParam[] });

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        run.transcript.push({ kind: "agent", text: block.text.trim(), at: now() });
      }
    }
    if (response.stop_reason === "refusal") {
      run.status = "error";
      run.transcript.push({ kind: "error", text: "The agent model declined to continue.", at: now() });
      return;
    }
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      run.status = "done";
      return;
    }
    const input = (toolUse.input ?? {}) as Record<string, unknown>;
    if (toolUse.name !== "finish") {
      run.transcript.push({ kind: "tool", name: toolUse.name, input, at: now() });
    }
    const result = await runTool(run, toolUse.name, input);
    if (typeof result === "object") {
      run.status = "waiting_human";
      run.pendingToolUseId = toolUse.id;
      return;
    }
    run.messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolUse.id, content: result }],
    });
    if (toolUse.name === "finish") {
      run.transcript.push({ kind: "agent", text: `✅ ${run.summary}`, at: now() });
      return;
    }
  }
  if (run.status === "running") run.status = "done";
}

export async function startAgentRun(subscriptionId: string, brief: string): Promise<AgentRun> {
  const run: AgentRun = {
    id: randomUUID(),
    subscriptionId,
    brief,
    status: "running",
    transcript: [{ kind: "human", text: brief, at: now() }],
    messages: [
      {
        role: "user",
        content: `My subscription: Brewbox coffee (subscription id ${subscriptionId}).\n\nMy instructions: ${brief}`,
      },
    ],
    approvedOfferIds: [],
  };
  runs.set(run.id, run);
  try {
    await drive(run);
  } catch (e) {
    run.status = "error";
    run.transcript.push({ kind: "error", text: e instanceof Error ? e.message : String(e), at: now() });
  }
  return run;
}

export async function answerHuman(runId: string, answer: string, approve: boolean | null): Promise<AgentRun> {
  const run = runs.get(runId);
  if (!run) throw new RetentionError("Unknown agent run", 404);
  if (run.status !== "waiting_human" || !run.pendingToolUseId) throw new RetentionError("Agent is not waiting for you");
  const q = run.pendingQuestion;
  let text = answer.trim();
  if (approve !== null && q?.offerId) {
    if (approve) run.approvedOfferIds.push(q.offerId);
    text = `${approve ? `APPROVED offer ${q.offerId}` : `DECLINED offer ${q.offerId}`}${text ? `. ${text}` : ""}`;
  }
  run.transcript.push({ kind: "human", text: text || "(no comment)", at: now() });
  run.messages.push({
    role: "user",
    content: [{ type: "tool_result", tool_use_id: run.pendingToolUseId, content: text || "(no comment)" }],
  });
  run.pendingToolUseId = undefined;
  run.pendingQuestion = undefined;
  run.status = "running";
  try {
    await drive(run);
  } catch (e) {
    run.status = "error";
    run.transcript.push({ kind: "error", text: e instanceof Error ? e.message : String(e), at: now() });
  }
  return run;
}

export function publicRun(run: AgentRun) {
  return {
    id: run.id,
    status: run.status,
    subscriptionId: run.subscriptionId,
    sessionId: run.sessionId,
    transcript: run.transcript,
    pendingQuestion: run.pendingQuestion,
    summary: run.summary,
  };
}
