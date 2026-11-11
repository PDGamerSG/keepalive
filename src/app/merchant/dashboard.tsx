"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import { OrreryView } from "@/components/orrery/orrery-view";
import { STATE_LABEL, STATE_TONE, bodyState, toOrbitBody } from "@/components/orrery/states";
import { Slider } from "@/components/ui/slider";
import type { Metrics } from "@/lib/metrics";
import type { MerchantPolicy } from "@/lib/policy";
import type { AuditEvent, RetentionSession, StoreShape, Subscriber } from "@/lib/types";
import "./dashboard.css";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  browserColorScheme: "dark",
  accentColor: "#b8a4ff",
  backgroundColor: "#0c1233",
  chromeBackgroundColor: "#0e1540",
  foregroundColor: "#e8ebff",
  headerBackgroundColor: "#111947",
  headerTextColor: "#a9b0da",
  headerFontWeight: 600,
  borderColor: "rgba(170, 182, 255, 0.13)",
  oddRowBackgroundColor: "rgba(170, 182, 255, 0.025)",
  rowHoverColor: "rgba(184, 164, 255, 0.08)",
  inputBackgroundColor: "#070b24",
  fontFamily: "inherit",
  fontSize: 13,
  wrapperBorderRadius: 16,
});

const REASON_LABEL: Record<string, string> = {
  too_expensive: "Too expensive",
  not_using_enough: "Not using enough",
  temporary_break: "Temporary break or travel",
  product_issue: "Product issue",
  switching_competitor: "Switching to a competitor",
  moving_or_life_change: "Moving or life change",
  other: "Other",
};

const OUTCOME_TONE: Record<string, string> = { saved: "orbit", cancelled: "exit", open: "core", abandoned: "dim" };
const OUTCOME_LABEL: Record<string, string> = { saved: "Saved", cancelled: "Cancelled", open: "Open", abandoned: "Abandoned" };
const PLAN = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

type Tab = "overview" | "subscribers" | "conversations" | "paypal" | "policy";

function token() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("token") ?? "";
}

async function admin(payload: unknown) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token() },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function Dashboard(props: {
  metrics: Metrics;
  subscribers: Subscriber[];
  sessions: RetentionSession[];
  events: AuditEvent[];
  policy: MerchantPolicy;
  catalog: StoreShape["config"];
}) {
  const { metrics: m, subscribers } = props;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function act(label: string, done: string, payload: unknown) {
    setBusy(label);
    setMsg(null);
    try {
      await admin(payload);
      setMsg({ text: done, ok: true });
      router.refresh();
    } catch (e) {
      setMsg({ text: `${label} failed: ${e instanceof Error ? e.message : e}`, ok: false });
    } finally {
      setBusy(null);
    }
  }

  const bodies = useMemo(() => subscribers.map(toOrbitBody), [subscribers]);
  const byId = useMemo(() => new Map(subscribers.map((s) => [s.id, s])), [subscribers]);
  const counts = useMemo(() => {
    const c = { active: 0, offer: 0, pending: 0, paused: 0, new: 0, cancelled: 0 };
    for (const b of bodies) c[b.state]++;
    return c;
  }, [bodies]);

  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["subscribers", `Subscribers ${subscribers.length}`],
    ["conversations", `Conversations ${props.sessions.length}`],
    ["paypal", "PayPal activity"],
    ["policy", "Guardrails"],
  ];

  return (
    <div className="desk">
      <header className="desk-head">
        <div>
          <p className="page-kicker">Brewbox, on PayPal Subscriptions</p>
          <h1 className="display page-title">Retention desk</h1>
        </div>
        <div className="desk-actions">
          {!props.catalog.productId && (
            <button
              className="btn btn-paypal"
              disabled={!!busy}
              onClick={() => act("Set up PayPal plans", "PayPal product and three plans created.", { action: "setup" })}
            >
              {busy === "Set up PayPal plans" ? "Setting up…" : "Set up PayPal plans"}
            </button>
          )}
          <button
            className="btn btn-line"
            disabled={!!busy}
            onClick={() => act("Sync with PayPal", "Every subscription re-read from PayPal.", { action: "sync-all" })}
          >
            {busy === "Sync with PayPal" ? "Syncing…" : "Sync with PayPal"}
          </button>
        </div>
      </header>
      {msg && (
        <p className={`desk-msg ${msg.ok ? "is-ok" : "is-error"}`} role="status">
          {msg.text}
        </p>
      )}

      <section className="desk-hero" aria-label="Subscribers and key numbers">
        <div className="panel desk-orrery">
          <OrreryView
            className="desk-orrery-view"
            label={`Orrery of ${subscribers.length} subscribers, coloured by state`}
            bodies={bodies}
            interactive
            zoom={1.22}
            onPick={(id) => router.push(`/account/${id}`)}
            tooltip={(id) => {
              const s = byId.get(id);
              if (!s) return null;
              const state = bodyState(s);
              return (
                <div className="desk-tip">
                  <strong>{s.name}</strong>
                  <span>
                    {PLAN(s.tier)}, ${s.priceUsd.toFixed(2)} a month
                  </span>
                  <span className={`state state-${STATE_TONE[state]}`}>{STATE_LABEL[state]}</span>
                  <span className="desk-tip-hint">Click to open their account</span>
                </div>
              );
            }}
          />
          <ul className="desk-legend" aria-label="Legend">
            <li className="state state-orbit">Active {counts.active}</li>
            <li className="state state-stasis">Paused {counts.paused}</li>
            <li className="state state-offer">Discount {counts.offer}</li>
            <li className="state state-core">Switching {counts.pending}</li>
            <li className="state state-exit">Cancelled {counts.cancelled}</li>
          </ul>
          <p className="desk-rings">Rings, inside out: Lite $12, Standard $22, Premium $36</p>
          {subscribers.length === 0 && (
            <div className="desk-empty">
              <h2 className="display display-tight">No subscribers in orbit yet</h2>
              <p>
                Subscribe in the Brewbox shop with a PayPal sandbox buyer. Each subscription appears here as a body on its
                plan&apos;s ring.
              </p>
              <a className="btn btn-solid btn-sm" href="/shop">
                Open the Brewbox shop
              </a>
            </div>
          )}
        </div>

        <dl className="panel desk-readout">
          <div className="desk-figure desk-figure-lead">
            <dt>Monthly revenue on PayPal</dt>
            <dd className="num">${m.mrrUsd.toFixed(2)}</dd>
            <span>From {m.activeSubscribers} active subscriptions</span>
          </div>
          <div className="desk-figure">
            <dt>Kept by saves</dt>
            <dd className="num state-orbit">${m.mrrSavedUsd.toFixed(2)}</dd>
            <span>A month, that would have cancelled</span>
          </div>
          <div className="desk-figure">
            <dt>Save rate</dt>
            <dd className="num">{m.saveRatePct === null ? "No decisions yet" : `${m.saveRatePct}%`}</dd>
            <span>
              {m.saved} saved, {m.cancelled} cancelled, {m.open} open
            </span>
          </div>
          <div className="desk-figure">
            <dt>Subscribers</dt>
            <dd className="num">{m.activeSubscribers}</dd>
            <span>
              Active now, with {m.pausedSubscribers} paused and {m.cancelledSubscribers} cancelled
            </span>
          </div>
          <div className="desk-figure">
            <dt>Conversations with AI agents</dt>
            <dd className="num state-core">{m.agentSessions}</dd>
            <span>Customers who sent their own agent</span>
          </div>
        </dl>
      </section>

      <div className="desk-tabs" role="tablist" aria-label="Desk sections">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="desk-body" role="tabpanel">
        {tab === "overview" && <Overview m={m} />}
        {tab === "subscribers" && (
          <SubscriberGrid
            rows={subscribers}
            busy={!!busy}
            onResume={(id) => act("Resume", "Resumed on PayPal.", { action: "resume", id })}
          />
        )}
        {tab === "conversations" && <Conversations sessions={props.sessions} subscribers={subscribers} />}
        {tab === "paypal" && <Activity events={props.events} />}
        {tab === "policy" && <PolicyEditor initial={props.policy} />}
      </div>
    </div>
  );
}

function Overview({ m }: { m: Metrics }) {
  const reasons = Object.entries(m.reasons).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...reasons.map(([, v]) => v));
  const offers = Object.entries(m.offersByType);
  const offerMax = Math.max(1, ...offers.map(([, v]) => v.proposed));
  return (
    <div className="desk-overview">
      <section className="panel desk-card">
        <h3>Why people try to leave</h3>
        {reasons.length === 0 ? (
          <p className="desk-none">Reasons appear here after the first cancellation conversation.</p>
        ) : (
          <ul className="desk-bars">
            {reasons.map(([k, v]) => (
              <li key={k}>
                <span>{REASON_LABEL[k] ?? k}</span>
                <span className="num">{v}</span>
                <i style={{ width: `${(v / max) * 100}%` }} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel desk-card">
        <h3>Offers made and taken</h3>
        {offers.length === 0 ? (
          <p className="desk-none">Offers appear here once the AI has proposed one.</p>
        ) : (
          <ul className="desk-pairs">
            {offers.map(([type, v]) => (
              <li key={type}>
                <span className="desk-pairs-name">{PLAN(type)}</span>
                <span className="desk-pairs-bars">
                  <i className="is-made" style={{ width: `${(v.proposed / offerMax) * 100}%` }} />
                  <i className="is-taken" style={{ width: `${(v.accepted / offerMax) * 100}%` }} />
                </span>
                <span className="desk-pairs-n">
                  {v.accepted} of {v.proposed} taken
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="desk-note">
          Every accepted offer was carried out on PayPal Subscriptions (suspend, revise or a price change) and read back
          before it counted.
        </p>
      </section>
    </div>
  );
}

function SubscriberGrid({ rows, busy, onResume }: { rows: Subscriber[]; busy: boolean; onResume: (id: string) => void }) {
  const cols = useMemo<ColDef<Subscriber>[]>(
    () => [
      { field: "name", headerName: "Subscriber", flex: 1.2, filter: true },
      { field: "email", flex: 1.3, filter: true },
      { field: "tier", headerName: "Plan", width: 110, filter: true, valueFormatter: (p) => PLAN(String(p.value)) },
      {
        headerName: "State",
        width: 190,
        filter: true,
        valueGetter: (p) => (p.data ? STATE_LABEL[bodyState(p.data)] : ""),
        cellRenderer: (p: { data?: Subscriber; value: string }) =>
          p.data ? <span className={`state state-${STATE_TONE[bodyState(p.data)]}`}>{p.value}</span> : null,
      },
      { field: "priceUsd", headerName: "Price a month", width: 130, valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      {
        headerName: "Retention",
        flex: 1.2,
        valueGetter: (p) =>
          p.data?.resumeAt
            ? `Paused until ${new Date(p.data.resumeAt).toLocaleDateString()}`
            : p.data?.discountUntil
              ? `Discount until ${new Date(p.data.discountUntil).toLocaleDateString()}`
              : p.data?.pendingRevise
                ? `Waiting for PayPal approval to switch to ${PLAN(p.data.pendingRevise.toTier)}`
                : "",
      },
      { field: "id", headerName: "PayPal subscription", width: 170, cellClass: "code" },
      {
        field: "createdAt",
        headerName: "Since",
        width: 120,
        sort: "desc",
        valueFormatter: (p) => new Date(p.value).toLocaleDateString(),
      },
      {
        headerName: "",
        width: 170,
        sortable: false,
        cellRenderer: (p: { data: Subscriber }) => (
          <span className="desk-row-actions">
            <a href={`/account/${p.data.id}`}>Account</a>
            {p.data.status === "SUSPENDED" && (
              <button disabled={busy} onClick={() => onResume(p.data.id)}>
                Resume
              </button>
            )}
          </span>
        ),
      },
    ],
    [busy, onResume],
  );
  return (
    <div className="desk-grid">
      <AgGridReact<Subscriber>
        theme={gridTheme}
        rowData={rows}
        columnDefs={cols}
        defaultColDef={{ sortable: true, resizable: true }}
        pagination
        paginationPageSize={20}
        getRowId={(p) => p.data.id}
        overlayNoRowsTemplate="No subscribers yet. Subscribe in the Brewbox shop to add one."
      />
    </div>
  );
}

function Conversations({ sessions, subscribers }: { sessions: RetentionSession[]; subscribers: Subscriber[] }) {
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);
  const name = (id: string) => subscribers.find((s) => s.id === id)?.name ?? id;
  if (sessions.length === 0) {
    return <p className="desk-none">Conversations appear here when a subscriber, or their agent, asks to cancel.</p>;
  }
  return (
    <ul className="desk-convos">
      {sessions.map((s) => {
        const open = openId === s.id;
        return (
          <li key={s.id} className="panel-flat">
            <button className="desk-convo-row" aria-expanded={open} onClick={() => setOpenId(open ? null : s.id)}>
              <span className={`state state-${OUTCOME_TONE[s.outcome] ?? "dim"}`}>{OUTCOME_LABEL[s.outcome] ?? s.outcome}</span>
              <strong>{name(s.subscriptionId)}</strong>
              <span className="desk-convo-reason">{REASON_LABEL[s.reason ?? ""] ?? "Reason not given yet"}</span>
              {s.channel === "agent" && <span className="desk-chip">Through their AI agent</span>}
              <time>{new Date(s.startedAt).toLocaleString()}</time>
            </button>
            {open && (
              <div className="desk-convo-body">
                <ol className="desk-transcript">
                  {s.messages.map((msg, i) => (
                    <li key={i} data-role={msg.role}>
                      <b>
                        {msg.role === "subscriber"
                          ? s.channel === "agent"
                            ? "Customer's agent"
                            : "Customer"
                          : msg.role === "keepalive"
                            ? "KeepAlive"
                            : "PayPal"}
                      </b>
                      <span>{msg.text}</span>
                    </li>
                  ))}
                </ol>
                <div className="desk-convo-side">
                  <h4>Offers</h4>
                  {s.offers.length === 0 && <p className="desk-none">None made.</p>}
                  {s.offers.map((o) => (
                    <div key={o.id} className="desk-offer">
                      <strong>{o.label}</strong>
                      <span>{o.status.replaceAll("_", " ")}</span>
                      {o.guardrailNotes.length > 0 && <em>Guardrail: {o.guardrailNotes.join("; ")}</em>}
                    </div>
                  ))}
                  <h4>The AI&apos;s reasoning (only you see this)</h4>
                  <ul className="desk-rationale">
                    {s.rationale.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Activity({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="desk-none">PayPal calls and webhooks are logged here as they happen.</p>;
  return (
    <ol className="panel desk-log">
      {events.map((e) => {
        const tone = e.type.startsWith("paypal") ? "paypal" : e.type.startsWith("guardrail") ? "offer" : "core";
        const debugId =
          typeof e.detail === "object" && e.detail !== null && "debugId" in e.detail ? (e.detail as { debugId?: string }).debugId : undefined;
        return (
          <li key={e.id}>
            <time>{new Date(e.at).toLocaleString()}</time>
            <span className={`state state-${tone}`}>{e.type}</span>
            <span className="desk-log-text">{e.summary}</span>
            {debugId && <span className="code desk-log-id">debug_id {debugId}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function PolicyEditor({ initial }: { initial: MerchantPolicy }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MerchantPolicy>(k: K) => (v: MerchantPolicy[K]) => setP({ ...p, [k]: v });
  async function save() {
    setMsg(null);
    setSaving(true);
    const res = await fetch("/api/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token() },
      body: JSON.stringify(p),
    });
    const data = await res.json();
    setSaving(false);
    setMsg(res.ok ? { text: "Guardrails saved. The retention agent uses them from its next message.", ok: true } : { text: data.error, ok: false });
  }
  return (
    <div className="desk-policy">
      <section className="panel desk-card">
        <h3>Hard limits</h3>
        <p className="desk-note">Enforced in code before anything reaches PayPal. The AI cannot talk its way past them.</p>
        <div className="desk-limits">
          <div className="desk-limit">
            <Toggle label="Allow pauses" checked={p.allowPause} onChange={set("allowPause")} />
            <Slider label="Longest pause" value={p.maxPauseMonths} min={1} max={6} unit=" months" disabled={!p.allowPause} onChange={set("maxPauseMonths")} />
          </div>
          <div className="desk-limit">
            <Toggle label="Allow plan switches" checked={p.allowDowngrade} onChange={set("allowDowngrade")} />
            <p className="desk-note">The subscriber always approves a plan change again inside PayPal.</p>
          </div>
          <div className="desk-limit">
            <Toggle label="Allow discounts" checked={p.allowDiscount} onChange={set("allowDiscount")} />
            <Slider label="Biggest discount" value={p.maxDiscountPct} min={5} max={75} step={5} unit="%" disabled={!p.allowDiscount} onChange={set("maxDiscountPct")} />
            <Slider label="For up to" value={p.maxDiscountMonths} min={1} max={12} unit=" months" disabled={!p.allowDiscount} onChange={set("maxDiscountMonths")} />
            <Slider
              label="Only after"
              value={p.minTenureDaysForDiscount}
              min={0}
              max={365}
              step={5}
              unit=" days"
              disabled={!p.allowDiscount}
              onChange={set("minTenureDaysForDiscount")}
            />
            <label className="desk-field">
              <span>Monthly discount budget, in dollars</span>
              <input
                className="field"
                type="number"
                min={0}
                value={p.monthlyDiscountBudgetUsd}
                disabled={!p.allowDiscount}
                onChange={(e) => set("monthlyDiscountBudgetUsd")(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="desk-limit">
            <Slider label="Offers per conversation" value={p.maxOffersPerSession} min={0} max={3} unit="" onChange={set("maxOffersPerSession")} />
          </div>
        </div>
      </section>
      <section className="panel desk-card">
        <h3>Guidance for the AI</h3>
        <p className="desk-note">How it should sound and what you prefer. Advice, not limits.</p>
        <label className="desk-field">
          <span>Brand voice</span>
          <textarea className="field" rows={3} value={p.brandVoice} onChange={(e) => set("brandVoice")(e.target.value)} />
        </label>
        <label className="desk-field">
          <span>Notes for the retention agent</span>
          <textarea className="field" rows={6} value={p.merchantNotes} onChange={(e) => set("merchantNotes")(e.target.value)} />
        </label>
        <div className="desk-save">
          <button className="btn btn-solid" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save guardrails"}
          </button>
          {msg && (
            <span className={msg.ok ? "state state-orbit" : "state state-exit"} role="status">
              {msg.text}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}
