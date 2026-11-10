import "server-only";
import { randomUUID } from "node:crypto";
import { DEFAULT_POLICY, checkOffer, type MerchantPolicy } from "@/lib/policy";
import { getSession, getSubscriber, readStore, recordEvent, saveSession } from "@/lib/store";
import type { ChatMessage, Offer, RetentionSession, Subscriber } from "@/lib/types";
import { decide } from "./agent";
import { executeCancel, executeOffer, syncSubscriber } from "./execute";

/**
 * Retention session state machine. Shared by the web cancel flow, the in-app
 * agent-to-agent demo and the MCP server: every channel gets identical guardrails.
 */

export class RetentionError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function getPolicy(): MerchantPolicy {
  return { ...DEFAULT_POLICY, ...(readStore().policy ?? {}) };
}

const now = () => new Date().toISOString();

function msg(role: ChatMessage["role"], text: string, offerId?: string): ChatMessage {
  return { role, text, at: now(), ...(offerId ? { offerId } : {}) };
}

function requireSub(id: string): Subscriber {
  const sub = getSubscriber(id);
  if (!sub) throw new RetentionError(`Unknown subscription ${id}`, 404);
  return sub;
}

export function requireSession(id: string): RetentionSession {
  const s = getSession(id);
  if (!s) throw new RetentionError(`Unknown session ${id}`, 404);
  return s;
}

export async function startSession(input: {
  subscriptionId: string;
  channel: "web" | "agent";
  agentName?: string;
  firstMessage?: string;
}): Promise<RetentionSession> {
  let sub = requireSub(input.subscriptionId);
  try {
    sub = (await syncSubscriber(sub.id)) ?? sub;
  } catch {
    /* keep local copy if PayPal read fails */
  }
  if (sub.status === "CANCELLED") throw new RetentionError("This subscription is already cancelled.");
  const session: RetentionSession = {
    id: randomUUID(),
    subscriptionId: sub.id,
    channel: input.channel,
    agentName: input.agentName,
    startedAt: now(),
    messages: [],
    offers: [],
    outcome: "open",
    rationale: [],
  };
  recordEvent({
    type: "retention.started",
    subscriptionId: sub.id,
    summary: `${input.channel === "agent" ? `Agent (${input.agentName ?? "unknown"})` : "Subscriber"} started cancellation`,
  });
  if (input.firstMessage?.trim()) {
    session.messages.push(msg("subscriber", input.firstMessage.trim()));
  }
  saveSession(session);
  return respond(session, sub);
}

/** Ask the retention agent for its next move and apply guardrails. */
async function respond(session: RetentionSession, sub: Subscriber, extraNote?: string): Promise<RetentionSession> {
  const policy = getPolicy();
  const store = readStore();
  let decision = await decide(sub, policy, session, extraNote);
  session.reason = decision.reason_category;
  session.reasonSummary = decision.reason_summary;
  session.rationale.push(decision.rationale);

  if (decision.action === "propose_offer" && decision.offer) {
    let check = checkOffer(decision.offer, sub, policy, session, store.subscribers);
    if (!check.ok) {
      session.rationale.push(`Guardrail rejected ${decision.offer.type}: ${check.reason}`);
      recordEvent({ type: "guardrail.rejected", subscriptionId: sub.id, summary: `${decision.offer.type}: ${check.reason}` });
      // One retry with the rejection reason; then fall back to accepting the cancellation.
      decision = await decide(
        sub,
        policy,
        session,
        `Your previous proposal (${decision.offer.type}) was rejected by the merchant policy: ${check.reason}. Choose a different allowed offer, or accept the cancellation.`,
      );
      session.rationale.push(decision.rationale);
      check = decision.action === "propose_offer" && decision.offer
        ? checkOffer(decision.offer, sub, policy, session, store.subscribers)
        : { ok: false, reason: "no offer" };
    }
    if (check.ok) {
      const offer: Offer = { ...check.offer, id: randomUUID().slice(0, 8), status: "proposed" };
      session.offers.push(offer);
      session.messages.push(msg("keepalive", decision.reply, offer.id));
      if (offer.guardrailNotes.length) {
        recordEvent({ type: "guardrail.adjusted", subscriptionId: sub.id, summary: offer.guardrailNotes.join("; ") });
      }
      recordEvent({ type: "offer.proposed", subscriptionId: sub.id, summary: offer.label });
      saveSession(session);
      return session;
    }
    if (decision.action === "propose_offer") {
      session.messages.push(
        msg("keepalive", "Understood. You can cancel right away below and you won't be charged again."),
      );
      saveSession(session);
      return session;
    }
  }
  session.messages.push(msg("keepalive", decision.reply));
  saveSession(session);
  return session;
}

export async function sendMessage(sessionId: string, text: string): Promise<RetentionSession> {
  const session = requireSession(sessionId);
  if (session.outcome !== "open") throw new RetentionError(`Session is already ${session.outcome}`);
  const sub = requireSub(session.subscriptionId);
  // A new message implicitly declines any open offer.
  for (const o of session.offers) if (o.status === "proposed") o.status = "declined";
  session.messages.push(msg("subscriber", text.slice(0, 2000)));
  saveSession(session);
  return respond(session, sub);
}

export async function declineOffer(sessionId: string, offerId: string): Promise<RetentionSession> {
  const session = requireSession(sessionId);
  const offer = session.offers.find((o) => o.id === offerId);
  if (!offer) throw new RetentionError("Unknown offer", 404);
  if (offer.status !== "proposed") throw new RetentionError(`Offer is ${offer.status}`);
  offer.status = "declined";
  session.messages.push(msg("subscriber", `No thanks to "${offer.label}".`));
  recordEvent({ type: "offer.declined", subscriptionId: session.subscriptionId, summary: offer.label });
  saveSession(session);
  return respond(session, requireSub(session.subscriptionId));
}

export async function acceptOffer(
  sessionId: string,
  offerId: string,
): Promise<{ session: RetentionSession; approveUrl?: string }> {
  const session = requireSession(sessionId);
  if (session.outcome !== "open") throw new RetentionError(`Session is already ${session.outcome}`);
  const offer = session.offers.find((o) => o.id === offerId);
  if (!offer) throw new RetentionError("Unknown offer", 404);
  if (offer.status !== "proposed") throw new RetentionError(`Offer is ${offer.status}`);
  const sub = requireSub(session.subscriptionId);
  offer.status = "executing";
  saveSession(session);
  let result;
  try {
    result = await executeOffer(sub, offer);
  } catch (e) {
    offer.status = "failed";
    offer.result = e instanceof Error ? e.message : String(e);
    session.messages.push(msg("system", `PayPal call failed: ${offer.result}`));
    saveSession(session);
    throw new RetentionError(`PayPal call failed: ${offer.result}`, 502);
  }
  offer.status = result.status;
  offer.result = result.message;
  session.messages.push(msg("system", result.message, offer.id));
  if (result.status === "executed") {
    session.outcome = "saved";
    session.closedAt = now();
    recordEvent({ type: "retention.saved", subscriptionId: sub.id, summary: `${offer.label}: ${result.message}` });
  } else if (result.status === "awaiting_paypal_approval") {
    recordEvent({ type: "offer.awaiting_approval", subscriptionId: sub.id, summary: offer.label });
  }
  saveSession(session);
  return { session, approveUrl: result.approveUrl };
}

/** Called after PayPal redirects back from a revise approval. */
export async function confirmRevise(subscriptionId: string): Promise<RetentionSession | undefined> {
  const sub = requireSub(subscriptionId);
  const pending = sub.pendingRevise;
  const fresh = await syncSubscriber(subscriptionId);
  const session = readStore().sessions.find((s) =>
    s.subscriptionId === subscriptionId && s.offers.some((o) => o.status === "awaiting_paypal_approval"),
  );
  if (!session) return undefined;
  const offer = session.offers.find((o) => o.status === "awaiting_paypal_approval")!;
  offer.status = "executed";
  offer.result =
    fresh?.tier === offer.toTier
      ? `PayPal confirmed: you're now on the ${offer.label.replace("Switch to ", "")} plan.`
      : `Approved in PayPal: the ${pending ? pending.toTier : offer.toTier} plan starts with your next billing cycle.`;
  session.messages.push(msg("system", offer.result, offer.id));
  session.outcome = "saved";
  session.closedAt = now();
  recordEvent({ type: "retention.saved", subscriptionId, summary: `${offer.label}: approved in PayPal` });
  saveSession(session);
  return session;
}

export async function cancelNow(sessionId: string): Promise<RetentionSession> {
  const session = requireSession(sessionId);
  const sub = requireSub(session.subscriptionId);
  for (const o of session.offers) if (o.status === "proposed") o.status = "declined";
  const reason = `KeepAlive: ${session.reasonSummary ?? "subscriber cancelled"}`;
  const result = await executeCancel(sub, reason, `keepalive-cancel-${session.id}`);
  session.messages.push(msg("system", result.message));
  if (result.status === "executed") {
    session.outcome = "cancelled";
    session.closedAt = now();
    recordEvent({ type: "retention.cancelled", subscriptionId: sub.id, summary: reason });
  }
  saveSession(session);
  if (result.status !== "executed") throw new RetentionError(result.message, 502);
  return session;
}

/** Public, agent-safe view of a session (no internal rationale). */
export function publicSession(s: RetentionSession) {
  return {
    session_id: s.id,
    subscription_id: s.subscriptionId,
    outcome: s.outcome,
    messages: s.messages.map((m) => ({ from: m.role, text: m.text, offer_id: m.offerId })),
    offers: s.offers.map((o) => ({
      offer_id: o.id,
      type: o.type,
      label: o.label,
      months: o.months,
      to_tier: o.toTier,
      discount_pct: o.discountPct,
      new_monthly_price_usd: o.type === "pause" ? 0 : o.mrrKeptUsd,
      status: o.status,
      result: o.result,
    })),
    cancel_available: s.outcome === "open",
  };
}
