import { beforeEach, describe, expect, it } from "vitest";
import { DIG } from "./dig";
import { EX, createExcavator, soilInFlight, stepExcavator, type ExInput, type Excavator } from "./excavator";
import { createSim, stepSim } from "./tractor";
import { heightAt, roadZ, staticHeightAt } from "./world";

/** open grass east of the farm yard (the excavator itself now starts inside the Çakır Hafriyat yard) */
const EXC_START = { x: -44, z: 50, yaw: Math.PI / 2 };

const idle = (): ExInput => ({ drive: 0, turn: 0, swing: 0, boom: 0, stick: 0, bucket: 0, bladeDown: false, engineOn: true, autoToggle: false });

function run(ex: Excavator, seconds: number, inp: Partial<ExInput> = {}) {
  const base = { ...idle(), ...inp };
  for (let t = 0; t < seconds; t += 1 / 60) {
    stepExcavator(ex, base, 1 / 60);
    base.autoToggle = false;
    ex.events.length = 0;
  }
}

function started(x = EXC_START.x, z = EXC_START.z, yaw = EXC_START.yaw) {
  const ex = createExcavator();
  Object.assign(ex, { x, z, yaw });
  ex.y = heightAt(x, z);
  run(ex, 2.5); // crank + settle
  return ex;
}

/** lowest ground offset in a box around a point */
function deepest(x: number, z: number, r: number) {
  let m = 0;
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) m = Math.min(m, DIG.at(x + dx, z + dz));
  return m;
}
function highest(x: number, z: number, r: number) {
  let m = 0;
  for (let dx = -r; dx <= r; dx += 0.25) for (let dz = -r; dz <= r; dz += 0.25) m = Math.max(m, DIG.at(x + dx, z + dz));
  return m;
}

beforeEach(() => DIG.clear());

describe("excavator hydraulics", () => {
  it("does not move the boom until the engine has started", () => {
    const ex = createExcavator();
    const b0 = ex.j.boom.p;
    run(ex, 1, { boom: -1 });
    expect(ex.j.boom.p).toBe(b0);
    run(ex, 2, { boom: -1 });
    expect(ex.j.boom.p).toBeLessThan(b0 - 0.3);
  });

  it("drives forward on its tracks and turns on the spot", () => {
    const ex = started();
    const x0 = ex.x;
    run(ex, 3, { drive: 1 });
    expect(ex.x - x0).toBeGreaterThan(3); // facing +X
    const yaw0 = ex.yaw;
    run(ex, 2, { turn: 1 });
    expect(ex.yaw).toBeLessThan(yaw0 - 0.8);
  });
});

describe("digging", () => {
  it("a manual pass lowers the ground and fills the bucket without losing soil", () => {
    const ex = started();
    run(ex, 2.5, { stick: 1, bucket: 1 }); // reach out, open bucket
    run(ex, 4, { boom: -1 }); // bucket into the ground
    expect(ex.inSoil).toBe(true);
    run(ex, 2.5, { stick: -1, bucket: -0.4 }); // drag toward the machine
    expect(ex.bucketLoad).toBeGreaterThan(0.05);
    expect(ex.dugM3).toBeGreaterThan(0.05);
    expect(DIG.netVolume() + soilInFlight(ex)).toBeCloseTo(0, 3);
  });

  it("the automatic cycle digs a hole in front and piles the spoil to the left", () => {
    const ex = started();
    run(ex, 1 / 60, { autoToggle: true });
    expect(ex.auto.on).toBe(true);
    run(ex, 120);
    expect(ex.auto.cycle).toBeGreaterThanOrEqual(4);
    // facing +X: dig area ahead (+X), the pile on the machine's left (-Z)
    const dig = deepest(ex.x + 3.3, ex.z, 1.5);
    const pile = highest(ex.x + 0.9, ex.z - 3.6, 2);
    expect(dig).toBeLessThan(-1.0);
    expect(pile).toBeGreaterThan(0.4);
    expect(DIG.netVolume() + soilInFlight(ex)).toBeCloseTo(0, 2);
  });

  it("stops the automatic cycle as soon as a lever is touched", () => {
    const ex = started();
    run(ex, 1 / 60, { autoToggle: true });
    run(ex, 3);
    run(ex, 1 / 60, { boom: 1 });
    expect(ex.auto.on).toBe(false);
  });

  it("never digs the asphalt road", () => {
    const x = -170;
    const ex = started(x, roadZ(x) + 4.5, Math.PI); // facing -Z, toward the road; bucket over the asphalt
    run(ex, 1 / 60, { autoToggle: true });
    run(ex, 40);
    expect(ex.dugM3).toBeLessThan(0.01);
    expect(heightAt(x, roadZ(x))).toBeCloseTo(staticHeightAt(x, roadZ(x)), 3);
  });

  it("the blade scrapes soil and pushes it ahead as a berm", () => {
    const ex = started();
    run(ex, 1.5, { bladeDown: true });
    const hx = ex.x + 3;
    DIG.deposit(hx, ex.z, 1.2, 1.2); // a heap of loose soil ahead
    const before = highest(hx, ex.z, 0.5);
    run(ex, 3.6, { drive: 0.6, bladeDown: true });
    expect(ex.x + EX.BLADE_Z).toBeGreaterThan(hx + 1); // the blade went through the heap
    expect(highest(hx, ex.z, 0.5)).toBeLessThan(before * 0.6);
    expect(highest(ex.x + EX.BLADE_Z + 0.6, ex.z, 0.6)).toBeGreaterThan(0.15); // berm ahead of the blade
    expect(DIG.netVolume()).toBeCloseTo(1.2, 2);
  });
});

describe("vehicles", () => {
  it("the tractor cannot drive through the parked excavator", () => {
    const ex = started();
    const sim = createSim();
    Object.assign(sim.tr, { x: ex.x - 9, z: ex.z, yaw: Math.PI / 2, v: 0 });
    sim.tr.y = heightAt(sim.tr.x, sim.tr.z);
    const inp = { throttle: 0.7, brake: 0, steer: 0, dir: 1 as const, liftCmd: 0, engineOn: true, attachPressed: false };
    for (let t = 0; t < 14; t += 1 / 60) {
      stepSim(sim, inp, 1 / 60);
      stepExcavator(ex, idle(), 1 / 60, sim.tr);
      sim.events.length = 0;
    }
    expect(sim.tr.x).toBeLessThan(ex.x - EX.BODY_R);
  });
});
