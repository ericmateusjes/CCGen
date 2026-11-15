/* CCGen UI: technical documentation (content + renderer). Equations are written in TeX between $…$ (inline) and $$…$$ (display) and
 * converted to MathML by tex.js. Display equations are numbered (section.number). */
(function (G) {
  'use strict';
  const R = String.raw;

  const DOC = [
    { id: 'intro', title: 'Introduction', subs: [
      { id: 'purpose', title: 'Purpose and scope', html: R`
<p>CCGen generates the tabular data that the Abaqus <em>Concrete Damaged Plasticity</em> (CDP) model needs to describe the uniaxial behaviour of concrete: the compression hardening and compression damage tables, as functions of the crushing strain $\varepsilon_c^{ch}$ (the inelastic strain in compression), and the tension stiffening and tension damage tables, as functions of the cracking strain $\varepsilon_t^{ck}$ (or of the crack opening $w$).</p>
<p>The user supplies the characteristic compressive strength $f_{ck}$, the characteristic length $l_{eq}$ of the finite element and the choice of formulations. CCGen estimates the mechanical properties, builds the stress–strain curves, computes the damage variables and the plastic strains, checks the consistency of the result and exports the tables in the column order that Abaqus expects.</p>
<p>The program does <strong>not</strong> calibrate the remaining CDP parameters (dilation angle, eccentricity, $f_{b0}/f_{c0}$, $K_c$ and viscosity). It offers two editable preset sets for the <code>.inp</code> block, but their suitability for a given problem is the user's responsibility.</p>` },
      { id: 'workflow', title: 'Workflow', html: R`
<ol>
<li><strong>Properties</strong> – from $f_{ck}$ and the chosen method (fib MC2010 (2012), NBR 6118 or Eurocode 2): $f_{cm}$, $f_{c0}$, $f_{tm}$, $E_{ci}$, $E_0$, $G_F$ and $G_{ch}$. Any of them can be overwritten by the user.</li>
<li><strong>Compression curve</strong> $\sigma_c(\varepsilon_c)$, with a linear segment up to $f_{c0}$, followed by the selected model.</li>
<li><strong>Tension curve</strong> $\sigma_t(w)$, converted to strain through $l_{eq}$.</li>
<li><strong>Damage</strong> $d_c$ and $d_t$ by the selected methodology, limited to $d_{max}$.</li>
<li><strong>Strain conversion</strong> to the crushing strain (compression) and the cracking strain (tension).</li>
<li><strong>Checks</strong> V1–V13. Errors block the export; warnings and notes do not.</li>
<li><strong>Tables and export</strong> in the Abaqus column order, as text, as a <code>.inp</code> block or as a configuration file.</li>
</ol>` },
      { id: 'experimental', title: 'Experimental curves', html: R`
<p>The Experimental tab accepts curves measured in the laboratory (two columns pasted from a spreadsheet or loaded from a text/CSV file). The points are always plotted over the model curves in the Curves tab, so that any formulation can be compared with the data. Selecting <em>Experimental data</em> in the compression and/or tension curve lists uses the data in place of a formulation; the damage, the strain conversion, the checks and the export then work exactly as for the analytical models.</p>
<ul>
<li><strong>Compression.</strong> The first column is the total strain $\varepsilon_c$ or the crushing strain $\varepsilon_c^{ch}$ (converted with $\varepsilon_c = \varepsilon_c^{ch} + \sigma_c/E_0$). The elastic limit $(\varepsilon_{c0}, f_{c0})$ comes from the properties; points with $\varepsilon_c \le \varepsilon_{c0}$ are replaced by the linear branch, the stress is limited to $E_0\varepsilon_c$ and points for which $\varepsilon_c^{ch}$ does not increase are discarded (check V3). The peak is the maximum stress of the data and the curve ends at the last point.</li>
<li><strong>Tension.</strong> The first column is the crack opening $w$, the total strain $\varepsilon_t$ or the cracking strain $\varepsilon_t^{ck}$; the conversions of <em>Strain conversion</em> apply. The curve starts at the peak (first row with $\varepsilon_t^{ck} = 0$) and keeps the points with increasing $w$ and $\varepsilon_t^{ck}$.</li>
<li><strong>Consistency.</strong> $E_0$, $f_{c0}$, $\varepsilon_{t0}$, $G_{ch}$ and $G_F$ come from the properties (not from the data). If the experimental peak differs from $f_{cm}$ or $f_{tm}$ by more than 5 %, warning V12 recommends entering the measured values as manual properties. The damage methods of Alfarah <em>et al.</em> are derived for specific softening laws, so with experimental data the Birtel–Mark method is the usual choice.</li>
</ul>` },
      { id: 'notation', title: 'Notation and conventions', html: R`
<table class="doct">
<thead><tr><th>Symbol</th><th>Meaning</th></tr></thead>
<tbody>
<tr><td>$f_{ck}$, $f_{cm}$</td><td>characteristic and mean compressive strength, $f_{cm} = f_{ck} + 8$ MPa</td></tr>
<tr><td>$f_{c0}$</td><td>compressive stress at the elastic limit, $f_{c0} = 0.4 f_{cm}$</td></tr>
<tr><td>$f_{tm}$</td><td>mean tensile strength (also the tensile elastic limit $f_{t0}$)</td></tr>
<tr><td>$E_{ci}$, $E_0$</td><td>tangent modulus at the origin and initial elastic modulus used by the CDP model</td></tr>
<tr><td>$G_F$, $G_{ch}$</td><td>fracture energy in tension and crushing energy in compression (N/mm)</td></tr>
<tr><td>$l_{eq}$</td><td>characteristic length of the finite element (mm)</td></tr>
<tr><td>$\varepsilon_{c0}$, $\varepsilon_{t0}$</td><td>strains at the elastic limit, $\varepsilon_{c0} = f_{c0}/E_0$ and $\varepsilon_{t0} = f_{tm}/E_0$</td></tr>
<tr><td>$\varepsilon_{cm}$, $\varepsilon_u$</td><td>strain at the compressive peak and ultimate strain of the compression curve</td></tr>
<tr><td>$\varepsilon_c^{ch}$, $\varepsilon_c^{pl}$</td><td>crushing (inelastic) strain and plastic strain in compression</td></tr>
<tr><td>$\varepsilon_t^{ck}$, $\varepsilon_t^{pl}$</td><td>cracking and plastic strain in tension</td></tr>
<tr><td>$d_c$, $d_t$</td><td>damage variables in compression and tension</td></tr>
</tbody></table>
<ul>
<li>Units: N, mm and MPa. Compressive stresses and strains are positive. The output can be converted to other consistent unit systems; the calculation is always done in N–mm–MPa.</li>
<li>The first row of every table is the elastic limit; the origin $(0, 0)$ is omitted. The damage tables use the same strains as the stress tables.</li>
<li>$E_0$ is the initial elastic modulus used in every strain conversion, according to the selected property method.</li>
</ul>` }
    ] },

    { id: 'props', title: 'Mechanical properties', subs: [
      { id: 'props-common', title: 'Relations common to all methods', html: R`
<p>The following quantities do not depend on the selected property method:</p>
$$ f_{cm} = f_{ck} + 8, \qquad f_{c0} = 0.4\,f_{cm}, \qquad f_{t0} = f_{tm} $$
$$ \varepsilon_{c0} = \frac{f_{c0}}{E_0}, \qquad \varepsilon_{t0} = \frac{f_{tm}}{E_0} $$
$$ G_{ch} = \left(\frac{f_{cm}}{f_{tm}}\right)^2 G_F $$
<p>The expression of $G_{ch}$ is the one adopted by Alfarah <em>et al.</em> (2017) after fib Bulletin 42. The NBR 6118 gives no expression for $f_{cm}$; $f_{ck} + 8$ MPa, the expression of the fib MC2010 (2012) and of the Eurocode 2, is adopted for all methods.</p>` },
      { id: 'props-methods', title: 'Property methods', html: R`
<p>Three methods are available; the fib MC2010 (2012) is the default. Properties that the selected code does not provide are taken from the fib MC2010 (2012), and the origin of each value (method or manual) is shown in the properties table.</p>
<table class="doct">
<thead><tr><th>Property</th><th>fib MC2010 (2012)</th><th>NBR 6118 (2023)</th><th>Eurocode 2 (2023)</th></tr></thead>
<tbody>
<tr><td>$f_{tm}$ (MPa)</td>
<td>$0.30 f_{ck}^{2/3}$ ($f_{ck} \le 50$)<br>$2.12\ln(1 + 0.1 f_{cm})$ ($f_{ck} > 50$)</td>
<td>$0.30 f_{ck}^{2/3}$ ($f_{ck} \le 50$)<br>$2.12\ln(1 + 0.11 f_{ck})$ ($f_{ck} > 50$)</td>
<td>$0.30 f_{ck}^{2/3}$ ($f_{ck} \le 50$)<br>$1.1 f_{ck}^{1/3}$ ($f_{ck} > 50$)</td>
</tr>
<tr><td>$E_{ci}$ (MPa)</td>
<td>$21500\,\alpha_E (f_{cm}/10)^{1/3}$</td>
<td>$5600\,\alpha_E \sqrt{f_{ck}}$ ($f_{ck} \le 50$)<br>$21500\,\alpha_E (f_{ck}/10 + 1.25)^{1/3}$ ($f_{ck} > 50$)</td>
<td>fib MC2010 (2012)</td>
</tr>
<tr><td>$E_0$ (MPa)</td>
<td>$\min\left(1,\ 0.8 + 0.2 f_{cm}/88\right) E_{ci}$</td>
<td>$\min\left(1,\ 0.8 + 0.2 f_{ck}/80\right) E_{ci}$</td>
<td>$E_{cm} = 9500\,\alpha_E f_{cm}^{1/3}$</td>
</tr>
<tr><td>$G_F$ (N/mm)</td>
<td>$0.073 f_{cm}^{0.18}$</td><td>fib MC2010 (2012)</td><td>fib MC2010 (2012)</td></tr>
</tbody></table>
<p>In the Eurocode 2 method, $E_0$ is the secant modulus $E_{cm}$ of the code (Eq. 5.1, between 0 and $0.4 f_{cm}$). The constant 9500 is $k_E$ of the code, scaled here by $\alpha_E$ for the aggregate; this scaling is an assumption of the program. In the NBR 6118 and fib methods, $E_0$ is the initial modulus $E_{ci}$ reduced by a factor $\le 1$ that represents the secant modulus.</p>` },
      { id: 'props-agg', title: 'Aggregate factor', html: R`
<p>The factor $\alpha_E$ accounts for the type of aggregate in the three methods.</p>
<table class="doct narrow">
<thead><tr><th>Aggregate</th><th>$\alpha_E$</th></tr></thead>
<tbody><tr><td>Basalt, diabase</td><td>1.2</td></tr><tr><td>Granite, gneiss</td><td>1.0</td></tr><tr><td>Limestone</td><td>0.9</td></tr><tr><td>Sandstone</td><td>0.7</td></tr></tbody></table>` },
      { id: 'props-manual', title: 'Validity ranges and manual values', html: R`
<p>The program warns (check V1) when $f_{ck}$ is outside the range of the selected code: C20–C90 for the NBR 6118, C12–C100 for the Eurocode 2 and C12–C120 for the fib MC2010 (2012). The NBR 6118 gives $f_{tm}$ and $E_{ci}$ separately for classes up to C50 and from C55; for $50 < f_{ck} < 55$ the branch of the higher classes is used, with a warning.</p>
<p>Each property can be replaced by a user value by clearing its <em>Auto</em> box. Values from different sources may be mutually inconsistent, so the program issues a warning (V9) whenever a value is user-defined.</p>` }
    ] },

    { id: 'comp', title: 'Compression constitutive models', subs: [
      { id: 'comp-build', title: 'Construction of the curve', html: R`
<p>Every compression curve has the same structure. The response is linear, with slope $E_0$, up to the elastic limit $(\varepsilon_{c0}, f_{c0})$. From there on, the selected model gives the stress $\sigma_c(\varepsilon_c)$ up to the ultimate strain $\varepsilon_u$. With $x = \varepsilon_c/\varepsilon_{cm}$ as the normalised strain, the models are those listed below.</p>
<p>The output grid has, by default, 14 intervals between $\varepsilon_{c0}$ and $\varepsilon_{cm}$ and 34 between $\varepsilon_{cm}$ and $\varepsilon_u$. When $\varepsilon_u$ is very large the descending branch is graded, to keep the region close to the peak resolved. Two numerical guards guarantee a valid table:</p>
<ul>
<li><strong>G1</strong> – the stress is limited to $E_0\,\varepsilon_c$, so that $\varepsilon_c^{ch} \ge 0$;</li>
<li><strong>G2</strong> – points that do not increase $\varepsilon_c^{ch}$ are discarded, so that the crushing strain is strictly increasing.</li>
</ul>` },
      { id: 'comp-hog', title: 'Hognestad (1951)', html: R`
<p>Parabolic ascending branch and linear descending branch. The strain at the peak is $\varepsilon_{cm} = 2 f_{cm}/E_0$ and the ultimate strain is $\varepsilon_u = 0.0038$ (both editable in the advanced settings):</p>
$$ \sigma_c = \begin{cases} f_{cm} - (f_{cm} - f_{c0})\left[\dfrac{\varepsilon_{cm} - \varepsilon_c}{\varepsilon_{cm} - \varepsilon_{c0}}\right]^2 & \varepsilon_c \le \varepsilon_{cm} \\ f_{cm}\left[1 - 0.15\,\dfrac{\varepsilon_c - \varepsilon_{cm}}{\varepsilon_u - \varepsilon_{cm}}\right] & \varepsilon_c > \varepsilon_{cm} \end{cases} $$
<p><strong>Adaptation.</strong> The original ascending branch, $f_{cm}(2x - x^2)$, lies below the straight line $E_0\varepsilon_c$ at the elastic limit when $\varepsilon_{cm} = 2 f_{cm}/E_0$: for $\varepsilon_{c0} = 0.2\,\varepsilon_{cm}$ it gives $0.36 f_{cm}$, less than $f_{c0} = 0.4 f_{cm}$, and the stress would fall right after the elastic limit. The parabola above has a horizontal tangent at the peak and passes through $(\varepsilon_{c0}, f_{c0})$, so it joins the elastic segment without a drop. The descending branch is the original one.</p>` },
      { id: 'comp-saenz', title: 'Saenz (1964)', html: R`
<p>With $\varepsilon_{cm} = 1.60\,(f_{cm}/10)^{0.25}\times 10^{-3}$ and the initial slope $E_0$:</p>
$$ \sigma_c = \frac{E_0\,\varepsilon_c}{1 + \left(\dfrac{E_0\,\varepsilon_{cm}}{f_{cm}} - 2\right)\dfrac{\varepsilon_c}{\varepsilon_{cm}} + \left(\dfrac{\varepsilon_c}{\varepsilon_{cm}}\right)^2} $$
<p>The curve has no finite ultimate strain and is truncated as described in <em>Truncation of open curves</em>.</p>` },
      { id: 'comp-cc', title: 'Carreira and Chu (1985)', html: R`
<p>With $\varepsilon_{cm} = (168 + 0.71 f_{cm})\times 10^{-5}$:</p>
$$ \beta = \frac{1}{1 - \dfrac{f_{cm}}{E_0\,\varepsilon_{cm}}}, \qquad \sigma_c = f_{cm}\,\frac{\beta\,x}{\beta - 1 + x^{\beta}} $$
<p>The model requires $E_0\,\varepsilon_{cm} > f_{cm}$ (that is, $\beta > 1$); otherwise the program reports an error. The curve is truncated as described below.</p>` },
      { id: 'comp-tho', title: 'Thorenfeldt <em>et al.</em> (1987)', html: R`
<p>With $x = \varepsilon_c/\varepsilon_{cm}$, $n = 0.8 + f_{cm}/17$ and $\varepsilon_{cm} = \dfrac{n}{n - 1}\dfrac{f_{cm}}{E_0}$:</p>
$$ \sigma_c = f_{cm}\,\frac{n\,x}{n - 1 + x^{n k}}, \qquad k = \begin{cases} 1 & \varepsilon_c \le \varepsilon_{cm} \\ 0.67 + \dfrac{f_{cm}}{62} & \varepsilon_c > \varepsilon_{cm} \end{cases} $$
<p>The curve is truncated as described below.</p>` },
      { id: 'comp-trunc', title: 'Truncation of open curves', html: R`
<p>The formulations of Saenz, Carreira and Chu and Thorenfeldt <em>et al.</em> do not define a finite ultimate strain. The descending branch is cut at the first of two limits: the stress $\sigma_{lim} f_{cm}$ (default $\sigma_{lim} = 0.05$) or the strain $\varepsilon_{max}$ (default 0.02). Both are evaluated, and the Curves tab states which one ended the curve. These values are an operational choice of the program, not a recommendation of the authors of the formulations, and can be changed in the advanced settings. A value of $\sigma_{lim} = 0$ disables the stress limit.</p>` },
      { id: 'comp-sargin', title: 'NBR 6118, fib MC2010 (2012) and Eurocode 2 diagrams', html: R`
<p>The three code diagrams share the same equation (a Sargin-type curve), with $\eta = \varepsilon_c/\varepsilon_{c1}$:</p>
$$ \sigma_c = f_{cm}\,\frac{k\,\eta - \eta^2}{1 + (k - 2)\,\eta} $$
<p>They differ in the definition of $k$, of the strain at the peak $\varepsilon_{c1}$ ($=\varepsilon_{cm}$) and of the ultimate strain, which is defined by the code, so $\sigma_{lim}$ and $\varepsilon_{max}$ do not apply:</p>
<table class="doct">
<thead><tr><th></th><th>NBR 6118 (2023)</th><th>fib MC2010 (2012, Eq. 5.1-26)</th><th>Eurocode 2 (2023, Eq. 5.6–5.10)</th></tr></thead>
<tbody>
<tr><td>$k$</td><td>$1.05\,E_{ci}\,\varepsilon_{c1}/f_{cm}$</td><td>$E_{ci}/E_{c1}$</td><td>$1.05\,E_{cm}\,\varepsilon_{c1}/f_{cm}$, with $E_{cm} = E_0$</td></tr>
<tr><td>$\varepsilon_{c1}$ (‰)</td><td>$\min\left(0.7 f_{cm}^{0.31},\ 2.8\right)$</td><td>Table 5.1-8, interpolated in $f_{ck}$</td><td>$\min\left(0.7 f_{cm}^{1/3},\ 2.8\right)$</td></tr>
<tr><td>$\varepsilon_{cu1}$ (‰)</td><td>3.5 ($f_{ck} \le 50$)<br>$2.8 + 27\left[(98 - f_{cm})/100\right]^4$ ($f_{ck} > 50$)</td><td>$\varepsilon_{c,lim}$ of Table 5.1-8</td><td>$\min\left(2.8 + 14\left(1 - f_{cm}/108\right)^4,\ 3.5\right)$</td></tr>
</tbody></table>
<p>The fib MC2010 (2012) gives $E_{c1}$ (the secant modulus at the peak), $\varepsilon_{c1}$ and $\varepsilon_{c,lim}$ by strength class (Table 5.1-8). CCGen interpolates linearly between classes and reports an error outside C12–C120:</p>
<div class="scrollx"><table class="doct small">
<thead><tr><th>$f_{ck}$ (MPa)</th><th>12</th><th>16</th><th>20</th><th>25</th><th>30</th><th>35</th><th>40</th><th>45</th><th>50</th><th>55</th><th>60</th><th>70</th><th>80</th><th>90</th><th>100</th><th>110</th><th>120</th></tr></thead>
<tbody>
<tr><td>$E_{c1}$ (GPa)</td><td>11.1</td><td>12.2</td><td>13.3</td><td>14.9</td><td>16.5</td><td>18.2</td><td>20.0</td><td>21.6</td><td>23.2</td><td>24.7</td><td>26.2</td><td>28.9</td><td>31.4</td><td>33.8</td><td>36.0</td><td>39.3</td><td>42.7</td></tr>
<tr><td>$\varepsilon_{c1}$ (‰)</td><td>1.9</td><td>2.0</td><td>2.1</td><td>2.2</td><td>2.3</td><td>2.3</td><td>2.4</td><td>2.5</td><td>2.6</td><td>2.6</td><td>2.7</td><td>2.7</td><td>2.8</td><td>2.9</td><td>3.0</td><td>3.0</td><td>3.0</td></tr>
<tr><td>$\varepsilon_{c,lim}$ (‰)</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.5</td><td>3.4</td><td>3.4</td><td>3.3</td><td>3.2</td><td>3.1</td><td>3.0</td><td>3.0</td><td>3.0</td><td>3.0</td></tr>
</tbody></table></div>
<p>If $\varepsilon_{cu1} \le \varepsilon_{c1}$ the diagram has no descending branch, and the program reports an error; this happens for C90 in the NBR 6118, for C100 in the Eurocode 2 and from C100 on in the fib MC2010 (2012). The Eurocode 2 diagram is defined for $f_{cm} \le 108$ MPa.</p>` },
      { id: 'comp-kra', title: 'Krätzig and Pölling (2004)', html: R`
<p>The formulation has three parts. The first is linear up to $f_{c0}$. The second is a non-linear ascending branch up to the peak at $\varepsilon_{cm}$. In CCGen, $\varepsilon_{cm}$ is fixed at the strain $\varepsilon_{c1}$ at the peak stress of the fib MC2010 (2012, Table 5.1-8, interpolated on $f_{ck}$), whichever property method is selected, so it varies with $f_{ck}$ (for example, 2.3‰ for C30 and 2.5‰ for C45):</p>
$$ \sigma_c = f_{cm}\,\frac{\dfrac{E_{ci}\,\varepsilon_c}{f_{cm}} - \left(\dfrac{\varepsilon_c}{\varepsilon_{cm}}\right)^2}{1 + \left(\dfrac{E_{ci}\,\varepsilon_{cm}}{f_{cm}} - 2\right)\dfrac{\varepsilon_c}{\varepsilon_{cm}}}, \qquad \varepsilon_c \le \varepsilon_{cm} $$
<p>The third is a softening branch whose parameter $\gamma_c$ depends on the crushing energy per unit volume, $g_{ch} = G_{ch}/l_{eq}$:</p>
$$ \sigma_c = \left[\frac{2 + \gamma_c f_{cm}\varepsilon_{cm}}{2 f_{cm}} - \gamma_c\,\varepsilon_c + \frac{\gamma_c\,\varepsilon_c^2}{2\,\varepsilon_{cm}}\right]^{-1}, \qquad \varepsilon_c > \varepsilon_{cm} $$
$$ \gamma_c = \frac{\pi^2 f_{cm}\,\varepsilon_{cm}}{2\left[g_{ch} - 0.5\,f_{cm}\left(\varepsilon_{cm}(1 - \rho) + \rho\,\dfrac{f_{cm}}{E_0}\right)\right]^2}, \qquad \rho = \frac{\varepsilon_c^{pl}}{\varepsilon_c^{ch}} $$
<p>The parameter $\rho$ affects the stress, which affects $\varepsilon_c^{ch}$, $d_c$ and $\varepsilon_c^{pl}$, from which $\rho$ is calculated. CCGen follows the procedure of Alfarah <em>et al.</em> (2017):</p>
<ol>
<li>a reference grid with 14 intervals up to the peak and 34 after it is built, and $\rho$ is the arithmetic mean of $\varepsilon_c^{pl}/\varepsilon_c^{ch}$ over all grid points after the elastic limit;</li>
<li>starting from $\rho = 0.9$, $\gamma_c$, the curve, the damage of Alfarah <em>et al.</em> and the strains are computed, giving a new $\rho$; the process is repeated with relaxation factor 0.5 until the difference is smaller than $10^{-4}$;</li>
<li>if the iteration does not converge, $\rho$ is scanned and a root is searched by bisection; if there is no root, the best compromise is adopted and a warning is issued;</li>
<li>$\varepsilon_u$ is the smallest strain, starting from 0.0035, at which the increment of $\varepsilon_c^{pl}$ between the last two grid points is no longer positive: the curve ends when the plastic strain stops growing;</li>
<li>the output grid is then built with these values of $\rho$ and $\varepsilon_u$.</li>
</ol>
<p>If the denominator of $\gamma_c$ is not positive, or if $\rho$ falls outside $(0, 1]$, the program reports that $l_{eq}$ is too large for $G_{ch}$. This criterion does not impose the energy: the area under the curve is close to, but not equal to, $g_{ch}$ (see <em>Energy regularization</em>).</p>` },
      { id: 'comp-ext', title: 'Extension beyond ε<sub>cu1</sub>', html: R`
<p>The diagrams of NBR 6118, fib MC2010 (2012) and Eurocode 2 are defined only up to $\varepsilon_{cu1}$ (or $\varepsilon_{c,lim}$). In Abaqus, beyond the last point of the table the stress is held constant at its last value, which leaves a residual stress (for C30, 62 % to 74 % of $f_{cm}$ in the three diagrams) and a compression damage of only 0.45 to 0.51, instead of the large values expected in crushing. For this reason the option <em>Extend beyond $\varepsilon_{cu1}$</em> (on by default) continues the curve with the descending branch of CEB-FIP Model Code 1990 (MC1990); the continuation is drawn as a dashed line in the plots.</p>
<p>The MC1990 branch of Eq. (2.1-18) has the same form as the Sargin curve above, $\sigma/f_{cm} = g(\eta) = (k\eta - \eta^2)/[1 + (k-2)\eta]$. Beyond the strain at which the stress falls to $0.5 f_{cm}$ (Eq. 2.1-19), MC1990 changes to a branch of the form $\sigma_c/f_{cm} = 1/(A\eta^2 + B\eta)$, $\eta = \varepsilon_c/\varepsilon_{c1}$ (Eq. 2.1-20), with the constants of Eq. 2.1-21:</p>
$$ \sigma_c = f_{cm}\left[\left(\frac{\xi}{x_{lim}} - \frac{2}{x_{lim}^2}\right)\eta^2 + \left(\frac{4}{x_{lim}} - \xi\right)\eta\right]^{-1}, \quad \xi = \frac{4\left[x_{lim}^2\,(k-2) + 2x_{lim} - k\right]}{\left[x_{lim}(k-2) + 1\right]^2} $$
<p>with $k = E_{ci}/E_{c1}$ and $x_{lim} = \varepsilon_{c,lim}/\varepsilon_{c1} = \frac12\left(\frac12 k + 1\right) + \sqrt{\frac14\left(\frac12 k + 1\right)^2 - \frac12}$ (Eqs. 2.1-19 and 2.1-21 of the MC1990). These are the equations of the code, implemented as written; $\varepsilon_{c,lim}$ of the MC1990 is the strain at which $\sigma = 0.5 f_{cm}$, and it is not the $\varepsilon_{c,lim}$ of the fib MC2010 (2012) table (the notation here follows the MC1990). The curve is therefore identical to the code diagram up to $\varepsilon_{cu1}$ and decreasing beyond it. If $\varepsilon_{cu1}$ were larger than $x_{lim}\varepsilon_{c1}$ (this does not happen for the classes of the three codes up to C80), no continuation is made and a warning is issued. The continuation is not a part of NBR 6118, fib MC2010 (2012) or Eurocode 2: it applies the MC1990 branch to their diagrams. Users who need exactly the code diagram should switch the option off.</p>
<p>The extended curve ends at the criteria of <em>Truncation of open curves</em> ($\sigma = \sigma_{lim} f_{cm}$ or $\varepsilon_{max}$). If the continuation is not possible for a class (no valid matching point), the curve ends at $\varepsilon_{cu1}$ and a warning (V2) is issued. With the option off, the curve ends at $\varepsilon_{cu1}$. The option applies only to NBR 6118, fib MC2010 (2012) and Eurocode 2.</p>` },
      { id: 'comp-gb', title: 'GB 50010 (2010)', html: R`
<p>Annex C.2 of the Chinese code GB 50010 (2010) gives the uniaxial curve of concrete as a function of a representative strength $f_{c,r}$, the strain at the peak $\varepsilon_{c,r}$ and two shape parameters. With $x = \varepsilon_c/\varepsilon_{c,r}$:</p>
$$ \sigma_c = f_{c,r}\,\frac{n\,x}{n - 1 + x^{n}} \;\; (x \le 1), \qquad \sigma_c = f_{c,r}\,\frac{x}{\alpha_c\,(x - 1)^2 + x} \;\; (x > 1), \qquad n = \frac{E_c\,\varepsilon_{c,r}}{E_c\,\varepsilon_{c,r} - f_{c,r}} $$
<p>$\varepsilon_{c,r}$ and $\alpha_c$ are given in Table C.2.4 for $f_{c,r} = 20$ to 80 MPa in steps of 5 MPa; the code provides them as a table and not as formulas.</p>
<p><strong>Adaptation in CCGen.</strong> $f_{c,r} = f_{cm}$ (the mean strength of the selected property method) and $E_c = E_0$. $\varepsilon_{c,r}$ and $\alpha_c$ are interpolated linearly in the table as a function of $f_{cm}$; outside 20–80 MPa the end values are used and a warning (V2) is issued. As in the other models, the response is linear elastic up to $f_{c0} = 0.4 f_{cm}$ with slope $E_0$ (an assumption of CCGen: the code expression does not define an elastic limit), and the curve is truncated as described in <em>Truncation of open curves</em>, since the expression has no finite ultimate strain. The curve is not regularised by $l_{eq}$.</p>` },
    ] },

    { id: 'tens', title: 'Tension constitutive models', subs: [
      { id: 'tens-conv', title: 'From crack opening to strain', html: R`
<p>The first three tension laws (the fourth, GB 50010 (2010), is defined directly in strain) are defined as functions of the crack opening $w$ and are converted to strain with the characteristic length:</p>
$$ \varepsilon_t = \varepsilon_{t0} + \frac{w}{l_{eq}}, \qquad \varepsilon_t^{ck} = \varepsilon_t - \frac{\sigma_t}{E_0} $$
<p>This is what makes the tension response depend on the mesh: for a given $w$, the strain is smaller for a larger element. The first point of the table is $w = 0$, $\sigma_t = f_{tm}$ and $\varepsilon_t^{ck} = 0$. The default number of intervals is 50.</p>` },
      { id: 'tens-lin', title: 'Hillerborg <em>et al.</em> (1976), linear', html: R`
$$ w_c = \frac{2\,G_F}{f_{tm}}, \qquad \sigma_t = f_{tm}\left(1 - \frac{w}{w_c}\right) $$` },
      { id: 'tens-fib', title: 'fib MC2010 (2012), bilinear', html: R`
<p>With $w_1 = G_F/f_{tm}$ and $w_c = 5 w_1$:</p>
$$ \sigma_t = \begin{cases} f_{tm}\left(1 - 0.8\,\dfrac{w}{w_1}\right) & w \le w_1 \\ f_{tm}\left(0.25 - 0.05\,\dfrac{w}{w_1}\right) & w_1 < w \le w_c \end{cases} $$` },
      { id: 'tens-cor', title: 'Cornelissen <em>et al.</em> (1986), exponential', html: R`
<p>With $c_1 = 3$, $c_2 = 6.93$ and $w_c = 5.14\,G_F/f_{tm}$:</p>
$$ \frac{\sigma_t}{f_{tm}} = \left[1 + \left(c_1\frac{w}{w_c}\right)^3\right]\exp\left(-c_2\frac{w}{w_c}\right) - \frac{w}{w_c}\left(1 + c_1^3\right)\exp(-c_2) $$`},
      { id: 'tens-gb', title: 'GB 50010 (2010)', html: R`
<p>The tension curve of Annex C.2 is a law written directly in strain, with the representative strength $f_{t,r}$ (here $f_{tm}$), the strain at the peak $\varepsilon_{t,r}$ and the parameter $\alpha_t$. For $x = \varepsilon_t/\varepsilon_{t,r} > 1$:</p>
$$ \sigma_t = f_{t,r}\,\frac{x}{\alpha_t\,(x - 1)^{1.7} + x} $$
<p>$\varepsilon_{t,r}$ and $\alpha_t$ are tabulated in Table C.2.3 for $f_{t,r} = 1.0$ to $4.0$ MPa in steps of 0.5 MPa; CCGen interpolates linearly in $f_{tm}$ and, outside the range, uses the end values and issues a warning (V1). <strong>Assumptions of CCGen:</strong> the response is linear elastic up to $f_{tm}$, and between $\varepsilon_{t0}$ and $\varepsilon_{t,r}$ the stress is kept at $f_{tm}$ (a plateau; the ascending branch of the code is not used). The descending branch continues up to $\sigma = \sigma_{lim} f_{tm}$. The crack opening reported is $w = (\varepsilon_t - \varepsilon_{t0})\,l_{eq}$, which is only a conversion.</p>
<p><strong>Limitation (check V13).</strong> The law does not use the fracture energy $G_F$: the energy per unit volume is fixed by the curve, so the energy dissipated per unit area of crack grows with $l_{eq}$ and the model is not regularised by the mesh. CCGen issues the warning V13 whenever this law is selected. It is suitable for a single mesh calibrated against tests, not for mesh-sensitivity studies.</p>` }
    ] },

    { id: 'damage', title: 'Damage models', subs: [
      { id: 'dmg-plastic', title: 'Plastic strain', html: R`
<p>Whatever the methodology, the plastic strains follow from the stress, the damage and the initial modulus:</p>
$$ \varepsilon_c^{pl} = \varepsilon_c - \frac{\sigma_c}{(1 - d_c)\,E_0}, \qquad \varepsilon_t^{pl} = \varepsilon_t - \frac{\sigma_t}{(1 - d_t)\,E_0} $$
<p>They must be non-negative and non-decreasing (check V5). The damage variables are also limited to $d_{max}$ (default 0.99), because $d = 1$ makes the stiffness vanish and the plastic strain undefined.</p>` },
      { id: 'dmg-bm', title: 'Birtel and Mark (2006)', html: R`
<p>The plastic strain is a fixed fraction $b$ of the inelastic (or cracking) strain: $b_c = 0.7$ in compression and $b_t = 0.1$ in tension (editable). The damage follows from the stress:</p>
$$ \varepsilon^{pl} = b\,\varepsilon^{in}, \qquad d = 1 - \frac{\sigma/E_0}{\varepsilon^{pl}\left(\dfrac{1}{b} - 1\right) + \sigma/E_0} $$
<p>Here $\varepsilon^{in}$ is the inelastic strain: $\varepsilon_c^{ch}$ in compression and $\varepsilon_t^{ck}$ in tension. The method works with any stress curve.</p>` },
      { id: 'dmg-yu', title: 'Yu <em>et al.</em> (2010)', html: R`
<p>Damage is the relative loss of stress with respect to the peak. In compression it is zero up to the peak strain and, after it,</p>
$$ d_c = 1 - \frac{\sigma_c}{f_{cm}} \quad (\varepsilon_c > \varepsilon_{cm}), \qquad d_t = 1 - \frac{\sigma_t}{f_{tm}} $$
<p>The implementation is the uniaxial form of the damage of that work. The method works with any stress curve.</p>` },
      { id: 'dmg-alf', title: 'Alfarah <em>et al.</em> (2017)', html: R`
<p>The damage is an explicit function of the inelastic strain (in tension, the cracking strain):</p>
$$ d = 1 - \frac{2\,(1 + a)\,e^{-\lambda\,\varepsilon^{in}} - a\,e^{-2\lambda\,\varepsilon^{in}}}{2 + a} $$
$$ a = 2r - 1 + 2\sqrt{r^2 - r}, \qquad r = \frac{f_m}{f_0}, \qquad \lambda = \frac{f_0\,l_{eq}}{G}\left(1 + \frac{a}{2}\right) $$
<p>In compression, $f_m = f_{cm}$, $f_0 = f_{c0}$ (so $r = 2.5$) and $G = G_{ch}$. In tension, $f_m = f_0 = f_{tm}$ (so $r = 1$ and $a = 1$) and $G = G_F$. The coefficients of the original paper, which are rounded, can be selected in the advanced settings.</p>
<p>These variables were derived for the Krätzig–Pölling law in compression and for the exponential law in tension. With other curves, the pair $(\sigma, d)$ may be incoherent, and the program warns (V7) or blocks the export (V5).</p>` },
      { id: 'dmg-compat', title: 'Compatibility', html: R`
<table class="doct">
<thead><tr><th>Methodology</th><th>Compression curves</th><th>Tension curves</th></tr></thead>
<tbody>
<tr><td>Birtel and Mark</td><td>all</td><td>all</td></tr>
<tr><td>Yu <em>et al.</em></td><td>all</td><td>all</td></tr>
<tr><td>Alfarah <em>et al.</em></td><td>Krätzig and Pölling (otherwise warning V7)</td><td>Cornelissen <em>et al.</em> (otherwise warning V7)</td></tr>
</tbody></table>` }
    ] },

    { id: 'conv', title: 'Strain conversion and Abaqus input', subs: [
      { id: 'conv-strain', title: 'Strain conversion', html: R`
<p>Abaqus does not accept total strains for the CDP model. In compression, the data are the stress and the <em>inelastic</em> (crushing) strain; in tension, the stress and the <em>cracking</em> strain. Figure 1 shows the strain components on a generic uniaxial curve: the total strain is the sum of the plastic strain and the elastic strain of the damaged material, whereas the inelastic strain is measured from the elastic strain of the <em>undamaged</em> material.</p>
<figure class="docfig"><div class="pair"><img src="assets/diagram-compression.svg" alt="Generic compression stress–strain diagram with the strains ε_c^pl, ε_c^el, ε_c^ch and ε_c0^el"><img src="assets/diagram-tension.svg" alt="Generic tension stress–strain diagram with the strains ε_t^pl, ε_t^el, ε_t^ck and ε_t0^el"></div>
<figcaption><strong>Figure 1.</strong> Generic stress–strain diagrams in compression (left) and tension (right), with the strain components used by Abaqus. At a point of the softening branch, the unloading slope is $(1-d)E_0$ and $\varepsilon^{el}_0 = \sigma/E_0$ is the elastic strain of the undamaged material.</figcaption></figure>
<p><strong>Inelastic strain (the data entered in Abaqus).</strong> In compression, $\varepsilon_c^{ch}$ is the total strain minus the elastic strain of the undamaged material, calculated with the initial modulus $E_0$:</p>
$$ \varepsilon_{c0}^{el} = \frac{\sigma_c}{E_0}, \qquad \varepsilon_c^{ch} = \varepsilon_c - \varepsilon_{c0}^{el} = \varepsilon_c - \frac{\sigma_c}{E_0} $$
<p>In tension, the same operation gives the cracking strain, and the crack opening is related to the total strain through $l_{eq}$ and the strain at the tensile strength, $\varepsilon_{t0} = f_{tm}/E_0$:</p>
$$ \varepsilon_t^{ck} = \varepsilon_t - \varepsilon_{t0}^{el} = \varepsilon_t - \frac{\sigma_t}{E_0}, \qquad \varepsilon_t = \varepsilon_{t0} + \frac{w}{l_{eq}} $$
<p><strong>Plastic strain (calculated by Abaqus).</strong> The plastic strain is the strain that remains after unloading with the degraded stiffness $(1-d)E_0$, so it depends on the damage variable:</p>
$$ \varepsilon_c^{el} = \frac{\sigma_c}{(1-d_c)E_0}, \qquad \varepsilon_c^{pl} = \varepsilon_c - \varepsilon_c^{el} = \varepsilon_c - \frac{\sigma_c}{(1-d_c)E_0} $$
$$ \varepsilon_t^{el} = \frac{\sigma_t}{(1-d_t)E_0}, \qquad \varepsilon_t^{pl} = \varepsilon_t - \frac{\sigma_t}{(1-d_t)E_0} $$
<p>Eliminating the total strain between the two definitions gives the relation between the inelastic and the plastic strain, which is the one Abaqus uses internally (and the one CCGen uses in the checks and in the unloading line of the Curves tab):</p>
$$ \varepsilon_c^{pl} = \varepsilon_c^{ch} - \frac{d_c}{1-d_c}\,\frac{\sigma_c}{E_0}, \qquad \varepsilon_t^{pl} = \varepsilon_t^{ck} - \frac{d_t}{1-d_t}\,\frac{\sigma_t}{E_0} $$
<p>With $d = 0$ the plastic and the inelastic strains coincide; as $d$ grows, $\varepsilon^{pl} < \varepsilon^{ch}$. The Curves and Compare tabs plot the stress against the <em>total</em> strain, whereas the damage is plotted against the inelastic strain, which is the abscissa of the tables.</p>` },
      { id: 'conv-tables', title: 'Tables', html: R`
<p>Four tables are generated, in the column order required by Abaqus:</p>
<table class="doct">
<thead><tr><th>Table</th><th>Columns</th><th>Abaqus keyword</th></tr></thead>
<tbody>
<tr><td>Compression hardening</td><td>$\sigma_c$, $\varepsilon_c^{ch}$</td><td><code>*CONCRETE COMPRESSION HARDENING</code></td></tr>
<tr><td>Compression damage</td><td>$d_c$, $\varepsilon_c^{ch}$</td><td><code>*CONCRETE COMPRESSION DAMAGE</code></td></tr>
<tr><td>Tension stiffening</td><td>$\sigma_t$, $\varepsilon_t^{ck}$ (or $w$)</td><td><code>*CONCRETE TENSION STIFFENING</code></td></tr>
<tr><td>Tension damage</td><td>$d_t$, $\varepsilon_t^{ck}$ (or $w$)</td><td><code>*CONCRETE TENSION DAMAGE</code></td></tr>
</tbody></table>
<p>The first compression row is the elastic limit, with $\varepsilon_c^{ch} = 0$. The origin is omitted. The output units and the choice between cracking strain and crack opening for the tension tables are set at the top of the Tables tab. The Curves tab, in contrast, plots the complete curves against the total strain, starting at the origin. The buttons <em>Copy as text</em> and <em>Copy for Abaqus</em> (tab-separated, with optional decimal comma) put the table on the clipboard, and each column can also be copied separately.</p>` },
      { id: 'conv-inp', title: 'The .inp block', html: R`
<p>The Abaqus export tab writes a <code>*MATERIAL</code> block with <code>*ELASTIC</code> (using $E_0$ and the Poisson ratio), <code>*CONCRETE DAMAGED PLASTICITY</code> (dilation angle, eccentricity, $f_{b0}/f_{c0}$, $K_c$ and viscosity) and the four tables. The tension tables are written as functions of the cracking strain (no <code>TYPE</code> parameter, which is the Abaqus default) or, in the crack-opening option, with <code>*CONCRETE TENSION STIFFENING, TYPE=DISPLACEMENT</code> and <code>*CONCRETE TENSION DAMAGE, TYPE=DISPLACEMENT</code>. In the Abaqus manual the square brackets of <code>[, TYPE=DISPLACEMENT]</code> mark an optional parameter and are not written in the file. Strain-based files must not contain <code>TYPE=STRAIN</code>. In a test with Abaqus, the tension damage table was not imported when written with <code>TYPE=DISPLACEMENT</code>; if this happens, use the strain option for the damage table. Check the keywords against the version of Abaqus in use.</p>
<p>The preset <em>Abaqus</em> uses $\psi = 36^\circ$ (a typical value, since the manual does not fix it), $e = 0.1$, $f_{b0}/f_{c0} = 1.16$, $K_c = 2/3$ and zero viscosity. The preset <em>Alfarah et al. (2017)</em> uses $\psi = 13^\circ$, $e = 0.1$, $f_{b0}/f_{c0} = 1.16$, $K_c = 0.7$ and zero viscosity. Both sets are editable.</p>` },
      { id: 'conv-units', title: 'Units', html: R`
<p>All calculations use N, mm and MPa. The output can be converted to N–m–Pa, kN–m–kPa, kN–mm–kN/mm² or N–cm–N/cm² in Settings. The conversion affects only the tables and the <code>.inp</code> block; strains and damage are dimensionless, and the plots remain in N–mm–MPa.</p>` }
    ] },

    { id: 'energy', title: 'Energy regularization', subs: [
      { id: 'en-idea', title: 'Why the mesh matters', html: R`
<p>In softening, the strain localises in one element row, so the energy dissipated per unit volume must be tied to the element size. In tension, $\varepsilon_t = \varepsilon_{t0} + w/l_{eq}$ does this: the area under the stress–$w$ curve is $G_F$ whatever $l_{eq}$ is. In compression, only the formulation of Krätzig and Pölling is built to respect $g_{ch} = G_{ch}/l_{eq}$. The other formulations do not depend on $l_{eq}$, and the energy they dissipate is not controlled by the mesh.</p>` },
      { id: 'en-leq', title: 'Characteristic length', html: R`
<p>The calculator in the side panel gives $l_{eq}$ for solid elements as the ratio between the volume of the element and the area of its largest face (Alfarah <em>et al.</em>, 2017),</p>
$$ l_{eq} = \frac{V}{A_{max}} $$
<p>and, as an alternative, the smallest dimension of a cuboid. Shell and plane elements are not covered; enter the value manually.</p>` },
      { id: 'en-check', title: 'Energy check', html: R`
<p>For each run the program reports the integrals under the tables (check V10), to be compared with $G_{ch}/l_{eq}$ and $G_F/l_{eq}$:</p>
$$ \int \sigma_c\,\mathrm{d}\varepsilon_c^{ch} \quad \text{vs.} \quad \frac{G_{ch}}{l_{eq}}, \qquad \int \sigma_t\,\mathrm{d}\varepsilon_t^{ck} \quad \text{vs.} \quad \frac{G_F}{l_{eq}} $$
<p>In tension, the integral exceeds $G_F/l_{eq}$ by the elastic part $f_{tm}^2/(2E_0)$ that is discounted in the conversion from $\varepsilon_t$ to $\varepsilon_t^{ck}$. In Krätzig and Pölling, the iteration of $\rho$ does not impose the energy, so the area is close to $g_{ch}$ (about 92% in the examples of the paper), without coinciding with it.</p>` },
      { id: 'en-mesh', title: 'Mesh sensitivity', html: R`
<p>The <em>Mesh sensitivity</em> tab runs the current configuration for a list of values of $l_{eq}$ and tabulates $\varepsilon_u$, $\rho$, the maximum damage and the energy ratios. <em>Find feasible window</em> reports the interval of $l_{eq}$ in which the configuration is executed without errors. With the Krätzig and Pölling procedure, $\varepsilon_u$ grows quickly in fine meshes, and the export is blocked in coarse meshes, where $G_{ch}/l_{eq}$ is too small for the curve to exist.</p>` }
    ] },

    { id: 'checks', title: 'Validation and checks', subs: [
      { id: 'chk-list', title: 'Automatic checks', html: R`
<p>Every run is verified. <strong>Errors</strong> block the export; <strong>warnings</strong> and <strong>notes</strong> do not. The messages are listed in the <em>Checks</em> tab, and the warnings can also be read from the icon in the header.</p>
<table class="doct">
<thead><tr><th>Code</th><th>Level</th><th>Condition</th></tr></thead>
<tbody>
<tr><td>V1</td><td>warning</td><td>$f_{ck}$ outside the range of the selected code</td></tr>
<tr><td>V2</td><td>error / warning</td><td>$\varepsilon_{c0} < \varepsilon_{cm} < \varepsilon_u$ not satisfied or invalid parameters (error); GB 50010 (2010) table out of range or continuation beyond $\varepsilon_{cu1}$ not possible (warning)</td></tr>
<tr><td>V3</td><td>error</td><td>$\varepsilon_c^{ch}$ and $\varepsilon_t^{ck}$ do not start at zero or are not strictly increasing</td></tr>
<tr><td>V4</td><td>error / warning</td><td>damage outside $[0, 1)$ or decreasing (error); damage limited to $d_{max}$ (warning)</td></tr>
<tr><td>V5</td><td>error</td><td>plastic strain negative or decreasing</td></tr>
<tr><td>V6</td><td>error</td><td>Krätzig and Pölling: $\rho$ does not exist in $(0, 1]$ or the iteration fails (typically $l_{eq}$ too large)</td></tr>
<tr><td>V7</td><td>warning</td><td>damage of Alfarah <em>et al.</em> combined with curves other than those it was derived for</td></tr>
<tr><td>V8</td><td>note</td><td>which limit ended the compression curve</td></tr>
<tr><td>V9</td><td>warning</td><td>user-defined properties</td></tr>
<tr><td>V10</td><td>note</td><td>integrals under the curves versus $G_{ch}/l_{eq}$ and $G_F/l_{eq}$</td></tr>
<tr><td>V11</td><td>warning</td><td>stress falls just after the elastic limit</td></tr>
<tr><td>V12</td><td>warning</td><td>peak of the experimental data differs from $f_{cm}$ or $f_{tm}$ by more than 5 %</td></tr>
<tr><td>V13</td><td>warning</td><td>GB 50010 (2010) tension law: strain law without fracture energy, not regularised by $l_{eq}$</td></tr>
</tbody></table>
<p>The checks evaluate the consistency of the generated data. They do not assess whether the curves represent a real concrete or whether an analysis will converge.</p>` }
    ] },

    { id: 'limits', title: 'Limitations', subs: [
      { id: 'lim-list', title: 'Limitations and caveats', html: R`
<ul>
<li>The formulations describe monotonic uniaxial loading. Cyclic loading, rate effects, temperature and confinement are not covered, and the formulation of Yu <em>et al.</em> is the uniaxial form of the original.</li>
<li>Some damage formulations are compatible only with specific constitutive laws. Incompatible combinations are flagged by warnings or block the export.</li>
<li>The mechanical properties estimated from codes and empirical relations are approximations and must be used within their hypotheses and limits. Properties not given by the selected code are taken from the fib MC2010 (2012), and the Eurocode 2 modulus uses an assumed scaling by $\alpha_E$.</li>
<li>The fracture energies and characteristic lengths used in the regularisation influence the post-peak response. The mesh sensitivity must be evaluated by the user.</li>
<li>Only the Krätzig and Pölling formulation regularises the crushing energy by the mesh. In the other compression formulations, the energy depends only on the curve.</li>
<li>The extension beyond $\varepsilon_{cu1}$ applies the MC1990 branch to the diagrams of the three codes (it is not a part of them), and the GB 50010 (2010) tension law is a strain law that is not regularised by the mesh (V13).</li>
<li>CCGen generates the uniaxial data of the material but does not determine all the parameters required by the CDP model. The remaining parameters must be defined by the user.</li>
<li>The automatic checks assess the consistency of the generated data, but do not guarantee the physical representativeness of the curves or the convergence of numerical analyses.</li>
</ul>
<p>CCGen is a tool to support numerical modelling. It does not replace the experimental characterisation of the materials, the validation of the constitutive laws or the verification of the results obtained in Abaqus.</p>` }
    ] },

    { id: 'refs', title: 'References', subs: [
      { id: 'ref-list', title: 'References', html: R`
<ul class="refs">
<li>ABNT. <em>NBR 6118: Projeto de estruturas de concreto — Procedimento</em>. Rio de Janeiro, 2023.</li>
<li>Alfarah, B.; López-Almansa, F.; Oller, S. New methodology for calculating damage variables evolution in Plastic Damage Model for RC structures. <em>Engineering Structures</em> 2017, 132, 70–86.</li>
<li>Birtel, V.; Mark, P. Parameterised finite element modelling of RC beam shear failure. In: <em>ABAQUS Users' Conference</em>, 2006, p. 95–108.</li>
<li>Carreira, D. J.; Chu, K.-H. Stress-strain relationship for plain concrete in compression. <em>ACI Journal</em> 1985, 82(6), 797–804.</li>
<li>CEN. <em>EN 1992-1-1:2023 — Eurocode 2: Design of concrete structures — Part 1-1: General rules and rules for buildings, bridges and civil engineering structures</em>. Brussels, 2023.</li>
<li>Cornelissen, H. A. W.; Hordijk, D. A.; Reinhardt, H. W. Experimental determination of crack softening characteristics of normalweight and lightweight concrete. <em>Heron</em> 1986, 31(2), 45–56.</li>
<li>Dassault Systèmes. <em>Abaqus Analysis User's Guide: Concrete damaged plasticity</em>.</li>
<li>fib. <em>fib Model Code for Concrete Structures 2010</em>. International Federation for Structural Concrete: Lausanne, 2012.</li>
<li>fib. <em>Bulletin 42: Constitutive Modelling of High Strength/High Performance Concrete</em>. Lausanne, 2008.</li>
<li>Hillerborg, A.; Modéer, M.; Petersson, P.-E. Analysis of crack formation and crack growth in concrete by means of fracture mechanics and finite elements. <em>Cement and Concrete Research</em> 1976, 6(6), 773–781.</li>
<li>Hognestad, E. <em>A study of combined bending and axial load in reinforced concrete members</em>. University of Illinois Engineering Experiment Station, Bulletin No. 399, 1951.</li>
<li>Krätzig, W. B.; Pölling, R. An elasto-plastic damage model for reinforced concrete with minimum number of material parameters. <em>Computers & Structures</em> 2004, 82, 1201–1215.</li>
<li>Saenz, L. P. Discussion of “Equation for the stress-strain curve of concrete” by Desayi, P. and Krishnan, S. <em>J. Am. Concr. Inst.</em> 1964, 61, 1229–1235.</li>
<li>Thorenfeldt, E.; Tomaszewicz, A.; Jensen, J. J. Mechanical properties of high-strength concrete and applications in design. In: <em>Proceedings of the Symposium on Utilization of High-Strength Concrete</em>, Stavanger, 1987, p. 149–159.</li>
<li>Yu, T.; Teng, J. G.; Wong, Y. L.; Dong, S. L. Finite element modeling of confined concrete-I: Drucker–Prager type plasticity model. <em>Engineering Structures</em> 2010, 32(3), 665–679.</li>
</ul>` }
    ] }
  ];

  /* ---------- rendering ---------- */
  function mathify(html, sec, cnt) {
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, t) => { cnt.n++; return '<div class="eq"><div class="eqb">' + G.tex.toMathML(t.trim(), true) + '</div><span class="eqn">(' + sec + '.' + cnt.n + ')</span></div>'; });
    return html.replace(/\$([^$]+?)\$/g, (m, t) => G.tex.toMathML(t.trim(), false));
  }
  const strip = (h) => h.replace(/<[^>]+>/g, '');

  G.docs = { DOC, strip };
  G.docs.render = function (navEl, bodyEl) {
    const chev = '<svg class="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
    let nav = '<div class="dn-head"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/></svg><span>Contents</span></div>';
    let body = '<h1 class="doc-title">CCGen Documentation</h1><p class="doc-sub">Technical documentation · Constitutive models · Abaqus CDP</p>';
    DOC.forEach((s, i) => {
      const num = i + 1, cnt = { n: 0 };
      nav += '<div class="dn-sec" data-sec="' + s.id + '"><button type="button" class="dn-btn" aria-expanded="false" aria-controls="dn-' + s.id + '"><span class="dn-t">' + num + '. ' + s.title + '</span>' + chev + '</button><ul id="dn-' + s.id + '" class="dn-subs" hidden>';
      body += '<section class="doc-sec" id="doc-' + s.id + '"><h2>' + num + '. ' + s.title + '</h2>';
      s.subs.forEach((u, j) => {
        const single = s.subs.length === 1;
        nav += '<li><a href="#doc-' + s.id + '-' + u.id + '" data-id="doc-' + s.id + '-' + u.id + '">' + num + '.' + (j + 1) + ' ' + strip(u.title) + '</a></li>';
        body += '<div class="doc-sub-sec" id="doc-' + s.id + '-' + u.id + '">' + (single ? '' : '<h3>' + num + '.' + (j + 1) + ' ' + u.title + '</h3>') + mathify(u.html, num, cnt) + '</div>';
      });
      nav += '</ul></div>';
      body += '</section>';
    });
    navEl.innerHTML = nav; bodyEl.innerHTML = body;
    const secs = Array.from(navEl.querySelectorAll('.dn-sec'));
    let pinned = null, lastSec = null;
    const setOpen = (sec, open) => { const b = sec.querySelector('.dn-btn'), ul = sec.querySelector('.dn-subs'); b.setAttribute('aria-expanded', open ? 'true' : 'false'); ul.hidden = !open; sec.classList.toggle('open', open); };
    secs.forEach((sec) => {
      sec.querySelector('.dn-btn').onclick = () => {
        const open = sec.classList.contains('open');
        pinned = open ? null : sec;
        if (!open) { const t = document.getElementById('doc-' + sec.dataset.sec); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        setOpen(sec, !open);
      };
    });
    navEl.querySelectorAll('a').forEach((a) => { a.onclick = (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.id); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + a.dataset.id); } }; });
    // scroll spy
    const targets = Array.from(bodyEl.querySelectorAll('.doc-sub-sec'));
    function spy() {
      let cur = null; const y = 120;
      for (const t of targets) { if (t.getBoundingClientRect().top <= y) cur = t; else break; }
      navEl.querySelectorAll('a.on').forEach((a) => a.classList.remove('on'));
      if (!cur) return;
      const a = navEl.querySelector('a[data-id="' + cur.id + '"]'); if (!a) return; a.classList.add('on');
      const sec = a.closest('.dn-sec'); secs.forEach((x) => x.classList.toggle('cur', x === sec));
      if (sec !== lastSec) { secs.forEach((x) => { if (x !== sec && x !== pinned) setOpen(x, false); }); lastSec = sec; }
      if (!sec.classList.contains('open')) setOpen(sec, true);
    }
    let tick = false;
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; if (bodyEl.offsetParent) spy(); }); } }, { passive: true });
    setOpen(secs[0], true);
    return { spy };
  };
})(globalThis.CCGen = globalThis.CCGen || {});
