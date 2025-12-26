import { loadJSON, loadText } from "../core/fetch.js";
import { getEl, setText, escapeHtml, qsa } from "../core/dom.js";
import { mdToHtml } from "../core/md.js";

setText("year", new Date().getFullYear());

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function openModal(title, text){
  const modalRoot = getEl("modalRoot") || document.body;

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";

  const box = document.createElement("div");
  box.className = "card modalBox";

  box.innerHTML = `
    <div class="row between wrapline">
      <div>
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="small">Readonly preview.</div>
      </div>
      <div class="row gap">
        <button class="btn" id="copyBtn">Copy</button>
        <button class="btn danger" id="closeBtn">Close</button>
      </div>
    </div>
    <pre class="preview" id="pre"></pre>
  `;

  overlay.appendChild(box);
  modalRoot.appendChild(overlay);

  box.querySelector("#pre").textContent = text || "";
  overlay.addEventListener("click", (e)=>{ if (e.target === overlay) overlay.remove(); });
  box.querySelector("#closeBtn").onclick = ()=> overlay.remove();
  box.querySelector("#copyBtn").onclick = async ()=> {
    try{ await navigator.clipboard.writeText(text || ""); }catch{}
  };
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

  const btnGen = getEl("btnGen");
  btnGen.href = `./generator.html?id=${encodeURIComponent(m.id)}`;

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

  getEl("btnSample").onclick = async ()=>{
    if (!m.sample) return openModal(`Sample • ${m.id}`, "No sample available.");
    try{
      const text = await loadText(m.sample);
      openModal(`Sample • ${m.id}`, text);
    }catch{
      openModal(`Sample • ${m.id}`, `Could not load sample: ${m.sample}`);
    }
  };

})().catch(console.error);
