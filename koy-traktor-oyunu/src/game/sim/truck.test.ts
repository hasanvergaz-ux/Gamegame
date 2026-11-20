import { beforeEach, describe, expect, it } from "vitest";
import { DIG } from "./dig";
import { clodSinks, createExcavator, stepExcavator, type ExInput } from "./excavator";
import { PARKED_TRUCK, TK, bedSink, createTruck, stepTruck, truckToWorld, type Truck, type TruckInput } from "./truck";
import { SITE, TRUCK_START, heightAt, isDiggable } from "./world";

const drive = (o: Partial<TruckInput> = {}): TruckInput => ({ throttle: 0, brake: 0, steer: 0, bedCmd: 0, dir: 1, engineOn: true, ...o });

function run(tk: Truck, seconds: number, inp: Partial<TruckInput> = {}) {
  const base = drive(inp);
  for (let t = 0; t < seconds; t += 1 / 60) {
    stepTruck(tk, base, 1 / 60);
    tk.events.length = 0;
  }
}

function started() {
  const tk = createTruck();
  run(tk, TK.CRANK_TIME + 0.5, PARKED_TRUCK);
  return tk;
}

beforeEach(() => DIG.clear());

describe("dump truck driving", () => {
  it("parks inside the yard facing the gate and stays put without the engine", () => {
    const tk = createTruck();
    expect(tk.x).toBe(TRUCK_START.x);
    expect(tk.x).toBeGreaterThan(SITE.x0);
    expect(tk.z).toBeLessThan(SITE.z1);
    run(tk, 3, { throttle: 1, engineOn: false });
    expect(Math.hypot(tk.x - TRUCK_START.x, tk.z - TRUCK_START.z)).toBeLessThan(0.1);
  });

  it("drives forward once started and brakes to a halt", () => {
    const tk = started();
    const z0 = tk.z;
    run(tk, 4, { throttle: 1 });
    expect(tk.z - z0).toBeGreaterThan(4);
    expect(tk.v).toBeGreaterThan(3);
    run(tk, 6, { brake: 1 });
    expect(Math.abs(tk.v)).toBeLessThan(0.05);
  });

  it("steers right with positive steer (yaw decreases) and reverses with gear", () => {
    const tk = started();
    tk.v = 5;
    const yaw0 = tk.yaw;
    run(tk, 2, { steer: 1, throttle: 0.3 });
    expect(tk.yaw).toBeLessThan(yaw0 - 0.1);
    const t2 = started();
    run(t2, 3, { throttle: 1, dir: -1 });
    expect(t2.v).toBeLessThan(-2);
  });

  it("is stopped by the gate post and fences instead of driving through", () => {
    const tk = started();
    Object.assign(tk, { x: SITE.x0 + 8, z: SITE.z1 - 4, yaw: 0 });
    run(tk, 8, { throttle: 1 });
    expect(tk.z).toBeLessThan(SITE.z1); // fence south of the yard holds
  });
});

describe("tipper bed", () => {
  it("needs the engine for the hydraulics", () => {
    const tk = createTruck();
    run(tk, 2, { bedCmd: 1, engineOn: false });
    expect(tk.bed).toBe(0);
    const t2 = started();
    run(t2, 3, { bedCmd: 1 });
    expect(t2.bed).toBeGreaterThan(0.4);
  });

  it("swallows clods that fall into the lowered bed and rejects others", () => {
    const tk = started();
    const p = { x: 0, z: 0 };
    truckToWorld(tk, 0, 1, p);
    const inside = { x: p.x, y: tk.y + 1.3, z: p.z, vx: 0, vy: 0, vz: 0, vol: 0.05, spin: 0 };
    expect(bedSink(tk, inside)).toBe(true);
    expect(tk.cargo).toBeCloseTo(0.05, 5);
    truckToWorld(tk, 3, 1, p);
    expect(bedSink(tk, { ...inside, x: p.x, z: p.z })).toBe(false);
    expect(bedSink(tk, { ...inside, y: tk.y + 5 })).toBe(false); // still in the air above the bed
    tk.cargo = TK.CAP;
    const before = tk.cargo;
    bedSink(tk, inside);
    expect(tk.cargo).toBe(before); // full: spills over the rim
  });

  it("tips the whole payload out behind the truck and conserves volume", () => {
    const tk = started();
    Object.assign(tk, { x: -130, z: -20, yaw: 0 });
    tk.y = heightAt(tk.x, tk.z);
    tk.cargo = 6;
    run(tk, 12, { bedCmd: 1 });
    expect(tk.cargo).toBe(0);
    expect(tk.tippedM3).toBeCloseTo(6, 3);
    const p = { x: 0, z: 0 };
    truckToWorld(tk, 0, TK.BED_Z0 - 0.7, p);
    expect(DIG.at(p.x, p.z)).toBeGreaterThan(0.2); // a pile behind the tailgate
    run(tk, 8, { bedCmd: -1 });
    expect(tk.bed).toBe(0);
  });

  it("does not spill while the bed is only slightly raised", () => {
    const tk = started();
    tk.cargo = 4;
    run(tk, 1.5, { bedCmd: 1 });
    expect(tk.bed * TK.BED_MAX).toBeLessThan(TK.DUMP_ANGLE);
    expect(tk.cargo).toBe(4);
  });
});

describe("loading with the excavator", () => {
  it("fills the truck when it is parked on the excavator's left and auto-dig runs", () => {
    const ex = createExcavator();
    const x = -44, z = 50;
    Object.assign(ex, { x, z, yaw: Math.PI / 2 });
    ex.y = heightAt(x, z);
    const tk = createTruck();
    // truck parallel to the excavator, centre line 3.6 m to its left, bed centred on the excavator
    Object.assign(tk, { yaw: Math.PI / 2, x: x - 0.3 - 1.1, z: z - 3.63 });
    tk.y = heightAt(tk.x, tk.z);
    expect(isDiggable(x + 3, z)).toBe(true);
    clodSinks.length = 0;
    clodSinks.push((c) => bedSink(tk, c));
    const inp: ExInput = { drive: 0, turn: 0, swing: 0, boom: 0, stick: 0, bucket: 0, bladeDown: false, engineOn: true, autoToggle: false };
    for (let t = 0; t < 2.5; t += 1 / 60) stepExcavator(ex, inp, 1 / 60);
    inp.autoToggle = true;
    for (let t = 0; t < 70; t += 1 / 60) {
      stepExcavator(ex, inp, 1 / 60);
      inp.autoToggle = false;
      ex.events.length = 0;
    }
    clodSinks.length = 0;
    expect(tk.cargo).toBeGreaterThan(1);
    expect(tk.loadedM3).toBeCloseTo(tk.cargo, 5);
  });
});
