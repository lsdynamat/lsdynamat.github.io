// assets/js/generators/index.js

import * as mat003 from "./mat003_plastic_kinematic.js";
import * as mat015 from "./mat015_johnson_cook.js";
import * as mat024 from "./mat024_piecewise_linear_plasticity.js";
import * as mat027 from "./mat027_mooney_rivlin.js";
import * as mat072 from "./mat072_kcc_rel3.js";
import * as mat084 from "./mat084_winfrith.js";
import * as mat159 from "./mat159_cscm.js";
import * as mat273 from "./mat273_cdp.js";

export const GENERATORS = {
  mat003_plastic_kinematic: mat003,
  mat015_johnson_cook: mat015,
  mat024_piecewise_linear_plasticity: mat024,
  mat027_mooney_rivlin: mat027,
  mat072_kcc_rel3: mat072,
  mat084_winfrith: mat084,
  mat159_cscm: mat159,
  mat273_cdp: mat273,
};

// IMPORTANT: for dropdown order + stable sorting
export const GENERATOR_KEYS = Object.keys(GENERATORS).sort((a, b) => a.localeCompare(b));

export function getGenerator(key) {
  return GENERATORS[key] || null;
}
