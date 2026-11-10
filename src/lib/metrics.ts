import type { ReasonCategory, StoreShape } from "./types";

export interface Metrics {
  activeSubscribers: number;
  pausedSubscribers: number;
  cancelledSubscribers: number;
  mrrUsd: number;
  sessions: number;
  saved: number;
  cancelled: number;
  open: number;
  saveRatePct: number | null;
  mrrSavedUsd: number;
  agentSessions: number;
  reasons: Partial<Record<ReasonCategory, number>>;
  offersByType: Record<string, { proposed: number; accepted: number }>;
}

export function computeMetrics(s: StoreShape): Metrics {
  const subs = s.subscribers;
  const sessions = s.sessions;
  // Saves are counted per subscriber, not per conversation: someone who was "saved"
  // three times and then cancelled is one lost subscriber, not three saves.
  const bySub = new Map<string, typeof sessions>();
  for (const x of sessions) bySub.set(x.subscriptionId, [...(bySub.get(x.subscriptionId) ?? []), x]);
  const statusOf = new Map(subs.map((x) => [x.id, x.status]));
  const saved: (typeof sessions)[number][] = []; // latest saving conversation per retained subscriber
  const cancelled: string[] = [];
  for (const [id, list] of bySub) {
    if (statusOf.get(id) === "CANCELLED" || list.some((x) => x.outcome === "cancelled")) cancelled.push(id);
    else {
      const lastSave = list.filter((x) => x.outcome === "saved").at(-1);
      if (lastSave) saved.push(lastSave);
    }
  }
  const reasons: Partial<Record<ReasonCategory, number>> = {};
  for (const x of sessions) if (x.reason) reasons[x.reason] = (reasons[x.reason] ?? 0) + 1;
  const offersByType: Metrics["offersByType"] = {};
  for (const x of sessions) {
    for (const o of x.offers) {
      offersByType[o.type] ??= { proposed: 0, accepted: 0 };
      offersByType[o.type].proposed++;
      if (o.status === "executed" || o.status === "awaiting_paypal_approval") offersByType[o.type].accepted++;
    }
  }
  const decided = saved.length + cancelled.length;
  return {
    activeSubscribers: subs.filter((x) => x.status === "ACTIVE").length,
    pausedSubscribers: subs.filter((x) => x.status === "SUSPENDED").length,
    cancelledSubscribers: subs.filter((x) => x.status === "CANCELLED").length,
    mrrUsd: subs.filter((x) => x.status === "ACTIVE").reduce((a, x) => a + x.priceUsd, 0),
    sessions: sessions.length,
    saved: saved.length,
    cancelled: cancelled.length,
    open: bySub.size - saved.length - cancelled.length,
    saveRatePct: decided ? Math.round((saved.length / decided) * 100) : null,
    mrrSavedUsd: saved.reduce((a, x) => {
      const o = x.offers.find((y) => y.status === "executed");
      return a + (o?.mrrKeptUsd ?? 0);
    }, 0),
    agentSessions: sessions.filter((x) => x.channel === "agent").length,
    reasons,
    offersByType,
  };
}
