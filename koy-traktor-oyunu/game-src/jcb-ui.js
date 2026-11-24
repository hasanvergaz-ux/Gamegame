// ---------- JCB backhoe loader HUD ----------
var JBD = mD(`jcb`, [
  [`path`, { d: `M3 17h9`, key: `jb1` }],
  [`circle`, { cx: `6`, cy: `17.5`, r: `2.5`, key: `jb2` }],
  [`circle`, { cx: `15`, cy: `18`, r: `2`, key: `jb3` }],
  [`path`, { d: `M4 15V9h4l1-4h3v10`, key: `jb4` }],
  [`path`, { d: `M12 11h5l3 5h2`, key: `jb5` }],
  [`path`, { d: `M4 9 2 4l-1 3`, key: `jb6` }],
]);
TKicons.jcb = JBD;
function jbRow(label, frac, cls, text) {
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
function jbGauges() {
  let e = tC(),
    rear = e.jSeat > 0.5,
    busy = e.jSeatMoving;
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
            "data-rev": rear || e.jRev,
            children: busy ? `SEAT…` : rear ? `BACKHOE` : e.jRev ? `REV` : `LOADER`,
          }),
        ],
      }),
      jbRow(`RPM`, e.rpm / 2300, ``, Math.round(e.rpm)),
      jbRow(`Shovel`, e.jLoad / JBS.LCAP, `hud-meter-soil`, `${e.jLoad.toFixed(2)} m³`),
      jbRow(`Bucket`, e.jBucket / JBS.BCAP, `hud-meter-soil`, `${e.jBucket.toFixed(2)} m³`),
      jbRow(`Legs`, e.jStab, `hud-meter-lift`, e.jStab > 0.95 ? `DOWN` : e.jStab < 0.05 ? `UP` : `…`),
      (0, Z.jsx)(`div`, {
        className: `hud-status`,
        children: (0, Z.jsx)(`span`, {
          "data-state": e.jWork ? `work` : e.running ? `on` : `off`,
          children: !e.running
            ? `Engine off`
            : e.jDump
              ? `● Dumping`
              : e.jWork
                ? `● Digging`
                : rear
                  ? `Backhoe ready`
                  : `Loader ready`,
        }),
      }),
      (0, Z.jsxs)(`div`, {
        className: `hud-area`,
        children: [`Dug: `, (0, Z.jsx)(`b`, { children: e.jDug.toFixed(1) }), ` m³`],
      }),
    ],
  });
}
function jbSeatBtn(rear) {
  return (0, Z.jsxs)(`button`, {
    type: `button`,
    className: `hud-btn hud-btn-wide`,
    "data-on": rear,
    onClick: () => {
      (IS.unlock(), jbSeatToggle());
    },
    children: [
      (0, Z.jsx)(gD, { size: JD, "aria-hidden": !0 }),
      (0, Z.jsx)(`span`, { children: rear ? `TURN TO LOADER` : `TURN TO BACKHOE` }),
    ],
  });
}
function jbJointUI(label, a, b) {
  return (0, Z.jsxs)(`div`, {
    className: `hud-joint`,
    children: [
      (0, Z.jsx)(`span`, { children: label }),
      (0, Z.jsx)(YD, { k: a[0], label: a[1], className: `hud-btn`, children: (0, Z.jsx)(a[2], { size: 20, "aria-hidden": !0 }) }),
      (0, Z.jsx)(YD, { k: b[0], label: b[1], className: `hud-btn`, children: (0, Z.jsx)(b[2], { size: 20, "aria-hidden": !0 }) }),
    ],
  });
}
function jbControls() {
  let rear = tC((e) => e.jSeat > 0.5);
  return rear
    ? (0, Z.jsxs)(`div`, {
        className: `hud-joints`,
        children: [
          jbJointUI(`Swing`, [`swingL`, `Swing left`, bD], [`swingR`, `Swing right`, xD]),
          jbJointUI(`Boom`, [`boomUp`, `Boom up`, SD], [`boomDown`, `Boom down`, yD]),
          jbJointUI(`Arm`, [`stickOut`, `Arm out`, _D], [`stickIn`, `Arm in`, hD]),
          jbJointUI(`Bucket`, [`bucketCurl`, `Curl bucket`, ID], [`bucketOpen`, `Open bucket, dump`, LD]),
          (0, Z.jsx)(`div`, { className: `hud-joint hud-joint-wide`, children: jbSeatBtn(!0) }),
        ],
      })
    : (0, Z.jsxs)(Z.Fragment, {
        children: [
          (0, Z.jsxs)(`div`, {
            className: `hud-joints`,
            children: [
              jbJointUI(`Arms`, [`liftUp`, `Raise loader arms`, SD], [`liftDown`, `Lower loader arms`, yD]),
              jbJointUI(`Shovel`, [`bucketCurl`, `Curl shovel`, ID], [`bucketOpen`, `Tip shovel, dump`, LD]),
              (0, Z.jsx)(`div`, { className: `hud-joint hud-joint-wide`, children: jbSeatBtn(!1) }),
            ],
          }),
          (0, Z.jsx)(`div`, {
            className: `hud-pedals`,
            children: (0, Z.jsxs)(`div`, {
              className: `hud-pedal-row`,
              children: [
                (0, Z.jsx)(YD, { k: `brake`, label: `Brake / reverse`, className: `hud-pedal hud-pedal-brake`, children: `BRAKE` }),
                (0, Z.jsx)(YD, { k: `gas`, label: `Throttle`, className: `hud-pedal hud-pedal-gas`, children: `GAS` }),
              ],
            }),
          }),
        ],
      });
}
var JBhelp = [
  [`R`, `Turn the seat: loader ⇄ backhoe`],
  [`— Loader (front) —`, ``],
  [`W / S`, `Drive / brake, reverse`],
  [`A / D`, `Steer`],
  [`E / Q`, `Loader arms up / down`],
  [`Z / X`, `Shovel curl / tip (dump)`],
  [`— Backhoe (rear) —`, ``],
  [`← / →`, `Swing`],
  [`↑ / ↓`, `Boom up / down`],
  [`E / Q`, `Arm out / in`],
  [`Z / X`, `Bucket curl / dump`],
  [`K`, `Ignition`],
  [`H`, `Horn`],
  [`J / L`, `Lights`],
  [`B`, `Beacon`],
  [`C`, `Camera: chase / cab / side`],
  [`V`, `Switch to tractor`],
];
function jbPrompt(e) {
  return !e.running && e.ready
    ? `JCB engine off — press K (Ignition)`
    : e.jSeatMoving
      ? e.jSeat > 0.5
        ? `Turning to the backhoe — stabiliser legs going down`
        : `Turning to the front loader — legs coming up`
      : e.jSeat > 0.5
        ? e.jBucket >= JBS.BCAP * 0.97
          ? `Bucket full — swing (← →) over the truck or a pile and press X`
          : `Backhoe: ↑↓ boom, E/Q arm, Z/X bucket, ← → swing — R to turn back`
        : e.jLoad >= JBS.LCAP * 0.97
          ? `Shovel full — raise the arms (E), drive to the truck and tip with X`
          : e.jLoad > 0.05
            ? `${e.jLoad.toFixed(2)} m³ in the shovel — lift (E) and tip (X) to dump`
            : `Lower the shovel (Q) and drive into soil to fill it — R turns to the backhoe`;
}
