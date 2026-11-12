import { body, json } from "@/lib/http";
import { createSubscription } from "@/lib/paypal/subscriptions";
import { tier } from "@/lib/catalog";
import { upsertSubscriber } from "@/lib/store";
import { personaFields } from "@/lib/personas";
import { RetentionError } from "@/lib/retention/engine";
import { z } from "zod";

const Checkout = z.object({
  tier: z.enum(["lite", "standard", "premium"]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  persona: z.string().optional(),
});

export async function POST(req: Request) {
  return json(async () => {
    const parsed = Checkout.safeParse(await body(req));
    if (!parsed.success) throw new RetentionError("Choose a plan and enter your name and a valid email address.");
    const b = parsed.data;
    const { id, approveUrl } = await createSubscription({ tier: b.tier, name: b.name, email: b.email });
    const t = tier(b.tier);
    await upsertSubscriber({
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
