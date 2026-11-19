// Mini excavator (CAT 303.5 class) simulation: rubber tracks, slewing upper house,
// boom / stick / bucket hydraulics, dozer blade, digging into the dig field, a bucket
// that carries soil, falling clods that pile up where they land, and an automatic
// dig-and-dump cycle. Pure TypeScript: no React, no three.js.
// Conventions as in tractor.ts: yaw 0 faces +Z, local +X is the machine's LEFT side.
import { DIG } from "./dig";
import { clamp, damp, lerp, mulberry32 } from "./math";
import { TR, toWorld } from "./tractor";
import { COLLIDERS, DYNAMIC, EXC_START, MAP_LIMIT, heightAt, type Collider } from "./world";

export const EX = {
  TRACK_HALF: 0.66, // track centre line to machine centre
  TRACK_W: 0.3,
  SWING_Y: 0.55, // top of the slew ring above the ground
  /** boom foot pin in house coordinates */
  BOOM: { x: -0.08, y: 0.36, z: 0.92 },
  L1: 2.35, // boom pin -> stick pin
  L2: 1.4, // stick pin -> bucket pin
  L3: 0.7, // bucket pin -> teeth
  BUCKET_HALF: 0.3,
  /** heaped bucket volume in m³ */
  CAP: 0.38,
  VMAX: 2.2,
  ACCEL: 1.8,
  TURN: 0.8,
  CRANK_TIME: 1.8,
  IDLE_RPM: 1000,
  MAX_RPM: 2400,
  BODY_R: 1.08,
  BODY_CIRCLES: [0.5, -0.45],
  BLADE_Z: 1.24,
  BLADE_HALF: 0.86,
  BLADE_DOWN_Y: -0.03,
  BLADE_UP_Y: 0.3,
  /** how far below the surface each automatic pass bites */
  BITE: 0.42,
  /** swing angle of the spoil pile relative to the dig direction (left, cab side) */
  DUMP_SWING: 1.75,
};

export type JointName = "swing" | "boom" | "stick" | "bucket" | "blade";
type JointSpec = { min: number; max: number; speed: number; accel: number };
export const JOINTS: Record<JointName, JointSpec> = {
  swing: { min: -1e9, max: 1e9, speed: 0.95, accel: 1.8 },
  boom: { min: -0.85, max: 1.15, speed: 0.62, accel: 2.8 },
  stick: { min: -2.7, max: -0.5, speed: 0.85, accel: 3.4 },
  bucket: { min: -2.45, max: 0.6, speed: 1.3, accel: 5.5 },
  blade: { min: 0, max: 1, speed: 1.4, accel: 8 },
};
const JOINT_NAMES = Object.keys(JOINTS) as JointName[];

export type Phase = "idle" | "reach" | "plunge" | "drag" | "curl" | "swingOut" | "dump" | "swingBack";
export const PHASE_NAMES: Record<Phase, string> = {
  idle: "",
  reach: "Kol uzatılıyor",
  plunge: "Kova toprağa dalıyor",
  drag: "Kazılıyor",
  curl: "Kova kapanıyor",
  swingOut: "Kule dönüyor",
  dump: "Toprak boşaltılıyor",
  swingBack: "Kazı yerine dönülüyor",
};

export type Clod = { x: number; y: number; z: number; vx: number; vy: number; vz: number; vol: number; spin: number };

export type ExInput = {
  drive: number; // -1..1 forward / back
  turn: number; // -1..1, +1 turns right
  swing: number; // +1 slews the house left
  boom: number; // +1 raises
  stick: number; // +1 pushes the stick out
  bucket: number; // +1 opens (dumps), -1 curls in
  bladeDown: boolean;
  engineOn: boolean;
  autoToggle: boolean;
};

export type ExEvent =
  | { type: "crank" | "stall" | "scoop" | "dump" | "full" | "autoOn" | "autoOff" | "noHydraulics" }
  | { type: "limit" | "bump"; strength: number };

export type Vec3 = { x: number; y: number; z: number };

export type Excavator = {
  x: number; y: number; z: number; yaw: number; pitch: number; roll: number;
  v: number; w: number; leftDist: number; rightDist: number;
  j: Record<JointName, { p: number; v: number }>;
  engine: boolean; running: boolean; crankEnd: number; t: number; rpm: number; load: number;
  bucketLoad: number; dugM3: number; dumpedM3: number; pour: number;
  tip: Vec3; tipPrev: Vec3; hasPrev: boolean; inSoil: boolean; digging: number; dumping: number; hyd: number;
  auto: { on: boolean; phase: Phase; t: number; swing0: number; gy: number; ty: number; s0: number; cycle: number };
  clods: Clod[];
  landed: Vec3[];
  events: ExEvent[];
  relaxT: number;
  bladeWork: number;
};

const OFFSETS = [0, 0.09, -0.09, 0.045, -0.045];
const rnd = mulberry32(303);

export function createExcavator(): Excavator {
  const j = {} as Excavator["j"];
  for (const n of JOINT_NAMES) j[n] = { p: 0, v: 0 };
  const ex: Excavator = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, v: 0, w: 0, leftDist: 0, rightDist: 0, j,
    engine: false, running: false, crankEnd: 0, t: 0, rpm: 0, load: 0,
    bucketLoad: 0, dugM3: 0, dumpedM3: 0, pour: 0,
    tip: { x: 0, y: 0, z: 0 }, tipPrev: { x: 0, y: 0, z: 0 }, hasPrev: false, inSoil: false, digging: 0, dumping: 0, hyd: 0,
    auto: { on: false, phase: "idle", t: 0, swing0: 0, gy: 0, ty: 0, s0: 3.4, cycle: 0 },
    clods: [], landed: [], events: [], relaxT: 0, bladeWork: 0,
  };
  resetExcavator(ex);
  return ex;
}

/** Travel pose: boom up, stick tucked, bucket curled, blade raised. */
export function resetExcavator(ex: Excavator) {
  Object.assign(ex, { x: EXC_START.x, z: EXC_START.z, yaw: EXC_START.yaw, v: 0, w: 0, pitch: 0, roll: 0 });
  ex.y = heightAt(ex.x, ex.z);
  ex.j.swing.p = 0;
  ex.j.boom.p = 0.75;
  ex.j.stick.p = -2.05;
  ex.j.bucket.p = -1.6;
  ex.j.blade.p = 1;
  for (const n of JOINT_NAMES) ex.j[n].v = 0;
  ex.auto.on = false;
  ex.auto.phase = "idle";
  ex.hasPrev = false;
  syncDynamic(ex);
}

/** Arm angles in the boom plane: boom, stick and bucket absolute directions. */
export function armAngles(ex: Excavator) {
  const t1 = ex.j.boom.p;
  const t2 = t1 + ex.j.stick.p;
  const t3 = t2 + ex.j.bucket.p;
  return { t1, t2, t3 };
}

/** Boom-plane coordinates (s forward from the boom pin, y up) of the stick pin, bucket pin and teeth. */
export function armPlane(ex: Excavator) {
  const { t1, t2, t3 } = armAngles(ex);
  const p1s = EX.L1 * Math.cos(t1);
  const p1y = EX.L1 * Math.sin(t1);
  const p2s = p1s + EX.L2 * Math.cos(t2);
  const p2y = p1y + EX.L2 * Math.sin(t2);
  return { p1s, p1y, p2s, p2y, ts: p2s + EX.L3 * Math.cos(t3), ty: p2y + EX.L3 * Math.sin(t3), t3 };
}

/** House-local point -> world. */
export function houseToWorld(ex: Excavator, hx: number, hy: number, hz: number, out: Vec3) {
  const s = ex.j.swing.p;
  const c = Math.cos(s);
  const n = Math.sin(s);
  return toWorld(ex, hx * c + hz * n, hy + EX.SWING_Y, -hx * n + hz * c, out);
}

/** Boom-plane point -> world (x across the house, s along the boom plane, y up). */
export function planeToWorld(ex: Excavator, x: number, s: number, y: number, out: Vec3) {
  return houseToWorld(ex, EX.BOOM.x + x, EX.BOOM.y + y, EX.BOOM.z + s, out);
}

const tmpA = { x: 0, y: 0, z: 0 };
const tmpB = { x: 0, y: 0, z: 0 };

function syncDynamic(ex: Excavator) {
  while (DYNAMIC.length < EX.BODY_CIRCLES.length) DYNAMIC.push({ k: "c", x: 0, z: 0, r: EX.BODY_R });
  EX.BODY_CIRCLES.forEach((lz, i) => {
    const c = DYNAMIC[i] as Extract<Collider, { k: "c" }>;
    c.x = ex.x + Math.sin(ex.yaw) * lz;
    c.z = ex.z + Math.cos(ex.yaw) * lz;
  });
}

function pushOut(ex: Excavator, cx: number, cz: number, r: number, list: readonly Collider[]) {
  let hit = false;
  for (const c of list) {
    const dx = cx - c.x;
    const dz = cz - c.z;
    if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
    if (c.k === "c") {
      const d = Math.hypot(dx, dz);
      const m = c.r + r;
      if (d < m && d > 1e-4) {
        ex.x += (dx / d) * (m - d);
        ex.z += (dz / d) * (m - d);
        hit = true;
      }
    } else {
      const lx = dx * c.c - dz * c.s;
      const lz = dx * c.s + dz * c.c;
      const qx = clamp(lx, -c.hx, c.hx);
      const qz = clamp(lz, -c.hz, c.hz);
      let nx = lx - qx;
      let nz = lz - qz;
      let d = Math.hypot(nx, nz);
      let push = 0;
      if (d < 1e-4) {
        const px = c.hx - Math.abs(lx);
        const pz = c.hz - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; push = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = pz + r; }
        d = 1;
      } else if (d < r) push = r - d;
      if (push > 0) {
        nx /= d;
        nz /= d;
        ex.x += (nx * c.c + nz * c.s) * push;
        ex.z += (-nx * c.s + nz * c.c) * push;
        hit = true;
      }
    }
  }
  return hit;
}

const tractorCircles: Collider[] = TR.BODY_CIRCLES.map(() => ({ k: "c", x: 0, z: 0, r: TR.BODY_R }));

// ---------------- automatic dig cycle ----------------
type Cmd = Record<JointName, number>;
const toward = (cur: number, target: number, gain = 3, lim = 1) => clamp((target - cur) * gain, -lim, lim);
const near = (cur: number, target: number, tol = 0.05) => Math.abs(cur - target) < tol;

/** Aim the next pass: bite below the lowest ground along the trench the bucket will drag through. */
function startPlunge(ex: Excavator) {
  let low = 1e9;
  for (let s = 2.0; s <= 3.61; s += 0.2) {
    planeToWorld(ex, 0, s - EX.BOOM.z, 0, tmpA);
    low = Math.min(low, heightAt(tmpA.x, tmpA.z));
  }
  ex.auto.gy = low;
  ex.auto.s0 = 3.6;
}

function autoCommands(ex: Excavator, cmd: Cmd, dt: number) {
  const a = ex.auto;
  const J = ex.j;
  a.t += dt;
  const off = OFFSETS[a.cycle % OFFSETS.length]!;
  const digSwing = a.swing0 + off;
  const go = (p: Phase) => {
    a.phase = p;
    a.t = 0;
  };
  const plane = armPlane(ex);
  switch (a.phase) {
    case "idle":
    case "reach": {
      a.phase = "reach";
      cmd.swing = toward(J.swing.p, digSwing, 2.2);
      cmd.boom = toward(J.boom.p, 0.45);
      cmd.stick = toward(J.stick.p, -1.05);
      cmd.bucket = toward(J.bucket.p, 0.15);
      if ((near(J.swing.p, digSwing) && near(J.boom.p, 0.45) && near(J.stick.p, -1.05) && near(J.bucket.p, 0.15, 0.08)) || a.t > 6) {
        go("plunge");
        startPlunge(ex);
      }
      break;
    }
    case "plunge": {
      cmd.swing = toward(J.swing.p, digSwing, 2.2);
      // straight down at the starting reach: boom lowers, the stick keeps the bucket out
      cmd.boom = -0.85;
      cmd.stick = clamp((a.s0 - (EX.BOOM.z + plane.ts)) * 1.6, -0.7, 0.7);
      cmd.bucket = toward(J.bucket.p, -0.35, 2, 0.6);
      const target = a.gy - EX.BITE;
      if (ex.tip.y <= target || J.boom.p <= JOINTS.boom.min + 0.01 || a.t > 5) {
        a.ty = Math.max(ex.tip.y, target - 0.05);
        go("drag");
      }
      break;
    }
    case "drag": {
      cmd.swing = toward(J.swing.p, digSwing, 2.2);
      cmd.stick = toward(J.stick.p, -2.3, 2.5, 0.9);
      cmd.bucket = toward(J.bucket.p, -1.05, 1.5, 0.45);
      cmd.boom = clamp((a.ty - ex.tip.y) * 2.4, -0.8, 0.8);
      const reach = EX.BOOM.z + plane.ts;
      if (J.stick.p < -2.2 || ex.bucketLoad >= EX.CAP * 0.97 || reach < 1.9 || a.t > 7) go("curl");
      break;
    }
    case "curl": {
      cmd.bucket = toward(J.bucket.p, -2.35, 3);
      cmd.boom = J.bucket.p < -1.5 ? toward(J.boom.p, 0.8) : 0.25;
      cmd.stick = toward(J.stick.p, -1.95, 2, 0.5);
      if ((near(J.bucket.p, -2.35, 0.08) && J.boom.p > 0.5) || a.t > 5) go("swingOut");
      break;
    }
    case "swingOut": {
      const dumpSwing = a.swing0 + EX.DUMP_SWING;
      cmd.swing = toward(J.swing.p, dumpSwing, 2.2);
      cmd.boom = toward(J.boom.p, 0.85);
      cmd.stick = toward(J.stick.p, -1.45, 2, 0.7);
      cmd.bucket = toward(J.bucket.p, -2.35);
      if (near(J.swing.p, dumpSwing, 0.05) || a.t > 7) go("dump");
      break;
    }
    case "dump": {
      cmd.swing = toward(J.swing.p, a.swing0 + EX.DUMP_SWING, 2.2);
      cmd.boom = toward(J.boom.p, 0.85);
      cmd.stick = toward(J.stick.p, -0.95, 2, 0.6);
      cmd.bucket = toward(J.bucket.p, 0.5, 2.2, 0.8);
      if ((J.bucket.p > 0.3 && ex.bucketLoad < 0.002 && a.t > 1.2) || a.t > 6) {
        a.cycle++;
        go("swingBack");
      }
      break;
    }
    case "swingBack": {
      cmd.swing = toward(J.swing.p, digSwing, 2.2);
      cmd.boom = toward(J.boom.p, 0.45);
      cmd.stick = toward(J.stick.p, -1.05);
      cmd.bucket = toward(J.bucket.p, 0.15);
      if ((near(J.swing.p, digSwing) && near(J.boom.p, 0.45, 0.08) && near(J.stick.p, -1.05, 0.08)) || a.t > 7) {
        go("plunge");
        startPlunge(ex);
      }
      break;
    }
  }
}

// ---------------- step ----------------
export function stepExcavator(ex: Excavator, inp: ExInput, dtIn: number, tractor?: { x: number; z: number; yaw: number }) {
  const dt = Math.min(dtIn, 0.05);
  ex.t += dt;

  // engine
  if (inp.engineOn && !ex.engine) {
    ex.engine = true;
    ex.crankEnd = ex.t + EX.CRANK_TIME;
    ex.events.push({ type: "crank" });
  } else if (!inp.engineOn && ex.engine) {
    ex.engine = false;
    ex.events.push({ type: "stall" });
  }
  const running = ex.engine && ex.t >= ex.crankEnd;
  ex.running = running;

  // tracks
  const vT = running ? clamp(inp.drive, -1, 1) * EX.VMAX : 0;
  ex.v += clamp(vT - ex.v, -EX.ACCEL * dt * 1.5, EX.ACCEL * dt);
  if (!running) ex.v *= Math.exp(-6 * dt);
  const wT = running ? -clamp(inp.turn, -1, 1) * EX.TURN : 0;
  ex.w += clamp(wT - ex.w, -2.5 * dt, 2.5 * dt);
  ex.v *= 1 - Math.max(0, Math.sin(ex.pitch) * Math.sign(ex.v)) * 0.6 * dt; // slower uphill
  ex.yaw += ex.w * dt;
  ex.x += Math.sin(ex.yaw) * ex.v * dt;
  ex.z += Math.cos(ex.yaw) * ex.v * dt;
  ex.x = clamp(ex.x, -MAP_LIMIT, MAP_LIMIT);
  ex.z = clamp(ex.z, -MAP_LIMIT, MAP_LIMIT);
  ex.leftDist += (ex.v - ex.w * EX.TRACK_HALF) * dt;
  ex.rightDist += (ex.v + ex.w * EX.TRACK_HALF) * dt;

  // collisions with buildings, trees and the parked tractor
  if (tractor)
    TR.BODY_CIRCLES.forEach((lz, i) => {
      const c = tractorCircles[i] as Extract<Collider, { k: "c" }>;
      c.x = tractor.x + Math.sin(tractor.yaw) * lz;
      c.z = tractor.z + Math.cos(tractor.yaw) * lz;
    });
  let hit = false;
  for (const lz of EX.BODY_CIRCLES) {
    const cx = ex.x + Math.sin(ex.yaw) * lz;
    const cz = ex.z + Math.cos(ex.yaw) * lz;
    hit = pushOut(ex, cx, cz, EX.BODY_R, COLLIDERS) || hit;
    if (tractor) hit = pushOut(ex, ex.x + Math.sin(ex.yaw) * lz, ex.z + Math.cos(ex.yaw) * lz, EX.BODY_R, tractorCircles) || hit;
  }
  if (hit) {
    if (Math.abs(ex.v) > 1) ex.events.push({ type: "bump", strength: Math.abs(ex.v) });
    ex.v *= 0.3;
  }
  syncDynamic(ex);

  // rest on the ground: each track bridges small holes, resting on its highest points
  const sy = Math.sin(ex.yaw);
  const cy = Math.cos(ex.yaw);
  const H = (lx: number, lz: number) => heightAt(ex.x + lx * cy + lz * sy, ex.z - lx * sy + lz * cy);
  const side = (lx: number) => {
    const h = [-0.9, -0.45, 0, 0.45, 0.9].map((lz) => H(lx, lz));
    return { f: Math.max(h[2]!, h[3]!, h[4]!), r: Math.max(h[0]!, h[1]!, h[2]!) };
  };
  const L = side(EX.TRACK_HALF);
  const R = side(-EX.TRACK_HALF);
  const tPitch = Math.atan2((L.f + R.f) / 2 - (L.r + R.r) / 2, 1.2);
  const tRoll = Math.atan2((L.f + L.r) / 2 - (R.f + R.r) / 2, EX.TRACK_HALF * 2);
  const tY = (L.f + L.r + R.f + R.r) / 4;
  const k = damp(10, dt);
  ex.y = Math.abs(ex.y - tY) > 2 ? tY : lerp(ex.y, tY, k);
  ex.pitch = lerp(ex.pitch, tPitch, k);
  ex.roll = lerp(ex.roll, tRoll, k);

  // hydraulics
  const cmd: Cmd = { swing: inp.swing, boom: inp.boom, stick: inp.stick, bucket: inp.bucket, blade: 0 };
  const manual = Math.abs(inp.swing) + Math.abs(inp.boom) + Math.abs(inp.stick) + Math.abs(inp.bucket) > 0.01;
  if (inp.autoToggle) {
    ex.auto.on = !ex.auto.on && running;
    if (ex.auto.on) {
      ex.auto.phase = ex.bucketLoad > 0.02 ? "swingOut" : "reach";
      ex.auto.t = 0;
      ex.auto.swing0 = ex.auto.phase === "swingOut" ? ex.j.swing.p - EX.DUMP_SWING : ex.j.swing.p;
      ex.events.push({ type: "autoOn" });
    } else ex.events.push({ type: running ? "autoOff" : "noHydraulics" });
  }
  if (ex.auto.on && (manual || !running)) {
    ex.auto.on = false;
    ex.events.push({ type: "autoOff" });
  }
  if (!ex.auto.on) ex.auto.phase = "idle";
  if (ex.auto.on) autoCommands(ex, cmd, dt);
  cmd.blade = (inp.bladeDown ? -1 : 1) * 1;
  if (!running && manual && ex.t % 1.5 < dt) ex.events.push({ type: "noHydraulics" });

  const full = ex.bucketLoad >= EX.CAP * 0.97;
  let hyd = 0;
  for (const n of JOINT_NAMES) {
    const J = ex.j[n];
    const S = JOINTS[n];
    let c = clamp(cmd[n], -1, 1);
    if (ex.inSoil && (n === "stick" || n === "bucket" || (n === "boom" && c < 0))) c *= full ? 0.3 : 0.62;
    const tv = running ? c * S.speed : 0;
    J.v += clamp(tv - J.v, -S.accel * dt, S.accel * dt);
    J.p += J.v * dt;
    if (J.p < S.min || J.p > S.max) {
      if (Math.abs(J.v) > S.speed * 0.5 && n !== "blade") ex.events.push({ type: "limit", strength: Math.abs(J.v) / S.speed });
      J.p = clamp(J.p, S.min, S.max);
      J.v = 0;
    }
    if (n !== "blade") hyd += Math.abs(J.v) / S.speed;
  }
  ex.hyd = Math.min(1, hyd);

  // bucket teeth in the world
  const pl = armPlane(ex);
  planeToWorld(ex, 0, pl.ts, pl.ty, ex.tip);
  const ground = heightAt(ex.tip.x, ex.tip.z);
  const wasIn = ex.inSoil;
  ex.inSoil = ex.tip.y < ground - 0.02;
  if (ex.inSoil && !wasIn) ex.events.push({ type: "scoop" });
  ex.digging = lerp(ex.digging, 0, damp(4, dt));
  if (ex.inSoil && ex.hasPrev) {
    const room = EX.CAP - ex.bucketLoad;
    const cut = DIG.carve(ex.tipPrev.x, ex.tipPrev.z, ex.tip.x, ex.tip.z, ex.tip.y, EX.BUCKET_HALF, room);
    if (cut > 0) {
      ex.dugM3 += cut;
      const spill = cut * 0.05;
      ex.bucketLoad += cut - spill;
      ex.pour += spill;
      ex.digging = Math.min(1, ex.digging + cut * 60);
      if (ex.bucketLoad >= EX.CAP * 0.97 && !full) ex.events.push({ type: "full" });
      ex.relaxT += dt;
      if (ex.relaxT > 0.1) {
        ex.relaxT = 0;
        DIG.relax(ex.tip.x - 1.6, ex.tip.z - 1.6, ex.tip.x + 1.6, ex.tip.z + 1.6, 2);
      }
    }
  }
  // spill a little while digging, pour it all out when the bucket mouth faces down
  const mouthUp = -Math.cos(pl.t3 - ex.pitch * Math.cos(ex.j.swing.p));
  const wasDumping = ex.dumping > 0.1;
  ex.dumping = 0;
  if (ex.bucketLoad > 1e-4 && mouthUp < 0.18) {
    const rate = (0.18 - mouthUp) * 0.32 + 0.02;
    const out = Math.min(ex.bucketLoad, rate * dt);
    ex.bucketLoad -= out;
    ex.pour += out;
    ex.dumping = clamp(rate * 3, 0, 1);
    if (!wasDumping) ex.events.push({ type: "dump" });
  }
  if (!ex.inSoil && (ex.pour > 0.0045 || (ex.pour > 0 && ex.bucketLoad <= 1e-4))) {
    // clods leave from the bucket mouth, spread across its width
    const ms = pl.p2s + 0.55 * EX.L3 * Math.cos(pl.t3) + 0.12 * Math.sin(pl.t3);
    const my = pl.p2y + 0.55 * EX.L3 * Math.sin(pl.t3) - 0.12 * Math.cos(pl.t3);
    while (ex.pour > 1e-5 && ex.clods.length < 260) {
      const vol = Math.min(ex.pour, 0.0035 + rnd() * 0.003);
      ex.pour -= vol;
      planeToWorld(ex, (rnd() - 0.5) * EX.BUCKET_HALF * 1.8, ms, my, tmpA);
      const vx = ex.hasPrev ? (ex.tip.x - ex.tipPrev.x) / dt : 0;
      const vz = ex.hasPrev ? (ex.tip.z - ex.tipPrev.z) / dt : 0;
      ex.clods.push({
        x: tmpA.x, y: tmpA.y, z: tmpA.z,
        vx: vx * 0.4 + (rnd() - 0.5) * 0.7, vy: (rnd() - 0.3) * 0.6, vz: vz * 0.4 + (rnd() - 0.5) * 0.7,
        vol, spin: rnd() * 6.28,
      });
      if (ex.pour < 0.0045 && ex.bucketLoad > 1e-4) break;
    }
  }
  ex.tipPrev.x = ex.tip.x;
  ex.tipPrev.y = ex.tip.y;
  ex.tipPrev.z = ex.tip.z;
  ex.hasPrev = true;

  // falling clods
  let bx0 = 1e9, bz0 = 1e9, bx1 = -1e9, bz1 = -1e9;
  ex.landed.length = 0;
  for (let i = ex.clods.length - 1; i >= 0; i--) {
    const c = ex.clods[i]!;
    c.vy -= 9.81 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.z += c.vz * dt;
    c.spin += dt * 5;
    const g = heightAt(c.x, c.z);
    if (c.y <= g) {
      DIG.deposit(c.x, c.z, c.vol, 0.42);
      ex.dumpedM3 += c.vol;
      bx0 = Math.min(bx0, c.x); bz0 = Math.min(bz0, c.z);
      bx1 = Math.max(bx1, c.x); bz1 = Math.max(bz1, c.z);
      if (ex.landed.length < 24) ex.landed.push({ x: c.x, y: g, z: c.z });
      ex.clods[i] = ex.clods[ex.clods.length - 1]!;
      ex.clods.pop();
    }
  }
  if (bx1 > bx0 - 1) DIG.relax(bx0 - 1.4, bz0 - 1.4, bx1 + 1.4, bz1 + 1.4, 2, 0.32);

  // dozer blade: scrape soil down to the blade edge and push it ahead as a berm
  ex.bladeWork = 0;
  const bladeY = lerp(EX.BLADE_DOWN_Y, EX.BLADE_UP_Y, ex.j.blade.p);
  if (ex.j.blade.p < 0.2 && ex.v > 0.08) {
    toWorld(ex, EX.BLADE_HALF, bladeY, EX.BLADE_Z, tmpA);
    toWorld(ex, -EX.BLADE_HALF, bladeY, EX.BLADE_Z, tmpB);
    const cut = DIG.carve(tmpA.x, tmpA.z, tmpB.x, tmpB.z, (tmpA.y + tmpB.y) / 2, 0.25, 1.2 * dt * ex.v);
    if (cut > 0) {
      toWorld(ex, 0, 0, EX.BLADE_Z + 0.95, tmpA);
      DIG.deposit(tmpA.x, tmpA.z, cut, 0.55);
      DIG.relax(tmpA.x - 2, tmpA.z - 2, tmpA.x + 2, tmpA.z + 2, 1, 0.3);
      ex.bladeWork = Math.min(1, cut / dt);
    }
  }

  // engine speed & load
  if (running) {
    const work = Math.min(1, ex.hyd * 0.7 + Math.abs(ex.v) / EX.VMAX * 0.5 + ex.digging * 0.6 + ex.bladeWork * 0.5);
    ex.load = lerp(ex.load, work, damp(5, dt));
    ex.rpm = lerp(ex.rpm, EX.IDLE_RPM + (EX.MAX_RPM - EX.IDLE_RPM) * (0.25 + 0.75 * ex.load), damp(3, dt));
  } else if (ex.engine) {
    ex.rpm = 170 + 40 * Math.sin(ex.t * 25);
    ex.load = 0;
  } else {
    ex.rpm = lerp(ex.rpm, 0, damp(2.2, dt));
    ex.load = 0;
  }
}

/** Soil currently between the ground and the bucket (in the bucket or in the air). */
export function soilInFlight(ex: Excavator) {
  return ex.bucketLoad + ex.pour + ex.clods.reduce((s, c) => s + c.vol, 0);
}
