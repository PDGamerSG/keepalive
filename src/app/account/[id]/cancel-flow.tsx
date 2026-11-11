"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicOffer, PublicSession } from "@/lib/view-types";

async function post<T>(url: string, payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function CancelFlow({ subscriptionId, status }: { subscriptionId: string; status: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
  }, [session, busy]);

  async function run(label: string, fn: () => Promise<PublicSession>) {
    setBusy(label);
    setError(null);
    try {
      const s = await fn();
      setSession(s);
      if (s.paypal_approval_url) setApproveUrl(s.paypal_approval_url);
      if (s.outcome !== "open") router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const start = () => run("thinking", () => post("/api/retention/start", { subscriptionId }));
  const send = async () => {
    const text = input.trim();
    if (!text || !session || busy) return;
    if (await run("thinking", () => post(`/api/retention/${session.session_id}/message`, { text }))) setInput("");
  };
  const accept = (o: PublicOffer) => run("paypal", () => post(`/api/retention/${session!.session_id}/accept`, { offerId: o.offer_id }));
  const decline = (o: PublicOffer) => run("thinking", () => post(`/api/retention/${session!.session_id}/decline`, { offerId: o.offer_id }));
  const cancel = () => run("cancelling", () => post(`/api/retention/${session!.session_id}/cancel`));

  // Cancel must stay one click away, including for paused (SUSPENDED) subscribers.
  const cancellable = status === "ACTIVE" || status === "SUSPENDED";

  if (status === "CANCELLED" && !session) {
    return (
      <div className="card p-8 text-center text-muted">
        This subscription is cancelled on PayPal. Thanks for brewing with us. <a className="underline" href="/shop">Subscribe again</a>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Manage subscription</h2>
        <p className="mt-2 text-sm text-muted max-w-sm">Thinking of leaving? You can cancel at any time. It takes one click.</p>
        <button className="btn btn-danger-ghost mt-6" onClick={start} disabled={!!busy || !cancellable}>
          {busy ? "One sec…" : "Cancel subscription"}
        </button>
        {!cancellable && <p className="mt-3 text-xs text-muted">Available once PayPal shows the subscription as active or paused (now {status}).</p>}
        {error && <p role="alert" className="notice notice-error mt-3">{error}</p>}
      </div>
    );
  }

  const offers = new Map(session.offers.map((o) => [o.offer_id, o]));
  const open = session.outcome === "open";

  return (
    <div className="card conversation-panel flex flex-col h-[620px] max-h-[80svh]">
      <div className="px-5 py-3 border-b border-line flex items-center justify-between">
        <div>
          <div className="font-semibold">Brewbox support</div>
          <div className="text-xs text-muted">Retention assistant · powered by KeepAlive + Claude</div>
        </div>
        {session.outcome === "saved" && <span className="pill bg-save-soft text-save">Saved</span>}
        {session.outcome === "cancelled" && <span className="pill bg-red-50 text-danger">Cancelled</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" role="log" aria-label="Subscription conversation" aria-live="polite" aria-busy={Boolean(busy)}>
        {session.messages.map((m, i) => {
          if (m.from === "system") {
            return (
              <div key={i} className="rise flex items-start gap-2 text-sm rounded-lg bg-blue-50 text-paypal px-3 py-2">
                <span className="font-bold">PayPal</span>
                <span>{m.text}</span>
              </div>
            );
          }
          const mine = m.from === "subscriber";
          const offer = m.offer_id ? offers.get(m.offer_id) : undefined;
          return (
            <div key={i} className={`rise flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${mine ? "" : "space-y-2"}`}>
                <div className={`rounded-2xl px-4 py-2 text-sm ${mine ? "bg-espresso text-white" : "bg-crema"}`}>{m.text}</div>
                {offer && <OfferCard offer={offer} busy={!!busy} open={open} onAccept={accept} onDecline={decline} />}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="text-sm text-muted flex items-center gap-2">
            <span className="typing">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </span>
            {busy === "paypal" ? "Applying on PayPal…" : busy === "cancelling" ? "Cancelling on PayPal…" : "Thinking…"}
          </div>
        )}
        {approveUrl && session.offers.some((o) => o.status === "awaiting_paypal_approval") && (
          <a href={approveUrl} className="btn btn-paypal w-full">Confirm the plan change in PayPal →</a>
        )}
        {error && <p role="alert" className="notice notice-error">{error}</p>}
        <div ref={bottom} />
      </div>

      {open && (
        <div className="border-t border-line p-3 space-y-2">
          <div className="flex gap-2">
            <input
              className="input"
              aria-label="Message to KeepAlive"
              maxLength={2000}
              placeholder="Tell us why you're leaving…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              disabled={!!busy}
            />
            <button className="btn btn-primary" onClick={send} disabled={!!busy || !input.trim()}>
              Send
            </button>
          </div>
          <button className="btn btn-danger-ghost w-full" onClick={cancel} disabled={!!busy}>
            No thanks, cancel my subscription now
          </button>
        </div>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  busy,
  open,
  onAccept,
  onDecline,
}: {
  offer: PublicOffer;
  busy: boolean;
  open: boolean;
  onAccept: (o: PublicOffer) => void;
  onDecline: (o: PublicOffer) => void;
}) {
  const icon = offer.type === "pause" ? "⏸" : offer.type === "downgrade" ? "↓" : "%";
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-full bg-save-soft text-save flex items-center justify-center font-bold">{icon}</span>
        <div>
          <div className="font-semibold text-sm">{offer.label}</div>
          <div className="text-xs text-muted">
            {offer.type === "pause"
              ? "No charges while paused · resumes automatically"
              : `New price $${offer.new_monthly_price_usd.toFixed(2)}/month`}
          </div>
        </div>
      </div>
      {offer.status === "proposed" && open ? (
        <div className="mt-3 flex gap-2">
          <button className="btn btn-save flex-1" disabled={busy} onClick={() => onAccept(offer)}>
            Yes, do this
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => onDecline(offer)}>
            No thanks
          </button>
        </div>
      ) : (
        <div className="mt-2 text-xs font-medium text-muted">Status: {offer.status.replaceAll("_", " ")}</div>
      )}
    </div>
  );
}
