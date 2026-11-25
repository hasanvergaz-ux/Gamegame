// ===================== CHAKIR COMPANY COMPOUND CORE (added) =====================
var CO_BOX = { x0: -96, z0: -60, x1: -51, z1: -24 },
  CO_GATE = { cx: -73.5, z: -24, w: 9.0, leafW: 4.5, h: 2.35, slide: 4.7 },
  CO_PAD = { x0: -94, z0: -57.5, x1: -54, z1: -37 },
  CO_APRON = { x0: -80, z0: -29, x1: -67, z1: -20 },
  CO_GARAGE = { x0: -93.5, z0: -57, x1: -54.5, z1: -39.5, h: 5.2 },
  CO_BOOTH = { x: -66.5, z: -26.5, w: 2.4, d: 2.2 },
  CO_SIGN = { x: -54.0, z: -25.5 },
  CO_PUMP = { x: -57.5, z: -34.5 },
  CO_DRIVE = { x0: -78.5, z0: -24, x1: -68.5, z1: -8.5 },
  CO = {
    gateOpen: 0,
    gateTarget: 0,
    nearestDist: 99,
    moving: !1,
    events: [],
  },
  COC = [
    { k: `b`, x: CO_GATE.cx - CO_GATE.leafW / 2, z: CO_GATE.z, hx: CO_GATE.leafW / 2, hz: 0.25, c: 1, s: 0 },
    { k: `b`, x: CO_GATE.cx + CO_GATE.leafW / 2, z: CO_GATE.z, hx: CO_GATE.leafW / 2, hz: 0.25, c: 1, s: 0 },
  ];

function coInitWorld() {
  QC.push({
    x: (CO_BOX.x0 + CO_BOX.x1) / 2,
    z: (CO_BOX.z0 + CO_BOX.z1) / 2,
    hx: (CO_BOX.x1 - CO_BOX.x0) / 2 + 5,
    hz: (CO_BOX.z1 - CO_BOX.z0) / 2 + 6,
    rot: 0,
  });

  let gx0 = CO_GATE.cx - CO_GATE.w / 2,
    gx1 = CO_GATE.cx + CO_GATE.w / 2,
    t = 0.45;
  // Perimeter walls (south wall split by gate opening)
  fw((CO_BOX.x0 + gx0) / 2, CO_BOX.z1, gx0 - CO_BOX.x0, t, 0);
  fw((gx1 + CO_BOX.x1) / 2, CO_BOX.z1, CO_BOX.x1 - gx1, t, 0);
  fw((CO_BOX.x0 + CO_BOX.x1) / 2, CO_BOX.z0, CO_BOX.x1 - CO_BOX.x0, t, 0);
  fw(CO_BOX.x0, (CO_BOX.z0 + CO_BOX.z1) / 2, t, CO_BOX.z1 - CO_BOX.z0, 0);
  fw(CO_BOX.x1, (CO_BOX.z0 + CO_BOX.z1) / 2, t, CO_BOX.z1 - CO_BOX.z0, 0);

  // Guard booth, CHAKIR sign post & fuel pump island
  fw(CO_BOOTH.x, CO_BOOTH.z, CO_BOOTH.w, CO_BOOTH.d, 0);
  uw.push({ k: `c`, x: CO_SIGN.x, z: CO_SIGN.z, r: 0.45 });
  fw(CO_PUMP.x, CO_PUMP.z, 1.4, 1.6, 0);

  // Garage steel columns + back cladding wall
  fw((CO_GARAGE.x0 + CO_GARAGE.x1) / 2, CO_GARAGE.z0, CO_GARAGE.x1 - CO_GARAGE.x0, 0.35, 0);
  for (let i = 0; i <= 4; i++) {
    let px = CO_GARAGE.x0 + ((CO_GARAGE.x1 - CO_GARAGE.x0) * i) / 4;
    uw.push({ k: `c`, x: px, z: CO_GARAGE.z0, r: 0.28 });
    uw.push({ k: `c`, x: px, z: CO_GARAGE.z1, r: 0.28 });
  }
  if (Array.isArray(Qw) && !Qw.includes(COC)) Qw.push(COC);
}
coInitWorld();

function coInPad(x, z) {
  return (
    (x > CO_PAD.x0 && x < CO_PAD.x1 && z > CO_PAD.z0 && z < CO_PAD.z1) ||
    (x > CO_APRON.x0 && x < CO_APRON.x1 && z > CO_APRON.z0 && z < CO_APRON.z1)
  );
}
function coInYard(x, z) {
  return x > CO_BOX.x0 && x < CO_BOX.x1 && z > CO_BOX.z0 && z < CO_BOX.z1;
}
function coInDrive(x, z) {
  return x > CO_DRIVE.x0 && x < CO_DRIVE.x1 && z > CO_DRIVE.z0 && z < CO_DRIVE.z1;
}
function coNoDig(x, z) {
  return (
    (x > CO_BOX.x0 - 1 && x < CO_BOX.x1 + 1 && z > CO_BOX.z0 - 1 && z < CO_BOX.z1 + 1) ||
    coInDrive(x, z)
  );
}
function coNoTree(x, z) {
  return (
    (x > CO_BOX.x0 - 6 && x < CO_BOX.x1 + 6 && z > CO_BOX.z0 - 6 && z < CO_BOX.z1 + 6) ||
    (x > CO_GATE.cx - 12 && x < CO_GATE.cx + 12 && z > CO_GATE.z - 4 && z < 4)
  );
}

function coStep(dt, activeVeh) {
  let vehs = [ST?.tr, CT, TK, JB, activeVeh].filter(
      (v) => v && typeof v.x === `number` && typeof v.z === `number`,
    ),
    minD = 99;
  for (let v of vehs) {
    let d = Math.hypot(v.x - CO_GATE.cx, v.z - CO_GATE.z);
    if (d < minD) minD = d;
  }
  CO.nearestDist = minD;
  let openD = CO.gateTarget ? 17.5 : 15.0,
    want = minD < openD ? 1 : 0;
  if (want !== CO.gateTarget) {
    CO.gateTarget = want;
    CO.events.push({ type: want ? `gateOpen` : `gateClose` });
  }
  let prev = CO.gateOpen,
    step = dt * 0.72;
  if (CO.gateOpen < CO.gateTarget) CO.gateOpen = Math.min(CO.gateTarget, CO.gateOpen + step);
  else if (CO.gateOpen > CO.gateTarget) CO.gateOpen = Math.max(CO.gateTarget, CO.gateOpen - step);
  CO.moving = Math.abs(CO.gateOpen - prev) > 1e-4;

  let ease = CO.gateOpen * CO.gateOpen * (3 - 2 * CO.gateOpen),
    slide = ease * CO_GATE.slide,
    leafX0 = CO_GATE.cx - CO_GATE.leafW / 2 - slide,
    leafX1 = CO_GATE.cx + CO_GATE.leafW / 2 + slide;
  if (CO.gateOpen > 0.82) {
    COC[0].x = COC[1].x = 1e9;
  } else {
    COC[0].x = leafX0;
    COC[1].x = leafX1;
  }
}

typeof window < `u` && (window.__company = CO);
