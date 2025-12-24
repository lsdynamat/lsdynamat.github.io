async function loadJson(url){
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
  return res.json();
}

function $(id){ return document.getElementById(id); }

function countBy(arr, keyFn){
  const m = new Map();
  for (const x of arr){
    const k = keyFn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function titleCase(s){
  return (s || "")
    .split(/[\s_-]+/)
    .map(w => w ? (w[0].toUpperCase() + w.slice(1)) : "")
    .join(" ");
}

async function init(){
  const year = $("year");
  if (year) year.textContent = new Date().getFullYear();

  const models = await loadJson(new URL("./data/materials.json", document.baseURI));

  // Stats
  const types = new Set(models.map(m => (m.category || "other").toLowerCase()));
  $("statModels").textContent = String(models.length);
  $("statTypes").textContent = String(types.size);

  // Popular categories (top 6)
  const byCat = countBy(models, m => (m.category || "other").toLowerCase());
  const cats = [...byCat.entries()].sort((a,b) => b[1]-a[1]).slice(0, 6);

  const grid = $("popularGrid");
  grid.innerHTML = cats.map(([cat, n]) => `
    <div class="card">
      <div class="pills">
        <span class="pill">${cat}</span>
      </div>

      <h3>${titleCase(cat)}</h3>
      <div class="muted">${n} models</div>

      <div class="actions">
        <a class="btn btn-primary" href="./library/?cat=${encodeURIComponent(cat)}">Browse</a>
      </div>
    </div>
  `).join("");
}

init().catch((e) => {
  console.error(e);
  const grid = document.getElementById("popularGrid");
  if (grid) grid.innerHTML = `<div class="card">Could not load materials.json</div>`;
  const s1 = document.getElementById("statModels");
  const s2 = document.getElementById("statTypes");
  if (s1) s1.textContent = "—";
  if (s2) s2.textContent = "—";
});
