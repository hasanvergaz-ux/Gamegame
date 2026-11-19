// The single live game instance, shared by the 3D stepper, HUD and minimap.
import { mask } from "./scene/shared";
import { createExcavator } from "./sim/excavator";
import { createSim } from "./sim/tractor";

export const sim = createSim(mask);
export const exc = createExcavator();
export const loaded = new Set<string>();
export const REQUIRED = ["terrain", "tractor", "buildings", "plants"];
