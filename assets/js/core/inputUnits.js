// Units the user may type each generator input in (like the unit drop-downs in ANSYS).
// Keyed by the input's base unit in materials.json; every entry is [label, factor, offset] with
// base value = typed value * factor + offset. The generators always receive base units
// (mm, ms, g, N, MPa, K, 1/s).

const DIMS = {
  stress: { base: "MPa", units: [["MPa", 1], ["GPa", 1e3], ["kPa", 1e-3], ["Pa", 1e-6], ["psi", 0.00689476], ["ksi", 6.89476]] },
  density: { base: "g/mm³", units: [["g/mm³", 1], ["kg/m³", 1e-6], ["g/cm³", 1e-3], ["t/m³", 1e-3], ["t/mm³", 1e6], ["lb/in³", 0.0276799]] },
  length: { base: "mm", units: [["mm", 1], ["cm", 10], ["m", 1000], ["in", 25.4]] },
  energyArea: { base: "N/mm", units: [["N/mm", 1], ["N/m", 1e-3], ["J/m²", 1e-3], ["kJ/m²", 1], ["lbf/in", 0.175127]] },
  rate: { base: "1/s", units: [["1/s", 1], ["1/ms", 1000], ["1/min", 1 / 60]] },
  temperature: { base: "K", units: [["K", 1, 0], ["°C", 1, 273.15], ["°F", 5 / 9, 459.67 * 5 / 9]] },
  specificHeat: { base: "J/(kg·K)", units: [["J/(kg·K)", 1], ["kJ/(kg·K)", 1000], ["BTU/(lb·°F)", 4186.8]] },
  percent: { base: "%", units: [["%", 1], ["fraction", 100]] },
};

const ALIAS = {
  "MPa": "stress",
  "g/mm^3": "density", "g/mm³": "density",
  "mm": "length",
  "N/mm": "energyArea",
  "1/s": "rate",
  "K": "temperature",
  "J/(kg·K)": "specificHeat",
  "%": "percent",
};

export function unitDim(unit){ return ALIAS[unit] || null; }
export function unitOptions(unit){ const d = unitDim(unit); return d ? DIMS[d].units : null; }

function find(unit, label){
  const opts = unitOptions(unit) || [];
  return opts.find(o => o[0] === label) || opts[0];
}

export function toBase(v, unit, label){
  const o = find(unit, label);
  return o ? v * o[1] + (o[2] || 0) : v;
}

export function fromBase(v, unit, label){
  const o = find(unit, label);
  return o ? (v - (o[2] || 0)) / o[1] : v;
}

// Short, clean number for the input box (6 significant digits, no trailing zeros).
export function fmtNum(x){
  if (!Number.isFinite(x)) return "";
  if (x !== 0 && (Math.abs(x) >= 1e7 || Math.abs(x) < 1e-5)) return x.toExponential(5).replace(/\.?0+e/, "e");
  return String(parseFloat(x.toPrecision(6)));
}

const KEY = (dim) => `lsdynamat.unit.${dim}`;
export function preferredUnit(unit){
  const d = unitDim(unit);
  if (!d) return unit;
  try {
    const s = localStorage.getItem(KEY(d));
    if (s && DIMS[d].units.some(o => o[0] === s)) return s;
  } catch {}
  return DIMS[d].base;
}
export function rememberUnit(unit, label){
  const d = unitDim(unit);
  if (!d) return;
  try { localStorage.setItem(KEY(d), label); } catch {}
}
