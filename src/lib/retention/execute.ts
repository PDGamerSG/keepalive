import "server-only";
import { tier } from "@/lib/catalog";
import {
  activateSubscription,
  cancelSubscription,
  currentPrice,
  getSubscription,
  reviseSubscription,
  setSubscriptionPrice,
  suspendSubscription,
  tierForPlan,
} from "@/lib/paypal/subscriptions";
import { getSubscriber, patchSubscriber, readStore, recordEvent } from "@/lib/store";
import type { Offer, Subscriber } from "@/lib/types";

/**
 * Turns accepted offers into PayPal calls, then reads the subscription back
 * from PayPal before reporting success (PayPal is the source of truth).
 */

const addMonths = (months: number) => new Date(Date.now() + months * 30 * 86_400_000).toISOString();

/** Pull the live state of one subscription from PayPal into the store. */
export async function syncSubscriber(id: string): Promise<Subscriber | undefined> {
  const local = getSubscriber(id);
  const remote = await getSubscription(id);
  const t = tierForPlan(remote.plan_id) ?? local?.tier ?? "standard";
  const list = tier(t).priceUsd;
  const price = remote.plan_overridden ? (currentPrice(remote) ?? list) : list;
  const patch: Partial<Subscriber> = {
    status: remote.status,
    tier: t,
    listPriceUsd: list,
    priceUsd: price,
    lastSyncedAt: new Date().toISOString(),
  };
  if (local?.pendingRevise && local.pendingRevise.toTier === t) patch.pendingRevise = undefined;
  if (local) patchSubscriber(id, patch);
  return getSubscriber(id);
}

export interface ExecutionResult {
  status: Offer["status"];
  message: string;
  approveUrl?: string;
}

export async function executeOffer(sub: Subscriber, offer: Offer): Promise<ExecutionResult> {
  const key = `keepalive-${offer.id}`;
  switch (offer.type) {
    case "pause": {
      await suspendSubscription(sub.id, `KeepAlive: paused ${offer.months} month(s) at subscriber's request`, `${key}-suspend`);
      const fresh = await syncSubscriber(sub.id);
      if (fresh?.status !== "SUSPENDED") {
        return { status: "failed", message: `PayPal reports status ${fresh?.status}, expected SUSPENDED` };
      }
      patchSubscriber(sub.id, { resumeAt: addMonths(offer.months ?? 1) });
      return {
        status: "executed",
        message: `Paused on PayPal (status SUSPENDED). Billing resumes automatically in ${offer.months} month(s).`,
      };
    }
    case "downgrade": {
      const { approveUrl } = await reviseSubscription(sub.id, offer.toTier!, `${key}-revise`);
      if (!approveUrl) {
        const fresh = await syncSubscriber(sub.id);
        if (fresh?.tier === offer.toTier) {
          return { status: "executed", message: `Switched to ${tier(offer.toTier!).name} on PayPal.` };
        }
        return { status: "failed", message: "PayPal did not return an approval link for the plan change." };
      }
      patchSubscriber(sub.id, {
        pendingRevise: { toTier: offer.toTier!, approveUrl, at: new Date().toISOString() },
      });
      return {
        status: "awaiting_paypal_approval",
        message: `Confirm the switch to ${tier(offer.toTier!).name} inside PayPal: PayPal asks you to approve any plan change.`,
        approveUrl,
      };
    }
    case "discount": {
      const newPrice = Math.round(sub.listPriceUsd * (100 - (offer.discountPct ?? 0))) / 100;
      await setSubscriptionPrice(sub.id, newPrice, `apply ${offer.discountPct}% retention discount`, `${key}-price`);
      const remote = await getSubscription(sub.id);
      const p = currentPrice(remote);
      if (p === undefined || Math.abs(p - newPrice) > 0.005) {
        return { status: "failed", message: `PayPal price reads ${p}, expected ${newPrice}` };
      }
      patchSubscriber(sub.id, { priceUsd: newPrice, discountUntil: addMonths(offer.months ?? 1) });
      return {
        status: "executed",
        message: `Your PayPal price is now $${newPrice.toFixed(2)}/month for ${offer.months} month(s), then back to $${sub.listPriceUsd}.`,
      };
    }
  }
}

export async function executeCancel(sub: Subscriber, reason: string, requestId: string): Promise<ExecutionResult> {
  await cancelSubscription(sub.id, reason, requestId);
  const fresh = await syncSubscriber(sub.id);
  if (fresh?.status !== "CANCELLED") {
    return { status: "failed", message: `PayPal reports ${fresh?.status}, expected CANCELLED` };
  }
  return { status: "executed", message: "Cancelled on PayPal. You won't be charged again." };
}

export async function resumeNow(id: string): Promise<Subscriber | undefined> {
  await activateSubscription(id, "KeepAlive: pause ended", `keepalive-resume-${id}-${Date.now()}`);
  const fresh = await syncSubscriber(id);
  patchSubscriber(id, { resumeAt: undefined });
  return fresh;
}

export async function restoreListPrice(id: string): Promise<Subscriber | undefined> {
  const sub = getSubscriber(id);
  if (!sub) return undefined;
  await setSubscriptionPrice(id, sub.listPriceUsd, "restore list price after retention discount", `keepalive-restore-${id}-${sub.discountUntil}`);
  patchSubscriber(id, { discountUntil: undefined, priceUsd: sub.listPriceUsd });
  return syncSubscriber(id);
}

/** Run scheduled actions that are due (pause ended, discount ended). Called on page loads and by /api/cron. */
export async function runDueActions(): Promise<string[]> {
  const done: string[] = [];
  const now = Date.now();
  for (const s of readStore().subscribers) {
    try {
      if (s.resumeAt && new Date(s.resumeAt).getTime() <= now && s.status === "SUSPENDED") {
        await resumeNow(s.id);
        done.push(`resumed ${s.id}`);
      }
      if (s.discountUntil && new Date(s.discountUntil).getTime() <= now) {
        await restoreListPrice(s.id);
        done.push(`restored price ${s.id}`);
      }
    } catch (e) {
      recordEvent({ type: "scheduler.error", subscriptionId: s.id, summary: String(e) });
    }
  }
  return done;
}
