// "Kazayağı" field cultivator: 3 m frame, three staggered rows of S-spring tines with
// goose-foot sweeps, depth wheels, a rear crumbler roller and parking stands.
// Local frame: origin = midpoint of the lower hitch pins, +Z toward the tractor, +Y up.
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { IMPL } from "../sim/hitch";

export type CultivatorRig = { root: THREE.Group; roller: THREE.Group; wheels: THREE.Group[] };

function box(w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  g.translate(x, y, z);
  return g;
}

function beam(a: THREE.Vector3, b: THREE.Vector3, s: number) {
  const d = b.clone().sub(a);
  const g = new THREE.BoxGeometry(s, d.length(), s);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  const m = a.clone().addScaledVector(d, 0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

function tine(x: number, z: number) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.27, 0.02),
    new THREE.Vector3(0, 0.16, -0.13),
    new THREE.Vector3(0, 0.02, -0.08),
    new THREE.Vector3(0, -0.14, 0.05),
    new THREE.Vector3(0, -0.3, 0.11),
    new THREE.Vector3(0, IMPL.tineTipY + 0.03, 0.13),
  ]);
  const spring = new THREE.TubeGeometry(curve, 24, 0.02, 6);
  spring.scale(1.8, 1, 1);
  spring.translate(x, 0, z);
  // goose-foot sweep at the tip
  const sh = new THREE.Shape();
  sh.moveTo(0, 0.13);
  sh.lineTo(-0.12, -0.06);
  sh.lineTo(-0.05, -0.05);
  sh.lineTo(0, -0.01);
  sh.lineTo(0.05, -0.05);
  sh.lineTo(0.12, -0.06);
  sh.closePath();
  const foot = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
  foot.rotateX(-Math.PI / 2 + 0.32);
  foot.translate(x, IMPL.tineTipY + 0.02, z + 0.13);
  return { spring, foot, clamp: box(0.09, 0.08, 0.12, x, 0.28, z) };
}

function wheel(r: number, w: number) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.07, 10, 24), new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.9 }));
  tire.rotation.y = Math.PI / 2;
  tire.scale.set(1, 1, w / 0.14);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.1, r - 0.1, w * 0.8, 16), new THREE.MeshStandardMaterial({ color: "#c9c4b8", roughness: 0.4, metalness: 0.7 }));
  rim.rotation.z = Math.PI / 2;
  tire.castShadow = rim.castShadow = true;
  g.add(tire, rim);
  return g;
}

export function useCultivatorRig(): CultivatorRig {
  return useMemo(() => {
    const root = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: "#c0391b", roughness: 0.42, metalness: 0.35 });
    const steel = new THREE.MeshStandardMaterial({ color: "#9a9ea2", roughness: 0.3, metalness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: "#2d3033", roughness: 0.55, metalness: 0.7 });
    const P: THREE.BufferGeometry[] = [];
    const S: THREE.BufferGeometry[] = [];
    const D: THREE.BufferGeometry[] = [];
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const mt = V(0, IMPL.mastTop.y, IMPL.mastTop.z);
    // headstock A-frame
    for (const s of [-1, 1]) {
      P.push(beam(V(s * 0.41, 0.0, -0.06), V(s * 0.07, mt.y, mt.z), 0.08));
      P.push(beam(V(s * 0.07, mt.y - 0.02, mt.z), V(s * 0.5, 0.34, -0.85), 0.07));
      P.push(box(0.03, 0.18, 0.16, s * 0.38, 0.04, -0.06));
      D.push(new THREE.CylinderGeometry(0.028, 0.028, 0.16, 10).rotateZ(Math.PI / 2).translate(s * 0.47, 0, 0));
    }
    P.push(box(0.2, 0.1, 0.06, 0, mt.y, mt.z));
    D.push(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8).rotateZ(Math.PI / 2).translate(0, mt.y, mt.z));
    P.push(box(0.9, 0.08, 0.08, 0, 0.32, -0.12));
    for (const s of [-1, 1]) P.push(box(0.08, 0.08, 0.36, s * 0.42, 0.32, -0.3));
    // frame
    for (const z of [-0.45, -0.95, -1.45]) P.push(box(3.05, 0.1, 0.1, 0, 0.32, z));
    for (const x of [-1.45, -0.7, 0.7, 1.45]) P.push(box(0.1, 0.1, 1.45, x, 0.34, -0.95));
    // tines: 13 tines over 3 rows -> ~23 cm spacing
    const rows: [number, number[]][] = [
      [-0.45, [-1.38, -0.69, 0, 0.69, 1.38]],
      [-0.95, [-1.15, -0.46, 0.23, 0.92]],
      [-1.45, [-0.92, -0.23, 0.46, 1.15]],
    ];
    for (const [z, xs] of rows)
      for (const x of xs) {
        const t = tine(x, z);
        S.push(t.spring, t.foot);
        D.push(t.clamp);
      }
    // depth wheel arms
    for (const s of [-1, 1]) P.push(beam(V(s * 1.45, 0.34, -0.7), V(s * 1.62, 0.1, -1.05), 0.07));
    // crumbler roller arms
    for (const s of [-1, 1]) P.push(beam(V(s * 1.3, 0.34, -1.45), V(s * 1.52, 0.02, IMPL.rollerZ), 0.07));
    // parking stands
    for (const s of [-1, 1]) {
      P.push(box(0.06, 0.55, 0.06, s * 0.8, 0.05, -0.45));
      D.push(box(0.18, 0.02, 0.18, s * 0.8, -IMPL.restY + 0.01, -0.45));
    }
    // sign plate
    P.push(box(0.6, 0.22, 0.02, 0, 0.32, -0.395));

    const add = (list: THREE.BufferGeometry[], m: THREE.Material) => {
      const mesh = new THREE.Mesh(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)))!, m);
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    };
    add(P, paint);
    add(S, steel);
    add(D, dark);

    // rear crumbler roller (rotates when it rolls on the ground)
    const roller = new THREE.Group();
    roller.position.set(0, 0.0, IMPL.rollerZ);
    const rg: THREE.BufferGeometry[] = [];
    for (const x of [-1.5, -0.75, 0, 0.75, 1.5]) rg.push(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 18).rotateZ(Math.PI / 2).translate(x, 0, 0));
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      rg.push(new THREE.CylinderGeometry(0.018, 0.018, 3.0, 6).rotateZ(Math.PI / 2).translate(0, Math.sin(a) * 0.19, Math.cos(a) * 0.19));
    }
    rg.push(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 8).rotateZ(Math.PI / 2));
    const rm = new THREE.Mesh(mergeGeometries(rg.map((g) => g.toNonIndexed()))!, dark);
    rm.castShadow = true;
    roller.add(rm);
    root.add(roller);

    const wheels = [-1, 1].map((s) => {
      const w = wheel(0.3, 0.16);
      w.position.set(s * 1.66, -IMPL.restY + 0.3 - 0.0, -1.05);
      root.add(w);
      return w;
    });
    return { root, roller, wheels };
  }, []);
}
