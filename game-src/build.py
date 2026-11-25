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
    "JBC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  Qw = [dw, uw, TKC, JBC, COC];",
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

# =====================================================================
# ---- Chakir Company Compound + Authentic Turkish Village + Ambient Audio + 60 FPS
ccore = open(os.path.join(SRC, "company-core.js")).read()
crender = open(os.path.join(SRC, "company-render.js")).read()
vturk = open(os.path.join(SRC, "village-turkish.js")).read()

# Fix original HT() roof symmetry bug (-PI/2 + s * m double-negated the s=-1 roof plane on every house & barn)
rep(
    "      g = new K().makeRotationX(-Math.PI / 2 + s * m);",
    "      g = new K().makeRotationX(-Math.PI / 2 + m);",
)

# Inject core modules before mw() so QC + uw walls/columns/pinars are ready before tree/terrain/grass generation
rep("function mw(e, t, n) {", ccore + "\n" + vturk + "\nfunction mw(e, t, n) {")
rep(
    "  if (cw(e, t, VC)) return iw.concrete;",
    "  if (cw(e, t, VC) || coInPad(e, t)) return iw.concrete;\n  if (coInYard(e, t) || coInDrive(e, t)) return iw.gravel;",
)
rep(
    "    cw(e, t, VC)\n  )",
    "    cw(e, t, VC) ||\n    coNoDig(e, t)\n  )",
)
rep(
    "      cw(e, t, { x0: VC.x0 - 6, z0: VC.z0 - 6, x1: VC.x1 + 6, z1: VC.z1 + 6 }))",
    "      cw(e, t, { x0: VC.x0 - 6, z0: VC.z0 - 6, x1: VC.x1 + 6, z1: VC.z1 + 6 }) ||\n      coNoTree(e, t))",
)
# Park Tractor, Excavator & Cultivator inside the Chakir company compound
rep(
    "var hw = { x: -70, z: 22, yaw: Math.PI },\n  gw = { x: -44, z: 50, yaw: Math.PI / 2 },\n  _w = { x: -70, z: 28, yaw: Math.PI };",
    "var hw = { x: -73, z: -43.5, yaw: 0 },\n  gw = { x: -89.5, z: -43, yaw: Math.PI / 2 },\n  _w = { x: -73, z: -49.5, yaw: 0 };",
)

# Terrain shader: Chakir compound gravel yard, driveway, concrete pad & gate apron
rep(
    "      uYard: { value: new rr(VC.x0, VC.z0, VC.x1, VC.z1) },",
    """      uYard: { value: new rr(VC.x0, VC.z0, VC.x1, VC.z1) },
      uCompYard: { value: new rr(CO_BOX.x0, CO_BOX.z0, CO_BOX.x1, CO_BOX.z1) },
      uCompPad: { value: new rr(CO_PAD.x0, CO_PAD.z0, CO_PAD.x1, CO_PAD.z1) },
      uCompApron: { value: new rr(CO_APRON.x0, CO_APRON.z0, CO_APRON.x1, CO_APRON.z1) },
      uCompDrive: { value: new rr(-78.5, -24.0, -68.5, -8.5) },""",
)
rep(
    "uniform vec4 uYard;",
    "uniform vec4 uYard;\nuniform vec4 uCompYard;\nuniform vec4 uCompPad;\nuniform vec4 uCompApron;\nuniform vec4 uCompDrive;",
)
rep(
    "// farm yard concrete\n{\n  vec2 dd = max(uYard.xy - P, P - uYard.zw);\n  float wY = 1.0 - smoothstep(-0.25, 0.25, max(dd.x, dd.y));\n  BLEND(wY, 7.0, 4.0, 0.85, vec3(0.95))\n}",
    """// farm yard concrete
{
  vec2 dd = max(uYard.xy - P, P - uYard.zw);
  float wY = 1.0 - smoothstep(-0.25, 0.25, max(dd.x, dd.y));
  BLEND(wY, 7.0, 4.0, 0.85, vec3(0.95))
}
// Chakir company compound: gravel yard, driveway, garage concrete pad & gate apron
{
  vec2 dy = max(uCompYard.xy - P, P - uCompYard.zw);
  float wCY = 1.0 - smoothstep(-0.3, 0.3, max(dy.x, dy.y));
  BLEND(wCY, 5.0, 2.2, 0.94, vec3(0.92, 0.72, 0.56))
  vec2 ddr = max(uCompDrive.xy - P, P - uCompDrive.zw);
  float wCD = 1.0 - smoothstep(-0.4, 0.5, max(ddr.x, ddr.y));
  BLEND(wCD, 5.0, 2.4, 0.94, vec3(1.02, 0.9, 0.8))
  vec2 dpad = max(uCompPad.xy - P, P - uCompPad.zw);
  float wCP = 1.0 - smoothstep(-0.2, 0.2, max(dpad.x, dpad.y));
  BLEND(wCP, 7.0, 3.6, 0.84, vec3(0.96, 0.95, 0.93))
  vec2 dap = max(uCompApron.xy - P, P - uCompApron.zw);
  float wCA = 1.0 - smoothstep(-0.18, 0.18, max(dap.x, dap.y));
  BLEND(wCA, 7.0, 3.6, 0.84, vec3(0.98, 0.96, 0.92))
}""",
)

# Inject compound render module and hook into bO() main loop
rep("\nvar nD = (e, t, n) => new G(e, t, n),", "\n" + crender + "\nvar nD = (e, t, n) => new G(e, t, n),")
rep("    jb = jbUse(),\n", "    jb = jbUse(),\n    co = coUse(),\n")
rep(
    "      JB.events.length = 0;",
    """      JB.events.length = 0;
      coStep(g, v ? CT : tkA ? TK : jbA ? JB : ST.tr);
      for (let ev of CO.events) IS.clunk(0.45);
      CO.events.length = 0;""",
)
rep(
    "        jb.update(JB, _, h.t, g, jbA));",
    "        jb.update(JB, _, h.t, g, jbA),\n        co.update(CO, h.night, h.t, g));",
)
rep(
    "        (0, Z.jsx)(`primitive`, { object: jb.root }),",
    "        (0, Z.jsx)(`primitive`, { object: jb.root }),\n        (0, Z.jsx)(`primitive`, { object: co.root }),",
)

# ---- Authentic Turkish Village: Narrow lanes, Muddy crossings, Pınars, Architecture
rep(
    """      [120, -10],
      [122, -62],
      [118, -70],
    ],
  ],""",
    """      [120, -10],
      [122, -62],
      [118, -70],
    ],
    [
      [-53, -4],
      [-53, 22],
      [-27, 22],
      [-26, 28],
      [-10, 27],
      [16, 28],
      [19, 46],
      [44, 46],
      [52, 18],
      [52, 4],
    ],
    [
      [-26, 28],
      [-26, 46],
      [-45, 68],
    ],
    [
      [4, 0],
      [4, -14],
      [11, -20],
      [26, -21],
      [40, -24],
      [40, 4],
    ],
    [
      [-22, -4],
      [-22, -29],
      [-23, -44],
      [4, -44],
      [14, -41],
    ],
  ],""",
)
rep(
    "    { x: 121, z: -38, r: 2.4, depth: 0.34, mud: !0 },\n  ],",
    """    { x: 121, z: -38, r: 2.4, depth: 0.34, mud: !0 },
    { x: -26.5, z: 22.0, r: 2.4, depth: 0.18, mud: !0 },
    { x: 4.0, z: 27.5, r: 2.5, depth: 0.19, mud: !0 },
    { x: 32.0, z: 46.0, r: 2.5, depth: 0.18, mud: !0 },
    { x: -22.0, z: -18.0, r: 2.1, depth: 0.16, mud: !0 },
    { x: 26.0, z: -21.0, r: 2.4, depth: 0.18, mud: !0 },
    { x: 68.0, z: 30.0, r: 3.1, depth: 0.22, mud: !0 },
  ],""",
)
rep(
    "  if ((NC(LC, e, t, $C), $C.d < 2 && $C.d > 0.45)) return iw.dirt;",
    "  if ((NC(LC, e, t, $C), $C.d < 1.65 && $C.d > 0.35)) return iw.dirt;",
)
rep(
    "float inT = 1.0 - smoothstep(1.45, 2.3, td + (tNoise(P * 0.7) - 0.5) * 0.6);\nfloat mid = 1.0 - smoothstep(0.22, 0.6, td + (tNoise(P * 1.3) - 0.5) * 0.3);",
    "float inT = 1.0 - smoothstep(1.05, 1.72, td + (tNoise(P * 0.7) - 0.5) * 0.48);\nfloat mid = 1.0 - smoothstep(0.16, 0.45, td + (tNoise(P * 1.3) - 0.5) * 0.24);",
)
rep("      new q(`#8a3324`),", "      new q(`#6e4d36`),")
rep("(0, Z.jsx)(QT, {})", "(0, Z.jsx)(vtBuildBuildings, {})")

# ---- Circular Corner Minimap Enhancements (Compound, Turkish Village Pınars, Mosque Dome & Compass N)
rep(
    "      ((n.fillStyle = `#b8b4aa`),\n        n.fillRect(\n          i(VC.x0),\n          i(VC.z0),\n          (VC.x1 - VC.x0) * r,\n          (VC.z1 - VC.z0) * r,\n        ));",
    """      ((n.fillStyle = `#b8b4aa`),
        n.fillRect(
          i(VC.x0),
          i(VC.z0),
          (VC.x1 - VC.x0) * r,
          (VC.z1 - VC.z0) * r,
        ),
        (n.fillStyle = `#7c5644`),
        n.fillRect(
          i(CO_BOX.x0),
          i(CO_BOX.z0),
          (CO_BOX.x1 - CO_BOX.x0) * r,
          (CO_BOX.z1 - CO_BOX.z0) * r,
        ),
        (n.fillStyle = `#b8b4aa`),
        n.fillRect(
          i(CO_PAD.x0),
          i(CO_PAD.z0),
          (CO_PAD.x1 - CO_PAD.x0) * r,
          (CO_PAD.z1 - CO_PAD.z0) * r,
        ),
        n.fillRect(
          i(CO_APRON.x0),
          i(CO_APRON.z0),
          (CO_APRON.x1 - CO_APRON.x0) * r,
          (CO_APRON.z1 - CO_APRON.z0) * r,
        ),
        (n.fillStyle = `#8c5840`),
        n.fillRect(
          i(CO_GARAGE.x0),
          i(CO_GARAGE.z0),
          (CO_GARAGE.x1 - CO_GARAGE.x0) * r,
          (CO_GARAGE.z1 - CO_GARAGE.z0) * r,
        ),
        (n.strokeStyle = `#3c3a37`),
        (n.lineWidth = 2 * r),
        n.strokeRect(
          i(CO_BOX.x0),
          i(CO_BOX.z0),
          (CO_BOX.x1 - CO_BOX.x0) * r,
          (CO_BOX.z1 - CO_BOX.z0) * r,
        ));""",
)
rep(
    "        (n.fillStyle = `#e8e2d4`),\n        n.fillRect(i(qC.x - 5), i(qC.z - 5), 10 * r, 10 * r));",
    """        (n.fillStyle = `#e8e2d4`),
        n.fillRect(i(qC.x - 5.5), i(qC.z - 5.5), 11 * r, 11 * r),
        (n.fillStyle = `#6e777d`),
        n.beginPath(),
        n.arc(i(qC.x), i(qC.z), 4.2 * r, 0, Math.PI * 2),
        n.fill(),
        (n.fillStyle = `#d4a638`),
        n.beginPath(),
        n.arc(i(qC.x), i(qC.z), 1.5 * r, 0, Math.PI * 2),
        n.fill(),
        VT_PINARS.forEach((p) => {
          n.fillStyle = `#3ea8c7`;
          n.strokeStyle = `#163b4a`;
          n.lineWidth = 1.2 * r;
          n.beginPath();
          n.arc(i(p.x), i(p.z), 3.4 * r, 0, Math.PI * 2);
          n.fill();
          n.stroke();
        }));""",
)
# Skip minimap redraws when paused in menu, and add rotating North (N) compass indicator on circular rim
rep(
    "          let { imp: e } = ST,",
    "          if (eC.getState().menu) return;\n          let { imp: e } = ST,",
)
rep(
    "            l.fill(),\n            l.stroke());",
    """            l.fill(),
            l.stroke());
            {
              let nx = GD - Math.sin(r.yaw) * 78,
                ny = GD + Math.cos(r.yaw) * 78;
              l.save();
              l.fillStyle = `rgba(18,22,28,0.88)`;
              l.strokeStyle = `#e6aa2d`;
              l.lineWidth = 1.4;
              l.beginPath();
              l.arc(nx, ny, 9.5, 0, Math.PI * 2);
              l.fill();
              l.stroke();
              l.fillStyle = `#f7f3e8`;
              l.font = `700 10px "Barlow Condensed", sans-serif`;
              l.textAlign = `center`;
              l.textBaseline = `middle`;
              l.fillText(`N`, nx, ny + 0.5);
              l.restore();
            }""",
)

# ---- Turkish Village Ambient Sounds (Bird Chirps & Wind Gusts)
rep(
    "    brakeCooldown = 0;\n    loading = !1;",
    "    brakeCooldown = 0;\n    ambGain = null;\n    windFilter = null;\n    windGain = null;\n    ambT = 0;\n    ambNextBird = 2.4;\n    loading = !1;",
)
rep(
    "            (this.turboGain.gain.value = 0),\n            this.turbo.connect(this.turboGain),\n            this.turboGain.connect(this.sfx),\n            this.turbo.start(),",
    """            (this.turboGain.gain.value = 0),
            this.turbo.connect(this.turboGain),
            this.turboGain.connect(this.sfx),
            this.turbo.start(),
            (this.ambGain = e.createGain()),
            (this.ambGain.gain.value = 0.78),
            this.ambGain.connect(this.sfx),
            (() => {
              let ws = e.createBufferSource();
              ws.buffer = this.noise;
              ws.loop = !0;
              ws.playbackRate.value = 0.45;
              this.windFilter = e.createBiquadFilter();
              this.windFilter.type = `lowpass`;
              this.windFilter.frequency.value = 320;
              this.windFilter.Q.value = 1.4;
              this.windGain = e.createGain();
              this.windGain.gain.value = 0;
              ws.connect(this.windFilter);
              this.windFilter.connect(this.windGain);
              this.windGain.connect(this.ambGain);
              ws.start(0, 0.7);
            })(),""",
)
rep(
    "    level() {",
    """    birdChirp(night) {
      let e = this.ctx;
      if (!e || !this.ambGain || this.muted) return;
      let t = e.currentTime,
        pan = e.createStereoPanner ? e.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = (Math.random() - 0.5) * 1.4;
        pan.connect(this.ambGain);
      }
      let dst = pan ?? this.ambGain;
      if (night > 0.58) {
        // Soft Anatolian night owl or gentle cricket chirp
        let o = e.createOscillator(),
          g = e.createGain();
        o.type = `sine`;
        o.frequency.setValueAtTime(510, t);
        o.frequency.exponentialRampToValueAtTime(420, t + 0.38);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.026, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.46);
        o.connect(g);
        g.connect(dst);
        o.start(t);
        o.stop(t + 0.48);
        return;
      }
      if (Math.random() < 0.35) {
        // Kumru (Turkish village turtledove) gentle 3-coo call
        let notes = [560, 650, 520];
        notes.forEach((f, i) => {
          let s0 = t + i * 0.23,
            o = e.createOscillator(),
            g = e.createGain();
          o.type = `sine`;
          o.frequency.setValueAtTime(f * 0.94, s0);
          o.frequency.exponentialRampToValueAtTime(f, s0 + 0.08);
          o.frequency.exponentialRampToValueAtTime(f * 0.92, s0 + 0.19);
          g.gain.setValueAtTime(0.0001, s0);
          g.gain.linearRampToValueAtTime(0.028, s0 + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, s0 + 0.2);
          o.connect(g);
          g.connect(dst);
          o.start(s0);
          o.stop(s0 + 0.22);
        });
      } else {
        // Morning sparrows / finches chirping
        let count = 2 + Math.floor(Math.random() * 3),
          base = 2400 + Math.random() * 1100;
        for (let i = 0; i < count; i++) {
          let s0 = t + i * (0.085 + Math.random() * 0.05),
            dur = 0.055 + Math.random() * 0.035,
            o = e.createOscillator(),
            bp = e.createBiquadFilter(),
            g = e.createGain();
          o.type = `triangle`;
          o.frequency.setValueAtTime(base, s0);
          o.frequency.exponentialRampToValueAtTime(base * (1.18 + Math.random() * 0.2), s0 + dur * 0.65);
          o.frequency.exponentialRampToValueAtTime(base * 0.95, s0 + dur);
          bp.type = `bandpass`;
          bp.frequency.value = 3000;
          bp.Q.value = 1.2;
          g.gain.setValueAtTime(0.0001, s0);
          g.gain.linearRampToValueAtTime(0.032, s0 + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, s0 + dur);
          o.connect(bp);
          bp.connect(g);
          g.connect(dst);
          o.start(s0);
          o.stop(s0 + dur + 0.01);
        }
      }
    }
    updateAmbient(dt, px, pz, night, inMenu) {
      let e = this.ctx;
      if (!e || e.state !== `running` || this.muted || !this.ambGain) return;
      this.ambT += dt;
      let t = e.currentTime;
      this.ambGain.gain.setTargetAtTime(inMenu ? 0.2 : 0.78, t, 0.25);
      let gust =
        0.35 +
        0.35 * Math.sin(this.ambT * 0.23) +
        0.3 * Math.sin(this.ambT * 0.61 + 1.4);
      this.windGain?.gain.setTargetAtTime(0.016 + gust * 0.044, t, 0.35);
      this.windFilter?.frequency.setTargetAtTime(240 + gust * 360, t, 0.35);
      if (inMenu) return;
      this.ambNextBird -= dt;
      if (this.ambNextBird <= 0) {
        this.birdChirp(night);
        this.ambNextBird = 2.2 + Math.random() * 4.0;
      }
    }
    level() {""",
)
rep(
    "        jb.update(JB, _, h.t, g, jbA),\n        co.update(CO, h.night, h.t, g));",
    "        jb.update(JB, _, h.t, g, jbA),\n        co.update(CO, h.night, h.t, g),\n        IS.updateAmbient(g, C, w, h.night, _.menu));",
)

# ---- Reliable Asset Loading (retry transient proxy/network hiccups)
rep(
    """function AT(e) {
  return new Promise((t, n) => {
    let r = new Image();
    ((r.crossOrigin = `anonymous`),
      (r.decoding = `async`),
      (r.onload = () => t(r)),
      (r.onerror = () => n(Error(`image failed: ${e}`))),
      (r.src = e));
  });
}""",
    """function AT(e, nTries = 3) {
  return new Promise((t, n) => {
    let attempt = 0,
      load = () => {
        let r = new Image();
        ((r.crossOrigin = `anonymous`),
          (r.decoding = `async`),
          (r.onload = () => t(r)),
          (r.onerror = () => {
            attempt < nTries
              ? (attempt++, setTimeout(load, 250 * attempt))
              : n(Error(`image failed: ${e}`));
          }),
          (r.src =
            attempt > 0
              ? `${e}${e.includes(`?`) ? `&` : `?`}r=${attempt}`
              : e));
      };
    load();
  });
}""",
)

# ---- 60 FPS Engine & GPU Optimizations (full visual detail preserved)
# 1. Disable mipmap regeneration on 2048x2048 live soil mask (removes driving micro-stutter)
rep(
    "      (Cw.minFilter = F),\n      (Cw.generateMipmaps = !0),",
    "      (Cw.minFilter = N),\n      (Cw.generateMipmaps = !1),",
)
# 2. Early-Z depth ordering on terrain: draw high-res 64x64 patch BEFORE coarse/outer
rep(
    "  let i = new Cl({ color: 16777215, roughness: 1, metalness: 0 }),",
    "  let i = new Cl({\n    color: 16777215,\n    roughness: 1,\n    metalness: 0,\n    ...(r === `patch`\n      ? { polygonOffset: !0, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }\n      : {}),\n  }),",
)
rep(
    """      (0, Z.jsx)(`mesh`, { geometry: n, material: i, receiveShadow: !0 }),
      (0, Z.jsx)(`mesh`, { geometry: r, material: i, receiveShadow: !0 }),
      (0, Z.jsx)(`mesh`, {
        geometry: a,
        material: o,
        receiveShadow: !0,
        frustumCulled: !1,
      }),""",
    """      (0, Z.jsx)(`mesh`, {
        geometry: a,
        material: o,
        receiveShadow: !0,
        frustumCulled: !1,
      }),
      (0, Z.jsx)(`mesh`, { geometry: n, material: i, receiveShadow: !0 }),
      (0, Z.jsx)(`mesh`, { geometry: r, material: i, receiveShadow: !0 }),""",
)
# 3. Fast PCFShadowMap ('percentage'), crisp DPR cap, no stencil buffer overhead
rep(
    """        (0, Z.jsx)(Ay, {
          shadows: !0,
          frameloop: r || (a && t) ? `never` : `always`,
          dpr: n === `high` ? [1, 1.75] : [1, 1.25],
          gl: { antialias: !0, powerPreference: `high-performance` },""",
    """        (0, Z.jsx)(Ay, {
          shadows: `percentage`,
          frameloop: r || (a && t) ? `never` : `always`,
          dpr: n === `high` ? [1, 1.35] : 1,
          gl: { antialias: !0, powerPreference: `high-performance`, stencil: !1 },""",
)
# 4. Crisp 1536x1536 directional shadow map + skip self-shadow sampling on 25k tree leaf cards + balanced grass/wheat radius
rep(
    '          "shadow-mapSize": [2048, 2048],',
    '          "shadow-mapSize": [1536, 1536],',
)
rep(
    "(c.receiveShadow = l.receiveShadow = !0),",
    "(c.receiveShadow = !0),\n            (l.receiveShadow = !1),",
)
rep(
    "(n) => n.kind === t && (e || Math.hypot(n.x, n.z) < 330),",
    "(n) => n.kind === t && Math.hypot(n.x, n.z) < (e ? 440 : 320),",
)
rep(
    "(0, Z.jsx)(IE, { count: e ? 3e4 : 12e3, tile: e ? 84 : 60 }),\n          (0, Z.jsx)(LE, { spacing: e ? 0.55 : 0.8 }),",
    "(0, Z.jsx)(IE, { count: e ? 19e3 : 9500, tile: e ? 68 : 52 }),\n          (0, Z.jsx)(LE, { spacing: e ? 0.68 : 0.9 }),",
)
# 5. Disable inactive vehicle spotlights/pointlights from GPU fragment light evaluation when intensity is 0
rep(
    """        let E = +!!n.head;
        (u(`headlamp_lens`, `#fff3c4`, E * 3),
          y.forEach((e) => (e.intensity = E * 60)),
          u(`tail_lens`, `#ff2010`, n.head || n.work ? 1.6 : 0),
          (b.intensity = (n.head ? 0.8 : 0) + c.brake * 1.2),
          u(`brake_lens`, `#ff1a10`, c.brake > 0.1 ? 3 : 0),
          u(`reverse_lens`, `#ffffff`, c.dir < 0 && c.running ? 2.5 : 0),
          (S.intensity = n.work ? 45 : 0));
        let O = n.beacon && Math.sin(r * 9) > 0 ? 1 : n.beacon ? 0.12 : 0;
        (u(`amber_lens`, `#ffa000`, O * 4), (x.intensity = O * 6));""",
    """        let E = +!!n.head;
        (u(`headlamp_lens`, `#fff3c4`, E * 3),
          y.forEach((e) => {
            e.intensity = E * 60;
            e.visible = E > 0;
          }),
          u(`tail_lens`, `#ff2010`, n.head || n.work ? 1.6 : 0),
          (b.intensity = (n.head ? 0.8 : 0) + c.brake * 1.2),
          (b.visible = b.intensity > 0.01),
          u(`brake_lens`, `#ff1a10`, c.brake > 0.1 ? 3 : 0),
          u(`reverse_lens`, `#ffffff`, c.dir < 0 && c.running ? 2.5 : 0),
          (S.intensity = n.work ? 45 : 0),
          (S.visible = !!n.work));
        let O = n.beacon && Math.sin(r * 9) > 0 ? 1 : n.beacon ? 0.12 : 0;
        (u(`amber_lens`, `#ffa000`, O * 4), (x.intensity = O * 6), (x.visible = O > 0.01));""",
)
rep(
    "((M.lens.emissiveIntensity = lit ? 3 : 0), (spot.intensity = lit ? 60 : 0));",
    "((M.lens.emissiveIntensity = lit ? 3 : 0), (spot.intensity = lit ? 60 : 0), (spot.visible = !!lit));",
)
# 6. Pre-allocate scratch vectors & colors in bO() to avoid per-frame GC stalls
rep(
    "  yO = new Ln();\nfunction bO()",
    "  yO = new Ln(),\n  coNightCol = new q(`#0b1220`),\n  coSunDir = new G(),\n  coMoonDir = new G(-0.4, 0.8, 0.3).normalize();\nfunction bO()",
)
rep(
    """      let A = wC(0.62, -0.12, k),
        j = new G(
          Math.cos(A) * 0.82,
          Math.sin(A),
          Math.cos(A) * -0.57,
        ).normalize(),""",
    """      let A = wC(0.62, -0.12, k),
        j = coSunDir.set(
          Math.cos(A) * 0.82,
          Math.sin(A),
          Math.cos(A) * -0.57,
        ).normalize(),""",
)
rep(
    """        let e = s.current,
          t = new G(-0.4, 0.8, 0.3).normalize(),
          n = k > 0.5 ? t : j;""",
    """        let e = s.current,
          n = k > 0.5 ? coMoonDir : j;""",
)
rep(
    "        f.color.set(`#c4d4e0`).lerp(new q(`#0b1220`), k),",
    "        f.color.set(`#c4d4e0`).lerp(coNightCol, k),",
)

# =====================================================================
# ---- Motor Grader (Greyder) add-on (grader-*.js) & Roadwork Surface Layers
grcore = open(os.path.join(SRC, "grader-core.js")).read()
grrender = open(os.path.join(SRC, "grader-render.js")).read()
grui = open(os.path.join(SRC, "grader-ui.js")).read()

rep("({ kepce: `excavator`, kamyon: `truck`, jcb: `jcb`, beko: `jcb` })", "({ kepce: `excavator`, kamyon: `truck`, jcb: `jcb`, beko: `jcb`, greyder: `grader`, grader: `grader` })")
rep("    jcbEngine: !0,\n", "    jcbEngine: !0,\n    graderEngine: !0,\n")
rep(
    "    jDump: !1,\n  })),\n  nC =",
    "    jDump: !1,\n    grBlade: 0.24,\n    grAngle: -0.26,\n    grRip: 0,\n    grRipCmd: 0,\n    grWork: !1,\n    grArea: 0,\n    grRev: !1,\n  })),\n  nC =",
)
rep("    autoPressed: !1,\n  },", "    autoPressed: !1,\n    grAngL: !1,\n    grAngR: !1,\n  },")
rep("t === `jcb` ? 0.1 : 0", "t === `jcb` ? 0.1 : t === `grader` ? 0.08 : 0")
rep("t === `jcb` ? 12.5 : 11", "t === `jcb` ? 12.5 : t === `grader` ? 14.5 : 11")
rep(": t === `jcb` ? { jcbEngine: !0 } : {})", ": t === `jcb` ? { jcbEngine: !0 } : t === `grader` ? { graderEngine: !0 } : {})")
rep(": e === `jcb` ? { jcbEngine: !0 } : {}),", ": e === `jcb` ? { jcbEngine: !0 } : e === `grader` ? { graderEngine: !0 } : {}),")
rep(
    ": e.vehicle === `jcb`\n          ? `jcbEngine`\n          : `engine`,",
    ": e.vehicle === `jcb`\n          ? `jcbEngine`\n          : e.vehicle === `grader`\n            ? `graderEngine`\n            : `engine`,",
)
rep(
    "        case `KeyG`:\n          n && t.flip(`bladeDown`);",
    "        case `KeyG`:\n          t.vehicle === `grader` ? grRipperToggle() : n && t.flip(`bladeDown`);",
)

# Collisions
rep(
    "JBC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  Qw = [dw, uw, TKC, JBC, COC];",
    "JBC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  GRC = [0, 1, 2, 3].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  Qw = [dw, uw, TKC, JBC, COC, GRC];",
)
rep(
    "Q.BODY_R, JBC) ||\n        c));",
    "Q.BODY_R, JBC) ||\n        c),\n      (c =\n        hT(e, e.x + Math.sin(e.yaw) * t, e.z + Math.cos(e.yaw) * t, Q.BODY_R, GRC) ||\n        c));",
)

# Live surface mask B-channel (scarified asphalt/soil & compacted leveled roadbed)
rep(
    "    tilledCells = 0;\n",
    "    tilledCells = 0;\n    scrapedCells = 0;\n",
)
rep(
    "      return ((this.tilledCells += h), h * this.cellArea);\n    }\n    stampTrack(",
    """      return ((this.tilledCells += h), h * this.cellArea);
    }
    paintScrape(e, t, n, r, i, val, canFn) {
      let o = this.n,
        s = Math.max(0, this.toCell(Math.min(e, n) - i)),
        c = Math.min(o - 1, this.toCell(Math.max(e, n) + i)),
        l = Math.max(0, this.toCell(Math.min(t, r) - i)),
        u = Math.min(o - 1, this.toCell(Math.max(t, r) + i)),
        d = n - e,
        f = r - t,
        p = d * d + f * f || 1e-6,
        m = i * i;
      for (let yy = l; yy <= u; yy++) {
        let wz = (yy + 0.5) * this.cell - 300;
        for (let xx = s; xx <= c; xx++) {
          let idx = (yy * o + xx) * 4;
          if (this.data[idx + 2] >= val) continue;
          let wx = (xx + 0.5) * this.cell - 300,
            t0 = ((wx - e) * d + (wz - t) * f) / p;
          t0 = t0 < 0 ? 0 : t0 > 1 ? 1 : t0;
          let dx = wx - e - d * t0,
            dz = wz - t - f * t0;
          if (dx * dx + dz * dz <= m && (!canFn || canFn(wx, wz))) {
            this.data[idx + 2] = val;
            this.data[idx] = Math.max(0, this.data[idx] - 180);
            this.mark(yy, xx);
            this.scrapedCells++;
          }
        }
      }
    }
    stampTrack(""",
)
rep(
    "((this.data[e] = 0), (this.data[e + 1] = 0));\n      this.tilledCells = 0;",
    "((this.data[e] = 0), (this.data[e + 1] = 0), (this.data[e + 2] = 0));\n      this.tilledCells = 0;\n      this.scrapedCells = 0;",
)

# Clear meadow grass blades wherever the grader scrapes/levels ground
rep(
    "(1.0 - smoothstep(0.25, 0.45, mk.r)) * (1.0 - smoothstep(0.72, 1.0, dc))",
    "(1.0 - smoothstep(0.25, 0.45, mk.r)) * (1.0 - smoothstep(0.22, 0.52, mk.b)) * (1.0 - smoothstep(0.72, 1.0, dc))",
)

# Terrain shader: render torn asphalt/mud patches & freshly leveled aggregate sub-base via m.b
rep(
    "// excavated holes and dumped soil piles from the live dig field",
    """// grader scarified asphalt/dirt and leveled crushed-stone roadbed (m.b)
if (m.b > 0.01) {
  float wScar = smoothstep(0.04, 0.28, m.b) * (1.0 - smoothstep(0.55, 0.72, m.b));
  float wFlat = smoothstep(0.62, 0.88, m.b);
  float gGrn = 0.88 + 0.24 * tNoise(P * 2.4);
  if (wScar > 0.003) {
    vec2 uvs = P / 2.6;
    vec3 cScar = mix(sD(4.0, uvs, kAT) * vec3(0.5, 0.46, 0.42), sD(5.0, uvs, kAT) * vec3(0.78, 0.68, 0.58), 0.48) * gGrn;
    tC = mix(tC, cScar, wScar);
    tN = mix(tN, sN(5.0, uvs), wScar * 0.7);
    tR = mix(tR, 0.96, wScar);
  }
  if (wFlat > 0.003) {
    vec2 uvf = P / 2.2;
    vec3 cFlat = sD(7.0, uvf, kAT) * vec3(0.66, 0.65, 0.61) * (0.94 + 0.12 * tNoise(P * 3.1));
    tC = mix(tC, cFlat, wFlat);
    tN = mix(tN, sN(5.0, uvf) * 0.42, wFlat * 0.42);
    tR = mix(tR, 0.88, wFlat);
  }
}
// excavated holes and dumped soil piles from the live dig field""",
)

# Inject grader modules
rep("\nvar ST = Gw(Sw),", "\n" + grcore + "\nvar ST = Gw(Sw),")
rep("\nvar nD = (e, t, n) => new G(e, t, n),", "\n" + grrender + "\nvar nD = (e, t, n) => new G(e, t, n),")
rep("\nfunction qD() {", "\n" + grui + "\nfunction qD() {")

# Audio bank for Motor Grader
rep(
    """    jcb: {
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
    },""",
    """    jcb: {
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
    grader: {
      idle: `truck_idle.wav`,
      load: `truck_load.wav`,
      crank: `truck_crank.wav`,
      baseRpm: 720,
      trim: 0.82,
      crankGain: 0.95,
      filterBase: 760,
      filterRpm: 1.28,
      filterLoad: 1550,
      subMul: 0.32,
    },""",
)
rep(
    "veh === `jcb`\n                ? 0.065",
    "veh === `jcb` || veh === `grader`\n                ? 0.065",
)
rep(
    "(veh === `truck` || veh === `jcb`) &&",
    "(veh === `truck` || veh === `jcb` || veh === `grader`) &&",
)
rep(
    "? !v && !tkA && !jbA && IS.crank(`tractor`)",
    "? !v && !tkA && !jbA && !grA && IS.crank(`tractor`)",
)

# HUD bar, prompts, help, layout, menu
rep(
    "    jb = e.vehicle === `jcb`,\n    n = t || jb\n      ? [`Chase`, `Cab`, `Side`]",
    "    jb = e.vehicle === `jcb`,\n    gr = e.vehicle === `grader`,\n    n = t || jb || gr\n      ? [`Chase`, `Cab`, `Side`]",
)
rep(
    "on: t ? e.excEngine : k ? e.truckEngine : jb ? e.jcbEngine : e.engine,",
    "on: t ? e.excEngine : k ? e.truckEngine : jb ? e.jcbEngine : gr ? e.graderEngine : e.engine,",
)
rep(
    "      !t &&\n        !k &&\n        !jb &&\n        (0, Z.jsx)(XD, {",
    "      !t &&\n        !k &&\n        !jb &&\n        !gr &&\n        (0, Z.jsx)(XD, {",
)
rep(
    "    jb = eC((e) => e.vehicle === `jcb`),\n    [n, r] = (0, y.useState)(Date.now());",
    "    jb = eC((e) => e.vehicle === `jcb`),\n    gr = eC((e) => e.vehicle === `grader`),\n    [n, r] = (0, y.useState)(Date.now());",
)
rep(
    "      : jb\n        ? (i = jbPrompt(e))",
    "      : gr\n        ? (i = grPrompt(e))\n        : jb\n        ? (i = jbPrompt(e))",
)
rep(
    "    jb = eC.getState().vehicle === `jcb`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
    "    jb = eC.getState().vehicle === `jcb`,\n    gr = eC.getState().vehicle === `grader`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
)
rep(
    "        children: jb\n          ? `JCB backhoe loader controls`",
    "        children: gr\n          ? `Motor grader controls`\n          : jb\n          ? `JCB backhoe loader controls`",
)
rep(
    "      (jb\n        ? JBhelp",
    "      (gr\n        ? GRhelp\n        : jb\n        ? JBhelp",
)
rep(
    "    jb = tkVeh === `jcb`;\n",
    "    jb = tkVeh === `jcb`,\n    gr = tkVeh === `grader`;\n",
)
rep(
    "        children: jb\n          ? (0, Z.jsx)(jbGauges, {})",
    "        children: gr\n          ? (0, Z.jsx)(grGauges, {})\n          : jb\n          ? (0, Z.jsx)(jbGauges, {})",
)
rep(
    "        children: jb\n          ? (0, Z.jsx)(jbControls, {})",
    "        children: gr\n          ? (0, Z.jsx)(grControls, {})\n          : jb\n          ? (0, Z.jsx)(jbControls, {})",
)
rep(
    "                  ` Play JCB Backhoe`,\n                ],\n              }),\n",
    "                  ` Play JCB Backhoe`,\n                ],\n              }),\n"
    "              (0, Z.jsxs)(`button`, {\n                type: `button`,\n                className: `menu-btn`,\n                onClick: () => lO(`grader`),\n                children: [\n                  (0, Z.jsx)(GRD, { size: 20, \"aria-hidden\": !0 }),\n                  ` Play Grader`,\n                ],\n              }),\n",
)
rep("tractor, excavator, dump truck and JCB…", "tractor, excavator, dump truck, JCB and grader…")

# Minimap: roadwork zones + live graded roadbed + Grader icon
rep(
    "        n.stroke(),\n        (n.fillStyle = `#b5462e`));",
    """        n.stroke(),
        n.save(),
        (n.strokeStyle = `#f09a1a`),
        (n.lineWidth = 5 * r),
        n.setLineDash([4 * r, 3 * r]),
        GR_ZONES.forEach((zn) => {
          n.beginPath();
          n.moveTo(i(zn.x0), i(grZoneZ(zn, zn.x0)));
          n.lineTo(i(zn.x1), i(grZoneZ(zn, zn.x1)));
          n.stroke();
        }),
        n.restore(),
        (n.fillStyle = `#b5462e`));""",
)
rep(
    "        u = -1,\n        d = -1,",
    "        u = -1,\n        gs = -1,\n        d = -1,",
)
rep(
    "          if ((f++, (Sw.tilledCells !== u || SC.version !== d) && f % 4 == 0)) {\n            ((u = Sw.tilledCells), (d = SC.version));",
    "          if ((f++, (Sw.tilledCells !== u || Sw.scrapedCells !== gs || SC.version !== d) && f % 4 == 0)) {\n            ((u = Sw.tilledCells), (gs = Sw.scrapedCells), (d = SC.version));",
)
rep(
    """                let n =
                    Sw.data[(Math.floor(e * c) * Sw.n + Math.floor(t * c)) * 4],
                  r =
                    SC.data[
                      Math.floor((e + 0.5) * p) * SC.n +
                        Math.floor((t + 0.5) * p)
                    ],
                  i = (e * 256 + t) * 4,
                  a = r < -0.12,
                  o = r > 0.12;
                ((s.data[i] = a ? 38 : o ? 150 : 70),
                  (s.data[i + 1] = a ? 24 : o ? 112 : 44),
                  (s.data[i + 2] = a ? 14 : o ? 72 : 26),
                  (s.data[i + 3] = n > 100 || a || o ? 255 : 0));""",
    """                let mOff = (Math.floor(e * c) * Sw.n + Math.floor(t * c)) * 4,
                  n = Sw.data[mOff],
                  nb = Sw.data[mOff + 2],
                  r =
                    SC.data[
                      Math.floor((e + 0.5) * p) * SC.n +
                        Math.floor((t + 0.5) * p)
                    ],
                  i = (e * 256 + t) * 4,
                  a = r < -0.12,
                  o = r > 0.12,
                  gf = nb > 180;
                ((s.data[i] = gf ? 154 : a ? 38 : o ? 150 : 70),
                  (s.data[i + 1] = gf ? 152 : a ? 24 : o ? 112 : 44),
                  (s.data[i + 2] = gf ? 144 : a ? 14 : o ? 72 : 26),
                  (s.data[i + 3] = gf || n > 100 || a || o ? 255 : 0));""",
)
rep(
    "            jj = tkVeh === `jcb`,\n            r = jj ? JB : kk ? TK :",
    "            jj = tkVeh === `jcb`,\n            gg = tkVeh === `grader`,\n            r = gg ? GR : jj ? JB : kk ? TK :",
)
rep(
    "            jj ||\n              (l.save(),",
    "            gg ||\n              (l.save(),\n              l.translate(GR.x, GR.z),\n              l.rotate(-GR.yaw),\n              (l.fillStyle = `#f0ad18`),\n              l.fillRect(-3.2, -3, 6.4, 13),\n              l.strokeRect(-3.2, -3, 6.4, 13),\n              l.restore()),\n            jj ||\n              (l.save(),",
)

# Main loop bO(): update, exhaust smoke, scraping dust, cameras, HUD sync, IS.update, render primitives
rep("    jb = jbUse(),\n    co = coUse(),", "    jb = jbUse(),\n    gr = grUse(),\n    co = coUse(),")
rep(
    "        jbA = _.vehicle === `jcb`,\n        y = v || tkA || jbA || _.menu ? vO : mC();",
    "        jbA = _.vehicle === `jcb`,\n        grA = _.vehicle === `grader`,\n        y = v || tkA || jbA || grA || _.menu ? vO : mC();",
)
rep("jbA ? jbReset(JB) : Kw(ST)", "jbA ? jbReset(JB) : grA ? grReset(GR) : Kw(ST)")
rep("attachPressed: !v && !tkA && !jbA && rC.attachPressed,", "attachPressed: !v && !tkA && !jbA && !grA && rC.attachPressed,")
rep(
    "      coStep(g, v ? CT : tkA ? TK : jbA ? JB : ST.tr);",
    """      grStep(GR, grA && !_.menu ? grInput() : null, g, _.graderEngine);
      for (let ev of GR.events)
        ev.type === `crank`
          ? grA && IS.crank(`grader`)
          : ev.type === `bump`
            ? IS.thud(ev.strength / 3)
            : !grA
              ? 0
              : ev.type === `ripDown`
                ? (IS.clunk(0.5), nC(`Rear 5-shank ripper lowered`))
                : ev.type === `ripUp`
                  ? (IS.clunk(0.45), nC(`Rear ripper raised`))
                  : ev.type === `noHydraulics` &&
                    nC(`Start the grader engine first to move the blade (K)`);
      GR.events.length = 0;
      coStep(g, v ? CT : tkA ? TK : jbA ? JB : grA ? GR : ST.tr);""",
)
rep(
    "        C = v ? CT.x : tkA ? TK.x : jbA ? JB.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : jbA ? JB.z : x.z;",
    "        C = v ? CT.x : tkA ? TK.x : jbA ? JB.x : grA ? GR.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : jbA ? JB.z : grA ? GR.z : x.z;",
)
rep("v || tkA || jbA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,", "v || tkA || jbA || grA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,")
rep(
    "        jb.update(JB, _, h.t, g, jbA),\n        co.update(CO, h.night, h.t, g),",
    "        jb.update(JB, _, h.t, g, jbA),\n        gr.update(GR, _, h.t, g, grA),\n        co.update(CO, h.night, h.t, g),",
)
rep(
    "      if (CT.digging > 0.05 || CT.bladeWork > 0.05)",
    """      if (GR.running)
        for (
          h.grSmoke = (h.grSmoke || 0) + g * (3 + GR.eload * 20),
            gr.root.localToWorld(hO.copy(gr.exhaust));
          h.grSmoke > 1;
        ) {
          h.grSmoke--;
          let dk = GR.eload > 0.58;
          r.emit(hO.x, hO.y, hO.z, (Math.random() - 0.5) * 0.3, 1.45 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 1.8, 0.45, dk ? mO : pO, dk ? 0.48 : 0.22);
        }
      if (GR.bladeWork > 0.06)
        for (h.grDust = (h.grDust || 0) + g * 28 * GR.bladeWork; h.grDust > 1; ) {
          h.grDust--;
          r.emit(
            GR.castTip.x + (Math.random() - 0.5) * 0.7,
            GR.castTip.y + 0.16,
            GR.castTip.z + (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.5) * 0.7,
            0.4 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.7,
            2.1,
            1.15,
            fO,
            0.32,
          );
        }
      if (GR.ripping > 0.12)
        for (h.grRipDust = (h.grRipDust || 0) + g * 18 * GR.ripping; h.grRipDust > 1; ) {
          h.grRipDust--;
          let rx = GR.x + Math.sin(GR.yaw) * GRS.RIPPER_Z,
            rz = GR.z + Math.cos(GR.yaw) * GRS.RIPPER_Z;
          r.emit(rx + (Math.random() - 0.5) * 1.4, nw(rx, rz) + 0.15, rz + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.5, 0.35 + Math.random() * 0.4, (Math.random() - 0.5) * 0.5, 1.8, 1.0, fO, 0.28);
        }
      if (CT.digging > 0.05 || CT.bladeWork > 0.05)""",
)
rep(
    "            : jbA\n            ? hO.set(JB.x + Math.sin(JB.yaw) * 0.6, JB.y + 1.9, JB.z + Math.cos(JB.yaw) * 0.6)",
    "            : jbA\n            ? hO.set(JB.x + Math.sin(JB.yaw) * 0.6, JB.y + 1.9, JB.z + Math.cos(JB.yaw) * 0.6)\n            : grA\n            ? hO.set(GR.x + Math.sin(GR.yaw) * 1.5, GR.y + 2.05, GR.z + Math.cos(GR.yaw) * 1.5)",
)
rep(
    "      } else if (jbA && _.cam === 1) {",
    """      } else if (grA && _.cam === 1) {
        let gE = gr.root.localToWorld(gr.eye.clone());
        E.position.copy(gE);
        let gP0 = iC.pitch - 0.22,
          gDir = new G(
            Math.sin(iC.yaw) * Math.cos(gP0),
            Math.sin(gP0),
            Math.cos(iC.yaw) * Math.cos(gP0),
          ).applyQuaternion(gr.root.quaternion);
        (E.up.set(0, 1, 0), E.lookAt(gE.add(gDir)), (E.fov = iC.fov), (h.camInit = !1));
      } else if (grA && _.cam === 2) {
        let gP = gr.root.localToWorld(new G(5.4, 2.5, 1.1)),
          gL = gr.root.localToWorld(new G(0, 0.5, GRS.BLADE_Z));
        ((gP.y = Math.max(gP.y, nw(gP.x, gP.z) + 0.9)),
          E.position.lerp(gP, h.camInit ? EC(6, g) : 1),
          E.up.set(0, 1, 0),
          E.lookAt(gL),
          (E.fov = 58),
          (h.camInit = !0));
      } else if (grA) {
        let ga = GR.yaw + Math.PI + iC.yaw,
          gp = CC(0.28 + iC.pitch, -0.1, 1.3),
          gn = iC.dist,
          gC2 = new G(
            D.x + Math.sin(ga) * Math.cos(gp) * gn,
            D.y + Math.sin(gp) * gn,
            D.z + Math.cos(ga) * Math.cos(gp) * gn,
          );
        ((gC2.y = Math.max(gC2.y, nw(gC2.x, gC2.z) + 0.9)),
          h.camInit ? E.position.lerp(gC2, EC(5, g)) : E.position.copy(gC2),
          (h.camInit = !0),
          E.up.set(0, 1, 0),
          E.lookAt(D),
          (E.fov = 62));
      } else if (jbA && _.cam === 1) {""",
)
rep(
    "            speed: Math.abs(v ? CT.v : tkA ? TK.v : jbA ? JB.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : jbA ? JB.rpm : x.rpm,",
    "            speed: Math.abs(v ? CT.v : tkA ? TK.v : jbA ? JB.v : grA ? GR.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : jbA ? JB.rpm : grA ? GR.rpm : x.rpm,",
)
rep(
    "            running: v ? CT.running : tkA ? TK.running : jbA ? JB.running : x.running,",
    "            running: v ? CT.running : tkA ? TK.running : jbA ? JB.running : grA ? GR.running : x.running,",
)
rep(
    "            jDump: JB.lDump > 0.05 || JB.bDump > 0.1,\n          })),",
    "            jDump: JB.lDump > 0.05 || JB.bDump > 0.1,\n            grBlade: GR.bladeH,\n            grAngle: GR.bladeAng,\n            grRip: GR.ripper,\n            grRipCmd: GR.ripperCmd,\n            grWork: GR.bladeWork > 0.06,\n            grArea: GR.gradedM2,\n            grRev: GR.v < -0.3,\n          })),",
)
rep(
    "        jbA\n          ? IS.update({",
    """        grA
          ? IS.update({
              rpm: GR.rpm,
              load: GR.eload,
              running: GR.running,
              working: Math.min(1, Math.max(GR.bladeWork, GR.ripping * 0.8)),
              speed: Math.abs(GR.v),
              rough: 0.55,
              hydraulic: GR.hyd > 0.08 ? (GR.hydCmd >= 0 ? 1 : -1) : 0,
              vehicle: `grader`,
              cranking: GR.engine && !GR.running,
              reverse: GR.v < -0.3,
            })
          : jbA
          ? IS.update({""",
)
rep(
    "        (0, Z.jsx)(`primitive`, { object: co.root }),",
    "        (0, Z.jsx)(`primitive`, { object: gr.root }),\n        (0, Z.jsx)(`primitive`, { object: gr.zonesRoot }),\n        (0, Z.jsx)(`primitive`, { object: co.root }),",
)

# =====================================================================
# ---- Paving Silos + Vibratory Road Roller (Silindir) + Asphalt Paver (Finiser)
pvcore = open(os.path.join(SRC, "paving-core.js")).read()
pvrender = open(os.path.join(SRC, "paving-render.js")).read()
rlcore = open(os.path.join(SRC, "roller-core.js")).read()
rlrender = open(os.path.join(SRC, "roller-render.js")).read()
rlui = open(os.path.join(SRC, "roller-ui.js")).read()
pvcarcore = open(os.path.join(SRC, "paver-core.js")).read()
pvcarrender = open(os.path.join(SRC, "paver-render.js")).read()
pvcarui = open(os.path.join(SRC, "paver-ui.js")).read()

pvprog_ui = """
function PVProgress() {
  let zones = tC((e) => e.pvZones) || [],
    [open, setOpen] = (0, y.useState)(!1),
    [sel, setSel] = (0, y.useState)(0);
  if (!zones.length) return null;
  let z = zones[sel] ?? zones[0],
    pct = Math.round((z.scrape + z.gravel + z.gComp + z.asphalt + z.aComp) / 5),
    steps = [
      [`1. Zemin Kazıma (Greyder)`, z.scrape],
      [`2. Çakıl Serimi (Kamyon/Greyder)`, z.gravel],
      [`3. Çakıl Sıkıştırma (Silindir)`, z.gComp],
      [`4. Asfalt Serimi (Finişer)`, z.asphalt],
      [`5. Asfalt Sıkıştırma (Silindir)`, z.aComp],
    ];
  return (0, Z.jsxs)(`div`, {
    className: `hud-panel`,
    style: { marginTop: 8, width: 210, padding: `8px 10px`, fontSize: 12 },
    children: [
      (0, Z.jsxs)(`button`, {
        type: `button`,
        onClick: () => setOpen((o) => !o),
        style: {
          width: `100%`,
          display: `flex`,
          justifyContent: `space-between`,
          alignItems: `center`,
          fontWeight: 700,
          color: `var(--harvest)`,
          cursor: `pointer`,
        },
        children: [
          (0, Z.jsx)(`span`, { children: `Yol Asfaltlama (${pct}%)` }),
          (0, Z.jsx)(`span`, { children: open ? `▾` : `▸` }),
        ],
      }),
      open &&
        (0, Z.jsxs)(`div`, {
          style: { marginTop: 6, display: `flex`, flexDirection: `column`, gap: 5 },
          children: [
            (0, Z.jsx)(`div`, {
              style: { display: `flex`, gap: 4 },
              children: zones.map((zn, idx) =>
                (0, Z.jsx)(
                  `button`,
                  {
                    type: `button`,
                    onClick: () => setSel(idx),
                    style: {
                      flex: 1,
                      padding: `2px 4px`,
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: `pointer`,
                      background: idx === sel ? `var(--harvest)` : `rgba(255,255,255,0.08)`,
                      color: idx === sel ? `var(--harvest-foreground)` : `var(--hud-muted)`,
                    },
                    children: idx === 0 ? `Ana Yol` : idx === 1 ? `Doğu` : `Geçiş`,
                  },
                  zn.id,
                ),
              ),
            }),
            steps.map(([label, val]) =>
              (0, Z.jsxs)(
                `div`,
                {
                  style: { display: `flex`, flexDirection: `column`, gap: 2 },
                  children: [
                    (0, Z.jsxs)(`div`, {
                      style: { display: `flex`, justifyContent: `space-between`, fontSize: 11 },
                      children: [
                        (0, Z.jsx)(`span`, { style: { color: val >= 75 ? `#4ade80` : `var(--hud-foreground)` }, children: label }),
                        (0, Z.jsx)(`b`, { children: `${val}%` }),
                      ],
                    }),
                    (0, Z.jsx)(`div`, {
                      className: `hud-meter`,
                      style: { height: 4 },
                      children: (0, Z.jsx)(`div`, { style: { width: `${val}%` } }),
                    }),
                  ],
                },
                label,
              ),
            ),
          ],
        }),
    ],
  });
}
"""

# URL params, store defaults, cameras, ignition & keys
rep(
    "({ kepce: `excavator`, kamyon: `truck`, jcb: `jcb`, beko: `jcb`, greyder: `grader`, grader: `grader` })",
    "({ kepce: `excavator`, kamyon: `truck`, jcb: `jcb`, beko: `jcb`, greyder: `grader`, grader: `grader`, silindir: `roller`, roller: `roller`, finiser: `paver`, paver: `paver` })",
)
rep(
    "    graderEngine: !0,\n",
    "    graderEngine: !0,\n    rollerEngine: !0,\n    paverEngine: !0,\n",
)
rep(
    "    grRev: !1,\n  })),\n  nC =",
    "    grRev: !1,\n    rlVibe: !0,\n    rlWater: !0,\n    rlWork: !1,\n    rlSteam: !1,\n    rlArea: 0,\n    rlRev: !1,\n    pvLoad: 0,\n    pvScreed: 1,\n    pvScreedDown: !0,\n    pvWork: !1,\n    pvArea: 0,\n    pvRev: !1,\n    tMat: `soil`,\n    pvNearSilo: null,\n    pvFilling: null,\n    pvFillAuto: !0,\n    pvZones: [],\n  })),\n  nC =",
)
rep("t === `jcb` ? 0.1 : t === `grader` ? 0.08 : 0", "t === `jcb` ? 0.1 : t === `grader` ? 0.08 : t === `roller` ? 0.1 : t === `paver` ? 0.12 : 0")
rep("t === `jcb` ? 12.5 : t === `grader` ? 14.5 : 11", "t === `jcb` ? 12.5 : t === `grader` ? 14.5 : t === `roller` ? 11.5 : t === `paver` ? 12.0 : 11")
rep(
    ": t === `grader` ? { graderEngine: !0 } : {})",
    ": t === `grader` ? { graderEngine: !0 } : t === `roller` ? { rollerEngine: !0 } : t === `paver` ? { paverEngine: !0 } : {})",
)
rep(
    ": e === `grader` ? { graderEngine: !0 } : {}),",
    ": e === `grader` ? { graderEngine: !0 } : e === `roller` ? { rollerEngine: !0 } : e === `paver` ? { paverEngine: !0 } : {}),",
)
rep(
    "          : e.vehicle === `grader`\n            ? `graderEngine`\n            : `engine`,",
    "          : e.vehicle === `grader`\n            ? `graderEngine`\n            : e.vehicle === `roller`\n              ? `rollerEngine`\n              : e.vehicle === `paver`\n                ? `paverEngine`\n                : `engine`,",
)
rep(
    "        case `KeyG`:\n          t.vehicle === `grader` ? grRipperToggle() : n && t.flip(`bladeDown`);\n          break;",
    """        case `KeyG`:
          t.vehicle === `grader`
            ? grRipperToggle()
            : t.vehicle === `roller`
              ? rlVibeToggle()
              : t.vehicle === `paver`
                ? pvScreedToggle()
                : t.vehicle === `truck`
                  ? pvToggleFill()
                  : n && t.flip(`bladeDown`);
          break;
        case `KeyU`:
          t.vehicle === `roller` && rlWaterToggle();
          break;""",
)

# Collisions, trees, silo pads, clod colors, direct paver hopper catch & surface deposit
rep(
    "  GRC = [0, 1, 2, 3].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  Qw = [dw, uw, TKC, JBC, COC, GRC];",
    "  GRC = [0, 1, 2, 3].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.2 })),\n  RLC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.18 })),\n  PVC = [0, 1, 2].map(() => ({ k: `c`, x: 1e9, z: 1e9, r: 1.22 })),\n  Qw = [dw, uw, TKC, JBC, COC, GRC, RLC, PVC];",
)
rep(
    "Q.BODY_R, GRC) ||\n        c));",
    "Q.BODY_R, GRC) ||\n        c),\n      (c =\n        hT(e, e.x + Math.sin(e.yaw) * t, e.z + Math.cos(e.yaw) * t, Q.BODY_R, RLC) ||\n        c),\n      (c =\n        hT(e, e.x + Math.sin(e.yaw) * t, e.z + Math.cos(e.yaw) * t, Q.BODY_R, PVC) ||\n        c));",
)
rep("coNoTree(e, t))", "coNoTree(e, t) ||\n      pvNoTree(e, t))")
rep("coNoDig(e, t)\n  )", "coNoDig(e, t) ||\n    pvInSiloPad(e, t)\n  )")

# Per-material clods (brown soil, crushed grey gravel, black hot-mix asphalt)
rep("    clod: new Cl({ color: `#5e432d`, roughness: 1, flatShading: !0 }),", "    clod: new Cl({ color: `#ffffff`, roughness: 1, flatShading: !0 }),")
rep(
    "  coMoonDir = new G(-0.4, 0.8, 0.3).normalize();\nfunction bO()",
    "  coMoonDir = new G(-0.4, 0.8, 0.3).normalize(),\n  pvColSoil = new q(`#5e432d`),\n  pvColGravel = new q(`#9ea2a6`),\n  pvColAsphalt = new q(`#202226`);\nfunction bO()",
)
rep(
    "    let I = new _o(new Zc(1, 0), e.clod, 260);\n    ((I.castShadow = !0), (I.frustumCulled = !1), (I.count = 0));",
    "    let I = new _o(new Zc(1, 0), e.clod, 260);\n    ((I.castShadow = !0), (I.frustumCulled = !1), I.setColorAt(0, new q(`#5e432d`)), (I.count = 0));",
)
rep(
    "            I.setMatrixAt(e, te));\n        }\n        I.instanceMatrix.needsUpdate = !0;",
    "            I.setMatrixAt(e, te),\n            I.setColorAt(e, t.mat === `gravel` ? pvColGravel : t.mat === `asphalt` ? pvColAsphalt : pvColSoil));\n        }\n        I.instanceMatrix.needsUpdate = !0;\n        if (I.instanceColor) I.instanceColor.needsUpdate = !0;",
)
rep(
    "    if (tkCatch(n)) {\n      ((e.clods[t] = e.clods[e.clods.length - 1]), e.clods.pop());\n      continue;\n    }",
    "    if (tkCatch(n) || pvCatch(n)) {\n      ((e.clods[t] = e.clods[e.clods.length - 1]), e.clods.pop());\n      continue;\n    }",
)
rep(
    "    n.y <= r &&\n      (SC.deposit(n.x, n.z, n.vol, 0.42),",
    "    n.y <= r &&\n      (pvClodLanded(n),\n      SC.deposit(n.x, n.z, n.vol, 0.42),",
)

# Grass blades cleared wherever gravel or asphalt is laid
rep(
    "          uMask: { value: ww() },\n          uDig: { value: Pw() },",
    "          uMask: { value: ww() },\n          uRoadSurf: { value: pvRoadTex() },\n          uDig: { value: Pw() },",
)
rep(
    "uniform sampler2D uHeight; uniform sampler2D uDensity; uniform sampler2D uMask;",
    "uniform sampler2D uHeight; uniform sampler2D uDensity; uniform sampler2D uMask; uniform sampler2D uRoadSurf;",
)
rep(
    "vec4 mk = texture(uMask, maskUv(wp));\nfloat dc = length(wp - uCenter) / (uTile * 0.5);\nfloat dgv = digAt(wp);\nfloat keep = step(aOff.z, dn * 0.98) * (1.0 - smoothstep(0.25, 0.45, mk.r)) * (1.0 - smoothstep(0.22, 0.52, mk.b)) * (1.0 - smoothstep(0.72, 1.0, dc)) * (1.0 - smoothstep(0.025, 0.07, abs(dgv)));",
    "vec4 mk = texture(uMask, maskUv(wp));\nvec4 mrs = texture(uRoadSurf, maskUv(wp));\nfloat dc = length(wp - uCenter) / (uTile * 0.5);\nfloat dgv = digAt(wp);\nfloat keep = step(aOff.z, dn * 0.98) * (1.0 - smoothstep(0.25, 0.45, mk.r)) * (1.0 - smoothstep(0.22, 0.52, mk.b)) * (1.0 - smoothstep(0.18, 0.45, max(mrs.r, mrs.g))) * (1.0 - smoothstep(0.72, 1.0, dc)) * (1.0 - smoothstep(0.025, 0.07, abs(dgv)));",
)

# Terrain shader XE: silo concrete aprons + live crushed gravel, loose/spread aggregate, fresh hot-mix & compacted asphalt + lane markings
rep(
    "      uCompDrive: { value: new rr(-78.5, -24.0, -68.5, -8.5) },",
    """      uCompDrive: { value: new rr(-78.5, -24.0, -68.5, -8.5) },
      uRoadSurf: { value: pvRoadTex() },
      uGravelPad: { value: new rr(PV_SILOS[0].pad.x0, PV_SILOS[0].pad.z0, PV_SILOS[0].pad.x1, PV_SILOS[0].pad.z1) },
      uAsphaltPad: { value: new rr(PV_SILOS[1].pad.x0, PV_SILOS[1].pad.z0, PV_SILOS[1].pad.x1, PV_SILOS[1].pad.z1) },""",
)
rep(
    "uniform vec4 uCompDrive;",
    "uniform vec4 uCompDrive;\nuniform sampler2D uRoadSurf;\nuniform vec4 uGravelPad;\nuniform vec4 uAsphaltPad;",
)
rep(
    """  vec2 dap = max(uCompApron.xy - P, P - uCompApron.zw);
  float wCA = 1.0 - smoothstep(-0.18, 0.18, max(dap.x, dap.y));
  BLEND(wCA, 7.0, 3.6, 0.84, vec3(0.98, 0.96, 0.92))
}""",
    """  vec2 dap = max(uCompApron.xy - P, P - uCompApron.zw);
  float wCA = 1.0 - smoothstep(-0.18, 0.18, max(dap.x, dap.y));
  BLEND(wCA, 7.0, 3.6, 0.84, vec3(0.98, 0.96, 0.92))
  vec2 dgp = max(uGravelPad.xy - P, P - uGravelPad.zw);
  float wGP = 1.0 - smoothstep(-0.22, 0.22, max(dgp.x, dgp.y));
  BLEND(wGP, 7.0, 3.8, 0.84, vec3(0.92, 0.91, 0.88))
  vec2 dapp = max(uAsphaltPad.xy - P, P - uAsphaltPad.zw);
  float wAP = 1.0 - smoothstep(-0.22, 0.22, max(dapp.x, dapp.y));
  BLEND(wAP, 7.0, 3.8, 0.82, vec3(0.84, 0.84, 0.86))
}""",
)
rep(
    "diffuseColor.rgb *= tC;",
    """// Live Roadwork Simulation Layers: Crushed Gravel (mr.r), Fresh/Compacted Asphalt (mr.g) & Compaction (mr.b)
{
  vec4 mr = texture(uRoadSurf, P / uMapSize + 0.5);
  float wGrv = smoothstep(0.14, 0.55, mr.r) * (1.0 - smoothstep(0.18, 0.52, mr.g));
  float wAsp = smoothstep(0.18, 0.55, mr.g);
  if (wGrv > 0.003) {
    float compG = smoothstep(0.35, 0.78, mr.b);
    float stone = 0.84 + 0.32 * tNoise(P * 3.8 + tNoise(P * 1.6));
    vec2 uvg = P / 1.85;
    vec3 cGrvLoose = sD(7.0, uvg, kAT) * vec3(0.76, 0.76, 0.74) * stone;
    vec3 cGrvComp = sD(7.0, P / 2.2, kAT) * vec3(0.58, 0.59, 0.58) * (0.94 + 0.12 * tNoise(P * 2.9));
    vec3 cGrv = mix(cGrvLoose, cGrvComp, compG);
    tC = mix(tC, cGrv, wGrv);
    tN = mix(tN, sN(5.0, uvg) * mix(0.85, 0.3, compG), wGrv * 0.75);
    tR = mix(tR, mix(0.95, 0.78, compG), wGrv);
  }
  if (wAsp > 0.003) {
    float compA = smoothstep(0.42, 0.85, mr.b);
    float gran = 0.9 + 0.2 * tNoise(P * 4.5);
    vec2 uva = P / 4.2;
    vec3 cHot = sD(4.0, uva, kAT) * vec3(0.24, 0.23, 0.23) * gran;
    vec3 cComp = sD(4.0, P / 4.8, kAT) * vec3(0.36, 0.37, 0.40);
    vec3 cAsp = mix(cHot, cComp, compA);
    tC = mix(tC, cAsp, wAsp);
    tN = mix(tN, sN(4.0, uva) * mix(0.75, 0.22, compA), wAsp * 0.8);
    tR = mix(tR, mix(0.92, 0.48, compA), wAsp);
    float freshStripe = paint * wAsp * smoothstep(0.65, 0.88, mr.b);
    tC = mix(tC, vec3(0.88, 0.88, 0.84), freshStripe);
    tR = mix(tR, 0.52, freshStripe);
  }
}
diffuseColor.rgb *= tC;""",
)

# Inject paving/roller/paver modules
rep("function mw(e, t, n) {", pvcore + "\nfunction mw(e, t, n) {")
rep("\nvar ST = Gw(Sw),", "\n" + rlcore + "\n" + pvcarcore + "\nvar ST = Gw(Sw),")
rep("\nvar nD = (e, t, n) => new G(e, t, n),", "\n" + pvrender + "\n" + rlrender + "\n" + pvcarrender + "\nvar nD = (e, t, n) => new G(e, t, n),")
rep("\nfunction qD() {", "\n" + rlui + "\n" + pvcarui + "\n" + pvprog_ui + "\nfunction qD() {")

# Audio banks for Roller & Paver
rep(
    """    grader: {
      idle: `truck_idle.wav`,
      load: `truck_load.wav`,
      crank: `truck_crank.wav`,
      baseRpm: 720,
      trim: 0.82,
      crankGain: 0.95,
      filterBase: 760,
      filterRpm: 1.28,
      filterLoad: 1550,
      subMul: 0.32,
    },""",
    """    grader: {
      idle: `truck_idle.wav`,
      load: `truck_load.wav`,
      crank: `truck_crank.wav`,
      baseRpm: 720,
      trim: 0.82,
      crankGain: 0.95,
      filterBase: 760,
      filterRpm: 1.28,
      filterLoad: 1550,
      subMul: 0.32,
    },
    roller: {
      idle: `truck_idle.wav`,
      load: `truck_load.wav`,
      crank: `truck_crank.wav`,
      baseRpm: 780,
      trim: 0.78,
      crankGain: 0.92,
      filterBase: 790,
      filterRpm: 1.3,
      filterLoad: 1500,
      subMul: 0.3,
    },
    paver: {
      idle: `engine_idle.wav`,
      load: `engine_load.wav`,
      crank: null,
      baseRpm: 840,
      trim: 0.88,
      crankGain: 0.85,
      filterBase: 860,
      filterRpm: 1.32,
      filterLoad: 1550,
      subMul: 0.28,
    },""",
)
rep(
    "veh === `jcb` || veh === `grader`\n                ? 0.065",
    "veh === `jcb` || veh === `grader` || veh === `roller` || veh === `paver`\n                ? 0.065",
)
rep(
    "(veh === `truck` || veh === `jcb` || veh === `grader`) &&",
    "(veh === `truck` || veh === `jcb` || veh === `grader` || veh === `roller` || veh === `paver`) &&",
)
rep(
    "!v && !tkA && !jbA && !grA && IS.crank(`tractor`)",
    "!v && !tkA && !jbA && !grA && !rlA && !pvA && IS.crank(`tractor`)",
)

# HUD bar, prompts, help, layout, PVProgress, menu
rep(
    "    gr = e.vehicle === `grader`,\n    n = t || jb || gr\n      ? [`Chase`, `Cab`, `Side`]",
    "    gr = e.vehicle === `grader`,\n    rl = e.vehicle === `roller`,\n    pv = e.vehicle === `paver`,\n    n = t || jb || gr\n      ? [`Chase`, `Cab`, `Side`]\n      : rl\n        ? [`Chase`, `Cab`, `Drum`]\n        : pv\n          ? [`Chase`, `Ops`, `Screed`]",
)
rep(
    "on: t ? e.excEngine : k ? e.truckEngine : jb ? e.jcbEngine : gr ? e.graderEngine : e.engine,",
    "on: t ? e.excEngine : k ? e.truckEngine : jb ? e.jcbEngine : gr ? e.graderEngine : rl ? e.rollerEngine : pv ? e.paverEngine : e.engine,",
)
rep(
    "      !t &&\n        !k &&\n        !jb &&\n        !gr &&\n        (0, Z.jsx)(XD, {",
    "      !t &&\n        !k &&\n        !jb &&\n        !gr &&\n        !rl &&\n        !pv &&\n        (0, Z.jsx)(XD, {",
)
rep(
    "    gr = eC((e) => e.vehicle === `grader`),\n    [n, r] = (0, y.useState)(Date.now());",
    "    gr = eC((e) => e.vehicle === `grader`),\n    rl = eC((e) => e.vehicle === `roller`),\n    pv = eC((e) => e.vehicle === `paver`),\n    [n, r] = (0, y.useState)(Date.now());",
)
rep(
    "      : gr\n        ? (i = grPrompt(e))",
    "      : pv\n        ? (i = pvPrompt(e))\n        : rl\n          ? (i = rlPrompt(e))\n          : gr\n            ? (i = grPrompt(e))",
)
rep(
    "    gr = eC.getState().vehicle === `grader`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
    "    gr = eC.getState().vehicle === `grader`,\n    rl = eC.getState().vehicle === `roller`,\n    pv = eC.getState().vehicle === `paver`;\n  return (0, Z.jsxs)(`div`, {\n    className: `hud-panel hud-help`,",
)
rep(
    "        children: gr\n          ? `Motor grader controls`",
    "        children: pv\n          ? `Asphalt paver controls`\n          : rl\n            ? `Vibratory road roller controls`\n            : gr\n              ? `Motor grader controls`",
)
rep(
    "      (gr\n        ? GRhelp",
    "      (pv\n        ? PVhelp\n        : rl\n          ? RLhelp\n          : gr\n            ? GRhelp",
)
rep(
    "    gr = tkVeh === `grader`;\n",
    "    gr = tkVeh === `grader`,\n    rl = tkVeh === `roller`,\n    pv = tkVeh === `paver`;\n",
)
rep(
    "        children: gr\n          ? (0, Z.jsx)(grGauges, {})",
    "        children: pv\n          ? [(0, Z.jsx)(pvGauges, {}), (0, Z.jsx)(PVProgress, {})]\n          : rl\n            ? [(0, Z.jsx)(rlGauges, {}), (0, Z.jsx)(PVProgress, {})]\n            : gr\n              ? [(0, Z.jsx)(grGauges, {}), (0, Z.jsx)(PVProgress, {})]",
)
rep(
    "          : k\n          ? (0, Z.jsx)(tkGauges, {})",
    "          : k\n          ? [(0, Z.jsx)(tkGauges, {}), (0, Z.jsx)(PVProgress, {})]",
)
rep(
    "        children: gr\n          ? (0, Z.jsx)(grControls, {})",
    "        children: pv\n          ? (0, Z.jsx)(pvControls, {})\n          : rl\n            ? (0, Z.jsx)(rlControls, {})\n            : gr\n              ? (0, Z.jsx)(grControls, {})",
)
rep(
    "          (0, Z.jsxs)(`div`, {\n            className: `menu-buttons`,",
    "          (0, Z.jsxs)(`div`, {\n            className: `menu-buttons`,\n            style: { display: `grid`, gridTemplateColumns: `repeat(2, minmax(0, 1fr))`, maxWidth: 460, gap: 8 },",
)
rep(
    "                  ` Play Grader`,\n                ],\n              }),\n",
    "                  ` Play Grader`,\n                ],\n              }),\n"
    "              (0, Z.jsxs)(`button`, {\n                type: `button`,\n                className: `menu-btn`,\n                onClick: () => lO(`roller`),\n                children: [\n                  (0, Z.jsx)(RLD, { size: 20, \"aria-hidden\": !0 }),\n                  ` Play Road Roller`,\n                ],\n              }),\n"
    "              (0, Z.jsxs)(`button`, {\n                type: `button`,\n                className: `menu-btn`,\n                onClick: () => lO(`paver`),\n                children: [\n                  (0, Z.jsx)(PVD, { size: 20, \"aria-hidden\": !0 }),\n                  ` Play Asphalt Paver`,\n                ],\n              }),\n",
)
rep("tractor, excavator, dump truck, JCB and grader…", "tractor, excavator, dump truck, JCB, grader, roller and paver…")

# Minimap: Silos + live RS_MASK layers + Roller/Paver markers
rep(
    "        n.restore(),\n        (n.fillStyle = `#b5462e`));",
    """        n.restore(),
        PV_SILOS.forEach((s) => {
          n.save();
          n.fillStyle = s.id === `gravel` ? `#8e9194` : `#2b2e33`;
          n.strokeStyle = s.id === `gravel` ? `#f2b318` : `#ff6b1a`;
          n.lineWidth = 1.6 * r;
          n.fillRect(i(s.x - 4), i(s.z - 4), 8 * r, 8 * r);
          n.strokeRect(i(s.x - 4), i(s.z - 4), 8 * r, 8 * r);
          n.fillStyle = `#ffffff`;
          n.font = `700 ${Math.max(7, Math.round(6 * r))}px sans-serif`;
          n.textAlign = `center`;
          n.textBaseline = `middle`;
          n.fillText(s.id === `gravel` ? `Ç` : `A`, i(s.x), i(s.z));
          n.restore();
        }),
        (n.fillStyle = `#b5462e`));""",
)
rep(
    "        gs = -1,\n        d = -1,",
    "        gs = -1,\n        rv = -1,\n        d = -1,\n        rc = RS_MASK.n / 256,",
)
rep(
    "(Sw.tilledCells !== u || Sw.scrapedCells !== gs || SC.version !== d) && f % 4 == 0)) {\n            ((u = Sw.tilledCells), (gs = Sw.scrapedCells), (d = SC.version));",
    "(Sw.tilledCells !== u || Sw.scrapedCells !== gs || RS_MASK.version !== rv || SC.version !== d) && f % 4 == 0)) {\n            ((u = Sw.tilledCells), (gs = Sw.scrapedCells), (rv = RS_MASK.version), (d = SC.version));",
)
rep(
    """                ((s.data[i] = gf ? 154 : a ? 38 : o ? 150 : 70),
                  (s.data[i + 1] = gf ? 152 : a ? 24 : o ? 112 : 44),
                  (s.data[i + 2] = gf ? 144 : a ? 14 : o ? 72 : 26),
                  (s.data[i + 3] = gf || n > 100 || a || o ? 255 : 0));""",
    """                let rOff = (Math.floor(e * rc) * RS_MASK.n + Math.floor(t * rc)) * 4,
                  rg = RS_MASK.data[rOff],
                  ra = RS_MASK.data[rOff + 1],
                  rb = RS_MASK.data[rOff + 2],
                  hasAsp = ra > 100,
                  hasGrv = rg > 100 && !hasAsp;
                ((s.data[i] = hasAsp ? (rb > 170 ? 28 : 54) : hasGrv ? 168 : gf ? 154 : a ? 38 : o ? 150 : 70),
                  (s.data[i + 1] = hasAsp ? (rb > 170 ? 31 : 54) : hasGrv ? 170 : gf ? 152 : a ? 24 : o ? 112 : 44),
                  (s.data[i + 2] = hasAsp ? (rb > 170 ? 36 : 58) : hasGrv ? 166 : gf ? 144 : a ? 14 : o ? 72 : 26),
                  (s.data[i + 3] = hasAsp || hasGrv || gf || n > 100 || a || o ? 255 : 0));""",
)
rep(
    "            gg = tkVeh === `grader`,\n            r = gg ? GR : jj ? JB : kk ? TK :",
    "            gg = tkVeh === `grader`,\n            rlv = tkVeh === `roller`,\n            pvv = tkVeh === `paver`,\n            r = pvv ? PV : rlv ? RL : gg ? GR : jj ? JB : kk ? TK :",
)
rep(
    "            gg ||\n              (l.save(),",
    "            rlv ||\n              (l.save(),\n              l.translate(RL.x, RL.z),\n              l.rotate(-RL.yaw),\n              (l.fillStyle = `#e6a817`),\n              l.fillRect(-3.4, -2, 6.8, 9),\n              l.strokeRect(-3.4, -2, 6.8, 9),\n              l.restore()),\n            pvv ||\n              (l.save(),\n              l.translate(PV.x, PV.z),\n              l.rotate(-PV.yaw),\n              (l.fillStyle = `#e86c16`),\n              l.fillRect(-3.8, -3, 7.6, 8.5),\n              l.strokeRect(-3.8, -3, 7.6, 8.5),\n              l.restore()),\n            gg ||\n              (l.save(),",
)

# Main loop bO(): plants, roller, paver, exhaust/steam, cameras, HUD state, IS audio, render primitives
rep(
    "    gr = grUse(),\n    co = coUse(),",
    "    gr = grUse(),\n    rl = rlUse(),\n    pv = pvUseCar(),\n    plants = pvUsePlants(),\n    co = coUse(),",
)
rep(
    "        grA = _.vehicle === `grader`,\n        y = v || tkA || jbA || grA || _.menu ? vO : mC();",
    "        grA = _.vehicle === `grader`,\n        rlA = _.vehicle === `roller`,\n        pvA = _.vehicle === `paver`,\n        y = v || tkA || jbA || grA || rlA || pvA || _.menu ? vO : mC();",
)
rep("grA ? grReset(GR) : Kw(ST)", "grA ? grReset(GR) : rlA ? rlReset(RL) : pvA ? pvReset(PV) : Kw(ST)")
rep("attachPressed: !v && !tkA && !jbA && !grA && rC.attachPressed,", "attachPressed: !v && !tkA && !jbA && !grA && !rlA && !pvA && rC.attachPressed,")
rep(
    "      coStep(g, v ? CT : tkA ? TK : jbA ? JB : grA ? GR : ST.tr);",
    """      pvSiloStep(g);
      rlStep(RL, rlA && !_.menu ? rlInput() : null, g, _.rollerEngine);
      for (let ev of RL.events)
        ev.type === `crank`
          ? rlA && IS.crank(`roller`)
          : ev.type === `bump`
            ? IS.thud(ev.strength / 3)
            : !rlA
              ? 0
              : ev.type === `vibeOn`
                ? (IS.clunk(0.55), nC(`Vibratory drum ON (34 Hz) — rolling compacts gravel & asphalt`))
                : ev.type === `vibeOff`
                  ? (IS.clunk(0.4), nC(`Drum vibration OFF — static finish roll`))
                  : ev.type === `waterOn`
                    ? nC(`Water spray mist ON (prevents hot asphalt sticking)`)
                    : ev.type === `waterOff` && nC(`Water spray OFF`);
      RL.events.length = 0;
      pvCarStep(PV, pvA && !_.menu ? pvInput() : null, g, _.paverEngine);
      for (let ev of PV.events)
        ev.type === `crank`
          ? pvA && IS.crank(`paver`)
          : ev.type === `bump`
            ? IS.thud(ev.strength / 3)
            : !pvA
              ? 0
              : ev.type === `screedDown`
                ? (IS.clunk(0.5), nC(`Heated screed lowered — drive forward (W) to lay 3.8m asphalt`))
                : ev.type === `screedUp` && (IS.clunk(0.45), nC(`Screed lifted for transport`));
      PV.events.length = 0;
      coStep(g, v ? CT : tkA ? TK : jbA ? JB : grA ? GR : rlA ? RL : pvA ? PV : ST.tr);""",
)
rep(
    "        C = v ? CT.x : tkA ? TK.x : jbA ? JB.x : grA ? GR.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : jbA ? JB.z : grA ? GR.z : x.z;",
    "        C = v ? CT.x : tkA ? TK.x : jbA ? JB.x : grA ? GR.x : rlA ? RL.x : pvA ? PV.x : x.x,\n        w = v ? CT.z : tkA ? TK.z : jbA ? JB.z : grA ? GR.z : rlA ? RL.z : pvA ? PV.z : x.z;",
)
rep("v || tkA || jbA || grA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,", "v || tkA || jbA || grA || rlA || pvA ? { ..._, head: !1, work: !1, beacon: !1, hood: !1 } : _,")
rep(
    "        gr.update(GR, _, h.t, g, grA),\n        co.update(CO, h.night, h.t, g),",
    "        gr.update(GR, _, h.t, g, grA),\n        rl.update(RL, _, h.t, g, rlA),\n        pv.update(PV, _, h.t, g, pvA),\n        plants.update(PV_STATE, h.night, h.t, g),\n        co.update(CO, h.night, h.t, g),",
)
rep(
    "        h.maskT > 0.12 && ((h.maskT = 0), Tw()));",
    "        h.maskT > 0.12 && ((h.maskT = 0), Tw(), pvFlushTex()));",
)
rep(
    "      if (CT.digging > 0.05 || CT.bladeWork > 0.05)",
    """      if (RL.running)
        for (
          h.rlSmoke = (h.rlSmoke || 0) + g * (3 + RL.eload * 18),
            rl.root.localToWorld(hO.copy(rl.exhaust));
          h.rlSmoke > 1;
        ) {
          h.rlSmoke--;
          let dk = RL.eload > 0.6;
          r.emit(hO.x, hO.y, hO.z, (Math.random() - 0.5) * 0.25, 1.35 + Math.random() * 0.45, (Math.random() - 0.5) * 0.25, 1.6, 0.4, dk ? mO : pO, dk ? 0.45 : 0.2);
        }
      if (RL.steaming > 0.15)
        for (h.rlSteam = (h.rlSteam || 0) + g * 20 * RL.steaming; h.rlSteam > 1; ) {
          h.rlSteam--;
          r.emit(
            RL.drumTip.x + (Math.random() - 0.5) * 1.6,
            RL.drumTip.y + 0.18,
            RL.drumTip.z + (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            0.7 + Math.random() * 0.6,
            (Math.random() - 0.5) * 0.4,
            1.6,
            0.9,
            pO,
            0.22,
          );
        }
      if (PV.running)
        for (
          h.pvSmoke = (h.pvSmoke || 0) + g * (3 + PV.eload * 18),
            pv.root.localToWorld(hO.copy(pv.exhaust));
          h.pvSmoke > 1;
        ) {
          h.pvSmoke--;
          let dk = PV.eload > 0.6;
          r.emit(hO.x, hO.y, hO.z, (Math.random() - 0.5) * 0.25, 1.35 + Math.random() * 0.4, (Math.random() - 0.5) * 0.25, 1.5, 0.38, dk ? mO : pO, dk ? 0.45 : 0.2);
        }
      if (PV.paving > 0.15)
        for (
          h.pvSteam = (h.pvSteam || 0) + g * 18 * PV.paving,
            pv.root.localToWorld(hO.copy(pv.screedTip));
          h.pvSteam > 1;
        ) {
          h.pvSteam--;
          r.emit(
            hO.x + (Math.random() - 0.5) * 2.8,
            hO.y + 0.14,
            hO.z + (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.35,
            0.75 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.35,
            1.8,
            0.95,
            pO,
            0.24,
          );
        }
      for (h.aspStack = (h.aspStack || 0) + g * 3.5; h.aspStack > 1; ) {
        h.aspStack--;
        r.emit(plants.stackTip.x + (Math.random() - 0.5) * 0.3, plants.stackTip.y, plants.stackTip.z + (Math.random() - 0.5) * 0.3, 0.3, 1.8 + Math.random() * 0.6, 0.2, 2.8, 1.4, pO, 0.18);
      }
      if (CT.digging > 0.05 || CT.bladeWork > 0.05)""",
)
rep(
    "            : grA\n            ? hO.set(GR.x + Math.sin(GR.yaw) * 1.5, GR.y + 2.05, GR.z + Math.cos(GR.yaw) * 1.5)",
    "            : grA\n            ? hO.set(GR.x + Math.sin(GR.yaw) * 1.5, GR.y + 2.05, GR.z + Math.cos(GR.yaw) * 1.5)\n            : rlA\n            ? hO.set(RL.x + Math.sin(RL.yaw) * 1.3, RL.y + 1.85, RL.z + Math.cos(RL.yaw) * 1.3)\n            : pvA\n            ? hO.set(PV.x + Math.sin(PV.yaw) * 0.3, PV.y + 1.8, PV.z + Math.cos(PV.yaw) * 0.3)",
)
rep(
    "      } else if (jbA && _.cam === 1) {",
    """      } else if (rlA && _.cam === 1) {
        let rE = rl.root.localToWorld(rl.eye.clone());
        E.position.copy(rE);
        let rP0 = iC.pitch - 0.16,
          rDir = new G(
            Math.sin(iC.yaw) * Math.cos(rP0),
            Math.sin(rP0),
            Math.cos(iC.yaw) * Math.cos(rP0),
          ).applyQuaternion(rl.root.quaternion);
        (E.up.set(0, 1, 0), E.lookAt(rE.add(rDir)), (E.fov = iC.fov), (h.camInit = !1));
      } else if (rlA && _.cam === 2) {
        let rP = rl.root.localToWorld(new G(4.4, 2.2, 2.8)),
          rL = rl.root.localToWorld(new G(0, 0.55, RLS.DRUM_Z));
        ((rP.y = Math.max(rP.y, nw(rP.x, rP.z) + 0.9)),
          E.position.lerp(rP, h.camInit ? EC(6, g) : 1),
          E.up.set(0, 1, 0),
          E.lookAt(rL),
          (E.fov = 58),
          (h.camInit = !0));
      } else if (rlA) {
        let ra = RL.yaw + Math.PI + iC.yaw,
          rp = CC(0.28 + iC.pitch, -0.1, 1.3),
          rn = iC.dist,
          rC2 = new G(
            D.x + Math.sin(ra) * Math.cos(rp) * rn,
            D.y + Math.sin(rp) * rn,
            D.z + Math.cos(ra) * Math.cos(rp) * rn,
          );
        ((rC2.y = Math.max(rC2.y, nw(rC2.x, rC2.z) + 0.9)),
          h.camInit ? E.position.lerp(rC2, EC(5, g)) : E.position.copy(rC2),
          (h.camInit = !0),
          E.up.set(0, 1, 0),
          E.lookAt(D),
          (E.fov = 62));
      } else if (pvA && _.cam === 1) {
        let pE2 = pv.root.localToWorld(pv.eye.clone());
        E.position.copy(pE2);
        let pP0 = iC.pitch - 0.16,
          pDir = new G(
            Math.sin(iC.yaw) * Math.cos(pP0),
            Math.sin(pP0),
            Math.cos(iC.yaw) * Math.cos(pP0),
          ).applyQuaternion(pv.root.quaternion);
        (E.up.set(0, 1, 0), E.lookAt(pE2.add(pDir)), (E.fov = iC.fov), (h.camInit = !1));
      } else if (pvA && _.cam === 2) {
        let pP2 = pv.root.localToWorld(new G(4.4, 2.5, -2.5)),
          pL2 = pv.root.localToWorld(new G(0, 0.35, PVS.SCREED_Z));
        ((pP2.y = Math.max(pP2.y, nw(pP2.x, pP2.z) + 0.9)),
          E.position.lerp(pP2, h.camInit ? EC(6, g) : 1),
          E.up.set(0, 1, 0),
          E.lookAt(pL2),
          (E.fov = 58),
          (h.camInit = !0));
      } else if (pvA) {
        let pa = PV.yaw + Math.PI + iC.yaw,
          pp = CC(0.3 + iC.pitch, -0.1, 1.3),
          pn = iC.dist,
          pC2 = new G(
            D.x + Math.sin(pa) * Math.cos(pp) * pn,
            D.y + Math.sin(pp) * pn,
            D.z + Math.cos(pa) * Math.cos(pp) * pn,
          );
        ((pC2.y = Math.max(pC2.y, nw(pC2.x, pC2.z) + 0.9)),
          h.camInit ? E.position.lerp(pC2, EC(5, g)) : E.position.copy(pC2),
          (h.camInit = !0),
          E.up.set(0, 1, 0),
          E.lookAt(D),
          (E.fov = 62));
      } else if (jbA && _.cam === 1) {""",
)
rep(
    "            speed: Math.abs(v ? CT.v : tkA ? TK.v : jbA ? JB.v : grA ? GR.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : jbA ? JB.rpm : grA ? GR.rpm : x.rpm,",
    "            speed: Math.abs(v ? CT.v : tkA ? TK.v : jbA ? JB.v : grA ? GR.v : rlA ? RL.v : pvA ? PV.v : x.v) * 3.6,\n            rpm: v ? CT.rpm : tkA ? TK.rpm : jbA ? JB.rpm : grA ? GR.rpm : rlA ? RL.rpm : pvA ? PV.rpm : x.rpm,",
)
rep(
    "            running: v ? CT.running : tkA ? TK.running : jbA ? JB.running : grA ? GR.running : x.running,",
    "            running: v ? CT.running : tkA ? TK.running : jbA ? JB.running : grA ? GR.running : rlA ? RL.running : pvA ? PV.running : x.running,",
)
rep(
    "            grRev: GR.v < -0.3,\n          })),",
    "            grRev: GR.v < -0.3,\n            rlVibe: RL.vibe,\n            rlWater: RL.sprinkler,\n            rlWork: RL.compacting > 0.08,\n            rlSteam: RL.steaming > 0.15,\n            rlArea: RL.compactM2,\n            rlRev: RL.v < -0.25,\n            pvLoad: PV.load,\n            pvScreed: PV.screed,\n            pvScreedDown: PV.screedDown,\n            pvWork: PV.paving > 0.08,\n            pvArea: PV.pavedM2,\n            pvRev: PV.v < -0.2,\n            tMat: TK.mat,\n            pvNearSilo: PV_STATE.nearSilo,\n            pvFilling: PV_STATE.filling,\n            pvFillAuto: PV_STATE.autoFill,\n            pvZones: PV_STATE.zones,\n          })),",
)
rep(
    "        grA\n          ? IS.update({",
    """        rlA
          ? IS.update({
              rpm: RL.rpm,
              load: RL.eload,
              running: RL.running,
              working: Math.min(1, Math.max(RL.compacting, RL.vibeAmp * 0.45)),
              speed: Math.abs(RL.v),
              rough: 0.55,
              hydraulic: RL.vibe && RL.running ? 1 : 0,
              vehicle: `roller`,
              cranking: RL.engine && !RL.running,
              reverse: RL.v < -0.25,
            })
          : pvA
          ? IS.update({
              rpm: PV.rpm,
              load: PV.eload,
              running: PV.running,
              working: Math.min(1, PV.paving),
              speed: Math.abs(PV.v),
              rough: 0.45,
              hydraulic: PV.paving > 0.1 ? 1 : 0,
              vehicle: `paver`,
              cranking: PV.engine && !PV.running,
              reverse: PV.v < -0.2,
            })
          : grA
          ? IS.update({""",
)
rep(
    "        (0, Z.jsx)(`primitive`, { object: co.root }),",
    "        (0, Z.jsx)(`primitive`, { object: rl.root }),\n        (0, Z.jsx)(`primitive`, { object: pv.root }),\n        (0, Z.jsx)(`primitive`, { object: plants.root }),\n        (0, Z.jsx)(`primitive`, { object: co.root }),",
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
