// Consistent unit systems for LS-DYNA and a converter for generated keyword cards.
// Every generator computes and writes its card in the base system mm · ms · g · N · MPa.
// convertDeck() rescales each numeric field by the dimension listed in the generator's UNIT_SPEC.

// L, T, M: size of the base unit (1 mm, 1 ms, 1 g) expressed in the target system's units
export const UNIT_SYSTEMS = [
  { id: "mm-ms-g",  label: "mm · ms · g · N · MPa",            L: 1,        T: 1,    M: 1,                 time: "ms", conm: -3 },
  { id: "mm-ms-kg", label: "mm · ms · kg · kN · GPa",          L: 1,        T: 1,    M: 1e-3,              time: "ms", conm: -5 },
  { id: "mm-s-t",   label: "mm · s · t · N · MPa",             L: 1,        T: 1e-3, M: 1e-6,              time: "s",  conm: -4 },
  { id: "m-s-kg",   label: "m · s · kg · N · Pa (SI)",         L: 1e-3,     T: 1e-3, M: 1e-3,              time: "s",  conm: 1, conl: 1, cont: 1 },
  { id: "cm-us-g",  label: "cm · µs · g · 10⁷ N · Mbar",       L: 0.1,      T: 1e3,  M: 1,                 time: "µs", conm: -2 },
  { id: "in-s-lbf", label: "in · s · lbf·s²/in · lbf · psi",   L: 1 / 25.4, T: 1e-3, M: 1e-3 / 175.126835, time: "s",  conm: -1 },
];
export const BASE_UNITS = UNIT_SYSTEMS[0];

export function getUnitSystem(id) {
  return UNIT_SYSTEMS.find(s => s.id === id) || BASE_UNITS;
}

// Dimensions as exponents of [mass, length, time]
const DIMS = {
  "-": null,
  L: [0, 1, 0],        // length
  T: [0, 0, 1],        // time
  R: [0, 0, -1],       // rate (1/time)
  D: [1, -3, 0],       // density
  S: [1, -1, -2],      // stress, pressure, modulus
  "1/S": [-1, 1, 2],   // compliance-like coefficients
  "1/S2": [-2, 2, 4],
  "1/L": [0, -1, 0],
  G: [1, 0, -2],       // energy per area = force per length (fracture energy)
  CP: [0, 2, -2],      // specific heat (energy / mass / K)
};

function factor(sys, exps) {
  const [a, b, c] = exps;
  return Math.pow(sys.M, a) * Math.pow(sys.L, b) * Math.pow(sys.T, c);
}

/** Shortest representation of v that fits in w characters, keeping up to 9 significant digits. */
export function fitField(v, w) {
  if (v === 0) return "0.0".padStart(w);
  const expForm = (p) => {
    let [m, e] = v.toExponential(p - 1).split("e");
    if (m.includes(".")) m = m.replace(/0+$/, "").replace(/\.$/, ".0");
    const s = `${m}E${e}`;
    return s.length > w ? s.replace("E+", "E") : s;
  };
  const fixedForm = (p) => {
    const s = v.toPrecision(p);
    if (s.includes("e")) return null;
    return s.includes(".") ? s.replace(/0+$/, "") : s + ".";
  };
  // most significant digits first; at equal precision prefer plain decimals
  for (let p = Math.min(9, w - 1); p >= 1; p--) {
    for (const s of [fixedForm(p), expForm(p)]) {
      if (s && s.length <= w) return s.padStart(w);
    }
  }
  return expForm(1).padStart(w);
}

function isNumeric(s) {
  return s !== "" && Number.isFinite(Number(s));
}

function convertRow(line, row, sys) {
  const w = row.w || 10;
  const dims = row.d || row;
  const n = Math.ceil(line.length / w);
  const raw = [];
  for (let i = 0; i < n; i++) raw.push(line.slice(i * w, (i + 1) * w));
  const vals = raw.map(s => Number(s.trim()));

  return raw.map((chunk, i) => {
    let d = typeof dims === "string" ? dims : dims[i];
    if (typeof d === "function") d = d(vals, sys);
    const txt = chunk.trim();
    if (d === undefined || d === "-" || !isNumeric(txt)) return chunk;
    // keep one blank column in front of every converted value so adjacent fields stay readable
    const fit = (x) => " " + fitField(x, w - 1);
    if (d === "CONM") return fit(sys.conm);
    if (d === "CONL") return sys.conm > 0 ? fit(sys.conl) : chunk;
    if (d === "CONT") return sys.conm > 0 ? fit(sys.cont) : chunk;
    const exps = Array.isArray(d) ? d : DIMS[d];
    if (!exps) return chunk;
    const v = Number(txt);
    return v === 0 ? chunk.padStart(w) : fit(v * factor(sys, exps));
  }).join("");
}

/**
 * Convert a keyword deck written in mm · ms · g · N · MPa to another unit system.
 * spec: { "<KEYWORD without _TITLE>": { rows: [row, ...], repeat?: row } } where a row is an
 * array of dimension codes (10-character fields) or { w, d } for other field widths, and
 * spec.curve = [xDim, yDim] for *DEFINE_CURVE points (20-character fields).
 */
export function convertDeck(text, spec, sys) {
  if (!sys || sys.id === BASE_UNITS.id) return text;
  if (!spec) throw new Error("Unit conversion is not available for this model yet");

  const curveSpec = spec.curve
    ? { rows: [["-", "-", "-", "-", "-", "-", "-", "-"]], repeat: { w: 20, d: spec.curve } }
    : null;

  let block = null, row = 0, needTitle = false;
  return text.split("\n").map(line => {
    if (line.startsWith("*")) {
      const kw = line.trim().toUpperCase();
      needTitle = kw === "*TITLE" || kw.endsWith("_TITLE");
      const base = kw.replace(/_TITLE$/, "");
      block = base === "*DEFINE_CURVE" ? curveSpec : spec[base] || null;
      row = 0;
      return line;
    }
    if (line.startsWith("$")) {
      if (/^\$ Units:/.test(line)) return `$ Units: ${sys.label} (converted from mm-ms-g-N-MPa; values quoted in comments keep their stated units)`;
      if (/^\$ abscissa/.test(line)) return line.replace(/1\/ms/g, `1/${sys.time}`);
      return line;
    }
    if (needTitle) { needTitle = false; return line; }
    if (!block || line.trim() === "") return line;
    const r = block.rows[row] || block.repeat;
    row++;
    return r ? convertRow(line, r, sys) : line;
  }).join("\n");
}
