import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml, on } from "../core/dom.js";
import { openSamples } from "../core/sampleViewer.js";

setText("year", new Date().getFullYear());

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}
function normalize(s){ return (s||"").toLowerCase(); }

function sorters(kind){
  if (kind === "name") return (a,b)=> (a.name||"").localeCompare(b.name||"");
  if (kind === "updatedAt") return (a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||"");
  return (a,b)=> (a.mat||"").toString().localeCompare((b.mat||"").toString(), undefined, { numeric:true });
}

function countSamples(m){
  const arr = Array.isArray(m.samples) ? m.samples : [];
  return arr.length;
}

function renderList(listEl, items, materials){
  listEl.innerHTML = "";

  for (const m of items){
    const nSamples = countSamples(m);

    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <div class="item-title">${escapeHtml(m.name)} <span class="tag info">MAT_${escapeHtml(m.mat)}</span></div>
      <div class="item-meta">${escapeHtml(m.summary || "")}</div>

      <div class="tagrow" style="margin-top:10px;">
        <span class="tag">${escapeHtml(m.category || "—")}</span>
        <span class="tag">Updated ${escapeHtml(m.updatedAt || "—")}</span>
      </div>

      <div class="row gap" style="margin-top:12px;">
        <a class="btn primary" href="./generator.html?id=${encodeURIComponent(m.id)}">Generator</a>
        <a class="btn" href="./details.html?id=${encodeURIComponent(m.id)}">Details</a>
        <button class="btn" data-samples="1" data-id="${escapeHtml(m.id)}">
          Keyword samples (${nSamples})
        </button>
      </div>
    `;

    listEl.appendChild(div);
  }

  listEl.querySelectorAll('button[data-samples="1"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const m = materials.find(x => x.id === id);
      if (!m) return;

      await openSamples({
        modelId: m.id,
        modelTitle: `${m.name} (MAT_${m.mat})`,
        samples: m.samples || []
      });
    });
  });
}

(async function main(){
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  const catSel = getEl("cat");
  const cats = [...new Set(materials.map(m=>m.category).filter(Boolean))].sort();
  cats.forEach(c=>{
    const opt = document.createElement("option");
    opt.value = c; opt.textContent = c;
    catSel.appendChild(opt);
  });

  const presetCat = getParam("cat");
  if (presetCat) catSel.value = presetCat;

  const qEl = getEl("q");
  const sortEl = getEl("sort");
  const listEl = getEl("list");
  const metaEl = getEl("resultMeta");

  function apply(){
    const q = normalize(qEl.value);
    const cat = catSel.value;
    const sort = sortEl.value;

    let items = materials.slice();

    if (cat) items = items.filter(m => m.category === cat);

    if (q){
      items = items.filter(m => {
        const blob = normalize([m.id,m.name,m.mat,m.category,m.summary].join(" "));
        return blob.includes(q);
      });
    }

    items.sort(sorters(sort));
    metaEl.textContent = `Results: ${items.length} / ${materials.length}`;
    renderList(listEl, items, materials);
  }

  on(qEl, "input", apply);
  on(catSel, "change", apply);
  on(sortEl, "change", apply);

  on(getEl("btnReset"), "click", ()=>{
    qEl.value = "";
    catSel.value = presetCat || "";
    sortEl.value = "mat";
    apply();
  });

  apply();
})().catch(console.error);
