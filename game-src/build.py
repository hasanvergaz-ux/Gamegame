#!/usr/bin/env python3
"""Builds public/game from the original game bundle + the dump-truck add-on.

Run from the project root:  python3 game-src/build.py
- game-src/original.pretty.js : the uploaded game's bundle (prettified, untouched)
- game-src/truck-*.js         : the dump truck add-on (core / render / UI)
- game-src/jcb-*.js           : the JCB backhoe loader add-on (core / render / UI)
"""
import json, glob, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "game-src")
OUT = os.path.join(ROOT, "public", "game")

s = open(os.path.join(SRC, "original.pretty.js")).read()
core = open(os.path.join(SRC, "truck-core.js")).read()
render = open(os.path.join(SRC, "truck-render.js")).read()
ui = open(os.path.join(SRC, "truck-ui.js")).read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, f"expected {count} match(es), got {n}: {old[:90]!r}"
    s = s.replace(old, new)


def cut(start, end, new):
    """Replace the text from `start` up to (not incl.) `end`."""
    global s
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + new + s[b:]


# ---- assets: resolve through the CDN map written next to index.html
rep(",tractor.glb`.split(", ",tractor.glb,dump_truck.gltf,tractor_crank.wav,tractor_idle.wav,tractor_load.wav,excavator_crank.wav,excavator_idle.wav,excavator_load.wav,truck_crank.wav,truck_idle.wav,truck_load.wav`.split(")
rep(
    "function PS(e) {\n  if (!NS.has(e))",
    "function PS(e) {\n  let m = typeof window < `u` && window.__GAME_ASSETS;\n  if (m && m[e]) return m[e];\n  if (!NS.has(e))",
)
rep("  return `./game-assets/${e}`;", "  return `/game/game-assets/${e}`;")

# ---- vehicle selection / store
rep(
    "    : new URLSearchParams(window.location.search).get(`arac`) === `kepce`\n      ? `excavator`\n      : `tractor`;",
    "    : ({ kepce: `excavator`, kamyon: `truck` })[\n        new URLSearchParams(window.location.search).get(`arac`)\n      ] ?? `tractor`;",
)
rep("    excEngine: !1,\n    bladeDown: !1,", "    excEngine: !1,\n    truckEngine: !0,\n    bladeDown: !1,")
rep(
    "    inSoil: !1,\n  })),\n  nC =",
    "    inSoil: !1,\n    tLoad: 0,\n    tBed: 0,\n    tHauled: 0,\n    tDumping: !1,\n    tRev: !1,\n  })),\n  nC =",
)
cut(
    "function sC() {",
    "function cC() {",
    """function tkCamFor(t) {
  ((iC.yaw = 0),
    (iC.pitch = t === `excavator` ? 0.12 : t === `truck` ? 0.06 : 0),
    (iC.dist = t === `excavator` ? 12 : t === `truck` ? 16 : 11));
}
function sC() {
  let e = eC.getState(),
    t = TKnext[e.vehicle] ?? `tractor`;
  (e.set({ vehicle: t, cam: 0, ...(t === `truck` ? { truckEngine: !0 } : {}) }),
    tkCamFor(t),
    cC(),
    ZS());
}
""",
)
rep(
    "e.flip(e.vehicle === `excavator` ? `excEngine` : `engine`);",
    "e.flip(\n    e.vehicle === `excavator`\n      ? `excEngine`\n      : e.vehicle === `truck`\n        ? `truckEngine`\n        : `engine`,\n  );",
)

# ---- collisions: truck circles join the tractor + excavator obstacle lists
rep(
    "var Qw = [dw, uw];",
    "var TKC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.25 })),\n  Qw = [dw, uw, TKC];",
)
rep(
    "            Q.BODY_R,\n            gT,\n          ) || c));",
    "            Q.BODY_R,\n            gT,\n          ) || c),\n      (c =\n        hT(e, e.x + Math.sin(e.yaw) * t, e.z + Math.cos(e.yaw) * t, Q.BODY_R, TKC) ||\n        c));",
)

# ---- falling soil lands in the truck bed
rep(
    "    let r = nw(n.x, n.z);\n    n.y <= r &&",
    "    let r = nw(n.x, n.z);\n    if (tkCatch(n)) {\n      ((e.clods[t] = e.clods[e.clods.length - 1]), e.clods.pop());\n      continue;\n    }\n    n.y <= r &&",
)

# ---- auto dig aims at a parked truck
cut(
    "    case `swingOut`: {",
    "    case `dump`:",
    """    case `swingOut`: {
      let tkT = tkAutoTarget(e, !1),
        sw = tkT ? tkT.swing : r.swing0 + Q.DUMP_SWING;
      ((r.tk = !!tkT),
        (t.swing = _T(i.swing.p, sw, 2.2)),
        (t.boom = _T(i.boom.p, tkT ? 0.98 : 0.85)),
        (t.stick = tkT
          ? CC((tkT.reach - (Q.BOOM.z + c.ts)) * 1.6, -0.7, 0.7)
          : _T(i.stick.p, -1.45, 2, 0.7)),
        (t.bucket = _T(i.bucket.p, -2.35)),
        ((vT(i.swing.p, sw, 0.05) && (!tkT || i.boom.p > 0.9)) || r.t > 7) &&
          s(`dump`));
      break;
    }
""",
)
rep(
    """    case `dump`:
      ((t.swing = _T(i.swing.p, r.swing0 + Q.DUMP_SWING, 2.2)),
        (t.boom = _T(i.boom.p, 0.85)),
        (t.stick = _T(i.stick.p, -0.95, 2, 0.6)),""",
    """    case `dump`: {
      let tkT = r.tk ? tkAutoTarget(e, !0) : null;
      ((t.swing = _T(i.swing.p, tkT ? tkT.swing : r.swing0 + Q.DUMP_SWING, 2.2)),
        (t.boom = _T(i.boom.p, tkT ? 0.98 : 0.85)),
        (t.stick = tkT
          ? CC((tkT.reach - (Q.BOOM.z + c.ts)) * 1.6, -0.7, 0.7)
          : _T(i.stick.p, -0.95, 2, 0.6)),""",
)
rep(
    "          (r.cycle++, s(`swingBack`)));\n      break;\n",
    "          (r.cycle++, s(`swingBack`)));\n      break;\n    }\n",
)

# ---- add-on code
rep("var ST = Gw(Sw),", core + "\nvar ST = Gw(Sw),")
rep("var nD = (e, t, n) => new G(e, t, n),", render + "\nFx.preload(TKurl);\nvar nD = (e, t, n) => new G(e, t, n),")
rep("function qD() {", ui + "\nfunction qD() {")

# ---- HUD
cut(
    "function ZD() {",
    "function QD() {",
    """function ZD() {
  let e = eC((e) => e.vehicle),
    nx = TKnext[e] ?? `tractor`;
  return (0, Z.jsxs)(`button`, {
    type: `button`,
    className: `hud-switch`,
    "aria-label": `Switch to ${TKnames[nx].toLowerCase()}`,
    onClick: () => {
      (IS.unlock(), sC());
    },
    children: [
      (0, Z.jsxs)(`span`, {
        className: `hud-switch-now`,
        children: [
          (0, Z.jsx)(TKicons[e] ?? VD, { size: 18, "aria-hidden": !0 }),
          ` `,
          TKnames[e],
        ],
      }),
      (0, Z.jsxs)(`span`, {
        className: `hud-switch-go`,
        children: [
          (0, Z.jsx)(gD, { size: 13, "aria-hidden": !0 }),
          ` Switch to ${TKnames[nx].toLowerCase()} `,
          (0, Z.jsx)(`kbd`, { children: `V` }),
        ],
      }),
    ],
  });
}
""",
)
rep(
    "    t = e.vehicle === `excavator`,\n    n = t ? [`Chase`, `Cab`, `Side`] : [`Chase`, `Cab`, `Rear`];",
    "    t = e.vehicle === `excavator`,\n    k = e.vehicle === `truck`,\n    n = t\n      ? [`Chase`, `Cab`, `Side`]\n      : k\n        ? [`Chase`, `Cab`, `Bed`]\n        : [`Chase`, `Cab`, `Rear`];",
)
rep("        on: t ? e.excEngine : e.engine,", "        on: t ? e.excEngine : k ? e.truckEngine : e.engine,")
rep("      !t &&\n        (0, Z.jsx)(XD, {\n          on: e.hood,", "      !t &&\n        !k &&\n        (0, Z.jsx)(XD, {\n          on: e.hood,")
rep(
    "    t = eC((e) => e.vehicle === `excavator`),\n    [n, r] = (0, y.useState)(Date.now());",
    "    t = eC((e) => e.vehicle === `excavator`),\n    k = eC((e) => e.vehicle === `truck`),\n    [n, r] = (0, y.useState)(Date.now());",
)
rep(
    "      ? (i = e.toast)\n      : !e.running && e.ready",
    "      ? (i = e.toast)\n      : k\n        ? (i = tkPrompt(e))\n        : !e.running && e.ready",
)
rep(
    "  let e = eC.getState().vehicle === `excavator`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
    "  let e = eC.getState().vehicle === `excavator`,\n    k = eC.getState().vehicle === `truck`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
)
rep(
    "        children: e ? `Excavator controls` : `Tractor controls`,",
    "        children: e\n          ? `Excavator controls`\n          : k\n            ? `Dump truck controls`\n            : `Tractor controls`,",
)
rep("      (e\n        ? [\n            [`W / S`, `Tracks forward / back`],", "      (k\n        ? TKhelp\n        : e\n        ? [\n            [`W / S`, `Tracks forward / back`],")
rep("            [`V`, `Switch to tractor`],", "            [`V`, `Switch to dump truck`],")
rep(
    "function cO() {\n  let e = eC((e) => e.vehicle === `excavator`);",
    "function cO() {\n  let tkVeh = eC((e) => e.vehicle),\n    e = tkVeh === `excavator`,\n    k = tkVeh === `truck`;",
)
rep("    \"data-veh\": e ? `excavator` : `tractor`,", "    \"data-veh\": e ? `excavator` : `tractor`,\n    \"data-truck\": k,")
rep("        children: e ? (0, Z.jsx)(eO, {}) : (0, Z.jsx)(tO, {}),", "        children: k\n          ? (0, Z.jsx)(tkGauges, {})\n          : e\n            ? (0, Z.jsx)(eO, {})\n            : (0, Z.jsx)(tO, {}),")
rep("        children: e ? (0, Z.jsx)(oO, {}) : (0, Z.jsx)(sO, {}),", "        children: k\n          ? (0, Z.jsx)(tkControls, {})\n          : e\n            ? (0, Z.jsx)(oO, {})\n            : (0, Z.jsx)(sO, {}),")
rep(
    """    (iC.yaw = 0),
    (iC.pitch = e === `excavator` ? 0.12 : 0),
    (iC.dist = e === `excavator` ? 12 : 11),
    eC.getState().set({ vehicle: e, cam: 0, menu: !1, help: !1 }),""",
    """    tkCamFor(e),
    eC.getState().set({
      vehicle: e,
      cam: 0,
      menu: !1,
      help: !1,
      ...(e === `truck` ? { truckEngine: !0 } : {}),
    }),""",
)
rep(
    "                  ` Play Excavator`,\n                ],\n              }),\n",
    "                  ` Play Excavator`,\n                ],\n              }),\n"
    "              (0, Z.jsxs)(`button`, {\n                type: `button`,\n                className: `menu-btn`,\n                onClick: () => lO(`truck`),\n                children: [\n                  (0, Z.jsx)(TKD, { size: 20, \"aria-hidden\": !0 }),\n                  ` Play Dump Truck`,\n                ],\n              }),\n",
)
rep("Loading terrain, village, tractor and excavator…", "Loading terrain, village, tractor, excavator and dump truck…")

# ---- minimap
rep(
    "            n = eC.getState().vehicle === `excavator`,\n            r = n ? { x: CT.x, z: CT.z, yaw: CT.yaw } : ST.tr,",
    "            tkVeh = eC.getState().vehicle,\n            n = tkVeh === `excavator`,\n            kk = tkVeh === `truck`,\n            r = kk ? TK : n ? { x: CT.x, z: CT.z, yaw: CT.yaw } : ST.tr,",
)
rep(
    "            l.strokeRect(-3, -4, 6, 8),\n            l.restore(),\n",
    "            l.strokeRect(-3, -4, 6, 8),\n            l.restore(),\n"
    "            kk ||\n              (l.save(),\n              l.translate(TK.x, TK.z),\n              l.rotate(-TK.yaw),\n              (l.fillStyle = `#d8432b`),\n              l.fillRect(-3.5, -1.5, 7, 12),\n              l.strokeRect(-3.5, -1.5, 7, 12),\n              l.restore()),\n",
)

# ---- main frame loop (bO)
rep("    n = AE(),\n    r = ME(),", "    n = AE(),\n    tk = tkUse(),\n    r = ME(),")
rep(
    "        v = _.vehicle === `excavator`,\n        y = v || _.menu ? vO : mC();",
    "        v = _.vehicle === `excavator`,\n        tkA = _.vehicle === `truck`,\n        y = v || tkA || _.menu ? vO : mC();",
)
rep("v ? sT(CT) : Kw(ST), (h.camInit = !1)", "v ? sT(CT) : tkA ? tkReset(TK) : Kw(ST), (h.camInit = !1)")
rep("            attachPressed: !v && rC.attachPressed,", "            attachPressed: !v && !tkA && rC.attachPressed,")
rep(
    "      ((rC.autoPressed = !1), xT(CT, b, g, ST.tr));",
    """      ((rC.autoPressed = !1), xT(CT, b, g, ST.tr));
      tkStep(TK, tkA && !_.menu ? mC() : null, g, _.truckEngine);
      for (let ev of TK.events)
        ev.type === `crank`
          ? tkA && IS.crank(`truck`)
          : ev.type === `bump`
            ? IS.thud(ev.strength / 3)
            : ev.type === `empty` &&
              tkA &&
              nC(`Bed empty — lower it (Q) and go back for more`);
      TK.events.length = 0;""",
)
rep("        C = v ? CT.x : x.x,\n        w = v ? CT.z : x.z;", "        C = v ? CT.x : tkA ? TK.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : x.z;")
rep("          v ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,", "          v || tkA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,")
rep("        n.update(CT, _, h.t, g, v));", "        n.update(CT, _, h.t, g, v),\n        tk.update(TK, _, h.t, g, tkA));")
rep(
    "      if (CT.digging > 0.05 || CT.bladeWork > 0.05)",
    """      if (TK.running)
        for (
          h.tkSmoke = (h.tkSmoke || 0) + g * (3 + TK.eload * 20),
            tk.root.localToWorld(hO.copy(tk.exhaust));
          h.tkSmoke > 1;
        ) {
          h.tkSmoke--;
          let dk = TK.eload > 0.6;
          r.emit(
            hO.x,
            hO.y,
            hO.z,
            (Math.random() - 0.5) * 0.3,
            1.5 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.3,
            1.8,
            0.5,
            dk ? mO : pO,
            dk ? 0.5 : 0.22,
          );
        }
      if (CT.digging > 0.05 || CT.bladeWork > 0.05)""",
)
rep(
    "        D = v ? hO.set(CT.x, CT.y + 1.7, CT.z) : hO.set(x.x, x.y + 1.6, x.z),",
    "        D = v\n          ? hO.set(CT.x, CT.y + 1.7, CT.z)\n          : tkA\n            ? hO.set(TK.x + Math.sin(TK.yaw) * 1.6, TK.y + 2.4, TK.z + Math.cos(TK.yaw) * 1.6)\n            : hO.set(x.x, x.y + 1.6, x.z),",
)
rep(
    "      } else if (_.cam === 1) {\n        let t = e.root.localToWorld(e.eye.clone());",
    """      } else if (tkA && _.cam === 1) {
        let tE = tk.model.localToWorld(tk.eye.clone());
        E.position.copy(tE);
        let tP0 = iC.pitch - 0.12,
          tDir = new G(
            Math.sin(iC.yaw) * Math.cos(tP0),
            Math.sin(tP0),
            Math.cos(iC.yaw) * Math.cos(tP0),
          ).applyQuaternion(tk.root.quaternion);
        (E.up.set(0, 1, 0),
          E.lookAt(tE.add(tDir)),
          (E.fov = iC.fov),
          (h.camInit = !1));
      } else if (tkA && _.cam === 2) {
        let tP = tk.root.localToWorld(new G(5.8, 4.8, -3.2)),
          tL = tk.root.localToWorld(new G(0, 1.4, 0.4));
        ((tP.y = Math.max(tP.y, nw(tP.x, tP.z) + 1)),
          E.position.lerp(tP, h.camInit ? EC(6, g) : 1),
          E.up.set(0, 1, 0),
          E.lookAt(tL),
          (E.fov = 60),
          (h.camInit = !0));
      } else if (tkA) {
        let ta = TK.yaw + Math.PI + iC.yaw,
          tp = CC(0.3 + iC.pitch, -0.1, 1.3),
          tn = iC.dist,
          tC2 = new G(
            D.x + Math.sin(ta) * Math.cos(tp) * tn,
            D.y + Math.sin(tp) * tn,
            D.z + Math.cos(ta) * Math.cos(tp) * tn,
          );
        ((tC2.y = Math.max(tC2.y, nw(tC2.x, tC2.z) + 0.9)),
          h.camInit ? E.position.lerp(tC2, EC(5, g)) : E.position.copy(tC2),
          (h.camInit = !0),
          E.up.set(0, 1, 0),
          E.lookAt(D),
          (E.fov = 62));
      } else if (_.cam === 1) {
        let t = e.root.localToWorld(e.eye.clone());""",
)
rep(
    "        (e.position.set(x.x + n.x * 80, x.y + n.y * 80, x.z + n.z * 80),\n          e.target.position.set(x.x, x.y, x.z),",
    "        (e.position.set(C + n.x * 80, D.y + n.y * 80, w + n.z * 80),\n          e.target.position.set(C, D.y, w),",
)
rep("            speed: Math.abs(v ? CT.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : x.rpm,", "            speed: Math.abs(v ? CT.v : tkA ? TK.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : x.rpm,")
rep("            running: v ? CT.running : x.running,", "            running: v ? CT.running : tkA ? TK.running : x.running,")
rep(
    "            inSoil: CT.inSoil,\n          })),",
    "            inSoil: CT.inSoil,\n            tLoad: TK.load,\n            tBed: TK.bed,\n            tHauled: TK.hauled,\n            tDumping: TK.dumping > 0.05,\n            tRev: TK.v < -0.3,\n          })),",
)
rep(
    "        v\n          ? IS.update({\n              rpm: CT.rpm,",
    """        tkA
          ? IS.update({
              rpm: TK.rpm,
              load: TK.eload,
              running: TK.running,
              working: Math.min(1, TK.dumping),
              speed: Math.abs(TK.v),
              rough: 0.5,
              hydraulic: TK.bedMoving ? Math.sign(TK.bedCmd) : 0,
              vehicle: `truck`,
              cranking: TK.engine && !TK.running,
              reverse: TK.v < -0.3,
            })
          : v
          ? IS.update({
              rpm: CT.rpm,""",
)
rep("        (0, Z.jsx)(`primitive`, { object: n.root }),", "        (0, Z.jsx)(`primitive`, { object: n.root }),\n        (0, Z.jsx)(`primitive`, { object: tk.root }),")

# =====================================================================
# ---- JCB backhoe loader add-on (jcb-*.js) — applied on top of the truck
jcore = open(os.path.join(SRC, "jcb-core.js")).read()
jrender = open(os.path.join(SRC, "jcb-render.js")).read()
jui = open(os.path.join(SRC, "jcb-ui.js")).read()

rep("({ kepce: `excavator`, kamyon: `truck` })", "({ kepce: `excavator`, kamyon: `truck`, jcb: `jcb`, beko: `jcb` })")
rep("    truckEngine: !0,\n", "    truckEngine: !0,\n    jcbEngine: !0,\n")
rep(
    "    tRev: !1,\n  })),\n  nC =",
    "    tRev: !1,\n    jLoad: 0,\n    jBucket: 0,\n    jSeat: 0,\n    jSeatMoving: !1,\n    jStab: 0,\n    jDug: 0,\n    jRev: !1,\n    jWork: !1,\n    jDump: !1,\n  })),\n  nC =",
)
rep(
    "(iC.pitch = t === `excavator` ? 0.12 : t === `truck` ? 0.06 : 0),\n    (iC.dist = t === `excavator` ? 12 : t === `truck` ? 16 : 11));",
    "(iC.pitch = t === `excavator` ? 0.12 : t === `truck` ? 0.06 : t === `jcb` ? 0.1 : 0),\n    (iC.dist = t === `excavator` ? 12 : t === `truck` ? 16 : t === `jcb` ? 12.5 : 11));",
)
rep("...(t === `truck` ? { truckEngine: !0 } : {})", "...(t === `truck` ? { truckEngine: !0 } : t === `jcb` ? { jcbEngine: !0 } : {})")
rep("...(e === `truck` ? { truckEngine: !0 } : {}),", "...(e === `truck` ? { truckEngine: !0 } : e === `jcb` ? { jcbEngine: !0 } : {}),")
rep(
    "      : e.vehicle === `truck`\n        ? `truckEngine`\n        : `engine`,",
    "      : e.vehicle === `truck`\n        ? `truckEngine`\n        : e.vehicle === `jcb`\n          ? `jcbEngine`\n          : `engine`,",
)
# R turns the swivel seat on the JCB
rep("        case `KeyR`:\n          n || dC();", "        case `KeyR`:\n          t.vehicle === `jcb` ? jbSeatToggle() : n || dC();")

# collisions
rep(
    "Qw = [dw, uw, TKC];",
    "JBC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  Qw = [dw, uw, TKC, JBC];",
)
rep(
    "Q.BODY_R, TKC) ||\n        c));",
    "Q.BODY_R, TKC) ||\n        c),\n      (c =\n        hT(e, e.x + Math.sin(e.yaw) * t, e.z + Math.cos(e.yaw) * t, Q.BODY_R, JBC) ||\n        c));",
)

# add-on code
rep("\nvar ST = Gw(Sw),", "\n" + jcore + "\nvar ST = Gw(Sw),")
rep("\nFx.preload(TKurl);\n", "\nFx.preload(TKurl);\n" + jrender + "\n")
rep("\nfunction qD() {", "\n" + jui + "\nfunction qD() {")

# HUD bar
rep(
    "    k = e.vehicle === `truck`,\n    n = t\n      ? [`Chase`, `Cab`, `Side`]",
    "    k = e.vehicle === `truck`,\n    jb = e.vehicle === `jcb`,\n    n = t || jb\n      ? [`Chase`, `Cab`, `Side`]",
)
rep("        on: t ? e.excEngine : k ? e.truckEngine : e.engine,", "        on: t ? e.excEngine : k ? e.truckEngine : jb ? e.jcbEngine : e.engine,")
rep("      !t &&\n        !k &&\n        (0, Z.jsx)(XD, {\n          on: e.hood,", "      !t &&\n        !k &&\n        !jb &&\n        (0, Z.jsx)(XD, {\n          on: e.hood,")
# prompt
rep(
    "    k = eC((e) => e.vehicle === `truck`),\n    [n, r] = (0, y.useState)(Date.now());",
    "    k = eC((e) => e.vehicle === `truck`),\n    jb = eC((e) => e.vehicle === `jcb`),\n    [n, r] = (0, y.useState)(Date.now());",
)
rep("      : k\n        ? (i = tkPrompt(e))", "      : jb\n        ? (i = jbPrompt(e))\n        : k\n        ? (i = tkPrompt(e))")
# help
rep(
    "    k = eC.getState().vehicle === `truck`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
    "    k = eC.getState().vehicle === `truck`,\n    jb = eC.getState().vehicle === `jcb`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
)
rep("        children: e\n          ? `Excavator controls`\n          : k", "        children: jb\n          ? `JCB backhoe loader controls`\n          : e\n          ? `Excavator controls`\n          : k")
rep("      (k\n        ? TKhelp\n        : e", "      (jb\n        ? JBhelp\n        : k\n        ? TKhelp\n        : e")
# layout
rep("    k = tkVeh === `truck`;\n", "    k = tkVeh === `truck`,\n    jb = tkVeh === `jcb`;\n")
rep("        children: k\n          ? (0, Z.jsx)(tkGauges, {})", "        children: jb\n          ? (0, Z.jsx)(jbGauges, {})\n          : k\n          ? (0, Z.jsx)(tkGauges, {})")
rep("        children: k\n          ? (0, Z.jsx)(tkControls, {})", "        children: jb\n          ? (0, Z.jsx)(jbControls, {})\n          : k\n          ? (0, Z.jsx)(tkControls, {})")
# menu
rep(
    "                  ` Play Dump Truck`,\n                ],\n              }),\n",
    "                  ` Play Dump Truck`,\n                ],\n              }),\n"
    "              (0, Z.jsxs)(`button`, {\n                type: `button`,\n                className: `menu-btn`,\n                onClick: () => lO(`jcb`),\n                children: [\n                  (0, Z.jsx)(JBD, { size: 20, \"aria-hidden\": !0 }),\n                  ` Play JCB Backhoe`,\n                ],\n              }),\n",
)
rep("tractor, excavator and dump truck…", "tractor, excavator, dump truck and JCB…")
# minimap
rep("            kk = tkVeh === `truck`,\n            r = kk ? TK :", "            kk = tkVeh === `truck`,\n            jj = tkVeh === `jcb`,\n            r = jj ? JB : kk ? TK :")
rep(
    "            kk ||\n              (l.save(),",
    "            jj ||\n              (l.save(),\n              l.translate(JB.x, JB.z),\n              l.rotate(-JB.yaw),\n              (l.fillStyle = `#f6b30f`),\n              l.fillRect(-3, -4, 6, 10),\n              l.strokeRect(-3, -4, 6, 10),\n              l.restore()),\n            kk ||\n              (l.save(),",
)

# main loop
rep("    tk = tkUse(),\n", "    tk = tkUse(),\n    jb = jbUse(),\n")
rep("        tkA = _.vehicle === `truck`,\n        y = v || tkA || _.menu ? vO : mC();", "        tkA = _.vehicle === `truck`,\n        jbA = _.vehicle === `jcb`,\n        y = v || tkA || jbA || _.menu ? vO : mC();")
rep("tkA ? tkReset(TK) : Kw(ST)", "tkA ? tkReset(TK) : jbA ? jbReset(JB) : Kw(ST)")
rep("            attachPressed: !v && !tkA && rC.attachPressed,", "            attachPressed: !v && !tkA && !jbA && rC.attachPressed,")
rep(
    "      TK.events.length = 0;",
    """      TK.events.length = 0;
      jbStep(JB, jbA && !_.menu ? jbInput() : null, g, _.jcbEngine);
      for (let ev of JB.events)
        ev.type === `crank`
          ? jbA && IS.crank(`jcb`)
          : ev.type === `bump`
            ? IS.thud(ev.strength / 3)
            : ev.type === `scoop`
              ? jbA && IS.thud(0.5)
              : ev.type === `dump`
                ? jbA && IS.thud(0.6)
                : ev.type === `limit`
                  ? jbA && IS.clunk(0.25 + 0.3 * ev.strength)
                  : !jbA
                    ? 0
                    : ev.type === `seatBack`
                      ? (IS.clunk(0.6), nC(`Seat turned to the backhoe — stabiliser legs going down`))
                      : ev.type === `seatFront`
                        ? (IS.clunk(0.6), nC(`Seat turned to the front loader — legs coming up`))
                        : ev.type === `seatMoving`
                          ? nC(`Stop the machine before turning the seat`)
                          : ev.type === `lFull`
                            ? nC(`Shovel full — lift the arms (E) and tip it with X`)
                            : ev.type === `bFull`
                              ? nC(`Bucket full — swing (← →) and press X to dump`)
                              : ev.type === `noHydraulics` &&
                                nC(`Start the JCB engine first to use hydraulics (K)`);
      JB.events.length = 0;""",
)
rep("        C = v ? CT.x : tkA ? TK.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : x.z;", "        C = v ? CT.x : tkA ? TK.x : jbA ? JB.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : jbA ? JB.z : x.z;")
rep("          v || tkA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,", "          v || tkA || jbA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,")
rep("        tk.update(TK, _, h.t, g, tkA));", "        tk.update(TK, _, h.t, g, tkA),\n        jb.update(JB, _, h.t, g, jbA));")
rep(
    "      if (CT.digging > 0.05 || CT.bladeWork > 0.05)",
    """      if (JB.running)
        for (
          h.jbSmoke = (h.jbSmoke || 0) + g * (3 + JB.eload * 22),
            jb.root.localToWorld(hO.copy(jb.exhaust));
          h.jbSmoke > 1;
        ) {
          h.jbSmoke--;
          let dk = JB.eload > 0.6;
          r.emit(hO.x, hO.y, hO.z, (Math.random() - 0.5) * 0.3, 1.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 1.7, 0.45, dk ? mO : pO, dk ? 0.5 : 0.22);
        }
      if (JB.digging > 0.05)
        for (h.jbDust = (h.jbDust || 0) + g * 24 * JB.digging; h.jbDust > 1; ) {
          h.jbDust--;
          let jp = JB.seat > 0.5 ? hO.copy(JB.tip) : jb.root.localToWorld(hO.set(0, 0.2, 3.6)),
            jg = nw(jp.x, jp.z);
          r.emit(jp.x + (Math.random() - 0.5) * 0.8, jg + 0.15, jp.z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.5, 0.4 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5, 2, 1.1, fO, 0.3);
        }
      if (CT.digging > 0.05 || CT.bladeWork > 0.05)""",
)
rep(
    "          : tkA\n            ? hO.set(TK.x + Math.sin(TK.yaw) * 1.6, TK.y + 2.4, TK.z + Math.cos(TK.yaw) * 1.6)",
    "          : tkA\n            ? hO.set(TK.x + Math.sin(TK.yaw) * 1.6, TK.y + 2.4, TK.z + Math.cos(TK.yaw) * 1.6)\n            : jbA\n            ? hO.set(JB.x + Math.sin(JB.yaw) * 0.6, JB.y + 1.9, JB.z + Math.cos(JB.yaw) * 0.6)",
)
rep(
    "      } else if (tkA && _.cam === 1) {",
    """      } else if (jbA && _.cam === 1) {
        let jE = jb.seat.localToWorld(jb.eye.clone());
        E.position.copy(jE);
        let jP0 = iC.pitch - 0.14 - 0.2 * JB.seat,
          jDir = new G(
            Math.sin(iC.yaw) * Math.cos(jP0),
            Math.sin(jP0),
            Math.cos(iC.yaw) * Math.cos(jP0),
          ).applyQuaternion(jb.seat.getWorldQuaternion(yO));
        (E.up.set(0, 1, 0), E.lookAt(jE.add(jDir)), (E.fov = iC.fov), (h.camInit = !1));
      } else if (jbA && _.cam === 2) {
        let jP = jb.root.localToWorld(new G(6.8, 3.6, 0.4)),
          jL = jb.root.localToWorld(new G(0, 1.3, 0.3));
        ((jP.y = Math.max(jP.y, nw(jP.x, jP.z) + 1)),
          E.position.lerp(jP, h.camInit ? EC(6, g) : 1),
          E.up.set(0, 1, 0),
          E.lookAt(jL),
          (E.fov = 60),
          (h.camInit = !0));
      } else if (jbA) {
        let js = JB.seat * JB.seat * (3 - 2 * JB.seat),
          ja = JB.yaw + Math.PI + js * Math.PI + iC.yaw,
          jp2 = CC(0.3 + 0.12 * js + iC.pitch, -0.1, 1.3),
          jn = iC.dist,
          jC2 = new G(
            D.x + Math.sin(ja) * Math.cos(jp2) * jn,
            D.y + Math.sin(jp2) * jn,
            D.z + Math.cos(ja) * Math.cos(jp2) * jn,
          );
        ((jC2.y = Math.max(jC2.y, nw(jC2.x, jC2.z) + 0.9)),
          h.camInit ? E.position.lerp(jC2, EC(5, g)) : E.position.copy(jC2),
          (h.camInit = !0),
          E.up.set(0, 1, 0),
          E.lookAt(D),
          (E.fov = 62));
      } else if (tkA && _.cam === 1) {""",
)
rep("            speed: Math.abs(v ? CT.v : tkA ? TK.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : x.rpm,", "            speed: Math.abs(v ? CT.v : tkA ? TK.v : jbA ? JB.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : jbA ? JB.rpm : x.rpm,")
rep("            running: v ? CT.running : tkA ? TK.running : x.running,", "            running: v ? CT.running : tkA ? TK.running : jbA ? JB.running : x.running,")
rep(
    "            tRev: TK.v < -0.3,\n          })),",
    "            tRev: TK.v < -0.3,\n            jLoad: JB.lLoad,\n            jBucket: JB.bLoad,\n            jSeat: JB.seatCmd,\n            jSeatMoving: JB.seat > 0.001 && JB.seat < 0.999,\n            jStab: JB.stab,\n            jDug: JB.dug,\n            jRev: JB.v < -0.3,\n            jWork: JB.digging > 0.1,\n            jDump: JB.lDump > 0.05 || JB.bDump > 0.1,\n          })),",
)
rep(
    "        tkA\n          ? IS.update({\n              rpm: TK.rpm,",
    """        jbA
          ? IS.update({
              rpm: JB.rpm,
              load: JB.eload,
              running: JB.running,
              working: Math.min(1, Math.max(JB.digging, JB.lDump, JB.bDump)),
              speed: Math.abs(JB.v),
              rough: 0.6,
              hydraulic: JB.hyd > 0.08 ? (JB.hydCmd >= 0 ? 1 : -1) : 0,
              vehicle: `jcb`,
              cranking: JB.engine && !JB.running,
              reverse: JB.v < -0.3,
            })
          : tkA
          ? IS.update({
              rpm: TK.rpm,""",
)
rep("        (0, Z.jsx)(`primitive`, { object: tk.root }),", "        (0, Z.jsx)(`primitive`, { object: tk.root }),\n        (0, Z.jsx)(`primitive`, { object: jb.root }),")

# =====================================================================
# ---- Multi-vehicle audio upgrade (Tractor real audio + Excavator + Dump Truck + JCB)
rep(
    "    IDLE_RPM: 850,\n    MAX_RPM: 2300,\n    CRANK_TIME: 2.1,",
    "    IDLE_RPM: 850,\n    MAX_RPM: 2300,\n    CRANK_TIME: 2.65,",
)
rep(
    "    TURN: 0.8,\n    CRANK_TIME: 1.8,\n    IDLE_RPM: 1e3,",
    "    TURN: 0.8,\n    CRANK_TIME: 1.9,\n    IDLE_RPM: 1e3,",
)
rep(
    "      for (let e of CT.events)\n        e.type === `crank`\n          ? IS.crank()",
    "      for (let e of CT.events)\n        e.type === `crank`\n          ? v && IS.crank(`excavator`)",
)
rep(
    "      for (let e of ST.events)\n        e.type === `crank`\n          ? IS.crank()",
    "      for (let e of ST.events)\n        e.type === `crank`\n          ? !v && !tkA && !jbA && IS.crank(`tractor`)",
)
rep(
    "              rough: 0.7,\n              hydraulic: CT.hyd > 0.08 ? (CT.j.boom.v >= 0 ? 1 : -1) : 0,\n            })",
    "              rough: 0.7,\n              hydraulic: CT.hyd > 0.08 ? (CT.j.boom.v >= 0 ? 1 : -1) : 0,\n              speed: Math.hypot(CT.v, CT.w * 0.8),\n              vehicle: `excavator`,\n              cranking: CT.engine && !CT.running,\n              reverse: CT.v < -0.15,\n            })",
)
rep(
    "              hydraulic: x.liftMoving ? Math.sign(x.liftCmd) : 0,\n            }),",
    "              hydraulic: x.liftMoving ? Math.sign(x.liftCmd) : 0,\n              vehicle: `tractor`,\n              cranking: x.engine && !x.running,\n              reverse: x.v < -0.2,\n            }),",
)

cut(
    "var FS = 850,\n  IS = new (class {",
    "  LS = `https://sdk.crazygames.com/crazygames-sdk-v3.js`,",
    """var FS = {
    tractor: {
      idle: `tractor_idle.wav`,
      load: `tractor_load.wav`,
      crank: `tractor_crank.wav`,
      baseRpm: 850,
      trim: 1.55,
      crankGain: 1.35,
      filterBase: 820,
      filterRpm: 1.3,
      filterLoad: 1600,
      subMul: 0.24,
    },
    excavator: {
      idle: `excavator_idle.wav`,
      load: `excavator_load.wav`,
      crank: `excavator_crank.wav`,
      baseRpm: 1e3,
      trim: 0.78,
      crankGain: 0.95,
      filterBase: 950,
      filterRpm: 1.2,
      filterLoad: 1500,
      subMul: 0.3,
    },
    truck: {
      idle: `truck_idle.wav`,
      load: `truck_load.wav`,
      crank: `truck_crank.wav`,
      baseRpm: 750,
      trim: 0.8,
      crankGain: 0.98,
      filterBase: 820,
      filterRpm: 1.35,
      filterLoad: 1650,
      subMul: 0.35,
    },
    jcb: {
      idle: `engine_idle.wav`,
      load: `engine_load.wav`,
      crank: null,
      baseRpm: 850,
      trim: 0.92,
      crankGain: 0.85,
      filterBase: 880,
      filterRpm: 1.35,
      filterLoad: 1600,
      subMul: 0.26,
    },
  },
  IS = new (class {
    ctx = null;
    master;
    engineBus;
    sfx;
    analyser;
    banks = {};
    vehicle = `tractor`;
    eFilter;
    eGain;
    sub;
    subGain;
    soilGain;
    soilFilter;
    roadFilter;
    roadGain;
    hyd;
    hydGain;
    hydNoiseGain;
    turbo;
    turboGain;
    horn = null;
    noise;
    crankBuf;
    crankSrc = null;
    crankGainNode = null;
    loadPromise = null;
    nextBeep = 0;
    prevSpeed = 0;
    prevVeh = `tractor`;
    brakeCooldown = 0;
    loading = !1;
    muted = !1;
    setMuted(e) {
      ((this.muted = e), e && this.hornOff());
      let t = this.ctx;
      t &&
        (e && t.state === `running`
          ? t.suspend()
          : !e && t.state === `suspended` && t.resume());
    }
    unlock() {
      if (this.ctx) {
        this.ctx.state === `suspended` && !this.muted && this.ctx.resume();
        return;
      }
      if (!this.loading) {
        this.loading = !0;
        try {
          let e = new (window.AudioContext ?? window.webkitAudioContext)();
          ((this.ctx = e), this.muted && e.suspend());
          let t = e.createDynamicsCompressor();
          ((t.threshold.value = -8),
            (t.knee.value = 6),
            (t.ratio.value = 8),
            (t.attack.value = 0.004),
            (t.release.value = 0.2),
            (this.master = e.createGain()),
            (this.master.gain.value = 0.85),
            (this.analyser = e.createAnalyser()),
            (this.analyser.fftSize = 1024),
            this.master.connect(t),
            t.connect(this.analyser),
            this.analyser.connect(e.destination),
            (this.engineBus = e.createGain()),
            this.engineBus.connect(this.master),
            (this.sfx = e.createGain()),
            this.sfx.connect(this.master),
            (this.noise = this.makeNoise(2.5, !0)),
            (this.crankBuf = this.makeCrank()),
            (this.eFilter = e.createBiquadFilter()),
            (this.eFilter.type = `lowpass`),
            (this.eFilter.frequency.value = 1500),
            (this.eFilter.Q.value = 0.6),
            (this.eGain = e.createGain()),
            (this.eGain.gain.value = 0),
            this.eFilter.connect(this.eGain),
            this.eGain.connect(this.engineBus),
            (this.sub = e.createOscillator()),
            (this.sub.type = `sawtooth`),
            (this.sub.frequency.value = 28));
          let n = e.createBiquadFilter();
          ((n.type = `lowpass`),
            (n.frequency.value = 150),
            (this.subGain = e.createGain()),
            (this.subGain.gain.value = 0),
            this.sub.connect(n),
            n.connect(this.subGain),
            this.subGain.connect(this.eGain),
            this.sub.start());
          let r = e.createBufferSource();
          ((r.buffer = this.noise),
            (r.loop = !0),
            (this.soilFilter = e.createBiquadFilter()),
            (this.soilFilter.type = `bandpass`),
            (this.soilFilter.frequency.value = 420),
            (this.soilFilter.Q.value = 0.7),
            (this.soilGain = e.createGain()),
            (this.soilGain.gain.value = 0),
            r.connect(this.soilFilter),
            this.soilFilter.connect(this.soilGain),
            this.soilGain.connect(this.sfx),
            r.start());
          let i = e.createBufferSource();
          ((i.buffer = this.noise),
            (i.loop = !0),
            (i.playbackRate.value = 0.7));
          let a = e.createBiquadFilter();
          ((a.type = `lowpass`),
            (a.frequency.value = 260),
            (this.roadFilter = a),
            (this.roadGain = e.createGain()),
            (this.roadGain.gain.value = 0),
            i.connect(a),
            a.connect(this.roadGain),
            this.roadGain.connect(this.sfx),
            i.start(0, 1.1),
            (this.hyd = e.createOscillator()),
            (this.hyd.type = `sawtooth`),
            (this.hyd.frequency.value = 190));
          let o = e.createBiquadFilter();
          ((o.type = `bandpass`),
            (o.frequency.value = 760),
            (o.Q.value = 3),
            (this.hydGain = e.createGain()),
            (this.hydGain.gain.value = 0),
            this.hyd.connect(o),
            o.connect(this.hydGain),
            this.hydGain.connect(this.sfx),
            this.hyd.start());
          let hn = e.createBufferSource();
          ((hn.buffer = this.noise), (hn.loop = !0), (hn.playbackRate.value = 1.6));
          let hnf = e.createBiquadFilter();
          ((hnf.type = `bandpass`),
            (hnf.frequency.value = 1650),
            (hnf.Q.value = 1.8),
            (this.hydNoiseGain = e.createGain()),
            (this.hydNoiseGain.gain.value = 0),
            hn.connect(hnf),
            hnf.connect(this.hydNoiseGain),
            this.hydNoiseGain.connect(this.sfx),
            hn.start(0, 0.4),
            (this.turbo = e.createOscillator()),
            (this.turbo.type = `sine`),
            (this.turbo.frequency.value = 1600),
            (this.turboGain = e.createGain()),
            (this.turboGain.gain.value = 0),
            this.turbo.connect(this.turboGain),
            this.turboGain.connect(this.sfx),
            this.turbo.start(),
            (this.loadPromise = this.loadEngine()));
        } catch {
          this.ctx = null;
        }
      }
    }
    async loadEngine() {
      let e = this.ctx;
      if (!e) return;
      let t = async (name) => {
          if (!name) return null;
          try {
            let n = await fetch(PS(name));
            return n.ok ? await e.decodeAudioData(await n.arrayBuffer()) : null;
          } catch (err) {
            return (console.warn(`audio load failed:`, name, err), null);
          }
        },
        i = (buf, dst) => {
          if (!buf) return null;
          let r = e.createBufferSource();
          return (
            (r.buffer = buf),
            (r.loop = !0),
            r.connect(dst),
            r.start(0, Math.random() * buf.duration),
            r
          );
        };
      try {
        await Promise.all(
          Object.entries(FS).map(async ([key, cfg]) => {
            let [n, r, c] = await Promise.all([
                t(cfg.idle),
                t(cfg.load),
                t(cfg.crank),
              ]),
              bus = e.createGain(),
              gIdle = e.createGain(),
              gLoad = e.createGain();
            ((bus.gain.value = key === this.vehicle ? cfg.trim : 0),
              (gIdle.gain.value = 1),
              (gLoad.gain.value = 0),
              gIdle.connect(bus),
              gLoad.connect(bus),
              bus.connect(this.eFilter),
              (this.banks[key] = {
                bus,
                gIdle,
                gLoad,
                idleSrc: i(n, gIdle),
                loadSrc: i(r, gLoad),
                crankBuf: c,
              }));
          }),
        );
      } catch (e) {
        console.warn(`engine sound failed to load`, e);
      }
    }
    makeNoise(e, t) {
      let n = this.ctx,
        r = Math.floor(n.sampleRate * e),
        i = n.createBuffer(1, r, n.sampleRate),
        a = i.getChannelData(0),
        o = 0;
      for (let e = 0; e < r; e++) {
        let n = Math.random() * 2 - 1;
        t ? ((o = (o + 0.02 * n) / 1.02), (a[e] = o * 3.5)) : (a[e] = n);
      }
      return i;
    }
    makeCrank() {
      let e = this.ctx,
        t = e.sampleRate,
        n = 2.3,
        r = Math.floor(t * n),
        i = e.createBuffer(1, r, t),
        a = i.getChannelData(0),
        o = 0.05,
        s = 0.34,
        c = 0;
      for (; o < 1.9999999999999998;) {
        let e = Math.floor(o * t),
          n = Math.floor(s * t * 0.9),
          i = 70 + c * 9;
        for (let o = 0; o < n && e + o < r; o++) {
          let r = o / t,
            s = Math.sin((Math.PI * o) / n);
          a[e + o] +=
            0.22 * s * (((r * i) % 1) * 2 - 1) +
            0.6 * Math.sin(301.584 * r) * Math.exp(-r / 0.05) +
            0.18 * (Math.random() * 2 - 1) * Math.exp(-r / 0.018);
        }
        ((o += s), (s = Math.max(0.17, s * 0.9)), c++);
      }
      for (let e = 0; e < r; e++) {
        let r = e / t;
        a[e] +=
          0.05 *
          Math.sin(6.283 * (260 + r * 60) * r) *
          Math.min(1, r * 5) *
          (r > 2.05 ? (n - r) / 0.25 : 1);
      }
      return i;
    }
    stopCrank() {
      let e = this.ctx;
      if (!e || !this.crankSrc) return;
      try {
        let now = e.currentTime;
        this.crankGainNode?.gain.setTargetAtTime(0.001, now, 0.03);
        this.crankSrc.stop(now + 0.12);
      } catch {}
      ((this.crankSrc = null), (this.crankGainNode = null));
    }
    crank(veh = `tractor`) {
      let e = this.ctx;
      if (!e || this.muted) return;
      let startedAt = e.currentTime,
        cfg = FS[veh] ?? FS.tractor,
        playBuf = (buf, gainVal, offset = 0) => {
          if (!buf) return;
          this.stopCrank();
          let t = e.createBufferSource(),
            n = e.createGain(),
            now = e.currentTime;
          ((t.buffer = buf),
            n.gain.setValueAtTime(0.01, now),
            n.gain.linearRampToValueAtTime(gainVal, now + 0.025),
            t.connect(n),
            n.connect(this.sfx),
            t.start(now, Math.min(offset, Math.max(0, buf.duration - 0.1))),
            (this.crankSrc = t),
            (this.crankGainNode = n),
            (t.onended = () => {
              this.crankSrc === t &&
                ((this.crankSrc = null), (this.crankGainNode = null));
            }));
        },
        bank = this.banks[veh];
      bank?.crankBuf
        ? playBuf(bank.crankBuf, cfg.crankGain)
        : cfg.crank && this.loadPromise
          ? this.loadPromise.then(() => {
              let b = this.banks[veh],
                el = e.currentTime - startedAt;
              b?.crankBuf && el < 1.2
                ? playBuf(b.crankBuf, cfg.crankGain, el)
                : !b?.crankBuf &&
                  el < 0.8 &&
                  playBuf(this.crankBuf, cfg.crankGain, el);
            })
          : playBuf(this.crankBuf, cfg.crankGain);
    }
    beep(freq = 1120) {
      let e = this.ctx;
      if (!e || this.muted) return;
      let t = e.currentTime,
        o = e.createOscillator(),
        f = e.createBiquadFilter(),
        g = e.createGain();
      ((o.type = `square`),
        o.frequency.setValueAtTime(freq, t),
        (f.type = `bandpass`),
        (f.frequency.value = freq * 1.15),
        (f.Q.value = 2),
        g.gain.setValueAtTime(0.001, t),
        g.gain.linearRampToValueAtTime(0.11, t + 0.012),
        g.gain.setValueAtTime(0.11, t + 0.16),
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.21),
        o.connect(f),
        f.connect(g),
        g.connect(this.sfx),
        o.start(t),
        o.stop(t + 0.23));
    }
    airBrake() {
      let e = this.ctx;
      if (!e || this.muted) return;
      let t = e.currentTime,
        r = e.createBufferSource();
      ((r.buffer = this.noise), (r.playbackRate.value = 1.9));
      let f = e.createBiquadFilter();
      ((f.type = `bandpass`), (f.frequency.value = 2400), (f.Q.value = 1.1));
      let g = e.createGain();
      (g.gain.setValueAtTime(0.001, t),
        g.gain.linearRampToValueAtTime(0.32, t + 0.015),
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24),
        r.connect(f),
        f.connect(g),
        g.connect(this.sfx),
        r.start(t, Math.random()),
        r.stop(t + 0.26));
    }
    hornOn() {
      this.unlock();
      let e = this.ctx;
      if (!e || this.horn || this.muted) return;
      let t = e.currentTime,
        n = e.createGain();
      (n.gain.setValueAtTime(0, t),
        n.gain.linearRampToValueAtTime(
          this.vehicle === `truck` ? 0.56 : 0.5,
          t + 0.06,
        ));
      let r = e.createWaveShaper(),
        i = new Float32Array(1024);
      for (let e = 0; e < 1024; e++) {
        let t = (e / 1023) * 2 - 1;
        i[e] = Math.tanh(t * 2.6);
      }
      r.curve = i;
      let a = e.createBiquadFilter();
      ((a.type = `peaking`),
        (a.frequency.value = this.vehicle === `truck` ? 420 : 360),
        (a.Q.value = 1.1),
        (a.gain.value = 9));
      let o = e.createBiquadFilter();
      ((o.type = `lowpass`),
        (o.frequency.value = this.vehicle === `truck` ? 2600 : 2300),
        r.connect(a),
        a.connect(o),
        o.connect(n),
        n.connect(this.sfx));
      let notes =
          this.vehicle === `truck`
            ? [185, 233.1]
            : this.vehicle === `excavator` || this.vehicle === `jcb`
              ? [310, 390]
              : [110, 138.6, 164.8],
        s = notes.map((n, i) => {
          let a = e.createOscillator();
          ((a.type = `sawtooth`),
            a.frequency.setValueAtTime(n * 0.88, t),
            a.frequency.exponentialRampToValueAtTime(n, t + 0.14),
            (a.detune.value = (i - 1) * 4));
          let o = e.createGain();
          return (
            (o.gain.value = 0.28),
            a.connect(o),
            o.connect(r),
            a.start(t),
            a
          );
        }),
        c = e.createBufferSource();
      ((c.buffer = this.noise), (c.loop = !0));
      let l = e.createBiquadFilter();
      ((l.type = `bandpass`), (l.frequency.value = 2600));
      let u = e.createGain();
      (u.gain.setValueAtTime(0.18, t),
        u.gain.exponentialRampToValueAtTime(0.02, t + 0.3),
        c.connect(l),
        l.connect(u),
        u.connect(n),
        c.start(t),
        (this.horn = { oscs: s, gain: n, hiss: c }));
    }
    hornOff() {
      let e = this.ctx,
        t = this.horn;
      if (!e || !t) return;
      let n = e.currentTime;
      (t.gain.gain.cancelScheduledValues(n),
        t.gain.gain.setValueAtTime(t.gain.gain.value, n),
        t.gain.gain.linearRampToValueAtTime(0, n + 0.28));
      for (let e of t.oscs)
        (e.frequency.setTargetAtTime(e.frequency.value * 0.95, n, 0.15),
          e.stop(n + 0.32));
      (t.hiss.stop(n + 0.32), (this.horn = null));
    }
    clunk(e = 1) {
      let t = this.ctx;
      if (!t) return;
      let n = t.currentTime,
        r = t.createBufferSource();
      r.buffer = this.noise;
      let i = t.createBiquadFilter();
      ((i.type = `bandpass`), (i.frequency.value = 900), (i.Q.value = 2));
      let a = t.createGain();
      (a.gain.setValueAtTime(0.9 * e, n),
        a.gain.exponentialRampToValueAtTime(0.001, n + 0.12),
        r.connect(i),
        i.connect(a),
        a.connect(this.sfx),
        r.start(n, Math.random()),
        r.stop(n + 0.15));
      let o = t.createOscillator();
      (o.frequency.setValueAtTime(180, n),
        o.frequency.exponentialRampToValueAtTime(60, n + 0.2));
      let s = t.createGain();
      (s.gain.setValueAtTime(0.6 * e, n),
        s.gain.exponentialRampToValueAtTime(0.001, n + 0.25),
        o.connect(s),
        s.connect(this.sfx),
        o.start(n),
        o.stop(n + 0.3));
    }
    thud(e = 1) {
      let t = this.ctx;
      if (!t) return;
      let n = t.currentTime,
        r = t.createOscillator();
      (r.frequency.setValueAtTime(90, n),
        r.frequency.exponentialRampToValueAtTime(38, n + 0.25));
      let i = t.createGain();
      (i.gain.setValueAtTime(Math.min(1, 0.35 * e), n),
        i.gain.exponentialRampToValueAtTime(0.001, n + 0.35),
        r.connect(i),
        i.connect(this.sfx),
        r.start(n),
        r.stop(n + 0.4));
    }
    update(e) {
      let t = this.ctx;
      if (!t || t.state !== `running`) return;
      let n = t.currentTime,
        r = 0.06,
        veh = e.vehicle ?? this.vehicle ?? `tractor`,
        cfg = FS[veh] ?? FS.tractor;
      this.vehicle = veh;
      let i = Math.max(0.38, Math.min(2.6, e.rpm / cfg.baseRpm));
      for (let [key, bank] of Object.entries(this.banks)) {
        let act = key === veh;
        bank.bus.gain.setTargetAtTime(act ? cfg.trim : 0, n, 0.05);
        act &&
          (bank.idleSrc?.playbackRate.setTargetAtTime(i, n, r),
          bank.loadSrc?.playbackRate.setTargetAtTime(i, n, r),
          bank.gIdle.gain.setTargetAtTime(1 - e.load * 0.55, n, r),
          bank.gLoad.gain.setTargetAtTime(0.15 + e.load * 0.95, n, r));
      }
      !e.running && !e.cranking && this.crankSrc && this.stopCrank();
      let a = e.running
          ? 1
          : e.cranking
            ? 0
            : Math.min(0.65, e.rpm / 850),
        tc = e.running ? 0.14 : e.cranking ? 0.04 : 0.22;
      (this.eGain.gain.setTargetAtTime(0.95 * a, n, tc),
        this.eFilter.frequency.setTargetAtTime(
          cfg.filterBase + e.rpm * cfg.filterRpm + e.load * cfg.filterLoad,
          n,
          r,
        ),
        this.sub.frequency.setTargetAtTime(
          Math.max(
            8,
            (e.rpm / 60) * (veh === `truck` ? 3 : veh === `excavator` ? 2.5 : 2),
          ),
          n,
          r,
        ),
        this.subGain.gain.setTargetAtTime((0.08 + e.load * cfg.subMul) * a, n, r),
        this.turboGain.gain.setTargetAtTime(
          veh === `truck` && e.running ? Math.max(0, e.load - 0.12) * 0.028 : 0,
          n,
          0.09,
        ),
        this.turbo.frequency.setTargetAtTime(
          1450 + Math.min(1, e.rpm / 2200) * 2100 + e.load * 450,
          n,
          0.08,
        ),
        this.soilGain.gain.setTargetAtTime(0.5 * e.working, n, 0.1),
        this.soilFilter.frequency.setTargetAtTime(320 + e.speed * 40, n, 0.1),
        this.roadFilter.frequency.setTargetAtTime(
          veh === `excavator` ? 160 : veh === `truck` ? 230 : 260,
          n,
          0.1,
        ),
        this.roadGain.gain.setTargetAtTime(
          Math.min(
            0.55,
            e.speed *
              (veh === `excavator` ? 0.11 : veh === `truck` ? 0.055 : 0.06),
          ) * e.rough,
          n,
          0.1,
        ));
      let hydAmt =
        e.hydraulic !== 0 && e.running
          ? veh === `excavator`
            ? 0.085
            : veh === `truck`
              ? 0.07
              : veh === `jcb`
                ? 0.065
                : 0.045
          : 0;
      (this.hydGain.gain.setTargetAtTime(hydAmt, n, 0.05),
        this.hyd.frequency.setTargetAtTime(
          veh === `excavator`
            ? e.hydraulic > 0
              ? 245
              : 185
            : veh === `truck`
              ? e.hydraulic > 0
                ? 155
                : 125
              : e.hydraulic > 0
                ? 210
                : 170,
          n,
          0.08,
        ),
        this.hydNoiseGain.gain.setTargetAtTime(hydAmt * 1.4, n, 0.06),
        (veh === `truck` || veh === `jcb`) &&
          e.reverse &&
          e.running &&
          n >= this.nextBeep &&
          (this.beep(veh === `truck` ? 1120 : 1240), (this.nextBeep = n + 0.52)),
        veh === `truck` &&
          this.prevVeh === `truck` &&
          this.prevSpeed > 1.25 &&
          e.speed <= 0.25 &&
          n > this.brakeCooldown &&
          (this.airBrake(), (this.brakeCooldown = n + 1.2)),
        (this.prevSpeed = e.speed),
        (this.prevVeh = veh));
    }
    level() {
      if (!this.analyser) return 0;
      let e = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(e);
      let t = 0;
      for (let n of e) t = Math.max(t, Math.abs(n));
      return t;
    }
  })(),
""",
)

# ---- write output
os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
open(os.path.join(OUT, "assets", "game.js"), "w").write(s)

amap = {}
for p in sorted(glob.glob(os.path.join(ROOT, "src", "assets", "game", "*.asset.json"))):
    name = os.path.basename(p)[: -len(".asset.json")]
    local_path = os.path.join(OUT, "game-assets", name)
    if os.path.exists(local_path):
        amap[name] = f"/game/game-assets/{name}"
    else:
        url = json.load(open(p))["url"]
        amap[name] = ("https://dig-dump-dirt-run.lovable.app" + url) if url.startswith("/__l5e/") else url
for p in sorted(glob.glob(os.path.join(OUT, "game-assets", "*"))):
    name = os.path.basename(p)
    if name not in amap:
        amap[name] = f"/game/game-assets/{name}"
open(os.path.join(OUT, "asset-map.js"), "w").write(
    "// generated by game-src/build.py from src/assets/game/*.asset.json\nwindow.__GAME_ASSETS = " + json.dumps(amap, indent=1) + ";\n"
)
print("ok", len(s), "assets:", len(amap))
