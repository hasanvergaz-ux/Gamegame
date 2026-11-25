// ===================== CHAKIR COMPANY COMPOUND RENDERER (added, garage lamps removed) =====================
function coMakeCanvasTex(w, h, drawFn) {
  let cv = document.createElement(`canvas`);
  cv.width = w;
  cv.height = h;
  let ctx = cv.getContext(`2d`);
  drawFn(ctx, w, h);
  let tex = new _s(cv);
  tex.colorSpace = yt;
  tex.anisotropy = jT;
  tex.needsUpdate = !0;
  return tex;
}

function coChevronTex() {
  return coMakeCanvasTex(256, 64, (c, w, h) => {
    c.fillStyle = `#e6b31e`;
    c.fillRect(0, 0, w, h);
    c.fillStyle = `#1d1f21`;
    for (let x = -h; x < w + h; x += 48) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x + 24, 0);
      c.lineTo(x + 24 + h * 0.7, h);
      c.lineTo(x + h * 0.7, h);
      c.closePath();
      c.fill();
    }
  });
}

function coChakirSignTex() {
  return coMakeCanvasTex(512, 512, (c, w, h) => {
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `#132238`);
    g.addColorStop(1, `#1e3556`);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    c.strokeStyle = `#d69b27`;
    c.lineWidth = 14;
    c.strokeRect(16, 16, w - 32, h - 32);

    c.fillStyle = `#f7f3e8`;
    c.font = `900 104px "Barlow Condensed", sans-serif`;
    c.textAlign = `center`;
    c.textBaseline = `middle`;
    c.fillText(`CHAKIR`, w / 2, 175);

    c.fillStyle = `#e6aa2d`;
    c.fillRect(58, 250, w - 116, 6);

    c.fillStyle = `#d8e2ee`;
    c.font = `700 42px "Barlow Condensed", sans-serif`;
    c.fillText(`HAFRİYAT & TARIM`, w / 2, 315);
    c.fillStyle = `#9fb3c8`;
    c.font = `600 32px "Barlow Condensed", sans-serif`;
    c.fillText(`FLEET SERVICES & GARAGE`, w / 2, 382);
  });
}

function coOpen247Tex() {
  return coMakeCanvasTex(256, 128, (c, w, h) => {
    c.fillStyle = `#111c2d`;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = `#38d67a`;
    c.lineWidth = 8;
    c.strokeRect(8, 8, w - 16, h - 16);
    c.fillStyle = `#38d67a`;
    c.font = `900 46px "Barlow Condensed", sans-serif`;
    c.textAlign = `center`;
    c.textBaseline = `middle`;
    c.fillText(`OPEN 24/7`, w / 2, h / 2);
  });
}

function coBuild() {
  let root = new Lr(),
    baseY = rw(CO_GATE.cx, (CO_BOX.z0 + CO_BOX.z1) / 2),
    mConcrete = new Cl({ color: `#9a968e`, roughness: 0.92 }),
    mDarkSteel = new Cl({ color: `#282c31`, roughness: 0.45, metalness: 0.78 }),
    mFenceSteel = new Cl({ color: `#3b434b`, roughness: 0.5, metalness: 0.7 }),
    mTruss = new Cl({ color: `#5b636b`, roughness: 0.4, metalness: 0.8 }),
    mRoof = new Cl({ color: `#7a533c`, roughness: 0.65, metalness: 0.45, side: 2 }),
    mChevron = new Cl({ map: coChevronTex(), roughness: 0.5, metalness: 0.25 }),
    mSign = new Cl({
      map: coChakirSignTex(),
      roughness: 0.35,
      emissive: `#fff0cc`,
      emissiveMap: coChakirSignTex(),
      emissiveIntensity: 0.35,
    }),
    mOpen = new Cl({
      map: coOpen247Tex(),
      roughness: 0.3,
      emissive: `#22c55e`,
      emissiveMap: coOpen247Tex(),
      emissiveIntensity: 0.45,
    }),
    mGlass = new Cl({
      color: `#294052`,
      roughness: 0.08,
      metalness: 0.85,
      emissive: `#ffbb66`,
      emissiveIntensity: 0.25,
    }),
    mGateLed = new Cl({
      color: `#ef4444`,
      emissive: `#ef4444`,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
    mBulb = new Cl({
      color: `#fff2b2`,
      emissive: `#ffd166`,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
    mWallLamp = new Cl({
      color: `#fff3cf`,
      emissive: `#ffbf5e`,
      emissiveIntensity: 0.35,
      roughness: 0.18,
    }),
    addBox = (geo, mat, x, y, z, ry = 0, cast = !0) => {
      let m = new Wa(geo, mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      m.castShadow = cast;
      m.receiveShadow = !0;
      root.add(m);
      return m;
    };

  // Perimeter concrete base walls + steel picket bars + barbed wire posts
  let addWallSeg = (x0, z0, x1, z1) => {
    let len = Math.hypot(x1 - x0, z1 - z0),
      ang = Math.atan2(x1 - x0, z1 - z0),
      cx = (x0 + x1) / 2,
      cz = (z0 + z1) / 2;
    addBox(new Ss(0.32, 1.05, len), mConcrete, cx, baseY + 0.5, cz, ang);
    addBox(new Ss(0.08, 0.06, len), mFenceSteel, cx, baseY + 1.95, cz, ang);
    addBox(new Ss(0.08, 0.06, len), mFenceSteel, cx, baseY + 1.45, cz, ang);
    let posts = Math.max(2, Math.floor(len / 3.5));
    for (let i = 0; i <= posts; i++) {
      let f = i / posts,
        px = x0 + (x1 - x0) * f,
        pz = z0 + (z1 - z0) * f;
      addBox(new Ss(0.14, 2.35, 0.14), mDarkSteel, px, baseY + 1.15, pz, ang);
    }
    for (let yOff of [2.15, 2.35]) {
      addBox(new Ss(0.025, 0.025, len), mFenceSteel, cx, baseY + yOff, cz, ang, !1);
    }
  };
  // Wall-mounted perimeter sconce lamp (housing, rain hood, glowing glass diffuser)
  let addWallLamp = (x, y, z, nx, nz) => {
    let ang = Math.atan2(nx, nz),
      ox = nx * 0.22,
      oz = nz * 0.22;
    addBox(new Ss(0.24, 0.3, 0.1), mDarkSteel, x + ox * 0.55, y, z + oz * 0.55, ang, !1);
    addBox(new Ss(0.3, 0.06, 0.26), mDarkSteel, x + ox * 0.95, y + 0.14, z + oz * 0.95, ang, !1);
    addBox(new Ss(0.2, 0.18, 0.16), mWallLamp, x + ox, y + 0.02, z + oz, ang, !1);
  };
  let gx0 = CO_GATE.cx - CO_GATE.w / 2,
    gx1 = CO_GATE.cx + CO_GATE.w / 2;
  addWallSeg(CO_BOX.x0, CO_BOX.z1, gx0, CO_BOX.z1);
  addWallSeg(gx1, CO_BOX.z1, CO_BOX.x1, CO_BOX.z1);
  addWallSeg(CO_BOX.x0, CO_BOX.z0, CO_BOX.x1, CO_BOX.z0);
  addWallSeg(CO_BOX.x0, CO_BOX.z0, CO_BOX.x0, CO_BOX.z1);
  addWallSeg(CO_BOX.x1, CO_BOX.z0, CO_BOX.x1, CO_BOX.z1);

  // Perimeter wall lamps anchored onto steel wall posts along front, side, and back walls
  let addPostWallLamp = (x, z, nx, nz) => {
    addBox(new Ss(0.15, 1.12, 0.15), mDarkSteel, x, baseY + 1.5, z, 0, !1);
    addWallLamp(x, baseY + 1.85, z, nx, nz);
  };
  for (let wx of [-92, -85, -62, -55]) {
    addPostWallLamp(wx, CO_BOX.z1, 0, 1);
    addWallLamp(wx, baseY + 1.85, CO_BOX.z1, 0, -1);
  }
  for (let wx of [-88, -78, -69, -59]) {
    addPostWallLamp(wx, CO_BOX.z0, 0, 1);
  }
  for (let wz of [-53, -44, -35, -28]) {
    addPostWallLamp(CO_BOX.x0, wz, 1, 0);
    addPostWallLamp(CO_BOX.x1, wz, -1, 0);
  }

  // Heavy gate pillars + overhead rail + red/green gate status beacon + pillar wall lamps
  for (let px of [gx0 - 0.3, gx1 + 0.3]) {
    addBox(new Ss(0.65, 3.2, 0.65), mConcrete, px, baseY + 1.55, CO_GATE.z);
    addBox(new Ss(0.75, 0.18, 0.75), mDarkSteel, px, baseY + 3.2, CO_GATE.z);
    addWallLamp(px, baseY + 2.25, CO_GATE.z + 0.28, 0, 1);
  }
  let gateLightL = new Bu(`#ffcf78`, 0, 16, 1.8),
    gateLightR = new Bu(`#ffcf78`, 0, 16, 1.8);
  gateLightL.position.set(gx0 - 0.3, baseY + 2.25, CO_GATE.z + 0.65);
  gateLightR.position.set(gx1 + 0.3, baseY + 2.25, CO_GATE.z + 0.65);
  gateLightL.visible = gateLightR.visible = !1;
  root.add(gateLightL, gateLightR);
  addBox(new Ss(CO_GATE.w + 9.6, 0.16, 0.22), mDarkSteel, CO_GATE.cx, baseY + 2.75, CO_GATE.z);
  let gateLed = addBox(new Ts(0.11, 0.11, 0.22, 10), mGateLed, gx1 + 0.3, baseY + 3.42, CO_GATE.z, 0, !1);

  // Double-leaf sliding gate meshes
  let makeLeaf = (xCenter) => {
    let g = new Lr();
    g.position.set(xCenter, baseY, CO_GATE.z);
    let lw = CO_GATE.leafW,
      f = new Wa(new Ss(lw, 0.12, 0.1), mDarkSteel);
    f.position.y = 2.25;
    let b = new Wa(new Ss(lw, 0.42, 0.12), mChevron);
    b.position.y = 0.35;
    g.add(f, b);
    for (let k = -3; k <= 3; k++) {
      let bar = new Wa(new Ss(0.06, 1.95, 0.06), mFenceSteel);
      bar.position.set((k / 3.4) * (lw * 0.45), 1.3, 0);
      bar.castShadow = !0;
      g.add(bar);
    }
    root.add(g);
    return g;
  };
  let leafL = makeLeaf(CO_GATE.cx - CO_GATE.leafW / 2),
    leafR = makeLeaf(CO_GATE.cx + CO_GATE.leafW / 2);

  // Guard booth + "OPEN 24/7" sign
  addBox(new Ss(CO_BOOTH.w, 2.5, CO_BOOTH.d), mConcrete, CO_BOOTH.x, baseY + 1.25, CO_BOOTH.z);
  addBox(new Ss(CO_BOOTH.w + 0.35, 0.18, CO_BOOTH.d + 0.35), mDarkSteel, CO_BOOTH.x, baseY + 2.58, CO_BOOTH.z);
  addBox(new Ss(1.5, 0.95, 0.08), mGlass, CO_BOOTH.x, baseY + 1.55, CO_BOOTH.z + CO_BOOTH.d / 2 + 0.02, 0, !1);
  addBox(new Ss(1.25, 0.55, 0.08), mOpen, CO_BOOTH.x, baseY + 2.95, CO_BOOTH.z + CO_BOOTH.d / 2 - 0.1, 0, !1);

  // Tall "CHAKIR" billboard + glowing decorative bulbs
  addBox(new Ts(0.22, 0.28, 7.2, 12), mDarkSteel, CO_SIGN.x, baseY + 3.6, CO_SIGN.z);
  addBox(new Ss(4.2, 4.2, 0.25), mDarkSteel, CO_SIGN.x, baseY + 6.4, CO_SIGN.z);
  addBox(new Ss(4.0, 4.0, 0.06), mSign, CO_SIGN.x, baseY + 6.4, CO_SIGN.z + 0.15, 0, !1);
  addBox(new Ss(4.0, 4.0, 0.06), mSign, CO_SIGN.x, baseY + 6.4, CO_SIGN.z - 0.15, Math.PI, !1);
  for (let i = -3; i <= 3; i++) {
    addBox(new il(0.08, 8, 6), mBulb, CO_SIGN.x + i * 0.55, baseY + 8.65, CO_SIGN.z, 0, !1);
  }

  // Open-sided steel-truss garage hangar (no overhead lamps)
  let gw = CO_GARAGE.x1 - CO_GARAGE.x0,
    gd = CO_GARAGE.z1 - CO_GARAGE.z0,
    gcx = (CO_GARAGE.x0 + CO_GARAGE.x1) / 2,
    gcz = (CO_GARAGE.z0 + CO_GARAGE.z1) / 2;
  addBox(new Ss(gw, 3.6, 0.2), mRoof, gcx, baseY + 1.8, CO_GARAGE.z0);
  for (let i = 0; i <= 4; i++) {
    let px = CO_GARAGE.x0 + (gw * i) / 4;
    addBox(new Ss(0.28, CO_GARAGE.h, 0.28), mTruss, px, baseY + CO_GARAGE.h / 2, CO_GARAGE.z0);
    addBox(new Ss(0.28, CO_GARAGE.h, 0.28), mTruss, px, baseY + CO_GARAGE.h / 2, CO_GARAGE.z1);
    addBox(new Ss(0.18, 0.24, gd + 0.4), mTruss, px, baseY + CO_GARAGE.h - 0.12, gcz);
  }
  // Pitched corrugated hangar roof
  let slopeAng = 0.14,
    halfD = gd / 2 + 0.85,
    panelW = Math.hypot(halfD, halfD * Math.tan(slopeAng));
  for (let sgn of [-1, 1]) {
    let p = new Wa(new el(gw + 1.2, panelW), mRoof);
    p.position.set(gcx, baseY + CO_GARAGE.h + 0.42, gcz + (sgn * halfD) / 2);
    p.rotation.set(-Math.PI / 2 + slopeAng, sgn < 0 ? Math.PI : 0, 0, `YXZ`);
    p.castShadow = !0;
    p.receiveShadow = !0;
    root.add(p);
  }

  // Fuel pump dispenser island
  addBox(new Ss(1.1, 1.85, 0.7), new Cl({ color: `#d9482b`, roughness: 0.45 }), CO_PUMP.x, baseY + 0.92, CO_PUMP.z);
  addBox(new Ss(1.3, 0.22, 0.9), mConcrete, CO_PUMP.x, baseY + 0.11, CO_PUMP.z);
  addBox(new Ss(0.85, 0.45, 0.74), mGlass, CO_PUMP.x, baseY + 1.4, CO_PUMP.z, 0, !1);

  return {
    root,
    update: (st, night) => {
      let ease = st.gateOpen * st.gateOpen * (3 - 2 * st.gateOpen),
        slide = ease * CO_GATE.slide;
      leafL.position.x = CO_GATE.cx - CO_GATE.leafW / 2 - slide;
      leafR.position.x = CO_GATE.cx + CO_GATE.leafW / 2 + slide;
      let isOpen = st.gateOpen > 0.65;
      mGateLed.color.set(isOpen ? `#22c55e` : st.moving ? `#f59e0b` : `#ef4444`);
      mGateLed.emissive.copy(mGateLed.color);
      mSign.emissiveIntensity = 0.28 + night * 0.75;
      mOpen.emissiveIntensity = 0.4 + night * 0.65;
      mGlass.emissiveIntensity = 0.1 + night * 1.1;
      mBulb.emissiveIntensity = 0.5 + night * 1.3;
      mWallLamp.emissiveIntensity = 0.25 + night * 1.6;
      let glOn = night > 0.12;
      gateLightL.visible = gateLightR.visible = glOn;
      gateLightL.intensity = gateLightR.intensity = glOn ? night * 5.5 : 0;
    },
  };
}

function coUse() {
  return (0, y.useMemo)(coBuild, []);
}
