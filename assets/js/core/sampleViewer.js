import { escapeHtml } from "./dom.js";
import { loadText } from "./fetch.js";

/**
 * Opens a modal to show either:
 * - a list of samples (if samples.length > 1)
 * - a single sample text viewer (if samples.length === 1)
 *
 * sample object:
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
  const overlay = document.createElement("div");
  overlay.className = "modalOverlay";
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
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
  const box = createBox(
    `Keyword sample • ${modelTitle}`,
    `${sample.title}${sample.source ? " • " + sample.source : ""}`
  );

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

  const tagRow = body.querySelector("#tagRow");
  const tags = Array.isArray(sample.tags) ? sample.tags : [];
  tagRow.innerHTML = `
    <span class="tag info">${escapeHtml(sample.id || "sample")}</span>
    ${sample.updatedAt ? `<span class="tag">Updated ${escapeHtml(sample.updatedAt)}</span>` : ""}
    ${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  box.querySelector("#closeBtn").onclick = () => overlay.remove();

  let text = "";
  try {
    text = await loadText(sample.path);
    body.querySelector("#pre").textContent = text;
  } catch (e) {
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
  const box = createBox(
    `Keyword samples • ${modelTitle}`,
    `Choose a sample to preview and copy.`
  );

  const body = box.querySelector("#body");
  body.innerHTML = `
    <div class="list" id="list"></div>
    <div class="small" style="margin-top:10px;">
      Tip: samples are stored as plain text files for easy maintenance.
    </div>
  `;

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

    const btnView = row.querySelector('button[data-view="1"]');
    const btnCopy = row.querySelector('button[data-copy="1"]');

    btnView.onclick = async () => {
      overlay.remove();
      await openTextViewer({ modelId, modelTitle, sample: s });
    };

    btnCopy.onclick = async () => {
      try {
        const text = await loadText(s.path);
        await navigator.clipboard.writeText(text);
      } catch {}
    };

    list.appendChild(row);
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector("#closeBtn").onclick = () => overlay.remove();
}

/**
 * Public API:
 * openSamples(model, samples)
 */
export async function openSamples({ modelId, modelTitle, samples }) {
  const arr = Array.isArray(samples) ? samples : [];

  if (arr.length === 0) {
    // minimal modal
    const overlay = createOverlay();
    const box = createBox(
      `Keyword samples • ${modelTitle}`,
      "No samples available yet for this model."
    );
    box.querySelector("#body").innerHTML = `<div class="small">Add samples in materials.json → samples: []</div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    box.querySelector("#closeBtn").onclick = () => overlay.remove();
    return;
  }

  if (arr.length === 1) {
    await openTextViewer({ modelId, modelTitle, sample: arr[0] });
    return;
  }

  openListModal({ modelId, modelTitle, samples: arr });
}
