import Link from "next/link";
import { Check } from "@/components/ui/icons";
import { tier } from "@/lib/catalog";
import { syncSubscriber } from "@/lib/retention/execute";
import { getSubscriber, recordEvent } from "@/lib/store";
import "../shop.css";

export default async function Return({ searchParams }: { searchParams: Promise<{ subscription_id?: string }> }) {
  const { subscription_id } = await searchParams;
  if (!subscription_id) return <Msg title="Missing subscription" body="PayPal did not send back a subscription ID. Start again from the shop." />;
  if (!(await getSubscriber(subscription_id))) {
    return <Msg title="Unknown subscription" body={`Brewbox has no record of ${subscription_id}. Start again from the shop.`} />;
  }
  let error: string | null = null;
  let sub = await getSubscriber(subscription_id);
  try {
    sub = await syncSubscriber(subscription_id);
    await recordEvent({ type: "subscription.approved", subscriptionId: subscription_id, summary: `Subscriber approved in PayPal → ${sub?.status}` });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (!sub) return <Msg title="Unknown subscription" body="Start again from the shop." />;
  const plan = tier(sub.tier);
  return (
    <div className="shell welcome">
      <div className="card welcome-card">
        <span className="welcome-tick">
          <Check size={20} />
        </span>
        <p className="page-note">Subscription approved in PayPal</p>
        <h1 className="display page-title">Welcome to Brewbox, {sub.name.split(" ")[0]}.</h1>
        <p className="lede">Your first bag ships with the next roast.</p>
        <dl className="facts">
          <dt>Plan</dt>
          <dd>
            {plan.name}, ${sub.priceUsd} a month
          </dd>
          <dt>PayPal status</dt>
          <dd>{sub.status}</dd>
          <dt>Subscription</dt>
          <dd className="mono">{sub.id}</dd>
        </dl>
        {error && (
          <p className="notice notice-error" role="alert">
            PayPal: {error}
          </p>
        )}
        <Link href={`/account/${subscription_id}`} className="btn btn-ink">
          Manage my subscription
        </Link>
      </div>
    </div>
  );
}

function Msg({ title, body }: { title: string; body: string }) {
  return (
    <div className="shell welcome">
      <div className="card welcome-card">
        <h1 className="display page-title">{title}</h1>
        <p className="lede">{body}</p>
        <Link href="/shop" className="btn btn-line">
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
