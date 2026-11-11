import { json } from "@/lib/http";
import { publicSession, requireSession } from "@/lib/retention/engine";

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return json(async () => publicSession(await requireSession((await ctx.params).sessionId)));
}
