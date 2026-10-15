# MAT_015 — Johnson–Cook Plasticity

Strain-, strain-rate- and temperature-dependent plasticity for metals under impact, penetration and high-rate forming. With solid elements the model **needs an equation of state**, so the generator also writes `*EOS_LINEAR_POLYNOMIAL`. If thermal softening and damage are not needed, `*MAT_SIMPLIFIED_JOHNSON_COOK` (MAT_098) is cheaper.

## Flow stress

- `σy = (A + B · εp^N) · (1 + C · ln ε̇*) · (1 − T*^M)`
- `ε̇* = ε̇ / EPS0`
- `T* = (T − TR) / (TM − TR)`

With no thermal coupling, the temperature rise is adiabatic: `ΔT = ∫σ dεp / (ρ · CP)`.

## Cards written by the generator

Layout from the LS-DYNA R13 manual (Vol. II, p. 2-187):

- Card 1: `MID  RO  G  E  PR  DTF  VP  RATEOP`
- Card 2: `A  B  N  C  M  TM  TR  EPS0` (melt temperature comes **before** room temperature)
- Card 3: `CP  PC  SPALL  IT  D1  D2  D3  D4`
- Card 4: `D5  –  EROD  EFMIN  NUMINT`
- `*EOS_LINEAR_POLYNOMIAL`: `EOSID = MID`, `C1 = K`, all other coefficients 0, `V0 = 1`

Set `EOSID` on your `*PART` to the material ID.

## Derived values

- Shear modulus: `G = E / (2(1 + PR))`. Solids read G, while shells and beams read E and PR.
- Bulk modulus for the EOS: `K = E / (3(1 − 2PR))`

## Units (mm · ms · g · N · MPa)

- `EPS0` is entered in **1/s** and written in **1/ms** (× 10⁻³). Writing 1.0 in a millisecond model would mean 1000 s⁻¹.
- `CP` in J/(kg·K) has the same value in mJ/(g·K), the unit this system uses. Steel ≈ 450–480.
- Temperatures are in K.

## Tension and failure

- `PC = −1E20` with `SPALL = 2` switches off the spall check. Do not use `PC = 0`: with SPALL = 2, solids would lose all tensile stress.
- `D1–D5`: Johnson–Cook fracture strain `εf = [D1 + D2·exp(D3·σ*)]·[1 + D4·ln ε̇*]·[1 + D5·T*]`. If all five are blank, the generator writes `EROD = 1` and no failure is used.

## Check in LS-DYNA

One 10 mm hexahedron pulled at 0.1 mm/ms (about 10 s⁻¹) with LS-DYNA R13 and the default inputs (A = 350, B = 400, N = 0.35, C = 0.02, M = 1). The computed true stress matched the formula above, including rate and adiabatic heating, within 0.1 % up to 25 % strain. Adding the D1–D5 values for 4340 steel (Johnson & Cook 1985) gave the same curve with no early erosion.

## References

- Johnson, G. R., & Cook, W. H. (1983). A constitutive model and data for metals subjected to large strains, high strain rates and high temperatures. *Proc. 7th Int. Symp. on Ballistics*, The Hague, 541–547.
- Johnson, G. R., & Cook, W. H. (1985). Fracture characteristics of three metals subjected to various strains, strain rates, temperatures and pressures. *Engineering Fracture Mechanics*, 21(1), 31–48.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_JOHNSON_COOK and *EOS_LINEAR_POLYNOMIAL.
