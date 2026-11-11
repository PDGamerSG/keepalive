import type { ConsoleState, KeyName } from "./stage";

/**
 * The landing page's script: scroll position (in beats) → what the desk shows.
 * Beats: 0 hero, 1 cancel, 2 why, 3 offers, 4 guardrails, 5 PayPal, 6 agent, 7 close.
 */

export const BEAT = { hero: 0, cancel: 1, why: 2, offers: 3, guardrails: 4, paypal: 5, agent: 6, close: 7 } as const;

/** What the guardrail playground decided, reduced to what the desk can show. */
export interface GuardView {
  ok: boolean;
  type: "pause" | "downgrade" | "discount";
  months: number;
  pct: number;
  label: string;
  /** Knob positions, 0..1: max pause months and max discount percent. */
  knobs: [number, number];
}

export type AgentChoice = "approve" | "cancel" | null;

export interface StoryContext {
  guard: GuardView;
  agentChoice: AgentChoice;
}

/** A visitor pressing the keys themselves. Lasts until they scroll to another beat. */
export interface Manual {
  beat: number;
  cancelled: boolean;
  offer: Exclude<KeyName, "cancel"> | null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (v: number, a: number, b: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
/** 0 → 1 between `a` and `b`, back to 0 by `c`: one key press. */
const tap = (v: number, a: number, b: number, c: number) => (v < b ? ramp(v, a, b) : 1 - ramp(v, b, c));

const STANDARD: [string, string] = ["ACTIVE", "Standard  $22.00/mo"];

function base(knobs: [number, number]): ConsoleState {
  return {
    cancel: 0,
    pauseMonths: 0,
    lite: false,
    discountMonths: 0,
    discountPct: 30,
    press: { cancel: 0, pause: 0, switch: 0, discount: 0 },
    glow: null,
    lamp: "active",
    lcd: STANDARD,
    hub: ["$22", "a month"],
    knobs,
    bot: { show: 0, press: 0 },
  };
}

const paused = (s: ConsoleState, months = 2) => {
  s.pauseMonths = months;
  s.lamp = "saved";
  s.lcd = ["SUSPENDED", `resumes in ${months} month${months === 1 ? "" : "s"}`];
  s.hub = ["$0", `for ${months} month${months === 1 ? "" : "s"}`];
};
const switched = (s: ConsoleState) => {
  s.lite = true;
  s.lamp = "saved";
  s.lcd = ["ACTIVE", "Lite  $12.00/mo"];
  s.hub = ["$12", "a month"];
};
const discounted = (s: ConsoleState, pct = 30, months = 3) => {
  const price = Math.round(22 * (100 - pct)) / 100;
  s.discountPct = pct;
  s.discountMonths = months;
  s.lamp = "saved";
  s.lcd = ["ACTIVE", `$${price.toFixed(2)}/mo for ${months} mo`];
  s.hub = [`$${price.toFixed(2)}`, `for ${months} month${months === 1 ? "" : "s"}`];
};
const cancelled = (s: ConsoleState, note = "POST .../cancel  204") => {
  s.lamp = "cancelled";
  s.lcd = ["CANCELLED", note];
  s.hub = ["$0", "cancelled"];
};

export function scripted(u: number, ctx: StoryContext): ConsoleState {
  const s = base(ctx.guard.knobs);
  const beat = Math.floor(u);
  const l = u - beat;

  switch (beat) {
    case BEAT.hero:
      s.glow = "cancel";
      break;

    case BEAT.cancel:
      s.press.cancel = tap(l, 0.2, 0.27, 0.36);
      s.cancel = ramp(l, 0.28, 0.8);
      if (l < 0.2) s.glow = "cancel";
      if (l >= 0.27) cancelled(s);
      break;

    case BEAT.why:
      s.cancel = 1 - ramp(l, 0, 0.16);
      if (l < 0.1) cancelled(s);
      else if (l < 0.45) s.lcd = ["CANCEL ASKED", "listening for the reason"];
      else if (l < 0.7) s.lcd = ["REASON", "temporary break: travel"];
      else {
        s.lcd = ["OFFER", "Pause for 2 months"];
        s.glow = "pause";
      }
      break;

    case BEAT.offers:
      s.press.pause = tap(l, 0.05, 0.09, 0.15);
      s.press.switch = tap(l, 0.31, 0.35, 0.41);
      s.press.discount = tap(l, 0.59, 0.63, 0.69);
      if (l < 0.09) {
        s.lcd = ["OFFER", "Pause for 2 months"];
        s.glow = "pause";
      } else if (l < 0.29) paused(s);
      else if (l < 0.35) {
        s.lcd = ["OFFER", "Switch to Lite $12/mo"];
        s.glow = "switch";
      } else if (l < 0.57) switched(s);
      else if (l < 0.63) {
        s.lcd = ["OFFER", "30% off for 3 months"];
        s.glow = "discount";
      } else discounted(s);
      break;

    case BEAT.guardrails: {
      const g = ctx.guard;
      if (!g.ok) {
        s.lcd = ["REJECTED", "nothing reaches PayPal"];
        break;
      }
      if (g.type === "pause") paused(s, g.months);
      else if (g.type === "downgrade") switched(s);
      else discounted(s, g.pct, g.months);
      s.lcd = ["APPROVED", g.label];
      break;
    }

    case BEAT.paypal:
      s.press.pause = tap(l, 0.12, 0.17, 0.24);
      if (l < 0.17) {
        s.lcd = ["ACCEPTED", "Pause for 2 months"];
        s.glow = "pause";
      } else {
        paused(s);
        if (l < 0.5) {
          s.lamp = "active";
          s.lcd = ["POST .../suspend", "204 No Content"];
        } else s.lcd = ["GET subscription", "status: SUSPENDED"];
      }
      break;

    case BEAT.agent:
      s.bot.show = ramp(l, 0, 0.16);
      s.bot.press = tap(l, 0.2, 0.25, 0.33);
      if (l >= 0.25 && l < 0.45) s.lcd = ["MCP REQUEST", "request_cancellation"];
      else if (l >= 0.45 && l < 0.6) {
        s.lcd = ["OFFER", "Switch to Lite $12/mo"];
        s.glow = "switch";
      } else if (l >= 0.6) {
        if (ctx.agentChoice === "approve") {
          switched(s);
          s.lcd = ["REVISE SENT", "approve inside PayPal"];
        } else if (ctx.agentChoice === "cancel") {
          s.cancel = 1;
          cancelled(s);
        } else {
          s.lcd = ["ASK MY HUMAN", "waiting for approval"];
          s.glow = "switch";
        }
      }
      break;

    case BEAT.close:
      s.bot.show = 1 - ramp(l, 0, 0.22);
      if (l > 0.25) s.glow = "cancel";
      break;
  }
  return s;
}

export function manualState(m: Manual, ctx: StoryContext): ConsoleState {
  const s = base(ctx.guard.knobs);
  if (m.cancelled) {
    s.cancel = 1;
    cancelled(s, "one click, no argument");
  } else if (m.offer === "pause") paused(s);
  else if (m.offer === "switch") switched(s);
  else if (m.offer === "discount") discounted(s);
  return s;
}
