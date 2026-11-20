// ÇAKIR HAFRİYAT İş Merkezi: fenced yard with the two-storey head office, the
// "Köy Çalışma Bürosu" (village work office), gate arch, flag, fuel tank, spoil heaps,
// bulletin board and yard lamps. Layout and colliders live in sim/world.ts.
import { use, useMemo } from "react";
import * as THREE from "three";
import {
  FLAGPOLE, FUEL_TANK, GATE, MAIN_OFFICE, SITE, SITE_FENCES, SITE_LAMPS, SITE_Y, SPOIL_HEAPS, VILLAGE_OFFICE,
} from "../sim/world";
import { boxM } from "./Buildings";
import { BRAND, companyPlate, flagTexture, glassMats, makePlate } from "./signs";
import { loadTex } from "./textures";

const Y = SITE_Y;

/** gable roof prism: ridge along X, `w` long, `d` deep */
function roofPrism(w: number, d: number, rise: number, o: number) {
  const sh = new THREE.Shape([new THREE.Vector2(-d / 2 - o, 0), new THREE.Vector2(d / 2 + o, 0), new THREE.Vector2(0, rise)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: w + o * 2, bevelEnabled: false });
  g.rotateY(-Math.PI / 2);
  g.translate((w + o * 2) / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

export function Site() {
  const plasterT = use(loadTex("o_painted_plaster_wall_diff.jpg", true));
  const plasterN = use(loadTex("o_painted_plaster_wall_nor.jpg", false));
  const metalT = use(loadTex("o_corrugated_iron_diff.jpg", true));
  const metalN = use(loadTex("o_corrugated_iron_nor.jpg", false));
  const stoneT = use(loadTex("o_rustic_stone_wall_diff.jpg", true));
  const woodT = use(loadTex("o_wood_planks_diff.jpg", true));
  const concT = use(loadTex("o_concrete_floor_02_diff.jpg", true));

  const group = useMemo(() => {
    const g = new THREE.Group();
    g.name = "site";
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const M = {
      plaster: std({ map: plasterT, normalMap: plasterN, color: "#efe9da", roughness: 0.95 }),
      cream: std({ map: plasterT, normalMap: plasterN, color: "#e8d9b0", roughness: 0.95 }),
      navy: std({ color: BRAND.navy, roughness: 0.55, metalness: 0.2 }),
      yellow: std({ color: BRAND.yellow, roughness: 0.5 }),
      fence: std({ map: metalT, normalMap: metalN, color: "#3d6a99", roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }),
      stone: std({ map: stoneT, roughness: 0.95 }),
      wood: std({ map: woodT, color: "#a07a52", roughness: 0.85 }),
      conc: std({ map: concT, color: "#8d9093", roughness: 0.9 }),
      roofFlat: std({ color: "#55595d", roughness: 0.9 }),
      tile: std({ color: "#a2472b", roughness: 0.8 }),
      dark: std({ color: "#26272a", roughness: 0.7, metalness: 0.3 }),
      steel: std({ color: "#9aa0a4", roughness: 0.4, metalness: 0.8 }),
      soil: std({ color: "#7d5d3c", roughness: 1 }),
      gravel: std({ color: "#8a8780", roughness: 1 }),
      glass: std({ color: "#1c2e3b", roughness: 0.06, metalness: 0.85, emissive: "#ffc46b", emissiveIntensity: 0 }),
      lamp: std({ color: "#444", emissive: "#fff0c8", emissiveIntensity: 0 }),
      tank: std({ color: "#e0a800", roughness: 0.45, metalness: 0.4 }),
      flag: std({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.8 }),
    };
    glassMats.push(M.glass, M.lamp);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = g, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = shadow;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const B = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

    // ---------- perimeter fence ----------
    for (const f of SITE_FENCES) {
      const L = Math.hypot(f.bx - f.ax, f.bz - f.az);
      const a = Math.atan2(f.bx - f.ax, f.bz - f.az);
      const mx = (f.ax + f.bx) / 2;
      const mz = (f.az + f.bz) / 2;
      const grp = new THREE.Group();
      grp.position.set(mx, Y, mz);
      grp.rotation.y = a;
      g.add(grp);
      add(boxM(0.08, 2.2, L, 2), M.fence, 0, 1.1, 0, grp);
      for (let i = 0; i <= L / 4; i++) add(B(0.14, 2.4, 0.14), M.dark, 0, 1.2, -L / 2 + Math.min(L, i * 4), grp);
      add(B(0.14, 2.4, 0.14), M.dark, 0, 1.2, L / 2, grp);
    }
    // company plates along the road-side fence
    for (const x of [(SITE.x0 + GATE.x0) / 2, (GATE.x1 + SITE.x1) / 2]) {
      const p = companyPlate(4.4, 0.85);
      p.position.set(x, Y + 1.25, SITE.z1 + 0.06);
      g.add(p);
    }

    // ---------- gate arch with the big sign ----------
    for (const x of [GATE.x0, GATE.x1]) add(B(0.5, 6.2, 0.5), M.navy, x, Y + 3.1, SITE.z1);
    add(B(GATE.x1 - GATE.x0 + 0.5, 0.5, 0.5), M.navy, (GATE.x0 + GATE.x1) / 2, Y + 6.05, SITE.z1);
    add(B(GATE.x1 - GATE.x0 + 0.5, 0.12, 0.54), M.yellow, (GATE.x0 + GATE.x1) / 2, Y + 5.74, SITE.z1);
    for (const side of [1, -1]) {
      const arch = makePlate("ÇAKIR HAFRİYAT", 10.8, 1.5, { sub: "İŞ MERKEZİ", glow: true });
      arch.position.set((GATE.x0 + GATE.x1) / 2, Y + 7.15, SITE.z1 + side * 0.07);
      arch.rotation.y = side > 0 ? 0 : Math.PI;
      g.add(arch);
    }
    add(B(10.8, 1.5, 0.12), M.navy, (GATE.x0 + GATE.x1) / 2, Y + 7.15, SITE.z1);
    for (const x of [GATE.x0 + 1, GATE.x1 - 1]) add(B(0.2, 1.3, 0.2), M.navy, x, Y + 6.6, SITE.z1);

    // ---------- main office (two floors, flat roof) ----------
    {
      const { x, z, w, d } = MAIN_OFFICE;
      const H = 6.4;
      const front = z + d / 2;
      add(boxM(w + 0.3, 0.6, d + 0.3, 2.5), M.stone, x, Y + 0.3, z);
      add(boxM(w, H, d, 2.4), M.plaster, x, Y + 0.6 + H / 2 - 0.3, z);
      add(boxM(w + 0.06, 0.5, d + 0.06, 2), M.navy, x, Y + 3.55, z);
      add(boxM(w + 0.5, 0.35, d + 0.5, 2), M.conc, x, Y + H + 0.45, z);
      add(B(w + 0.1, 0.5, d + 0.1), M.roofFlat, x, Y + H + 0.1, z, g, false);
      // windows: ground floor and first floor
      const win = (wx: number, wy: number, wz: number, ww: number, hh: number, ry: number) => {
        const grp = new THREE.Group();
        grp.position.set(wx, Y + wy, wz);
        grp.rotation.y = ry;
        g.add(grp);
        add(B(ww + 0.16, hh + 0.16, 0.05), M.steel, 0, 0, 0, grp, false);
        add(B(ww, hh, 0.07), M.glass, 0, 0, 0.012, grp, false);
        add(B(0.05, hh, 0.08), M.steel, 0, 0, 0.015, grp, false);
      };
      for (let i = 0; i < 6; i++) {
        const wx = x - w / 2 + 1.5 + i * ((w - 3) / 5);
        win(wx, 5.1, front + 0.02, 1.7, 1.45, 0);
        if (i !== 2 && i !== 3) win(wx, 2.0, front + 0.02, 1.7, 1.45, 0);
        win(wx, 5.1, z - d / 2 - 0.02, 1.7, 1.45, Math.PI);
        win(wx, 2.0, z - d / 2 - 0.02, 1.7, 1.45, Math.PI);
      }
      for (const s of [-1, 1]) for (const dz of [-1.6, 1.6]) for (const wy of [2.0, 5.1]) win(x + s * (w / 2 + 0.02), wy, z + dz, 1.5, 1.45, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      // double glass entrance door with canopy
      add(B(2.7, 2.5, 0.06), M.steel, x, Y + 1.55, front + 0.02, g, false);
      add(B(2.5, 2.3, 0.08), M.glass, x, Y + 1.55, front + 0.04, g, false);
      add(B(0.06, 2.3, 0.1), M.steel, x, Y + 1.55, front + 0.05, g, false);
      add(B(4.2, 0.16, 1.9), M.navy, x, Y + 3.0, front + 0.95);
      add(B(4.2, 0.05, 1.9), M.yellow, x, Y + 3.1, front + 0.95, g, false);
      for (const s of [-1, 1]) add(B(0.14, 3.0, 0.14), M.steel, x + s * 1.95, Y + 1.5, front + 1.8);
      add(boxM(4.6, 0.16, 2.2, 2), M.conc, x, Y + 0.08, front + 1.1);
      // roof-top sign board
      add(B(11.4, 2.0, 0.2), M.navy, x, Y + H + 1.55, front - 0.4);
      const sign = makePlate("ÇAKIR HAFRİYAT", 11, 1.7, { sub: "İŞ MERKEZİ", glow: true });
      sign.position.set(x, Y + H + 1.55, front - 0.28);
      g.add(sign);
      const back = makePlate("ÇAKIR HAFRİYAT", 11, 1.7, { sub: "İŞ MERKEZİ", glow: true });
      back.position.set(x, Y + H + 1.55, front - 0.52);
      back.rotation.y = Math.PI;
      g.add(back);
      for (const s of [-1, 1]) add(B(0.25, 1.2, 0.25), M.steel, x + s * 4.6, Y + H + 0.9, front - 0.4);
    }

    // ---------- village work office (single floor, tiled gable roof) ----------
    {
      const { x, z, w, d } = VILLAGE_OFFICE;
      const front = z + d / 2;
      add(boxM(w + 0.3, 0.5, d + 0.3, 2.5), M.stone, x, Y + 0.25, z);
      add(boxM(w, 3.0, d, 2.2), M.cream, x, Y + 2.0, z);
      const roof = add(roofPrism(w, d, 1.9, 0.6), M.tile, x, Y + 3.5, z);
      roof.name = "villageRoof";
      for (const s of [-1, 1]) {
        const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, 1.8)]);
        const gm = new THREE.ShapeGeometry(sh);
        gm.rotateY(s * (Math.PI / 2));
        add(gm, M.cream, x + s * (w / 2 + 0.01), Y + 3.5, z, g, false);
      }
      add(B(0.7, 1.9, 0.7), M.cream, x + 2.5, Y + 4.7, z - 1.2);
      // door + two windows
      add(B(1.2, 2.2, 0.08), M.wood, x, Y + 1.6, front + 0.03, g, false);
      const w2 = (wx: number) => {
        add(B(1.46, 1.26, 0.05), M.steel, wx, Y + 2.0, front + 0.02, g, false);
        add(B(1.3, 1.1, 0.07), M.glass, wx, Y + 2.0, front + 0.04, g, false);
        add(B(0.05, 1.1, 0.08), M.steel, wx, Y + 2.0, front + 0.05, g, false);
      };
      w2(x - 2.8);
      w2(x + 2.8);
      // porch
      add(B(3.2, 0.12, 1.5), M.wood, x, Y + 2.9, front + 0.75);
      for (const s of [-1, 1]) add(B(0.14, 2.9, 0.14), M.wood, x + s * 1.45, Y + 1.45, front + 1.4);
      add(boxM(3.6, 0.14, 1.8, 2), M.conc, x, Y + 0.07, front + 0.9);
      // lettering
      const sign = makePlate("KÖY ÇALIŞMA BÜROSU", 5.2, 1.05, { sub: "ÇAKIR HAFRİYAT", glow: true });
      sign.position.set(x, Y + 3.45, front + 0.9);
      sign.rotation.x = 0;
      g.add(sign);
      add(B(5.4, 1.2, 0.1), M.navy, x, Y + 3.45, front + 0.84, g, false);
      // bulletin board with legs
      const bx = x - 5.6;
      const bz = front + 2.4;
      add(B(2.0, 1.3, 0.08), M.wood, bx, Y + 1.7, bz);
      for (const s of [-1, 1]) add(B(0.1, 2.2, 0.1), M.wood, bx + s * 0.85, Y + 1.1, bz);
      const board = makePlate("İLAN PANOSU", 1.8, 0.4, { bg: BRAND.yellow, fg: BRAND.navy });
      board.position.set(bx, Y + 2.1, bz + 0.05);
      g.add(board);
      for (let i = 0; i < 4; i++) {
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ color: ["#f4f1e8", "#ffe9a8", "#d8ecff", "#f4f1e8"][i]!, roughness: 0.9 }));
        paper.position.set(bx - 0.65 + i * 0.44, Y + 1.5, bz + 0.05);
        g.add(paper);
      }
    }

    // ---------- flag ----------
    {
      const { x, z } = FLAGPOLE;
      add(new THREE.CylinderGeometry(0.05, 0.08, 9.5, 10), M.steel, x, Y + 4.75, z);
      add(new THREE.SphereGeometry(0.1, 10, 8), M.yellow, x, Y + 9.55, z, g, false);
      add(new THREE.PlaneGeometry(2.1, 1.4), M.flag, x + 1.1, Y + 8.6, z, g, false);
    }

    // ---------- fuel tank ----------
    {
      const { x, z } = FUEL_TANK;
      const tank = add(new THREE.CylinderGeometry(0.8, 0.8, 3.6, 24), M.tank, x, Y + 1.5, z);
      tank.rotation.x = Math.PI / 2;
      for (const dz of [-1.3, 1.3]) add(boxM(1.7, 0.6, 0.3, 1.5), M.conc, x, Y + 0.3, z + dz);
      const t = makePlate("MOTORİN", 1.6, 0.4, { bg: BRAND.navy, fg: BRAND.yellow });
      t.position.set(x - 0.82, Y + 1.5, z);
      t.rotation.y = -Math.PI / 2;
      g.add(t);
      const t2 = t.clone();
      t2.position.x = x + 0.82;
      t2.rotation.y = Math.PI / 2;
      g.add(t2);
    }

    // ---------- spoil heaps ----------
    SPOIL_HEAPS.forEach((h, i) => {
      const geo = new THREE.ConeGeometry(h.r, h.h, 22, 6);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) {
        const vx = p.getX(k);
        const vz = p.getZ(k);
        const f = 1 + 0.14 * Math.sin(vx * 1.9 + vz * 1.3) * Math.cos(vz * 1.7 - vx * 0.8);
        p.setXYZ(k, vx * f, p.getY(k), vz * f);
      }
      geo.computeVertexNormals();
      add(geo, i === 0 ? M.soil : M.gravel, h.x, Y + h.h / 2 - 0.05, h.z);
    });

    // ---------- yard lamps ----------
    for (const [lx, lz] of SITE_LAMPS) {
      add(new THREE.CylinderGeometry(0.07, 0.1, 7.2, 8), M.dark, lx, Y + 3.6, lz);
      add(B(0.9, 0.08, 0.14), M.dark, lx, Y + 7.15, lz + 0.25, g, false);
      add(B(0.7, 0.06, 0.3), M.lamp, lx, Y + 7.08, lz + 0.3, g, false);
    }

    return g;
  }, [plasterT, plasterN, metalT, metalN, stoneT, woodT, concT]);

  return <primitive object={group} />;
}
