import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/**
 * The orrery: KeepAlive's picture of a subscription business. The merchant is a
 * core that beats; each subscriber is a body in orbit, on a ring for their plan;
 * cancelling is leaving along the exit lane. These are the shared building blocks;
 * each page assembles its own scene from them.
 */

export const HEX = {
  night: "#070b24",
  orbit: "#6ef0c4",
  stasis: "#8ec9ff",
  offer: "#ffc46b",
  exit: "#ff6f7d",
  core: "#b8a4ff",
  coreDeep: "#3a2a9c",
  paypal: "#5b97ff",
  ink: "#e8ebff",
  dim: "#6e77a8",
} as const;

export type Tone = keyof typeof HEX;
export const color = (tone: Tone) => new THREE.Color(HEX[tone]);

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
/** 0 → 1 across [a, b], eased. */
export const ramp = (v: number, a: number, b: number) => smooth((v - a) / (b - a));
/** Stable 0..1 hash of a string, so the same subscriber always sits in the same place. */
export function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Angular speed for a ring: outer rings turn slower, as real orbits do. */
export const orbitSpeed = (radius: number) => 0.9 / Math.pow(radius, 1.5);

/** Point on a ring in the orbital plane (y up). */
export function onRing(radius: number, angle: number, out = new THREE.Vector3(), y = 0) {
  return out.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

// ------------------------------------------------------------------ world

export interface World {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Shared uniform: pixels per world unit at distance 1, for size-attenuated points. */
  pointScale: { value: number };
  width(): number;
  height(): number;
  render(): void;
  /** CSS-pixel position of a world point inside the canvas. */
  project(v: THREE.Vector3): { x: number; y: number; behind: boolean };
  onResize(cb: () => void): void;
  dispose(): void;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function createWorld(
  canvas: HTMLCanvasElement,
  opts: { fov?: number; bloom?: number; background?: string; maxDpr?: number } = {},
): World {
  const fov = opts.fov ?? 38;
  const parent = canvas.parentElement!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr ?? 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.NoToneMapping;
  const bg = new THREE.Color(opts.background ?? HEX.night);
  renderer.setClearColor(bg, 1);

  const scene = new THREE.Scene();
  scene.background = bg;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 500);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(dpr);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), opts.bloom ?? 0.9, 0.55, 0.08);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const pointScale = { value: 1 };
  let w = 1;
  let h = 1;
  const listeners: (() => void)[] = [];
  const resize = () => {
    w = Math.max(1, parent.clientWidth);
    h = Math.max(1, parent.clientHeight);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    pointScale.value = (h * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    for (const cb of listeners) cb();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  resize();

  const tmp = new THREE.Vector3();
  return {
    renderer,
    scene,
    camera,
    pointScale,
    width: () => w,
    height: () => h,
    render: () => composer.render(),
    project(v) {
      tmp.copy(v).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, behind: tmp.z > 1 };
    },
    onResize: (cb) => listeners.push(cb),
    dispose() {
      observer.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
          mat.dispose();
        }
      });
      composer.dispose();
      renderer.dispose();
    },
  };
}

// ------------------------------------------------------------------ bodies

const BODY_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.5, aSize * uScale / -mv.z);
    vColor = aColor;
    vAlpha = aAlpha;
  }
`;
const BODY_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float halo = pow(1.0 - d, 2.6);
    float core = smoothstep(0.36, 0.12, d);
    vec3 c = vColor * halo * 1.15 + mix(vColor, vec3(1.0), 0.6) * core;
    gl_FragColor = vec4(c, clamp(halo + core, 0.0, 1.0) * vAlpha);
  }
`;

/** A pool of glowing bodies. Positions and looks are written every frame. */
export class BodyField {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly geometry: THREE.BufferGeometry;

  constructor(
    readonly capacity: number,
    scale: { value: number },
  ) {
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geometry = g;
    const material = new THREE.ShaderMaterial({
      uniforms: { uScale: scale },
      vertexShader: BODY_VERT,
      fragmentShader: BODY_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  set(i: number, p: THREE.Vector3, c: THREE.Color, size: number, alpha: number) {
    if (i >= this.capacity) return;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.col[i * 3] = c.r;
    this.col[i * 3 + 1] = c.g;
    this.col[i * 3 + 2] = c.b;
    this.size[i] = size;
    this.alpha[i] = alpha;
  }

  commit(count: number) {
    this.geometry.setDrawRange(0, Math.min(count, this.capacity));
    for (const name of ["position", "aColor", "aSize", "aAlpha"]) this.geometry.getAttribute(name).needsUpdate = true;
  }
}

// ------------------------------------------------------------------ the core

const CORE_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    vP = normalize(position);
    gl_Position = projectionMatrix * mv;
  }
`;
const CORE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uBeat;
  uniform vec3 uDeep;
  uniform vec3 uLight;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * noise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return s;
  }
  void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
    float f = fbm(vP * 2.4 + vec3(0.0, uTime * 0.22, uTime * 0.1));
    float bands = 0.5 + 0.5 * sin(f * 10.0 - uTime * 1.3);
    vec3 col = mix(uDeep * 0.6, uLight * 0.8, smoothstep(0.3, 0.8, f)) * (0.35 + 0.65 * bands);
    col += uLight * fres * 1.1;
    col *= 0.85 + uBeat * 0.7;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function glowTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.18, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.14)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface Core {
  group: THREE.Group;
  /** Advance the shader; `beat` is 0..1 heartbeat strength. */
  update(time: number, beat: number): void;
  tint(light: THREE.Color, deep?: THREE.Color): void;
  glow: THREE.Sprite;
}

export function makeCore(radius: number, light = color("core"), deep = color("coreDeep")): Core {
  const group = new THREE.Group();
  const uniforms = {
    uTime: { value: 0 },
    uBeat: { value: 0 },
    uDeep: { value: deep.clone() },
    uLight: { value: light.clone() },
  };
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.ShaderMaterial({ uniforms, vertexShader: CORE_VERT, fragmentShader: CORE_FRAG }),
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: light.clone(),
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(radius * 7);
  group.add(glow, sphere);
  return {
    group,
    glow,
    update(time, beat) {
      uniforms.uTime.value = time;
      uniforms.uBeat.value = beat;
      sphere.scale.setScalar(1 + beat * 0.07);
      glow.scale.setScalar(radius * (7 + beat * 1.6));
    },
    tint(l, d) {
      uniforms.uLight.value.copy(l);
      if (d) uniforms.uDeep.value.copy(d);
      (glow.material as THREE.SpriteMaterial).color.copy(l);
    },
  };
}

/** Heartbeat shape: a sharp double thump, then rest. `phase` is 0..1 through one beat. */
export function heartbeat(phase: number): number {
  const a = Math.exp(-Math.pow((phase - 0.04) / 0.03, 2));
  const b = 0.6 * Math.exp(-Math.pow((phase - 0.16) / 0.035, 2));
  return a + b;
}

// ------------------------------------------------------------------ heartbeat pulses

/** Rings of light the core sends out on each beat: the keep-alive signal. */
export class Pulses {
  readonly group = new THREE.Group();
  private readonly rings: { mesh: THREE.Mesh; r: number; max: number; live: boolean }[] = [];

  constructor(
    count = 5,
    private tone = color("core"),
  ) {
    const geometry = new THREE.RingGeometry(0.985, 1, 160, 1);
    geometry.rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: this.tone,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ mesh, r: 0, max: 1, live: false });
    }
  }

  emit(from: number, to: number, tone?: THREE.Color) {
    const slot = this.rings.find((r) => !r.live) ?? this.rings[0];
    slot.r = from;
    slot.max = to;
    slot.live = true;
    slot.mesh.visible = true;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.copy(tone ?? this.tone);
  }

  update(dt: number, speed = 3.4) {
    for (const ring of this.rings) {
      if (!ring.live) continue;
      ring.r += dt * speed;
      const life = ring.r / ring.max;
      if (life >= 1) {
        ring.live = false;
        ring.mesh.visible = false;
        continue;
      }
      ring.mesh.scale.setScalar(ring.r);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * Math.pow(1 - life, 1.6);
    }
  }

  /** How strongly a pulse is passing over radius `r` right now (0..1). */
  wash(r: number): number {
    let s = 0;
    for (const ring of this.rings) {
      if (!ring.live) continue;
      const life = ring.r / ring.max;
      s += Math.exp(-Math.pow((r - ring.r) / 0.35, 2)) * (1 - life);
    }
    return Math.min(1, s);
  }
}

// ------------------------------------------------------------------ orbit rings

export interface Ring {
  group: THREE.Group;
  radius: number;
  setOpacity(o: number): void;
  /** Colour the month ticks; `paint(i)` returns a colour or null for the resting colour. */
  paintTicks(paint: (i: number) => THREE.Color | null): void;
  /** Angle of tick i, so scenes can line things up with months. */
  tickAngle(i: number): number;
}

export function makeRing(radius: number, opts: { tone?: THREE.Color; opacity?: number; ticks?: number; tickStart?: number } = {}): Ring {
  const group = new THREE.Group();
  const tone = opts.tone ?? color("ink");
  const base = opts.opacity ?? 0.22;
  const segments = 320;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) pts.push(onRing(radius, (i / segments) * Math.PI * 2));
  const lineMat = new THREE.LineBasicMaterial({ color: tone, transparent: true, opacity: base, depthWrite: false });
  group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), lineMat));

  const ticks = opts.ticks ?? 12;
  const start = opts.tickStart ?? 0;
  const tickAngle = (i: number) => start + (i / ticks) * Math.PI * 2;
  const tickPos = new Float32Array(ticks * 6);
  const tickCol = new Float32Array(ticks * 6);
  const rest = tone.clone().multiplyScalar(0.55);
  for (let i = 0; i < ticks; i++) {
    const a = tickAngle(i);
    const p1 = onRing(radius - 0.14, a);
    const p2 = onRing(radius + 0.14, a);
    tickPos.set([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z], i * 6);
    tickCol.set([rest.r, rest.g, rest.b, rest.r, rest.g, rest.b], i * 6);
  }
  const tickGeo = new THREE.BufferGeometry();
  tickGeo.setAttribute("position", new THREE.BufferAttribute(tickPos, 3));
  tickGeo.setAttribute("color", new THREE.BufferAttribute(tickCol, 3));
  const tickMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.LineSegments(tickGeo, tickMat));

  return {
    group,
    radius,
    tickAngle,
    setOpacity(o) {
      lineMat.opacity = base * o;
      tickMat.opacity = o;
    },
    paintTicks(paint) {
      for (let i = 0; i < ticks; i++) {
        const c = paint(i) ?? rest;
        tickCol.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
      }
      tickGeo.getAttribute("color").needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------------ dust and stars

const DUST_VERT = /* glsl */ `
  attribute float aR;
  attribute float aA;
  attribute float aS;
  attribute float aT;
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uA;
  uniform vec3 uB;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float ang = aA + uTime * 0.9 / pow(aR, 1.5);
    vec3 p = vec3(cos(ang) * aR, position.y, sin(ang) * aR);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, aS * uScale / -mv.z);
    vColor = mix(uA, uB, aT);
    vAlpha = 0.18 + 0.32 * aT;
  }
`;
const DUST_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(vColor, pow(1.0 - d, 2.0) * vAlpha);
  }
`;

/** A thin disc of drifting dust in the orbital plane; it turns with the orbits. */
export function makeDust(count: number, rMin: number, rMax: number, scale: { value: number }) {
  const g = new THREE.BufferGeometry();
  const position = new Float32Array(count * 3);
  const aR = new Float32Array(count);
  const aA = new Float32Array(count);
  const aS = new Float32Array(count);
  const aT = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random();
    aR[i] = rMin + (rMax - rMin) * Math.pow(u, 0.8);
    aA[i] = Math.random() * Math.PI * 2;
    position[i * 3 + 1] = (Math.random() - 0.5) * 0.5 * (aR[i] / rMax);
    aS[i] = 0.025 + Math.random() * 0.06;
    aT[i] = Math.pow(Math.random(), 3);
  }
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("aR", new THREE.BufferAttribute(aR, 1));
  g.setAttribute("aA", new THREE.BufferAttribute(aA, 1));
  g.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
  g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
  const uniforms = { uTime: { value: 0 }, uScale: scale, uA: { value: color("dim") }, uB: { value: color("core") } };
  const points = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  return { points, update: (time: number) => (uniforms.uTime.value = time) };
}

export function makeStars(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(radius * (0.6 + Math.random() * 0.4));
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(
    g,
    new THREE.PointsMaterial({ color: HEX.ink, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  points.frustumCulled = false;
  return points;
}

// ------------------------------------------------------------------ exit lane

const LANE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const LANE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uLength;
  uniform float uOpacity;
  uniform float uFlow;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float across = abs(vUv.y - 0.5) * 2.0;
    float along = vUv.x * uLength;
    // chevrons pointing outward, drifting outward
    float chevron = fract((along - across * 0.32) * 1.25 - uTime * uFlow);
    float mark = smoothstep(0.0, 0.05, chevron) * (1.0 - smoothstep(0.1, 0.17, chevron));
    float edge = smoothstep(0.82, 0.9, across) * (1.0 - smoothstep(0.94, 1.0, across));
    float fade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.7, 1.0, vUv.x));
    float a = (mark * 0.75 * (1.0 - across * 0.6) + edge * 0.5) * fade * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`;

/** The way out: a lane of chevrons from a ring to open space. Always drawn, always open. */
export function makeLane(from: THREE.Vector3, to: THREE.Vector3, width = 0.42) {
  const dir = to.clone().sub(from);
  const length = dir.length();
  const geometry = new THREE.PlaneGeometry(length, width, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const uniforms = {
    uTime: { value: 0 },
    uLength: { value: length },
    uOpacity: { value: 0.6 },
    uFlow: { value: 0.5 },
    uColor: { value: color("exit") },
  };
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: LANE_VERT,
      fragmentShader: LANE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.rotation.y = -Math.atan2(dir.z, dir.x);
  mesh.renderOrder = 2;
  return {
    mesh,
    update(time: number, opacity: number, flow = 0.5) {
      uniforms.uTime.value = time;
      uniforms.uOpacity.value = opacity;
      uniforms.uFlow.value = flow;
    },
  };
}

// ------------------------------------------------------------------ beams and trails

/** A curved filament between two points; a packet can ride it. */
export class Beam {
  readonly line: THREE.Line;
  private readonly curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3());
  private readonly positions: Float32Array;
  private readonly material: THREE.LineBasicMaterial;

  constructor(
    tone: THREE.Color,
    private readonly segments = 48,
  ) {
    this.positions = new Float32Array((segments + 1) * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.LineBasicMaterial({ color: tone, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.line = new THREE.Line(g, this.material);
    this.line.frustumCulled = false;
  }

  set(a: THREE.Vector3, b: THREE.Vector3, lift: number, opacity: number, tone?: THREE.Color) {
    this.curve.v0.copy(a);
    this.curve.v2.copy(b);
    this.curve.v1.copy(a).add(b).multiplyScalar(0.5);
    this.curve.v1.y += lift;
    const p = new THREE.Vector3();
    for (let i = 0; i <= this.segments; i++) {
      this.curve.getPoint(i / this.segments, p);
      this.positions.set([p.x, p.y, p.z], i * 3);
    }
    this.line.geometry.getAttribute("position").needsUpdate = true;
    this.material.opacity = opacity;
    if (tone) this.material.color.copy(tone);
    this.line.visible = opacity > 0.001;
  }

  pointAt(t: number, out = new THREE.Vector3()) {
    return this.curve.getPoint(clamp01(t), out);
  }
}

const TRAIL_VERT = /* glsl */ `
  attribute float aT;
  varying float vT;
  void main() {
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const TRAIL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vT;
  void main() {
    gl_FragColor = vec4(uColor, pow(vT, 1.6) * uOpacity);
  }
`;

/** A fading wake behind a moving body. */
export class Trail {
  readonly line: THREE.Line;
  private readonly positions: Float32Array;
  private filled = 0;
  private readonly uniforms: { uColor: { value: THREE.Color }; uOpacity: { value: number } };

  constructor(
    private readonly length: number,
    tone: THREE.Color,
  ) {
    this.positions = new Float32Array(length * 3);
    const aT = new Float32Array(length);
    for (let i = 0; i < length; i++) aT[i] = i / (length - 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    this.uniforms = { uColor: { value: tone.clone() }, uOpacity: { value: 0.8 } };
    this.line = new THREE.Line(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: TRAIL_VERT,
        fragmentShader: TRAIL_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.line.frustumCulled = false;
  }

  /** Newest point goes last, so the bright end of the line is at the body. */
  push(p: THREE.Vector3) {
    if (this.filled === 0) {
      for (let i = 0; i < this.length; i++) this.positions.set([p.x, p.y, p.z], i * 3);
      this.filled = this.length;
    } else {
      this.positions.copyWithin(0, 3);
      this.positions.set([p.x, p.y, p.z], (this.length - 1) * 3);
    }
    this.line.geometry.getAttribute("position").needsUpdate = true;
  }

  reset() {
    this.filled = 0;
  }

  style(tone: THREE.Color, opacity: number) {
    this.uniforms.uColor.value.copy(tone);
    this.uniforms.uOpacity.value = opacity;
    this.line.visible = opacity > 0.001;
  }
}

// ------------------------------------------------------------------ a frame loop that sleeps off-screen

export function runLoop(el: Element, frame: (time: number, dt: number) => void, calm: boolean) {
  let raf = 0;
  let visible = true;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame(now / 1000, calm ? dt * 0.35 : dt);
    raf = visible ? requestAnimationFrame(tick) : 0;
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  });
  io.observe(el);
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}
