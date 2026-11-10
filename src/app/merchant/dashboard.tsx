"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef } from "ag-grid-community";
import type { Metrics } from "@/lib/metrics";
import type { MerchantPolicy } from "@/lib/policy";
import type { AuditEvent, RetentionSession, StoreShape, Subscriber } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#3b2416",
  backgroundColor: "#fffdf9",
  foregroundColor: "#2a1d14",
  headerBackgroundColor: "#f2e6d6",
  borderColor: "#e8dccb",
  fontFamily: "inherit",
  rowHoverColor: "#f7efe4",
});

const REASON_LABEL: Record<string, string> = {
  too_expensive: "Too expensive",
  not_using_enough: "Not using enough",
  temporary_break: "Temporary break / travel",
  product_issue: "Product issue",
  switching_competitor: "Switching to competitor",
  moving_or_life_change: "Moving / life change",
  other: "Other",
};

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
  const { metrics: m } = props;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function act(label: string, payload: unknown) {
    setBusy(label);
    setMsg(null);
    try {
      await admin(payload);
      setMsg(`${label}: done`);
      router.refresh();
    } catch (e) {
      setMsg(`${label}: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(null);
    }
  }

  const kpis = [
    { label: "Active subscribers", value: m.activeSubscribers, sub: `${m.pausedSubscribers} paused · ${m.cancelledSubscribers} cancelled` },
    { label: "MRR (PayPal)", value: `$${m.mrrUsd.toFixed(2)}`, sub: "active subscriptions" },
    { label: "Saves", value: m.saved, sub: `${m.cancelled} cancelled · ${m.open} open`, accent: true },
    { label: "Save rate", value: m.saveRatePct === null ? "–" : `${m.saveRatePct}%`, sub: "saved ÷ decided" },
    { label: "MRR kept", value: `$${m.mrrSavedUsd.toFixed(2)}`, sub: "per month, from saves", accent: true },
    { label: "Agent conversations", value: m.agentSessions, sub: "AI agents acting for customers" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Brewbox · merchant view</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl">Retention desk</h1>
        </div>
        <div className="flex gap-2">
          {!props.catalog.productId && (
            <button className="btn btn-paypal" disabled={!!busy} onClick={() => act("Create PayPal catalog", { action: "setup" })}>
              Set up PayPal plans
            </button>
          )}
          <button className="btn btn-ghost" disabled={!!busy} onClick={() => act("Sync with PayPal", { action: "sync-all" })}>
            {busy === "Sync with PayPal" ? "Syncing…" : "↻ Sync with PayPal"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}

      <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="text-xs text-muted">{k.label}</div>
            <div className={`mt-1 text-2xl font-[family-name:var(--font-display)] ${k.accent ? "text-save" : ""}`}>{k.value}</div>
            <div className="text-[11px] text-muted mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-1 border-b border-line text-sm">
        {(
          [
            ["overview", "Overview"],
            ["subscribers", `Subscribers (${props.subscribers.length})`],
            ["conversations", `Conversations (${props.sessions.length})`],
            ["paypal", "PayPal activity"],
            ["policy", "Guardrails"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 -mb-px border-b-2 ${tab === id ? "border-espresso font-semibold" : "border-transparent text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "overview" && <Overview m={m} />}
        {tab === "subscribers" && <SubscriberGrid rows={props.subscribers} onAct={act} busy={!!busy} />}
        {tab === "conversations" && <Conversations sessions={props.sessions} subscribers={props.subscribers} />}
        {tab === "paypal" && <Activity events={props.events} />}
        {tab === "policy" && <PolicyEditor initial={props.policy} />}
      </div>
    </div>
  );
}

function Overview({ m }: { m: Metrics }) {
  const reasons = Object.entries(m.reasons).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...reasons.map(([, v]) => v));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <h3 className="font-semibold">Why people try to leave</h3>
        {reasons.length === 0 && <p className="text-sm text-muted mt-3">No conversations yet.</p>}
        <div className="mt-4 space-y-3">
          {reasons.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-sm">
                <span>{REASON_LABEL[k] ?? k}</span>
                <span className="text-muted">{v}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-crema">
                <div className="h-2 rounded-full bg-espresso" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold">Offers: proposed vs accepted</h3>
        {Object.keys(m.offersByType).length === 0 && <p className="text-sm text-muted mt-3">No offers yet.</p>}
        <table className="mt-3 w-full text-sm">
          <tbody>
            {Object.entries(m.offersByType).map(([type, v]) => (
              <tr key={type} className="border-t border-line">
                <td className="py-2 capitalize">{type}</td>
                <td className="py-2 text-muted">{v.proposed} proposed</td>
                <td className="py-2 text-save font-medium">{v.accepted} accepted</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-muted">
          Every accepted offer was executed and read back from PayPal Subscriptions (suspend, revise or price patch).
        </p>
      </div>
    </div>
  );
}

function SubscriberGrid({
  rows,
  onAct,
  busy,
}: {
  rows: Subscriber[];
  onAct: (label: string, payload: unknown) => void;
  busy: boolean;
}) {
  const cols = useMemo<ColDef<Subscriber>[]>(
    () => [
      { field: "name", headerName: "Subscriber", flex: 1.2, filter: true },
      { field: "email", flex: 1.3, filter: true },
      { field: "tier", headerName: "Plan", width: 110, filter: true, valueFormatter: (p) => String(p.value).replace(/^./, (c) => c.toUpperCase()) },
      {
        field: "status",
        width: 140,
        filter: true,
        cellRenderer: (p: { value: string }) => {
          const color =
            p.value === "ACTIVE" ? "#1f7a4d" : p.value === "SUSPENDED" ? "#b45309" : p.value === "CANCELLED" ? "#b42318" : "#003087";
          return <span style={{ color, fontWeight: 600 }}>{p.value}</span>;
        },
      },
      { field: "priceUsd", headerName: "Price / mo", width: 120, valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      {
        headerName: "Retention state",
        flex: 1.2,
        valueGetter: (p) =>
          p.data?.resumeAt
            ? `Paused until ${new Date(p.data.resumeAt).toLocaleDateString()}`
            : p.data?.discountUntil
              ? `Discount until ${new Date(p.data.discountUntil).toLocaleDateString()}`
              : p.data?.pendingRevise
                ? `Awaiting PayPal approval → ${p.data.pendingRevise.toTier}`
                : "",
      },
      { field: "id", headerName: "PayPal subscription", width: 170, cellClass: "font-mono text-xs" },
      {
        field: "createdAt",
        headerName: "Since",
        width: 120,
        sort: "desc",
        valueFormatter: (p) => new Date(p.value).toLocaleDateString(),
      },
      {
        headerName: "",
        width: 150,
        sortable: false,
        cellRenderer: (p: { data: Subscriber }) => (
          <span className="flex gap-2 text-xs">
            <a className="underline" href={`/account/${p.data.id}`}>portal</a>
            {p.data.status === "SUSPENDED" && (
              <button className="underline" disabled={busy} onClick={() => onAct("Resume", { action: "resume", id: p.data.id })}>
                resume
              </button>
            )}
          </span>
        ),
      },
    ],
    [busy, onAct],
  );
  return (
    <div style={{ height: 520 }}>
      <AgGridReact<Subscriber>
        theme={gridTheme}
        rowData={rows}
        columnDefs={cols}
        defaultColDef={{ sortable: true, resizable: true }}
        pagination
        paginationPageSize={20}
        getRowId={(p) => p.data.id}
      />
    </div>
  );
}

function Conversations({ sessions, subscribers }: { sessions: RetentionSession[]; subscribers: Subscriber[] }) {
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);
  const name = (id: string) => subscribers.find((s) => s.id === id)?.name ?? id;
  if (sessions.length === 0) return <p className="text-sm text-muted">No conversations yet.</p>;
  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <div key={s.id} className="card">
          <button className="w-full px-4 py-3 flex flex-wrap items-center gap-3 text-left text-sm" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
            <span
              className={`pill ${
                s.outcome === "saved" ? "bg-save-soft text-save" : s.outcome === "cancelled" ? "bg-red-50 text-danger" : "bg-crema"
              }`}
            >
              {s.outcome}
            </span>
            <b>{name(s.subscriptionId)}</b>
            <span className="text-muted">{REASON_LABEL[s.reason ?? ""] ?? "-"}</span>
            {s.channel === "agent" && <span className="pill bg-blue-50 text-paypal">🤖 via AI agent</span>}
            <span className="ml-auto text-xs text-muted">{new Date(s.startedAt).toLocaleString()}</span>
          </button>
          {openId === s.id && (
            <div className="border-t border-line px-4 py-3 grid gap-4 md:grid-cols-[1.4fr_1fr] text-sm">
              <div className="space-y-2">
                {s.messages.map((msg, i) => (
                  <div key={i}>
                    <span className="text-xs font-semibold text-muted uppercase mr-2">
                      {msg.role === "subscriber" ? (s.channel === "agent" ? "Customer's agent" : "Customer") : msg.role === "keepalive" ? "KeepAlive" : "PayPal"}
                    </span>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted uppercase">Offers</div>
                  {s.offers.length === 0 && <div className="text-muted">none</div>}
                  {s.offers.map((o) => (
                    <div key={o.id} className="mt-1">
                      <b>{o.label}</b> · {o.status.replaceAll("_", " ")}
                      {o.guardrailNotes.length > 0 && <div className="text-xs text-warn">guardrail: {o.guardrailNotes.join("; ")}</div>}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted uppercase">AI rationale (merchant-only)</div>
                  <ul className="mt-1 list-disc pl-4 text-muted space-y-1">
                    {s.rationale.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Activity({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <div className="card divide-y divide-line">
      {events.map((e) => (
        <div key={e.id} className="px-4 py-2 text-sm flex flex-wrap gap-3 items-baseline">
          <span className="text-xs text-muted w-40 shrink-0">{new Date(e.at).toLocaleString()}</span>
          <span className={`pill ${e.type.startsWith("paypal") ? "bg-blue-50 text-paypal" : e.type.startsWith("guardrail") ? "bg-amber-50 text-warn" : "bg-crema"}`}>
            {e.type}
          </span>
          <span className="flex-1">{e.summary}</span>
          {typeof e.detail === "object" && e.detail !== null && "debugId" in e.detail && (e.detail as { debugId?: string }).debugId && (
            <span className="font-mono text-[11px] text-muted">debug_id {(e.detail as { debugId: string }).debugId}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PolicyEditor({ initial }: { initial: MerchantPolicy }) {
  const [p, setP] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const num = (k: keyof MerchantPolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value) });
  const bool = (k: keyof MerchantPolicy) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: e.target.checked });
  async function save() {
    setMsg(null);
    const res = await fetch("/api/policy", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token() },
      body: JSON.stringify(p),
    });
    const data = await res.json();
    setMsg(res.ok ? "Saved. The retention agent uses this policy from the next message on." : data.error);
  }
  return (
    <div className="card p-5 grid gap-6 md:grid-cols-2">
      <div className="space-y-4 text-sm">
        <h3 className="font-semibold">Hard limits (enforced in code, not by the AI)</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={p.allowPause} onChange={bool("allowPause")} /> Allow pauses, up to
          <input className="input w-16" type="number" value={p.maxPauseMonths} onChange={num("maxPauseMonths")} /> months
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={p.allowDowngrade} onChange={bool("allowDowngrade")} /> Allow downgrades (PayPal re-consent)
        </label>
        <label className="flex flex-wrap items-center gap-2">
          <input type="checkbox" checked={p.allowDiscount} onChange={bool("allowDiscount")} /> Allow discounts up to
          <input className="input w-16" type="number" value={p.maxDiscountPct} onChange={num("maxDiscountPct")} />% for up to
          <input className="input w-16" type="number" value={p.maxDiscountMonths} onChange={num("maxDiscountMonths")} /> months
        </label>
        <label className="flex items-center gap-2">
          Discounts only after
          <input className="input w-20" type="number" value={p.minTenureDaysForDiscount} onChange={num("minTenureDaysForDiscount")} /> days of
          tenure
        </label>
        <label className="flex items-center gap-2">
          Monthly discount budget $
          <input className="input w-24" type="number" value={p.monthlyDiscountBudgetUsd} onChange={num("monthlyDiscountBudgetUsd")} />
        </label>
        <label className="flex items-center gap-2">
          Max offers per conversation
          <input className="input w-16" type="number" value={p.maxOffersPerSession} onChange={num("maxOffersPerSession")} />
        </label>
      </div>
      <div className="space-y-4 text-sm">
        <h3 className="font-semibold">Guidance for the AI</h3>
        <label className="block">
          Brand voice
          <textarea className="input mt-1 h-20" value={p.brandVoice} onChange={(e) => setP({ ...p, brandVoice: e.target.value })} />
        </label>
        <label className="block">
          Merchant notes
          <textarea className="input mt-1 h-28" value={p.merchantNotes} onChange={(e) => setP({ ...p, merchantNotes: e.target.value })} />
        </label>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={save}>
            Save guardrails
          </button>
          {msg && <span className="text-muted">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
