/* CCGen núcleo: transforma uma configuração em curvas, dano, tabelas e verificações. */
(function (G) {
  'use strict';
  const { trapz, CCGenError } = G.util;
  const PL = {};
  PL.DEFAULT_CONFIG = {
    fck: 30, method: 'fib', alphaE: 1.0, overrides: {}, leq: 50,
    compModel: 'cc', tensModel: 'cor', compDamage: 'bm', tensDamage: 'bm',
    opts: { Na: 14, Nd: 34, Nt: 50, epsMax: 0.02, sigmaLim: 0.05, dmax: 0.99, bc: 0.7, bt: 0.1,
      extend: true, hogEu: 0.0038, hogEcm: null, kraMode: 'plastic', kraEcm: null, alfRounded: false, kraRho0: 0.9, kraTol: 1e-4, kraRelax: 0.5, kraMaxIter: 50, kraEnergyFrac: 0.95 }
  };
  PL.merge = function (cfg) {
    const d = G.util.clone(PL.DEFAULT_CONFIG);
    const c = Object.assign(d, cfg || {});
    c.opts = Object.assign({}, PL.DEFAULT_CONFIG.opts, (cfg && cfg.opts) || {});
    c.exp = (cfg && cfg.exp) || null;
    c.overrides = Object.assign({}, (cfg && cfg.overrides) || {});
    return c;
  };

  /** Executa tudo; problemas de modelagem vão em res.errors, sem exceção. */
  PL.run = function (cfgIn) {
    const cfg = PL.merge(cfgIn);
    const o = cfg.opts;
    const res = { cfg, errors: [], warnings: [], info: [], comp: null, tens: null, props: null, origins: null, ok: true };
    const add = (m) => { (m.level === 'error' ? res.errors : m.level === 'warning' ? res.warnings : res.info).push(m); };
    let pr;
    try { pr = G.properties.compute({ fck: cfg.fck, method: cfg.method, alphaE: cfg.alphaE, overrides: cfg.overrides }); }
    catch (e) { res.errors.push({ id: 'INPUT', level: 'error', msg: e.message }); res.ok = false; return res; }
    res.props = pr.values; res.origins = pr.origins; pr.warnings.forEach(add);
    const p = pr.values;

    // ---- compressão
    try {
      const c = G.compression.build(p, cfg.compModel, o, cfg.leq, cfg.exp && cfg.exp.comp);
      const ein = c.ein;
      const dd = G.damage.compression(cfg.compDamage, { eps: c.eps, sigma: c.sigma, ein, E0: p.E0, fcm: p.fcm, fm: c.fm, fc0: p.fc0, Gch: p.Gch, leq: cfg.leq, ecm: c.ecm, b: o.bc, rounded: o.alfRounded });
      c.dRaw = dd.d; c.d = G.damage.cap(dd.d, o.dmax); c.dParams = dd.params;
      c.epl = G.damage.plastic(c.eps, c.sigma, c.d, p.E0);
      c.energy = trapz(ein.slice(1), c.sigma.slice(1));
      res.comp = c;
      if (cfg.compModel === 'exp' && Math.abs(c.fm - p.fcm) > 0.05 * p.fcm) add({ id: 'V12', level: 'warning', msg: 'Compression: the experimental peak (' + c.fm.toFixed(2) + ' MPa) differs from f_cm (' + p.fcm.toFixed(2) + ' MPa) by more than 5 %. Enter the measured f_cm as a manual value so that E_0, f_c0 and G_ch are consistent with the data.' });
      if (c.info && c.info.warn) add({ id: 'V2', level: 'warning', msg: c.info.warn });
      const lim = c.info && c.info.limit, fe = (v) => v.toExponential(3);
      const extN = c.info && c.info.ext ? ' The diagram is extended beyond ε_cu1 = ' + fe(c.info.extFrom) + ' (dashed in the plots) with the MC1990 descending branch.' : '';
      res.limitNote = lim === 'stress' ? 'Curve ends at ε_u = ' + fe(c.eu) + ': the stress limit σ = ' + o.sigmaLim + '·f_cm was reached first (ε_max = ' + o.epsMax + ' not reached).'
        : lim === 'strain' ? 'Curve ends at ε_u = ' + fe(c.eu) + ': the strain limit ε_max governed' + (o.sigmaLim > 0 ? ' (σ = ' + o.sigmaLim + '·f_cm was not reached before it).' : ' (stress limit disabled).')
        : lim === 'data' ? 'Curve ends at ε_u = ' + fe(c.eu) + ': last point of the experimental data (σ_lim and ε_max do not apply).'
        : lim === 'plastic' ? 'Curve ends at ε_u = ' + fe(c.eu) + ': the largest strain for which the plastic strain still increases at the end of the curve (Alfarah et al. procedure; σ_lim and ε_max do not apply).'
        : lim === 'energy' ? 'Curve ends at ε_u = ' + fe(c.eu) + ': ' + (100 * o.kraEnergyFrac).toFixed(0) + ' % of g_ch dissipated (Krätzig–Pölling rule; σ_lim and ε_max do not apply).'
        : 'Curve ends at ε_u = ' + fe(c.eu) + ' (' + ({ nbr: 'NBR 6118 (2023) definition of ε_cu1', ec2: 'Eurocode 2 definition of ε_cu1', fibmc: 'fib MC2010 (2012) definition of ε_c,lim' }[cfg.compModel] || 'Hognestad definition') + '; σ_lim and ε_max do not apply).';
      res.limitNote += extN;
      add({ id: 'V8', level: 'info', msg: 'Compression: ' + res.limitNote });
      if (cfg.compDamage === 'alf' && cfg.compModel !== 'kra')
        add({ id: 'V7', level: 'warning', msg: 'Compression: Alfarah et al. damage is derived from the Kratzig–Polling softening law; with another stress curve the pair (σ, d) may be incoherent and the dissipated energy may differ from G_ch.' });
    } catch (e) { if (!(e instanceof CCGenError)) throw e; res.errors.push({ id: e.code, level: 'error', msg: 'Compression: ' + e.message }); }

    // ---- tração
    try {
      const t = G.tension.build(p, cfg.tensModel, o, cfg.leq, cfg.exp && cfg.exp.tens);
      const dd = G.damage.tension(cfg.tensDamage, { w: t.w, sigma: t.sigma, eck: t.eck, E0: p.E0, ftm: p.ftm, fm: t.fm, GF: p.GF, leq: cfg.leq, b: o.bt, rounded: o.alfRounded });
      t.dRaw = dd.d; t.d = G.damage.cap(dd.d, o.dmax); t.dParams = dd.params;
      t.epl = G.damage.plastic(t.et, t.sigma, t.d, p.E0);
      t.energy = trapz(t.eck, t.sigma);
      res.tens = t;
      if (t.warn) add({ id: 'V1', level: 'warning', msg: 'Tension: ' + t.warn });
      if (cfg.tensModel === 'gb') add({ id: 'V13', level: 'warning', msg: 'Tension: the GB 50010 (2010) curve is a strain law without fracture energy, so it is not regularized by l_eq (the dissipated energy per unit volume is fixed and G_F is not used); results depend on the mesh size. Compare ∫σ dε_t^ck with G_F/l_eq in the checks.' });
      if (cfg.tensModel === 'exp' && Math.abs(t.fm - p.ftm) > 0.05 * p.ftm) add({ id: 'V12', level: 'warning', msg: 'Tension: the experimental peak (' + t.fm.toFixed(3) + ' MPa) differs from f_tm (' + p.ftm.toFixed(3) + ' MPa) by more than 5 %. Enter the measured f_tm as a manual value so that ε_t0 and G_F are consistent with the data.' });
      if (cfg.tensDamage === 'alf' && cfg.tensModel !== 'cor')
        add({ id: 'V7', level: 'warning', msg: 'Tension: Alfarah et al. damage is derived from an exponential softening law; with the ' + G.tension.MODELS[cfg.tensModel] + ' curve the pair (σ, d) may be incoherent.' });
    } catch (e) { if (!(e instanceof CCGenError)) throw e; res.errors.push({ id: e.code, level: 'error', msg: 'Tension: ' + e.message }); }

    G.checks.run(res).forEach(add);
    res.ok = res.errors.length === 0;
    res.tables = res.comp && res.tens ? PL.tables(res) : null;
    return res;
  };

  /** Tabelas na ordem de colunas do Abaqus; primeira linha = limite elástico. */
  PL.tables = function (res) {
    const c = res.comp, t = res.tens, tb = {};
    tb.compHardening = []; tb.compDamage = [];
    for (let i = 1; i < c.eps.length; i++) { tb.compHardening.push([c.sigma[i], c.ein[i]]); tb.compDamage.push([c.d[i], c.ein[i]]); }
    tb.tensStiffening = t.w.map((_, i) => [t.sigma[i], t.eck[i]]);
    tb.tensDamage = t.w.map((_, i) => [t.d[i], t.eck[i]]);
    return tb;
  };
  G.pipeline = PL;
})(globalThis.CCGen = globalThis.CCGen || {});
