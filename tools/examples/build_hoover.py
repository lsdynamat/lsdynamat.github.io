"""Decks for the open-data concrete benchmark: Hoover, Bažant et al. (2013) / Wendner et al. (2015).

All specimens of that campaign were cast from one batch (d_max = 10 mm). The material cards are the
site's generators run with f_c = 55.6 MPa (75 x 150 mm cylinders at 400 days) and d_max = 10 mm,
nothing fitted to the tests (tools/examples/materials/hb_*.k).

Specimens
  HB-CYL   cylinder 75 x 150 mm, uniaxial compression between frictionless platens (h = 3.75 mm)
  HB-B93   beam D = 93 mm, W = 40 mm, span 202 mm, notch a/D = 0.3, three-point bending (h = 3 mm)
  HB-B215  beam D = 215 mm, W = 40 mm, span 469 mm, notch a/D = 0.3, three-point bending (h = 5 mm)

Units: mm, ms, g, N, MPa.
usage: python build_hoover.py <out_dir>        -> <out_dir>/<case>/case.k
"""
import os
import sys

from build_examples import Mesh, card, cylinder_mesh, header, material_block, node_set, ramp_curve, write

MODELS = {
    # key : (material file(s) by element size, mid, eosid, note)
    "KCC": ({3.75: "hb_k072_h3p75", 3.0: "hb_k072_h3", 5.0: "hb_k072_h5"}, 1, 1001,
            "MAT_072R3, LCRATE set to 0 (no strain-rate enhancement)"),
    "WIN": ("hb_w084", 2, 0, "MAT_084 Winfrith, RATE = 1"),
    "CSCM": ("hb_c159", 3, 0, "MAT_159 CSCM, IRATE = 0"),
    "CDP": ("hb_d273", 4, 0, "MAT_273 CDPM2, STRFLG = 0"),
}

BEAMS = {
    # case : (D, span, overhang, h, a/D)
    "B93": (93.0, 202.0, 11.0, 3.0, 0.3),
    "B215": (215.0, 469.0, 23.5, 5.0, 0.3),
}


def material(key, h):
    f, mid, eos, note = MODELS[key]
    if isinstance(f, dict):
        f = f[h]
    blk = material_block(f)
    if key == "KCC":
        # quasi-static test: card 3 field 6 (LCRATE) -> 0
        lines = blk.splitlines()
        i = next(k for k, l in enumerate(lines) if l.startswith("$# slambda"))
        l = lines[i + 1]
        lines[i + 1] = l[:50] + f"{0:10d}" + l[60:]
        blk = "\n".join(lines)
    return mid, eos, note, blk


def build_cyl(out, key):
    R, H, n, nz = 37.5, 150.0, 20, 40         # 3.75 mm elements
    mid, eos, note, mat = material(key, 3.75)
    m, layer, centre, edge, axis = cylinder_mesh(R, H, n, nz)
    tend, dz = 30.0, 0.75                      # 0.75 mm shortening = 0.5 % strain
    v = -dz / (tend - 0.5)
    L = header(f"HB-CYL {key}: cylinder 75x150 uniaxial compression, Hoover et al. (2013) concrete ({note})",
               tend, 0.05)
    L += ["*DATABASE_BINARY_D3PLOT", card(tend / 30)]
    if key == "WIN":
        L += ["*DATABASE_BINARY_D3CRACK", card(tend / 30)]
    L += ["*PART", f"cylinder ({note})", card(1, 1, mid, eos, 1),
          "*SECTION_SOLID", card(1, 1),
          "*HOURGLASS", card(1, 4, 0.05)]
    L += m.node_cards() + m.elem_cards()
    L += node_set(1, layer(0), "bottom face") + node_set(2, layer(nz), "top face (loaded)")
    L += node_set(3, [axis(nz)], "top centre node")
    L += ["*BOUNDARY_SPC_SET", card(1, 0, 0, 0, 1, 0, 0, 0),
          "*BOUNDARY_SPC_NODE", card(centre, 0, 1, 1, 1, 0, 0, 0), card(edge, 0, 0, 1, 1, 0, 0, 0),
          "*BOUNDARY_PRESCRIBED_MOTION_SET", card(2, 3, 0, 1, 1.0)]
    L += ramp_curve(1, v, 0.5, tend)
    L += ["*DATABASE_HISTORY_NODE_SET", card(3)]
    L += [mat, "*END"]
    write(os.path.join(out, f"HB-CYL-{key}", "case.k"), L)


def build_beam(out, case, key):
    D, S, over, h, alpha = BEAMS[case]
    W = 40.0
    mid, eos, note, mat = material(key, h)
    ns = round(S / h)
    ns += (ns + 1) % 2                         # odd number of cells in the span -> one column on midspan
    dx = S / ns
    no = round(over / dx)
    nx, ny, nz = ns + 2 * no, round(W / h), round(D / h)
    dy, dz = W / ny, D / nz
    ic = no + ns // 2                          # notch column
    nrow = round(alpha * D / dz)
    m = Mesh()
    nid = {}
    for i in range(nx + 1):
        for j in range(ny + 1):
            for k in range(nz + 1):
                nid[(i, j, k)] = m.add_node(i * dx, j * dy, k * dz)
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                if i == ic and k < nrow:
                    continue
                n8 = [nid[(i, j, k)], nid[(i + 1, j, k)], nid[(i + 1, j + 1, k)], nid[(i, j + 1, k)],
                      nid[(i, j, k + 1)], nid[(i + 1, j, k + 1)], nid[(i + 1, j + 1, k + 1)], nid[(i, j + 1, k + 1)]]
                m.add_hex(1, n8)
    used = {n for e in m.elems for n in e[2:]}
    iL, iR = no, no + ns
    sup_left = [nid[(i, j, 0)] for i in (iL - 1, iL, iL + 1) for j in range(ny + 1)]
    sup_right = [nid[(i, j, 0)] for i in (iR - 1, iR, iR + 1) for j in range(ny + 1)]
    load = [nid[(i, j, nz)] for i in (ic, ic + 1) for j in range(ny + 1)]
    cmod = [nid[(ic, ny // 2, 0)], nid[(ic + 1, ny // 2, 0)]]
    defl = [nid[(ic, ny // 2, nz)], nid[(ic + 1, ny // 2, nz)]]
    tend, dmax = (30.0, 0.45) if case == "B93" else (40.0, 0.9)
    v = -dmax / (tend - 1.0)
    title = (f"HB-{case} {key}: beam D={D:g} W={W:g} span {S:g}, notch {nrow * dz:.1f} mm "
             f"(a/D = {nrow * dz / D:.3f}), 3-point bending, Hoover et al. (2013) concrete ({note})")
    L = header(title, tend, 0.05)
    L += ["*DATABASE_BINARY_D3PLOT", card(tend / 30)]
    if key == "WIN":
        L += ["*DATABASE_BINARY_D3CRACK", card(tend / 30)]
    L += ["*PART", f"beam ({note})", card(1, 1, mid, eos, 0),
          "*SECTION_SOLID", card(1, 2)]
    m.nodes = [nd for nd in m.nodes if nd[0] in used]
    L += m.node_cards() + m.elem_cards()
    L += node_set(1, sup_left, "left support (3 node lines)") + node_set(2, sup_right, "right support (3 node lines)")
    L += node_set(3, load, "load line (2 node lines at midspan)")
    L += node_set(4, cmod + defl, "CMOD pair (bottom, notch edges) and deflection pair (top)")
    L += ["*BOUNDARY_SPC_SET", card(1, 0, 0, 0, 1, 0, 0, 0), card(2, 0, 0, 0, 1, 0, 0, 0),
          "*BOUNDARY_SPC_NODE", card(nid[(iL, ny // 2, 0)], 0, 1, 1, 1, 0, 0, 0),
          card(nid[(iR, ny // 2, 0)], 0, 0, 1, 1, 0, 0, 0),
          "*BOUNDARY_PRESCRIBED_MOTION_SET", card(3, 3, 0, 1, 1.0)]
    L += ramp_curve(1, v, 1.0, tend)
    L += ["*DATABASE_HISTORY_NODE_SET", card(4)]
    L += [mat, "*END"]
    write(os.path.join(out, f"HB-{case}-{key}", "case.k"), L)
    return ns * dx, nrow * dz


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "decks_hb")
    for k in MODELS:
        build_cyl(out, k)
        for c in BEAMS:
            span, a = build_beam(out, c, k)
            if k == "KCC":
                print(f"{c}: span {span:.1f} mm, notch {a:.1f} mm")
    for d in sorted(os.listdir(out)):
        p = os.path.join(out, d, "case.k")
        if os.path.exists(p):
            txt = open(p, encoding="utf-8").read()
            ne = len(txt.split("*ELEMENT_SOLID\n")[1].split("*SET_NODE")[0].splitlines())
            print(f"{d:16s} elems={ne:7d}")


if __name__ == "__main__":
    main()
