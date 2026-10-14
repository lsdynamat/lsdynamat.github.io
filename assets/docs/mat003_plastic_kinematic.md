# MAT_003 — Plastic Kinematic

Bilinear elastic–plastic model with linear hardening. Hardening can be kinematic, isotropic or a mix of the two, and the yield stress can be scaled for strain rate with the Cowper–Symonds law. Available for beams (Hughes-Liu, truss), shells and solids. It is cheap and robust, which makes it a common choice for rebar, steel plates and connection parts when a full hardening curve is not needed.

## Cards written by the generator

- Card 1: `MID  RO  E  PR  SIGY  ETAN  BETA`
- Card 2: `SRC  SRP  FS  VP`

Units are `mm · ms · g · N · MPa` (density in g/mm³).

## Hardening

The plastic hardening modulus follows from the tangent modulus:

- `Ep = E · ETAN / (E − ETAN)`

and the yield stress is

- `σy = [1 + (ε̇ / SRC)^(1/SRP)] · (SIGY + β · Ep · εp)`

**BETA** sets the hardening type (LS-DYNA manual, MAT_003 Remark 2):

- `BETA = 0`: kinematic hardening (the yield surface translates; Bauschinger effect)
- `BETA = 1`: isotropic hardening (the yield surface expands)
- `0 < BETA < 1`: combined

For monotonic loading the two give the same curve. For cyclic or reversed loading they differ a lot, so calibrate BETA against hysteresis data when the load reverses.

## Strain rate (Cowper–Symonds)

`SRC` is a strain rate, so its unit follows the model time unit. In this unit system it is **1/ms**:

- `SRC [1/ms] = C [1/s] / 1000`
- Mild steel, often quoted as C = 40.4 s⁻¹, P = 5 → `SRC = 0.0404`, `SRP = 5`

Leave both blank to switch rate effects off. `VP = 1` puts the rate term inside the yield surface (viscoplastic) and is the formulation the manual recommends; `VP = 0` scales the yield stress.

## Erosion

`FS` is the effective plastic strain at which an element is deleted. Leave it blank for no erosion (the solver default is 10²⁰). FS is a numerical failure criterion and depends on mesh size; it is not a material constant.

## Check in LS-DYNA

One 10 mm hexahedron (ELFORM 1) pulled at 0.1 mm/ms with LS-DYNA R13, default inputs (E = 207 000 MPa, SIGY = 390 MPa, ETAN = 10 350 MPa):

- True stress matches `SIGY + Ep · εp` within 0.1 % up to 25 % strain.
- With `SRC = 0.0404`, `SRP = 5` and `BETA = 0`, the initial yield rises by the Cowper–Symonds factor (≈ 1.75 at 10 s⁻¹), as expected for kinematic hardening.

## References

- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_PLASTIC_KINEMATIC.
- Cowper, G. R., & Symonds, P. S. (1957). Strain-hardening and strain-rate effects in the impact loading of cantilever beams. Brown University, Technical Report 28.
- Jones, N. (2012). *Structural Impact* (2nd ed.). Cambridge University Press.
