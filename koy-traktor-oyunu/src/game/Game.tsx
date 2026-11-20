import { Environment, Lightformer, Sky, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gameAudio } from "./audio/GameAudio";
import { bindKeyboard, camCtl, input, readAxes, readExcAxes } from "./input";
import { REQUIRED, exc, loaded, sim, truck } from "./runtime";
import { Buildings, windowMats } from "./scene/Buildings";
import { useCultivatorRig } from "./scene/Cultivator";
import { useExcavatorRig } from "./scene/Excavator";
import { Site } from "./scene/Site";
import { useTruckRig } from "./scene/Truck";
import { glassMats, glowMats } from "./scene/signs";
import { useParticles } from "./scene/Particles";
import { Grass, Trees, Wheat } from "./scene/Plants";
import { Terrain, TerrainPlaceholder } from "./scene/Terrain";
import { useTractorRig } from "./scene/Tractor";
import { PATCH_HALF, uPatch, uTime, uploadDig, uploadMask } from "./scene/shared";
import { setMaxAnisotropy } from "./scene/textures";
import { IMPL } from "./sim/hitch";
import { clamp, damp, lerp } from "./sim/math";
import { DIG } from "./sim/dig";
import { EX, PHASE_NAMES, resetExcavator, stepExcavator, type ExInput } from "./sim/excavator";
import { resetSim, stepSim, toWorld } from "./sim/tractor";
import { PARKED_TRUCK, TK, resetTruck, stepTruck, truckToWorld } from "./sim/truck";
import { SURF, SURF_NAMES, heightAt } from "./sim/world";
import { toast, useHud, useToggles } from "./store";
import { Hud } from "./ui/Hud";

function Loaded({ name }: { name: string }) {
  useEffect(() => {
    loaded.add(name);
  }, [name]);
  return null;
}

const DUST = new THREE.Color("#8a6b4a");
const SMOKE = new THREE.Color("#9a9a9a");
const SOOT = new THREE.Color("#262626");
const tmpV = new THREE.Vector3();
const tmpP = { x: 0, y: 0, z: 0 };
const NO_LEVERS = { drive: 0, turn: 0, swing: 0, boom: 0, stick: 0, bucket: 0 };
const PARKED = { throttle: 0, brake: 1, steer: 0, liftCmd: 0 };
const qTmp = new THREE.Quaternion();
const tailP = { x: 0, z: 0 };

function Driver() {
  const rig = useTractorRig(sim);
  const cult = useCultivatorRig();
  const exRig = useExcavatorRig();
  const tkRig = useTruckRig();
  const parts = useParticles();
  const { scene, camera, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sky = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Points>(null);
  const st = useRef({ tkSmokeAcc: 0, tipDustAcc: 0, t: 0, night: 0, maskT: 0, digT: 0, hudT: 0, smokeAcc: 0, exSmokeAcc: 0, dustAcc: 0, digDustAcc: 0, ready: false, camInit: false, lx: 0, lz: 0, veh: "" });
  const fog = useMemo(() => new THREE.Fog("#c4d4e0", 140, 900), []);

  useEffect(() => {
    scene.fog = fog;
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    loaded.add("tractor");
    if (import.meta.env.DEV) Object.assign(window, { __three: { scene, camera, rig, cult, exRig, tkRig } });
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, gl, camera, rig, cult, exRig, tkRig]);

  useFrame((state, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 0.05);
    s.t += dt;
    uTime.value = s.t;
    const tg = useToggles.getState();
    const isExc = tg.vehicle === "excavator";
    const isTruck = tg.vehicle === "truck";
    const isTr = tg.vehicle === "tractor";
    const axes = readAxes();
    const ax = isTr ? axes : PARKED;
    if (s.veh !== tg.vehicle) {
      s.veh = tg.vehicle;
      s.camInit = false;
    }

    if (input.resetPressed) {
      input.resetPressed = false;
      if (isExc) resetExcavator(exc);
      else if (isTruck) resetTruck(truck);
      else resetSim(sim);
      s.camInit = false;
    }
    stepSim(sim, { ...ax, dir: tg.dir, engineOn: tg.engine, attachPressed: isTr && input.attachPressed }, dt);
    input.attachPressed = false;
    const exIn: ExInput = {
      ...(isExc ? readExcAxes() : NO_LEVERS),
      bladeDown: tg.bladeDown,
      engineOn: tg.excEngine,
      autoToggle: isExc && input.autoPressed,
    };
    input.autoPressed = false;
    stepExcavator(exc, exIn, dt, sim.tr);
    for (const e of exc.events) {
      if (e.type === "crank") gameAudio.crank();
      else if (e.type === "scoop") gameAudio.thud(0.5);
      else if (e.type === "dump") gameAudio.thud(0.7);
      else if (e.type === "limit") gameAudio.clunk(0.25 + 0.3 * e.strength);
      else if (e.type === "bump") gameAudio.thud(e.strength / 2);
      else if (e.type === "full" && !exc.auto.on) toast("Kova dolu — kuleyi çevir (← →) ve X ile boşalt");
      else if (e.type === "autoOn") toast("⛏ Otomatik kazı başladı — durdurmak için Boşluk ya da bir kol");
      else if (e.type === "autoOff") toast("Otomatik kazı durdu");
      else if (e.type === "noHydraulics" && isExc) toast("Hidrolik için önce kepçenin motorunu çalıştır (🔑 / K)");
    }
    exc.events.length = 0;
    stepTruck(
      truck,
      isTruck
        ? { throttle: axes.throttle, brake: axes.brake, steer: axes.steer, bedCmd: axes.liftCmd, dir: tg.dir, engineOn: tg.truckEngine }
        : { ...PARKED_TRUCK, dir: tg.dir, engineOn: tg.truckEngine },
      dt,
      sim.tr,
    );
    for (const e of truck.events) {
      if (e.type === "crank") gameAudio.crank();
      else if (e.type === "bump") gameAudio.thud(e.strength / 3);
      else if (e.type === "tipStart") {
        gameAudio.clunk(0.9);
        toast("Damper boşaltıyor — kamyonu hafifçe ileri sür, toprak serilsin");
      } else if (e.type === "full") toast("Kamyon dolu — damperi kaldırıp boşalt (E)");
      else if (e.type === "noHydraulics" && isTruck) toast("Damper için önce kamyonun motorunu çalıştır (🔑 / K)");
    }
    truck.events.length = 0;
    for (const e of sim.events) {
      if (e.type === "crank") gameAudio.crank();
      else if (e.type === "attach") {
        gameAudio.clunk(1);
        toast("Kazayağı takıldı — ▼ ile indir, sür ve toprağı işle");
      } else if (e.type === "detach") {
        gameAudio.clunk(0.8);
        toast("Kazayağı çıkarıldı");
      } else if (e.type === "attachFail") toast("Takmak için kazayağına geri geri yaklaş (yeşil işaret)");
      else if (e.type === "noHydraulics") toast("Hidrolik için önce motoru çalıştır (🔑 / K)");
      else if (e.type === "bump" || e.type === "land" || e.type === "thud") gameAudio.thud(e.strength / 3);
    }
    sim.events.length = 0;
    const { tr, imp } = sim;
    const fx = isExc ? exc.x : isTruck ? truck.x : tr.x;
    const fz = isExc ? exc.z : isTruck ? truck.z : tr.z;
    if (Math.hypot(fx - s.lx, fz - s.lz) > 8) s.camInit = false; // teleported: snap the camera
    s.lx = fx;
    s.lz = fz;
    uPatch.value.set(Math.round(fx / 2) * 2, Math.round(fz / 2) * 2, PATCH_HALF);

    rig.update(sim, !isTr ? { ...tg, head: false, work: false, beacon: false, hood: false } : tg, s.t, dt);
    tkRig.update(truck, tg, s.t, dt, isTruck);
    exRig.update(exc, tg, s.t, dt, isExc);

    // implement pose (eased while snapping onto the hitch)
    const r = cult.root;
    if (imp.attached && imp.blend < 1) {
      const k = imp.blend * imp.blend * (3 - 2 * imp.blend);
      r.position.set(lerp(imp.from.x, imp.x, k), lerp(imp.from.y, imp.y, k), lerp(imp.from.z, imp.z, k));
      const dyaw = Math.atan2(Math.sin(imp.yaw - imp.from.yaw), Math.cos(imp.yaw - imp.from.yaw));
      r.rotation.set(-lerp(imp.from.pitch, imp.pitch, k), imp.from.yaw + dyaw * k, lerp(imp.from.roll, imp.roll, k), "YXZ");
    } else {
      r.position.set(imp.x, imp.y, imp.z);
      r.rotation.set(-imp.pitch, imp.yaw, imp.roll, "YXZ");
    }
    cult.roller.rotation.x = -imp.rollerA;
    cult.wheels.forEach((w) => (w.rotation.x = -imp.rollerA * 0.66));

    // smoke & dust
    if (tr.running) {
      s.smokeAcc += dt * (5 + tr.gas * 24 + tr.load * 10);
      const heavy = tr.gas > 0.6 && tr.load > 0.5;
      rig.root.localToWorld(tmpV.copy(rig.exhaust));
      while (s.smokeAcc > 1) {
        s.smokeAcc--;
        parts.emit(tmpV.x, tmpV.y, tmpV.z, (Math.random() - 0.5) * 0.4, 1.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4, 1.8, 0.5, heavy ? SOOT : SMOKE, heavy ? 0.55 : 0.25);
      }
    }
    if (imp.working) {
      s.dustAcc += dt * 40 * Math.min(1, Math.abs(tr.v) / 2.5);
      while (s.dustAcc > 1) {
        s.dustAcc--;
        const lx = (Math.random() - 0.5) * IMPL.halfWidth * 2;
        toWorld(imp, lx, 0.05, IMPL.rollerZ - 0.1, tmpP);
        parts.emit(tmpP.x, heightAt(tmpP.x, tmpP.z) + 0.2, tmpP.z, (Math.random() - 0.5) * 0.6, 0.5 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6, 2.4, 1.4, DUST, 0.32);
      }
    }
    // dump truck: exhaust stack and the cloud where soil slides out
    if (truck.running) {
      s.tkSmokeAcc += dt * (4 + truck.load * 26);
      tkRig.root.localToWorld(tmpV.copy(tkRig.exhaust));
      while (s.tkSmokeAcc > 1) {
        s.tkSmokeAcc--;
        const heavy = truck.gas > 0.6;
        parts.emit(tmpV.x, tmpV.y, tmpV.z, (Math.random() - 0.5) * 0.3, 1.5 + Math.random() * 0.6, (Math.random() - 0.5) * 0.3, 1.8, 0.5, heavy ? SOOT : SMOKE, heavy ? 0.6 : 0.28);
      }
    }
    if (truck.tipping) {
      s.tipDustAcc += dt * 45;
      while (s.tipDustAcc > 1) {
        s.tipDustAcc--;
        truckToWorld(truck, (Math.random() - 0.5) * 2, TK.BED_Z0 - 0.5, tailP);
        parts.emit(tailP.x, heightAt(tailP.x, tailP.z) + 0.3, tailP.z, (Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 0.7, (Math.random() - 0.5) * 0.9, 2.2, 1.3, DUST, 0.34);
      }
    }
    // excavator: exhaust, dust where the bucket bites, puffs where clods land
    if (exc.running) {
      s.exSmokeAcc += dt * (4 + exc.load * 22);
      exRig.house.localToWorld(tmpV.copy(exRig.exhaust));
      while (s.exSmokeAcc > 1) {
        s.exSmokeAcc--;
        const heavy = exc.load > 0.65;
        parts.emit(tmpV.x, tmpV.y, tmpV.z, (Math.random() - 0.5) * 0.3, 1.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 1.6, 0.4, heavy ? SOOT : SMOKE, heavy ? 0.45 : 0.22);
      }
    }
    if (exc.digging > 0.05 || exc.bladeWork > 0.05) {
      s.digDustAcc += dt * 26 * Math.max(exc.digging, exc.bladeWork);
      while (s.digDustAcc > 1) {
        s.digDustAcc--;
        const g = heightAt(exc.tip.x, exc.tip.z);
        parts.emit(exc.tip.x + (Math.random() - 0.5) * 0.6, g + 0.15, exc.tip.z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.5, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5, 2, 1.1, DUST, 0.3);
      }
    }
    for (let i = 0; i < exc.landed.length; i += 3) {
      const l = exc.landed[i]!;
      parts.emit(l.x, l.y + 0.1, l.z, (Math.random() - 0.5) * 0.9, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.9, 1.6, 1.0, DUST, 0.26);
    }
    parts.update(dt);

    s.digT += dt;
    if (s.digT > 0.05) {
      s.digT = 0;
      uploadDig();
    }

    s.maskT += dt;
    if (s.maskT > 0.12) {
      s.maskT = 0;
      uploadMask();
    }

    // camera
    const cam = camera as THREE.PerspectiveCamera;
    const tgt = isExc ? tmpV.set(exc.x, exc.y + 1.7, exc.z) : isTruck ? tmpV.set(truck.x, truck.y + 2.2, truck.z) : tmpV.set(tr.x, tr.y + 1.6, tr.z);
    const houseYaw = exc.yaw + exc.j.swing.p;
    if (isTruck && tg.cam === 1) {
      const e = tkRig.root.localToWorld(tkRig.eye.clone());
      cam.position.copy(e);
      const dir = new THREE.Vector3(Math.sin(camCtl.yaw) * Math.cos(camCtl.pitch), Math.sin(camCtl.pitch), Math.cos(camCtl.yaw) * Math.cos(camCtl.pitch)).applyQuaternion(tkRig.root.quaternion);
      cam.up.set(0, 1, 0).applyQuaternion(tkRig.root.quaternion);
      cam.lookAt(e.add(dir));
      cam.fov = camCtl.fov;
      s.camInit = false;
    } else if (isTruck && tg.cam === 2) {
      const p = tkRig.root.localToWorld(new THREE.Vector3(2.8, 4.6, -10));
      const look = tkRig.root.localToWorld(new THREE.Vector3(0, 1.6, -2));
      p.y = Math.max(p.y, heightAt(p.x, p.z) + 1);
      cam.position.lerp(p, s.camInit ? damp(6, dt) : 1);
      cam.up.set(0, 1, 0);
      cam.lookAt(look);
      cam.fov = 60;
      s.camInit = true;
    } else if (isTruck) {
      const az = truck.yaw + Math.PI + camCtl.yaw;
      const el = clamp(0.26 + camCtl.pitch, -0.1, 1.3);
      const d = camCtl.dist;
      const want = new THREE.Vector3(tgt.x + Math.sin(az) * Math.cos(el) * d, tgt.y + Math.sin(el) * d, tgt.z + Math.cos(az) * Math.cos(el) * d);
      want.y = Math.max(want.y, heightAt(want.x, want.z) + 0.9);
      if (!s.camInit) cam.position.copy(want);
      else cam.position.lerp(want, damp(5, dt));
      s.camInit = true;
      cam.up.set(0, 1, 0);
      cam.lookAt(tgt);
      cam.fov = 62;
    } else if (isExc && tg.cam === 1) {
      const e = exRig.house.localToWorld(exRig.eye.clone());
      cam.position.copy(e);
      const dir = new THREE.Vector3(Math.sin(camCtl.yaw) * Math.cos(camCtl.pitch - 0.18), Math.sin(camCtl.pitch - 0.18), Math.cos(camCtl.yaw) * Math.cos(camCtl.pitch - 0.18)).applyQuaternion(exRig.house.getWorldQuaternion(qTmp));
      cam.up.set(0, 1, 0);
      cam.lookAt(e.add(dir));
      cam.fov = camCtl.fov;
      s.camInit = false;
    } else if (isExc && tg.cam === 2) {
      const p = exRig.house.localToWorld(new THREE.Vector3(5.2, 2.3, 2.4));
      const look = exRig.house.localToWorld(new THREE.Vector3(EX.BOOM.x, 0.6, 2.7));
      p.y = Math.max(p.y, heightAt(p.x, p.z) + 1);
      cam.position.lerp(p, s.camInit ? damp(6, dt) : 1);
      cam.up.set(0, 1, 0);
      cam.lookAt(look);
      cam.fov = 58;
      s.camInit = true;
    } else if (isExc) {
      const az = houseYaw + Math.PI + camCtl.yaw;
      const el = clamp(0.32 + camCtl.pitch, -0.1, 1.3);
      const d = camCtl.dist;
      const want = new THREE.Vector3(tgt.x + Math.sin(az) * Math.cos(el) * d, tgt.y + Math.sin(el) * d, tgt.z + Math.cos(az) * Math.cos(el) * d);
      want.y = Math.max(want.y, heightAt(want.x, want.z) + 0.9);
      if (!s.camInit) cam.position.copy(want);
      else cam.position.lerp(want, damp(4, dt));
      s.camInit = true;
      cam.up.set(0, 1, 0);
      cam.lookAt(tgt);
      cam.fov = 62;
    } else if (tg.cam === 1) {
      const e = rig.root.localToWorld(rig.eye.clone());
      cam.position.copy(e);
      const cy = camCtl.yaw;
      const cp = camCtl.pitch;
      const dir = new THREE.Vector3(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).applyQuaternion(rig.root.quaternion);
      cam.up.set(0, 1, 0).applyQuaternion(rig.root.quaternion);
      cam.lookAt(e.add(dir));
      cam.fov = camCtl.fov;
      s.camInit = false;
    } else if (tg.cam === 2) {
      const p = rig.root.localToWorld(new THREE.Vector3(0.6, 3.6, -0.4));
      const look = rig.root.localToWorld(new THREE.Vector3(0, 0.3, -4.2));
      cam.position.lerp(p, s.camInit ? damp(8, dt) : 1);
      cam.up.set(0, 1, 0);
      cam.lookAt(look);
      cam.fov = 62;
      s.camInit = true;
    } else {
      const az = tr.yaw + Math.PI + camCtl.yaw;
      const el = clamp(0.28 + camCtl.pitch, -0.1, 1.3);
      const d = camCtl.dist;
      const want = new THREE.Vector3(tgt.x + Math.sin(az) * Math.cos(el) * d, tgt.y + Math.sin(el) * d, tgt.z + Math.cos(az) * Math.cos(el) * d);
      want.y = Math.max(want.y, heightAt(want.x, want.z) + 0.9);
      if (!s.camInit) cam.position.copy(want);
      else cam.position.lerp(want, damp(5, dt));
      s.camInit = true;
      cam.up.set(0, 1, 0);
      cam.lookAt(tgt);
      cam.fov = 62;
    }
    cam.updateProjectionMatrix();

    // day / night
    s.night = lerp(s.night, tg.night ? 1 : 0, damp(1.2, dt));
    if (import.meta.env.DEV) (window as unknown as { __driver: unknown }).__driver = s;
    const n = s.night;
    if (sky.current) sky.current.visible = n < 0.75;
    const elev = lerp(0.62, -0.12, n);
    const sunDir = new THREE.Vector3(Math.cos(elev) * 0.82, Math.sin(elev), Math.cos(elev) * -0.57).normalize();
    const skyMat = sky.current?.material as THREE.ShaderMaterial | undefined;
    if (skyMat?.uniforms.sunPosition) skyMat.uniforms.sunPosition.value.copy(sunDir).multiplyScalar(100);
    if (sky.current) sky.current.position.copy(cam.position);
    if (stars.current) {
      stars.current.visible = n > 0.4;
      stars.current.position.copy(cam.position);
    }
    if (sun.current) {
      const L = sun.current;
      const moon = new THREE.Vector3(-0.4, 0.8, 0.3).normalize();
      const dir = n > 0.5 ? moon : sunDir;
      L.position.set(fx + dir.x * 80, tgt.y + dir.y * 80, fz + dir.z * 80);
      L.target.position.set(fx, tgt.y, fz);
      L.target.updateMatrixWorld();
      L.intensity = n > 0.5 ? lerp(0, 0.35, (n - 0.5) * 2) : lerp(2.5, 0, n * 2);
      L.color.set(n > 0.5 ? "#9fb4ff" : "#fff1dc");
    }
    if (hemi.current) hemi.current.intensity = lerp(0.5, 0.1, n);
    scene.environmentIntensity = lerp(0.55, 0.06, n);
    fog.color.set("#c4d4e0").lerp(new THREE.Color("#0b1220"), n);
    if (scene.background instanceof THREE.Color) scene.background.copy(fog.color);
    else scene.background = fog.color.clone();
    fog.near = lerp(140, 40, n);
    fog.far = lerp(900, 320, n);
    gl.toneMappingExposure = lerp(0.9, 0.9, n);
    for (const m of windowMats) m.emissiveIntensity = n * 1.6;
    for (const m of glassMats) m.emissiveIntensity = n * 1.4;
    for (const m of glowMats) m.emissiveIntensity = n * 0.75;

    // HUD at ~10 Hz
    s.hudT += dt;
    if (s.hudT > 0.1) {
      s.hudT = 0;
      useHud.setState({
        speed: Math.abs(isExc ? exc.v : isTruck ? truck.v : tr.v) * 3.6,
        rpm: isExc ? exc.rpm : isTruck ? truck.rpm : tr.rpm,
        lift: tr.lift,
        attached: imp.attached,
        working: imp.working,
        canAttach: sim.canAttach,
        attachDist: sim.attachDist,
        area: sim.tilledM2,
        surface: SURF_NAMES[tr.surface] ?? "",
        running: isExc ? exc.running : isTruck ? truck.running : tr.running,
        bed: truck.bed,
        cargo: truck.cargo,
        tipping: truck.tipping,
        tipped: truck.tippedM3,
        bucket: exc.bucketLoad / EX.CAP,
        dug: exc.dugM3,
        phase: exc.auto.on ? PHASE_NAMES[exc.auto.phase] : "",
        auto: exc.auto.on,
        inSoil: exc.inSoil,
      });
    }
    if (isExc)
      gameAudio.update({
        rpm: exc.rpm,
        load: exc.load,
        running: exc.running,
        working: Math.min(1, Math.max(exc.digging, exc.dumping * 0.8, exc.bladeWork)),
        speed: Math.abs(exc.v),
        rough: 0.7,
        hydraulic: exc.hyd > 0.08 ? (exc.j.boom.v >= 0 ? 1 : -1) : 0,
      });
    else if (isTruck)
      gameAudio.update({
        rpm: truck.rpm * 1.15,
        load: truck.load,
        running: truck.running,
        working: truck.tipping ? 0.6 : 0,
        speed: Math.abs(truck.v),
        rough: truck.surface === SURF.asphalt || truck.surface === SURF.concrete ? 0.2 : 0.8,
        hydraulic: truck.bedMoving,
      });
    else gameAudio.update({
      rpm: tr.rpm,
      load: tr.load,
      running: tr.running,
      working: imp.working ? Math.min(1, Math.abs(tr.v) / 2) : 0,
      speed: Math.abs(tr.v),
      rough: tr.surface === SURF.asphalt || tr.surface === SURF.concrete ? 0.2 : 1,
      hydraulic: tr.liftMoving ? Math.sign(tr.liftCmd) : 0,
    });

    if (!s.ready && REQUIRED.every((k) => loaded.has(k))) {
      s.ready = true;
      requestAnimationFrame(() => useHud.setState({ ready: true }));
    }
  });

  return (
    <>
      <primitive object={rig.root} />
      <primitive object={cult.root} />
      <primitive object={exRig.root} />
      <primitive object={tkRig.root} />
      <primitive object={exRig.clods} />
      <primitive object={parts.points} />
      <Sky ref={sky as never} distance={4000} turbidity={5} rayleigh={1.4} mieCoefficient={0.004} mieDirectionalG={0.86} sunPosition={[60, 60, 80]} />
      <Stars ref={stars as never} radius={500} depth={60} count={2500} factor={5} fade speed={0} />
      <hemisphereLight ref={hemi} args={["#dbe8ff", "#55613a", 0.85]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={3}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
    </>
  );
}

function World() {
  const quality = useToggles((s) => s.quality);
  const high = quality === "high";
  return (
    <>
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color="#fff6e6" />
        <Lightformer intensity={1.1} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[20, 3, 1]} color="#b8d4ff" />
        <Lightformer intensity={0.6} position={[6, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} color="#9fbf7a" />
      </Environment>
      <Suspense fallback={<TerrainPlaceholder />}>
        <Terrain />
        <Loaded name="terrain" />
      </Suspense>
      <Suspense fallback={null}>
        <Buildings />
        <Loaded name="buildings" />
      </Suspense>
      <Suspense fallback={null}>
        <Site />
      </Suspense>
      <Suspense fallback={null}>
        <Trees far={high} />
        <Grass count={high ? 30000 : 12000} tile={high ? 84 : 60} />
        <Wheat spacing={high ? 0.55 : 0.8} />
        <Loaded name="plants" />
      </Suspense>
      <Suspense fallback={null}>
        <Driver />
      </Suspense>
    </>
  );
}

export default function Game() {
  const wrap = useRef<HTMLDivElement>(null);
  const ready = useHud((s) => s.ready);
  const quality = useToggles((s) => s.quality);

  useEffect(() => bindKeyboard(), []);

  // camera drag / pinch / wheel on the 3D view
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const pd = () => {
      const a = [...pts.values()];
      return a.length > 1 ? Math.hypot(a[0]!.x - a[1]!.x, a[0]!.y - a[1]!.y) : 0;
    };
    const zoom = (f: number) => {
      if (useToggles.getState().cam === 1) camCtl.fov = clamp(camCtl.fov * f, 30, 95);
      else camCtl.dist = clamp(camCtl.dist * f, 4.5, 40);
    };
    const down = (e: PointerEvent) => {
      if (e.target !== el.querySelector("canvas")) return;
      gameAudio.unlock();
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) pinch = pd();
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      const cab = useToggles.getState().cam === 1;
      if (pts.size === 1) {
        camCtl.yaw = clamp(camCtl.yaw - dx * 0.006, -3.1, 3.1);
        camCtl.pitch = clamp(camCtl.pitch + (cab ? -dy : dy) * 0.004, cab ? -0.9 : -0.3, cab ? 0.9 : 1.0);
      } else if (pts.size === 2) {
        const d = pd();
        if (pinch > 0 && d > 0) zoom(pinch / d);
        pinch = d;
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      zoom(Math.exp(dy * 0.0015));
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, []);

  // dev-only hooks for automated checks
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const simulate = (seconds: number, inp: Partial<Parameters<typeof stepSim>[1]> = {}) => {
      const tg = useToggles.getState();
      const base = { throttle: 0, brake: 0, steer: 0, liftCmd: 0, dir: tg.dir, engineOn: tg.engine, attachPressed: false, ...inp };
      for (let t = 0; t < seconds; t += 1 / 60) {
        stepSim(sim, base, 1 / 60);
        base.attachPressed = false;
        sim.events.length = 0;
      }
      return { x: sim.tr.x, z: sim.tr.z, tilled: sim.tilledM2, attached: sim.imp.attached };
    };
    const simulateExc = (seconds: number, inp: Partial<ExInput> = {}) => {
      const tg = useToggles.getState();
      const base: ExInput = { ...NO_LEVERS, bladeDown: tg.bladeDown, engineOn: tg.excEngine, autoToggle: false, ...inp };
      for (let t = 0; t < seconds; t += 1 / 60) {
        stepExcavator(exc, base, 1 / 60, sim.tr);
        base.autoToggle = false;
        exc.events.length = 0;
      }
      return { x: exc.x, z: exc.z, dug: exc.dugM3, bucket: exc.bucketLoad, phase: exc.auto.phase, clods: exc.clods.length };
    };
    (window as unknown as { __game: unknown }).__game = { sim, exc, truck, dig: DIG, toggles: useToggles, hud: useHud, audio: gameAudio, input, camCtl, simulate, simulateExc };
  }, []);

  return (
    <div ref={wrap} className="game-root" data-scene-ready={ready ? "" : undefined}>
      <Canvas
        shadows
        dpr={quality === "high" ? [1, 1.75] : [1, 1.25]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 62, near: 0.1, far: 4500, position: [-70, 6, 12] }}
      >
        <World />
      </Canvas>
      <Hud />
    </div>
  );
}
