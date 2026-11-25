// ===================== VIBRATORY ROAD ROLLER (SİLİNDİR SR 110 C) CORE =====================
// Machine frame: origin on ground under rear drive axle, +z forward, +x left, metres.
var RLS = {
    WB: 3.15,          // rear axle (0) -> front vibrating steel drum (+3.15)
    WAIST_Z: 1.48,     // articulated steering center hinge
    DRUM_Z: 3.15,
    DRUM_R: 0.72,
    DRUM_W: 2.18,
    WHEEL_R: 0.70,
    TRACK_R: 0.90,
    VMAX: 9.2,
    VREV: 4.8,
    ACCEL: 2.4,
    BRAKE: 7.4,
    ROLL: 0.45,
    DRAG: 0.16,
    STEER: 0.58,
    STEER_RATE: 1.55,
    CIRCLES: [-0.45, 1.55, 3.25],
    R: 1.18,
    IDLE_RPM: 800,
    MAX_RPM: 2200,
    CRANK: 1.35,
  },
  RLspawn = { x: -75.5, z: -33.5, yaw: 0 },
  RL = rlNew();

function rlNew() {
  let st = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    v: 0,
    steer: 0,
    drumA: 0,
    wheelA: 0,
    gas: 0,
    vibe: !0,          // eccentric drum vibration (G toggle)
    vibeAmp: 0,        // 0..1 active rolling vibration intensity
    sprinkler: !0,     // water mist bar for hot asphalt (U toggle)
    steaming: 0,       // 0..1 hot asphalt steam plume
    compacting: 0,     // 0..1 compaction activity
    compactM2: 0,
    drumTip: { x: 0, y: 0, z: 0 },
    relaxT: 0,
    engine: !1,
    running: !1,
    crankEnd: 0,
    t: 0,
    rpm: 0,
    eload: 0,
    events: [],
  };
  return (rlReset(st), st);
}

function rlReset(st) {
  Object.assign(st, {
    x: RLspawn.x,
    z: RLspawn.z,
    yaw: RLspawn.yaw,
    v: 0,
    steer: 0,
    pitch: 0,
    roll: 0,
    vibe: !0,
    vibeAmp: 0,
    sprinkler: !0,
    steaming: 0,
    compacting: 0,
  });
  st.y = nw(st.x, st.z);
  rlCircles(st);
}

function rlCircles(st) {
  if (typeof RLC === `undefined`) return;
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw);
  RLS.CIRCLES.forEach((off, i) => {
    RLC[i].x = st.x + sinY * off;
    RLC[i].z = st.z + cosY * off;
  });
}

function rlInput() {
  let drive = Math.max(gC(rC.gas), hC(`KeyW`), hC(`ArrowUp`)) - Math.max(gC(rC.brake), hC(`KeyS`), hC(`ArrowDown`)),
    steer = Math.max(gC(rC.right), hC(`KeyD`), hC(`ArrowRight`)) - Math.max(gC(rC.left), hC(`KeyA`), hC(`ArrowLeft`));
  return {
    throttle: Math.max(0, drive),
    brake: Math.max(0, -drive),
    steer: steer,
  };
}

function rlVibeToggle() {
  RL.vibe = !RL.vibe;
  RL.events.push({ type: RL.vibe ? `vibeOn` : `vibeOff` });
}

function rlWaterToggle() {
  RL.sprinkler = !RL.sprinkler;
  RL.events.push({ type: RL.sprinkler ? `waterOn` : `waterOff` });
}

function rlCompactDrum(st, step) {
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    dx = st.x + sinY * RLS.DRUM_Z,
    dz = st.z + cosY * RLS.DRUM_Z,
    da = st.yaw - st.steer * 0.85,
    rx = Math.cos(da),
    rz = -Math.sin(da),
    halfW = RLS.DRUM_W * 0.48,
    x0 = dx - rx * halfW,
    z0 = dz - rz * halfW,
    x1 = dx + rx * halfW,
    z1 = dz + rz * halfW;

  st.drumTip.x = dx;
  st.drumTip.y = nw(dx, dz);
  st.drumTip.z = dz;

  let speedAbs = Math.abs(st.v);
  if (speedAbs < 0.08 || !st.running) {
    st.compacting = wC(st.compacting, 0, EC(7, step));
    st.steaming = wC(st.steaming, 0, EC(6, step));
    return;
  }

  let mult = st.vibe ? 2.4 : 1.0,
    deltaByte = Math.max(4, Math.round(step * speedAbs * 28 * mult));

  // Level uneven gravel/asphalt mounds slightly under heavy drum weight
  st.relaxT += step;
  if (st.relaxT > 0.1 || st.vibe) {
    st.relaxT = 0;
    SC.relax(
      Math.min(x0, x1) - 0.9,
      Math.min(z0, z1) - 0.9,
      Math.max(x0, x1) + 0.9,
      Math.max(z0, z1) + 0.9,
      st.vibe ? 3 : 2,
      st.vibe ? 0.34 : 0.2,
    );
    // Gently press high loose aggregate / soil humps down into compacted grade
    let cMinX = Math.max(0, SC.toNode(Math.min(x0, x1) - 0.5)),
      cMaxX = Math.min(SC.n - 1, SC.toNode(Math.max(x0, x1) + 0.5)),
      cMinZ = Math.max(0, SC.toNode(Math.min(z0, z1) - 0.5)),
      cMaxZ = Math.min(SC.n - 1, SC.toNode(Math.max(z0, z1) + 0.5)),
      chg = !1;
    for (let iz = cMinZ; iz <= cMaxZ; iz++) {
      for (let ix = cMinX; ix <= cMaxX; ix++) {
        let idx = iz * SC.n + ix,
          d = SC.data[idx];
        if (d > 0.025) {
          SC.data[idx] = Math.max(0.015, d - step * 0.09 * mult);
          SC.mark(iz, ix);
          chg = !0;
        }
      }
    }
    if (chg) SC.version++;
  }

  let res = RS_MASK.compactPass(x0, z0, x1, z1, 0.55, deltaByte),
    worked = res.gravelWork + res.asphaltWork,
    centerSamp = RS_MASK.sampleAt(dx, dz),
    onHotAsphalt = (centerSamp.stage & 8) !== 0 && !(centerSamp.stage & 16);

  if (worked > 0) {
    st.compactM2 += worked * RS_MASK.cellArea * 0.22;
  }
  let targetWork = worked > 0 || centerSamp.stage & (2 | 8) ? CC(speedAbs / 2.2, 0.25, 1) : 0;
  st.compacting = wC(st.compacting, targetWork, EC(9, step));
  st.steaming = wC(st.steaming, onHotAsphalt && st.sprinkler ? 1 : onHotAsphalt ? 0.45 : 0, EC(7, step));
}

function rlStep(st, inp, dt, engineOn) {
  let step = Math.min(dt, 0.05);
  st.t += step;
  if (engineOn && !st.engine) {
    st.engine = !0;
    st.crankEnd = st.t + RLS.CRANK;
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

  if (thr > 0) acc += st.v < -0.2 ? RLS.BRAKE : st.v > RLS.VMAX ? 0 : RLS.ACCEL;
  if (brk > 0) acc -= st.v > 0.2 ? RLS.BRAKE : run && st.v > -RLS.VREV ? RLS.ACCEL * 0.78 : 0;
  st.gas = thr > 0 || (brk > 0 && st.v <= 0.2 && run) ? 1 : 0;
  st.v += acc * step;

  let rolling = thr || brk ? 0 : RLS.ROLL + (run ? 0 : 1.8);
  st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), rolling * step);
  st.v *= Math.exp(-(RLS.DRAG + st.compacting * 0.45) * step);
  if (thr || brk || Math.abs(st.v) > 0.3) {
    st.v -= 9.81 * Math.sin(st.pitch) * 0.55 * step;
  }

  let steerMax = RLS.STEER / (1 + Math.abs(st.v) * 0.08);
  st.steer += CC(steerIn * steerMax - st.steer, -RLS.STEER_RATE * step, RLS.STEER_RATE * step);
  st.yaw -= ((st.v * Math.tan(st.steer)) / RLS.WB) * step;
  st.x += Math.sin(st.yaw) * st.v * step;
  st.z += Math.cos(st.yaw) * st.v * step;
  st.x = CC(st.x, -285, 285);
  st.z = CC(st.z, -285, 285);
  st.drumA += (st.v * step) / RLS.DRUM_R;
  st.wheelA += (st.v * step) / RLS.WHEEL_R;

  let hit = !1;
  for (let off of RLS.CIRCLES) {
    let cx = st.x + Math.sin(st.yaw) * off,
      cz = st.z + Math.cos(st.yaw) * off;
    hit = hT(st, cx, cz, RLS.R, uw) || hit;
    hit = hT(st, cx, cz, RLS.R, dw) || hit;
    hit = hT(st, cx, cz, RLS.R, gT) || hit;
    hit = hT(st, cx, cz, RLS.R, TKC) || hit;
    hit = hT(st, cx, cz, RLS.R, JBC) || hit;
    if (typeof GRC !== `undefined`) hit = hT(st, cx, cz, RLS.R, GRC) || hit;
    if (typeof COC !== `undefined`) hit = hT(st, cx, cz, RLS.R, COC) || hit;
  }
  if (hit) {
    if (Math.abs(st.v) > 1.5) st.events.push({ type: `bump`, strength: Math.abs(st.v) });
    st.v *= 0.3;
  }
  rlCircles(st);

  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    gAt = (lat, lon) => nw(st.x + lat * cosY + lon * sinY, st.z - lat * sinY + lon * cosY),
    fl = gAt(RLS.DRUM_W * 0.45, RLS.DRUM_Z),
    fr = gAt(-RLS.DRUM_W * 0.45, RLS.DRUM_Z),
    rl = gAt(RLS.TRACK_R, 0),
    rr = gAt(-RLS.TRACK_R, 0),
    rearAvg = (rl + rr) * 0.5,
    frontAvg = (fl + fr) * 0.5,
    pitchT = Math.atan2(frontAvg - rearAvg, RLS.WB),
    rollT = Math.atan2((fl + rl) * 0.5 - (fr + rr) * 0.5, RLS.TRACK_R * 2),
    blend = EC(10, step);

  st.y = Math.abs(st.y - rearAvg) > 2 ? rearAvg : wC(st.y, rearAvg, blend);
  st.pitch = wC(st.pitch, pitchT, blend);
  st.roll = wC(st.roll, rollT, blend);

  if (Math.abs(st.v) > 0.25 && Sw.stampTrack) {
    for (let sx of [-1, 1]) {
      Sw.stampTrack(st.x + sx * RLS.TRACK_R * cosY, st.z - sx * RLS.TRACK_R * sinY, 0.34, Math.min(20, Math.abs(st.v) * 5));
    }
  }

  st.vibeAmp = wC(st.vibeAmp, run && st.vibe ? (Math.abs(st.v) > 0.15 ? 1 : 0.45) : 0, EC(9, step));
  rlCompactDrum(st, step);

  if (run) {
    let target = Math.min(1, st.gas * 0.52 + (Math.abs(st.v) / RLS.VMAX) * 0.28 + (st.vibe ? 0.35 : 0) + st.compacting * 0.35);
    st.eload = wC(st.eload, target, EC(5, step));
    st.rpm = wC(st.rpm, RLS.IDLE_RPM + (RLS.MAX_RPM - RLS.IDLE_RPM) * (0.14 + 0.86 * st.eload), EC(3, step));
  } else if (st.engine) {
    st.rpm = 165 + 42 * Math.sin(st.t * 25);
    st.eload = 0;
  } else {
    st.rpm = wC(st.rpm, 0, EC(2.2, step));
    st.eload = 0;
  }
}

typeof window < `u` && (window.__roller = RL);
