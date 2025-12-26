import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml } from "../core/dom.js";

setText("year", new Date().getFullYear());

function countType(materials, type) {
  return materials.filter(m => (m.type || "") === type).length;
}

function latestUpdated(materials) {
  const arr = materials.map(m => m.updatedAt).filter(Boolean).sort().reverse();
  return arr[0] || "—";
}

function renderCatalog(box, items) {
  if (!box) return;
  box.innerHTML = "";
  for (const m of items) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(m.display || m.name || m.id)}</div>
      <div class="item-meta">${escapeHtml(m.keyword || "")}</div>
      <div class="item-meta">MAT ${escapeHtml(m.mat || "—")} • ${escapeHtml(m.type || "—")} • v${escapeHtml(m.version || "—")}</div>
    `;
    div.onclick = () => (window.location.href = "./generator.html");
    box.appendChild(div);
  }
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  setText("statTotal", String(materials.length));
  setText("statConcrete", String(countType(materials, "concrete")));
  setText("statLastUpdate", latestUpdated(materials));

  // changelog (optional)
  try {
    const ch = await loadJSON("./assets/data/changelog.json");
    const e = ch.entries?.[0];
    if (e) {
      setText("homeChangelog", `Latest v${e.version} (${e.date}): ${e.changes.slice(0,3).join(" • ")}`);
    } else setText("homeChangelog", "—");
  } catch {
    setText("homeChangelog", "—");
  }

  const catalogBox = getEl("homeCatalog");
  const search = getEl("homeSearch");

  function apply() {
    const q = (search?.value || "").toLowerCase().trim();
    let list = materials;
    if (q) {
      list = materials.filter(m => {
        const hay = [m.id,m.name,m.display,m.keyword,m.notes,m.mat,m.type].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    renderCatalog(catalogBox, list);
  }

  if (search) search.oninput = apply;
  apply();
}

main().catch(err => {
  console.error(err);
  setText("homeChangelog", `Error: ${err.message || err}`);
});
