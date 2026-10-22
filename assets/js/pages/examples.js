import { loadJSON, loadText } from "../core/fetch.js";
import { getEl, setText, escapeHtml } from "../core/dom.js";
import { renderLineChart, parseCsv } from "../core/lineChart.js?v=20261022a";

setText("year", new Date().getFullYear());

const base = c => `./assets/examples/${c}`;

async function tryJSON(p) { try { return await loadJSON(p); } catch { return null; } }
async function tryText(p) { try { return await loadText(p); } catch { return null; } }

function fmtVal(v, f) {
  if (v == null || !Number.isFinite(v)) return "—";
  return (v * (f.scale || 1)).toFixed(f.digits ?? 2);
}

async function renderExample(ex, models, host) {
  const sec = document.createElement("section");
  sec.className = "ex-section";
  sec.id = ex.id;
  sec.innerHTML = `
    <h2 style="font-size:20px; margin-bottom:14px;">${escapeHtml(ex.title)}</h2>
    <div class="ex-grid">
      <div class="ex-sketch" aria-label="problem sketch"></div>
      <div class="doc"><ul>${ex.setup.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul></div>
    </div>
    <div class="ex-input"></div>
    <h3 class="h2" style="margin-top:24px;">Result</h3>
    <div class="ex-chart"></div>
    <div class="tablewrap" style="margin-top:16px;"><table class="data ex-table"></table></div>
    <div class="doc ex-notes" style="margin-top:16px;"></div>
    <div class="ex-figs"></div>`;
  host.appendChild(sec);

  const svg = await tryText(ex.sketch);
  if (svg) sec.querySelector(".ex-sketch").innerHTML = svg;

  // optional chart of the input curves (e.g. the hardening curve LS-DYNA reads)
  const ic = ex.inputChart;
  if (ic) {
    const ser = (await Promise.all(ic.series.map(async s => ({ ...s, csv: await tryText(`${base(s.case)}/${ic.file}`) }))))
      .filter(s => s.csv);
    if (ser.length) {
      const box = sec.querySelector(".ex-input");
      box.innerHTML = `<h3 class="h2" style="margin-top:24px;">${escapeHtml(ic.title)}</h3><div class="ex-inchart"></div>` +
        (ic.caption ? `<p class="small" style="margin-top:8px; max-width:80ch;">${escapeHtml(ic.caption)}</p>` : "");
      renderLineChart(box.querySelector(".ex-inchart"), ser.map(s => ({
        label: s.label, slot: s.slot,
        points: parseCsv(s.csv).map(o => [o[ic.x] * (ic.xScale || 1), o[ic.y]]),
      })), { xLabel: ic.xLabel, yLabel: ic.yLabel, refLines: ic.ref || [], height: 280, xMax: ic.xMax, yMax: ic.yMax });
    }
  }

  const runs = await Promise.all(ex.runs.map(async r => ({
    ...r,
    csv: await tryText(`${base(r.case)}/results.csv`),
    sum: await tryJSON(`${base(r.case)}/summary.json`),
    figs: await tryJSON(`${base(r.case)}/figures.json`),
  })));

  const ready = runs.filter(r => r.csv);
  const chartHost = sec.querySelector(".ex-chart");
  if (ready.length) {
    const ys = ex.chart.yScale || 1;
    renderLineChart(chartHost, ready.map(r => ({
      label: r.label, slot: r.slot, dash: !!r.test, legend: r.legend, legendLabel: r.legendLabel,
      points: parseCsv(r.csv).map(o => [o[ex.chart.x] * (ex.chart.xScale || 1), o[ex.chart.y] * ys]),
    })), { xLabel: ex.chart.xLabel, yLabel: ex.chart.yLabel, refLines: ex.chart.ref || [], height: 340 });
  } else {
    chartHost.innerHTML = `<p class="small">Results are not available yet.</p>`;
  }

  const head = `<thead><tr><th>Model</th>${ex.summary.map(f => `<th>${escapeHtml(f.label)}</th>`).join("")}<th>Files</th></tr></thead>`;
  const body = runs.map(r => {
    const m = models.find(x => x.id === r.model);
    const name = m ? `<a href="./details.html?id=${encodeURIComponent(m.id)}">MAT_${escapeHtml(m.mat)}</a> · ` : "";
    return `<tr>
      <td><span class="viz-root"><i style="display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:6px;background:var(--series-${r.slot})"></i></span>${name}${escapeHtml(r.label)}</td>
      ${ex.summary.map(f => `<td class="num">${fmtVal(r.sum?.[f.key], f)}</td>`).join("")}
      <td class="actions">${r.test
        ? `<span class="small">measured</span>${r.csv ? `<a href="${base(r.case)}/results.csv" download>csv</a>` : ""}`
        : `<a href="${base(r.case)}/case.zip" download>deck (.k, zip)</a>${r.csv ? `<a href="${base(r.case)}/results.csv" download>csv</a>` : `<span class="small">run in progress</span>`}`}</td>
    </tr>`;
  }).join("");
  sec.querySelector(".ex-table").innerHTML = head + `<tbody>${body}</tbody>`;

  if (ex.notes?.length) sec.querySelector(".ex-notes").innerHTML = `<h3>Observations</h3><ul>${ex.notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul>`;

  const figs = runs.flatMap(r => (r.figs || []).map(f => ({ ...f, src: `${base(r.case)}/${f.file}`, label: r.label })));
  sec.querySelector(".ex-figs").innerHTML = figs.map(f =>
    `<figure><img src="${f.src}" alt="${escapeHtml(f.caption || f.label)}" loading="lazy"><figcaption>${escapeHtml(f.label)} — ${escapeHtml(f.caption || "")}</figcaption></figure>`).join("");
}

(async function main() {
  const [data, mats] = await Promise.all([loadJSON("./assets/data/examples.json"), loadJSON("./assets/data/materials.json")]);
  setText("exMeta", `${data.solver} · units ${data.units}`);
  const host = getEl("examples");
  const toc = getEl("toc");
  toc.innerHTML = data.examples.map(e => `<li><a href="#${e.id}">${escapeHtml(e.title)}</a></li>`).join("");
  for (const ex of data.examples) await renderExample(ex, mats.materials || [], host);
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
})().catch(console.error);
