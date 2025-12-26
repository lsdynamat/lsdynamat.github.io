// assets/js/generators/index.js
import * as mat015 from "./mat015_johnson_cook.js";
import * as mat027 from "./mat027_mooney_rivlin.js";
import * as mat084 from "./mat084_winfrith.js";
import * as mat159 from "./mat159_cscm.js";

export const GENERATORS = {
  mat015_johnson_cook: mat015,
  mat027_mooney_rivlin: mat027,
  mat084_winfrith: mat084,
  mat159_cscm: mat159,
};

// IMPORTANT: for dropdown order + stable sorting
export const GENERATOR_KEYS = Object.keys(GENERATORS).sort((a, b) => a.localeCompare(b));

export function getGenerator(key) {
  return GENERATORS[key] || null;
}
