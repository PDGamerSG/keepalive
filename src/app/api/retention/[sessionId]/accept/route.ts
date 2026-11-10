import { body, json } from "@/lib/http";
import { acceptOffer, publicSession } from "@/lib/retention/engine";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return json(async () => {
    const { offerId } = await body<{ offerId: string }>(req);
    const { session, approveUrl } = await acceptOffer((await ctx.params).sessionId, offerId);
    return { ...publicSession(session), paypal_approval_url: approveUrl ?? null };
  });
}
