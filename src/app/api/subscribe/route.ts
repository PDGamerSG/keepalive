import { body, json } from "@/lib/http";
import { createSubscription } from "@/lib/paypal/subscriptions";
import { tier } from "@/lib/catalog";
import { upsertSubscriber } from "@/lib/store";
import { personaFields } from "@/lib/personas";
import { RetentionError } from "@/lib/retention/engine";
import type { TierId } from "@/lib/types";

export async function POST(req: Request) {
  return json(async () => {
    const b = await body<{ tier: TierId; name: string; email: string; persona?: string }>(req);
    if (!["lite", "standard", "premium"].includes(b.tier)) throw new RetentionError("Unknown tier");
    if (!b.name?.trim() || !b.email?.includes("@")) throw new RetentionError("Name and email are required");
    const { id, approveUrl } = await createSubscription({ tier: b.tier, name: b.name, email: b.email });
    const t = tier(b.tier);
    upsertSubscriber({
      id,
      name: b.name.trim(),
      email: b.email.trim(),
      tier: b.tier,
      status: "APPROVAL_PENDING",
      priceUsd: t.priceUsd,
      listPriceUsd: t.priceUsd,
      ...personaFields(b.persona),
    });
    return { subscriptionId: id, approveUrl };
  });
}
