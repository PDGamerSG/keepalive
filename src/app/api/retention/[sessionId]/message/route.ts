import { body, json } from "@/lib/http";
import { publicSession, sendMessage } from "@/lib/retention/engine";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  return json(async () => {
    const { text } = await body<{ text: string }>(req);
    return publicSession(await sendMessage((await ctx.params).sessionId, String(text ?? "")));
  });
}
