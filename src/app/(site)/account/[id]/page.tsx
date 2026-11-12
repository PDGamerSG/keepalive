import Link from "next/link";
import { notFound } from "next/navigation";
import { LocalTime } from "@/components/ui/local-time";
import { tier } from "@/lib/catalog";
import { confirmRevise } from "@/lib/retention/engine";
import { runDueActions, syncSubscriber } from "@/lib/retention/execute";
import { getSubscriber } from "@/lib/store";
import { STATE_LABEL, STATE_TONE, subscriberState } from "@/lib/subscriber-state";
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
  const state = subscriberState(sub);
  return (
    <div className="shell">
      <header className="page-head">
        <p className="page-note">Hi {sub.name.split(" ")[0]}, this is your Brewbox subscription</p>
        <div className="acct-title">
          <h1 className="display page-title">Brewbox {t.name}</h1>
          <span className={`badge badge-${STATE_TONE[state]}`}>{STATE_LABEL[state]}</span>
        </div>
      </header>

      <div className="acct-grid">
        <div className="acct-side">
          <section className="card acct-card" aria-label="Your plan">
            <p className="acct-price">
              <span className="display num">${sub.priceUsd.toFixed(2)}</span>
              <small>a month</small>
              {sub.priceUsd !== sub.listPriceUsd && <s className="num">${sub.listPriceUsd.toFixed(2)}</s>}
            </p>
            <p className="acct-desc">{t.description}</p>
            <dl className="facts">
              <dt>Billed by</dt>
              <dd>PayPal Subscriptions</dd>
              <dt>PayPal status</dt>
              <dd>{sub.status}</dd>
              <dt>Subscription</dt>
              <dd className="mono">{sub.id}</dd>
              {sub.resumeAt && (
                <>
                  <dt>Resumes</dt>
                  <dd>
                    <LocalTime iso={sub.resumeAt} dateOnly />
                  </dd>
                </>
              )}
              {sub.discountUntil && (
                <>
                  <dt>Discount until</dt>
                  <dd>
                    <LocalTime iso={sub.discountUntil} dateOnly />
                  </dd>
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
            <p className="notice notice-ok" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="notice notice-error" role="alert">
              PayPal: {error}
            </p>
          )}
          <Link href="/shop" className="acct-back">
            Back to the shop
          </Link>
        </div>
        <CancelFlow subscriptionId={sub.id} status={sub.status} />
      </div>
    </div>
  );
}
