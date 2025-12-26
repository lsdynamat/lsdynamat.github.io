import "./app-common.js";

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load ${path}`);
  return await res.json();
}

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function text(s) {
  return (s ?? "").toString().toLowerCase();
}

function renderDetails(m) {
  const d = $("details");
  if (!m) {
    d.textContent = "Select a model to view details.";
    return;
  }
  d.innerHTML = `
    <div class="kv">
      <div class="kvRow"><div class="k">Name</div><div class="v">${m.name || "—"}</div></div>
      <div class="kvRow"><div class="k">Keyword</div><div class="v">${m.keyword || "—"}</div></div>
      <div class="kvRow"><div class="k">MAT</div><div class="v">${m.mat || "—"}</div></div>
      <div class="kvRow"><div class="k">Type</div><div class="v">${m.type || "—"}</div></div>
      <div class="kvRow"><div class="k">Generator</div><div class="v">${m.generatorKey || "—"}</div></div>
      <div class="kvRow"><div class="k">Version</div><div class="v">${m.version || "—"}</div></div>
      <div class="kvRow"><div class="k">Updated</div><div class="v">${m.updatedAt || "—"} ${m.updatedBy ? "(" + m.updatedBy + ")" : ""}</div></div>
      <div class="kvRow"><div class="k">Notes</div><div class="v">${m.notes || "—"}</div></div>
      <div class="kvRow"><div class="k">Inputs</div><div class="v">${(m.inputs||[]).map(i => `${i.key}${i.unit ? " ["+i.unit+"]" : ""}`).join(", ") || "—"}</div></div>
    </div>
  `;
}

function renderList(container, items, onPick) {
  container.innerHTML = "";
  for (const m of items) {
    const div = document.createElement("div");
    div.className = "itemCard";
    div.innerHTML = `
      <div class="itemTitle">${m.display || m.name || m.id}</div>
      <div class="itemMeta">
        <span class="pill">${m.type || "—"}</span>
        <span class="pill">${m.mat || "—"}</span>
        <span class="pill">v${m.version || "—"}</span>
        <span class="pill">${m.updatedAt || "—"}</span>
      </div>
      <div class="muted" style="margin-top:8px;">${m.notes || ""}</div>
    `;
    div.addEventListener("click", () => onPick(m));
    container.appendChild(div);
  }
}

function uniqTypes(materials) {
  return [...new Set(materials.map(m => m.type).filter(Boolean))].sort();
}

function sortMaterials(items, key) {
  const copy = [...items];
  copy.sort((a, b) => {
    const av = (a[key] ?? "").toString();
    const bv = (b[key] ?? "").toString();
    return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
  });
  return copy;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials ?? data;

  $("libraryMeta").textContent = `Loaded ${materials.length} materials • Last build: ${data.lastBuild || "—"}`;

  const typeSel = $("type");
  for (const t of uniqTypes(materials)) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeSel.appendChild(opt);
  }

  const q = $("q");
  const sortSel = $("sort");
  const list = $("list");

  let current = materials[0] || null;
  renderDetails(current);

  function apply() {
    const query = text(q.value);
    const t = typeSel.value;
    const sortKey = sortSel.value;

    let items = materials.filter(m => {
      if (t && m.type !== t) return false;
      const hay = [m.id, m.name, m.keyword, m.mat, m.notes, m.display].map(text).join(" ");
      if (query && !hay.includes(query)) return false;
      return true;
    });

    items = sortMaterials(items, sortKey);
    renderList(list, items, (m) => {
      current = m;
      renderDetails(m);
    });
  }

  q.addEventListener("input", apply);
  typeSel.addEventListener("change", apply);
  sortSel.addEventListener("change", apply);

  apply();
}

main().catch(err => {
  console.error(err);
  alert(err?.message || String(err));
});
