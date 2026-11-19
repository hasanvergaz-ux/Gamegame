// Wild grass around the camera, the standing wheat crop, and trees.
import { useFrame } from "@react-three/fiber";
import { use, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { mulberry32 } from "../sim/math";
import { FIELDS, MAP_SIZE, TREES, heightAt, type TreeKind } from "../sim/world";
import { CELL, GRID, getDensityTexture, getHeightTexture, getMaskTexture, uTime } from "./shared";
import { loadCard, loadTex } from "./textures";

/** Two crossed quads, base at y=0, normals pointing up (soft, natural shading). */
function crossCard(w: number, h: number) {
  const a = new THREE.PlaneGeometry(w, h);
  a.translate(0, h / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  const g = mergeGeometries([a, b])!;
  const n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

/** Foliage keeps its soft "up/outward" normal on both faces instead of going black on the back. */
const FOLIAGE_NORMAL = "float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 nonPerturbedNormal = normal;";

const MASK_UV = `vec2 maskUv(vec2 p) { return p / ${MAP_SIZE.toFixed(1)} + 0.5; }`;

export function Grass({ count, tile }: { count: number; tile: number }) {
  const map = use(loadCard("c_grass.png"));
  const center = useRef(new THREE.Vector2());
  const { geo, mat } = useMemo(() => {
    const base = crossCard(1.1, 0.75);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes = base.attributes;
    const r = mulberry32(7);
    const off = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      off[i * 3] = r();
      off[i * 3 + 1] = r();
      off[i * 3 + 2] = r();
    }
    geo.setAttribute("aOff", new THREE.InstancedBufferAttribute(off, 3));
    geo.instanceCount = count;
    const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9, alphaToCoverage: true });
    const uniforms = {
      uCenter: { value: center.current },
      uTile: { value: tile },
      uTime,
      uHeight: { value: getHeightTexture() },
      uDensity: { value: getDensityTexture() },
      uMask: { value: getMaskTexture() },
    };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
attribute vec3 aOff;
uniform vec2 uCenter; uniform float uTile; uniform float uTime;
uniform sampler2D uHeight; uniform sampler2D uDensity; uniform sampler2D uMask;
varying float vTint;
${MASK_UV}
float hAt(vec2 p) {
  vec2 g = (p + ${(MAP_SIZE / 2).toFixed(1)}) / ${CELL.toFixed(4)};
  vec2 i = floor(g); vec2 f = g - i;
  ivec2 ii = ivec2(clamp(i, vec2(0.0), vec2(${GRID - 1}.0)));
  float a = texelFetch(uHeight, ii, 0).r; float b = texelFetch(uHeight, ii + ivec2(1, 0), 0).r;
  float c = texelFetch(uHeight, ii + ivec2(0, 1), 0).r; float d = texelFetch(uHeight, ii + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`,
        )
        .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
        .replace(
          "#include <begin_vertex>",
          `vec2 base = uCenter - uTile * 0.5;
vec2 wp = base + mod(aOff.xy * uTile - base, uTile);
float dn = texture(uDensity, maskUv(wp)).r;
vec4 mk = texture(uMask, maskUv(wp));
float dc = length(wp - uCenter) / (uTile * 0.5);
float keep = step(aOff.z, dn * 0.98) * (1.0 - smoothstep(0.25, 0.45, mk.r)) * (1.0 - smoothstep(0.72, 1.0, dc));
float rnd = fract(aOff.z * 91.7);
float sc = (0.55 + rnd * 0.8) * keep;
float ang = aOff.z * 43.0;
float cs = cos(ang); float sn = sin(ang);
vec3 p = position;
p = vec3(p.x * cs - p.z * sn, p.y * (0.7 + fract(aOff.z * 7.3) * 0.7) * (1.0 - 0.6 * mk.g), p.x * sn + p.z * cs) * sc;
float wind = sin(uTime * 1.6 + wp.x * 0.35 + wp.y * 0.21) + 0.5 * sin(uTime * 2.7 + wp.x * 0.9);
p.xz += vec2(0.07, 0.05) * wind * position.y * sc;
vec3 transformed = vec3(wp.x, hAt(wp) - 0.04, wp.y) + p;
vTint = rnd;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <normal_fragment_begin>", FOLIAGE_NORMAL)
        .replace("#include <common>", "#include <common>\nvarying float vTint;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
diffuseColor.rgb *= mix(0.4, 1.0, smoothstep(0.0, 0.65, vMapUv.y)) * mix(vec3(0.85, 0.95, 0.75), vec3(1.05, 1.0, 0.85), vTint);`,
        );
    };
    mat.customProgramCacheKey = () => "grass-v1";
    return { geo, mat };
  }, [map, count, tile]);
  useFrame(({ camera }) => {
    center.current.set(camera.position.x, camera.position.z);
  });
  return <mesh geometry={geo} material={mat} frustumCulled={false} receiveShadow />;
}

export function Wheat({ spacing }: { spacing: number }) {
  const map = use(loadCard("c_wheat.png"));
  const { geo, mat } = useMemo(() => {
    const f = FIELDS.find((x) => x.kind === 1)!;
    const base = crossCard(0.95, 1.05);
    const r = mulberry32(99);
    const pts: number[] = [];
    for (let x = f.x0 + 0.6; x < f.x1 - 0.4; x += spacing)
      for (let z = f.z0 + 0.6; z < f.z1 - 0.4; z += spacing) {
        const px = x + (r() - 0.5) * spacing * 0.8;
        const pz = z + (r() - 0.5) * spacing * 0.8;
        pts.push(px, heightAt(px, pz) - 0.05, pz, r());
      }
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes = base.attributes;
    geo.setAttribute("aPos", new THREE.InstancedBufferAttribute(new Float32Array(pts), 4));
    geo.instanceCount = pts.length / 4;
    const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, alphaToCoverage: true });
    const uniforms = { uTime, uMask: { value: getMaskTexture() } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>\nattribute vec4 aPos; uniform float uTime; uniform sampler2D uMask; varying float vTint;\n${MASK_UV}`)
        .replace("#include <beginnormal_vertex>", "vec3 objectNormal = vec3(0.0, 1.0, 0.0);")
        .replace(
          "#include <begin_vertex>",
          `vec4 mk = texture(uMask, maskUv(aPos.xz));
float keep = 1.0 - smoothstep(0.25, 0.45, mk.r);
float ang = aPos.w * 40.0; float cs = cos(ang); float sn = sin(ang);
vec3 p = position;
p = vec3(p.x * cs - p.z * sn, p.y * (0.85 + aPos.w * 0.3) * (1.0 - 0.75 * mk.g), p.x * sn + p.z * cs) * keep;
float wind = sin(uTime * 1.3 + aPos.x * 0.15 + aPos.z * 0.1) * 0.7 + sin(uTime * 2.9 + aPos.x * 0.6) * 0.3;
p.xz += vec2(0.12, 0.06) * wind * position.y * position.y;
vec3 transformed = aPos.xyz + p;
vTint = aPos.w;`,
        );
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <normal_fragment_begin>", FOLIAGE_NORMAL)
        .replace("#include <common>", "#include <common>\nvarying float vTint;")
        .replace(
          "#include <map_fragment>",
          "#include <map_fragment>\ndiffuseColor.rgb *= mix(0.35, 1.0, smoothstep(0.0, 0.7, vMapUv.y)) * mix(0.85, 1.1, vTint);",
        );
    };
    mat.customProgramCacheKey = () => "wheat-v1";
    return { geo, mat };
  }, [map, spacing]);
  return <mesh geometry={geo} material={mat} frustumCulled={false} receiveShadow />;
}

// ---------------- trees ----------------
type TreeSpec = { trunkH: number; trunkR: number; crownY: number; rx: number; ry: number; cards: number; card: number; branches: number; leaves: "a" | "b" };
const SPECS: Record<TreeKind, TreeSpec> = {
  walnut: { trunkH: 3.4, trunkR: 0.32, crownY: 6.6, rx: 4.3, ry: 3.2, cards: 95, card: 2.5, branches: 6, leaves: "a" },
  oak: { trunkH: 2.9, trunkR: 0.36, crownY: 5.8, rx: 3.8, ry: 3.0, cards: 85, card: 2.3, branches: 6, leaves: "b" },
  poplar: { trunkH: 12, trunkR: 0.26, crownY: 8.8, rx: 1.7, ry: 6.6, cards: 75, card: 1.7, branches: 0, leaves: "b" },
  fruit: { trunkH: 1.5, trunkR: 0.14, crownY: 3.0, rx: 2.1, ry: 1.6, cards: 42, card: 1.4, branches: 4, leaves: "a" },
  forest: { trunkH: 3.5, trunkR: 0.3, crownY: 6.8, rx: 3.6, ry: 4.0, cards: 34, card: 3.4, branches: 0, leaves: "b" },
};

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, segs = 7) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, segs, 1, true);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * len * 0.6);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  return g;
}

function buildTree(spec: TreeSpec, seed: number) {
  const r = mulberry32(seed);
  const trunk: THREE.BufferGeometry[] = [];
  const top = new THREE.Vector3((r() - 0.5) * 0.3, spec.trunkH + (spec.branches === 0 ? spec.ry * 0.8 : 0.6), (r() - 0.5) * 0.3);
  trunk.push(cylinderBetween(new THREE.Vector3(0, -0.3, 0), top, spec.trunkR, spec.trunkR * 0.45, 8));
  const crown = new THREE.Vector3(0, spec.crownY, 0);
  for (let i = 0; i < spec.branches; i++) {
    const a = (i / spec.branches) * Math.PI * 2 + r() * 0.6;
    const y0 = spec.trunkH * (0.75 + r() * 0.3);
    const start = new THREE.Vector3(0, y0, 0);
    const end = new THREE.Vector3(Math.cos(a) * spec.rx * 0.7, spec.crownY + (r() - 0.3) * spec.ry * 0.6, Math.sin(a) * spec.rx * 0.7);
    trunk.push(cylinderBetween(start, end, spec.trunkR * 0.5, spec.trunkR * 0.15, 5));
  }
  const cards: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < spec.cards; i++) {
    // points biased to the crown surface so the silhouette reads full
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const rad = 0.55 + 0.45 * Math.sqrt(r());
    const s = Math.sqrt(1 - u * u);
    const p = new THREE.Vector3(Math.cos(th) * s * spec.rx * rad, u * spec.ry * rad, Math.sin(th) * s * spec.rx * rad).add(crown);
    const g = new THREE.PlaneGeometry(spec.card, spec.card);
    e.set(r() * Math.PI, r() * Math.PI * 2, r() * Math.PI);
    q.setFromEuler(e);
    m.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.8 + r() * 0.4));
    g.applyMatrix4(m);
    // spherical normals: light wraps around the whole crown like a real canopy
    const n = g.attributes.normal as THREE.BufferAttribute;
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let k = 0; k < n.count; k++) {
      v.fromBufferAttribute(pos, k).sub(crown);
      v.y *= spec.rx / spec.ry;
      v.normalize().lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize();
      n.setXYZ(k, v.x, v.y, v.z);
    }
    cards.push(g);
  }
  return { trunk: mergeGeometries(trunk)!, leaves: mergeGeometries(cards)! };
}

function leafMaterial(map: THREE.Texture) {
  const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75, alphaToCoverage: true });
  mat.emissive = new THREE.Color(0x0d1a05);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.fragmentShader = sh.fragmentShader.replace("#include <normal_fragment_begin>", FOLIAGE_NORMAL);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `vec3 transformed = position;
#ifdef USE_INSTANCING
float ph = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17;
#else
float ph = 0.0;
#endif
float sway = sin(uTime * 1.2 + ph + position.y * 0.3) * 0.6 + sin(uTime * 3.1 + ph * 2.0 + position.x) * 0.25;
transformed.xz += vec2(0.06, 0.04) * sway * max(position.y - 2.0, 0.0) * 0.25;`,
      );
  };
  mat.customProgramCacheKey = () => "leaf-v1";
  return mat;
}

export function Trees({ far }: { far: boolean }) {
  const la = use(loadCard("c_leaves_a.png"));
  const lb = use(loadCard("c_leaves_b.png"));
  const bark = use(loadTex("o_bark_brown_02_diff.jpg", true));
  const barkN = use(loadTex("o_bark_brown_02_nor.jpg", false));
  const groups = useMemo(() => {
    const barkMat = new THREE.MeshStandardMaterial({ map: bark, normalMap: barkN, roughness: 0.95 });
    const mats = { a: leafMaterial(la), b: leafMaterial(lb) };
    const kinds = Object.keys(SPECS) as TreeKind[];
    return kinds
      .map((kind) => {
        const list = TREES.filter((t) => t.kind === kind && (far || Math.hypot(t.x, t.z) < 330));
        if (!list.length) return null;
        const spec = SPECS[kind];
        const { trunk, leaves } = buildTree(spec, kind.length * 31);
        const tm = new THREE.InstancedMesh(trunk, barkMat, list.length);
        const lm = new THREE.InstancedMesh(leaves, mats[spec.leaves], list.length);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const col = new THREE.Color();
        const r = mulberry32(kind.length * 7);
        list.forEach((t, i) => {
          q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
          m.compose(new THREE.Vector3(t.x, heightAt(t.x, t.z), t.z), q, new THREE.Vector3(t.s, t.s * (0.9 + r() * 0.2), t.s));
          tm.setMatrixAt(i, m);
          lm.setMatrixAt(i, m);
          const k = 0.8 + r() * 0.35;
          col.setRGB(k * (0.9 + r() * 0.15), k, k * (0.8 + r() * 0.2), THREE.LinearSRGBColorSpace);
          lm.setColorAt(i, col);
        });
        tm.castShadow = lm.castShadow = kind !== "forest";
        tm.receiveShadow = lm.receiveShadow = true;
        tm.computeBoundingSphere();
        lm.computeBoundingSphere();
        return { kind, tm, lm };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [la, lb, bark, barkN, far]);
  return (
    <group>
      {groups.map((g) => (
        <group key={g.kind}>
          <primitive object={g.tm} />
          <primitive object={g.lm} />
        </group>
      ))}
    </group>
  );
}
