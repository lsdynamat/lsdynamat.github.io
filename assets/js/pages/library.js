import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml } from "../core/dom.js";

setText("year", new Date().getFullYear());

function uniqTypes(materials) {
  return [...new Set(materials.map(m => m.type).filter(Boolean))].sort();
}

function sortBy(items, key) {
  const arr = [...items];
  arr.sort((a,b) => (a[key] ?? "").toString().localeCompare((b[key] ?? "").toString(), undefined, { numeric:true, sensitivity:"base" }));
  return arr;
}

function renderList(listEl, items, onPick) {
  if (!listEl) return;
  listEl.innerHTML = "";
  for (const m of items) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(m.display || m.name || m.id)}</div>
      <div class="item-meta">${escapeHtml(m.keyword || "")}</div>
      <div class="item-meta">MAT ${escapeHtml(m.mat || "—")} • ${escapeHtml(m.type || "—")} • Updated ${escapeHtml(m.updatedAt || "—")}</div>
    `;
    div.onclick = () => onPick(m);
    listEl.appendChild(div);
  }
}

function renderDetails(detailsEl, m) {
  if (!detailsEl) return;
  if (!m) { detailsEl.textContent = "Select one item."; return; }
  detailsEl.innerHTML = `
    <div class="small"><b>Name:</b> ${escapeHtml(m.name||"—")}</div>
    <div class="small"><b>Keyword:</b> ${escapeHtml(m.keyword||"—")}</div>
    <div class="small"><b>MAT:</b> ${escapeHtml(m.mat||"—")}</div>
    <div class="small"><b>Type:</b> ${escapeHtml(m.type||"—")}</div>
    <div class="small"><b>Version:</b> ${escapeHtml(m.version||"—")}</div>
    <div class="small"><b>Updated:</b> ${escapeHtml(m.updatedAt||"—")}</div>
    <div class="small"><b>Generator:</b> ${escapeHtml(m.generatorModule||"—")}</div>
    <div class="small"><b>Notes:</b> ${escapeHtml(m.notes||"—")}</div>
  `;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  setText("libInfo", `Loaded ${materials.length} models • Last build: ${data.lastBuild || "—"}`);

  const q = getEl("q");
  const typeSel = getEl("type");
  const sortSel = getEl("sort");
  const listEl = getEl("list");
  const detailsEl = getEl("details");

  if (typeSel) {
    for (const t of uniqTypes(materials)) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSel.appendChild(opt);
    }
  }

  function apply() {
    const query = (q?.value || "").toLowerCase().trim();
    const type = typeSel?.value || "";
    const sortKey = sortSel?.value || "mat";

    let items = materials.filter(m => {
      if (type && m.type !== type) return false;
      const hay = [m.id,m.name,m.display,m.keyword,m.notes,m.mat,m.type].join(" ").toLowerCase();
      if (query && !hay.includes(query)) return false;
      return true;
    });

    items = sortBy(items, sortKey);
    renderList(listEl, items, (m) => renderDetails(detailsEl, m));
    renderDetails(detailsEl, items[0] || null);
  }

  if (q) q.oninput = apply;
  if (typeSel) typeSel.onchange = apply;
  if (sortSel) sortSel.onchange = apply;

  apply();
}

main().catch(err => {
  console.error(err);
  alert(err.message || String(err));
});
