// Procedural Mercedes-Benz Actros 8x4 tipper (damperli kamyon): white StreamSpace-style cab with
// the star grille and "MERCEDES-BENZ" bar, four axles (two steering, two driven duals), a safety
// yellow steel bed with tailgate, front headboard + cab protector, a four-stage hydraulic ram,
// and a soil heap that grows as the bed fills. "ÇAKIR HAFRİYAT" is lettered on both doors,
// both bed sides and the tailgate.
// Coordinates follow the sim: origin = centre of the rear tandem on the ground, +Z forward,
// +Y up, +X = the truck's LEFT side (driver side).
import { use, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clamp, lerp } from "../sim/math";
import { TK, heapHeight, type Truck } from "../sim/truck";
import type { Toggles } from "../store";
import { companyPlate, licenseTexture, makePlate, mbBarTexture } from "./signs";
import { loadTex } from "./textures";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export type TruckRig = {
  root: THREE.Group;
  /** driver's eye and exhaust tip in truck coordinates */
  eye: THREE.Vector3;
  exhaust: THREE.Vector3;
  update: (tk: Truck, tg: Toggles, t: number, dt: number, active: boolean) => void;
};

// ---------- dimensions ----------
const WR = 0.52; // wheel radius
const REAR_AX = [-0.65, 0.65];
const FRONT_AX = [4.5, 5.8];
const CAB = { z0: 4.2, z1: 6.5, w: 2.5 };
const BED_W = 1.22; // half outer width of the floor
const BED_LEN = 6.05; // outer length from the tailgate to the headboard

// ---------- helpers ----------
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
/** cylinder whose axis runs along X (axles, wheels) */
function cylX(r: number, len: number, seg = 20) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  return g;
}
/** side profile (u forward = +Z, v up = +Y) extruded across X, centred */
function profile(pts: [number, number][], width: number, bevel = 0.02) {
  const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2 - bevel, 0, 0);
  g.computeVertexNormals();
  return g;
}
/** flat panel on the side of the cab: points are (z, y); faces outward on `side` (+1 = left) */
function sidePanel(pts: [number, number][], side: 1 | -1) {
  const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(side > 0 ? -z : z, y)));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2);
  return g;
}

function makeMaterials(soil: THREE.Texture) {
  const lamp = (emissive: string, color = "#2a2a2a") => new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.3, emissive, emissiveIntensity: 0 });
  return {
    cab: new THREE.MeshPhysicalMaterial({ color: "#f2f2ef", roughness: 0.33, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    bed: new THREE.MeshPhysicalMaterial({ color: "#e5a800", roughness: 0.5, metalness: 0.25, clearcoat: 0.25 }),
    bedFloor: new THREE.MeshStandardMaterial({ color: "#4a4e52", roughness: 0.6, metalness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: "#1b1c1e", roughness: 0.7, metalness: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: "#2b2e32", roughness: 0.5, metalness: 0.65 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d3d9dc", roughness: 0.16, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: "#aeb4b8", roughness: 0.35, metalness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({ color: "#10202b", roughness: 0.04, metalness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.95, metalness: 0 }),
    blue: new THREE.MeshStandardMaterial({ color: "#1a4fb4", roughness: 0.5, metalness: 0.2 }),
    seat: new THREE.MeshStandardMaterial({ color: "#3a3d42", roughness: 0.9 }),
    ram: new THREE.MeshStandardMaterial({ color: "#d8dcde", roughness: 0.2, metalness: 1 }),
    ramBody: new THREE.MeshStandardMaterial({ color: "#23272b", roughness: 0.45, metalness: 0.7 }),
    soil: new THREE.MeshStandardMaterial({ map: soil, color: "#a8855f", roughness: 1 }),
    head: lamp("#fff1cf", "#e9eef0"),
    drl: lamp("#fff8e8", "#e9eef0"),
    amber: lamp("#ffa000", "#7a4a00"),
    marker: lamp("#ffa000", "#7a4a00"),
    brake: lamp("#ff1a10", "#5a0a08"),
    reverse: lamp("#ffffff", "#c8c8c8"),
  };
}

let treadTex: THREE.CanvasTexture | null = null;
function treadTexture() {
  if (treadTex) return treadTex;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#171717";
  g.fillRect(0, 0, 1024, 64);
  g.fillStyle = "#2b2b2b";
  for (let i = 0; i < 40; i++) {
    const x = (i * 1024) / 40;
    g.save();
    g.translate(x, 0);
    g.beginPath();
    g.moveTo(0, 6);
    g.lineTo(18, 6);
    g.lineTo(24, 58);
    g.lineTo(6, 58);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.fillStyle = "#0e0e0e";
  g.fillRect(0, 29, 1024, 6);
  treadTex = new THREE.CanvasTexture(c);
  treadTex.colorSpace = THREE.SRGBColorSpace;
  treadTex.anisotropy = 8;
  treadTex.wrapS = THREE.RepeatWrapping;
  return treadTex;
}

let rimTex: THREE.CanvasTexture | null = null;
function rimTexture() {
  if (rimTex) return rimTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, "#c7ccce");
  grad.addColorStop(0.55, "#9aa1a5");
  grad.addColorStop(1, "#6f767a");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#3a3f43";
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    g.beginPath();
    g.arc(128 + Math.cos(a) * 66, 128 + Math.sin(a) * 66, 12, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "#2a2e31";
  g.beginPath();
  g.arc(128, 128, 38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#b9bfc2";
  g.beginPath();
  g.arc(128, 128, 22, 0, Math.PI * 2);
  g.fill();
  rimTex = new THREE.CanvasTexture(c);
  rimTex.colorSpace = THREE.SRGBColorSpace;
  rimTex.anisotropy = 4;
  return rimTex;
}

/** Heap of soil in the bed: unit peak height, edges at 0, footprint 2.1 x 5.6 m. */
function heapGeometry() {
  const g = new THREE.PlaneGeometry(2.1, 5.6, 14, 30);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const ax = clamp(1 - (x / 1.05) ** 2, 0, 1);
    const az = clamp(1 - (z / 2.8) ** 4, 0, 1);
    const lump = 1 + 0.16 * Math.sin(x * 5.3 + z * 2.1) * Math.cos(z * 3.7 - x * 2.9) + 0.07 * Math.sin(z * 9.1 + x * 4.3);
    p.setY(i, Math.pow(ax, 0.7) * Math.pow(az, 0.6) * lump);
    uv.setXY(i, uv.getX(i) * 1.4, uv.getY(i) * 3.5);
  }
  g.computeVertexNormals();
  return g;
}

export function useTruckRig(): TruckRig {
  const soilTex = use(loadTex("t_brown_mud_dry_diff.jpg", true));
  return useMemo<TruckRig>(() => {
    const M = makeMaterials(soilTex);
    const root = new THREE.Group();

    // ================= chassis =================
    for (const s of [-1, 1]) mesh(box(0.13, 0.28, 8.5), M.steel, root, s * 0.46, 1.02, 2.2);
    for (const z of [-1.3, 0.2, 1.9, 3.1, 4.0]) mesh(box(1.0, 0.1, 0.16), M.steel, root, 0, 0.98, z);
    mesh(box(1.7, 0.1, 5.7), M.steel, root, 0, 1.17, 0.95); // sub-frame under the bed
    // underrun bar and mudflaps
    mesh(rbox(2.3, 0.16, 0.12, 0.03), M.steel, root, 0, 0.62, -1.96);
    for (const s of [-1, 1]) {
      mesh(box(0.1, 0.1, 0.1), M.steel, root, s * 0.85, 0.86, -1.92);
      mesh(box(0.62, 0.46, 0.04), M.black, root, s * 1.12, 0.46, -1.45);
      mesh(box(0.5, 0.36, 0.04), M.black, root, s * 1.12, 0.38, 3.65);
    }
    // tanks between the axle groups
    mesh(cylX(0.38, 1.1, 24), M.alu, root, 1.0, 0.82, 2.4);
    const adblue = mesh(cylX(0.24, 0.8, 20), M.black, root, -1.02, 0.78, 2.35);
    mesh(cylX(0.05, 0.1, 10), M.blue, adblue, -0.45, 0.1, 0);
    // axles and differentials
    for (const z of [...REAR_AX, ...FRONT_AX]) {
      mesh(cylX(0.07, 2.2, 10), M.steel, root, 0, WR, z, false);
      mesh(new THREE.SphereGeometry(0.2, 14, 10), M.steel, root, 0, WR, z, false);
    }
    // wheel arches / mudguards
    for (const s of [-1, 1]) {
      mesh(rbox(0.62, 0.06, 2.6, 0.02), M.black, root, s * 1.12, 1.1, 0);
      mesh(rbox(0.5, 0.06, 2.5, 0.02), M.black, root, s * 1.14, 1.1, 5.15);
    }
    // tail lights
    [-1, 1].forEach((s) => mesh(box(0.22, 0.14, 0.06), M.brake, root, s * 1.05, 0.9, -1.98, false));
    [-1, 1].forEach((s) => mesh(box(0.14, 0.1, 0.06), M.reverse, root, s * 0.78, 0.9, -1.98, false));
    const rearPlate = mesh(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshStandardMaterial({ map: licenseTexture("06 CKR 606"), roughness: 0.5 }), root, 0, 0.62, -2.03, false);
    rearPlate.rotation.y = Math.PI;

    // ================= wheels =================
    const spinners: THREE.Group[] = [];
    const steerers: THREE.Group[] = [];
    const tread = new THREE.MeshStandardMaterial({ map: treadTexture(), roughness: 0.92 });
    const rimFace = new THREE.MeshStandardMaterial({ map: rimTexture(), roughness: 0.4, metalness: 0.7 });
    const tireGeo = (w: number) => {
      const g = new THREE.CylinderGeometry(WR, WR, w, 40, 1);
      g.rotateZ(Math.PI / 2);
      return g;
    };
    const tireMats = [tread, M.rubber, M.rubber];
    const addTire = (spin: THREE.Group, x: number, w: number) => {
      const t = new THREE.Mesh(tireGeo(w), tireMats);
      t.position.x = x;
      t.castShadow = true;
      t.receiveShadow = true;
      spin.add(t);
    };
    const addWheel = (x: number, z: number, side: 1 | -1, steer: boolean, dual: boolean) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, WR, z);
      root.add(pivot);
      const spin = new THREE.Group();
      pivot.add(spin);
      if (steer) steerers.push(pivot);
      spinners.push(spin);
      if (dual) {
        addTire(spin, -side * 0.28, 0.28);
        addTire(spin, side * 0.0, 0.28);
        mesh(cylX(0.34, 0.6, 20), M.alu, spin, -side * 0.14, 0, 0, false);
      } else {
        addTire(spin, 0, 0.3);
        mesh(cylX(0.34, 0.32, 20), M.alu, spin, 0, 0, 0, false);
      }
      const faceX = dual ? side * 0.141 : side * 0.152;
      const face = mesh(new THREE.CircleGeometry(0.34, 28), rimFace, spin, faceX, 0, 0, false);
      face.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    };
    for (const z of REAR_AX)
      for (const s of [-1, 1] as const) addWheel(s * 1.0, z, s, false, true);
    for (const z of FRONT_AX)
      for (const s of [-1, 1] as const) addWheel(s * 1.12, z, s, true, false);

    // ================= cab =================
    const cab = new THREE.Group();
    root.add(cab);
    const z0 = CAB.z0;
    const cabPts: [number, number][] = [
      [z0, 1.15], [6.34, 1.15], [6.48, 1.36], [CAB.z1, 2.1], [6.43, 2.36], [6.12, 3.27], [5.98, 3.39], [4.45, 3.39], [z0 + 0.04, 3.28], [z0, 2.4],
    ];
    mesh(profile(cabPts, CAB.w, 0.03), M.cab, cab);
    // windshield and side glass
    const ws = mesh(new THREE.PlaneGeometry(2.3, 0.99), M.glass, cab, 0, 2.82, 6.28);
    ws.rotation.x = -Math.atan2(0.31, 0.91);
    ws.translateZ(0.012);
    for (const s of [-1, 1] as const) {
      const win = mesh(sidePanel([[4.98, 2.16], [6.4, 2.16], [6.14, 3.2], [4.98, 3.2]], s), M.glass, cab, s * (CAB.w / 2 + 0.006), 0, 0, false);
      win.castShadow = false;
      // door seams and handle
      for (const z of [4.92, 6.34]) mesh(box(0.012, 1.9, 0.014), M.black, cab, s * (CAB.w / 2 + 0.004), 2.15, z, false);
      mesh(box(0.03, 0.05, 0.22), M.black, cab, s * (CAB.w / 2 + 0.02), 2.0, 5.0, false);
      // steps
      mesh(box(0.28, 0.05, 0.5), M.steel, cab, s * 1.1, 0.62, 5.3);
      mesh(box(0.28, 0.05, 0.5), M.steel, cab, s * 1.1, 0.95, 5.3);
      // mirror
      mesh(box(0.22, 0.04, 0.04), M.black, cab, s * 1.36, 2.62, 6.28);
      mesh(rbox(0.1, 0.52, 0.26, 0.03), M.black, cab, s * 1.47, 2.52, 6.28);
      // company plate on the door
      const plate = companyPlate(1.45, 0.3, { glow: false });
      plate.position.set(s * (CAB.w / 2 + 0.014), 1.68, 5.5);
      plate.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      cab.add(plate);
    }
    // sun visor, roof marker lights
    mesh(rbox(2.4, 0.05, 0.34, 0.02), M.cab, cab, 0, 3.36, 6.08);
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((x) => mesh(box(0.13, 0.07, 0.06), M.marker, cab, x, 3.46, 6.1, false));
    // grille: dark panel, chrome bar with lettering, star above it
    mesh(rbox(1.62, 0.7, 0.05, 0.02), M.black, cab, 0, 1.78, 6.5);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.15), new THREE.MeshStandardMaterial({ map: mbBarTexture(), roughness: 0.25, metalness: 0.6 }));
    bar.position.set(0, 1.62, 6.532);
    cab.add(bar);
    for (const y of [1.84, 1.96]) mesh(box(1.5, 0.02, 0.02), M.chrome, cab, 0, y, 6.535, false);
    const star = new THREE.Group();
    star.position.set(0, 1.92, 6.56);
    cab.add(star);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 8, 36), M.chrome);
    star.add(ring);
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
      const spoke = new THREE.Mesh(box(0.024, 0.15, 0.014), M.chrome);
      spoke.position.set(Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0);
      spoke.rotation.z = a - Math.PI / 2;
      star.add(spoke);
    }
    // headlamps, daytime running strips and fog lamps
    for (const s of [-1, 1]) {
      mesh(rbox(0.52, 0.24, 0.07, 0.03), M.head, cab, s * 1.01, 1.8, 6.5, false);
      mesh(box(0.5, 0.03, 0.02), M.drl, cab, s * 1.01, 1.96, 6.54, false);
      mesh(cylX(0.06, 0.04, 12).rotateY(Math.PI / 2), M.drl, cab, s * 0.95, 1.2, 6.52, false);
    }
    // bumper and front plate
    mesh(rbox(2.5, 0.3, 0.32, 0.05), M.steel, cab, 0, 0.92, 6.46);
    const frontPlate = mesh(new THREE.PlaneGeometry(0.52, 0.11), new THREE.MeshStandardMaterial({ map: licenseTexture("06 CKR 606"), roughness: 0.5 }), cab, 0, 0.92, 6.63, false);
    frontPlate.rotation.y = 0;
    // "Actros" badge and company name above the windshield
    const badge = makePlate("ACTROS", 0.5, 0.12, { bg: "#d9dde0", fg: "#1a1c1e", border: null, radius: 6 });
    badge.position.set(-0.78, 2.18, 6.535);
    cab.add(badge);
    // exhaust stack behind the cab
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 12), M.chrome, cab, -1.34, 2.35, 4.12);
    mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.3, 12), M.alu, cab, -1.34, 1.5, 4.12);
    // driver's seat, dashboard, steering wheel (visible from the cab camera)
    mesh(rbox(0.52, 0.12, 0.52, 0.04), M.seat, cab, 0.45, 1.88, 5.3);
    mesh(rbox(0.52, 0.78, 0.12, 0.05), M.seat, cab, 0.45, 2.3, 4.98);
    mesh(rbox(0.5, 0.12, 0.5, 0.04), M.seat, cab, -0.4, 1.88, 5.3);
    mesh(rbox(0.5, 0.78, 0.12, 0.05), M.seat, cab, -0.4, 2.3, 4.98);
    mesh(rbox(2.3, 0.42, 0.55, 0.06), M.black, cab, 0, 2.05, 6.16);
    const wheel = mesh(new THREE.TorusGeometry(0.2, 0.022, 8, 28), M.black, cab, 0.45, 2.3, 5.86);
    wheel.rotation.x = -1.05;
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), M.black, cab, 0.45, 2.18, 5.98).rotation.x = -1.05;
    // amber roof beacon
    mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 14), M.black, cab, 0, 3.43, 5.7);
    const beaconLens = mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.14, 14), M.amber, cab, 0, 3.52, 5.7, false);

    // ================= bed (tips about the rear hinge) =================
    const bed = new THREE.Group();
    bed.position.set(0, TK.HINGE_Y, TK.HINGE_Z);
    root.add(bed);
    const zc = BED_LEN / 2 - 0.1; // bed centre in bed coordinates
    mesh(box(BED_W * 2, 0.12, BED_LEN), M.bed, bed, 0, 0.05, zc);
    mesh(box(BED_W * 2 - 0.16, 0.02, BED_LEN - 0.3), M.bedFloor, bed, 0, 0.115, zc, false);
    for (const s of [-1, 1]) {
      mesh(box(0.08, 1.05, BED_LEN), M.bed, bed, s * (BED_W - 0.04), 0.635, zc);
      mesh(rbox(0.16, 0.1, BED_LEN + 0.04, 0.03), M.bed, bed, s * (BED_W - 0.04), 1.2, zc); // top rail
      mesh(rbox(0.14, 0.12, BED_LEN, 0.03), M.bed, bed, s * (BED_W - 0.05), 0.03, zc); // bottom rail
      for (const z of [0.0, BED_LEN - 0.2]) mesh(box(0.1, 1.12, 0.1), M.bed, bed, s * (BED_W + 0.01), 0.62, z);
      const pl = companyPlate(4.7, 0.8, { glow: false });
      pl.position.set(s * (BED_W + 0.012), 0.64, zc);
      pl.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      bed.add(pl);
    }
    // headboard and cab protector
    mesh(box(BED_W * 2, 2.35, 0.1), M.bed, bed, 0, 1.28, BED_LEN - 0.1 + 0.05);
    const canopy = mesh(rbox(2.4, 0.07, 1.45, 0.02), M.bed, bed, 0, 2.4, BED_LEN + 0.6);
    canopy.rotation.x = 0.05;
    mesh(box(2.4, 0.18, 0.05), M.bed, bed, 0, 2.3, BED_LEN + 1.33);
    // tailgate, hinged along the top
    const gate = new THREE.Group();
    gate.position.set(0, 1.12, -0.07);
    bed.add(gate);
    mesh(box(2.24, 0.95, 0.07), M.bed, gate, 0, -0.475, 0);
    mesh(box(2.3, 0.07, 0.1), M.bed, gate, 0, -0.02, 0);
    const gatePlate = companyPlate(1.7, 0.3, { glow: false });
    gatePlate.position.set(0, -0.5, -0.04);
    gatePlate.rotation.y = Math.PI;
    gate.add(gatePlate);
    // soil heap
    const heap = new THREE.Mesh(heapGeometry(), M.soil);
    heap.position.set(0, 0.125, zc);
    heap.castShadow = true;
    heap.receiveShadow = true;
    heap.visible = false;
    bed.add(heap);

    // ================= four-stage hydraulic ram =================
    const ramSeg: THREE.Mesh[] = [];
    const segR = [0.11, 0.09, 0.07, 0.052];
    segR.forEach((r, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14), i === 0 ? M.ramBody : M.ram);
      m.scale.set(r, 1, r);
      m.castShadow = true;
      root.add(m);
      ramSeg.push(m);
    });
    const ramA = V(0, 0.92, 2.3);
    const ramB = V(0, 0, 3.9);
    const dirV = new THREE.Vector3();
    const qV = new THREE.Quaternion();
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();

    // ================= lights (constant count; only intensities change) =================
    const spots = [-1, 1].map((s) => {
      const l = new THREE.SpotLight("#fff1cf", 0, 95, 0.6, 0.5, 1.4);
      l.position.set(s * 1.0, 1.8, 6.6);
      l.target.position.set(s * 1.0, -1.2, 6.6 + 28);
      root.add(l, l.target);
      return l;
    });
    const beaconLight = new THREE.PointLight("#ffa000", 0, 22, 1.6);
    beaconLight.position.set(0, 3.7, 5.7);
    root.add(beaconLight);

    const eye = V(0.45, 2.62, 5.4);
    const exhaust = V(-1.34, 3.45, 4.12);

    // ---- per-frame pose ----
    const update: TruckRig["update"] = (tk, tg, t, dt, active) => {
      root.position.set(tk.x, tk.y, tk.z);
      const jitter = tk.running ? Math.sin(t * 58) * 0.0016 + Math.sin(t * 33) * 0.001 : 0;
      root.rotation.set(-tk.pitch + jitter, tk.yaw, tk.roll + jitter * 0.6, "YXZ");

      const roll = tk.wheelDist / WR;
      for (const s of spinners) s.rotation.x = roll;
      for (const p of steerers) p.rotation.y = -tk.steer * 0.5;

      // bed, tailgate, heap
      const ang = tk.bed * TK.BED_MAX;
      bed.rotation.x = -ang;
      gate.rotation.x = clamp((ang - 0.12) / 0.3, 0, 1) * 1.2;
      const fill = clamp(tk.cargo / TK.CAP, 0, 1);
      heap.visible = tk.cargo > 0.02;
      if (heap.visible) {
        const k = 0.65 + 0.35 * fill;
        heap.scale.set(k, Math.max(0.02, heapHeight(tk.cargo)), k);
        // soil slides rearwards as the bed tilts
        heap.position.z = zc - Math.sin(ang) * 0.9 * (1 - fill * 0.4);
      }

      // ram follows the bed: lower end on the chassis, upper end on the bed underside
      pA.copy(ramA);
      pB.copy(ramB).applyEuler(new THREE.Euler(-ang, 0, 0)).add(V(0, TK.HINGE_Y, TK.HINGE_Z));
      dirV.copy(pB).sub(pA);
      const L = Math.max(0.05, dirV.length());
      dirV.normalize();
      qV.setFromUnitVectors(UP, dirV);
      ramSeg.forEach((m, i) => {
        const len = L / 4 + 0.04;
        const mid = lerp(0, L, (i + 0.5) / 4);
        m.scale.y = len;
        m.position.copy(pA).addScaledVector(dirV, mid);
        m.quaternion.copy(qV);
      });

      // lights
      const head = active && tg.head ? 1 : 0;
      spots.forEach((l) => (l.intensity = head * 70));
      M.head.emissiveIntensity = head * 2.2;
      M.drl.emissiveIntensity = active ? 1.2 : 0.3;
      M.marker.emissiveIntensity = head ? 1.6 : 0;
      M.brake.emissiveIntensity = tk.brake > 0.3 ? 2.2 : head ? 0.7 : 0;
      M.reverse.emissiveIntensity = tk.dir < 0 && tk.running ? 2 : 0;
      const flash = active && tg.beacon ? (Math.sin(t * 10) > -0.2 ? 1 : 0.1) : 0;
      M.amber.emissiveIntensity = flash * 2.6;
      beaconLight.intensity = flash * 40;
      beaconLens.rotation.y = t * 8;
    };

    return { root, eye, exhaust, update };
  }, [soilTex]);
}
