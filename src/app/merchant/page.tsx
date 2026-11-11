import { computeMetrics } from "@/lib/metrics";
import { getPolicy } from "@/lib/retention/engine";
import { readStore } from "@/lib/store";
import { Dashboard } from "./dashboard";
import { paypalConfigured } from "@/lib/paypal/client";
import { aiConfigured } from "@/lib/ai";

export default async function MerchantPage() {
  const store = await readStore();
  return (
    <div className="workspace">
      <Dashboard
        metrics={computeMetrics(store)}
        subscribers={store.subscribers}
        sessions={store.sessions.slice(0, 50)}
        events={store.events.slice(0, 80)}
        policy={await getPolicy()}
        catalog={store.config}
        connections={{ paypal: paypalConfigured(), ai: aiConfigured(), webhook: Boolean(process.env.PAYPAL_WEBHOOK_ID) }}
      />
    </div>
  );
}
