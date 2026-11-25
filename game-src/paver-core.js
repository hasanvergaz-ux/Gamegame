// ===================== TRACKED ASPHALT PAVER (ASFALT FİNİŞERİ AP 600) CORE =====================
// Machine frame: origin on ground under center track bogie, +z forward (hopper), -z rear (heated screed).
var PVS = {
    TRACK_HALF: 0.98,
    TRACK_R: 0.34,
    HOPPER_Z: 1.75,
    HOPPER_HX: 1.15,
    SCREED_Z: -2.05,
    SCREED_HALF: 1.9, // 3.8m paving mat width
    CAP: 6.0,
    VMAX: 6.2,
    VREV: 3.4,
    ACCEL: 2.1,
    BRAKE: 6.8,
    ROLL: 0.65,
    DRAG: 0.22,
    TURN_RATE: 1.25,
    CIRCLES: [-1.45, 0.2, 1.85],
    R: 1.22,
    IDLE_RPM: 850,
    MAX_RPM: 2150,
    CRANK: 1.4,
  },
  PVspawn = { x: -63.0, z: -34.5, yaw: 0 },
  PV = pvNew();

function pvNew() {
  let st = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    v: 0,
    steer: 0,
    trackDist: 0,
    gas: 0,
    load: 0,          // m3 hot-mix asphalt in hopper
    screedDown: !0,   // G toggle
    screed: 1,        // 1 = down paving, 0 = lifted
    hopperFlap: 0.7,  // front wings open
    paving: 0,        // 0..1 active mat laying
    pavedM2: 0,
    augerA: 0,
    relaxT: 0,
    engine: !1,
    running: !1,
    crankEnd: 0,
    t: 0,
    rpm: 0,
    eload: 0,
    events: [],
  };
  return (pvReset(st), st);
}

function pvReset(st) {
  Object.assign(st, {
    x: PVspawn.x,
    z: PVspawn.z,
    yaw: PVspawn.yaw,
    v: 0,
    steer: 0,
    pitch: 0,
    roll: 0,
    screedDown: !0,
    screed: 1,
    paving: 0,
  });
  st.y = nw(st.x, st.z);
  pvCircles(st);
}

function pvCircles(st) {
  if (typeof PVC === `undefined`) return;
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw);
  PVS.CIRCLES.forEach((off, i) => {
    PVC[i].x = st.x + sinY * off;
    PVC[i].z = st.z + cosY * off;
  });
}

function pvInput() {
  let drive = Math.max(gC(rC.gas), hC(`KeyW`), hC(`ArrowUp`)) - Math.max(gC(rC.brake), hC(`KeyS`), hC(`ArrowDown`)),
    steer = Math.max(gC(rC.right), hC(`KeyD`), hC(`ArrowRight`)) - Math.max(gC(rC.left), hC(`KeyA`), hC(`ArrowLeft`)),
    screedLift = Math.max(gC(rC.liftUp), hC(`KeyE`)) - Math.max(gC(rC.liftDown), hC(`KeyQ`));
  return {
    throttle: Math.max(0, drive),
    brake: Math.max(0, -drive),
    steer: steer,
    screedLift: screedLift,
  };
}

function pvScreedToggle() {
  PV.screedDown = !PV.screedDown;
  PV.events.push({ type: PV.screedDown ? `screedDown` : `screedUp` });
}

// Catch hot asphalt poured directly from the Dump Truck into the Paver's front hopper
function pvCatch(clod) {
  if (!clod || clod.mat !== `asphalt` || PV.load >= PVS.CAP * 1.05) return !1;
  let dx = clod.x - PV.x,
    dz = clod.z - PV.z;
  if (Math.abs(dx) > 5 || Math.abs(dz) > 5) return !1;
  let cosY = Math.cos(PV.yaw),
    sinY = Math.sin(PV.yaw),
    lx = dx * cosY - dz * sinY,
    lz = dx * sinY + dz * cosY;
  if (Math.abs(lx) > PVS.HOPPER_HX + 0.25 || lz < 0.7 || lz > 2.8) return !1;
  if (clod.y < PV.y + 0.25 || clod.y > PV.y + 2.4) return !1;
  PV.load = Math.min(PVS.CAP, PV.load + clod.vol * 1.35);
  return !0;
}

function pvLayMat(st, step) {
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    rx = cosY,
    rz = -sinY;

  // Front hopper also scoops up any loose asphalt piles dumped ahead on the road!
  if (Math.abs(st.v) > 0.1 && st.load < PVS.CAP * 0.98) {
    let hx = st.x + sinY * PVS.HOPPER_Z,
      hz = st.z + cosY * PVS.HOPPER_Z,
      samp = RS_MASK.sampleAt(hx, hz);
    if (samp.asphalt > 0.4 && !(samp.stage & 16)) {
      let scooped = SC.carve(hx - rx * 1.1, hz - rz * 1.1, hx + rx * 1.1, hz + rz * 1.1, nw(hx, hz) - 0.03, 0.3, 0.9 * step);
      if (scooped > 0) {
        st.load = Math.min(PVS.CAP, st.load + scooped * 1.4);
        SC.version++;
      }
    }
  }

  let canLay = st.running && st.screed > 0.7 && st.v > 0.08 && st.load > 0.005;
  if (!canLay) {
    st.paving = wC(st.paving, 0, EC(8, step));
    return;
  }

  let sx = st.x + sinY * PVS.SCREED_Z,
    sz = st.z + cosY * PVS.SCREED_Z,
    x0 = sx - rx * PVS.SCREED_HALF,
    z0 = sz - rz * PVS.SCREED_HALF,
    x1 = sx + rx * PVS.SCREED_HALF,
    z1 = sz + rz * PVS.SCREED_HALF;

  // Burn/consume hot-mix asphalt proportionally to paved strip length & width
  let areaStep = PVS.SCREED_HALF * 2 * st.v * step,
    used = Math.min(st.load, areaStep * 0.048);
  st.load = Math.max(0, st.load - used);
  st.augerA += st.v * step * 3.8;

  // Lay ultra-smooth matte hot-mix asphalt carpet across full 3.8m screed span
  let laid = RS_MASK.paintAsphalt(x0, z0, x1, z1, 0.56, 62, grCanScrape);
  if (laid > 0) {
    st.pavedM2 += laid * RS_MASK.cellArea;
    PV_STATE.asphaltDumpedM3 += used;
  }

  // Smooth the finished screed grade cleanly so road becomes laser-flat
  st.relaxT += step;
  if (st.relaxT > 0.1) {
    st.relaxT = 0;
    SC.relax(
      Math.min(x0, x1) - 0.9,
      Math.min(z0, z1) - 0.9,
      Math.max(x0, x1) + 0.9,
      Math.max(z0, z1) + 0.9,
      3,
      0.38,
    );
  }

  st.paving = wC(st.paving, CC(st.v / 2.2, 0.35, 1), EC(10, step));
}

function pvCarStep(st, inp, dt, engineOn) {
  let step = Math.min(dt, 0.05);
  st.t += step;
  if (engineOn && !st.engine) {
    st.engine = !0;
    st.crankEnd = st.t + PVS.CRANK;
    st.events.push({ type: `crank` });
  } else if (!engineOn && st.engine) {
    st.engine = !1;
  }
  let run = st.engine && st.t >= st.crankEnd;
  st.running = run;

  let thr = inp && run ? inp.throttle : 0,
    brk = inp ? inp.brake : 0,
    steerIn = inp ? inp.steer : 0,
    acc = 0;

  if (thr > 0) acc += st.v < -0.2 ? PVS.BRAKE : st.v > PVS.VMAX ? 0 : PVS.ACCEL;
  if (brk > 0) acc -= st.v > 0.2 ? PVS.BRAKE : run && st.v > -PVS.VREV ? PVS.ACCEL * 0.72 : 0;
  st.gas = thr > 0 || (brk > 0 && st.v <= 0.2 && run) ? 1 : 0;
  st.v += acc * step;

  let rolling = thr || brk ? 0 : PVS.ROLL + (run ? 0 : 2.2);
  st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), rolling * step);
  st.v *= Math.exp(-(PVS.DRAG + st.paving * 0.6) * step);

  if (run) {
    st.steer = wC(st.steer, steerIn, EC(8, step));
    // Tracked paver turns cleanly even at crawl speed
    st.yaw -= st.steer * PVS.TURN_RATE * (0.35 + 0.65 * Math.min(1, Math.abs(st.v) / 2.0)) * step;
  } else {
    st.steer = 0;
  }
  st.x += Math.sin(st.yaw) * st.v * step;
  st.z += Math.cos(st.yaw) * st.v * step;
  st.x = CC(st.x, -285, 285);
  st.z = CC(st.z, -285, 285);
  st.trackDist += st.v * step;

  let hit = !1;
  for (let off of PVS.CIRCLES) {
    let cx = st.x + Math.sin(st.yaw) * off,
      cz = st.z + Math.cos(st.yaw) * off;
    hit = hT(st, cx, cz, PVS.R, uw) || hit;
    hit = hT(st, cx, cz, PVS.R, dw) || hit;
    hit = hT(st, cx, cz, PVS.R, gT) || hit;
    hit = hT(st, cx, cz, PVS.R, TKC) || hit;
    hit = hT(st, cx, cz, PVS.R, JBC) || hit;
    if (typeof GRC !== `undefined`) hit = hT(st, cx, cz, PVS.R, GRC) || hit;
    if (typeof RLC !== `undefined`) hit = hT(st, cx, cz, PVS.R, RLC) || hit;
    if (typeof COC !== `undefined`) hit = hT(st, cx, cz, PVS.R, COC) || hit;
  }
  if (hit) {
    if (Math.abs(st.v) > 1.2) st.events.push({ type: `bump`, strength: Math.abs(st.v) });
    st.v *= 0.3;
  }
  pvCircles(st);

  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    gAt = (lat, lon) => nw(st.x + lat * cosY + lon * sinY, st.z - lat * sinY + lon * cosY),
    fl = gAt(PVS.TRACK_HALF, 1.3),
    fr = gAt(-PVS.TRACK_HALF, 1.3),
    rl = gAt(PVS.TRACK_HALF, -1.3),
    rr = gAt(-PVS.TRACK_HALF, -1.3),
    yAvg = (fl + fr + rl + rr) * 0.25,
    pitchT = Math.atan2((fl + fr) * 0.5 - (rl + rr) * 0.5, 2.6),
    rollT = Math.atan2((fl + rl) * 0.5 - (fr + rr) * 0.5, PVS.TRACK_HALF * 2),
    blend = EC(10, step);

  st.y = Math.abs(st.y - yAvg) > 2 ? yAvg : wC(st.y, yAvg, blend);
  st.pitch = wC(st.pitch, pitchT, blend);
  st.roll = wC(st.roll, rollT, blend);

  if (inp && run && inp.screedLift !== 0) {
    st.screedDown = inp.screedLift < 0;
  }
  st.screed = CC(st.screed + ((st.screedDown ? 1 : 0) - st.screed) * EC(7, step), 0, 1);

  pvLayMat(st, step);

  if (run) {
    let target = Math.min(1, st.gas * 0.5 + (Math.abs(st.v) / PVS.VMAX) * 0.3 + st.paving * 0.45);
    st.eload = wC(st.eload, target, EC(5, step));
    st.rpm = wC(st.rpm, PVS.IDLE_RPM + (PVS.MAX_RPM - PVS.IDLE_RPM) * (0.14 + 0.86 * st.eload), EC(3, step));
  } else if (st.engine) {
    st.rpm = 175 + 38 * Math.sin(st.t * 24);
    st.eload = 0;
  } else {
    st.rpm = wC(st.rpm, 0, EC(2.2, step));
    st.eload = 0;
  }
}

typeof window < `u` && (window.__paver = PV);
