"use client";

import { useEffect, useRef, useState } from "react";
import type { LinkScene } from "@/components/orrery/link-scene";
import { mountScene } from "@/components/orrery/mount";

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

/** The packet each transcript entry sends along the filament. */
function packetFor(e: Entry): { dir: "toMerchant" | "toAgent"; tone: "exit" | "orbit" | "offer" | "core" | "dim" } | null {
  switch (e.kind) {
    case "tool":
      if (e.name === "ask_my_human") return null;
      if (e.name === "accept_offer") return { dir: "toMerchant", tone: "orbit" };
      if (e.name === "decline_offer") return { dir: "toMerchant", tone: "dim" };
      if (e.name === "request_cancellation" || e.name === "cancel_subscription") return { dir: "toMerchant", tone: "exit" };
      return { dir: "toMerchant", tone: "core" };
    case "agent":
      return { dir: "toMerchant", tone: "core" };
    case "merchant":
      return { dir: "toAgent", tone: e.offers?.length ? "offer" : "core" };
    default:
      return null;
  }
}

export function AgentDemo({ subscribers, mcpUrl }: { subscribers: { id: string; label: string; email: string }[]; mcpUrl: string }) {
  const [subId, setSubId] = useState(subscribers[0]?.id ?? "");
  const [brief, setBrief] = useState(PRESETS[0].brief);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const linkMount = useRef<HTMLDivElement>(null);
  const linkScene = useRef<LinkScene | null>(null);
  const shown = useRef(0);

  useEffect(() => {
    const mount = linkMount.current;
    if (!mount) return;
    return mountScene(
      mount,
      (canvas, calm) => import("@/components/orrery/link-scene").then((m) => m.createLinkScene(canvas, { calm })),
      (scene) => (linkScene.current = scene),
    );
  }, []);

  // Each new line of the transcript travels along the filament.
  useEffect(() => {
    const scene = linkScene.current;
    const entries = run?.transcript ?? [];
    if (entries.length < shown.current) shown.current = 0;
    if (scene) {
      entries.slice(shown.current).forEach((e, i) => {
        window.setTimeout(() => {
          const packet = packetFor(e);
          if (packet) scene.send(packet.dir, packet.tone);
          if (e.kind === "paypal") scene.paypal();
        }, i * 420);
      });
      scene.setWaiting(run?.status === "waiting_human");
      const called = (name: string) => entries.some((e) => e.kind === "tool" && e.name === name);
      scene.setOutcome(called("cancel_subscription") ? "cancelled" : called("accept_offer") ? "saved" : null);
    }
    shown.current = entries.length;
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  return (
    <div className="ag">
      <aside className="ag-side">
        <section className="panel ag-card">
          <h2>Your brief to your agent</h2>
          {subscribers.length === 0 ? (
            <p className="ag-muted">
              There are no active subscriptions to cancel yet. <a href="/shop">Subscribe in the Brewbox shop</a> first.
            </p>
          ) : (
            <label className="ag-field">
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
          <div className="seg ag-presets" role="radiogroup" aria-label="Example briefs">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" role="radio" aria-checked={brief === p.brief} onClick={() => setBrief(p.brief)} disabled={busy}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="ag-field">
            <span className="label">What you tell it</span>
            <textarea className="field" rows={6} value={brief} onChange={(e) => setBrief(e.target.value)} disabled={busy} />
          </label>
          <button className="btn btn-solid ag-send" disabled={busy || !subId || !brief.trim()} onClick={start}>
            {busy && !run?.id ? "Agents negotiating…" : "Send my agent"}
          </button>
        </section>
        <details className="panel ag-card ag-mcp">
          <summary>Connect your own agent over MCP</summary>
          <p className="ag-muted">Any MCP client can talk to this merchant. For Claude Desktop:</p>
          <pre className="code">{`{
  "mcpServers": {
    "brewbox-keepalive": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${mcpUrl}"]
    }
  }
}`}</pre>
          {sub && (
            <p className="ag-muted">
              Then ask: &ldquo;Cancel my Brewbox subscription <span className="code">{sub.id}</span> (email {sub.email}).&rdquo;
            </p>
          )}
        </details>
      </aside>

      <section className="panel ag-stage" aria-label="Negotiation">
        <div className="ag-link">
          <div ref={linkMount} className="orrery-mount" aria-hidden="true" />
          <span className="ag-party ag-party-left">
            <b>Subscriber&apos;s agent</b>
            Claude, acting for the human
          </span>
          <span className="ag-party ag-party-right">
            <b>Brewbox&apos;s retention desk</b>
            KeepAlive, with Claude
          </span>
        </div>

        <div className="ag-log" aria-live="polite">
          {!run && <p className="ag-empty">Pick a brief and send your agent. Every message between the two agents shows up here.</p>}
          {run?.transcript.map((e, i) => <TranscriptRow key={i} e={e} />)}
          {busy && (
            <div className="ag-busy">
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
              <p className="ag-ask-kicker">Your agent needs your answer</p>
              <p className="ag-ask-q">{run.pendingQuestion.question}</p>
              {run.pendingQuestion.offerLabel && (
                <p className="ag-ask-offer">
                  Offer: <strong>{run.pendingQuestion.offerLabel}</strong>
                </p>
              )}
              <input className="field" placeholder="Add a note for your agent (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="ag-ask-actions">
                {run.pendingQuestion.offerId ? (
                  <>
                    <button className="btn btn-orbit" onClick={() => answer(true)}>
                      Approve the offer
                    </button>
                    <button className="btn btn-line" onClick={() => answer(false)}>
                      Decline
                    </button>
                  </>
                ) : (
                  <button className="btn btn-solid" onClick={() => answer(null)} disabled={!comment.trim()}>
                    Reply to my agent
                  </button>
                )}
              </div>
            </div>
          )}
          {run?.status === "done" && run.summary && <div className="rise ag-done">Your agent finished: {run.summary}</div>}
          {error && <p className="ag-error">{error}</p>}
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
        <div className="rise ag-row ag-human">
          <b>You told your agent</b>
          {e.text}
        </div>
      );
    case "agent":
      return <div className="rise ag-row ag-agent">{e.text}</div>;
    case "tool":
      return (
        <div className="rise ag-row ag-tool code">
          <span>{e.name}</span>(
          {Object.entries(e.input)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k}: ${JSON.stringify(v).slice(0, 80)}`)
            .join(", ")}
          )
        </div>
      );
    case "merchant":
      return (
        <div className="rise ag-row ag-merchant">
          <p>{e.text}</p>
          {e.offers?.map((o) => (
            <div key={o.offer_id} className="ag-offer">
              <strong>{o.label}</strong>
              <span className="code">offer {o.offer_id}</span>
            </div>
          ))}
        </div>
      );
    case "paypal":
      return (
        <div className="rise ag-row ag-paypal">
          <b>PayPal</b> {e.text}
          {e.approveUrl && (
            <a href={e.approveUrl} target="_blank" rel="noreferrer" className="btn btn-paypal btn-sm">
              Confirm in PayPal
            </a>
          )}
        </div>
      );
    case "error":
      return <div className="rise ag-row ag-error">{e.text}</div>;
  }
}
