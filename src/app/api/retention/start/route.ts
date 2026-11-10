import { body, json } from "@/lib/http";
import { publicSession, startSession } from "@/lib/retention/engine";

export async function POST(req: Request) {
  return json(async () => {
    const b = await body<{ subscriptionId: string; message?: string }>(req);
    const s = await startSession({ subscriptionId: b.subscriptionId, channel: "web", firstMessage: b.message });
    return publicSession(s);
  });
}
