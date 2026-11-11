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

const OFFER_TONE: Record<PublicOffer["type"], string> = { pause: "stasis", downgrade: "orbit", discount: "offer" };

export function CancelFlow({ subscriptionId, status }: { subscriptionId: string; status: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PublicSession | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [session, busy]);

  async function run(label: string, fn: () => Promise<PublicSession>) {
    setBusy(label);
    setError(null);
    try {
      const s = await fn();
      setSession(s);
      if (s.paypal_approval_url) setApproveUrl(s.paypal_approval_url);
      if (s.outcome !== "open") router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const start = () => run("thinking", () => post("/api/retention/start", { subscriptionId }));
  const send = () => {
    const text = input.trim();
    if (!text || !session) return;
    setInput("");
    setSession({ ...session, messages: [...session.messages, { from: "subscriber", text }] });
    run("thinking", () => post(`/api/retention/${session.session_id}/message`, { text }));
  };
  const accept = (o: PublicOffer) => run("paypal", () => post(`/api/retention/${session!.session_id}/accept`, { offerId: o.offer_id }));
  const decline = (o: PublicOffer) => run("thinking", () => post(`/api/retention/${session!.session_id}/decline`, { offerId: o.offer_id }));
  const cancel = () => run("cancelling", () => post(`/api/retention/${session!.session_id}/cancel`));

  // Cancel must stay one click away, including for paused (SUSPENDED) subscribers.
  const cancellable = status === "ACTIVE" || status === "SUSPENDED";

  if (status === "CANCELLED" && !session) {
    return (
      <section className="panel cf cf-idle">
        <h2 className="display display-tight">This subscription is cancelled</h2>
        <p>It&apos;s cancelled on PayPal and you won&apos;t be charged again. Thanks for brewing with us.</p>
        <a className="btn btn-line" href="/shop">
          Subscribe again
        </a>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="panel cf cf-idle">
        <h2 className="display display-tight">Thinking of leaving?</h2>
        <p>You can cancel at any time, and it takes one click. If something isn&apos;t working, tell us why first: there might be a better fit.</p>
        <button className="btn btn-exit" onClick={start} disabled={!!busy || !cancellable}>
          {busy ? "One moment…" : "Cancel subscription"}
        </button>
        {!cancellable && <p className="cf-fine">Available once PayPal shows the subscription as active or paused. It is {status} now.</p>}
        {error && (
          <p className="cf-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  const offers = new Map(session.offers.map((o) => [o.offer_id, o]));
  const open = session.outcome === "open";

  return (
    <section className="panel cf" aria-label="Conversation with Brewbox">
      <header className="cf-head">
        <div>
          <h2>Brewbox support</h2>
          <p>Retention assistant, powered by KeepAlive and Claude</p>
        </div>
        {session.outcome === "saved" && <span className="state state-orbit">Staying</span>}
        {session.outcome === "cancelled" && <span className="state state-exit">Cancelled</span>}
      </header>

      <div className="cf-log" aria-live="polite">
        {session.messages.map((m, i) => {
          if (m.from === "system") {
            return (
              <div key={i} className="rise cf-paypal">
                <b>PayPal</b>
                <span>{m.text}</span>
              </div>
            );
          }
          const mine = m.from === "subscriber";
          const offer = m.offer_id ? offers.get(m.offer_id) : undefined;
          return (
            <div key={i} className={`rise cf-msg ${mine ? "is-mine" : "is-desk"}`}>
              <p>{m.text}</p>
              {offer && <OfferCard offer={offer} busy={!!busy} open={open} onAccept={accept} onDecline={decline} />}
            </div>
          );
        })}
        {busy && (
          <div className="cf-busy">
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
          <p className="cf-error" role="alert">
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
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!!busy}
            />
            <button className="btn btn-solid" type="submit" disabled={!!busy || !input.trim()}>
              Send
            </button>
          </form>
          <button className="btn btn-exit cf-cancel" onClick={cancel} disabled={!!busy}>
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
    <div className="cf-offer" data-tone={OFFER_TONE[offer.type]}>
      <strong>{offer.label}</strong>
      <span>
        {offer.type === "pause"
          ? "No charges while paused. It restarts on its own."
          : `New price $${offer.new_monthly_price_usd.toFixed(2)} a month`}
      </span>
      {offer.status === "proposed" && open ? (
        <div className="cf-offer-actions">
          <button className="btn btn-orbit btn-sm" disabled={busy} onClick={() => onAccept(offer)}>
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
