import { PageHead, SyncActions } from "@/components/merchant/shell";
import { SubscriberGrid } from "@/components/merchant/subscriber-grid";
import { readStore } from "@/lib/store";

export default async function Subscribers() {
  const store = await readStore();
  return (
    <>
      <PageHead title="Subscribers" note="Everyone who has subscribed to Brewbox, as PayPal last reported them">
        <SyncActions needsSetup={!store.config.productId} />
      </PageHead>
      <SubscriberGrid rows={store.subscribers} />
    </>
  );
}
