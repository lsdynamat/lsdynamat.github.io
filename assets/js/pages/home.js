import { loadJSON } from "../core/fetch.js";
import { getEl, setText, on } from "../core/dom.js";
import { renderModelRows, matchesQuery, byMat } from "../core/modelTable.js?v=20261018a";

setText("year", new Date().getFullYear());

function renderUpdates(updates){
  const box = getEl("updatesBox");
  if (!box) return;
  box.innerHTML = "";
  updates.slice(0, 6).forEach(u => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = u.date || "—";
    const body = document.createElement("div");
    const what = document.createElement("div");
    what.className = "what";
    what.textContent = u.model + (u.version ? ` · v${u.version}` : "");
    const why = document.createElement("div");
    why.className = "why";
    why.textContent = u.change || "";
    body.append(what, why);
    li.append(time, body);
    box.appendChild(li);
  });
}

(async function main(){
  const data = await loadJSON("./assets/data/materials.json");
  const materials = (data.materials || []).slice().sort(byMat);

  const tbody = getEl("modelRows");
  const qEl = getEl("q");
  const metaEl = getEl("resultMeta");

  function apply(){
    const items = materials.filter(m => matchesQuery(m, qEl.value));
    metaEl.textContent = `${items.length} of ${materials.length} models`;
    renderModelRows(tbody, items);
  }
  on(qEl, "input", apply);
  apply();

  const changelog = await loadJSON("./assets/data/changelog.json");
  changelog.sort((a,b)=> (b.date||"").localeCompare(a.date||""));
  renderUpdates(changelog);
})().catch(err => {
  console.error(err);
  const tbody = getEl("modelRows");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="small">Could not load the model list.</td></tr>`;
});
