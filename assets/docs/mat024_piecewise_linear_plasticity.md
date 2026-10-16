# MAT_024 — Piecewise Linear Plasticity (Yun & Gardner curve)

This generator builds an LS-DYNA **MAT_024** material card together with a **DEFINE_CURVE** hardening curve based on the **Yun & Gardner (2017)** engineering stress–strain model for hot-rolled steels.

## What this generator outputs

- `*DEFINE_CURVE_TITLE`
  - **x-axis**: true plastic strain (dimensionless)
  - **y-axis**: true stress (MPa)
- `*MAT_PIECEWISE_LINEAR_PLASTICITY_TITLE`
  - Uses **LCSS** to reference the generated curve.
  - Extends the curve beyond the uniform elongation A_g with a straight line (see below).
  - Writes **FAIL** (effective plastic strain at element erosion) when a reduction of area Z is given.

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
| 0.5 mm | 1.29 | 1.15 | 1.02 → 33.7 %, 1.18 → 35.3 % |
| 1.0 mm | 1.13 | 1.01 | 0.8 → 31.5 %, 0.9 → 32.8 %, 1.0 → 34.9 % |
| 1.5 mm | 1.02 | 0.91 | 0.7 → 30.9 %, 0.8 → 33.2 %, 0.9 → 34.8 % |
| 3.0 mm | 0.81 | 0.72 | 0.5 → 29.3 %, 0.65 → 33.1 %, 0.8 → 37.0 % |

Target: A = 35 % (test protocol). Near the target, A changes by about 1.5 points per 0.1 of FAIL, so the elongation at fracture is less sensitive to FAIL than it might seem: the neck has already formed and FAIL only decides how far it thins.

Between the listed sizes k is interpolated in log h; outside, the end values are used. FAIL is mesh-dependent by nature: use the element size you have in the neck region, and keep the default slope H/σ_Ag = 1, for which k was calibrated.

## Calibration test: BAM S355 flat specimen

BAM tensile tests on S355 plate (Zenodo record 6778336, CC BY 4.0): flat specimens 6 × 20 mm, L0 = 60 mm. Specimens Zx2–Zx4: R_m = 504–519 MPa, A_g = 14.9–15.5 % (from the recorded curves), A = 35 % and Z = 58–61 % (test protocol). The model is one eighth of the specimen (8-node solids, ELFORM 2), with the measured true curve up to A_g and the extension above; the geometry of the parallel length and fillets was measured on the photo of the specimens. See the Examples page for the load–elongation curves.

## Inputs

- **E, Fy, Fu**: define the Yun & Gardner envelope.
- **n_plateau, n_hardening**: number of points (smoothness only).
- **Δεp beyond A_g, H/σ_Ag**: length and slope of the post-necking extension.
- **Z (optional), h**: reduction of area and element size for FAIL. Blank Z = no fracture.

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

- LS-DYNA Keyword User’s Manual — *MAT_024 Piecewise Linear Plasticity*
