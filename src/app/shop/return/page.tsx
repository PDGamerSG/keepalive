import Link from "next/link";
import { syncSubscriber } from "@/lib/retention/execute";
import { getSubscriber, recordEvent } from "@/lib/store";
import { tier } from "@/lib/catalog";

export default async function Return({ searchParams }: { searchParams: Promise<{ subscription_id?: string }> }) {
  const { subscription_id } = await searchParams;
  if (!subscription_id) return <Msg title="Missing subscription" body="PayPal did not return a subscription ID." />;
  if (!(await getSubscriber(subscription_id))) return <Msg title="Unknown subscription" body={`We have no record of ${subscription_id}.`} />;
  let error: string | null = null;
  let sub = await getSubscriber(subscription_id);
  try {
    sub = await syncSubscriber(subscription_id);
    await recordEvent({ type: "subscription.approved", subscriptionId: subscription_id, summary: `Subscriber approved in PayPal → ${sub?.status}` });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl mt-3">Welcome to Brewbox, {sub?.name.split(" ")[0]}!</h1>
      <p className="mt-3 text-muted">
        {sub && tier(sub.tier).name} plan · ${sub?.priceUsd}/month · PayPal status{" "}
        <b className="text-foreground">{sub?.status}</b>
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <Link href={`/account/${subscription_id}`} className="btn btn-primary mt-8">Manage my subscription</Link>
    </div>
  );
}

function Msg({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  );
}
