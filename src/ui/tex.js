/* CCGen: conversor simples de TeX para MathML (aba Documentation). */
(function (G) {
  'use strict';
  const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', varepsilon: 'ε', epsilon: 'ϵ', eta: 'η', theta: 'θ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ',
    phi: 'φ', psi: 'ψ', omega: 'ω', Delta: 'Δ', Gamma: 'Γ', Omega: 'Ω', Sigma: 'Σ' };
  const OPS = { cdot: '·', times: '×', le: '≤', leq: '≤', ge: '≥', geq: '≥', approx: '≈', ne: '≠', neq: '≠', pm: '±', infty: '∞', to: '→', rightarrow: '→', Rightarrow: '⇒', partial: '∂', ldots: '…', cdots: '⋯', prime: '′', circ: '°', sim: '∼', propto: '∝', mid: '∣' };
  const FUNCS = ['exp', 'ln', 'log', 'max', 'min', 'sin', 'cos', 'tan', 'arg', 'lim'];
  const BIG = { sum: '∑', int: '∫', prod: '∏' };
  const SPACE = { ',': '0.17em', ':': '0.22em', ';': '0.28em', quad: '1em', qquad: '2em', ' ': '0.28em', '!': '-0.17em' };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function tokenize(s) {
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') {
        const m = /^\\([A-Za-z]+|.)/.exec(s.slice(i)); t.push({ k: 'cmd', v: m[1] }); i += m[0].length;
      } else if (/\s/.test(c)) { t.push({ k: 'sp' }); i++; }
      else if (/[0-9]/.test(c)) { const m = /^[0-9]+(\.[0-9]+)?/.exec(s.slice(i)); t.push({ k: 'num', v: m[0] }); i += m[0].length; }
      else { t.push({ k: 'ch', v: c }); i++; }
    }
    return t;
  }

  function parse(tokens) {
    let p = 0;
    const skipSp = () => { while (tokens[p] && tokens[p].k === 'sp') p++; };
    const isCh = (v) => { skipSp(); return tokens[p] && tokens[p].k === 'ch' && tokens[p].v === v; };
    const isCmd = (v) => { skipSp(); return tokens[p] && tokens[p].k === 'cmd' && tokens[p].v === v; };
    const row = (xs) => (xs.length === 1 ? xs[0] : '<mrow>' + xs.join('') + '</mrow>');

    function group() {            // após "{"
      const xs = [];
      while (p < tokens.length && !isCh('}')) xs.push(...seq());
      p++;                         // '}'
      return xs;
    }
    function rawText() {          // {texto} de \text e \mathrm
      if (!isCh('{')) throw new Error('Expected { after \\text');
      p++; let s = '';
      while (p < tokens.length && !(tokens[p].k === 'ch' && tokens[p].v === '}')) { const t = tokens[p++]; s += t.k === 'sp' ? ' ' : t.k === 'cmd' ? (t.v === ' ' ? ' ' : (t.v === ',' ? '\u2009' : '')) : t.v; }
      p++; return s;
    }
    function arg() {              // argumento: {…} ou um símbolo
      if (isCh('{')) { p++; return row(group()); }
      return atom(false);
    }
    function atom() {
      skipSp();
      const t = tokens[p++];
      if (!t) return '<mrow/>';
      if (t.k === 'num') return '<mn>' + t.v + '</mn>';
      if (t.k === 'ch') {
        const c = t.v;
        if (c === '{') return row(group());
        if (/[A-Za-z]/.test(c)) return '<mi>' + c + '</mi>';
        if (c === '-') return '<mo>−</mo>';
        if (c === '*') return '<mo>∗</mo>';
        if ('()[]'.includes(c)) return '<mo stretchy="false">' + c + '</mo>';
        if (c === ',') return '<mo>,</mo>';
        if (c === '|') return '<mo stretchy="false">|</mo>';
        if (c === '~') return '<mspace width="0.28em"/>';
        if (c === '.') return '<mo>.</mo>';
        return '<mo>' + esc(c) + '</mo>';
      }
      const v = t.v;
      if (GREEK[v]) return '<mi>' + GREEK[v] + '</mi>';
      if (OPS[v]) return '<mo>' + OPS[v] + '</mo>';
      if (FUNCS.includes(v)) return '<mi>' + v + '</mi>';
      if (BIG[v]) return '<mo largeop="true">' + BIG[v] + '</mo>';
      if (SPACE[v] != null) return '<mspace width="' + SPACE[v] + '"/>';
      if (v === 'frac' || v === 'dfrac') { const a = arg(), b = arg(); return '<mfrac>' + a + b + '</mfrac>'; }
      if (v === 'sqrt') { if (isCh('[')) { p++; const n = []; while (!isCh(']')) n.push(...seq()); p++; const b = arg(); return '<mroot>' + b + row(n) + '</mroot>'; } return '<msqrt>' + arg() + '</msqrt>'; }
      if (v === 'text' || v === 'textrm') return '<mtext>' + esc(rawText()).replace(/ /g, ' ') + '</mtext>';
      if (v === 'mathrm' || v === 'operatorname') { const s = rawText(); return s.length === 1 ? '<mi mathvariant="normal">' + esc(s) + '</mi>' : '<mi>' + esc(s) + '</mi>'; }
      if (v === 'mathbf' || v === 'boldsymbol') { const a = arg(); return '<mstyle mathvariant="bold">' + a + '</mstyle>'; }
      if (v === 'hat' || v === 'bar' || v === 'tilde' || v === 'overline') { const a = arg(); const ch = { hat: '^', bar: '¯', tilde: '~', overline: '¯' }[v]; return '<mover accent="true">' + a + '<mo>' + ch + '</mo></mover>'; }
      if (v === 'left') {
        const o = delim(); const xs = [];
        while (p < tokens.length && !isCmd('right')) xs.push(...seq());
        p++; const c = delim();
        return '<mrow>' + (o ? '<mo fence="true" stretchy="true">' + o + '</mo>' : '') + xs.join('') + (c ? '<mo fence="true" stretchy="true">' + c + '</mo>' : '') + '</mrow>';
      }
      if (v === 'begin') {
        const env = rawText();
        if (env === 'cases') return cases();
        throw new Error('Unsupported environment: ' + env);
      }
      if (v === '{' || v === '}') return '<mo stretchy="false">' + v + '</mo>';
      if (v === '%') return '<mo>%</mo>';
      if (v === '&' || v === '|') return '<mo>' + v + '</mo>';
      if (v === 'tag') { rawText(); return ''; }
      throw new Error('Unsupported TeX command: \\' + v);
    }
    function delim() {
      const t = tokens[p++]; if (!t) return '';
      if (t.k === 'ch') return t.v === '.' ? '' : esc(t.v);
      if (t.v === '{') return '{'; if (t.v === '}') return '}'; if (t.v === '|') return '‖';
      throw new Error('Bad delimiter');
    }
    function cases() {
      const rows = []; let cur = [[]];
      while (p < tokens.length && !(isCmd('end'))) {
        if (isCh('&')) { p++; cur.push([]); continue; }
        if (isCmd('\\')) { p++; rows.push(cur); cur = [[]]; continue; }
        cur[cur.length - 1].push(...seq());
      }
      p++; rawText();                // \end{cases}
      if (cur.some((c) => c.length)) rows.push(cur);
      const body = rows.map((r) => '<mtr>' + r.map((c) => '<mtd columnalign="left">' + row(c.length ? c : ['<mrow/>']) + '</mtd>').join('') + '</mtr>').join('');
      return '<mrow><mo fence="true" stretchy="true">{</mo><mtable columnalign="left left" columnspacing="1.2em" rowspacing="0.4em">' + body + '</mtable></mrow>';
    }
    function seq() {              // átomo com índices
      let base = atom();
      const bt = tokens[p - 1];
      const limits = bt && bt.k === 'cmd' && (bt.v === 'sum' || bt.v === 'prod' || bt.v === 'lim');
      let sub = null, sup = null;
      for (;;) {
        if (isCh('^') && sup == null) { p++; sup = arg(); }
        else if (isCh('_') && sub == null) { p++; sub = arg(); }
        else if (isCh("'")) { p++; sup = sup == null ? '<mo>′</mo>' : sup; }
        else break;
      }
      if (sub != null || sup != null) return [wrap(base, sub, sup, limits)];
      if (/<mo>⁡<\/mo>$/.test(base)) { const m = /^(<mi>.*?<\/mi>)(<mo>⁡<\/mo>)$/.exec(base); if (m) return [m[1], m[2]]; }
      return [base];
    }
    function wrap(base, sub, sup, limits) {
      if (sub != null && sup != null) return (limits ? '<munderover>' : '<msubsup>') + base + sub + sup + (limits ? '</munderover>' : '</msubsup>');
      if (sub != null) return (limits ? '<munder>' : '<msub>') + base + sub + (limits ? '</munder>' : '</msub>');
      return '<msup>' + base + sup + '</msup>';
    }
    const out = [];
    while (p < tokens.length) out.push(...seq());
    return out;
  }

  /** TeX → <math>. */
  function toMathML(tex, display) {
    let body;
    try { body = parse(tokenize(tex)).join(''); }
    catch (e) { return '<span class="texerr" title="' + esc(e.message) + '">' + esc(tex) + '</span>'; }
    return '<math' + (display ? ' display="block"' : '') + ' xmlns="http://www.w3.org/1998/Math/MathML"><mrow>' + body + '</mrow></math>';
  }
  G.tex = { toMathML };
})(globalThis.CCGen = globalThis.CCGen || {});
