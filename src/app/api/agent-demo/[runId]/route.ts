import { body, json } from "@/lib/http";
import { answerHuman, getRun, publicRun } from "@/lib/agents/consumer";
import { RetentionError } from "@/lib/retention/engine";

export const maxDuration = 300;

export async function GET(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  return json(async () => {
    const run = getRun((await ctx.params).runId);
    if (!run) throw new RetentionError("Unknown run", 404);
    return publicRun(run);
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  return json(async () => {
    const b = await body<{ answer?: string; approve?: boolean | null }>(req);
    return publicRun(await answerHuman((await ctx.params).runId, String(b.answer ?? ""), b.approve ?? null));
  });
}
