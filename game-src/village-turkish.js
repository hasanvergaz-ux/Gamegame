// ===================== TURKISH VILLAGE ARCHITECTURE, MOSQUE, PINAR & FORDS (added) =====================
var VT_PINARS = [
    { x: 1.2, z: -27.5, rot: Math.PI / 2, name: `Cami Pınarı` },
    { x: -29.5, z: 18.0, rot: 0, name: `Köy Pınarı` },
  ],
  VT_FORDS = [
    { x: -26.5, z: 22.0, rx: 1.75, rz: 1.4, rot: 0.25 },
    { x: 4.0, z: 27.5, rx: 1.85, rz: 1.4, rot: -0.1 },
    { x: 32.0, z: 46.0, rx: 1.85, rz: 1.4, rot: 0.12 },
    { x: -22.0, z: -18.0, rx: 1.55, rz: 1.3, rot: 0.05 },
    { x: 26.0, z: -21.0, rx: 1.8, rz: 1.35, rot: -0.2 },
    { x: 68.0, z: 30.0, rx: 2.35, rz: 1.65, rot: -0.18 },
  ];

function vtInitColliders() {
  for (let p of VT_PINARS) {
    fw(p.x, p.z, 2.5, 2.1, p.rot);
  }
}
vtInitColliders();

function vtBrickTex() {
  let cv = document.createElement(`canvas`);
  cv.width = 256;
  cv.height = 256;
  let c = cv.getContext(`2d`),
    rng = DC(771);
  c.fillStyle = `#b8aa96`;
  c.fillRect(0, 0, 256, 256);
  let rows = 12,
    cols = 6,
    rh = 256 / rows,
    cw = 256 / cols,
    colsPal = [`#9b4933`, `#a85239`, `#8c3f2b`, `#b25e42`, `#7e3827`];
  for (let r = 0; r < rows; r++) {
    let off = (r % 2) * (cw * 0.5);
    for (let col = -1; col <= cols; col++) {
      let x = col * cw + off + 2,
        y = r * rh + 2,
        w = cw - 4,
        h = rh - 4;
      c.fillStyle = colsPal[Math.floor(rng() * colsPal.length)];
      c.fillRect(x, y, w, h);
      c.fillStyle = `rgba(0,0,0,${(rng() * 0.16).toFixed(2)})`;
      c.fillRect(x, y + h - 4, w, 4);
      c.fillStyle = `rgba(255,235,210,${(rng() * 0.09).toFixed(2)})`;
      c.fillRect(x, y, w, 3);
    }
  }
  let tex = new _s(cv);
  tex.wrapS = tex.wrapT = T;
  tex.colorSpace = yt;
  tex.anisotropy = jT;
  tex.needsUpdate = !0;
  return tex;
}

function vtKerpicTex() {
  let cv = document.createElement(`canvas`);
  cv.width = 256;
  cv.height = 256;
  let c = cv.getContext(`2d`),
    rng = DC(309);
  c.fillStyle = `#c8b08a`;
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 420; i++) {
    let x = rng() * 256,
      y = rng() * 256,
      w = 6 + rng() * 24,
      h = 4 + rng() * 14;
    c.fillStyle = rng() < 0.5 ? `rgba(115,88,54,0.12)` : `rgba(235,218,188,0.12)`;
    c.fillRect(x, y, w, h);
  }
  // Faint chopped-straw flecks typical of kerpiç mud plaster
  c.strokeStyle = `rgba(218,195,142,0.45)`;
  c.lineWidth = 1.2;
  for (let i = 0; i < 240; i++) {
    let x = rng() * 256,
      y = rng() * 256,
      a = rng() * Math.PI * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    c.stroke();
  }
  let tex = new _s(cv);
  tex.wrapS = tex.wrapT = T;
  tex.colorSpace = yt;
  tex.anisotropy = jT;
  tex.needsUpdate = !0;
  return tex;
}

var VT_KERPIC_TINTS = [`#cbb38c`, `#bea179`, `#d6c3a1`, `#b4946b`].map((e) => new q(e)),
  VT_AHSAP_TINTS = [`#8a6544`, `#755234`, `#9b7450`, `#694a30`].map((e) => new q(e)),
  VT_TUGLA_TINTS = [`#d7b8ab`, `#c8a596`, `#e0c6ba`].map((e) => new q(e)),
  VT_HATIL_COL = new q(`#c9c2b4`),
  VT_TIMBER_COL = new q(`#4c3623`),
  VT_STOVE_COL = new q(`#6e7378`),
  VT_ROOF_COL = new q(`#a37b63`);

function vtHouse(e, t, n) {
  let idx = UC.indexOf(t),
    styles = [`kerpic`, `ahsap`, `tugla`],
    style = styles[(idx >= 0 ? idx : Math.floor(n() * 3)) % 3],
    baseY = ew(t.x, t.z),
    S = (lx, ly, lz) => {
      let [wx, wz] = VT(t.x, t.z, t.rot, lx, lz);
      return BT(wx, baseY + ly, wz);
    };

  // Stone foundation plinth on all rural Turkish houses
  let stoneH = style === `ahsap` && t.floors === 2 ? 2.35 : 1.0;
  e.add(`stone`, RT(t.w + 0.18, stoneH + 0.5, t.d + 0.18, 2.4), S(0, stoneH / 2 - 0.25, 0), t.rot);

  let wallH = t.floors === 2 ? stoneH + 2.75 : 3.45,
    wallMat = style === `kerpic` ? `kerpic` : style === `ahsap` ? `planks` : `brick`,
    tint =
      style === `kerpic`
        ? VT_KERPIC_TINTS[t.tint % VT_KERPIC_TINTS.length]
        : style === `ahsap`
          ? VT_AHSAP_TINTS[t.tint % VT_AHSAP_TINTS.length]
          : VT_TUGLA_TINTS[t.tint % VT_TUGLA_TINTS.length];

  if (style === `ahsap` && t.floors === 2) {
    // Ground floor rustic stone, overhanging upper timber floor (Cumba!) kept cleanly below roof eave
    let bodyH = 2.75,
      bodyY = stoneH + bodyH / 2;
    wallH = stoneH + bodyH;
    e.add(`planks`, RT(t.w + 0.1, bodyH, t.d + 0.1, 2.0), S(0, bodyY, 0), t.rot, tint);
    // Projecting Cumba bay on front facade ending cleanly below roof eave
    let cw = t.w * 0.44,
      cd = 0.62,
      ch = 2.05;
    e.add(`planks`, RT(cw, ch, cd, 1.6), S(0, stoneH + ch / 2 + 0.04, t.d / 2 + cd / 2), t.rot, tint);
    e.add(`wood`, RT(cw + 0.1, 0.1, cd + 0.08, 1.2), S(0, stoneH + ch + 0.08, t.d / 2 + cd / 2), t.rot, VT_TIMBER_COL);
    // Eli böğründe diagonal wooden support brackets under cumba
    for (let sx of [-cw * 0.36, cw * 0.36]) {
      e.add(
        `wood`,
        RT(0.14, 0.85, 0.14, 1),
        S(sx, stoneH - 0.15, t.d / 2 + 0.22),
        t.rot,
        VT_TIMBER_COL,
        new K().makeRotationX(-0.58),
      );
    }
    // Exposed dark timber corner posts & horizontal hatıl beams
    for (let cx of [-1, 1]) {
      for (let cz of [-1, 1]) {
        e.add(`wood`, RT(0.18, bodyH, 0.18, 1), S(cx * (t.w / 2 + 0.02), bodyY, cz * (t.d / 2 + 0.02)), t.rot, VT_TIMBER_COL);
      }
    }
    e.add(`wood`, RT(t.w + 0.2, 0.16, t.d + 0.2, 1.5), S(0, stoneH, 0), t.rot, VT_TIMBER_COL);
  } else {
    let bodyH = wallH - 0.55;
    e.add(wallMat, RT(t.w, bodyH, t.d, 2.1), S(0, 0.55 + bodyH / 2, 0), t.rot, tint);
    if (style === `tugla`) {
      // Concrete hatıl tie-beams typical of Anatolian brick houses
      e.add(`plaster`, RT(t.w + 0.08, 0.18, t.d + 0.08, 2), S(0, wallH - 0.12, 0), t.rot, VT_HATIL_COL);
      t.floors === 2 &&
        e.add(`plaster`, RT(t.w + 0.08, 0.18, t.d + 0.08, 2), S(0, 2.95, 0), t.rot, VT_HATIL_COL);
    } else if (style === `ahsap`) {
      for (let hy of [1.65, wallH - 0.1]) {
        e.add(`wood`, RT(t.w + 0.12, 0.14, t.d + 0.12, 1.5), S(0, hy, 0), t.rot, VT_TIMBER_COL);
      }
    }
  }

  // Roof: authentic flat mud roof (toprak dam) with projecting wooden mertek logs for some kerpiç houses,
  // or clean clay-tile gable roof (kiremit)
  let flatRoof = style === `kerpic` && t.floors === 1 && n() < 0.65;
  if (flatRoof) {
    let darkMud = tint.clone().multiplyScalar(0.84),
      rimMud = tint.clone().multiplyScalar(0.78);
    e.add(`kerpic`, RT(t.w + 0.36, 0.24, t.d + 0.36, 2.2), S(0, wallH + 0.08, 0), t.rot, darkMud);
    // Continuous 4-sided low mud parapet around flat roof
    e.add(`kerpic`, RT(t.w + 0.38, 0.14, 0.2, 1.5), S(0, wallH + 0.25, t.d / 2 + 0.08), t.rot, rimMud);
    e.add(`kerpic`, RT(t.w + 0.38, 0.14, 0.2, 1.5), S(0, wallH + 0.25, -t.d / 2 - 0.08), t.rot, rimMud);
    e.add(`kerpic`, RT(0.2, 0.14, t.d + 0.34, 1.5), S(t.w / 2 + 0.09, wallH + 0.25, 0), t.rot, rimMud);
    e.add(`kerpic`, RT(0.2, 0.14, t.d + 0.34, 1.5), S(-t.w / 2 - 0.09, wallH + 0.25, 0), t.rot, rimMud);
    // Traditional stone loğ taşı roller resting on toprak dam
    e.add(`stone`, new Ts(0.16, 0.16, 0.62, 10), S(-t.w * 0.22, wallH + 0.36, 0.15), t.rot, void 0, new K().makeRotationZ(Math.PI / 2));
    // Round wooden mertek roof logs poking out front & back under the toprak dam
    for (let mx = -t.w * 0.42; mx <= t.w * 0.42 + 0.05; mx += 0.95) {
      e.add(
        `wood`,
        new Ts(0.075, 0.075, t.d + 0.88, 7),
        S(mx, wallH - 0.03, 0),
        t.rot,
        VT_TIMBER_COL,
        new K().makeRotationX(Math.PI / 2),
      );
    }
    // Galvanized soba borusu (stovepipe chimney)
    e.add(`lead`, new Ts(0.085, 0.085, 1.4, 8), S(t.w * 0.26, wallH + 0.8, -t.d * 0.18), t.rot, VT_STOVE_COL);
    e.add(`lead`, new Es(0.17, 0.15, 8), S(t.w * 0.26, wallH + 1.52, -t.d * 0.18), t.rot, VT_STOVE_COL);
  } else {
    let pitchH = 1.45 + t.d * 0.1;
    HT(e, `roof`, ...S(0, wallH, 0).toArray(), t.rot, t.w, t.d, pitchH, 0.58, 2.2);
    UT(e, wallMat, ...S(0, wallH, 0).toArray(), t.rot, t.w, t.d, pitchH, tint, 2.1);
    // Rustic brick/stone chimney
    e.add(
      style === `tugla` ? `brick` : `stone`,
      RT(0.55, 1.9, 0.55, 1.5),
      S(t.w * 0.25, wallH + pitchH * 0.55, -t.d * 0.16),
      t.rot,
      style === `tugla` ? VT_TUGLA_TINTS[0] : void 0,
    );
    e.add(`lead`, new Ts(0.24, 0.24, 0.18, 8), S(t.w * 0.25, wallH + pitchH * 0.55 + 1.0, -t.d * 0.16), t.rot);
  }

  // Front wooden village door + stone doorstep + low sundurma timber porch clearly beneath roof eave
  e.add(`door`, new Ss(1.02, 2.0, 0.1), S(-t.w * 0.16, 1.45, t.d / 2 + 0.03), t.rot);
  e.add(`wood`, new Ss(1.18, 0.12, 0.16), S(-t.w * 0.16, 2.48, t.d / 2 + 0.05), t.rot, VT_TIMBER_COL);
  e.add(`stone`, RT(1.5, 0.35, 0.9, 1.2), S(-t.w * 0.16, 0.32, t.d / 2 + 0.42), t.rot);

  if (t.floors === 1 && n() < 0.65) {
    let pw = t.w * 0.48,
      pd = 1.45,
      px = -t.w * 0.1;
    e.add(
      `rust`,
      zT(pw, pd, 1.6),
      S(px, 2.24, t.d / 2 + pd / 2),
      t.rot,
      VT_ROOF_COL,
      new K().makeRotationX(-Math.PI / 2 + 0.16),
    );
    for (let sgn of [-1, 1]) {
      e.add(`wood`, new Ts(0.085, 0.095, 2.05, 7), S(px + sgn * (pw * 0.44), 1.12, t.d / 2 + pd - 0.12), t.rot, VT_TIMBER_COL);
    }
  }

  // Modest wooden-framed village windows (smaller & warmer than luxury houses)
  for (let f = 0; f < t.floors; f++) {
    let wy = 1.85 + f * 2.55;
    for (let side of [1, -1]) {
      let xs = f === 0 && side === 1 ? [t.w * 0.26] : [-t.w * 0.26, t.w * 0.26];
      for (let wx of xs) {
        let wz = side * (t.d / 2 + 0.04),
          wrot = t.rot + (side < 0 ? Math.PI : 0);
        e.add(`wood`, RT(0.95, 1.1, 0.1, 1), S(wx, wy, wz), wrot, VT_TIMBER_COL);
        e.add(`glass`, new Ss(0.76, 0.9, 0.06), S(wx, wy, side * (t.d / 2 + 0.07)), wrot);
        e.add(`wood`, RT(0.05, 0.9, 0.05, 1), S(wx, wy, side * (t.d / 2 + 0.09)), wrot, VT_TIMBER_COL);
        e.add(`wood`, RT(0.76, 0.05, 0.05, 1), S(wx, wy, side * (t.d / 2 + 0.09)), wrot, VT_TIMBER_COL);
      }
    }
  }

  // Stacked firewood (odun yığını) by the side wall on some houses
  if (n() < 0.65) {
    let ox = t.w / 2 + 0.38,
      oz = -t.d * 0.18;
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 4; k++) {
        e.add(
          `wood`,
          new Ts(0.11, 0.12, 0.72, 6),
          S(ox, 0.25 + r * 0.2, oz + (k - 1.5) * 0.23),
          t.rot,
          VT_AHSAP_TINTS[(r + k) % VT_AHSAP_TINTS.length],
          new K().makeRotationZ(Math.PI / 2),
        );
      }
    }
  }
}

function vtMosque(e) {
  let { x: mx, z: mz, w: mw, d: md, rot: mrot } = qC,
    my = ew(mx, mz),
    cream = new q(`#efe7d5`),
    stoneTrim = new q(`#d6ccb8`),
    brass = new q(`#d4a638`),
    S = (lx, ly, lz) => {
      let [wx, wz] = VT(mx, mz, mrot, lx, lz);
      return BT(wx, my + ly, wz);
    };

  // Cut-stone plinth & main limestone prayer hall
  e.add(`stone`, RT(mw + 0.4, 1.2, md + 0.4, 2.5), S(0, 0.35, 0), mrot);
  e.add(`plaster`, RT(mw, 6.2, md, 2.4), S(0, 4.0, 0), mrot, cream);
  e.add(`stone`, RT(mw + 0.35, 0.38, md + 0.35, 2.0), S(0, 7.22, 0), mrot, stoneTrim);

  // Corner stone pilasters
  for (let cx of [-1, 1]) {
    for (let cz of [-1, 1]) {
      e.add(`stone`, RT(0.55, 6.4, 0.55, 1.8), S(cx * (mw / 2), 4.0, cz * (md / 2)), mrot, stoneTrim);
    }
  }

  // Octagonal / cylindrical dome drum (kubbe kasnağı) + clerestory windows + lead dome + alem
  e.add(`plaster`, new Ts(4.0, 4.2, 1.45, 8), S(0, 8.05, 0), mrot, cream);
  for (let k = 0; k < 8; k++) {
    let a = (k * Math.PI) / 4,
      [wx, wz] = VT(mx, mz, mrot + a, 0, 3.92);
    e.add(`glass`, new Ss(0.65, 0.8, 0.08), BT(wx, my + 8.1, wz), mrot + a);
  }
  e.add(`lead`, new il(4.05, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), S(0, 8.72, 0), mrot);
  // Brass alem finial on main dome
  e.add(`paint`, new Ts(0.06, 0.09, 1.6, 8), S(0, 13.4, 0), mrot, brass);
  e.add(`paint`, new ol(0.28, 0.045, 6, 14, Math.PI * 1.45), S(0, 14.3, 0), mrot + 0.3, brass);

  // Son Cemaat Yeri (covered entrance portico with 4 columns + 3 lead domes on front +Z)
  let portZ = md / 2 + 1.85;
  e.add(`stone`, RT(mw + 0.2, 0.6, 3.6, 2.2), S(0, 0.3, portZ), mrot);
  e.add(`stone`, RT(mw + 0.1, 0.42, 3.4, 2.0), S(0, 4.35, portZ), mrot, stoneTrim);
  for (let px of [-mw * 0.42, -mw * 0.15, mw * 0.15, mw * 0.42]) {
    e.add(`stone`, new Ts(0.24, 0.28, 3.65, 10), S(px, 2.38, md / 2 + 3.25), mrot, stoneTrim);
  }
  for (let dx of [-mw * 0.3, 0, mw * 0.3]) {
    e.add(`lead`, new il(1.45, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), S(dx, 4.55, portZ), mrot);
  }
  // Carved wooden mosque main door
  e.add(`wood`, new Ss(1.7, 2.8, 0.14), S(0, 2.0, md / 2 + 0.04), mrot, VT_TIMBER_COL);
  e.add(`stone`, new Ts(0.92, 0.92, 0.16, 14, 1, !1, 0, Math.PI), S(0, 3.4, md / 2 + 0.04), mrot, stoneTrim, new K().makeRotationX(Math.PI / 2).premultiply(new K().makeRotationZ(Math.PI / 2)));

  // Arched lower & upper windows on side & rear walls
  for (let r = 1; r < 4; r++) {
    let ang = (r * Math.PI) / 2;
    for (let sx of [-3.0, 0, 3.0]) {
      for (let wy of [2.5, 5.0]) {
        let [wx, wz] = VT(mx, mz, mrot + ang, sx, md / 2 + 0.04);
        e.add(`glass`, new Ss(0.95, 1.55, 0.08), BT(wx, my + wy, wz), mrot + ang);
        e.add(
          `stone`,
          new Ts(0.48, 0.48, 0.1, 12, 1, !1, 0, Math.PI),
          BT(wx, my + wy + 0.78, wz),
          mrot + ang,
          stoneTrim,
          new K().makeRotationX(Math.PI / 2).premultiply(new K().makeRotationZ(Math.PI / 2)),
        );
      }
    }
  }

  // Detailed Turkish Minaret (kürsü, pabuç, gövde, şerefe balcony, petek, lead külah, alem)
  let [minX, minZ] = VT(mx, mz, mrot, 6.7, 4.8);
  e.add(`stone`, RT(2.2, 3.4, 2.2, 2.0), BT(minX, my + 1.5, minZ), mrot);
  e.add(`stone`, new Ts(0.92, 1.32, 1.3, 8), BT(minX, my + 3.85, minZ), mrot, stoneTrim);
  e.add(`plaster`, new Ts(0.68, 0.82, 11.4, 16), BT(minX, my + 10.2, minZ), mrot, cream);
  // Carved Şerefe balcony & stone balustrade ring
  e.add(`stone`, new Ts(1.22, 0.78, 0.65, 16), BT(minX, my + 16.0, minZ), mrot, stoneTrim);
  e.add(`stone`, new Ts(1.24, 1.24, 0.58, 16, 1, !0), BT(minX, my + 16.58, minZ), mrot, stoneTrim);
  // Petek + conical lead Külah + golden Alem
  e.add(`plaster`, new Ts(0.54, 0.58, 2.8, 16), BT(minX, my + 17.7, minZ), mrot, cream);
  e.add(`lead`, new Es(0.68, 4.5, 16), BT(minX, my + 21.35, minZ), mrot);
  e.add(`paint`, new Ts(0.045, 0.06, 1.4, 8), BT(minX, my + 24.2, minZ), mrot, brass);
  e.add(`paint`, new ol(0.2, 0.035, 6, 12, Math.PI * 1.45), BT(minX, my + 25.0, minZ), mrot + 0.2, brass);

  // Courtyard Şadırvan (octagonal ablution pavilion) on west-front corner
  let [sadX, sadZ] = VT(mx, mz, mrot, -8.2, 4.5);
  e.add(`stone`, new Ts(2.1, 2.2, 0.45, 8), BT(sadX, my + 0.15, sadZ), 0);
  e.add(`stone`, new Ts(1.4, 1.4, 0.72, 8), BT(sadX, my + 0.7, sadZ), 0, stoneTrim);
  e.add(`water`, new Ts(1.22, 1.22, 0.1, 8), BT(sadX, my + 1.04, sadZ), 0);
  for (let k = 0; k < 6; k++) {
    let a = (k * Math.PI) / 3;
    e.add(`wood`, new Ts(0.08, 0.09, 2.35, 8), BT(sadX + Math.cos(a) * 1.85, my + 1.5, sadZ + Math.sin(a) * 1.85), 0, VT_TIMBER_COL);
  }
  e.add(`lead`, new Es(2.45, 1.3, 8), BT(sadX, my + 3.25, sadZ), 0);
}

function vtPinar(e, p) {
  let py = ew(p.x, p.z),
    S = (lx, ly, lz) => {
      let [wx, wz] = VT(p.x, p.z, p.rot, lx, lz);
      return BT(wx, py + ly, wz);
    },
    stoneCap = new q(`#b6ac9c`),
    brassCol = new q(`#b88b32`),
    marbleCol = new q(`#ebe6da`);

  // Stone paved base apron + arched cut-stone fountain monument
  e.add(`stone`, RT(2.6, 0.22, 2.2, 1.8), S(0, 0.08, 0.25), p.rot, stoneCap);
  e.add(`stone`, RT(2.2, 2.25, 0.72, 1.8), S(0, 1.2, -0.35), p.rot);
  // Stepped stone cap roof
  e.add(`stone`, RT(2.42, 0.22, 0.92, 1.8), S(0, 2.42, -0.35), p.rot, stoneCap);
  e.add(`stone`, RT(1.85, 0.18, 0.82, 1.5), S(0, 2.6, -0.35), p.rot, stoneCap);
  // Recessed stone arch frame + marble inscription tablet (kitabe)
  e.add(`stone`, RT(1.3, 1.5, 0.14, 1.4), S(0, 1.2, 0.02), p.rot, new q(`#7f776c`));
  e.add(`plaster`, new Ss(0.92, 0.34, 0.08), S(0, 1.98, 0.04), p.rot, marbleCol);

  // Carved stone water trough (yalak) with walls + glistening spring water surface
  e.add(`stone`, RT(1.75, 0.56, 0.16, 1.5), S(0, 0.44, 0.88), p.rot, stoneCap);
  e.add(`stone`, RT(0.16, 0.56, 0.92, 1.5), S(-0.8, 0.44, 0.42), p.rot, stoneCap);
  e.add(`stone`, RT(0.16, 0.56, 0.92, 1.5), S(0.8, 0.44, 0.42), p.rot, stoneCap);
  e.add(`water`, new el(1.44, 0.82).rotateX(-Math.PI / 2), S(0, 0.64, 0.45), p.rot);

  // Brass pipe spout (lüle) + continuous arched stream of spring water (Pınar suyu)
  e.add(
    `paint`,
    new Ts(0.045, 0.055, 0.28, 8),
    S(0, 1.15, 0.16),
    p.rot,
    brassCol,
    new K().makeRotationX(Math.PI / 2),
  );
  let streamCurve = new Us([
    S(0, 1.14, 0.28),
    S(0, 1.04, 0.38),
    S(0, 0.84, 0.44),
    S(0, 0.62, 0.46),
  ]);
  e.add(`water`, new cl(streamCurve, 10, 0.032, 6, !1), BT(0, 0, 0));
}

function vtMudPuddles(e) {
  for (let f of VT_FORDS) {
    let fy = rw(f.x, f.z) + 0.065,
      pGeo = new Ts(1, 1, 0.03, 18);
    pGeo.scale(f.rx, 1, f.rz);
    e.add(`mudwater`, pGeo, BT(f.x, fy, f.z), f.rot);
    // Scattered river stones around muddy crossing edge
    for (let k = 0; k < 5; k++) {
      let a = (k / 5) * Math.PI * 2 + f.rot,
        sx = f.x + Math.cos(a) * (f.rx * 0.96),
        sz = f.z + Math.sin(a) * (f.rz * 0.96);
      e.add(`stone`, new Ss(0.32, 0.16, 0.26), BT(sx, rw(sx, sz) + 0.04, sz), a);
    }
  }
}

function vtBuildBuildings() {
  let e = (0, y.use)(NT(`o_painted_plaster_wall_diff.jpg`, !0)),
    t = (0, y.use)(NT(`o_painted_plaster_wall_nor.jpg`, !1)),
    n = (0, y.use)(NT(`o_rustic_stone_wall_diff.jpg`, !0)),
    r = (0, y.use)(NT(`o_rustic_stone_wall_nor.jpg`, !1)),
    i = (0, y.use)(NT(`o_clay_roof_tiles_diff.jpg`, !0)),
    a = (0, y.use)(NT(`o_clay_roof_tiles_nor.jpg`, !1)),
    o = (0, y.use)(NT(`o_weathered_plank_siding_diff.jpg`, !0)),
    s = (0, y.use)(NT(`o_weathered_plank_siding_nor.jpg`, !1)),
    c = (0, y.use)(NT(`o_wood_planks_diff.jpg`, !0)),
    l = (0, y.use)(NT(`o_wood_planks_nor.jpg`, !1)),
    u = (0, y.use)(NT(`o_rough_pine_door_diff.jpg`, !0)),
    d = (0, y.use)(NT(`o_rusty_corrugated_iron_diff.jpg`, !0)),
    f = (0, y.use)(NT(`o_rusty_corrugated_iron_nor.jpg`, !1)),
    p = (0, y.use)(NT(`o_corrugated_iron_diff.jpg`, !0)),
    m = (0, y.use)(NT(`o_corrugated_iron_nor.jpg`, !1)),
    h = (0, y.use)(NT(`o_thatch_roof_angled_diff.jpg`, !0)),
    g = (0, y.useMemo)(() => {
      let g = new LT(),
        _ = DC(5),
        brickMap = vtBrickTex(),
        kerpicMap = vtKerpicTex();
      for (let house of UC) vtHouse(g, house, _);
      qT(g);
      JT(g);
      YT(g);
      vtMosque(g);
      ZT(g);
      for (let pinar of VT_PINARS) vtPinar(g, pinar);
      vtMudPuddles(g);
      let v = (props) => new Cl({ vertexColors: !0, ...props }),
        mats = {
          plaster: v({ map: e, normalMap: t, roughness: 0.95 }),
          kerpic: v({ map: kerpicMap, normalMap: t, roughness: 0.96 }),
          brick: v({ map: brickMap, normalMap: r, roughness: 0.9 }),
          stone: v({ map: n, normalMap: r, roughness: 0.95 }),
          roof: v({ map: i, normalMap: a, roughness: 0.82 }),
          planks: v({ map: o, normalMap: s, roughness: 0.9 }),
          wood: v({ map: c, normalMap: l, roughness: 0.86 }),
          door: v({ map: u, roughness: 0.82 }),
          rust: v({
            map: d,
            normalMap: f,
            roughness: 0.7,
            metalness: 0.4,
            side: 2,
          }),
          metal: v({ map: p, normalMap: m, roughness: 0.45, metalness: 0.75 }),
          glass: v({
            color: `#2a3b48`,
            roughness: 0.08,
            metalness: 0.85,
            emissive: `#ffb35c`,
            emissiveIntensity: 0,
          }),
          lead: v({ color: `#6e777d`, roughness: 0.42, metalness: 0.82 }),
          straw: v({ map: h, color: `#e2bd6a`, roughness: 0.95 }),
          dark: v({ color: `#2b2a28`, roughness: 0.8 }),
          white: v({ color: `#ecebe6`, roughness: 0.6 }),
          paint: v({ roughness: 0.5, metalness: 0.55 }),
          water: v({
            color: `#3fa7c4`,
            roughness: 0.08,
            metalness: 0.35,
            transparent: !0,
            opacity: 0.84,
          }),
          mudwater: v({
            color: `#5e4d38`,
            roughness: 0.05,
            metalness: 0.4,
            transparent: !0,
            opacity: 0.76,
          }),
        };
      return (
        (IT.length = 0),
        IT.push(mats.glass),
        [...g.parts.entries()].map(([key, geos]) => {
          let mesh = new Wa(ET(geos), mats[key]);
          mesh.castShadow = key !== `glass` && key !== `water` && key !== `mudwater`;
          mesh.receiveShadow = !0;
          mesh.name = key;
          return mesh;
        })
      );
    }, [e, t, n, r, i, a, o, s, c, l, u, d, f, p, m, h]);
  return (0, Z.jsx)(`group`, {
    name: `buildings`,
    children: g.map((mesh) => (0, Z.jsx)(`primitive`, { object: mesh }, mesh.name)),
  });
}
