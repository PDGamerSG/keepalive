import * as THREE from "three";
import {
  Beam,
  BodyField,
  color,
  createWorld,
  heartbeat,
  makeCore,
  makeDust,
  makeRing,
  makeStars,
  onRing,
  orbitSpeed,
  Pulses,
  runLoop,
  type Tone,
} from "./engine";

/**
 * Two systems talking: the subscriber's AI agent on the left, the merchant's
 * KeepAlive desk on the right, joined by a filament that carries each message.
 */

export interface LinkScene {
  /** Send a packet along the filament. */
  send(direction: "toMerchant" | "toAgent", tone: Tone): void;
  /** The agent is waiting on its human: it pulses. */
  setWaiting(waiting: boolean): void;
  /** PayPal carried something out: the merchant's core flashes PayPal blue. */
  paypal(): void;
  setOutcome(outcome: "saved" | "cancelled" | null): void;
  dispose(): void;
}

const AGENT = new THREE.Vector3(-4.2, 0.2, 0);
const DESK = new THREE.Vector3(4.2, 0, 0);

export async function createLinkScene(canvas: HTMLCanvasElement, { calm }: { calm: boolean }): Promise<LinkScene> {
  const world = createWorld(canvas, { fov: 30, bloom: 0.85, maxDpr: 1.75 });
  const { scene, camera } = world;
  camera.position.set(0, 3.2, 15.5);
  camera.lookAt(0, 0, 0);
  // Fit both systems across the band: x from about -5.4 to 7.4, a little height.
  const fit = () => {
    const aspect = world.width() / world.height();
    const half = Math.tan(THREE.MathUtils.degToRad(15));
    const d = Math.max(10, 7.2 / (half * aspect));
    camera.position.set(0.8, d * 0.2, d);
    camera.lookAt(0.8, -0.1, 0);
  };
  world.onResize(fit);
  fit();

  scene.add(makeStars(500, 120));

  // the merchant: a small orrery
  const desk = new THREE.Group();
  desk.position.copy(DESK);
  desk.rotation.x = 0.12;
  const deskCore = makeCore(0.7);
  desk.add(deskCore.group);
  const deskRings = [1.5, 2.2, 2.9].map((r) => makeRing(r, { ticks: 12, opacity: 0.2 }));
  for (const r of deskRings) desk.add(r.group);
  const dust = makeDust(700, 1.0, 3.4, world.pointScale);
  desk.add(dust.points);
  const pulses = new Pulses(4);
  desk.add(pulses.group);
  scene.add(desk);

  // the subscriber's agent: a bright little core with its own ring
  const agent = makeCore(0.42, new THREE.Color("#dcd4ff"), new THREE.Color("#4b3cc4"));
  agent.group.position.copy(AGENT);
  const agentRing = makeRing(0.95, { ticks: 4, opacity: 0.55 });
  agentRing.group.rotation.x = 0.6;
  agent.group.add(agentRing.group);
  scene.add(agent.group);

  const beam = new Beam(color("core"), 64);
  scene.add(beam.line);
  const from = AGENT.clone().add(new THREE.Vector3(0.5, 0, 0));
  const to = DESK.clone().add(new THREE.Vector3(-0.8, 0, 0));
  beam.set(from, to, 1.6, 0.4);

  // bodies: the desk's subscribers, the subscriber themself, and packets in flight
  const deskBodies = Array.from({ length: 22 }, (_, i) => ({
    r: [1.5, 2.2, 2.9][i % 3] + (Math.sin(i * 12.9) * 0.08),
    a: i * 2.39,
    tone: i % 7 === 0 ? color("stasis") : i % 9 === 0 ? color("offer") : color("orbit"),
  }));
  const field = new BodyField(deskBodies.length + 12, world.pointScale);
  scene.add(field.points);

  const packets: { t: number; dir: 1 | -1; tone: THREE.Color }[] = [];
  let waiting = false;
  let flash = 0;
  let outcome: "saved" | "cancelled" | null = null;
  let elapsed = 0;
  let lastPhase = 0;
  const p = new THREE.Vector3();
  const subject = new THREE.Vector3();
  const subjectTone = color("offer");
  const tmp = new THREE.Color();
  const paypalTone = color("paypal");
  const coreTone = color("core");

  const stop = runLoop(
    canvas,
    (_now, dt) => {
      elapsed += dt;
      const t = elapsed;
      const phase = (t % 1.6) / 1.6;
      if (phase < lastPhase) pulses.emit(0.75, 4.2, flash > 0.2 ? paypalTone : undefined);
      lastPhase = phase;
      flash = Math.max(0, flash - dt * 0.8);
      deskCore.tint(tmp.copy(coreTone).lerp(paypalTone, Math.min(1, flash * 1.5)));
      deskCore.update(t, heartbeat(phase));
      pulses.update(dt, 2.6);
      dust.update(t);
      const wait = waiting ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
      agent.update(t + 2, heartbeat(((t + 0.3) % 1.1) / 1.1) * 0.5 + wait * 0.6);
      agentRing.group.rotation.y = t * (waiting ? 2.2 : 0.8);
      beam.set(from, to, 1.6, 0.32 + wait * 0.35);

      let n = 0;
      for (const b of deskBodies) {
        onRing(b.r, b.a + t * orbitSpeed(b.r) * 2.2 * (calm ? 0.25 : 1), p);
        p.applyEuler(desk.rotation).add(DESK);
        field.set(n++, p, b.tone, 0.32, 0.85);
      }
      // the subscriber the agents are talking about, on the desk's middle ring
      if (outcome === "cancelled") {
        subject.lerp(p.set(DESK.x + 5.5, 0.6, 1.5), Math.min(1, dt * 0.9));
        subjectTone.lerp(color("exit"), Math.min(1, dt * 3));
      } else {
        onRing(2.2, 2.2 + t * orbitSpeed(2.2) * (calm ? 0.25 : 1), p);
        p.applyEuler(desk.rotation).add(DESK);
        subject.lerp(p, Math.min(1, dt * 3));
        subjectTone.lerp(outcome === "saved" ? color("orbit") : color("offer"), Math.min(1, dt * 3));
      }
      field.set(n++, subject, subjectTone, 0.55, 1);

      for (let i = packets.length - 1; i >= 0; i--) {
        const k = packets[i];
        k.t += dt / 1.05;
        if (k.t >= 1) {
          packets.splice(i, 1);
          continue;
        }
        beam.pointAt(k.dir === 1 ? k.t : 1 - k.t, p);
        field.set(n++, p, k.tone, 0.6, Math.sin(Math.PI * k.t));
      }
      field.commit(n);
      world.render();
    },
    calm,
  );

  return {
    send(direction, tone) {
      if (packets.length < 10) packets.push({ t: 0, dir: direction === "toMerchant" ? 1 : -1, tone: color(tone) });
    },
    setWaiting(w) {
      waiting = w;
    },
    paypal() {
      flash = 1;
    },
    setOutcome(o) {
      outcome = o;
    },
    dispose() {
      stop();
      world.dispose();
    },
  };
}
