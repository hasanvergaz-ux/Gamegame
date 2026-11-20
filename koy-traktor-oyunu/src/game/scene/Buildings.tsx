// Village houses, the farm (barn, machine shed, silos), the mosque, walls, fences,
// hay bales and power lines. Everything is merged into one mesh per material.
import { use, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../sim/math";
import { BALES, BARN, FENCES, HOUSES, MOSQUE, POLES, SHED, SILOS, WALLS, baseHeight, staticHeightAt } from "../sim/world";
import { loadTex } from "./textures";

/** Materials whose glow follows day/night (lit windows). */
export const windowMats: THREE.MeshStandardMaterial[] = [];

type Key = "plaster" | "stone" | "roof" | "planks" | "wood" | "door" | "rust" | "metal" | "glass" | "lead" | "straw" | "dark" | "white";

class Builder {
  parts = new Map<Key, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  add(key: Key, g: THREE.BufferGeometry, pos: THREE.Vector3, rotY = 0, tint?: THREE.Color, extra?: THREE.Matrix4) {
    const geo = g.index ? g.toNonIndexed() : g;
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count * 2), 2));
    const c = tint ?? new THREE.Color(1, 1, 1);
    const n = geo.attributes.position!.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.m.makeRotationY(rotY).setPosition(pos);
    if (extra) this.m.multiply(extra);
    geo.applyMatrix4(this.m);
    const list = this.parts.get(key) ?? [];
    list.push(geo);
    this.parts.set(key, list);
  }
}

/** Box with UVs in meters / tile, so textures keep real-world scale on every face. */
export function boxM(w: number, h: number, d: number, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * dims[f]![0]) / tile, (uv.getY(i) * dims[f]![1]) / tile);
    }
  return g;
}

export function planeM(w: number, h: number, tile: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile);
  return g;
}

const T = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const local = (cx: number, cz: number, rot: number, lx: number, lz: number) =>
  [cx + lx * Math.cos(rot) + lz * Math.sin(rot), cz - lx * Math.sin(rot) + lz * Math.cos(rot)] as const;

/** Gable roof: ridge along local X, eaves overhanging by `o`. */
function gableRoof(b: Builder, key: Key, cx: number, cy: number, cz: number, rot: number, w: number, d: number, rise: number, o: number, tile: number) {
  const half = d / 2 + o;
  const drop = (o * rise) / (d / 2);
  const slope = Math.hypot(half, rise + drop);
  const ang = Math.atan2(rise + drop, half);
  for (const s of [-1, 1]) {
    const g = planeM(w + o * 2, slope, tile);
    const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2 + s * ang);
    if (s < 0) m.premultiply(new THREE.Matrix4().makeRotationY(Math.PI));
    const [x, z] = local(cx, cz, rot, 0, (s * half) / 2);
    b.add(key, g, T(x, cy + rise - (rise + drop) / 2, z), rot + (s < 0 ? 0 : 0), undefined, m);
    // underside so the roof is solid from below
    const u = planeM(w + o * 2, slope, tile);
    const mu = m.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI)).premultiply(new THREE.Matrix4().makeTranslation(0, -0.08, 0));
    b.add("dark", u, T(x, cy + rise - (rise + drop) / 2, z), rot, undefined, mu);
  }
}

function gableEnds(b: Builder, key: Key, cx: number, cy: number, cz: number, rot: number, w: number, d: number, rise: number, tint: THREE.Color, tile: number) {
  const sh = new THREE.Shape();
  sh.moveTo(-d / 2, 0);
  sh.lineTo(d / 2, 0);
  sh.lineTo(0, rise);
  sh.closePath();
  const g = new THREE.ShapeGeometry(sh);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  for (const s of [-1, 1]) {
    const [x, z] = local(cx, cz, rot, (s * w) / 2, 0);
    b.add(key, g.clone(), T(x, cy, z), rot + (s * Math.PI) / 2, tint);
  }
}

const WALL_TINTS = ["#f3efe6", "#efe2c4", "#e9d39a", "#d6e2ea", "#f0d9cc"].map((c) => new THREE.Color(c));
const SHUTTER_TINTS = ["#4a6b3a", "#3c5f7d", "#6b4a2e", "#7a2f25"].map((c) => new THREE.Color(c));

function house(b: Builder, h: (typeof HOUSES)[number], r: () => number) {
  const H = 2.9 * h.floors;
  const y0 = baseHeight(h.x, h.z);
  const tint = WALL_TINTS[h.tint]!;
  const sh = SHUTTER_TINTS[Math.floor(r() * SHUTTER_TINTS.length)]!;
  const at = (lx: number, ly: number, lz: number) => {
    const [x, z] = local(h.x, h.z, h.rot, lx, lz);
    return T(x, y0 + ly, z);
  };
  b.add("stone", boxM(h.w + 0.16, 1.5, h.d + 0.16, 2.5), at(0, -0.3, 0), h.rot);
  b.add("plaster", boxM(h.w, H - 0.45, h.d, 2.2), at(0, 0.45 + (H - 0.45) / 2, 0), h.rot, tint);
  if (h.floors === 2) b.add("plaster", boxM(h.w + 0.1, 0.18, h.d + 0.1, 2), at(0, 2.95, 0), h.rot, tint.clone().multiplyScalar(0.85));
  const rise = 1.6 + h.d * 0.12;
  gableRoof(b, "roof", ...([...at(0, H, 0).toArray()] as [number, number, number]), h.rot, h.w, h.d, rise, 0.55, 2.2);
  gableEnds(b, "plaster", ...([...at(0, H, 0).toArray()] as [number, number, number]), h.rot, h.w, h.d, rise, tint, 2.2);
  // chimney
  b.add("plaster", boxM(0.6, 2.2, 0.6, 1.5), at(h.w * 0.25, H + rise * 0.55, -h.d * 0.15), h.rot, tint);
  b.add("dark", boxM(0.8, 0.1, 0.8), at(h.w * 0.25, H + rise * 0.55 + 1.15, -h.d * 0.15), h.rot);
  // door on the front (+z)
  b.add("door", new THREE.BoxGeometry(1.1, 2.15, 0.1), at(-h.w * 0.1, 0.45 + 1.07, h.d / 2 + 0.03), h.rot);
  b.add("stone", boxM(1.6, 0.25, 0.9, 1), at(-h.w * 0.1, 0.35, h.d / 2 + 0.45), h.rot);
  // windows front and back on each floor
  for (let f = 0; f < h.floors; f++) {
    const wy = 0.45 + 1.55 + f * 2.9;
    for (const side of [1, -1])
      for (const lx of f === 0 && side === 1 ? [h.w * 0.27] : [-h.w * 0.28, h.w * 0.27]) {
        const z = side * (h.d / 2 + 0.04);
        const rot = h.rot + (side < 0 ? Math.PI : 0);
        b.add("white", boxM(1.15, 1.35, 0.1, 1), at(lx, wy, z), rot);
        b.add("glass", new THREE.BoxGeometry(0.95, 1.15, 0.06), at(lx, wy, side * (h.d / 2 + 0.07)), rot);
        b.add("white", boxM(0.05, 1.15, 0.05, 1), at(lx, wy, side * (h.d / 2 + 0.1)), rot);
        b.add("stone", boxM(1.35, 0.08, 0.28, 1), at(lx, wy - 0.72, side * (h.d / 2 + 0.12)), rot);
        for (const s of [-1, 1]) {
          const [x, zz] = local(h.x, h.z, h.rot, lx + s * 0.85 * side, side * (h.d / 2 + 0.09));
          b.add("wood", boxM(0.55, 1.35, 0.05, 1.2), T(x, y0 + wy, zz), rot, sh);
        }
      }
  }
  // side windows
  for (const s of [-1, 1]) {
    const wy = 0.45 + 1.55;
    const [x, z] = local(h.x, h.z, h.rot, s * (h.w / 2 + 0.04), 0);
    b.add("white", boxM(1.1, 1.3, 0.1, 1), T(x, y0 + wy, z), h.rot + (s * Math.PI) / 2);
    const [x2, z2] = local(h.x, h.z, h.rot, s * (h.w / 2 + 0.07), 0);
    b.add("glass", new THREE.BoxGeometry(0.9, 1.1, 0.06), T(x2, y0 + wy, z2), h.rot + (s * Math.PI) / 2);
  }
  // wooden balcony on two-storey houses
  if (h.floors === 2) {
    b.add("wood", boxM(h.w * 0.45, 0.14, 1.2, 1.5), at(h.w * 0.05, 2.95, h.d / 2 + 0.6), h.rot, sh.clone().lerp(new THREE.Color(1, 1, 1), 0.3));
    b.add("wood", boxM(h.w * 0.45, 0.06, 0.06, 1), at(h.w * 0.05, 3.95, h.d / 2 + 1.17), h.rot, sh);
    for (let i = 0; i <= 8; i++) b.add("wood", boxM(0.05, 0.95, 0.05, 1), at(h.w * 0.05 - h.w * 0.225 + (i * h.w * 0.45) / 8, 3.5, h.d / 2 + 1.17), h.rot, sh);
  }
}

function barn(b: Builder) {
  const { x, z, w, d } = BARN;
  const y0 = baseHeight(x, z);
  const H = 5.6;
  b.add("stone", boxM(w + 0.2, 1.2, d + 0.2, 2.5), T(x, y0 - 0.2, z));
  b.add("planks", boxM(w, H - 0.4, d, 2.4), T(x, y0 + 0.4 + (H - 0.4) / 2, z));
  // ridge along z: rotate the roof builder by 90°
  gableRoof(b, "rust", x, y0 + H, z, Math.PI / 2, d, w, 3.2, 0.7, 2);
  gableEnds(b, "planks", x, y0 + H, z, Math.PI / 2, d, w, 3.2, new THREE.Color(1, 1, 1), 2.4);
  // big doors on the yard side (+x)
  for (const s of [-1, 1]) b.add("wood", boxM(0.12, 4.2, 2.6, 1.5), T(x + w / 2 + 0.07, y0 + 0.4 + 2.1, z + s * 1.35), 0, new THREE.Color("#8a3324"));
  b.add("white", boxM(0.08, 0.15, 5.4, 1), T(x + w / 2 + 0.14, y0 + 4.55, z));
  b.add("white", boxM(0.08, 4.3, 0.12, 1), T(x + w / 2 + 0.14, y0 + 2.55, z));
}

function shed(b: Builder) {
  const { x, z, w, d } = SHED;
  const y0 = baseHeight(x, z);
  b.add("planks", boxM(w, 4.2, 0.2, 2.4), T(x, y0 + 2.1, z + d / 2 - 0.4));
  for (const s of [-1, 1]) b.add("planks", boxM(0.2, 4.2, d - 0.6, 2.4), T(x + (s * w) / 2, y0 + 2.1, z + 0.3));
  for (const s of [-1, 0, 1]) b.add("dark", boxM(0.22, 3.6, 0.22, 1), T(x + s * (w / 2 - 0.3), y0 + 1.8, z - d / 2 + 0.3));
  const roof = planeM(w + 1, d + 1.2, 2);
  const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2 + 0.12);
  b.add("rust", roof, T(x, y0 + 4.1, z), 0, undefined, m);
  b.add("dark", planeM(w + 1, d + 1.2, 2), T(x, y0 + 4.02, z), 0, undefined, m.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI)));
}

function silos(b: Builder) {
  for (const s of SILOS) {
    const y0 = baseHeight(s.x, s.z);
    const c = new THREE.CylinderGeometry(s.r, s.r, s.h, 28, 1, true);
    const uv = c.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * 2 * Math.PI * s.r) / 2, (uv.getY(i) * s.h) / 2);
    b.add("metal", c, T(s.x, y0 + s.h / 2, s.z));
    b.add("metal", new THREE.ConeGeometry(s.r + 0.15, 1.8, 28), T(s.x, y0 + s.h + 0.9, s.z));
    b.add("stone", boxM(s.r * 2 + 0.6, 0.6, s.r * 2 + 0.6, 2), T(s.x, y0 + 0.1, s.z));
    for (let k = 0; k < 2; k++) b.add("dark", boxM(0.05, s.h + 1, 0.05, 1), T(s.x + s.r + 0.12, y0 + s.h / 2 + 0.4, s.z - 0.22 + k * 0.44));
    for (let y = 0.6; y < s.h; y += 0.4) b.add("dark", boxM(0.04, 0.04, 0.48, 1), T(s.x + s.r + 0.12, y0 + y, s.z));
  }
}

function mosque(b: Builder) {
  const { x, z, w, d, rot } = MOSQUE;
  const y0 = baseHeight(x, z);
  const tint = new THREE.Color("#f1ece0");
  b.add("stone", boxM(w + 0.3, 1.0, d + 0.3, 2.5), T(x, y0, z), rot);
  b.add("plaster", boxM(w, 6, d, 2.2), T(x, y0 + 0.5 + 3, z), rot, tint);
  b.add("plaster", boxM(w + 0.3, 0.3, d + 0.3, 2), T(x, y0 + 6.6, z), rot, tint);
  b.add("plaster", new THREE.CylinderGeometry(3.6, 3.8, 1.2, 24), T(x, y0 + 7.3, z), rot, tint);
  b.add("lead", new THREE.SphereGeometry(3.7, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), T(x, y0 + 7.9, z), rot);
  b.add("lead", new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), T(x, y0 + 12.2, z), rot);
  // arched windows
  for (let f = 0; f < 4; f++)
    for (const lx of [-3, 0, 3]) {
      const a = (f * Math.PI) / 2;
      const [wx, wz] = local(x, z, rot + a, lx, d / 2 + 0.04);
      b.add("glass", new THREE.BoxGeometry(1.0, 2.0, 0.08), T(wx, y0 + 3.6, wz), rot + a);
      const [ax, az] = local(x, z, rot + a, lx, d / 2 + 0.03);
      b.add("lead", new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16, 1, false, 0, Math.PI), T(ax, y0 + 4.6, az), rot + a, undefined, new THREE.Matrix4().makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)));
    }
  // minaret
  const [mx, mz] = local(x, z, rot, 6.6, 5.0);
  b.add("stone", new THREE.CylinderGeometry(1.1, 1.1, 2, 12), T(mx, y0 + 0.6, mz));
  b.add("plaster", new THREE.CylinderGeometry(0.62, 0.72, 17, 16), T(mx, y0 + 9, mz), 0, tint);
  b.add("plaster", new THREE.CylinderGeometry(1.15, 0.8, 0.6, 16), T(mx, y0 + 14.6, mz), 0, tint);
  b.add("plaster", new THREE.CylinderGeometry(0.5, 0.55, 2.4, 16), T(mx, y0 + 16.4, mz), 0, tint);
  b.add("lead", new THREE.ConeGeometry(0.65, 4.2, 16), T(mx, y0 + 19.7, mz));
  b.add("lead", new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), T(mx, y0 + 22.2, mz));
}

function propsAndWalls(b: Builder) {
  for (const w of WALLS) {
    const y = baseHeight(w.x, w.z);
    b.add("stone", boxM(w.w, 1.6, w.d, 2), T(w.x, Math.min(y, staticHeightAt(w.x, w.z)) + 0.3, w.z), w.rot);
  }
  for (const f of FENCES) {
    const L = Math.hypot(f.bx - f.ax, f.bz - f.az);
    const a = Math.atan2(f.bx - f.ax, f.bz - f.az);
    for (let i = 0; i <= L / 2.5; i++) {
      const t = (i * 2.5) / L;
      const x = f.ax + (f.bx - f.ax) * t;
      const z = f.az + (f.bz - f.az) * t;
      b.add("wood", boxM(0.14, 1.5, 0.14, 1), T(x, staticHeightAt(x, z) + 0.55, z), a, new THREE.Color("#7a5a3c"));
    }
    for (let s = 0; s < 12; s++) {
      const t0 = s / 12;
      const t1 = (s + 1) / 12;
      const x = f.ax + (f.bx - f.ax) * (t0 + t1) / 2;
      const z = f.az + (f.bz - f.az) * (t0 + t1) / 2;
      for (const y of [0.55, 1.05]) b.add("wood", boxM(0.06, 0.12, L / 12 + 0.02, 1.5), T(x, staticHeightAt(x, z) + y, z), a, new THREE.Color("#8d6a45"));
    }
  }
  for (const bl of BALES) {
    const g = new THREE.CylinderGeometry(0.78, 0.78, 1.2, 22);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.5, uv.getY(i) * 0.6);
    const y = staticHeightAt(bl.x, bl.z) + 0.78 + bl.stack * 1.35;
    b.add("straw", g, T(bl.x, y, bl.z), bl.rot, undefined, new THREE.Matrix4().makeRotationZ(Math.PI / 2));
  }
  // power line
  const tops: THREE.Vector3[][] = [[], [], []];
  for (const [x, z] of POLES) {
    const y = staticHeightAt(x, z);
    b.add("wood", new THREE.CylinderGeometry(0.11, 0.15, 9.5, 8), T(x, y + 4.5, z), 0, new THREE.Color("#5b4632"));
    b.add("wood", boxM(0.12, 0.12, 2.2, 1), T(x, y + 8.8, z), Math.PI / 2, new THREE.Color("#4a3a2a"));
    [-0.9, 0, 0.9].forEach((o, k) => {
      b.add("white", new THREE.CylinderGeometry(0.05, 0.06, 0.2, 6), T(x + o, y + 9.0, z));
      tops[k]!.push(T(x + o, y + 9.05, z));
    });
  }
  for (const line of tops)
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i]!;
      const c = line[i + 1]!;
      const mid = a.clone().lerp(c, 0.5);
      mid.y -= 0.9;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, c);
      b.add("dark", new THREE.TubeGeometry(curve, 10, 0.015, 4), T(0, 0, 0));
    }
}

export function Buildings() {
  const plaster = use(loadTex("o_painted_plaster_wall_diff.jpg", true));
  const plasterN = use(loadTex("o_painted_plaster_wall_nor.jpg", false));
  const stone = use(loadTex("o_rustic_stone_wall_diff.jpg", true));
  const stoneN = use(loadTex("o_rustic_stone_wall_nor.jpg", false));
  const roof = use(loadTex("o_clay_roof_tiles_diff.jpg", true));
  const roofN = use(loadTex("o_clay_roof_tiles_nor.jpg", false));
  const planks = use(loadTex("o_weathered_plank_siding_diff.jpg", true));
  const planksN = use(loadTex("o_weathered_plank_siding_nor.jpg", false));
  const wood = use(loadTex("o_wood_planks_diff.jpg", true));
  const woodN = use(loadTex("o_wood_planks_nor.jpg", false));
  const door = use(loadTex("o_rough_pine_door_diff.jpg", true));
  const rust = use(loadTex("o_rusty_corrugated_iron_diff.jpg", true));
  const rustN = use(loadTex("o_rusty_corrugated_iron_nor.jpg", false));
  const metal = use(loadTex("o_corrugated_iron_diff.jpg", true));
  const metalN = use(loadTex("o_corrugated_iron_nor.jpg", false));
  const straw = use(loadTex("o_thatch_roof_angled_diff.jpg", true));

  const meshes = useMemo(() => {
    const b = new Builder();
    const r = mulberry32(5);
    for (const h of HOUSES) house(b, h, r);
    barn(b);
    shed(b);
    silos(b);
    mosque(b);
    propsAndWalls(b);
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, ...o });
    const mats: Record<Key, THREE.Material> = {
      plaster: std({ map: plaster, normalMap: plasterN, roughness: 0.95 }),
      stone: std({ map: stone, normalMap: stoneN, roughness: 0.95 }),
      roof: std({ map: roof, normalMap: roofN, roughness: 0.8 }),
      planks: std({ map: planks, normalMap: planksN, roughness: 0.9 }),
      wood: std({ map: wood, normalMap: woodN, roughness: 0.85 }),
      door: std({ map: door, roughness: 0.8 }),
      rust: std({ map: rust, normalMap: rustN, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }),
      metal: std({ map: metal, normalMap: metalN, roughness: 0.45, metalness: 0.75 }),
      glass: std({ color: "#2a3b48", roughness: 0.05, metalness: 0.9, emissive: "#ffb35c", emissiveIntensity: 0 }),
      lead: std({ color: "#8e979b", roughness: 0.4, metalness: 0.85 }),
      straw: std({ map: straw, color: "#e2bd6a", roughness: 0.95 }),
      dark: std({ color: "#2b2a28", roughness: 0.8 }),
      white: std({ color: "#ecebe6", roughness: 0.6 }),
    };
    windowMats.length = 0;
    windowMats.push(mats.glass as THREE.MeshStandardMaterial);
    return [...b.parts.entries()].map(([k, list]) => {
      const mesh = new THREE.Mesh(mergeGeometries(list)!, mats[k]);
      mesh.castShadow = k !== "glass";
      mesh.receiveShadow = true;
      mesh.name = k;
      return mesh;
    });
  }, [plaster, plasterN, stone, stoneN, roof, roofN, planks, planksN, wood, woodN, door, rust, rustN, metal, metalN, straw]);

  return (
    <group name="buildings">
      {meshes.map((m) => (
        <primitive key={m.name} object={m} />
      ))}
    </group>
  );
}
