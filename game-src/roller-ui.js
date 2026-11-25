// ---------- Vibratory Road Roller (Silindir SR 110 C) HUD ----------
var RLD = mD(`roller`, [
  [`circle`, { cx: `7`, cy: `16.5`, r: `4.2`, key: `rl1` }],
  [`circle`, { cx: `18.5`, cy: `17`, r: `3`, key: `rl2` }],
  [`path`, { d: `M6 12V8h8l1.5-3.5h3.5V14H10`, key: `rl3` }],
  [`path`, { d: `M11 16.5h4.5`, key: `rl4` }],
]);
TKnames.roller = `Roller`;
TKicons.roller = RLD;

function rlRow(label, frac, cls, text) {
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

function rlGauges() {
  let e = tC(),
    vibeOn = e.rlVibe,
    waterOn = e.rlWater,
    comp = e.rlWork;
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
            "data-rev": e.rlRev,
            children: e.rlRev ? `REV` : `DRIVE`,
          }),
        ],
      }),
      rlRow(`RPM`, e.rpm / 2250, ``, Math.round(e.rpm)),
      rlRow(`Drum`, e.running && vibeOn ? 0.92 : 0.25, `hud-meter-soil`, vibeOn ? `34 Hz VIBE` : `STATIC`),
      rlRow(`Spray`, waterOn ? 0.85 : 0, `hud-meter-lift`, waterOn ? `WATER ON` : `OFF`),
      (0, Z.jsxs)(`div`, {
        className: `hud-status`,
        children: [
          (0, Z.jsx)(`span`, {
            "data-state": comp ? `work` : e.running ? `on` : `off`,
            children: !e.running
              ? `Engine off`
              : comp
                ? `● Compacting`
                : vibeOn
                  ? `Vibration active`
                  : `Static roll`,
          }),
          (0, Z.jsx)(`span`, {
            children: e.rlSteam ? `Steaming` : waterOn ? `Mist ON` : `Mist OFF`,
          }),
        ],
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-area`,
        children: [
          `Compacted: `,
          (0, Z.jsx)(`b`, { children: Math.round(e.rlArea) }),
          ` m²`,
        ],
      }),
    ],
  });
}

function rlControls() {
  let vibeOn = tC((e) => e.rlVibe),
    waterOn = tC((e) => e.rlWater);
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
              "data-on": vibeOn,
              onClick: () => {
                (IS.unlock(), rlVibeToggle());
              },
              children: [
                (0, Z.jsx)(MD, { size: JD, "aria-hidden": !0 }),
                (0, Z.jsx)(`span`, { children: vibeOn ? `VİBRASYON AÇIK (G)` : `VİBRASYON (G)` }),
              ],
            }),
          }),
          (0, Z.jsx)(`div`, {
            className: `hud-joint hud-joint-wide`,
            children: (0, Z.jsxs)(`button`, {
              type: `button`,
              className: `hud-btn hud-btn-wide`,
              "data-on": waterOn,
              onClick: () => {
                (IS.unlock(), rlWaterToggle());
              },
              children: [
                (0, Z.jsx)(wD, { size: JD, "aria-hidden": !0 }),
                (0, Z.jsx)(`span`, { children: waterOn ? `SU PÜSKÜRTME (U)` : `SU KAPALI (U)` }),
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

var RLhelp = [
  [`W / ↑`, `Throttle`],
  [`S / ↓ / Space`, `Brake, then reverse`],
  [`A D / ← →`, `Articulated steer`],
  [`G`, `Toggle drum vibration (compacts gravel & asphalt)`],
  [`U`, `Toggle water spray mist`],
  [`K`, `Ignition`],
  [`H`, `Horn`],
  [`J / L`, `Lights`],
  [`B`, `Beacon`],
  [`C`, `Camera: chase / cab / drum`],
  [`V`, `Switch to asphalt paver`],
];

function rlPrompt(e) {
  return !e.running && e.ready
    ? `Roller engine off — press K (Ignition)`
    : e.rlWork
      ? `Compacting ${e.rlSteam ? `hot asphalt` : `road layer`} — ${Math.round(e.rlArea)} m² compacted`
      : `Drive over spread gravel or fresh hot asphalt with Vibration (G) ON to smooth & compact`;
}
