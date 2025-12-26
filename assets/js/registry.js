import { genMAT072R3_KCC_REL3 } from "./generators/072r3_kcc_damage_rel3.js";
import { genMAT084_WINFRITH } from "./generators/084_winfrith_concrete.js";
import { genMAT159_CSCM } from "./generators/159_cscm_concrete.js";

export const GENERATORS = Object.freeze({
  mat072r3_kcc_rel3: genMAT072R3_KCC_REL3,
  mat084_winfrith: genMAT084_WINFRITH,
  mat159_cscm: genMAT159_CSCM
});

export function getGenerator(key) {
  return GENERATORS[key] || null;
}
