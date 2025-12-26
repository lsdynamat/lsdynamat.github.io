# MAT_015 — Johnson–Cook Plasticity

## When to use
- Metals under large plastic strain (crash / forming), with optional strain-rate and temperature effects.

## Key parameters (short)
- `A, B, n`: isotropic hardening with plastic strain
- `C`: strain-rate sensitivity
- `m, Troom, Tmelt`: thermal softening
- `RO, E, PR`: elastic properties

## Quick workflow
1) Set `RO, E, PR` from material data.
2) Calibrate `A, B, n, C, m` using coupon tests / literature.
3) Validate with a simple tension/compression simulation.
