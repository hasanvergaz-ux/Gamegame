// ---------- Tracked Asphalt Paver (Asfalt Finişeri AP 600) HUD ----------
var PVD = mD(`paver`, [
  [`rect`, { x: `3`, y: `15`, width: `14`, height: `4`, rx: `2`, key: `pv1` }],
  [`path`, { d: `M4 15V9h10l3 3v3`, key: `pv2` }],
  [`path`, { d: `M17 14h4v4h-4`, key: `pv3` }],
  [`path`, { d: `M9 9V5h4`, key: `pv4` }],
]);
TKnames.paver = `Asphalt Paver`;
TKicons.paver = PVD;

function pvRow(label, frac, cls, text) {
  return (0, Z.jsxs)(`div`, {
    className: `hud-row`,
    children: [
      (0, Z.jsx)(`span`, { children: label }),
      (0, Z.jsx)(`div`, {
        className: `hud-meter ${cls}`,
        children: (0, Z.jsx)(`div`, {
          style: { width: `${Math.round(CC(frac, 0, 1) * 100)}%` },
        }),
      }),
      (0, Z.jsx)(`em`, { children: text }),
    ],
  });
}

function pvGauges() {
  let e = tC(),
    hf = CC(e.pvLoad / PVS.CAP, 0, 1),
    scDown = e.pvScreed > 0.6;
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
            "data-rev": e.pvRev,
            children: e.pvRev ? `REV` : `PAVE`,
          }),
        ],
      }),
      pvRow(`RPM`, e.rpm / 2200, ``, Math.round(e.rpm)),
      pvRow(`Hopper`, hf, `hud-meter-soil`, `${e.pvLoad.toFixed(1)} m³`),
      pvRow(`Screed`, e.pvScreed, `hud-meter-lift`, scDown ? `DOWN 3.8m` : `LIFTED`),
      (0, Z.jsxs)(`div`, {
        className: `hud-status`,
        children: [
          (0, Z.jsx)(`span`, {
            "data-state": e.pvWork ? `work` : e.running ? `on` : `off`,
            children: !e.running
              ? `Engine off`
              : e.pvWork
                ? `● Paving 155°C`
                : e.pvLoad < 0.05
                  ? `Hopper empty`
                  : scDown
                    ? `Screed ready`
                    : `Screed up`,
          }),
          (0, Z.jsx)(`span`, {
            children: scDown ? `Heater ON` : `Standby`,
          }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-area`,
        children: [
          `Paved: `,
          (0, Z.jsx)(`b`, { children: Math.round(e.pvArea) }),
          ` m²`,
        ],
      }),
    ],
  });
}

function pvControls() {
  let scDown = tC((e) => e.pvScreedDown);
  return (0, Z.jsxs)(Z.Fragment, {
    children: [
      (0, Z.jsxs)(`div`, {
        className: `hud-joints`,
        children: [
          (0, Z.jsx)(`div`, {
            className: `hud-joint hud-joint-wide`,
            children: (0, Z.jsxs)(`button`, {
              type: `button`,
              className: `hud-btn hud-btn-wide`,
              "data-on": scDown,
              onClick: () => {
                (IS.unlock(), pvScreedToggle());
              },
              children: [
                (0, Z.jsx)(MD, { size: JD, "aria-hidden": !0 }),
                (0, Z.jsx)(`span`, { children: scDown ? `TABLA AŞAĞI (G)` : `TABLA YUKARI (G)` }),
              ],
            }),
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

var PVhelp = [
  [`W / ↑`, `Drive forward (lays asphalt mat)`],
  [`S / ↓ / Space`, `Brake / reverse`],
  [`A D / ← →`, `Track steer`],
  [`G / E / Q`, `Toggle or lift/lower heated screed`],
  [`K`, `Ignition`],
  [`H`, `Horn`],
  [`B`, `Beacon`],
  [`C`, `Camera: chase / operator / screed`],
  [`V`, `Switch to tractor`],
];

function pvPrompt(e) {
  return !e.running && e.ready
    ? `Asphalt Paver engine off — press K (Ignition)`
    : e.pvWork
      ? `Paving hot-mix asphalt lane — roll with Silindir (Roller) next! (${Math.round(e.pvArea)} m²)`
      : e.pvLoad < 0.05
        ? `Hopper empty — drive over dumped hot asphalt piles, fill from Dump Truck, or park at Asfalt Silosu`
        : `Drive forward (W) along compacted gravel with screed down (G) to lay smooth 3.8m asphalt`;
}
