// assets/js/pages/home.js
import { loadJSON } from "../core/fetch.js";
import { getEl, setText } from "../core/dom.js";

setText("year", new Date().getFullYear());

function uniq(arr){
  return Array.from(new Set(arr));
}

function formatDateISO(d){
  // d is ISO string like "2025-12-26"
  return (d || "—").toString().slice(0, 10);
}

(async function main(){
  const data = await loadJSON("./assets/data/materials.json");
  const materials = (data.materials || []);

  // Counts
  const modelCount = materials.length;

  const categories = uniq(materials.map(m => (m.category || "").trim()).filter(Boolean));
  const categoryCount = categories.length;

  // Keyword generators count = number of materials having a valid generator key
  const generatorCount = materials.filter(m => typeof m.generator === "string" && m.generator.trim() !== "").length;

  // Last update: max of updatedAt in materials or in changelog (if you have it)
  const dates = materials
    .map(m => (m.updatedAt || "").toString().slice(0,10))
    .filter(Boolean)
    .sort(); // lex sort works for ISO dates

  const lastUpdate = dates.length ? dates[dates.length - 1] : (data.updatedAt ? formatDateISO(data.updatedAt) : "—");

  // Set stats
  setText("statModels", modelCount);
  setText("statCats", categoryCount);
  setText("statLast", lastUpdate);

  // NEW: Keyword generators
  const statGen = getEl("statGenerators");
  if (statGen) statGen.textContent = String(generatorCount);

  // Popular categories UI (kept like your old homepage logic)
  const catGrid = getEl("catGrid");
  if (catGrid){
    catGrid.innerHTML = "";
    categories
      .sort((a,b)=>a.localeCompare(b))
      .forEach(cat=>{
        const count = materials.filter(m => (m.category||"").trim() === cat).length;

        const div = document.createElement("div");
        div.className = "cat";
        div.innerHTML = `
          <div class="t">${cat}</div>
          <div class="m">${count} models</div>
          <div class="small" style="margin-top:10px;">
            <a class="btn" href="./library.html?category=${encodeURIComponent(cat)}">Open filtered library</a>
          </div>
        `;
        catGrid.appendChild(div);
      });
  }

  // Recent updates box (optional — giữ như cũ: đọc changelog nếu có)
  const updatesBox = getEl("updatesBox");
  if (updatesBox){
    // If you have data.changelog in materials.json:
    const changelog = (data.changelog || []).slice(0, 10);
    if (!changelog.length){
      updatesBox.innerHTML = `<div class="small">No updates yet.</div>`;
    } else {
      updatesBox.innerHTML = "";
      changelog.forEach(u=>{
        const row = document.createElement("div");
        row.className = "rowitem";
        row.innerHTML = `
          <div class="row between wrapline gap">
            <div>
              <div class="item-title">${u.title || "Update"}</div>
              <div class="item-meta">${(u.date || "").slice(0,10)} • ${u.note || ""}</div>
            </div>
            ${u.modelId ? `<a class="btn" href="./details.html?id=${encodeURIComponent(u.modelId)}">Details</a>` : ""}
          </div>
        `;
        updatesBox.appendChild(row);
      });
    }
  }
})().catch(console.error);
