// Exhaust smoke and soil dust in one point cloud (one draw call).
import { useMemo } from "react";
import * as THREE from "three";

const N = 220;

export type Particles = {
  points: THREE.Points;
  emit: (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: THREE.Color, alpha: number) => void;
  update: (dt: number) => void;
};

export function useParticles(): Particles {
  return useMemo(() => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const data = new Float32Array(N * 2); // size, alpha
    const vel = new Float32Array(N * 3);
    const age = new Float32Array(N).fill(99);
    const life = new Float32Array(N).fill(1);
    const size0 = new Float32Array(N);
    const alpha0 = new Float32Array(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("sa", new THREE.BufferAttribute(data, 2));
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 600 } }]),
      vertexShader: `
        attribute vec2 sa; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uScale;
        #include <fog_pars_vertex>
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = sa.x * uScale / max(-mvPosition.z, 0.5);
          vC = color; vA = sa.y;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        #include <fog_pars_fragment>
        void main() {
          vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          gl_FragColor = vec4(vC, vA * (1.0 - r) * (1.0 - r));
          #include <fog_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    let next = 0;
    const emit: Particles["emit"] = (x, y, z, vx, vy, vz, l, size, c, a) => {
      const i = next;
      next = (next + 1) % N;
      pos.set([x, y, z], i * 3);
      vel.set([vx, vy, vz], i * 3);
      col.set([c.r, c.g, c.b], i * 3);
      age[i] = 0;
      life[i] = l;
      size0[i] = size;
      alpha0[i] = a;
    };
    const update = (dt: number) => {
      for (let i = 0; i < N; i++) {
        if (age[i]! >= life[i]!) {
          data[i * 2 + 1] = 0;
          continue;
        }
        age[i]! += dt;
        const k = age[i]! / life[i]!;
        pos[i * 3]! += vel[i * 3]! * dt;
        pos[i * 3 + 1]! += vel[i * 3 + 1]! * dt;
        pos[i * 3 + 2]! += vel[i * 3 + 2]! * dt;
        vel[i * 3 + 1]! *= Math.exp(-0.8 * dt);
        data[i * 2] = size0[i]! * (0.4 + k * 1.8);
        data[i * 2 + 1] = alpha0[i]! * (1 - k);
      }
      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (geo.attributes.sa as THREE.BufferAttribute).needsUpdate = true;
    };
    return { points, emit, update };
  }, []);
}
