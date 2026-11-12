import "server-only";
import { paypal } from "./client";
import { isSimulated, simulatedPlans } from "./simulator";
import { MERCHANT, TIERS, tier } from "@/lib/catalog";
import { readStore, updateStore } from "@/lib/store";
import type { SubscriptionStatus, TierId } from "@/lib/types";

/** Wrappers around PayPal Subscriptions v1 + Catalog Products v1. */

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

interface Link {
  href: string;
  rel: string;
  method?: string;
}

export interface PayPalSubscription {
  id: string;
  status: SubscriptionStatus;
  plan_id: string;
  plan_overridden?: boolean;
  custom_id?: string;
  start_time?: string;
  create_time?: string;
  status_update_time?: string;
  subscriber?: { name?: { given_name?: string; surname?: string }; email_address?: string; payer_id?: string };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount: { value: string; currency_code: string }; time: string };
    failed_payments_count?: number;
    outstanding_balance?: { value: string; currency_code: string };
  };
  plan?: { billing_cycles?: { sequence: number; pricing_scheme?: { fixed_price?: { value: string } } }[] };
  links?: Link[];
}

/** Create the Brewbox product + one monthly plan per tier, once. Idempotent via the store. */
export async function ensureCatalog(): Promise<{ productId: string; plans: Record<TierId, string> }> {
  // Hosted deployments can pin the catalog via env so restarts (ephemeral disk) don't create new plans.
  const env = {
    productId: process.env.PAYPAL_PRODUCT_ID,
    plans: { lite: process.env.PAYPAL_PLAN_LITE, standard: process.env.PAYPAL_PLAN_STANDARD, premium: process.env.PAYPAL_PLAN_PREMIUM },
  };
  if (env.productId && env.plans.lite && env.plans.standard && env.plans.premium) {
    const plans = env.plans as Record<TierId, string>;
    if ((await readStore()).config.productId !== env.productId) {
      await updateStore((s) => {
        s.config = { productId: env.productId, plans };
      });
    }
    return { productId: env.productId, plans };
  }
  const existing = (await readStore()).config;
  if (existing.productId && TIERS.every((t) => existing.plans[t.id])) {
    return { productId: existing.productId, plans: existing.plans as Record<TierId, string> };
  }
  let productId = existing.productId;
  if (!productId) {
    const product = await paypal<{ id: string }>("/v1/catalogs/products", {
      method: "POST",
      label: "create catalog product",
      requestId: `keepalive-product-${process.env.PAYPAL_CLIENT_ID?.slice(0, 12)}`,
      body: {
        name: MERCHANT.productName,
        description: MERCHANT.tagline,
        type: "SERVICE",
      },
    });
    productId = product.id;
    await updateStore((s) => {
      s.config.productId = productId;
    });
  }
  const plans = { ...existing.plans };
  for (const t of TIERS) {
    if (plans[t.id]) continue;
    const plan = await paypal<{ id: string }>("/v1/billing/plans", {
      method: "POST",
      label: `create plan ${t.name}`,
      prefer: "return=representation",
      body: {
        product_id: productId,
        name: `Brewbox ${t.name}`,
        description: t.description,
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: t.priceUsd.toFixed(2), currency_code: "USD" } },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: "CONTINUE",
          payment_failure_threshold: 3,
        },
      },
    });
    plans[t.id] = plan.id;
    await updateStore((s) => {
      s.config.plans[t.id] = plan.id;
    });
  }
  return { productId: productId!, plans: plans as Record<TierId, string> };
}

export async function tierForPlan(planId: string): Promise<TierId | undefined> {
  const plans = (await readStore()).config.plans;
  const real = (Object.keys(plans) as TierId[]).find((k) => plans[k] === planId);
  // Instant-demo subscriptions use stand-in plan IDs when no PayPal catalog exists.
  return real ?? (planId.match(/^P-DEMO-(LITE|STANDARD|PREMIUM)$/)?.[1].toLowerCase() as TierId | undefined);
}

export async function createSubscription(input: {
  tier: TierId;
  name: string;
  email: string;
}): Promise<{ id: string; approveUrl: string }> {
  const { plans } = await ensureCatalog();
  const [given, ...rest] = input.name.trim().split(/\s+/);
  const sub = await paypal<PayPalSubscription>("/v1/billing/subscriptions", {
    method: "POST",
    label: `create subscription (${tier(input.tier).name})`,
    prefer: "return=representation",
    body: {
      plan_id: plans[input.tier],
      custom_id: `brewbox:${input.tier}`,
      subscriber: {
        name: { given_name: given || "Brewbox", surname: rest.join(" ") || "Customer" },
        email_address: input.email,
      },
      application_context: {
        brand_name: MERCHANT.name,
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${appUrl()}/shop/return`,
        cancel_url: `${appUrl()}/shop?cancelled=1`,
      },
    },
  });
  const approve = sub.links?.find((l) => l.rel === "approve")?.href;
  if (!approve) throw new Error("PayPal did not return an approve link");
  return { id: sub.id, approveUrl: approve };
}

/** `fields=plan` is required: without it PayPal omits the (possibly overridden) price. */
export function getSubscription(id: string) {
  return paypal<PayPalSubscription>(`/v1/billing/subscriptions/${encodeURIComponent(id)}?fields=plan`);
}

export async function suspendSubscription(id: string, reason: string, requestId?: string) {
  await paypal(`/v1/billing/subscriptions/${encodeURIComponent(id)}/suspend`, {
    method: "POST",
    label: "suspend subscription (pause)",
    subscriptionId: id,
    requestId,
    body: { reason: reason.slice(0, 128) },
  });
}

export async function activateSubscription(id: string, reason: string, requestId?: string) {
  await paypal(`/v1/billing/subscriptions/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    label: "activate subscription (resume)",
    subscriptionId: id,
    requestId,
    body: { reason: reason.slice(0, 128) },
  });
}

export async function cancelSubscription(id: string, reason: string, requestId?: string) {
  await paypal(`/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    label: "cancel subscription",
    subscriptionId: id,
    requestId,
    body: { reason: reason.slice(0, 128) },
  });
}

/** Revise to another plan of the same product. PayPal returns an approve link for buyer re-consent. */
export async function reviseSubscription(
  id: string,
  toTier: TierId,
  requestId?: string,
): Promise<{ approveUrl?: string; planOverridden?: boolean }> {
  const plans = isSimulated(id) ? await simulatedPlans() : (await ensureCatalog()).plans;
  const res = await paypal<{ links?: Link[]; plan_overridden?: boolean }>(
    `/v1/billing/subscriptions/${encodeURIComponent(id)}/revise`,
    {
      method: "POST",
      label: `revise subscription → ${tier(toTier).name}`,
      subscriptionId: id,
      requestId,
      body: {
        plan_id: plans[toTier],
        application_context: {
          brand_name: MERCHANT.name,
          user_action: "CONTINUE",
          shipping_preference: "NO_SHIPPING",
          return_url: `${appUrl()}/account/${encodeURIComponent(id)}?revised=${toTier}`,
          cancel_url: `${appUrl()}/account/${encodeURIComponent(id)}?revise_cancelled=1`,
        },
      },
    },
  );
  return { approveUrl: res.links?.find((l) => l.rel === "approve")?.href, planOverridden: res.plan_overridden };
}

/** Override the subscription's regular price (used for temporary retention discounts and restoring them). */
export async function setSubscriptionPrice(id: string, priceUsd: number, label: string, requestId?: string) {
  await paypal(`/v1/billing/subscriptions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    label,
    subscriptionId: id,
    requestId,
    body: [
      {
        op: "replace",
        path: "/plan/billing_cycles/@sequence==1/pricing_scheme/fixed_price",
        value: { currency_code: "USD", value: priceUsd.toFixed(2) },
      },
    ],
  });
}

export function currentPrice(sub: PayPalSubscription): number | undefined {
  const v = sub.plan?.billing_cycles?.find((c) => c.sequence === 1)?.pricing_scheme?.fixed_price?.value;
  return v ? Number(v) : undefined;
}

export async function listTransactions(id: string) {
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 86_400_000);
  return paypal<{
    transactions?: { id: string; status: string; time: string; amount_with_breakdown?: { gross_amount?: { value: string } } }[];
  }>(
    `/v1/billing/subscriptions/${encodeURIComponent(id)}/transactions?start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
  );
}
