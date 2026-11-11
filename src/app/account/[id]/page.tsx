import Link from "next/link";
import { notFound } from "next/navigation";
import { OrreryView } from "@/components/orrery/orrery-view";
import { STATE_LABEL, STATE_TONE, bodyState } from "@/components/orrery/states";
import { tier } from "@/lib/catalog";
import { confirmRevise } from "@/lib/retention/engine";
import { runDueActions, syncSubscriber } from "@/lib/retention/execute";
import { getSubscriber } from "@/lib/store";
import { CancelFlow } from "./cancel-flow";
import { ResumeButton } from "./resume-button";
import "./account.css";

export default async function Account({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revised?: string; revise_cancelled?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!(await getSubscriber(id))) notFound();

  let notice: string | null = null;
  let error: string | null = null;
  try {
    if (sp.revised) {
      const s = await confirmRevise(id);
      notice = s ? (s.offers.find((o) => o.type === "downgrade" && o.status === "executed")?.result ?? null) : null;
    } else {
      await syncSubscriber(id);
    }
    await runDueActions();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (sp.revise_cancelled) notice = "You didn't confirm the plan change in PayPal, so your plan is unchanged.";

  const sub = (await getSubscriber(id))!;
  const t = tier(sub.tier);
  const state = bodyState(sub);
  const focusLabel = state === "paused" ? "You, paused" : state === "cancelled" ? "You, cancelled" : "You";
  return (
    <div className="shell acct">
      <div className="acct-side">
        <header className="acct-head">
          <p className="page-kicker">Hi {sub.name.split(" ")[0]}, this is your Brewbox subscription</p>
          <div className="acct-title">
            <h1 className="display page-title">{t.name}</h1>
            <span className={`state state-${STATE_TONE[state]}`}>{STATE_LABEL[state]}</span>
          </div>
          <p className="acct-desc">{t.description}</p>
        </header>

        <div className="panel acct-orrery">
          <OrreryView
            className="acct-orrery-view"
            label={`Your subscription, ${STATE_LABEL[state].toLowerCase()}, on the ${t.name} ring`}
            bodies={[]}
            focus={{ tier: sub.tier, state }}
            focusLabel={focusLabel}
            highlight={sub.tier}
            zoom={0.78}
          />
        </div>

        <section className="panel acct-card">
          <p className="acct-price num">
            ${sub.priceUsd.toFixed(2)}
            <small>a month</small>
            {sub.priceUsd !== sub.listPriceUsd && <s>${sub.listPriceUsd.toFixed(2)}</s>}
          </p>
          <dl className="acct-facts">
            <dt>Billed by</dt>
            <dd>PayPal Subscriptions</dd>
            <dt>PayPal status</dt>
            <dd>{sub.status}</dd>
            <dt>Subscription</dt>
            <dd className="code">{sub.id}</dd>
            {sub.resumeAt && (
              <>
                <dt>Resumes</dt>
                <dd>{new Date(sub.resumeAt).toLocaleDateString()}</dd>
              </>
            )}
            {sub.discountUntil && (
              <>
                <dt>Discount until</dt>
                <dd>{new Date(sub.discountUntil).toLocaleDateString()}</dd>
              </>
            )}
          </dl>
          {sub.status === "SUSPENDED" && <ResumeButton id={sub.id} />}
          {sub.pendingRevise && (
            <a href={sub.pendingRevise.approveUrl} className="btn btn-paypal acct-wide">
              Confirm the switch to {tier(sub.pendingRevise.toTier).name} in PayPal
            </a>
          )}
        </section>
        {notice && (
          <p className="acct-notice is-ok" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="acct-notice is-error" role="alert">
            PayPal: {error}
          </p>
        )}
        <Link href="/shop" className="acct-back">
          Back to the shop
        </Link>
      </div>
      <CancelFlow subscriptionId={sub.id} status={sub.status} />
    </div>
  );
}
