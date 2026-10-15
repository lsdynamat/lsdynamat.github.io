// Small line-art illustrations: a specimen icon per category (library rows) and, on the details
// page, the specimen next to a schematic stress-strain curve typical of the model.
// Drawn with currentColor and the --accent tokens so they follow light/dark themes.

const ARROW = `<marker id="ilArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>`;

function cylinder(x, y, w, h) {
  const rx = w / 2, ry = w * 0.16;
  return `
    <path d="M${x},${y} v${h} a${rx},${ry} 0 0 0 ${w},0 v${-h}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>
    <ellipse cx="${x + rx}" cy="${y}" rx="${rx}" ry="${ry}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>`;
}

function dogbone(x, y, L, t) {
  // horizontal flat specimen (ISO 6892-1 shape): wide grips, narrower parallel length,
  // concave circular fillets tangent to the parallel length
  const g = L * 0.24, r = L * 0.07, n = t * 0.58, d = (t - n) / 2;
  const R = (r * r + d * d) / (2 * d), m = L - 2 * g - 2 * r;
  const a = (dx, dy) => `a${R.toFixed(2)},${R.toFixed(2)} 0 0 0 ${dx.toFixed(2)},${dy.toFixed(2)}`;
  return `<path d="M${x},${y} h${g} ${a(r, d)} h${m} ${a(r, -d)} h${g} v${t} h${-g} ${a(-r, -d)} h${-m} ${a(-r, d)} h${-g} z"
    fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`;
}

function block(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>`;
}

function kind(m) {
  const c = (m.category || "").toLowerCase();
  if (c.includes("concrete")) return "concrete";
  if (c.includes("rubber")) return "rubber";
  return "metal";
}

/** 28 px icon for table rows */
export function specimenIcon(m) {
  const k = kind(m);
  let body;
  if (k === "concrete") body = `${cylinder(9, 7, 10, 14)}<path d="M14,1 v3 M14,27 v-2" stroke="currentColor" stroke-width="1.5"/>`;
  else if (k === "rubber") body = `${block(8, 6, 12, 16)}<path d="M8,14 h-6 M20,14 h6" stroke="currentColor" stroke-width="1.5"/>`;
  else body = dogbone(1, 10, 26, 8);
  return `<svg class="il-icon" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">${body}</svg>`;
}

// Schematic curves in a unit box: x = strain (0..1), y = stress (0..1, compression positive for concrete)
const CURVES = {
  bilinear: { pts: [[0, 0], [0.12, 0.62], [1, 0.9]] },
  power:    { fn: x => x < 0.1 ? 6.2 * x : 0.62 + 0.36 * Math.pow((x - 0.1) / 0.9, 0.45) },
  plateau:  { pts: [[0, 0], [0.1, 0.6], [0.2, 0.6], [0.3, 0.72], [0.5, 0.86], [0.7, 0.92], [0.78, 0.9], [0.9, 0.7], [0.96, 0.45]] },
  hyper:    { fn: x => 0.95 * (0.9 * x - 1.15 * x * x + 1.1 * x * x * x) },
  soften:   { pts: [[0, 0], [0.08, 0.5], [0.16, 0.85], [0.22, 0.95], [0.27, 0.9], [0.38, 0.65], [0.55, 0.45], [0.8, 0.35], [1, 0.3]], tension: true },
  noSoften: { pts: [[0, 0], [0.1, 0.6], [0.2, 0.86], [0.35, 0.97], [1, 1.04]], tension: true },
};

const CURVE_OF = {
  mat003_plastic_kinematic: ["bilinear", "Bilinear: elastic, then constant tangent ETAN"],
  mat015_johnson_cook: ["power", "Power-law hardening A + B εpⁿ"],
  mat024_piecewise_linear_plasticity: ["plateau", "Tabulated hardening; necks after the force maximum"],
  mat027_mooney_rivlin: ["hyper", "Hyperelastic, nonlinear from the origin"],
  mat084_winfrith: ["noSoften", "No softening in compression; smeared cracks in tension"],
};

function curvePath(c, X, Y) {
  const pts = c.pts || Array.from({ length: 41 }, (_, i) => [i / 40, c.fn(i / 40)]);
  return pts.map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
}

/** 300 x 136 figure for the details page header */
export function modelFigure(m) {
  const k = kind(m);
  const [name, caption] = CURVE_OF[m.id] || (k === "concrete"
    ? ["soften", "Compression: softening after the peak. Tension: brittle, dashed"]
    : ["power", ""]);
  const c = CURVES[name];

  let spec;
  if (k === "concrete") {
    spec = `${cylinder(28, 36, 44, 64)}
      <rect x="20" y="26" width="60" height="5" rx="1" fill="currentColor" opacity=".5"/>
      <rect x="20" y="111" width="60" height="5" rx="1" fill="currentColor" opacity=".5"/>
      <path d="M50,4 v18" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>
      <path d="M50,134 v-14" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>`;
  } else if (k === "rubber") {
    spec = `${block(30, 40, 40, 56)}
      <path d="M50,38 v-30" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>
      <path d="M50,98 v30" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>`;
  } else {
    // vertical specimen 104 long (y 16..120), pulled at both grips
    spec = `<g transform="rotate(-90 50 68)">${dogbone(-2, 56, 104, 24)}</g>
      <path d="M50,16 v-14" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>
      <path d="M50,120 v14" stroke="currentColor" stroke-width="1.5" marker-end="url(#ilArr)"/>`;
  }

  const ox = 136, ow = 154, oy = 12, oh = 100;
  const yMin = c.tension ? -0.3 : 0;
  const X = x => ox + x * ow, Y = y => oy + (1 - (y - yMin) / (1.08 - yMin)) * oh;
  const tension = c.tension
    ? `<path d="M${X(0)},${Y(0)} L${X(0.025)},${Y(-0.13)} L${X(0.05)},${Y(-0.06)} L${X(0.1)},${Y(-0.02)} L${X(0.3)},${Y(0)}"
         fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 2" stroke-linejoin="round"/>
       <text x="${X(0.12)}" y="${Y(-0.2)}" class="il-s">tension</text>
       <text x="${X(0.3)}" y="${Y(1.0) - 2}" class="il-s">compression</text>`
    : "";

  return `<figure class="il-fig">
    <svg viewBox="0 0 300 136" width="300" height="136" role="img" aria-label="Test specimen and schematic stress-strain curve">
      <defs>${ARROW}</defs>
      ${spec}
      <path d="M${ox},${oy - 4} V${oy + oh} H${ox + ow + 6}" fill="none" stroke="currentColor" stroke-width="1" opacity=".55"/>
      ${c.tension ? `<path d="M${ox},${Y(0)} H${ox + ow}" stroke="currentColor" stroke-width=".75" opacity=".35"/>` : ""}
      <path d="${curvePath(c, X, Y)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${tension}
      <text x="${ox + ow + 6}" y="${oy + oh + 14}" text-anchor="end" class="il-t">ε</text>
      <text x="${ox - 6}" y="${oy + 6}" text-anchor="end" class="il-t">σ</text>
    </svg>
    ${caption ? `<figcaption>${caption}</figcaption>` : ""}
  </figure>`;
}
