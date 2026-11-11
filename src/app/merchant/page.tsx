import { computeMetrics } from "@/lib/metrics";
import { getPolicy } from "@/lib/retention/engine";
import { readStore } from "@/lib/store";
import { Dashboard } from "./dashboard";

export default async function MerchantPage() {
  const store = await readStore();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Dashboard
        metrics={computeMetrics(store)}
        subscribers={store.subscribers}
        sessions={store.sessions.slice(0, 50)}
        events={store.events.slice(0, 80)}
        policy={await getPolicy()}
        catalog={store.config}
      />
    </div>
  );
}
