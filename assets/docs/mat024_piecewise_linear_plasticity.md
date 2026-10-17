# MAT_024 — Piecewise Linear Plasticity (Yun & Gardner curve)

This generator builds an LS-DYNA **MAT_024** material card together with a **DEFINE_CURVE** hardening curve based on the **Yun & Gardner (2017)** engineering stress–strain model for hot-rolled steels.

## What this generator outputs

- `*DEFINE_CURVE_TITLE`
  - **x-axis**: true plastic strain (dimensionless)
  - **y-axis**: true stress (MPa)
- `*MAT_PIECEWISE_LINEAR_PLASTICITY_TITLE`
  - Uses **LCSS** to reference the generated curve.
  - Extends the curve beyond the uniform elongation A_g with a straight line (see below).
  - When a reduction of area Z is given, adds ductile fracture: either **FAIL** (element erosion) or **`*MAT_ADD_DAMAGE_GISSMO`** (damage with a gradual load drop). GISSMO is the default.

## Model basis (Yun & Gardner engineering envelope)

Engineering stress–strain is defined as:
- Elastic: `σ = E ε` for `ε ≤ εy`
- Yield plateau: `σ = Fy` for `εy < ε ≤ εsh`
- Nonlinear hardening: as in Yun & Gardner (2017)

Engineering-to-true conversion (uniform deformation assumption):
- `ε_true = ln(1 + ε_eng)`
- `σ_true = σ_eng (1 + ε_eng)`

True plastic strain used for the tabulated curve:
- `εp_true = ε_true − σ_true/E`, clamped to `≥ 0`

> Note: the simple true conversion is most reliable up to the onset of necking (uniform deformation).

## Beyond A_g: the post-necking extension

A tensile test gives no true stress after the force maximum, because the strain is no longer uniform. The curve still has to continue, since the neck reaches plastic strains of 1 and more. The generator adds one straight segment from the last Yun & Gardner point (the engineering peak, at A_g):

- `σ(εp) = σ_Ag · (1 + H/σ_Ag · (εp − εp,Ag))` up to `εp,Ag + Δεp` (default Δεp = 2)

With **H/σ_Ag = 1** (default) the slope equals the true stress at A_g. This is the Considère condition `dσ/dε = σ`, so the neck starts exactly at A_g and then develops gradually. A flat tail (H = 0, used up to version 1.1) makes the neck form abruptly and thin too fast. A steeper slope delays necking past the measured A_g.

On the BAM S355 flat specimen (below), the measured curve to A_g plus this extension gives A_g = 14.1, 14.2 and 15.6 % for H/σ_Ag = 0.4, 0.7 and 1.0 (test: 14.9–15.5 %). At H/σ_Ag = 1.15 the force maximum moves to 27 %, far beyond the test.

## Ductile fracture: FAIL from the reduction of area

Enter the measured reduction of area **Z** (%) and the element size **h** in the neck. The generator writes

- `FAIL = k(h) · ln(1 / (1 − Z))`

`ln(1/(1−Z))` is the mean true strain in the fracture section. The centre of the neck strains more than the mean, and a smaller element captures more of that peak, so k grows as h decreases. The factor k(h) was calibrated so that the BAM specimen breaks at its measured elongation:

| Element size h in the neck | k(h) | FAIL for Z = 59 % | Runs (FAIL → elongation at fracture A) |
|---|---|---|---|
| 0.5 mm | 1.29 | 1.15 | 1.02 → 33.7 %, 1.10 → 34.7 %, 1.18 → 35.3 % |
| 1.0 mm | 1.13 | 1.01 | 0.8 → 31.5 %, 0.9 → 32.8 %, 1.0 → 34.9 % |
| 1.5 mm | 1.02 | 0.91 | 0.7 → 30.9 %, 0.8 → 33.2 %, 0.9 → 34.8 % |
| 3.0 mm | 0.81 | 0.72 | 0.5 → 29.3 %, 0.65 → 33.1 %, 0.8 → 37.0 % |

Target: A = 35 % (test protocol). Near the target, A changes by about 1.5 points per 0.1 of FAIL, so the elongation at fracture is less sensitive to FAIL than it might seem: the neck has already formed and FAIL only decides how far it thins.

Between the listed sizes k is interpolated in log h; outside, the end values are used. FAIL is mesh-dependent by nature: use the element size you have in the neck region, and keep the default slope H/σ_Ag = 1, for which k was calibrated.

## Ductile fracture with GISSMO (fracture model = 1, default)

FAIL deletes an element at full stress, so the force of a tensile test drops to zero at once. `*MAT_ADD_DAMAGE_GISSMO` accumulates damage D along the strain path and fades the stress out before the element is deleted. The generator writes:

- **LCSDG**, failure strain vs triaxiality η: `ε_f(η) = ε₀ · exp(−1.5 (η − 1/3))` (Rice–Tracey void growth), held constant below η = −1/3. ε₀ is the failure strain in uniaxial tension for 1 mm elements: `ε₀ = kG(1 mm) · ln(1/(1−Z))`.
- **LCREGD**, regularisation factor vs element size: `kG(h) / kG(1 mm)`, so one card works for any mesh size, including meshes with several element sizes.
- **ECRIT** = plastic strain at A_g: the stress starts to fade when necking begins.
- **DMGEXP = 2**, **FADEXP = 4**, DCRIT = 0, NUMFIP = 1.

Damage grows as `ΔD = DMGEXP · D^(1−1/DMGEXP) · Δεp / ε_f(η)`, so with DMGEXP = 2 an element at constant η fails at εp = ε_f. Once εp > ECRIT the stress is multiplied by `1 − ((D − D_crit) / (1 − D_crit))^FADEXP`.

| Element size h | kG(h) | ε_f in tension for Z = 59 % | Runs (ε_f → elongation at fracture A) |
|---|---|---|---|
| 0.5 mm | 1.63 | 1.45 | 1.20 → 32.6 %, 1.30 → 33.6 %, 1.40 → 34.5 % (1.45 extrapolated) |
| 1.0 mm | 1.37 | 1.22 | 1.05 → 32.7 %, 1.15 → 34.1 %, 1.25 → 35.4 % |
| 1.5 mm | 1.21 | 1.08 | 0.95 → 32.9 %, 1.00 → 33.7 %, 1.10 → 35.4 % |
| 3.0 mm | 0.91 | 0.81 | 0.80 → 34.6 %, 0.85 → 36.0 % |

The table above was obtained with one mesh at a time. The card as the generator writes it (ε₀ for 1 mm plus LCREGD) was then run unchanged on every mesh: A = 34.0, 34.8, 35.4 and 35.1 % for h = 0.5, 1, 1.5 and 3 mm. On the 0.5 mm mesh A no longer grows steadily with ε_f (1.40 → 34.5 %, 1.45 → 34.0 %): near the target, where the crack starts in the neck varies from run to run, so expect about ±0.5 points of scatter in A.

How FADEXP was chosen, on the 3 mm mesh (A = 35 % target):

| FADEXP | Effect |
|---|---|
| 1 | Softening starts right after A_g and lowers A_g to 14.2 %; the force falls slowly to zero over 5–10 % strain. |
| 2 | Gradual drop, but the neck keeps thinning while the stress fades: Z = 64–74 %. |
| 4 | The force falls to about 0.85 R_m over the last 3 % of strain, then the specimen breaks, as in the tests. |

The triaxiality dependence is not calibrated: the BAM specimen only covers η ≈ 0.33–0.6 (the neck of a flat bar). Rice–Tracey gives higher failure strains in shear (η = 0) than many steels show, so for shear-dominated fracture (punching, shear lips, bolt bearing) calibrate LCSDG on a shear test.

## Calibration test: BAM S355 flat specimen

BAM tensile tests on S355 plate (Zenodo record 6778336, CC BY 4.0): flat specimens 6 × 20 mm, L0 = 60 mm. Specimens Zx2–Zx4: R_m = 504–519 MPa, A_g = 14.9–15.5 % (from the recorded curves), A = 35 % and Z = 58–61 % (test protocol). The model is one eighth of the specimen (8-node solids, ELFORM 2), with the measured true curve up to A_g and the extension above; the geometry of the parallel length and fillets was measured on the photo of the specimens. See the Examples page for the load–elongation curves.

## Inputs

- **E, Fy, Fu**: define the Yun & Gardner envelope.
- **n_plateau, n_hardening**: number of points (smoothness only).
- **Δεp beyond A_g, H/σ_Ag**: length and slope of the post-necking extension.
- **Z (optional)**: reduction of area. Blank Z = no fracture.
- **Fracture model**: 0 = FAIL, 1 = GISSMO (default).
- **h**: element size in the neck, used only with FAIL.

## Files

- Generator: `assets/js/generators/mat024_piecewise_linear_plasticity.js`
- Doc: `assets/docs/mat024_piecewise_linear_plasticity.md`

## References

- Yun, X., & Gardner, L. (2017).  
  *Stress–strain curves for hot-rolled steels*.  
  **Journal of Constructional Steel Research**, 133, 36–46. Elsevier.  
  DOI: https://doi.org/10.1016/j.jcsr.2017.01.024

- Han, et al. (2025, January).  
  *Experimental and numerical evaluation of the structural performance of novel S-CN connections in modular construction.*  
  **Structures**, 71, 107930. Elsevier.  
  DOI: https://doi.org/10.1016/j.istruc.2024.107930

- Bundesanstalt für Materialforschung und -prüfung (BAM). Tensile test data on S355 steel plate, specimens Zx, Zy, Zd (tests of December 2021). Zenodo, https://zenodo.org/records/6778336. CC BY 4.0.

- Rice, J. R., & Tracey, D. M. (1969). On the ductile enlargement of voids in triaxial stress fields. *Journal of the Mechanics and Physics of Solids*, 17(3), 201–217. DOI: https://doi.org/10.1016/0022-5096(69)90033-7

- Neukamm, F., Feucht, M., & Haufe, A. (2008). Consistent damage modelling in the process chain of forming to crashworthiness simulations. *7th European LS-DYNA Conference*, Salzburg.

- LS-DYNA Keyword User’s Manual, Vol. II, R13 — *MAT_024 Piecewise Linear Plasticity, *MAT_ADD_DAMAGE_GISSMO*
