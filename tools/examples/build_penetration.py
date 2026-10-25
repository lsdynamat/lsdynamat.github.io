"""Penetration / perforation benchmark with ogive-nose (3.0 CRH) projectiles, same mesh for every concrete model.

Tests (data/penetration_tests.csv, read on the PDF pages):
  HAN92  Hanchak et al. 1992: 178 mm slabs, 48 MPa, residual velocity
  FREW98 Frew et al. 1998: 0.51 m diameter cylinders, 58.4 MPa, penetration depth
  FOR96  Forrestal et al. 1996: 0.91 m diameter cylinders, 51.0 MPa, penetration depth
Model (agreed with the user, 2026-10-23):
  quarter model (planes x = 0, y = 0); rigid projectile (*MAT_RIGID, mass from the test), axial motion only;
  5 hexahedra over the projectile radius along the path, graded outward; slab reinforcement not modelled
  (Hanchak et al. p.4-5: striking the rebar did not change V_r); DOP cylinders with non-reflecting lateral and rear faces;
  frictionless *CONTACT_ERODING_SURFACE_TO_SURFACE (master: curved projectile surface); one erosion criterion for all models:
  *MAT_ADD_EROSION on the maximum principal strain (MXEPS, see below); the models' own erosion is switched off;
  rate effects on in every model; measured density in every card.
Cards: hub generator output in materials/pen/<series>_<model>.k, modified here only where listed in MODS.
usage: python build_penetration.py <out_dir> [MXEPS[,MXEPS...]] [series ...] [model ...] [shot ...]
  -> <out_dir>/PEN-<series>-<shot>-<model>-E<mxeps>/case.k
Erosion (user, 2026-10-23, after MXEPS = 2.0 deleted no element ahead of the nose and let the projectile pass the
nodes through the contact penalty): (1) pre-specified MXEPS = 0.3 / 0.5 / 1.0 for every model and shot, report the
range; (2) per model, MXEPS calibrated on HAN92 shot 1-0054 (V_r = 615 m/s, linear interpolation on the grid
0.2 / 0.3 / 0.4 / 0.5 / 0.7 / 1.0), then the other 25 shots predicted."""
import csv, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = ["KCC", "CSCM", "WIN", "RHT"]
H = {"HAN92": 2.54, "FREW98": 2.03, "FOR96": 3.05}        # element size on the path = projectile radius / 5
GROW = 1.12                                                # outward growth ratio of the in-plane element size
HSCALE = float(os.environ.get("PEN_HSCALE", 1.0))  # mesh study: path element size = HSCALE x H (case tag -H<x>)
SFS = float(os.environ.get("PEN_SFS", 100.0))  # contact stiffness scale SFS = SFM. With the default 1 the concrete nodes slipped past the nose;
                                               # HAN92 1-0054 V_r converged from SFS 60 to 100 (KCC 374/374, WIN 512/507 m/s); fixed at 100 (user, 2026-10-23)
NQ, TIP = 3, 0.3     # projectile cross-section divisions per quarter; nose truncated where r = TIP x radius.
                     # Nose segments are kept about as large as the concrete elements: with 0.25 mm segments
                     # (NQ = 6, TIP = 0.12) the contact released the concrete nodes and the projectile passed (checked).


def c(*v):
    return "".join(f"{x:10d}" if isinstance(x, int) else f"{x:10.4g}" for x in v)


# ---------------------------------------------------------------- material cards
def field(line, k, val, fmt="{:10.4g}"):
    s = line.ljust(80)
    return s[:10 * k] + fmt.format(val).rjust(10) + s[10 * k + 10:]


def card(series, model, rho):
    txt = open(os.path.join(HERE, "materials", "pen", f"{series}_{model}.k")).read()
    txt = txt.replace("*KEYWORD\n", "").replace("*END", "").rstrip()
    ls = txt.split("\n")
    hdr = lambda key: next(i for i, l in enumerate(ls) if l.startswith("$#") and key in l) + 1
    ro = rho * 1e-6                                       # kg/m3 -> g/mm3
    if model == "KCC":
        i = hdr(" ro "); ls[i] = field(ls[i], 1, ro, "{:10.4e}")
    elif model == "CSCM":
        i = hdr("erode"); ls[i] = field(ls[i], 1, ro, "{:10.4e}"); ls[i] = field(ls[i], 5, 0.0, "{:10.1f}")
    elif model == "WIN":
        i = hdr("uts"); f = ls[i]
        uts, wc = float(f[50:60]), float(f[60:70])
        ls[i] = field(field(f, 1, ro, "{:10.4e}"), 6, wc * uts / 2, "{:10.5f}")   # RATE = 0: FE is G_F (manual)
        j = hdr("rate"); ls[j] = field(ls[j], 4, 0.0, "{:10.1f}")
    elif model == "RHT":
        i = hdr("onempa"); ls[i] = field(field(ls[i], 1, ro, "{:10.4e}"), 4, 1.0e20, "{:10.1e}")
    note = {"KCC": "RO = measured density", "CSCM": "RO = measured density; ERODE = 0 (own erosion off)",
            "WIN": "RO = measured density; RATE = 0 (rate effects on), FE = G_F = w_c UTS / 2",
            "RHT": "RO = measured density; EPSF = 1e20 (own erosion off)"}[model]
    return "\n".join(ls) + f"\n$ benchmark changes to the hub card: {note}"


# ---------------------------------------------------------------- mesh helpers
def graded(h, a, rout):
    """0 .. a with spacing h, then growth GROW up to rout."""
    x = [0.0]
    while x[-1] < a - 1e-9:
        x.append(x[-1] + h)
    d = h
    while x[-1] < rout - 1e-9:
        d *= GROW
        x.append(min(x[-1] + d, rout))
    if x[-1] - x[-2] < 0.5 * (x[-2] - x[-3]):
        x.pop(-2)
    return x


def disk(x, y, a, R):
    """square [0,R]^2 -> quarter disk of radius R; the square [0,a]^2 is kept."""
    s = max(x, y)
    if s <= a or s == 0:
        return x, y
    w = (s - a) / (R - a)
    r = math.hypot(x, y)
    return x * (1 - w + w * s / r), y * (1 - w + w * s / r)


class Mesh:
    def __init__(self):
        self.nodes, self.elems = [], []

    def node(self, x, y, z):
        self.nodes.append((x, y, z))
        return len(self.nodes)

    def block(self, pid, grid):
        """grid[k][i][j] -> node ids, hexahedra between consecutive layers."""
        for k in range(len(grid) - 1):
            for i in range(len(grid[k]) - 1):
                for j in range(len(grid[k][i]) - 1):
                    b, t = grid[k], grid[k + 1]
                    self.elems.append((pid, b[i][j], b[i + 1][j], b[i + 1][j + 1], b[i][j + 1],
                                       t[i][j], t[i + 1][j], t[i + 1][j + 1], t[i][j + 1]))


def hexvol(p):
    """volume of a hexahedron from 8 corner points (5-tetrahedron split)."""
    def tet(a, b, c_, d):
        u = [b[i] - a[i] for i in range(3)]; v = [c_[i] - a[i] for i in range(3)]; w = [d[i] - a[i] for i in range(3)]
        return abs(u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0])) / 6
    return sum(tet(p[a], p[b], p[c_], p[d]) for a, b, c_, d in ((0, 1, 3, 4), (1, 2, 3, 6), (1, 4, 5, 6), (3, 4, 6, 7), (1, 3, 4, 6)))


def build(s, mxeps, model, out):
    h = H[s["series"]] * HSCALE
    a_p = float(s["proj_d_mm"]) / 2
    T = float(s["target_len_m"]) * 1000
    slab = s["series"] == "HAN92"
    rout = float(s["target_d_m"]) * 500                   # half-width (slab) or radius (cylinder)
    m = Mesh()

    # --- target: z from -T (rear) to 0 (impact face)
    afine = 2 * float(s["proj_d_mm"])                     # fine zone half-width around the path
    u = graded(h, afine, rout)
    nz = max(1, round(T / h))
    zs = [-T + T * k / nz for k in range(nz + 1)]
    grid = []
    for z in zs:
        layer = []
        for xi in u:
            row = []
            for yj in u:
                x, y = (xi, yj) if slab else disk(xi, yj, afine, rout)
                row.append(m.node(x, y, z))
            layer.append(row)
        grid.append(layer)
    m.block(1, grid)
    nt_nodes = len(m.nodes)
    n_target = len(m.elems)

    # --- projectile: tip at z = gap above the impact face, axis z, rigid
    psi, L, l = 3.0, float(s["shank_mm"]), float(s["nose_mm"])
    srad = 2 * psi * a_p
    gap = 0.5
    def r_of(x):                                          # x: distance from the tip
        if x >= l:
            return a_p
        return math.sqrt(srad ** 2 - (l - x) ** 2) - (srad - a_p)
    x0 = next(x / 1000 * l for x in range(1, 1000) if r_of(x / 1000 * l) >= TIP * a_p)
    nn = max(2, round((l - x0) / h))                      # nose segments about as long as the concrete elements
    xs = [x0 + (l - x0) * k / nn for k in range(nn + 1)] + [l + L * k / 10 for k in range(1, 11)]
    nq = NQ
    pg = []
    for x in xs:
        r = r_of(x)
        layer = []
        for i in range(nq + 1):
            row = []
            for j in range(nq + 1):
                px, py = disk(r * i / nq, r * j / nq, 0.5 * r, r)
                row.append(m.node(px, py, gap + x))
            layer.append(row)
        pg.append(layer)
    m.block(2, pg)
    # contact surface of the projectile: nose tip and curved surface only, outward normals. The flat faces on the
    # symmetry planes are left out: concrete nodes on those planes otherwise slip past the projectile (checked).
    psegs = [(pg[0][i][j], pg[0][i][j + 1], pg[0][i + 1][j + 1], pg[0][i + 1][j]) for i in range(nq) for j in range(nq)]
    for k in range(len(pg) - 1):
        for j in range(nq):
            psegs.append((pg[k][nq][j], pg[k][nq][j + 1], pg[k + 1][nq][j + 1], pg[k + 1][nq][j]))
            psegs.append((pg[k][j][nq], pg[k + 1][j][nq], pg[k + 1][j + 1][nq], pg[k][j + 1][nq]))
    vol = sum(hexvol([m.nodes[n - 1] for n in e[1:]]) for e in m.elems[n_target:])
    mass_q = float(s["proj_mass_kg"]) * 1000 / 4           # g, quarter model
    ro_p = mass_q / vol

    # --- boundary sets
    sym_x = [n for n in range(1, nt_nodes + 1) if abs(m.nodes[n - 1][0]) < 1e-6]
    sym_y = [n for n in range(1, nt_nodes + 1) if abs(m.nodes[n - 1][1]) < 1e-6]
    segs = []
    if not slab:                                          # non-reflecting lateral and rear faces
        nu = len(u)
        for k in range(nz):
            for i in range(nu - 1):
                segs.append((grid[k][nu - 1][i], grid[k][nu - 1][i + 1], grid[k + 1][nu - 1][i + 1], grid[k + 1][nu - 1][i]))
                segs.append((grid[k][i][nu - 1], grid[k + 1][i][nu - 1], grid[k + 1][i + 1][nu - 1], grid[k][i + 1][nu - 1]))
        for i in range(nu - 1):
            for j in range(nu - 1):
                segs.append((grid[0][i][j], grid[0][i][j + 1], grid[0][i + 1][j + 1], grid[0][i + 1][j]))

    vs = float(s["vs_ms"])                                # m/s = mm/ms
    tend = (3.0 * (T + L + l) / vs) if slab else (2.2 * T / vs)
    tend = round(max(tend, 1.0), 2)
    tag = f"-E{mxeps:g}".replace(".", "p")
    if SFS != 100.0:
        tag += f"-S{SFS:g}"
    if HSCALE != 1.0:
        tag += f"-H{HSCALE:g}".replace(".", "p")
    case = f"PEN-{s['series']}-{s['shot']}-{model}{tag}"
    D = ["*KEYWORD", "*TITLE",
         f"{case}: {s['series']} shot {s['shot']}, Vs = {vs:g} m/s, {model}, MXEPS = {mxeps:g}",
         "$ Units: mm-ms-g-N-MPa; built by tools/examples/build_penetration.py",
         f"$ quarter model: {n_target} target hexahedra, h = {h} mm on the path",
         # DTMIN = 0.01 with ERODE = 1: a solid whose time step falls below 1 % of the initial one is deleted.
         # Without it single CSCM elements collapsed the time step (6e-6 -> 1e-19 ms) on HAN92 1-0063/0068/0069
         "*CONTROL_TERMINATION", c(tend, 0, 0.01),
         "*CONTROL_TIMESTEP", c(0.0, 0.6, 0, 0.0, 0.0, 0, 1),
         # ECDT = 0 (default): the eroding contact is stable only with the contact stability in the time step (Murray 2005)
         "*CONTROL_CONTACT", c(0.1, 0.0, 1, 0, 1, 0, 1, 0), c(0, 0, 0, 0, 4.0, 0, 0, 0),
         "*CONTROL_ENERGY", c(2, 2, 2, 2),
         "*DATABASE_GLSTAT", c(tend / 500), "*DATABASE_MATSUM", c(tend / 500), "*DATABASE_RBDOUT", c(tend / 500),
         "*DATABASE_BINARY_D3PLOT", c(tend / 20),
         "*DATABASE_EXTENT_BINARY", c(0, 0, 3, 1), c(0, 0, 0, 1, 1, 1, 2, 1), c(0, 0, 1.0, 0, 0, 0),
         "*PART", "concrete", c(1, 1, 1, 1001 if model == "KCC" else 0, 1),   # KCC: *EOS_TABULATED_COMPACTION 1000 + MID
         "*SECTION_SOLID", c(1, 1),
         "*HOURGLASS", c(1, 6, 0.1),
         card(s["series"], model, float(s["rho_kgm3"])),
         "*MAT_ADD_EROSION", c(1, 0, 0.0, 0.0, 0.0, 0.0, 1.0, 1), c(0.0, 0.0, 0.0, mxeps, 0.0, 0.0, 0.0, 0.0),
         "*PART", "projectile", c(2, 2, 2),
         "*SECTION_SOLID", c(2, 1),
         "*MAT_RIGID", c(2, ro_p, 210000.0, 0.3, 0.0, 0.0, 0.0, 0.0), c(1.0, 4, 7), c(0.0),
         f"$ projectile: {float(s['proj_mass_kg']):g} kg, quarter mesh volume {vol:.1f} mm3 -> RO = {ro_p:.5e} g/mm3",
         "*INITIAL_VELOCITY_GENERATION", c(2, 2, 0.0, 0.0, 0.0, -vs, 0, 0), c(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0),
         "*CONTACT_ERODING_SURFACE_TO_SURFACE", c(1, 2, 3, 0, 0, 0, 0, 0),
         c(0.0, 0.0, 0.0, 0.0, 0.0, 0, 0.0, 1e20), c(SFS, SFS, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0), c(1, 1, 1),
         "*SET_NODE_LIST", c(1)]
    D += [c(*sym_x[k:k + 8]) for k in range(0, len(sym_x), 8)]
    D += ["*SET_NODE_LIST", c(2)] + [c(*sym_y[k:k + 8]) for k in range(0, len(sym_y), 8)]
    D += ["*BOUNDARY_SPC_SET", c(1, 0, 1, 0, 0, 0, 0, 0), "*BOUNDARY_SPC_SET", c(2, 0, 0, 1, 0, 0, 0, 0)]
    D += ["*SET_SEGMENT", c(2)] + [c(*q) for q in psegs]
    if segs:
        D += ["*SET_SEGMENT", c(1)] + [c(*q) for q in segs] + ["*BOUNDARY_NON_REFLECTING", c(1, 0, 0)]
    D.append("*NODE")
    D += [f"{i + 1:8d}{x:16.6f}{y:16.6f}{z:16.6f}" for i, (x, y, z) in enumerate(m.nodes)]
    D.append("*ELEMENT_SOLID")
    D += [f"{i + 1:8d}" + "".join(f"{n:8d}" for n in e) for i, e in enumerate(m.elems)]
    D.append("*END")
    os.makedirs(os.path.join(out, case), exist_ok=True)
    open(os.path.join(out, case, "case.k"), "w", newline="\n").write("\n".join(D) + "\n")
    return case, n_target, tend


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "decks_pen")
    args = sys.argv[2:]
    mx = [float(v) for v in args.pop(0).split(",")] if args and args[0][0].isdigit() else [0.5]
    series = [a for a in args if a in H] or list(H)
    models = [a for a in args if a in MODELS] or MODELS
    shots = [a for a in args if a not in H and a not in MODELS]
    rows = [r for r in csv.reader(open(os.path.join(HERE, "data", "penetration_tests.csv"))) if r and not r[0].startswith("#")]
    for r in rows[1:]:
        s = dict(zip(rows[0], r))
        if s["series"] not in series or (shots and s["shot"] not in shots):
            continue
        for model in models:
            for mxeps in mx:
                case, ne, tend = build(s, mxeps, model, out)
                print(f"{case}: {ne} target elements, t_end = {tend} ms")
