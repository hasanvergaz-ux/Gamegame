import { useEffect, useRef } from "react";
import { exc, sim, truck } from "../runtime";
import { SITE } from "../sim/world";
import { mask } from "../scene/shared";
import { DIG } from "../sim/dig";
import { useToggles } from "../store";
import { BARN, FIELDS, HOUSES, MAP_SIZE, MOSQUE, PITS, ROAD_PTS, TRACKS, YARD } from "../sim/world";

const S = 180;
const R = 90; // minimap radius in pixels
const SPAN = 260; // meters shown edge to edge

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const bg = document.createElement("canvas");
    const BG = 512;
    bg.width = bg.height = BG;
    const g = bg.getContext("2d")!;
    const k = BG / MAP_SIZE;
    const X = (x: number) => (x + MAP_SIZE / 2) * k;
    g.fillStyle = "#56703a";
    g.fillRect(0, 0, BG, BG);
    for (const f of FIELDS) {
      g.fillStyle = f.kind === 1 ? "#c9a64b" : "#a59b6a";
      g.fillRect(X(f.x0), X(f.z0), (f.x1 - f.x0) * k, (f.z1 - f.z0) * k);
    }
    g.fillStyle = "#b8b4aa";
    g.fillRect(X(YARD.x0), X(YARD.z0), (YARD.x1 - YARD.x0) * k, (YARD.z1 - YARD.z0) * k);
    for (const p of PITS) {
      g.fillStyle = "#5a4630";
      g.beginPath();
      g.arc(X(p.x), X(p.z), p.r * k * 0.8, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#8b6e4c";
    g.lineWidth = 3 * k;
    for (const t of TRACKS) {
      g.beginPath();
      t.forEach(([x, z], i) => (i ? g.lineTo(X(x), X(z)) : g.moveTo(X(x), X(z))));
      g.stroke();
    }
    g.strokeStyle = "#3a3a3c";
    g.lineWidth = 7 * k;
    g.beginPath();
    ROAD_PTS.forEach(([x, z], i) => (i ? g.lineTo(X(x), X(z)) : g.moveTo(X(x), X(z))));
    g.stroke();
    g.fillStyle = "#b5462e";
    for (const h of HOUSES) {
      g.save();
      g.translate(X(h.x), X(h.z));
      g.rotate(-h.rot);
      g.fillRect((-h.w / 2) * k, (-h.d / 2) * k, h.w * k, h.d * k);
      g.restore();
    }
    g.fillStyle = "#7d5b3e";
    g.fillRect(X(BARN.x - BARN.w / 2), X(BARN.z - BARN.d / 2), BARN.w * k, BARN.d * k);
    g.fillStyle = "#e8e2d4";
    g.fillRect(X(MOSQUE.x - 5), X(MOSQUE.z - 5), 10 * k, 10 * k);

    // cultivated overlay, refreshed from the soil mask
    const ov = document.createElement("canvas");
    ov.width = ov.height = 256;
    const og = ov.getContext("2d")!;
    const img = og.createImageData(256, 256);
    const step = mask.n / 256;
    const cv = ref.current!;
    const c = cv.getContext("2d")!;
    let last = -1;
    let lastDig = -1;
    let frame = 0;
    const dstep = DIG.n / 256;
    const id = setInterval(() => {
      frame++;
      if ((mask.tilledCells !== last || DIG.version !== lastDig) && frame % 4 === 0) {
        last = mask.tilledCells;
        lastDig = DIG.version;
        for (let y = 0; y < 256; y++)
          for (let x = 0; x < 256; x++) {
            const v = mask.data[(Math.floor(y * step) * mask.n + Math.floor(x * step)) * 4]!;
            const d = DIG.data[Math.floor((y + 0.5) * dstep) * DIG.n + Math.floor((x + 0.5) * dstep)]!;
            const i = (y * 256 + x) * 4;
            const hole = d < -0.12;
            const pile = d > 0.12;
            img.data[i] = hole ? 38 : pile ? 150 : 70;
            img.data[i + 1] = hole ? 24 : pile ? 112 : 44;
            img.data[i + 2] = hole ? 14 : pile ? 72 : 26;
            img.data[i + 3] = v > 100 || hole || pile ? 255 : 0;
          }
        og.putImageData(img, 0, 0);
      }
      const { imp } = sim;
      const veh = useToggles.getState().vehicle;
      const all = {
        tractor: { x: sim.tr.x, z: sim.tr.z, yaw: sim.tr.yaw, color: "#f0ae1c", w: 6, l: 8 },
        excavator: { x: exc.x, z: exc.z, yaw: exc.yaw, color: "#4fb34a", w: 5, l: 7 },
        truck: { x: truck.x + Math.sin(truck.yaw) * 2.5, z: truck.z + Math.cos(truck.yaw) * 2.5, yaw: truck.yaw, color: "#2f6fdf", w: 6, l: 13 },
      };
      const tr = all[veh];
      const sc = S / SPAN;
      c.clearRect(0, 0, S, S);
      c.save();
      c.beginPath();
      c.arc(R, R, R - 2, 0, Math.PI * 2);
      c.clip();
      c.translate(R, R);
      c.rotate(Math.PI + tr.yaw); // heading up
      c.scale(sc, sc);
      c.translate(-tr.x, -tr.z);
      c.imageSmoothingEnabled = true;
      c.drawImage(bg, -MAP_SIZE / 2, -MAP_SIZE / 2, MAP_SIZE, MAP_SIZE);
      c.drawImage(ov, -MAP_SIZE / 2, -MAP_SIZE / 2, MAP_SIZE, MAP_SIZE);
      // Çakır Hafriyat yard
      c.fillStyle = "rgba(16,36,61,0.55)";
      c.fillRect(SITE.x0, SITE.z0, SITE.x1 - SITE.x0, SITE.z1 - SITE.z0);
      c.strokeStyle = "#f4b400";
      c.lineWidth = 2.2 / sc;
      c.strokeRect(SITE.x0, SITE.z0, SITE.x1 - SITE.x0, SITE.z1 - SITE.z0);
      if (!sim.imp.attached) {
        c.fillStyle = "#ff5a2a";
        c.beginPath();
        c.arc(sim.imp.x, sim.imp.z, 3.2, 0, Math.PI * 2);
        c.fill();
      }
      // the parked vehicles
      for (const k of ["tractor", "excavator", "truck"] as const) {
        if (k === veh) continue;
        const o = all[k];
        c.save();
        c.translate(o.x, o.z);
        c.rotate(-o.yaw);
        c.fillStyle = o.color;
        c.strokeStyle = "#1a1a1a";
        c.lineWidth = 1.2 / sc;
        c.fillRect(-o.w / 2, -o.l / 2, o.w, o.l);
        c.strokeRect(-o.w / 2, -o.l / 2, o.w, o.l);
        c.restore();
      }
      c.restore();
      // your vehicle
      c.fillStyle = "#ffd23a";
      c.strokeStyle = "#1a1a1a";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(R, R - 9);
      c.lineTo(R + 6, R + 7);
      c.lineTo(R, R + 3);
      c.lineTo(R - 6, R + 7);
      c.closePath();
      c.fill();
      c.stroke();
    }, 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hud-minimap">
      <canvas ref={ref} width={S} height={S} />
    </div>
  );
}
