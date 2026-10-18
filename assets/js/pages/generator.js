import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml, on } from "../core/dom.js";
import { asNum } from "../core/format.js";
import { getGenerator } from "../generators/index.js?v=20261018b";
import { UNIT_SYSTEMS, BASE_UNITS, getUnitSystem, convertDeck, tidyDeck } from "../core/units.js?v=20261018b";

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

function optLabel(inp, v){
  const o = (inp.options || []).find(o => Number(o[0]) === Number(v));
  return o ? o[1] : String(v);
}

function renderForm(formEl, inputs, values){
  formEl.innerHTML = "";
  (inputs || []).forEach(inp=>{
    const div = document.createElement("div");
    div.className = "inputbox";
    const id = `in_${escapeHtml(inp.key)}`;
    const v = values[inp.key];
    let control;
    if (inp.control === "toggle"){
      const onVal = inp.options[1][0];
      control = `
      <label class="switch" for="${id}">
        <input id="${id}" type="checkbox" role="switch" ${Number(v) === Number(onVal) ? "checked" : ""} />
        <span class="track" aria-hidden="true"></span>
        <span class="state">${escapeHtml(optLabel(inp, v))}</span>
      </label>`;
    } else if (inp.control === "select"){
      control = `
      <select id="${id}">${inp.options.map(o =>
        `<option value="${escapeHtml(o[0])}" ${Number(o[0]) === Number(v) ? "selected" : ""}>${escapeHtml(o[1])}</option>`).join("")}
      </select>`;
    } else {
      control = `<input id="${id}" type="text" inputmode="decimal" spellcheck="false" value="${escapeHtml(v)}" />`;
    }

    div.innerHTML = `
      <label class="k" for="${id}">
        <span>${escapeHtml(inp.label || inp.key)}</span>
        <span class="unit">${escapeHtml(inp.unit && inp.unit !== "-" ? inp.unit : "")}</span>
      </label>
      ${control}
      ${inp.hint ? `<div class="h">${escapeHtml(inp.hint)}</div>` : ""}
    `;
    if (inp.control === "toggle"){
      const cb = div.querySelector("input");
      cb.addEventListener("change", () => {
        div.querySelector(".state").textContent = optLabel(inp, inp.options[cb.checked ? 1 : 0][0]);
      });
    }

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

    if (inp.control === "toggle"){ out[inp.key] = Number(inp.options[el.checked ? 1 : 0][0]); return; }
    if (inp.control === "select"){ out[inp.key] = Number(el.value); return; }

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
  const blob = new Blob([text], { type:"application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);   // revoking at once can give an empty file in some browsers
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
  const unitSel = getEl("unitSel");

  UNIT_SYSTEMS.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.label;
    unitSel.appendChild(opt);
  });
  let savedUnits = null;
  try { savedUnits = localStorage.getItem("lsdynamat.units"); } catch {}
  unitSel.value = getUnitSystem(getParam("units") || savedUnits).id;

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
      lastName = `${cur.id}.k`;   // short, safe name (no "=", "-" or extra dots) as on the original site
    } else {
      lastText = "";
      lastName = `${cur.id}.k`;
    }

    const sys = getUnitSystem(unitSel.value);
    if (sys.id !== BASE_UNITS.id){
      try{
        lastText = convertDeck(lastText, g.UNIT_SPEC, sys);
      }catch(e){
        setStatus(e?.message || String(e), true);
        return;
      }
      lastName = `${cur.id}_${sys.id.replace(/[^a-z0-9]+/gi, "_")}.k`;
    }

    lastText = tidyDeck(lastText);
    outEl.innerHTML = highlight(lastText);
    nameEl.textContent = lastName;
    setStatus("");
  }

  function syncUI(){
    cur = materials.find(m => m.id === sel.value) || materials[0];
    renderForm(formEl, cur.inputs, buildDefaultValues(cur.inputs));
    getEl("btnDetails").href = `./details.html?id=${encodeURIComponent(cur.id)}`;

    syncURL();

    generate();
  }

  function syncURL(){
    const u = new URL(location.href);
    u.searchParams.set("id", cur.id);
    if (unitSel.value === BASE_UNITS.id) u.searchParams.delete("units");
    else u.searchParams.set("units", unitSel.value);
    history.replaceState(null, "", u);
  }

  let t = 0;
  on(formEl, "input", ()=>{ clearTimeout(t); t = setTimeout(generate, 120); });
  on(formEl, "change", ()=>{ clearTimeout(t); t = setTimeout(generate, 120); });
  on(sel, "change", syncUI);
  on(unitSel, "change", ()=>{
    try { localStorage.setItem("lsdynamat.units", unitSel.value); } catch {}
    syncURL();
    generate();
  });

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
