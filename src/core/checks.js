/* CCGen núcleo: verificações V2–V8 e V10 (V1 e V9 vêm de properties.js; V7, de pipeline.js). */
(function (G) {
  'use strict';
  const K = {};
  const TOL = 1e-9;
  function inc(a, tol) { for (let i = 1; i < a.length; i++) if (!(a[i] > a[i - 1] + (tol || 0))) return false; return true; }
  function nondec(a, tol) { for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1] - tol) return false; return true; }

  K.run = function (res) {
    const out = [], p = res.props, o = res.cfg.opts;
    const msg = (id, level, m) => out.push({ id, level, msg: m });
    const c = res.comp, t = res.tens;
    if (c) {
      if (!(c.ein[1] === 0 && inc(c.ein.slice(1), 0))) msg('V3', 'error', 'Compression: ε_c^ch must start at 0 and be strictly increasing.');
      if (!(c.d[1] >= 0 && Math.max.apply(null, c.d) < 1 && nondec(c.d.slice(1), 1e-12))) msg('V4', 'error', 'Compression: damage must lie in [0, 1) and must not decrease.');
      const reachedC = Math.max.apply(null, c.dRaw) > o.dmax;
      if (reachedC) msg('V4', 'warning', 'Compression: damage was limited to d_max = ' + o.dmax + '.');
      let dip = -1; for (let i = 2; i < c.eps.length && c.eps[i] <= c.ecm; i++) if (c.sigma[i] < c.sigma[i - 1] - 1e-9) { dip = i; break; }
      if (dip > 0) msg('V11', 'warning', 'Compression: the stress falls from ' + c.sigma[dip - 1].toFixed(2) + ' to ' + c.sigma[dip].toFixed(2) + ' MPa just after the elastic limit f_c0, because the model curve lies below E_0·ε there (typical of Hognestad with ε_cm = 2f_cm/E_0). Consider another compression model.');
      const epl = c.epl.slice(1);
      if (!(Math.min.apply(null, epl) >= -TOL && nondec(epl, TOL))) msg('V5', 'error', 'Compression: the plastic strain ε_c^pl is negative or decreasing. The stress curve and the damage variable are incoherent; do not use these data in Abaqus.');
      const g = p.Gch / res.cfg.leq;
      msg('V10', 'info', 'Compression: ∫σ dε^in = ' + c.energy.toFixed(4) + ' N/mm² (G_ch/l_eq = ' + g.toFixed(4) + ' N/mm²; the curve ends at ε_u = ' + c.eps[c.eps.length - 1].toExponential(3) + ').');
    }
    if (t) {
      if (!(t.eck[0] === 0 && inc(t.eck, 0))) msg('V3', 'error', 'Tension: ε_t^ck must start at 0 and be strictly increasing.');
      if (!(t.d[0] >= 0 && Math.max.apply(null, t.d) < 1 && nondec(t.d, 1e-12))) msg('V4', 'error', 'Tension: damage must lie in [0, 1) and must not decrease.');
      if (Math.max.apply(null, t.dRaw) > o.dmax) msg('V4', 'warning', 'Tension: damage was limited to d_max = ' + o.dmax + '.');
      if (!(Math.min.apply(null, t.epl) >= -TOL && nondec(t.epl, TOL))) msg('V5', 'error', 'Tension: the plastic strain ε_t^pl is negative or decreasing. The stress curve and the damage variable are incoherent; do not use these data in Abaqus.');
      msg('V10', 'info', 'Tension: ∫σ dε^ck = ' + t.energy.toFixed(5) + ' N/mm² (G_F/l_eq = ' + (p.GF / res.cfg.leq).toFixed(5) + ' N/mm²).');
    }
    return out;
  };
  G.checks = K;
})(globalThis.CCGen = globalThis.CCGen || {});
