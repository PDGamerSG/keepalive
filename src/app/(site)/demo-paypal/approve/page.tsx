import Link from "next/link";
import { tier } from "@/lib/catalog";
import { getSimulated, isSimulated, tierForSimulatedPlan } from "@/lib/paypal/simulator";
import { getSubscriber } from "@/lib/store";
import { ApproveButtons } from "./approve-buttons";
import "./approve.css";

/**
 * The instant demo's stand-in for PayPal's approval page: the buyer approves a
 * new subscription or a plan change here, without a PayPal account.
 */
export default async function SimulatedApproval({
  searchParams,
}: {
  searchParams: Promise<{ subscription_id?: string }>;
}) {
  const { subscription_id: id } = await searchParams;
  const sim = id && isSimulated(id) ? await getSimulated(id) : undefined;
  const sub = id ? await getSubscriber(id) : undefined;
  if (!id || !sim || !sub) {
    return <Notice title="Nothing to approve" body="This instant-demo link is no longer valid. Start again from the shop." href="/shop" />;
  }

  const isCheckout = sim.status === "APPROVAL_PENDING";
  const newTier = sim.pending_plan_id ? await tierForSimulatedPlan(sim.pending_plan_id) : undefined;
  if (!isCheckout && !newTier) {
    return <Notice title="Nothing to approve" body="This subscription has nothing waiting for approval." href={`/account/${encodeURIComponent(id)}`} />;
  }
  const plan = tier(isCheckout ? sub.tier : newTier!);

  return (
    <div className="shell sim">
      <div className="card sim-card">
        <p className="sim-brand">
          <span className="sim-mark">Simulated PayPal approval</span>
          <span className="badge badge-offer">Instant demo</span>
        </p>
        <h1 className="display sim-title">{isCheckout ? "Approve your subscription" : "Approve your plan change"}</h1>
        <p className="sim-lede">
          {isCheckout
            ? `Brewbox asks to bill you every month for ${plan.name}.`
            : `Brewbox asks to move your subscription to ${plan.name} from your next billing cycle.`}
        </p>
        <dl className="facts sim-facts">
          <dt>Merchant</dt>
          <dd>Brewbox (demo merchant)</dd>
          <dt>Plan</dt>
          <dd>
            {plan.name}, ${plan.priceUsd.toFixed(2)} a month
          </dd>
          <dt>Account</dt>
          <dd>
            {sub.name} · {sub.email}
          </dd>
          <dt>Subscription</dt>
          <dd className="mono">{id}</dd>
        </dl>
        <ApproveButtons subscriptionId={id} approveLabel={isCheckout ? "Agree and subscribe" : "Approve plan change"} />
        <p className="sim-fine">
          This step stands in for PayPal&apos;s approval page in the instant demo. No PayPal account is used and no money
          moves. Pausing, discounts, plan changes and cancelling then run on KeepAlive&apos;s PayPal simulator.
        </p>
      </div>
    </div>
  );
}

function Notice({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <div className="shell sim">
      <div className="card sim-card">
        <h1 className="display sim-title">{title}</h1>
        <p className="sim-lede">{body}</p>
        <Link href={href} className="btn btn-line">
          Go back
        </Link>
      </div>
    </div>
  );
}
