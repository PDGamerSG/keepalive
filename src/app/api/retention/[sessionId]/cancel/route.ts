import { json } from "@/lib/http";
import { cancelNow, publicSession } from "@/lib/retention/engine";

export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return json(async () => publicSession(await cancelNow((await ctx.params).sessionId)));
}
