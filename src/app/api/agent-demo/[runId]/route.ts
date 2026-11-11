import { body, json } from "@/lib/http";
import { answerHuman, getRun, publicRun } from "@/lib/agents/consumer";
import { RetentionError } from "@/lib/retention/engine";
import { z } from "zod";

export const maxDuration = 300;

export async function GET(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  return json(async () => {
    const run = await getRun((await ctx.params).runId);
    if (!run) throw new RetentionError("Unknown run", 404);
    return publicRun(run);
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ runId: string }> }) {
  return json(async () => {
    const parsed = z.object({ answer: z.string().max(1000).optional(), approve: z.boolean().nullable().optional() }).safeParse(await body(req));
    if (!parsed.success) throw new RetentionError("Send a valid approval and a reply of up to 1,000 characters.");
    const b = parsed.data;
    return publicRun(await answerHuman((await ctx.params).runId, String(b.answer ?? ""), b.approve ?? null));
  });
}
