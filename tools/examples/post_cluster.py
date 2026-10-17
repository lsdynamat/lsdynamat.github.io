"""Turn the l2a ASCII files of one example run into a small results.csv + summary.json.
Runs on the cluster next to the heavy output; only the csv/json are copied back.

usage: python post_cluster.py <case_dir>        (expects <case_dir>/asc/{spcforc,nodout,glstat})
"""
import json
import math
import os
import re
import sys

NUM = r"-?\d\.\d+E[+-]\d+"


def read_spcforc(path):
    """time -> resultant (fx, fy, fz) of all SPC reactions."""
    out, t = [], None
    for line in open(path):
        if line.startswith(" output at time"):
            t = float(line.split("=")[1])
        elif "force resultants" in line and t is not None:
            f = [float(v) for v in re.findall(NUM, line)]
            out.append((t, *f))
            t = None
    return out


def read_nodout(path):
    """[(time, {node: (dx, dy, dz)})]"""
    out, cur = [], None
    for line in open(path):
        m = re.search(r"\( at time\s+(" + NUM + r")\s*\)", line)
        if m:
            cur = (float(m.group(1)), {})
            out.append(cur)
            continue
        if cur is not None:
            p = line.split(None, 1)
            if len(p) == 2 and p[0].isdigit():
                v = [float(x) for x in re.findall(NUM, p[1])]
                if len(v) >= 3:
                    cur[1][int(p[0])] = tuple(v[:3])
    return out


def read_glstat_last(path):
    """Energies of the last glstat block."""
    keys = {"kinetic energy": "KE", "internal energy": "IE", "hourglass energy": "HG", "external work": "W"}
    last = {}
    for line in open(path):
        l = line.strip()
        for k, tag in keys.items():
            if l.startswith(k):
                v = re.findall(NUM, l)
                if v:
                    last[tag] = float(v[-1])
    return last


def nodes_of_set(deck, title_start):
    """Node ids of the *SET_NODE_LIST_TITLE whose title starts with title_start."""
    lines = open(deck).read().splitlines()
    for i, l in enumerate(lines):
        if l.startswith("*SET_NODE_LIST_TITLE") and lines[i + 1].startswith(title_start):
            ids = []
            for l2 in lines[i + 3:]:
                if l2.startswith("*"):
                    break
                ids += [int(l2[k:k + 10]) for k in range(0, len(l2), 10) if l2[k:k + 10].strip()]
            return ids
    raise KeyError(title_start)


def interp(series, t):
    """linear interpolation of [(t, v)] at t (clamped at both ends)"""
    if t <= series[0][0]:
        return series[0][1]
    for (t0, v0), (t1, v1) in zip(series, series[1:]):
        if t0 <= t <= t1:
            return v0 + (v1 - v0) * (t - t0) / (t1 - t0) if t1 > t0 else v0
    return series[-1][1]


def main(cdir):
    case = os.path.basename(os.path.normpath(cdir))
    deck = os.path.join(cdir, "case.k")
    asc = os.path.join(cdir, "asc")
    spc = read_spcforc(os.path.join(asc, "spcforc"))
    nod = read_nodout(os.path.join(asc, "nodout"))
    hist = nodes_of_set(deck, "CMOD pair") if case.startswith(("BEAM", "HB-B")) else \
        nodes_of_set(deck, "gauge marks") if case.startswith("BAR") else nodes_of_set(deck, "top centre")
    rows, summ = [], {"case": case}

    if case.startswith("HB-B"):
        # Hoover et al. (2013) beams: W = 40 mm, span 2.176 D, notch a (see build_hoover.py)
        D, S, a = {"HB-B93": (93.0, 202.0, 27.0), "HB-B215": (215.0, 469.0, 65.0)}[case.rsplit("-", 1)[0]]
        W = 40.0
        c1, c2, d1, d2 = hist
        for t, d in nod:
            if not all(n in d for n in hist):
                continue
            cmod = d[c2][0] - d[c1][0]
            defl = -(d[d1][2] + d[d2][2]) / 2
            fz = interp([(s[0], s[3]) for s in spc], t)
            rows.append((t, defl, cmod, fz, defl / D, 1.5 * fz * S / (W * D ** 2)))
        hdr = "time_ms,deflection_mm,cmod_mm,force_N,nominal_strain,nominal_stress_MPa"
        pk = max(rows, key=lambda r: r[3])
        Wk = sum((r1[3] + r0[3]) / 2 * (r1[1] - r0[1]) for r0, r1 in zip(rows, rows[1:]))
        summ.update(peak_force_kN=pk[3] / 1e3, peak_nominal_stress_MPa=pk[5], defl_at_peak_mm=pk[1],
                    work_Nmm=Wk, GF_Nmm=Wk / (W * (D - a)), final_force_ratio=rows[-1][3] / pk[3])
    elif case.startswith(("CYL", "HB-CYL")):
        A, H = (math.pi * 37.5 ** 2, 150.0) if case.startswith("HB") else (math.pi * 75.0 ** 2, 300.0)
        top = hist[0]
        u = [(t, d[top][2]) for t, d in nod if top in d]
        for t, fx, fy, fz in spc:
            du = -interp(u, t)
            rows.append((t, du, du / H, fz, fz / A))
        hdr = "time_ms,shortening_mm,strain,force_N,stress_MPa"
        pk = max(rows, key=lambda r: r[4])
        summ.update(peak_stress_MPa=pk[4], strain_at_peak=pk[2], peak_force_kN=pk[3] / 1e3)
    elif case.startswith("BEAM"):
        c1, c2, d1, d2 = hist
        for t, d in nod:
            if not all(n in d for n in hist):
                continue
            cmod = d[c2][0] - d[c1][0]
            defl = -(d[d1][2] + d[d2][2]) / 2
            fz = interp([(s[0], s[3]) for s in spc], t)
            rows.append((t, defl, cmod, fz))
        hdr = "time_ms,deflection_mm,cmod_mm,force_N"
        pk = max(rows, key=lambda r: r[3])
        # work of fracture up to the end of the test, per ligament area (125 x 150)
        W = sum((r1[3] + r0[3]) / 2 * (r1[1] - r0[1]) for r0, r1 in zip(rows, rows[1:]))
        summ.update(peak_force_kN=pk[3] / 1e3, defl_at_peak_mm=pk[1], cmod_at_peak_mm=pk[2],
                    work_Nmm=W, GF_Nmm=W / (125.0 * 150.0), final_force_ratio=rows[-1][3] / pk[3])
        # EN 14651 limit of proportionality is the peak in the CMOD range 0-0.05 mm
        fl = max((r for r in rows if r[2] <= 0.05), key=lambda r: r[3])
        summ.update(fct_L_MPa=3 * fl[3] * 500.0 / (2 * 150.0 * 125.0 ** 2))
    else:  # BAR
        A0, L0 = math.pi * 5.0 ** 2, 50.0
        g0, g1 = hist
        for t, d in nod:
            if g0 in d and g1 in d:
                el = d[g1][2] - d[g0][2]
                fz = interp([(s[0], s[3]) for s in spc], t)
                rows.append((t, el, el / L0, -fz, -fz / A0))
        hdr = "time_ms,elongation_mm,eng_strain,force_N,eng_stress_MPa"
        pk = max(rows, key=lambda r: r[4])
        summ.update(Rm_MPa=pk[4], Ag_strain=pk[2], stress_at_eps_0p002_MPa=next((r[4] for r in rows if r[2] > 0.002), None))

    e = read_glstat_last(os.path.join(asc, "glstat"))
    if e.get("W"):
        summ.update(hourglass_pct=100 * e.get("HG", 0) / e["W"], kinetic_pct=100 * e.get("KE", 0) / e["W"])

    with open(os.path.join(cdir, "asc", "results.csv"), "w") as fh:
        fh.write(hdr + "\n")
        for r in rows:
            fh.write(",".join(f"{v:.6g}" for v in r) + "\n")
    with open(os.path.join(cdir, "asc", "summary.json"), "w") as fh:
        json.dump(summ, fh, indent=1)
    print(json.dumps(summ))


if __name__ == "__main__":
    main(sys.argv[1])
