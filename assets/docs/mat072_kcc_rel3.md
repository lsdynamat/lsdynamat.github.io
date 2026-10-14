# MAT_072R3 — K&C Concrete Damage Release 3

Three-invariant plasticity model with damage for concrete under blast and impact (Karagozian & Case). It uses three failure surfaces: yield, maximum and residual. A damage function λ–η moves the stress between them, and a tabulated compaction EOS gives the pressure–volume response. The generator does not use the built-in auto-generation from f'c (A0 < 0). It writes all parameters explicitly, scaled from the 45.4 MPa (6 580 psi) reference concrete that the LS-DYNA manual uses as its sample.

## Keywords written

- `*MAT_CONCRETE_DAMAGE_REL3`: cards 1–7 (`MID RO PR`, `FT A0 A1 A2 B1 OMEGA A1F`, `SLAMBDA NOUT EDROP RSIZE UCF LCRATE LOCWID NPTS`, λ1–λ13 and η1–η13 with `B3 A0Y A1Y` and `B2 A2F A2Y`)
- `*DEFINE_CURVE`: dynamic increase factor (DIF) vs. strain rate, `LCID = 1000 + MID`
- `*EOS_TABULATED_COMPACTION`: `EOSID = 1000 + MID`, 10 points

## How the parameters are obtained

The model's formulas are in psi and inches, so the generator converts f_c to psi first (`f_c,psi = f_c / 0.00689476`), with scale ratio `r = f_c,psi / 6580`.

- Tensile strength: `FT = 6.7 · √f_c,psi` (psi), then converted to MPa
- Maximum surface: `a0 = 1945 · r` (psi), `a1 = 0.4463`, `a2 = 1.228·10⁻⁵ / r` (1/psi)
- Yield surface: `a0y = 1469 · r`, `a1y = 0.6250`, `a2y = 3.913·10⁻⁵ / r`
- Residual surface: `a1f = a1`, `a2f = a2`
- Softening: `b1 = 1.6`, `b3 = 1.15`, `b2 = (0.09W² − 0.98W + 3.06) · (1 − 0.004 F² + 0.097 F − 0.484)`, with `W = 3 · d_agg = 1.5 in` and `F = f_c,psi / 1000`
- `LOCWID = 3 · d_agg = 38.1 mm` (d_agg = 12.7 mm, fixed)
- `OMEGA` is an input (default 0.5); λ–η uses the 13-point default damage function
- `RSIZE = 3.972E-2`, `UCF = 145` (psi per MPa), `NOUT = 2`, `EDROP = 1`, `SLAMBDA = 100`

## Strain-rate curve (DIF)

The DIF formulas are written with reference rates in s⁻¹. The curve abscissa is then multiplied by 10⁻³, so that it is in **ms⁻¹** like the rest of the model:

- Compression, CEB-FIP MC90: `DIF = (ε̇/ε̇s)^(1.026α)` up to ε̇ = 30 s⁻¹, then `γ(ε̇/ε̇s)^(1/3)`, with `α = 1/(5 + 9 f_c/f_co)`, `log γ = 6.156α − 2`, `ε̇s = 30·10⁻⁶ s⁻¹`, `f_co = 10 MPa`
- Tension, Malvar & Ross (1998): `DIF = (ε̇/ε̇s)^δ` up to ε̇ = 1 s⁻¹, then `β(ε̇/ε̇s)^(1/3)`, with `δ = 1/(1 + 8 f_c/f_co)`, `log β = 6δ − 2`, `ε̇s = 10⁻⁶ s⁻¹`

For f_c = 45.4 MPa, all 18 points of the sample curve in the LS-DYNA manual are reproduced, from −0.3 to 0.3 ms⁻¹. In a single-element compression test at 10⁻³ ms⁻¹ (LS-DYNA R13), the peak stress was 57.7 MPa, compared with DIF × f_c = 1.26 × 45.4 = 57.2 MPa.

## Points to check before use

- **Curve end points.** The last points (−30 and 300 ms⁻¹) follow the formulas and reach DIF ≈ 45 in tension and ≈ 29 in compression. The manual's sample keeps DIF constant beyond ±0.3 ms⁻¹ (9.70 and 2.94). LS-DYNA also warns that the very wide range of the curve causes a discretization error. Capping the end points is recommended if your model has high local strain rates.
- **RSIZE.** 1 inch / 1 mm = 1/25.4 = 3.937·10⁻², which is the 3.94E-2 used in the manual sample. The generator writes 3.972E-2.
- **Element size input.** Element size currently appears only in the title and file name. It does not change LOCWID or b2.
- **EOS.** The compaction curve is the 45.4 MPa reference curve converted to MPa. It is not rescaled for other strengths.

## References

- Malvar, L. J., Crawford, J. E., Wesevich, J. W., & Simons, D. (1997). A plasticity concrete material model for DYNA3D. *International Journal of Impact Engineering*, 19(9–10), 847–873.
- Malvar, L. J., & Ross, C. A. (1998). Review of strain rate effects for concrete in tension. *ACI Materials Journal*, 95(6), 735–739.
- Schwer, L. E., & Malvar, L. J. (2005). Simplified concrete modeling with *MAT_CONCRETE_DAMAGE_REL3. *JRI LS-DYNA User Week*, Nagoya.
- CEB-FIP (1993). *Model Code 1990: Design Code*. Thomas Telford.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_CONCRETE_DAMAGE_REL3 (sample input for 45.4 MPa concrete).
