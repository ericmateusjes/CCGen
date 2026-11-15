# CCGen – concrete curves for the Abaqus Concrete Damaged Plasticity model

CCGen generates, from the characteristic compressive strength, the tables required by the Abaqus *Concrete Damaged Plasticity* (CDP) model:
compression hardening, compression damage, tension stiffening and tension damage. It runs entirely in the browser (plain JavaScript, no
dependencies, no build step) and can also be used from Node.js.

## Running

* **Web interface:** open `index.html` in a browser (works from `file://`), or serve the folder with any static server.
* **Documentation:** the *Documentation* tab has the full equations and procedures, with a side index. Equations are rendered as MathML (supported natively by current Chrome, Edge, Firefox and Safari; no library is loaded).
* **From Node:** load the files of `src/core` in this order: `util, properties, damage, compression, tension, checks, pipeline, exporter, tools`; then `CCGen.pipeline.run({ fck: 30 })`.

```js
require('./src/core/util.js'); /* ...the other core files in order... */
const res = CCGen.pipeline.run({ fck: 30, method: 'fib', leq: 50, compModel: 'cc', tensModel: 'cor', compDamage: 'bm', tensDamage: 'bm' });
if (res.ok) console.log(CCGen.exporter.inp(res, { name: 'C30' }));
```

## Conventions

Units N, mm, MPa; compression positive. ε^in = ε − σ/E0 (compression); ε_t = ε_t0 + w/l_eq and ε^ck = ε_t − σ/E0 (tension);
ε^pl = ε − σ/((1−d)E0). First table row = elastic limit (f_c0, 0) / (f_tm, 0); the origin is not exported. f_c0 = 0.4 f_cm, E0 = α_i E_ci (see table below),
G_ch = (f_cm/f_tm)² G_F, g_ch = G_ch/l_eq. Damage is limited to d_max = 0.99.

## Equations implemented (compact table)

| Item | Expression |
|---|---|
| fib MC2010 (2012) | f_cm = f_ck + 8; f_tm = 0.30 f_ck^(2/3) (f_ck ≤ 50), 2.12 ln(1 + 0.1 f_cm) (> 50); E_ci = 21.5·10³ α_E (f_cm/10)^(1/3); α_i = min(1, 0.8 + 0.2 f_cm/88), E0 = α_i E_ci; G_F = 0.073 f_cm^0.18 (N/mm) |
| NBR 6118 (2023) | f_cm = f_ck + 8 (adopted); f_ctm = 0.3 f_ck^(2/3) (≤ C50), 2.12 ln(1+0.11 f_ck) (> C50); E_ci = α_E 5600 √f_ck (≤ C50), 21.5·10³ α_E (f_ck/10 + 1.25)^(1/3) (> C50); E0 = α_i E_ci with α_i = min(1, 0.8 + 0.2 f_ck/80); G_F from fib |
| Eurocode 2 (EN 1992-1-1:2023) | f_cm = f_ck + 8; f_ctm = 0.3 f_ck^(2/3) (≤ C50), 1.1 f_ck^(1/3) (> C50); E_cm = k_E f_cm^(1/3) with k_E = 9500·α_E (Eq. 5.1, secant modulus; used as E_0). Not given by the code and taken from fib MC2010 (2012): E_ci, G_F, G_ch. Valid C12–C100 |
| Hognestad | ε_cm = 2f_cm/E0; ascending σ = f_cm − (f_cm − f_c0)[(ε_cm − ε)/(ε_cm − ε_c0)]² (parabola with horizontal tangent at the peak through the elastic limit, which avoids the stress dip of the classical 2x − x²); then a line to 0.85 f_cm at ε_u = 0.0038 (adjustable) |
| Saenz | σ = E0 ε / [1 + (E0/E_s − 2)(ε/ε_cm) + (ε/ε_cm)²], E_s = f_cm/ε_cm, ε_cm = 1.60 (f_cm/10)^0.25 ·10⁻³ |
| Carreira & Chu | σ/f_cm = β x/(β − 1 + x^β), β = [1 − f_cm/(E0 ε_cm)]⁻¹, ε_cm = (168 + 0.71 f_cm)·10⁻⁵ |
| Thorenfeldt | σ/f_cm = n x/(n − 1 + x^(nk)), n = 0.8 + f_cm/17, k = 1 (x ≤ 1) or 0.67 + f_cm/62 (x > 1), ε_cm = n/(n−1)·f_cm/E0 |
| NBR 6118 (2023) | σ/f_cm = (kη − η²)/(1 + (k − 2)η), η = ε/ε_c1, k = 1.05 E_cm ε_c1/f_cm, ε_c1 = 0.7 f_cm^0.31 ‰ ≤ 2.8 ‰; ends at ε_cu1 = 3.5 ‰ (f_ck ≤ 50) or 2.8 ‰ + 27 ‰·[(98 − f_cm)/100]⁴ (f_ck > 50). E_cm = E_ci (as in Eurocode 2 / fib MC2010 (2012)); σ_lim and ε_max do not apply. For C90 ε_cu1 = ε_c1 and the model is rejected |
| fib MC2010 (2012) | σ/f_cm = (kη − η²)/(1 + (k − 2)η), η = ε/ε_c1, k = E_ci/E_c1 (Eq. 5.1-26); E_c1, ε_c1 and ε_c,lim from Table 5.1-8 (C12–C120), linearly interpolated on f_ck; E_ci from the selected property method. Curve ends at ε_c,lim; for C100–C120, ε_c,lim = ε_c1 and the model is rejected |
| Eurocode 2 (EN 1992-1-1:2023) | σ/f_cm = (kη − η²)/(1 + (k − 2)η) (Eq. 5.6), k = 1.05 E_cm ε_c1/f_cm (E_cm = E_0, the secant modulus), ε_c1 = 0.7 f_cm^(1/3) ‰ ≤ 2.8 ‰ (5.9), ε_cu1 = 2.8 ‰ + 14 ‰ (1 − f_cm/108)⁴ ≤ 3.5 ‰ (5.10). For C100, ε_cu1 = ε_c1 and the model is rejected |
| GB 50010 (2010) | σ = f_cm n x/(n − 1 + xⁿ) (x ≤ 1), f_cm x/[α_c(x − 1)² + x] (x > 1), n = E_0 ε_c,r/(E_0 ε_c,r − f_cm); ε_c,r and α_c interpolated in Table C.2.4 (f_c = 20–80 MPa; end values outside, with a warning); elastic up to 0.4 f_cm (assumption); truncated by σ_lim / ε_max |
| Krätzig & Pölling (Alfarah) | σ = f_cm(E_ci ε/f_cm − (ε/ε_cm)²)/(1 + (E_ci ε_cm/f_cm − 2)ε/ε_cm) for ε ≤ ε_cm; softening with γ_c from G_ch (ε_cm fixed at ε_c1 of fib MC2010 (2012) Table 5.1-8). Procedure of Alfarah et al. (2017): ρ ("b") = mean of ε^pl/ε^in over all points after the elastic limit of a standard grid (14 + 34 points), iterated to convergence; ε_u = smallest strain (from 0.0035) at which ε^pl no longer increases at the end of the curve. A legacy mode (ε_u at 95 % of g_ch, ρ over post-peak points) is also available |
| Hillerborg | linear softening, w_c = 2G_F/f_tm |
| fib bilinear | w₁ = G_F/f_tm; σ = f_tm(1 − 0.8 w/w₁) up to w₁ (0.2 f_tm), then f_tm(0.25 − 0.05 w/w₁), zero at w_c = 5 w₁ |
| Cornelissen / Hordijk | σ/f_tm = [1 + (c₁w/w_c)³]exp(−c₂ w/w_c) − (w/w_c)(1 + c₁³)exp(−c₂), c₁ = 3, c₂ = 6.93, w_c = 5.14 G_F/f_tm |
| GB 50010 (2010) | σ = f_t x/[α_t(x − 1)^1.7 + x], x = ε/ε_t,r; ε_t,r and α_t interpolated in Table C.2.3 (f_t = 1.0–4.0 MPa); plateau at f_tm up to ε_t,r (assumption). Strain law without G_F: **not regularised by l_eq** (check V13) |
| Birtel & Mark | d = 1 − (σ/E0)/[ε^pl(1/b − 1) + σ/E0], ε^pl = b ε^in (b_c = 0.7, b_t = 0.1) |
| Yu et al. | d = 0 up to the peak; d = 1 − σ/f_m afterwards |
| Alfarah et al. | d = 1 − (1/(2+a))[2(1+a)e^(−λε^in) − a e^(−2λε^in)], a = 2r − 1 + 2√(r² − r), r = f_m/f_0, λ = f_0 l_eq(1 + a/2)/G |

Check the exact forms against the source papers before citing them.

## Checks (V1–V11)

Strength ranges (V1), ε_c0 < ε_cm < ε_u (V2), strictly increasing crushing strain (V3), damage in [0, 1) and non-decreasing (V4),
non-negative and non-decreasing plastic strain (V5, error), Krätzig–Pölling feasibility (V6), Alfarah damage with a different stress law (V7),
ε_max governing (V8), manual overrides (V9), dissipated energy (V10), stress dip after the elastic limit (V11). Errors disable table export.

## Known limits

* l_eq calculator: solid elements only. Mesh-dependent energy regularisation of the compression branch is exact only for Krätzig–Pölling; the GB 50010 (2010) tension law is not regularised either (V13).
* Krätzig–Pölling follows the Alfarah et al. procedure and was compared with a reference implementation of that procedure: with the paper's rounded coefficients (Settings) b and ε_u agree to < 0.1 %; with exact coefficients ε_u is ≈ 0.3 % smaller. If ρ has no exact solution a warning is issued; for very large l_eq the model snaps back and is rejected. *Mesh sensitivity → Find feasible window* reports the range.
* Extend beyond ε_cu1 (on by default): the NBR 6118, fib MC2010 (2012) and Eurocode 2 diagrams are continued after ε_cu1 with a C¹ branch of the form of the MC1990 descending branch (dashed in the plots), so that Abaqus does not keep the last stress constant. The branch is MC1990 Eqs 2.1-19 to 2.1-21 as written in the code (verified against the book). It is not part of the three codes; switch off for the exact code diagram.
* Curve end (compression, except Hognestad and Krätzig–Pölling): the first of σ = σ_lim·f_cm (default 0.05) and ε = ε_max (default 0.02). Both are computed and the one that governed is shown on the Curves tab.
* Default discretisation: 30 points on the ascending branch, 100 on the descending branch (graded when ε_u > 0.5), 50 in tension.
* Output units (⚙ Settings): N-mm-MPa, N-m-Pa, kN-m-kPa, kN-mm, N-cm; only the tables and the .inp block are converted, charts and inputs stay in N, mm, MPa.
* CDP parameters (ψ, ε, f_b0/f_c0, K_c, viscosity) are not computed; presets are only starting points.
* Validate the generated material in an Abaqus verification model (single element, uniaxial tension and compression).

## Licence

MIT License. See the `LICENSE` file. Copyright (c) 2026 Eric M. F. Bezerra and Jerfson M. Lima.
