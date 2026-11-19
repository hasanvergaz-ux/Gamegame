import { Environment, Lightformer, Sky, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { gameAudio } from "./audio/GameAudio";
import { bindKeyboard, camCtl, input, readAxes } from "./input";
import { REQUIRED, loaded, sim } from "./runtime";
import { Buildings, windowMats } from "./scene/Buildings";
import { useCultivatorRig } from "./scene/Cultivator";
import { useParticles } from "./scene/Particles";
import { Grass, Trees, Wheat } from "./scene/Plants";
import { Terrain, TerrainPlaceholder } from "./scene/Terrain";
import { useTractorRig } from "./scene/Tractor";
import { uTime, uploadMask } from "./scene/shared";
import { setMaxAnisotropy } from "./scene/textures";
import { IMPL } from "./sim/hitch";
import { clamp, damp, lerp } from "./sim/math";
import { resetSim, stepSim, toWorld } from "./sim/tractor";
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

function Driver() {
  const rig = useTractorRig(sim);
  const cult = useCultivatorRig();
  const parts = useParticles();
  const { scene, camera, gl } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sky = useRef<THREE.Mesh>(null);
  const stars = useRef<THREE.Points>(null);
  const st = useRef({ t: 0, night: 0, maskT: 0, hudT: 0, smokeAcc: 0, dustAcc: 0, ready: false, camInit: false, lx: 0, lz: 0 });
  const fog = useMemo(() => new THREE.Fog("#c4d4e0", 140, 900), []);

  useEffect(() => {
    scene.fog = fog;
    setMaxAnisotropy(gl.capabilities.getMaxAnisotropy());
    loaded.add("tractor");
    if (import.meta.env.DEV) Object.assign(window, { __three: { scene, camera, rig, cult } });
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, gl, camera, rig, cult]);

  useFrame((state, delta) => {
    const s = st.current;
    const dt = Math.min(delta, 0.05);
    s.t += dt;
    uTime.value = s.t;
    const tg = useToggles.getState();
    const ax = readAxes();

    if (input.resetPressed) {
      input.resetPressed = false;
      resetSim(sim);
      s.camInit = false;
    }
    stepSim(sim, { ...ax, dir: tg.dir, engineOn: tg.engine, attachPressed: input.attachPressed }, dt);
    input.attachPressed = false;
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
    if (Math.hypot(tr.x - s.lx, tr.z - s.lz) > 8) s.camInit = false; // teleported: snap the camera
    s.lx = tr.x;
    s.lz = tr.z;

    rig.update(sim, tg, s.t, dt);

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
    parts.update(dt);

    s.maskT += dt;
    if (s.maskT > 0.12) {
      s.maskT = 0;
      uploadMask();
    }

    // camera
    const cam = camera as THREE.PerspectiveCamera;
    const tgt = tmpV.set(tr.x, tr.y + 1.6, tr.z);
    if (tg.cam === 1) {
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
      L.position.set(tr.x + dir.x * 80, tr.y + dir.y * 80, tr.z + dir.z * 80);
      L.target.position.set(tr.x, tr.y, tr.z);
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

    // HUD at ~10 Hz
    s.hudT += dt;
    if (s.hudT > 0.1) {
      s.hudT = 0;
      useHud.setState({
        speed: Math.abs(tr.v) * 3.6,
        rpm: tr.rpm,
        lift: tr.lift,
        attached: imp.attached,
        working: imp.working,
        canAttach: sim.canAttach,
        attachDist: sim.attachDist,
        area: sim.tilledM2,
        surface: SURF_NAMES[tr.surface] ?? "",
        running: tr.running,
      });
    }
    gameAudio.update({
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
    (window as unknown as { __game: unknown }).__game = { sim, toggles: useToggles, hud: useHud, audio: gameAudio, input, simulate };
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
