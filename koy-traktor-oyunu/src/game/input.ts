// Held input state written by keyboard and touch handlers, read once per frame by the stepper.
import { gameAudio } from "./audio/GameAudio";
import { useToggles } from "./store";

export const input = {
  gas: false,
  brake: false,
  left: false,
  right: false,
  liftUp: false,
  liftDown: false,
  horn: false,
  attachPressed: false,
  resetPressed: false,
  // excavator levers (touch buttons)
  swingL: false,
  swingR: false,
  boomUp: false,
  boomDown: false,
  stickOut: false,
  stickIn: false,
  bucketOpen: false,
  bucketCurl: false,
  autoPressed: false,
};
export type HeldKey = { [K in keyof typeof input]: (typeof input)[K] extends boolean ? K : never }[keyof typeof input];

/** Camera orbit / zoom controlled by pointer drag, pinch and wheel. */
export const camCtl = { yaw: 0, pitch: 0, dist: 11, fov: 70 };

const keys = new Set<string>();
export const keyHeld = (code: string) => keys.has(code);

export function cycleCamera() {
  const s = useToggles.getState();
  s.set({ cam: ((s.cam + 1) % 3) as 0 | 1 | 2 });
  camCtl.yaw = 0;
  camCtl.pitch = 0;
}

/** Jump between the tractor and the mini excavator. */
export function switchVehicle() {
  const s = useToggles.getState();
  const next = s.vehicle === "tractor" ? "excavator" : "tractor";
  s.set({ vehicle: next, cam: 0 });
  camCtl.yaw = 0;
  camCtl.pitch = next === "excavator" ? 0.12 : 0;
  camCtl.dist = next === "excavator" ? 12 : 11;
  for (const k of Object.keys(input) as (keyof typeof input)[]) input[k] = false;
}

/** Ignition of whichever vehicle you are in. */
export function toggleEngine() {
  const s = useToggles.getState();
  s.flip(s.vehicle === "excavator" ? "excEngine" : "engine");
}

export function toggleDirection() {
  const s = useToggles.getState();
  s.set({ dir: s.dir > 0 ? -1 : 1 });
}

export function setHorn(on: boolean) {
  input.horn = on;
  if (on) gameAudio.hornOn();
  else gameAudio.hornOff();
}

export function bindKeyboard() {
  const down = (e: KeyboardEvent) => {
    if (e.repeat) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      return;
    }
    gameAudio.unlock();
    keys.add(e.code);
    const t = useToggles.getState();
    const exc = t.vehicle === "excavator";
    switch (e.code) {
      case "KeyK": toggleEngine(); break;
      case "KeyV": switchVehicle(); break;
      case "KeyG": if (exc) t.flip("bladeDown"); break;
      case "Space": if (exc) input.autoPressed = true; break;
      case "KeyL": t.flip("head"); break;
      case "KeyJ": t.flip("work"); break;
      case "KeyB": t.flip("beacon"); break;
      case "KeyN": t.flip("night"); break;
      case "KeyO": t.flip("hood"); break;
      case "KeyC": cycleCamera(); break;
      case "KeyR": if (!exc) toggleDirection(); break;
      case "KeyT": if (!exc) input.attachPressed = true; break;
      case "KeyH": setHorn(true); break;
      case "F1": e.preventDefault(); t.flip("help"); break;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === "KeyH") setHorn(false);
  };
  const blur = () => {
    keys.clear();
    setHorn(false);
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

/** Merge keyboard and touch into one set of axes. */
export function readAxes() {
  const gas = input.gas || keys.has("KeyW") || keys.has("ArrowUp");
  const brake = input.brake || keys.has("KeyS") || keys.has("ArrowDown") || keys.has("Space");
  const left = input.left || keys.has("KeyA") || keys.has("ArrowLeft");
  const right = input.right || keys.has("KeyD") || keys.has("ArrowRight");
  const up = input.liftUp || keys.has("KeyE");
  const dn = input.liftDown || keys.has("KeyQ");
  return {
    throttle: gas ? 1 : 0,
    brake: brake ? 1 : 0,
    steer: (right ? 1 : 0) - (left ? 1 : 0),
    liftCmd: (up ? 1 : 0) - (dn ? 1 : 0),
  };
}

const k = (c: string) => (keys.has(c) ? 1 : 0);
const b = (v: boolean) => (v ? 1 : 0);

/** Excavator levers: tracks on WASD, house on ←→, boom ↑↓, stick E/Q, bucket Z/X. */
export function readExcAxes() {
  return {
    drive: Math.max(b(input.gas), k("KeyW")) - Math.max(b(input.brake), k("KeyS")),
    turn: Math.max(b(input.right), k("KeyD")) - Math.max(b(input.left), k("KeyA")),
    swing: Math.max(b(input.swingL), k("ArrowLeft")) - Math.max(b(input.swingR), k("ArrowRight")),
    boom: Math.max(b(input.boomUp), k("ArrowUp")) - Math.max(b(input.boomDown), k("ArrowDown")),
    stick: Math.max(b(input.stickOut), k("KeyE")) - Math.max(b(input.stickIn), k("KeyQ")),
    bucket: Math.max(b(input.bucketOpen), k("KeyX")) - Math.max(b(input.bucketCurl), k("KeyZ")),
  };
}
