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
rep(",tractor.glb`.split(", ",tractor.glb,dump_truck.gltf`.split(")
rep(
    "function PS(e) {\n  if (!NS.has(e))",
    "function PS(e) {\n  let m = typeof window < `u` && window.__GAME_ASSETS;\n  if (m && m[e]) return m[e];\n  if (!NS.has(e))",
)

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
          ? tkA && IS.crank()
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
          ? jbA && IS.crank()
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
            })
          : tkA
          ? IS.update({
              rpm: TK.rpm,""",
)
rep("        (0, Z.jsx)(`primitive`, { object: tk.root }),", "        (0, Z.jsx)(`primitive`, { object: tk.root }),\n        (0, Z.jsx)(`primitive`, { object: jb.root }),")

# ---- write output
os.makedirs(os.path.join(OUT, "assets"), exist_ok=True)
open(os.path.join(OUT, "assets", "game.js"), "w").write(s)

amap = {}
for p in sorted(glob.glob(os.path.join(ROOT, "src", "assets", "game", "*.asset.json"))):
    name = os.path.basename(p)[: -len(".asset.json")]
    amap[name] = json.load(open(p))["url"]
open(os.path.join(OUT, "asset-map.js"), "w").write(
    "// generated by game-src/build.py from src/assets/game/*.asset.json\nwindow.__GAME_ASSETS = " + json.dumps(amap, indent=1) + ";\n"
)
print("ok", len(s), "assets:", len(amap))
