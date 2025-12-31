# MAT_024 — Piecewise Linear Plasticity (Yun & Gardner curve)

This generator builds an LS-DYNA **MAT_024** material card together with a **DEFINE_CURVE** hardening curve based on the **Yun & Gardner (2017)** engineering stress–strain model for hot-rolled steels.

## What this generator outputs

- `*DEFINE_CURVE_TITLE`
  - **x-axis**: true plastic strain (dimensionless)
  - **y-axis**: true stress (MPa)
- `*MAT_PIECEWISE_LINEAR_PLASTICITY_TITLE`
  - Uses **LCSS** to reference the generated curve.
  - Adds **one post-peak plateau point** so the solver does not extrapolate beyond the last hardening point.

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

## Why add a post-peak plateau point?

Many solvers may extrapolate beyond the last tabulated hardening point.  
This generator appends **one extra point** after the peak (strain increases by `Δε`, stress stays constant) to improve numerical robustness.

## Inputs

- **E, Fy, Fu**: define the Yun & Gardner envelope.
- **n_elastic, n_plateau, n_hardening**: number of points (smoothness only).
- **delta_eps_post**: adds one extra point after peak (strain increases by Δε, stress stays constant).
- **c, p (optional)**: Cowper–Symonds rate parameters. Leave blank/0 to disable.

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

- LS-DYNA Keyword User’s Manual — *MAT_024 Piecewise Linear Plasticity*
