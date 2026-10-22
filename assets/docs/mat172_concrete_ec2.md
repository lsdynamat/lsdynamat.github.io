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
| MU, TAUMXF, TAUMXC, ECRAGG, AGGSZ | manual defaults | |
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

The generator sets LCHAR = h (the element size input) and $\mathrm{ECUTEN} = G_F/(0.275\, f_{ctm}\, h)$, with $G_F$ = the optional input or fib Model Code 2010, $73\,f_{cm}^{0.18}$ N/m. LCHAR is also the crack spacing of the NS 3473 aggregate-interlock formula, which is used only when AGGSZ > 0 (not by default).

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

The element size inside the card (LCHAR) does not need to match the mesh: the h = 10 card gave the same results on 5 and 20 mm elements as the cards made for those sizes.

In compression TYPEC = 9 follows Expression (3.14) up to $\varepsilon_{cu1}$ = 3.5 ‰ and then falls linearly to zero at about 5 ‰ for both strengths. This branch is not regularised, so crushing zones soften faster in finer meshes. TYPEC = 7 descends linearly to zero at 20 ‰.

## Open-data benchmark

The Examples page runs this generator on the Hoover et al. (2013) tests together with the four solid-element concrete models, as plane-stress shells with the same element sizes ($f_c$ = 55.6 MPa, fib $G_F$, nothing fitted):

| | Test | MAT_172 |
|---|---|---|
| Beam D = 93 mm, peak load | 3.46 kN | 3.93 kN (+14 %) |
| Beam D = 215 mm, peak load | 6.57 kN | 7.28 kN (+11 %) |
| Size-effect ratio $\sigma_N(215)/\sigma_N(93)$ | 0.826 | 0.804 |
| Work / ligament, D = 93 and 215 mm | 0.126 and 0.138 N/mm (to the end of the test) | 0.182 and 0.224 N/mm |
| Cylinder strip: initial modulus, peak | 34.4 GPa, 55.6 MPa at 1.76 ‰ | 36.6 GPa, 55.6 MPa at 2.43 ‰, then collapse |

The beams dissipate 21–49 % more than the card's $G_F$ although the crack stays in one column of elements, and the load after the peak stays above the test (1.94 against 1.08 kN at 0.1 mm for D = 93 mm). The cause has not been isolated; when the post-peak response matters, check the card against a fracture test of your concrete.

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
- Hoover, C. G., Bažant, Z. P., Vorel, J., Wendner, R., & Hubler, M. H. (2013). Comprehensive concrete fracture tests: Description and results. *Engineering Fracture Mechanics*, 114, 92–103. doi:10.1016/j.engfracmech.2013.08.007
