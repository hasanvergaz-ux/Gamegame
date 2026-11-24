// ---------- JCB backhoe loader visuals (procedural, metres, machine frame) ----------
function jbUse() {
  return (0, y.useMemo)(() => jbBuild(), []);
}
// merge the direct child meshes of a group by material (fewer draw calls)
function jbMerge(g) {
  let by = new Map();
  for (let m of [...g.children]) {
    if (!m.isMesh || m.isInstancedMesh || m.userData.keep) continue;
    by.has(m.material) || by.set(m.material, []);
    by.get(m.material).push(m);
  }
  for (let [mat, list] of by) {
    if (list.length < 2) continue;
    let geos = list.map((m) => {
        m.updateMatrix();
        let geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
        for (let k of Object.keys(geo.attributes))
          k !== `position` && k !== `normal` && k !== `uv` && geo.deleteAttribute(k);
        (geo.attributes.normal || geo.computeVertexNormals(),
          geo.attributes.uv ||
            geo.setAttribute(`uv`, new ji(new Float32Array(geo.attributes.position.count * 2), 2)),
          (geo.morphAttributes = {}),
          geo.clearGroups());
        return geo;
      }),
      merged = ET(geos, !1);
    if (!merged) continue;
    for (let m of list) g.remove(m);
    let mesh = new Wa(merged, mat);
    ((mesh.castShadow = !mat.transparent), (mesh.receiveShadow = !0), g.add(mesh));
  }
}
// a bar following a smooth centre line [[z, y], ...] with thickness tapering h0 -> h1
function jbBand(pts, h0, h1, n = 40) {
  let c = new Us(pts.map(([z, yy]) => sE(z, yy, 0))).getPoints(n),
    top = [],
    bot = [];
  return (
    c.forEach((p, i) => {
      let a = c[Math.max(0, i - 1)],
        b = c[Math.min(c.length - 1, i + 1)],
        dx = b.x - a.x,
        dy = b.y - a.y,
        l = Math.hypot(dx, dy) || 1,
        h = wC(h0, h1, i / (c.length - 1));
      (top.push([p.x - (dy / l) * h, p.y + (dx / l) * h]), bot.push([p.x + (dy / l) * h, p.y - (dx / l) * h]));
    }),
    top.concat(bot.reverse())
  );
}
// open shell profile with thickness (bucket backs)
function jbShell(pts, th, n = 30) {
  let D = new Us(pts.map(([z, yy]) => sE(z, yy, 0))).getPoints(n),
    O = D.map((e) => [e.x, e.y]),
    k = D.map((e, t) => {
      let a = D[Math.min(D.length - 1, t + 1)],
        b = D[Math.max(0, t - 1)],
        d = a.clone().sub(b).normalize();
      return [e.x + d.y * th, e.y - d.x * th];
    });
  return (O.push(...k.reverse()), { shell: O, curve: D.map((e) => [e.x, e.y]) });
}
function jbDecal(text, sub) {
  let cv = document.createElement(`canvas`);
  ((cv.width = 256), (cv.height = 96));
  let c = cv.getContext(`2d`);
  ((c.fillStyle = `#111214`),
    c.beginPath(),
    c.roundRect(4, 4, 248, 88, 12),
    c.fill(),
    (c.fillStyle = `#ffffff`),
    (c.font = `italic 900 70px 'Barlow Condensed', Arial Black, sans-serif`),
    (c.textAlign = `center`),
    (c.textBaseline = `middle`),
    c.fillText(text, sub ? 100 : 128, 52),
    sub &&
      ((c.fillStyle = `#f4b400`), (c.font = `800 34px 'Barlow Condensed', Arial, sans-serif`), c.fillText(sub, 206, 54)));
  let tex = new _s(cv);
  return (
    (tex.colorSpace = yt),
    new Cl({ map: tex, roughness: 0.45, transparent: !0, polygonOffset: !0, polygonOffsetFactor: -2 })
  );
}
function jbDashCanvas() {
  let cv = document.createElement(`canvas`);
  ((cv.width = 384), (cv.height = 192));
  let tex = new _s(cv);
  return ((tex.colorSpace = yt), { cv: cv, ctx: cv.getContext(`2d`), tex: tex });
}
function jbDrawDash(d, st) {
  let c = d.ctx;
  ((c.fillStyle = `#121417`), c.fillRect(0, 0, 384, 192));
  // speedo
  let cx = 92,
    cy = 100,
    a0 = Math.PI * 0.75,
    span = Math.PI * 1.5;
  ((c.fillStyle = `#06080a`), c.beginPath(), c.arc(cx, cy, 78, 0, Math.PI * 2), c.fill(),
    (c.strokeStyle = `#4a4f56`), (c.lineWidth = 4), c.stroke());
  for (let i = 0; i <= 8; i++) {
    let a = a0 + (span * i) / 8;
    ((c.strokeStyle = `#e6e8ea`), (c.lineWidth = 3), c.beginPath(),
      c.moveTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60), c.lineTo(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72), c.stroke());
  }
  let sp = Math.abs(st.v) * 3.6,
    a = a0 + span * CC(sp / 40, 0, 1);
  ((c.strokeStyle = `#ff6a13`), (c.lineWidth = 5), c.beginPath(), c.moveTo(cx, cy),
    c.lineTo(cx + Math.cos(a) * 64, cy + Math.sin(a) * 64), c.stroke(),
    (c.fillStyle = `#f2f4f6`), (c.font = `700 28px 'Barlow Condensed', Arial, sans-serif`), (c.textAlign = `center`),
    c.fillText(`${Math.round(sp)}`, cx, cy + 46), (c.fillStyle = `#8f98a3`), (c.font = `600 14px Arial`), c.fillText(`km/h`, cx, cy + 62));
  // rpm LED bar + status
  let rf = CC(st.rpm / 2400, 0, 1);
  for (let i = 0; i < 12; i++)
    ((c.fillStyle = i / 12 < rf ? (i > 9 ? `#ff3b2f` : i > 7 ? `#ffb020` : `#3ddc6c`) : `#23272c`),
      c.fillRect(196 + i * 15, 22, 11, 22));
  ((c.textAlign = `left`), (c.fillStyle = `#f4b400`), (c.font = `800 22px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(st.seat > 0.5 ? `BACKHOE` : `LOADER`, 196, 74),
    (c.fillStyle = `#d6dade`), (c.font = `600 17px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(`Shovel  ${st.lLoad.toFixed(2)} m³`, 196, 104),
    c.fillText(`Bucket  ${st.bLoad.toFixed(2)} m³`, 196, 126),
    c.fillText(`Dug     ${st.dug.toFixed(1)} m³`, 196, 148),
    (c.fillStyle = st.running ? `#3ddc6c` : `#ff3b2f`),
    c.fillText(st.running ? `● ENGINE` : `● ENGINE OFF`, 196, 176),
    st.stab > 0.05 && ((c.fillStyle = `#ffb020`), c.fillText(`▼ STAB`, 300, 176)),
    (d.tex.needsUpdate = !0));
}
function jbTire(spin, M, r, w, rim, side, nLug) {
  let h = w / 2,
    prof = [[rim, -h], [r - 0.09, -h], [r - 0.03, -h + 0.035], [r, -h + 0.1], [r, h - 0.1], [r - 0.03, h - 0.035], [r - 0.09, h], [rim, h]],
    tire = new Qc(prof.map(([a, b]) => new W(a, b)), 40);
  (tire.rotateZ(Math.PI / 2), $(tire, M.rubber, spin));
  for (let i = 0; i < nLug; i++)
    for (let s of [1, -1]) {
      let ang = ((i + (s > 0 ? 0 : 0.5)) / nLug) * Math.PI * 2,
        lug = $(fE(h * 0.92, 0.1, 0.06), M.rubber, spin, s * h * 0.5, Math.sin(ang) * (r + 0.012), Math.cos(ang) * (r + 0.012));
      lug.rotation.set(-ang, 0, s * 0.42);
    }
  let face = side * (w * 0.18);
  ($(mE(rim, w * 0.62, 28), M.paint, spin),
    $(mE(rim * 0.82, 0.03, 28), M.paintDark, spin, face + side * 0.02, 0, 0),
    $(mE(rim * 0.36, 0.06, 18), M.steel, spin, face + side * 0.05, 0, 0),
    $(mE(rim * 0.18, 0.06, 12), M.black, spin, face + side * 0.09, 0, 0));
  for (let i = 0; i < 8; i++) {
    let a = (i / 8) * Math.PI * 2;
    $(mE(0.022, 0.05, 6), M.chrome, spin, face + side * 0.08, Math.sin(a) * rim * 0.27, Math.cos(a) * rim * 0.27);
  }
  jbMerge(spin);
}
function jbBuild() {
  let M = lE(),
    root = new Lr(),
    body = new Lr();
  (M.paint.color.set(`#f6b30f`), M.paintDark.color.set(`#dc9b0a`), root.add(body));
  let plastic = new Cl({ color: `#3a3e44`, roughness: 0.78 }),
    plasticL = new Cl({ color: `#6d737b`, roughness: 0.82 }),
    fabric = new Cl({ color: `#2c2f33`, roughness: 0.95 }),
    fabricL = new Cl({ color: `#4a4e54`, roughness: 0.95 }),
    blackS = new Cl({ color: `#1b1c1e`, roughness: 0.6, metalness: 0.35, side: 2 }),
    red = new Cl({ color: `#c41a12`, roughness: 0.3, emissive: `#ff1a00`, emissiveIntensity: 0.15 }),
    glass = M.glass.clone();
  ((glass.opacity = 0.2), (glass.color = new q(`#9fbcc4`)));
  let logo = jbDecal(`JCB`),
    logo3 = jbDecal(`JCB`, `3CX`),
    S = JBS;
  // ---------------- chassis & running gear ----------------
  for (let sx of [1, -1])
    ($(pE(0.16, 0.3, 4.1, 0.03), M.black, body, sx * 0.4, 0.86, 0.95),
      $(pE(0.24, 0.42, 0.34, 0.04), M.paint, body, sx * 0.62, 0.92, 1.12));
  ($(mE(0.13, 1.55, 18), M.black, body, 0, S.RR, 0),
    $(new il(0.24, 16, 12), M.black, body, 0, S.RR, 0),
    $(mE(0.1, 1.5, 16), M.black, body, 0, S.RF, S.WB),
    $(new il(0.17, 14, 10), M.black, body, 0, S.RF, S.WB),
    $(pE(0.95, 0.32, 0.22, 0.05), M.black, body, 0, 0.76, 3.1));
  for (let sx of [1, -1]) $(pE(0.12, 0.16, 0.12, 0.02), M.steel, body, sx * 0.36, 0.76, 3.24);
  // engine hood
  ($(
    hE(
      [[0.86, 0.95], [2.96, 0.95], [3.0, 1.15], [2.98, 1.45], [2.86, 1.58], [2.3, 1.72], [1.5, 1.82], [0.86, 1.85]],
      0.92,
      0.05,
    ),
    M.paint,
    body,
  ),
    $(fE(0.7, 0.42, 0.03), M.black, body, 0, 1.22, 3.045));
  for (let i = 0; i < 6; i++) $(fE(0.66, 0.025, 0.02), M.steel, body, 0, 1.05 + i * 0.07, 3.065);
  for (let sx of [1, -1]) {
    let d = $(new el(0.5, 0.19), logo, body, sx * 0.517, 1.48, 2.1);
    d.rotation.y = (sx * Math.PI) / 2;
    for (let i = 0; i < 5; i++) {
      let v = $(fE(0.01, 0.2, 0.025), M.black, body, sx * 0.513, 1.25, 1.2 + i * 0.07);
      v.rotation.x = 0.1;
    }
    ($(pE(0.14, 0.09, 0.05, 0.02), M.black, body, sx * 0.34, 1.53, 2.99),
      $(fE(0.11, 0.06, 0.01), M.lens, body, sx * 0.34, 1.53, 3.018));
  }
  let fl = $(new el(0.3, 0.11), logo, body, 0, 1.56, 2.97);
  fl.rotation.x = -0.35;
  // rear fenders, side boxes, steps
  for (let sx of [1, -1]) {
    let fg = new Ts(S.RR + 0.1, S.RR + 0.1, 0.58, 24, 1, !0, 0.12, Math.PI - 0.62);
    (fg.rotateZ(Math.PI / 2), $(fg, blackS, body, sx * S.TRACK_R, S.RR, 0));
    ($(pE(0.04, 0.08, 0.08, 0.01), red, body, sx * 1.05, 0.98, -0.78),
      $(pE(0.08, 0.14, 0.06, 0.02), M.amber, body, sx * 1.05, 1.12, -0.78));
  }
  ($(pE(0.36, 0.44, 0.72, 0.05), M.paint, body, -0.62, 0.86, 1.18),
    $(fE(0.3, 0.03, 0.24), M.steel, body, 0.86, 0.52, 1.12),
    $(fE(0.3, 0.03, 0.24), M.steel, body, 0.86, 0.92, 1.12),
    $(fE(0.04, 0.45, 0.04), M.black, body, 0.99, 0.72, 1.12),
    $(pE(1.25, 0.32, 1.65, 0.05), M.paint, body, 0, 1.12, 0.05));
  // ---------------- cab ----------------
  let cy0 = 1.3,
    cy1 = 2.8,
    ch = cy1 - cy0,
    cz0 = -0.75,
    cz1 = 0.85,
    cw = 0.8;
  ($(pE(1.66, 0.12, 1.7, 0.03), M.black, body, 0, cy0 - 0.02, 0.05),
    $(pE(1.74, 0.14, 1.8, 0.06), M.black, body, 0, cy1 + 0.05, 0.05),
    $(pE(1.5, 0.07, 1.5, 0.05), M.paint, body, 0, cy1 + 0.14, 0.02));
  for (let [px, pz] of [[cw, cz1], [-cw, cz1], [cw, cz0], [-cw, cz0], [cw, 0.05], [-cw, 0.05]])
    $(pE(0.07, ch, 0.07, 0.02), M.black, body, px, cy0 + ch / 2, pz);
  for (let sx of [1, -1]) $(fE(0.05, 0.05, 1.6), M.black, body, sx * cw, cy0 + 0.42, 0.05);
  let pane = (w, h, x, yy, z, ry) => {
    let p = $(new el(w, h), glass, body, x, yy, z);
    return ((p.rotation.y = ry), (p.castShadow = !1), p);
  };
  (pane(1.52, ch, 0, cy0 + ch / 2, cz1 + 0.01, 0),
    pane(1.52, ch, 0, cy0 + ch / 2, cz0 - 0.01, Math.PI),
    pane(1.58, ch, cw + 0.01, cy0 + ch / 2, 0.05, Math.PI / 2),
    pane(1.58, ch, -cw - 0.01, cy0 + ch / 2, 0.05, -Math.PI / 2));
  // door handle, handrail, wipers, mirrors, roof lights, beacon, exhaust
  ($(fE(0.02, 0.03, 0.12), M.chrome, body, cw + 0.04, 1.95, 0.6),
    $(new Ts(0.016, 0.016, 1.1, 8), M.chrome, body, cw + 0.08, 1.85, 0.78),
    $(new Ts(0.016, 0.016, 1.1, 8), M.chrome, body, cw + 0.08, 1.85, -0.62));
  let wiper = $(fE(0.012, 0.75, 0.012), M.black, body, 0.1, 1.75, cz1 + 0.03);
  wiper.rotation.z = 0.45;
  for (let sx of [1, -1]) {
    let arm = $(new Ts(0.012, 0.012, 0.34, 6), M.black, body, sx * (cw + 0.15), 2.38, cz1 + 0.04);
    ((arm.rotation.z = (sx * Math.PI) / 2.4), $(pE(0.05, 0.26, 0.17, 0.02), M.black, body, sx * (cw + 0.32), 2.42, cz1 + 0.06));
  }
  for (let lx of [0.6, 0.22, -0.22, -0.6])
    ($(new Ts(0.065, 0.065, 0.09, 14).rotateX(Math.PI / 2), M.black, body, lx, cy1 + 0.02, cz1 + 0.08),
      $(new ws(0.052, 14), M.lens, body, lx, cy1 + 0.02, cz1 + 0.126));
  for (let lx of [0.5, -0.5]) {
    $(new Ts(0.065, 0.065, 0.09, 14).rotateX(Math.PI / 2), M.black, body, lx, cy1 + 0.02, cz0 - 0.08);
    $(new ws(0.052, 14), M.lens, body, lx, cy1 + 0.02, cz0 - 0.126).rotation.y = Math.PI;
  }
  ($(new Ts(0.06, 0.075, 0.13, 14), M.amber, body, 0.55, cy1 + 0.24, -0.5),
    $(new Ts(0.075, 0.075, 0.03, 14), M.black, body, 0.55, cy1 + 0.17, -0.5),
    $(new Ts(0.006, 0.006, 0.6, 5), M.black, body, -0.65, cy1 + 0.45, -0.6),
    $(new Ts(0.05, 0.05, 1.45, 14), M.chrome, body, -0.4, 2.42, 1.0),
    $(new Ts(0.06, 0.06, 0.12, 14), M.black, body, -0.4, 1.75, 1.0));
  let exhaust = sE(-0.4, 3.18, 1.0);
  // ---------------- cab interior ----------------
  ($(fE(1.5, 0.02, 1.52), M.rubber, body, 0, cy0 + 0.05, 0.05),
    $(fE(1.5, 0.02, 1.52), plasticL, body, 0, cy1 - 0.03, 0.05));
  for (let sx of [1, -1]) $(pE(0.06, 0.32, 1.5, 0.02), plastic, body, sx * (cw - 0.05), cy0 + 0.2, 0.05);
  // steering pod + cluster
  ($(pE(0.34, 0.52, 0.26, 0.05), plastic, body, 0, cy0 + 0.3, 0.68),
    $(pE(0.4, 0.1, 0.3, 0.04), plastic, body, 0, cy0 + 0.6, 0.66));
  let dash = jbDashCanvas(),
    dashMat = new Ma({ map: dash.tex, toneMapped: !1 }),
    cluster = $(new el(0.3, 0.15), dashMat, body, 0, cy0 + 0.665, 0.66);
  (cluster.rotation.set(0.75, Math.PI, 0), (cluster.userData.keep = !0));
  // brake + throttle pedals
  for (let [px, pz] of [[0.09, 0.6], [-0.03, 0.6], [-0.22, 0.56]]) {
    let p = $(fE(0.07, 0.13, 0.02), M.black, body, px, cy0 + 0.16, pz);
    p.rotation.x = -0.5;
  }
  // right console (loader lever) + left console
  ($(pE(0.2, 0.42, 0.5, 0.04), plastic, body, -0.6, cy0 + 0.25, 0.45),
    $(pE(0.18, 0.12, 0.3, 0.03), plastic, body, 0.6, cy0 + 0.3, 0.55),
    $(pE(0.06, 0.18, 0.12, 0.02), plastic, body, -0.7, cy0 + 0.75, 0.75));
  let shot = $(new el(0.1, 0.07), dashMat, body, -0.67, cy0 + 0.78, 0.69);
  (shot.rotation.set(0, Math.PI + 0.6, 0), (shot.userData.keep = !0));
  // rear console under the back window (switches for the backhoe side)
  $(pE(1.3, 0.36, 0.22, 0.04), plastic, body, 0, cy0 + 0.2, cz0 + 0.16);
  for (let i = 0; i < 6; i++) $(fE(0.04, 0.025, 0.012), i % 2 ? M.amber : plasticL, body, -0.2 + i * 0.08, cy0 + 0.39, cz0 + 0.1);
  // ---------------- rear frame for the backhoe ----------------
  ($(fE(2.1, 0.13, 0.16), M.black, body, 0, 0.95, -1.32),
    $(fE(2.1, 0.13, 0.16), M.black, body, 0, 1.38, -1.32),
    $(pE(0.6, 0.6, 0.6, 0.05), M.black, body, 0, 1.0, -1.05));
  for (let sx of [1, -1])
    ($(pE(0.1, 0.55, 0.55, 0.02), M.black, body, sx * 0.42, 1.08, -1.0),
      $(fE(0.32, 0.12, 0.14), M.paint, body, sx * 0.86, 1.25, -1.38),
      $(pE(0.17, 0.82, 0.2, 0.03), M.paint, body, sx * 1.02, 0.86, -1.38));
  jbMerge(body);
  // ---------------- wheels ----------------
  let wheels = [];
  for (let sx of [1, -1]) {
    let spin = new Lr();
    (spin.position.set(sx * S.TRACK_R, S.RR, 0), body.add(spin), jbTire(spin, M, S.RR, 0.5, 0.48, sx, 22));
    wheels.push({ spin: spin, front: !1 });
    let steer = new Lr(),
      fspin = new Lr();
    (steer.position.set(sx * S.TRACK_F, S.RF, S.WB), steer.add(fspin), body.add(steer), jbTire(fspin, M, S.RF, 0.34, 0.33, sx, 18));
    let ff = new Ts(S.RF + 0.08, S.RF + 0.08, 0.4, 18, 1, !0, 0.35, Math.PI - 0.7);
    (ff.rotateZ(Math.PI / 2), $(ff, blackS, steer, 0, 0, 0), $(fE(0.04, 0.05, 0.3), M.black, steer, -sx * 0.2, 0.45, 0));
    wheels.push({ spin: fspin, steer: steer, front: !0 });
  }
  // ---------------- front loader ----------------
  let armG = new Lr();
  (armG.position.set(0, S.LP.y, S.LP.z), body.add(armG));
  let armProf = jbBand([[-0.08, 0], [0.9, 0.12], [1.9, 0.1], [2.72, 0]], 0.13, 0.1);
  for (let sx of [1, -1])
    ($(hE(armProf, 0.13, 0.02), M.paint, armG, sx * 0.62, 0, 0),
      $(mE(0.07, 0.2, 14), M.steel, armG, sx * 0.62, 0, 0),
      $(mE(0.06, 0.2, 14), M.steel, armG, sx * 0.62, 0, S.LA_LEN),
      $(pE(0.15, 0.08, 0.22, 0.02), M.paintDark, armG, sx * 0.62, 0.21, 0.3),
      $(pE(0.15, 0.08, 0.2, 0.02), M.paintDark, armG, sx * 0.62, -0.14, 1.2));
  ($(mE(0.075, 1.24, 16), M.paint, armG, 0, 0.08, 2.56), jbMerge(armG));
  // towers the arms pivot on
  let lb = new Lr();
  body.add(lb);
  let lbProf = jbShell([[0.26, 0.48], [0.13, 0.35], [0.06, 0.12], [0.07, -0.12], [0.15, -0.31], [0.3, -0.4], [0.6, -0.42], [0.94, -0.4]], 0.035),
    LW = S.LHALF * 2;
  $(hE(lbProf.shell, LW, 0.008), M.black, lb);
  for (let sx of [1, -1]) $(hE(lbProf.curve, 0.03, 0.006), M.black, lb, sx * (S.LHALF - 0.015), 0, 0);
  ($(fE(LW + 0.02, 0.03, 0.14), M.steel, lb, 0, -0.405, 0.9),
    $(fE(LW, 0.07, 0.08), M.black, lb, 0, 0.5, 0.26));
  for (let sx of [1, -1])
    for (let o of [-0.08, 0.08])
      ($(pE(0.03, 0.32, 0.24, 0.01), M.black, lb, sx * 0.62 + o, 0.12, 0.08),
        $(pE(0.03, 0.2, 0.16, 0.01), M.black, lb, sx * 0.62 + o, 0.56, 0.08));
  jbMerge(lb);
  let blob = (r) => {
      let g = new Zc(r, 2),
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let v = sE(p.getX(i), p.getY(i), p.getZ(i)),
          k = 1 + 0.16 * Math.sin(v.x * 23 + v.y * 11) * Math.cos(v.z * 19 - v.y * 7) + 0.07 * Math.sin(v.x * 51 + v.z * 37);
        (v.multiplyScalar(k), p.setXYZ(i, v.x, v.y, v.z));
      }
      return (g.computeVertexNormals(), g);
    },
    lHeap = $(blob(0.5), M.soil, lb, 0, -0.18, 0.45);
  lHeap.userData.keep = !0;
  let liftRams = [1, -1].map((sx) => ({ sx: sx, r: OE(M, body, 0.065, 0.04, 0.85) })),
    tiltRams = [1, -1].map((sx) => ({ sx: sx, r: OE(M, body, 0.06, 0.035, 1.05) }));
  // ---------------- backhoe ----------------
  let swingG = new Lr();
  (swingG.position.set(0, S.K.y, S.K.z), body.add(swingG));
  ($(pE(0.46, 0.72, 0.4, 0.06), M.paint, swingG, 0, 0.02, 0.06),
    $(mE(0.07, 0.56, 14), M.steel, swingG, 0, S.BOOT.y, S.BOOT.z),
    $(new Ts(0.07, 0.07, 0.86, 14), M.steel, swingG, 0, 0.02, -0.08),
    $(pE(0.3, 0.16, 0.24, 0.03), M.paintDark, swingG, 0, -0.32, 0.26),
    jbMerge(swingG));
  let boomG = new Lr();
  (boomG.position.set(0, S.BOOT.y, S.BOOT.z), swingG.add(boomG));
  ($(hE(jbBand([[-0.14, 0], [0.5, 0.25], [1.15, 0.4], [1.8, 0.3], [2.45, 0]], 0.17, 0.11), 0.26, 0.02), M.paint, boomG),
    $(mE(0.065, 0.32, 14), M.steel, boomG, 0, 0, S.L1),
    $(pE(0.3, 0.1, 0.22, 0.02), M.paintDark, boomG, 0, 0.55, 0.62),
    $(pE(0.3, 0.1, 0.2, 0.02), M.paintDark, boomG, 0, -0.18, 1.1));
  for (let sx of [1, -1]) {
    let d = $(new el(0.62, 0.2), logo3, boomG, sx * 0.152, 0.33, 1.35);
    d.rotation.set(0, (sx * Math.PI) / 2, 0);
    vE([sE(sx * 0.1, 0.2, -0.05), sE(sx * 0.1, 0.5, 0.5), sE(sx * 0.1, 0.6, 1.15), sE(sx * 0.1, 0.45, 1.8), sE(sx * 0.12, 0.15, 2.4)], 0.018, M.hose, boomG);
  }
  jbMerge(boomG);
  let stickG = new Lr();
  (stickG.position.set(0, 0, S.L1), boomG.add(stickG));
  $(hE(gE([[-0.54, 0], [-0.46, -0.12], [0.2, -0.13], [1.5, -0.09], [1.87, -0.07], [1.92, 0.03], [1.83, 0.1], [0.6, 0.13], [0, 0.19], [-0.3, 0.26], [-0.5, 0.15]]), 0.2, 0.015), M.paint, stickG);
  ($(mE(0.05, 0.28, 12), M.steel, stickG, 0, 0, S.L2),
    $(mE(0.045, 0.26, 12), M.steel, stickG, 0, 0.04, -0.46),
    $(pE(0.15, 0.1, 0.16, 0.02), M.paintDark, stickG, 0, 0.25, -0.2));
  for (let sx of [1, -1]) vE([sE(sx * 0.09, 0.2, -0.35), sE(sx * 0.09, 0.16, 0.3), sE(sx * 0.09, 0.13, 0.9), sE(sx * 0.09, 0.1, 1.4)], 0.014, M.hose, stickG);
  jbMerge(stickG);
  let link = $(fE(0.05, 1, 0.05), M.steel, stickG);
  link.userData.keep = !0;
  let bkG = new Lr();
  (bkG.position.set(0, 0, S.L2), stickG.add(bkG));
  let BW = S.BHALF * 2,
    bE = [[-0.05, 0.13], [0.11, 0.33], [0.39, 0.41], [0.62, 0.32], [0.77, 0.14], [0.82, -0.01]].map(([a, b]) => [a * 1.0, b * 1.0]),
    bs = jbShell(bE, 0.028);
  $(hE(bs.shell, BW, 0.006), M.black, bkG);
  let side = [[0, -0.1], ...bE];
  for (let sx of [1, -1]) $(hE(side, 0.02, 0.004), M.black, bkG, sx * (BW / 2 - 0.01), 0, 0);
  $(fE(BW + 0.02, 0.025, 0.09), M.steel, bkG, 0, -0.005, 0.79);
  for (let i = 0; i < 5; i++)
    $(new Es(0.032, 0.13, 4).rotateX(Math.PI / 2), M.steel, bkG, -BW / 2 + 0.06 + (i * (BW - 0.12)) / 4, -0.005, 0.88).scale.set(1, 0.6, 1);
  for (let sx of [1, -1]) $(pE(0.025, 0.22, 0.28, 0.01), M.black, bkG, sx * 0.1, 0.13, 0);
  ($(mE(0.04, 0.26, 10), M.steel, bkG, 0, 0.26, -0.06), jbMerge(bkG));
  let bHeap = $(blob(0.3), M.soil, bkG, 0, 0.12, 0.4);
  bHeap.userData.keep = !0;
  let boomRam = OE(M, swingG, 0.08, 0.045, 0.75),
    stickRam = OE(M, swingG, 0.065, 0.035, 0.8),
    bucketRam = OE(M, swingG, 0.055, 0.03, 0.7),
    swingRams = [1, -1].map((sx) => ({ sx: sx, r: OE(M, body, 0.05, 0.028, 0.32) })),
    oe = (e0, t0, ang, along, perp) =>
      sE(0, S.BOOT.y + t0 + along * Math.sin(ang) + perp * Math.cos(ang), S.BOOT.z + e0 + along * Math.cos(ang) - perp * Math.sin(ang));
  // stabiliser legs (slide down out of the yellow housings)
  let stabs = [1, -1].map((sx) => {
    let leg = new Lr();
    (leg.position.set(sx * 1.02, 0.86, -1.38), body.add(leg));
    let inner = $(pE(0.11, 0.8, 0.14, 0.02), M.black, leg, 0, -0.05, 0),
      pad = $(pE(0.38, 0.06, 0.34, 0.02), M.black, leg, sx * 0.04, -0.46, 0);
    return { sx: sx, leg: leg, inner: inner, pad: pad };
  });
  // ---------------- swivel seat with backhoe joysticks ----------------
  let seatG = new Lr();
  (seatG.position.set(0, cy0 + 0.04, -0.1), body.add(seatG));
  ($(new Ts(0.07, 0.1, 0.24, 14), M.steel, seatG, 0, 0.12, 0),
    $(pE(0.44, 0.04, 0.4, 0.01), M.black, seatG, 0, 0.24, 0),
    $(pE(0.5, 0.13, 0.5, 0.05), fabric, seatG, 0, 0.32, 0.03),
    $(pE(0.36, 0.02, 0.36, 0.01), fabricL, seatG, 0, 0.39, 0.04));
  let back = new Lr();
  ((back.position.set(0, 0.36, -0.2), (back.rotation.x = -0.14)), seatG.add(back));
  ($(pE(0.5, 0.64, 0.13, 0.05), fabric, back, 0, 0.32, 0),
    $(pE(0.34, 0.46, 0.02, 0.01), fabricL, back, 0, 0.3, 0.066),
    $(pE(0.3, 0.16, 0.11, 0.04), fabric, back, 0, 0.78, -0.01),
    $(fE(0.02, 0.1, 0.02), M.steel, back, 0.08, 0.66, -0.01),
    $(fE(0.02, 0.1, 0.02), M.steel, back, -0.08, 0.66, -0.01));
  for (let sx of [1, -1])
    ($(pE(0.1, 0.07, 0.36, 0.03), plastic, seatG, sx * 0.31, 0.5, 0.0),
      $(pE(0.12, 0.12, 0.2, 0.03), plastic, seatG, sx * 0.31, 0.5, 0.18),
      $(fE(0.04, 0.25, 0.04), M.steel, seatG, sx * 0.31, 0.36, 0.0));
  jbMerge(back);
  jbMerge(seatG);
  let sticks = [1, -1].map((sx) => {
    let g = new Lr();
    (g.position.set(sx * 0.31, 0.57, 0.2), seatG.add(g));
    ($(new Ts(0.008, 0.011, 0.11, 8), M.steel, g, 0, 0.055, 0),
      $(pE(0.045, 0.1, 0.05, 0.02), M.black, g, 0, 0.14, 0),
      $(fE(0.012, 0.012, 0.012), M.amber, g, 0, 0.19, 0.012));
    return g;
  });
  let eye = sE(0, 0.98, 0.1);
  // steering wheel
  let wheelG = new Lr();
  ((wheelG.position.set(0, cy0 + 0.72, 0.52), (wheelG.rotation.x = -2.25)), body.add(wheelG));
  let leather = new Cl({ color: `#16171a`, roughness: 0.6 }),
    col = $(new Ts(0.025, 0.035, 0.26, 14), plastic, wheelG);
  ((col.rotation.x = Math.PI / 2), (col.position.z = -0.14));
  let wheelSpin = new Lr();
  wheelG.add(wheelSpin);
  ($(new ol(0.17, 0.017, 12, 48), leather, wheelSpin),
    $(new Ts(0.052, 0.058, 0.035, 24).rotateX(Math.PI / 2), leather, wheelSpin, 0, 0, 0.01));
  let hub = $(new ws(0.04, 24), logo, wheelSpin, 0, 0, 0.029);
  hub.scale.set(1.2, 0.6, 1);
  for (let a of [0, Math.PI, -Math.PI / 2]) {
    let sp = $(fE(0.12, 0.032, 0.014), leather, wheelSpin, Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.004);
    sp.rotation.z = a;
  }
  ($(new Ts(0.008, 0.008, 0.05, 8).rotateX(Math.PI / 2), M.chrome, wheelSpin, 0.12, 0.12, 0.03),
    $(new il(0.022, 12, 10), M.black, wheelSpin, 0.12, 0.12, 0.06));
  let shuttle = $(new Ts(0.006, 0.006, 0.12, 6), plastic, wheelG, 0.09, 0.02, -0.08);
  shuttle.rotation.z = Math.PI / 2;
  // loader lever on the right console
  let lLever = new Lr();
  (lLever.position.set(-0.6, cy0 + 0.47, 0.5), body.add(lLever));
  ($(new Ts(0.008, 0.01, 0.16, 8), M.steel, lLever, 0, 0.08, 0), $(new il(0.028, 12, 10), M.black, lLever, 0, 0.17, 0));
  // work lights (follow the seat: front for the loader, rear for the backhoe)
  let spot = new Ru(`#fff4dd`, 0, 45, 0.85, 0.5, 1.3);
  (spot.position.set(0, cy1 + 0.05, cz1), spot.target.position.set(0, -1.5, 8), body.add(spot, spot.target));
  // ---------------- per-frame update ----------------
  let dashT = 0,
    bounce = 0,
    bv = 0,
    tv = new G(),
    tv2 = new G();
  return {
    root: root,
    seat: seatG,
    eye: eye,
    exhaust: exhaust,
    update: (st, ui, time, dt, active) => {
      let vib = st.running ? Math.sin(time * 58) * 0.0012 + Math.sin(time * 33) * 8e-4 : 0;
      ((bv += (150 * (vib * (1 + st.eload) - bounce) - 18 * bv) * dt),
        (bounce += bv * dt),
        root.position.set(st.x, st.y + bounce, st.z),
        root.rotation.set(-st.pitch, st.yaw, st.roll + vib * 0.3, `YXZ`),
        root.updateMatrixWorld(!0));
      for (let w of wheels)
        ((w.spin.rotation.x = w.front ? (st.wheelA * S.RR) / S.RF : st.wheelA), w.front && (w.steer.rotation.y = -st.steer));
      wheelSpin.rotation.z = st.steer * 6;
      // loader
      let L = jbLoaderFK(st);
      ((armG.rotation.x = -L.a), lb.position.set(0, L.py, L.pz), (lb.rotation.x = -st.tilt.p));
      let armPt = (along, perp, x) =>
          sE(x, S.LP.y + along * Math.sin(L.a) + perp * Math.cos(L.a), S.LP.z + along * Math.cos(L.a) - perp * Math.sin(L.a)),
        bkPt = (ly, lz, x) => sE(x, L.py + ly * L.c + lz * L.s, L.pz - ly * L.s + lz * L.c);
      for (let r of liftRams) kE(r.r, sE(r.sx * 0.62, 0.95, 1.12), armPt(1.2, -0.17, r.sx * 0.62));
      for (let r of tiltRams) kE(r.r, armPt(0.3, 0.27, r.sx * 0.62), bkPt(0.56, 0.08, r.sx * 0.62));
      let lf = CC(st.lLoad / S.LCAP, 0, 1.05),
        lc = Math.cbrt(lf);
      ((lHeap.visible = lf > 0.01),
        lHeap.scale.set(2.05 * Math.max(0.4, lc), 0.5 * lc, 0.72 * Math.max(0.5, lc)),
        lHeap.position.set(0, wC(-0.3, -0.15, lc), 0.46));
      // backhoe
      let F = jbFK(st);
      ((swingG.rotation.y = Math.PI + st.j.swing.p),
        (boomG.rotation.x = -F.t1),
        (stickG.rotation.x = -st.j.stick.p),
        (bkG.rotation.x = -st.j.bucket.p));
      let b0 = JBS.L1 * Math.cos(F.t1),
        b1 = JBS.L1 * Math.sin(F.t1),
        c0 = b0 + JBS.L2 * Math.cos(F.t2),
        c1 = b1 + JBS.L2 * Math.sin(F.t2);
      (kE(boomRam, sE(0, -0.32, 0.3), oe(0, 0, F.t1, 1.1, -0.2)),
        kE(stickRam, oe(0, 0, F.t1, 0.62, 0.6), oe(b0, b1, F.t2, -0.46, 0.04)));
      let O = oe(c0, c1, F.t3, -0.06, 0.26);
      kE(bucketRam, oe(b0, b1, F.t2, -0.2, 0.25), O);
      {
        let e = Math.cos(F.t2),
          t = Math.sin(F.t2),
          n = O.z - S.BOOT.z - b0,
          r = O.y - S.BOOT.y - b1;
        yE(link, sE(0, 0.1, S.L2 - 0.22), sE(0, -n * t + r * e, n * e + r * t));
      }
      for (let r of swingRams) {
        let a = Math.PI + st.j.swing.p,
          lx = r.sx * 0.22,
          lz = -0.12;
        kE(r.r, sE(r.sx * 0.55, 1.0, -1.15), sE(lx * Math.cos(a) + lz * Math.sin(a), S.K.y - 0.05, S.K.z - lx * Math.sin(a) + lz * Math.cos(a)));
      }
      let bf = CC(st.bLoad / S.BCAP, 0, 1.05),
        bc = Math.cbrt(bf);
      ((bHeap.visible = bf > 0.01),
        bHeap.scale.set(0.9 * Math.max(0.35, bc), 0.62 * bc, 0.95 * Math.max(0.4, bc)),
        bHeap.position.set(0, wC(0.22, 0.06, bc), wC(0.42, 0.37, bc)));
      // stabilisers reach the ground
      for (let s of stabs) {
        let p = body.localToWorld(tv.set(s.sx * 1.06, 0.4, -1.38)),
          ext = st.stab * CC(p.y - nw(p.x, p.z) + 0.02, 0, 1);
        ((s.inner.position.y = -0.05 - ext), (s.pad.position.y = -0.46 - ext));
      }
      // seat swivel + joysticks
      let sm = st.seat * st.seat * (3 - 2 * st.seat);
      seatG.rotation.y = sm * Math.PI;
      (sticks[0].rotation.set(st.j.stick.v * 0.35, 0, -st.j.swing.v * 0.4),
        sticks[1].rotation.set(-st.j.boom.v * 0.5, 0, st.j.bucket.v * 0.25),
        lLever.rotation.set(-st.lift.v * 0.9, 0, st.tilt.v * 0.3));
      // lights
      let lit = active && (ui.work || ui.head);
      ((M.lens.emissiveIntensity = lit ? 3 : 0), (spot.intensity = lit ? 60 : 0));
      let rearL = st.seat > 0.5;
      (spot.position.set(0, cy1 + 0.05, rearL ? cz0 : cz1), spot.target.position.set(0, -1.5, rearL ? -8 : 8));
      let bc2 = active && ui.beacon ? (Math.sin(time * 9) > 0 ? 1 : 0.15) : 0;
      ((M.amber.emissiveIntensity = bc2 * 4), (red.emissiveIntensity = st.running ? 0.6 : 0.15));
      ((dashT += dt), active && ui.cam === 1 && dashT > 0.15 && ((dashT = 0), jbDrawDash(dash, st)));
    },
  };
}
