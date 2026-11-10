import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { MERCHANT, tier } from "@/lib/catalog";
import {
  acceptOffer,
  cancelNow,
  declineOffer,
  publicSession,
  requireSession,
  sendMessage,
  startSession,
} from "@/lib/retention/engine";
import { getSubscriber } from "@/lib/store";

/**
 * KeepAlive MCP server: the agent-facing door to a merchant's subscriptions.
 * A subscriber's AI agent (Claude Desktop, ChatGPT, …) can manage a Brewbox
 * subscription here. Same engine and guardrails as the web cancel flow.
 *
 * Identity (demo): the agent must present the subscription ID *and* the email on
 * file. In production this would be OAuth on behalf of the subscriber.
 */

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });

function authorize(subscriptionId: string, email: string) {
  const sub = getSubscriber(subscriptionId);
  if (!sub || sub.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("No subscription matches that ID and email.");
  }
  return sub;
}

function guard<T>(fn: () => Promise<T>) {
  return fn()
    .then((v) => text(v))
    .catch((e) => ({ ...text(`Error: ${e instanceof Error ? e.message : String(e)}`), isError: true }));
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_subscription",
      {
        title: "Get subscription",
        description: `Look up a ${MERCHANT.name} subscription (status, plan, price) by subscription ID and the subscriber's email.`,
        inputSchema: z.object({ subscription_id: z.string(), email: z.string() }),
      },
      async ({ subscription_id, email }) =>
        guard(async () => {
          const s = authorize(subscription_id, email);
          return {
            subscription_id: s.id,
            merchant: MERCHANT.name,
            plan: tier(s.tier).name,
            monthly_price_usd: s.priceUsd,
            status: s.status,
            billed_by: "PayPal Subscriptions",
          };
        }),
    );

    server.registerTool(
      "request_cancellation",
      {
        title: "Request cancellation",
        description:
          "Start cancelling a subscription on the subscriber's behalf. The merchant may reply with ONE offer (pause, downgrade or discount). Cancellation is always available via cancel_subscription. Present any offer to your human before accepting it.",
        inputSchema: z.object({
          subscription_id: z.string(),
          email: z.string(),
          reason: z.string().describe("Why your human wants to cancel"),
          agent_name: z.string().optional().describe("Who you are, e.g. 'Claude on behalf of Maya'"),
        }),
      },
      async ({ subscription_id, email, reason, agent_name }) =>
        guard(async () => {
          authorize(subscription_id, email);
          const s = await startSession({
            subscriptionId: subscription_id,
            channel: "agent",
            agentName: agent_name ?? "external MCP agent",
            firstMessage: reason,
          });
          return publicSession(s);
        }),
    );

    server.registerTool(
      "send_message",
      {
        title: "Message the retention desk",
        description: "Reply to the merchant in an open cancellation session (e.g. answer its question).",
        inputSchema: z.object({ session_id: z.string(), message: z.string() }),
      },
      async ({ session_id, message }) => guard(async () => publicSession(await sendMessage(session_id, message))),
    );

    server.registerTool(
      "accept_offer",
      {
        title: "Accept offer",
        description:
          "Accept an offer ONLY after your human explicitly approved it. Executes on PayPal. A plan change returns paypal_approval_url, which your human must open to confirm inside PayPal.",
        inputSchema: z.object({ session_id: z.string(), offer_id: z.string() }),
      },
      async ({ session_id, offer_id }) =>
        guard(async () => {
          const { session, approveUrl } = await acceptOffer(session_id, offer_id);
          return { ...publicSession(session), paypal_approval_url: approveUrl ?? null };
        }),
    );

    server.registerTool(
      "decline_offer",
      {
        title: "Decline offer",
        description: "Decline an offer. The merchant may make one other offer or confirm the cancellation path.",
        inputSchema: z.object({ session_id: z.string(), offer_id: z.string() }),
      },
      async ({ session_id, offer_id }) => guard(async () => publicSession(await declineOffer(session_id, offer_id))),
    );

    server.registerTool(
      "cancel_subscription",
      {
        title: "Cancel subscription",
        description: "Cancel the subscription immediately on PayPal. Always available, no questions asked.",
        inputSchema: z.object({ session_id: z.string() }),
      },
      async ({ session_id }) => guard(async () => publicSession(await cancelNow(session_id))),
    );

    server.registerTool(
      "get_session",
      {
        title: "Get session",
        description: "Read the current state of a cancellation session.",
        inputSchema: z.object({ session_id: z.string() }),
      },
      async ({ session_id }) => guard(async () => publicSession(requireSession(session_id))),
    );
  },
  { serverInfo: { name: "keepalive-brewbox", version: "0.1.0" } },
);

export const maxDuration = 120;
export { handler as GET, handler as POST, handler as DELETE };
