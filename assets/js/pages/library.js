import { loadJSON } from "../core/fetch.js";
import { $, escapeHtml } from "../core/dom.js";

document.getElementById("year").textContent = new Date().getFullYear();

function text(s) { return (s ?? "").toString().toLowerCase(); }

function uniqTypes(materials) {
  return [...new Set(materials.map(m => m.type).filter(Boolean))].sort();
}

function sortBy(items, key) {
  const arr = [...items];
  arr.sort((a,b) => (a[key] ?? "").toString().localeCompare((b[key] ?? "").toString(), undefined, { numeric:true, sensitivity:"base" }));
  return arr;
}

function renderDetails(m) {
  const box = $("details");
  if (!m) { box.textContent = "Select a model to view details."; return; }
  box.innerHTML = `
    <div class="kvRow"><div class="k">Name</div><div class="v">${escapeHtml(m.name||"—")}</div></div>
    <div class="kvRow"><div class="k">Keyword</div><div class="v">${escapeHtml(m.keyword||"—")}</div></div>
    <div class="kvRow"><div class="k">MAT</div><div class="v">${escapeHtml(m.mat||"—")}</div></div>
    <div class="kvRow"><div class="k">Type</div><div class="v">${escapeHtml(m.type||"—")}</div></div>
    <div class="kvRow"><div class="k">Version</div><div class="v">${escapeHtml(m.version||"—")}</div></div>
    <div class="kvRow"><div class="k">Updated</div><div class="v">${escapeHtml(m.updatedAt||"—")} ${m.updatedBy ? "(" + escapeHtml(m.updatedBy) + ")" : ""}</div></div>
    <div class="kvRow"><div class="k">Generator</div><div class="v">${escapeHtml(m.generatorModule||"—")}</div></div>
    <div class="kvRow"><div class="k">Notes</div><div class="v">${escapeHtml(m.notes||"—")}</div></div>
    <div class="kvRow"><div class="k">Inputs</div><div class="v">${escapeHtml((m.inputs||[]).map(i=>i.key).join(", ")||"—")}</div></div>
  `;
}

function renderList(listEl, items, onPick) {
  listEl.innerHTML = "";
  for (const m of items) {
    const div = document.createElement("div");
    div.className = "itemCard";
    div.innerHTML = `
      <div class="itemTitle">${escapeHtml(m.display || m.name || m.id)}</div>
      <div class="itemMeta">
        <span class="pill">${escapeHtml(m.type||"—")}</span>
        <span class="pill">${escapeHtml(m.mat||"—")}</span>
        <span class="pill">v${escapeHtml(m.version||"—")}</span>
        <span class="pill">${escapeHtml(m.updatedAt||"—")}</span>
      </div>
      <div class="muted" style="margin-top:8px;">${escapeHtml(m.notes||"")}</div>
    `;
    div.onclick = () => onPick(m);
    listEl.appendChild(div);
  }
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  $("libMeta").textContent = `Loaded ${materials.length} materials • Last build: ${data.lastBuild || "—"}`;

  const typeSel = $("type");
  for (const t of uniqTypes(materials)) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSel.appendChild(opt);
  }

  const q = $("q");
  const sortSel = $("sort");
  const list = $("list");

  function apply() {
    const query = text(q.value);
    const type = typeSel.value;
    const sortKey = sortSel.value;

    let items = materials.filter(m => {
      if (type && m.type !== type) return false;
      const hay = [m.id,m.name,m.keyword,m.mat,m.notes,m.display].map(text).join(" ");
      if (query && !hay.includes(query)) return false;
      return true;
    });

    items = sortBy(items, sortKey);
    renderList(list, items, renderDetails);
    renderDetails(items[0] || null);
  }

  q.oninput = apply;
  typeSel.onchange = apply;
  sortSel.onchange = apply;

  apply();
}

main().catch(err => {
  console.error(err);
  alert(err.message || String(err));
});
