"""Compare penetration runs with the tests, for both erosion approaches agreed with the user (2026-10-23).
usage: python analyze_penetration.py <penetration_results.csv> [<out_dir>]
  (1) pre-specified MXEPS = 0.3 / 0.5 / 1.0: prediction / test per shot and model, range over the three values
  (2) MXEPS calibrated per model on HAN92 shot 1-0054 (V_r = 615 m/s) by linear interpolation on the grid;
      writes calibration.csv with the value to use for the prediction runs, then scores the other shots
Measure: HAN92 residual velocity V_r (a shot with V_r = 0 in the test is scored on the predicted V_r directly);
DOP series penetration depth. Ratio = prediction / test."""
import csv, os, re, statistics, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PRESET = [0.3, 0.5, 1.0]
CAL_SHOT, CAL_VR = ("HAN92", "1-0054"), 615.0


def tests():
    rows = [r for r in csv.reader(open(os.path.join(HERE, "data", "penetration_tests.csv"))) if r and not r[0].startswith("#")]
    return {(d["series"], d["shot"]): d for d in (dict(zip(rows[0], r)) for r in rows[1:])}


def runs(path):
    out = {}
    for r in csv.DictReader(open(path)):
        m = re.match(r"PEN-(\w+)-(.+)-(KCC|CSCM|WIN|RHT|HJC)-E(\w+)$", r["case"])
        if not m or r.get("normal") != "1":
            continue
        out[(m.group(1), m.group(2), m.group(3), float(m.group(4).replace("p", ".")))] = r
    return out


def measure(series, r):
    return float(r["vr_ms"]) if series == "HAN92" else float(r["depth_mm"]) / 1000


def calibrate(R, model):
    """MXEPS giving V_r = 615 m/s on the calibration shot; None if the grid does not bracket it."""
    pts = sorted((e, float(r["vr_ms"])) for (s, sh, m, e), r in R.items() if (s, sh) == CAL_SHOT and m == model)
    for (e0, v0), (e1, v1) in zip(pts, pts[1:]):
        if (v0 - CAL_VR) * (v1 - CAL_VR) <= 0 and v1 != v0:
            return e0 + (CAL_VR - v0) * (e1 - e0) / (v1 - v0), pts
    return None, pts


def main():
    T, R = tests(), runs(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(sys.argv[1]))
    models = sorted({k[2] for k in R})
    # (2) calibration
    with open(os.path.join(out, "calibration.csv"), "w", newline="") as f:
        w = csv.writer(f); w.writerow(["model", "mxeps_cal", "grid (mxeps:V_r)"])
        for m in models:
            e, pts = calibrate(R, m)
            w.writerow([m, "" if e is None else f"{e:.3f}", " ".join(f"{a:g}:{b:.0f}" for a, b in pts)])
            print(f"calibration {m}: MXEPS = {e if e is None else round(e, 3)}  grid {pts}")
    # (1) preset values, and any other MXEPS present (e.g. calibrated runs)
    rows = []
    for (s, sh, m, e), r in sorted(R.items()):
        t = T[(s, sh)]
        meas = float(t["vr_ms"]) if s == "HAN92" else float(t["depth_m"])
        pred = measure(s, r)
        rows.append({"series": s, "shot": sh, "model": m, "mxeps": e, "vs_ms": t["vs_ms"], "test": meas,
                     "pred": round(pred, 3), "ratio": "" if meas == 0 else round(pred / meas, 3),
                     "energy_ratio": r["energy_ratio"], "sliding_over_ke0": r["sliding_over_ke0"]})
    with open(os.path.join(out, "comparison.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
    for m in models:
        for e in sorted({x["mxeps"] for x in rows if x["model"] == m}):
            for s in ("HAN92", "FREW98", "FOR96"):
                q = [x["ratio"] for x in rows if x["model"] == m and x["mxeps"] == e and x["series"] == s
                     and x["ratio"] != "" and (s, x["shot"]) != CAL_SHOT]
                if q:
                    sd = statistics.stdev(q) if len(q) > 1 else 0
                    print(f"{m:5s} MXEPS {e:<5g} {s:6s} n={len(q):2d} mean {statistics.mean(q):.2f} "
                          f"CoV {sd / statistics.mean(q) * 100:4.0f}% range {min(q):.2f}-{max(q):.2f}")


if __name__ == "__main__":
    main()
