import { loadJSON, loadText } from "../core/fetch.js";
import { getEl, setText, escapeHtml, qsa } from "../core/dom.js";
import { mdToHtml } from "../core/md.js?v=20261016b";
import { openSamples } from "../core/sampleViewer.js";
import { modelFigure } from "../core/illus.js?v=20261016b";

setText("year", new Date().getFullYear());

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function setupTabs(){
  const tabs = qsa(".tab");
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      tabs.forEach(x=>x.classList.remove("active"));
      t.classList.add("active");

      const key = t.dataset.tab;
      qsa(".tabpanel").forEach(p=>p.classList.add("hidden"));
      const panel = getEl(`tab-${key}`);
      if (panel) panel.classList.remove("hidden");
    });
  });
}

function renderInputs(inputs){
  const box = getEl("inputsBox");
  const rows = (inputs || []).map(inp => `
    <tr>
      <td class="mat">${escapeHtml(inp.key)}</td>
      <td><div class="name">${escapeHtml(inp.label || "")}</div>${inp.hint ? `<div class="desc">${escapeHtml(inp.hint)}</div>` : ""}</td>
      <td class="num">${escapeHtml(inp.default === "" ? "auto" : inp.default)}</td>
      <td class="num">${escapeHtml(inp.unit && inp.unit !== "-" ? inp.unit : "")}</td>
    </tr>`).join("");
  box.innerHTML = `
    <div class="tablewrap"><table class="data">
      <thead><tr><th>Key</th><th>Parameter</th><th>Default</th><th>Unit</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4" class="small">No inputs.</td></tr>`}</tbody>
    </table></div>`;
}

function renderUpdates(changelog, modelId){
  const box = getEl("updatesBox");
  box.innerHTML = "";

  const rows = (changelog || []).filter(x => x.id === modelId)
    .sort((a,b)=> (b.date||"").localeCompare(a.date||""));

  if (!rows.length){
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `<div class="item-meta">No updates logged for this model yet.</div>`;
    box.appendChild(div);
    return;
  }

  rows.forEach(u=>{
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(u.date)} <span class="tag info">v${escapeHtml(u.version || "—")}</span></div>
      <div class="item-meta">${escapeHtml(u.change || "")}</div>
    `;
    box.appendChild(div);
  });
}

function renderSamplesTab(m){
  const box = getEl("samplesBox");
  if (!box) return;

  const samples = Array.isArray(m.samples) ? m.samples : [];
  box.innerHTML = "";

  if (!samples.length){
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `<div class="item-meta">No keyword samples available yet.</div>`;
    box.appendChild(div);
    return;
  }

  samples.forEach(s => {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `
      <div class="row between wrapline">
        <div>
          <div class="item-title">
            ${escapeHtml(s.title || s.id || "Sample")}
            <span class="tag info">${escapeHtml(s.id || "sample")}</span>
          </div>
          <div class="item-meta">
            ${escapeHtml(s.source || "—")}
            ${s.updatedAt ? ` • Updated ${escapeHtml(s.updatedAt)}` : ""}
          </div>
          <div class="tagrow" style="margin-top:8px;">
            ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <div class="row gap">
          <button class="btn primary" data-view="1">View</button>
        </div>
      </div>
    `;
    div.querySelector('button[data-view="1"]').onclick = async () => {
      await openSamples({
        modelId: m.id,
        modelTitle: `${m.name} (MAT_${m.mat})`,
        samples: [s]
      });
    };
    box.appendChild(div);
  });

  const openAll = document.createElement("div");
  openAll.className = "rowitem";
  openAll.innerHTML = `
    <div class="row between wrapline">
      <div class="item-meta">Open sample chooser</div>
      <button class="btn" id="btnOpenAll">Open</button>
    </div>
  `;
  openAll.querySelector("#btnOpenAll").onclick = async () => {
    await openSamples({
      modelId: m.id,
      modelTitle: `${m.name} (MAT_${m.mat})`,
      samples: samples
    });
  };
  box.appendChild(openAll);
}

/** -------- DOC RENDERER (MD + PDF) -------- */
function isPdf(url){
  return /\.pdf(\?|#|$)/i.test(url || "");
}
function isMd(url){
  return /\.md(\?|#|$)/i.test(url || "");
}

/**
 * Convert a possibly relative URL (like "./assets/docs/a.pdf") into a safe URL
 * relative to the current page URL.
 */
function resolveUrl(url){
  try{
    return new URL(url, location.href).toString();
  }catch{
    return url;
  }
}

async function renderDoc(docPath){
  const docBox = getEl("docBox");
  if (!docBox) return;

  if (!docPath){
    docBox.textContent = "No documentation provided for this model.";
    return;
  }

  const docUrl = resolveUrl(docPath);

  try{
    if (isPdf(docUrl)){
      docBox.innerHTML = `
        <div class="row between wrapline" style="margin-bottom:10px;">
          <div class="item-meta">PDF document</div>
          <a class="btn" href="${docUrl}" target="_blank" rel="noopener">Open</a>
        </div>
        <iframe
          src="${docUrl}"
          style="width:100%; height:80vh; border:1px solid #ddd; border-radius:10px;"
          loading="lazy"
        ></iframe>
      `;
      return;
    }

    // Default: treat as markdown/text
    const md = await loadText(docUrl);
    docBox.innerHTML = mdToHtml(md);
  }catch(e){
    docBox.textContent = `Could not load doc: ${docPath}`;
    console.error(e);
  }
}

(async function main(){
  setupTabs();

  const id = getParam("id");
  if (!id){
    alert("Missing model id.");
    location.href = "./library.html";
    return;
  }

  const data = await loadJSON("./assets/data/materials.json");
  const m = (data.materials || []).find(x => x.id === id);
  if (!m){
    alert("Model not found.");
    location.href = "./library.html";
    return;
  }

  setText("dTitle", `MAT_${m.mat} — ${m.name}`);
  document.title = `MAT_${m.mat} ${m.name} · LS-DYNA Material Hub`;
  setText("dMeta", `${m.category} · v${m.version} · updated ${m.updatedAt}`);
  setText("dSummary", m.summary || "—");
  getEl("dFig").innerHTML = modelFigure(m);

  const tagBox = getEl("dTags");
  tagBox.innerHTML = `
    <span class="tag">${escapeHtml(m.category || "—")}</span>
    <span class="tag">Generator: ${escapeHtml(m.generator || "—")}</span>
  `;

  getEl("btnGen").href = `./generator.html?id=${encodeURIComponent(m.id)}`;

  // Header button shows count + opens modal chooser/viewer
  const n = Array.isArray(m.samples) ? m.samples.length : 0;
  const btnSamples = getEl("btnSample");
  btnSamples.textContent = `Keyword samples (${n})`;
  if (!n) btnSamples.classList.add("hidden");
  btnSamples.onclick = async () => {
    await openSamples({
      modelId: m.id,
      modelTitle: `${m.name} (MAT_${m.mat})`,
      samples: m.samples || []
    });
  };

  // doc (MD or PDF)
  await renderDoc(m.doc);

  renderInputs(m.inputs);

  const changelog = await loadJSON("./assets/data/changelog.json");
  renderUpdates(changelog, m.id);

  // samples tab
  renderSamplesTab(m);

  // examples tab
  renderExamplesTab(m).catch(console.error);
})().catch(console.error);

async function renderExamplesTab(m){
  const box = getEl("examplesBox");
  const data = await loadJSON("./assets/data/examples.json");
  const exs = (data.examples || []).filter(e => e.runs.some(r => r.model === m.id));
  if (!exs.length){
    box.innerHTML = `<div class="rowitem"><div class="item-meta">No worked example for this model yet.</div></div>`;
    return;
  }
  const rows = await Promise.all(exs.map(async e => {
    const runs = e.runs.filter(r => r.model === m.id);
    const sums = await Promise.all(runs.map(r => loadJSON(`./assets/examples/${r.case}/summary.json`).catch(() => null)));
    const vals = runs.map((r, i) => {
      const s = sums[i];
      const txt = e.summary.map(f => {
        const v = s?.[f.key];
        return `${escapeHtml(f.label)}: <b>${v == null ? "—" : (v * (f.scale || 1)).toFixed(f.digits ?? 2)}</b>`;
      }).join(" · ");
      return `<div class="item-meta">${escapeHtml(r.label)} — ${txt}</div>`;
    }).join("");
    return `<div class="rowitem">
      <div class="item-title"><a href="./examples.html#${e.id}">${escapeHtml(e.title)}</a></div>
      ${vals}
    </div>`;
  }));
  box.innerHTML = rows.join("");
}
