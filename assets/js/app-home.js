import "./app-common.js";

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return await res.json();
}

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function showLatest(changelog) {
  const latest = changelog?.entries?.[0];
  if (!latest) return "No changelog.";
  const line = latest.changes.slice(0, 3).map(s => `• ${s}`).join("  ");
  return `Latest update: v${latest.version} (${latest.date})  ${line}`;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials ?? data;
  const types = new Set(materials.map(m => m.type).filter(Boolean));

  setText("statMaterials", String(materials.length));
  setText("statCategories", String(types.size));
  setText("statBuild", data.lastBuild || "—");

  try {
    const changelog = await loadJSON("./assets/data/changelog.json");
    setText("latestUpdateHome", showLatest(changelog));
  } catch {
    setText("latestUpdateHome", "Latest update: (no changelog.json)");
  }
}

main().catch(console.error);
