#!/bin/bash
# Render fringe images from d3plot ON the INSA cluster (LS-PrePost 4.12, Mesa + Xvfb) and copy back only the PNGs.
# usage: bash cluster_render.sh <local_results_dir> <case> [<case> ...]
set -e
H=vanhatra@cluster-recherche-tete.insa-rennes.fr
R=lsdyna_jobs/lsdynamat
OUT=$1; shift
for c in "$@"; do
  case $c in
    CYL-*)  VIEW="rx -70
rz 30";  LAST=32; CAP="effective plastic strain field at the end of the test (3 mm shortening)";;
    BEAM-*) VIEW="rx -90";        LAST=42; CAP="effective plastic strain at the end of the test (1 mm deflection), side view";;
    BAR-*)  VIEW="rx -90
ry 90";  LAST=32; CAP="effective plastic strain at 24 mm elongation of the 80 mm parallel length";;
  esac
  FR=7
  case $c in *-WIN) FR=77; CAP="maximum principal strain at the end of the test (Winfrith stores cracks as strain, not as plastic strain), side view";; esac
  ssh -o BatchMode=yes $H "mkdir -p ~/$R/$c/img && cd ~/$R/$c/img && rm -f *.png && cat > end.cfile <<EOF
open d3plot \"../d3plot\"
ac
fringe $FR
pfringe
state $LAST
$VIEW
ac
print png \"fringe_end.png\" LANDSCAPE nocompress gamma 1.000 opaque enlisted \"OGL1x1\"
exit
EOF
timeout 300 xvfb-run -a -s '-screen 0 1100x700x24' /data/software/lsdyna/lsprepost4.12_common/lspp412_mesa c=end.cfile > lspp.log 2>&1 || true" 2>/dev/null
  mkdir -p "$OUT/$c"
  if scp -q -o BatchMode=yes "$H:$R/$c/img/fringe_end.png" "$OUT/$c/fringe_end.png" 2>/dev/null; then
    printf '[{"file":"fringe_end.png","caption":"%s"}]\n' "$CAP" > "$OUT/$c/figures.json"
    echo "$c: image ok"
  else
    echo "$c: no image"
  fi
done
