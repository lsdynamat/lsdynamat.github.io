function padLeft(s, w) { s = String(s); return s.length >= w ? s : " ".repeat(w - s.length) + s; }
function fmtInt(x, w = 10) { return padLeft(String(Math.trunc(Number(x) || 0)), w); }
function fmtFixed(x, d, w = 10) { const v = Number.isFinite(x) ? x : 0; return padLeft(v.toFixed(d), w); }

function calculate_tm(fc) {
  const Ec0 = 21.5e3, delta_f = 8, fcm0 = 10;
  return Ec0 * Math.pow((fc + delta_f) / fcm0, 1/3);
}
function calculate_ft(fc) {
  if (fc <= 50) return 0.3 * Math.pow(fc, 2/3);
  return 2.12 * Math.log(1 + 0.1 * (fc + 8));
}
function calculate_gf0(dmax) { return 0.021 + 5.357e-4 * dmax; }
function calculate_gf(fc, dmax) {
  const fcm = fc + 8, fcm0 = 10;
  return calculate_gf0(dmax) * Math.pow(fcm / fcm0, 0.7);
}
function calculate_wc(fc, dmax) {
  const ft = calculate_ft(fc);
  const gf = calculate_gf(fc, dmax);
  return (2 * gf) / ft;
}

export default function generate(params, meta) {
  const mid = Number(params.mid ?? 99);
  const ro = Number(params.ro ?? 0.0023);
  const pr = Number(params.pr ?? 0.2);
  const fc = Number(params.fc ?? 30);
  const dmax = Number(params.dmax ?? 16);

  const tm = calculate_tm(fc);
  const uts = calculate_ft(fc);
  const fe = calculate_wc(fc, dmax);
  const asize = dmax / 2;

  const e = 0.0, ys = 0.0, eh = 0.0, uelong = 0.0;
  const rate = 1.0, conm = -3.0, conl = 0.0, cont = 0.0;
  const eps = Array(8).fill(0.0);
  const pres = Array(8).fill(0.0);

  let k = "";
  k += "$# LS-DYNA Keyword file created by LS-PrePost(R)\n";
  k += "*KEYWORD\n";
  k += "*MAT_WINFRITH_CONCRETE_TITLE\n";
  k += `WINFRITH_Concrete_${fc}MPa_dmax_${dmax}mm\n`;

  k += "$#     mid        ro        tm        pr       ucs       uts        fe     asize\n";
  k += fmtInt(mid) + fmtFixed(ro,4) + fmtFixed(tm,1) + fmtFixed(pr,1) + fmtFixed(fc,1) + fmtFixed(uts,3) + fmtFixed(fe,3) + fmtFixed(asize,1) + "\n";

  k += "$#      e        ys        eh    uelong      rate      conm      conl      cont\n";
  k += fmtFixed(e,1) + fmtFixed(ys,1) + fmtFixed(eh,1) + fmtFixed(uelong,1) + fmtFixed(rate,1) + fmtFixed(conm,1) + fmtFixed(conl,1) + fmtFixed(cont,3) + "\n";

  k += "$#    eps1      eps2      eps3      eps4      eps5      eps6      eps7      eps8\n";
  k += eps.map(v => fmtFixed(v,1)).join("") + "\n";

  k += "$#      p1        p2        p3        p4        p5        p6        p7        p8\n";
  k += pres.map(v => fmtFixed(v,1)).join("") + "\n";

  k += "*END\n";
  return k;
}
