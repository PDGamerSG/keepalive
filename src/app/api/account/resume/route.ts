import { body, json } from "@/lib/http";
import { resumeNow } from "@/lib/retention/execute";
import { getSubscriber } from "@/lib/store";
import { RetentionError } from "@/lib/retention/engine";

/** Subscriber ends their own pause early. */
export async function POST(req: Request) {
  return json(async () => {
    const { id } = await body<{ id: string }>(req);
    const sub = getSubscriber(id);
    if (!sub) throw new RetentionError("Unknown subscription", 404);
    if (sub.status !== "SUSPENDED") throw new RetentionError(`Subscription is ${sub.status}`);
    return resumeNow(id);
  });
}
