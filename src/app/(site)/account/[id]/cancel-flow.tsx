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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottom.current?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "nearest" });
  }, [session, busy]);

  /** Runs one request; returns whether it succeeded. */
  async function run(label: string, fn: () => Promise<PublicSession>): Promise<boolean> {
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
    // Keep the draft until the server has the message, so a failed send loses nothing.
    if (await run("thinking", () => post(`/api/retention/${session.session_id}/message`, { text }))) setInput("");
  };
  const accept = (o: PublicOffer) => run("paypal", () => post(`/api/retention/${session!.session_id}/accept`, { offerId: o.offer_id }));
  const decline = (o: PublicOffer) => run("thinking", () => post(`/api/retention/${session!.session_id}/decline`, { offerId: o.offer_id }));
  const cancel = () => run("cancelling", () => post(`/api/retention/${session!.session_id}/cancel`));

  // Cancel must stay one click away, including for paused (SUSPENDED) subscribers.
  const cancellable = status === "ACTIVE" || status === "SUSPENDED";

  if (status === "CANCELLED" && !session) {
    return (
      <section className="card cf cf-idle">
        <h2 className="display">This subscription is cancelled</h2>
        <p>It&apos;s cancelled on PayPal and you won&apos;t be charged again. Thanks for brewing with us.</p>
        <a className="btn btn-line" href="/shop">
          Subscribe again
        </a>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="card cf cf-idle">
        <h2 className="display">Thinking of leaving?</h2>
        <p>
          You can cancel at any time, and it takes one click. If something isn&apos;t working, tell us why first: there
          might be a better fit.
        </p>
        <button className="btn btn-danger" onClick={start} disabled={!!busy || !cancellable}>
          {busy ? "One moment…" : "Cancel subscription"}
        </button>
        {!cancellable && <p className="cf-fine">Available once PayPal shows the subscription as active or paused. It is {status} now.</p>}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  const offers = new Map(session.offers.map((o) => [o.offer_id, o]));
  const open = session.outcome === "open";

  return (
    <section className="card cf" aria-label="Conversation with Brewbox">
      <header className="cf-head">
        <div>
          <h2>Brewbox support</h2>
          <p>Retention assistant, powered by KeepAlive</p>
        </div>
        {session.outcome === "saved" && <span className="badge badge-ok">Staying</span>}
        {session.outcome === "cancelled" && <span className="badge badge-gone">Cancelled</span>}
      </header>

      <div className="cf-log" aria-live="polite">
        {session.messages.map((m, i) => {
          if (m.from === "system") {
            return (
              <div key={i} className="rise paypal-line">
                <b>PayPal</b>
                <span>{m.text}</span>
              </div>
            );
          }
          const mine = m.from === "subscriber";
          const offer = m.offer_id ? offers.get(m.offer_id) : undefined;
          return (
            <div key={i} className={`rise bubble ${mine ? "bubble-mine" : "bubble-desk"}`}>
              <p>{m.text}</p>
              {offer && <OfferCard offer={offer} busy={!!busy} open={open} onAccept={accept} onDecline={decline} />}
            </div>
          );
        })}
        {busy && (
          <div className="busy-line">
            <span className="typing">
              <span />
              <span />
              <span />
            </span>
            {busy === "paypal" ? "Applying it on PayPal" : busy === "cancelling" ? "Cancelling on PayPal" : "Thinking"}
          </div>
        )}
        {approveUrl && session.offers.some((o) => o.status === "awaiting_paypal_approval") && (
          <a href={approveUrl} className="btn btn-paypal">
            Confirm the plan change in PayPal
          </a>
        )}
        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <div ref={bottom} />
      </div>

      {open && (
        <footer className="cf-foot">
          <form
            className="cf-compose"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              className="field"
              aria-label="Your message"
              placeholder="Tell us why you're leaving"
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!busy}
            />
            <button className="btn btn-ink" type="submit" disabled={!!busy || !input.trim()}>
              Send
            </button>
          </form>
          <button className="btn btn-danger cf-cancel" onClick={cancel} disabled={!!busy}>
            No thanks, cancel my subscription now
          </button>
        </footer>
      )}
    </section>
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
  return (
    <div className="offer-card">
      <strong>{offer.label}</strong>
      <span>
        {offer.type === "pause"
          ? "No charges while paused. It restarts on its own."
          : `New price $${offer.new_monthly_price_usd.toFixed(2)} a month`}
      </span>
      {offer.status === "proposed" && open ? (
        <div className="offer-card-actions">
          <button className="btn btn-ok btn-sm" disabled={busy} onClick={() => onAccept(offer)}>
            Yes, do this
          </button>
          <button className="btn btn-line btn-sm" disabled={busy} onClick={() => onDecline(offer)}>
            No thanks
          </button>
        </div>
      ) : (
        <em>{offer.status.replaceAll("_", " ")}</em>
      )}
    </div>
  );
}
