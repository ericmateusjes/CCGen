/* CCGen núcleo: modelos de compressão (Hognestad, Saenz, Carreira e Chu, Thorenfeldt et al., NBR, EC2, fib, GB 50010 e Krätzig e Pölling). */
(function (G) {
  'use strict';
  const C = {};
  const { linspace, trapz, CCGenError } = G.util;
  C.MODELS = {
    hog: 'Hognestad (1951)',
    saenz: 'Saenz (1964)',
    cc: 'Carreira and Chu (1985)',
    tho: 'Thorenfeldt et al. (1987)',
    kra: 'Kratzig and Polling (2004)',
    nbr: 'NBR 6118 (2023)',
    fibmc: 'fib MC2010 (2012)',
    ec2: 'Eurocode 2 (EN 1992-1-1:2023)',
    gb: 'GB 50010 (2010, Annex C.2)',
    exp: 'Experimental data (Experimental tab)'
  };
  C.DEFAULTS = { Na: 14, Nd: 34, epsMax: 0.02, sigmaLim: 0.05, hogEu: 0.0038, hogEcm: null, kraMode: 'plastic', kraEcm: null, alfRounded: false,
    kraRho0: 0.9, kraTol: 1e-4, kraRelax: 0.5, kraMaxIter: 50, kraEnergyFrac: 0.95 };

  /** fib MC2010 (2012), Tabela 5.1-8: E_c1 (GPa), ε_c1 e ε_c,lim (‰) por classe; f_ck intermediários são interpolados. */
  const FIB_T = {
    fck: [12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100, 110, 120],
    Ec1: [11.1, 12.2, 13.3, 14.9, 16.5, 18.2, 20.0, 21.6, 23.2, 24.7, 26.2, 28.9, 31.4, 33.8, 36.0, 39.3, 42.7],
    ec1: [1.9, 2.0, 2.1, 2.2, 2.3, 2.3, 2.4, 2.5, 2.6, 2.6, 2.7, 2.7, 2.8, 2.9, 3.0, 3.0, 3.0],
    eclim: [3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.4, 3.4, 3.3, 3.2, 3.1, 3.0, 3.0, 3.0, 3.0]
  };
  C.FIB_TABLE = FIB_T;
  /** GB 50010 (2010), Tabela C.2.4: ε_c,r (10⁻⁶), α_c e ε_cu/ε_c,r por f_c,r (MPa). */
  const GB_C = { fr: [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
    er: [1470, 1560, 1640, 1720, 1790, 1850, 1920, 1980, 2030, 2080, 2130, 2190, 2240],
    ac: [0.74, 1.06, 1.36, 1.65, 1.94, 2.21, 2.48, 2.74, 3.00, 3.25, 3.50, 3.75, 3.99],
    cu: [3.0, 2.6, 2.3, 2.1, 2.0, 1.9, 1.9, 1.8, 1.8, 1.7, 1.7, 1.7, 1.6] };
  C.GB_TABLE = GB_C;
  /** Interpolação linear em tabela, limitada aos extremos; `out` indica x fora da faixa. */
  function interpClamp(x, xs, ys) {
    const out = x < xs[0] || x > xs[xs.length - 1], xc = Math.min(Math.max(x, xs[0]), xs[xs.length - 1]);
    let i = 0; while (i < xs.length - 2 && xc > xs[i + 1]) i++;
    return { v: ys[i] + (ys[i + 1] - ys[i]) * (xc - xs[i]) / (xs[i + 1] - xs[i]), out };
  }
  C.interpClamp = interpClamp;
  /** Prolongamento além de ε_cu1 pelo ramo descendente do MC1990 (Eqs. 2.1-19 a 2.1-21). Retorna null se ε_cu1 > ε_c,lim. */

  function extendMC90(f, k, ecm, eu, fcm) {
    const g = (x) => (k * x - x * x) / (1 + (k - 2) * x);
    const xu = eu / ecm, b = 0.5 * k + 1, disc = b * b - 2;
    const xm = disc >= 0 ? (b + Math.sqrt(disc)) / 2 : xu;   // Eq. 2.1-19: σ = 0,5 f_cm
    if (!(1 + (k - 2) * xm > 0) || !(g(xm) > 0)) return null;
    if (!(disc >= 0) || xu > xm) return null;
    // Eqs. 2.1-20 e 2.1-21
    const xi = 4 * (xm * xm * (k - 2) + 2 * xm - k) / Math.pow(xm * (k - 2) + 1, 2);
    const A = xi / xm - 2 / (xm * xm), B = 4 / xm - xi;
    if (!(A > 0)) return null;
    return { f: (e) => (e <= xm * ecm ? f(e) : fcm / (A * (e / ecm) * (e / ecm) + B * (e / ecm))), em: xm * ecm, A, B };
  }
  function interpTable(x, xs, ys) {
    if (x < xs[0] || x > xs[xs.length - 1]) throw new CCGenError('The fib MC2010 (2012) compression curve (Table 5.1-8) covers C12–C120; f_ck = ' + x + ' MPa is outside.', 'V1');
    let i = 0; while (i < xs.length - 2 && x > xs[i + 1]) i++;
    return ys[i] + (ys[i + 1] - ys[i]) * (x - xs[i]) / (xs[i + 1] - xs[i]);
  }

  /** ε_cm de Krätzig–Pölling: ε_c1 do fib MC2010 (2012), qualquer que seja o método de propriedades. */
  function ecmAuto(p) {
    const x = Math.min(Math.max(p.fck, FIB_T.fck[0]), FIB_T.fck[FIB_T.fck.length - 1]);
    return interpTable(x, FIB_T.fck, FIB_T.ec1) * 1e-3;
  }
  C.ecmAuto = ecmAuto;

  /** Primeira linha elástica; σ ≤ E0·ε; descarta pontos que não aumentam ε_in. */
  /** Deformações do ramo descendente, mais densas perto do pico. */
  function descGrid(ecm, eu, Nd) {
    const pw = eu > 0.5 ? 3 : 1, out = [];
    for (let i = 0; i <= Nd; i++) out.push(i === Nd ? eu : ecm + (eu - ecm) * Math.pow(i / Nd, pw));
    return out;
  }
  function assemble(p, f, ecm, eu, Na, Nd) {
    const E0 = p.E0, ec0 = p.ec0;
    if (!(ecm > ec0)) throw new CCGenError('ε_cm (' + ecm.toExponential(3) + ') must be larger than ε_c0 (' + ec0.toExponential(3) + ').', 'V2');
    if (!(eu > ecm)) throw new CCGenError('ε_u (' + eu.toExponential(3) + ') must be larger than ε_cm (' + ecm.toExponential(3) + ').', 'V2');
    const e = [0].concat(linspace(ec0, ecm, Na + 1), descGrid(ecm, eu, Nd).slice(1));
    const s = e.map((x, i) => (i === 0 ? 0 : i === 1 ? E0 * x : Math.min(f(x), E0 * x)));
    const eps = [e[0], e[1]], sig = [s[0], s[1]];
    let last = 0;
    for (let i = 2; i < e.length; i++) {
      const ein = e[i] - s[i] / E0;
      if (ein > last + 1e-12) { eps.push(e[i]); sig.push(s[i]); last = ein; }
    }
    return { eps, sigma: sig };
  }

  /** Fim da curva: σ = σ_lim·f_cm ou ε = ε_max, o que ocorrer primeiro (`limit` indica qual). */
  function truncate(f, ecm, fcm, epsMax, sigmaLim) {
    if (!(epsMax > ecm)) throw new CCGenError('ε_max must be larger than ε_cm.', 'V2');
    if (sigmaLim > 0) {
      const n = 20000, lim = sigmaLim * fcm;
      for (let i = 1; i <= n; i++) {
        const x = ecm + (epsMax - ecm) * i / n;
        if (f(x) <= lim) {            // refina por bisseção
          let lo = ecm + (epsMax - ecm) * (i - 1) / n, hi = x;
          for (let k = 0; k < 50; k++) { const m = 0.5 * (lo + hi); if (f(m) <= lim) hi = m; else lo = m; }
          return { eu: hi, limit: 'stress' };
        }
      }
    }
    return { eu: epsMax, limit: 'strain' };
  }

  function analytic(p, model, o) {
    const { fcm, E0 } = p;
    let f, ecm, eu, capped = false, extra = {};
    if (model === 'hog') {
      ecm = o.hogEcm != null ? o.hogEcm : 2 * fcm / E0; eu = o.hogEu;
      // Ramo ascendente: parábola com tangente horizontal no pico que passa por (ε_c0, f_c0)
      const ec0 = p.ec0, fc0 = p.fc0;
      if (!(ecm > ec0)) throw new CCGenError('ε_cm (' + ecm.toExponential(3) + ') must be larger than ε_c0 (' + ec0.toExponential(3) + ').', 'V2');
      f = (e) => e <= ecm ? fcm - (fcm - fc0) * Math.pow((ecm - e) / (ecm - ec0), 2) : fcm * (1 - 0.15 * (e - ecm) / (eu - ecm));
      extra.limit = 'definition';
    } else if (model === 'nbr' || model === 'ec2' || model === 'fibmc') {
      // Forma de Sargin: σ/f_cm = (kη − η²)/(1 + (k − 2)η), η = ε/ε_c1
      let ec1, k, Ecm;
      if (model === 'nbr') {
        // NBR 6118 (2023): E_cm = E_ci
        ec1 = Math.min(0.7 * Math.pow(fcm, 0.31), 2.8) * 1e-3; Ecm = p.Eci; k = 1.05 * Ecm * ec1 / fcm;
        eu = (p.fck <= 50 ? 3.5 : 2.8 + 27 * Math.pow(Math.max(98 - fcm, 0) / 100, 4)) * 1e-3;
      } else if (model === 'ec2') {
        // Eurocode 2 (2023): E_cm = E_0 (módulo secante)
        if (fcm > 108) throw new CCGenError('The Eurocode 2 diagram is defined for f_cm ≤ 108 MPa (C100).', 'V2');
        ec1 = Math.min(0.7 * Math.pow(fcm, 1 / 3), 2.8) * 1e-3; Ecm = E0; k = 1.05 * Ecm * ec1 / fcm;
        eu = Math.min(2.8 + 14 * Math.pow(1 - fcm / 108, 4), 3.5) * 1e-3;
      } else {
        // fib MC2010 (2012): k = E_ci/E_c1; valores da Tabela 5.1-8
        ec1 = interpTable(p.fck, FIB_T.fck, FIB_T.ec1) * 1e-3; eu = interpTable(p.fck, FIB_T.fck, FIB_T.eclim) * 1e-3;
        Ecm = p.Eci; k = p.Eci / (interpTable(p.fck, FIB_T.fck, FIB_T.Ec1) * 1e3);
      }
      ecm = ec1;
      if (!(ecm > p.ec0)) throw new CCGenError('ε_c1 (' + ecm.toExponential(3) + ') must be larger than ε_c0 (' + p.ec0.toExponential(3) + ').', 'V2');
      if (!(eu > ecm)) throw new CCGenError('ε_cu1 (' + eu.toExponential(3) + ') must be larger than ε_c1 (' + ecm.toExponential(3) + '): this strength class has no descending branch in the diagram.', 'V2');
      if (!(1 + (k - 2) * (eu / ecm) > 0)) throw new CCGenError('The diagram has a vanishing denominator before ε_cu1 (k = ' + k.toFixed(3) + ').', 'V2');
      f = (e) => { const x = e / ecm; return fcm * (k * x - x * x) / (1 + (k - 2) * x); };
      extra.limit = 'definition'; extra.k = k; extra.Ecm = Ecm;
      if (o.extend !== false) {
        const ex = extendMC90(f, k, ecm, eu, fcm);
        if (ex) { f = ex.f; extra.ext = true; extra.extFrom = eu; extra.extMatch = ex.em; }
        else extra.warn = 'The continuation beyond ε_cu1 (MC1990 descending branch) is not possible for this class; the curve ends at ε_cu1.';
      }
    } else if (model === 'gb') {
      // GB 50010 (2010), Anexo C.2.4, com f_c,r = f_cm e E_c = E_0
      const er = interpClamp(fcm, GB_C.fr, GB_C.er), al = interpClamp(fcm, GB_C.fr, GB_C.ac);
      ecm = er.v * 1e-6; const ac = al.v;
      if (er.out) extra.warn = 'f_cm = ' + fcm.toFixed(1) + ' MPa is outside the 20–80 MPa range of Table C.2.4 of GB 50010 (2010); the parameters of the nearest column were used.';
      if (!(E0 * ecm > fcm)) throw new CCGenError('GB 50010 (2010) requires E_0·ε_c,r > f_cm (n > 1); got E_0·ε_c,r = ' + (E0 * ecm).toFixed(2) + ' MPa.', 'V2');
      const n = E0 * ecm / (E0 * ecm - fcm);
      f = (e) => { const x = e / ecm; return x <= 1 ? fcm * n * x / (n - 1 + Math.pow(x, n)) : fcm * x / (ac * (x - 1) * (x - 1) + x); };
      extra.n = n; extra.alphaC = ac;
    } else if (model === 'saenz') {
      ecm = 1.60 * Math.pow(fcm / 10, 0.25) * 1e-3;
      f = (e) => E0 * e / (1 + (E0 * ecm / fcm - 2) * (e / ecm) + (e / ecm) ** 2);
    } else if (model === 'cc') {
      ecm = (168 + 0.71 * fcm) * 1e-5;
      if (!(E0 * ecm > fcm)) throw new CCGenError('Carreira and Chu requires E_0·ε_cm > f_cm (β > 1); got E_0·ε_cm = ' + (E0 * ecm).toFixed(2) + ' MPa.', 'V2');
      const beta = 1 / (1 - fcm / (E0 * ecm));
      extra.beta = beta;
      f = (e) => { const x = e / ecm; return fcm * beta * x / (beta - 1 + Math.pow(x, beta)); };
    } else if (model === 'tho') {
      const n = 0.8 + fcm / 17, k2 = 0.67 + fcm / 62;
      ecm = n / (n - 1) * fcm / E0;
      f = (e) => { const x = e / ecm; return fcm * n * x / (n - 1 + Math.pow(x, x <= 1 ? n : n * k2)); };
      extra.n = n; extra.k = k2;
    }
    if (!['hog', 'nbr', 'ec2', 'fibmc'].includes(model) || extra.ext) { const t = truncate(f, ecm, fcm, o.epsMax, o.sigmaLim); eu = t.eu; capped = t.limit === 'strain'; extra.limit = t.limit; }
    const a = assemble(p, f, ecm, eu, o.Na, o.Nd);
    return Object.assign(a, { ecm, eu, capped, info: extra });
  }

  /** Variante antiga (kraMode = 'energy'): ε_u por fração de g_ch. */
  function kratzigEnergy(p, o, leq) {
    const { fcm, E0, Eci, Gch, fc0, ec0 } = p;
    if (!(leq > 0)) throw new CCGenError('l_eq must be positive.', 'LEQ');
    const ecm = o.kraEcm != null ? o.kraEcm : ecmAuto(p), g = Gch / leq;
    const ap = G.damage.alfarahParams(fcm, fc0, Gch, leq, o.alfRounded);
    const s2 = (e) => fcm * (Eci * e / fcm - (e / ecm) ** 2) / (1 + (Eci * ecm / fcm - 2) * e / ecm);
    // Avalia um ρ tentativo; null se inviável
    function evalRho(rho) {
      const Dn = g - 0.5 * fcm * (ecm * (1 - rho) + rho * fcm / E0);
      if (!(Dn > 0)) return null;
      const gam = Math.PI * Math.PI * fcm * ecm / (2 * Dn * Dn);
      const s3 = (e) => 1 / ((2 + gam * fcm * ecm) / (2 * fcm) - gam * e + e * e * gam / (2 * ecm));
      // energia do trecho ascendente
      const n1 = 4001; let A = 0, pe = null, ps = null;
      for (let i = 0; i < n1; i++) {
        const x = ec0 + (ecm - ec0) * i / (n1 - 1);
        const s = i === 0 ? E0 * x : Math.min(s2(x), E0 * x);
        const ein = x - s / E0;
        if (pe !== null) A += 0.5 * (s + ps) * (ein - pe);
        pe = ein; ps = s;
      }
      const n = 40000, emaxS = 0.5, target = o.kraEnergyFrac * g;
      let prevS = s3(ecm), prevEin = ecm - prevS / E0, eu = 0, found = false;
      for (let i = 1; i <= n; i++) {
        const x = ecm + (emaxS - ecm) * i / n, s = s3(x), ein = x - s / E0;
        A += 0.5 * (s + prevS) * (ein - prevEin); prevS = s; prevEin = ein;
        if (A >= target) { eu = x; found = true; break; }
      }
      if (!found) {   // continua em escala logarítmica até ε = 50
        const m = 20000, xe = 50;
        for (let i = 1; i <= m && !found; i++) {
          const x = emaxS * Math.pow(xe / emaxS, i / m), s = s3(x), ein = x - s / E0;
          A += 0.5 * (s + prevS) * (ein - prevEin); prevS = s; prevEin = ein;
          if (A >= target) { eu = x; found = true; }
        }
      }
      if (!found) return null;
      // malha final: média de ε_pl/ε_in após o pico
      const e = linspace(ec0, ecm, o.Na + 1).concat(descGrid(ecm, eu, o.Nd).slice(1));
      let sum = 0, cnt = 0;
      for (let i = 0; i < e.length; i++) {
        const sg = i === 0 ? E0 * e[i] : (e[i] <= ecm ? Math.min(s2(e[i]), E0 * e[i]) : s3(e[i]));
        const ein = e[i] - sg / E0;
        if (ein > 1e-9 && e[i] >= ecm) {
          const d = G.damage.alfarahD(ap.a, ap.lam, ein);
          sum += (e[i] - sg / ((1 - d) * E0)) / ein; cnt++;
        }
      }
      return { rn: sum / cnt, gam, eu, areaFrac: A / g, s3 };
    }
    // 1) ponto fixo amortecido
    let rho = o.kraRho0, sol = null, it = 0;
    for (it = 1; it <= o.kraMaxIter; it++) {
      const ev = evalRho(rho);
      if (!ev) break;
      if (Math.abs(ev.rn - rho) < o.kraTol) { sol = { rho, ev }; break; }
      rho += o.kraRelax * (ev.rn - rho);
    }
    // 2) varredura de ρ e bisseção
    if (!sol) {
      const h = (r) => { const ev = evalRho(r); return ev ? { v: ev.rn - r, ev } : null; };
      let prev = null, best = null;
      for (let r = 0.02; r <= 1.0001 && !sol; r += 0.02) {
        const cur = h(r);
        if (cur && cur.ev.rn > 0 && cur.ev.rn <= 1 && (!best || Math.abs(cur.v) < Math.abs(best.v))) best = { r, v: cur.v, ev: cur.ev };
        if (cur && prev && prev.h.v * cur.v <= 0) {
          let lo = prev.r, hi = r, hl = prev.h.v;
          for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi), hm = h(m); if (!hm) break; if (hl * hm.v <= 0) hi = m; else { lo = m; hl = hm.v; } }
          const rr = 0.5 * (lo + hi), hh = h(rr); if (hh && Math.abs(hh.v) < 10 * o.kraTol) { sol = { rho: rr, ev: hh.ev }; it = -1; }
        }
        prev = cur ? { r, h: cur } : null;
      }
      if (!sol && best) sol = { rho: best.r, ev: best.ev, residual: best.v };
    }
    if (!sol) {
      if (!(g - 0.5 * fcm * (ecm * (1 - 0.5) + 0.5 * fcm / E0) > 0)) throw new CCGenError('Kratzig–Polling: the denominator of γ_c is not positive. l_eq = ' + leq + ' mm is too large for G_ch = ' + Gch.toFixed(2) + ' N/mm (risk of snap-back).', 'V6');
      throw new CCGenError('Kratzig–Polling: no consistent ρ was found for l_eq = ' + leq + ' mm (the crushing energy is not reached, or ρ did not converge).', 'V6');
    }
    rho = sol.rho;
    if (!(rho > 0 && rho <= 1)) throw new CCGenError('Kratzig–Polling: ρ = ' + rho.toFixed(3) + ' is outside (0, 1]. l_eq = ' + leq + ' mm is too large for G_ch.', 'V6');
    const { gam, eu, areaFrac, s3 } = sol.ev;
    const f = (e) => e <= ecm ? s2(e) : s3(e);
    const a = assemble(p, f, ecm, eu, o.Na, o.Nd);
    const warn = sol.residual != null ? 'Krätzig–Pölling: the consistency condition for ρ has no exact solution for l_eq = ' + leq + ' mm (best compromise ρ = ' + rho.toFixed(2) + ', residual ' + sol.residual.toFixed(2) + '). The stress–strain curve is usable, but the link between the curve and the Alfarah damage is approximate; check V5.' : undefined;
    return Object.assign(a, { ecm, eu, capped: false, info: { warn, limit: 'energy', rho, gamma: gam, iterations: it, a: ap.a, lambda: ap.lam, gch: g, energyFraction: areaFrac } });
  }

  /** Krätzig–Pölling pelo procedimento de Alfarah et al. (2017): ε_u mínimo com ε_pl crescente e ρ = média de ε_pl/ε_in (ponto fixo). */

  function kratzigPlastic(p, o, leq) {
    const { fcm, E0, Eci, Gch, fc0, ec0 } = p;
    if (!(leq > 0)) throw new CCGenError('l_eq must be positive.', 'LEQ');
    const ecm = o.kraEcm != null ? o.kraEcm : ecmAuto(p), g = Gch / leq, N1 = 14, N2 = 34;
    if (!(ecm > ec0)) throw new CCGenError('ε_cm (' + ecm.toExponential(3) + ') must be larger than ε_c0 (' + ec0.toExponential(3) + ').', 'V2');
    const ap = G.damage.alfarahParams(fcm, fc0, Gch, leq, o.alfRounded);
    const s2 = (e) => fcm * (Eci * e / fcm - (e / ecm) ** 2) / (1 + (Eci * ecm / fcm - 2) * e / ecm);
    const gamOf = (rho) => { const Dn = g - 0.5 * fcm * (ecm * (1 - rho) + rho * fcm / E0); return Dn > 0 ? Math.PI * Math.PI * fcm * ecm / (2 * Dn * Dn) : null; };
    const s3Of = (gam) => (e) => 1 / ((2 + gam * fcm * ecm) / (2 * fcm) - gam * e + e * e * gam / (2 * ecm));
    // ε_pl no ponto (d = 1 conta como falha do critério)
    const eplAt = (e, sg) => { const ein = e - sg / E0, d = G.damage.alfarahD(ap.a, ap.lam, ein); return 1 - d > 0 ? { ein, epl: ein - sg * d / ((1 - d) * E0) } : { ein, epl: NaN }; };
    function standardGrid(gam, eu) {
      const s3 = s3Of(gam), e = linspace(ec0, ecm, N1 + 1).concat(linspace(ecm, eu, N2 + 1).slice(1));
      return e.map((x, i) => (i === 0 ? E0 * x : x <= ecm ? Math.min(s2(x), E0 * x) : s3(x)));
    }
    const tolAt = (gam, eu) => { const e = linspace(ec0, ecm, N1 + 1).concat(linspace(ecm, eu, N2 + 1).slice(1)), sg = standardGrid(gam, eu), n = e.length; return eplAt(e[n - 1], sg[n - 1]).epl - eplAt(e[n - 2], sg[n - 2]).epl; };
    function findEu(gam) {
      let lo = Math.max(0.0035, ecm * 1.0001), x = lo + 1e-5;
      if (!(tolAt(gam, x) > 1e-10)) return x;               // já estagnado no primeiro teste
      for (;;) {
        lo = x; x = x + Math.max(1e-5, x * 0.0005);
        if (x > 50) throw new CCGenError('Kratzig–Polling: the plastic strain keeps increasing up to ε = 50; no ε_u was found.', 'V6');
        if (!(tolAt(gam, x) > 1e-10)) break;
      }
      let hi = x; for (let k = 0; k < 40 && hi - lo > 1e-6; k++) { const m = 0.5 * (lo + hi); if (tolAt(gam, m) > 1e-10) lo = m; else hi = m; }
      return hi;
    }
    function evalRho(rho) {
      const gam = gamOf(rho); if (gam == null) return null;
      const eu = findEu(gam), e = linspace(ec0, ecm, N1 + 1).concat(linspace(ecm, eu, N2 + 1).slice(1)), sg = standardGrid(gam, eu);
      let sum = 0, cnt = 0;
      for (let i = 1; i < e.length; i++) { const q = eplAt(e[i], sg[i]); if (q.ein > 1e-12 && isFinite(q.epl)) { sum += q.epl / q.ein; cnt++; } }
      return cnt ? { rn: sum / cnt, gam, eu } : null;
    }
    let rho = o.kraRho0, sol = null, it = 0;
    for (it = 1; it <= o.kraMaxIter; it++) {
      const ev = evalRho(rho); if (!ev) break;
      if (Math.abs(ev.rn - rho) < o.kraTol) { sol = { rho, ev }; break; }
      rho += o.kraRelax * (ev.rn - rho);
    }
    if (!sol) {   // varredura de ρ e bisseção; senão, melhor compromisso
      const h = (r) => { const ev = evalRho(r); return ev ? { v: ev.rn - r, ev } : null; };
      let prev = null, best = null;
      for (let r = 0.02; r <= 1.0001 && !sol; r += 0.02) {
        const cur = h(r);
        if (cur && cur.ev.rn > 0 && cur.ev.rn <= 1 && (!best || Math.abs(cur.v) < Math.abs(best.v))) best = { r, v: cur.v, ev: cur.ev };
        if (cur && prev && prev.h.v * cur.v <= 0) {
          let lo = prev.r, hi = r, hl = prev.h.v;
          for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi), hm = h(m); if (!hm) break; if (hl * hm.v <= 0) hi = m; else { lo = m; hl = hm.v; } }
          const rr = 0.5 * (lo + hi), hh = h(rr); if (hh && Math.abs(hh.v) < 10 * o.kraTol) { sol = { rho: rr, ev: hh.ev }; it = -1; }
        }
        prev = cur ? { r, h: cur } : null;
      }
      if (!sol && best) sol = { rho: best.r, ev: best.ev, residual: best.v };
    }
    if (!sol) {
      if (gamOf(0.5) == null) throw new CCGenError('Kratzig–Polling: the denominator of γ_c is not positive. l_eq = ' + leq + ' mm is too large for G_ch = ' + Gch.toFixed(2) + ' N/mm (risk of snap-back).', 'V6');
      throw new CCGenError('Kratzig–Polling: no consistent ρ was found for l_eq = ' + leq + ' mm.', 'V6');
    }
    rho = sol.rho;
    if (!(rho > 0 && rho <= 1)) throw new CCGenError('Kratzig–Polling: ρ = ' + rho.toFixed(3) + ' is outside (0, 1]. l_eq = ' + leq + ' mm is too large for G_ch.', 'V6');
    const { gam, eu } = sol.ev, s3 = s3Of(gam), f = (e) => e <= ecm ? s2(e) : s3(e);
    const a = assemble(p, f, ecm, eu, o.Na, o.Nd);
    let A = 0; for (let i = 2; i < a.eps.length; i++) { const e1 = a.eps[i] - a.sigma[i] / E0, e0 = a.eps[i - 1] - (i === 2 ? a.sigma[1] / E0 : a.sigma[i - 1] / E0); A += 0.5 * (a.sigma[i] + a.sigma[i - 1]) * (e1 - e0); }
    const warn = sol.residual != null ? 'Krätzig–Pölling: the consistency condition for ρ has no exact solution for l_eq = ' + leq + ' mm (best compromise ρ = ' + rho.toFixed(2) + ', residual ' + sol.residual.toFixed(2) + '). Check V5.' : undefined;
    return Object.assign(a, { ecm, eu, capped: false, info: { warn, limit: 'plastic', rho, gamma: gam, iterations: it, a: ap.a, lambda: ap.lam, gch: g, energyFraction: A / g } });
  }

  /** Curva de compressão. p = propriedades; o = opções; leq em mm. Retorna { eps, sigma, ein, ecm, eu, capped, info }, com eps[0] = 0 e eps[1] = ε_c0. */

  /** Curva experimental em deformação total. spec: {rows: [[x, σ], …], kind: 'total' | 'inelastic'}. */
  C.expCurve = function (p, spec) {
    if (spec && spec.err) throw new CCGenError('Experimental compression data: ' + spec.err, 'EXP');
    const rows = spec && spec.rows;
    if (!rows || rows.length < 3) throw new CCGenError('Experimental compression data: at least 3 points (strain, stress) are needed.', 'EXP');
    for (let i = 0; i < rows.length; i++) {
      if (!(rows[i][0] >= 0 && rows[i][1] >= 0)) throw new CCGenError('Experimental compression data: strains and stresses must be non-negative (compression positive); check line ' + (i + 1) + '.', 'EXP');
      if (i && !(rows[i][0] > rows[i - 1][0])) throw new CCGenError('Experimental compression data: the strain must increase from line to line (line ' + (i + 1) + ').', 'EXP');
    }
    return { eps: rows.map((r) => (spec.kind === 'inelastic' ? r[0] + r[1] / p.E0 : r[0])), sigma: rows.map((r) => r[1]) };
  };
  /** Dados experimentais: limite elástico das propriedades e depois os pontos do usuário. */
  function experimental(p, spec) {
    const d = C.expCurve(p, spec), E0 = p.E0, eps = [0, p.ec0], sig = [0, E0 * p.ec0];
    let last = 0;
    for (let i = 0; i < d.eps.length; i++) {
      if (!(d.eps[i] > p.ec0)) continue;
      const sg = Math.min(d.sigma[i], E0 * d.eps[i]), ein = d.eps[i] - sg / E0;
      if (ein > last + 1e-12) { eps.push(d.eps[i]); sig.push(sg); last = ein; }
    }
    if (eps.length < 4) throw new CCGenError('Experimental compression data: fewer than 2 usable points after the elastic limit ε_c0 = ' + p.ec0.toExponential(3) + '.', 'EXP');
    let k = 1; for (let i = 1; i < sig.length; i++) if (sig[i] > sig[k]) k = i;
    return { eps, sigma: sig, ecm: eps[k], eu: eps[eps.length - 1], capped: false, fm: sig[k], info: { limit: 'data' } };
  }
  C.build = function (p, model, opts, leq, exp) {
    const o = Object.assign({}, C.DEFAULTS, opts || {});
    if (!C.MODELS[model]) throw new CCGenError('Unknown compression model: ' + model, 'MODEL');
    const r = model === 'exp' ? experimental(p, exp) : model === 'kra' ? (o.kraMode === 'energy' ? kratzigEnergy(p, o, leq) : kratzigPlastic(p, o, leq)) : analytic(p, model, o);
    r.ein = r.eps.map((e, i) => (i < 2 ? 0 : e - r.sigma[i] / p.E0));
    r.model = model;
    return r;
  };
  G.compression = C;
})(globalThis.CCGen = globalThis.CCGen || {});
