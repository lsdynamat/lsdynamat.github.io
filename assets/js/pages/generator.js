import { loadJSON } from "../core/fetch.js";
import { getEl, setText, escapeHtml, on } from "../core/dom.js";
import { asNum } from "../core/format.js";
import { getGenerator } from "../generators/index.js";

setText("year", new Date().getFullYear());

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

    div.innerHTML = `
      <div class="k">${escapeHtml(inp.label || inp.key)} <span class="small">${escapeHtml(inp.unit || "")}</span></div>
      <input id="in_${escapeHtml(inp.key)}" type="text" value="${escapeHtml(values[inp.key])}" />
      ${inp.hint ? `<div class="h">${escapeHtml(inp.hint)}</div>` : ""}
    `;

    formEl.appendChild(div);
  });
}

function validateAndCollect(inputs){
  const out = {};
  let ok = true;

  (inputs || []).forEach(inp=>{
    const el = getEl(`in_${inp.key}`);
    if (!el) return;

    if ((el.value ?? "").toString().trim() === ""){
      el.value = inp.default;
    }

    const n = asNum(el.value);
    if (n === null){
      el.classList.add("invalid");
      ok = false;
      return;
    }

    if (typeof inp.min === "number" && n < inp.min) { el.classList.add("invalid"); ok = false; return; }
    if (typeof inp.max === "number" && n > inp.max) { el.classList.add("invalid"); ok = false; return; }

    el.classList.remove("invalid");
    out[inp.key] = n;
  });

  return { ok, values: out };
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

  materials.forEach(m=>{
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `MAT_${m.mat} • ${m.name}`;
    sel.appendChild(opt);
  });

  const preId = getParam("id");
  if (preId && materials.some(m=>m.id===preId)) sel.value = preId;

  let cur = materials.find(m => m.id === sel.value) || materials[0];
  let curValues = buildDefaultValues(cur.inputs);

  function syncUI(){
    cur = materials.find(m => m.id === sel.value) || materials[0];
    curValues = buildDefaultValues(cur.inputs);
    renderForm(formEl, cur.inputs, curValues);

    getEl("btnDetails").href = `./details.html?id=${encodeURIComponent(cur.id)}`;
    outEl.textContent = "Click Generate.";
  }


  function generate(){
    const g = getGenerator(cur.generator);
    if (!g || typeof g.generate !== "function"){
      outEl.textContent = `Generator not found: ${cur.generator}`;
      return;
    }
  
    const { ok, values } = validateAndCollect(cur.inputs);
    if (!ok){
      outEl.textContent = "Invalid inputs. Please fix highlighted fields.";
      return;
    }
  
    let out;
    try{
      out = g.generate(values);
    }catch(e){
      outEl.textContent = `Generate failed: ${e?.message || e}`;
      return;
    }
  
    // ✅ support both:
    // - old generators: return string
    // - new generators (MAT_159): return { filename, keyword }
    if (typeof out === "string"){
      outEl.textContent = out;
      outEl.dataset.filename = `${cur.id}.k`;
    } else if (out && typeof out === "object"){
      outEl.textContent = out.keyword || "";
      outEl.dataset.filename = out.filename || `${cur.id}.k`;
    } else {
      outEl.textContent = "";
      outEl.dataset.filename = `${cur.id}.k`;
    }
  
    curValues = values;
  }



  on(sel, "change", syncUI);

  on(getEl("btnResetDefaults"), "click", ()=>{
    curValues = buildDefaultValues(cur.inputs);
    renderForm(formEl, cur.inputs, curValues);
  });

  on(getEl("btnGenerate"), "click", generate);

  on(getEl("btnCopy"), "click", async ()=>{
    try{ await navigator.clipboard.writeText(outEl.textContent || ""); }catch{}
  });

  on(getEl("btnDownload"), "click", ()=>{
    downloadText(`${cur.id}.k`, outEl.textContent || "");
  });

  syncUI();
})().catch(console.error);
