export function generate(p){
  const { mid, ro, e, pr, a, b, n, c, m, troom, tmelt, eps0 } = p;

  return `
*KEYWORD
*MAT_JOHNSON_COOK_TITLE
Johnson-Cook (example)
$#     mid        ro         e        pr
${mid} ${ro} ${e} ${pr}
$#       a         b         n         c         m
${a} ${b} ${n} ${c} ${m}
$#   troom     tmelt      eps0
${troom} ${tmelt} ${eps0}
*END
`.trim();
}
