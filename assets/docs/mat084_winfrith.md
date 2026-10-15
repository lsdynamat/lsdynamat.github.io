# MAT_084 — Winfrith Concrete

Smeared-crack concrete model with up to three orthogonal crack planes per element, a strain-softening tensile law and an Ottosen-type failure surface in compression. The generator writes `*MAT_WINFRITH_CONCRETE` with **RATE = 1**: no strain-rate enhancement, and FE is read as a crack width.

The full derivation, with figures, is in the [original PDF note](./assets/docs/mat084_winfrith.pdf).

## Cards written by the generator

From the LS-DYNA R13 manual (Vol. II, p. 2-574):

- Card 1: `MID  RO  TM  PR  UCS  UTS  FE  ASIZE`
- Card 2: `E  YS  EH  UELONG  RATE  CONM  CONL  CONT`, written as `0 0 0 0  1  −3  0  0`
- Cards 3–4: `EPS1–8`, `P1–8`, all zero (no tabulated compaction curve)

`CONM = −3` tells LS-DYNA that the model is in g, mm, ms. With these units, CONL and CONT are ignored.

## What the generator computes from f_c and d_max

The input f_c is the measured cylinder strength of the concrete you model, i.e. its mean strength (`fcm = f_c`). The characteristic strength `fck = f_c − 8 MPa` is used only inside the Eurocode tensile-strength formula:

- `TM = 21 500 · (f_c / 10)^(1/3)` (MPa): CEB-FIP MC90 tangent modulus
- `UCS = f_c`
- `UTS = fctm = 0.30 · fck^(2/3)` for fck ≤ 50 MPa, otherwise `2.12 · ln(1 + f_c / 10)` (EN 1992-1-1, Table 3.1)
- `GF0 = 0.021 + 5.357·10⁻⁴ · d_max` (N/mm, d_max in mm)
- `GFt = GF0 · (f_c / 10)^0.7` (CEB-FIP MC90)
- `FE = wc = 2 · GFt / UTS` (mm): linear softening, crack opening at zero stress
- `ASIZE = d_max / 2`: the manual defines ASIZE as the aggregate **radius**

For f_c = 38 MPa (C30/37) and d_max = 16 mm this gives TM ≈ 33 551 MPa, UTS ≈ 2.90 MPa, GFt ≈ 0.075 N/mm and FE ≈ 0.052 mm. For f_c = 30 MPa: TM ≈ 31 008 MPa, UTS ≈ 2.35 MPa, FE ≈ 0.054 mm.

## Tensile law (RATE = 1)

The crack-normal traction falls linearly with crack opening w:

- `σn(w) = ft · (1 − w / wc)` for 0 ≤ w ≤ wc, and 0 beyond

The area under this line is GFt, which gives `wc = 2 GFt / ft`.

## Mesh dependence

Winfrith converts crack-normal strain to an opening with a characteristic length `L = Ve^(1/3)`, so that `w = εn · L`. Because wc is fixed, the strain at which tension vanishes, `ε0 = wc / L`, gets smaller as elements get larger. In a stress–strain plot, coarse and fine meshes soften differently, but the dissipated energy per crack area stays the same.

## Differences from the PDF note

Like the PDF, the generator now takes f_c as the mean cylinder strength fcm and computes `fctm = 0.30 fck^(2/3)` with `fck = fcm − 8` (until 2026-10-15 it treated f_c as fck and added 8 MPa). Two differences remain: the generator uses the MC90 tangent modulus instead of the EC2 secant modulus `Ecm = 22 000 (fcm/10)^0.3`, and it sets ASIZE = d_max/2, following the manual's definition of ASIZE as a radius (the PDF uses ASIZE ≈ d_max).

In the notched-prism example the energy dissipated by Winfrith was 1.66 × GFt even with a one-element-wide crack, so check G_F against a test if tensile cracking governs.

## References

- CEB-FIP (1993). *Model Code 1990: Design Code*. Thomas Telford.
- CEN (2004). EN 1992-1-1, Eurocode 2: Design of concrete structures — Part 1-1.
- Schwer, L. E. (2011). The Winfrith concrete model: beauty or beast? Insights into the Winfrith concrete model. *8th European LS-DYNA Users Conference*, Strasbourg.
- Broadhouse, B. J. (1995). *The Winfrith concrete model in LS-DYNA3D*. Report SPD/D(95)363, AEA Technology, Winfrith.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_WINFRITH_CONCRETE.
