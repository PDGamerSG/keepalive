import * as THREE from "three";
import type { AgentChoice, GuardView } from "../landing/story";
import {
  Beam,
  BodyField,
  clamp01,
  color,
  createWorld,
  hash01,
  heartbeat,
  lerp,
  makeCore,
  makeDust,
  makeLane,
  makeRing,
  makeStars,
  onRing,
  orbitSpeed,
  Pulses,
  ramp,
  smooth,
  Trail,
} from "./engine";

/**
 * The landing page's orrery. Brewbox's subscribers orbit on three plan rings.
 * Maya leaves along the exit lane, is asked why, is offered three ways to stay,
 * meets the merchant's limits (the gate in the lane), and is paused on PayPal.
 * Then Leo's AI agent arrives. Scroll position drives all of it; nothing here
 * calls an API.
 */

export interface LandingInput {
  /** Scroll position in beats (0..7, fractional). */
  u: number;
  guard: GuardView;
  agentChoice: AgentChoice;
  /** Pointer, -1..1 on both axes, for a little parallax. */
  pointer: { x: number; y: number };
}

export interface Anchor {
  x: number;
  y: number;
  show: number;
}

export interface LandingScene {
  frame(time: number, dt: number, input: LandingInput): void;
  anchors(): Record<"maya" | "leo" | "gate" | "core", Anchor>;
  dispose(): void;
}

const RING = { lite: 3.4, standard: 5.0, premium: 6.6 } as const;
const LANE_ANGLE = 0.62;
const LEO_ANGLE = -0.2;
const GATE_R = 7.5;
const DECIDE_R = 8.4;
const BEAT_PERIOD = 1.55;

const at = (r: number, a = LANE_ANGLE, y = 0) => onRing(r, a, new THREE.Vector3(), y);
const MAYA_HOME = at(RING.standard);
const MAYA_LITE = at(RING.lite);
const DECIDE = at(DECIDE_R, LANE_ANGLE, 0.15);
const GATE = at(GATE_R, LANE_ANGLE, 0.15);
const LEO_HOME = at(RING.standard, LEO_ANGLE);

type V = [number, number, number];
/** Camera per beat: [position, target]. The text column is on the left, so shots sit right of centre. */
const SHOTS: [V, V][] = [
  [[-0.4, 11.2, 21.5], [-4.2, -1.2, 0.8]], // hero: the whole business
  [[0.2, 9.0, 20.5], [0.2, -0.8, 1.0]], // cancel: the lane opens
  [[4.5, 3.6, 16.5], [1.6, 0.6, 2.4]], // why: low, toward the decision point
  [[0.0, 8.6, 19.5], [-0.6, -0.6, 1.0]], // offers
  [[-2.1, 2.65, 2.15], [7.86, 0.3, 1.93]], // guardrails: from behind the core, out through the gate
  [[1.0, 6.6, 18.5], [-0.4, 0.0, 1.2]], // PayPal
  [[0.2, 6.4, 16.0], [0.0, 0.8, 0.4]], // agent
  [[-2.2, 12.5, 21.5], [-3.6, -1.4, 0.0]], // close: pulled back
];

const C = {
  orbit: color("orbit"),
  stasis: color("stasis"),
  offer: color("offer"),
  exit: color("exit"),
  core: color("core"),
  coreDeep: color("coreDeep"),
  paypal: color("paypal"),
  paypalDeep: new THREE.Color("#12307a"),
  ink: color("ink"),
  dim: color("dim"),
};

interface Ambient {
  ring: number;
  angle: number;
  r: number;
  y: number;
  speed: number;
  size: number;
  tone: THREE.Color;
  alpha: number;
  frozen: boolean;
}

function ambientBodies(): Ambient[] {
  const out: Ambient[] = [];
  const counts: [number, number][] = [
    [RING.lite, 38],
    [RING.standard, 58],
    [RING.premium, 44],
  ];
  let n = 0;
  for (const [radius, count] of counts) {
    for (let i = 0; i < count; i++) {
      const h = (k: number) => hash01(`ambient-${n}`, k);
      const roll = h(1);
      const frozen = roll < 0.1;
      const tone = frozen ? C.stasis : roll < 0.18 ? C.offer : C.orbit;
      const angle = (i / count) * Math.PI * 2 + (h(2) - 0.5) * 0.5;
      // keep Maya's and Leo's spots clear so they read on their own
      const clear = radius === RING.standard && (Math.abs(angle - LANE_ANGLE) < 0.22 || Math.abs(angle - (LEO_ANGLE + Math.PI * 2)) < 0.22);
      if (!clear) {
        out.push({
          ring: radius,
          angle,
          r: radius + (h(3) - 0.5) * 0.24,
          y: (h(4) - 0.5) * 0.12,
          speed: orbitSpeed(radius) * (0.92 + h(5) * 0.16),
          size: 0.3 + h(6) * 0.16 + (radius === RING.premium ? 0.06 : 0),
          tone,
          alpha: 0.62 + h(7) * 0.3,
          frozen,
        });
      }
      n++;
    }
  }
  // a few who already left, drifting away
  for (let i = 0; i < 9; i++) {
    const h = (k: number) => hash01(`gone-${i}`, k);
    out.push({
      ring: 0,
      angle: Math.PI * 0.6 + h(1) * Math.PI * 1.2,
      r: 8.6 + h(2) * 4,
      y: (h(3) - 0.5) * 0.8,
      speed: 0.004,
      size: 0.3,
      tone: C.exit,
      alpha: 0.32,
      frozen: false,
    });
  }
  return out;
}

export async function createLandingScene(canvas: HTMLCanvasElement, { calm }: { calm: boolean }): Promise<LandingScene> {
  const world = createWorld(canvas, { fov: 36, bloom: 0.8, maxDpr: 1.5 });
  const { scene, camera } = world;

  // --- the business
  const core = makeCore(1.05);
  scene.add(core.group);
  const pulses = new Pulses(6);
  scene.add(pulses.group);
  const rings = {
    lite: makeRing(RING.lite, { tickStart: LANE_ANGLE }),
    standard: makeRing(RING.standard, { tickStart: LANE_ANGLE, opacity: 0.28 }),
    premium: makeRing(RING.premium, { tickStart: LANE_ANGLE }),
  };
  for (const r of Object.values(rings)) scene.add(r.group);
  const dust = makeDust(2600, 1.6, 12, world.pointScale);
  scene.add(dust.points);
  scene.add(makeStars(900, 160));

  const lane = makeLane(at(RING.standard - 0.2), at(19), 0.46);
  scene.add(lane.mesh);

  // --- the gate: the merchant's limits, standing in the lane
  const gate = new THREE.Group();
  const gateFrame = new THREE.Mesh(
    new THREE.TorusGeometry(1.0, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const gateLimit = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.035, 12, 180),
    new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const gateDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  gate.add(gateFrame, gateDisc, gateLimit);
  gate.position.copy(GATE);
  gate.rotation.y = Math.PI / 2 - LANE_ANGLE;
  scene.add(gate);

  // --- Leo's agent: a small system of its own
  const agent = makeCore(0.3, new THREE.Color("#dcd4ff"), new THREE.Color("#4b3cc4"));
  const agentRing = makeRing(0.75, { ticks: 4, opacity: 0.5 });
  agentRing.group.rotation.x = 0.5;
  agent.group.add(agentRing.group);
  scene.add(agent.group);

  // --- moving parts
  const ambient = ambientBodies();
  const IDX = { maya: ambient.length, leo: ambient.length + 1, packet: ambient.length + 2, packet2: ambient.length + 3 };
  const bodies = new BodyField(ambient.length + 4, world.pointScale);
  scene.add(bodies.points);
  const talk = new Beam(C.core.clone());
  const agentLink = new Beam(C.core.clone());
  scene.add(talk.line, agentLink.line);
  const mayaTrail = new Trail(46, C.exit);
  const leoTrail = new Trail(46, C.exit);
  scene.add(mayaTrail.line, leoTrail.line);

  // --- camera state
  const camPos = new THREE.Vector3(...SHOTS[0][0]);
  const camTarget = new THREE.Vector3(...SHOTS[0][1]);
  const wantPos = new THREE.Vector3();
  const wantTarget = new THREE.Vector3();
  const sa = new THREE.Vector3();
  const sb = new THREE.Vector3();

  // --- scratch
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  const tone = new THREE.Color();
  const tone2 = new THREE.Color();
  let lastPhase = 0;
  let tickKey = "";
  let choiceSeen: AgentChoice = null;
  let choiceAt = -10;
  let lastChoice: AgentChoice = null;
  let elapsed = 0;
  let gateClock = 0;
  const anchors: Record<"maya" | "leo" | "gate" | "core", Anchor> = {
    maya: { x: 0, y: 0, show: 0 },
    leo: { x: 0, y: 0, show: 0 },
    gate: { x: 0, y: 0, show: 0 },
    core: { x: 0, y: 0, show: 0 },
  };
  const mayaPos = new THREE.Vector3();
  const leoPos = new THREE.Vector3();

  function paintTicks(key: string, paint: (i: number) => THREE.Color | null) {
    if (key === tickKey) return;
    tickKey = key;
    rings.standard.paintTicks(paint);
  }

  function frame(time: number, dt: number, input: LandingInput) {
    elapsed += dt;
    const t = elapsed;
    const u = Math.max(0, Math.min(7.999, input.u));
    const beat = Math.floor(u);
    const l = u - beat;
    const aspect = world.width() / world.height();
    const narrow = aspect < 0.95;

    // ---- heartbeat
    const phase = (t % BEAT_PERIOD) / BEAT_PERIOD;
    if (phase < lastPhase) pulses.emit(1.1, 12.5, beat === 5 ? C.paypal : C.core);
    lastPhase = phase;
    const thump = heartbeat(phase);
    pulses.update(dt, 3.6);

    const paypalTint = beat === 5 ? ramp(l, 0.1, 0.2) * (1 - ramp(l, 0.8, 0.98)) : 0;
    tone.copy(C.core).lerp(C.paypal, paypalTint);
    tone2.copy(C.coreDeep).lerp(C.paypalDeep, paypalTint);
    core.tint(tone, tone2);
    core.update(t, thump);
    dust.update(t);

    // ---- camera: hold each shot, glide to the next near the end of a beat
    const k = beat;
    const f = smooth(clamp01((l - 0.62) / 0.38));
    const next = Math.min(SHOTS.length - 1, k + 1);
    wantPos.copy(sa.set(...SHOTS[k][0])).lerp(sb.set(...SHOTS[next][0]), f);
    wantTarget.copy(sa.set(...SHOTS[k][1])).lerp(sb.set(...SHOTS[next][1]), f);
    if (narrow) {
      // phones: text sits below, so centre the action and step back
      wantTarget.x += 4;
      wantTarget.y -= 1.8;
      wantPos.sub(wantTarget).multiplyScalar(aspect < 0.7 ? 2.1 : 1.5).add(wantTarget);
    }
    wantPos.x += input.pointer.x * 0.7;
    wantPos.y += input.pointer.y * 0.45;
    const ease = calm ? 1 : 1 - Math.exp(-dt * 3.2);
    camPos.lerp(wantPos, ease);
    camTarget.lerp(wantTarget, ease);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // ---- lane
    const laneOpen =
      beat === 0 ? 0.42 : beat === 1 ? lerp(0.28, 0.95, ramp(l, 0.1, 0.3)) : beat === 7 ? lerp(0.5, 0.9, ramp(l, 0.2, 0.5)) : 0.5;
    lane.update(t, laneOpen, beat === 1 ? 0.9 : 0.45);

    // ---- Maya
    let mayaTone = C.orbit;
    let mayaSize = 0.62;
    let halo = 0;
    let trail = 0;
    let blend = 0;
    switch (beat) {
      case 0:
        mayaPos.copy(MAYA_HOME);
        mayaPos.y += Math.sin(t * 1.4) * 0.05;
        break;
      case 1: {
        const m = smooth(ramp(l, 0.22, 0.7));
        mayaPos.copy(MAYA_HOME).lerp(DECIDE, m);
        blend = ramp(l, 0.12, 0.26);
        tone.copy(C.orbit).lerp(C.exit, blend);
        mayaTone = tone;
        trail = m > 0.001 ? 1 : 0;
        break;
      }
      case 2:
        mayaPos.copy(DECIDE);
        mayaPos.y += Math.sin(t * 1.6) * 0.06;
        tone.copy(C.exit).lerp(C.offer, ramp(l, 0.66, 0.8));
        mayaTone = tone;
        trail = 1 - ramp(l, 0, 0.2);
        break;
      case 3:
        if (l < 0.3) {
          const m = ramp(l, 0.05, 0.18);
          mayaPos.copy(DECIDE).lerp(MAYA_HOME, m);
          tone.copy(C.offer).lerp(C.stasis, m);
          halo = m;
        } else if (l < 0.58) {
          const m = ramp(l, 0.32, 0.44);
          mayaPos.copy(MAYA_HOME).lerp(MAYA_LITE, m);
          tone.copy(C.stasis).lerp(C.orbit, m);
          mayaSize = lerp(0.62, 0.46, m);
          halo = 1 - m;
        } else {
          const m = ramp(l, 0.6, 0.72);
          mayaPos.copy(MAYA_LITE).lerp(MAYA_HOME, m);
          tone.copy(C.orbit).lerp(C.offer, m);
          mayaSize = lerp(0.46, 0.62, m);
        }
        mayaTone = tone;
        break;
      case 4: {
        const m = ramp(l, 0, 0.12);
        mayaPos.copy(MAYA_HOME).lerp(DECIDE, m);
        mayaPos.y += Math.sin(t * 1.6) * 0.05 * m;
        mayaTone = C.offer;
        break;
      }
      case 5: {
        const m = ramp(l, 0.02, 0.14);
        mayaPos.copy(DECIDE).lerp(MAYA_HOME, m);
        const done = ramp(l, 0.3, 0.36);
        tone.copy(C.offer).lerp(C.stasis, done);
        mayaTone = tone;
        halo = ramp(l, 0.62, 0.7);
        break;
      }
      default:
        mayaPos.copy(MAYA_HOME);
        mayaTone = C.stasis;
        halo = 1;
    }
    if (halo > 0 && !calm) mayaSize *= 1 + halo * 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
    mayaSize *= 1 + pulses.wash(Math.hypot(mayaPos.x, mayaPos.z)) * 0.25;
    bodies.set(IDX.maya, mayaPos, mayaTone, mayaSize * (1 + halo * 0.5), 1);
    mayaTrail.push(mayaPos);
    mayaTrail.style(C.exit, trail * 0.9);

    // ---- the months on Maya's ring
    if (beat === 1) {
      const lit = Math.floor(ramp(l, 0.28, 0.82) * 12.99);
      paintTicks(`c${lit}`, (i) => (i < lit ? C.exit : null));
    } else if (beat === 3 && l < 0.3) {
      const on = l > 0.14;
      paintTicks(`p${on}`, (i) => (on && i >= 1 && i <= 2 ? C.stasis : null));
    } else if (beat === 3 && l >= 0.6) {
      const on = l > 0.7;
      paintTicks(`d${on}`, (i) => (on && i >= 1 && i <= 3 ? C.offer : null));
    } else if (beat >= 5) {
      const on = beat > 5 || l > 0.66;
      paintTicks(`s${on}`, (i) => (on && i >= 1 && i <= 2 ? C.stasis : null));
    } else {
      paintTicks("none", () => null);
    }

    // ---- conversation and PayPal: packets on a filament between core and Maya
    let talkOpacity = 0;
    let packetShow = 0;
    let packetTone = C.ink;
    let packetT = 0;
    let towardCore = false;
    if (beat === 2) {
      talkOpacity = ramp(l, 0.1, 0.2) * 0.55;
      if (l > 0.18 && l < 0.36) {
        packetT = ramp(l, 0.2, 0.34);
        towardCore = true;
        packetShow = 1;
        packetTone = C.exit;
      } else if (l > 0.5 && l < 0.68) {
        packetT = ramp(l, 0.52, 0.66);
        packetShow = 1;
        packetTone = C.offer;
      }
    } else if (beat === 5) {
      talkOpacity = ramp(l, 0.1, 0.16) * (1 - ramp(l, 0.72, 0.85)) * 0.75;
      if (l > 0.15 && l < 0.34) {
        packetT = ramp(l, 0.17, 0.33);
        packetShow = 1;
        packetTone = C.paypal;
      } else if (l > 0.46 && l < 0.64) {
        packetT = ramp(l, 0.48, 0.62);
        towardCore = true;
        packetShow = 1;
        packetTone = C.paypal;
      }
    } else if (beat === 3) {
      talkOpacity = (1 - ramp(l, 0, 0.1)) * 0.55;
    }
    q.copy(mayaPos);
    talk.set(p.set(0, 0, 0), q, 1.4, talkOpacity, beat === 5 ? C.paypal : C.core);

    // ---- gate
    const g = input.guard;
    const gateShow = beat === 4 ? ramp(l, 0.04, 0.16) * (1 - ramp(l, 0.86, 0.99)) : beat === 3 ? ramp(l, 0.9, 1) * 0.4 : 0;
    gate.visible = gateShow > 0.001;
    const radiusFor = (s: number) => 0.27 + 0.93 * s;
    let gateFlash = 0;
    let flashTone = C.ink;
    if (beat === 4 && gateShow > 0.5) {
      gateClock += dt;
      const period = 3.1;
      const gp = (gateClock % period) / period;
      const rejected = g.verdict === "rejected";
      const r = rejected
        ? gp < 0.5
          ? lerp(1.4, GATE_R - 0.25, ramp(gp, 0.05, 0.5))
          : lerp(GATE_R - 0.25, GATE_R - 1.8, ramp(gp, 0.5, 0.78))
        : lerp(1.4, DECIDE_R - 0.25, ramp(gp, 0.05, 0.74));
      const squeeze = g.verdict === "clamped" ? ramp(r, GATE_R - 1.4, GATE_R - 0.1) : 0;
      const s = lerp(g.asked, g.passed, squeeze);
      onRing(r, LANE_ANGLE, p, 0.15);
      const fade = rejected ? 1 - ramp(gp, 0.72, 0.84) : 1 - ramp(gp, 0.74, 0.8);
      packetShow = fade * ramp(gp, 0.03, 0.08);
      packetTone = rejected && gp > 0.5 ? C.exit : C.offer;
      bodies.set(IDX.packet, p, packetTone, radiusFor(s) / 0.26, packetShow * 0.8);
      const near = Math.exp(-Math.pow((r - GATE_R) / 0.45, 2));
      gateFlash = near;
      flashTone = rejected ? C.exit : g.verdict === "clamped" ? C.offer : C.orbit;
      if (!rejected && gp > 0.74 && gp < 0.86) {
        // Maya receives the offer
        bodies.set(IDX.maya, mayaPos, C.offer, mayaSize * (1.25 + 0.4 * (1 - ramp(gp, 0.74, 0.86))), 1);
      }
    } else {
      gateClock = 0;
      if (packetShow > 0) {
        if (towardCore) talk.pointAt(1 - packetT, p);
        else talk.pointAt(packetT, p);
        bodies.set(IDX.packet, p, packetTone, 0.55, packetShow * Math.sin(Math.PI * clamp01(packetT * 0.98 + 0.01)));
      } else bodies.set(IDX.packet, p.set(0, -50, 0), C.ink, 0, 0);
    }
    const limitR = radiusFor(g.limit);
    gateLimit.scale.setScalar(limitR);
    gateDisc.scale.setScalar(limitR);
    gateFrame.scale.setScalar(radiusFor(1) + 0.12);
    tone.copy(C.ink).lerp(flashTone, gateFlash);
    (gateLimit.material as THREE.MeshBasicMaterial).color.copy(tone);
    (gateLimit.material as THREE.MeshBasicMaterial).opacity = gateShow * (0.55 + gateFlash * 0.45);
    (gateDisc.material as THREE.MeshBasicMaterial).color.copy(tone);
    (gateDisc.material as THREE.MeshBasicMaterial).opacity = gateShow * (0.05 + gateFlash * 0.14);
    (gateFrame.material as THREE.MeshBasicMaterial).opacity = gateShow * 0.3;

    // ---- Leo and his agent
    const agentShow = beat === 6 ? ramp(l, 0.0, 0.16) : beat === 7 ? 1 - ramp(l, 0, 0.22) : 0;
    if (input.agentChoice !== choiceSeen) {
      choiceSeen = input.agentChoice;
      choiceAt = t;
      if (input.agentChoice) lastChoice = input.agentChoice;
    }
    const sinceChoice = t - choiceAt;
    let leoTone = C.orbit;
    let leoSize = 0.56;
    let leoAlpha = 0.95;
    let leoTrailOn = 0;
    const leaving = beat >= 6 && input.agentChoice === "cancel";
    const switching = beat >= 6 && input.agentChoice === "approve";
    if (switching) {
      const m = smooth(clamp01(sinceChoice / 1.3));
      leoPos.copy(LEO_HOME).lerp(at(RING.lite, LEO_ANGLE), m);
      leoSize = lerp(0.56, 0.44, m);
    } else if (leaving) {
      const m = smooth(clamp01(sinceChoice / 2.6));
      leoPos.copy(LEO_HOME).lerp(at(13, LEO_ANGLE, 0.2), m);
      leoTone = tone2.copy(C.orbit).lerp(C.exit, clamp01(sinceChoice / 0.5));
      leoAlpha = lerp(0.95, 0.35, m);
      leoTrailOn = 1 - ramp(sinceChoice, 2.2, 3.2);
    } else {
      // returning (after "ask me again") or waiting
      const back = lastChoice && sinceChoice < 1.2 ? 1 - smooth(sinceChoice / 1.2) : 0;
      leoPos.copy(LEO_HOME);
      if (back > 0) leoPos.lerp(lastChoice === "approve" ? at(RING.lite, LEO_ANGLE) : at(13, LEO_ANGLE, 0.2), back);
      if (beat === 6 && l > 0.42 && l < 0.6) leoTone = tone2.copy(C.orbit).lerp(C.offer, 0.7);
    }
    leoSize *= 1 + pulses.wash(Math.hypot(leoPos.x, leoPos.z)) * 0.25;
    bodies.set(IDX.leo, leoPos, leoTone, leoSize, leoAlpha);
    leoTrail.push(leoPos);
    leoTrail.style(C.exit, leoTrailOn * 0.8);

    agent.group.visible = agentShow > 0.01;
    agent.group.position.set(leoPos.x * 0.92, lerp(-4, 2.5, smooth(agentShow)), leoPos.z * 0.92 + 0.6);
    agent.group.scale.setScalar(Math.max(0.001, agentShow));
    agent.update(t + 3, heartbeat(((t + 0.4) % 1.1) / 1.1) * 0.6);
    agentRing.group.rotation.y = t * 0.8;
    // the agent talks to the merchant's core
    let linkOpacity = agentShow * 0.55;
    let linkPacket = 0;
    let linkT = 0;
    let linkUp = false;
    let linkTone = C.core;
    if (beat === 6) {
      if (l > 0.18 && l < 0.34) {
        linkT = ramp(l, 0.2, 0.32);
        linkUp = true;
        linkPacket = 1;
        linkTone = C.exit;
      } else if (l > 0.4 && l < 0.56) {
        linkT = ramp(l, 0.42, 0.54);
        linkPacket = 1;
        linkTone = C.offer;
      } else if (input.agentChoice && sinceChoice < 1.1) {
        linkT = clamp01(sinceChoice / 0.9);
        linkUp = true;
        linkPacket = 1;
        linkTone = input.agentChoice === "approve" ? C.orbit : C.exit;
      }
      if (l > 0.58 && !input.agentChoice) linkOpacity *= 0.6 + 0.4 * Math.sin(t * 5);
    }
    agentLink.set(agent.group.position, p.set(0, 0.2, 0), 2.2, linkOpacity, C.core);
    if (linkPacket > 0) {
      agentLink.pointAt(linkUp ? linkT : 1 - linkT, q);
      bodies.set(IDX.packet2, q, linkTone, 0.55, Math.sin(Math.PI * clamp01(linkT * 0.98 + 0.01)));
    } else bodies.set(IDX.packet2, q.set(0, -50, 0), C.ink, 0, 0);

    // ---- everyone else
    const spin = calm ? 0.25 : 1;
    for (let i = 0; i < ambient.length; i++) {
      const b = ambient[i];
      const a = b.frozen ? b.angle : b.angle + t * b.speed * spin;
      onRing(b.r, a, p, b.y);
      const wash = pulses.wash(b.r);
      bodies.set(i, p, b.tone, b.size * (1 + wash * 0.35), Math.min(1, b.alpha + wash * 0.45) * (beat === 4 ? 0.55 : 1));
    }
    bodies.commit(ambient.length + 4);

    // ---- rings dim while we look down the lane
    const ringLevel = beat === 4 ? 0.5 : 1;
    for (const r of Object.values(rings)) r.setOpacity(ringLevel);

    world.render();

    // ---- anchors for the HTML labels
    const put = (key: keyof typeof anchors, v: THREE.Vector3, show: number) => {
      const s = world.project(v);
      anchors[key].x = s.x;
      anchors[key].y = s.y;
      anchors[key].show = s.behind ? 0 : show;
    };
    put("maya", mayaPos, beat <= 5 && beat !== 4 ? 1 : beat === 4 ? 0.0 : 0.85);
    put("leo", leoPos, beat === 6 ? ramp(l, 0.1, 0.2) : 0);
    put("gate", q.copy(GATE).setY(GATE.y + radiusFor(1) + 0.4), gateShow);
    put("core", q.set(0, 1.5, 0), beat === 5 ? paypalTint : 0);
  }

  return {
    frame,
    anchors: () => anchors,
    dispose: () => world.dispose(),
  };
}
