// ===================== PAVING SILOS RENDERER (ÇAKIL SİLOSU & ASFALT SİLOSU) =====================
function pvUsePlants() {
  return (0, y.useMemo)(() => pvBuildPlants(), []);
}

function pvSignTex(title, sub, bgHex, stripeHex, accentHex) {
  let cv = document.createElement(`canvas`);
  cv.width = 512;
  cv.height = 160;
  let c = cv.getContext(`2d`);
  c.fillStyle = bgHex;
  c.fillRect(0, 0, 512, 160);
  c.strokeStyle = accentHex;
  c.lineWidth = 8;
  c.strokeRect(8, 8, 496, 144);
  c.fillStyle = stripeHex;
  c.fillRect(16, 16, 480, 14);
  c.fillRect(16, 130, 480, 14);
  c.fillStyle = `#f7f5ef`;
  c.font = `900 56px "Barlow Condensed", Arial, sans-serif`;
  c.textAlign = `center`;
  c.textBaseline = `middle`;
  c.fillText(title, 256, 68);
  c.fillStyle = accentHex;
  c.font = `700 28px "Barlow Condensed", Arial, sans-serif`;
  c.fillText(sub, 256, 108);
  let tex = new _s(cv);
  tex.colorSpace = yt;
  tex.anisotropy = jT;
  tex.needsUpdate = !0;
  return tex;
}

function pvBayFloorTex(colHex) {
  let cv = document.createElement(`canvas`);
  cv.width = 256;
  cv.height = 512;
  let c = cv.getContext(`2d`);
  c.fillStyle = `rgba(38,40,44,0.75)`;
  c.fillRect(0, 0, 256, 512);
  c.strokeStyle = colHex;
  c.lineWidth = 14;
  c.strokeRect(12, 12, 232, 488);
  c.setLineDash([28, 22]);
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(128, 36);
  c.lineTo(128, 476);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = colHex;
  c.font = `800 32px "Barlow Condensed", Arial, sans-serif`;
  c.textAlign = `center`;
  c.fillText(`YÜKLEME`, 128, 92);
  c.fillText(`BAY`, 128, 438);
  let tex = new _s(cv);
  tex.colorSpace = yt;
  tex.anisotropy = jT;
  tex.needsUpdate = !0;
  return tex;
}

function pvBuildPlants() {
  let root = new Lr(),
    mConcrete = new Cl({ color: `#8f8d87`, roughness: 0.92 }),
    mSteelDark = new Cl({ color: `#282d33`, roughness: 0.44, metalness: 0.78 }),
    mSteelGalv = new Cl({ color: `#8a929b`, roughness: 0.38, metalness: 0.72 }),
    mBarnSilo = new Cl({ color: `#c47c2b`, roughness: 0.56, metalness: 0.35 }),
    mBarnRoof = new Cl({ color: `#6b3b28`, roughness: 0.62, metalness: 0.38, side: 2 }),
    mAsphaltTank = new Cl({ color: `#25282e`, roughness: 0.42, metalness: 0.68 }),
    mAsphaltOrange = new Cl({ color: `#d96d1a`, roughness: 0.48, metalness: 0.38 }),
    mGravelPile = new Cl({ color: `#919598`, roughness: 0.96, flatShading: !0 }),
    mRubber = new Cl({ color: `#181a1c`, roughness: 0.92 }),
    mBeaconGravel = new Cl({ color: `#f59e0b`, emissive: `#f59e0b`, emissiveIntensity: 1.0, roughness: 0.2 }),
    mBeaconAsp = new Cl({ color: `#ff5b1a`, emissive: `#ff5b1a`, emissiveIntensity: 1.0, roughness: 0.2 }),
    mBayLineG = new Cl({
      map: pvBayFloorTex(`#f2b318`),
      roughness: 0.82,
      transparent: !0,
      polygonOffset: !0,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    mBayLineA = new Cl({
      map: pvBayFloorTex(`#ff6b1a`),
      roughness: 0.82,
      transparent: !0,
      polygonOffset: !0,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    addM = (geo, mat, parent, x, y, z, rx = 0, ry = 0, rz = 0, cast = !0) => {
      let m = new Wa(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = cast;
      m.receiveShadow = !0;
      parent.add(m);
      return m;
    };

  let anim = {
    gravelGates: [],
    asphaltGates: [],
    beacons: [],
    stackTip: new G(),
    conveyorRollers: [],
    nightLights: [],
  };

  // ====================================================================
  // 1. ÇAKIL SİLOSU (Aggregate Barn Hopper & Conveyor at x=-120, z=-36)
  // ====================================================================
  {
    let s = PV_SILOS[0],
      by = nw(s.x, s.z),
      g = new Lr();
    g.position.set(s.x, by, s.z);
    root.add(g);

    // Painted drive-through bay slab & guide stripes (width 5.4m, length 11m)
    let bayFloor = addM(new el(4.6, 9.6), mBayLineG, g, 0, 0.04, 0, -Math.PI / 2, 0, 0, !1);
    bayFloor.castShadow = !1;

    // 4 concrete plinths + heavy steel H-columns framing drive-through tunnel (+-3.25m clear!)
    for (let sx of [-3.25, 3.25]) {
      for (let sz of [-2.4, 2.4]) {
        addM(new Ss(0.75, 0.45, 0.75), mConcrete, g, sx, 0.22, sz);
        addM(new Ss(0.36, 4.7, 0.36), mSteelDark, g, sx, 2.65, sz);
      }
      addM(new Ss(0.28, 0.32, 5.2), mSteelDark, g, sx, 4.9, 0);
    }
    // Overhead portal tie-beams (clearance 4.8m high)
    for (let sz of [-2.4, 2.4]) {
      addM(new Ss(6.8, 0.34, 0.32), mSteelDark, g, 0, 4.9, sz);
    }

    // Tapered inverted-pyramid aggregate hopper chute
    let funnel = addM(new Ts(2.9, 0.95, 2.0, 4), mSteelGalv, g, 0, 5.45, 0, 0, Math.PI / 4, 0);
    void funnel;
    // Upper barn-like silo bunker box (ambar silosu)
    addM(new Ss(5.6, 2.9, 4.9), mBarnSilo, g, 0, 7.65, 0);
    // Vertical structural stiffener ribs on silo walls
    for (let rx of [-2.0, -0.7, 0.7, 2.0]) {
      addM(new Ss(0.14, 2.95, 5.02), mSteelDark, g, rx, 7.65, 0);
    }
    // Pitched barn roof canopy + ridge vent
    for (let sgn of [-1, 1]) {
      addM(new el(6.4, 3.15), mBarnRoof, g, 0, 9.5, sgn * 1.38, -Math.PI / 2 + 0.36, sgn < 0 ? Math.PI : 0, 0);
    }
    addM(new Ss(6.5, 0.22, 0.35), mSteelDark, g, 0, 10.02, 0);

    // Hydraulic clamshell chute jaws under hopper
    for (let sg of [-1, 1]) {
      let jaw = new Lr();
      jaw.position.set(0, 4.42, sg * 0.42);
      addM(new Ss(1.25, 0.36, 0.48), mAsphaltOrange, jaw, 0, -0.15, -sg * 0.16);
      g.add(jaw);
      anim.gravelGates.push({ mesh: jaw, dir: sg });
    }

    // Exterior service ladder + safety platform
    addM(new Ss(0.55, 5.8, 0.14), mSteelDark, g, 3.05, 6.2, 2.45);
    addM(new Ss(1.2, 0.12, 1.4), mSteelGalv, g, 3.25, 8.9, 1.9);

    // Front & back gantry illuminated signage ("ÇAKIL SİLOSU")
    let gSignTex = pvSignTex(`ÇAKIL SİLOSU`, `AGREGA • DAMPER ALTI`, `#1f2a1d`, `#d99220`, `#f5c142`),
      mSignG = new Cl({
        map: gSignTex,
        roughness: 0.38,
        emissive: `#fff0cc`,
        emissiveMap: gSignTex,
        emissiveIntensity: 0.28,
      });
    addM(new Ss(4.9, 1.35, 0.14), mSignG, g, 0, 5.75, 2.52, 0, 0, 0, !1);
    addM(new Ss(4.9, 1.35, 0.14), mSignG, g, 0, 5.75, -2.52, 0, Math.PI, 0, !1);

    // Crushed gravel stockpile beside silo + inclined belt conveyor feeding the barn top
    let pile = addM(new Ts(0.6, 3.8, 2.7, 14), mGravelPile, g, -6.9, 1.25, -0.5);
    pile.scale.set(1.1, 1.0, 1.3);
    addM(new Ss(7.2, 0.26, 0.92), mSteelDark, g, -4.4, 5.85, -0.4, 0, 0, 0.62);
    addM(new Ss(7.1, 0.08, 0.72), mRubber, g, -4.4, 5.99, -0.4, 0, 0, 0.62);
    for (let i = 0; i < 4; i++) {
      let r = addM(new Ts(0.11, 0.11, 0.85, 8), mSteelGalv, g, -6.4 + i * 1.35, 4.3 + i * 1.05, -0.4, Math.PI / 2, 0, 0);
      anim.conveyorRollers.push(r);
    }

    // Beacon + bay downlight
    let bcn = addM(new il(0.18, 10, 8), mBeaconGravel, g, 0, 10.22, 0, 0, 0, 0, !1);
    anim.beacons.push(bcn);
    let nl = new Bu(`#ffcf7a`, 0, 18, 1.7);
    nl.position.set(0, 4.65, 0);
    nl.visible = !1;
    g.add(nl);
    anim.nightLights.push({ light: nl, signMat: mSignG });
  }

  // ====================================================================
  // 2. ASFALT SİLOSU (Twin Hot-Mix Silos & Dryer Drum at x=86, z=-36)
  // ====================================================================
  {
    let s = PV_SILOS[1],
      by = nw(s.x, s.z),
      g = new Lr();
    g.position.set(s.x, by, s.z);
    root.add(g);

    let bayFloor = addM(new el(4.6, 9.6), mBayLineA, g, 0, 0.04, 0, -Math.PI / 2, 0, 0, !1);
    bayFloor.castShadow = !1;

    // 4 structural portal columns (+-3.25m clear bay)
    for (let sx of [-3.25, 3.25]) {
      for (let sz of [-2.4, 2.4]) {
        addM(new Ss(0.8, 0.45, 0.8), mConcrete, g, sx, 0.22, sz);
        addM(new Ss(0.38, 4.9, 0.38), mSteelDark, g, sx, 2.75, sz);
      }
      addM(new Ss(0.3, 0.34, 5.4), mSteelDark, g, sx, 5.05, 0);
    }
    for (let sz of [-2.4, 2.4]) {
      addM(new Ss(6.8, 0.36, 0.32), mSteelDark, g, 0, 5.05, sz);
    }

    // Twin insulated cylindrical Hot-Mix Asphalt storage silos (on steel deck)
    addM(new Ss(6.4, 0.4, 5.4), mSteelDark, g, 0, 5.35, 0);
    for (let oz of [-1.2, 1.2]) {
      addM(new Ts(1.55, 1.55, 4.6, 20), mAsphaltTank, g, 0, 7.85, oz);
      addM(new Ts(0.35, 1.58, 0.75, 20), mAsphaltOrange, g, 0, 10.52, oz);
      addM(new Ss(0.18, 4.6, 3.22), mSteelGalv, g, 0, 7.85, oz);
    }
    // Top bridge walkway + orange safety guardrails
    addM(new Ss(3.6, 0.14, 5.2), mSteelGalv, g, 0, 10.22, 0);
    addM(new Ss(3.6, 0.08, 0.08), mAsphaltOrange, g, 0, 11.1, 2.55);
    addM(new Ss(3.6, 0.08, 0.08), mAsphaltOrange, g, 0, 11.1, -2.55);

    // Tapered hot-mix discharge hopper & clamshell gates
    addM(new Ts(1.75, 0.65, 1.35, 12), mAsphaltTank, g, 0, 4.85, 0);
    for (let sg of [-1, 1]) {
      let jaw = new Lr();
      jaw.position.set(0, 4.25, sg * 0.4);
      addM(new Ss(1.2, 0.32, 0.45), mAsphaltOrange, jaw, 0, -0.14, -sg * 0.14);
      g.add(jaw);
      anim.asphaltGates.push({ mesh: jaw, dir: sg });
    }

    // Adjacent Rotary Dryer Drum + Burner Unit + Tall Exhaust Stack (+7.2m east, clear of bay)
    addM(new Ss(4.4, 0.55, 5.8), mConcrete, g, 7.2, 0.27, -0.5);
    addM(new Ts(1.25, 1.25, 5.2, 18), mSteelGalv, g, 7.2, 2.15, -0.5, Math.PI / 2, 0, 0);
    addM(new Ss(2.75, 0.35, 2.75), mAsphaltOrange, g, 7.2, 2.15, 2.1);
    // Bucket elevator & vertical chimney stack
    addM(new Ss(0.85, 9.6, 0.85), mSteelDark, g, 4.6, 5.1, -1.6);
    addM(new Ss(1.9, 0.65, 0.65), mSteelDark, g, 2.6, 9.8, -1.3);
    addM(new Ts(0.45, 0.62, 10.6, 16), mSteelGalv, g, 7.6, 5.8, -2.6);
    anim.stackTip.set(s.x + 7.6, by + 11.2, s.z - 2.6);

    // Illuminated Signage ("ASFALT SİLOSU")
    let aSignTex = pvSignTex(`ASFALT SİLOSU`, `SICAK MİX 160°C • DAMPER ALTI`, `#1b1d22`, `#e85d1a`, `#ffaa33`),
      mSignA = new Cl({
        map: aSignTex,
        roughness: 0.35,
        emissive: `#ffddb0`,
        emissiveMap: aSignTex,
        emissiveIntensity: 0.32,
      });
    addM(new Ss(4.9, 1.35, 0.14), mSignA, g, 0, 5.85, 2.75, 0, 0, 0, !1);
    addM(new Ss(4.9, 1.35, 0.14), mSignA, g, 0, 5.85, -2.75, 0, Math.PI, 0, !1);

    let bcn = addM(new il(0.18, 10, 8), mBeaconAsp, g, 0, 11.05, 1.2, 0, 0, 0, !1);
    anim.beacons.push(bcn);
    let nl = new Bu(`#ff9e4a`, 0, 18, 1.7);
    nl.position.set(0, 4.7, 0);
    nl.visible = !1;
    g.add(nl);
    anim.nightLights.push({ light: nl, signMat: mSignA });
  }

  return {
    root,
    stackTip: anim.stackTip,
    update: (st, night, time, dt) => {
      let gEase = st.chuteOpen.gravel || 0,
        aEase = st.chuteOpen.asphalt || 0;
      for (let j of anim.gravelGates) j.mesh.rotation.x = j.dir * gEase * 0.65;
      for (let j of anim.asphaltGates) j.mesh.rotation.x = j.dir * aEase * 0.65;
      for (let r of anim.conveyorRollers) r.rotation.z += dt * (gEase > 0.05 ? 4.5 : 0.7);
      let flash = Math.sin(time * 7.5) > 0 ? 1.8 : 0.35;
      mBeaconGravel.emissiveIntensity = flash * (gEase > 0.1 ? 1.8 : 1.0);
      mBeaconAsp.emissiveIntensity = flash * (aEase > 0.1 ? 1.8 : 1.0);
      let lit = night > 0.12;
      for (let n of anim.nightLights) {
        n.light.visible = lit;
        n.light.intensity = lit ? night * 5.2 : 0;
        n.signMat.emissiveIntensity = 0.25 + night * 0.85;
      }
    },
  };
}
