import { EventRow } from "@/components/merchant/activity-log";
import { Kpis, OfferPairs, ReasonBars, StateBar } from "@/components/merchant/charts";
import { OUTCOME_LABEL, OUTCOME_TONE, REASON_LABEL } from "@/components/merchant/labels";
import { DeskLink, PageHead, SyncActions } from "@/components/merchant/shell";
import { computeMetrics } from "@/lib/metrics";
import { readStore } from "@/lib/store";

export default async function Overview() {
  const store = await readStore();
  const m = computeMetrics(store);
  const names = new Map(store.subscribers.map((s) => [s.id, s.name]));
  const sessions = store.sessions.slice(0, 5);
  const events = store.events.slice(0, 6);

  return (
    <>
      <PageHead title="Overview" note="Brewbox on PayPal Subscriptions">
        <SyncActions needsSetup={!store.config.productId} />
      </PageHead>

      <Kpis m={m} />

      <div className="dash-grid">
        <section className="card dash-card dash-wide">
          <h2>Subscribers by state</h2>
          {store.subscribers.length === 0 ? (
            <div className="dash-empty">
              <p>
                No subscribers yet. Subscribe in the Brewbox shop with a PayPal sandbox buyer and they appear here,
                grouped by state.
              </p>
              <a className="btn btn-ink btn-sm" href="/shop">
                Open the Brewbox shop
              </a>
            </div>
          ) : (
            <StateBar subscribers={store.subscribers} />
          )}
        </section>

        <section className="card dash-card">
          <h2>Why people try to leave</h2>
          <ReasonBars reasons={m.reasons} />
        </section>

        <section className="card dash-card">
          <h2>Offers made and taken</h2>
          <OfferPairs offers={m.offersByType} />
          <p className="dash-note">
            Every accepted offer was carried out on PayPal Subscriptions (suspend, revise or a price change) and read
            back before it counted.
          </p>
        </section>

        <section className="card dash-card">
          <div className="dash-card-head">
            <h2>Latest conversations</h2>
            <DeskLink href="/merchant/conversations">See all {store.sessions.length}</DeskLink>
          </div>
          {sessions.length === 0 ? (
            <p className="dash-none">Conversations appear here when a subscriber, or their agent, asks to cancel.</p>
          ) : (
            <ul className="recent">
              {sessions.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{names.get(s.subscriptionId) ?? s.subscriptionId}</strong>
                    <small>
                      {REASON_LABEL[s.reason ?? ""] ?? "Reason not given yet"}
                      {s.channel === "agent" && ", through their AI agent"}
                    </small>
                  </span>
                  <span className={`badge badge-${OUTCOME_TONE[s.outcome] ?? "dim"}`}>{OUTCOME_LABEL[s.outcome] ?? s.outcome}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card dash-card">
          <div className="dash-card-head">
            <h2>Latest PayPal activity</h2>
            <DeskLink href="/merchant/activity">See all</DeskLink>
          </div>
          {events.length === 0 ? (
            <p className="dash-none">PayPal calls and webhooks are logged here as they happen.</p>
          ) : (
            <ol className="log log-compact">
              {events.map((e) => (
                <EventRow key={e.id} event={e} compact />
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
