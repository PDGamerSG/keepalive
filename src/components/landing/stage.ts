import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * The 3D "retention desk" on the landing page: a console with a platter of twelve
 * monthly parcels, three offer keys, a cancel key, guardrail knobs and a display.
 * It is a model of the product, not a client of it: nothing here calls PayPal.
 * Geometry comes from tools/blender/build_console.py (keep the layout constants in sync).
 */

export type KeyName = "cancel" | "pause" | "switch" | "discount";
export type LampName = "active" | "saved" | "cancelled";

export interface ConsoleState {
  /** 0..1: how far the cancellation has gone; parcels leave in month order. */
  cancel: number;
  /** Months paused, counted from the next renewal. */
  pauseMonths: number;
  /** Downgraded to the Lite tier (smaller parcels). */
  lite: boolean;
  discountMonths: number;
  discountPct: number;
  /** 0..1 key travel requested by the story. */
  press: Record<KeyName, number>;
  /** Offer key the desk is currently proposing. */
  glow: KeyName | null;
  lamp: LampName;
  lcd: [string, string];
  hub: [string, string];
  /** Guardrail knobs, 0..1. */
  knobs: [number, number];
  /** The subscriber's own agent: presence and how far it has pushed the cancel key. */
  bot: { show: number; press: number };
}

export interface StageFonts {
  display: string;
  sans: string;
  mono: string;
}

export interface Frame {
  u: number;
  dt: number;
  now: number;
  state: ConsoleState;
}

export interface Stage {
  render(frame: Frame): void;
  /** Screen position, in CSS pixels, of the top of the cancel key. */
  cancelAnchor(): { x: number; y: number };
  pressKey(key: KeyName): void;
  dispose(): void;
}

// ---------------------------------------------------------------- layout (three.js axes: y up, z toward the viewer)
const TOP = 1.22;
const PLATTER = new THREE.Vector3(-2.5, TOP + 0.03, 0);
const OFFER_X = [1.25, 2.61, 3.97];
const OFFER_Z = -1.85;
const CANCEL = new THREE.Vector3(3.5, TOP + 0.035, 1.5);
const KNOB_X = [0.95, 1.9];
const KNOB_Z = 2.05;
const LCD = new THREE.Vector3(1.35, TOP + 0.113, 0.55);
const LAMP_X = [0.65, 1.25, 1.85];
const LAMP_Z = -0.45;
const TOKEN_RADIUS = 1.72;
const MONTHS = 12;

const INK = "#2a1917";
const IVORY = "#f8f2e2";
const LAMP_COLORS: Record<LampName, number> = { active: 0x4fe08f, saved: 0xffc247, cancelled: 0xff4a36 };
const OFFER_KEYS: KeyName[] = ["pause", "switch", "discount"];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const rad = THREE.MathUtils.degToRad;
/** Frame-rate independent approach of `current` toward `target`. */
const approach = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

// ---------------------------------------------------------------- camera path, in beat units
interface CamKey {
  u: number;
  az: number;
  el: number;
  d: number;
  t: [number, number, number];
}
const CAM: CamKey[] = [
  { u: 0, az: -30, el: 33, d: 28, t: [0.2, 0.6, 0] },
  { u: 1.0, az: -30, el: 33, d: 28, t: [0.2, 0.6, 0] },
  { u: 1.26, az: -10, el: 36, d: 12.5, t: [2.9, 1.3, 1.2] },
  { u: 1.4, az: -8, el: 36, d: 12.5, t: [2.9, 1.3, 1.2] },
  { u: 1.72, az: -38, el: 44, d: 16.5, t: [-1.6, 1.2, 0.1] },
  { u: 2.25, az: -24, el: 48, d: 16, t: [-0.2, 1.2, 0.3] },
  { u: 3.05, az: -24, el: 50, d: 17.5, t: [0.3, 1.2, -0.2] },
  { u: 3.95, az: -10, el: 50, d: 17.5, t: [0.3, 1.2, -0.2] },
  { u: 4.3, az: -4, el: 62, d: 18.5, t: [0.7, 1.1, 0.3] },
  { u: 5.0, az: -2, el: 62, d: 18.5, t: [0.7, 1.1, 0.3] },
  { u: 5.3, az: -42, el: 34, d: 15.5, t: [-1.2, 1.3, 0.3] },
  { u: 5.95, az: -30, el: 36, d: 16.5, t: [-1.0, 1.3, 0.3] },
  { u: 6.2, az: 18, el: 24, d: 15.5, t: [2.6, 2.0, 0.9] },
  { u: 6.9, az: 8, el: 28, d: 17, t: [1.4, 1.7, 0.5] },
  { u: 7.35, az: -26, el: 32, d: 27, t: [0.2, 0.7, 0] },
  { u: 8, az: -30, el: 33, d: 28, t: [0.2, 0.6, 0] },
];

function cameraAt(u: number) {
  let i = 0;
  while (i < CAM.length - 2 && u > CAM[i + 1].u) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const f = smooth(clamp01((u - a.u) / (b.u - a.u)));
  return {
    az: lerp(a.az, b.az, f),
    el: lerp(a.el, b.el, f),
    d: lerp(a.d, b.d, f),
    t: [lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f)] as const,
  };
}

// ---------------------------------------------------------------- drawing helpers
function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("2D canvas is unavailable");
  return { canvas, g };
}

function toTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** A flat print lying on a surface. Lit, so it sits in the same light as the part under it. */
function print(tex: THREE.Texture, w: number, h: number, lit = true) {
  const material = lit
    ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.6 })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -2;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = lit;
  return mesh;
}

function monthNames(): string[] {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en", { month: "short" });
  return Array.from({ length: MONTHS }, (_, i) => fmt.format(new Date(now.getFullYear(), now.getMonth() + 1 + i, 1)));
}

const tokenAngle = (i: number) => Math.PI / 2 + (i * Math.PI * 2) / MONTHS;

// ---------------------------------------------------------------- stage
export async function createStage(
  canvas: HTMLCanvasElement,
  opts: { fonts: StageFonts; calm: boolean; onKey: (key: KeyName) => void },
): Promise<Stage> {
  const { fonts, calm } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(-7, 13, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 5;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffb3a0, 0.7);
  rim.position.set(8, 5, -8);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.42, color: 0x12030a }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const [gltf] = await Promise.all([
    new GLTFLoader().loadAsync("/landing/console.glb"),
    document.fonts.load(`700 80px ${fonts.display}`),
    document.fonts.load(`600 30px ${fonts.sans}`),
    document.fonts.load(`500 40px ${fonts.mono}`),
  ]);

  const part = (name: string) => {
    const o = gltf.scene.getObjectByName(name);
    if (!o) throw new Error(`console.glb is missing "${name}"`);
    o.position.set(0, 0, 0);
    return o;
  };
  const shadows = (o: THREE.Object3D) =>
    o.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  /** Clone a part with its own materials, so it can be tinted or faded alone. */
  const own = (name: string) => {
    const clone = part(name).clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.material = (mesh.material as THREE.Material).clone();
    });
    shadows(clone);
    return clone;
  };
  const materialsOf = (o: THREE.Object3D) => {
    const list: THREE.MeshStandardMaterial[] = [];
    o.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) list.push(mesh.material as THREE.MeshStandardMaterial);
    });
    return list;
  };

  const desk = new THREE.Group();
  scene.add(desk);
  const body = part("Body");
  shadows(body);
  desk.add(body);

  // ---- faceplate print
  {
    const S = 200;
    const { canvas: c, g } = makeCanvas(9.5 * S, 5.8 * S);
    const px = (x: number) => (x + 4.75) * S;
    const pz = (z: number) => (z + 2.9) * S;
    g.fillStyle = INK;
    g.textAlign = "center";
    g.font = `500 25px ${fonts.mono}`;
    ["suspend", "revise", "PATCH price"].forEach((call, i) => g.fillText(call, px(OFFER_X[i]), pz(OFFER_Z + 0.92)));
    g.font = `600 22px ${fonts.sans}`;
    ["Active", "Saved", "Cancelled"].forEach((name, i) => g.fillText(name, px(LAMP_X[i]), pz(LAMP_Z + 0.4)));
    ["Max pause", "Max discount"].forEach((name, i) => g.fillText(name, px(KNOB_X[i] + (i ? 0.08 : -0.08)), pz(KNOB_Z + 0.72)));
    for (const x of KNOB_X) {
      for (let k = 0; k <= 10; k++) {
        const a = rad(-135 + k * 27) - Math.PI / 2;
        g.beginPath();
        g.arc(px(x) + Math.cos(a) * 112, pz(KNOB_Z) + Math.sin(a) * 112, k % 5 === 0 ? 5 : 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.font = `700 92px ${fonts.display}`;
    g.fillText("KeepAlive", px(3.6), pz(-0.42));
    g.font = `500 24px ${fonts.sans}`;
    g.fillText("Retention desk for PayPal Subscriptions", px(3.6), pz(-0.14));
    const plate = print(toTexture(c, renderer), 9.5, 5.8);
    plate.position.y = TOP + 0.003;
    desk.add(plate);
  }

  // ---- platter with twelve monthly parcels
  const platter = part("Platter");
  shadows(platter);
  platter.position.copy(PLATTER);
  desk.add(platter);
  {
    const S = 1024 / 4.9;
    const { canvas: c, g } = makeCanvas(1024, 1024);
    const names = monthNames();
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let i = 0; i < MONTHS; i++) {
      const a = tokenAngle(i);
      g.save();
      g.translate(512 + Math.cos(a) * 2.2 * S, 512 + Math.sin(a) * 2.2 * S);
      g.rotate(a - Math.PI / 2);
      g.fillStyle = "rgba(248,242,226,0.92)";
      g.font = `600 30px ${fonts.sans}`;
      g.fillText(names[i], 0, 0);
      g.restore();
      g.save();
      g.translate(512 + Math.cos(a) * TOKEN_RADIUS * S, 512 + Math.sin(a) * TOKEN_RADIUS * S);
      g.rotate(a - Math.PI / 2);
      g.strokeStyle = "rgba(248,242,226,0.38)";
      g.lineWidth = 3;
      g.setLineDash([9, 8]);
      g.strokeRect(-70, -70, 140, 140);
      g.restore();
    }
    const face = print(toTexture(c, renderer), 4.9, 4.9);
    face.position.y = 0.123;
    platter.add(face);
  }

  interface Token {
    root: THREE.Object3D;
    materials: THREE.MeshStandardMaterial[];
    tag: THREE.Sprite;
    gone: number;
    ghost: number;
    lite: number;
    tagged: number;
  }
  const tagMaterial = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  let tagPct = 0;
  const tagTexture = (pct: number) => {
    const { canvas: c, g } = makeCanvas(256, 128);
    g.fillStyle = "#1c9a60";
    g.beginPath();
    g.roundRect(6, 10, 244, 108, 26);
    g.fill();
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `700 70px ${fonts.sans}`;
    g.fillText(`-${pct}%`, 128, 68);
    return toTexture(c, renderer);
  };
  const tokens: Token[] = Array.from({ length: MONTHS }, (_, i) => {
    const root = own("Parcel");
    const materials = materialsOf(root);
    for (const m of materials) m.transparent = true;
    const tag = new THREE.Sprite(tagMaterial);
    tag.position.set(0, 0.98, 0);
    tag.scale.set(0.0001, 0.0001, 1);
    root.add(tag);
    platter.add(root);
    void i;
    return { root, materials, tag, gone: 0, ghost: 0, lite: 0, tagged: 0 };
  });

  // ---- hub display (price) and LCD (PayPal status)
  const hubPrint = makeCanvas(400, 400);
  const hubTexture = toTexture(hubPrint.canvas, renderer);
  const hub = print(hubTexture, 1.34, 1.34);
  hub.position.set(PLATTER.x, TOP + 0.373, PLATTER.z);
  desk.add(hub);
  let hubKey = "";
  const drawHub = (lines: [string, string]) => {
    const key = lines.join("|");
    if (key === hubKey) return;
    hubKey = key;
    const g = hubPrint.g;
    g.clearRect(0, 0, 400, 400);
    g.fillStyle = INK;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    let size = 150;
    g.font = `700 ${size}px ${fonts.display}`;
    while (g.measureText(lines[0]).width > 330 && size > 60) {
      size -= 8;
      g.font = `700 ${size}px ${fonts.display}`;
    }
    g.fillText(lines[0], 200, 228);
    g.font = `600 38px ${fonts.sans}`;
    g.fillText(lines[1], 200, 290);
    hubTexture.needsUpdate = true;
  };

  const lcdPrint = makeCanvas(824, 264);
  const lcdTexture = toTexture(lcdPrint.canvas, renderer);
  const lcd = print(lcdTexture, 2.06, 0.66, false);
  lcd.position.copy(LCD);
  desk.add(lcd);
  let lcdKey = "";
  const drawLcd = (lines: [string, string]) => {
    const key = lines.join("|");
    if (key === lcdKey) return;
    lcdKey = key;
    const g = lcdPrint.g;
    g.fillStyle = "#0c1a14";
    g.fillRect(0, 0, 824, 264);
    g.fillStyle = "rgba(159,245,207,0.07)";
    for (let y = 0; y < 264; y += 6) g.fillRect(0, y, 824, 2);
    g.fillStyle = "#a8f7d2";
    g.textBaseline = "alphabetic";
    g.font = `600 78px ${fonts.mono}`;
    g.fillText(lines[0], 36, 112, 752);
    g.fillStyle = "rgba(168,247,210,0.78)";
    g.font = `500 46px ${fonts.mono}`;
    g.fillText(lines[1], 36, 206, 752);
    lcdTexture.needsUpdate = true;
  };

  // ---- keys
  interface Key {
    name: KeyName;
    root: THREE.Object3D;
    rest: number;
    travel: number;
    cap: THREE.MeshStandardMaterial[];
    value: number;
    kick: number;
    hover: number;
    glow: number;
  }
  const legend = (text: string, color: string, w: number, h: number, size: number) => {
    const { canvas: c, g } = makeCanvas(w * 400, h * 400);
    g.fillStyle = color;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `700 ${size}px ${fonts.display}`;
    g.fillText(text, (w * 400) / 2, (h * 400) / 2 + size * 0.06);
    return print(toTexture(c, renderer), w, h);
  };
  const keys: Key[] = [];
  const pickable: THREE.Object3D[] = [];
  const addKey = (name: KeyName, root: THREE.Object3D, at: THREE.Vector3, travel: number, label: THREE.Mesh, labelY: number) => {
    root.position.copy(at);
    root.userData.key = name;
    label.position.y = labelY;
    root.add(label);
    desk.add(root);
    pickable.push(root);
    keys.push({ name, root, rest: at.y, travel, cap: materialsOf(root).slice(0, 1), value: 0, kick: 0, hover: 0, glow: 0 });
  };
  addKey("cancel", own("KeyCancel"), CANCEL, 0.2, legend("Cancel", IVORY, 1.5, 0.7, 150), 0.463);
  ["Pause", "Switch", "Discount"].forEach((text, i) => {
    const at = new THREE.Vector3(OFFER_X[i], TOP + 0.09, OFFER_Z);
    addKey(OFFER_KEYS[i], own("KeyOffer"), at, 0.14, legend(text, INK, 1.0, 0.72, text.length > 6 ? 84 : 100), 0.363);
  });
  const keyByName = (name: KeyName) => keys.find((k) => k.name === name)!;

  // ---- knobs and lamps
  const knobs = KNOB_X.map((x) => {
    const knob = own("Knob");
    knob.position.set(x, TOP + 0.045, KNOB_Z);
    desk.add(knob);
    return { root: knob, value: 0.5 };
  });
  const lamps = (["active", "saved", "cancelled"] as LampName[]).map((name, i) => {
    const lamp = own("Lamp");
    lamp.position.set(LAMP_X[i], TOP + 0.085, LAMP_Z);
    desk.add(lamp);
    const material = materialsOf(lamp)[0];
    material.color.set(LAMP_COLORS[name]).multiplyScalar(0.3);
    material.emissive.set(LAMP_COLORS[name]);
    return { name, material, level: 0 };
  });

  // ---- the subscriber's own agent
  const bot = own("Bot");
  bot.visible = false;
  scene.add(bot);
  const botState = { show: 0, press: 0 };
  // ---- view
  const view = { w: 1, h: 1, fit: 1 };
  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const narrow = w < 900;
    const aspect = w / h;
    view.w = w;
    view.h = h;
    view.fit = narrow ? THREE.MathUtils.clamp(1.05 / aspect, 1, 2.5) : THREE.MathUtils.clamp(1.6 / aspect, 0.82, 1.7);
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    // Shift the picture so the desk clears the text column.
    if (narrow) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.setViewOffset(w, h, -w * 0.21, 0, w, h);
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // ---- pointer: orbit a little, hover and press keys
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, ndc: new THREE.Vector2(9, 9), inside: false };
  const raycaster = new THREE.Raycaster();
  let hovered: Key | null = null;
  const keyUnder = (): Key | null => {
    if (!pointer.inside) return null;
    raycaster.setFromCamera(pointer.ndc, camera);
    const hit = raycaster.intersectObjects(pickable, true)[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o && !o.userData.key) o = o.parent;
    return o ? keyByName(o.userData.key as KeyName) : null;
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.inside = true;
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    pointer.ndc.set(pointer.x, -pointer.y);
  };
  const onLeave = () => {
    pointer.inside = false;
  };
  const onDown = (e: PointerEvent) => {
    onMove(e);
    const key = keyUnder();
    if (key) opts.onKey(key.name);
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);

  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let cancelProgress = 0;
  let intro = calm ? 1 : 0;

  function render(frame: Frame) {
    const { u, dt, now, state } = frame;
    intro = Math.min(1, intro + dt / 1.6);

    // --- parcels
    cancelProgress = approach(cancelProgress, state.cancel, 5, dt);
    if (state.discountPct !== tagPct && state.discountPct > 0) {
      tagPct = state.discountPct;
      tagMaterial.map?.dispose();
      tagMaterial.map = tagTexture(tagPct);
      tagMaterial.needsUpdate = true;
    }
    const alive = 1 - clamp01(cancelProgress * 1.2);
    const pulseAt = calm ? -99 : ((now * 0.55) % 1) * MONTHS;
    tokens.forEach((token, i) => {
      const entered = smooth(clamp01(intro * 2.4 - 0.5 - i * 0.07));
      token.gone = clamp01(cancelProgress * (MONTHS + 1.5) - i);
      token.ghost = approach(token.ghost, i < state.pauseMonths ? 1 : 0, 9, dt);
      token.lite = approach(token.lite, state.lite ? 1 : 0, 7, dt);
      token.tagged = approach(token.tagged, i < state.discountMonths ? 1 : 0, 10, dt);

      const a = tokenAngle(i);
      const leave = smooth(token.gone);
      let wave = Math.abs(i - pulseAt);
      wave = Math.min(wave, MONTHS - wave);
      const pulse = Math.exp(-wave * wave * 1.4) * 0.11 * alive * (1 - token.ghost);
      const r = TOKEN_RADIUS + leave * 0.5;
      token.root.position.set(
        Math.cos(a) * r,
        0.12 + pulse + token.ghost * 0.42 + Math.sin(leave * Math.PI) * 0.5 + (1 - entered) * 1.2,
        Math.sin(a) * r,
      );
      token.root.rotation.y = Math.PI / 2 - a + leave * 2.2;
      const scale = Math.max(0.0001, (1 - leave) * lerp(1, 0.62, token.lite) * lerp(1, 0.9, token.ghost) * entered);
      token.root.scale.setScalar(scale);
      token.root.visible = scale > 0.002;
      const opacity = lerp(1, 0.22, token.ghost);
      for (const m of token.materials) m.opacity = opacity;
      token.root.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) child.castShadow = token.ghost < 0.5;
      });
      const tagScale = smooth(token.tagged) * (1 - leave);
      token.tag.scale.set(Math.max(0.0001, 0.8 * tagScale) / scale, Math.max(0.0001, 0.4 * tagScale) / scale, 1);
      token.tag.visible = tagScale > 0.01;
    });
    platter.rotation.y = calm ? 0 : Math.sin(now * 0.22) * 0.07;

    // --- keys
    const under = keyUnder();
    if (under !== hovered) {
      hovered = under;
      canvas.style.cursor = hovered ? "pointer" : "";
    }
    botState.show = approach(botState.show, state.bot.show, 6, dt);
    botState.press = approach(botState.press, state.bot.press, 14, dt);
    for (const key of keys) {
      key.kick = Math.max(0, key.kick - dt / 0.32);
      key.hover = approach(key.hover, key === hovered ? 1 : 0, 16, dt);
      const kicked = Math.sin(Math.min(1, key.kick * 1.4) * Math.PI);
      const pushed = key.name === "cancel" ? Math.max(state.press.cancel, botState.press) : state.press[key.name];
      const want = Math.max(pushed, kicked, key.hover * 0.22);
      key.value = approach(key.value, want, 26, dt);
      key.root.position.y = key.rest - key.value * key.travel;
      key.glow = approach(key.glow, state.glow === key.name ? 1 : 0, 8, dt);
      const beat = 0.65 + 0.35 * Math.sin(now * 5);
      for (const m of key.cap) {
        m.emissive.set(key.name === "cancel" ? 0xff3b1c : 0x4fe08f);
        m.emissiveIntensity = key.glow * beat * (key.name === "cancel" ? 0.5 : 0.55);
      }
    }

    // --- knobs, lamps, displays
    knobs.forEach((knob, i) => {
      knob.value = approach(knob.value, state.knobs[i], 10, dt);
      knob.root.rotation.y = -rad(-135 + knob.value * 270);
    });
    for (const lamp of lamps) {
      lamp.level = approach(lamp.level, lamp.name === state.lamp ? 1 : 0, 10, dt);
      lamp.material.emissiveIntensity = 0.04 + lamp.level * 2.4;
    }
    drawLcd(state.lcd);
    drawHub(state.hub);

    // --- the subscriber's agent hovers in and presses cancel itself
    const s = smooth(clamp01(botState.show));
    bot.visible = s > 0.01;
    if (bot.visible) {
      const hoverY = lerp(3.4, 2.47, botState.press) + (calm ? 0 : Math.sin(now * 2.1) * 0.07 * (1 - botState.press));
      bot.position.set(lerp(11, CANCEL.x, s), lerp(8.5, hoverY, s), lerp(-5, CANCEL.z - 0.12, s));
      bot.rotation.set(0, lerp(-1.1, 0.2, s), (1 - s) * 0.5);
      bot.scale.setScalar(lerp(0.4, 1.05, s));
    }

    // --- camera
    const cam = cameraAt(u);
    pointer.sx = approach(pointer.sx, calm || !pointer.inside ? 0 : pointer.x, 3, dt);
    pointer.sy = approach(pointer.sy, calm || !pointer.inside ? 0 : pointer.y, 3, dt);
    const sway = calm ? 0 : Math.sin(now * 0.3) * 1.4;
    const az = rad(cam.az + pointer.sx * 4 + sway);
    const el = rad(cam.el - pointer.sy * 2);
    const dist = cam.d * view.fit * lerp(1.12, 1, smooth(intro));
    target.set(cam.t[0], cam.t[1], cam.t[2]);
    camera.position.set(
      target.x + dist * Math.cos(el) * Math.sin(az),
      target.y + dist * Math.sin(el),
      target.z + dist * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  return {
    render,
    cancelAnchor() {
      tmp.set(CANCEL.x, CANCEL.y + 0.55, CANCEL.z).project(camera);
      return { x: (tmp.x * 0.5 + 0.5) * view.w, y: (-tmp.y * 0.5 + 0.5) * view.h };
    },
    pressKey(name) {
      keyByName(name).kick = 1;
    },
    dispose() {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of list) {
          (m as THREE.MeshStandardMaterial).map?.dispose();
          m.dispose();
        }
      });
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
