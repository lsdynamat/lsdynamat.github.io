const grid = document.getElementById("modelsGrid");
const countText = document.getElementById("countText");

const qEl = document.getElementById("q");
const catEl = document.getElementById("cat");
const sortEl = document.getElementById("sort");
const clearBtn = document.getElementById("clearBtn");

let allModels = [];

function norm(s){ return (s || "").toString().toLowerCase().trim(); }
function matNumber(matStr){ const m = (matStr || "").match(/(\d+)/); return m ? parseInt(m[1],10) : 0; }

function badge(text) {
  return `<span class="px-2 py-1 text-xs rounded-full border bg-slate-50">${text}</span>`;
}

function buildDetailHref(id){
  return `./model.html?id=${encodeURIComponent(id)}`;
}

function card(m) {
  const tags = (m.tags || []).slice(0, 3).map(t => badge(t)).join("");
  const category = badge(m.category || "other");

  return `
    <article class="bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3">
      <div class="flex flex-wrap gap-2">
        ${category}
        ${tags}
      </div>

      <div>
        <h3 class="font-extrabold text-lg leading-snug">${m.name || ""}</h3>
        <div class="text-sm text-slate-500">${m.mat || ""}</div>
      </div>

      <p class="text-sm text-slate-600 clamp-3">${m.summary || ""}</p>

      <div class="mt-auto pt-1">
        <a class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border bg-white hover:bg-slate-50"
           href="${buildDetailHref(m.id)}">
          View details →
        </a>
      </div>
    </article>
  `;
}

function render(list) {
  grid.innerHTML = list.map(card).join("");
  countText.textContent = `${list.length} / ${allModels.length}`;
}

function populateFilters(models){
  const cats = Array.from(new Set(models.map(m => m.category || "other"))).sort();
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    catEl.appendChild(opt);
  });
}

function apply(){
  const q = norm(qEl.value);
  const cat = catEl.value;
  const sort = sortEl.value;

  let list = allModels.slice();

  if (cat) list = list.filter(m => (m.category || "other") === cat);

  if (q){
    list = list.filter(m => {
      const hay = [
        m.id, m.name, m.mat, m.summary,
        (m.tags||[]).join(" "),
        (m.keywords||[]).join(" "),
        (m.useCases||[]).join(" ")
      ].map(norm).join(" | ");
      return hay.includes(q);
    });
  }

  if (sort === "name"){
    list.sort((a,b) => norm(a.name).localeCompare(norm(b.name)));
  } else if (sort === "mat"){
    list.sort((a,b) => matNumber(a.mat) - matNumber(b.mat));
  } else {
    list.sort((a,b) => (b.popularity||0) - (a.popularity||0));
  }

  render(list);
}

function clearAll(){
  qEl.value = "";
  catEl.value = "";
  sortEl.value = "popular";
  apply();
  history.replaceState(null, "", location.pathname);
}

function applyFromQuery(){
  const sp = new URLSearchParams(location.search);
  const cat = sp.get("cat");
  const q = sp.get("q");
  if (cat) catEl.value = cat;
  if (q) qEl.value = q;
  apply();
}

async function initLibrary(){
  try{
    const url = new URL("../data/materials.json", document.baseURI);
    const res = await fetch(url, { cache: "no-store" });
    allModels = await res.json();

    populateFilters(allModels);

    qEl.addEventListener("input", apply);
    catEl.addEventListener("change", apply);
    sortEl.addEventListener("change", apply);
    clearBtn.addEventListener("click", clearAll);

    applyFromQuery();
  } catch(e){
    countText.textContent = "Could not load data";
  }
}

initLibrary();
