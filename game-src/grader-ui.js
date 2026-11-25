// ---------- Motor Grader (Greyder) HUD ----------
var GRD = mD(`grader`, [
  [`path`, { d: `M2 16h19`, key: `gr1` }],
  [`circle`, { cx: `5`, cy: `17.5`, r: `2.2`, key: `gr2` }],
  [`circle`, { cx: `16`, cy: `17.5`, r: `2.2`, key: `gr3` }],
  [`circle`, { cx: `20.5`, cy: `17.5`, r: `2.2`, key: `gr4` }],
  [`path`, { d: `M5 15V10l8-1 1-4h4v10`, key: `gr5` }],
  [`path`, { d: `M10 15.5l2 3.5`, key: `gr6` }],
  [`path`, { d: `M21.5 13l1.5 4.5`, key: `gr7` }],
]);
TKnames.grader = `Grader`;
TKnext.jcb = `grader`;
TKnext.grader = `roller`;
TKnext.roller = `paver`;
TKnext.paver = `tractor`;
TKicons.grader = GRD;

function grRow(label, frac, cls, text) {
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

function grGauges() {
  let e = tC(),
    bladeF = CC((e.grBlade - GRS.BLADE_MIN) / (GRS.BLADE_MAX - GRS.BLADE_MIN), 0, 1),
    angDeg = Math.round((e.grAngle * 180) / Math.PI),
    angF = CC((e.grAngle + GRS.ANGLE_MAX) / (GRS.ANGLE_MAX * 2), 0, 1),
    cutting = e.grBlade <= 0.035 && e.grWork,
    ripping = e.grRip > 0.5 && Math.abs(e.speed) > 0.5;
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
            "data-rev": e.grRev,
            children: e.grRev ? `REV` : `DRIVE`,
          }),
        ],
      }),
      grRow(`RPM`, e.rpm / 2300, ``, Math.round(e.rpm)),
      grRow(
        `Blade`,
        1 - bladeF,
        `hud-meter-soil`,
        e.grBlade <= 0.02 ? `CUT ${Math.round(e.grBlade * 100)}cm` : `+${Math.round(e.grBlade * 100)}cm`,
      ),
      grRow(`Angle`, angF, `hud-meter-lift`, `${angDeg > 0 ? `+` : ``}${angDeg}°`),
      (0, Z.jsxs)(`div`, {
        className: `hud-status`,
        children: [
          (0, Z.jsx)(`span`, {
            "data-state": cutting || ripping ? `work` : e.running ? `on` : `off`,
            children: !e.running
              ? `Engine off`
              : cutting
                ? `● Grading & Casting`
                : ripping
                  ? `● Ripping`
                  : e.grBlade <= 0.03
                    ? `Blade set`
                    : `Grader ready`,
          }),
          (0, Z.jsx)(`span`, {
            children: e.grRip > 0.5 ? `Ripper DOWN` : `Ripper UP`,
          }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-area`,
        children: [
          `Leveled: `,
          (0, Z.jsx)(`b`, { children: Math.round(e.grArea) }),
          ` m²`,
        ],
      }),
    ],
  });
}

function grControls() {
  let ripOn = tC((e) => e.grRipCmd > 0.5);
  return (0, Z.jsxs)(Z.Fragment, {
    children: [
      (0, Z.jsxs)(`div`, {
        className: `hud-joints`,
        children: [
          (0, Z.jsxs)(`div`, {
            className: `hud-joint`,
            children: [
              (0, Z.jsx)(`span`, { children: `Blade` }),
              (0, Z.jsx)(YD, {
                k: `liftUp`,
                label: `Raise blade`,
                className: `hud-btn`,
                children: (0, Z.jsx)(SD, { size: 20, "aria-hidden": !0 }),
              }),
              (0, Z.jsx)(YD, {
                k: `liftDown`,
                label: `Lower blade`,
                className: `hud-btn`,
                children: (0, Z.jsx)(yD, { size: 20, "aria-hidden": !0 }),
              }),
            ],
          }),
          (0, Z.jsxs)(`div`, {
            className: `hud-joint`,
            children: [
              (0, Z.jsx)(`span`, { children: `Angle` }),
              (0, Z.jsx)(YD, {
                k: `grAngL`,
                label: `Angle blade left`,
                className: `hud-btn`,
                children: (0, Z.jsx)(bD, { size: 20, "aria-hidden": !0 }),
              }),
              (0, Z.jsx)(YD, {
                k: `grAngR`,
                label: `Angle blade right`,
                className: `hud-btn`,
                children: (0, Z.jsx)(xD, { size: 20, "aria-hidden": !0 }),
              }),
            ],
          }),
          (0, Z.jsx)(`div`, {
            className: `hud-joint hud-joint-wide`,
            children: (0, Z.jsxs)(`button`, {
              type: `button`,
              className: `hud-btn hud-btn-wide`,
              "data-on": ripOn,
              onClick: () => {
                (IS.unlock(), grRipperToggle());
              },
              children: [
                (0, Z.jsx)(MD, { size: JD, "aria-hidden": !0 }),
                (0, Z.jsx)(`span`, { children: ripOn ? `RIPPER DOWN` : `RIPPER (G)` }),
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

var GRhelp = [
  [`W / ↑`, `Throttle`],
  [`S / ↓ / Space`, `Brake, then reverse`],
  [`A D / ← →`, `Steer (front wheels + lean)`],
  [`E / Q`, `Raise / lower moldboard blade`],
  [`Z / X`, `Angle blade left / right (side-cast)`],
  [`G`, `Rear 5-shank ripper down / up`],
  [`K`, `Ignition`],
  [`H`, `Horn`],
  [`J / L`, `Lights`],
  [`B`, `Beacon`],
  [`C`, `Camera: chase / cab / side`],
  [`V`, `Switch to road roller`],
];

function grPrompt(e) {
  return !e.running && e.ready
    ? `Grader engine off — press K (Ignition)`
    : e.grBlade <= 0.03 && e.grWork
      ? `Scraping & casting spoil sideways — leveled ${Math.round(e.grArea)} m²`
      : e.grBlade > 0.04
        ? `Lower blade (Q), angle (Z/X) & drop ripper (G) to scrape and level road zones`
        : `Drive along the damaged road zones to cut bumps, cast spoil aside & flatten the sub-base`;
}
