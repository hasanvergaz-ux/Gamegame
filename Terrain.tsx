import { use, useMemo } from "react";
import * as THREE from "three";
import { MAP_SIZE, baseHeight } from "../sim/world";
import { GRID, getHeights, getMaskTexture } from "./shared";
import { TERRAIN_DIFF, TERRAIN_NOR, makeTerrainMaterial } from "./terrainMaterial";
import { loadArray, loadTex } from "./textures";

function innerGeometry() {
  const g = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, GRID, GRID);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const h = getHeights();
  for (let i = 0; i < p.count; i++) p.setY(i, h[i]!);
  g.computeVertexNormals();
  return g;
}

/** Hills and forest floor beyond the playable map; sunk under the inner terrain where they overlap. */
function outerGeometry() {
  const S = 2800;
  const N = 140;
  const g = new THREE.PlaneGeometry(S, S, N, N);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const half = MAP_SIZE / 2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const inside = Math.abs(x) < half - 1 && Math.abs(z) < half - 1;
    p.setY(i, baseHeight(x, z) - (inside ? 4 : 0.05));
  }
  g.computeVertexNormals();
  return g;
}

export function Terrain() {
  const diff = use(loadArray(TERRAIN_DIFF, 1024, true));
  const nor = use(loadArray(TERRAIN_NOR, 512, false));
  const { geo, outer, mat, outerMat } = useMemo(() => {
    const mat = makeTerrainMaterial(diff, nor, getMaskTexture());
    return { geo: innerGeometry(), outer: outerGeometry(), mat, outerMat: mat };
  }, [diff, nor]);
  return (
    <group>
      <mesh geometry={geo} material={mat} receiveShadow />
      <mesh geometry={outer} material={outerMat} receiveShadow />
    </group>
  );
}

/** Instant flat-color ground shown while the photo textures stream in. */
export function TerrainPlaceholder() {
  const geo = useMemo(innerGeometry, []);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#5f7a3a" roughness={1} />
    </mesh>
  );
}

export function useWallTex() {
  return use(loadTex("o_painted_plaster_wall_diff.jpg", true));
}
