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

function getId(){
  const sp = new URLSearchParams(location.search);
  return sp.get("id");
}

async function loadJson(url){
  const res = await fetch(url, { cache:"no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.url}`);
  return res.json();
}

async function init(){
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const container = document.getElementById("modelContainer");
  const id = getId();
  if (!id){
    container.innerHTML = `<div class="card">Missing id</div>`;
    return;
  }

  try{
    const models = await loadJson(new URL("../data/materials.json", document.baseURI));
    const m = models.find(x => x.id === id);

    if (!m){
      container.innerHTML = `<div class="card">Not found: <code>${escapeHtml(id)}</code></div>`;
      return;
    }

    document.title = `${m.mat || m.id} | LS-DYNA Material Hub`;

    const tags = (m.tags || []).map(pill).join(" ");
    const keywords = (m.keywords || []).map(k => `<li><code>${escapeHtml(k)}</code></li>`).join("");
    const useCases = (m.useCases || []).map(u => `<li>${escapeHtml(u)}</li>`).join("");
    const params = (m.params || []).map(p => `
      <tr>
        <td><code>${escapeHtml(p.key || "")}</code></td>
        <td>${escapeHtml(p.desc || "")}</td>
      </tr>
    `).join("");

    const refs = (m.refs || []).map(r => `
      <li>
        <a href="${escapeHtml(r.url || "#")}" target="_blank" rel="noreferrer">
          ${escapeHtml(r.label || r.url || "")}
        </a>
      </li>
    `).join("");

    const genId = (m.generatorId || "").toString().trim();

    container.innerHTML = `
      <div class="card">
        <div class="actions" style="justify-content:flex-end;margin-top:0">
          ${genId ? `<a class="btn btn-primary" href="../generator/?id=${encodeURIComponent(genId)}">Open in Generator →</a>` : ``}
          <a class="btn" href="../library/">Back</a>
        </div>

        <div class="pills" style="margin-top:10px">
          ${pill(m.category || "other")}
          ${tags}
        </div>

        <h1 style="font-size:26px;margin-top:6px">${escapeHtml(m.name || "")}</h1>
        <div class="muted" style="margin-top:6px">${escapeHtml(m.mat || "")}</div>

        ${m.summary ? `<div class="desc">${escapeHtml(m.summary)}</div>` : ""}

        ${(m.useCases && m.useCases.length) ? `
          <div style="margin-top:16px">
            <h2 class="h2">Use cases</h2>
            <ul>${useCases}</ul>
          </div>
        ` : ""}

        ${(m.keywords && m.keywords.length) ? `
          <div style="margin-top:16px">
            <h2 class="h2">Keywords</h2>
            <ul>${keywords}</ul>
          </div>
        ` : ""}

        ${(m.params && m.params.length) ? `
          <div style="margin-top:16px">
            <h2 class="h2">Key parameters</h2>
            <div style="overflow:auto">
              <table style="width:100%;border-collapse:collapse">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px 6px;border-bottom:1px solid rgba(15,23,42,0.10)">Param</th>
                    <th style="text-align:left;padding:8px 6px;border-bottom:1px solid rgba(15,23,42,0.10)">Description</th>
                  </tr>
                </thead>
                <tbody>${params}</tbody>
              </table>
            </div>
          </div>
        ` : ""}

        ${m.example ? `
          <div style="margin-top:16px">
            <div class="actions" style="margin-top:0">
              <h2 class="h2" style="margin:0">Example</h2>
              <button id="copyBtn" class="btn">Copy</button>
            </div>
            <pre class="pre" style="min-height:unset"><code id="ex">${escapeHtml(m.example)}</code></pre>
          </div>
        ` : ""}

        ${(m.refs && m.refs.length) ? `
          <div style="margin-top:16px">
            <h2 class="h2">References</h2>
            <ul>${refs}</ul>
          </div>
        ` : ""}
      </div>
    `;

    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn){
      copyBtn.addEventListener("click", async () => {
        try{
          await navigator.clipboard.writeText(m.example || "");
          copyBtn.textContent = "Copied";
        } catch {
          copyBtn.textContent = "Copy failed";
        }
        setTimeout(()=>copyBtn.textContent="Copy", 1200);
      });
    }
  } catch (e){
    console.error(e);
    container.innerHTML = `<div class="card">Could not load data</div>`;
  }
}

init();
