# MAT_027 — Mooney–Rivlin Rubber

Two-parameter hyperelastic model for rubber and elastomers at large strain. It fits moderate stretches well but cannot follow the strong stiffening that rubber shows at large stretch. For that, use `*MAT_OGDEN_RUBBER` (MAT_077_O) or `*MAT_HYPERELASTIC_RUBBER` (MAT_077_H).

## Cards written by the generator

From the LS-DYNA R13 manual (Vol. II, p. 2-262):

- Card 1: `MID  RO  PR  A  B  REF`
- Card 2: `SGL  SW  ST  LCID` (all zero)

The site's inputs **C10 and C01 are written as A and B**. When card 2 is zero, LS-DYNA uses A and B directly. If you instead give a force vs. elongation curve in LCID (plus SGL, SW, ST), LS-DYNA fits A and B itself and ignores the values on card 1.

## Strain energy and derived values

- `W = A(I₁ − 3) + B(I₂ − 3) + C(III⁻² − 1) + D(III − 1)²`, where C and D are computed internally from A, B and PR
- Small-strain shear modulus: `G = 2(A + B)`
- Bulk modulus implied by PR: `K = 2G(1 + PR) / (3(1 − 2PR))`

MAT_027 has **no separate bulk-modulus input**: volumetric stiffness comes only from PR. The manual recommends PR between 0.49 and 0.5 and warns that lower values may not work, so the generator limits PR to 0.49–0.4999 (default 0.495). Higher PR gives a stiffer volumetric response and a smaller time step.

## Uniaxial check

For an incompressible material in uniaxial tension with stretch λ:

- Cauchy stress: `σ = 2(λ² − 1/λ)(A + B/λ)`

With the default A = 0.5 and B = 0.2 MPa and PR = 0.495, LS-DYNA R13 (one hexahedron, 100 % stretch) matched this expression within 1 % from 25 % to 100 % strain (about 5 % at 10 % strain, where stresses are small and the finite bulk modulus matters most).

## Calibration

Fit A and B to uniaxial, equibiaxial and planar shear data together where possible. A fit to uniaxial data alone often overestimates stiffness in biaxial loading.

## References

- Mooney, M. (1940). A theory of large elastic deformation. *Journal of Applied Physics*, 11(9), 582–592.
- Rivlin, R. S. (1948). Large elastic deformations of isotropic materials IV. *Phil. Trans. R. Soc. A*, 241(835), 379–397.
- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_MOONEY-RIVLIN_RUBBER.
