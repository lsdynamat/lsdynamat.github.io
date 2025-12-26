import "./app-common.js";
import { readJSON, writeJSON, nowISO } from "./storage.js";

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

const KEY = "materialHub.contactSubmissions";

function escapeHtml(s) {
  return (s || "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderHistory(items) {
  const box = $("history");
  box.innerHTML = "";
  if (!items.length) {
    box.innerHTML = `<div class="muted">No submissions yet.</div>`;
    return;
  }
  for (const it of items.slice().reverse()) {
    const div = document.createElement("div");
    div.className = "itemCard";
    div.innerHTML = `
      <div class="itemTitle">${escapeHtml(it.name || "Anonymous")} • <span class="muted">${escapeHtml(it.time)}</span></div>
      <div class="muted">${escapeHtml(it.email || "")}</div>
      <div style="margin-top:8px;">${escapeHtml(it.message || "")}</div>
    `;
    box.appendChild(div);
  }
}

function main() {
  const name = $("name");
  const email = $("email");
  const message = $("message");
  const status = $("contactStatus");

  const btnSend = $("btnSend");
  const btnClear = $("btnClear");
  const btnReset = $("btnResetHistory");

  function load() {
    return readJSON(KEY, []);
  }
  function save(items) {
    writeJSON(KEY, items);
    renderHistory(items);
  }

  renderHistory(load());

  btnClear.onclick = () => {
    name.value = "";
    email.value = "";
    message.value = "";
    status.textContent = "Cleared.";
  };

  btnReset.onclick = () => {
    save([]);
    status.textContent = "History reset.";
  };

  btnSend.onclick = () => {
    const msg = (message.value || "").trim();
    if (!msg) {
      status.textContent = "Message is empty.";
      return;
    }
    const items = load();
    items.push({
      time: nowISO(),
      name: name.value.trim(),
      email: email.value.trim(),
      message: msg
    });
    save(items);

    message.value = "";
    status.textContent = "Saved locally. You can send again anytime.";
  };
}

main();
