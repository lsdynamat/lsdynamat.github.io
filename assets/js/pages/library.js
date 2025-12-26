import { loadJSON, loadText } from "../core/fetch.js";
import { getEl, setText, escapeHtml, on } from "../core/dom.js";

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

function openSampleModal(title, text){
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";

  const box = document.createElement("div");
  box.className = "card modalBox";

  box.innerHTML = `
    <div class="row between wrapline">
      <div>
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="small">Readonly preview. Copy into your deck.</div>
      </div>
      <div class="row gap">
        <button class="btn" id="copyBtn">Copy</button>
        <button class="btn danger" id="closeBtn">Close</button>
      </div>
    </div>
    <pre class="preview" id="pre"></pre>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector("#pre").textContent = text || "";

  overlay.addEventListener("click", (e)=>{ if (e.target === overlay) overlay.remove(); });
  box.querySelector("#closeBtn").onclick = ()=> overlay.remove();
  box.querySelector("#copyBtn").onclick = async ()=> {
    try{ await navigator.clipboard.writeText(text || ""); }catch{}
  };
}

function renderList(listEl, items){
  listEl.innerHTML = "";

  for (const m of items){
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
        <button class="btn" data-sample="${escapeHtml(m.sample || "")}" data-id="${escapeHtml(m.id)}">Keyword sample</button>
      </div>
    `;

    listEl.appendChild(div);
  }

  listEl.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const samplePath = btn.getAttribute("data-sample");
      if (!samplePath) return openSampleModal(`Sample • ${id}`, `No sample available yet for: ${id}\n`);

      try{
        const text = await loadText(samplePath);
        openSampleModal(`Sample • ${id}`, text);
      }catch{
        openSampleModal(`Sample • ${id}`, `Could not load sample: ${samplePath}\n`);
      }
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
    renderList(listEl, items);
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
