import { getEl, setText, escapeHtml } from "../core/dom.js";
import { readJSON, writeJSON, nowISO } from "../core/storage.js";

setText("year", new Date().getFullYear());

const KEY = "materialhub.contact.v1";

function renderHistory(box, items) {
  if (!box) return;
  box.innerHTML = "";
  if (!items.length) {
    box.innerHTML = `<div class="small">No submissions yet.</div>`;
    return;
  }
  for (const it of items.slice().reverse()) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item-title">${escapeHtml(it.name || "Anonymous")} • <span class="item-meta">${escapeHtml(it.time)}</span></div>
      <div class="item-meta">${escapeHtml(it.email || "")}</div>
      <div style="margin-top:8px;">${escapeHtml(it.message || "")}</div>
    `;
    box.appendChild(div);
  }
}

function main() {
  const name = getEl("name");
  const email = getEl("email");
  const message = getEl("message");
  const status = getEl("status");
  const history = getEl("history");

  const btnSend = getEl("btnSend");
  const btnClear = getEl("btnClear");
  const btnReset = getEl("btnReset");

  function load() { return readJSON(KEY, []); }
  function save(items) { writeJSON(KEY, items); renderHistory(history, items); }

  renderHistory(history, load());

  if (btnClear) btnClear.onclick = () => {
    if (name) name.value = "";
    if (email) email.value = "";
    if (message) message.value = "";
    if (status) status.textContent = "Cleared.";
  };

  if (btnReset) btnReset.onclick = () => {
    save([]);
    if (status) status.textContent = "History reset.";
  };

  if (btnSend) btnSend.onclick = () => {
    const msg = (message?.value || "").trim();
    if (!msg) { if (status) status.textContent = "Message is empty."; return; }

    const items = load();
    items.push({
      time: nowISO(),
      name: (name?.value || "").trim(),
      email: (email?.value || "").trim(),
      message: msg
    });

    save(items);
    if (message) message.value = "";
    if (status) status.textContent = "Saved locally. You can send again anytime.";
  };
}

main();
