import { body, json } from "@/lib/http";
import { declineOffer, publicSession } from "@/lib/retention/engine";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return json(async () => {
    const { offerId } = await body<{ offerId: string }>(req);
    return publicSession(await declineOffer((await ctx.params).sessionId, offerId));
  });
}
