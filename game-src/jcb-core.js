// ===================== JCB BACKHOE LOADER (added) =====================
// Machine frame: origin on the ground under the rear axle, +z forward, +x left, metres.
var JBS = {
    WB: 2.17,
    TRACK_R: 0.92,
    TRACK_F: 0.9,
    RR: 0.74,
    RF: 0.55,
    VMAX: 9.5,
    VREV: 4,
    ACCEL: 2.3,
    BRAKE: 6.5,
    ROLL: 0.45,
    DRAG: 0.15,
    STEER: 0.62,
    STEER_RATE: 1.5,
    CIRCLES: [-1.3, 0.75, 2.75],
    R: 1.2,
    IDLE_RPM: 850,
    MAX_RPM: 2200,
    CRANK: 1.3,
    SEAT_TIME: 1.3,
    // front loader: arm pivot, arm length, arm angle at lift = 0
    LP: { y: 1.55, z: 0.95 },
    LA_LEN: 2.653,
    LA0: -0.4404,
    EDGE: { y: -0.4, z: 0.94 },
    LHALF: 1.12,
    LCAP: 1,
    // backhoe: kingpost (swing axis) and boom foot in the swing frame (+z = out, rearwards)
    K: { y: 1.05, z: -1.62 },
    BOOT: { y: 0.12, z: 0.24 },
    L1: 2.45,
    L2: 1.85,
    L3: 0.78,
    BHALF: 0.3,
    BCAP: 0.25,
    STAB_SPEED: 0.8,
  },
  JBL = {
    lift: { min: -0.07, max: 1.2, speed: 0.34, accel: 2.2 },
    tilt: { min: -1.35, max: 0.85, speed: 0.9, accel: 4 },
  },
  JBJ = {
    swing: { min: -1.45, max: 1.45, speed: 0.8, accel: 2 },
    boom: { min: -1.15, max: 1.35, speed: 0.55, accel: 2.6 },
    stick: { min: -3, max: -0.4, speed: 0.8, accel: 3.2 },
    bucket: { min: -2.5, max: 0.6, speed: 1.3, accel: 5.5 },
  },
  JBspawn = { x: -62.5, z: -45.5, yaw: 0 },
  jbRng = DC(4242),
  jbP = { x: 0, y: 0, z: 0 },
  jbQ = { x: 0, y: 0, z: 0 },
  jbM = { x: 0, y: 0, z: 0 },
  jbSeatPress = !1,
  JB = jbNew();
function jbNew() {
  let j = {};
  for (let k of Object.keys(JBJ)) j[k] = { p: 0, v: 0 };
  let st = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0,
    v: 0, steer: 0, wheelA: 0, gas: 0,
    seat: 0, seatCmd: 0, stab: 0,
    lift: { p: 0.3, v: 0 }, tilt: { p: 0.25, v: 0 },
    j: j,
    lLoad: 0, lPour: 0, lInSoil: !1, lDump: 0,
    bLoad: 0, bPour: 0, bDump: 0, dug: 0,
    tip: { x: 0, y: 0, z: 0 }, tipPrev: { x: 0, y: 0, z: 0 }, hasPrev: !1,
    inSoil: !1, digging: 0, hyd: 0, relaxT: 0, hydCmd: 0,
    engine: !1, running: !1, crankEnd: 0, t: 0, rpm: 0, eload: 0,
    events: [],
  };
  return (jbReset(st), st);
}
function jbReset(st) {
  (Object.assign(st, {
    x: JBspawn.x, z: JBspawn.z, yaw: JBspawn.yaw,
    v: 0, steer: 0, pitch: 0, roll: 0,
    seat: 0, seatCmd: 0, stab: 0, hasPrev: !1, inSoil: !1, lInSoil: !1,
  }),
    (st.y = nw(st.x, st.z)),
    (st.lift.p = 0.3), (st.tilt.p = 0.25),
    (st.j.swing.p = 0), (st.j.boom.p = 1.3), (st.j.stick.p = -2.95), (st.j.bucket.p = -0.45));
  for (let k of Object.keys(JBJ)) st.j[k].v = 0;
  ((st.lift.v = 0), (st.tilt.v = 0), jbCircles(st));
}
function jbCircles(st) {
  JBS.CIRCLES.forEach((off, i) => {
    ((JBC[i].x = st.x + Math.sin(st.yaw) * off), (JBC[i].z = st.z + Math.cos(st.yaw) * off));
  });
}
// loader arm + bucket in the machine frame (y, z)
function jbLoaderFK(st) {
  let a = JBS.LA0 + st.lift.p,
    py = JBS.LP.y + JBS.LA_LEN * Math.sin(a),
    pz = JBS.LP.z + JBS.LA_LEN * Math.cos(a),
    t = st.tilt.p,
    c = Math.cos(t),
    s = Math.sin(t);
  return {
    a: a, py: py, pz: pz, c: c, s: s,
    ey: py + JBS.EDGE.y * c + JBS.EDGE.z * s,
    ez: pz - JBS.EDGE.y * s + JBS.EDGE.z * c,
  };
}
// backhoe joints -> points in the arm plane (out = along the swing direction, up)
function jbFK(st) {
  let t1 = st.j.boom.p,
    t2 = t1 + st.j.stick.p,
    t3 = t2 + st.j.bucket.p,
    p1s = JBS.BOOT.z + JBS.L1 * Math.cos(t1),
    p1y = JBS.BOOT.y + JBS.L1 * Math.sin(t1),
    p2s = p1s + JBS.L2 * Math.cos(t2),
    p2y = p1y + JBS.L2 * Math.sin(t2);
  return {
    t1: t1, t2: t2, t3: t3, p1s: p1s, p1y: p1y, p2s: p2s, p2y: p2y,
    ts: p2s + JBS.L3 * Math.cos(t3),
    ty: p2y + JBS.L3 * Math.sin(t3),
  };
}
// swing-frame point (side, up, out) -> machine frame
function jbArmPt(st, side, up, out, o) {
  let a = Math.PI + st.j.swing.p,
    c = Math.cos(a),
    s = Math.sin(a);
  return ((o.x = side * c + out * s), (o.y = JBS.K.y + up), (o.z = JBS.K.z - side * s + out * c), o);
}
function jbJoint(st, jt, lim, cmd, run, step) {
  let want = run ? CC(cmd, -1, 1) * lim.speed : 0;
  ((jt.v += CC(want - jt.v, -lim.accel * step, lim.accel * step)), (jt.p += jt.v * step));
  if (jt.p < lim.min || jt.p > lim.max)
    (Math.abs(jt.v) > lim.speed * 0.5 &&
      st.events.push({ type: `limit`, strength: Math.abs(jt.v) / lim.speed }),
      (jt.p = CC(jt.p, lim.min, lim.max)),
      (jt.v = 0));
  return Math.abs(jt.v) / lim.speed;
}
function jbInput() {
  let m = mC(),
    x = _C(),
    seat = jbSeatPress;
  return (
    (jbSeatPress = !1),
    {
      throttle: m.throttle,
      brake: m.brake,
      steer: m.steer,
      liftCmd: m.liftCmd,
      tiltCmd:
        Math.max(gC(rC.bucketCurl), hC(`KeyZ`)) - Math.max(gC(rC.bucketOpen), hC(`KeyX`)),
      swing: x.swing,
      boom: x.boom,
      stick: x.stick,
      bucket: x.bucket,
      seat: seat,
    }
  );
}
function jbSpawnClod(st, mx, my, mz, vol, vx, vy, vz) {
  (qw(st, mx, my, mz, jbP),
    CT.clods.push({
      x: jbP.x, y: jbP.y, z: jbP.z,
      vx: vx + (jbRng() - 0.5) * 0.6,
      vy: vy,
      vz: vz + (jbRng() - 0.5) * 0.6,
      vol: vol,
      spin: jbRng() * 6.28,
    }));
}
function jbStep(st, inp, dt, engineOn) {
  let step = Math.min(dt, 0.05);
  ((st.t += step),
    engineOn && !st.engine
      ? ((st.engine = !0), (st.crankEnd = st.t + JBS.CRANK), st.events.push({ type: `crank` }))
      : !engineOn && st.engine && (st.engine = !1));
  let run = st.engine && st.t >= st.crankEnd;
  st.running = run;
  // ---- swivel seat: front = drive + loader, rear = backhoe
  inp &&
    inp.seat &&
    (Math.abs(st.v) < 0.6
      ? ((st.seatCmd = st.seatCmd ? 0 : 1),
        st.events.push({ type: st.seatCmd ? `seatBack` : `seatFront` }))
      : st.events.push({ type: `seatMoving` }));
  st.seat = CC(st.seat + Math.sign(st.seatCmd - st.seat) * (step / JBS.SEAT_TIME), 0, 1);
  let front = st.seat < 0.001,
    rear = st.seat > 0.999,
    prevStab = st.stab;
  run && (st.stab = CC(st.stab + (st.seatCmd ? 1 : -1) * JBS.STAB_SPEED * step, 0, 1));
  let stabMoving = st.stab !== prevStab;
  // ---- driving
  let drive = !!inp && front && st.stab < 0.05,
    thr = drive && run ? inp.throttle : 0,
    brk = inp ? (drive ? inp.brake : 1) : 0,
    steerIn = drive ? inp.steer : 0,
    loadF = st.lLoad / JBS.LCAP,
    acc = 0;
  (thr > 0 &&
    (acc += st.v < -0.2 ? JBS.BRAKE : st.v > JBS.VMAX ? 0 : JBS.ACCEL * (1 - 0.15 * loadF)),
    brk > 0 &&
      (acc -= st.v > 0.2 ? JBS.BRAKE : drive && run && st.v > -JBS.VREV ? JBS.ACCEL * 0.7 : 0),
    (st.gas = thr > 0 || (drive && brk > 0 && st.v <= 0.2 && run) ? 1 : 0),
    (st.v += acc * step));
  let rolling = thr || (drive && brk) ? 0 : JBS.ROLL + (drive ? 0 : 4);
  ((st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), rolling * step)),
    (st.v *= Math.exp(-JBS.DRAG * step)),
    (thr || brk || Math.abs(st.v) > 0.4) && st.stab < 0.05 &&
      (st.v -= 9.81 * Math.sin(st.pitch) * 0.55 * step));
  let steerMax = JBS.STEER / (1 + Math.abs(st.v) * 0.08);
  ((st.steer += CC(steerIn * steerMax - st.steer, -JBS.STEER_RATE * step, JBS.STEER_RATE * step)),
    (st.yaw -= ((st.v * Math.tan(st.steer)) / JBS.WB) * step),
    (st.x += Math.sin(st.yaw) * st.v * step),
    (st.z += Math.cos(st.yaw) * st.v * step),
    (st.x = CC(st.x, -285, 285)),
    (st.z = CC(st.z, -285, 285)),
    (st.wheelA += (st.v * step) / JBS.RR));
  let hit = !1;
  for (let off of JBS.CIRCLES) {
    let cx = st.x + Math.sin(st.yaw) * off,
      cz = st.z + Math.cos(st.yaw) * off;
    ((hit = hT(st, cx, cz, JBS.R, uw) || hit),
      (hit = hT(st, cx, cz, JBS.R, dw) || hit),
      (hit = hT(st, cx, cz, JBS.R, gT) || hit),
      (hit = hT(st, cx, cz, JBS.R, TKC) || hit));
  }
  (hit && (Math.abs(st.v) > 1.5 && st.events.push({ type: `bump`, strength: Math.abs(st.v) }), (st.v *= 0.3)),
    jbCircles(st));
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    ground = (lat, lon) => nw(st.x + lat * cosY + lon * sinY, st.z - lat * sinY + lon * cosY),
    fl = ground(JBS.TRACK_F, JBS.WB),
    fr = ground(-JBS.TRACK_F, JBS.WB),
    rl = ground(JBS.TRACK_R, 0),
    rr = ground(-JBS.TRACK_R, 0),
    pitchT = Math.atan2((fl + fr) / 2 - (rl + rr) / 2, JBS.WB),
    rollT = Math.atan2((fl + rl) / 2 - (fr + rr) / 2, JBS.TRACK_R * 2),
    yT = (rl + rr) / 2,
    blend = EC(10, step);
  ((st.y = Math.abs(st.y - yT) > 2 ? yT : wC(st.y, yT, blend)),
    (st.pitch = wC(st.pitch, pitchT, blend)),
    (st.roll = wC(st.roll, rollT, blend)));
  // ---- front loader hydraulics (operator facing forward)
  let hyd = 0;
  ((hyd += jbJoint(st, st.lift, JBL.lift, inp && front ? inp.liftCmd : 0, run, step)),
    (hyd += jbJoint(st, st.tilt, JBL.tilt, inp && front ? inp.tiltCmd : 0, run, step)));
  // ---- backhoe hydraulics (operator turned to the rear)
  let full = st.bLoad >= JBS.BCAP * 0.97,
    anyCmd = 0;
  for (let k of Object.keys(JBJ)) {
    let cmd = inp && rear ? inp[k] : 0;
    ((anyCmd += Math.abs(cmd)),
      st.inSoil && (k === `stick` || k === `bucket` || (k === `boom` && cmd < 0)) && (cmd *= full ? 0.3 : 0.62),
      (hyd += jbJoint(st, st.j[k], JBJ[k], cmd, run, step)));
  }
  inp && front && (anyCmd += Math.abs(inp.liftCmd) + Math.abs(inp.tiltCmd));
  (!run && anyCmd > 0 && st.t % 1.5 < step && st.events.push({ type: `noHydraulics` }),
    (st.hyd = Math.min(1, hyd + (stabMoving ? 0.4 : 0))),
    (st.hydCmd = st.lift.v + st.j.boom.v + (stabMoving ? 0.3 : 0)),
    (st.digging = wC(st.digging, 0, EC(4, step))));
  // ---- loader bucket: dig by pushing the edge into the ground, dump by tipping it
  let L = jbLoaderFK(st);
  (qw(st, JBS.LHALF, L.ey, L.ez, jbP), qw(st, -JBS.LHALF, L.ey, L.ez, jbQ));
  let edgeY = (jbP.y + jbQ.y) / 2,
    groundY = (nw(jbP.x, jbP.z) + nw(jbQ.x, jbQ.z)) / 2,
    lFull = st.lLoad >= JBS.LCAP * 0.97;
  if (((st.lInSoil = edgeY < groundY - 0.02), st.lInSoil)) {
    let push = Math.max(0, st.v) + Math.max(0, st.tilt.v) * 0.9,
      room = JBS.LCAP * 1.05 - st.lLoad;
    if (push > 0.02 && room > 0 && st.tilt.p > -0.45) {
      let n = SC.carve(jbP.x, jbP.z, jbQ.x, jbQ.z, edgeY, 0.24, Math.min(room, 2.4 * push * step + 1e-3));
      n > 0 &&
        ((st.lLoad += n),
        (st.dug += n),
        (st.digging = Math.min(1, st.digging + n * 30)),
        st.lLoad >= JBS.LCAP * 0.97 && !lFull && st.events.push({ type: `lFull` }),
        (st.relaxT += step),
        st.relaxT > 0.12 &&
          ((st.relaxT = 0),
          SC.relax(Math.min(jbP.x, jbQ.x) - 1.5, Math.min(jbP.z, jbQ.z) - 1.5, Math.max(jbP.x, jbQ.x) + 1.5, Math.max(jbP.z, jbQ.z) + 1.5, 2)));
    }
    st.v > 0 && (st.v *= Math.exp(-(lFull ? 2.5 : 0.9) * step));
  }
  let tipAng = st.tilt.p + st.pitch,
    wasLDump = st.lDump > 0.05;
  if (((st.lDump = 0), st.lLoad > 1e-3 && tipAng < -0.3)) {
    let rate = (-0.3 - tipAng) * 1.5 + 0.12,
      out = Math.min(st.lLoad, rate * step);
    ((st.lLoad -= out), (st.lPour += out), (st.lDump = CC(rate, 0, 1)), wasLDump || st.events.push({ type: `dump` }));
  }
  for (; st.lPour > 1e-4 && CT.clods.length < 255; ) {
    let vol = Math.min(st.lPour, 0.008 + jbRng() * 0.01),
      ly = -0.18,
      lz = 0.82;
    ((st.lPour -= vol),
      jbSpawnClod(
        st,
        (jbRng() - 0.5) * 2,
        L.py + ly * L.c + lz * L.s,
        L.pz - ly * L.s + lz * L.c,
        vol,
        sinY * (st.v + 0.5),
        -0.4 + jbRng() * 0.3,
        cosY * (st.v + 0.5),
      ));
  }
  // ---- backhoe bucket: dig like the excavator
  let F = jbFK(st);
  (jbArmPt(st, 0, F.ty, F.ts, jbM), qw(st, jbM.x, jbM.y, jbM.z, st.tip));
  let w = nw(st.tip.x, st.tip.z),
    wasIn = st.inSoil;
  if (((st.inSoil = st.tip.y < w - 0.02), st.inSoil && !wasIn && st.events.push({ type: `scoop` }), st.inSoil && st.hasPrev)) {
    let n = SC.carve(st.tipPrev.x, st.tipPrev.z, st.tip.x, st.tip.z, st.tip.y, JBS.BHALF, JBS.BCAP - st.bLoad);
    if (n > 0) {
      let spill = n * 0.05;
      ((st.dug += n),
        (st.bLoad += n - spill),
        (st.bPour += spill),
        (st.digging = Math.min(1, st.digging + n * 60)),
        st.bLoad >= JBS.BCAP * 0.97 && !full && st.events.push({ type: `bFull` }),
        (st.relaxT += step),
        st.relaxT > 0.1 &&
          ((st.relaxT = 0), SC.relax(st.tip.x - 1.6, st.tip.z - 1.6, st.tip.x + 1.6, st.tip.z + 1.6, 2)));
    }
  }
  let E = -Math.cos(F.t3),
    wasBDump = st.bDump > 0.1;
  if (((st.bDump = 0), st.bLoad > 1e-4 && E < 0.18)) {
    let rate = (0.18 - E) * 0.32 + 0.02,
      out = Math.min(st.bLoad, rate * step);
    ((st.bLoad -= out), (st.bPour += out), (st.bDump = CC(rate * 3, 0, 1)), wasBDump || st.events.push({ type: `dump` }));
  }
  if (!st.inSoil && (st.bPour > 0.0045 || (st.bPour > 0 && st.bLoad <= 1e-4))) {
    let bs = F.p2s + 0.55 * JBS.L3 * Math.cos(F.t3) + 0.12 * Math.sin(F.t3),
      by = F.p2y + 0.55 * JBS.L3 * Math.sin(F.t3) - 0.12 * Math.cos(F.t3),
      tvx = st.hasPrev ? (st.tip.x - st.tipPrev.x) / step : 0,
      tvz = st.hasPrev ? (st.tip.z - st.tipPrev.z) / step : 0;
    for (; st.bPour > 1e-5 && CT.clods.length < 258; ) {
      let vol = Math.min(st.bPour, 0.0035 + jbRng() * 0.003);
      ((st.bPour -= vol),
        jbArmPt(st, (jbRng() - 0.5) * JBS.BHALF * 1.8, by, bs, jbM),
        jbSpawnClod(st, jbM.x, jbM.y, jbM.z, vol, tvx * 0.4, (jbRng() - 0.3) * 0.6, tvz * 0.4));
      if (st.bPour < 0.0045 && st.bLoad > 1e-4) break;
    }
  }
  ((st.tipPrev.x = st.tip.x), (st.tipPrev.y = st.tip.y), (st.tipPrev.z = st.tip.z), (st.hasPrev = !0));
  // ---- engine
  if (run) {
    let target = Math.min(
      1,
      st.gas * 0.6 + (Math.abs(st.v) / JBS.VMAX) * 0.3 + st.hyd * 0.6 + st.digging * 0.5 + (st.lInSoil && st.v > 0.2 ? 0.3 : 0),
    );
    ((st.eload = wC(st.eload, target, EC(5, step))),
      (st.rpm = wC(st.rpm, JBS.IDLE_RPM + (JBS.MAX_RPM - JBS.IDLE_RPM) * (0.15 + 0.85 * st.eload), EC(3, step))));
  } else
    st.engine
      ? ((st.rpm = 170 + 40 * Math.sin(st.t * 25)), (st.eload = 0))
      : ((st.rpm = wC(st.rpm, 0, EC(2.2, step))), (st.eload = 0));
}
function jbSeatToggle() {
  jbSeatPress = !0;
}
// debug handle for browser checks
typeof window < `u` && (window.__jcb = JB);
