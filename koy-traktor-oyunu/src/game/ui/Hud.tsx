import { useEffect, useRef, useState, type ReactNode } from "react";
import { gameAudio } from "../audio/GameAudio";
import { cycleCamera, input, setHorn, switchVehicle, toggleDirection, toggleEngine, type HeldKey } from "../input";
import { useHud, useToggles } from "../store";
import { Minimap } from "./Minimap";

function HoldButton({ k, className, children, label }: { k: HeldKey; className: string; children: ReactNode; label: string }) {
  const [on, setOn] = useState(false);
  const set = (v: boolean) => {
    input[k] = v;
    setOn(v);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      data-on={on}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        gameAudio.unlock();
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

function Toggle({ on, onClick, icon, label }: { on?: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      className="hud-btn"
      data-on={!!on}
      onClick={() => {
        gameAudio.unlock();
        onClick();
      }}
    >
      <i>{icon}</i>
      {label}
    </button>
  );
}

function VehicleSwitch() {
  const v = useToggles((s) => s.vehicle);
  return (
    <button
      type="button"
      className="hud-switch"
      aria-label={v === "tractor" ? "Kepçeye geç" : "Traktöre geç"}
      onClick={() => {
        gameAudio.unlock();
        switchVehicle();
      }}
    >
      <span className="hud-switch-now">{v === "tractor" ? "🚜 Traktör" : "🏗️ Kepçe"}</span>
      <span className="hud-switch-go">⇄ {v === "tractor" ? "Kepçeye geç" : "Traktöre geç"} <kbd>V</kbd></span>
    </button>
  );
}

function TopBar() {
  const t = useToggles();
  const [hornOn, setHornOn] = useState(false);
  const exc = t.vehicle === "excavator";
  const camNames = exc ? ["Dış", "Kabin", "Yan"] : ["Dış", "Kabin", "Arka"];
  return (
    <div className="hud-bar">
      <Toggle on={t.cam !== 0} onClick={cycleCamera} icon="📷" label={camNames[t.cam]!} />
      <Toggle on={exc ? t.excEngine : t.engine} onClick={toggleEngine} icon="🔑" label="Kontak" />
      <Toggle on={t.head} onClick={() => t.flip("head")} icon="💡" label="Far" />
      <Toggle on={t.work} onClick={() => t.flip("work")} icon="🔦" label="İş lambası" />
      <Toggle on={t.beacon} onClick={() => t.flip("beacon")} icon="🚨" label="Çakar" />
      <button
        type="button"
        className="hud-btn"
        data-on={hornOn}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setHorn(true);
          setHornOn(true);
        }}
        onPointerUp={() => {
          setHorn(false);
          setHornOn(false);
        }}
        onPointerCancel={() => {
          setHorn(false);
          setHornOn(false);
        }}
      >
        <i>📯</i>Korna
      </button>
      <Toggle on={t.night} onClick={() => t.flip("night")} icon="🌙" label="Gece" />
      {!exc && <Toggle on={t.hood} onClick={() => t.flip("hood")} icon="🔧" label="Kaput" />}
      <Toggle on={t.quality === "high"} onClick={() => t.set({ quality: t.quality === "high" ? "low" : "high" })} icon="✨" label={t.quality === "high" ? "Yüksek" : "Düşük"} />
      <Toggle onClick={() => (input.resetPressed = true)} icon="↺" label="Başa dön" />
      <Toggle on={t.help} onClick={() => t.flip("help")} icon="?" label="Tuşlar" />
    </div>
  );
}

function ExcGauges() {
  const h = useHud();
  const auto = h.auto;
  const full = h.bucket > 0.95;
  return (
    <div className="hud-panel hud-gauges">
      <div className="hud-speed">
        <b>{h.speed.toFixed(1)}</b>
        <small>km/sa</small>
        <span className="hud-gear" data-auto={auto}>{auto ? "OTOMATİK" : "MANUEL"}</span>
      </div>
      <div className="hud-row">
        <span>Devir</span>
        <div className="hud-meter"><div style={{ width: `${Math.min(100, (h.rpm / 2400) * 100)}%` }} /></div>
        <em>{Math.round(h.rpm)}</em>
      </div>
      <div className="hud-row">
        <span>Kova</span>
        <div className="hud-meter hud-meter-soil"><div style={{ width: `${Math.round(Math.min(1, h.bucket) * 100)}%` }} /></div>
        <em>%{Math.round(Math.min(1, h.bucket) * 100)}</em>
      </div>
      <div className="hud-status">
        <span data-state={h.inSoil || auto ? "work" : full ? "on" : "off"}>
          {auto ? `● ${h.phase}` : h.inSoil ? "● Kazılıyor" : full ? "Kova dolu" : h.running ? "Hazır" : "Motor kapalı"}
        </span>
      </div>
      <div className="hud-area">
        Kazılan toprak: <b>{h.dug.toFixed(1)}</b> m³
      </div>
    </div>
  );
}

function Gauges() {
  const h = useHud();
  const dir = useToggles((s) => s.dir);
  const dekar = h.area / 1000;
  return (
    <div className="hud-panel hud-gauges">
      <div className="hud-speed">
        <b>{Math.round(h.speed)}</b>
        <small>km/sa</small>
        <span className="hud-gear" data-rev={dir < 0}>{dir > 0 ? "İLERİ" : "GERİ"}</span>
      </div>
      <div className="hud-row">
        <span>Devir</span>
        <div className="hud-meter"><div style={{ width: `${Math.min(100, (h.rpm / 2300) * 100)}%` }} /></div>
        <em>{Math.round(h.rpm)}</em>
      </div>
      <div className="hud-row">
        <span>Kaldırıcı</span>
        <div className="hud-meter hud-meter-lift"><div style={{ width: `${Math.round(h.lift * 100)}%` }} /></div>
        <em>{h.lift < 0.05 ? "AŞAĞI" : h.lift > 0.95 ? "YUKARI" : `%${Math.round(h.lift * 100)}`}</em>
      </div>
      <div className="hud-status">
        <span data-state={h.working ? "work" : h.attached ? "on" : "off"}>
          {h.working ? "● Toprak işleniyor" : h.attached ? "Kazayağı takılı" : "Alet takılı değil"}
        </span>
        <span>{h.surface}</span>
      </div>
      <div className="hud-area">
        İşlenen alan: <b>{dekar.toFixed(2)}</b> dekar
      </div>
    </div>
  );
}

function Prompt() {
  const h = useHud();
  const exc = useToggles((s) => s.vehicle === "excavator");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(id);
  }, []);
  let msg = "";
  if (now - h.toastT < 3500 && h.toast) msg = h.toast;
  else if (!h.running && h.ready) msg = exc ? "Kepçedesin — önce 🔑 Kontak'a bas (K)" : "Önce 🔑 Kontak'a bas (K)";
  else if (exc) {
    if (h.auto) msg = `⛏ Otomatik kazı: ${h.phase}`;
    else if (h.bucket > 0.95) msg = "Kova dolu — kuleyi çevir (← →) ve X ile boşalt";
    else if (h.dug < 0.05) msg = "⛏ OTOMATİK KAZ (Boşluk) · ya da ↑↓ bom · E/Q arm · Z/X kova · ←→ kule";
  }
  else if (h.canAttach) msg = "🔗 TAK düğmesine bas (T) — kazayağı hazır";
  else if (!h.attached && h.attachDist < 8) msg = `Geri vitese al (R) ve kazayağına geri geri yaklaş · ${h.attachDist.toFixed(1)} m`;
  else if (h.attached && h.lift > 0.5 && !h.working) msg = "▼ İNDİR ile kazayağını toprağa daldır";
  if (!msg) return null;
  return <div className="hud-prompt" data-good={h.canAttach}>{msg}</div>;
}

function Help() {
  const help = useToggles((s) => s.help);
  if (!help) return null;
  const exc = useToggles.getState().vehicle === "excavator";
  const rows: [string, string][] = exc
    ? [
        ["W / S", "Paletler ileri / geri"], ["A / D", "Sola / sağa dön"], ["← / →", "Kuleyi döndür"], ["↑ / ↓", "Bomu kaldır / indir"],
        ["E / Q", "Armı aç / topla"], ["Z / X", "Kovayı kapat / aç (boşalt)"], ["Boşluk", "Otomatik kazı aç / kapat"], ["G", "Bıçağı indir / kaldır"],
        ["K", "Kontak"], ["V", "Traktöre geç"], ["H", "Korna"], ["J / L", "Lambalar"], ["B", "Çakar"], ["N", "Gece"], ["C", "Kamera"],
      ]
    : [
        ["W / ↑", "Gaz"], ["S / ↓ / Boşluk", "Fren"], ["A D / ← →", "Direksiyon"], ["R", "İleri ⇄ Geri"],
        ["K", "Kontak"], ["E", "Kaldırıcı yukarı"], ["Q", "Kaldırıcı aşağı"], ["T", "Aleti tak / çıkar"],
        ["H", "Korna"], ["L", "Far"], ["J", "İş lambası"], ["B", "Çakar"], ["N", "Gece"], ["C", "Kamera"], ["O", "Kaput"], ["V", "Kepçeye geç"],
      ];
  return (
    <div className="hud-panel hud-help" onClick={() => useToggles.getState().flip("help")}>
      <h3>{exc ? "Kepçe tuşları" : "Traktör tuşları"}</h3>
      {rows.map(([k, v]) => (
        <div key={k}>
          <kbd>{k}</kbd>
          <span>{v}</span>
        </div>
      ))}
      <p>Fare ile sürükle: bakış · Tekerlek / iki parmak: yakınlaştır</p>
    </div>
  );
}

function Loading() {
  const ready = useHud((s) => s.ready);
  const [gone, setGone] = useState(false);
  const t = useRef<number | null>(null);
  useEffect(() => {
    if (ready) t.current = window.setTimeout(() => setGone(true), 900);
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, [ready]);
  if (gone) return null;
  return (
    <div className="hud-loading" data-done={ready}>
      <h1>Köy Traktör &amp; Kepçe Simülatörü</h1>
      <p>Arazi, köy, traktör ve kepçe yükleniyor…</p>
      <div className="hud-spinner" />
    </div>
  );
}

function ExcControls() {
  const blade = useToggles((s) => s.bladeDown);
  const auto = useHud((s) => s.auto);
  return (
    <>
      <div className="hud-joints">
        <div className="hud-joint">
          <span>Kule</span>
          <HoldButton k="swingL" label="Kuleyi sola döndür" className="hud-btn">◀</HoldButton>
          <HoldButton k="swingR" label="Kuleyi sağa döndür" className="hud-btn">▶</HoldButton>
        </div>
        <div className="hud-joint">
          <span>Bom</span>
          <HoldButton k="boomUp" label="Bomu kaldır" className="hud-btn">▲</HoldButton>
          <HoldButton k="boomDown" label="Bomu indir" className="hud-btn">▼</HoldButton>
        </div>
        <div className="hud-joint">
          <span>Arm</span>
          <HoldButton k="stickOut" label="Armı aç" className="hud-btn">↗</HoldButton>
          <HoldButton k="stickIn" label="Armı topla" className="hud-btn">↙</HoldButton>
        </div>
        <div className="hud-joint">
          <span>Kova</span>
          <HoldButton k="bucketCurl" label="Kovayı kapat" className="hud-btn">⤵</HoldButton>
          <HoldButton k="bucketOpen" label="Kovayı aç, boşalt" className="hud-btn">⤴</HoldButton>
        </div>
        <div className="hud-joint hud-joint-wide">
          <button
            type="button"
            className="hud-btn hud-btn-dig"
            data-on={auto}
            onClick={() => {
              gameAudio.unlock();
              input.autoPressed = true;
            }}
          >
            <i>⛏</i>
            {auto ? "DURDUR" : "OTOMATİK KAZ"}
          </button>
          <button
            type="button"
            className="hud-btn"
            data-on={blade}
            onClick={() => {
              gameAudio.unlock();
              useToggles.getState().flip("bladeDown");
            }}
          >
            <i>▬</i>Bıçak
          </button>
        </div>
      </div>
      <div className="hud-steer">
        <HoldButton k="left" label="Sola dön" className="hud-pad">◀</HoldButton>
        <HoldButton k="right" label="Sağa dön" className="hud-pad">▶</HoldButton>
      </div>
      <div className="hud-pedals">
        <div className="hud-pedal-row">
          <HoldButton k="brake" label="Geri" className="hud-pedal hud-pedal-brake">GERİ</HoldButton>
          <HoldButton k="gas" label="İleri" className="hud-pedal hud-pedal-gas">İLERİ</HoldButton>
        </div>
      </div>
    </>
  );
}

export function Hud() {
  const dir = useToggles((s) => s.dir);
  const exc = useToggles((s) => s.vehicle === "excavator");
  return (
    <>
      <VehicleSwitch />
      <TopBar />
      {exc ? <ExcGauges /> : <Gauges />}
      <Minimap />
      <Prompt />
      <Help />
      {exc ? <ExcControls /> : <TractorControls dir={dir} />}
      <Loading />
    </>
  );
}

function TractorControls({ dir }: { dir: number }) {
  return (
    <>
      <div className="hud-steer">
        <HoldButton k="left" label="Sola" className="hud-pad">◀</HoldButton>
        <HoldButton k="right" label="Sağa" className="hud-pad">▶</HoldButton>
      </div>
      <div className="hud-hitch">
        <HoldButton k="liftUp" label="Kaldır" className="hud-btn hud-btn-wide">
          <i>▲</i>KALDIR
        </HoldButton>
        <HoldButton k="liftDown" label="İndir" className="hud-btn hud-btn-wide">
          <i>▼</i>İNDİR
        </HoldButton>
        <button
          type="button"
          className="hud-btn hud-btn-wide"
          data-good={useHud((s) => s.canAttach)}
          onClick={() => {
            gameAudio.unlock();
            input.attachPressed = true;
          }}
        >
          <i>🔗</i>{useHud((s) => s.attached) ? "ÇIKAR" : "TAK"}
        </button>
      </div>
      <div className="hud-pedals">
        <button type="button" className="hud-btn hud-gearbtn" data-on={dir < 0} onClick={() => { gameAudio.unlock(); toggleDirection(); }}>
          İLERİ ⇄ GERİ
        </button>
        <div className="hud-pedal-row">
          <HoldButton k="brake" label="Fren" className="hud-pedal hud-pedal-brake">FREN</HoldButton>
          <HoldButton k="gas" label="Gaz" className="hud-pedal hud-pedal-gas">GAZ</HoldButton>
        </div>
      </div>
    </>
  );
}
