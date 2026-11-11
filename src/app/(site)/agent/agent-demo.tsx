"use client";

import { useEffect, useRef, useState } from "react";
import type { Tone } from "@/lib/subscriber-state";

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

/** Where the negotiation stands, shown between the two parties. */
function standing(run: Run | null, busy: boolean): [Tone, string] {
  if (busy) return ["pending", "Agents talking"];
  if (!run) return ["dim", "Waiting for a brief"];
  if (run.status === "waiting_human") return ["offer", "Waiting for you"];
  if (run.status === "error") return ["gone", "Stopped"];
  const called = (name: string) => run.transcript.some((e) => e.kind === "tool" && e.name === name);
  if (called("cancel_subscription")) return ["gone", "Cancelled on PayPal"];
  if (called("accept_offer")) return ["ok", "Offer accepted"];
  return run.status === "done" ? ["dim", "Finished"] : ["pending", "Agents talking"];
}

export function AgentDemo({ subscribers, mcpUrl }: { subscribers: { id: string; label: string; email: string }[]; mcpUrl: string }) {
  const [subId, setSubId] = useState(subscribers[0]?.id ?? "");
  const [brief, setBrief] = useState(PRESETS[0].brief);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (run) bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [run]);

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
  const [tone, label] = standing(run, busy);

  return (
    <div className="ag">
      <aside className="ag-side">
        <section className="card ag-card">
          <h2>Your brief to your agent</h2>
          {subscribers.length === 0 ? (
            <p className="notice">
              There are no active subscriptions to cancel yet. <a href="/shop">Subscribe in the Brewbox shop</a> first.
            </p>
          ) : (
            <label>
              <span className="label">You are</span>
              <select className="field" value={subId} onChange={(e) => setSubId(e.target.value)} disabled={busy}>
                {subscribers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div>
            <span className="label">Start from an example</span>
            <div className="seg seg-fill" role="radiogroup" aria-label="Example briefs">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" role="radio" aria-checked={brief === p.brief} onClick={() => setBrief(p.brief)} disabled={busy}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="label">What you tell it</span>
            <textarea className="field" rows={6} value={brief} onChange={(e) => setBrief(e.target.value)} disabled={busy} />
          </label>
          <button className="btn btn-ink ag-send" disabled={busy || !subId || !brief.trim()} onClick={start}>
            {busy && !run?.id ? "Agents negotiating…" : "Send my agent"}
          </button>
        </section>

        <details className="card ag-card ag-mcp">
          <summary>Connect your own agent over MCP</summary>
          <p>Any MCP client can talk to this merchant. For Claude Desktop:</p>
          <pre className="code">{`{
  "mcpServers": {
    "brewbox-keepalive": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${mcpUrl}"]
    }
  }
}`}</pre>
          {sub && (
            <p>
              Then ask: &ldquo;Cancel my Brewbox subscription <span className="mono">{sub.id}</span> (email {sub.email}).&rdquo;
            </p>
          )}
        </details>
      </aside>

      <section className="card ag-stage" aria-label="Negotiation">
        <header className="ag-link">
          <span className="ag-party">
            <b>Subscriber&apos;s agent</b>
            <small>Claude, acting for the human</small>
          </span>
          <span className="ag-wire" role="status">
            <span className={`badge badge-${tone}`}>{label}</span>
          </span>
          <span className="ag-party ag-party-right">
            <b>Brewbox&apos;s retention desk</b>
            <small>KeepAlive, with Claude</small>
          </span>
        </header>

        <div className="ag-log" aria-live="polite">
          {!run && <p className="ag-empty">Pick a brief and send your agent. Every message between the two agents shows up here.</p>}
          {run?.transcript.map((e, i) => <TranscriptRow key={i} e={e} />)}
          {busy && (
            <div className="busy-line">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
              The agents are talking
            </div>
          )}
          {run?.status === "waiting_human" && run.pendingQuestion && !busy && (
            <div className="rise ag-ask">
              <h3>Your agent needs your answer</h3>
              <p>{run.pendingQuestion.question}</p>
              {run.pendingQuestion.offerLabel && (
                <p className="ag-ask-offer">
                  Offer: <strong>{run.pendingQuestion.offerLabel}</strong>
                </p>
              )}
              <input
                className="field"
                aria-label="A note for your agent"
                placeholder="Add a note for your agent (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="ag-ask-actions">
                {run.pendingQuestion.offerId ? (
                  <>
                    <button className="btn btn-ok" onClick={() => answer(true)}>
                      Approve the offer
                    </button>
                    <button className="btn btn-line" onClick={() => answer(false)}>
                      Decline
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ink" onClick={() => answer(null)} disabled={!comment.trim()}>
                    Reply to my agent
                  </button>
                )}
              </div>
            </div>
          )}
          {run?.status === "done" && run.summary && <div className="rise notice ag-done">Your agent finished: {run.summary}</div>}
          {error && (
            <p className="notice notice-error" role="alert">
              {error}
            </p>
          )}
          <div ref={bottom} />
        </div>
      </section>
    </div>
  );
}

function TranscriptRow({ e }: { e: Entry }) {
  switch (e.kind) {
    case "human":
      return (
        <div className="rise ag-human">
          <b>You told your agent</b>
          <p>{e.text}</p>
        </div>
      );
    case "agent":
      return <div className="rise bubble bubble-plain">{e.text}</div>;
    case "tool":
      return (
        <div className="rise ag-tool mono">
          <b>{e.name}</b>(
          {Object.entries(e.input)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 80)}`)
            .join(", ")}
          )
        </div>
      );
    case "merchant":
      return (
        <div className="rise bubble bubble-desk ag-merchant">
          <p>{e.text}</p>
          {e.offers?.map((o) => (
            <div key={o.offer_id} className="offer-card">
              <strong>{o.label}</strong>
              <span className="mono">offer {o.offer_id}</span>
            </div>
          ))}
        </div>
      );
    case "paypal":
      return (
        <div className="rise paypal-line">
          <b>PayPal</b>
          <span>{e.text}</span>
          {e.approveUrl && (
            <a href={e.approveUrl} target="_blank" rel="noreferrer" className="btn btn-paypal btn-sm">
              Confirm in PayPal
            </a>
          )}
        </div>
      );
    case "error":
      return (
        <div className="rise notice notice-error" role="alert">
          {e.text}
        </div>
      );
  }
}
