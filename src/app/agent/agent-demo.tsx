"use client";

import { useEffect, useRef, useState } from "react";

type Entry =
  | { kind: "agent"; text: string }
  | { kind: "tool"; name: string; input: Record<string, unknown> }
  | { kind: "merchant"; text: string; offers?: { offer_id: string; label: string; status: string }[] }
  | { kind: "human"; text: string }
  | { kind: "paypal"; text: string; approveUrl?: string }
  | { kind: "error"; text: string };

interface Run {
  id: string;
  status: "running" | "waiting_human" | "done" | "error";
  transcript: Entry[];
  pendingQuestion?: { question: string; offerId?: string; offerLabel?: string };
  summary?: string;
}

const PRESETS = [
  {
    label: "Travelling",
    brief:
      "Cancel my Brewbox coffee subscription. I'm going backpacking in South America for two months and won't be home. If they let me pause it instead, I'd consider that.",
  },
  {
    label: "Too much coffee",
    brief:
      "Cancel Brewbox. Honestly I have bags piling up; I only drink coffee on weekends now. Don't sign me up for anything more expensive.",
  },
  {
    label: "Firm cancel",
    brief: "Cancel my Brewbox subscription. I've switched to tea for good. Don't accept any offers, just cancel.",
  },
];

const toolLabel: Record<string, string> = {
  request_cancellation: "request_cancellation",
  reply_to_merchant: "reply_to_merchant",
  ask_my_human: "ask_my_human",
  accept_offer: "accept_offer",
  decline_offer: "decline_offer",
  cancel_subscription: "cancel_subscription",
};

export function AgentDemo({
  subscribers,
  mcpUrl,
}: {
  subscribers: { id: string; label: string; email: string }[];
  mcpUrl: string;
}) {
  const [subId, setSubId] = useState(subscribers[0]?.id ?? "");
  const [brief, setBrief] = useState(PRESETS[0].brief);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [run, busy]);

  async function call(url: string, payload: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setRun(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const start = () => {
    setRun({ id: "", status: "running", transcript: [{ kind: "human", text: brief }] });
    call("/api/agent-demo", { subscriptionId: subId, brief });
  };
  const answer = (approve: boolean | null) => {
    const c = comment;
    setComment("");
    call(`/api/agent-demo/${run!.id}`, { answer: c, approve });
  };

  const sub = subscribers.find((s) => s.id === subId);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold">1 · The human&apos;s brief</h2>
          {subscribers.length === 0 ? (
            <p className="text-sm text-muted">
              No ACTIVE subscriptions yet. <a className="underline" href="/shop">Subscribe in the shop</a> first.
            </p>
          ) : (
            <select className="input" value={subId} onChange={(e) => setSubId(e.target.value)} disabled={busy}>
              {subscribers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} className="pill bg-crema hover:bg-line" onClick={() => setBrief(p.brief)} disabled={busy}>
                {p.label}
              </button>
            ))}
          </div>
          <textarea className="input h-32 text-sm" value={brief} onChange={(e) => setBrief(e.target.value)} disabled={busy} />
          <button className="btn btn-primary w-full" disabled={busy || !subId || !brief.trim()} onClick={start}>
            {busy && !run?.id ? "Agents negotiating…" : "Send my agent"}
          </button>
        </div>
        <details className="card p-5 text-sm">
          <summary className="font-semibold cursor-pointer">Connect your own agent (MCP)</summary>
          <p className="mt-2 text-muted">Any MCP client can talk to this merchant. For Claude Desktop:</p>
          <pre className="mt-2 rounded-lg bg-espresso text-crema p-3 text-[11px] overflow-x-auto">{`{
  "mcpServers": {
    "brewbox-keepalive": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${mcpUrl}"]
    }
  }
}`}</pre>
          {sub && (
            <p className="mt-2 text-muted">
              Then ask: “Cancel my Brewbox subscription <span className="font-mono">{sub.id}</span> (email {sub.email}).”
            </p>
          )}
        </details>
      </div>

      <div className="card flex flex-col min-h-[560px]">
        <div className="grid grid-cols-2 border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
          <div className="px-5 py-3">🧑 Subscriber&apos;s agent (Claude)</div>
          <div className="px-5 py-3 text-right">Brewbox · KeepAlive (Claude) 🏪</div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!run && <p className="text-sm text-muted text-center mt-24">Pick a brief and send the agent.</p>}
          {run?.transcript.map((e, i) => (
            <TranscriptRow key={i} e={e} />
          ))}
          {busy && (
            <div className="text-sm text-muted flex items-center gap-2">
              <span className="typing">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </span>
              agents talking…
            </div>
          )}
          {run?.status === "waiting_human" && run.pendingQuestion && !busy && (
            <div className="rise rounded-xl border-2 border-espresso bg-paper p-4">
              <div className="text-xs uppercase tracking-wider text-muted">Your agent needs you</div>
              <p className="mt-1 font-medium">{run.pendingQuestion.question}</p>
              {run.pendingQuestion.offerLabel && (
                <p className="mt-1 text-sm">
                  Offer: <b>{run.pendingQuestion.offerLabel}</b>
                </p>
              )}
              <input
                className="input mt-3 text-sm"
                placeholder="Optional note for your agent"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                {run.pendingQuestion.offerId ? (
                  <>
                    <button className="btn btn-save flex-1" onClick={() => answer(true)}>
                      Approve
                    </button>
                    <button className="btn btn-ghost flex-1" onClick={() => answer(false)}>
                      Decline
                    </button>
                  </>
                ) : (
                  <button className="btn btn-primary flex-1" onClick={() => answer(null)} disabled={!comment.trim()}>
                    Reply to my agent
                  </button>
                )}
              </div>
            </div>
          )}
          {run?.status === "done" && run.summary && (
            <div className="rise rounded-xl bg-save-soft text-save p-4 font-medium">Agent finished: {run.summary}</div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <div ref={bottom} />
        </div>
      </div>
    </div>
  );
}

function TranscriptRow({ e }: { e: Entry }) {
  switch (e.kind) {
    case "human":
      return (
        <div className="rise text-xs text-muted border-l-2 border-line pl-3">
          <b>Human → agent:</b> {e.text}
        </div>
      );
    case "agent":
      return (
        <div className="rise max-w-[70%] rounded-2xl bg-espresso text-white px-4 py-2 text-sm">{e.text}</div>
      );
    case "tool":
      return (
        <div className="rise max-w-[70%] font-mono text-[11px] text-muted">
          ⚙ {toolLabel[e.name] ?? e.name}(
          {Object.entries(e.input)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 80)}`)
            .join(", ")}
          )
        </div>
      );
    case "merchant":
      return (
        <div className="rise ml-auto max-w-[70%] space-y-2">
          <div className="rounded-2xl bg-crema px-4 py-2 text-sm">{e.text}</div>
          {e.offers?.map((o) => (
            <div key={o.offer_id} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
              <span className="font-mono text-[11px] text-muted mr-2">offer {o.offer_id}</span>
              <b>{o.label}</b>
            </div>
          ))}
        </div>
      );
    case "paypal":
      return (
        <div className="rise mx-auto max-w-[80%] rounded-lg bg-blue-50 text-paypal px-3 py-2 text-sm text-center">
          <b>PayPal</b> · {e.text}
          {e.approveUrl && (
            <a href={e.approveUrl} target="_blank" className="btn btn-paypal mt-2 w-full">
              Human: confirm in PayPal →
            </a>
          )}
        </div>
      );
    case "error":
      return <div className="rise text-sm text-danger">⚠ {e.text}</div>;
  }
}
