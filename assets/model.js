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

function getId(){
  const sp = new URLSearchParams(location.search);
  return sp.get("id");
}

async function initModel(){
  const container = document.getElementById("modelContainer");
  const id = getId();

  if (!id){
    container.innerHTML = `<div class="bg-white border rounded-2xl p-6">Missing id</div>`;
    return;
  }

  try{
    const url = new URL("../data/materials.json", document.baseURI);
    const res = await fetch(url, { cache: "no-store" });
    const models = await res.json();

    const m = models.find(x => x.id === id);
    if (!m){
      container.innerHTML = `<div class="bg-white border rounded-2xl p-6">Not found: <span class="font-mono">${escapeHtml(id)}</span></div>`;
      return;
    }

    document.title = `${m.mat || m.id} | LS-DYNA Material Hub`;

    const tags = (m.tags || []).map(pill).join(" ");
    const keywords = (m.keywords || []).map(k => `<li class="font-mono text-sm">${escapeHtml(k)}</li>`).join("");
    const useCases = (m.useCases || []).map(u => `<li class="text-sm text-slate-700">${escapeHtml(u)}</li>`).join("");
    const params = (m.params || []).map(p => `
      <tr class="border-t">
        <td class="py-2 pr-4 font-mono text-sm">${escapeHtml(p.key || "")}</td>
        <td class="py-2 text-sm text-slate-700">${escapeHtml(p.desc || "")}</td>
      </tr>
    `).join("");

    const refs = (m.refs || []).map(r => `
      <li class="text-sm">
        <a class="text-blue-700 hover:underline" href="${escapeHtml(r.url || "#")}" target="_blank" rel="noreferrer">
          ${escapeHtml(r.label || r.url || "")}
        </a>
      </li>
    `).join("");

    const example = m.example ? escapeHtml(m.example) : "";

    container.innerHTML = `
      <div class="bg-white border rounded-2xl p-6 shadow-sm">
        <div class="flex flex-wrap gap-2 mb-4">
          ${pill(m.category || "other")}
          ${tags}
        </div>

        <h1 class="text-2xl font-extrabold">${escapeHtml(m.name || "")}</h1>
        <div class="text-slate-500 mt-1">${escapeHtml(m.mat || "")}</div>

        ${m.summary ? `<p class="mt-4 text-slate-700">${escapeHtml(m.summary)}</p>` : ""}

        <div class="mt-8 grid gap-6">
          ${(m.useCases && m.useCases.length) ? `
            <section>
              <h2 class="font-extrabold mb-2">Use cases</h2>
              <ul class="list-disc pl-5">${useCases}</ul>
            </section>
          ` : ""}

          ${(m.keywords && m.keywords.length) ? `
            <section>
              <h2 class="font-extrabold mb-2">Keywords</h2>
              <ul class="list-disc pl-5">${keywords}</ul>
            </section>
          ` : ""}

          ${(m.params && m.params.length) ? `
            <section>
              <h2 class="font-extrabold mb-2">Key parameters</h2>
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="text-left text-xs uppercase tracking-wide text-slate-500">
                      <th class="py-2 pr-4">Param</th>
                      <th class="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>${params}</tbody>
                </table>
              </div>
            </section>
          ` : ""}

          ${example ? `
            <section>
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <h2 class="font-extrabold">Example</h2>
                <button id="copyBtn" class="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 text-sm">
                  Copy
                </button>
              </div>
              <pre class="mt-3 text-sm bg-slate-950 text-slate-100 rounded-xl p-4 overflow-auto"><code>${example}</code></pre>
            </section>
          ` : ""}

          ${(m.refs && m.refs.length) ? `
            <section>
              <h2 class="font-extrabold mb-2">References</h2>
              <ul class="list-disc pl-5">${refs}</ul>
            </section>
          ` : ""}
        </div>
      </div>
    `;

    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn){
      copyBtn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(m.example || ""); copyBtn.textContent = "Copied"; }
        catch { copyBtn.textContent = "Copy failed"; }
        setTimeout(()=>copyBtn.textContent="Copy", 1200);
      });
    }
  } catch(e){
    container.innerHTML = `<div class="bg-white border rounded-2xl p-6">Could not load data</div>`;
  }
}

initModel();
