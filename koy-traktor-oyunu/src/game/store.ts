import { create } from "zustand";

export type CamMode = 0 | 1 | 2; // 0 = chase, 1 = cab, 2 = rear hitch view / bucket view
export type Vehicle = "tractor" | "excavator";

export type Toggles = {
  cam: CamMode;
  head: boolean;
  work: boolean;
  beacon: boolean;
  engine: boolean;
  night: boolean;
  hood: boolean;
  dir: 1 | -1;
  help: boolean;
  quality: "high" | "low";
  vehicle: Vehicle;
  /** excavator ignition (the tractor's is `engine`) */
  excEngine: boolean;
  bladeDown: boolean;
};

type FlipKey = "head" | "work" | "beacon" | "engine" | "excEngine" | "bladeDown" | "night" | "hood" | "help";
type ToggleStore = Toggles & { set: (p: Partial<Toggles>) => void; flip: (k: FlipKey) => void };

function initialQuality(): "high" | "low" {
  if (typeof window === "undefined") return "high";
  const q = new URLSearchParams(window.location.search).get("q");
  if (q === "low" || q === "high") return q;
  return window.matchMedia?.("(pointer: coarse)").matches ? "low" : "high";
}

function initialVehicle(): Vehicle {
  if (typeof window === "undefined") return "tractor";
  return new URLSearchParams(window.location.search).get("arac") === "kepce" ? "excavator" : "tractor";
}

export const useToggles = create<ToggleStore>((set) => ({
  cam: 0,
  head: false,
  work: false,
  beacon: false,
  engine: false,
  night: false,
  hood: false,
  dir: 1,
  help: false,
  quality: initialQuality(),
  vehicle: initialVehicle(),
  excEngine: false,
  bladeDown: false,
  set: (p) => set(p),
  flip: (k) => set((s) => ({ [k]: !s[k] }) as Partial<Toggles>),
}));

export type Hud = {
  ready: boolean;
  speed: number;
  rpm: number;
  lift: number;
  attached: boolean;
  working: boolean;
  canAttach: boolean;
  attachDist: number;
  area: number;
  surface: string;
  running: boolean;
  toast: string;
  toastT: number;
  // excavator
  bucket: number;
  dug: number;
  phase: string;
  auto: boolean;
  inSoil: boolean;
};

export const useHud = create<Hud>(() => ({
  ready: false,
  speed: 0,
  rpm: 0,
  lift: 1,
  attached: false,
  working: false,
  canAttach: false,
  attachDist: 99,
  area: 0,
  surface: "",
  running: false,
  toast: "",
  toastT: 0,
  bucket: 0,
  dug: 0,
  phase: "",
  auto: false,
  inSoil: false,
}));

export const toast = (msg: string) => useHud.setState({ toast: msg, toastT: Date.now() });
