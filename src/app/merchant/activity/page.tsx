import { ActivityLog } from "@/components/merchant/activity-log";
import { PageHead } from "@/components/merchant/shell";
import { readStore } from "@/lib/store";

export default async function Activity() {
  const store = await readStore();
  return (
    <>
      <PageHead title="PayPal activity" note="Every PayPal call, webhook and guardrail decision, newest first" />
      <ActivityLog events={store.events.slice(0, 80)} />
    </>
  );
}
