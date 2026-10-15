#!/bin/bash
# Upload <decks>/<case>/case.k to the INSA Rennes cluster and submit an LS-DYNA R13 MPP job per case.
# Never uses the foton partition. Jobs live in ~/lsdyna_jobs/lsdynamat/<case>/.
# usage: bash cluster_submit.sh <decks_dir> <case>:<ntasks> [<case>:<ntasks> ...]
set -e
H=vanhatra@cluster-recherche-tete.insa-rennes.fr
R=lsdyna_jobs/lsdynamat
D=$1; shift
for arg in "$@"; do
  c=${arg%%:*}; N=${arg##*:}
  ssh -o BatchMode=yes $H "mkdir -p ~/$R/$c" 2>/dev/null
  scp -q -o BatchMode=yes "$D/$c/case.k" $H:$R/$c/case.k
  ssh -o BatchMode=yes $H "cd ~/$R/$c && rm -f slurm_*.out slurm_*.err && cat > job.sh <<EOF
#!/bin/bash
#SBATCH --job-name=hub_$c
#SBATCH --output=slurm_%j.out
#SBATCH --error=slurm_%j.err
#SBATCH --partition=insa-cpu
#SBATCH --exclude=crn14,crn15
#SBATCH --nodes=1
#SBATCH --ntasks=$N
#SBATCH --ntasks-per-core=1
#SBATCH --cpus-per-task=1
#SBATCH --mem-per-cpu=1G
#SBATCH --time=1-00:00:00
EXE=/data/software/lsdyna/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400/ls-dyna_mpp_d_R13_1_0_x64_centos78_ifort190_avx2_openmpi400
mpirun -n \\\$SLURM_NTASKS \\\$EXE i=case.k o=lsdyna.out memory=200m memory2=100m
EOF
sbatch job.sh" 2>/dev/null
done
ssh -o BatchMode=yes $H "squeue -u vanhatra -o '%i %P %j %T %M %N' | grep -E 'JOBID|hub_'" 2>/dev/null
