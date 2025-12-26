// assets/js/pages/generator.js
import { GENERATOR_KEYS, getGenerator } from "../generators/index.js";

const $ = (sel, root = document) => root.querySelector(sel);

const genSelect = $("#genSelect");
const modeSelect = $("#modeSelect");
const formBox = $("#formBox");
const preview = $("#preview");
const fileHint = $("#fileHint");
$("#year").textContent = String(new Date().getFullYear());

function esc(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fillSelect() {
  genSelect.innerHTML = "";
  for (const key of GENERATOR_KEYS) {
    const mod = getGenerator(key);
    const name = mod?.NAME || key;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${key} · ${name}`;
    genSelect.appendChild(opt);
  }

  // pick from URL ?id=mat159_cscm
  const url = new URL(location.href);
  const pick = url.searchParams.get("id");
  if (pick && getGenerator(pick)) genSelect.value = pick;
}

function renderForm(mod) {
  formBox.innerHTML = "";

  const mode = modeSelect.value;
  const fields = (mod.FIELDS || []).filter(f => (mode === "all" ? true : !f.advanced));
  const defaults = mod.DEFAULTS || {};

  for (const f of fields) {
    const k = f.key;
    const def = (defaults[k] ?? f.default ?? "");

    const box = document.createElement("div");
    box.className = "inputbox";

    const title = document.createElement("div");
    title.className = "k";
    title.textContent = f.label || k;

    const hint = document.createElement("div");
    hint.className = "h";
    hint.innerHTML = `Default: <b>${esc(def)}</b> ${f.unit ? `(${esc(f.unit)})` : ""}`;

    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = (f.step ?? "any");
    inp.value = String(def);
    inp.dataset.key = k;
    inp.dataset.type = f.type || "number"; // "integer" | "number"

    if (typeof f.min === "number") inp.min = String(f.min);
    if (typeof f.max === "number") inp.max = String(f.max);

    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(inp);
    formBox.appendChild(box);
  }
}

function readInputs(mod) {
  const out = {};
  const defaults = mod.DEFAULTS || {};

  formBox.querySelectorAll("input[data-key]").forEach(inp => {
    const k = inp.dataset.key;
    const t = inp.dataset.type || "number";

    // if user clears input => fallback to default
    const raw = inp.value;
    if (raw === "" || raw == null) {
      out[k] = defaults[k];
      return;
    }

    const num = Number(raw);
    if (!Number.isFinite(num)) {
      // keep raw if it’s weird; generator will throw if needed
      out[k] = raw;
      return;
    }

    out[k] = (t === "integer") ? Math.trunc(num) : num;
  });

  return out;
}

function doGenerate() {
  const key = genSelect.value;
  const mod = getGenerator(key);
  if (!mod || typeof mod.generate !== "function") {
    preview.textContent = `Invalid generator: ${key}`;
    fileHint.textContent = "";
    return;
  }

  try {
    const vals = readInputs(mod);
    const { filename, keyword } = mod.generate(vals);
    preview.textContent = keyword || "";
    fileHint.textContent = filename ? `Suggested filename: ${filename}` : "";
  } catch (e) {
    preview.textContent = String(e?.message || e);
    fileHint.textContent = "";
  }
}

async function doCopy() {
  const txt = preview.textContent || "";
  if (!txt.trim()) return;
  await navigator.clipboard.writeText(txt);
}

$("#btnGenerate").addEventListener("click", doGenerate);
$("#btnCopy").addEventListener("click", doCopy);

genSelect.addEventListener("change", () => {
  const mod = getGenerator(genSelect.value);
  renderForm(mod);
  doGenerate();
});

modeSelect.addEventListener("change", () => {
  const mod = getGenerator(genSelect.value);
  renderForm(mod);
  doGenerate();
});

// init
fillSelect();
renderForm(getGenerator(genSelect.value));
doGenerate();
