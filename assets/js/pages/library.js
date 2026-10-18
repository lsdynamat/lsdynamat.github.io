import { loadJSON } from "../core/fetch.js";
import { getEl, setText, on } from "../core/dom.js";
import { openSamples } from "../core/sampleViewer.js";
import { renderModelRows, matchesQuery, byMat } from "../core/modelTable.js?v=20261018b";

setText("year", new Date().getFullYear());

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}

function sorters(kind){
  if (kind === "name") return (a,b)=> (a.name||"").localeCompare(b.name||"");
  if (kind === "updatedAt") return (a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||"");
  return byMat;
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

  const onSamples = m => openSamples({
    modelId: m.id,
    modelTitle: `${m.name} (MAT_${m.mat})`,
    samples: m.samples || []
  });

  function apply(){
    const cat = catSel.value;
    let items = materials.filter(m => (!cat || m.category === cat) && matchesQuery(m, qEl.value));
    items.sort(sorters(sortEl.value));
    metaEl.textContent = `${items.length} of ${materials.length} models`;
    renderModelRows(listEl, items, { onSamples });
  }

  on(qEl, "input", apply);
  on(catSel, "change", apply);
  on(sortEl, "change", apply);

  on(getEl("btnReset"), "click", ()=>{
    qEl.value = "";
    catSel.value = "";
    sortEl.value = "mat";
    apply();
  });

  apply();
})().catch(console.error);
