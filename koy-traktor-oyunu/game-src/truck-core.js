// ===================== DUMP TRUCK (added) =====================
// Model-space numbers come from the uploaded glTF (after its root transform).
var TKS = {
    S: 1.9,
    OZ: 0.905,
    OY: 0.71,
    WB: 3.68,
    HALF_TRACK: 0.665,
    VMAX: 12,
    VREV: 4,
    ACCEL: 2.6,
    BRAKE: 7.5,
    ROLL: 0.35,
    DRAG: 0.12,
    STEER: 0.55,
    STEER_RATE: 1.6,
    CAP: 4.5,
    FILL_DEPTH: 1.15,
    BED_MAX: 0.92,
    BED_SPEED: 0.3,
    DUMP_START: 0.3,
    HINGE: { y: -0.2, z: -1.82 },
    BED: { hx: 0.46, z0: -1.84, z1: 0.3, floor: -0.16, rim: 0.48 },
    CIRCLES: [-0.75, 1.55, 3.8],
    R: 1.25,
    EYE: { x: 0.26, y: 0.42, z: 1.02 },
    IDLE_RPM: 700,
    MAX_RPM: 2200,
  },
  TKspawn = { x: -43.8, z: 46.6, yaw: -Math.PI / 2 },
  tkRng = DC(911),
  tkTmp = { x: 0, y: 0, z: 0 },
  TK = tkNew();
function tkNew() {
  let st = {
    x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0,
    v: 0, steer: 0, wheelA: 0, gas: 0,
    bed: 0, bedCmd: 0, bedMoving: !1,
    load: 0, hauled: 0, pour: 0, dumping: 0,
    engine: !1, running: !1, crankEnd: 0, t: 0, rpm: 0, eload: 0,
    events: [],
  };
  return (tkReset(st), st);
}
function tkReset(st) {
  (Object.assign(st, {
    x: TKspawn.x, z: TKspawn.z, yaw: TKspawn.yaw,
    v: 0, steer: 0, pitch: 0, roll: 0, bed: 0, bedCmd: 0,
  }),
    (st.y = nw(st.x, st.z)),
    tkCircles(st));
}
function tkCircles(st) {
  TKS.CIRCLES.forEach((off, idx) => {
    let circle = TKC[idx];
    ((circle.x = st.x + Math.sin(st.yaw) * off),
      (circle.z = st.z + Math.cos(st.yaw) * off));
  });
}
// visual soil depth (m) in the bed for the current load
function tkFill(st) {
  return Math.min(1.12, st.load / TKS.CAP) * TKS.FILL_DEPTH;
}
function tkStep(st, inp, dt, engineOn) {
  let step = Math.min(dt, 0.05);
  ((st.t += step),
    engineOn && !st.engine
      ? ((st.engine = !0),
        (st.crankEnd = st.t + 1.2),
        st.events.push({ type: `crank` }))
      : !engineOn && st.engine && (st.engine = !1));
  let run = st.engine && st.t >= st.crankEnd;
  st.running = run;
  let thr = inp && run ? inp.throttle : 0,
    brk = inp ? inp.brake : 0,
    steerIn = inp ? inp.steer : 0,
    lift = inp && run ? inp.liftCmd : 0,
    loadF = st.load / TKS.CAP,
    acc = 0;
  (thr > 0 &&
    (acc +=
      st.v < -0.2
        ? TKS.BRAKE
        : st.v > TKS.VMAX
          ? 0
          : TKS.ACCEL * (1 - 0.3 * loadF)),
    brk > 0 &&
      (acc -=
        st.v > 0.2
          ? TKS.BRAKE
          : run && st.v > -TKS.VREV
            ? TKS.ACCEL * 0.7
            : 0),
    (st.gas = thr > 0 || (brk > 0 && st.v <= 0.2 && run) ? 1 : 0),
    (st.v += acc * step));
  let rolling = thr || brk ? 0 : TKS.ROLL + (inp ? 0 : 4);
  ((st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), rolling * step)),
    (st.v *= Math.exp(-TKS.DRAG * step)),
    (thr || brk || Math.abs(st.v) > 0.4) &&
      (st.v -= 9.81 * Math.sin(st.pitch) * 0.55 * step));
  let steerMax = TKS.STEER / (1 + Math.abs(st.v) * 0.09);
  ((st.steer += CC(
    steerIn * steerMax - st.steer,
    -TKS.STEER_RATE * step,
    TKS.STEER_RATE * step,
  )),
    (st.yaw -= ((st.v * Math.tan(st.steer)) / TKS.WB) * step),
    (st.x += Math.sin(st.yaw) * st.v * step),
    (st.z += Math.cos(st.yaw) * st.v * step),
    (st.x = CC(st.x, -285, 285)),
    (st.z = CC(st.z, -285, 285)),
    (st.wheelA += (st.v * step) / 0.475));
  let hit = !1;
  for (let off of TKS.CIRCLES) {
    let cx = st.x + Math.sin(st.yaw) * off,
      cz = st.z + Math.cos(st.yaw) * off;
    ((hit = hT(st, cx, cz, TKS.R, uw) || hit),
      (hit = hT(st, cx, cz, TKS.R, dw) || hit),
      (hit = hT(st, cx, cz, TKS.R, gT) || hit),
      (hit = hT(st, cx, cz, TKS.R, JBC) || hit));
  }
  (hit &&
    (Math.abs(st.v) > 1.5 &&
      st.events.push({ type: `bump`, strength: Math.abs(st.v) }),
    (st.v *= 0.3)),
    tkCircles(st));
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    ground = (lat, lon) =>
      nw(st.x + lat * cosY + lon * sinY, st.z - lat * sinY + lon * cosY),
    ht = TKS.HALF_TRACK,
    front = TKS.WB,
    fl = ground(ht, front),
    fr = ground(-ht, front),
    rl = Math.max(ground(ht, 0.57), ground(ht, -0.56)),
    rr = Math.max(ground(-ht, 0.57), ground(-ht, -0.56)),
    pitchT = Math.atan2((fl + fr) / 2 - (rl + rr) / 2, front),
    rollT = Math.atan2((fl + rl) / 2 - (fr + rr) / 2, ht * 2),
    yT = (rl + rr) / 2,
    blend = EC(10, step);
  ((st.y = Math.abs(st.y - yT) > 2 ? yT : wC(st.y, yT, blend)),
    (st.pitch = wC(st.pitch, pitchT, blend)),
    (st.roll = wC(st.roll, rollT, blend)));
  // dump bed hydraulics
  st.bedCmd = lift;
  let prevBed = st.bed;
  ((st.bed = CC(st.bed + lift * TKS.BED_SPEED * step, 0, 1)),
    (st.bedMoving = Math.abs(st.bed - prevBed) > 1e-6));
  let tilt = st.bed * TKS.BED_MAX + st.pitch;
  if (((st.dumping = 0), st.load > 1e-3 && tilt > TKS.DUMP_START)) {
    let rate = (tilt - TKS.DUMP_START) * 2.4 + 0.15,
      out = Math.min(st.load, rate * step);
    ((st.load -= out),
      (st.pour += out),
      (st.hauled += out),
      (st.dumping = CC(rate / 1.2, 0, 1)),
      st.load <= 1e-3 && ((st.load = 0), st.events.push({ type: `empty` })));
  }
  for (; st.pour > 1e-4 && CT.clods.length < 250; ) {
    let vol = Math.min(st.pour, 0.012 + tkRng() * 0.012);
    ((st.pour -= vol),
      qw(
        st,
        (tkRng() - 0.5) * 1.6,
        1.15 + tkRng() * 0.35,
        -2.05 - tkRng() * 0.2,
        tkTmp,
      ));
    let sp = 1.2 + tkRng() * 1.2;
    CT.clods.push({
      x: tkTmp.x,
      y: tkTmp.y,
      z: tkTmp.z,
      vx: -sinY * sp + (tkRng() - 0.5) * 0.6 + sinY * st.v,
      vy: -0.3 + tkRng() * 0.4,
      vz: -cosY * sp + (tkRng() - 0.5) * 0.6 + cosY * st.v,
      vol: vol,
      spin: tkRng() * 6.28,
    });
  }
  if (run) {
    let target = Math.min(
      1,
      st.gas * 0.65 +
        (Math.abs(st.v) / TKS.VMAX) * 0.35 +
        (st.bedMoving ? 0.55 : 0) +
        loadF * 0.2 * st.gas,
    );
    ((st.eload = wC(st.eload, target, EC(5, step))),
      (st.rpm = wC(
        st.rpm,
        TKS.IDLE_RPM + (TKS.MAX_RPM - TKS.IDLE_RPM) * (0.12 + 0.88 * st.eload),
        EC(3, step),
      )));
  } else
    st.engine
      ? ((st.rpm = 170 + 40 * Math.sin(st.t * 25)), (st.eload = 0))
      : ((st.rpm = wC(st.rpm, 0, EC(2.2, step))), (st.eload = 0));
}
// called for every falling clod; true = it landed in the truck bed
function tkCatch(clod) {
  let st = TK;
  if (st.bed > 0.04) return !1;
  let dx = clod.x - st.x,
    dz = clod.z - st.z;
  if (Math.abs(dx) > 9 || Math.abs(dz) > 9) return !1;
  let cosY = Math.cos(st.yaw),
    sinY = Math.sin(st.yaw),
    lx = dx * cosY - dz * sinY,
    lz = dx * sinY + dz * cosY,
    B = TKS.BED,
    S = TKS.S;
  if (
    Math.abs(lx) > B.hx * S ||
    lz < (B.z0 + TKS.OZ) * S ||
    lz > (B.z1 + TKS.OZ) * S
  )
    return !1;
  let floorY =
      st.y +
      (B.floor + TKS.OY) * S * Math.cos(st.pitch) +
      lz * Math.sin(st.pitch),
    top = floorY + tkFill(st);
  return clod.y > top + 0.05 || clod.y < floorY - 0.7
    ? !1
    : st.load >= TKS.CAP * 1.1
      ? ((clod.y = top + 0.02),
        (clod.vy = Math.max(clod.vy, 0)),
        (clod.vx = (lx > 0 ? cosY : -cosY) * 2.2),
        (clod.vz = (lx > 0 ? -sinY : sinY) * 2.2),
        !1)
      : ((st.load += clod.vol), !0);
}
// auto-dig: aim the bucket at the truck bed when the truck is parked within reach
function tkAutoTarget(ex, ignoreFull) {
  let st = TK;
  if (st.bed > 0.04 || Math.abs(st.v) > 0.5) return null;
  if (!ignoreFull && st.load >= TKS.CAP) return null;
  let bedZ = ((TKS.BED.z0 + TKS.BED.z1) / 2 + TKS.OZ) * TKS.S,
    bx = st.x + Math.sin(st.yaw) * bedZ - ex.x,
    bz = st.z + Math.cos(st.yaw) * bedZ - ex.z,
    dist = Math.hypot(bx, bz);
  if (dist < 2.3 || dist > 3.7) return null;
  let want = Math.atan2(bx, bz) - ex.yaw,
    cur = ex.j.swing.p;
  return {
    swing: cur + Math.atan2(Math.sin(want - cur), Math.cos(want - cur)),
    reach: dist,
  };
}
// debug handle for checking the truck from the browser console
typeof window < `u` && (window.__truck = TK);
