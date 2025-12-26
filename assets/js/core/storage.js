export function readJSON(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
export function nowISO() {
  return new Date().toISOString();
}
