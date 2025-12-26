import { loadJSON } from "../core/fetch.js";
import { $, setText } from "../core/dom.js";
import { downloadText, safeFilename, buildDefaults } from "../core/ui.js";

document.getElementById("year").textContent = new Date().getFullYear();

function renderInputs(container, inputs, values, onChange) {
  container.innerHTML = "";
  for (const inp of inputs) {
    const card = document.createElement("div");
    card.className = "inputCard";

    const label = document.createElement("div");
    label.className = "inputLabel";
    label.textContent = inp.label || inp.key;

    const row = document.createElement("div");
    row.className = "inputRow";

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.step = inp.step ?? "any";
    if (inp.min != null) input.min = String(inp.min);
    if (inp.max != null) input.max = String(inp.max);
    input.value = (values[inp.key] ?? inp.default ?? "");

    input.oninput = () => {
      values[inp.key] = input.value === "" ? "" : Number(input.value);
      onChange();
    };

    const unit = document.createElement("span");
    unit.className = "inputUnit";
    unit.textContent = inp.unit || "";

    row.appendChild(input);
    row.appendChild(unit);

    card.appendChild(label);
    card.appendChild(row);
    container.appendChild(card);
  }
}

async function importGenerator(modulePath) {
  // Fail-safe: import each model on demand
  // Must export default function generate(params, meta)
  const mod = await import(modulePath);
  if (!mod?.default || typeof mod.default !== "function") {
    throw new Error(`Generator module "${modulePath}" must export default function generate(params, meta).`);
  }
  return mod.default;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials || [];
  setText("genTopInfo", `Loaded ${materials.length} materials • Last build: ${data.lastBuild || "—"}`);

  const sel = $("modelSelect");
  const inputsBox = $("inputsBox");
  const previewBox = $("previewBox");
  const fileNameEl = $("fileName");
  const errBox = $("genError");

  const btnCopy = $("btnCopy");
  const btnDownload = $("btnDownload");

  sel.innerHTML = "";
  for (const m of materials) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.display || m.name || m.id;
    sel.appendChild(opt);
  }

  let current = materials[0];
  let values = buildDefaults(current);
  let currentText = "";
  let currentFile = "output.k";

  function showMeta(m) {
    setText("modelKeyword", m.keyword || m.display || m.name || "—");
    setText("modelVersion", `v${m.version || "—"}`);
    setText("modelUpdated", `Updated ${m.updatedAt || "—"}${m.updatedBy ? " (" + m.updatedBy + ")" : ""}`);
    setText("modelNotes", m.notes || "—");
  }

  async function refresh() {
    errBox.textContent = "";
    showMeta(current);

    renderInputs(inputsBox, current.inputs || [], values, () => refresh());

    try {
      const generate = await importGenerator(current.generatorModule);
      const out = await generate(values, current);

      currentText = out;
      previewBox.textContent = out;

      currentFile = safeFilename(current, values);
      fileNameEl.textContent = currentFile;
    } catch (e) {
      const msg = e?.message || String(e);
      errBox.textContent = `Generator error (only this model): ${msg}`;
      previewBox.textContent = `// ERROR\n${msg}`;
      currentText = previewBox.textContent;
      currentFile = "ERROR.k";
      fileNameEl.textContent = currentFile;
    }
  }

  btnCopy.onclick = async () => {
    try { await navigator.clipboard.writeText(currentText || ""); }
    catch {}
  };
  btnDownload.onclick = () => downloadText(currentFile, currentText || "");

  sel.onchange = () => {
    current = materials.find(x => x.id === sel.value) || materials[0];
    values = buildDefaults(current);
    refresh();
  };

  await refresh();
}

main().catch(err => {
  console.error(err);
  alert(err.message || String(err));
});
