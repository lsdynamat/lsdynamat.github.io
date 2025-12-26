function padLeft(s, w) {
  s = String(s);
  return s.length >= w ? s : " ".repeat(w - s.length) + s;
}
function fmtInt(x, w = 10) {
  return padLeft(String(Math.trunc(Number(x) || 0)), w);
}
function fmtFixed(x, decimals, w = 10) {
  const v = Number.isFinite(x) ? x : 0;
  return padLeft(v.toFixed(decimals), w);
}

function calculate_fracture_energy(fc, dmax = 16) {
  const delta_f = 8;
  const fcm = fc + delta_f;
  const fcm0 = 10;
  const GF0 = 0.021 + 5.357e-4 * dmax;
  const GF = GF0 * Math.pow(fcm / fcm0, 0.7);
  return { GF0, GF };
}

function calculate_modulus(fc) {
  const Ec0 = 21.5e3;
  const delta_f = 8;
  const fcm = fc + delta_f;
  const fcm0 = 10;
  const poisson_ratio = 0.2;

  // exactly as your python: E = Ec0 * ((fcm + delta_f)/fcm0)^(1/3) with fcm=fc+8 => (fc+16)/10
  const E = Ec0 * Math.pow((fcm + delta_f) / fcm0, 1 / 3);
  const G = E / (2 * (1 + poisson_ratio));
  const K = E / (3 * (1 - 2 * poisson_ratio));
  return { G, K };
}

function calculate_alpha_beta(fc) {
  const alpha = 13.9846 * Math.exp(fc / 68.8756) - 13.8981;
  const theta = 0.3533 - 3.3294e-4 * fc - 3.8182e-6 * (fc ** 2);
  const lamda = 3.6657 * Math.exp(fc / 39.9363) - 4.7092;
  const beta = 18.17791 * Math.pow(fc, -1.7163);

  const alpha1 = 0.82;
  const theta1 = 0.0;
  const lamda1 = 0.24;
  const beta1 = 0.33565 * Math.pow(fc, -0.95383);

  const alpha2 = 0.76;
  const theta2 = 0.0;
  const lamda2 = 0.26;
  const beta2 = 0.285 * Math.pow(fc, -0.94843);

  return { alpha, theta, lamda, beta, alpha1, theta1, lamda1, beta1, alpha2, theta2, lamda2, beta2 };
}

function calculate_additional_parameters(fc) {
  const fpsi = fc * 145.038;

  const eta0c = (1.2772337e-11 * (fpsi ** 2) - 1.0613722e-7 * fpsi + 3.203497e-4);
  const nc = 0.78;

  const eta0t = (8.0614774e-13 * (fc ** 2) - 9.77736719e-10 * fc + 5.0752351e-5);
  const nt = 0.48;

  const overc = 1.309663e-2 * (fc ** 2) - 0.3927659 * fc + 21.45;
  const overt = 1.309663e-2 * (fc ** 2) - 0.3927659 * fc + 21.45;

  const srate = 1.0;
  const repow = 1.0;

  return { eta0c, nc, eta0t, nt, overc, overt, srate, repow };
}

function calculate_r_xd(fc) {
  const R = 4.45994 * Math.exp(-fc / 11.51679) + 1.95358;
  const XD = 17.087 + 1.892 * fc;
  return { R, XD };
}

export function genMAT159_CSCM(p) {
  const fc = Number(p.fc ?? 40);
  const dmax = Number(p.dmax ?? 16);

  const mid = Number(p.mid ?? 159);
  const ro = Number(p.ro ?? 0.0023);

  const { GF } = calculate_fracture_energy(fc, dmax);
  const { G, K } = calculate_modulus(fc);
  const ab = calculate_alpha_beta(fc);
  const { R, XD } = calculate_r_xd(fc);
  const add = calculate_additional_parameters(fc);

  const GFC = 100 * GF;
  const GFT = GF;
  const GFS = GF;

  const B = 100;
  const D = 0.1;
  const PWRC = 5;
  const PWRT = 1;
  const PMOD = 0;

  let k = "";
  k += "$# LS-DYNA Keyword file created by LS-PrePost(R) V4.8.17 - 24Jun2021\n";
  k += "*KEYWORD\n";
  k += "*TITLE\n";
  k += "$#                                                                         title\n";
  k += "LS-DYNA keyword deck by LS-PrePost\n";
  k += "*MAT_CSCM_TITLE\n";
  k += `MAT_CSCM_${fc}MPa\n`;

  k += "$#     mid        ro     nplot     incre     irate     erode     recov   itretrc\n";
  k +=
    fmtInt(mid) +
    fmtFixed(ro, 4) +
    fmtInt(1) +
    fmtFixed(0.0, 1) +
    fmtInt(0) +
    padLeft("1.05", 10) +
    fmtFixed(0.0, 1) +
    fmtInt(0) +
    "\n";

  k += "$#    pred\n";
  k += fmtFixed(0.0, 1) + "\n";

  k += "$#       g         k     alpha     theta     lamda      beta        nh        ch\n";
  k +=
    fmtFixed(G, 1) +
    fmtFixed(K, 1) +
    fmtFixed(ab.alpha, 4) +
    fmtFixed(ab.theta, 7) +
    fmtFixed(ab.lamda, 5) +
    fmtFixed(ab.beta, 7) +
    fmtFixed(0.0, 1) +
    fmtFixed(0.0, 1) +
    "\n";

  k += "$#  alpha1    theta1    lamda1     beta1    alpha2    theta2    lamda2     beta2\n";
  k +=
    fmtFixed(ab.alpha1, 2) +
    fmtFixed(ab.theta1, 1) +
    fmtFixed(ab.lamda1, 2) +
    fmtFixed(ab.beta1, 6) +
    fmtFixed(ab.alpha2, 2) +
    fmtFixed(ab.theta2, 1) +
    fmtFixed(ab.lamda2, 2) +
    fmtFixed(ab.beta2, 7) +
    "\n";

  k += "$#       r        xd         w        d1        d2\n";
  k +=
    fmtFixed(R, 5) +
    fmtFixed(XD, 3) +
    fmtFixed(0.065, 3) +
    fmtFixed(0.000611, 6) +
    fmtFixed(0.000002, 6) +
    "\n";

  k += "$#       b       gfc         d       gft       gfs      pwrc      pwrt      pmod\n";
  k +=
    fmtFixed(B, 1) +
    fmtFixed(GFC, 1) +
    fmtFixed(D, 1) +
    fmtFixed(GFT, 2) +
    fmtFixed(GFS, 2) +
    fmtFixed(PWRC, 1) +
    fmtFixed(PWRT, 1) +
    fmtFixed(PMOD, 1) +
    "\n";

  k += "$#   eta0c        nc     etaot        nt     overc     overt     srate     rep0w\n";
  k +=
    fmtFixed(add.eta0c, 7) +
    fmtFixed(add.nc, 2) +
    fmtFixed(add.eta0t, 7) +
    fmtFixed(add.nt, 2) +
    fmtFixed(add.overc, 5) +
    fmtFixed(add.overt, 5) +
    fmtFixed(add.srate, 1) +
    fmtFixed(add.repow, 1) +
    "\n";

  k += "*END\n";
  return k;
}
