// Shared model table (home + library)
import { escapeHtml } from "./dom.js";
import { specimenIcon } from "./illus.js?v=20261018a";

export function byMat(a, b){
  return (a.mat||"").toString().localeCompare((b.mat||"").toString(), undefined, { numeric:true });
}

export function matchesQuery(m, q){
  q = (q || "").trim().toLowerCase();
  if (!q) return true;
  const blob = [m.id, m.name, m.mat, `mat_${m.mat}`, `mat${m.mat}`, m.category, m.summary].join(" ").toLowerCase();
  return q.split(/\s+/).every(t => blob.includes(t));
}

function nSamples(m){ return Array.isArray(m.samples) ? m.samples.length : 0; }

// opts.onSamples(m) — if given, a "Samples" link is shown for models that have samples
export function renderModelRows(tbody, items, opts = {}){
  if (!items.length){
    tbody.innerHTML = `<tr><td colspan="6" class="small">No models match.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(m => {
    const id = encodeURIComponent(m.id);
    const ns = nSamples(m);
    const samples = opts.onSamples && ns
      ? `<a class="opt" href="#" data-samples="${escapeHtml(m.id)}">Samples (${ns})</a>` : "";
    return `
      <tr>
        <td class="mat">MAT_${escapeHtml(m.mat)}</td>
        <td>
          <div class="namecell">
          ${specimenIcon(m)}
          <div>
          <div class="name"><a href="./details.html?id=${id}">${escapeHtml(m.name)}</a></div>
          <div class="desc">${escapeHtml(m.summary || "")}</div>
          </div>
          </div>
        </td>
        <td class="hide-sm">${escapeHtml(m.category || "—")}</td>
        <td class="num hide-sm">${(m.inputs || []).length}</td>
        <td class="num hide-sm">${escapeHtml(m.updatedAt || "—")}</td>
        <td class="actions">
          ${samples}
          <a class="opt" href="./details.html?id=${id}">Notes</a>
          <a href="./generator.html?id=${id}">Generate →</a>
        </td>
      </tr>`;
  }).join("");

  if (opts.onSamples){
    tbody.querySelectorAll("a[data-samples]").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        const m = items.find(x => x.id === a.dataset.samples);
        if (m) opts.onSamples(m);
      });
    });
  }
}
