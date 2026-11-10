import { assertAdmin, body, json } from "@/lib/http";
import { ensureCatalog } from "@/lib/paypal/subscriptions";
import { resumeNow, restoreListPrice, runDueActions, syncSubscriber } from "@/lib/retention/execute";
import { RetentionError } from "@/lib/retention/engine";
import { patchSubscriber, readStore, upsertSubscriber } from "@/lib/store";
import { tier } from "@/lib/catalog";
import type { TierId } from "@/lib/types";

/** Merchant/demo operations. */
export async function POST(req: Request) {
  return json(async () => {
    assertAdmin(req);
    const b = await body<{ action: string; id?: string; usage?: Record<string, unknown>; name?: string; email?: string; tier?: TierId; createdAt?: string }>(req);
    switch (b.action) {
      case "setup":
        return ensureCatalog();
      case "sync-all": {
        const out: Record<string, string> = {};
        for (const s of readStore().subscribers) {
          try {
            out[s.id] = (await syncSubscriber(s.id))?.status ?? "unknown";
          } catch (e) {
            out[s.id] = `error: ${e instanceof Error ? e.message : e}`;
          }
        }
        await runDueActions();
        return out;
      }
      case "sync":
        return syncSubscriber(req_id(b.id));
      case "resume":
        return resumeNow(req_id(b.id));
      case "restore-price":
        return restoreListPrice(req_id(b.id));
      case "set-profile": {
        // Demo helper: set the merchant-side facts (usage, tenure) for a subscriber.
        const id = req_id(b.id);
        patchSubscriber(id, {
          ...(b.usage ? { usage: b.usage as never } : {}),
          ...(b.name ? { name: b.name } : {}),
          ...(b.createdAt ? { createdAt: b.createdAt } : {}),
        });
        return readStore().subscribers.find((s) => s.id === id);
      }
      case "import": {
        // Track an existing PayPal subscription (e.g. created from the sandbox dashboard).
        const id = req_id(b.id);
        const t = b.tier ?? "standard";
        upsertSubscriber({
          id,
          name: b.name ?? "Imported subscriber",
          email: b.email ?? "",
          tier: t,
          status: "ACTIVE",
          priceUsd: tier(t).priceUsd,
          listPriceUsd: tier(t).priceUsd,
          createdAt: b.createdAt ?? new Date().toISOString(),
          usage: { boxesReceived: 0, skippedLastMonth: false, supportTickets: 0 },
        });
        return syncSubscriber(id);
      }
      default:
        throw new RetentionError(`Unknown action ${b.action}`);
    }
  });
}

function req_id(id?: string): string {
  if (!id) throw new RetentionError("id required");
  return id;
}
