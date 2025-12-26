// assets/js/generators/mat159_cscm.js
// CSCM Generator (LS-DYNA *MAT_CSCM)
// Inputs (with suggested defaults): fc (MPa), dmax (mm), mid, density (ro), poisson_ratio
// Everything else is fixed to match the original Python "source of truth".

export const KEY = "mat159_cscm";
export const ID = 159;
export const NAME = "CSCM Concrete (*MAT_CSCM)";
export const CATEGORY = "Concrete";
export const UNITS = "mm-ms-g-N-MPa";

const HUB_LINE = "$ Model: Continuous Surface Cap Model (CSCM) - MAT_159";
const HUB_LINE = "$ Novozhilov, Y. V., Dmitriev, A. N., & Mikhaluk, D. S. (2022).";
const HUB_LINE = "$Precise calibration of the continuous surface cap model for";
const HUB_LINE = "$concrete simulation. Buildings, 12(5), 636.";
const HUB_LINE = "$concrete simulation. Buildings, 12(5), 636.";
const HUB_LINE = "$ DOI: https://doi.org/10.3390/buildings12050636";
const UNITS_LINE = "$ Units: mm-ms-g-N-MPa";

export const DEFAULTS = {
  fc_mpa: 30.0,
  dmax_mm: 16.0,
  mid: 1001,

  // suggested defaults (same as your Python assumptions)
  ro: 0.0023,
  poisson_ratio: 0.2,
};

export const FIELDS = [
  { key: "fc_mpa", label: "Compressive strength (fc)", unit: "MPa", type: "number", step: 0.1, min: 1, default: DEFAULTS.fc_mpa },
  { key: "dmax_mm", label: "Max aggregate size (dmax)", unit: "mm", type: "number", step: 0.1, min: 1, default: DEFAULTS.dmax_mm },
  { key: "mid", label: "Material ID (MID)", unit: "-", type: "integer", step: 1, min: 1, default: DEFAULTS.mid },

  // optional overrides (but prefilled)
  { key: "ro", label: "Density (RO)", unit: "g/mm^3", type: "number", step: 0.0001, min: 0.000001, default: DEFAULTS.ro },
  { key: "poisson_ratio", label: "Poisson ratio (ν)", unit: "-", type: "number", step: 0.01, min: 0.0, max: 0.49, default: DEFAULTS.poisson_ratio },
];

export function generate(input = {}) {
  // NOTE: if UI passes undefined / "" you should clean it there, but we also guard here.
  const inp = { ...DEFAULTS, ...normalizeInput(input) };

  const fc = mustPositive("fc_mpa", inp.fc_mpa);
  const dmax = mustPositive("dmax_mm", inp.dmax_mm);
  const mid = mustIntPositive("mid", inp.mid);

  const ro = mustPositive("ro", inp.ro);
  const poisson_ratio = mustInRange("poisson_ratio", inp.poisson_ratio, 0.0, 0.49);

  // Fixed constants from Python
  const nplot = 1;
  const incre = 0.0;
  const irate = 0;
  const erode = 1.05;
  const recov = 0.0;
  const itretrc = 0;
  const pred = 0.0;

  const w = 0.065;
  const d1 = 0.000611;
  const d2 = 0.000002;

  const B = 100.0;
  const D = 0.1;
  const PWRC = 5.0;
  const PWRT = 1.0;
  const PMOD = 0.0;

  const nh = 0.0;
  const ch = 0.0;

  // Derived parameters (ported from Python)
  const p = computeParams(fc, dmax, poisson_ratio);

  const keyword = renderKeyword(
    {
      fc, dmax, mid,
      ro, nplot, incre, irate, erode, recov, itretrc, pred,
      w, d1, d2, B, D, PWRC, PWRT, PMOD, nh, ch
    },
    p
  );

  const filename =
    `MAT_CSCM_${toFixed(fc, 1)}MPa_dmax${toFixed(dmax, 1)}mm_mid${mid}.k`;

  return { filename, keyword };
}

// ------------------------
// input normalization (supports blank strings)
function normalizeInput(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = undefined;
  }
  return out;
}

// ------------------------
// Validation helpers
// ------------------------
function mustPositive(name, x) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(`${name} must be a number`);
  if (v <= 0) throw new Error(`${name} must be > 0`);
  return v;
}
function mustIntPositive(name, x) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(`${name} must be a number`);
  const vi = Math.trunc(v);
  if (vi <= 0) throw new Error(`${name} must be an integer > 0`);
  return vi;
}
function mustInRange(name, x, lo, hi) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(`${name} must be a number`);
  if (v < lo || v > hi) throw new Error(`${name} must be in [${lo}, ${hi}]`);
  return v;
}
function toFixed(x, n) {
  const v = Number(x);
  if (!Number.isFinite(v)) return String(x);
  return v.toFixed(n);
}
function fmt10(x, decimals = 6) {
  if (Number.isInteger(x)) return String(x).padStart(10, " ");
  const v = Number(x);
  if (!Number.isFinite(v)) return String(x).padStart(10, " ");

  const av = Math.abs(v);
  if (av !== 0 && (av >= 1e6 || av < 1e-4)) {
    return v.toExponential(3).replace("e", "E").padStart(10, " ");
  }
  return v.toFixed(decimals).padStart(10, " ");
}

// ------------------------
// Ported math from Python
// ------------------------
function calculateFractureEnergy(fc_mpa, dmax_mm) {
  const delta_f = 8.0;
  const fcm = fc_mpa + delta_f;
  const fcm0 = 10.0;

  const GF0 = 0.021 + 5.357e-4 * dmax_mm;
  const GF = GF0 * Math.pow(fcm / fcm0, 0.7);

  return { GF0, GF };
}

function calculateModulus(fc_mpa, poisson_ratio) {
  const Ec0 = 21.5e3;
  const delta_f = 8.0;
  const fcm = fc_mpa + delta_f;
  const fcm0 = 10.0;

  // matches your Python (note: it used (fcm + delta_f) again)
  const E = Ec0 * Math.pow((fcm + delta_f) / fcm0, 1 / 3);
  const G = E / (2 * (1 + poisson_ratio));
  const K = E / (3 * (1 - 2 * poisson_ratio));

  return { G, K };
}

function calculateAlphaBeta(fc_mpa) {
  const alpha = 13.9846 * Math.exp(fc_mpa / 68.8756) - 13.8981;
  const theta = 0.3533 - 3.3294e-4 * fc_mpa - 3.8182e-6 * (fc_mpa ** 2);
  const lamda = 3.6657 * Math.exp(fc_mpa / 39.9363) - 4.7092;
  const beta = 18.17791 * (fc_mpa ** -1.7163);

  const alpha1 = 0.82;
  const theta1 = 0.0;
  const lamda1 = 0.24;
  const beta1 = 0.33565 * (fc_mpa ** -0.95383);

  const alpha2 = 0.76;
  const theta2 = 0.0;
  const lamda2 = 0.26;
  const beta2 = 0.285 * (fc_mpa ** -0.94843);

  return { alpha, theta, lamda, beta, alpha1, theta1, lamda1, beta1, alpha2, theta2, lamda2, beta2 };
}

function calculateAdditionalParameters(fc_mpa) {
  const fpsi = fc_mpa * 145.038;

  const eta0c = (1.2772337e-11 * (fpsi ** 2) - 1.0613722e-7 * fpsi + 3.203497e-4);
  const nc = 0.78;

  const eta0t = (8.0614774e-13 * (fc_mpa ** 2) - 9.77736719e-10 * fc_mpa + 5.0752351e-5);
  const nt = 0.48;

  const overc = 1.309663e-2 * (fc_mpa ** 2) - 0.3927659 * fc_mpa + 21.45;
  const overt = overc;

  const srate = 1.0;
  const repow = 1.0;

  return { eta0c, nc, eta0t, nt, overc, overt, srate, repow };
}

function calculateRXd(fc_mpa) {
  const R = 4.45994 * Math.exp(-fc_mpa / 11.51679) + 1.95358;
  const XD = 17.087 + 1.892 * fc_mpa;
  return { R, XD };
}

function computeParams(fc, dmax, poisson_ratio) {
  const { GF0, GF } = calculateFractureEnergy(fc, dmax);
  const { G, K } = calculateModulus(fc, poisson_ratio);
  const ab = calculateAlphaBeta(fc);
  const rx = calculateRXd(fc);
  const add = calculateAdditionalParameters(fc);

  const GFC = 100 * GF;
  const GFT = GF;
  const GFS = GF;

  return {
    GF0, GF,
    g: G, k: K,
    ...ab,
    R: rx.R,
    XD: rx.XD,
    ...add,
    GFC, GFT, GFS,
  };
}

// ------------------------
// Keyword rendering
// ------------------------
function renderKeyword(f, p) {
  const title = `MAT_CSCM_${toFixed(f.fc, 1)}MPa`;

  const lines = [];
  lines.push("$# ------------------------------------------------------------------------------");
  lines.push(UNITS_LINE);
  lines.push(HUB_LINE);
  lines.push("$# ------------------------------------------------------------------------------");
  lines.push("*KEYWORD");
  lines.push("*TITLE");
  lines.push("$#                                                                         title");
  lines.push("LS-DYNA keyword deck generated by LS DYNA Material Hub");
  lines.push("*MAT_CSCM_TITLE");
  lines.push(title);

  lines.push("$#     mid        ro     nplot     incre     irate     erode     recov   itretrc");
  lines.push(
    `${fmt10(f.mid)}` +
    `${fmt10(f.ro, 4)}` +
    `${fmt10(f.nplot)}` +
    `${fmt10(f.incre, 1)}` +
    `${fmt10(f.irate)}` +
    `${fmt10(f.erode, 2)}` +
    `${fmt10(f.recov, 1)}` +
    `${fmt10(f.itretrc)}`
  );

  lines.push("$#    pred");
  lines.push(`${fmt10(f.pred, 1)}`);

  lines.push("$#       g         k     alpha     theta     lamda      beta        nh        ch");
  lines.push(
    `${fmt10(p.g, 1)}` +
    `${fmt10(p.k, 1)}` +
    `${fmt10(p.alpha, 4)}` +
    `${fmt10(p.theta, 7)}` +
    `${fmt10(p.lamda, 5)}` +
    `${fmt10(p.beta, 7)}` +
    `${fmt10(f.nh, 1)}` +
    `${fmt10(f.ch, 1)}`
  );

  lines.push("$#  alpha1    theta1    lamda1     beta1    alpha2    theta2    lamda2     beta2");
  lines.push(
    `${fmt10(p.alpha1, 2)}` +
    `${fmt10(p.theta1, 1)}` +
    `${fmt10(p.lamda1, 2)}` +
    `${fmt10(p.beta1, 6)}` +
    `${fmt10(p.alpha2, 2)}` +
    `${fmt10(p.theta2, 1)}` +
    `${fmt10(p.lamda2, 2)}` +
    `${fmt10(p.beta2, 7)}`
  );

  lines.push("$#       r        xd         w        d1        d2");
  lines.push(
    `${fmt10(p.R, 5)}` +
    `${fmt10(p.XD, 3)}` +
    `${fmt10(f.w, 3)}` +
    `${fmt10(f.d1, 6)}` +
    `${fmt10(f.d2, 6)}`
  );

  lines.push("$#       b       gfc         d       gft       gfs      pwrc      pwrt      pmod");
  lines.push(
    `${fmt10(f.B, 1)}` +
    `${fmt10(p.GFC, 1)}` +
    `${fmt10(f.D, 1)}` +
    `${fmt10(p.GFT, 2)}` +
    `${fmt10(p.GFS, 2)}` +
    `${fmt10(f.PWRC, 1)}` +
    `${fmt10(f.PWRT, 1)}` +
    `${fmt10(f.PMOD, 1)}`
  );

  lines.push("$#   eta0c        nc     etaot        nt     overc     overt     srate     rep0w");
  lines.push(
    `${fmt10(p.eta0c, 7)}` +
    `${fmt10(p.nc, 2)}` +
    `${fmt10(p.eta0t, 7)}` +
    `${fmt10(p.nt, 2)}` +
    `${fmt10(p.overc, 5)}` +
    `${fmt10(p.overt, 5)}` +
    `${fmt10(p.srate, 1)}` +
    `${fmt10(p.repow, 1)}`
  );

  lines.push("*END");
  lines.push("");
  return lines.join("\n");
}
