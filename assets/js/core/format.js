export function asNum(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
