function escapeHtml(s){
  return (s || "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function pill(text){
  return `<span class="px-2 py-1 text-xs rounded-full border bg-slate-50">${escapeHtml(text)}</span>`;
}

function titleCase(s){
  return (s || "")
    .split(/[\s_-]+/)
    .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : "")
    .join(" ");
}

function getQuery(){
  const sp = new URLSearchParams(location.search);
  return {
    q: sp.get("q") || "",
    cat: sp.get("cat") || "",
    sort: sp.get("sort") || "mat"
  };
}

function setQuery(params){
  const sp = new URLSearchParams(location.search);
  for (const [k,v] of Object.entries(params)){
    if (v === "" || v == null) sp.delete(k);
    else sp.set(k, String(v));
  }
  const qs = sp.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}

async function loadJson(url){
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

function parseMatNumber(m){
  // expects ids like mat_024, mat_159, mat_084_085, mat_077_h ...
  const id = (m.id || "").toString();
  const match = id.match(/mat_(\d+)/i);
  if (match) return Number(match[1]);
  // fallback: try from mat field "*MAT_024"
  const mat = (m.mat || "").toString();
  const match2 = mat.match(/(\d+)/);
  return match2 ? Number(match2[1]) : Number.POSITIVE_INFINITY;
}

function sortModels(list, mode){
  const arr = [...list];

  if (mode === "name"){
    arr.sort((a,b) => (a.name||"").localeCompare(b.name||""));
    return arr;
  }

  if (mode === "category"){
    arr.sort((a,b) =>
      (a.category||"").localeCompare(b.category||"") ||
      parseMatNumber(a) - parseMatNumber(b) ||
      (a.name||"").localeCompare(b.name||"")
    );
    return arr;
  }

  // default: sort by MAT number
  arr.sort((a,b) =>
    parseMatNumber(a) - parseMatNumber(b) ||
    (a.name||"").localeCompare(b.name||"")
  );
  return arr;
}

function matches(m, q){
  if (!q) return true;
  const s = q.toLowerCase();
  const hay = [
    m.id,
    m.name,
    m.mat,
    m.category,
    ...(m.keywords||[]),
    ...(m.tags||[])
  ].join(" ").toLowerCase();
  return hay.includes(s);
}

async function init(){
  const grid = document.getElementById("grid");
  const countText = document.getElementById("countText");
  const qEl = document.getElementById("q");
  const catEl = document.getElementById("cat");
  const sortEl = document.getElementById("sort");

  const models = await loadJson(new URL("../data/materials.json", document.baseURI));

  // populate categories
  const cats = Array.from(
    new Set(models.map(m => (m.category || "other").toLowerCase()))
  ).sort();

  catEl.innerHTML =
    `<option value="">All categories</option>` +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(titleCase(c))}</option>`).join("");

  // apply query to UI controls
  const query = getQuery();
  qEl.value = query.q;
  catEl.value = query.cat;
  sortEl.value = query.sort;

  function render(){
    const q = qEl.value.trim();
    const cat = (catEl.value || "").toLowerCase();
    const sortMode = sortEl.value;

    setQuery({ q, cat, sort: sortMode });

    let list = models.filter(m => matches(m, q));
    if (cat) list = list.filter(m => (m.category || "other").toLowerCase() === cat);
    list = sortModels(list, sortMode);

    countText.textContent = `Showing ${list.length} of ${models.length} models`;

    grid.innerHTML = list.map(m => {
      const tags = (m.tags || []).slice(0, 4).map(pill).join(" ");
      const genId = (m.generatorId || "").toString().trim();

      return `
        <div class="bg-white border rounded-2xl p-6 shadow-sm">
          <div class="flex flex-wrap gap-2 mb-4">
            ${pill((m.category || "other").toLowerCase())}
            ${tags}
          </div>

          <h3 class="text-lg font-extrabold">${escapeHtml(m.name || "")}</h3>
          <div class="text-slate-500 mt-1">${escapeHtml(m.mat || "")}</div>

          ${m.summary ? `<p class="mt-4 text-slate-700 text-sm">${escapeHtml(m.summary)}</p>` : ""}

          <div class="mt-5 flex gap-2 flex-wrap">
            <a class="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-sm"
               href="../model/?id=${encodeURIComponent(m.id)}">
              View
            </a>

            ${genId ? `
              <a class="px-3 py-2 rounded-xl border bg-slate-900 text-white hover:opacity-90 text-sm"
                 href="../generator/?id=${encodeURIComponent(genId)}">
                Generate
              </a>
            ` : ``}
          </div>
        </div>
      `;
    }).join("");
  }

  qEl.addEventListener("input", render);
  catEl.addEventListener("change", render);
  sortEl.addEventListener("change", render);

  render();
}

init().catch(() => {
  const countText = document.getElementById("countText");
  if (countText) countText.textContent = "Could not load materials.json";
});
