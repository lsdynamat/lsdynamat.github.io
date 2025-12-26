export function generate(p){
  const { mid, ro, pr, c10, c01, k } = p;

  return `
*KEYWORD
*MAT_MOONEY-RIVLIN_RUBBER_TITLE
Mooney-Rivlin (example)
$#     mid        ro        pr
${mid} ${ro} ${pr}
$#     c10       c01         k
${c10} ${c01} ${k}
*END
`.trim();
}
