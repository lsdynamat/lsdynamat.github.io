export function downloadText(filename, text) {
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

export function safeFilename(meta, params) {
  const mat = (meta.mat || meta.id || "MAT").toString().replaceAll("*", "").replaceAll(" ", "_");
  const mid = params.mid ?? 1;
  return `${mat}_MID${mid}.k`;
}

export function buildDefaults(meta) {
  const v = {};
  for (const inp of (meta.inputs || [])) v[inp.key] = inp.default;
  return v;
}
