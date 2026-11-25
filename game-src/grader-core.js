// ===================== MOTOR GRADER (GREYDER) CORE (added) =====================
// Machine frame: origin on ground under rear tandem center, +z forward, +x left, metres.
var GRS = {
    WB: 4.55,          // rear tandem center (0) -> front axle (+4.55)
    FRONT_Z: 4.55,
    BLADE_Z: 2.25,     // center moldboard drawbar circle
    TANDEM_OFF: 0.74,  // each rear tandem axle from 0
    RIPPER_Z: -2.45,
    TRACK_F: 1.08,
    TRACK_R: 1.06,
    RF: 0.66,
    RR: 0.71,
    VMAX: 10.5,
    VREV: 5.0,
    ACCEL: 2.4,
    BRAKE: 7.2,
    ROLL: 0.42,
    DRAG: 0.14,
    STEER: 0.56,
    STEER_RATE: 1.45,
    BLADE_HALF: 1.75,  // 3.5m wide moldboard blade
    BLADE_MIN: -0.2,
    BLADE_MAX: 0.42,
    BLADE_SPD: 0.34,
    ANGLE_MAX: 0.62,   // ~35.5 deg blade yaw
    ANGLE_SPD: 0.85,
    CIRCLES: [-1.4, 0.3, 2.25, 4.35],
    R: 1.2,
    IDLE_RPM: 750,
    MAX_RPM: 2250,
    CRANK: 1.45,
  },
  GRspawn = { x: -84.0, z: -32.0, yaw: Math.PI / 2 },
  // Damaged roadwork / asphalt-scraping zones (x0..x1, z0..z1 / path center)
  GR_ZONES = [
    { id: 0, name: `Ana Yol Şantiye`, x0: -58, x1: -28, halfW: 3.7 },
    { id: 1, name: `Doğu Köy Yolu`, x0: 66, x1: 96, halfW: 3.7 },
    { id: 2, name: `Toprak Yol Geçişi`, x0: -40, x1: -12, zFix: 68.0, halfW: 2.8 },
  ],
  grRng = DC(7741),
  grTmpA = { x: 0, y: 0, z: 0 },
  grTmpB = { x: 0, y: 0, z: 0 },
  grCellSet = new Set(),
  grZonesSeeded = !1,
  GR = grNew();

function grZoneZ(zone, x) {
  return zone.zFix !== void 0 ? zone.zFix : RC(x);
}

// Seed rough mud/damaged asphalt humps & broken-surface mask on GR_ZONES
function grSeedZones() {
  if (grZonesSeeded) return;
  grZonesSeeded = !0;
  for (let zn of GR_ZONES) {
    let xMin = zn.x0,
      xMax = zn.x1,
      nMin = SC.toNode(xMin),
      nMax = SC.toNode(xMax);
    for (let ix = nMin; ix <= nMax; ix++) {
      let wx = SC.nodeX(ix),
        zc = grZoneZ(zn, wx),
        iz0 = SC.toNode(zc - zn.halfW),
        iz1 = SC.toNode(zc + zn.halfW);
      for (let iz = iz0; iz <= iz1; iz++) {
        if (ix < 0 || iz < 0 || ix >= SC.n || iz >= SC.n) continue;
        let wz = SC.nodeX(iz),
          dNorm = Math.abs(wz - zc) / zn.halfW;
        if (dNorm > 1) continue;
        let fade = 1 - dNorm * dNorm,
          hump =
            (0.09 +
              0.085 * Math.sin(wx * 0.42 + wz * 0.55) +
              0.055 * Math.cos(wx * 0.95 - wz * 0.8)) *
            fade;
        let idx = iz * SC.n + ix;
        SC.data[idx] += hump;
        SC.mark(iz, ix);
      }
    }
    // Paint damaged/muddy patch indicator into Sw B channel (65 = broken/dirty patch needing scrape)
    if (Sw.paintScrape) {
      let steps = Math.ceil((xMax - xMin) / 2);
      for (let i = 0; i < steps; i++) {
        let ax = wC(xMin, xMax, i / steps),
          bx = wC(xMin, xMax, (i + 1) / steps);
        Sw.paintScrape(ax, grZoneZ(zn, ax), bx, grZoneZ(zn, bx), zn.halfW * 0.88, 65, (px, pz) =>
          grCanScrape(px, pz),
        );
      }
    }
  }
  SC.version++;
}

function grNew() {
  let st = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
    tandemPitch: 0,
    v: 0,
    steer: 0,
    wheelA: 0,
    gas: 0,
    bladeH: 0.24,      // meters relative to road contact (<= 0 cuts/levels)
    bladeCmd: 0,
    bladeAng: -0.26,   // horizontal angle (rad), casts spoil sideways
    angleCmd: 0,
    ripper: 0,         // 0 = up, 1 = down
    ripperCmd: 0,
    bladeCarry: 0,     // spoil volume sliding along the curved moldboard
    bladeMat: `soil`,  // 'soil' | 'gravel'
    bladeWork: 0,      // 0..1 intensity
    ripping: 0,        // 0..1 intensity
    castDir: 0,        // -1 left or +1 right trailing tip
    castTip: { x: 0, y: 0, z: 0 },
    gradedM2: 0,
    movedM3: 0,
    hyd: 0,
    hydCmd: 0,
    relaxT: 0,
    engine: !1,
    running: !1,
    crankEnd: 0,
    t: 0,
    rpm: 0,
    eload: 0,
    events: [],
  };
  return (grReset(st), st);
}

function grReset(st) {
  Object.assign(st, {
    x: GRspawn.x,
    z: GRspawn.z,
    yaw: GRspawn.yaw,
    v: 0,
    steer: 0,
    pitch: 0,
    roll: 0,
    tandemPitch: 0,
    bladeH: 0.24,
    bladeAng: -0.26,
    ripperCmd: 0,
    ripper: 0,
    bladeCarry: 0,
    bladeWork: 0,
    ripping: 0,
  });
  st.y = nw(st.x, st.z);
  grCircles(st);
}

function grCircles(st) {
  if (typeof GRC === `undefined`) return;
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw);
  GRS.CIRCLES.forEach((off, i) => {
    GRC[i].x = st.x + sinY * off;
    GRC[i].z = st.z + cosY * off;
  });
}

// Allow grader scraping & leveling on dirt, fields, shoulders AND roads (protecting buildings, farmyard & Chakir compound pads)
function grCanScrape(x, z) {
  if (Math.abs(x) > 294 || Math.abs(z) > 294) return !1;
  if (cw(x, z, VC)) return !1;
  if (typeof coNoDig === `function` && coNoDig(x, z)) return !1;
  if (typeof pvInSiloPad === `function` && pvInSiloPad(x, z)) return !1;
  for (let b of uw) {
    if (b.k === `b`) {
      let rx = x - b.x,
        rz = z - b.z;
      if (Math.abs(rx * b.c - rz * b.s) < b.hx + 0.3 && Math.abs(rx * b.s + rz * b.c) < b.hz + 0.3)
        return !1;
    } else if (b.k === `c`) {
      let rx = x - b.x,
        rz = z - b.z,
        rad = b.r + 0.4;
      if (rx * rx + rz * rz < rad * rad) return !1;
    }
  }
  return !0;
}

function grInput() {
  let drive = Math.max(gC(rC.gas), hC(`KeyW`), hC(`ArrowUp`)) - Math.max(gC(rC.brake), hC(`KeyS`), hC(`ArrowDown`)),
    steer = Math.max(gC(rC.right), hC(`KeyD`), hC(`ArrowRight`)) - Math.max(gC(rC.left), hC(`KeyA`), hC(`ArrowLeft`)),
    lift = Math.max(gC(rC.liftUp), hC(`KeyE`)) - Math.max(gC(rC.liftDown), hC(`KeyQ`)),
    angle = Math.max(gC(rC.grAngR), hC(`KeyX`)) - Math.max(gC(rC.grAngL), hC(`KeyZ`));
  return {
    throttle: Math.max(0, drive),
    brake: Math.max(0, -drive),
    steer: steer,
    bladeCmd: lift,
    angleCmd: angle,
  };
}

function grSpawnDebris(wx, wy, wz, vx, vy, vz, vol, mat) {
  if (CT.clods.length >= 255) return;
  CT.clods.push({
    x: wx,
    y: wy,
    z: wz,
    vx: vx + (grRng() - 0.5) * 0.8,
    vy: vy,
    vz: vz + (grRng() - 0.5) * 0.8,
    vol: vol,
    spin: grRng() * 6.28,
    mat: mat || `soil`,
  });
}

// Carve bumps & level ground along the angled moldboard blade, pushing spoil sideways to a windrow
function grScrapeBlade(st, step) {
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    bx = st.x + sinY * GRS.BLADE_Z,
    bz = st.z + cosY * GRS.BLADE_Z,
    // Blade axis in world XZ (rotated horizontally by yaw + bladeAng)
    ba = st.yaw + st.bladeAng,
    rightX = Math.cos(ba),
    rightZ = -Math.sin(ba),
    groundCenter = nw(bx, bz),
    // Smooth desired road plane anchored between front and rear tire planes
    targetPlaneY = groundCenter + st.bladeH;

  // Blade is raised above ground -> no cut, decay carry
  if (st.bladeH > 0.035) {
    st.bladeWork = wC(st.bladeWork, 0, EC(8, step));
    st.bladeCarry = Math.max(0, st.bladeCarry - step * 0.5);
    return 0;
  }

  let speedAbs = Math.abs(st.v);
  if (speedAbs < 0.08) {
    st.bladeWork = wC(st.bladeWork, 0, EC(6, step));
    return 0;
  }

  // Average terrain elevation along the blade span so leveling pulls ridges down & fills dips
  let sumH = 0,
    cnt = 0;
  for (let i = -3; i <= 3; i++) {
    let s = (i / 3) * (GRS.BLADE_HALF - 0.15),
      px = bx + rightX * s,
      pz = bz + rightZ * s;
    if (grCanScrape(px, pz)) {
      sumH += nw(px, pz);
      cnt++;
    }
  }
  if (!cnt) return 0;

  let avgGround = sumH / cnt,
    cutTargetY = avgGround + st.bladeH * 0.85,
    // Scrape & level nodes along the 3.5m blade span
    x0 = bx - rightX * GRS.BLADE_HALF,
    z0 = bz - rightZ * GRS.BLADE_HALF,
    x1 = bx + rightX * GRS.BLADE_HALF,
    z1 = bz + rightZ * GRS.BLADE_HALF,
    rad = 0.55,
    n = SC.n,
    ixMin = Math.max(0, SC.toNode(Math.min(x0, x1) - rad) - 1),
    ixMax = Math.min(n - 1, SC.toNode(Math.max(x0, x1) + rad) + 1),
    izMin = Math.max(0, SC.toNode(Math.min(z0, z1) - rad) - 1),
    izMax = Math.min(n - 1, SC.toNode(Math.max(z0, z1) + rad) + 1),
    dx = x1 - x0,
    dz = z1 - z0,
    len2 = dx * dx + dz * dz || 1e-6,
    cutVol = 0,
    smoothedVol = 0,
    ripBoost = st.ripper > 0.5 ? 1.45 : 1.0,
    rate = Math.min(1, step * (2.6 + speedAbs * 0.75) * ripBoost);

  for (let iz = izMin; iz <= izMax; iz++) {
    let wz = SC.nodeX(iz);
    for (let ix = ixMin; ix <= ixMax; ix++) {
      let wx = SC.nodeX(ix),
        proj = ((wx - x0) * dx + (wz - z0) * dz) / len2;
      proj = proj < 0 ? 0 : proj > 1 ? 1 : proj;
      let cx = x0 + dx * proj,
        cz = z0 + dz * proj,
        d2 = (wx - cx) * (wx - cx) + (wz - cz) * (wz - cz);
      if (d2 > rad * rad || !grCanScrape(wx, wz)) continue;
      let idx = iz * n + ix,
        baseY = SC.baseAt(ix, iz),
        curY = baseY + SC.data[idx],
        diff = curY - cutTargetY,
        w = 1 - d2 / (rad * rad);
      if (diff > 0.004) {
        // Shave off high bump / dirt / worn asphalt
        let cut = Math.min(diff, Math.max(0.015, diff * rate * 1.35)) * w;
        if (SC.data[idx] - cut >= -0.45) {
          SC.data[idx] -= cut;
          SC.mark(iz, ix);
          cutVol += cut * SC.cellArea;
        }
      } else if (diff < -0.008 && st.bladeCarry > 0.002) {
        // Fill low ruts using material carried in front of the moldboard
        let fill = Math.min(-diff * 0.65, 0.04) * w * rate;
        SC.data[idx] += fill;
        SC.mark(iz, ix);
        st.bladeCarry = Math.max(0, st.bladeCarry - fill * SC.cellArea);
        smoothedVol += fill * SC.cellArea;
      }
      let key = iz * n + ix;
      if (!grCellSet.has(key)) {
        grCellSet.add(key);
        st.gradedM2 += SC.cellArea;
      }
    }
  }

  // Spread dumped gravel piles across full blade span when carrying/hitting gravel!
  let centerSurf = typeof RS_MASK < `u` ? RS_MASK.sampleAt(bx, bz) : { gravel: 0, asphalt: 0 };
  if (centerSurf.gravel > 0.35 && !(centerSurf.stage & 8)) st.bladeMat = `gravel`;
  else if (st.bladeCarry < 0.03 && centerSurf.gravel < 0.2) st.bladeMat = `soil`;

  if (typeof RS_MASK < `u` && st.bladeMat === `gravel`) {
    RS_MASK.paintGravel(x0, z0, x1, z1, 0.56, 240, grCanScrape);
  }
  // Paint freshly leveled crushed-stone subgrade onto live surface mask (B channel = 240)
  if (Sw.paintScrape) {
    Sw.paintScrape(x0, z0, x1, z1, 0.48, 240, grCanScrape);
  }

  // Relax micro-ridges cleanly under the blade
  st.relaxT += step;
  if (st.relaxT > 0.14) {
    st.relaxT = 0;
    SC.relax(
      Math.min(x0, x1) - 1.2,
      Math.min(z0, z1) - 1.2,
      Math.max(x0, x1) + 1.2,
      Math.max(z0, z1) + 1.2,
      2,
      0.18,
    );
  }

  if (cutVol > 0) {
    SC.version++;
    st.movedM3 += cutVol;
    st.bladeCarry = Math.min(0.95, st.bladeCarry + cutVol);
  }

  // ---- Side-casting / Windrowing off trailing angled blade edge ----
  // When angled (bladeAng != 0) & moving, spoil slides along the blade to the trailing tip
  let flowDir = Math.abs(st.bladeAng) > 0.07 ? Math.sign(st.bladeAng * (st.v >= 0 ? 1 : -1)) : 1;
  st.castDir = flowDir;
  let tipSpan = flowDir * (GRS.BLADE_HALF + 0.34),
    tipX = bx + rightX * tipSpan,
    tipZ = bz + rightZ * tipSpan;
  st.castTip.x = tipX;
  st.castTip.y = nw(tipX, tipZ);
  st.castTip.z = tipZ;

  // Deposit windrow ridge off the side edge whenever blade is carrying cut spoil
  let sideCastRate = (0.25 + Math.abs(Math.sin(st.bladeAng)) * 1.45) * Math.min(1, speedAbs / 1.4);
  if (st.bladeCarry > 0.015 && grCanScrape(tipX, tipZ)) {
    let dump = Math.min(st.bladeCarry, Math.max(cutVol * 0.72, st.bladeCarry * sideCastRate * step * 2.2));
    if (dump > 0.002) {
      SC.deposit(tipX, tipZ, dump, 0.58);
      st.bladeCarry -= dump;
      if (CT.clods.length < 252 && grRng() < 0.45) {
        grSpawnDebris(
          tipX,
          st.castTip.y + 0.18,
          tipZ,
          rightX * flowDir * (0.9 + speedAbs * 0.25),
          0.35 + grRng() * 0.45,
          rightZ * flowDir * (0.9 + speedAbs * 0.25),
          Math.min(0.016, dump * 0.45 + 0.005),
          st.bladeMat,
        );
      }
    }
  }

  let workAmt = CC((cutVol * 28 + smoothedVol * 18) + (st.bladeH <= 0 ? speedAbs * 0.16 : 0), 0, 1);
  st.bladeWork = wC(st.bladeWork, workAmt, EC(10, step));
  return cutVol;
}

function grStep(st, inp, dt, engineOn) {
  let step = Math.min(dt, 0.05);
  st.t += step;
  if (engineOn && !st.engine) {
    st.engine = !0;
    st.crankEnd = st.t + GRS.CRANK;
    st.events.push({ type: `crank` });
  } else if (!engineOn && st.engine) {
    st.engine = !1;
  }
  let run = st.engine && st.t >= st.crankEnd;
  st.running = run;

  // ---- Driving kinematics (long wheelbase grader)
  let thr = inp && run ? inp.throttle : 0,
    brk = inp ? inp.brake : 0,
    steerIn = inp ? inp.steer : 0,
    scrapingLoad = st.bladeWork * 0.45 + st.ripping * 0.35,
    acc = 0;

  if (thr > 0) {
    acc += st.v < -0.2 ? GRS.BRAKE : st.v > GRS.VMAX ? 0 : GRS.ACCEL * (1 - 0.28 * scrapingLoad);
  }
  if (brk > 0) {
    acc -= st.v > 0.2 ? GRS.BRAKE : run && st.v > -GRS.VREV ? GRS.ACCEL * 0.72 : 0;
  }
  st.gas = thr > 0 || (brk > 0 && st.v <= 0.2 && run) ? 1 : 0;
  st.v += acc * step;

  let rolling = thr || brk ? 0 : GRS.ROLL + (run ? 0 : 1.5);
  st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), rolling * step);
  st.v *= Math.exp(-(GRS.DRAG + st.bladeWork * 1.45 + st.ripping * 1.15) * step);
  if (thr || brk || Math.abs(st.v) > 0.3) {
    st.v -= 9.81 * Math.sin(st.pitch) * 0.52 * step;
  }

  let steerMax = GRS.STEER / (1 + Math.abs(st.v) * 0.07);
  st.steer += CC(steerIn * steerMax - st.steer, -GRS.STEER_RATE * step, GRS.STEER_RATE * step);
  st.yaw -= ((st.v * Math.tan(st.steer)) / GRS.WB) * step;
  st.x += Math.sin(st.yaw) * st.v * step;
  st.z += Math.cos(st.yaw) * st.v * step;
  st.x = CC(st.x, -285, 285);
  st.z = CC(st.z, -285, 285);
  st.wheelA += (st.v * step) / GRS.RR;

  // Collisions against buildings, farm vehicles, and compound gate/walls
  let hit = !1;
  for (let off of GRS.CIRCLES) {
    let cx = st.x + Math.sin(st.yaw) * off,
      cz = st.z + Math.cos(st.yaw) * off;
    hit = hT(st, cx, cz, GRS.R, uw) || hit;
    hit = hT(st, cx, cz, GRS.R, dw) || hit;
    hit = hT(st, cx, cz, GRS.R, gT) || hit;
    hit = hT(st, cx, cz, GRS.R, TKC) || hit;
    hit = hT(st, cx, cz, GRS.R, JBC) || hit;
    if (typeof RLC < `undefined` === !1) hit = hT(st, cx, cz, GRS.R, RLC) || hit;
    if (typeof PVC < `undefined` === !1) hit = hT(st, cx, cz, GRS.R, PVC) || hit;
    if (typeof COC !== `undefined`) hit = hT(st, cx, cz, GRS.R, COC) || hit;
  }
  if (hit) {
    if (Math.abs(st.v) > 1.5) st.events.push({ type: `bump`, strength: Math.abs(st.v) });
    st.v *= 0.32;
  }
  grCircles(st);

  // Terrain following across front axle and twin tandem rear bogies
  let sinY = Math.sin(st.yaw),
    cosY = Math.cos(st.yaw),
    ground = (lat, lon) => nw(st.x + lat * cosY + lon * sinY, st.z - lat * sinY + lon * cosY),
    fl = ground(GRS.TRACK_F, GRS.FRONT_Z),
    fr = ground(-GRS.TRACK_F, GRS.FRONT_Z),
    rfL = ground(GRS.TRACK_R, GRS.TANDEM_OFF),
    rfR = ground(-GRS.TRACK_R, GRS.TANDEM_OFF),
    rrL = ground(GRS.TRACK_R, -GRS.TANDEM_OFF),
    rrR = ground(-GRS.TRACK_R, -GRS.TANDEM_OFF),
    rearAvg = (rfL + rfR + rrL + rrR) * 0.25,
    frontAvg = (fl + fr) * 0.5,
    pitchT = Math.atan2(frontAvg - rearAvg, GRS.WB),
    rollT = Math.atan2((fl + rfL + rrL) / 3 - (fr + rfR + rrR) / 3, GRS.TRACK_R * 2),
    tandemT = Math.atan2((rfL + rfR) * 0.5 - (rrL + rrR) * 0.5, GRS.TANDEM_OFF * 2) - pitchT,
    blend = EC(10, step);

  st.y = Math.abs(st.y - rearAvg) > 2 ? rearAvg : wC(st.y, rearAvg, blend);
  st.pitch = wC(st.pitch, pitchT, blend);
  st.roll = wC(st.roll, rollT, blend);
  st.tandemPitch = wC(st.tandemPitch, CC(tandemT, -0.25, 0.25), blend);

  // Stamp rear tandem tire tracks into live surface mask
  if (Math.abs(st.v) > 0.25 && Sw.stampTrack) {
    for (let sx of [-1, 1]) {
      let wx = st.x + sx * GRS.TRACK_R * cosY,
        wz = st.z - sx * GRS.TRACK_R * sinY;
      Sw.stampTrack(wx, wz, 0.34, Math.min(28, Math.abs(st.v) * 6));
    }
  }

  // ---- Blade & Ripper hydraulics
  let bCmd = inp ? inp.bladeCmd : 0,
    aCmd = inp ? inp.angleCmd : 0;
  if (!run && (bCmd !== 0 || aCmd !== 0) && st.t % 1.6 < step) {
    st.events.push({ type: `noHydraulics` });
  }
  st.bladeCmd = run ? bCmd : 0;
  st.angleCmd = run ? aCmd : 0;
  if (run) {
    st.bladeH = CC(st.bladeH + bCmd * GRS.BLADE_SPD * step, GRS.BLADE_MIN, GRS.BLADE_MAX);
    st.bladeAng = CC(st.bladeAng + aCmd * GRS.ANGLE_SPD * step, -GRS.ANGLE_MAX, GRS.ANGLE_MAX);
    st.ripper = CC(st.ripper + Math.sign(st.ripperCmd - st.ripper) * step * 1.65, 0, 1);
  }
  st.hyd = Math.min(1, Math.abs(st.bladeCmd) * 0.65 + Math.abs(st.angleCmd) * 0.55 + (Math.abs(st.ripper - st.ripperCmd) > 0.02 ? 0.5 : 0));
  st.hydCmd = st.bladeCmd !== 0 ? st.bladeCmd : st.angleCmd;

  // ---- Rear 5-Shank Ripper scarifying (loosens asphalt & packed earth behind rear tandem)
  if (st.ripper > 0.72 && Math.abs(st.v) > 0.15) {
    let rx = st.x + sinY * GRS.RIPPER_Z,
      rz = st.z + cosY * GRS.RIPPER_Z,
      lx = cosY * 0.85,
      lz = -sinY * 0.85;
    if (Sw.paintScrape) {
      Sw.paintScrape(rx - lx, rz - lz, rx + lx, rz + lz, 0.34, 130, grCanScrape);
    }
    let ripVol = SC.carve(rx - lx, rz - lz, rx + lx, rz + lz, nw(rx, rz) - 0.04, 0.25, 0.14 * Math.abs(st.v) * step);
    if (ripVol > 0) {
      st.movedM3 += ripVol;
      SC.version++;
    }
    st.ripping = wC(st.ripping, CC(Math.abs(st.v) / 2.2, 0.2, 1), EC(10, step));
  } else {
    st.ripping = wC(st.ripping, 0, EC(8, step));
  }

  // ---- Center Moldboard Blade scraping, leveling & sideways windrowing
  grScrapeBlade(st, step);

  // ---- Engine RPM & Load
  if (run) {
    let target = Math.min(
      1,
      st.gas * 0.55 +
        (Math.abs(st.v) / GRS.VMAX) * 0.28 +
        st.hyd * 0.45 +
        st.bladeWork * 0.52 +
        st.ripping * 0.35,
    );
    st.eload = wC(st.eload, target, EC(5, step));
    st.rpm = wC(st.rpm, GRS.IDLE_RPM + (GRS.MAX_RPM - GRS.IDLE_RPM) * (0.14 + 0.86 * st.eload), EC(3, step));
  } else if (st.engine) {
    st.rpm = 165 + 42 * Math.sin(st.t * 24);
    st.eload = 0;
  } else {
    st.rpm = wC(st.rpm, 0, EC(2.2, step));
    st.eload = 0;
  }
}

function grRipperToggle() {
  GR.ripperCmd = GR.ripperCmd > 0.5 ? 0 : 1;
  GR.events.push({ type: GR.ripperCmd > 0.5 ? `ripDown` : `ripUp` });
}

typeof window < `u` && (window.__grader = GR);
