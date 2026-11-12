import { body, json } from "@/lib/http";
import { publicRun, startAgentRun } from "@/lib/agents/consumer";
import { RetentionError } from "@/lib/retention/engine";
import { z } from "zod";

export const maxDuration = 300;

export async function POST(req: Request) {
  return json(async () => {
    const parsed = z.object({ subscriptionId: z.string().min(1), brief: z.string().trim().min(1).max(1000) }).safeParse(await body(req));
    if (!parsed.success) throw new RetentionError("Choose a subscription and write a brief of up to 1,000 characters.");
    return publicRun(await startAgentRun(parsed.data.subscriptionId, parsed.data.brief));
  });
}
