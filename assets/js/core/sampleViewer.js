import { escapeHtml } from "./dom.js";
import { loadText } from "./fetch.js";

/**
 * sample:
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

function lockScroll(lock) {
  if (lock) document.body.classList.add("lsd-modal-open");
  else document.body.classList.remove("lsd-modal-open");
}

function createModalShell() {
  lockScroll(true);

  const overlay = document.createElement("div");
  overlay.className = "lsd-modal";

  const dialog = document.createElement("div");
  dialog.className = "lsd-modal__dialog";

  overlay.appendChild(dialog);

  const close = () => {
    lockScroll(false);
    overlay.remove();
    window.removeEventListener("keydown", onKey);
  };

  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  window.addEventListener("keydown", onKey);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  overlay._close = close;
  overlay._dialog = dialog;

  document.body.appendChild(overlay);
  return overlay;
}

function renderHeader(dialog, { title, subtitle }) {
  const header = document.createElement("div");
  header.className = "lsd-modal__header";
  header.innerHTML = `
    <div class="lsd-modal__headtext">
      <div class="lsd-modal__title">${escapeHtml(title)}</div>
      <div class="lsd-modal__subtitle">${escapeHtml(subtitle || "")}</div>
    </div>
    <div class="lsd-modal__actions">
      <button class="lsd-btn lsd-btn--danger" data-close="1">Close</button>
    </div>
  `;
  dialog.appendChild(header);
  return header;
}

function renderBody(dialog) {
  const body = document.createElement("div");
  body.className = "lsd-modal__body";
  dialog.appendChild(body);
  return body;
}

async function openTextViewer({ modelId, modelTitle, sample }) {
  const overlay = createModalShell();
  const dialog = overlay._dialog;

  const subtitle = `${sample.title || sample.id || "Sample"}${sample.source ? " • " + sample.source : ""}`;
  const header = renderHeader(dialog, { title: `Keyword sample • ${modelTitle}`, subtitle });
  const body = renderBody(dialog);

  header.querySelector('[data-close="1"]').onclick = () => overlay._close();

  const tags = Array.isArray(sample.tags) ? sample.tags : [];
  body.innerHTML = `
    <div class="lsd-bar">
      <div class="lsd-tags">
        <span class="lsd-tag lsd-tag--info">${escapeHtml(sample.id || "sample")}</span>
        ${sample.updatedAt ? `<span class="lsd-tag">Updated ${escapeHtml(sample.updatedAt)}</span>` : ""}
        ${tags.map(t => `<span class="lsd-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      <div class="lsd-btnrow">
        <button class="lsd-btn" id="lsdCopy">Copy</button>
        <button class="lsd-btn" id="lsdDownload">Download</button>
      </div>
    </div>

    <pre class="lsd-code" id="lsdCode">Loading…</pre>
  `;

  let text = "";
  try {
    text = await loadText(sample.path);
    body.querySelector("#lsdCode").textContent = text;
  } catch {
    body.querySelector("#lsdCode").textContent = `Could not load sample:\n${sample.path}`;
  }

  body.querySelector("#lsdCopy").onclick = async () => {
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };

  body.querySelector("#lsdDownload").onclick = () => {
    const fn = `${modelId || "model"}__${sample.id || "sample"}.k`;
    downloadText(fn, text || "");
  };
}

function openListModal({ modelId, modelTitle, samples }) {
  const overlay = createModalShell();
  const dialog = overlay._dialog;

  const header = renderHeader(dialog, {
    title: `Keyword samples • ${modelTitle}`,
    subtitle: "Choose a sample to preview and copy."
  });
  const body = renderBody(dialog);

  header.querySelector('[data-close="1"]').onclick = () => overlay._close();

  const list = document.createElement("div");
  list.className = "lsd-list";
  body.appendChild(list);

  for (const s of samples) {
    const tags = Array.isArray(s.tags) ? s.tags : [];
    const item = document.createElement("div");
    item.className = "lsd-item";
    item.innerHTML = `
      <div class="lsd-item__left">
        <div class="lsd-item__title">${escapeHtml(s.title || s.id || "Sample")}</div>
        <div class="lsd-item__meta">
          ${escapeHtml(s.source || "—")}
          ${s.updatedAt ? ` • Updated ${escapeHtml(s.updatedAt)}` : ""}
        </div>
        <div class="lsd-tags" style="margin-top:8px;">
          <span class="lsd-tag lsd-tag--info">${escapeHtml(s.id || "sample")}</span>
          ${tags.map(t => `<span class="lsd-tag">${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
      <div class="lsd-item__right">
        <button class="lsd-btn lsd-btn--primary" data-view="1">View</button>
        <button class="lsd-btn" data-copy="1">Copy</button>
      </div>
    `;

    item.querySelector('[data-view="1"]').onclick = async () => {
      overlay._close();
      await openTextViewer({ modelId, modelTitle, sample: s });
    };

    item.querySelector('[data-copy="1"]').onclick = async () => {
      try {
        const txt = await loadText(s.path);
        await navigator.clipboard.writeText(txt);
      } catch {}
    };

    list.appendChild(item);
  }
}

export async function openSamples({ modelId, modelTitle, samples }) {
  const arr = Array.isArray(samples) ? samples : [];

  if (arr.length === 0) {
    const overlay = createModalShell();
    const dialog = overlay._dialog;
    const header = renderHeader(dialog, { title: `Keyword samples • ${modelTitle}`, subtitle: "No samples available yet." });
    const body = renderBody(dialog);
    header.querySelector('[data-close="1"]').onclick = () => overlay._close();
    body.innerHTML = `<div class="lsd-note">Add samples in <b>materials.json</b> → <code>samples: []</code></div>`;
    return;
  }

  if (arr.length === 1) {
    await openTextViewer({ modelId, modelTitle, sample: arr[0] });
    return;
  }

  openListModal({ modelId, modelTitle, samples: arr });
}
