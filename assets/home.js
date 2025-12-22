const CAT_LABEL = {
  metals: "Metals",
  concrete: "Concrete",
  rubber: "Rubber",
  polymers: "Polymers",
  foam: "Foams",
  composites: "Composites",
  wood: "Wood",
  other: "Other"
};

const CAT_BG = {
  metals: "bg-slate-100",
  concrete: "bg-stone-100",
  rubber: "bg-pink-100",
  polymers: "bg-sky-100",
  foam: "bg-cyan-100",
  composites: "bg-purple-100",
  wood: "bg-amber-100",
  other: "bg-slate-100"
};

function niceCat(c){
  if (!c) return "Other";
  return CAT_LABEL[c] || (c.charAt(0).toUpperCase() + c.slice(1));
}
function bgCat(c){ return CAT_BG[c] || "bg-slate-100"; }

function countBy(arr, keyFn){
  const map = new Map();
  for (const x of arr){
    const k = keyFn(x);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

function bumpVisits(){
  const el = document.getElementById("statVisits");
  const key = "ldmh_visits";
  const n = (parseInt(localStorage.getItem(key) || "0", 10) || 0) + 1;
  localStorage.setItem(key, String(n));
  if (el) el.textContent = String(n);
}

async function initHome(){
  const statModels = document.getElementById("statModels");
  const statCats = document.getElementById("statCats");
  const popularGrid = document.getElementById("popularGrid");

  bumpVisits();

  try{
    const url = new URL("./data/materials.json", document.baseURI);
    const res = await fetch(url, { cache: "no-store" });
    const models = await res.json();

    statModels.textContent = String(models.length);

    const catMap = countBy(models, m => m.category || "other");
    statCats.textContent = String(catMap.size);

    const top = Array.from(catMap.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,5);

    popularGrid.innerHTML = top.map(([cat, n]) => `
      <a href="./library/?cat=${encodeURIComponent(cat)}"
         class="block rounded-2xl p-4 border hover:shadow-sm transition ${bgCat(cat)}">
        <div class="font-extrabold">${niceCat(cat)}</div>
        <div class="text-xs text-slate-600 mt-1">${n} models</div>
      </a>
    `).join("");
  } catch(e){
    statModels.textContent = "—";
    statCats.textContent = "—";
    popularGrid.innerHTML = `<div class="rounded-2xl bg-slate-100 p-4 border">No data</div>`;
  }
}

initHome();
