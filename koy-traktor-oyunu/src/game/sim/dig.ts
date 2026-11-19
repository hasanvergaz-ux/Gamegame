// Excavated and dumped soil over the whole inner map, stored as a height offset (meters)
// per 0.5 m node. heightAt() adds it to the static terrain, so physics, drawing and the
// excavator all see the same holes and piles. Pure TypeScript: no React, no three.js.

export const DIG_SIZE = 600; // must equal world MAP_SIZE (kept here to avoid an import cycle)
export const DIG_N = 1200; // nodes per side -> 0.5 m cells
export const DIG_CELL = DIG_SIZE / DIG_N;
export const DIG_MIN = -4.5; // deepest hole below the original ground
/** Steepest allowed step between neighbouring nodes before soil slides (~56°). */
export const DIG_REPOSE = 0.75;

export class DigField {
  readonly n = DIG_N;
  readonly cell = DIG_CELL;
  readonly cellArea = DIG_CELL * DIG_CELL;
  readonly data = new Float32Array(DIG_N * DIG_N);
  /** lazily filled: 0 unknown, 1 diggable soil, 2 blocked (road, concrete, building, tree) */
  private readonly ok = new Uint8Array(DIG_N * DIG_N);
  private readonly rowMin = new Int32Array(DIG_N).fill(-1);
  private readonly rowMax = new Int32Array(DIG_N).fill(-1);
  private anyDirty = false;
  /** static ground height per node, filled on first use */
  private readonly base = new Float32Array(DIG_N * DIG_N).fill(Number.NaN);
  staticHeight: (x: number, z: number) => number = () => 0;
  canDig: (x: number, z: number) => boolean = () => true;
  version = 0;

  nodeX(i: number) {
    return (i + 0.5) * this.cell - DIG_SIZE / 2;
  }

  private mark(r: number, c: number) {
    const mn = this.rowMin[r]!;
    if (mn < 0 || c < mn) this.rowMin[r] = c;
    if (c > this.rowMax[r]!) this.rowMax[r] = c;
    this.anyDirty = true;
  }

  diggable(c: number, r: number) {
    if (c < 0 || r < 0 || c >= this.n || r >= this.n) return false;
    const i = r * this.n + c;
    let v = this.ok[i]!;
    if (v === 0) {
      v = this.canDig(this.nodeX(c), this.nodeX(r)) ? 1 : 2;
      this.ok[i] = v;
    }
    return v === 1;
  }

  baseAt(c: number, r: number) {
    const i = r * this.n + c;
    let v = this.base[i]!;
    if (Number.isNaN(v)) {
      v = this.staticHeight(this.nodeX(c), this.nodeX(r));
      this.base[i] = v;
    }
    return v;
  }

  node(c: number, r: number) {
    if (c < 0 || r < 0 || c >= this.n || r >= this.n) return 0;
    return this.data[r * this.n + c]!;
  }

  /** Bilinear offset at a world point (matches the GPU sampling in the terrain shader). */
  at(x: number, z: number) {
    const gx = (x + DIG_SIZE / 2) / this.cell - 0.5;
    const gz = (z + DIG_SIZE / 2) / this.cell - 0.5;
    const c = Math.floor(gx);
    const r = Math.floor(gz);
    if (c < -1 || r < -1 || c >= this.n || r >= this.n) return 0;
    const fx = gx - c;
    const fz = gz - r;
    const a = this.node(c, r);
    const b = this.node(c + 1, r);
    const d = this.node(c, r + 1);
    const e = this.node(c + 1, r + 1);
    return (a + (b - a) * fx) * (1 - fz) + (d + (e - d) * fx) * fz;
  }

  toNode(v: number) {
    return Math.round((v + DIG_SIZE / 2) / this.cell - 0.5);
  }

  /**
   * Cut the ground down to a rounded trough under the segment a-b (the bucket teeth line
   * swept along its path) at height `y`. Removes at most `maxVol` m³; returns the volume removed.
   */
  carve(ax: number, az: number, bx: number, bz: number, y: number, radius: number, maxVol: number) {
    if (maxVol <= 1e-6) return 0;
    const n = this.n;
    const c0 = Math.max(0, this.toNode(Math.min(ax, bx) - radius) - 1);
    const c1 = Math.min(n - 1, this.toNode(Math.max(ax, bx) + radius) + 1);
    const r0 = Math.max(0, this.toNode(Math.min(az, bz) - radius) - 1);
    const r1 = Math.min(n - 1, this.toNode(Math.max(az, bz) + radius) + 1);
    const vx = bx - ax;
    const vz = bz - az;
    const vv = vx * vx + vz * vz || 1e-6;
    const cuts: number[] = [];
    let total = 0;
    for (let r = r0; r <= r1; r++) {
      const z = this.nodeX(r);
      for (let c = c0; c <= c1; c++) {
        const x = this.nodeX(c);
        let t = ((x - ax) * vx + (z - az) * vz) / vv;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = x - ax - vx * t;
        const dz = z - az - vz * t;
        const d2 = dx * dx + dz * dz;
        if (d2 > radius * radius) continue;
        if (!this.diggable(c, r)) continue;
        const i = r * n + c;
        const floor = y + 0.14 * (d2 / (radius * radius)) - this.baseAt(c, r);
        const target = Math.max(DIG_MIN, floor);
        const cur = this.data[i]!;
        if (target < cur) {
          cuts.push(i, cur - target);
          total += cur - target;
        }
      }
    }
    if (total <= 0) return 0;
    const k = Math.min(1, maxVol / (total * this.cellArea));
    for (let j = 0; j < cuts.length; j += 2) {
      const i = cuts[j]!;
      this.data[i]! -= cuts[j + 1]! * k;
      this.mark(Math.floor(i / n), i % n);
    }
    this.version++;
    return total * k * this.cellArea;
  }

  /** Drop `vol` m³ of loose soil as a soft mound centred on (x,z). */
  deposit(x: number, z: number, vol: number, radius: number) {
    if (vol <= 0) return;
    const n = this.n;
    const k = Math.ceil((radius * 1.6) / this.cell);
    const cc = this.toNode(x);
    const rc = this.toNode(z);
    const w: number[] = [];
    let sum = 0;
    for (let r = rc - k; r <= rc + k; r++)
      for (let c = cc - k; c <= cc + k; c++) {
        if (c < 0 || r < 0 || c >= n || r >= n) continue;
        const dx = this.nodeX(c) - x;
        const dz = this.nodeX(r) - z;
        const g = Math.exp(-(dx * dx + dz * dz) / (radius * radius));
        if (g < 0.02) continue;
        w.push(r * n + c, g);
        sum += g;
      }
    if (sum <= 0) return;
    const h = vol / this.cellArea / sum;
    for (let j = 0; j < w.length; j += 2) {
      const i = w[j]!;
      this.data[i]! += w[j + 1]! * h;
      this.mark(Math.floor(i / n), i % n);
    }
    this.version++;
  }

  /** Let over-steep soil slide down (volume conserving) inside a box of nodes. */
  relax(x0: number, z0: number, x1: number, z1: number, iters = 3, repose = DIG_REPOSE) {
    const n = this.n;
    const c0 = Math.max(0, this.toNode(x0));
    const c1 = Math.min(n - 2, this.toNode(x1));
    const r0 = Math.max(0, this.toNode(z0));
    const r1 = Math.min(n - 2, this.toNode(z1));
    const d = this.data;
    const pair = (i: number, j: number, ci: number, ri: number, cj: number, rj: number) => {
      const diff = d[i]! - d[j]!;
      const a = Math.abs(diff);
      if (a <= repose) return;
      const t = (a - repose) * 0.25 * Math.sign(diff);
      // the high node loses soil; never dig below the original level of roads, concrete or buildings
      const hi = diff > 0 ? i : j;
      const [hc, hr] = diff > 0 ? [ci, ri] : [cj, rj];
      if (d[hi]! - Math.abs(t) < 0 && !this.diggable(hc, hr)) return;
      d[i]! -= t;
      d[j]! += t;
      this.mark(ri, ci);
      this.mark(rj, cj);
    };
    for (let it = 0; it < iters; it++)
      for (let r = r0; r <= r1; r++)
        for (let c = c0; c <= c1; c++) {
          const i = r * n + c;
          pair(i, i + 1, c, r, c + 1, r);
          pair(i, i + n, c, r, c, r + 1);
        }
    this.version++;
  }

  /** Net soil volume moved relative to the original ground (0 when nothing is lost). */
  netVolume() {
    let s = 0;
    for (let i = 0; i < this.data.length; i++) s += this.data[i]!;
    return s * this.cellArea;
  }

  /** Visit and clear every dirty row span. */
  consumeDirty(cb: (row: number, c0: number, c1: number) => void) {
    if (!this.anyDirty) return false;
    for (let r = 0; r < this.n; r++) {
      const mn = this.rowMin[r]!;
      if (mn < 0) continue;
      cb(r, mn, this.rowMax[r]!);
      this.rowMin[r] = -1;
      this.rowMax[r] = -1;
    }
    this.anyDirty = false;
    return true;
  }

  clear() {
    this.data.fill(0);
    for (let r = 0; r < this.n; r++) {
      this.rowMin[r] = 0;
      this.rowMax[r] = this.n - 1;
    }
    this.anyDirty = true;
    this.version++;
  }
}

/** The single live dig field. */
export const DIG = new DigField();
