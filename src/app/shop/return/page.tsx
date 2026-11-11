import Link from "next/link";
import { OrreryView } from "@/components/orrery/orrery-view";
import { bodyState } from "@/components/orrery/states";
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
      <div className="welcome-copy">
        <p className="page-kicker">Subscription approved in PayPal</p>
        <h1 className="display page-title">Welcome to Brewbox, {sub.name.split(" ")[0]}.</h1>
        <p className="lede">You&apos;re in orbit. Your first bag ships with the next roast.</p>
        <dl className="welcome-facts">
          <dt>Plan</dt>
          <dd>
            {plan.name}, ${sub.priceUsd} a month
          </dd>
          <dt>PayPal status</dt>
          <dd>{sub.status}</dd>
          <dt>Subscription</dt>
          <dd className="code">{sub.id}</dd>
        </dl>
        {error && <p className="state state-exit">PayPal: {error}</p>}
        <Link href={`/account/${subscription_id}`} className="btn btn-solid">
          Manage my subscription
        </Link>
      </div>
      <div className="panel welcome-orrery">
        <OrreryView
          className="shop-orrery-view"
          label={`Your subscription on the ${plan.name} ring`}
          bodies={[]}
          focus={{ tier: sub.tier, state: bodyState(sub) }}
          focusLabel="You"
          highlight={sub.tier}
          zoom={1.1}
        />
      </div>
    </div>
  );
}

function Msg({ title, body }: { title: string; body: string }) {
  return (
    <div className="shell page-head">
      <h1 className="display page-title">{title}</h1>
      <p className="lede" style={{ marginTop: "1rem" }}>
        {body}
      </p>
      <Link href="/shop" className="btn btn-line" style={{ marginTop: "1.5rem" }}>
        Back to the shop
      </Link>
    </div>
  );
}
