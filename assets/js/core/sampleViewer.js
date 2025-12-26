import { escapeHtml } from "./dom.js";
import { loadText } from "./fetch.js";

/**
 * sample object schema:
 * { id, title, source, path, updatedAt, tags?:[] }
 */

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function createOverlay() {
  document.body.classList.add("modal-open");

  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";

  function close() {
    overlay.remove();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", onKey);

  // cleanup on remove
  const oldRemove = overlay.remove.bind(overlay);
  overlay.remove = () => {
    try { document.body.classList.remove("modal-open"); } catch {}
    try { window.removeEventListener("keydown", onKey); } catch {}
    oldRemove();
  };

  overlay._close = close;
  return overlay;
}

function createBox(title, subtitle) {
  const box = document.createElement("div");
  box.className = "card modalBox";
  box.innerHTML = `
    <div class="row between wrapline">
      <div>
        <div class="item-title">${escapeHtml(title)}</div>
        <div class="small">${escapeHtml(subtitle || "")}</div>
      </div>
      <div class="row gap">
        <button class="btn danger" id="closeBtn">Close</button>
      </div>
    </div>
    <div id="body" style="margin-top:12px;"></div>
  `;
  return box;
}

async function openTextViewer({ modelId, modelTitle, sample }) {
  const overlay = createOverlay();
  const subtitle = `${sample.title || sample.id || "Sample"}${sample.source ? " • " + sample.source : ""}`;

  const box = createBox(`Keyword sample • ${modelTitle}`, subtitle);
  const body = box.querySelector("#body");

  body.innerHTML = `
    <div class="row between wrapline">
      <div class="tagrow" id="tagRow"></div>
      <div class="row gap">
        <button class="btn" id="copyBtn">Copy</button>
        <button class="btn" id="downloadBtn">Download</button>
      </div>
    </div>
    <pre class="preview" id="pre">Loading…</pre>
  `;

  const tags = Array.isArray(sample.tags) ? sample.tags : [];
  body.querySelector("#tagRow").innerHTML = `
    <span class="tag info">${escapeHtml(sample.id || "sample")}</span>
    ${sample.updatedAt ? `<span class="tag">Updated ${escapeHtml(sample.updatedAt)}</span>` : ""}
    ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector("#closeBtn").onclick = () => overlay._close();

  let text = "";
  try {
    text = await loadText(sample.path);
    body.querySelector("#pre").textContent = text;
  } catch {
    body.querySelector("#pre").textContent = `Could not load sample:\n${sample.path}`;
  }

  box.querySelector("#copyBtn").onclick = async () => {
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };

  box.querySelector("#downloadBtn").onclick = () => {
    const fn = `${modelId || "model"}__${sample.id || "sample"}.k`;
    downloadText(fn, text || "");
  };
}

function openListModal({ modelId, modelTitle, samples }) {
  const overlay = createOverlay();
  const box = createBox(`Keyword samples • ${modelTitle}`, "Choose a sample to preview and copy.");
  const body = box.querySelector("#body");

  body.innerHTML = `<div class="list" id="list"></div>`;
  const list = body.querySelector("#list");

  samples.forEach((s) => {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const row = document.createElement("div");
    row.className = "rowitem";

    row.innerHTML = `
      <div class="row between wrapline">
        <div>
          <div class="item-title">${escapeHtml(s.title || s.id || "Sample")}</div>
          <div class="item-meta">
            ${escapeHtml(s.source || "—")}
            ${s.updatedAt ? ` • Updated ${escapeHtml(s.updatedAt)}` : ""}
          </div>
          <div class="tagrow" style="margin-top:8px;">
            <span class="tag info">${escapeHtml(s.id || "sample")}</span>
            ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
        </div>
        <div class="row gap" style="align-items:flex-start;">
          <button class="btn primary" data-view="1">View</button>
          <button class="btn" data-copy="1">Copy</button>
        </div>
      </div>
    `;

    row.querySelector('button[data-view="1"]').onclick = async () => {
      overlay._close();
      await openTextViewer({ modelId, modelTitle, sample: s });
    };

    row.querySelector('button[data-copy="1"]').onclick = async () => {
      try {
        const text = await loadText(s.path);
        await navigator.clipboard.writeText(text);
      } catch {}
    };

    list.appendChild(row);
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector("#closeBtn").onclick = () => overlay._close();
}

export async function openSamples({ modelId, modelTitle, samples }) {
  const arr = Array.isArray(samples) ? samples : [];

  if (arr.length === 0) {
    const overlay = createOverlay();
    const box = createBox(`Keyword samples • ${modelTitle}`, "No samples available yet for this model.");
    box.querySelector("#body").innerHTML = `<div class="small">Add samples in materials.json → samples: []</div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector("#closeBtn").onclick = () => overlay._close();
    return;
  }

  if (arr.length === 1) {
    await openTextViewer({ modelId, modelTitle, sample: arr[0] });
    return;
  }

  openListModal({ modelId, modelTitle, samples: arr });
}
