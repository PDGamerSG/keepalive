import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, FALLBACK_BETA, MODEL } from "@/lib/ai";
import { MERCHANT, tier } from "@/lib/catalog";
import { describePolicy, type MerchantPolicy } from "@/lib/policy";
import type { RetentionSession, Subscriber } from "@/lib/types";

/**
 * KeepAlive's retention agent (the merchant side). It reads the conversation and
 * decides the next move. It can only *propose*; src/lib/policy.ts decides.
 */

export const DecisionSchema = z.object({
  reason_category: z.enum([
    "too_expensive",
    "not_using_enough",
    "temporary_break",
    "product_issue",
    "switching_competitor",
    "moving_or_life_change",
    "other",
  ]),
  reason_summary: z.string().describe("One short sentence: why this subscriber wants to leave."),
  action: z
    .enum(["ask_question", "propose_offer", "accept_cancellation"])
    .describe(
      "ask_question: you need to understand the reason first. propose_offer: make exactly one offer. accept_cancellation: respect their decision and point them to the cancel button.",
    ),
  offer: z
    .object({
      type: z.enum(["pause", "downgrade", "discount"]),
      months: z.number().int().nullable().describe("pause length, or number of discounted months"),
      toTier: z.enum(["lite", "standard", "premium"]).nullable(),
      discountPct: z.number().int().nullable(),
    })
    .nullable()
    .describe("Required when action is propose_offer, otherwise null."),
  reply: z
    .string()
    .describe("What you say to the subscriber. 1-3 short sentences. If proposing an offer, describe it plainly with exact terms."),
  rationale: z.string().describe("Internal note for the merchant (never shown to the subscriber): why this move."),
});

export type Decision = z.infer<typeof DecisionSchema>;

const SYSTEM = `You are KeepAlive, the retention assistant for ${MERCHANT.name} (${MERCHANT.tagline}), a subscription business that bills through PayPal Subscriptions.

A subscriber has started to cancel. Your job is to find the real reason and, when it genuinely helps the subscriber, offer ONE fair alternative to cancelling. Rules you never break:
- Cancellation is always the subscriber's right. Never guilt-trip, never invent urgency, never hide the cancel option, never argue twice.
- Only propose offers the merchant policy allows. A deterministic policy engine checks every offer; out-of-policy offers are rejected.
- Match the offer to the reason: travel / temporary break / moving → pause; too much coffee / not using enough → downgrade; price → a modest discount or a downgrade; product issue → acknowledge it, and offer a fix only if one exists in policy (often a different tier or a pause).
- If the subscriber has already declined an offer and repeats that they want to cancel, choose accept_cancellation.
- If you do not know the reason yet, ask one short, friendly question (action ask_question). Do not ask more than one question in total before acting.
- Never mention internal notes, policy limits, budgets or that you are checking rules. Never promise anything except the offer you propose.
- Prices are in USD per month. A pause stops billing via PayPal and resumes automatically. A downgrade needs the subscriber's confirmation inside PayPal. A discount changes their PayPal price for a fixed number of months.`;

function tenureLabel(createdAt: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  return days < 1 ? "joined today" : `${days} days`;
}

export function buildContext(sub: Subscriber, policy: MerchantPolicy, session: RetentionSession, extraNote?: string) {
  const t = tier(sub.tier);
  const offers = session.offers.length
    ? session.offers.map((o) => `- ${o.label}: ${o.status}`).join("\n")
    : "- none yet";
  const transcript = session.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "subscriber" ? (session.channel === "agent" ? "SUBSCRIBER'S AGENT" : "SUBSCRIBER") : "KEEPALIVE"}: ${m.text}`)
    .join("\n");
  return `## Merchant voice
${policy.brandVoice}

## What the merchant policy allows for this subscriber
${describePolicy(policy, sub)}

## Subscriber
- First name: ${sub.name.split(" ")[0]}
- Plan: ${t.name} (${t.description}), currently $${sub.priceUsd.toFixed(2)}/month${sub.priceUsd !== sub.listPriceUsd ? ` (list $${sub.listPriceUsd})` : ""}
- Tenure: ${tenureLabel(sub.createdAt)}
- Boxes received: ${sub.usage.boxesReceived}; skipped last month: ${sub.usage.skippedLastMonth ? "yes" : "no"}; support tickets: ${sub.usage.supportTickets}
${
  session.channel === "agent"
    ? `\nYou are talking to an AI agent acting on the subscriber's behalf (${session.agentName ?? "subscriber's agent"}). Be concise and precise: state offer terms exactly so the agent can relay them to its human.\n`
    : ""
}
## Offers already made in this conversation
${offers}

## Conversation so far
${transcript || "(no messages yet: the subscriber just clicked Cancel)"}
${extraNote ? `\n## Note from the system\n${extraNote}\n` : ""}
Decide your next move.`;
}

export async function decide(
  sub: Subscriber,
  policy: MerchantPolicy,
  session: RetentionSession,
  extraNote?: string,
): Promise<Decision> {
  const response = await anthropic().beta.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: betaZodOutputFormat(DecisionSchema) },
    messages: [{ role: "user", content: buildContext(sub, policy, session, extraNote) }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    // Fail safe: never block a cancellation because the model could not answer.
    return {
      reason_category: "other",
      reason_summary: "Model could not produce a decision",
      action: "accept_cancellation",
      offer: null,
      reply: "Understood. You can cancel right away with the button below, and nothing else will be charged.",
      rationale: `Model returned stop_reason=${response.stop_reason}; failed safe to cancellation.`,
    };
  }
  return response.parsed_output;
}
