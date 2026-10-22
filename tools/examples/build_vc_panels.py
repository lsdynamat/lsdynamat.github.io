"""Vecchio & Collins (1986) panels in monotonic pure shear: one 50 x 50 mm shell (ELFORM 16), t = 70 mm,
*PART_COMPOSITE concrete / x-steel / y-steel / concrete with the MAT_172 generator cards (h = 50 mm).
Load control: self-equilibrated nodal shear forces ramped to 1.5 v_u(test) in 60 ms; statically determinate supports.
Cards: generator 1.1 output in materials/vc (h = 50 mm, d_max = 6 mm).
usage: python build_vc_panels.py <out_dir>   -> <out_dir>/VC-<panel>-V11/case.k"""
import csv, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
S = HERE
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "decks_vc")
L, T, TEND = 50.0, 70.0, 60.0
def c(*v): return "".join(f"{x:10d}" if isinstance(x, int) else f"{x:10.4g}" for x in v)
def card(name, variant):
    txt = open(os.path.join(HERE, "materials", "vc", name + ".k")).read().replace("*KEYWORD\n", "").replace("*END", "").rstrip()
    if variant in ("DG", "AG", "DA") and name.endswith("_c"):
        ls = txt.split("\n")
        if variant in ("DG", "DA"):
            i = next(k for k, l in enumerate(ls) if l.startswith("$#    aopt")); ls[i + 1] = ls[i + 1][:50] + f"{1.0:10.1f}" + ls[i + 1][60:]
        if variant in ("AG", "DA"):
            i = next(k for k, l in enumerate(ls) if l.startswith("$#   esoft")); ls[i + 1] = ls[i + 1][:60] + f"{6.0:10.1f}" + ls[i + 1][70:]
        txt = "\n".join(ls)
    if variant == "TS" and name.endswith("_c"):
        ls = txt.split("\n")
        i = next(k for k, l in enumerate(ls) if l.startswith("$#     mid")); ls[i + 1] = ls[i + 1][:60] + f"{0.0025:10.4f}" + ls[i + 1][70:]
        i = next(k for k, l in enumerate(ls) if l.startswith("$#   esoft")); ls[i + 1] = ls[i + 1][:10] + f"{0.0:10.1f}" + ls[i + 1][20:]
        txt = "\n".join(ls)
    return txt
rows = [r for r in csv.reader(open(os.path.join(HERE, "data", "vecchio_collins_1986_panels.csv"))) if r and not r[0].startswith("#")]
P = [dict(zip(rows[0], r)) for r in rows[1:]]
for variant in ("V11",):
    for p in P:
        n = p["panel"]; rx, ry = float(p["rho_x"]), float(p["rho_y"])
        tc = T * (1 - rx - ry) / 2
        lay = [(1, tc), (2, rx * T)] + ([(3, ry * T)] if ry > 0 else []) + [(1, tc)]
        lines = []
        for k in range(0, len(lay), 2):
            lines.append("".join(c(m, t, 0.0, 0) for m, t in lay[k:k + 2]))
        vmax = 1.5 * float(p["v_u_MPa"])
        F = vmax * L * T / 2
        case = f"VC-{n}-{variant}"
        D = ["*KEYWORD", "*TITLE", f"{case}: Vecchio & Collins (1986) panel {n}, pure shear, MAT_172 ({variant})",
             "*CONTROL_TERMINATION", c(TEND),
             "*DATABASE_NODOUT", c(0.1), "*DATABASE_ELOUT", c(0.1), "*DATABASE_GLSTAT", c(0.1),
             "*DATABASE_HISTORY_NODE", c(1, 2, 3, 4), "*DATABASE_HISTORY_SHELL", c(1),
             "*DATABASE_EXTENT_BINARY", c(0, 9, 3, 1), c(0, 0, 0, 1, 1, 1, 2, 1), c(0, 0, 1.0, 0, 0, 0),
             "*DATABASE_BINARY_D3PLOT", c(2.0),
             "*PART_COMPOSITE", "panel", c(1, 16, 0.833, 0, 0.0, 0, 0)] + lines + [
             "*NODE", f"{1:8d}{0.0:16.4f}{0.0:16.4f}{0.0:16.4f}", f"{2:8d}{L:16.4f}{0.0:16.4f}{0.0:16.4f}",
             f"{3:8d}{L:16.4f}{L:16.4f}{0.0:16.4f}", f"{4:8d}{0.0:16.4f}{L:16.4f}{0.0:16.4f}",
             "*ELEMENT_SHELL", f"{1:8d}{1:8d}{1:8d}{2:8d}{3:8d}{4:8d}",
             "*BOUNDARY_SPC_NODE", c(1, 0, 1, 1, 1, 1, 1, 1), c(2, 0, 0, 1, 1, 1, 1, 1), c(3, 0, 0, 0, 1, 1, 1, 1), c(4, 0, 0, 0, 1, 1, 1, 1),
             "*DEFINE_CURVE", c(1), f"{0.0:20.6f}{0.0:20.6f}", f"{TEND:20.6f}{1.0:20.6f}",
             "*LOAD_NODE_POINT",
             # shear v on all four edges: node A(1) -x -y, B(2) -x +y, C(3) +x +y, D(4) +x -y; each F = v L t / 2
             c(1, 1, 1, -F), c(1, 2, 1, -F), c(2, 1, 1, -F), c(2, 2, 1, F), c(3, 1, 1, F), c(3, 2, 1, F), c(4, 1, 1, F), c(4, 2, 1, -F)]
        D += [card(f"{n}_c", variant), card(f"{n}_x", variant)] + ([card(f"{n}_y", variant)] if ry > 0 else []) + ["*END"]
        os.makedirs(os.path.join(OUT, case), exist_ok=True)
        open(os.path.join(OUT, case, "case.k"), "w", newline="\n").write("\n".join(D) + "\n")
        print(case, f"vmax={vmax:.2f}")
