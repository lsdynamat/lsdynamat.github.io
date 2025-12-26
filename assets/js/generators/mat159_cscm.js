export function generate(p){
  const { mid, ro, g, k, alpha, theta, lamda, beta, r, xd, gfc, gft, gfs } = p;

  return `
*KEYWORD
*MAT_CSCM_TITLE
MAT_CSCM
$#     mid        ro     nplot     incre     irate     erode     recov   itretrc
${mid} ${ro} 1 0 0 1.05 0 0
$#       g         k     alpha     theta     lamda      beta        nh        ch
${g} ${k} ${alpha} ${theta} ${lamda} ${beta} 0 0
$#       r        xd         w        d1        d2
${r} ${xd} 0.065 0.000611 0.000002
$#       b       gfc         d       gft       gfs      pwrc      pwrt      pmod
100 ${gfc} 0.1 ${gft} ${gfs} 5 1 0
*END
`.trim();
}
