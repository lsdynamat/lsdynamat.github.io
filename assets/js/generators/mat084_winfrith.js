export function generate(p){
  const { mid, ro, tm, pr, ucs, uts, fe, asize } = p;

  return `
*KEYWORD
*MAT_WINFRITH_CONCRETE_TITLE
WINFRITH_Concrete
$#     mid        ro        tm        pr       ucs       uts        fe     asize
${mid} ${ro} ${tm} ${pr} ${ucs} ${uts} ${fe} ${asize}
$#      e        ys        eh    uelong      rate      conm      conl      cont
0 0 0 0 1 -3 0 0
$#    eps1      eps2      eps3      eps4      eps5      eps6      eps7      eps8
0 0 0 0 0 0 0 0
$#      p1        p2        p3        p4        p5        p6        p7        p8
0 0 0 0 0 0 0 0
*END
`.trim();
}
