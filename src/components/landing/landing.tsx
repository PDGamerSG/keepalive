"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkOffer, DEFAULT_POLICY, type OfferProposal } from "@/lib/policy";
import type { RetentionSession, Subscriber } from "@/lib/types";
import type { LandingScene } from "../orrery/landing-scene";
import { mountScene } from "../orrery/mount";
import { Slider } from "../ui/slider";
import { guardView, type AgentChoice, type GuardView } from "./story";
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
  ["Catalog Products + Billing Plans", "Set up the merchant's three plans"],
  ["Subscriptions: create + approve", "Subscriber checkout"],
  ["suspend / activate", "Pause, then resume on schedule"],
  ["revise (plan_id) + buyer re-consent", "Switch plan, with the subscriber approving inside PayPal"],
  ["PATCH pricing_scheme", "Time-boxed retention discount"],
  ["cancel", "One-click cancellation, always"],
  ["Webhooks + verify-webhook-signature", "Stay in sync with PayPal"],
];

/** What the label next to Maya says at each point in the story. */
function mayaLabel(u: number): string {
  const beat = Math.floor(u);
  const l = u - beat;
  switch (beat) {
    case 0:
      return "Maya, $22 a month";
    case 1:
      return l < 0.2 ? "Maya, $22 a month" : "Maya pressed cancel";
    case 2:
      return l < 0.66 ? "Maya, travelling" : "Offer: pause 2 months";
    case 3:
      return l < 0.3 ? "Paused for 2 months" : l < 0.58 ? "Lite, $12 a month" : "30% off for 3 months";
    case 5:
      return l < 0.33 ? "Maya accepts the pause" : l < 0.62 ? "Suspended on PayPal" : "Paused, back in 2 months";
    default:
      return "Maya, paused";
  }
}

export function Landing({ mcpUrl }: { mcpUrl: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mayaRef = useRef<HTMLDivElement>(null);
  const leoRef = useRef<HTMLDivElement>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  // --- guardrail playground: the real checkOffer(), run in the browser
  const [type, setType] = useState<ProposalType>("discount");
  const [pauseMonths, setPauseMonths] = useState(9);
  const [toTier, setToTier] = useState<"lite" | "premium">("lite");
  const [discountPct, setDiscountPct] = useState(50);
  const [discountMonths, setDiscountMonths] = useState(6);
  const [maxPause, setMaxPause] = useState(DEFAULT_POLICY.maxPauseMonths);
  const [maxDiscount, setMaxDiscount] = useState(DEFAULT_POLICY.maxDiscountPct);
  const [allowed, setAllowed] = useState<Record<ProposalType, boolean>>({ pause: true, downgrade: true, discount: true });

  const { verdict, guard } = useMemo(() => {
    const proposal: OfferProposal =
      type === "pause"
        ? { type, months: pauseMonths }
        : type === "downgrade"
          ? { type, toTier }
          : { type, discountPct, months: discountMonths };
    const policy = {
      ...DEFAULT_POLICY,
      maxPauseMonths: maxPause,
      maxDiscountPct: maxDiscount,
      allowPause: allowed.pause,
      allowDowngrade: allowed.downgrade,
      allowDiscount: allowed.discount,
    };
    const result = checkOffer(proposal, MAYA, policy, EMPTY_SESSION, [MAYA]);
    return { verdict: result, guard: guardView(proposal, { maxPause, maxDiscount }, result) };
  }, [type, pauseMonths, toTier, discountPct, discountMonths, maxPause, maxDiscount, allowed]);

  // --- the visitor plays Leo, the human behind the agent
  const [choice, setChoice] = useState<AgentChoice>(null);

  const guardRef = useRef<GuardView>(guard);
  const choiceRef = useRef<AgentChoice>(choice);
  useEffect(() => {
    guardRef.current = guard;
    choiceRef.current = choice;
  }, [guard, choice]);

  useEffect(() => {
    const root = rootRef.current;
    const mount = stageRef.current;
    if (!root || !mount) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scene: LandingScene | null = null;
    const unmount = mountScene(
      mount,
      (canvas, c) => import("../orrery/landing-scene").then((m) => m.createLandingScene(canvas, { calm: c })),
      (s) => (scene = s),
    );

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

    const pointer = { x: 0, y: 0 };
    const want = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      want.x = (e.clientX / window.innerWidth) * 2 - 1;
      want.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const labels: [HTMLDivElement | null, "maya" | "leo" | "gate" | "core"][] = [
      [mayaRef.current, "maya"],
      [leoRef.current, "leo"],
      [gateRef.current, "gate"],
      [coreRef.current, "core"],
    ];
    let mayaText = "";
    let smoothed = readU();
    let last = performance.now();
    let raf = 0;
    let beat = -1;
    const tick = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      const u = readU();
      smoothed = calm ? u : smoothed + (u - smoothed) * (1 - Math.exp(-dt * 8));
      const now = Math.min(beats.length - 1, Math.floor(smoothed));
      if (now !== beat) {
        beat = now;
        root.dataset.beat = String(beat);
      }
      for (const t of timed) {
        const on = smoothed >= t.from && smoothed < t.until;
        if (on !== t.on) {
          t.on = on;
          t.el.classList.toggle("on", on);
        }
      }
      pointer.x += (want.x - pointer.x) * Math.min(1, dt * 2.5);
      pointer.y += (want.y - pointer.y) * Math.min(1, dt * 2.5);
      if (scene) {
        scene.frame(time / 1000, dt, {
          u: smoothed,
          guard: guardRef.current,
          agentChoice: choiceRef.current,
          pointer: calm ? { x: 0, y: 0 } : pointer,
        });
        const anchors = scene.anchors();
        for (const [el, key] of labels) {
          if (!el) continue;
          const a = anchors[key];
          el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px)`;
          el.style.opacity = a.show.toFixed(2);
        }
        const text = mayaLabel(smoothed);
        if (text !== mayaText && mayaRef.current) {
          mayaText = text;
          mayaRef.current.firstElementChild!.textContent = text;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      unmount();
    };
  }, []);

  const verdictTone = verdict.ok ? (guard.verdict === "clamped" ? "offer" : "orbit") : "exit";

  return (
    <div ref={rootRef} className="lp" data-beat="0">
      <div ref={stageRef} className="orrery-mount lp-stage" aria-hidden="true" />
      <div className="lp-scrim" aria-hidden="true" />

      <div className="lp-labels" aria-hidden="true">
        <div ref={mayaRef} className="lp-tag">
          <span>Maya, $22 a month</span>
        </div>
        <div ref={leoRef} className="lp-tag">
          <span>Leo</span>
        </div>
        <div ref={gateRef} className="lp-tag lp-tag-up">
          <span>Your limit</span>
        </div>
        <div ref={coreRef} className="lp-tag lp-tag-up">
          <span>PayPal Subscriptions</span>
        </div>
      </div>

      {/* 0 hero */}
      <section className="lp-beat lp-hero" data-beat-id="hero">
        <div className="shell">
          <div className="lp-cap lp-cap-hero">
            <p className="lp-kicker">AI retention for PayPal Subscriptions</p>
            <h1 className="display lp-h1">Your subscribers are in orbit. Some are about to leave.</h1>
            <p className="lede">
              KeepAlive is the retention desk for merchants who bill with PayPal. When a subscriber, or their AI agent,
              heads for the exit, it learns why, makes one fair offer inside your limits, and carries it out on PayPal.
              The exit stays one click away.
            </p>
            <div className="lp-actions">
              <Link href="/agent" className="btn btn-solid">
                Watch two agents negotiate
              </Link>
              <Link href="/shop" className="btn btn-line">
                Try it as a subscriber
              </Link>
            </div>
          </div>
          <dl className="lp-legend">
            <div>
              <dt className="state state-orbit">Active</dt>
              <dd>Paying, on their plan&apos;s ring</dd>
            </div>
            <div>
              <dt className="state state-stasis">Paused</dt>
              <dd>Held in place, no charges</dd>
            </div>
            <div>
              <dt className="state state-offer">On an offer</dt>
              <dd>Discounted for a while</dd>
            </div>
            <div>
              <dt className="state state-exit">Leaving</dt>
              <dd>On the exit lane</dd>
            </div>
          </dl>
          <p className="lp-scroll">Scroll to follow one cancellation, from click to PayPal.</p>
        </div>
      </section>

      {/* 1 cancel */}
      <section className="lp-beat" id="cancel" data-beat-id="cancel" style={{ minHeight: "220svh" }}>
        <div className="shell">
          <div className="lp-cap">
            <h2 className="display lp-h2">One click, and twelve months walk out.</h2>
            <p>
              Maya pays Brewbox $22 a month through PayPal Subscriptions. Each mark on her ring is a month she would
              have paid. The cancel button does exactly what it says, and that is all there is.
            </p>
            <p>
              Cancel flows, pause offers and win-back discounts exist for Stripe, Braintree, Chargebee and Paddle.
              Merchants who bill through PayPal Subscriptions have no such layer.
            </p>
          </div>
        </div>
      </section>

      {/* 2 why */}
      <section className="lp-beat" id="why" data-beat-id="why" style={{ minHeight: "220svh" }}>
        <div className="shell">
          <div className="lp-cap">
            <h2 className="display lp-h2">First, ask why. Once.</h2>
            <p>Claude has one short, honest conversation, works out the real reason, and proposes one offer that fits it.</p>
            <div className="lp-chat">
              <p className="lp-bubble" data-at="0.2">
                <b>Maya</b>
                I&apos;m backpacking for two months, cancel my coffee.
              </p>
              <p className="lp-bubble lp-bubble-desk" data-at="0.52">
                <b>KeepAlive</b>
                Have a great trip! Want me to pause Brewbox for 2 months instead? No charges, and it restarts
                automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 offers */}
      <section className="lp-beat" id="offers" data-beat-id="offers" style={{ minHeight: "330svh" }}>
        <div className="shell">
          <div className="lp-cap">
            <h2 className="display lp-h2">Three ways to stay. Each one is a real PayPal call.</h2>
            <ol className="lp-offers">
              <li className="lp-offer" data-tone="stasis" data-at="0.02" data-until="0.3">
                <span className="lp-reason">&ldquo;I&apos;m travelling.&rdquo;</span>
                <strong>Pause for 2 months</strong>
                <span>
                  <code className="code">suspend</code> now, <code className="code">activate</code> when the pause ends.
                  No charges in between.
                </span>
              </li>
              <li className="lp-offer" data-tone="orbit" data-at="0.3" data-until="0.58">
                <span className="lp-reason">&ldquo;I have too much coffee.&rdquo;</span>
                <strong>Switch to Lite, $12 a month</strong>
                <span>
                  <code className="code">revise</code> the plan. Maya approves the change again inside PayPal.
                </span>
              </li>
              <li className="lp-offer" data-tone="offer" data-at="0.58" data-until="1.01">
                <span className="lp-reason">&ldquo;It costs too much.&rdquo;</span>
                <strong>30% off for 3 months</strong>
                <span>
                  <code className="code">PATCH</code> the price, then restore it when the discount runs out.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 4 guardrails */}
      <section className="lp-beat" id="guardrails" data-beat-id="guardrails" style={{ minHeight: "250svh" }}>
        <div className="shell">
          <div className="lp-cap lp-cap-wide">
            <h2 className="display lp-h2">The AI proposes. Your limits decide.</h2>
            <p>
              Every offer passes through a deterministic check before it can reach PayPal. The ring standing in the lane
              is your limit: an offer that is too big gets cut down to fit, or turned back. The model never holds PayPal
              credentials. Try to get a bad offer through.
            </p>

            <div className="panel lp-lab">
              <fieldset>
                <legend>The AI asks for</legend>
                <div className="seg" role="radiogroup" aria-label="Offer type">
                  {(
                    [
                      ["pause", "Pause"],
                      ["downgrade", "Switch plan"],
                      ["discount", "Discount"],
                    ] as [ProposalType, string][]
                  ).map(([value, label]) => (
                    <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => setType(value)}>
                      {label}
                    </button>
                  ))}
                </div>
                {type === "pause" && (
                  <Slider label="Pause length" value={pauseMonths} min={1} max={12} unit=" months" onChange={setPauseMonths} />
                )}
                {type === "downgrade" && (
                  <div className="seg" role="radiogroup" aria-label="Target plan">
                    {(
                      [
                        ["lite", "To Lite, $12"],
                        ["premium", "To Premium, $36"],
                      ] as ["lite" | "premium", string][]
                    ).map(([value, label]) => (
                      <button key={value} type="button" role="radio" aria-checked={toTier === value} onClick={() => setToTier(value)}>
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
                <label className="lp-toggle">
                  <input
                    type="checkbox"
                    checked={allowed[type]}
                    onChange={(e) => setAllowed({ ...allowed, [type]: e.target.checked })}
                  />
                  <span>
                    {type === "pause" ? "Pauses allowed" : type === "downgrade" ? "Plan switches allowed" : "Discounts allowed"}
                  </span>
                </label>
                <Slider label="Longest pause" value={maxPause} min={1} max={6} unit=" months" onChange={setMaxPause} />
                <Slider label="Biggest discount" value={maxDiscount} min={5} max={75} step={5} unit="%" onChange={setMaxDiscount} />
              </fieldset>

              <div className="lp-verdict" data-tone={verdictTone} aria-live="polite">
                {verdict.ok ? (
                  <>
                    <strong className={`state state-${verdictTone}`}>
                      {guard.verdict === "clamped" ? "Cut down to fit" : "Approved as asked"}
                    </strong>
                    <span className="lp-verdict-offer">{verdict.offer.label}</span>
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
                    <strong className="state state-exit">Turned back</strong>
                    <span>{verdict.reason}. Nothing reaches PayPal.</span>
                  </>
                )}
              </div>
              <p className="lp-fine">
                This panel runs <code className="code">checkOffer()</code> from <code className="code">src/lib/policy.ts</code>,
                the same function the server uses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 paypal */}
      <section className="lp-beat" id="paypal" data-beat-id="paypal" style={{ minHeight: "240svh" }}>
        <div className="shell">
          <div className="lp-cap">
            <h2 className="display lp-h2">Done on PayPal, then read back.</h2>
            <p>
              Accepting an offer runs the matching Subscriptions call. KeepAlive reads the subscription back from PayPal
              before it tells anyone it worked.
            </p>
            <ol className="lp-tape">
              <li data-at="0.17">
                <code className="code">POST /v1/billing/subscriptions/I-…/suspend</code>
                <span>204 No Content</span>
              </li>
              <li data-at="0.48">
                <code className="code">GET /v1/billing/subscriptions/I-…</code>
                <span>status: SUSPENDED</span>
              </li>
              <li data-at="0.64" className="lp-tape-done">
                Paused on PayPal. Resumes in 2 months.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 6 agent */}
      <section className="lp-beat" id="agent" data-beat-id="agent" style={{ minHeight: "330svh" }}>
        <div className="shell">
          <div className="lp-cap">
            <h2 className="display lp-h2">Soon the click comes from their AI.</h2>
            <p>
              A subscriber&apos;s own agent can ask to cancel over MCP. It gets the same offers under the same limits, and
              it must ask its human before it accepts anything.
            </p>
            <ol className="lp-talk">
              <li data-at="0.2">
                <b>Leo&apos;s agent</b>
                <code className="code">request_cancellation</code>
                <span>Too much coffee. Bags are piling up.</span>
              </li>
              <li data-at="0.42">
                <b>KeepAlive</b>
                <span>One offer: switch to Lite, $12 a month.</span>
              </li>
              <li data-at="0.58">
                <b>Leo&apos;s agent</b>
                <code className="code">ask_my_human</code>
                <span>You are Leo. Accept the switch to Lite?</span>
                {choice === null && (
                  <span className="lp-ask">
                    <button type="button" className="btn btn-orbit btn-sm" onClick={() => setChoice("approve")}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-exit btn-sm" onClick={() => setChoice("cancel")}>
                      Just cancel
                    </button>
                  </span>
                )}
              </li>
              {choice !== null && (
                <li className="on">
                  <b>Leo&apos;s agent</b>
                  <code className="code">{choice === "approve" ? "accept_offer" : "cancel_subscription"}</code>
                  <span>
                    {choice === "approve"
                      ? "PayPal sends Leo an approval link. Plan changes always need the human's consent inside PayPal."
                      : "Cancelled on PayPal. One decline, no second pitch."}
                  </span>
                  <button type="button" className="lp-link" onClick={() => setChoice(null)}>
                    Ask me again
                  </button>
                </li>
              )}
            </ol>
          </div>
        </div>
      </section>

      {/* 7 close */}
      <section className="lp-beat lp-close" id="close" data-beat-id="close">
        <div className="shell">
          <div className="lp-cap lp-cap-wide">
            <h2 className="display lp-h2">The exit is always open.</h2>
            <p>
              If someone wants to go, one decline and it is cancelled on PayPal. No maze and no guilt. KeepAlive only
              earns a save by making a better offer.
            </p>
            <div className="lp-actions">
              <Link href="/agent" className="btn btn-solid">
                Watch two agents negotiate
              </Link>
              <Link href="/shop" className="btn btn-line">
                Try it as a subscriber
              </Link>
              <Link href="/merchant" className="btn btn-line">
                Open the merchant desk
              </Link>
            </div>

            <div className="lp-built">
              <div>
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
              </div>
              <div>
                <h3>Connect your own agent over MCP</h3>
                <code className="code lp-cmd">npx -y mcp-remote {mcpUrl}</code>
                <p className="lp-fine">
                  Payments run in the PayPal sandbox and the AI is Claude. The orrery on this page is a model of the
                  product and calls nothing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
