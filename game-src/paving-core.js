// ===================== PAVING SILOS (GRAVEL & ASPHALT) + LIVE ROAD SURFACE LAYERS =====================
var PV_SILOS = [
    {
      id: `gravel`,
      mat: `gravel`,
      name: `Çakıl Silosu`,
      sub: `AGREGA & ÇAKIL`,
      x: -120.0,
      z: -36.0,
      pad: { x0: -128.0, z0: -45.0, x1: -112.0, z1: -17.0 },
      bayR: 4.3,
    },
    {
      id: `asphalt`,
      mat: `asphalt`,
      name: `Asfalt Silosu`,
      sub: `SICAK ASFALT 160°C`,
      x: 86.0,
      z: -36.0,
      pad: { x0: 78.0, z0: -45.0, x1: 94.0, z1: -2.5 },
      bayR: 4.3,
    },
  ],
  PV_STATE = {
    nearSilo: null,
    filling: null,
    autoFill: !0,
    gravelDumpedM3: 0,
    asphaltDumpedM3: 0,
    gravelSpreadM2: 0,
    gravelCompM2: 0,
    asphaltPavedM2: 0,
    asphaltCompM2: 0,
    zones: [],
    zoneCheckT: 0,
    chuteOpen: { gravel: 0, asphalt: 0 },
  };

function pvInSiloPad(x, z) {
  for (let s of PV_SILOS) {
    if (x > s.pad.x0 && x < s.pad.x1 && z > s.pad.z0 && z < s.pad.z1) return !0;
  }
  return !1;
}

function pvNoTree(x, z) {
  for (let s of PV_SILOS) {
    if (x > s.pad.x0 - 6 && x < s.pad.x1 + 9 && z > s.pad.z0 - 6 && z < s.pad.z1 + 5) return !0;
  }
  return !1;
}

function pvInitColliders() {
  for (let s of PV_SILOS) {
    QC.push({
      x: (s.pad.x0 + s.pad.x1) / 2,
      z: (s.pad.z0 + s.pad.z1) / 2,
      hx: (s.pad.x1 - s.pad.x0) / 2 + 5,
      hz: (s.pad.z1 - s.pad.z0) / 2 + 5,
      rot: 0,
    });
    // 4 heavy portal piers straddling the 5.6m drive-through bay (left/right at +-3.25m)
    for (let sx of [-3.25, 3.25]) {
      for (let sz of [-2.4, 2.4]) {
        uw.push({ k: `c`, x: s.x + sx, z: s.z + sz, r: 0.42 });
      }
    }
    // Side equipment (stockpile/conveyor on gravel; dryer drum on asphalt) kept clear of drive-through lane
    if (s.id === `gravel`) {
      fw(s.x - 6.8, s.z - 0.5, 4.2, 5.4, 0);
    } else {
      fw(s.x + 7.2, s.z - 0.5, 4.8, 6.2, 0);
    }
  }
}
pvInitColliders();

// Live 1024x1024 road-construction surface map:
//   R = Crushed Gravel (Çakıl) 0..255
//   G = Hot/Finished Asphalt (Asfalt) 0..255
//   B = Compaction Density (Silindir) 0..255
//   A = 255
// stage bitflags: 2=gravel, 4=gravelCompacted, 8=asphalt, 16=asphaltCompacted
class PvRoadSurf {
  constructor(n = 1024) {
    this.n = n;
    this.cell = 600 / n;
    this.cellArea = this.cell * this.cell;
    this.data = new Uint8Array(n * n * 4);
    this.stage = new Uint8Array(n * n);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;
    this.rowMin = new Int32Array(n).fill(-1);
    this.rowMax = new Int32Array(n).fill(-1);
    this.anyDirty = !1;
    this.version = 0;
  }
  toCell(w) {
    return Math.floor((w + 300) / this.cell);
  }
  mark(r, c) {
    let mn = this.rowMin[r];
    if (mn < 0 || c < mn) this.rowMin[r] = c;
    if (c > this.rowMax[r]) this.rowMax[r] = c;
    this.anyDirty = !0;
  }
  sampleAt(wx, wz) {
    let cx = this.toCell(wx),
      cz = this.toCell(wz);
    if (cx < 0 || cz < 0 || cx >= this.n || cz >= this.n) {
      return { gravel: 0, asphalt: 0, comp: 0, stage: 0 };
    }
    let si = cz * this.n + cx,
      off = si * 4;
    return {
      gravel: this.data[off] / 255,
      asphalt: this.data[off + 1] / 255,
      comp: this.data[off + 2] / 255,
      stage: this.stage[si],
    };
  }
  paintGravel(x0, z0, x1, z1, rad, val = 235, canFn = null) {
    let n = this.n,
      c0 = Math.max(0, this.toCell(Math.min(x0, x1) - rad)),
      c1 = Math.min(n - 1, this.toCell(Math.max(x0, x1) + rad)),
      r0 = Math.max(0, this.toCell(Math.min(z0, z1) - rad)),
      r1 = Math.min(n - 1, this.toCell(Math.max(z0, z1) + rad)),
      dx = x1 - x0,
      dz = z1 - z0,
      len2 = dx * dx + dz * dz || 1e-6,
      r2 = rad * rad,
      added = 0;
    for (let r = r0; r <= r1; r++) {
      let wz = (r + 0.5) * this.cell - 300;
      for (let c = c0; c <= c1; c++) {
        let wx = (c + 0.5) * this.cell - 300,
          t = ((wx - x0) * dx + (wz - z0) * dz) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let ox = wx - x0 - dx * t,
          oz = wz - z0 - dz * t;
        if (ox * ox + oz * oz > r2 || (canFn && !canFn(wx, wz))) continue;
        let si = r * n + c,
          off = si * 4;
        // Don't overwrite laid asphalt with gravel
        if (this.stage[si] & 8) continue;
        if (this.data[off] < val) {
          this.data[off] = val;
          // Fresh loose gravel needs compaction unless compacted already
          if (!(this.stage[si] & 4)) this.data[off + 2] = Math.min(this.data[off + 2], 45);
          if (!(this.stage[si] & 2)) {
            this.stage[si] |= 2;
            added++;
            PV_STATE.gravelSpreadM2 += this.cellArea;
          }
          this.mark(r, c);
        }
      }
    }
    if (added) this.version++;
    return added;
  }
  paintAsphalt(x0, z0, x1, z1, rad, compVal = 65, canFn = null) {
    let n = this.n,
      c0 = Math.max(0, this.toCell(Math.min(x0, x1) - rad)),
      c1 = Math.min(n - 1, this.toCell(Math.max(x0, x1) + rad)),
      r0 = Math.max(0, this.toCell(Math.min(z0, z1) - rad)),
      r1 = Math.min(n - 1, this.toCell(Math.max(z0, z1) + rad)),
      dx = x1 - x0,
      dz = z1 - z0,
      len2 = dx * dx + dz * dz || 1e-6,
      r2 = rad * rad,
      added = 0;
    for (let r = r0; r <= r1; r++) {
      let wz = (r + 0.5) * this.cell - 300;
      for (let c = c0; c <= c1; c++) {
        let wx = (c + 0.5) * this.cell - 300,
          t = ((wx - x0) * dx + (wz - z0) * dz) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let ox = wx - x0 - dx * t,
          oz = wz - z0 - dz * t;
        if (ox * ox + oz * oz > r2 || (canFn && !canFn(wx, wz))) continue;
        let si = r * n + c,
          off = si * 4,
          wasAsp = (this.stage[si] & 8) !== 0;
        if (!wasAsp || this.data[off + 1] < 245) {
          this.data[off + 1] = 248;
          // Newly poured hot-mix asphalt resets compaction B to matte uncompacted state until rolled
          if (!wasAsp) {
            this.data[off + 2] = compVal;
            this.stage[si] |= 8;
            PV_STATE.asphaltPavedM2 += this.cellArea;
          }
          added++;
          this.mark(r, c);
        }
      }
    }
    if (added) this.version++;
    return added;
  }
  compactPass(x0, z0, x1, z1, rad, deltaByte) {
    let n = this.n,
      c0 = Math.max(0, this.toCell(Math.min(x0, x1) - rad)),
      c1 = Math.min(n - 1, this.toCell(Math.max(x0, x1) + rad)),
      r0 = Math.max(0, this.toCell(Math.min(z0, z1) - rad)),
      r1 = Math.min(n - 1, this.toCell(Math.max(z0, z1) + rad)),
      dx = x1 - x0,
      dz = z1 - z0,
      len2 = dx * dx + dz * dz || 1e-6,
      r2 = rad * rad,
      gravelWork = 0,
      asphaltWork = 0;
    for (let r = r0; r <= r1; r++) {
      let wz = (r + 0.5) * this.cell - 300;
      for (let c = c0; c <= c1; c++) {
        let wx = (c + 0.5) * this.cell - 300,
          t = ((wx - x0) * dx + (wz - z0) * dz) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        let ox = wx - x0 - dx * t,
          oz = wz - z0 - dz * t;
        if (ox * ox + oz * oz > r2) continue;
        let si = r * n + c,
          off = si * 4,
          st = this.stage[si],
          cur = this.data[off + 2];
        if (st & 8) {
          let next = Math.min(255, cur + deltaByte);
          if (next > cur) {
            this.data[off + 2] = next;
            this.mark(r, c);
            asphaltWork++;
          }
          if (next >= 185 && !(st & 16)) {
            this.stage[si] |= 16;
            PV_STATE.asphaltCompM2 += this.cellArea;
            this.version++;
          }
        } else if (st & 2) {
          let next = Math.min(255, cur + deltaByte);
          if (next > cur) {
            this.data[off + 2] = next;
            this.mark(r, c);
            gravelWork++;
          }
          if (next >= 175 && !(st & 4)) {
            this.stage[si] |= 4;
            PV_STATE.gravelCompM2 += this.cellArea;
            this.version++;
          }
        }
      }
    }
    if (gravelWork || asphaltWork) this.version++;
    return { gravelWork, asphaltWork };
  }
  consumeDirty(cb) {
    if (!this.anyDirty) return !1;
    for (let r = 0; r < this.n; r++) {
      let mn = this.rowMin[r];
      if (mn >= 0) {
        cb(r, mn, this.rowMax[r]);
        this.rowMin[r] = -1;
        this.rowMax[r] = -1;
      }
    }
    this.anyDirty = !1;
    return !0;
  }
  clear() {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = 0;
      this.data[i + 1] = 0;
      this.data[i + 2] = 0;
    }
    this.stage.fill(0);
    for (let r = 0; r < this.n; r++) {
      this.rowMin[r] = 0;
      this.rowMax[r] = this.n - 1;
    }
    this.anyDirty = !0;
    this.version++;
    PV_STATE.gravelDumpedM3 = 0;
    PV_STATE.asphaltDumpedM3 = 0;
    PV_STATE.gravelSpreadM2 = 0;
    PV_STATE.gravelCompM2 = 0;
    PV_STATE.asphaltPavedM2 = 0;
    PV_STATE.asphaltCompM2 = 0;
  }
}

var RS_MASK = new PvRoadSurf(1024),
  rsTex = null,
  pvRng = DC(4409);

function pvRoadTex() {
  if (!rsTex) {
    rsTex = new io(RS_MASK.data, RS_MASK.n, RS_MASK.n, he, te);
    rsTex.magFilter = N;
    rsTex.minFilter = F;
    rsTex.generateMipmaps = !0;
    rsTex.wrapS = rsTex.wrapT = E;
    rsTex.needsUpdate = !0;
  }
  return rsTex;
}

function pvFlushTex() {
  let tx = pvRoadTex(),
    n = RS_MASK.n;
  if (
    RS_MASK.consumeDirty((r, mn, mx) => {
      tx.addUpdateRange((r * n + mn) * 4, (mx - mn + 1) * 4);
    })
  ) {
    tx.needsUpdate = !0;
  }
}

function pvClodLanded(clod) {
  if (!clod || !clod.mat || clod.mat === `soil`) return;
  if (clod.mat === `gravel`) {
    RS_MASK.paintGravel(clod.x, clod.z, clod.x, clod.z, 0.72, 232, grCanScrape);
    PV_STATE.gravelDumpedM3 += clod.vol || 0.015;
  } else if (clod.mat === `asphalt`) {
    RS_MASK.paintAsphalt(clod.x, clod.z, clod.x, clod.z, 0.78, 60, grCanScrape);
    PV_STATE.asphaltDumpedM3 += clod.vol || 0.015;
  }
}

function pvToggleFill() {
  PV_STATE.autoFill = !PV_STATE.autoFill;
  return PV_STATE.autoFill;
}

function pvSiloStep(dt) {
  let step = Math.min(dt, 0.05),
    nearest = null,
    bestD = 999;

  for (let s of PV_SILOS) {
    let d = Math.hypot(TK.x - s.x, TK.z - s.z);
    if (d < bestD) {
      bestD = d;
      nearest = s;
    }
    let activeFill = !1;
    if (
      d < s.bayR &&
      Math.abs(TK.v) < 1.3 &&
      TK.bed < 0.08 &&
      TK.load < TKS.CAP * 0.99 &&
      PV_STATE.autoFill
    ) {
      activeFill = !0;
      if (TK.load < 0.04) TK.mat = s.mat;
      let fillMat = TK.mat === `gravel` || TK.mat === `asphalt` ? TK.mat : s.mat;
      if (fillMat !== s.mat && TK.load > 0.1) {
        // Switching silo type cleanly replaces or waits; switch cleanly to requested silo material when below 0.3m3
        if (TK.load < 0.35) TK.mat = s.mat;
        else activeFill = !1;
      }
      if (activeFill) {
        TK.mat = s.mat;
        let add = Math.min(TKS.CAP - TK.load, 1.25 * step);
        TK.load += add;
        PV_STATE.filling = s.mat;
        // Stream visual material clods from overhead hopper gate straight into the dump truck bed
        if (CT.clods.length < 245 && pvRng() < step * 26) {
          let sy = nw(s.x, s.z) + 4.05;
          CT.clods.push({
            x: s.x + (pvRng() - 0.5) * 0.65,
            y: sy,
            z: s.z + (pvRng() - 0.5) * 0.75,
            vx: (pvRng() - 0.5) * 0.35,
            vy: -1.8 - pvRng() * 0.8,
            vz: (pvRng() - 0.5) * 0.35,
            vol: 0.011,
            spin: pvRng() * 6.28,
            mat: s.mat,
          });
        }
      }
    }
    // Also refill Asphalt Paver directly at the Asphalt Silo if driven there
    if (
      s.id === `asphalt` &&
      typeof PV < `undefined` &&
      Math.hypot(PV.x - s.x, PV.z - s.z) < s.bayR + 0.4 &&
      Math.abs(PV.v) < 1.0 &&
      PV.load < PVS.CAP * 0.99
    ) {
      PV.load = Math.min(PVS.CAP, PV.load + 1.3 * step);
      activeFill = !0;
    }
    let curOpen = PV_STATE.chuteOpen[s.id] || 0,
      tgtOpen = activeFill ? 1 : 0;
    PV_STATE.chuteOpen[s.id] = curOpen + (tgtOpen - curOpen) * EC(10, step);
  }

  if (PV_STATE.chuteOpen.gravel < 0.1 && PV_STATE.chuteOpen.asphalt < 0.1) {
    PV_STATE.filling = null;
  }
  PV_STATE.nearSilo = bestD < 8.5 ? { ...nearest, dist: bestD } : null;

  // Periodic lightweight progress sampling across the 3 Roadwork Zones
  PV_STATE.zoneCheckT += step;
  if (PV_STATE.zoneCheckT > 0.5 && typeof GR_ZONES < `undefined`) {
    PV_STATE.zoneCheckT = 0;
    let out = [];
    for (let zn of GR_ZONES) {
      let tot = 0,
        sc = 0,
        gr = 0,
        gc = 0,
        ap = 0,
        ac = 0;
      for (let x = zn.x0 + 1; x <= zn.x1 - 1; x += 2.0) {
        let zc = grZoneZ(zn, x);
        for (let z = zc - zn.halfW * 0.72; z <= zc + zn.halfW * 0.72; z += 1.5) {
          tot++;
          let cx = Sw.toCell(x),
            cz = Sw.toCell(z);
          if (cx >= 0 && cz >= 0 && cx < Sw.n && cz < Sw.n) {
            if (Sw.data[(cz * Sw.n + cx) * 4 + 2] >= 200) sc++;
          }
          let st = RS_MASK.sampleAt(x, z).stage;
          if (st & 2) gr++;
          if (st & 4) gc++;
          if (st & 8) ap++;
          if (st & 16) ac++;
        }
      }
      tot = Math.max(1, tot);
      out.push({
        id: zn.id,
        name: zn.name,
        scrape: Math.round((sc / tot) * 100),
        gravel: Math.round((gr / tot) * 100),
        gComp: Math.round((gc / tot) * 100),
        asphalt: Math.round((ap / tot) * 100),
        aComp: Math.round((ac / tot) * 100),
      });
    }
    PV_STATE.zones = out;
  }
}

PV_STATE.surf = RS_MASK;
typeof window < `u` && (window.__paving = PV_STATE);
