import "server-only";
import { randomBytes } from "node:crypto";
import { tier, TIERS } from "@/lib/catalog";
import { readStore, recordEvent, updateStore } from "@/lib/store";
import type { SubscriptionStatus, TierId } from "@/lib/types";
import { PayPalError, type PayPalRequestOptions } from "./client";

/**
 * A stand-in for the PayPal Subscriptions API, for the shop's "instant demo".
 *
 * Simulated subscriptions have IDs that start with `I-DEMO`. Every PayPal call
 * for such an ID is answered here instead of by PayPal, with the same state
 * rules PayPal applies (suspend only when ACTIVE, activate only when SUSPENDED,
 * revise needs the buyer's approval). State lives in the app's store, so it
 * survives serverless restarts. The rest of the app does not know the difference,
 * except that every call is logged as simulated.
 */

const PREFIX = "I-DEMO";

export interface SimulatedSubscription {
  id: string;
  status: SubscriptionStatus;
  plan_id: string;
  /** Overridden monthly price, as PayPal returns it ("22.00"). */
  price?: string;
  plan_overridden?: boolean;
  /** Plan a revise is waiting for the buyer to approve. */
  pending_plan_id?: string;
  create_time: string;
}

export function isSimulated(subscriptionId: string | undefined): boolean {
  return Boolean(subscriptionId?.startsWith(PREFIX));
}

/** The subscription ID a PayPal API path refers to, when it is a simulated one. */
export function simulatedIdInPath(path: string): string | undefined {
  const id = path.match(/^\/v1\/billing\/subscriptions\/([^/?]+)/)?.[1];
  const decoded = id ? decodeURIComponent(id) : undefined;
  return isSimulated(decoded) ? decoded : undefined;
}

/** Plan IDs for simulated subscriptions: the real catalog's when it exists, otherwise stand-ins. */
export async function simulatedPlans(): Promise<Record<TierId, string>> {
  const real = (await readStore()).config.plans;
  return Object.fromEntries(TIERS.map((t) => [t.id, real[t.id] ?? `P-DEMO-${t.id.toUpperCase()}`])) as Record<TierId, string>;
}

export async function tierForSimulatedPlan(planId: string): Promise<TierId | undefined> {
  const plans = await simulatedPlans();
  return (Object.keys(plans) as TierId[]).find((k) => plans[k] === planId);
}

/** Create a subscription awaiting approval on the simulated PayPal checkout page. */
export async function createSimulatedSubscription(toTier: TierId): Promise<{ id: string; approveUrl: string }> {
  const id = `${PREFIX}${randomBytes(5).toString("hex").toUpperCase()}`;
  const plans = await simulatedPlans();
  await updateStore((s) => {
    s.simulatedPayPal = { ...s.simulatedPayPal };
    s.simulatedPayPal[id] = { id, status: "APPROVAL_PENDING", plan_id: plans[toTier], create_time: new Date().toISOString() };
  });
  await log(id, `create subscription (${tier(toTier).name})`, 201);
  return { id, approveUrl: `/demo-paypal/approve?subscription_id=${encodeURIComponent(id)}` };
}

export async function getSimulated(id: string): Promise<SimulatedSubscription | undefined> {
  return (await readStore()).simulatedPayPal?.[id];
}

/**
 * The buyer approves on the simulated PayPal page: a new subscription becomes
 * ACTIVE, or a pending plan change takes effect. Returns what was approved.
 */
export async function approveSimulated(id: string): Promise<"subscription" | "revise"> {
  const kind = await mutate(id, (sub) => {
    if (sub.status === "APPROVAL_PENDING") {
      sub.status = "ACTIVE";
      return "subscription" as const;
    }
    if (sub.pending_plan_id) {
      sub.plan_id = sub.pending_plan_id;
      sub.pending_plan_id = undefined;
      return "revise" as const;
    }
    throw new PayPalError("Nothing is waiting for approval on this subscription.", 422, undefined, null);
  });
  await log(id, kind === "subscription" ? "buyer approved subscription" : "buyer approved plan change", 200);
  return kind;
}

/** The buyer cancels on the simulated PayPal page: nothing changes, a pending plan change is dropped. */
export async function declineSimulated(id: string): Promise<"subscription" | "revise"> {
  const kind = await mutate(id, (sub) => {
    if (sub.status === "APPROVAL_PENDING") return "subscription" as const;
    sub.pending_plan_id = undefined;
    return "revise" as const;
  });
  await log(id, kind === "subscription" ? "buyer cancelled checkout" : "buyer cancelled plan change", 200);
  return kind;
}

/** Answer one PayPal Subscriptions API call for a simulated subscription. */
export async function simulate<T>(path: string, opts: PayPalRequestOptions): Promise<T> {
  const method = opts.method ?? "GET";
  const id = simulatedIdInPath(path)!;
  const action = path.split("?")[0].match(/^\/v1\/billing\/subscriptions\/[^/]+\/(\w+)$/)?.[1];

  if (method === "GET" && !action) {
    const sub = await requireSimulated(id);
    return {
      id: sub.id,
      status: sub.status,
      plan_id: sub.plan_id,
      plan_overridden: sub.plan_overridden ?? false,
      create_time: sub.create_time,
      ...(sub.price && path.includes("fields=plan")
        ? { plan: { billing_cycles: [{ sequence: 1, pricing_scheme: { fixed_price: { value: sub.price } } }] } }
        : {}),
    } as T;
  }
  if (method === "GET" && action === "transactions") {
    await requireSimulated(id);
    return { transactions: [] } as T;
  }

  let result: unknown = null;
  if (method === "PATCH" && !action) {
    const op = (opts.body as { path: string; value: { value: string } }[] | undefined)?.[0];
    if (!op?.path.includes("pricing_scheme/fixed_price")) throw unprocessable("Only the price can be changed.");
    await mutate(id, (sub) => {
      sub.price = op.value.value;
      sub.plan_overridden = true;
    });
  } else if (method === "POST" && action === "suspend") {
    await mutate(id, (sub) => {
      if (sub.status !== "ACTIVE") throw unprocessable(`Cannot suspend a ${sub.status} subscription.`);
      sub.status = "SUSPENDED";
    });
  } else if (method === "POST" && action === "activate") {
    await mutate(id, (sub) => {
      if (sub.status !== "SUSPENDED") throw unprocessable(`Cannot activate a ${sub.status} subscription.`);
      sub.status = "ACTIVE";
    });
  } else if (method === "POST" && action === "cancel") {
    await mutate(id, (sub) => {
      if (sub.status === "CANCELLED") throw unprocessable("The subscription is already cancelled.");
      sub.status = "CANCELLED";
    });
  } else if (method === "POST" && action === "revise") {
    const planId = (opts.body as { plan_id?: string } | undefined)?.plan_id;
    if (!planId) throw unprocessable("A plan_id is required.");
    await mutate(id, (sub) => {
      if (sub.status !== "ACTIVE") throw unprocessable(`Cannot revise a ${sub.status} subscription.`);
      sub.pending_plan_id = planId;
    });
    // Like PayPal, the plan change waits for the buyer, here on the simulated approval page.
    result = { plan_id: planId, links: [{ rel: "approve", href: `/demo-paypal/approve?subscription_id=${encodeURIComponent(id)}` }] };
  } else {
    throw new PayPalError(`Simulated PayPal has no route for ${method} ${path}`, 404, undefined, null);
  }
  await log(id, opts.label ?? `${method} ${path}`, result ? 200 : 204, opts.body);
  return result as T;
}

function unprocessable(description: string) {
  return new PayPalError(`PayPal (simulated) failed (422): ${description}`, 422, undefined, null);
}

async function requireSimulated(id: string): Promise<SimulatedSubscription> {
  const sub = await getSimulated(id);
  if (!sub) throw new PayPalError(`PayPal (simulated) failed (404): no subscription ${id}`, 404, undefined, null);
  return sub;
}

async function mutate<R>(id: string, fn: (sub: SimulatedSubscription) => R): Promise<R> {
  return updateStore((s) => {
    const sub = s.simulatedPayPal?.[id];
    if (!sub) throw new PayPalError(`PayPal (simulated) failed (404): no subscription ${id}`, 404, undefined, null);
    return fn(sub);
  });
}

async function log(id: string, label: string, status: number, request: unknown = null) {
  await recordEvent({
    type: "paypal.call",
    subscriptionId: id,
    summary: `${label} → ${status} (simulated PayPal)`,
    detail: { simulated: true, status, request },
  });
}
