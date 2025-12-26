export async function loadJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load JSON: ${path} (HTTP ${res.status})`);
  return await res.json();
}

export async function loadText(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load text: ${path} (HTTP ${res.status})`);
  return await res.text();
}
