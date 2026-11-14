/* CCGen núcleo: comprimento característico e sensibilidade à malha. */
(function (G) {
  'use strict';
  const T = {};
  /** l_eq de elementos sólidos = V / A_max (mm³, mm²); em um paralelepípedo, o menor lado. */
  T.leqSolid = function (V, Amax) {
    if (!(V > 0) || !(Amax > 0)) throw new G.util.CCGenError('V and A_max must be positive.', 'LEQ');
    return V / Amax;
  };
  T.leqCuboid = function (a, b, c) { return T.leqSolid(a * b * c, Math.max(a * b, a * c, b * c)); };

  /** Reexecuta o pipeline para vários l_eq e tabula indicadores. */
  T.meshSensitivity = function (cfg, list) {
    return list.map((leq) => {
      const r = G.pipeline.run(Object.assign({}, cfg, { leq }));
      const row = { leq, ok: r.ok, error: r.errors.length ? r.errors[0].msg : null };
      if (r.comp) {
        row.eu = r.comp.eu; row.rho = r.comp.info && r.comp.info.rho;
        row.dcMax = Math.max.apply(null, r.comp.dRaw); row.gc = r.comp.energy * leq; row.Gch = r.props.Gch;
      }
      if (r.tens) { row.dtMax = Math.max.apply(null, r.tens.dRaw); row.gt = r.tens.energy * leq; row.GF = r.props.GF; row.wc = r.tens.wc; }
      row.warnings = r.warnings.length;
      return row;
    });
  };
  /** Faixa viável de l_eq [mín, máx] (mm), por bisseção. */
  T.leqWindow = function (cfg, lo, hi) {
    lo = lo || 1; hi = hi || 2000;
    const okAt = (l) => G.pipeline.run(Object.assign({}, cfg, { leq: l })).ok;
    let seed = null;
    for (const l of [50, 25, 100, 10, 200, 5, 400, 1000, 2, 20, 75, 150]) { if (l >= lo && l <= hi && okAt(l)) { seed = l; break; } }
    if (seed == null) return { min: null, max: null };
    const edge = (good, bad) => { if (okAt(bad)) return bad; for (let i = 0; i < 40; i++) { const m = 0.5 * (good + bad); if (okAt(m)) good = m; else bad = m; } return good; };
    return { min: edge(seed, lo), max: edge(seed, hi) };
  };
  T.maxLeq = function (cfg, lo, hi) { const w = T.leqWindow(cfg, lo, hi); return { value: w.max, bounded: w.max === (hi || 2000) }; };
  G.tools = T;
})(globalThis.CCGen = globalThis.CCGen || {});
