// Minimal multi-series line chart (inline SVG) with legend, end labels and a hover crosshair.
// Series colours come from CSS custom properties --series-1..8 (see styles.css), assigned by the
// series' fixed slot so colour follows the entity, not its rank.
import { escapeHtml } from "./dom.js";

const NS = "http://www.w3.org/2000/svg";

function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => span / s <= n) || 10 * mag;
  const t = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * span; v += step) t.push(+v.toPrecision(12));
  return t;
}

function fmt(v) {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1000) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  if (a >= 0.01) return v.toFixed(3);
  return v.toExponential(1);
}

/**
 * series: [{ label, slot, points: [[x, y], ...], dash?, legend? }]  (dash: dashed line, e.g. measured data;
 *   legend: false hides a repeat of the same entity, e.g. replicate tests)
 * opts: { xLabel, yLabel, height, xMax, yMax, refLines: [{ y, label }] }
 */
export function renderLineChart(host, series, opts = {}) {
  host.innerHTML = "";
  host.classList.add("viz-root");

  const legend = document.createElement("div");
  legend.className = "viz-legend";
  legend.innerHTML = series.filter(s => s.legend !== false).map(s =>
    `<span class="viz-key"><i style="${s.dash ? `background:none;border-top:2px dashed var(--series-${s.slot});height:0` : `background:var(--series-${s.slot})`}"></i>${escapeHtml(s.legendLabel || s.label)}</span>`).join("");
  host.appendChild(legend);

  const wrap = document.createElement("div");
  wrap.className = "viz-plot";
  host.appendChild(wrap);

  const W = Math.max(320, wrap.clientWidth || host.clientWidth || 640);
  const H = opts.height || 320;
  const m = { l: 56, r: 16, t: 12, b: 44 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;

  const all = series.flatMap(s => s.points);
  const xMax = opts.xMax ?? Math.max(...all.map(p => p[0]));
  const yMax = opts.yMax ?? Math.max(...all.map(p => p[1])) * 1.08;
  const xMin = 0, yMin = Math.min(0, ...all.map(p => p[1]));
  const X = x => m.l + (x - xMin) / (xMax - xMin) * pw;
  const Y = y => m.t + ph - (y - yMin) / (yMax - yMin) * ph;

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", `${opts.yLabel || ""} versus ${opts.xLabel || ""}`);
  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.appendChild(e);
    return e;
  };

  // grid + axes
  for (const t of niceTicks(yMin, yMax)) {
    el("line", { x1: m.l, x2: m.l + pw, y1: Y(t), y2: Y(t), class: "viz-grid" });
    el("text", { x: m.l - 8, y: Y(t) + 4, class: "viz-tick", "text-anchor": "end" }).textContent = fmt(t);
  }
  for (const t of niceTicks(xMin, xMax)) {
    el("line", { x1: X(t), x2: X(t), y1: m.t + ph, y2: m.t + ph + 4, class: "viz-axis" });
    el("text", { x: X(t), y: m.t + ph + 18, class: "viz-tick", "text-anchor": "middle" }).textContent = fmt(t);
  }
  el("line", { x1: m.l, x2: m.l + pw, y1: Y(Math.max(0, yMin)), y2: Y(Math.max(0, yMin)), class: "viz-axis" });
  el("text", { x: m.l + pw / 2, y: H - 6, class: "viz-title", "text-anchor": "middle" }).textContent = opts.xLabel || "";
  const yl = el("text", { x: 14, y: m.t + ph / 2, class: "viz-title", "text-anchor": "middle",
    transform: `rotate(-90 14 ${m.t + ph / 2})` });
  yl.textContent = opts.yLabel || "";

  for (const r of opts.refLines || []) {
    el("line", { x1: m.l, x2: m.l + pw, y1: Y(r.y), y2: Y(r.y), class: "viz-ref" });
    el("text", { x: m.l + 6, y: Y(r.y) - 5, class: "viz-tick", "text-anchor": "start" }).textContent = r.label;
  }

  // lines
  for (const s of series) {
    const d = s.points.filter(p => p[0] <= xMax).map((p, i) => `${i ? "L" : "M"}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join("");
    el("path", { d, class: "viz-line", style: `stroke:var(--series-${s.slot})${s.dash ? ";stroke-dasharray:5 3" : ""}` });
  }

  // hover layer
  const cross = el("line", { y1: m.t, y2: m.t + ph, class: "viz-cross", visibility: "hidden" });
  const dots = series.map(s => el("circle", { r: 4, class: "viz-dot", style: `fill:var(--series-${s.slot})`, visibility: "hidden" }));
  const tip = document.createElement("div");
  tip.className = "viz-tip";
  tip.hidden = true;
  wrap.appendChild(svg);
  wrap.appendChild(tip);

  const at = (pts, x) => {
    if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; (pts[mid][0] <= x ? lo = mid : hi = mid); }
    const [x0, y0] = pts[lo], [x1, y1] = pts[hi];
    return x1 > x0 ? y0 + (y1 - y0) * (x - x0) / (x1 - x0) : y0;
  };
  const hit = el("rect", { x: m.l, y: m.t, width: pw, height: ph, fill: "transparent" });
  const move = ev => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * (W / r.width);
    const x = xMin + (px - m.l) / pw * (xMax - xMin);
    if (x < xMin || x > xMax) return;
    cross.setAttribute("x1", X(x)); cross.setAttribute("x2", X(x)); cross.setAttribute("visibility", "visible");
    const rows = series.map((s, i) => {
      const y = at(s.points, x);
      if (y == null) { dots[i].setAttribute("visibility", "hidden"); return ""; }
      dots[i].setAttribute("cx", X(x)); dots[i].setAttribute("cy", Y(y)); dots[i].setAttribute("visibility", "visible");
      return `<div><i style="background:var(--series-${s.slot})"></i>${escapeHtml(s.label)}<b>${fmt(y)}</b></div>`;
    }).join("");
    tip.innerHTML = `<div class="viz-tip-h">${escapeHtml(opts.xLabel || "x")} = ${fmt(x)}</div>${rows}`;
    tip.hidden = false;
    const left = (X(x) / W) * r.width;
    tip.style.left = `${Math.min(left + 12, r.width - tip.offsetWidth - 4)}px`;
    tip.style.top = `8px`;
  };
  const leave = () => {
    cross.setAttribute("visibility", "hidden");
    dots.forEach(d => d.setAttribute("visibility", "hidden"));
    tip.hidden = true;
  };
  hit.addEventListener("pointermove", move);
  hit.addEventListener("pointerleave", leave);
}

export function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const keys = head.split(",");
  return lines.map(l => {
    const v = l.split(",").map(Number);
    return Object.fromEntries(keys.map((k, i) => [k, v[i]]));
  });
}
