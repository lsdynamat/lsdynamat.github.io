import "./app-common.js";
import { getGenerator } from "./registry.js";
import { safeText } from "./format.js";

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

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(model, values) {
  const tag = (model.mat || model.id || "MAT").toString().replaceAll(" ", "_").replaceAll("*", "");
  const mid = values.mid ?? 1;
  return `${tag}_MID${mid}.k`;
}

function coerceDefaults(model) {
  const obj = {};
  for (const inp of (model.inputs || [])) obj[inp.key] = inp.default;
  return obj;
}

function renderInputs(container, inputs, values, onChange) {
  container.innerHTML = "";
  for (const inp of inputs) {
    const wrap = document.createElement("div");
    wrap.className = "inputCard";

    const label = document.createElement("div");
    label.className = "inputLabel";
    label.textContent = inp.label || inp.key;

    const row = document.createElement("div");
    row.className = "inputRow";

    const input = document.createElement("input");
    input.className = "input";
    input.type = "number";
    input.value = (values[inp.key] ?? inp.default ?? "");
    input.step = inp.step ?? "any";
    if (inp.min != null) input.min = String(inp.min);
    if (inp.max != null) input.max = String(inp.max);

    input.addEventListener("input", () => {
      const v = input.value === "" ? "" : Number(input.value);
      onChange(inp.key, v);
    });

    const unit = document.createElement("span");
    unit.className = "inputUnit";
    unit.textContent = inp.unit ?? "";

    row.appendChild(input);
    row.appendChild(unit);

    wrap.appendChild(label);
    wrap.appendChild(row);
    container.appendChild(wrap);
  }
}

function showModelInfo(model) {
  $("modelKeyword").textContent = safeText(model.keyword || model.display || model.name || "—");
  $("modelVersion").textContent = `v${safeText(model.version || "—")}`;
  const upd = model.updatedAt ? `${model.updatedAt}${model.updatedBy ? " (" + model.updatedBy + ")" : ""}` : "—";
  $("modelUpdated").textContent = `Updated ${upd}`;
  $("modelNotes").textContent = safeText(model.notes || "—");
}

function showLatest(changelog) {
  const latest = changelog?.entries?.[0];
  if (!latest) return "No changelog found.";
  const lines = latest.changes.slice(0, 3).map(s => `• ${s}`).join("  ");
  return `Latest update: v${latest.version} (${latest.date})  ${lines}`;
}

async function main() {
  const data = await loadJSON("./assets/data/materials.json");
  const materials = data.materials ?? data;

  const modelSelect = $("modelSelect");
  const inputsBox = $("inputsBox");
  const previewBox = $("previewBox");
  const fileNameEl = $("fileName");
  const btnCopy = $("btnCopy");
  const btnDownload = $("btnDownload");

  modelSelect.innerHTML = "";
  for (const m of materials) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.display || `${m.keyword || ""} ${m.name || ""}`.trim() || m.id;
    modelSelect.appendChild(opt);
  }

  try {
    const changelog = await loadJSON("./assets/data/changelog.json");
    $("latestUpdate").textContent = showLatest(changelog);
  } catch {
    $("latestUpdate").textContent = "Latest update: (no changelog.json)";
  }

  let currentModel = materials[0];
  let values = coerceDefaults(currentModel);

  function updatePreview() {
    showModelInfo(currentModel);

    const gen = getGenerator(currentModel.generatorKey);
    if (!gen) {
      previewBox.textContent = `No generator registered for: ${currentModel.generatorKey}`;
      fileNameEl.textContent = "ERROR.k";
      return;
    }

    try {
      const k = gen(values, currentModel);
      previewBox.textContent = k;

      const fname = safeFilename(currentModel, values);
      fileNameEl.textContent = fname;

      btnCopy.onclick = async () => {
        await navigator.clipboard.writeText(k);
      };
      btnDownload.onclick = () => downloadText(fname, k);
    } catch (e) {
      previewBox.textContent = `Generator error: ${e?.message || e}`;
      fileNameEl.textContent = "ERROR.k";
    }
  }

  function setModel(id) {
    currentModel = materials.find(x => x.id === id) || materials[0];
    values = coerceDefaults(currentModel);
    renderInputs(inputsBox, currentModel.inputs || [], values, (k, v) => {
      values[k] = v;
      updatePreview();
    });
    updatePreview();
  }

  modelSelect.addEventListener("change", () => setModel(modelSelect.value));
  setModel(materials[0]?.id);
}

main().catch(err => {
  console.error(err);
  alert(err?.message || String(err));
});
