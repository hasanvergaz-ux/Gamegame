// ---------- Vibratory Road Roller (Silindir SR 110 C) procedural 3D model ----------
function rlUse() {
  return (0, y.useMemo)(() => rlBuild(), []);
}

function rlDashCanvas() {
  let cv = document.createElement(`canvas`);
  cv.width = 384;
  cv.height = 192;
  let tex = new _s(cv);
  tex.colorSpace = yt;
  return { cv, ctx: cv.getContext(`2d`), tex };
}

function rlDrawDash(d, st) {
  let c = d.ctx;
  c.fillStyle = `#111418`;
  c.fillRect(0, 0, 384, 192);
  let cx = 90,
    cy = 98,
    a0 = Math.PI * 0.75,
    span = Math.PI * 1.5;
  c.fillStyle = `#07090b`;
  c.beginPath();
  c.arc(cx, cy, 74, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = `#464d56`;
  c.lineWidth = 4;
  c.stroke();
  for (let i = 0; i <= 8; i++) {
    let a = a0 + (span * i) / 8;
    c.strokeStyle = `#e6e8ea`;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56);
    c.lineTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 68);
    c.stroke();
  }
  let sp = Math.abs(st.v) * 3.6,
    a = a0 + span * CC(sp / 35, 0, 1);
  c.strokeStyle = `#ff6a13`;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(cx, cy);
  c.lineTo(cx + Math.cos(a) * 60, cy + Math.sin(a) * 60);
  c.stroke();
  c.fillStyle = `#f4f6f8`;
  c.font = `700 28px 'Barlow Condensed', Arial, sans-serif`;
  c.textAlign = `center`;
  c.fillText(`${Math.round(sp)}`, cx, cy + 42);
  c.fillStyle = `#8f98a3`;
  c.font = `600 14px Arial`;
  c.fillText(`km/h`, cx, cy + 58);

  let rf = CC(st.rpm / 2250, 0, 1);
  for (let i = 0; i < 12; i++) {
    c.fillStyle = i / 12 < rf ? (i > 9 ? `#ff3b2f` : i > 7 ? `#ffb020` : `#3ddc6c`) : `#23272c`;
    c.fillRect(190 + i * 15, 20, 11, 20);
  }
  c.textAlign = `left`;
  c.fillStyle = `#f4b400`;
  c.font = `800 22px 'Barlow Condensed', Arial, sans-serif`;
  c.fillText(`SR 110 C`, 190, 70);
  c.fillStyle = st.vibe ? `#ffaa22` : `#7e8790`;
  c.font = `700 17px 'Barlow Condensed', Arial, sans-serif`;
  c.fillText(st.vibe ? `VİBRASYON: 34 Hz` : `VİBRASYON: KAPALI`, 190, 100);
  c.fillStyle = st.sprinkler ? `#4ec5ff` : `#7e8790`;
  c.fillText(st.sprinkler ? `SU PÜSKÜRTME: AÇIK` : `SU PÜSKÜRTME: KAPALI`, 190, 124);
  c.fillStyle = `#d8dce0`;
  c.fillText(`Sıkıştırma: ${Math.round(st.compactM2)} m²`, 190, 148);
  c.fillStyle = st.running ? `#3ddc6c` : `#ff3b2f`;
  c.fillText(st.running ? `● MOTOR AKTİF` : `● MOTOR KAPALI`, 190, 176);
  d.tex.needsUpdate = !0;
}

function rlBuild() {
  let M = lE(),
    root = new Lr(),
    rearFrame = new Lr(),
    S = RLS;
  M.paint.color.set(`#f0ad18`);
  M.paintDark.color.set(`#d4930d`);
  root.add(rearFrame);

  let steelDrum = new Cl({ color: `#b6bcc2`, roughness: 0.28, metalness: 0.84 }),
    steelDark = new Cl({ color: `#25282c`, roughness: 0.45, metalness: 0.72 }),
    blackTrim = new Cl({ color: `#1d1f23`, roughness: 0.65, metalness: 0.35 }),
    rubber = new Cl({ color: `#161719`, roughness: 0.94 }),
    brass = new Cl({ color: `#cfa238`, roughness: 0.32, metalness: 0.86 }),
    plastic = new Cl({ color: `#32363c`, roughness: 0.78 }),
    fabric = new Cl({ color: `#26292d`, roughness: 0.94 }),
    redLight = new Cl({ color: `#c41b12`, roughness: 0.3, emissive: `#ff2010`, emissiveIntensity: 0.15 }),
    glass = M.glass.clone();
  glass.opacity = 0.22;
  glass.color = new q(`#94b7bf`);

  let decalModel = jbDecal(`SR 110`, `C`),
    decalChakir = jbDecal(`CHAKIR`);

  // ---------------- 1. Articulated Front Yoke + Vibratory Steel Drum ----------------
  let waist = new Lr();
  waist.position.set(0, 0, S.WAIST_Z);
  root.add(waist);

  let frontYoke = new Lr();
  frontYoke.position.set(0, 0, S.DRUM_Z - S.WAIST_Z);
  waist.add(frontYoke);

  // Heavy yellow yoke side plates straddling the steel drum
  for (let sx of [-1, 1]) {
    let sideX = sx * (S.DRUM_W / 2 + 0.11);
    $(pE(0.14, 0.56, 2.02, 0.03), M.paint, frontYoke, sideX, S.DRUM_R, 0.04);
    $(pE(0.16, 0.28, 0.54, 0.02), steelDark, frontYoke, sideX, S.DRUM_R - 0.04, 0.0);
    // Planetary drive motor housing + bolt ring at drum axle center
    let hub = $(new Ts(0.24, 0.24, 0.2, 16), steelDark, frontYoke, sx * (S.DRUM_W / 2 + 0.08), S.DRUM_R, 0);
    hub.rotation.z = Math.PI / 2;
    let boltPlate = $(new Ts(0.14, 0.14, 0.24, 12), M.chrome, frontYoke, sx * (S.DRUM_W / 2 + 0.12), S.DRUM_R, 0);
    boltPlate.rotation.z = Math.PI / 2;
    for (let k = 0; k < 6; k++) {
      let a = (k / 6) * Math.PI * 2,
        b = $(new il(0.024, 6, 5), M.chrome, frontYoke, sx * (S.DRUM_W / 2 + 0.19), S.DRUM_R + Math.cos(a) * 0.18, Math.sin(a) * 0.18);
      b.castShadow = !1;
    }
    $(new el(0.62, 0.19), new Ma({ map: decalModel, transparent: !0, polygonOffset: !0, polygonOffsetFactor: -1 }), frontYoke, sx * (S.DRUM_W / 2 + 0.185), S.DRUM_R + 0.08, -0.58).rotation.y =
      sx > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  // Front & rear drum crossbeams, rubber scrapers, tow hook & twin bumper LED lamps (Photo #1 & #3 & #4)
  $(pE(S.DRUM_W + 0.26, 0.36, 0.38, 0.03), M.paint, frontYoke, 0, S.DRUM_R + 0.18, 0.88);
  $(pE(S.DRUM_W + 0.04, 0.26, 0.34, 0.02), blackTrim, frontYoke, 0, S.DRUM_R + 0.44, 0.65);
  // Sloped black poly water tank / hood over front drum (like CAT CCS7 Photo #2)
  $(pE(1.55, 0.34, 0.92, 0.05), blackTrim, frontYoke, 0, S.DRUM_R + 0.56, 0.28);
  let cap = $(new Ts(0.09, 0.09, 0.06, 12), steelDark, frontYoke, 0, S.DRUM_R + 0.74, 0.35);
  cap.castShadow = !1;
  // Scraper crossbars front & back
  $(pE(S.DRUM_W - 0.04, 0.08, 0.1, 0.01), M.paint, frontYoke, 0, S.DRUM_R - 0.06, 0.77);
  $(pE(S.DRUM_W - 0.08, 0.1, 0.04, 0.01), rubber, frontYoke, 0, S.DRUM_R - 0.06, 0.71);
  $(pE(S.DRUM_W - 0.04, 0.08, 0.1, 0.01), blackTrim, frontYoke, 0, S.DRUM_R - 0.04, -0.77);
  // Tow hook in middle front bumper
  $(pE(0.08, 0.14, 0.12, 0.02), M.paint, frontYoke, 0, S.DRUM_R + 0.18, 1.1);

  // Overhead brass water spray bar + 5 nozzles on front drum
  let sprayBar = $(new Ts(0.022, 0.022, S.DRUM_W - 0.24, 8), steelDark, frontYoke, 0, S.DRUM_R + 0.74, 0.66);
  sprayBar.rotation.z = Math.PI / 2;
  let sprayMistMat = new Cl({ color: `#d6f0ff`, transparent: !0, opacity: 0.28, roughness: 0.9, depthWrite: !1 }),
    sprayMist = $(new el(S.DRUM_W - 0.3, 0.32), sprayMistMat, frontYoke, 0, S.DRUM_R + 0.55, 0.64);
  sprayMist.castShadow = !1;
  for (let i = -2; i <= 2; i++) {
    let nz = $(new Ts(0.018, 0.024, 0.05, 6), brass, frontYoke, i * 0.42, S.DRUM_R + 0.71, 0.66);
    nz.castShadow = !1;
  }

  // Front twin rectangular LED headlamps + amber corner turn signals
  let frontLightMeshes = [];
  for (let sx of [-0.52, 0.52]) {
    frontLightMeshes.push($(new Ss(0.18, 0.11, 0.04), M.lens, frontYoke, sx, S.DRUM_R + 0.18, 1.08));
  }
  for (let sx of [-0.82, 0.82]) {
    $(new Ss(0.09, 0.14, 0.04), M.amber, frontYoke, sx, S.DRUM_R + 0.18, 1.08);
  }

  // Articulated rear yoke tongue reaching back to center waist pivot
  $(pE(0.85, 0.28, 1.15, 0.03), M.paint, frontYoke, 0, S.DRUM_R + 0.04, -1.02);

  // Heavy Brushed-Steel Cylindrical Drum (rotates + vibrates vertically)
  let drumPivot = new Lr();
  drumPivot.position.set(0, S.DRUM_R, 0);
  frontYoke.add(drumPivot);

  let drumShell = $(new Ts(S.DRUM_R, S.DRUM_R, S.DRUM_W, 32), steelDrum, drumPivot, 0, 0, 0);
  drumShell.rotation.z = Math.PI / 2;
  // Yellow recessed inner drum webs & end bevel rings
  for (let sx of [-1, 1]) {
    let web = $(new Ts(S.DRUM_R - 0.05, S.DRUM_R - 0.05, 0.08, 28), M.paint, drumPivot, sx * (S.DRUM_W / 2 - 0.14), 0, 0);
    web.rotation.z = Math.PI / 2;
    let ring = $(new ol(S.DRUM_R - 0.04, 0.04, 8, 28), M.paintDark, drumPivot, sx * (S.DRUM_W / 2 - 0.02), 0, 0);
    ring.rotation.y = Math.PI / 2;
  }

  // ---------------- 2. Articulated Waist Pivot + Hydraulic Steering Rams ----------------
  let pin = $(new Ts(0.08, 0.08, 0.72, 12), steelDark, rearFrame, 0, 0.74, S.WAIST_Z);
  pin.castShadow = !1;
  $(pE(0.78, 0.34, 0.8, 0.02), M.paintDark, rearFrame, 0, 0.72, S.WAIST_Z - 0.28);

  let steerRams = [];
  for (let sx of [-1, 1]) {
    let ram = OE(M, root, 0.042, 0.024, 0.56);
    steerRams.push({ ram, sx, rearLocal: new G(sx * 0.44, 0.72, S.WAIST_Z - 0.42), frontLocal: new G(sx * 0.42, 0.72, -0.82) });
  }

  // ---------------- 3. Sloped Rear Diesel Engine Hood + Radiator Louvers ----------------
  $(pE(1.36, 0.38, 2.2, 0.03), steelDark, rearFrame, 0, 0.72, 0.25);
  // Side boarding ladders
  for (let sx of [-1, 1]) {
    $(pE(0.18, 0.52, 0.52, 0.02), steelDark, rearFrame, sx * 0.72, 0.62, 1.05);
    $(pE(0.24, 0.04, 0.46, 0.01), M.paint, rearFrame, sx * 0.75, 0.45, 1.05);
    $(pE(0.24, 0.04, 0.46, 0.01), M.paint, rearFrame, sx * 0.75, 0.72, 1.05);
  }

  // Sculpted sloped rear engine cover (side extruded profile matching Photos #2/#3)
  let hoodProf = [
    [-0.95, 0.85],
    [-0.82, 1.62],
    [-0.45, 1.88],
    [0.25, 1.98],
    [0.25, 0.85],
  ];
  let rearHood = $(hE(hoodProf, 1.48, 0.04), M.paint, rearFrame, 0, 0, 0);
  void rearHood;
  // Radiator grille & black side louver panels + exhaust stack
  $(pE(1.06, 0.72, 0.08, 0.02), blackTrim, rearFrame, 0, 1.24, -0.94);
  for (let sx of [-1, 1]) {
    $(pE(0.05, 0.52, 0.62, 0.01), blackTrim, rearFrame, sx * 0.75, 1.42, -0.35);
    $(new el(0.54, 0.19), new Ma({ map: decalChakir, transparent: !0, polygonOffset: !0, polygonOffsetFactor: -1 }), rearFrame, sx * 0.76, 1.72, -0.15).rotation.y =
      sx > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  // Curved black vertical exhaust pipe behind cab
  $(new Ts(0.048, 0.056, 0.72, 12), blackTrim, rearFrame, -0.34, 2.26, 0.14);
  let tipEx = $(new Ts(0.046, 0.046, 0.18, 10), blackTrim, rearFrame, -0.34, 2.65, 0.08);
  tipEx.rotation.x = -0.6;
  let exhaust = new G(-0.34, 2.74, 0.02);

  // Rear red tail & work lamps
  for (let sx of [-0.52, 0.52]) {
    $(new Ss(0.14, 0.08, 0.05), redLight, rearFrame, sx, 1.15, -0.98);
  }

  // ---------------- 4. Rear Wide Traction Compactor Tires ----------------
  let rearWheels = [],
    tireMat = M.lug,
    rimMat = M.paint;
  for (let sx of [-1, 1]) {
    let wg = new Lr();
    wg.position.set(sx * S.TRACK_R, S.WHEEL_R, 0);
    rearFrame.add(wg);
    let tire = $(new Ts(S.WHEEL_R, S.WHEEL_R, 0.52, 24), tireMat, wg, 0, 0, 0);
    tire.rotation.z = Math.PI / 2;
    let rim = $(new Ts(0.38, 0.38, 0.54, 18), rimMat, wg, 0, 0, 0);
    rim.rotation.z = Math.PI / 2;
    let hub = $(new Ts(0.17, 0.17, 0.58, 12), steelDark, wg, 0, 0, 0);
    hub.rotation.z = Math.PI / 2;
    for (let t = 0; t < 12; t++) {
      let a = (t / 12) * Math.PI * 2,
        lug = $(new Ss(0.22, 0.045, 0.09), tireMat, wg, sx * 0.12, Math.cos(a) * (S.WHEEL_R + 0.01), Math.sin(a) * (S.WHEEL_R + 0.01));
      lug.rotation.x = -a;
      let lug2 = $(new Ss(0.22, 0.045, 0.09), tireMat, wg, -sx * 0.12, Math.cos(a + 0.25) * (S.WHEEL_R + 0.01), Math.sin(a + 0.25) * (S.WHEEL_R + 0.01));
      lug2.rotation.x = -(a + 0.25);
    }
    rearWheels.push(wg);
  }

  // ---------------- 5. Panoramic Glazed ROPS Cab + Live Dash & Operator Console ----------------
  let cab = new Lr();
  cab.position.set(0, 1.38, 0.92);
  rearFrame.add(cab);

  // Cab lower yellow/black tub
  $(pE(1.36, 0.36, 1.38, 0.03), blackTrim, cab, 0, 0.18, 0);
  $(pE(1.32, 0.14, 1.34, 0.02), M.paint, cab, 0, 0.4, 0);
  // 4 slender ROPS corner posts
  for (let px of [-0.61, 0.61]) {
    for (let pz of [-0.62, 0.62]) {
      $(pE(0.075, 1.48, 0.075, 0.01), blackTrim, cab, px, 1.15, pz);
    }
  }
  // Cab roof canopy (wide overhang, yellow/black Volvo/CAT styling)
  $(pE(1.48, 0.11, 1.56, 0.03), M.paint, cab, 0, 1.94, 0.02);
  $(pE(1.42, 0.05, 1.5, 0.02), blackTrim, cab, 0, 1.88, 0.02);
  // Tinted glass panels (front, rear, sides)
  for (let side of [
    [0, 1.14, 0.64, 1.16, 1.38, 0],
    [0, 1.14, -0.64, 1.16, 1.38, Math.PI],
    [0.64, 1.14, 0, 1.18, 1.38, Math.PI / 2],
    [-0.64, 1.14, 0, 1.18, 1.38, -Math.PI / 2],
  ]) {
    let g = $(new el(side[3], side[4]), glass, cab, side[0], side[1], side[2]);
    g.rotation.y = side[5];
    g.castShadow = !1;
  }
  // Roof work lights & amber rotating beacon + tubular side mirrors
  for (let sx of [-0.5, 0.5]) {
    frontLightMeshes.push($(new Ss(0.15, 0.09, 0.06), M.lens, cab, sx, 1.92, 0.79));
    $(new Ss(0.14, 0.08, 0.05), redLight, cab, sx, 1.92, -0.75);
    // Exterior mirror + arm
    $(pE(0.28, 0.024, 0.024, 0), blackTrim, cab, sx * 1.52, 1.66, 0.62);
    $(pE(0.05, 0.24, 0.12, 0.01), plastic, cab, sx * 1.76, 1.56, 0.64);
  }
  let amberMesh = $(new il(0.085, 10, 8), M.amber, cab, 0.42, 2.08, -0.45);
  amberMesh.castShadow = !1;

  // Cab interior: suspension seat, steering pedestal, live dashboard canvas & vibe lever
  $(pE(0.46, 0.12, 0.44, 0.02), fabric, cab, 0, 0.56, -0.18);
  $(pE(0.42, 0.52, 0.1, 0.02), fabric, cab, 0, 0.85, -0.38);
  $(pE(0.18, 0.72, 0.22, 0.02), plastic, cab, 0, 0.7, 0.36);

  let wheelSpin = new Lr();
  wheelSpin.position.set(0, 1.08, 0.24);
  wheelSpin.rotation.x = -0.92;
  cab.add(wheelSpin);
  $(new ol(0.17, 0.02, 10, 28), blackTrim, wheelSpin, 0, 0, 0);
  $(new Ts(0.04, 0.04, 0.04, 12), blackTrim, wheelSpin, 0, 0, 0).rotation.x = Math.PI / 2;

  let dash = rlDashCanvas(),
    dashScreen = $(new el(0.32, 0.16), new Ma({ map: dash.tex, toneMapped: !1 }), cab, 0, 1.0, 0.29);
  dashScreen.rotation.set(-0.42, Math.PI, 0);
  dashScreen.castShadow = !1;

  let eye = new G(0, 2.66, 0.82);

  // Headlight spotlight + beacon pointlight (disabled when off to save GPU cost!)
  let spotL = new Ru(`#fff4d0`, 0, 48, 0.55, 0.48, 1);
  spotL.position.set(0, 2.4, 2.5);
  spotL.target.position.set(0, 0.2, 18);
  spotL.visible = !1;
  root.add(spotL, spotL.target);

  let amberLight = new Bu(`#ff9900`, 0, 12, 1.6);
  amberLight.position.set(0.42, 3.6, 0.45);
  amberLight.visible = !1;
  root.add(amberLight);

  let tmpRear = new G(),
    tmpFront = new G(),
    tmpVec = new G(),
    dashT = 0;

  return {
    root,
    exhaust,
    eye,
    update: (st, ui, time, dt, active) => {
      root.position.set(st.x, st.y, st.z);
      root.rotation.set(-st.pitch, st.yaw, st.roll, `YXZ`);

      // Articulated steering pivot at center waist
      waist.rotation.y = -st.steer;

      // Steel drum spin + eccentric high-frequency vibration buzz!
      drumPivot.rotation.x = st.drumA;
      let vBuzz = st.running && st.vibe ? Math.sin(time * 82) * 0.0045 * st.vibeAmp : 0;
      drumPivot.position.y = S.DRUM_R + vBuzz;
      sprayMist.visible = !!(st.running && st.sprinkler && Math.abs(st.v) > 0.15);

      for (let rw of rearWheels) rw.rotation.x = st.wheelA;
      wheelSpin.rotation.z = -st.steer * 6.5;

      // Update twin articulated hydraulic steering rams cleanly (no allocations)
      waist.updateMatrix();
      rearFrame.updateMatrix();
      for (let sr of steerRams) {
        tmpRear.copy(sr.rearLocal).applyMatrix4(rearFrame.matrix);
        tmpFront.copy(sr.frontLocal).applyMatrix4(waist.matrix);
        kE(sr.ram, tmpRear, tmpFront);
      }

      let lit = active && (ui.head || ui.work);
      M.lens.emissiveIntensity = lit ? 3.2 : 0;
      spotL.intensity = lit ? 52 : 0;
      spotL.visible = !!lit;

      let fl = active && ui.beacon ? (Math.sin(time * 9) > 0 ? 1 : 0.15) : st.vibe && st.running ? (Math.sin(time * 8) > 0 ? 0.65 : 0.1) : 0;
      M.amber.emissiveIntensity = fl * 3.8;
      amberLight.intensity = fl * 4.5;
      amberLight.visible = fl > 0.05;

      dashT += dt;
      if (active && ui.cam === 1 && dashT > 0.12) {
        dashT = 0;
        rlDrawDash(dash, st);
      }
      void tmpVec;
    },
  };
}
