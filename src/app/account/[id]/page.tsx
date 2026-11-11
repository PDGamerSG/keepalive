import Link from "next/link";
import { notFound } from "next/navigation";
import { tier } from "@/lib/catalog";
import { confirmRevise } from "@/lib/retention/engine";
import { runDueActions, syncSubscriber } from "@/lib/retention/execute";
import { getSubscriber } from "@/lib/store";
import { CancelFlow } from "./cancel-flow";
import { ResumeButton } from "./resume-button";

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-save-soft text-save",
  SUSPENDED: "bg-amber-100 text-amber-900",
  CANCELLED: "bg-red-50 text-danger",
  APPROVAL_PENDING: "bg-blue-50 text-paypal",
};

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
      notice = s ? s.offers.find((o) => o.type === "downgrade" && o.status === "executed")?.result ?? null : null;
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
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 grid gap-6 md:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <div className="card p-6">
          <p className="text-sm text-muted">Hi {sub.name.split(" ")[0]}, this is your Brewbox subscription</p>
          <div className="mt-3 flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-display)] text-3xl">{t.name}</h1>
            <span className={`pill ${statusStyle[sub.status] ?? "bg-crema"}`}>{sub.status}</span>
          </div>
          <p className="mt-1 text-muted text-sm">{t.description}</p>
          <div className="mt-5 text-3xl font-[family-name:var(--font-display)]">
            ${sub.priceUsd.toFixed(2)}
            <span className="text-sm text-muted font-sans"> /month</span>
            {sub.priceUsd !== sub.listPriceUsd && (
              <span className="ml-2 text-sm text-muted line-through font-sans">${sub.listPriceUsd}</span>
            )}
          </div>
          <dl className="mt-4 text-sm grid grid-cols-2 gap-y-1">
            <dt className="text-muted">Billed by</dt>
            <dd>PayPal Subscriptions</dd>
            <dt className="text-muted">Subscription ID</dt>
            <dd className="font-mono text-xs">{sub.id}</dd>
            {sub.resumeAt && (
              <>
                <dt className="text-muted">Resumes</dt>
                <dd>{new Date(sub.resumeAt).toLocaleDateString()}</dd>
              </>
            )}
            {sub.discountUntil && (
              <>
                <dt className="text-muted">Discount until</dt>
                <dd>{new Date(sub.discountUntil).toLocaleDateString()}</dd>
              </>
            )}
          </dl>
          {sub.status === "SUSPENDED" && <ResumeButton id={sub.id} />}
          {sub.pendingRevise && (
            <a href={sub.pendingRevise.approveUrl} className="btn btn-paypal mt-4 w-full">
              Confirm switch to {tier(sub.pendingRevise.toTier).name} in PayPal
            </a>
          )}
        </div>
        {notice && <div className="card p-4 text-sm bg-save-soft border-save/30 text-save">{notice}</div>}
        {error && <div className="card p-4 text-sm text-danger">PayPal: {error}</div>}
        <Link href="/shop" className="text-sm text-muted underline">← Back to the shop</Link>
      </div>
      <CancelFlow subscriptionId={sub.id} status={sub.status} />
    </div>
  );
}
