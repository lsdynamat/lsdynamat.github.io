#!/bin/bash
# Build the penetration decks ON the INSA Rennes cluster (DOP decks are 50-300 MB) and submit one LS-DYNA R13 MPP job per case.
# Never uses the foton partition. Jobs live in ~/lsdyna_jobs/lsdynamat/pen/<case>/; job names start with hub_.
# PEN_SFS=<x> sets the contact stiffness scale, PEN_HSCALE=<x> the mesh size scale (see build_penetration.py); PEN_PART=<partition> (default: every CPU partition except foton, which must never be used).
# usage: bash cluster_penetration.sh <MXEPS[,MXEPS..]> <series|model|shot> ...   (same selectors as build_penetration.py)
set -e
H=vanhatra@cluster-recherche-tete.insa-rennes.fr
R=lsdyna_jobs/lsdynamat/pen
HERE=$(cd "$(dirname "$0")" && pwd)
ssh -o BatchMode=yes $H "mkdir -p ~/$R/tools/data ~/$R/tools/materials/pen" 2>/dev/null
scp -q -o BatchMode=yes "$HERE/build_penetration.py" "$HERE/post_penetration.py" $H:$R/tools/
scp -q -o BatchMode=yes "$HERE/data/penetration_tests.csv" $H:$R/tools/data/
scp -q -o BatchMode=yes "$HERE"/materials/pen/*.k $H:$R/tools/materials/pen/
ssh -o BatchMode=yes $H "cd ~/$R && PEN_SFS=${PEN_SFS:-100} PEN_HSCALE=${PEN_HSCALE:-1} python3 tools/build_penetration.py ~/$R $* > built.txt && cat built.txt" 2>/dev/null
ssh -o BatchMode=yes $H "cd ~/$R && for c in \$(cut -d: -f1 built.txt); do
  case \$c in PEN-HAN92-*) N=8; MEM=16G;; *) N=24; MEM=60G;; esac
  cd ~/$R/\$c && rm -f slurm_*.out slurm_*.err && cat > job.sh <<EOF
#!/bin/bash
#SBATCH --job-name=hub_\$c
#SBATCH --output=slurm_%j.out
#SBATCH --error=slurm_%j.err
#SBATCH --partition=${PEN_PART:-lgcgm,insa-cpu,insa-cpu-amd,insa-cpu-intel,insa-cpu-lte}
#SBATCH --exclude=crn14,crn15
#SBATCH --nodes=1
#SBATCH --ntasks=\$N
#SBATCH --ntasks-per-core=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=\$MEM
#SBATCH --time=1-00:00:00
EXE=/data/software/lsdyna/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400
mpirun -n \\\$SLURM_NTASKS \\\$EXE i=case.k o=lsdyna.out memory=600m memory2=150m d=nodump
\\\${EXE%/*}/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400.l2a binout0000
rm -f d3plot* d3dump* binout* adptmp scr0000 mes0*
EOF
  sbatch job.sh
done" 2>/dev/null
ssh -o BatchMode=yes $H "squeue -u vanhatra -h -o '%j %T' | grep -c hub_PEN" 2>/dev/null
