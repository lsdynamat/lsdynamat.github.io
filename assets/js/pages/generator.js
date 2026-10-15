import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml, on } from "../core/dom.js";
import { asNum } from "../core/format.js";
import { getGenerator } from "../generators/index.js?v=20261015d";

setText("year", new Date().getFullYear());

const RULER = "$---+----1----+----2----+----3----+----4----+----5----+----6----+----7----+----8";

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function buildDefaultValues(inputs){
  const v = {};
  (inputs || []).forEach(i => { v[i.key] = i.default; });
  return v;
}

function renderForm(formEl, inputs, values){
  formEl.innerHTML = "";
  (inputs || []).forEach(inp=>{
    const div = document.createElement("div");
    div.className = "inputbox";
    const id = `in_${escapeHtml(inp.key)}`;

    div.innerHTML = `
      <label class="k" for="${id}">
        <span>${escapeHtml(inp.label || inp.key)}</span>
        <span class="unit">${escapeHtml(inp.unit && inp.unit !== "-" ? inp.unit : "")}</span>
      </label>
      <input id="${id}" type="text" inputmode="decimal" spellcheck="false" value="${escapeHtml(values[inp.key])}" />
      ${inp.hint ? `<div class="h">${escapeHtml(inp.hint)}</div>` : ""}
    `;

    formEl.appendChild(div);
  });
}

// Empty fields fall back to the default (without overwriting what the user is typing).
// Non-numeric defaults (e.g. optional strings) are passed through as text.
function validateAndCollect(inputs){
  const out = {};
  let ok = true;

  (inputs || []).forEach(inp=>{
    const el = getEl(`in_${inp.key}`);
    if (!el) return;

    const raw = (el.value ?? "").toString().trim();
    if (raw === ""){
      el.classList.remove("invalid");
      out[inp.key] = inp.default;
      return;
    }
    if (typeof inp.default === "string" && asNum(raw) === null){
      el.classList.remove("invalid");
      out[inp.key] = raw;
      return;
    }

    const n = asNum(raw);
    const bad = n === null
      || (typeof inp.min === "number" && n < inp.min)
      || (typeof inp.max === "number" && n > inp.max);
    el.classList.toggle("invalid", bad);
    if (bad){ ok = false; return; }
    out[inp.key] = n;
  });

  return { ok, values: out };
}

// Light syntax colouring for LS-DYNA keyword text
function highlight(text){
  const lines = text.split(/\r?\n/);
  return [`<span class="ln ruler">${escapeHtml(RULER)}</span>`].concat(lines.map(line => {
    const e = escapeHtml(line);
    let cls = "";
    if (line.startsWith("*")) cls = "kw";
    else if (line.startsWith("$#")) cls = "hd";
    else if (line.startsWith("$")) cls = "cm";
    return `<span class="ln${cls ? " " + cls : ""}">${e || " "}</span>`;
  })).join("");
}

function downloadText(filename, text){
  const blob = new Blob([text], { type:"text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

(async function main(){
  const data = await loadJSON("./assets/data/materials.json");
  const materials = (data.materials || []).slice()
    .sort((a,b)=> (a.mat||"").toString().localeCompare((b.mat||"").toString(), undefined, { numeric:true }));

  const sel = getEl("modelSel");
  const formEl = getEl("form");
  const outEl = getEl("out");
  const nameEl = getEl("outName");
  const statusEl = getEl("outStatus");

  materials.forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `MAT_${m.mat} — ${m.name}`;
    sel.appendChild(opt);
  });

  const preId = getParam("id");
  if (preId && materials.some(m=>m.id===preId)) sel.value = preId;

  let cur = materials.find(m => m.id === sel.value) || materials[0];
  let lastText = "";
  let lastName = "";

  function setStatus(msg, isErr){
    statusEl.textContent = msg ? `· ${msg}` : "";
    statusEl.classList.toggle("err", !!isErr);
  }

  function generate(){
    const g = getGenerator(cur.generator);
    if (!g || typeof g.generate !== "function"){
      outEl.innerHTML = `<span class="ln msg err">Generator not found: ${escapeHtml(cur.generator)}</span>`;
      return;
    }

    const { ok, values } = validateAndCollect(cur.inputs);
    if (!ok){
      // keep the last valid card visible, just flag it
      setStatus("fix highlighted inputs", true);
      return;
    }

    let out;
    try{
      out = g.generate(values);
    }catch(e){
      setStatus(e?.message || String(e), true);
      return;
    }

    // generators return either a string or { filename, keyword }
    if (typeof out === "string"){
      lastText = out;
      lastName = `${cur.id}.k`;
    } else if (out && typeof out === "object"){
      lastText = out.keyword || "";
      lastName = out.filename || `${cur.id}.k`;
    } else {
      lastText = "";
      lastName = `${cur.id}.k`;
    }

    outEl.innerHTML = highlight(lastText);
    nameEl.textContent = lastName;
    setStatus("");
  }

  function syncUI(){
    cur = materials.find(m => m.id === sel.value) || materials[0];
    renderForm(formEl, cur.inputs, buildDefaultValues(cur.inputs));
    getEl("btnDetails").href = `./details.html?id=${encodeURIComponent(cur.id)}`;

    const u = new URL(location.href);
    u.searchParams.set("id", cur.id);
    history.replaceState(null, "", u);

    generate();
  }

  let t = 0;
  on(formEl, "input", ()=>{ clearTimeout(t); t = setTimeout(generate, 120); });
  on(sel, "change", syncUI);

  on(getEl("btnResetDefaults"), "click", ()=>{
    renderForm(formEl, cur.inputs, buildDefaultValues(cur.inputs));
    generate();
  });

  on(getEl("btnCopy"), "click", async (e)=>{
    try{
      await navigator.clipboard.writeText(lastText);
      const b = e.currentTarget, old = b.textContent;
      b.textContent = "Copied";
      setTimeout(()=>{ b.textContent = old; }, 1200);
    }catch{}
  });

  on(getEl("btnDownload"), "click", ()=>{
    if (lastText) downloadText(lastName || `${cur.id}.k`, lastText);
  });

  syncUI();
})().catch(console.error);
