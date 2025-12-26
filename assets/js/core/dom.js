export function getEl(id) {
  return document.getElementById(id);
}

export function setText(id, value) {
  const el = getEl(id);
  if (el) el.textContent = value ?? "";
}

export function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
