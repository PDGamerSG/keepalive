import { Conversations } from "@/components/merchant/conversations";
import { PageHead } from "@/components/merchant/shell";
import { readStore } from "@/lib/store";

export default async function ConversationsPage() {
  const store = await readStore();
  const names = Object.fromEntries(store.subscribers.map((s) => [s.id, s.name]));
  return (
    <>
      <PageHead title="Conversations" note="What each subscriber said, what was offered, and why" />
      <Conversations sessions={store.sessions.slice(0, 50)} names={names} />
    </>
  );
}
