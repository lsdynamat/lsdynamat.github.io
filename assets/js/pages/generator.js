import { loadJSON } from "../core/fetch.js";
import { getEl, setText } from "../core/dom.js";
import { buildDefaults, downloadText, makeFilename } from "../core/ui.js";

setText("year", new Date().getFullYear());

function renderInputs(box, inputs, values, onChange) {
  if (!box) return;
  box.innerHTML = "";

  for (const inp of (inputs || [])) {
    const wrap = document.createElement("div");
    wrap.className = "inputRow";

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.step = inp.step ?? "any";
    if (inp.min != null) input.min = String(inp.min);
    if (inp.max != null) input.max = String(inp.max);
    input.value = (values[inp.key] ?? inp.default ?? "");

    const unit = document.createElement("div");
    unit.className = "unit";
    unit.textContent = inp.unit || "";

    input.oninput = () => {
      values[inp.key] = input.value === "" ? "" : Number(input.value);
      onChange();
    };

    const label = document.createElement("div");
    label.className = "small";
    label.style.marginTop = "6px";
    label.textContent = `${inp.label || inp.key}`;

    const holder = document.createElement("div");
    holder.style.display = "grid";
    holder.style.gap = "6px";
    holder.appendChild(label);

    const row = document.createElement("div");
    row.className = "inputRow";
    row.appendChild(input);
    row.appendChild(unit);

    holder.appendChild(row);
    box.appendChild(holder);
  }
}

async function importGenerator(modulePath) {
  const mod = await import(modulePath);
  if (!mod?.default || typeof mod.default !== "function") {
    throw new Error(`Generator module must export default function generate(params, meta).`);
  }
  return mod.default;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];

  setText("genInfo", `Loaded ${materials.length} models • Last build: ${data.lastBuild || "—"}`);

  const sel = getEl("modelSelect");
  const inputsBox = getEl("inputsBox");
  const previewBox = getEl("previewBox");
  const fileNameEl = getEl("fileName");
  const metaEl = getEl("modelMeta");
  const errEl = getEl("genError");

  const btnCopy = getEl("btnCopy");
  const btnDownload = getEl("btnDownload");

  if (sel) {
    sel.innerHTML = "";
    for (const m of materials) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.display || m.name || m.id;
      sel.appendChild(opt);
    }
  }

  let current = materials[0];
  let values = buildDefaults(current);
  let currentText = "";
  let currentFile = "output.k";

  function showMeta(m) {
    if (!metaEl) return;
    metaEl.textContent = `${m.keyword || ""} • MAT ${m.mat || "—"} • v${m.version || "—"} • Updated ${m.updatedAt || "—"}`;
  }

  async function refresh() {
    if (errEl) errEl.textContent = "";
    showMeta(current);

    renderInputs(inputsBox, current.inputs || [], values, () => refresh());

    try {
      const generate = await importGenerator(current.generatorModule);
      const out = await generate(values, current);
      currentText = out;
      currentFile = makeFilename(current, values);

      if (previewBox) previewBox.textContent = out;
      if (fileNameEl) fileNameEl.textContent = currentFile;
    } catch (e) {
      const msg = e?.message || String(e);
      if (errEl) errEl.textContent = `Generator error (only this model): ${msg}`;
      const out = `// ERROR\n${msg}\n`;
      currentText = out;
      currentFile = "ERROR.k";
      if (previewBox) previewBox.textContent = out;
      if (fileNameEl) fileNameEl.textContent = currentFile;
    }
  }

  if (btnCopy) {
    btnCopy.onclick = async () => {
      try { await navigator.clipboard.writeText(currentText || ""); } catch {}
    };
  }
  if (btnDownload) {
    btnDownload.onclick = () => downloadText(currentFile, currentText || "");
  }

  if (sel) {
    sel.onchange = () => {
      current = materials.find(x => x.id === sel.value) || materials[0];
      values = buildDefaults(current);
      refresh();
    };
  }

  await refresh();
}

main().catch(err => {
  console.error(err);
  alert(err.message || String(err));
});
