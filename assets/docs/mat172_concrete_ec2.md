# MAT_172 — Concrete EC2

`*MAT_CONCRETE_EC2` is a smeared-crack concrete model whose stress–strain data come from Eurocode 2. It cracks in tension, crushes in compression and can carry smeared reinforcement in two directions. It is the only concrete model on this site for **shell and Hughes–Liu beam elements**; it does not work with solids.

## Keywords written

- `*MAT_CONCRETE_EC2_TITLE`: cards 1–4, plus card 8 for TYPEC = 9.

## How the parameters are obtained

The only strength input is the mean cylinder strength $f_c$ (= $f_{cm}$). The generator takes $f_{ck} = f_{cm} - 8$ MPa and, from EN 1992-1-1:2004, Table 3.1:

$$
f_{ctm} = \begin{cases} 0.30\,f_{ck}^{2/3} & f_{ck} \le 50\ \text{MPa} \\ 2.12\,\ln\!\left(1 + f_{cm}/10\right) & f_{ck} > 50\ \text{MPa} \end{cases} \qquad E_{cm} = 22\left(\frac{f_{cm}}{10}\right)^{0.3}\ \text{GPa} \qquad \varepsilon_{c1} = 0.7\,f_{cm}^{0.31}\ \text{‰} \le 2.8\ \text{‰}
$$

| Field | Value written | Source |
|---|---|---|
| FC | $f_{ck}$ for TYPEC = 9, $f_{cm}$ for TYPEC = 7, 8 | manual: meaning of FC depends on TYPEC |
| FCC | $f_{cm}$ (TYPEC = 9 only) | manual: actual compressive strength |
| FT | $f_{ctm}$ | Table 3.1 |
| UNITC | 1 (MPa) | converted with the unit system |
| PRT36 | 0.2 | EN 1992-1-1, 3.1.3(4), uncracked concrete; MAT_172 default is 0.25 |
| YMREINF | 200 GPa | EN 1992-1-1, 3.2.7(4) |
| ECUTEN, LCHAR | from $G_F$ and the element size, see below | |
| AGGSZ, UNITL | optional $d_{max}$ (blank = 0), 1 | NS 3473 aggregate interlock when $d_{max}$ is given, see below |
| MU, TAUMXF, TAUMXC, ECRAGG | manual defaults | |
| DEGRAD | 1 | compression softening of cracked concrete, see below |
| ECSP69 | from $G_c$ and the element size (TYPEC = 9) | see below |
| UNLFAC | 0.5 (manual default) | |

With TYPEC = 9 LS-DYNA computes $E_{cm}$ and $\varepsilon_{c1}$ itself from $f_{ck}$ and follows EN 1992-1-1, Expression (3.14):

$$
\frac{\sigma_c}{f_{cm}} = \frac{k\eta - \eta^2}{1 + (k-2)\eta}, \qquad \eta = \frac{\varepsilon_c}{\varepsilon_{c1}}, \qquad k = 1.05\,E_{cm}\,\frac{\varepsilon_{c1}}{f_{cm}}
$$

The generator writes the values it expects LS-DYNA to use as comments in the card, so they can be compared with the d3hsp file.

## Concrete data (TYPEC)

| TYPEC | Data | Temperature | Young's modulus at 20 °C |
|---|---|---|---|
| 9 (default) | EN 1992-1-1:2004 | not sensitive, no thermal expansion | $E_{cm}$ |
| 7 | EN 1992-1-2:2004, siliceous aggregate | sensitive | $1.5\,f_c/\varepsilon_{c1}$ with $\varepsilon_{c1}$ = 0.0025 |
| 8 | EN 1992-1-2:2004, calcareous aggregate | sensitive | as TYPEC = 7 |

For TYPEC = 7 and 8 the manual gives the curve $\sigma = f_c\,\dfrac{3\,(\varepsilon/\varepsilon_{c1})}{2 + (\varepsilon/\varepsilon_{c1})^3}$ up to the peak and a linear descent to zero at $\varepsilon_{cu}$ (0.0025 and 0.02 at 20 °C). Its initial modulus, $1.5 f_c/0.0025$ = 22.8 GPa for $f_c$ = 38 MPa, is well below $E_{cm}$ = 32.8 GPa. Use these types for fire analysis, where the temperature-dependent data matter more than the stiffness at 20 °C, and TYPEC = 9 otherwise.

## Fracture energy and element size

After cracking, the stress falls along the default curve of the manual (Fig. M172-1): from FT to 0.33 FT at a crack-opening strain of 0.22 ECUTEN, then to zero at ECUTEN. The area under this curve is

$$
\int \sigma\, d\varepsilon_{cr} = \left[\tfrac{1}{2}(1 + 0.33)(0.22) + \tfrac{1}{2}(0.33)(0.78)\right] \mathrm{FT}\cdot\mathrm{ECUTEN} = 0.275\,\mathrm{FT}\cdot\mathrm{ECUTEN}
$$

When LCHAR is set, LCHAR × ECUTEN is the crack-opening displacement at which the crack is fully open, whatever the element size (the manual estimates the opening of an element as strain × √area). The energy per unit crack area is then

$$
G_F = 0.275\,\mathrm{FT}\cdot\mathrm{ECUTEN}\cdot\mathrm{LCHAR}
$$

The generator sets LCHAR = h (the element size input) and $\mathrm{ECUTEN} = G_F/(0.275\, f_{ctm}\, h)$, with $G_F$ = the optional input or fib Model Code 2010, $73\,f_{cm}^{0.18}$ N/m. LCHAR is also the crack spacing of the NS 3473 aggregate-interlock formula, which is used only when AGGSZ > 0 (the optional $d_{max}$ input).

## Compressive softening and element size

With TYPEC = 9 LS-DYNA follows Expression (3.14) up to $\varepsilon_{cu1}$ (3.5 ‰ for $f_{ck}$ < 50 MPa, $2.8 + 27[(98 - f_{cm})/100]^4$ ‰ above) and then lets the stress fall linearly to zero at ECSP69. This was checked on single elements: ECSP69 = 0.01 and 0.02 moved the end of the curve to 10 and 20 ‰. Left at its default, the stress reaches zero at about 5 ‰ in any element, so a crushing band dissipates less energy the smaller the elements. The generator sets ECSP69 so that the area under the curve beyond the peak is $G_c/h$:

$$
\mathrm{ECSP69} = \varepsilon_{cu1} + \frac{2\,(G_c/h - A_1)}{\sigma(\varepsilon_{cu1})}, \qquad G_c = 100\,G_F
$$

where $A_1$ is the area under (3.14) from $\varepsilon_{c1}$ to $\varepsilon_{cu1}$. $G_c = 100\,G_F$ is the default compressive fracture energy of the CSCM model (Murray 2007). For elements too large for this ($G_c/h < A_1$, about 280 mm and larger for $f_c$ = 55.6 MPa) ECSP69 = 1.1 $\varepsilon_{cu1}$. The steep part of the curve between $\varepsilon_{c1}$ and $\varepsilon_{cu1}$ is EN 1992-1-1 data and is not regularised.

## Cracked concrete: DEGRAD and aggregate interlock

- **DEGRAD = 1** (always written). The compressive strength parallel to an open crack is multiplied by $\min\left(1,\ 1/(0.8 + 100\,\varepsilon_{t,max})\right)$ (manual, from BS 8110), where $\varepsilon_{t,max}$ is the largest crack-opening strain so far. Vecchio & Collins (1986) derived the same form from their panel tests, $1/(0.8 - 0.34\,\varepsilon_1/\varepsilon'_c)$.
- **AGGSZ = $d_{max}$** (only when $d_{max}$ is entered). The shear stress a crack can carry follows the NS 3473 aggregate-interlock formula of the manual, with crack width = crack-opening strain × LCHAR. Without it MAT_172 uses its default shear-transfer law (TAUMXC, ECRAGG). Enter $d_{max}$ for reinforced members in shear; leave it blank for plain concrete governed by tensile cracking (see the benchmarks below).

## Checks

One shell element (ELFORM 16) in uniaxial plane stress, LS-DYNA R13, generator cards for $f_c$ = 55.6 MPa unless noted:

| Test | Expected | LS-DYNA |
|---|---|---|
| Tension, h = 5 mm, card for h = 5 | FT = 3.94 MPa, E = 36.8 GPa, $G_F$ = 0.1505 N/mm | 3.94 MPa, 36.8 GPa, 0.153 N/mm |
| Tension, h = 20 mm, card for h = 20 | as above | 3.94 MPa, 36.8 GPa, 0.155 N/mm |
| Tension, h = 5 and 20 mm, one card for h = 10 | same $G_F$ (LCHAR fixes the crack opening) | 0.153 and 0.155 N/mm |
| Compression, TYPEC = 9 | peak $f_{cm}$ = 55.6 MPa at $\varepsilon_{c1}$ = 2.43 ‰ | 55.6 MPa at 2.45 ‰ |
| Compression, TYPEC = 9, $f_c$ = 38 MPa | 38.0 MPa at 2.16 ‰ | 38.0 MPa at 2.17 ‰ |
| Compression, TYPEC = 7 | E = 1.5 · 55.6 / 0.0025 = 33.4 GPa, peak at 2.5 ‰ | 33.2 GPa, 55.6 MPa at 2.50 ‰ |
| Compression to 20 % strain, TYPEC = 9, h = 5 mm | area beyond the peak $G_c/h$ = 3.01 MPa, zero stress at ECSP69 = 0.166 | 2.87 MPa (−4.5 %), zero at a logarithmic strain of 0.164 |

The element size inside the card (LCHAR) does not need to match the mesh: the h = 10 card gave the same results on 5 and 20 mm elements as the cards made for those sizes.

TYPEC = 7 descends linearly to zero at 20 ‰; card 8 is not read for TYPEC = 7 and 8, so their compressive softening is not regularised.

## Open-data benchmarks

Both are on the Examples page, with the decks. Nothing was fitted to the tests.

### Plain concrete: Hoover et al. (2013)

Plane-stress shells with the element sizes of the solid models ($f_c$ = 55.6 MPa, fib $G_F$, $d_{max}$ left blank), next to the four solid-element concrete models:

| | Test | MAT_172 (generator 1.1) |
|---|---|---|
| Beam D = 93 mm, peak load | 3.46 kN | 3.93 kN (+14 %) |
| Beam D = 215 mm, peak load | 6.57 kN | 7.28 kN (+11 %) |
| Size-effect ratio $\sigma_N(215)/\sigma_N(93)$ | 0.826 | 0.804 |
| Work / ligament, D = 93 and 215 mm | 0.126 and 0.138 N/mm (to the end of the test) | 0.178 and 0.220 N/mm |
| Cylinder strip: initial modulus, peak | 34.4 GPa, 55.6 MPa at 1.76 ‰ | 36.6 GPa, 55.6 MPa at 2.43 ‰ |

What was checked on the D = 93 mm beam:

- **$G_F$.** With the measured $G_F$ of this concrete (0.104 N/mm) instead of the fib estimate (0.150 N/mm) the peak is 3.64 kN (+5 %). Most of the overshoot comes from the fib $G_F$, which Hoover et al. note is about 50 % too high for this concrete. Enter a measured $G_F$ when you have one.
- **Where the energy goes.** About a quarter is dissipated by local cracking around the loaded node and the support nodes; the main crack stays in one column of elements but still dissipates 15–20 % more than $G_F$ per element.
- **No effect:** 2 cracks instead of 4 (TYPEC = 109), half the loading rate, ECSP69, DEGRAD. A 1.5 mm mesh gives 3.70 kN and 0.187 N/mm (3 mm: 3.93 kN, 0.178 N/mm).
- **$d_{max}$.** AGGSZ = 10 mm leaves the peak unchanged but spreads cracking to the neighbouring columns and raises the energy by about 30 %, which is why $d_{max}$ is optional.

In the cylinder strip the stress drops in steps right after the peak: the EC2 curve between $\varepsilon_{c1}$ and $\varepsilon_{cu1}$ is too steep for a 3.75 mm crushing band in a 150 mm strip (snap-back). With generator 1.0 (default ECSP69) the stress then went to zero and the strip flew apart; with ECSP69 from $G_c$ it keeps a residual stress and kinetic energy stays below 0.01 % of the work.

### Reinforced concrete: Vecchio & Collins (1986) panels

Twelve panels in monotonic pure shear (890 × 890 × 70 mm, $f_c$ 14.5–29.8 MPa, $\rho_x$ 0.74–1.79 %, $\rho_y$ 0–1.79 %, $d_{max}$ = 6 mm). Each panel is one shell with a `*PART_COMPOSITE` section of generator cards: concrete / x-steel / y-steel.

| Cards | Mean $v_u$ model / test | CoV | Range |
|---|---|---|---|
| Generator 1.0 (no $d_{max}$, DEGRAD = 0) | 0.94 | 19 % | 0.64–1.25 |
| DEGRAD = 1 only | 0.94 | 19 % | 0.64–1.16 |
| AGGSZ = $d_{max}$ only | 1.02 | 13 % | 0.80–1.25 |
| **Generator 1.1 ($d_{max}$ = 6 mm, DEGRAD = 1)** | **1.01** | **10.5 %** | **0.80–1.16** |

Aggregate interlock raises the panels with little transverse steel (PV13: 0.76 → 0.97), DEGRAD lowers the crushing-governed panels (PV27: 1.25 → 1.16). The fixed cracks still leave the panels with the least transverse steel 11–20 % low and the most heavily reinforced 14–16 % high.

## Reinforcement

FRACRX and FRACRY are the steel ratios along the element's local x and y axes (node 1 to node 2 by default; AOPT = 0). The bars carry only axial stress, no in-plane or through-thickness shear. At 20 °C they are elastic–perfectly plastic at SUREINF up to failure; for hot-rolled steel failure starts at 15 % strain and is complete at 20 % (manual).

To model a section with bars at their real depth, define one plain-concrete card (both ratios 0) and one steel card (ratio 100 % in the bar direction) and assign them to the integration points of a `*PART_COMPOSITE` (manual, Remark 2). Do not make every integration point steel with both ratios at 100 %.

## Points to check before use

- **Shells and beams only.** For solid elements use one of the other concrete models.
- **Fixed cracks.** A crack keeps the direction in which it formed; further cracks can form only at 45°, 90° and 135° to it (R10 and later). Tension in other directions is not limited by FT, which can make a model stiffer and stronger than intended (manual).
- **Through-thickness shear.** Uncracked concrete has unlimited through-thickness shear strength, so shear failure of slabs is not predicted unless the shear capacity check (card 7, not written by the generator) is used.
- **Erosion.** No erosion criterion is written (card 7 is omitted).
- **Strain rate.** The model has no strain-rate enhancement.

## References

- LS-DYNA Keyword User's Manual, Vol. II, R13 — *MAT_CONCRETE_EC2.
- EN 1992-1-1:2004. *Eurocode 2: Design of concrete structures — Part 1-1: General rules and rules for buildings*. CEN. Table 3.1; 3.1.3(4); 3.1.5, Expression (3.14); 3.2.7(4).
- fib (2013). *fib Model Code for Concrete Structures 2010*. Ernst & Sohn.
- Murray, Y. D. (2007). *Users Manual for LS-DYNA Concrete Material Model 159*. Federal Highway Administration, FHWA-HRT-05-062.
- Vecchio, F. J., & Collins, M. P. (1986). The modified compression-field theory for reinforced concrete elements subjected to shear. *ACI Journal*, 83(2), 219–231. doi:10.14359/10416
- Hoover, C. G., Bažant, Z. P., Vorel, J., Wendner, R., & Hubler, M. H. (2013). Comprehensive concrete fracture tests: Description and results. *Engineering Fracture Mechanics*, 114, 92–103. doi:10.1016/j.engfracmech.2013.08.007
