import type { RetentionSession, Subscriber, TierId } from "@/lib/types";
import { tier } from "@/lib/catalog";

export function makeSub(over: Partial<Subscriber> & { tier?: TierId } = {}): Subscriber {
  const t = over.tier ?? "standard";
  return {
    id: "I-TEST",
    name: "Maya Chen",
    email: "maya@example.com",
    tier: t,
    status: "ACTIVE",
    priceUsd: tier(t).priceUsd,
    listPriceUsd: tier(t).priceUsd,
    createdAt: new Date(Date.now() - 200 * 86_400_000).toISOString(),
    usage: { boxesReceived: 6, skippedLastMonth: false, supportTickets: 0 },
    ...over,
  };
}

export function makeSession(over: Partial<RetentionSession> = {}): RetentionSession {
  return {
    id: "S-TEST",
    subscriptionId: "I-TEST",
    channel: "web",
    startedAt: new Date().toISOString(),
    messages: [],
    offers: [],
    outcome: "open",
    rationale: [],
    ...over,
  };
}
