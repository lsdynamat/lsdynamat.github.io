"""Post-process penetration runs: projectile history from rbdout, energy check from glstat.
Runs on the cluster (python3, no packages) or locally.
usage: python post_penetration.py <runs_dir> [<out_csv>]
  -> one row per case: residual velocity (slabs) or penetration depth (DOP), energy ratio, sliding energy share,
     plus <runs_dir>/<case>/history.csv (time, z-velocity, nose depth)."""
import csv, os, re, sys

GAP = 0.5   # mm, nose tip above the impact face at t = 0 (build_penetration.py)


def rbdout(path):
    """time, z-displacement, z-velocity of rigid body 2 (global axes)."""
    out, t = [], None
    disp = vel = None
    for line in open(path, errors="ignore"):
        m = re.search(r"time=\s*(\S+)", line)
        if m:
            t = float(m.group(1)); disp = vel = None; continue
        if line.lstrip().startswith("displacements:") and disp is None:
            disp = float(line.split()[3])
        elif line.lstrip().startswith("velocities:") and vel is None:
            vel = float(line.split()[3])
            if t is not None and disp is not None:
                out.append((t, disp, vel))
    return out


def glstat(path):
    """last values of total energy / initial, sliding energy, initial kinetic energy."""
    r = {}
    for line in open(path, errors="ignore"):
        for key, name in (("energy ratio w/o eroded", "ratio"), ("sliding interface energy", "slide"),
                          ("kinetic energy....", "ke"), ("total energy / initial", "ratio_all")):
            if key in line:
                v = float(line.split()[-1])
                r.setdefault(name + "0", v)
                r[name] = v
    return r


def main():
    runs = sys.argv[1]
    rows = []
    for case in sorted(os.listdir(runs)):
        d = os.path.join(runs, case)
        if not case.startswith("PEN-") or not os.path.exists(os.path.join(d, "rbdout")):
            continue
        k = open(os.path.join(d, "case.k")).read(4000)
        T = re.search(r"Vs = (\S+) m/s", k)
        vs = float(T.group(1)) if T else float("nan")
        h = rbdout(os.path.join(d, "rbdout"))
        if not h:
            continue
        log = ""
        for f in ("lsdyna.out", "run.log", "messag"):
            if os.path.exists(os.path.join(d, f)):
                log += open(os.path.join(d, f), errors="ignore").read()[-5000:]
        normal = "N o r m a l" in log
        with open(os.path.join(d, "history.csv"), "w", newline="") as f:
            w = csv.writer(f); w.writerow(["t_ms", "vz_ms", "nose_depth_mm"])
            for t, dz, vz in h[::max(1, len(h) // 400)]:
                w.writerow([f"{t:.5g}", f"{vz:.5g}", f"{max(0.0, -dz - GAP):.5g}"])
        t_end, dz_end, vz_end = h[-1]
        depth = max(0.0, -min(x[1] for x in h) - GAP)
        g = glstat(os.path.join(d, "glstat")) if os.path.exists(os.path.join(d, "glstat")) else {}
        rows.append({"case": case, "normal": int(normal), "t_end_ms": f"{t_end:.4g}", "vs_ms": vs,
                     "vr_ms": f"{max(0.0, -vz_end):.1f}", "depth_mm": f"{depth:.1f}",
                     "energy_ratio": f"{g.get('ratio_all', float('nan')):.3f}",   # eroded energy included
                     "sliding_over_ke0": f"{g.get('slide', 0.0) / g.get('ke0', 1.0):.3f}"})
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(runs, "penetration_results.csv")
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]) if rows else ["case"]); w.writeheader(); w.writerows(rows)
    for r in rows:
        print(r)


if __name__ == "__main__":
    main()
