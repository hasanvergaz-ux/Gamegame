// Procedural CAT 303.5-class mini excavator: rubber tracks with moving lugs, sprocket,
// idler and rollers, dozer blade, zero-tail-swing upper house with the ROPS glass cab,
// banana boom, stick, bucket with teeth, and the three hydraulic cylinders whose chrome
// rods slide in and out with the joints. Plus the falling soil clods.
// Coordinates follow the sim: +Z forward, +Y up, +X = machine's LEFT side (cab side).
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EX, armAngles, type Excavator } from "../sim/excavator";
import { clamp, lerp } from "../sim/math";
import type { Toggles } from "../store";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export type ExcavatorRig = {
  root: THREE.Group;
  house: THREE.Group;
  clods: THREE.InstancedMesh;
  /** cab eye point and exhaust tip, in house coordinates */
  eye: THREE.Vector3;
  exhaust: THREE.Vector3;
  update: (ex: Excavator, tg: Toggles, t: number, dt: number, active: boolean) => void;
};

// ---------- materials ----------
function makeMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: "#f0ae1c", roughness: 0.4, metalness: 0.12, clearcoat: 0.55, clearcoatRoughness: 0.28 }),
    paintDark: new THREE.MeshPhysicalMaterial({ color: "#d99a12", roughness: 0.5, metalness: 0.1, clearcoat: 0.3 }),
    black: new THREE.MeshStandardMaterial({ color: "#1d1e20", roughness: 0.55, metalness: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: "#2e3033", roughness: 0.42, metalness: 0.78 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.93, metalness: 0, side: THREE.DoubleSide }),
    lug: new THREE.MeshStandardMaterial({ color: "#181818", roughness: 0.88 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#e3e6e8", roughness: 0.1, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#86a9ab", roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 }),
    seat: new THREE.MeshStandardMaterial({ color: "#2b2b2c", roughness: 0.85 }),
    hose: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.7 }),
    lens: new THREE.MeshStandardMaterial({ color: "#f5f1e6", roughness: 0.15, emissive: "#fff2cc", emissiveIntensity: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: "#ff9a1a", roughness: 0.2, emissive: "#ff9000", emissiveIntensity: 0, transparent: true, opacity: 0.9 }),
    soil: new THREE.MeshStandardMaterial({ color: "#6a4b33", roughness: 1, flatShading: true }),
    clod: new THREE.MeshStandardMaterial({ color: "#5e432d", roughness: 1, flatShading: true }),
    decal: new THREE.MeshStandardMaterial({ map: decalTexture(), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }),
    warn: new THREE.MeshStandardMaterial({ map: warnTexture(), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
}
type Mats = ReturnType<typeof makeMaterials>;

function decalTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.font = "italic 900 74px 'Barlow Condensed', Arial, sans-serif";
  g.textBaseline = "middle";
  g.lineWidth = 10;
  g.strokeStyle = "#111";
  g.strokeText("303.5", 22, 50);
  g.fillStyle = "#fff";
  g.fillText("303.5", 22, 50);
  g.fillStyle = "#c8201a";
  g.beginPath();
  g.moveTo(206, 22);
  g.lineTo(236, 50);
  g.lineTo(206, 78);
  g.closePath();
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function warnTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f2d21b";
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = "#111";
  g.beginPath();
  g.moveTo(32, 8);
  g.lineTo(58, 54);
  g.lineTo(6, 54);
  g.closePath();
  g.fill();
  g.fillStyle = "#f2d21b";
  g.fillRect(29, 22, 6, 18);
  g.fillRect(29, 44, 6, 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- geometry helpers ----------
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
/** cylinder whose axis runs along X (pins, wheels) */
function cylX(r: number, len: number, seg = 16) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  return g;
}
/** side profile (u forward = +Z, v up = +Y) extruded across X, centred */
function profile(pts: [number, number][], width: number, bevel = 0.015) {
  const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2 - bevel, 0, 0);
  g.computeVertexNormals();
  return g;
}
/** smooth closed profile through control points */
function smoothProfile(pts: [number, number][], n = 80) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([u, v]) => V(u, v, 0)), true, "centripetal");
  return curve.getPoints(n).map((p) => [p.x, p.y] as [number, number]);
}
/** top-view outline (x, z) extruded upward from y0 by h */
function plan(pts: [number, number][], h: number, bevel = 0.03) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  g.computeVertexNormals();
  return g;
}
function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, parent: THREE.Object3D) {
  const c = new THREE.CatmullRomCurve3(points);
  return mesh(new THREE.TubeGeometry(c, Math.max(8, points.length * 8), r, 6), mat, parent);
}
/** Stretch a unit-height (Y) mesh between two points. */
function between(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  const len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.scale.set(1, Math.max(1e-3, len), 1);
}

// ---------- tracks ----------
const TR_R = 0.255;
const TR_HALF = 0.78;
const TR_Y = 0.27;
const TR_T = 0.055;
const TR_LEN = 4 * TR_HALF + 2 * Math.PI * TR_R;

/** Point on the track loop: bottom run front->rear, rear wheel up, top run rear->front, front wheel down. */
function loopAt(s: number) {
  let u = ((s % TR_LEN) + TR_LEN) % TR_LEN;
  const St = 2 * TR_HALF;
  const A = Math.PI * TR_R;
  if (u < St) return { z: TR_HALF - u, y: TR_Y - TR_R, nz: 0, ny: -1 };
  u -= St;
  if (u < A) {
    const a = -Math.PI / 2 - u / TR_R; // around the rear wheel, going up
    return { z: -TR_HALF + Math.cos(a) * TR_R, y: TR_Y + Math.sin(a) * TR_R, nz: Math.cos(a), ny: Math.sin(a) };
  }
  u -= A;
  if (u < St) return { z: -TR_HALF + u, y: TR_Y + TR_R, nz: 0, ny: 1 };
  u -= St;
  const a = Math.PI / 2 - u / TR_R; // around the front wheel, going down
  return { z: TR_HALF + Math.cos(a) * TR_R, y: TR_Y + Math.sin(a) * TR_R, nz: Math.cos(a), ny: Math.sin(a) };
}

function beltGeometry(w: number) {
  const N = 120;
  const pos: number[] = [];
  const idx: number[] = [];
  const ring = (k: number) => {
    const p = loopAt((k / N) * TR_LEN);
    const o = TR_T / 2;
    // outer-left, outer-right, inner-right, inner-left
    pos.push(w / 2, p.y + p.ny * o, p.z + p.nz * o);
    pos.push(-w / 2, p.y + p.ny * o, p.z + p.nz * o);
    pos.push(-w / 2, p.y - p.ny * o, p.z - p.nz * o);
    pos.push(w / 2, p.y - p.ny * o, p.z - p.nz * o);
  };
  for (let k = 0; k < N; k++) ring(k);
  for (let k = 0; k < N; k++) {
    const a = k * 4;
    const b = ((k + 1) % N) * 4;
    for (let f = 0; f < 4; f++) {
      const f1 = (f + 1) % 4;
      idx.push(a + f, b + f, b + f1, a + f, b + f1, a + f1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildTrack(M: Mats, side: number) {
  const g = new THREE.Group();
  g.position.x = side * EX.TRACK_HALF;
  mesh(beltGeometry(EX.TRACK_W), M.rubber, g);
  const LUGS = 36;
  const lugGeo = box(EX.TRACK_W * 0.96, 0.035, 0.06);
  const lugs = new THREE.InstancedMesh(lugGeo, M.lug, LUGS);
  lugs.castShadow = true;
  lugs.frustumCulled = false;
  g.add(lugs);
  // sprocket (rear, driven) with teeth and the travel motor
  const sprocket = new THREE.Group();
  sprocket.position.set(0, TR_Y, -TR_HALF);
  mesh(cylX(0.2, 0.16, 20), M.steel, sprocket);
  for (let i = 0; i < 12; i++) {
    const t = mesh(box(0.1, 0.05, 0.05), M.steel, sprocket);
    const a = (i / 12) * Math.PI * 2;
    t.position.set(0, Math.sin(a) * 0.215, Math.cos(a) * 0.215);
    t.rotation.x = -a;
  }
  mesh(cylX(0.15, 0.12, 16), M.black, sprocket, -side * 0.12, 0, 0);
  g.add(sprocket);
  // front idler and rollers
  const idler = new THREE.Group();
  idler.position.set(0, TR_Y, TR_HALF);
  mesh(cylX(0.21, 0.17, 22), M.steel, idler);
  mesh(cylX(0.12, 0.2, 14), M.black, idler);
  g.add(idler);
  const rollers: THREE.Mesh[] = [];
  for (const z of [-0.42, 0, 0.42]) rollers.push(mesh(cylX(0.068, 0.2, 12), M.steel, g, 0, TR_Y - TR_R + 0.095, z));
  rollers.push(mesh(cylX(0.05, 0.14, 10), M.steel, g, 0, TR_Y + TR_R - 0.075, 0));
  // track frame with lightening holes look
  mesh(rbox(0.12, 0.26, 1.42, 0.03), M.black, g, -side * 0.02, TR_Y + 0.01, 0);
  for (const z of [-0.35, 0.35]) mesh(cylX(0.05, 0.13, 10), M.steel, g, -side * 0.02, TR_Y + 0.04, z);
  return { g, lugs, sprocket, idler, rollers };
}

// ---------- cylinders ----------
type Cyl = { barrel: THREE.Mesh; rod: THREE.Mesh; eyeA: THREE.Mesh; eyeB: THREE.Mesh; barrelLen: number };
function makeCylinder(M: Mats, parent: THREE.Object3D, rB: number, rR: number, barrelLen: number): Cyl {
  const bg = new THREE.CylinderGeometry(rB, rB, 1, 18);
  const rg = new THREE.CylinderGeometry(rR, rR, 1, 14);
  const barrel = mesh(bg, M.black, parent);
  const rod = mesh(rg, M.chrome, parent);
  const eyeA = mesh(cylX(rB * 0.9, rB * 1.3, 12), M.black, parent);
  const eyeB = mesh(cylX(rR * 1.6, rB * 1.1, 12), M.steel, parent);
  return { barrel, rod, eyeA, eyeB, barrelLen };
}
function setCylinder(c: Cyl, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  const len = d.length();
  const n = d.clone().divideScalar(len || 1);
  const bl = Math.min(c.barrelLen, len - 0.05);
  between(c.barrel, a, a.clone().addScaledVector(n, bl));
  between(c.rod, a.clone().addScaledVector(n, Math.max(0.02, bl - 0.08)), b);
  c.eyeA.position.copy(a);
  c.eyeB.position.copy(b);
}

// ---------- the machine ----------
export function useExcavatorRig(): ExcavatorRig {
  return useMemo(() => {
    const M = makeMaterials();
    const root = new THREE.Group();

    // undercarriage
    const tracks = [1, -1].map((s) => buildTrack(M, s));
    tracks.forEach((t) => root.add(t.g));
    mesh(rbox(1.05, 0.22, 1.1, 0.05), M.black, root, 0, 0.36, 0);
    mesh(rbox(1.2, 0.12, 0.42, 0.03), M.black, root, 0, 0.33, -0.3);
    mesh(rbox(1.2, 0.12, 0.42, 0.03), M.black, root, 0, 0.33, 0.3);
    mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.07, 32), M.steel, root, 0, EX.SWING_Y - 0.035, 0);

    // dozer blade on the front of the undercarriage
    const blade = new THREE.Group();
    blade.position.set(0, 0.3, 0.52);
    root.add(blade);
    for (const s of [1, -1]) mesh(rbox(0.09, 0.1, 0.78, 0.02), M.black, blade, s * 0.42, -0.06, 0.36);
    const mold = profile(
      [
        [0.66, -0.33], [0.79, -0.33], [0.8, -0.27], [0.77, -0.14], [0.79, 0.0], [0.72, 0.02], [0.69, -0.12], [0.69, -0.28],
      ],
      EX.BLADE_HALF * 2,
      0.012,
    );
    mesh(mold, M.black, blade);
    mesh(box(EX.BLADE_HALF * 2, 0.03, 0.05), M.steel, blade, 0, -0.325, 0.795);
    const bladeCyl = makeCylinder(M, root, 0.045, 0.024, 0.28);

    // upper house (slews on the ring)
    const house = new THREE.Group();
    house.position.y = EX.SWING_Y;
    root.add(house);
    mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 32), M.black, house, 0, 0.01, 0);
    const outline: [number, number][] = [[0.78, 0.6], [0.78, -0.58]];
    for (let i = 1; i < 24; i++) {
      const u = i / 24; // zero-tail-swing rounded counterweight
      outline.push([0.78 * Math.cos(Math.PI * u), -0.58 - 0.4 * Math.sin(Math.PI * u)]);
    }
    outline.push([-0.78, -0.58], [-0.78, 0.6], [-0.34, 0.6], [-0.3, 0.46], [0.14, 0.46], [0.18, 0.6]);
    mesh(plan(outline, 0.58, 0.04), M.paint, house, 0, 0.04, 0);
    mesh(plan(outline.map(([x, z]) => [x * 1.01, z * 1.01] as [number, number]), 0.06, 0.02), M.black, house, 0, 0.02, 0);
    // right-hand engine compartment with grille and exhaust
    mesh(rbox(0.52, 0.34, 1.02, 0.07), M.paint, house, -0.5, 0.78, -0.1);
    for (let i = 0; i < 6; i++) mesh(box(0.012, 0.18, 0.04), M.black, house, -0.765, 0.72, -0.42 + i * 0.07);
    const exhaust = V(-0.62, 1.1, -0.48);
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), M.steel, house, -0.62, 1.0, -0.48);
    // decals: model number and warning stickers
    const decalGeo = new THREE.PlaneGeometry(0.42, 0.16);
    const dR = mesh(decalGeo, M.decal, house, -0.824, 0.36, -0.25);
    dR.rotation.y = -Math.PI / 2;
    const dL = mesh(decalGeo, M.decal, house, 0.824, 0.36, -0.3);
    dL.rotation.y = Math.PI / 2;
    const w1 = mesh(new THREE.PlaneGeometry(0.07, 0.07), M.warn, house, -0.766, 0.85, 0.25);
    w1.rotation.y = -Math.PI / 2;
    // swing bracket and boom foot
    mesh(rbox(0.36, 0.62, 0.5, 0.05), M.paint, house, EX.BOOM.x, 0.18, 0.8);
    mesh(cylX(0.075, 0.42, 16), M.steel, house, EX.BOOM.x, EX.BOOM.y, EX.BOOM.z);
    mesh(rbox(0.3, 0.2, 0.26, 0.04), M.paintDark, house, EX.BOOM.x, -0.07, 1.06);
    mesh(cylX(0.05, 0.36, 12), M.steel, house, EX.BOOM.x, -0.05, 1.12);

    // ROPS cab on the left
    const cab = new THREE.Group();
    cab.position.set(0.28, 0.62, -0.03);
    house.add(cab);
    const CW = 0.96;
    const CD = 1.16;
    const CH = 1.3;
    for (const [x, z] of [[CW / 2, CD / 2], [-CW / 2, CD / 2], [CW / 2, -CD / 2], [-CW / 2, -CD / 2], [CW / 2, 0.02]] as const)
      mesh(rbox(0.055, CH, 0.06, 0.02), M.black, cab, x, CH / 2, z);
    mesh(rbox(CW + 0.08, 0.08, CD + 0.1, 0.035), M.black, cab, 0, CH + 0.02, 0);
    mesh(rbox(CW - 0.1, 0.04, CD - 0.14, 0.02), M.steel, cab, 0, CH + 0.07, 0);
    mesh(rbox(CW, 0.09, CD, 0.02), M.black, cab, 0, 0.04, 0);
    // glass
    const glass = (w: number, h: number, x: number, y: number, z: number, ry: number) => {
      const m = mesh(new THREE.PlaneGeometry(w, h), M.glass, cab, x, y, z);
      m.rotation.y = ry;
      m.castShadow = false;
      return m;
    };
    glass(CW - 0.06, CH - 0.14, 0, CH / 2 + 0.04, CD / 2 - 0.005, 0);
    glass(CW - 0.06, CH - 0.14, 0, CH / 2 + 0.04, -CD / 2 + 0.005, Math.PI);
    glass(CD - 0.08, CH - 0.14, CW / 2 - 0.005, CH / 2 + 0.04, 0, Math.PI / 2);
    glass(CD - 0.08, CH - 0.14, -CW / 2 + 0.005, CH / 2 + 0.04, 0, -Math.PI / 2);
    // door handle, front wiper, mirror
    mesh(box(0.02, 0.12, 0.02), M.steel, cab, CW / 2 + 0.02, 0.62, 0.38);
    const wiper = mesh(box(0.012, 0.55, 0.012), M.black, cab, 0.1, 0.62, CD / 2 + 0.012);
    wiper.rotation.z = 0.5;
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 6), M.black, cab, CW / 2 + 0.12, CH - 0.15, CD / 2 - 0.02).rotation.z = 1.2;
    mesh(rbox(0.03, 0.16, 0.11, 0.01), M.black, cab, CW / 2 + 0.26, CH - 0.2, CD / 2 - 0.02);
    // interior: seat, consoles, joysticks, travel levers
    mesh(rbox(0.46, 0.1, 0.46, 0.04), M.seat, cab, 0, 0.42, -0.18);
    mesh(rbox(0.46, 0.55, 0.1, 0.04), M.seat, cab, 0, 0.72, -0.42);
    mesh(rbox(0.06, 0.34, 0.14, 0.02), M.seat, cab, 0, 1.06, -0.43);
    for (const s of [1, -1]) {
      mesh(rbox(0.12, 0.3, 0.42, 0.03), M.black, cab, s * 0.32, 0.3, -0.12);
      mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), M.steel, cab, s * 0.32, 0.52, 0.02);
      mesh(new THREE.SphereGeometry(0.03, 10, 8), M.black, cab, s * 0.32, 0.61, 0.02);
      mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 6), M.steel, cab, s * 0.08, 0.42, 0.36).rotation.x = -0.3;
    }
    mesh(rbox(0.5, 0.2, 0.12, 0.03), M.black, cab, 0, 0.18, 0.5);
    // roof work lights and beacon
    for (const x of [CW / 2 - 0.08, -CW / 2 + 0.08]) {
      mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 14).rotateX(Math.PI / 2), M.black, cab, x, CH + 0.12, CD / 2 - 0.02);
      mesh(new THREE.CircleGeometry(0.045, 14), M.lens, cab, x, CH + 0.12, CD / 2 + 0.016);
    }
    mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 14), M.amber, cab, -CW / 2 + 0.12, CH + 0.13, -CD / 2 + 0.12);
    const work = new THREE.SpotLight("#fff4dd", 0, 40, 0.75, 0.55, 1.4);
    work.position.set(0.28, 0.62 + CH + 0.12, 0.6);
    work.target.position.set(0.0, -1.5, 6);
    house.add(work, work.target);
    const beacon = new THREE.PointLight("#ffa000", 0, 14, 1.6);
    beacon.position.set(0.28 - CW / 2 + 0.12, 0.62 + CH + 0.25, -0.03 - CD / 2 + 0.12);
    house.add(beacon);
    const eye = V(0.28, 0.62 + 1.06, -0.12);

    // ---- boom ----
    const boom = new THREE.Group();
    boom.position.set(EX.BOOM.x, EX.BOOM.y, EX.BOOM.z);
    house.add(boom);
    const boomPts = smoothProfile([
      [-0.16, -0.04], [-0.06, -0.15], [0.32, -0.1], [0.7, 0.14], [1.08, 0.2], [1.7, 0.03], [2.22, -0.09], [2.44, -0.07], [2.5, 0.03],
      [2.44, 0.13], [2.2, 0.16], [1.6, 0.35], [1.05, 0.56], [0.78, 0.6], [0.45, 0.43], [0.1, 0.18], [-0.12, 0.08],
    ]);
    mesh(profile(boomPts, 0.24, 0.02), M.paint, boom).rotation.set(0, 0, 0);
    mesh(cylX(0.06, 0.3, 14), M.steel, boom, 0, 0, EX.L1);
    // cylinder lugs and boom light
    mesh(rbox(0.16, 0.12, 0.2, 0.02), M.paintDark, boom, 0, 0.12, 1.0);
    mesh(rbox(0.16, 0.12, 0.2, 0.02), M.paintDark, boom, 0, 0.62, 0.8);
    mesh(rbox(0.1, 0.1, 0.08, 0.02), M.black, boom, 0.15, 0.24, 1.15);
    mesh(new THREE.CircleGeometry(0.035, 12), M.lens, boom, 0.15, 0.24, 1.193);
    // hydraulic hoses along the top of the boom
    for (const s of [1, -1])
      tube([V(s * 0.1, 0.12, -0.05), V(s * 0.1, 0.46, 0.45), V(s * 0.1, 0.62, 0.85), V(s * 0.1, 0.42, 1.6), V(s * 0.1, 0.2, 2.2), V(s * 0.12, 0.12, 2.4)], 0.018, M.hose, boom);

    // ---- stick ----
    const stick = new THREE.Group();
    stick.position.set(0, 0, EX.L1);
    boom.add(stick);
    const stickPts = smoothProfile([
      [-0.54, 0.0], [-0.46, -0.11], [0.2, -0.12], [1.2, -0.08], [1.47, -0.07], [1.52, 0.03], [1.43, 0.1], [0.6, 0.12], [0.0, 0.17], [-0.3, 0.24], [-0.5, 0.14],
    ]);
    mesh(profile(stickPts, 0.17, 0.015), M.paint, stick);
    mesh(cylX(0.05, 0.26, 12), M.steel, stick, 0, 0, EX.L2);
    mesh(cylX(0.045, 0.24, 12), M.steel, stick, 0, 0.04, -0.48);
    mesh(rbox(0.14, 0.1, 0.16, 0.02), M.paintDark, stick, 0, 0.24, -0.22);
    for (const s of [1, -1]) tube([V(s * 0.09, 0.18, -0.35), V(s * 0.09, 0.15, 0.3), V(s * 0.09, 0.12, 0.9), V(s * 0.09, 0.1, 1.3)], 0.014, M.hose, stick);
    // guide link (dog-bone) from the stick to the bucket linkage
    const dogbone = mesh(box(0.05, 1, 0.05), M.steel, stick);

    // ---- bucket ----
    const bucket = new THREE.Group();
    bucket.position.set(0, 0, EX.L2);
    stick.add(bucket);
    const BW = EX.BUCKET_HALF * 2;
    const back: [number, number][] = [[-0.05, 0.12], [0.1, 0.3], [0.35, 0.37], [0.56, 0.29], [0.69, 0.13], [0.74, -0.01]];
    const backCurve = new THREE.CatmullRomCurve3(back.map(([u, v]) => V(u, v, 0)));
    const outer = backCurve.getPoints(30);
    const shell: [number, number][] = [...outer.map((p) => [p.x, p.y] as [number, number])];
    const inner = outer.map((p, i) => {
      const q = outer[Math.min(outer.length - 1, i + 1)]!;
      const r = outer[Math.max(0, i - 1)]!;
      const t = q.clone().sub(r).normalize();
      return [p.x + t.y * 0.025, p.y - t.x * 0.025] as [number, number];
    });
    shell.push(...inner.reverse());
    mesh(profile(shell, BW, 0.006), M.black, bucket);
    const sidePoly: [number, number][] = [[0.0, -0.1], ...back, [0.0, -0.1]];
    sidePoly.pop();
    for (const s of [1, -1]) mesh(profile(sidePoly, 0.02, 0.004), M.black, bucket, s * (BW / 2 - 0.01), 0, 0);
    mesh(box(BW + 0.02, 0.025, 0.08), M.steel, bucket, 0, -0.005, 0.71);
    for (let i = 0; i < 5; i++) {
      const tooth = mesh(new THREE.ConeGeometry(0.03, 0.12, 4).rotateX(Math.PI / 2), M.steel, bucket, -BW / 2 + 0.06 + (i * (BW - 0.12)) / 4, -0.005, 0.79);
      tooth.scale.set(1, 0.6, 1);
    }
    for (const s of [1, -1]) mesh(rbox(0.025, 0.2, 0.26, 0.01), M.black, bucket, s * 0.1, 0.12, 0.0);
    mesh(cylX(0.04, 0.26, 10), M.steel, bucket, 0, 0.24, -0.06);
    // soil carried in the bucket
    const soilGeo = new THREE.IcosahedronGeometry(0.3, 2);
    {
      const p = soilGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const v = V(p.getX(i), p.getY(i), p.getZ(i));
        const k = 1 + 0.16 * Math.sin(v.x * 23 + v.y * 11) * Math.cos(v.z * 19 - v.y * 7) + 0.07 * Math.sin(v.x * 51 + v.z * 37);
        v.multiplyScalar(k);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      soilGeo.computeVertexNormals();
    }
    const soil = mesh(soilGeo, M.soil, bucket, 0, 0.12, 0.36);
    soil.scale.set(0.9, 0.62, 0.95);

    // hydraulic cylinders (in house coordinates)
    const boomCyl = makeCylinder(M, house, 0.07, 0.038, 0.62);
    const stickCyl = makeCylinder(M, house, 0.055, 0.03, 0.66);
    const bucketCyl = makeCylinder(M, house, 0.05, 0.027, 0.6);
    const hoseFoot = tube([V(EX.BOOM.x + 0.1, 0.5, 0.55), V(EX.BOOM.x + 0.12, 0.55, 0.82), V(EX.BOOM.x + 0.1, 0.5, 0.95)], 0.02, M.hose, house);
    hoseFoot.castShadow = false;

    // falling clods
    const clods = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.clod, 260);
    clods.castShadow = true;
    clods.frustumCulled = false;
    clods.count = 0;

    // ---- per-frame pose ----
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = new THREE.Vector3();
    const pp = new THREE.Vector3();
    // boom-plane point (x across, local z, local y of a part at angle th about pivot (ps, py)) -> house coords
    const P = (ps: number, py: number, th: number, lz: number, ly: number, x = 0) =>
      V(EX.BOOM.x + x, EX.BOOM.y + py + lz * Math.sin(th) + ly * Math.cos(th), EX.BOOM.z + ps + lz * Math.cos(th) - ly * Math.sin(th));
    let sh = 0;
    let shv = 0;

    const update: ExcavatorRig["update"] = (ex, tg, t, dt, active) => {
      // body pose with a little diesel shake
      const idle = ex.running ? Math.sin(t * 61) * 0.0011 + Math.sin(t * 37) * 0.0007 : 0;
      shv += (150 * (idle * (1 + ex.load) - sh) - 18 * shv) * dt;
      sh += shv * dt;
      root.position.set(ex.x, ex.y + sh, ex.z);
      root.rotation.set(-ex.pitch, ex.yaw, ex.roll + idle * 0.4, "YXZ");
      house.rotation.y = ex.j.swing.p;

      // tracks: lugs travel round the loop, wheels turn
      [ex.leftDist, ex.rightDist].forEach((dist, i) => {
        const tk = tracks[i]!;
        const n = tk.lugs.count;
        for (let k = 0; k < n; k++) {
          const p = loopAt((k / n) * TR_LEN + dist);
          e.set(Math.atan2(-p.nz, p.ny) * -1, 0, 0);
          q.setFromEuler(e);
          pp.set(0, p.y + p.ny * (TR_T / 2 + 0.016), p.z + p.nz * (TR_T / 2 + 0.016));
          m4.compose(pp, q, sc.set(1, 1, 1));
          tk.lugs.setMatrixAt(k, m4);
        }
        tk.lugs.instanceMatrix.needsUpdate = true;
        tk.sprocket.rotation.x = dist / 0.215;
        tk.idler.rotation.x = dist / 0.21;
        tk.rollers.forEach((r, j) => (r.rotation.x = (j === 3 ? -dist : dist) / 0.07));
      });

      // blade
      const bu = ex.j.blade.p;
      blade.rotation.x = -lerp(0, 0.45, bu);
      const ba = blade.rotation.x;
      const bB = V(0, 0.3 + 0.02 * Math.cos(ba) - 0.55 * Math.sin(ba), 0.52 + 0.02 * Math.sin(ba) + 0.55 * Math.cos(ba));
      setCylinder(bladeCyl, V(0, 0.44, 0.3), bB);

      // arm
      const { t1, t2, t3 } = armAngles(ex);
      boom.rotation.x = -t1;
      stick.rotation.x = -ex.j.stick.p;
      bucket.rotation.x = -ex.j.bucket.p;
      const p1s = EX.L1 * Math.cos(t1);
      const p1y = EX.L1 * Math.sin(t1);
      const p2s = p1s + EX.L2 * Math.cos(t2);
      const p2y = p1y + EX.L2 * Math.sin(t2);
      setCylinder(boomCyl, V(EX.BOOM.x, -0.05, 1.12), P(0, 0, t1, 1.0, 0.12));
      setCylinder(stickCyl, P(0, 0, t1, 0.8, 0.62), P(p1s, p1y, t2, -0.48, 0.04));
      const E = P(p2s, p2y, t3, -0.06, 0.24);
      setCylinder(bucketCyl, P(p1s, p1y, t2, -0.22, 0.24), E);
      // dog-bone link in stick coordinates
      {
        const s2 = Math.cos(t2);
        const n2 = Math.sin(t2);
        const dx = E.z - EX.BOOM.z - p1s;
        const dy = E.y - EX.BOOM.y - p1y;
        const ez = dx * s2 + dy * n2;
        const ey = -dx * n2 + dy * s2;
        between(dogbone, V(0, 0.1, EX.L2 - 0.22), V(0, ey, ez));
      }

      // soil in the bucket
      const f = clamp(ex.bucketLoad / EX.CAP, 0, 1.05);
      soil.visible = f > 0.01;
      const s = Math.cbrt(f);
      soil.scale.set(0.9 * Math.max(0.35, s), 0.62 * s, 0.95 * Math.max(0.4, s));
      soil.position.set(0, lerp(0.22, 0.06, s), lerp(0.4, 0.35, s));

      // lights
      const lights = active && (tg.work || tg.head);
      M.lens.emissiveIntensity = lights ? 3 : 0;
      work.intensity = lights ? 55 : 0;
      const bk = active && tg.beacon ? (Math.sin(t * 9) > 0 ? 1 : 0.15) : 0;
      M.amber.emissiveIntensity = bk * 4;
      beacon.intensity = bk * 5;

      // falling clods
      const cl = ex.clods;
      clods.count = Math.min(cl.length, 260);
      for (let i = 0; i < clods.count; i++) {
        const c = cl[i]!;
        const r = Math.cbrt(c.vol) * 0.78;
        e.set(c.spin, c.spin * 0.7, c.spin * 0.3);
        q.setFromEuler(e);
        m4.compose(pp.set(c.x, c.y + r * 0.5, c.z), q, sc.set(r, r * 0.8, r * 1.1));
        clods.setMatrixAt(i, m4);
      }
      clods.instanceMatrix.needsUpdate = true;
    };

    return { root, house, clods, eye, exhaust, update };
  }, []);
}
