export function getEl(id){ return document.getElementById(id); }

export function setText(id, txt){
  const el = getEl(id);
  if (el) el.textContent = (txt ?? "").toString();
}

export function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function on(el, ev, fn){ if (el) el.addEventListener(ev, fn); }
