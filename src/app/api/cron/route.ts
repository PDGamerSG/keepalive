import { json } from "@/lib/http";
import { runDueActions } from "@/lib/retention/execute";

export async function GET() {
  return json(async () => ({ done: await runDueActions() }));
}
