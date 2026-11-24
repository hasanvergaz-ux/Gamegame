// ---------- dump truck visuals ----------
var TKurl = PS(`dump_truck.gltf`);
function tkUse() {
  let gltf = Fx(TKurl);
  return (0, y.useMemo)(() => tkBuild(gltf.scene), [gltf]);
}
function tkBox(w, h, d, mat, parent, px, py, pz) {
  let mesh = new Wa(new Ss(w, h, d), mat);
  return (
    mesh.position.set(px, py, pz),
    (mesh.castShadow = !0),
    (mesh.receiveShadow = !0),
    parent.add(mesh),
    mesh
  );
}
function tkDashCanvas() {
  let cv = document.createElement(`canvas`);
  ((cv.width = 512), (cv.height = 192));
  let tex = new _s(cv);
  return ((tex.colorSpace = yt), { cv: cv, ctx: cv.getContext(`2d`), tex: tex });
}
function tkDrawDash(dash, st) {
  let c = dash.ctx,
    gauge = (cx, val, max, label, unit, warnFrom) => {
      ((c.fillStyle = `#0b0d10`),
        c.beginPath(),
        c.arc(cx, 96, 80, 0, Math.PI * 2),
        c.fill(),
        (c.strokeStyle = `#3a3f46`),
        (c.lineWidth = 4),
        c.stroke());
      let a0 = Math.PI * 0.75,
        span = Math.PI * 1.5;
      for (let i = 0; i <= 10; i++) {
        let a = a0 + (span * i) / 10,
          r1 = i % 2 ? 64 : 58;
        ((c.strokeStyle = i / 10 >= warnFrom ? `#e8452c` : `#d9dde2`),
          (c.lineWidth = i % 2 ? 2 : 4),
          c.beginPath(),
          c.moveTo(cx + Math.cos(a) * r1, 96 + Math.sin(a) * r1),
          c.lineTo(cx + Math.cos(a) * 72, 96 + Math.sin(a) * 72),
          c.stroke());
      }
      let a = a0 + span * CC(val / max, 0, 1);
      ((c.strokeStyle = `#ff7a1a`),
        (c.lineWidth = 5),
        c.beginPath(),
        c.moveTo(cx, 96),
        c.lineTo(cx + Math.cos(a) * 66, 96 + Math.sin(a) * 66),
        c.stroke(),
        (c.fillStyle = `#2a2e33`),
        c.beginPath(),
        c.arc(cx, 96, 9, 0, Math.PI * 2),
        c.fill(),
        (c.fillStyle = `#f2f4f6`),
        (c.font = `700 26px 'Barlow Condensed', Arial, sans-serif`),
        (c.textAlign = `center`),
        c.fillText(label, cx, 140),
        (c.fillStyle = `#8f98a3`),
        (c.font = `600 15px 'Barlow Condensed', Arial, sans-serif`),
        c.fillText(unit, cx, 160));
    };
  ((c.fillStyle = `#16191d`),
    c.fillRect(0, 0, 512, 192),
    gauge(92, Math.abs(st.v) * 3.6, 50, `${Math.round(Math.abs(st.v) * 3.6)}`, `km/h`, 0.8),
    gauge(420, st.rpm, 2500, `${Math.round(st.rpm / 100) / 10}k`, `rpm`, 0.84));
  // centre screen
  ((c.fillStyle = `#0d1a14`),
    c.fillRect(186, 22, 140, 148),
    (c.strokeStyle = `#2c3a33`),
    (c.lineWidth = 3),
    c.strokeRect(186, 22, 140, 148),
    (c.textAlign = `left`),
    (c.fillStyle = `#7fe3a5`),
    (c.font = `700 17px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(`LOAD`, 196, 44));
  let lf = CC(st.load / TKS.CAP, 0, 1);
  ((c.fillStyle = `#1f3329`),
    c.fillRect(196, 52, 120, 16),
    (c.fillStyle = lf > 0.97 ? `#ffb02e` : `#7fe3a5`),
    c.fillRect(196, 52, 120 * lf, 16),
    (c.fillStyle = `#d8f5e3`),
    (c.font = `700 22px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(`${st.load.toFixed(1)} m³`, 196, 92),
    (c.fillStyle = `#7fe3a5`),
    (c.font = `700 17px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(`BED`, 196, 118));
  let deg = Math.round(st.bed * TKS.BED_MAX * 57.3);
  ((c.fillStyle = st.bed > 0.02 ? `#ffb02e` : `#d8f5e3`),
    (c.font = `700 22px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(`${deg}°`, 236, 118),
    (c.fillStyle = st.running ? `#7fe3a5` : `#e8452c`),
    (c.font = `600 15px 'Barlow Condensed', Arial, sans-serif`),
    c.fillText(st.running ? `ENGINE OK` : `ENGINE OFF`, 196, 150),
    st.bed > 0.02 &&
      ((c.fillStyle = `#ffb02e`), c.fillText(`▲ PTO`, 276, 150)),
    (dash.tex.needsUpdate = !0));
}
function tkBuild(source) {
  let S = TKS.S,
    root = new Lr(),
    model = new Lr();
  (model.scale.setScalar(S),
    model.position.set(0, TKS.OY * S, TKS.OZ * S),
    root.add(model));
  let scene = source.clone(!0);
  scene.updateMatrixWorld(!0);
  let glass = new wl({
      color: `#9fb7c2`,
      roughness: 0.04,
      metalness: 0.1,
      transparent: !0,
      opacity: 0.28,
      depthWrite: !1,
      side: 2,
      envMapIntensity: 1.5,
    }),
    body = null,
    tailMesh = null,
    wheelGroups = [];
  scene.traverse((obj) => {
    (obj.name === `Plane008` && (body = obj),
      obj.name === `Plane009` && (tailMesh = obj),
      /^Cylinder/.test(obj.name) && !obj.isMesh && wheelGroups.push(obj),
      /^Cylinder/.test(obj.name) && obj.isMesh && obj.parent === body && wheelGroups.push(obj));
  });
  let fixMat = (mat) => (
      mat.name === `Material.132`
        ? glass
        : ((mat = mat.clone()), (mat.side = 2), mat)
    ),
    bodyG = new Lr(),
    bedPivot = new Lr(),
    bedG = new Lr();
  (bedPivot.position.set(0, TKS.HINGE.y, TKS.HINGE.z),
    bedG.position.set(0, -TKS.HINGE.y, -TKS.HINGE.z),
    bedPivot.add(bedG),
    model.add(bodyG, bedPivot));
  let bake = (mesh) => {
    let geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    return (geom.applyMatrix4(mesh.matrixWorld), geom);
  };
  // split the body into chassis/cab and the tipping bed
  let bodyMeshes = [];
  (body.traverse((obj) => {
    obj.isMesh && obj !== tailMesh && !wheelGroups.some((w) => w === obj || w === obj.parent) && bodyMeshes.push(obj);
  }));
  for (let mesh of bodyMeshes) {
    if (mesh.material.name === `Material.116` || mesh.material.name === `Material.104`) continue;
    let geom = bake(mesh),
      matName = mesh.material.name,
      splittable = matName === `main.003` || matName === `icon.001`,
      posA = geom.attributes.position,
      triCount = posA.count / 3,
      keep = [],
      bed = [];
    for (let t = 0; t < triCount; t++) {
      let cy = (posA.getY(t * 3) + posA.getY(t * 3 + 1) + posA.getY(t * 3 + 2)) / 3,
        cz = (posA.getZ(t * 3) + posA.getZ(t * 3 + 1) + posA.getZ(t * 3 + 2)) / 3;
      (splittable && cz < 0.4 && cy > -0.235 ? bed : keep).push(t);
    }
    let sub = (tris) => {
        let out = new Zi();
        for (let name of Object.keys(geom.attributes)) {
          let src = geom.attributes[name],
            size = src.itemSize,
            arr = new Float32Array(tris.length * 3 * size);
          (tris.forEach((t, k) => {
            for (let v = 0; v < 3; v++)
              for (let c = 0; c < size; c++)
                arr[(k * 3 + v) * size + c] = src.getComponent(t * 3 + v, c);
          }),
            out.setAttribute(name, new ji(arr, size)));
        }
        return out;
      },
      mat = fixMat(mesh.material),
      add = (tris, parent) => {
        if (!tris.length) return;
        let m = new Wa(sub(tris), mat);
        ((m.castShadow = mat !== glass), (m.receiveShadow = !0), parent.add(m));
      };
    (add(keep, bodyG), add(bed, bedG));
  }
  // tailgate swings from its top edge
  let tailPivot = new Lr();
  if ((tailPivot.position.set(0, 0.5, -1.855), bedG.add(tailPivot), tailMesh)) {
    let m = new Wa(bake(tailMesh), fixMat(tailMesh.material));
    (m.position.set(0, -0.5, 1.855), (m.castShadow = !0), tailPivot.add(m));
  }
  // wheels: steer + spin pivots
  let wheels = [];
  for (let wg of wheelGroups) {
    let parts = [];
    wg.isMesh ? parts.push(wg) : wg.traverse((o) => o.isMesh && parts.push(o));
    let box = new ci();
    parts.forEach((p) => box.expandByObject(p));
    let ctr = box.getCenter(new G()),
      steerG = new Lr(),
      spinG = new Lr();
    (steerG.position.copy(ctr), steerG.add(spinG), model.add(steerG));
    for (let p of parts) {
      let geom = bake(p);
      geom.translate(-ctr.x, -ctr.y, -ctr.z);
      let m = new Wa(geom, fixMat(p.material));
      ((m.castShadow = !0), spinG.add(m));
    }
    wheels.push({ steer: steerG, spin: spinG, front: ctr.z > 0.5 });
  }
  // tipping ram: telescopic cylinder from the chassis to the bed front
  let ramDark = new Cl({ color: `#1f2124`, roughness: 0.5, metalness: 0.5 }),
    ramChrome = new Cl({ color: `#e4e7ea`, roughness: 0.08, metalness: 1 }),
    ramBase = new G(0, -0.3, 0.74),
    ramTopBed = new G(0, 0.33, 0.37),
    ramG = new Lr(),
    RAM_L = 0.72,
    ramStages = [0.06, 0.05, 0.042, 0.034].map((r, k) => {
      let geo = new Ts(r, r, RAM_L, 18);
      geo.translate(0, RAM_L / 2, 0);
      let m = new Wa(geo, k ? ramChrome : ramDark);
      return ((m.castShadow = !0), ramG.add(m), m);
    });
  (ramG.position.copy(ramBase), model.add(ramG));
  let ramCap = new Wa(new Ts(0.075, 0.075, 0.05, 18), ramDark);
  (ramCap.position.y = RAM_L, ramStages[0].add(ramCap));
  // trunnion bracket on the chassis and lug under the bed front
  (tkBox(0.24, 0.05, 0.14, ramDark, model, 0, -0.32, 0.74),
    tkBox(0.2, 0.08, 0.06, ramDark, bedG, 0, ramTopBed.y, ramTopBed.z + 0.01));
  // bed subframe + rear hinge so the bed sits on the chassis
  for (let side of [1, -1]) tkBox(0.06, 0.05, 2.1, ramDark, bedG, side * 0.3, -0.235, -0.76);
  let hingePin = new Wa(new Ts(0.025, 0.025, 0.7, 12), ramChrome);
  ((hingePin.rotation.z = Math.PI / 2), hingePin.position.set(0, TKS.HINGE.y, TKS.HINGE.z), model.add(hingePin));
  let ramTmp = new G(),
    ramUp = new G(0, 1, 0),
    placeRam = (angle) => {
      // bed point -> model space through the hinge rotation
      let dy = ramTopBed.y - TKS.HINGE.y,
        dz = ramTopBed.z - TKS.HINGE.z,
        c = Math.cos(angle),
        sn = Math.sin(angle);
      ramTmp.set(0, TKS.HINGE.y + dy * c + dz * sn, TKS.HINGE.z - dy * sn + dz * c).sub(ramBase);
      let len = ramTmp.length();
      ramG.quaternion.setFromUnitVectors(ramUp, ramTmp.normalize());
      let ext = Math.max(0, len - RAM_L);
      ramStages.forEach((m, k) => {
        m.position.y = (ext * k) / (ramStages.length - 1);
      });
    };
  placeRam(0);
  // soil heap inside the bed
  let B = TKS.BED,
    heapGeo = new el(B.hx * 2 - 0.02, B.z1 - B.z0 - 0.04, 10, 18);
  heapGeo.rotateX(-Math.PI / 2);
  {
    let p = heapGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let u = p.getX(i) / B.hx,
        w = (p.getZ(i) / (B.z1 - B.z0)) * 2,
        edge = Math.abs(u) > 0.97 || Math.abs(w) > 0.97;
      p.setY(
        i,
        edge
          ? 0.55
          : 0.62 + 0.38 * (1 - u * u) * (1 - w * w) + 0.05 * Math.sin(i * 12.9898) ,
      );
    }
    heapGeo.computeVertexNormals();
  }
  let soilMat = new Cl({ color: `#6a4b33`, roughness: 1, flatShading: !0 }),
    heap = new Wa(heapGeo, soilMat);
  (heap.position.set(0, B.floor, (B.z0 + B.z1) / 2),
    (heap.receiveShadow = !0),
    (heap.castShadow = !0),
    bedG.add(heap));
  // exhaust stack behind the cab
  let chrome = new Cl({ color: `#d9dde0`, roughness: 0.15, metalness: 1 }),
    stack = new Wa(new Ts(0.03, 0.03, 0.5, 12), chrome);
  (stack.position.set(-0.53, 0.42, 0.47), (stack.castShadow = !0), model.add(stack));
  let exhaust = new G(-0.53 * S, (0.68 + TKS.OY) * S, (0.47 + TKS.OZ) * S);
  // ---------- cab interior ----------
  let cab = new Lr();
  model.add(cab);
  let plastic = new Cl({ color: `#2b2e33`, roughness: 0.75 }),
    trim = new Cl({ color: `#5b6067`, roughness: 0.8 }),
    fabric = new Cl({ color: `#33363b`, roughness: 0.95 }),
    stitch = new Cl({ color: `#d2531f`, roughness: 0.7 }),
    rubber = new Cl({ color: `#141516`, roughness: 0.95 }),
    alu = new Cl({ color: `#a9afb6`, roughness: 0.35, metalness: 0.8 }),
    dash = tkDashCanvas(),
    dashMat = new Ma({ map: dash.tex, toneMapped: !1 });
  (tkBox(0.86, 0.02, 0.66, rubber, cab, 0, -0.24, 1.21),
    tkBox(0.86, 0.78, 0.02, trim, cab, 0, 0.15, 0.885),
    tkBox(0.86, 0.02, 0.66, trim, cab, 0, 0.545, 1.21));
  for (let side of [1, -1])
    (tkBox(0.02, 0.4, 0.62, trim, cab, side * 0.43, -0.04, 1.2),
      tkBox(0.025, 0.03, 0.44, stitch, cab, side * 0.425, 0.1, 1.2),
      tkBox(0.03, 0.04, 0.16, plastic, cab, side * 0.415, 0.06, 1.24));
  // dashboard
  let dashG = new Lr();
  (dashG.position.set(0, 0.08, 1.46), cab.add(dashG));
  (tkBox(0.86, 0.18, 0.22, plastic, dashG, 0, 0, 0),
    tkBox(0.86, 0.02, 0.26, trim, dashG, 0, 0.1, -0.01),
    tkBox(0.3, 0.07, 0.07, plastic, dashG, 0.26, 0.12, -0.08));
  let screen = new Wa(new el(0.26, 0.0975), dashMat);
  (screen.position.set(0.26, 0.1, -0.118),
    screen.rotation.set(-0.25, Math.PI, 0),
    dashG.add(screen));
  // switches on the centre stack
  for (let i = 0; i < 6; i++)
    tkBox(0.025, 0.018, 0.01, i % 3 == 1 ? stitch : alu, dashG, -0.05 + (i % 3) * 0.04, 0.02 - Math.floor(i / 3) * 0.035, -0.112);
  // centre console + dump lever
  tkBox(0.16, 0.2, 0.28, plastic, cab, 0, -0.14, 1.26);
  let lever = new Lr();
  (lever.position.set(0.05, -0.04, 1.22), cab.add(lever));
  let leverRod = new Wa(new Ts(0.007, 0.007, 0.13, 8), alu);
  (leverRod.position.y = 0.065, lever.add(leverRod));
  let knob = new Wa(new il(0.02, 12, 10), stitch);
  (knob.position.y = 0.135, lever.add(knob));
  let gear = new Wa(new Ts(0.006, 0.006, 0.1, 8), alu);
  (gear.position.set(-0.03, 0.0, 1.2), cab.add(gear));
  let gearKnob = new Wa(new il(0.018, 12, 10), rubber);
  (gearKnob.position.set(-0.03, 0.055, 1.2), cab.add(gearKnob));
  // steering wheel: truck-style, tilted towards the driver, T-spokes, padded hub
  let leather = new Cl({ color: `#1b1c1e`, roughness: 0.62 }),
    wheelG = new Lr();
  (wheelG.position.set(TKS.EYE.x, 0.2, 1.22), (wheelG.rotation.x = -2.27), cab.add(wheelG));
  let colRod = new Wa(new Ts(0.02, 0.026, 0.24, 14), plastic);
  ((colRod.rotation.x = Math.PI / 2), (colRod.position.z = -0.13), wheelG.add(colRod));
  let shroud = tkBox(0.075, 0.06, 0.1, plastic, wheelG, 0, 0, -0.09);
  shroud.castShadow = !1;
  for (let side of [1, -1]) {
    let stalk = new Wa(new Ts(0.005, 0.005, 0.09, 6), plastic);
    ((stalk.rotation.z = Math.PI / 2), stalk.position.set(side * 0.075, 0.01, -0.07), wheelG.add(stalk));
    let tip = new Wa(new Ts(0.008, 0.008, 0.02, 8), side > 0 ? stitch : alu);
    ((tip.rotation.z = Math.PI / 2), tip.position.set(side * 0.125, 0.01, -0.07), wheelG.add(tip));
  }
  let wheelSpin = new Lr();
  wheelG.add(wheelSpin);
  let rim = new Wa(new ol(0.105, 0.015, 12, 48), leather);
  ((rim.castShadow = !0), wheelSpin.add(rim));
  // finger grips on the rim
  for (let i = 0; i < 16; i++) {
    let a = (i / 16) * Math.PI * 2,
      grip = new Wa(new il(0.017, 8, 6), leather);
    (grip.position.set(Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0), grip.scale.set(1, 1, 0.9), wheelSpin.add(grip));
  }
  let hubPad = new Wa(new Ts(0.042, 0.048, 0.03, 24), leather);
  ((hubPad.rotation.x = Math.PI / 2), (hubPad.position.z = 0.008), wheelSpin.add(hubPad));
  let badge = new Wa(new Ts(0.016, 0.016, 0.004, 20), chrome);
  ((badge.rotation.x = Math.PI / 2), (badge.position.z = 0.025), wheelSpin.add(badge));
  let spokeMat = new Cl({ color: `#565b62`, roughness: 0.35, metalness: 0.7 });
  for (let a of [0, Math.PI, Math.PI / 2]) {
    let spoke = new Wa(new Ss(0.065, 0.028, 0.012), spokeMat);
    (spoke.position.set(Math.cos(a) * 0.072, Math.sin(a) * 0.072, 0.004),
      (spoke.rotation.z = a),
      wheelSpin.add(spoke));
  }
  // seats
  for (let sx of [TKS.EYE.x, -0.26]) {
    let seat = new Lr();
    (seat.position.set(sx, -0.08, 0.9), cab.add(seat));
    (tkBox(0.22, 0.05, 0.22, fabric, seat, 0, 0, 0.1),
      tkBox(0.18, 0.012, 0.18, stitch, seat, 0, 0.027, 0.1));
    let back = new Lr();
    ((back.position.set(0, 0.02, -0.01), (back.rotation.x = -0.18), seat.add(back)),
      tkBox(0.22, 0.3, 0.05, fabric, back, 0, 0.15, 0),
      tkBox(0.16, 0.24, 0.012, stitch, back, 0, 0.15, 0.027),
      tkBox(0.14, 0.07, 0.045, fabric, back, 0, 0.35, 0),
      tkBox(0.06, 0.14, 0.06, alu, seat, 0, -0.1, 0.1));
  }
  // sun visors and a small hanging air freshener
  (tkBox(0.3, 0.012, 0.12, trim, cab, 0.24, 0.57, 1.44),
    tkBox(0.3, 0.012, 0.12, trim, cab, -0.24, 0.57, 1.44));
  let charm = new Wa(new Ss(0.03, 0.045, 0.004), new Cl({ color: `#2fa34a`, roughness: 0.6 }));
  (charm.position.set(0, 0.47, 1.47), cab.add(charm));
  let eye = new G(TKS.EYE.x, TKS.EYE.y, TKS.EYE.z),
    dashT = 0;
  return {
    root: root,
    model: model,
    eye: eye,
    exhaust: exhaust,
    update: (st, ui, time, dt, active) => {
      (root.position.set(st.x, st.y, st.z),
        root.rotation.set(-st.pitch, st.yaw, st.roll, `YXZ`),
        (bedPivot.rotation.x = -st.bed * TKS.BED_MAX),
        placeRam(st.bed * TKS.BED_MAX),
        (tailPivot.rotation.x = st.bed * TKS.BED_MAX * 1.25));
      for (let w of wheels)
        ((w.spin.rotation.x = st.wheelA), w.front && (w.steer.rotation.y = -st.steer));
      ((wheelSpin.rotation.z = -st.steer * 7),
        (lever.rotation.x = -st.bedCmd * 0.45));
      let fill = tkFill(st) / S;
      ((heap.visible = fill > 0.004),
        heap.scale.set(1, Math.max(0.001, fill), 1),
        (heap.position.z = (B.z0 + B.z1) / 2 - st.bed * 0.12),
        (dashT += dt),
        active && ui.cam === 1 && dashT > 0.12 && ((dashT = 0), tkDrawDash(dash, st)));
    },
  };
}
