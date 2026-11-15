/* CCGen núcleo: amolecimento à tração (Hillerborg et al. 1976; fib MC2010 (2012) bilinear; Cornelissen et al. 1986; GB 50010 (2010)). */
(function (G) {
  'use strict';
  const T = {};
  const { linspace, CCGenError } = G.util;
  T.MODELS = {
    lin: 'Hillerborg et al. (1976), linear',
    fib: 'fib MC2010 (2012), bilinear',
    cor: 'Cornelissen et al. (1986), exponential',
    gb: 'GB 50010 (2010)',
    exp: 'Experimental data (Experimental tab)'
  };
  T.DEFAULTS = { Nt: 50, sigmaLim: 0.05 };
  /** GB 50010 (2010), Tabela C.2.3: ε_t,r (10⁻⁶) e α_t por f_t,r (MPa). */
  const GB_T = { fr: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0], er: [65, 81, 95, 107, 118, 128, 137], at: [0.31, 0.70, 1.25, 1.95, 2.81, 3.82, 5.00] };
  T.GB_TABLE = GB_T;
  /** GB 50010 (2010), Anexo C.2.3, com f_t,r = f_tm: linear até f_tm, patamar até ε_t,r e ramo descendente; termina em σ_lim·f_tm. Sem energia de fratura. */

  function gbTension(p, o, leq) {
    const { ftm, E0, et0 } = p, C = G.compression;
    const er = C.interpClamp(ftm, GB_T.fr, GB_T.er), al = C.interpClamp(ftm, GB_T.fr, GB_T.at), er1 = er.v * 1e-6, at = al.v;
    const desc = (e) => { const x = e / er1; return ftm * x / (at * Math.pow(x - 1, 1.7) + x); };
    const lim = o.sigmaLim > 0 ? o.sigmaLim : 0.05;
    const ep = Math.max(er1, et0);
    let lo = ep / er1, hi = lo * 2; while (desc(hi * er1) > lim * ftm && hi < 1e6) hi *= 2;
    for (let k = 0; k < 80; k++) { const m = 0.5 * (lo + hi); if (desc(m * er1) > lim * ftm) lo = m; else hi = m; }
    const eEnd = hi * er1, eps = [et0];
    if (ep > et0 * (1 + 1e-9)) eps.push(ep);
    const M = Math.max(2, o.Nt);
    for (let j = 1; j <= M; j++) eps.push(ep + (eEnd - ep) * Math.pow(j / M, 2));
    const s = eps.map((e) => (e <= ep ? ftm : desc(e)));
    const w = eps.map((e) => (e - et0) * leq), eck = eps.map((e, i) => (i === 0 ? 0 : e - s[i] / E0));
    return { w, sigma: s, et: eps, eck, wc: w[w.length - 1], model: 'gb', epsR: er1, alphaT: at,
      warn: er.out ? 'f_tm = ' + ftm.toFixed(2) + ' MPa is outside the 1.0–4.0 MPa range of Table C.2.3 of GB 50010 (2010); the parameters of the nearest column were used.' : null };
  }

  /** Dados experimentais → {w, sigma, et, eck}. kind: 'opening' | 'total' | 'cracking'. */
  T.expCurve = function (p, spec, leq) {
    if (spec && spec.err) throw new CCGenError('Experimental tension data: ' + spec.err, 'EXP');
    const rows = spec && spec.rows;
    if (!rows || rows.length < 3) throw new CCGenError('Experimental tension data: at least 3 points are needed.', 'EXP');
    const { E0, et0 } = p, w = [], sigma = [], et = [], eck = [];
    for (let i = 0; i < rows.length; i++) {
      const x = rows[i][0], s = rows[i][1];
      if (!(x >= 0 && s >= 0)) throw new CCGenError('Experimental tension data: values must be non-negative; check line ' + (i + 1) + '.', 'EXP');
      if (i && !(x > rows[i - 1][0])) throw new CCGenError('Experimental tension data: the first column must increase from line to line (line ' + (i + 1) + ').', 'EXP');
      let a, b, c;   // a = w, b = ε_t, c = ε_t^ck
      if (spec.kind === 'opening') { a = x; b = et0 + x / leq; c = b - s / E0; }
      else if (spec.kind === 'cracking') { c = x; b = c + s / E0; a = (b - et0) * leq; }
      else { b = x; a = (b - et0) * leq; c = b - s / E0; }
      w.push(a); sigma.push(s); et.push(b); eck.push(c);
    }
    return { w, sigma, et, eck };
  };
  /** Dados experimentais: a partir do pico, com abertura de fissura crescente. */
  function experimental(p, spec, leq) {
    const d = T.expCurve(p, spec, leq), { et0 } = p;
    let pk = 0; for (let i = 1; i < d.sigma.length; i++) if (d.sigma[i] > d.sigma[pk]) pk = i;
    const w = [0], s = [d.sigma[pk]], et = [et0], eck = [0];
    for (let i = pk; i < d.sigma.length; i++) {
      if (d.eck[i] > eck[eck.length - 1] + 1e-12 && d.w[i] > w[w.length - 1] + 1e-12) { w.push(d.w[i]); s.push(d.sigma[i]); et.push(d.et[i]); eck.push(d.eck[i]); }
    }
    if (w.length < 3) throw new CCGenError('Experimental tension data: fewer than 2 usable points after the peak.', 'EXP');
    return { w, sigma: s, et, eck, wc: w[w.length - 1], model: 'exp', fm: s[0] };
  }

  /** Retorna { w, sigma, et, eck, wc }; et = ε_t0 + w/l_eq; eck = et − σ/E_0. */
  T.build = function (p, model, opts, leq, exp) {
    const o = Object.assign({}, T.DEFAULTS, opts || {});
    const { ftm, GF, E0, et0 } = p;
    if (!(leq > 0)) throw new CCGenError('l_eq must be positive.', 'LEQ');
    if (model === 'exp') { if (!(leq > 0)) throw new CCGenError('l_eq must be positive.', 'LEQ'); return experimental(p, exp, leq); }
    if (model === 'gb') return gbTension(p, o, leq);
    let w, s, wc;
    if (model === 'lin') {
      wc = 2 * GF / ftm; w = linspace(0, wc, o.Nt + 1); s = w.map((x) => (1 - x / wc) * ftm);
    } else if (model === 'fib') {
      const w1 = GF / ftm; wc = 5 * w1; const h = Math.max(1, Math.floor(o.Nt / 2));
      w = linspace(0, w1, h + 1).concat(linspace(w1, wc, h + 1).slice(1));
      s = w.map((x) => (x <= w1 ? (1 - 0.8 * x / w1) : (0.25 - 0.05 * x / w1)) * ftm);
    } else if (model === 'cor') {
      wc = 5.14 * GF / ftm; w = linspace(0, wc, o.Nt + 1);
      s = w.map((x) => { const r = x / wc; return Math.max(0, ((1 + Math.pow(3 * r, 3)) * Math.exp(-6.93 * r) - r * 28 * Math.exp(-6.93)) * ftm); });
    } else throw new CCGenError('Unknown tension model: ' + model, 'MODEL');
    const et = w.map((x) => et0 + x / leq);
    const eck = et.map((e, i) => (i === 0 ? 0 : e - s[i] / E0));
    return { w, sigma: s, et, eck, wc, model };
  };
  G.tension = T;
})(globalThis.CCGen = globalThis.CCGen || {});
