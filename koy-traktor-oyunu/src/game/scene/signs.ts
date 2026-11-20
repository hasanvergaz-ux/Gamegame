// Canvas-drawn lettering: the "ÇAKIR HAFRİYAT" plates on every machine and building,
// the Turkish flag, licence plates and the Mercedes-Benz grille lettering.
import * as THREE from "three";

export const BRAND = { navy: "#10243d", yellow: "#f4b400", white: "#f6f4ee" };

/** Sign materials that glow a little at night (updated from the game loop). */
export const glowMats: THREE.MeshStandardMaterial[] = [];

/** Lit windows and lamp heads of the yard (glow at night). */
export const glassMats: THREE.MeshStandardMaterial[] = [];

const cache = new Map<string, THREE.CanvasTexture>();

export type PlateOpts = {
  bg?: string;
  fg?: string;
  border?: string | null;
  /** second line, drawn smaller under the first */
  sub?: string;
  subFg?: string;
  font?: string;
  radius?: number;
};

/** Texture of a lettered plate. `aspect` = width / height of the plane it will be put on. */
export function plateTexture(text: string, aspect: number, o: PlateOpts = {}) {
  const key = JSON.stringify([text, aspect, o]);
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 1024;
  const H = Math.max(64, Math.round(W / aspect));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const bg = o.bg ?? BRAND.navy;
  const fg = o.fg ?? BRAND.yellow;
  const r = o.radius ?? Math.min(H * 0.16, 40);
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(0, 0, W, H, r);
  g.fill();
  const border = o.border === undefined ? fg : o.border;
  if (border) {
    g.strokeStyle = border;
    g.lineWidth = Math.max(3, H * 0.035);
    g.beginPath();
    g.roundRect(H * 0.06, H * 0.06, W - H * 0.12, H - H * 0.12, Math.max(2, r * 0.6));
    g.stroke();
  }
  const family = o.font ?? "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
  const hasSub = !!o.sub;
  const mainH = hasSub ? H * 0.52 : H * 0.62;
  let px = mainH;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `900 ${px}px ${family}`;
  const maxW = W * 0.88;
  const mw = g.measureText(text).width;
  if (mw > maxW) {
    px *= maxW / mw;
    g.font = `900 ${px}px ${family}`;
  }
  g.fillStyle = fg;
  g.fillText(text, W / 2, hasSub ? H * 0.4 : H * 0.53);
  if (hasSub) {
    let sp = H * 0.2;
    g.font = `700 ${sp}px ${family}`;
    const sw = g.measureText(o.sub!).width;
    if (sw > maxW) {
      sp *= maxW / sw;
      g.font = `700 ${sp}px ${family}`;
    }
    g.fillStyle = o.subFg ?? fg;
    g.fillText(o.sub!, W / 2, H * 0.77);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

export type PlateMeshOpts = PlateOpts & { glow?: boolean; double?: boolean };

/** A lettered plane `w` x `h` metres, facing +Z. Rotate / place it on the surface it belongs to. */
export function makePlate(text: string, w: number, h: number, o: PlateMeshOpts = {}) {
  const map = plateTexture(text, w / h, o);
  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: 0.55,
    metalness: 0.05,
    transparent: true,
    side: o.double ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  if (o.glow) {
    mat.emissiveMap = map;
    mat.emissive = new THREE.Color("#ffffff");
    mat.emissiveIntensity = 0;
    glowMats.push(mat);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

/** The standard company plate on a machine's side panel. */
export const companyPlate = (w: number, h: number, o: PlateMeshOpts = {}) => makePlate("ÇAKIR HAFRİYAT", w, h, o);

let flagTex: THREE.CanvasTexture | null = null;
export function flagTexture() {
  if (flagTex) return flagTex;
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 400;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e30a17";
  g.fillRect(0, 0, 600, 400);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(225, 200, 100, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#e30a17";
  g.beginPath();
  g.arc(255, 200, 80, 0, Math.PI * 2);
  g.fill();
  // five-pointed star
  g.fillStyle = "#fff";
  g.beginPath();
  const cx = 335;
  const cy = 200;
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? 50 : 20;
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + 0.0;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  flagTex = new THREE.CanvasTexture(c);
  flagTex.colorSpace = THREE.SRGBColorSpace;
  flagTex.anisotropy = 4;
  return flagTex;
}

/** Turkish licence plate: white, black lettering, blue TR strip. */
export function licenseTexture(text: string) {
  const key = `lic:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 520;
  c.height = 110;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f7f2";
  g.beginPath();
  g.roundRect(0, 0, 520, 110, 10);
  g.fill();
  g.strokeStyle = "#111";
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(3, 3, 514, 104, 8);
  g.stroke();
  g.fillStyle = "#0a3aa8";
  g.fillRect(6, 6, 62, 98);
  g.fillStyle = "#fff";
  g.font = "700 30px Arial, sans-serif";
  g.textAlign = "center";
  g.fillText("TR", 37, 92);
  g.beginPath();
  g.arc(37, 36, 15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#0a3aa8";
  g.beginPath();
  g.arc(41, 36, 12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#111";
  g.font = "700 74px 'Arial Black', Arial, sans-serif";
  g.textBaseline = "middle";
  g.fillText(text, 295, 58);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/** Chrome bar lettering of the Mercedes-Benz grille. */
export function mbBarTexture() {
  const key = "mbbar";
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 96;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 96);
  grad.addColorStop(0, "#f2f4f5");
  grad.addColorStop(0.5, "#9ea6aa");
  grad.addColorStop(1, "#e4e8ea");
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 96);
  g.fillStyle = "#15181a";
  g.font = "700 62px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("M E R C E D E S - B E N Z", 512, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}
