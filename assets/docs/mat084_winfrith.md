---
layout: default
title: Winfrith Concrete Model (LS-DYNA, RATE=1)
---

# Winfrith concrete model in LS-DYNA (RATE = 1)

Concrete is modelled using the Winfrith material implemented in LS-DYNA as `*MAT_WINFRITH_CONCRETE` (MAT084/085). In this thesis, strain-rate enhancement is neglected by selecting the no-rate option `RATE = 1`. Under this setting, the tensile cracking parameter `FE` is interpreted as the critical crack width at which the normal tensile traction transmitted across the crack plane becomes zero. This critical opening is denoted by \(w_c\) \cite{Schwer2011Winfrith}.

---

## 1) Elastic and strength parameters (Eurocode-based estimates)

The Winfrith model requires elastic constants \((\rho, E_c, \nu)\) and strength parameters \((f_c, f_t)\). When direct material testing is unavailable, these quantities can be estimated from the mean 28-day cylinder compressive strength \(f_{cm}\) using Eurocode-type relationships \cite{Eurocode2}. The corresponding LS-DYNA inputs are `RO`, `TM`, `PR`, `UCS`, and `UTS`.

### 1.1 Compressive strength

In Eurocode terminology, \(f_{cm}\) is the mean cylinder compressive strength at 28 days, while \(f_{ck}\) is the characteristic cylinder strength. A commonly used relationship is

\[
f_{ck} = f_{cm} - 8~\text{MPa}.
\]

In this thesis, the LS-DYNA unconfined compressive strength is taken as

\[
\texttt{UCS} = f_c \approx f_{cm},
\]

unless a test-based unconfined value is available.

### 1.2 Tensile strength

The mean axial tensile strength according to Eurocode is taken as

\[
f_{ctm} = 0.30\, f_{ck}^{2/3}, \qquad (f_{ck}\le 50~\text{MPa}),
\]

and for higher-strength concrete,

\[
f_{ctm} = 2.12 \ln\!\left(1+\frac{f_{cm}}{10}\right), \qquad (f_{ck}>50~\text{MPa}).
\]

The Winfrith tensile strength is set as

\[
\texttt{UTS} = f_t = f_{ctm}.
\]

### 1.3 Elastic modulus, Poisson’s ratio, and density

The secant modulus of elasticity is estimated by Eurocode as

\[
E_{cm} = 22{,}000\left(\frac{f_{cm}}{10}\right)^{0.3}\ \text{MPa},
\]

and used directly in LS-DYNA:

\[
\texttt{TM} = E_c = E_{cm}.
\]

When not measured, \(\nu \approx 0.20\) is adopted for normal-weight concrete, and the density is selected in the range 2300–2500 kg/m\(^3\) depending on mix design:

\[
\texttt{PR}=\nu,\qquad \texttt{RO}=\rho.
\]

---

## 2) Crack width variable \(w\) and its geometrical meaning

The Winfrith tensile formulation uses the crack width variable \(w\), which represents the separation of two crack faces in the direction normal to the crack plane. Figure 1 provides a geometric interpretation of \(w\) and the crack opening angle \(2\theta\). For the idealised V-shaped crack, the opening angle is related to the crack width and a characteristic length \(L\) by

\[
\tan\theta=\frac{w}{2L}.
\]

**Figure 1. Geometrical interpretation of crack width \(w\) and crack opening angle**

<script type="text/tikz">
\begin{tikzpicture}[>=Latex, line cap=round, line join=round]
  % Geometry parameters
  \def\W{6}
  \def\H{4.8}
  \def\xL{2.2}
  \def\xR{3.8}
  \def\yTop{4.8}
  \def\xTip{3.0}
  \def\yTip{1.3}

  % Outer block
  \draw[thick] (0,0) rectangle (\W,\H);

  % Top surface with opening
  \draw[thick] (0,\yTop) -- (\xL,\yTop);
  \draw[thick] (\xR,\yTop) -- (\W,\yTop);

  % Crack faces
  \draw[thick] (\xL,\yTop) -- (\xTip,\yTip);
  \draw[thick] (\xR,\yTop) -- (\xTip,\yTip);

  % Crack width w
  \draw[<->,thick] (\xL,\yTop+0.55) -- (\xR,\yTop+0.55);
  \node[fill=white, inner sep=2pt] at ({(\xL+\xR)/2},\yTop+0.55) {$w$};

  % Characteristic length L
  \draw[<->,thick] (0.9,\yTop) -- (0.9,\yTip);
  \node[fill=white, inner sep=2pt] at (0.9,{(\yTop+\yTip)/2}) {$L$};

  % Opening angle
  \node[fill=white, inner sep=2pt] at (3.05,3.1) {$2\theta$};

  % Equation
  \node[fill=white, inner sep=2pt] at (3.0,0.55) {$\tan\theta=\dfrac{w}{2L}$};
\end{tikzpicture}
</script>

---

## 3) Fracture energy from CEB-FIP and conversion to `FE` (RATE = 1)

In the Winfrith model, the progressive loss of tensile load transfer is governed by the mode-I fracture energy under uniaxial tension, denoted as \(G_{F_t}\), and the terminal crack width \(w_c\) \cite{Schwer2011Winfrith}. When direct fracture tests are unavailable, \(G_{F_t}\) can be estimated using CEB-FIP Model Code 1990 relations \cite{CEBFIP1990MC}. The dependence on aggregate size is captured through a base value \(G_{F0}\), and the dependence on strength is captured through a scaling law in terms of \(f_{cm}\).

### 3.1 Base fracture energy from aggregate size

The base fracture energy \(G_{F0}\) depends on the maximum aggregate size \(d_{\max}\):

\[
G_{F0}=0.021+5.357\times 10^{-4}\, d_{\max},
\]

where \(d_{\max}\) is in mm and \(G_{F0}\) is in N/mm \cite{CEBFIP1990MC}. In practice, the Winfrith parameter `ASIZE` is set consistently with the mix design:

\[
\texttt{ASIZE}\approx d_{\max}.
\]

### 3.2 Strength scaling to obtain \(G_{F_t}\)

The fracture energy under uniaxial tension is estimated as

\[
G_{F_t} = G_{F0}\left(\frac{f_{cm}}{f_{cm0}}\right)^{0.7},
\qquad \text{for } f_{cm}\le 50~\text{MPa},
\]

\[
G_{F_t} = G_{F0}\,\ln\!\left(1+\frac{f_{cm}}{f_{cm0}}\right),
\qquad \text{for } f_{cm}> 50~\text{MPa},
\]

with the reference strength \(f_{cm0}=10~\text{MPa}\) \cite{CEBFIP1990MC}.

### 3.3 Conversion to \(w_c\) and `FE` for RATE = 1

For `RATE=1`, tensile softening is formulated in the traction–separation space \(\sigma_n(w)\). Enforcing energy equivalence yields

\[
w_c=\frac{2G_{F_t}}{f_t}.
\]

Under `RATE=1`, the Winfrith input parameter is therefore set as

\[
\texttt{FE}=w_c.
\]

---

## 4) Tensile traction–separation law in the \(\sigma_n\)–\(w\) space (RATE = 1)

For `RATE=1`, the normal tensile traction is prescribed as a function of crack width \cite{Schwer2011Winfrith}:

\[
\sigma_n(w) = f_t\left(1-\frac{w}{w_c}\right), \qquad 0 \le w \le w_c,
\]

\[
\sigma_n(w)=0, \qquad w \ge w_c.
\]

Figure 2 illustrates the linear tensile softening in the \(\sigma_n\)–\(w\) space. The area under the curve equals \(G_{F_t}\), which directly gives \(w_c=2G_{F_t}/f_t\).

**Figure 2. Linear tensile softening in the \(\sigma_n\)–\(w\) space and definition of \(G_{F_t}\)**

<script type="text/tikz">
\begin{tikzpicture}[>=Latex, line cap=round, line join=round]
  % Axes
  \draw[->,thick] (0,0) -- (7,0) node[below] {$w$};
  \draw[->,thick] (0,0) -- (0,4.5) node[left] {$\sigma_n$};

  % Key points
  \coordinate (A) at (0,4);
  \coordinate (B) at (6,0);

  % Softening line
  \draw[thick] (A) -- (B);

  % Shaded area = GFt
  \fill[gray!25] (0,0) -- (A) -- (B) -- cycle;
  \node at (2.1,1.1) {$G_{F_t}$};

  % Labels
  \draw[dashed] (6,0) -- (6,4);
  \draw[dashed] (0,4) -- (6,4);
  \node[below] at (6,0) {$w_c$};
  \node[left] at (0,4) {$f_t$};

  % Note
  \node[anchor=north east] at (6.9,4.4) {\small RATE=1};
\end{tikzpicture}
</script>

---

## 5) Crack-band regularisation and mesh dependence

Winfrith employs a smeared-crack approach, so crack opening is not introduced as an explicit geometric discontinuity. Instead, the crack width is computed from the crack-normal strain and a characteristic element length \cite{Schwer2011Winfrith}:

\[
w = \varepsilon_n L,
\qquad
L = \sqrt[3]{V_e},
\]

where \(V_e\) is the element volume.

Figure 3 illustrates the crack-band concept, where \(L\) provides the characteristic length used to convert strain to an equivalent opening \(w\). The strain at which tensile traction vanishes follows from \(w=w_c\):

\[
\varepsilon_0 = \frac{w_c}{L}.
\]

**Figure 3. Crack-band regularisation: \(w=\varepsilon_nL\), with \(L=\sqrt[3]{V_e}\)**

<script type="text/tikz">
\begin{tikzpicture}[>=Latex, line cap=round, line join=round]
  % Element box
  \draw[thick] (0,0) rectangle (8,2.3);

  % Crack plane
  \draw[thick,dashed] (4,0.15) -- (4,2.15);
  \node[fill=white, inner sep=2pt] at (4,2.45) {Crack plane};

  % Characteristic length L
  \draw[<->,thick] (0,-0.6) -- (8,-0.6);
  \node[fill=white, inner sep=2pt] at (4,-0.6) {$L=\sqrt[3]{V_e}$};

  % Crack opening w above
  \draw[<->,thick] (4.2,3.0) -- (5.8,3.0);
  \node[fill=white, inner sep=2pt] at (5.0,3.0) {$w$};
  \draw[thin] (5.0,3.0) -- (5.0,2.3);

  % Equations block
  \node[draw, rounded corners, fill=white, inner sep=4pt, anchor=north west] at (8.4,2.3)
  {$w=\varepsilon_nL$\\[2pt] $\varepsilon_0=\dfrac{w_c}{L}$};

  % Arrow to indicate strain location
  \draw[->,thick] (8.4,1.2) -- (6.2,1.1);
\end{tikzpicture}
</script>

Figure 4 provides a qualitative stress–strain view to explain the mesh dependence. For a fixed \(w_c\), the terminal strain \(\varepsilon_0=w_c/L\) decreases as the element size increases.

**Figure 4. Mesh effect in stress–strain representation through \(\varepsilon_0=w_c/L\)**

<script type="text/tikz">
\begin{tikzpicture}[>=Latex, line cap=round, line join=round]
  % Axes
  \draw[->,thick] (0,0) -- (7,0) node[below] {$\varepsilon_n$};
  \draw[->,thick] (0,0) -- (0,4.6) node[left] {$\sigma_n$};

  % Reference stress
  \draw[dashed] (0,4) -- (6.5,4);
  \node[left] at (0,4) {$f_t$};

  % Coarse mesh: smaller eps0
  \draw[thick] (0,4) -- (3.0,0) -- (6.5,0);
  \node at (4.9,3.35) {\small coarser mesh (larger $L$)};

  % Fine mesh: larger eps0 (dashed)
  \draw[thick,dashed] (0,4) -- (5.0,0);
  \node at (4.9,2.55) {\small finer mesh (smaller $L$)};

  % Note
  \node[fill=white, inner sep=2pt] at (2.4,0.7) {$\varepsilon_0=\dfrac{w_c}{L}$};
\end{tikzpicture}
</script>

---

## Summary table (chapter-level)

| Quantity | Symbol | LS-DYNA keyword | How to set (RATE=1, concise) |
|---|---:|---|---|
| Density | \(\rho\) | `RO` | Typical: 2300–2500 kg/m\(^3\) (or measured). |
| Young’s modulus | \(E_c\) | `TM` | \(E_c = 22{,}000(f_{cm}/10)^{0.3}\) MPa (Eurocode). |
| Poisson’s ratio | \(\nu\) | `PR` | If unknown: \(\nu \approx 0.20\). |
| Unconfined compressive strength | \(f_c\) | `UCS` | \(f_c \approx f_{cm}\) (MPa). |
| Tensile strength | \(f_t\) | `UTS` | \(f_t=f_{ctm}\), with \(f_{ck}=f_{cm}-8\) MPa; if \(f_{ck}\le50\): \(f_{ctm}=0.30 f_{ck}^{2/3}\), else \(f_{ctm}=2.12\ln(1+f_{cm}/10)\). |
| Max aggregate size | \(d_{\max}\) | `ASIZE` | `ASIZE ≈ d_max` (mm) from mix design. |
| Critical crack width at \(\sigma_n=0\) | \(w_c\) | `FE` | \(G_{F0}=0.021+5.357\cdot10^{-4}d_{\max}\); \(G_{F_t}=G_{F0}(f_{cm}/10)^{0.7}\) if \(f_{cm}\le50\) else \(G_{F0}\ln(1+f_{cm}/10)\); then \(w_c=2G_{F_t}/f_t\); set `FE = w_c`. |

---

## References

- Schwer, L. E. *The Winfrith Concrete Model: Beauty or Beast? Insights into the Winfrith Concrete Model.* LSTC, 2011.
- CEB-FIP. *Model Code 1990.* Thomas Telford, 1993.
- CEN. *EN 1992-1-1 Eurocode 2.* 2004.

> **Note for Jekyll (GitHub Pages):**
> 1) To render the TikZ blocks, include TikZJax in your site layout:
>    - Add to your `_layouts/default.html`:
>      ```html
>      <script src="https://cdn.jsdelivr.net/npm/tikzjax@1/tikzjax.js"></script>
>      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tikzjax@1/fonts.css">
>      ```
> 2) For citations, Jekyll Markdown does not process `\cite{}` by default. If you need citations on the website,
>    use plain text references or enable a bibliography plugin (not allowed on GitHub Pages by default).
