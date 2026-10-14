#!/bin/bash
# Post-process example runs ON the INSA cluster and copy back only small files (results.csv, summary.json, status).
# d3plot / binout stay on the cluster.
# usage: bash cluster_fetch.sh <local_results_dir> <case> [<case> ...]
set -e
H=vanhatra@cluster-recherche-tete.insa-rennes.fr
R=lsdyna_jobs/lsdynamat
PY='~/venvs/uav_post/bin/python'
L2A=/data/software/lsdyna/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400.l2a
OUT=$1; shift
HERE=$(cd "$(dirname "$0")" && pwd)
scp -q -o BatchMode=yes "$HERE/post_cluster.py" $H:$R/post_cluster.py
for c in "$@"; do
  mkdir -p "$OUT/$c"
  ssh -o BatchMode=yes $H "cd ~/$R/$c && rm -rf asc && mkdir asc && cd asc &&
    $L2A ../binout* > l2a.log 2>&1; cd ~/$R && $PY post_cluster.py $c > $c/asc/post.log 2>&1;
    { grep -E ' t [0-9]' $c/lsdyna.out | tail -1; grep -E 'N o r m a l|E r r o r' $c/lsdyna.out | head -2;
      grep -h 'Warning' $c/mes0000 2>/dev/null | sort | uniq -c | head -5;
      grep -E 'Elapsed time' $c/lsdyna.out | tail -1; } > $c/asc/status.txt" 2>/dev/null
  scp -q -o BatchMode=yes "$H:$R/$c/asc/results.csv" "$H:$R/$c/asc/summary.json" "$H:$R/$c/asc/status.txt" "$OUT/$c/" 2>/dev/null || true
  echo "== $c"; cat "$OUT/$c/status.txt" 2>/dev/null; cat "$OUT/$c/summary.json" 2>/dev/null | tr -d '\n'; echo
done
