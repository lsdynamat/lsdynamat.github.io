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
- `OMEGA` is an input (default 0.5); η1–η13 are the 13-point default damage function, and λ6–λ10 are scaled for the fracture energy (next section)
- EOS: the 10-point compaction curve of the 45.4 MPa reference concrete, with the volumetric strains kept and the pressures and unloading bulk moduli multiplied by `√r` (Wu & Crawford 2015, as LS-DYNA does when it generates the parameters itself). The unloading bulk modulus is then `K = 57 000 √f_c,psi / (3(1 − 2·0.16))`, i.e. E = 57 000 √f_c,psi with PR = 0.16. Up to version 1.4 the curve was not scaled, so every card had E ≈ 31.9 GPa.
- `RSIZE = 1/25.4 = 3.937E-2` (inch per mm), `UCF = 145` (psi per MPa), `NOUT = 2`, `EDROP = 1`, `SLAMBDA = 100`

## Fracture energy and element size

MAT_072R3 regularises its softening only for elements larger than LOCWID. For smaller elements the energy dissipated per unit volume is fixed by the damage function, so the fracture energy grows with the element size h. Single-element uniaxial tension tests (LS-DYNA R13, rate effects off) with the unscaled damage function gave:

- G_F = g0 · min(h, LOCWID), with `g0 = 0.01026 · (f_c/30)^0.42` N/mm² (f_c = 20–60 MPa, within 0.5 %)
- unscaled card, f_c = 30 MPa: 0.050, 0.103, 0.259, 0.381 and 0.372 N/mm for h = 5, 10, 25, 48 and 96 mm
- LS-DYNA auto-generation (`A0 = −f_c`, LOCWID 48 mm), for comparison: 0.006, 0.015, 0.037, 0.069 and 0.071 N/mm

G_F is proportional to the post-peak part of λ (scaling λ6–λ10 by 0.5, 2 and 3 gave 0.49, 2.03 and 3.06 times the energy). The generator therefore stretches λ6–λ10 about the peak λ5:

- `λi' = λ5 + k (λi − λ5)`, with `k = G_F,target / (g0 · min(h, LOCWID))`
- `G_F,target` = the optional G_F input, or fib MC2010 `73 f_c^0.18` N/m (0.135 N/mm at 30 MPa)
- h = the element-size input: the edge length of the elements where cracks form

Check (single element, uniaxial tension): G_F = 0.133, 0.134, 0.137 and 0.137 N/mm for h = 5, 10, 25 and 50 mm at f_c = 30 MPa (target 0.135); 0.124 (target 0.125) at 20 MPa, 0.149 (0.153) at 60 MPa, 0.145 (0.145) at 45 MPa with h = 15 mm, and 0.079 for an input G_F of 0.08 N/mm.

The compressive peak is unchanged (29.98 against 29.96 MPa, h = 5 mm), but λ is shared by tension and compression, so the compressive softening branch becomes more ductile for small elements (28.1 against 24.2 MPa at 1 % strain, h = 5 mm). This follows the same crack-band logic: crushing energy per unit volume rises as the element shrinks.

## Strain-rate curve (DIF)

The `dif_model` input selects how rate effects are written:

- **0: off.** `LCRATE = 0` and no curve is written. Use this for quasi-static analyses. An explicit run is always much faster than a laboratory test (a 30 ms cylinder test is ≈ 0.3–1 s⁻¹, against ≈ 10⁻⁵ s⁻¹ in the lab), so any DIF curve would raise the strength artificially.
- **1: CEB-FIP MC90 in compression + Malvar & Ross (1998) in tension** (default).
  - Compression: `DIF = (ε̇/ε̇s)^(1.026α)` up to 30 s⁻¹, then `γ(ε̇/ε̇s)^(1/3)`, with `α = 1/(5 + 9 f_c/f_co)`, `log γ = 6.156α − 2`, `ε̇s = 30·10⁻⁶ s⁻¹`, `f_co = 10 MPa`
  - Tension: `DIF = (ε̇/ε̇s)^δ` up to 1 s⁻¹, then `β(ε̇/ε̇s)^(1/3)`, with `δ = 1/(1 + 8 f_c/f_co)`, `log β = 6δ − 2`, `ε̇s = 10⁻⁶ s⁻¹`
- **2: fib Model Code 2010.**
  - Compression: `(ε̇/ε̇0)^0.014` up to 30 s⁻¹, then `0.012 (ε̇/ε̇0)^(1/3)`, with `ε̇0 = 30·10⁻⁶ s⁻¹`
  - Tension: `(ε̇/ε̇0)^0.018` up to 10 s⁻¹, then `0.0062 (ε̇/ε̇0)^(1/3)`, with `ε̇0 = 10⁻⁶ s⁻¹`
  - At low and moderate rates MC2010 gives a much lower compressive DIF than MC90 (1.16 against 1.40 at 1 s⁻¹ for f_c = 30 MPa). Part of the DIF measured in dynamic compression tests is lateral inertia, which a finite-element model already captures, so the lower values are often preferred for compression.

`rate_cap` (default 300 s⁻¹) holds the DIF constant above that rate, as the manual's sample curve does. The curve abscissa is written in **ms⁻¹** (rates in s⁻¹ × 10⁻³), with negative values for tension.

### Checks

- Option 1 at f_c = 45.4 MPa reproduces all points of the sample curve in the LS-DYNA manual, including the plateaus at ±30 ms⁻¹.
- Single-element compression at 10⁻³ ms⁻¹ (= 1 s⁻¹), LS-DYNA R13, peak / f_c:
  - option 0: 0.998 (expected 1)
  - option 1: 1.270 (expected 1.262)
  - option 2: 1.156 (expected 1.157)
- 150 × 300 cylinder at f_c = 30 MPa (see Examples): 30.1 MPa with rate effects off, 42.4 MPa with option 1.

## Points to check before use

- **Curve discretization warning.** LS-DYNA re-samples the DIF curve and reports a discretization difference (Warning 21329), as it does for the manual's own sample curve. In the single-element checks the DIF read by the solver was still correct.
- **Element size input.** Enter the size of the elements in the cracking zone. With mixed mesh sizes, one card per size range keeps G_F correct.
- **LOCWID** is fixed at 38.1 mm (d_agg = 12.7 mm); it does not follow the maximum aggregate size of your mix. For elements larger than 38.1 mm, G_F is regularised by LS-DYNA itself and the scaling uses h = 38.1 mm.
- **f_c** is the measured cylinder strength of the concrete you model (its mean strength).
- **Elastic modulus.** E follows the EOS (E = 3K(1 − 2PR) = 57 000 √f_c,psi), the ACI 318 relation, so it is lower than the EN 1992-1-1 value E_cm for normal-strength concrete (25.9 against 30.6 GPa at f_c = 30 MPa). The card does not take E as an input.

## References

- Malvar, L. J., Crawford, J. E., Wesevich, J. W., & Simons, D. (1997). A plasticity concrete material model for DYNA3D. *International Journal of Impact Engineering*, 19(9–10), 847–873.
- Malvar, L. J., & Ross, C. A. (1998). Review of strain rate effects for concrete in tension. *ACI Materials Journal*, 95(6), 735–739.
- Schwer, L. E., & Malvar, L. J. (2005). Simplified concrete modeling with *MAT_CONCRETE_DAMAGE_REL3. *JRI LS-DYNA User Week*, Nagoya.
- Wu, Y., & Crawford, J. E. (2015). Numerical modeling of concrete using a partially associative plasticity model. *Journal of Engineering Mechanics*, 141(12). doi:10.1061/(ASCE)EM.1943-7889.0000952
- CEB-FIP (1993). *Model Code 1990: Design Code*. Thomas Telford.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_CONCRETE_DAMAGE_REL3 (sample input for 45.4 MPa concrete).
