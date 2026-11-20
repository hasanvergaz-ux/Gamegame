// The single live game instance, shared by the 3D stepper, HUD and minimap.
import { mask } from "./scene/shared";
import { clodSinks, createExcavator } from "./sim/excavator";
import { createSim } from "./sim/tractor";
import { bedSink, createTruck } from "./sim/truck";

export const sim = createSim(mask);
export const exc = createExcavator();
export const truck = createTruck();
// soil dropped by the excavator into the lowered bed becomes cargo
clodSinks.length = 0;
clodSinks.push((c) => bedSink(truck, c));
export const loaded = new Set<string>();
export const REQUIRED = ["terrain", "tractor", "buildings", "plants"];
