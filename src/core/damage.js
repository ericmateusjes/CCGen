/* CCGen núcleo: variáveis de dano e deformações plásticas. */
(function (G) {
  'use strict';
  const D = {};
  D.METHODS = {
    bm: 'Birtel and Mark (2006)',
    yu: 'Yu et al. (2010)',
    alf: 'Alfarah et al. (2017)'
  };

  /** Parâmetros a e λ ("b" no artigo) de Alfarah et al. (2017). */
  D.alfarahParams = function (fm, f0, G_, leq, rounded) {
    const r = fm / f0;
    if (rounded) {   // coeficientes de Alfarah et al. (2017), Eq. 34
      if (Math.abs(r - 2.5) < 1e-9) return { a: 7.873, lam: 1.97 * fm * leq / G_ };
      if (Math.abs(r - 1) < 1e-9) return { a: 1, lam: (0.453 / 0.3016) * f0 * leq / G_ };
    }
    const a = 2 * r - 1 + 2 * Math.sqrt(Math.max(r * r - r, 0));
    const lam = f0 * leq / G_ * (1 + a / 2);
    return { a, lam };
  };
  function alfarahD(a, lam, ein) {
    return 1 - 1 / (2 + a) * (2 * (1 + a) * Math.exp(-lam * ein) - a * Math.exp(-2 * lam * ein));
  }
  function bmD(sig, E0, b, ein) {
    const epl = b * ein, se = sig / E0;
    const den = epl * (1 / b - 1) + se;
    return den > 0 ? 1 - se / den : 0;
  }

  /** Dano à compressão (sem limite). c: {eps, sigma, ein, E0, fcm, fc0, Gch, leq, ecm, b} */
  D.compression = function (method, c) {
    const n = c.eps.length, d = new Array(n);
    let ap;
    if (method === 'alf') ap = D.alfarahParams(c.fm || c.fcm, c.fc0, c.Gch, c.leq, c.rounded);
    for (let i = 0; i < n; i++) {
      if (method === 'bm') d[i] = bmD(c.sigma[i], c.E0, c.b, c.ein[i]);
      else if (method === 'yu') d[i] = c.eps[i] <= c.ecm ? 0 : 1 - c.sigma[i] / c.fcm;
      else if (method === 'alf') d[i] = alfarahD(ap.a, ap.lam, c.ein[i]);
      else throw new G.util.CCGenError('Unknown damage method: ' + method, 'DAMAGE');
      if (c.ein[i] <= 0 && i === 0) d[i] = 0;
    }
    return { d, params: ap };
  };
  /** Dano à tração (sem limite). t: {w, sigma, eck, E0, ftm, GF, leq, b} */
  D.tension = function (method, t) {
    const n = t.w.length, d = new Array(n);
    let ap;
    if (method === 'alf') ap = D.alfarahParams(t.fm || t.ftm, t.ftm, t.GF, t.leq, t.rounded);
    for (let i = 0; i < n; i++) {
      if (method === 'bm') d[i] = bmD(t.sigma[i], t.E0, t.b, t.eck[i]);
      else if (method === 'yu') d[i] = t.w[i] <= 0 ? 0 : 1 - t.sigma[i] / t.ftm;
      else if (method === 'alf') d[i] = alfarahD(ap.a, ap.lam, t.eck[i]);
      else throw new G.util.CCGenError('Unknown damage method: ' + method, 'DAMAGE');
    }
    return { d, params: ap };
  };
  D.cap = function (d, dmax) { return d.map((x) => Math.min(Math.max(x, 0), dmax)); };
  /** Deformação plástica ε − σ/((1−d)E0). */
  D.plastic = function (eps, sigma, d, E0) { return eps.map((e, i) => e - sigma[i] / ((1 - d[i]) * E0)); };
  D.alfarahD = alfarahD;
  G.damage = D;
})(globalThis.CCGen = globalThis.CCGen || {});
