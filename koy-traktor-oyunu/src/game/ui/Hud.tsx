import { useEffect, useRef, useState, type ReactNode } from "react";
import { gameAudio } from "../audio/GameAudio";
import { cycleCamera, input, setHorn, toggleDirection } from "../input";
import { useHud, useToggles } from "../store";
import { Minimap } from "./Minimap";

type HeldKey = "gas" | "brake" | "left" | "right" | "liftUp" | "liftDown";

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

function TopBar() {
  const t = useToggles();
  const [hornOn, setHornOn] = useState(false);
  const camNames = ["Dış", "Kabin", "Arka"];
  return (
    <div className="hud-bar">
      <Toggle on={t.cam !== 0} onClick={cycleCamera} icon="📷" label={camNames[t.cam]!} />
      <Toggle on={t.engine} onClick={() => t.flip("engine")} icon="🔑" label="Kontak" />
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
      <Toggle on={t.hood} onClick={() => t.flip("hood")} icon="🔧" label="Kaput" />
      <Toggle on={t.quality === "high"} onClick={() => t.set({ quality: t.quality === "high" ? "low" : "high" })} icon="✨" label={t.quality === "high" ? "Yüksek" : "Düşük"} />
      <Toggle onClick={() => (input.resetPressed = true)} icon="↺" label="Başa dön" />
      <Toggle on={t.help} onClick={() => t.flip("help")} icon="?" label="Tuşlar" />
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(id);
  }, []);
  let msg = "";
  if (now - h.toastT < 3500 && h.toast) msg = h.toast;
  else if (!h.running && h.ready) msg = "Önce 🔑 Kontak'a bas (K)";
  else if (h.canAttach) msg = "🔗 TAK düğmesine bas (T) — kazayağı hazır";
  else if (!h.attached && h.attachDist < 8) msg = `Geri vitese al (R) ve kazayağına geri geri yaklaş · ${h.attachDist.toFixed(1)} m`;
  else if (h.attached && h.lift > 0.5 && !h.working) msg = "▼ İNDİR ile kazayağını toprağa daldır";
  if (!msg) return null;
  return <div className="hud-prompt" data-good={h.canAttach}>{msg}</div>;
}

function Help() {
  const help = useToggles((s) => s.help);
  if (!help) return null;
  const rows: [string, string][] = [
    ["W / ↑", "Gaz"], ["S / ↓ / Boşluk", "Fren"], ["A D / ← →", "Direksiyon"], ["R", "İleri ⇄ Geri"],
    ["K", "Kontak"], ["E", "Kaldırıcı yukarı"], ["Q", "Kaldırıcı aşağı"], ["T", "Aleti tak / çıkar"],
    ["H", "Korna"], ["L", "Far"], ["J", "İş lambası"], ["B", "Çakar"], ["N", "Gece"], ["C", "Kamera"], ["O", "Kaput"],
  ];
  return (
    <div className="hud-panel hud-help" onClick={() => useToggles.getState().flip("help")}>
      <h3>Tuşlar</h3>
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
      <h1>Köy Traktör Simülatörü</h1>
      <p>Arazi, köy ve traktör yükleniyor…</p>
      <div className="hud-spinner" />
    </div>
  );
}

export function Hud() {
  const dir = useToggles((s) => s.dir);
  return (
    <>
      <TopBar />
      <Gauges />
      <Minimap />
      <Prompt />
      <Help />
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
      <Loading />
    </>
  );
}
