"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkOffer, DEFAULT_POLICY, type OfferProposal } from "@/lib/policy";
import type { RetentionSession, Subscriber } from "@/lib/types";
import type { KeyName, Stage } from "./stage";
import { manualState, scripted, type AgentChoice, type GuardView, type Manual } from "./story";
import "./landing.css";

/** The example subscriber the page talks about. Fixed values: nothing is fetched. */
const MAYA: Subscriber = {
  id: "I-DEMO",
  name: "Maya",
  email: "maya@example.com",
  tier: "standard",
  status: "ACTIVE",
  priceUsd: 22,
  listPriceUsd: 22,
  createdAt: "2026-05-11T00:00:00.000Z",
  usage: { boxesReceived: 6, skippedLastMonth: false, supportTickets: 0 },
};

const EMPTY_SESSION: RetentionSession = {
  id: "landing",
  subscriptionId: MAYA.id,
  channel: "web",
  startedAt: "2026-11-11T00:00:00.000Z",
  messages: [],
  offers: [],
  outcome: "open",
  rationale: [],
};

type ProposalType = OfferProposal["type"];

const APIS: [string, string][] = [
  ["Catalog Products + Billing Plans", "set up the merchant's tiers"],
  ["Subscriptions: create + approve", "subscriber checkout"],
  ["suspend / activate", "pause and automatic resume"],
  ["revise (plan_id) + buyer re-consent", "downgrade with the human in the loop"],
  ["PATCH pricing_scheme", "time-boxed retention discount"],
  ["cancel", "one-click cancellation, always"],
  ["Webhooks + verify-webhook-signature", "stay in sync with PayPal"],
];

export function Landing({ fontClass, mcpUrl }: { fontClass: string; mcpUrl: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // --- guardrail playground: the real checkOffer(), run in the browser
  const [type, setType] = useState<ProposalType>("discount");
  const [pauseMonths, setPauseMonths] = useState(9);
  const [toTier, setToTier] = useState<"lite" | "premium">("lite");
  const [discountPct, setDiscountPct] = useState(50);
  const [discountMonths, setDiscountMonths] = useState(6);
  const [maxPause, setMaxPause] = useState(DEFAULT_POLICY.maxPauseMonths);
  const [maxDiscount, setMaxDiscount] = useState(DEFAULT_POLICY.maxDiscountPct);

  const verdict = useMemo(() => {
    const proposal: OfferProposal =
      type === "pause"
        ? { type, months: pauseMonths }
        : type === "downgrade"
          ? { type, toTier }
          : { type, discountPct, months: discountMonths };
    const policy = { ...DEFAULT_POLICY, maxPauseMonths: maxPause, maxDiscountPct: maxDiscount };
    return checkOffer(proposal, MAYA, policy, EMPTY_SESSION, [MAYA]);
  }, [type, pauseMonths, toTier, discountPct, discountMonths, maxPause, maxDiscount]);

  const guard: GuardView = useMemo(
    () => ({
      ok: verdict.ok,
      type,
      months: verdict.ok ? (verdict.offer.months ?? 0) : 0,
      pct: verdict.ok ? (verdict.offer.discountPct ?? 0) : 0,
      label: verdict.ok ? verdict.offer.label : "",
      knobs: [(maxPause - 1) / 5, (maxDiscount - 5) / 70],
    }),
    [verdict, type, maxPause, maxDiscount],
  );

  // --- the visitor plays Leo, the human behind the agent
  const [choice, setChoice] = useState<AgentChoice>(null);
  const [pressed, setPressed] = useState(false);

  const guardRef = useRef(guard);
  const choiceRef = useRef(choice);
  useEffect(() => {
    guardRef.current = guard;
    choiceRef.current = choice;
  }, [guard, choice]);

  useEffect(() => {
    const root = rootRef.current;
    const mount = stageRef.current;
    if (!root || !mount) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = document.createElement("canvas");
    mount.appendChild(canvas);

    let stage: Stage | null = null;
    let alive = true;
    let raf = 0;
    let manual: Manual | null = null;
    let beat = 0;

    const beats = Array.from(root.querySelectorAll<HTMLElement>("[data-beat-id]"));
    let tops: number[] = [];
    let heights: number[] = [];
    const measure = () => {
      tops = beats.map((b) => b.getBoundingClientRect().top + window.scrollY);
      heights = beats.map((b) => b.offsetHeight);
    };
    const readU = () => {
      const centre = window.scrollY + window.innerHeight * 0.5;
      for (let i = 0; i < beats.length; i++) {
        if (centre < tops[i] + heights[i]) return i + Math.min(1, Math.max(0, (centre - tops[i]) / heights[i]));
      }
      return beats.length;
    };
    // Elements that switch on for a stretch of their beat.
    const timed = Array.from(root.querySelectorAll<HTMLElement>("[data-at]")).map((el) => {
      const index = beats.indexOf(el.closest<HTMLElement>("[data-beat-id]")!);
      return {
        el,
        from: index + Number(el.dataset.at),
        until: el.dataset.until ? index + Number(el.dataset.until) : Infinity,
        on: false,
      };
    });

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);

    const onKey = (name: KeyName) => {
      stage?.pressKey(name);
      const m: Manual = manual ?? { beat, cancelled: false, offer: null };
      if (name === "cancel") {
        m.cancelled = !m.cancelled;
        if (m.cancelled) m.offer = null;
      } else {
        m.cancelled = false;
        m.offer = m.offer === name ? null : name;
      }
      manual = { ...m, beat };
      setPressed(true);
    };

    let smoothed = readU();
    let last = performance.now();
    const tick = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const u = readU();
      smoothed = calm ? u : smoothed + (u - smoothed) * (1 - Math.exp(-dt * 9));
      const now = Math.min(beats.length - 1, Math.floor(smoothed));
      if (now !== beat) {
        beat = now;
        manual = null;
        root.dataset.beat = String(beat);
      }
      for (const t of timed) {
        const on = smoothed >= t.from && smoothed < t.until;
        if (on !== t.on) {
          t.on = on;
          t.el.classList.toggle("on", on);
        }
      }
      if (stage) {
        const ctx = { guard: guardRef.current, agentChoice: choiceRef.current };
        stage.render({
          u: smoothed,
          dt,
          now: time / 1000,
          state: manual ? manualState(manual, ctx) : scripted(smoothed, ctx),
        });
        const hint = hintRef.current;
        if (hint) {
          const p = stage.cancelAnchor();
          hint.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    import("./stage")
      .then(async ({ createStage }) => {
        const css = getComputedStyle(root);
        const created = await createStage(canvas, {
          calm,
          onKey,
          fonts: {
            display: css.getPropertyValue("--font-ka-display").trim() || "Georgia, serif",
            sans: css.getPropertyValue("--font-geist-sans").trim() || "system-ui, sans-serif",
            mono: css.getPropertyValue("--font-geist-mono").trim() || "ui-monospace, monospace",
          },
        });
        if (!alive) return created.dispose();
        stage = created;
        root.classList.add("ka-ready");
      })
      .catch((error) => {
        console.error("KeepAlive landing: 3D stage unavailable", error);
        root.classList.add("ka-flat");
      });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      stage?.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={rootRef} className={`ka ${fontClass}`} data-beat="0">
      <div ref={stageRef} className="ka-stage" aria-hidden="true" />

      <header className="ka-bar">
        <Link href="/" className="ka-mark">
          KeepAlive
        </Link>
        <nav className="ka-nav" aria-label="KeepAlive">
          <Link href="/shop">Brewbox shop</Link>
          <Link href="/merchant">Merchant dashboard</Link>
          <Link href="/agent" className="ka-key ka-key-small">
            Open the agent demo
          </Link>
        </nav>
      </header>

      <div ref={hintRef} className="ka-hint" aria-hidden="true">
        <span>{pressed ? "Press again to undo. Then scroll." : "Go on, press it."}</span>
      </div>

      {/* 0 hero */}
      <section className="ka-beat ka-hero" data-beat-id="hero">
        <div className="ka-cap">
          <h1 className="ka-h1">Someone is about to press cancel.</h1>
          <p className="ka-lede">
            KeepAlive is the AI retention desk for PayPal Subscriptions. When a subscriber, or their AI agent, asks to
            cancel, it finds out why, makes one fair offer inside your limits, and carries it out on PayPal. Cancelling
            stays one click.
          </p>
          <div className="ka-actions">
            <Link href="/agent" className="ka-key ka-key-mint">
              Open the agent demo
            </Link>
            <Link href="/shop" className="ka-key">
              Try it as a subscriber
            </Link>
          </div>
          <p className="ka-scroll">Scroll to follow one cancellation from click to PayPal.</p>
        </div>
      </section>

      {/* 1 cancel */}
      <section className="ka-beat" data-beat-id="cancel" style={{ minHeight: "220svh" }}>
        <div className="ka-cap">
          <h2 className="ka-h2">One click, and twelve months walk out.</h2>
          <p>
            Maya pays Brewbox $22 a month through PayPal Subscriptions. The cancel button does exactly what it says, and
            that is all there is.
          </p>
          <p>
            Cancel flows, pause offers and win-back discounts exist for Stripe, Braintree, Chargebee and Paddle.
            Merchants who bill through PayPal Subscriptions have no such layer.
          </p>
        </div>
      </section>

      {/* 2 why */}
      <section className="ka-beat" data-beat-id="why" style={{ minHeight: "220svh" }}>
        <div className="ka-cap">
          <h2 className="ka-h2">First, ask why. Once.</h2>
          <p>Claude has one short, honest conversation, works out the real reason, and proposes one offer that fits it.</p>
          <div className="ka-chat">
            <p className="ka-bubble" data-at="0.22">
              <b>Maya</b>
              I&apos;m backpacking for two months, cancel my coffee.
            </p>
            <p className="ka-bubble ka-bubble-desk" data-at="0.55">
              <b>KeepAlive</b>
              Have a great trip! Want me to pause Brewbox for 2 months instead? No charges, and it restarts
              automatically.
            </p>
          </div>
        </div>
      </section>

      {/* 3 offers */}
      <section className="ka-beat" data-beat-id="offers" style={{ minHeight: "330svh" }}>
        <div className="ka-cap">
          <h2 className="ka-h2">Three ways to stay. Each one is a real PayPal call.</h2>
          <ol className="ka-offers">
            <li className="ka-offer" data-at="0.02" data-until="0.3">
              <span className="ka-reason">&ldquo;I&apos;m travelling.&rdquo;</span>
              <strong>Pause for 2 months</strong>
              <span>
                <code>suspend</code> now, <code>activate</code> when the pause ends. No charges in between.
              </span>
            </li>
            <li className="ka-offer" data-at="0.3" data-until="0.58">
              <span className="ka-reason">&ldquo;I have too much coffee.&rdquo;</span>
              <strong>Switch to Lite, $12 a month</strong>
              <span>
                <code>revise</code> the plan. The subscriber approves the change again inside PayPal.
              </span>
            </li>
            <li className="ka-offer" data-at="0.58" data-until="1.01">
              <span className="ka-reason">&ldquo;It costs too much.&rdquo;</span>
              <strong>30% off for 3 months</strong>
              <span>
                <code>PATCH</code> the price, then restore it when the discount runs out.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* 4 guardrails */}
      <section className="ka-beat" data-beat-id="guardrails" style={{ minHeight: "240svh" }}>
        <div className="ka-cap ka-cap-wide">
          <h2 className="ka-h2">The AI proposes. Your limits decide.</h2>
          <p>
            Every offer passes a deterministic check before it can reach PayPal. The model never holds PayPal
            credentials. Try to get a bad offer through.
          </p>

          <div className="ka-lab">
            <fieldset>
              <legend>The AI proposes</legend>
              <div className="ka-seg" role="radiogroup" aria-label="Offer type">
                {(
                  [
                    ["pause", "Pause"],
                    ["downgrade", "Switch plan"],
                    ["discount", "Discount"],
                  ] as [ProposalType, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    className={type === value ? "is-on" : ""}
                    onClick={() => setType(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {type === "pause" && (
                <Slider label="Pause length" value={pauseMonths} min={1} max={12} unit=" months" onChange={setPauseMonths} />
              )}
              {type === "downgrade" && (
                <div className="ka-seg" role="radiogroup" aria-label="Target plan">
                  {(
                    [
                      ["lite", "To Lite, $12"],
                      ["premium", "To Premium, $36"],
                    ] as ["lite" | "premium", string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={toTier === value}
                      className={toTier === value ? "is-on" : ""}
                      onClick={() => setToTier(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {type === "discount" && (
                <>
                  <Slider label="Discount" value={discountPct} min={5} max={90} step={5} unit="%" onChange={setDiscountPct} />
                  <Slider label="For" value={discountMonths} min={1} max={12} unit=" months" onChange={setDiscountMonths} />
                </>
              )}
            </fieldset>

            <fieldset>
              <legend>Your limits</legend>
              <Slider label="Longest pause" value={maxPause} min={1} max={6} unit=" months" onChange={setMaxPause} />
              <Slider label="Biggest discount" value={maxDiscount} min={5} max={75} step={5} unit="%" onChange={setMaxDiscount} />
            </fieldset>

            <div className={`ka-verdict ${verdict.ok ? "is-ok" : "is-no"}`} aria-live="polite">
              {verdict.ok ? (
                <>
                  <strong>Approved: {verdict.offer.label}</strong>
                  {verdict.offer.guardrailNotes.length > 0 ? (
                    <ul>
                      {verdict.offer.guardrailNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>Inside every limit, passed through unchanged.</span>
                  )}
                  <span>Keeps ${verdict.offer.mrrKeptUsd.toFixed(2)} a month of Maya&apos;s $22.</span>
                </>
              ) : (
                <>
                  <strong>Rejected</strong>
                  <span>{verdict.reason}</span>
                </>
              )}
            </div>
            <p className="ka-fine">
              This panel runs <code>checkOffer()</code> from <code>src/lib/policy.ts</code>, the same function the server
              uses.
            </p>
          </div>
        </div>
      </section>

      {/* 5 paypal */}
      <section className="ka-beat" data-beat-id="paypal" style={{ minHeight: "240svh" }}>
        <div className="ka-cap">
          <h2 className="ka-h2">Done on PayPal, then read back.</h2>
          <p>
            Accepting an offer runs the matching Subscriptions call. KeepAlive reads the subscription back from PayPal
            before it tells anyone it worked.
          </p>
          <ol className="ka-tape">
            <li data-at="0.17">
              <code>POST /v1/billing/subscriptions/I-…/suspend</code>
              <span>204 No Content</span>
            </li>
            <li data-at="0.5">
              <code>GET /v1/billing/subscriptions/I-…</code>
              <span>status: SUSPENDED</span>
            </li>
            <li data-at="0.66" className="ka-tape-done">
              Paused on PayPal. Resumes in 2 months.
            </li>
          </ol>
        </div>
      </section>

      {/* 6 agent */}
      <section className="ka-beat" data-beat-id="agent" style={{ minHeight: "330svh" }}>
        <div className="ka-cap">
          <h2 className="ka-h2">Soon the click comes from their AI.</h2>
          <p>
            A subscriber&apos;s own agent can ask to cancel over MCP. It gets the same offers under the same limits, and
            it must ask its human before it accepts anything.
          </p>
          <ol className="ka-talk">
            <li data-at="0.25">
              <b>Leo&apos;s agent</b>
              <code>request_cancellation</code>
              <span>Too much coffee. Bags are piling up.</span>
            </li>
            <li data-at="0.45">
              <b>KeepAlive</b>
              <span>One offer: Switch to Lite, $12 a month.</span>
            </li>
            <li data-at="0.6">
              <b>Leo&apos;s agent</b>
              <code>ask_my_human</code>
              <span>You are Leo. Accept the switch to Lite?</span>
              {choice === null && (
                <span className="ka-ask">
                  <button type="button" className="ka-key ka-key-mint ka-key-small" onClick={() => setChoice("approve")}>
                    Approve
                  </button>
                  <button type="button" className="ka-key ka-key-small" onClick={() => setChoice("cancel")}>
                    Just cancel
                  </button>
                </span>
              )}
            </li>
            {choice !== null && (
              <li className="on">
                <b>Leo&apos;s agent</b>
                <code>{choice === "approve" ? "accept_offer" : "cancel_subscription"}</code>
                <span>
                  {choice === "approve"
                    ? "PayPal sends Leo an approval link. Plan changes always need the human's consent inside PayPal."
                    : "Cancelled on PayPal. One decline, no second pitch."}
                </span>
                <button type="button" className="ka-link" onClick={() => setChoice(null)}>
                  Ask me again
                </button>
              </li>
            )}
          </ol>
        </div>
      </section>

      {/* 7 close */}
      <section className="ka-beat ka-close" data-beat-id="close">
        <div className="ka-cap ka-cap-wide">
          <h2 className="ka-h2">Cancel is always one click.</h2>
          <p>
            If someone wants to go, one decline and it is cancelled on PayPal. No maze and no guilt. The key on the desk
            still works: press it.
          </p>
          <div className="ka-actions">
            <Link href="/agent" className="ka-key ka-key-mint">
              Open the agent demo
            </Link>
            <Link href="/shop" className="ka-key">
              Try it as a subscriber
            </Link>
            <Link href="/merchant" className="ka-key">
              Merchant dashboard
            </Link>
          </div>

          <div className="ka-built">
            <h3>PayPal APIs used</h3>
            <table>
              <tbody>
                {APIS.map(([api, why]) => (
                  <tr key={api}>
                    <th scope="row">{api}</th>
                    <td>{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Connect your own agent over MCP</h3>
            <code className="ka-cmd">npx -y mcp-remote {mcpUrl}</code>
          </div>

          <p className="ka-fine">
            Built for the PayPal AI Hackathon. Payments run in the PayPal sandbox and the AI is Claude. Brewbox is a
            fictional demo merchant. The desk on this page is a model and calls nothing.
          </p>
        </div>
      </section>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="ka-slider">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <output>
        {props.value}
        {props.unit}
      </output>
    </label>
  );
}
