import { loadJSON, loadText } from "../core/fetch.js";
import { getEl, setText, escapeHtml, qsa } from "../core/dom.js";
import { mdToHtml } from "../core/md.js";
import { openSamples } from "../core/sampleViewer.js";

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
  box.innerHTML = "";
  (inputs || []).forEach(inp=>{
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(inp.key)} — ${escapeHtml(inp.label || "")}</div>
      <div class="item-meta">Default: ${escapeHtml(inp.default)} ${escapeHtml(inp.unit || "")}</div>
      ${inp.hint ? `<div class="small">${escapeHtml(inp.hint)}</div>` : ""}
    `;
    box.appendChild(div);
  });
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

  setText("dTitle", `${m.name} (MAT_${m.mat})`);
  setText("dMeta", `${m.category} • Updated ${m.updatedAt} • v${m.version}`);
  setText("dSummary", m.summary || "—");

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
  btnSamples.onclick = async () => {
    await openSamples({
      modelId: m.id,
      modelTitle: `${m.name} (MAT_${m.mat})`,
      samples: m.samples || []
    });
  };

  // doc
  const docBox = getEl("docBox");
  try{
    const md = await loadText(m.doc);
    docBox.innerHTML = mdToHtml(md);
  }catch{
    docBox.textContent = `Could not load doc: ${m.doc}`;
  }

  renderInputs(m.inputs);

  const changelog = await loadJSON("./assets/data/changelog.json");
  renderUpdates(changelog, m.id);

  // samples tab
  renderSamplesTab(m);
})().catch(console.error);
