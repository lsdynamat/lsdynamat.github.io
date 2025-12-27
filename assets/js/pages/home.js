import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml } from "../core/dom.js";

setText("year", new Date().getFullYear());

function uniq(arr){ return [...new Set(arr)]; }

function renderCats(cats){
  const grid = getEl("catGrid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const c of cats) {
    const div = document.createElement("div");
    div.className = "cat";
    div.innerHTML = `<div class="t">${escapeHtml(c)}</div><div class="m">Open filtered library</div>`;
    div.onclick = () => { window.location.href = `./library.html?cat=${encodeURIComponent(c)}`; };
    grid.appendChild(div);
  }
}

function renderUpdates(updates){
  const box = getEl("updatesBox");
  if (!box) return;
  box.innerHTML = "";
  updates.slice(0,6).forEach(u => {
    const div = document.createElement("div");
    div.className = "rowitem";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(u.model)} <span class="tag info">v${escapeHtml(u.version || "—")}</span></div>
      <div class="item-meta">${escapeHtml(u.date)} • ${escapeHtml(u.change)}</div>
    `;
    box.appendChild(div);
  });
}

(async function main(){
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  const cats = uniq(materials.map(m => m.category).filter(Boolean)).sort();
  setText("statModels", materials.length);
  setText("statCats", cats.length);

  const last = materials.map(m => m.updatedAt).filter(Boolean).sort().at(-1) || "—";
  setText("statLast", last);

  const samples = materials.filter(m => !!m.sample).length;
  setText("statSamples", samples);

  const genCount = materials.filter(m => typeof m.generator === "string" && m.generator.trim() !== "").length;
  setText("statKeywordGenerators", genCount);

  renderCats(cats);

  const changelog = await loadJSON("./assets/data/changelog.json");
  changelog.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  renderUpdates(changelog);

})().catch(err => {
  console.error(err);
  setText("statModels","—");
  setText("statCats","—");
  setText("statLast","—");
  setText("statGenerators","—");
});
