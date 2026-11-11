import * as THREE from "three";
import {
  BodyField,
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
  runLoop,
  Trail,
} from "./engine";
import type { BodyState, FocusBody, OrbitBody, Tier } from "./states";

/**
 * A live orrery of one merchant's real subscribers: one ring per plan, each body
 * coloured by its PayPal state. Used by the merchant desk (hover and click), the
 * shop (where a new subscriber's spot is shown) and the subscriber's own account.
 */


export interface BusinessOptions {
  calm: boolean;
  interactive?: boolean;
  /** Distance multiplier for the camera; larger shows more space around the rings. */
  zoom?: number;
  /** Shift of the look-at point, in world units along x, to leave room for overlays. */
  offsetX?: number;
}

export interface Hit {
  id: string;
  x: number;
  y: number;
}

export interface BusinessScene {
  setBodies(bodies: OrbitBody[]): void;
  setFocus(focus: FocusBody | null): void;
  setHighlight(tier: Tier | null): void;
  /** Screen position of the focus body, for a label. */
  focusAnchor(): { x: number; y: number; show: number };
  onHover(cb: (hit: Hit | null) => void): void;
  onPick(cb: (id: string) => void): void;
  dispose(): void;
}

const RING: Record<Tier, number> = { lite: 2.7, standard: 3.9, premium: 5.1 };
const EXIT_ANGLE = 0.55;
const PERIOD = 1.6;

const TONE: Record<BodyState, THREE.Color> = {
  active: color("orbit"),
  offer: color("offer"),
  pending: color("core"),
  paused: color("stasis"),
  new: color("ink"),
  cancelled: color("exit"),
};

export async function createBusinessScene(canvas: HTMLCanvasElement, opts: BusinessOptions): Promise<BusinessScene> {
  const world = createWorld(canvas, { fov: 34, bloom: 0.75, maxDpr: 1.75 });
  const { scene, camera } = world;
  const calm = opts.calm;

  const core = makeCore(0.78);
  scene.add(core.group);
  const pulses = new Pulses(5);
  scene.add(pulses.group);
  const rings: Record<Tier, ReturnType<typeof makeRing>> = {
    lite: makeRing(RING.lite, { tickStart: EXIT_ANGLE }),
    standard: makeRing(RING.standard, { tickStart: EXIT_ANGLE }),
    premium: makeRing(RING.premium, { tickStart: EXIT_ANGLE }),
  };
  for (const r of Object.values(rings)) scene.add(r.group);
  scene.add(makeDust(1600, 1.2, 9, world.pointScale).points);
  scene.add(makeStars(600, 140));
  const lane = makeLane(onRing(RING.premium + 0.3, EXIT_ANGLE), onRing(14, EXIT_ANGLE), 0.36);
  scene.add(lane.mesh);

  let bodies: OrbitBody[] = [];
  let field = new BodyField(64, world.pointScale);
  scene.add(field.points);
  const focusTrail = new Trail(40, color("exit"));
  scene.add(focusTrail.line);

  let focus: FocusBody | null = null;
  let highlight: Tier | null = null;
  const highlightLevel: Record<Tier, number> = { lite: 0, standard: 0, premium: 0 };
  // where the focus body is, eased toward where it should be
  const focusPos = new THREE.Vector3(0, 0, 0);
  let focusReady = false;
  const focusTone = new THREE.Color();
  let focusAnchor = { x: 0, y: 0, show: 0 };

  const projected: { id: string; x: number; y: number }[] = [];
  let hoverCb: ((hit: Hit | null) => void) | null = null;
  let pickCb: ((id: string) => void) | null = null;
  let hoverId: string | null = null;
  const pointer = { x: -1, y: -1, inside: false };

  const p = new THREE.Vector3();
  const want = new THREE.Vector3();
  const tone = new THREE.Color();
  const dim = color("dim");
  let last = 0;
  let elapsed = 0;

  const zoom = opts.zoom ?? 1;
  const target = new THREE.Vector3(opts.offsetX ?? 0, 0, -0.7);

  function place(b: OrbitBody, t: number, out: THREE.Vector3) {
    const seed = hash01(b.id);
    if (b.state === "cancelled") {
      // gone: scattered beyond the outer ring, near the exit lane
      const a = EXIT_ANGLE + (hash01(b.id, 2) - 0.5) * 1.6;
      const r = RING.premium + 1.3 + hash01(b.id, 3) * 2.6 + (calm ? 0 : Math.sin(t * 0.2 + seed * 9) * 0.08);
      return onRing(r, a, out, (hash01(b.id, 4) - 0.5) * 0.5);
    }
    const r = RING[b.tier] + (hash01(b.id, 5) - 0.5) * 0.22;
    const a0 = seed * Math.PI * 2;
    const moving = b.state !== "paused";
    const a = moving ? a0 + t * orbitSpeed(r) * (calm ? 0.25 : 1) : a0;
    return onRing(r, a, out, (hash01(b.id, 6) - 0.5) * 0.1);
  }

  function focusTarget(t: number, out: THREE.Vector3) {
    if (!focus) return out.set(0, 0, 0);
    if (focus.state === "cancelled") return onRing(RING.premium + 3.4, EXIT_ANGLE, out, 0.1);
    const r = RING[focus.tier];
    const a = focus.state === "paused" ? EXIT_ANGLE - 0.9 : EXIT_ANGLE - 0.9 + t * orbitSpeed(r) * (calm ? 0.25 : 1);
    return onRing(r, a, out, 0);
  }

  const resizeCamera = () => {
    const aspect = world.width() / world.height();
    const fit = aspect < 1.1 ? 1.35 / Math.max(0.55, aspect) : 1;
    camera.position.set(target.x + 0.4, 7.4 * zoom * fit, 11.2 * zoom * fit);
    camera.lookAt(target);
  };
  world.onResize(resizeCamera);
  resizeCamera();

  const stop = runLoop(
    canvas,
    (_now, dt) => {
      elapsed += dt;
      const t = elapsed;
      const phase = (t % PERIOD) / PERIOD;
      if (phase < last) pulses.emit(0.85, 9.5);
      last = phase;
      core.update(t, heartbeat(phase));
      pulses.update(dt, 3);
      lane.update(t, 0.38, 0.35);

      for (const tier of Object.keys(rings) as Tier[]) {
        const goal = highlight === tier ? 1 : 0;
        highlightLevel[tier] += (goal - highlightLevel[tier]) * Math.min(1, dt * 6);
        rings[tier].setOpacity(highlight ? lerp(0.5, 3.4, highlightLevel[tier]) : 1);
      }

      projected.length = 0;
      let n = 0;
      for (const b of bodies) {
        place(b, t, p);
        const wash = pulses.wash(Math.hypot(p.x, p.z));
        let alpha = b.state === "cancelled" ? 0.42 : 0.9;
        if (b.state === "pending" || b.state === "new") alpha *= calm ? 0.8 : 0.55 + 0.45 * Math.sin(t * 3 + hash01(b.id) * 6);
        const base = 0.42 + Math.min(1, b.priceUsd / 36) * 0.3;
        const hovered = hoverId === b.id;
        const faded = focus ? 0.45 : 1;
        tone.copy(TONE[b.state]);
        if (focus) tone.lerp(dim, 0.35);
        field.set(n++, p, tone, base * (1 + wash * 0.3) * (hovered ? 1.7 : 1), Math.min(1, (alpha + wash * 0.35) * faded));
        if (opts.interactive) {
          const s = world.project(p);
          if (!s.behind) projected.push({ id: b.id, x: s.x, y: s.y });
        }
      }

      if (focus) {
        focusTarget(t, want);
        if (!focusReady) {
          focusPos.copy(want);
          focusReady = true;
        }
        focusPos.lerp(want, calm ? 1 : Math.min(1, dt * 2.4));
        focusTone.lerp(TONE[focus.state], Math.min(1, dt * 4));
        const pulse = calm ? 1 : 1 + 0.12 * Math.sin(t * 3.2);
        field.set(n++, focusPos, focusTone, 0.95 * pulse, 1);
        focusTrail.push(focusPos);
        const moving = focusPos.distanceTo(want) > 0.05;
        focusTrail.style(focusTone, moving ? 0.7 : 0);
        const s = world.project(focusPos);
        focusAnchor = { x: s.x, y: s.y, show: s.behind ? 0 : 1 };
      } else {
        focusAnchor.show = 0;
        focusTrail.style(focusTone, 0);
      }
      field.commit(n);

      if (opts.interactive && hoverCb) {
        let best: { id: string; x: number; y: number } | null = null;
        let bestD = 18 * 18;
        if (pointer.inside) {
          for (const q of projected) {
            const d = (q.x - pointer.x) ** 2 + (q.y - pointer.y) ** 2;
            if (d < bestD) {
              bestD = d;
              best = q;
            }
          }
        }
        const id = best?.id ?? null;
        if (id !== hoverId || best) {
          hoverId = id;
          hoverCb(best ? { id: best.id, x: best.x, y: best.y } : null);
        }
        canvas.style.cursor = best ? "pointer" : "default";
      }
      world.render();
    },
    calm,
  );

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  };
  const onLeave = () => {
    pointer.inside = false;
  };
  const onClick = () => {
    if (hoverId && pickCb) pickCb(hoverId);
  };
  if (opts.interactive) {
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);
  }

  return {
    setBodies(next) {
      bodies = next;
      const need = next.length + 2;
      if (need > field.capacity) {
        scene.remove(field.points);
        field.points.geometry.dispose();
        (field.points.material as THREE.Material).dispose();
        field = new BodyField(Math.ceil(need * 1.5), world.pointScale);
        scene.add(field.points);
      }
    },
    setFocus(next) {
      if (next && !focus) {
        focusReady = false;
        focusTone.copy(TONE[next.state]);
      }
      focus = next;
    },
    setHighlight(tier) {
      highlight = tier;
    },
    focusAnchor: () => focusAnchor,
    onHover(cb) {
      hoverCb = cb;
    },
    onPick(cb) {
      pickCb = cb;
    },
    dispose() {
      stop();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      world.dispose();
    },
  };
}
