# MAT_273 — Concrete Damage Plasticity (CDPM2)

LS-DYNA implementation of CDPM2 (Grassl et al.). Plasticity is formulated in the effective stress space, with separate tensile and compressive damage driven by the plastic strain. Tensile softening is written as a crack-band (stress vs. crack opening) law, so the dissipated fracture energy does not depend on the mesh. The model suits quasi-static and dynamic failure of plain and reinforced concrete.

## Cards written by the generator

From the LS-DYNA R13 manual (Vol. II):

- Card 1: `MID  RO  E  PR  ECC  QH0  FT  FC`
- Card 2: `HP  AH  BH  CH  DH  AS  DF  FC0`
- Card 3: `TYPE  BS  WF  WF1  FT1  STRFLG  FAILFLG  EFC`

E is written positive, which selects the anisotropic damage formulation (ISOFLAG = 0).

## What the generator computes from f_c

The input f_c is the measured cylinder strength of the concrete you model, i.e. its mean strength fcm. Unless you override them, these quantities are derived:

- `E = 22 000 · (f_c / 10)^0.3` (MPa): EN 1992-1-1 secant modulus
- `FT = fctm = 0.30 · fck^(2/3)` with `fck = f_c − 8` for fck ≤ 50 MPa, otherwise `2.12 · ln(1 + f_c/10)` (EN 1992-1-1, Table 3.1)
- `ECC = (1 + ε)/(2 − ε)` with `ε = FT(fbc² − f_c²) / (fbc(f_c² − FT²))` and `fbc = 1.16 f_c` (Jirásek & Bažant)
- `GF = 73 · f_c^0.18 / 1000` (N/mm): fib Model Code 2010
- Bilinear softening (`TYPE = 1`) with `WF1 = 0.15 WF` and `FT1 = 0.30 FT`. The area under the law is `0.225 · FT · WF`, so `WF = GF / (0.225 FT) = 4.444 GF / FT`

Defaults when left blank: `RO = 0.0023 g/mm³`, `PR = 0.18`, `EFC = 1.0E-4`, `STRFLG = 0`.

## Fixed parameters

- `QH0 = 0.30`, `AH = 0.08`, `BH = 0.003`, `CH = 2.0`, `DH = 1.0E-6`, `AS = 15.0`, `DF = 0.85` (the manual defaults)
- `BS = 1.5` (manual default is 1.0)
- `FAILFLG = 0` (no erosion)
- `HP = 0.01` and `FC0 = 0` without strain-rate effects; `HP = 0.5` and `FC0 = 10 MPa` with `STRFLG = 1`. These follow the manual's recommendation (Grassl et al. 2013 and 2011, respectively).

## Notes

- **FT.** Since 2026-10-15 FT follows EN 1992-1-1 with fck = f_c − 8 (2.35 MPa at f_c = 30 MPa; earlier versions applied the formula to f_c directly and gave 2.90 MPa). Enter FT directly if you have a measured splitting or direct tensile strength.
- **EFC** controls the compressive softening branch. The default 1E-4 suits plain concrete; confined cores need a calibrated, larger value.
- **Mesh.** WF is a crack opening, so tensile regularisation is automatic. Compressive softening (EFC) is not regularised in the same way.

## References

- Grassl, P., Xenos, D., Nyström, U., Rempling, R., & Gylltoft, K. (2013). CDPM2: A damage-plasticity approach to modelling the failure of concrete. *International Journal of Solids and Structures*, 50(24), 3805–3816.
- Grassl, P., Nyström, U., Rempling, R., & Gylltoft, K. (2011). A damage-plasticity model for the dynamic failure of concrete. *8th International Conference on Structural Dynamics (EURODYN)*, Leuven.
- Jirásek, M., & Bažant, Z. P. (2002). *Inelastic Analysis of Structures*. Wiley.
- fib (2013). *fib Model Code for Concrete Structures 2010*. Ernst & Sohn.
- CEN (2004). EN 1992-1-1, Eurocode 2: Design of concrete structures — Part 1-1.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_CONCRETE_DAMAGE_PLASTIC_MODEL.
