// ---------- Tracked Asphalt Paver (Asfalt Finişeri AP 600) procedural 3D model ----------
function pvUseCar() {
  return (0, y.useMemo)(() => pvBuildCar(), []);
}

function pvBuildCar() {
  let M = lE(),
    root = new Lr(),
    body = new Lr(),
    S = PVS;
  M.paint.color.set(`#f0ad18`);
  M.paintDark.color.set(`#d4930d`);
  root.add(body);

  let steelDark = new Cl({ color: `#23262b`, roughness: 0.46, metalness: 0.74 }),
    trackMat = new Cl({ color: `#191b1d`, roughness: 0.88 }),
    asphaltHeapMat = new Cl({ color: `#1b1d21`, roughness: 0.75, flatShading: !0 }),
    heaterMat = new Cl({ color: `#ff5d1a`, emissive: `#ff4800`, emissiveIntensity: 0.65, roughness: 0.35 }),
    canopyMat = new Cl({ color: `#25282c`, roughness: 0.55 }),
    fabric = new Cl({ color: `#26292d`, roughness: 0.94 }),
    decalAP = jbDecal(`AP 600`),
    decalChakir = jbDecal(`CHAKIR`);

  // 1. Twin Caterpillar Crawler Track Undercarriage
  let trackPads = [];
  for (let sx of [-1, 1]) {
    let tx = sx * S.TRACK_HALF;
    $(pE(0.42, 0.44, 2.85, 0.03), steelDark, body, tx, S.TRACK_R, -0.05);
    $(pE(0.46, 0.14, 2.95, 0.02), trackMat, body, tx, 0.08, -0.05);
    $(pE(0.46, 0.14, 2.95, 0.02), trackMat, body, tx, S.TRACK_R * 2 - 0.04, -0.05);
    for (let kz of [-1.32, 1.22]) {
      let sp = $(new Ts(S.TRACK_R, S.TRACK_R, 0.48, 16), steelDark, body, tx, S.TRACK_R, kz);
      sp.rotation.z = Math.PI / 2;
      trackPads.push(sp);
    }
  }

  // 2. Front Push-Roller Bar & Folding Asphalt Receiving Hopper (Hazne)
  $(pE(2.25, 0.18, 0.25, 0.02), steelDark, body, 0, 0.42, 2.86);
  for (let sx of [-0.72, 0.72]) {
    let pr = $(new Ts(0.11, 0.11, 0.45, 12), M.chrome, body, sx, 0.42, 2.98);
    pr.rotation.z = Math.PI / 2;
  }
  // Hopper floor + front apron + splayed side wings
  $(pE(1.9, 0.12, 1.85, 0.02), steelDark, body, 0, 0.56, 1.82);
  $(pE(1.9, 0.42, 0.12, 0.02), M.paint, body, 0, 0.74, 2.7);
  for (let sx of [-1, 1]) {
    let wing = $(pE(0.12, 0.62, 1.9, 0.02), M.paint, body, sx * 1.1, 0.92, 1.82);
    wing.rotation.z = sx * 0.24;
  }
  // Live hot-mix asphalt heap inside hopper
  let aspHeapGeo = new el(1.78, 1.65, 8, 10);
  aspHeapGeo.rotateX(-Math.PI / 2);
  {
    let p = aspHeapGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let u = p.getX(i) / 0.89,
        w = p.getZ(i) / 0.82;
      p.setY(i, 0.12 + 0.42 * Math.max(0, 1 - u * u * 0.75) * Math.max(0, 1 - w * w * 0.75));
    }
    aspHeapGeo.computeVertexNormals();
  }
  let aspHeap = new Wa(aspHeapGeo, asphaltHeapMat);
  aspHeap.position.set(0, 0.58, 1.82);
  aspHeap.castShadow = !0;
  aspHeap.receiveShadow = !0;
  body.add(aspHeap);

  // 3. Center Diesel Powerpack Hood + Twin Decals + Exhaust Stack
  $(pE(1.95, 0.98, 1.75, 0.04), M.paint, body, 0, 1.24, 0.05);
  $(pE(1.45, 0.42, 0.62, 0.02), steelDark, body, 0, 1.68, 0.45);
  $(new Ts(0.052, 0.06, 0.95, 12), steelDark, body, -0.58, 2.15, 0.25);
  let exhaust = new G(-0.58, 2.65, 0.25);
  for (let sx of [-1, 1]) {
    $(new el(0.65, 0.2), new Ma({ map: decalAP, transparent: !0, polygonOffset: !0, polygonOffsetFactor: -1 }), body, sx * 0.985, 1.38, 0.15).rotation.y =
      sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    $(new el(0.55, 0.18), new Ma({ map: decalChakir, transparent: !0, polygonOffset: !0, polygonOffsetFactor: -1 }), body, sx * 0.985, 1.12, -0.35).rotation.y =
      sx > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  // 4. Elevated Rear Operator Platform, Twin Seats & Sun Canopy
  $(pE(2.05, 0.14, 1.08, 0.02), steelDark, body, 0, 1.48, -1.25);
  for (let sx of [-0.62, 0.62]) {
    $(pE(0.38, 0.1, 0.36, 0.02), fabric, body, sx, 1.78, -1.18);
    $(pE(0.36, 0.44, 0.08, 0.02), fabric, body, sx, 2.02, -1.34);
    $(pE(0.28, 0.56, 0.24, 0.02), steelDark, body, sx, 1.82, -0.82);
  }
  for (let sx of [-0.88, 0.88]) {
    for (let sz of [-0.82, -1.7]) {
      $(pE(0.065, 1.45, 0.065, 0.01), steelDark, body, sx, 2.22, sz);
    }
  }
  $(pE(2.05, 0.09, 1.4, 0.03), canopyMat, body, 0, 2.98, -1.24);
  let beacon = $(new il(0.09, 10, 8), M.amber, body, 0, 3.12, -1.24);
  beacon.castShadow = !1;

  // 5. Rear Auger Screw + Hydraulic Extendable Heated Screed (Serme Tablası)
  let auger = $(new Ts(0.14, 0.14, 3.4, 12), steelDark, body, 0, 0.34, -1.68);
  auger.rotation.z = Math.PI / 2;

  let screedPivot = new Lr();
  screedPivot.position.set(0, 0, S.SCREED_Z);
  body.add(screedPivot);
  // Twin screed tow arms + wide heavy vibrating screed beam + heated plates
  for (let sx of [-0.92, 0.92]) {
    $(pE(0.12, 0.14, 1.65, 0.02), M.paint, screedPivot, sx, 0.5, 0.78);
  }
  $(pE(S.SCREED_HALF * 2, 0.34, 0.66, 0.03), M.paint, screedPivot, 0, 0.24, 0);
  $(pE(S.SCREED_HALF * 2 - 0.08, 0.1, 0.58, 0.02), steelDark, screedPivot, 0, 0.05, 0);
  // Subtle heated-screed amber glow strip across back
  let heatBar = $(pE(3.2, 0.06, 0.04, 0.01), heaterMat, screedPivot, 0, 0.22, -0.34);
  heatBar.castShadow = !1;

  let screedTip = new G(0, 0.12, S.SCREED_Z - 0.15),
    eye = new G(0.62, 2.48, -1.08),
    amberLight = new Bu(`#ff9900`, 0, 12, 1.6);
  amberLight.position.set(0, 3.25, -1.24);
  amberLight.visible = !1;
  root.add(amberLight);

  return {
    root,
    exhaust,
    screedTip,
    eye,
    update: (st, ui, time, dt, active) => {
      root.position.set(st.x, st.y, st.z);
      root.rotation.set(-st.pitch, st.yaw, st.roll, `YXZ`);
      for (let sp of trackPads) sp.rotation.x = st.trackDist / S.TRACK_R;
      auger.rotation.x = st.augerA;
      screedPivot.position.y = (1 - st.screed) * 0.38;

      let lf = CC(st.load / S.CAP, 0, 1);
      aspHeap.visible = lf > 0.008;
      aspHeap.scale.set(1, Math.max(0.05, lf), 1);

      heaterMat.emissiveIntensity = st.running && st.screed > 0.5 ? 0.65 + 0.2 * Math.sin(time * 5) : 0.12;
      let fl = active && ui.beacon ? (Math.sin(time * 9) > 0 ? 1 : 0.15) : st.paving > 0.1 ? (Math.sin(time * 8) > 0 ? 0.7 : 0.1) : 0;
      M.amber.emissiveIntensity = fl * 3.8;
      amberLight.intensity = fl * 4.5;
      amberLight.visible = fl > 0.05;
      void dt;
    },
  };
}
