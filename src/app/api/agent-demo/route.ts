import { body, json } from "@/lib/http";
import { publicRun, startAgentRun } from "@/lib/agents/consumer";

export const maxDuration = 300;

export async function POST(req: Request) {
  return json(async () => {
    const b = await body<{ subscriptionId: string; brief: string }>(req);
    return publicRun(await startAgentRun(b.subscriptionId, String(b.brief ?? "").slice(0, 1000)));
  });
}
