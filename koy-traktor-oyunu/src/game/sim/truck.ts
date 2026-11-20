// Mercedes-Benz Actros 8x4 tipper (damperli kamyon) simulation: rear-axle bicycle model,
// diesel start-up, a hydraulic bed that fills with soil from the excavator and tips it out
// behind the truck. Pure TypeScript: no React, no three.js.
// Conventions as in tractor.ts: yaw 0 faces +Z, local +X is the truck's LEFT side, and the
// truck origin (x, z) is the centre of the rear tandem axles.
import { DIG } from "./dig";
import { type Clod } from "./excavator";
import { clamp, damp, lerp, wrapAngle } from "./math";
import { TR } from "./tractor";
import {
  COLLIDERS,
  DYNAMIC,
  MAP_LIMIT,
  SURF,
  SURF_CRR,
  TRUCK_BODY,
  TRUCK_START,
  baseSurfaceAt,
  heightAt,
  type Collider,
} from "./world";

export const TK = {
  /** rear tandem centre -> centre of the two steering axles */
  WHEELBASE: 5.15,
  HALF_TRACK: 1.1,
  G: 9.81,
  VMAX_F: 22, // 79 km/h
  VMAX_R: 5.5,
  DRIVE: 2.6,
  BRAKE: 7,
  STEER_MAX: 0.6,
  STEER_RATE: 1.7,
  IDLE_RPM: 600,
  MAX_RPM: 1900,
  CRANK_TIME: 2.4,
  BODY_CIRCLES: [5.5, 3.4, 1.3, -0.8],
  BODY_R: 1.4,
  /** payload in m³ */
  CAP: 8,
  /** bed fully raised = 54° */
  BED_MAX: 0.95,
  /** raise / lower speed (fraction of full travel per second): about 5 s up */
  BED_RATE: 0.2,
  /** bed hinge (rear) on the chassis */
  HINGE_Y: 1.27,
  HINGE_Z: -1.85,
  /** inside of the bed in truck coordinates when lowered */
  BED_HALF: 1.12,
  BED_Z0: -1.8,
  BED_Z1: 4.0,
  FLOOR_Y: 1.38,
  RIM_Y: 2.42,
  /** soil starts to slide once the bed is tilted past this angle (rad) */
  DUMP_ANGLE: 0.42,
  /** soil flow out of a fully raised bed, m³/s */
  FLOW: 1.3,
};

export type TruckEvent =
  | { type: "crank" }
  | { type: "stall" }
  | { type: "noHydraulics" }
  | { type: "full" }
  | { type: "tipStart" }
  | { type: "tipEnd" }
  | { type: "bump"; strength: number };

export type Truck = {
  x: number; z: number; y: number; yaw: number; v: number;
  pitch: number; roll: number;
  steer: number; gas: number; brake: number; dir: 1 | -1;
  wheelDist: number; rpm: number; load: number; surface: number;
  engine: boolean; running: boolean; crankEnd: number; t: number;
  /** bed raise 0..1 (angle = bed * BED_MAX) and its current motion -1 / 0 / 1 */
  bed: number; bedMoving: number;
  /** soil in the bed, m³ */
  cargo: number; loadedM3: number; tippedM3: number; tipping: boolean;
  events: TruckEvent[];
};

export type TruckInput = {
  throttle: number; brake: number; steer: number; bedCmd: number; dir: 1 | -1; engineOn: boolean;
};

export const PARKED_TRUCK = { throttle: 0, brake: 1, steer: 0, bedCmd: 0 };

export function createTruck(): Truck {
  const tk: Truck = {
    x: 0, z: 0, y: 0, yaw: 0, v: 0, pitch: 0, roll: 0,
    steer: 0, gas: 0, brake: 0, dir: 1, wheelDist: 0, rpm: 0, load: 0, surface: 0,
    engine: false, running: false, crankEnd: 0, t: 0,
    bed: 0, bedMoving: 0, cargo: 0, loadedM3: 0, tippedM3: 0, tipping: false, events: [],
  };
  resetTruck(tk);
  return tk;
}

export function resetTruck(tk: Truck) {
  Object.assign(tk, { x: TRUCK_START.x, z: TRUCK_START.z, yaw: TRUCK_START.yaw, v: 0, steer: 0, gas: 0, brake: 0, bed: 0, bedMoving: 0, tipping: false });
  tk.y = heightAt(tk.x, tk.z);
  poseOnGround(tk, 1, true);
  syncBody(tk);
}

const sin = Math.sin;
const cos = Math.cos;

/** World position of a point given in truck coordinates (lx to the left, lz forward). */
export function truckToWorld(tk: Truck, lx: number, lz: number, out: { x: number; z: number }) {
  out.x = tk.x + lx * cos(tk.yaw) + lz * sin(tk.yaw);
  out.z = tk.z - lx * sin(tk.yaw) + lz * cos(tk.yaw);
  return out;
}

const tmp = { x: 0, z: 0 };
function groundAt(tk: Truck, lx: number, lz: number) {
  truckToWorld(tk, lx, lz, tmp);
  return heightAt(tmp.x, tmp.z);
}

function poseOnGround(tk: Truck, k: number, snap = false) {
  const h = TK.HALF_TRACK;
  const rl = groundAt(tk, h, 0);
  const rr = groundAt(tk, -h, 0);
  const fl = groundAt(tk, h, TK.WHEELBASE);
  const fr = groundAt(tk, -h, TK.WHEELBASE);
  const yR = (rl + rr) / 2;
  const yF = (fl + fr) / 2;
  const pitch = Math.atan2(yF - yR, TK.WHEELBASE);
  const roll = Math.atan2((rl + fl) / 2 - (rr + fr) / 2, h * 2);
  if (snap) {
    tk.y = yR;
    tk.pitch = pitch;
    tk.roll = roll;
  } else {
    tk.y = lerp(tk.y, yR, k);
    tk.pitch = lerp(tk.pitch, pitch, k);
    tk.roll = lerp(tk.roll, roll, k);
  }
}

function syncBody(tk: Truck) {
  while (TRUCK_BODY.length < TK.BODY_CIRCLES.length) TRUCK_BODY.push({ k: "c", x: 0, z: 0, r: TK.BODY_R });
  TK.BODY_CIRCLES.forEach((lz, i) => {
    const c = TRUCK_BODY[i] as Extract<Collider, { k: "c" }>;
    c.x = tk.x + sin(tk.yaw) * lz;
    c.z = tk.z + cos(tk.yaw) * lz;
  });
}

const tractorCircles: Collider[] = TR.BODY_CIRCLES.map(() => ({ k: "c", x: 0, z: 0, r: TR.BODY_R }));

function pushOut(tk: Truck, cx: number, cz: number, r: number, list: readonly Collider[]) {
  let hit = false;
  for (const c of list) {
    const dx = cx - c.x;
    const dz = cz - c.z;
    if (Math.abs(dx) > 16 || Math.abs(dz) > 16) continue;
    if (c.k === "c") {
      const d = Math.hypot(dx, dz);
      const m = c.r + r;
      if (d < m && d > 1e-4) {
        tk.x += (dx / d) * (m - d);
        tk.z += (dz / d) * (m - d);
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
        tk.x += (nx * c.c + nz * c.s) * push;
        tk.z += (-nx * c.s + nz * c.c) * push;
        hit = true;
      }
    }
  }
  return hit;
}

/** Height of the soil heap in the bed (peak) for a given payload. */
export const heapHeight = (cargo: number) => (cargo / TK.CAP) * 0.85;

/** Catches clods dropped by the excavator bucket into the lowered bed. Returns true when swallowed. */
export function bedSink(tk: Truck, c: Clod): boolean {
  if (tk.bed > 0.08) return false;
  const dx = c.x - tk.x;
  const dz = c.z - tk.z;
  const lx = dx * cos(tk.yaw) - dz * sin(tk.yaw);
  const lz = dx * sin(tk.yaw) + dz * cos(tk.yaw);
  if (Math.abs(lx) > TK.BED_HALF || lz < TK.BED_Z0 || lz > TK.BED_Z1) return false;
  if (c.y > tk.y + TK.FLOOR_Y + heapHeight(tk.cargo)) return false;
  if (tk.cargo >= TK.CAP - 1e-6) {
    if (!tk.events.some((e) => e.type === "full")) tk.events.push({ type: "full" });
    return true; // spills over the rim
  }
  const add = Math.min(c.vol, TK.CAP - tk.cargo);
  tk.cargo += add;
  tk.loadedM3 += add;
  return true;
}

export function surfaceUnder(tk: Truck) {
  const s = baseSurfaceAt(tk.x, tk.z);
  if (s === SURF.asphalt || s === SURF.concrete) return s;
  if (Math.abs(DIG.at(tk.x, tk.z)) > 0.06) return SURF.dirt;
  return s;
}

export function stepTruck(tk: Truck, inp: TruckInput, dtIn: number, tractor?: { x: number; z: number; yaw: number }) {
  const dt = Math.min(dtIn, 0.05);
  tk.t += dt;
  tk.dir = inp.dir;

  // ---- engine ----
  if (inp.engineOn && !tk.engine) {
    tk.engine = true;
    tk.crankEnd = tk.t + TK.CRANK_TIME;
    tk.rpm = 0;
    tk.events.push({ type: "crank" });
  } else if (!inp.engineOn && tk.engine) {
    tk.engine = false;
    tk.events.push({ type: "stall" });
  }
  const running = tk.engine && tk.t >= tk.crankEnd;
  tk.running = running;

  tk.gas += clamp((running ? inp.throttle : 0) - tk.gas, -3 * dt, 2 * dt);
  tk.brake += clamp(inp.brake - tk.brake, -5 * dt, 8 * dt);

  // ---- drive ----
  tk.surface = surfaceUnder(tk);
  const crr = SURF_CRR[tk.surface] ?? 0.03;
  const cargoK = 1 + 0.55 * (tk.cargo / TK.CAP);
  const vmax = inp.dir > 0 ? TK.VMAX_F : TK.VMAX_R;
  const along = tk.v * inp.dir; // speed in the chosen gear's direction
  let a = 0;
  if (running && tk.gas > 0.01) a = (inp.dir * tk.gas * TK.DRIVE * (1 - Math.pow(clamp(along / vmax, 0, 1), 1.6))) / cargoK;
  let dec = (crr * TK.G + (running ? (tk.gas > 0.05 ? 0.15 : 0.7) : 0.35)) * 1;
  dec += tk.brake * TK.BRAKE;
  dec += 0.0004 * tk.v * tk.v; // air drag
  const grav = -TK.G * sin(tk.pitch);
  const dv = Math.min(Math.abs(tk.v), dec * dt);
  tk.v = tk.v - Math.sign(tk.v) * dv + (a + grav) * dt;
  // parked, or in gear with no throttle: the truck holds still on a slope
  if (Math.abs(tk.v) < 0.25 && inp.throttle < 0.03 && tk.gas < 0.05) tk.v = 0;

  // ---- steering: rear-axle bicycle model ----
  const stMax = TK.STEER_MAX / (1 + Math.pow(Math.abs(tk.v) / 7, 2));
  const st = clamp(inp.steer, -1, 1);
  const rate = st === 0 || Math.sign(st) !== Math.sign(tk.steer) ? TK.STEER_RATE * 1.4 : TK.STEER_RATE;
  tk.steer += clamp(st - tk.steer, -rate * dt, rate * dt);
  const yr = (-tk.v * Math.tan(tk.steer * stMax)) / TK.WHEELBASE;
  tk.yaw = wrapAngle(tk.yaw + yr * dt);
  tk.x += sin(tk.yaw) * tk.v * dt;
  tk.z += cos(tk.yaw) * tk.v * dt;
  tk.wheelDist += tk.v * dt;
  if (Math.abs(tk.x) > MAP_LIMIT || Math.abs(tk.z) > MAP_LIMIT) {
    tk.x = clamp(tk.x, -MAP_LIMIT, MAP_LIMIT);
    tk.z = clamp(tk.z, -MAP_LIMIT, MAP_LIMIT);
    tk.v *= 0.5;
  }

  // ---- collisions with buildings, trees, the excavator and the tractor ----
  if (tractor)
    TR.BODY_CIRCLES.forEach((lz, i) => {
      const c = tractorCircles[i] as Extract<Collider, { k: "c" }>;
      c.x = tractor.x + sin(tractor.yaw) * lz;
      c.z = tractor.z + cos(tractor.yaw) * lz;
    });
  let hit = false;
  for (const lz of TK.BODY_CIRCLES) {
    const cx = tk.x + sin(tk.yaw) * lz;
    const cz = tk.z + cos(tk.yaw) * lz;
    hit = pushOut(tk, cx, cz, TK.BODY_R, COLLIDERS) || hit;
    hit = pushOut(tk, tk.x + sin(tk.yaw) * lz, tk.z + cos(tk.yaw) * lz, TK.BODY_R, DYNAMIC) || hit;
    if (tractor) hit = pushOut(tk, tk.x + sin(tk.yaw) * lz, tk.z + cos(tk.yaw) * lz, TK.BODY_R, tractorCircles) || hit;
  }
  if (hit) {
    if (Math.abs(tk.v) > 1.5) tk.events.push({ type: "bump", strength: Math.abs(tk.v) });
    tk.v *= 0.35;
  }

  // ---- ground following ----
  poseOnGround(tk, damp(9, dt));

  // ---- hydraulic bed ----
  const cmd = clamp(inp.bedCmd, -1, 1);
  if (cmd !== 0 && !running) {
    if (!tk.events.some((e) => e.type === "noHydraulics")) tk.events.push({ type: "noHydraulics" });
    tk.bedMoving = 0;
  } else {
    const before = tk.bed;
    tk.bed = clamp(tk.bed + cmd * TK.BED_RATE * dt, 0, 1);
    tk.bedMoving = tk.bed === before ? 0 : cmd;
  }

  // ---- tipping: soil slides out over the tailgate once the bed is steep enough ----
  const angle = tk.bed * TK.BED_MAX;
  const sliding = tk.cargo > 1e-4 && angle > TK.DUMP_ANGLE;
  if (sliding) {
    if (!tk.tipping) {
      tk.tipping = true;
      tk.events.push({ type: "tipStart" });
    }
    const vol = Math.min(tk.cargo, TK.FLOW * clamp((angle - TK.DUMP_ANGLE) / 0.3, 0.2, 1) * dt);
    tk.cargo -= vol;
    tk.tippedM3 += vol;
    truckToWorld(tk, (Math.random() - 0.5) * 1.2, TK.BED_Z0 - 0.7, tmp);
    DIG.deposit(tmp.x, tmp.z, vol, 1.05);
    DIG.relax(tmp.x - 3, tmp.z - 3, tmp.x + 3, tmp.z + 3, 2, 0.3);
    if (tk.cargo <= 1e-4) tk.cargo = 0;
  } else if (tk.tipping) {
    tk.tipping = false;
    tk.events.push({ type: "tipEnd" });
  }

  // ---- engine speed & load ----
  if (running) {
    const work = Math.min(1, tk.gas * 0.8 + (Math.abs(tk.v) / TK.VMAX_F) * 0.5 + (tk.bedMoving !== 0 ? 0.5 : 0));
    tk.load = lerp(tk.load, work, damp(5, dt));
    tk.rpm = lerp(tk.rpm, TK.IDLE_RPM + (TK.MAX_RPM - TK.IDLE_RPM) * (0.12 + 0.88 * Math.max(tk.gas * 0.9, Math.abs(tk.v) / TK.VMAX_F)), damp(3, dt));
  } else if (tk.engine) {
    tk.rpm = 170 + 40 * sin(tk.t * 25);
    tk.load = 0;
  } else {
    tk.rpm = lerp(tk.rpm, 0, damp(2.2, dt));
    tk.load = 0;
  }
  syncBody(tk);
}
