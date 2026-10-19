# MAT_159 — CSCM Concrete

## When to use
- Concrete damage and crushing, often for impact- and blast-type dynamics.

## What the generator writes

`*MAT_CSCM` with user-defined parameters (the keyword option left blank), in mm–ms–g–N–MPa:

- Input $f_{c}$ is the measured cylinder strength of the concrete you model (its mean strength).
- Shear, cap and damage parameters follow the calibration of Novozhilov, Dmitriev & Mikhaluk (2022). They differ from the values `*MAT_CSCM_CONCRETE` generates internally from $f_{c}$ and $d_{\mathrm{max}}$.
- $\mathrm{GFT} = \mathrm{GFS} = G_F$, $\mathrm{GFC} = 100\,G_F$, with $G_{F}$ from $f_{c}$ and $d_{\mathrm{max}}$.
- `ERODE = 1.05`: elements are eroded when the maximum principal strain exceeds 5 %.

## Rate effects (IRATE)

`IRATE = 0` (default) switches rate effects off. With `IRATE = 1` the Murray (2007) viscoplastic model is used: $\eta = \eta_0/\dot\varepsilon^{\,n}$. Murray's fits for η0c and η0t take f'c in psi and give η0 in s^(1−n). The generator converts them to milliseconds:

- $\mathrm{ETA0C} = \eta_{0c,s}\cdot 1000^{1-\mathrm{NC}}$, `NC = 0.78`
- $\mathrm{ETA0T} = \eta_{0t,s}\cdot 1000^{1-\mathrm{NT}}$, `NT = 0.48`

At $f_{c}$ = 30 MPa this gives ETA0C = 4.587E-4 and ETA0T = 2.242E-3, identical to the values LS-DYNA R13 prints for `*MAT_CSCM_CONCRETE` with FPC = 30 and UNITS = 1 (MPa, mm, ms). Before 2026-10-15 the generator wrote the values in seconds and evaluated η0t with $f_{c}$ in MPa instead of psi (5.07E-5 instead of 2.24E-3); this had no effect while IRATE = 0.

## Points to check before use

- The tensile $G_{F}$ dissipated in the notched-prism example was 1.41 × GFT (5 mm mesh). Check $G_{F}$ against a test where tensile cracking governs.
- Calibration targets 20–58 MPa; outside that range check the uniaxial response.

## References

- Murray, Y. D. (2007). *Users manual for LS-DYNA concrete material model 159*. FHWA-HRT-05-062.
- Novozhilov, Y. V., Dmitriev, A. N., & Mikhaluk, D. S. (2022). Precise calibration of the Continuous Surface Cap Model for concrete simulation. *Buildings*, 12(5), 636.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_CSCM.
