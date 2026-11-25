// ---------- Motor Grader (MG 140 G) visuals & roadwork zone markers (procedural, metres, machine frame) ----------
function grUse() {
  return (0, y.useMemo)(() => grBuild(), []);
}

function grDashCanvas() {
  let cv = document.createElement(`canvas`);
  cv.width = 384;
  cv.height = 192;
  let tex = new _s(cv);
  tex.colorSpace = yt;
  return { cv, ctx: cv.getContext(`2d`), tex };
}

function grDrawDash(d, st) {
  let c = d.ctx;
  c.fillStyle = `#121519`;
  c.fillRect(0, 0, 384, 192);
  let cx = 92,
    cy = 100,
    a0 = Math.PI * 0.75,
    span = Math.PI * 1.5;
  c.fillStyle = `#07090b`;
  c.beginPath();
  c.arc(cx, cy, 76, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = `#4b5159`;
  c.lineWidth = 4;
  c.stroke();
  for (let i = 0; i <= 8; i++) {
    let a = a0 + (span * i) / 8;
    c.strokeStyle = `#e6e8ea`;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
    c.lineTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
    c.stroke();
  }
  let sp = Math.abs(st.v) * 3.6,
    a = a0 + span * CC(sp / 40, 0, 1);
  c.strokeStyle = `#ff6a13`;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62);
  c.stroke();
  c.fillStyle = `#f4f6f8`;
  c.font = `700 28px 'Barlow Condensed', Arial, sans-serif`;
  c.textAlign = `center`;
  c.fillText(`${Math.round(sp)}`, cx, cy + 44);
  c.fillStyle = `#8f98a3`;
  c.font = `600 14px Arial`;
  c.fillText(`km/h`, cx, cy + 60);

  // RPM bar + grader telemetry
  let rf = CC(st.rpm / 2300, 0, 1);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = i / 12 < rf ? (i > 9 ? `#ff3b2f` : i > 7 ? `#ffb020` : `#3ddc6c`) : `#23272c`;
    c.fillRect(194 + i * 15, 20, 11, 20);
  }
  c.textAlign = `left`;
  c.fillStyle = `#f4b400`;
  c.font = `800 22px 'Barlow Condensed', Arial, sans-serif`;
  c.fillText(`MG 140 G`, 194, 70);
  c.fillStyle = `#d6dade`;
  c.font = `600 17px 'Barlow Condensed', Arial, sans-serif`;
  c.fillText(`Blade  ${(st.bladeH * 100).toFixed(0)} cm`, 194, 100);
  c.fillText(`Angle  ${Math.round((st.bladeAng * 180) / Math.PI)}°`, 194, 124);
  c.fillText(`Graded ${Math.round(st.gradedM2)} m²`, 194, 148);
  c.fillStyle = st.running ? `#3ddc6c` : `#ff3b2f`;
  c.fillText(st.running ? `● ENGINE` : `● OFF`, 194, 176);
  if (st.ripper > 0.3) {
    c.fillStyle = `#ffb020`;
    c.fillText(`▼ RIPPER`, 292, 176);
  }
  d.tex.needsUpdate = !0;
}

function grConeTex() {
  let cv = document.createElement(`canvas`);
  cv.width = 64;
  cv.height = 128;
  let c = cv.getContext(`2d`);
  c.fillStyle = `#e85c17`;
  c.fillRect(0, 0, 64, 128);
  c.fillStyle = `#f4f4f2`;
  c.fillRect(0, 34, 64, 24);
  c.fillRect(0, 76, 64, 20);
  let tex = new _s(cv);
  tex.colorSpace = yt;
  tex.needsUpdate = !0;
  return tex;
}

function grBarrierTex() {
  let cv = document.createElement(`canvas`);
  cv.width = 256;
  cv.height = 64;
  let c = cv.getContext(`2d`);
  c.fillStyle = `#f2b318`;
  c.fillRect(0, 0, 256, 64);
  c.fillStyle = `#1b1d20`;
  for (let x = -64; x < 320; x += 44) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + 22, 0);
    c.lineTo(x + 48, 64);
    c.lineTo(x + 26, 64);
    c.closePath();
    c.fill();
  }
  let tex = new _s(cv);
  tex.colorSpace = yt;
  tex.needsUpdate = !0;
  return tex;
}

function grBuildZones() {
  let root = new Lr(),
    mCone = new Cl({ map: grConeTex(), roughness: 0.45 }),
    mBase = new Cl({ color: `#1d1e20`, roughness: 0.85 }),
    mSign = new Cl({ map: grBarrierTex(), roughness: 0.5 }),
    mSteel = new Cl({ color: `#3b4046`, roughness: 0.5, metalness: 0.6 }),
    mAmber = new Cl({ color: `#ff9d00`, emissive: `#ff8800`, emissiveIntensity: 0.9, roughness: 0.2 }),
    coneGeo = new Ts(0.055, 0.21, 0.62, 12),
    baseGeo = new Ss(0.46, 0.05, 0.46),
    amberGlows = [];

  for (let zn of GR_ZONES) {
    let xs = [zn.x0 + 1, (zn.x0 + zn.x1) / 2, zn.x1 - 1];
    // Cones neatly along outer shoulders (safe clearance from center driving lane)
    for (let x of xs) {
      let zc = grZoneZ(zn, x),
        off = zn.halfW + 0.55;
      for (let s of [-1, 1]) {
        let wz = zc + s * off,
          wy = nw(x, wz);
        let b = $(baseGeo, mBase, root, x, wy + 0.025, wz);
        b.castShadow = !1;
        let co = $(coneGeo, mCone, root, x, wy + 0.34, wz);
        co.castShadow = !0;
      }
    }
    // End shoulder warning barriers + blinking amber beacons at zone start/end
    for (let ex of [zn.x0 - 1.2, zn.x1 + 1.2]) {
      let wz = grZoneZ(zn, ex) + zn.halfW + 1.05,
        wy = nw(ex, wz);
      let bg = new Lr();
      bg.position.set(ex, wy, wz);
      root.add(bg);
      $(fE(1.5, 0.28, 0.06), mSign, bg, 0, 0.72, 0);
      for (let lx of [-0.62, 0.62]) {
        $(fE(0.06, 0.95, 0.06), mSteel, bg, lx, 0.47, 0);
      }
      let lmp = $(new il(0.085, 10, 8), mAmber, bg, 0, 0.94, 0);
      lmp.castShadow = !1;
      amberGlows.push(lmp);
    }
  }
  return { root, amberGlows, mAmber };
}

function grBuild() {
  let M = lE(),
    root = new Lr(),
    body = new Lr();
  M.paint.color.set(`#f0ad18`);
  M.paintDark.color.set(`#d4930d`);
  root.add(body);

  let S = GRS,
    steelDark = new Cl({ color: `#23262a`, roughness: 0.48, metalness: 0.72 }),
    steelEdge = new Cl({ color: `#585d64`, roughness: 0.36, metalness: 0.85 }),
    plastic = new Cl({ color: `#34383e`, roughness: 0.78 }),
    plasticL = new Cl({ color: `#6b727a`, roughness: 0.8 }),
    fabric = new Cl({ color: `#282b2f`, roughness: 0.94 }),
    redLight = new Cl({ color: `#c41b12`, roughness: 0.3, emissive: `#ff2010`, emissiveIntensity: 0.15 }),
    glass = M.glass.clone();
  glass.opacity = 0.2;
  glass.color = new q(`#97b7bf`);

  let decalMG = jbDecal(`MG 140`, `G`),
    decalUnit = jbDecal(`YG-041`),
    decalChakir = jbDecal(`CHAKIR`);

  // ---------------- 1. Main Rear Frame + Gooseneck Arch + Front Nose Box ----------------
  // Rear longitudinal chassis rails
  for (let sx of [-1, 1]) {
    $(pE(0.18, 0.34, 3.3, 0.03), M.black, body, sx * 0.42, 0.86, -0.7);
  }
  // Rear counterweight / bumper & hitch plate
  $(pE(1.52, 0.46, 0.36, 0.04), M.paint, body, 0, 0.92, -2.36);
  $(pE(1.4, 0.16, 0.12, 0.02), steelDark, body, 0, 0.72, -2.52);

  // Heavy arched Gooseneck Beam (side-extruded swept profile along +Z)
  let neckProf = [
    [-0.2, 0.95],
    [0.65, 1.0],
    [1.25, 1.48],
    [2.15, 1.56],
    [3.65, 1.5],
    [4.45, 1.44],
    [4.7, 1.38],
    [4.7, 0.86],
    [4.28, 0.86],
    [4.12, 1.24],
    [2.2, 1.3],
    [1.35, 1.24],
    [0.7, 0.76],
    [-0.2, 0.72],
  ];
  $(hE(neckProf, 0.38, 0.02), M.paint, body);

  // Vertical tall Front Nose Box over front axle (signature Photo 1 & 2 look)
  $(pE(0.54, 1.15, 0.56, 0.035), M.paint, body, 0, 1.16, S.FRONT_Z + 0.02);
  $(pE(0.46, 0.22, 0.48, 0.02), steelDark, body, 0, 0.58, S.FRONT_Z + 0.02);
  $(pE(0.62, 0.14, 0.22, 0.02), steelDark, body, 0, 0.82, S.FRONT_Z + 0.3);

  // Gooseneck decals
  for (let sx of [-1, 1]) {
    let d1 = $(new el(0.76, 0.22), decalMG, body, sx * 0.195, 1.41, 2.75);
    d1.rotation.y = (sx * Math.PI) / 2;
    let d2 = $(new el(0.52, 0.17), decalUnit, body, sx * 0.195, 1.39, 3.85);
    d2.rotation.y = (sx * Math.PI) / 2;
  }

  // Twin Front Headlight Pods on brackets above front arch
  for (let sx of [-1, 1]) {
    $(pE(0.06, 0.2, 0.06, 0.01), M.black, body, sx * 0.38, 1.62, 4.18);
    $(fE(0.28, 0.05, 0.06), M.black, body, sx * 0.25, 1.54, 4.18);
    $(pE(0.18, 0.12, 0.11, 0.02), M.black, body, sx * 0.38, 1.74, 4.2);
    $(fE(0.13, 0.08, 0.015), M.lens, body, sx * 0.38, 1.74, 4.258);
  }

  // Cross Saddle Bar for twin vertical blade lift cylinders
  $(pE(1.38, 0.2, 0.28, 0.03), M.paint, body, 0, 1.56, 2.08);
  for (let sx of [-1, 1]) {
    $(pE(0.18, 0.24, 0.3, 0.02), M.paintDark, body, sx * 0.68, 1.62, 2.08);
  }

  // ---------------- 2. Front Axle & 2 Steerable / Leaning Front Wheels ----------------
  let frontAxleG = new Lr();
  frontAxleG.position.set(0, S.RF, S.FRONT_Z);
  body.add(frontAxleG);
  $(pE(1.88, 0.14, 0.18, 0.02), steelDark, frontAxleG, 0, -0.02, 0);
  $(mE(0.045, 1.65, 10), M.steel, frontAxleG, 0, -0.06, -0.14);

  let frontWheels = [-1, 1].map((sx) => {
    let steer = new Lr();
    steer.position.set(sx * S.TRACK_F, S.RF, S.FRONT_Z);
    body.add(steer);
    let lean = new Lr();
    steer.add(lean);
    let spin = new Lr();
    lean.add(spin);
    grTire(spin, M, S.RF, 0.35, 0.36, sx, 14);
    return { sx, steer, lean, spin };
  });

  // ---------------- 3. Tandem Bogie Housings & 4 Rear Drive Wheels ----------------
  let tandemGs = [-1, 1].map((sx) => {
    let tg = new Lr();
    tg.position.set(sx * 0.8, S.RR, 0);
    body.add(tg);
    // Heavy yellow enclosed chain bogie case
    $(pE(0.32, 0.36, 1.92, 0.04), M.paint, tg, 0, -0.02, 0);
    $(mE(0.18, 0.34, 16), M.black, tg, 0, 0, 0);
    let rw = [-1, 1].map((sz) => {
      let wg = new Lr();
      wg.position.set(sx * 0.26, 0, sz * S.TANDEM_OFF);
      tg.add(wg);
      grTire(wg, M, S.RR, 0.42, 0.37, sx, 16);
      return wg;
    });
    return { tg, rw };
  });
  // Rear differential axle beam
  $(mE(0.14, 1.68, 16), steelDark, body, 0, S.RR, 0);

  // ---------------- 4. Drawbar, Turntable Circle & Curved Moldboard Blade ----------------
  let bladeAssembly = new Lr();
  bladeAssembly.position.set(0, 0.48, S.BLADE_Z);
  body.add(bladeAssembly);

  // A-frame drawbar extending forward from circle to front nose ball-joint
  let drawbarG = new Lr();
  bladeAssembly.add(drawbarG);
  for (let sx of [-1, 1]) {
    let arm = $(pE(0.14, 0.14, 2.05, 0.02), M.paint, drawbarG, sx * 0.38, 0.14, 0.95);
    arm.rotation.y = sx * 0.34;
  }
  $(pE(1.38, 0.12, 0.16, 0.02), M.paintDark, drawbarG, 0, 0.14, 0);
  $(new Ts(0.68, 0.68, 0.13, 24), steelDark, drawbarG, 0, 0.1, 0);

  // Rotating Turntable Circle + Moldboard Blade
  let bladeYawG = new Lr();
  bladeAssembly.add(bladeYawG);
  // Circle ring & pinion
  $(new Ts(0.64, 0.64, 0.1, 24), M.paintDark, bladeYawG, 0, 0.04, 0);
  $(pE(0.3, 0.14, 0.24, 0.02), M.black, bladeYawG, 0, 0.14, 0.38);
  // Two curved vertical support brackets holding the moldboard
  for (let sx of [-1, 1]) {
    $(pE(0.12, 0.38, 0.28, 0.02), M.paint, bladeYawG, sx * 0.62, -0.14, 0.02);
  }
  $(pE(2.8, 0.1, 0.12, 0.02), steelDark, bladeYawG, 0, -0.1, -0.06);

  // Curved Steel Moldboard Blade (3.5m wide, C-profile facing +Z)
  let BW = S.BLADE_HALF * 2,
    mbProf = jbShell(
      [
        [-0.08, 0.22],
        [0.08, 0.06],
        [0.14, -0.14],
        [0.1, -0.34],
        [0.02, -0.48],
      ],
      0.04,
      18,
    );
  $(hE(mbProf.shell, BW, 0.008), steelDark, bladeYawG);
  // Replaceable hardened silver bottom cutting edge
  $(fE(BW + 0.02, 0.09, 0.03), steelEdge, bladeYawG, 0, -0.46, 0.02);
  // Side end-bits
  for (let sx of [-1, 1]) {
    $(pE(0.04, 0.56, 0.26, 0.01), steelEdge, bladeYawG, sx * (S.BLADE_HALF - 0.01), -0.16, 0.04);
  }
  // Dynamic Spoil Windrow Mesh sliding along the blade face when cutting/leveling
  let spoilMat = M.soil.clone(),
    spoilBlob = $(new Zc(0.28, 1), spoilMat, bladeYawG, 0, -0.32, 0.26);
  spoilBlob.scale.set(2.2, 0.5, 0.8);
  spoilBlob.visible = !1;
  spoilBlob.userData.keep = !0;

  // Hydraulic lift rams (gooseneck saddle -> circle brackets) + side-shift link ram
  let bladeRams = [-1, 1].map((sx) => ({ sx, r: OE(M, body, 0.062, 0.034, 0.82) })),
    sideRam = OE(M, body, 0.052, 0.03, 0.72);

  // ---------------- 5. High-Visibility Glazed Cab & Interior (Photo 4) ----------------
  let cy0 = 1.42,
    cy1 = 2.94,
    ch = cy1 - cy0,
    cz0 = -0.25,
    cz1 = 0.98,
    cw = 0.76;

  // Cab floor deck + lower nose window skirt
  $(pE(1.56, 0.14, 1.32, 0.03), M.black, body, 0, cy0 - 0.02, 0.36);
  $(pE(1.66, 0.14, 1.42, 0.05), M.black, body, 0, cy1 + 0.05, 0.36);
  $(pE(1.48, 0.07, 1.24, 0.04), M.paint, body, 0, cy1 + 0.14, 0.34);

  // Cab corner pillars
  for (let [px, pz] of [
    [cw, cz1],
    [-cw, cz1],
    [cw, cz0],
    [-cw, cz0],
    [cw, 0.36],
    [-cw, 0.36],
  ]) {
    $(pE(0.068, ch, 0.068, 0.015), M.black, body, px, cy0 + ch / 2, pz);
  }
  // Cab side waist rails
  for (let sx of [-1, 1]) {
    $(fE(0.04, 0.05, 1.22), M.black, body, sx * cw, cy0 + 0.36, 0.36);
    // Access steps & hand rails
    $(fE(0.28, 0.03, 0.24), M.steel, body, sx * 0.92, 0.62, 0.42);
    $(fE(0.28, 0.03, 0.24), M.steel, body, sx * 0.92, 1.02, 0.42);
    $(fE(0.035, 0.62, 0.035), M.black, body, sx * 1.04, 0.85, 0.42);
  }

  let addPane = (w, h, x, yy, z, ry) => {
    let p = $(new el(w, h), glass, body, x, yy, z);
    p.rotation.y = ry;
    p.castShadow = !1;
    return p;
  };
  addPane(1.44, ch, 0, cy0 + ch / 2, cz1 + 0.01, 0);
  addPane(1.44, ch, 0, cy0 + ch / 2, cz0 - 0.01, Math.PI);
  addPane(1.18, ch, cw + 0.01, cy0 + ch / 2, 0.36, Math.PI / 2);
  addPane(1.18, ch, -cw - 0.01, cy0 + ch / 2, 0.36, -Math.PI / 2);

  // Front windshield wiper, side mirrors, cab work lights & roof beacon
  let wiper = $(fE(0.014, 0.8, 0.014), M.black, body, 0.08, cy0 + 0.68, cz1 + 0.03);
  wiper.rotation.z = 0.35;
  for (let sx of [-1, 1]) {
    let arm = $(new Ts(0.014, 0.014, 0.44, 6), M.black, body, sx * (cw + 0.2), 2.52, cz1 + 0.06);
    arm.rotation.z = (sx * Math.PI) / 2.2;
    $(pE(0.05, 0.34, 0.16, 0.02), M.black, body, sx * (cw + 0.38), 2.48, cz1 + 0.08);
  }
  for (let lx of [-0.56, -0.2, 0.2, 0.56]) {
    $(new Ts(0.06, 0.06, 0.08, 12).rotateX(Math.PI / 2), M.black, body, lx, cy1 + 0.02, cz1 + 0.08);
    $(new ws(0.048, 12), M.lens, body, lx, cy1 + 0.02, cz1 + 0.122);
  }
  for (let lx of [-0.48, 0.48]) {
    $(new Ts(0.06, 0.06, 0.08, 12).rotateX(Math.PI / 2), M.black, body, lx, cy1 + 0.02, cz0 - 0.08);
    $(new ws(0.048, 12), M.lens, body, lx, cy1 + 0.02, cz0 - 0.122).rotation.y = Math.PI;
  }
  $(new Ts(0.06, 0.075, 0.13, 12), M.amber, body, 0.48, cy1 + 0.24, 0.1);
  $(new Ts(0.075, 0.075, 0.03, 12), M.black, body, 0.48, cy1 + 0.17, 0.1);

  // Cab interior: narrow central steering console (Photo 4) + live dash + twin side joysticks
  $(fE(1.4, 0.02, 1.15), M.rubber, body, 0, cy0 + 0.05, 0.36);
  $(fE(1.4, 0.02, 1.15), plasticL, body, 0, cy1 - 0.03, 0.36);
  // Operator seat
  $(pE(0.48, 0.12, 0.48, 0.04), fabric, body, 0, cy0 + 0.34, 0.16);
  let seatBack = $(pE(0.46, 0.62, 0.12, 0.04), fabric, body, 0, cy0 + 0.66, -0.05);
  seatBack.rotation.x = -0.14;
  // Narrow central steering pedestal
  let ped = $(pE(0.26, 0.72, 0.24, 0.03), plastic, body, 0, cy0 + 0.4, 0.78);
  ped.rotation.x = -0.22;
  let dash = grDashCanvas(),
    dashScreen = $(new el(0.22, 0.11), new Cl({ map: dash.tex, emissive: `#ffffff`, emissiveMap: dash.tex, emissiveIntensity: 0.45, roughness: 0.3 }), body, 0, cy0 + 0.78, 0.71);
  dashScreen.rotation.x = -0.35;
  dashScreen.rotation.y = Math.PI;
  let wheelSpin = new Lr();
  wheelSpin.position.set(0, cy0 + 0.78, 0.64);
  wheelSpin.rotation.x = -2.28;
  body.add(wheelSpin);
  $(new ol(0.15, 0.016, 10, 32), plastic, wheelSpin);
  for (let a of [0, Math.PI, -Math.PI / 2]) {
    let sp = $(fE(0.11, 0.028, 0.014), plastic, wheelSpin, Math.cos(a) * 0.095, Math.sin(a) * 0.095, 0.004);
    sp.rotation.z = a;
  }
  // Twin left & right grader blade joysticks
  let grSticks = [-1, 1].map((sx) => {
    $(pE(0.12, 0.24, 0.26, 0.02), plastic, body, sx * 0.34, cy0 + 0.44, 0.34);
    let jg = new Lr();
    jg.position.set(sx * 0.34, cy0 + 0.56, 0.38);
    body.add(jg);
    $(new Ts(0.009, 0.012, 0.14, 8), M.steel, jg, 0, 0.07, 0);
    $(pE(0.045, 0.09, 0.05, 0.015), M.black, jg, 0, 0.15, 0);
    return jg;
  });
  let eye = sE(0, cy0 + 1.18, 0.28);

  // ---------------- 6. Rear Engine Hood, Grilles, Exhaust & Tail Lights ----------------
  let hoodProf = [
    [-0.25, 1.15],
    [-2.24, 1.15],
    [-2.28, 1.55],
    [-2.22, 2.08],
    [-2.05, 2.2],
    [-0.35, 2.24],
    [-0.25, 2.2],
  ];
  $(hE(hoodProf, 1.24, 0.04), M.paint, body);
  // Slatted black rear radiator grille
  $(fE(0.92, 0.72, 0.04), M.black, body, 0, 1.66, -2.28);
  for (let i = 0; i < 8; i++) {
    $(fE(0.86, 0.024, 0.025), steelDark, body, 0, 1.35 + i * 0.088, -2.305);
  }
  // Side cooling louvers + CHAKIR decals + grab rails
  for (let sx of [-1, 1]) {
    $(pE(0.03, 0.56, 0.85, 0.01), M.black, body, sx * 0.625, 1.82, -1.25);
    let dC = $(new el(0.68, 0.22), decalChakir, body, sx * 0.635, 1.4, -1.15);
    dC.rotation.y = (sx * Math.PI) / 2;
    $(new Ts(0.018, 0.018, 0.55, 8), M.black, body, sx * 0.65, 1.84, -0.58);
    // Vertical stacked rear lights
    $(pE(0.08, 0.44, 0.08, 0.02), M.black, body, sx * 0.54, 1.82, -2.27);
    $(fE(0.055, 0.11, 0.02), redLight, body, sx * 0.54, 1.72, -2.312);
    $(fE(0.055, 0.11, 0.02), M.amber, body, sx * 0.54, 1.86, -2.312);
    $(fE(0.055, 0.08, 0.02), M.lens, body, sx * 0.54, 1.98, -2.312);
  }
  // Black angled exhaust stack & round pre-cleaner cap
  $(new Ts(0.06, 0.06, 0.95, 12), M.black, body, -0.22, 2.52, -0.68);
  let exTip = $(new Ts(0.055, 0.06, 0.26, 12), M.black, body, -0.22, 3.04, -0.74);
  exTip.rotation.x = -0.55;
  $(new Ts(0.11, 0.11, 0.16, 14), M.black, body, 0.22, 2.34, -0.68);
  let exhaust = sE(-0.22, 3.16, -0.82);

  // ---------------- 7. 5-Shank Rear Hydraulic Ripper / Scarifier (Photo 3) ----------------
  let ripperG = new Lr();
  ripperG.position.set(0, 0.85, -2.48);
  body.add(ripperG);
  // Wide heavy yellow tool bar
  $(pE(2.08, 0.22, 0.24, 0.025), M.paint, ripperG, 0, 0, -0.32);
  for (let sx of [-1, 1]) {
    // Parallel link bars
    $(pE(0.1, 0.1, 0.56, 0.015), M.paintDark, ripperG, sx * 0.52, 0.08, -0.05);
    $(pE(0.1, 0.1, 0.56, 0.015), M.paintDark, ripperG, sx * 0.52, -0.1, -0.05);
  }
  // 5 curved ripper shanks + forged dark steel chisel teeth
  let shankProf = [
    [-0.18, 0.06],
    [-0.36, 0.0],
    [-0.5, -0.14],
    [-0.58, -0.36],
    [-0.6, -0.56],
    [-0.48, -0.54],
    [-0.4, -0.3],
    [-0.28, -0.14],
    [-0.14, -0.08],
  ];
  for (let i = 0; i < 5; i++) {
    let sx = -0.88 + (i * 1.76) / 4;
    $(hE(shankProf, 0.075, 0.008), M.paint, ripperG, sx, 0.04, -0.12);
    $(new Es(0.052, 0.2, 4).rotateX(Math.PI * 0.72), steelDark, ripperG, sx, -0.58, -0.68).scale.set(0.85, 1, 1.3);
  }
  let ripperRams = [-1, 1].map((sx) => ({ sx, r: OE(M, body, 0.048, 0.026, 0.34) }));

  // Hydraulic hose loops on gooseneck & circle
  for (let sx of [-1, 1]) {
    vE([sE(sx * 0.16, 1.38, 1.15), sE(sx * 0.34, 1.48, 1.85), sE(sx * 0.45, 0.92, 2.2)], 0.016, M.hose, body);
  }
  jbMerge(body);

  // ---------------- 8. Vehicle Lighting (Headlamps, Work Lights, Roof Strobe) ----------------
  let headL = new Ru(`#fff4da`, 0, 48, 0.72, 0.5, 1.2),
    headR = new Ru(`#fff4da`, 0, 48, 0.72, 0.5, 1.2),
    workSpot = new Ru(`#fff6e2`, 0, 44, 0.95, 0.5, 1.3),
    beaconPt = new Bu(`#ff9900`, 0, 12, 2);
  headL.position.set(0.38, 1.74, 4.3);
  headL.target.position.set(0.38, 0.2, 20);
  headR.position.set(-0.38, 1.74, 4.3);
  headR.target.position.set(-0.38, 0.2, 20);
  workSpot.position.set(0, cy1 + 0.06, cz1 + 0.14);
  workSpot.target.position.set(0, 0, S.BLADE_Z + 1.4);
  beaconPt.position.set(0.48, cy1 + 0.35, 0.1);
  headL.visible = headR.visible = workSpot.visible = beaconPt.visible = !1;
  body.add(headL, headL.target, headR, headR.target, workSpot, workSpot.target, beaconPt);

  let zones = grBuildZones();

  // ---------------- 9. Per-Frame Update ----------------
  let dashT = 0,
    bounce = 0,
    bv = 0,
    tvA = new G(),
    tvB = new G(),
    tvC = new G();

  return {
    root,
    body,
    zonesRoot: zones.root,
    eye,
    exhaust,
    update: (st, ui, time, dt, active) => {
      let vib = st.running ? Math.sin(time * 54) * 0.001 + Math.sin(time * 31) * 7e-4 : 0;
      bv += (145 * (vib * (1 + st.eload) - bounce) - 18 * bv) * dt;
      bounce += bv * dt;
      root.position.set(st.x, st.y + bounce, st.z);
      root.rotation.set(-st.pitch, st.yaw, st.roll + vib * 0.25, `YXZ`);
      root.updateMatrixWorld(!0);

      // Front wheels steer + subtle grader camber lean
      let fSpin = (st.wheelA * S.RR) / S.RF;
      for (let w of frontWheels) {
        w.spin.rotation.x = fSpin;
        w.steer.rotation.y = -st.steer;
        w.lean.rotation.z = -st.steer * 0.22;
      }
      wheelSpin.rotation.z = st.steer * 6.2;

      // Tandem rear bogie articulation & 4 rear drive wheels
      for (let tg of tandemGs) {
        tg.tg.rotation.x = -st.tandemPitch;
        for (let rw of tg.rw) rw.rotation.x = st.wheelA;
      }

      // Moldboard blade height & horizontal rotation
      let bladeBaseY = 0.56 + st.bladeH * 0.85;
      bladeAssembly.position.set(0, bladeBaseY, S.BLADE_Z);
      bladeYawG.rotation.y = st.bladeAng;

      // Dynamic telescopic hydraulic lift & side-shift rams
      let cosA = Math.cos(st.bladeAng),
        sinA = Math.sin(st.bladeAng);
      for (let r of bladeRams) {
        tvA.set(r.sx * 0.68, 1.56, 2.08);
        tvB.set(r.sx * 0.62 * cosA, bladeBaseY + 0.08, S.BLADE_Z - r.sx * 0.62 * sinA);
        kE(r.r, tvA, tvB);
      }
      tvA.set(-0.22, 1.32, 2.25);
      tvB.set(0.32 * cosA, bladeBaseY + 0.08, S.BLADE_Z - 0.32 * sinA);
      kE(sideRam, tvA, tvB);

      // Soil spoil sliding along the curved blade face toward trailing tip
      let carryF = CC(st.bladeCarry / 0.45, 0, 1);
      spoilBlob.visible = carryF > 0.04;
      if (spoilBlob.visible) {
        let shiftX = st.castDir * 0.65 * Math.min(1, Math.abs(st.bladeAng) * 2 + 0.3);
        spoilBlob.position.set(shiftX, -0.34 + carryF * 0.08, 0.22);
        spoilBlob.scale.set(2.4 + carryF * 1.1, 0.35 + carryF * 0.55, 0.65 + carryF * 0.45);
        spoilMat.color.setHex(st.bladeMat === `gravel` ? 0x929699 : 0x5e432d);
      }

      // Rear 5-shank ripper raise/lower & twin hydraulic rams
      let ripY = 0.85 - st.ripper * 0.36;
      ripperG.position.set(0, ripY, -2.48);
      ripperG.rotation.x = st.ripper * 0.14;
      for (let r of ripperRams) {
        kE(r.r, tvA.set(r.sx * 0.52, 1.16, -2.38), tvB.set(r.sx * 0.52, ripY + 0.12, -2.72));
      }

      // Cab joysticks react to blade lift & blade angle input
      grSticks[0].rotation.x = st.bladeCmd * 0.28;
      grSticks[1].rotation.z = -st.angleCmd * 0.32;

      // Active vehicle lights & zone amber warning blinkers
      let lit = active && ui.head,
        wk = active && ui.work,
        bc = active && ui.beacon && Math.sin(time * 9) > 0;
      headL.visible = headR.visible = !!lit;
      headL.intensity = headR.intensity = lit ? 55 : 0;
      workSpot.visible = !!wk;
      workSpot.intensity = wk ? 48 : 0;
      beaconPt.visible = !!bc;
      beaconPt.intensity = bc ? 5.5 : 0;
      M.lens.emissiveIntensity = lit || wk ? 2.6 : 0;
      M.amber.emissiveIntensity = active && ui.beacon ? (bc ? 3.5 : 0.2) : 0;
      redLight.emissiveIntensity = st.running && st.v < -0.2 ? 2.5 : lit ? 1.4 : 0.12;

      // Blink roadwork zone beacons gently
      zones.mAmber.emissiveIntensity = 0.35 + Math.max(0, Math.sin(time * 4.5)) * 1.65;

      // Refresh live dashboard canvas at ~10 Hz when active
      if (active) {
        dashT += dt;
        if (dashT > 0.1) {
          dashT = 0;
          grDrawDash(dash, st);
        }
      }
    },
  };
}

function grTire(spin, M, r, w, rim, side, nLug) {
  let h = w / 2,
    prof = [
      [rim, -h],
      [r - 0.09, -h],
      [r - 0.03, -h + 0.035],
      [r, -h + 0.1],
      [r, h - 0.1],
      [r - 0.03, h - 0.035],
      [r - 0.09, h],
      [rim, h],
    ],
    tire = new Qc(prof.map(([a, b]) => new W(a, b)), 32);
  tire.rotateZ(Math.PI / 2);
  $(tire, M.rubber, spin);
  for (let i = 0; i < nLug; i++) {
    for (let s of [-1, 1]) {
      let ang = ((i + (s > 0 ? 0 : 0.5)) / nLug) * Math.PI * 2,
        lug = $(
          fE(h * 0.9, 0.09, 0.055),
          M.rubber,
          spin,
          s * h * 0.5,
          Math.sin(ang) * (r + 0.01),
          Math.cos(ang) * (r + 0.01),
        );
      lug.rotation.set(-ang, 0, s * 0.42);
    }
  }
  let face = side * (w * 0.18);
  $(mE(rim, w * 0.64, 24), M.paint, spin);
  $(mE(rim * 0.82, 0.03, 24), M.paintDark, spin, face + side * 0.02, 0, 0);
  $(mE(rim * 0.36, 0.06, 16), M.steel, spin, face + side * 0.05, 0, 0);
  $(mE(rim * 0.18, 0.06, 10), M.black, spin, face + side * 0.09, 0, 0);
  for (let i = 0; i < 8; i++) {
    let a = (i / 8) * Math.PI * 2;
    $(mE(0.02, 0.05, 6), M.chrome, spin, face + side * 0.08, Math.sin(a) * rim * 0.27, Math.cos(a) * rim * 0.27);
  }
  jbMerge(spin);
}
