function escapeHtml(s){
  return (s || "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function pill(text){
  return `<span class="pill">${escapeHtml(text)}</span>`;
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
  if (!res.ok){
    throw new Error(`HTTP ${res.status} when fetching: ${res.url}`);
  }
  try{
    return await res.json();
  } catch (e){
    throw new Error(`Invalid JSON in ${res.url}: ${e.message}`);
  }
}

function parseMatNumber(m){
  const id = (m.id || "").toString();
  const match = id.match(/mat_(\d+)/i);
  if (match) return Number(match[1]);

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

function setStatus(text){
  const countText = document.getElementById("countText");
  if (countText) countText.textContent = text;
}

async function init(){
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const grid = document.getElementById("grid");
  const countText = document.getElementById("countText");
  const qEl = document.getElementById("q");
  const catEl = document.getElementById("cat");
  const sortEl = document.getElementById("sort");

  const missing = [];
  if (!grid) missing.push("#grid");
  if (!countText) missing.push("#countText");
  if (!qEl) missing.push("#q");
  if (!catEl) missing.push("#cat");
  if (!sortEl) missing.push("#sort");
  if (missing.length){
    throw new Error(`Missing required DOM elements: ${missing.join(", ")}`);
  }

  setStatus("Loading…");

  const dataUrl = new URL("../data/materials.json", document.baseURI);
  const models = await loadJson(dataUrl);

  const cats = Array.from(new Set(models.map(m => (m.category || "other").toLowerCase()))).sort();
  catEl.innerHTML =
    `<option value="">All categories</option>` +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(titleCase(c))}</option>`).join("");

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

    setStatus(`Showing ${list.length} of ${models.length} models`);

    grid.innerHTML = list.map(m => {
      const tags = (m.tags || []).slice(0, 4).map(pill).join(" ");
      const genId = (m.generatorId || "").toString().trim();

      return `
        <div class="card">
          <div class="pills">
            ${pill((m.category || "other").toLowerCase())}
            ${tags}
          </div>

          <h3>${escapeHtml(m.name || "")}</h3>
          <div class="muted">${escapeHtml(m.mat || "")}</div>

          ${m.summary ? `<div class="desc">${escapeHtml(m.summary)}</div>` : ""}

          <div class="actions">
            <a class="btn" href="../model/?id=${encodeURIComponent(m.id)}">View</a>
            ${genId ? `<a class="btn btn-primary" href="../generator/?id=${encodeURIComponent(genId)}">Generate</a>` : ``}
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

init().catch((e) => {
  console.error(e);
  setStatus(e?.message || "Could not load materials.json");
});
