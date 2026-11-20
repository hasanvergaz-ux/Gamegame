// The user's tractor model plus a procedurally built rear three-point linkage
// (lower links, lift arms, lift rods, top link and the two hydraulic lift cylinders).
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { companyPlate } from "./signs";
import { asset } from "../assets";
import { HITCH, IMPL, hitchPoint, lowerAngle } from "../sim/hitch";
import { clamp, lerp } from "../sim/math";
import type { Sim } from "../sim/tractor";
import type { Toggles } from "../store";

export const TRACTOR_URL = asset("tractor.glb");
useGLTF.preload(TRACTOR_URL);

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** Stretch a unit-height (Y) mesh between two points. */
function between(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  const len = d.length();
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  m.scale.set(1, len, 1);
}

export type TractorRig = {
  root: THREE.Group;
  eye: THREE.Vector3;
  exhaust: THREE.Vector3;
  update: (sim: Sim, tg: Toggles, t: number, dt: number) => void;
};

function buildLinkage() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#2a2b2d", roughness: 0.55, metalness: 0.7 });
  const paint = new THREE.MeshStandardMaterial({ color: "#c9a227", roughness: 0.45, metalness: 0.3 });
  const chrome = new THREE.MeshStandardMaterial({ color: "#d9dde0", roughness: 0.12, metalness: 1 });
  const cyl = (r: number, mat: THREE.Material) => {
    const geo = new THREE.CylinderGeometry(r, r, 1, 12);
    geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const centered = (r: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // lower links: flat bars pivoting at the rear axle housing
  const lower = [1, -1].map(() => {
    const pivot = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, HITCH.lowerLen + 0.1), steel);
    bar.position.z = -HITCH.lowerLen / 2;
    bar.castShadow = true;
    const ball = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.025, 8, 14), steel);
    ball.position.z = -HITCH.lowerLen;
    ball.rotation.y = Math.PI / 2;
    pivot.add(bar, ball);
    g.add(pivot);
    return pivot;
  });
  // the lift-arm cross shaft housing
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, HITCH.liftPivot.x * 2 + 0.2, 12), paint);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(0, HITCH.liftPivot.y, HITCH.liftPivot.z);
  g.add(shaft);
  const liftArms = [1, -1].map(() => {
    const pivot = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, HITCH.liftLen), paint);
    bar.position.z = -HITCH.liftLen / 2;
    bar.castShadow = true;
    pivot.add(bar);
    g.add(pivot);
    return pivot;
  });
  const rods = [1, -1].map(() => centered(0.022, steel));
  const barrels = [1, -1].map(() => cyl(0.055, paint));
  const pistons = [1, -1].map(() => cyl(0.026, chrome));
  const top = centered(0.035, steel);
  const topEnd = centered(0.05, paint);
  return { g, lower, liftArms, rods, barrels, pistons, top, topEnd };
}

export function useTractorRig(sim: Sim) {
  const gltf = useGLTF(TRACTOR_URL);
  const rig = useMemo<TractorRig>(() => {
    const root = new THREE.Group();
    // clone: StrictMode may run this twice and a scene object can only have one parent
    const model = gltf.scene.clone(true);
    root.add(model);
    const mats = new Map<string, THREE.MeshStandardMaterial[]>();
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      const list = mats.get(mat.name) ?? [];
      if (!list.includes(mat)) list.push(mat);
      mats.set(mat.name, list);
    });
    model.updateMatrixWorld(true);
    const wheels = ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"].map((n) => model.getObjectByName(n)!);
    const box = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o);
    const rad = wheels.map((w) => (box(w).max.y - box(w).min.y) / 2);
    const wheelQ = wheels.map((w) => w.quaternion.clone());
    const matBox = (name: string) => {
      const b = new THREE.Box3();
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && (m.material as THREE.Material).name === name) b.expandByObject(m);
      });
      return b;
    };
    const center = (b: THREE.Box3) => b.getCenter(new THREE.Vector3());
    const setLens = (n: string, c: string, k: number) =>
      (mats.get(n) ?? []).forEach((m) => {
        m.emissive.set(c);
        m.emissiveIntensity = k;
      });

    // steering wheel: find its rim plane so it turns about its own column
    const sw = model.getObjectByName("SteeringWheel")!;
    const swP = sw.position.clone();
    const swQ = sw.quaternion.clone();
    let swC: THREE.Vector3 | null = null;
    let swN: THREE.Vector3 | null = null;
    {
      const pts: THREE.Vector3[] = [];
      sw.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && /tire_rubber/.test(m.name)) {
          const p = m.geometry.attributes.position as THREE.BufferAttribute;
          for (let i = 0; i < p.count; i += 2) pts.push(sw.worldToLocal(V(0, 0, 0).fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)));
        }
      });
      if (pts.length > 10) {
        const c = V(0, 0, 0);
        pts.forEach((p) => c.add(p));
        c.divideScalar(pts.length);
        let far = pts[0]!;
        let best = 0;
        pts.forEach((p) => {
          const d = p.distanceTo(c);
          if (d > best) {
            best = d;
            far = p;
          }
        });
        const a = far.clone().sub(c);
        let nb = V(0, 1, 0);
        let mc = 0;
        pts.forEach((p) => {
          const x = a.clone().cross(p.clone().sub(c));
          if (x.length() > mc) {
            mc = x.length();
            nb = x;
          }
        });
        swN = nb.normalize();
        if (swN.clone().transformDirection(sw.matrixWorld).z > 0) swN.negate();
        swC = c;
      }
    }

    // lights: constant count, only intensities change (no shader recompiles)
    const hb = matBox("headlamp_lens");
    const hc = center(hb);
    const hw = (hb.max.x - hb.min.x) / 2;
    const spots = [-1, 1].map((s) => {
      const l = new THREE.SpotLight("#fff1cf", 0, 80, 0.62, 0.55, 1.4);
      l.position.set(hc.x + s * hw * 0.7, hc.y, hb.max.z + 0.2);
      l.target.position.set(hc.x + s * hw * 0.7, -2, hb.max.z + 22);
      root.add(l, l.target);
      return l;
    });
    const tail = new THREE.PointLight("#ff2a1a", 0, 9, 1.6);
    tail.position.copy(center(matBox("tail_lens")));
    const beacon = new THREE.PointLight("#ffa000", 0, 18, 1.6);
    beacon.position.copy(center(matBox("amber_lens")));
    const work = new THREE.SpotLight("#fff6e0", 0, 35, 0.9, 0.6, 1.4);
    work.position.set(0, 2.75, -1.6);
    work.target.position.set(0, -1.5, -9);
    root.add(tail, beacon, work, work.target);

    // "ÇAKIR HAFRİYAT" plates on both sides of the hood
    const hoodObj = model.getObjectByName("Hinge_Hood");
    if (hoodObj) {
      const hbx = box(hoodObj);
      const len = hbx.max.z - hbx.min.z;
      const pw = Math.min(1.1, len * 0.72);
      for (const s of [-1, 1]) {
        const cp = companyPlate(pw, pw / 5.6);
        cp.position.set(s > 0 ? hbx.max.x + 0.012 : hbx.min.x - 0.012, hbx.min.y + (hbx.max.y - hbx.min.y) * 0.42, (hbx.min.z + hbx.max.z) / 2);
        cp.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
        root.add(cp);
      }
    }

    const mf = matBox("muffler_steel");
    const exhaust = V((mf.min.x + mf.max.x) / 2, mf.max.y, (mf.min.z + mf.max.z) / 2);
    const sb = matBox("seat_vinyl");
    const eye = V((sb.min.x + sb.max.x) / 2, sb.max.y + 0.62, (sb.min.z + sb.max.z) / 2);

    const mixer = new THREE.AnimationMixer(model);
    const act: Record<string, THREE.AnimationAction> = {};
    for (const c of gltf.animations)
      if (["Steer_Left_Right", "Pedal_Throttle_Press", "Pedal_Brake_Press", "Shuttle_Forward_Reverse", "Hood_Open"].includes(c.name)) {
        const a = mixer.clipAction(c);
        a.play();
        a.paused = true;
        act[c.name] = a;
      }
    const setT = (n: string, f: number) => {
      const a = act[n];
      if (a) a.time = clamp(f, 0, 1) * a.getClip().duration;
    };

    const L = buildLinkage();
    model.add(L.g);

    let shuttle = 0.25;
    let hood = 0;
    // visual body motion layered on the physics pose (squat, lean, engine shake)
    let sp = 0, spv = 0, sr = 0, srv = 0, sh = 0, shv = 0;

    const update = (s: Sim, tg: Toggles, t: number, dt: number) => {
      const tr = s.tr;
      const idle = tr.running ? Math.sin(t * 58) * 0.0012 + Math.sin(t * 31) * 0.0008 : 0;
      const sf = Math.min(1, Math.abs(tr.v) / 6);
      const bump = sf * (Math.sin(tr.wheelDist * 1.3) + 0.6 * Math.sin(tr.wheelDist * 3.1) + 0.4 * Math.sin(tr.wheelDist * 7.7));
      const tp = clamp(-tr.accel * 0.004, -0.03, 0.03) + 0.004 * bump + idle * 0.6;
      const trl = clamp(tr.v * tr.yawRate * 0.012, -0.04, 0.04) + 0.006 * sf * Math.sin(tr.wheelDist * 1.9 + 1) + idle;
      const th = 0.01 * bump + idle * 2;
      spv += (120 * (tp - sp) - 17 * spv) * dt; sp += spv * dt;
      srv += (110 * (trl - sr) - 16 * srv) * dt; sr += srv * dt;
      shv += (160 * (th - sh) - 20 * shv) * dt; sh += shv * dt;
      root.position.set(tr.x, tr.y + sh, tr.z);
      root.rotation.set(-tr.pitch + sp, tr.yaw, tr.roll + sr, "YXZ");

      wheels.forEach((w, i) => {
        w.quaternion.copy(wheelQ[i]!).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -tr.wheelDist / rad[i]!));
      });
      const st = tr.steer;
      setT("Steer_Left_Right", st >= 0 ? (1 + 0.5 * st) / 2 : -0.25 * st);
      setT("Pedal_Throttle_Press", tr.gas * 0.25);
      setT("Pedal_Brake_Press", tr.brake * 0.25);
      shuttle = lerp(shuttle, tr.dir > 0 ? 0.25 : 0.75, Math.min(1, dt * 6));
      setT("Shuttle_Forward_Reverse", shuttle);
      hood = lerp(hood, tg.hood ? 1 : 0, Math.min(1, dt * 2.5));
      setT("Hood_Open", hood);
      mixer.update(0);
      if (swC && swN) {
        const q = new THREE.Quaternion().setFromAxisAngle(swN, -st * 2.4);
        sw.quaternion.copy(swQ).multiply(q);
        sw.position.copy(swP).add(swC.clone().sub(swC.clone().applyQuaternion(q)).applyQuaternion(swQ));
      }

      // lights
      const head = tg.head ? 1 : 0;
      setLens("headlamp_lens", "#fff3c4", head * 3);
      spots.forEach((l) => (l.intensity = head * 60));
      setLens("tail_lens", "#ff2010", tg.head || tg.work ? 1.6 : 0);
      tail.intensity = (tg.head ? 0.8 : 0) + tr.brake * 1.2;
      setLens("brake_lens", "#ff1a10", tr.brake > 0.1 ? 3 : 0);
      setLens("reverse_lens", "#ffffff", tr.dir < 0 && tr.running ? 2.5 : 0);
      work.intensity = tg.work ? 45 : 0;
      const bk = tg.beacon && Math.sin(t * 9) > 0 ? 1 : tg.beacon ? 0.12 : 0;
      setLens("amber_lens", "#ffa000", bk * 4);
      beacon.intensity = bk * 6;

      // three-point linkage
      const u = tr.lift;
      const a = lowerAngle(u);
      L.lower.forEach((p, i) => {
        const sx = i === 0 ? 1 : -1;
        p.position.set(sx * HITCH.lowerPivotX, HITCH.lowerPivotY, HITCH.lowerPivotZ);
        // splay the links outward to the hitch-pin spacing
        p.rotation.set(a, sx * Math.atan2(HITCH.ballX - HITCH.lowerPivotX, HITCH.lowerLen), 0, "YXZ");
      });
      const la = lerp(HITCH.liftAngDown, HITCH.liftAngUp, u);
      L.liftArms.forEach((p, i) => {
        const sx = i === 0 ? 1 : -1;
        p.position.set(sx * HITCH.liftPivot.x, HITCH.liftPivot.y, HITCH.liftPivot.z);
        p.rotation.set(la, 0, 0);
      });
      const armEnd = (sx: number, f: number) =>
        V(sx * HITCH.liftPivot.x, HITCH.liftPivot.y + Math.sin(la) * HITCH.liftLen * f, HITCH.liftPivot.z - Math.cos(la) * HITCH.liftLen * f);
      const linkAt = (sx: number, f: number) => {
        const x = sx * (HITCH.lowerPivotX + (HITCH.ballX - HITCH.lowerPivotX) * f);
        return V(x, HITCH.lowerPivotY + Math.sin(a) * HITCH.lowerLen * f, HITCH.lowerPivotZ - Math.cos(a) * HITCH.lowerLen * f);
      };
      L.rods.forEach((r, i) => {
        const sx = i === 0 ? 1 : -1;
        between(r, armEnd(sx, 1), linkAt(sx, 0.55));
      });
      L.barrels.forEach((b, i) => {
        const sx = i === 0 ? 1 : -1;
        const base = V(sx * HITCH.cylBase.x, HITCH.cylBase.y, HITCH.cylBase.z);
        const end = armEnd(sx, 0.45);
        end.x = sx * (HITCH.liftPivot.x + 0.07);
        const d = end.clone().sub(base);
        const len = d.length();
        // fixed-length barrel, the chrome piston rod slides out of it
        between(b, base, base.clone().addScaledVector(d.clone().normalize(), Math.min(0.32, len)));
        between(L.pistons[i]!, base.clone().addScaledVector(d.clone().normalize(), 0.2), end);
      });
      const tp0 = V(0, HITCH.topPivot.y, HITCH.topPivot.z);
      let tp1: THREE.Vector3;
      if (s.imp.attached) {
        const hp = hitchPoint(u);
        tp1 = V(0, hp.y + IMPL.mastTop.y, hp.z + IMPL.mastTop.z);
      } else tp1 = V(0, HITCH.topPivot.y - 0.5, HITCH.topPivot.z - 0.28);
      between(L.top, tp0, tp1);
      between(L.topEnd, tp0.clone().lerp(tp1, 0.3), tp0.clone().lerp(tp1, 0.6));
    };
    return { root, eye, exhaust, update };
  }, [gltf, sim]);

  return rig;
}
