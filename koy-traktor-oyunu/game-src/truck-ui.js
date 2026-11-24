// ---------- dump truck HUD ----------
var TKD = mD(`truck`, [
  [`path`, { d: `M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2`, key: `tk1` }],
  [`path`, { d: `M15 18H9`, key: `tk2` }],
  [`path`, { d: `M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14`, key: `tk3` }],
  [`circle`, { cx: `17`, cy: `18`, r: `2`, key: `tk4` }],
  [`circle`, { cx: `7`, cy: `18`, r: `2`, key: `tk5` }],
]);
var TKnames = { tractor: `Tractor`, excavator: `Excavator`, truck: `Dump truck`, jcb: `JCB backhoe` },
  TKnext = { tractor: `excavator`, excavator: `truck`, truck: `jcb`, jcb: `tractor` },
  TKicons = { tractor: VD, excavator: RD, truck: TKD };
function tkGauges() {
  let e = tC(),
    lf = Math.min(1, e.tLoad / TKS.CAP),
    full = lf > 0.97,
    tipping = e.tBed > 0.02;
  return (0, Z.jsxs)(`div`, {
    className: `hud-panel hud-gauges`,
    children: [
      (0, Z.jsxs)(`div`, {
        className: `hud-speed`,
        children: [
          (0, Z.jsx)(`b`, { children: Math.round(e.speed) }),
          (0, Z.jsx)(`small`, { children: `km/h` }),
          (0, Z.jsx)(`span`, {
            className: `hud-gear`,
            "data-rev": e.tRev,
            children: e.tRev ? `REV` : `DRIVE`,
          }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-row`,
        children: [
          (0, Z.jsx)(`span`, { children: `RPM` }),
          (0, Z.jsx)(`div`, {
            className: `hud-meter`,
            children: (0, Z.jsx)(`div`, {
              style: { width: `${Math.min(100, (e.rpm / 2300) * 100)}%` },
            }),
          }),
          (0, Z.jsx)(`em`, { children: Math.round(e.rpm) }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-row`,
        children: [
          (0, Z.jsx)(`span`, { children: `Load` }),
          (0, Z.jsx)(`div`, {
            className: `hud-meter hud-meter-soil`,
            children: (0, Z.jsx)(`div`, {
              style: { width: `${Math.round(lf * 100)}%` },
            }),
          }),
          (0, Z.jsx)(`em`, { children: `${e.tLoad.toFixed(1)} m³` }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-row`,
        children: [
          (0, Z.jsx)(`span`, { children: `Bed` }),
          (0, Z.jsx)(`div`, {
            className: `hud-meter hud-meter-lift`,
            children: (0, Z.jsx)(`div`, {
              style: { width: `${Math.round(e.tBed * 100)}%` },
            }),
          }),
          (0, Z.jsx)(`em`, {
            children: e.tBed < 0.02 ? `DOWN` : `${Math.round(e.tBed * TKS.BED_MAX * 57.3)}°`,
          }),
        ],
      }),
      (0, Z.jsx)(`div`, {
        className: `hud-status`,
        children: (0, Z.jsx)(`span`, {
          "data-state": e.tDumping ? `work` : full || tipping ? `on` : `off`,
          children: e.tDumping
            ? `● Dumping`
            : tipping
              ? `Bed raised`
              : full
                ? `Bed full`
                : e.tLoad > 0.05
                  ? `Loaded`
                  : e.running
                    ? `Empty`
                    : `Engine off`,
        }),
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-area`,
        children: [
          `Hauled: `,
          (0, Z.jsx)(`b`, { children: e.tHauled.toFixed(1) }),
          ` m³`,
        ],
      }),
    ],
  });
}
function tkControls() {
  return (0, Z.jsxs)(Z.Fragment, {
    children: [
      (0, Z.jsxs)(`div`, {
        className: `hud-hitch`,
        children: [
          (0, Z.jsxs)(YD, {
            k: `liftUp`,
            label: `Raise bed`,
            className: `hud-btn hud-btn-wide`,
            children: [
              (0, Z.jsx)(wD, { size: JD, "aria-hidden": !0 }),
              (0, Z.jsx)(`span`, { children: `RAISE BED` }),
            ],
          }),
          (0, Z.jsxs)(YD, {
            k: `liftDown`,
            label: `Lower bed`,
            className: `hud-btn hud-btn-wide`,
            children: [
              (0, Z.jsx)(CD, { size: JD, "aria-hidden": !0 }),
              (0, Z.jsx)(`span`, { children: `LOWER BED` }),
            ],
          }),
        ],
      }),
      (0, Z.jsx)(`div`, {
        className: `hud-pedals`,
        children: (0, Z.jsxs)(`div`, {
          className: `hud-pedal-row`,
          children: [
            (0, Z.jsx)(YD, {
              k: `brake`,
              label: `Brake / reverse`,
              className: `hud-pedal hud-pedal-brake`,
              children: `BRAKE`,
            }),
            (0, Z.jsx)(YD, {
              k: `gas`,
              label: `Throttle`,
              className: `hud-pedal hud-pedal-gas`,
              children: `GAS`,
            }),
          ],
        }),
      }),
    ],
  });
}
var TKhelp = [
  [`W / ↑`, `Throttle`],
  [`S / ↓ / Space`, `Brake, then reverse`],
  [`A D / ← →`, `Steer`],
  [`E`, `Raise dump bed (tip)`],
  [`Q`, `Lower dump bed`],
  [`K`, `Ignition`],
  [`H`, `Horn`],
  [`C`, `Camera: chase / cab / bed`],
  [`N`, `Night`],
  [`V`, `Switch to JCB backhoe`],
];
function tkPrompt(e) {
  return !e.running && e.ready
    ? `Dump truck engine off — press K (Ignition)`
    : e.tDumping
      ? `Dumping soil — keep holding E until the bed is empty`
      : e.tBed > 0.02 && e.tLoad < 0.05
        ? `Bed empty — lower it with Q and drive back for more`
        : e.tLoad >= TKS.CAP * 0.97
          ? `Bed full — drive to your dump spot and raise the bed (E)`
          : e.tLoad > 0.05
            ? `${e.tLoad.toFixed(1)} m³ loaded — load more, or drive off and raise the bed (E) to dump`
            : `Park beside the excavator, switch (V) and fill the bed — AUTO DIG loads it for you`;
}
