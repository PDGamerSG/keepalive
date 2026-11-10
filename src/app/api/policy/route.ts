import { assertAdmin, body, json } from "@/lib/http";
import { MerchantPolicySchema } from "@/lib/policy";
import { getPolicy, RetentionError } from "@/lib/retention/engine";
import { recordEvent, updateStore } from "@/lib/store";

export async function GET() {
  return json(async () => getPolicy());
}

export async function PUT(req: Request) {
  return json(async () => {
    assertAdmin(req);
    const parsed = MerchantPolicySchema.safeParse(await body(req));
    if (!parsed.success) throw new RetentionError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    updateStore((s) => {
      s.policy = parsed.data;
    });
    recordEvent({ type: "policy.updated", summary: "Merchant updated retention policy" });
    return parsed.data;
  });
}
