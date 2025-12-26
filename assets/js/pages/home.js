import { loadJSON } from "../core/fetch.js";
import { setText } from "../core/dom.js";

setText("year", new Date().getFullYear());

function typesCount(materials) {
  return new Set(materials.map(m => m.type).filter(Boolean)).size;
}

function formatLatest(ch) {
  const latest = ch?.entries?.[0];
  if (!latest) return "No changelog.";
  return `Latest: v${latest.version} (${latest.date}) • ${latest.changes.slice(0,3).join(" • ")}`;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const mats = data.materials || [];

  setText("statMaterials", String(mats.length));
  setText("statCategories", String(typesCount(mats)));
  setText("statBuild", data.lastBuild || "—");

  try {
    const ch = await loadJSON("./assets/data/changelog.json");
    setText("homeLatest", formatLatest(ch));
  } catch {
    setText("homeLatest", "Latest: (no changelog.json)");
  }
}

main().catch(err => {
  console.error(err);
  setText("homeLatest", `Error: ${err.message || err}`);
});
