import { z } from "zod";
import { body, json } from "@/lib/http";
import { approveSimulated, declineSimulated, getSimulated, isSimulated, tierForSimulatedPlan } from "@/lib/paypal/simulator";
import { RetentionError } from "@/lib/retention/engine";

const Decision = z.object({
  subscriptionId: z.string().min(1),
  decision: z.enum(["approve", "cancel"]),
});

/** The buyer's choice on the simulated PayPal approval page. Returns where to send them next. */
export async function POST(req: Request) {
  return json(async () => {
    const parsed = Decision.safeParse(await body(req));
    if (!parsed.success || !isSimulated(parsed.data.subscriptionId)) {
      throw new RetentionError("Unknown instant-demo subscription.", 404);
    }
    const { subscriptionId: id, decision } = parsed.data;
    const pendingPlan = (await getSimulated(id))?.pending_plan_id;
    const path = encodeURIComponent(id);
    if (decision === "cancel") {
      const kind = await declineSimulated(id);
      return { redirect: kind === "subscription" ? "/shop?cancelled=1" : `/account/${path}?revise_cancelled=1` };
    }
    const kind = await approveSimulated(id);
    if (kind === "subscription") return { redirect: `/shop/return?subscription_id=${path}` };
    const toTier = pendingPlan ? await tierForSimulatedPlan(pendingPlan) : undefined;
    return { redirect: `/account/${path}?revised=${toTier ?? "1"}` };
  });
}
