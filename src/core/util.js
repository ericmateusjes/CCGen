/* CCGen núcleo: utilidades. Script simples (sem módulos), para rodar em file:// e no Node. */
(function (G) {
  'use strict';
  const U = {};
  U.VERSION = '1.0.0';

  class CCGenError extends Error {
    constructor(message, code) { super(message); this.name = 'CCGenError'; this.code = code || 'ERROR'; }
  }
  U.CCGenError = CCGenError;

  /** n pontos de a até b. */
  U.linspace = function (a, b, n) {
    const out = new Array(n);
    if (n === 1) { out[0] = a; return out; }
    for (let i = 0; i < n; i++) out[i] = a + (b - a) * i / (n - 1);
    out[n - 1] = b;
    return out;
  };
  /** Integral trapezoidal de y dx. */
  U.trapz = function (x, y) {
    let s = 0;
    for (let i = 1; i < x.length; i++) s += 0.5 * (y[i] + y[i - 1]) * (x[i] - x[i - 1]);
    return s;
  };
  U.max = function (a) { let m = -Infinity; for (const v of a) if (v > m) m = v; return m; };
  U.min = function (a) { let m = Infinity; for (const v of a) if (v < m) m = v; return m; };
  U.mean = function (a) { let s = 0; for (const v of a) s += v; return s / a.length; };
  U.isNum = function (v) { return typeof v === 'number' && isFinite(v); };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  /** Interpolação linear de y(x) em xq (x crescente). */
  U.interp = function (x, y, xq) {
    if (xq <= x[0]) return y[0];
    if (xq >= x[x.length - 1]) return y[y.length - 1];
    let lo = 0, hi = x.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (x[m] <= xq) lo = m; else hi = m; }
    const t = (xq - x[lo]) / (x[hi] - x[lo]);
    return y[lo] + t * (y[hi] - y[lo]);
  };
  /** Lê texto colado de duas colunas (Excel, CSV); aceita vírgula decimal e ignora cabeçalho. */
  U.parseTable = function (text) {
    const rows = []; let started = false;
    String(text || '').split(/\r?\n/).forEach((ln, k) => {
      const t = ln.trim(); if (!t) return;
      let parts;
      if (/[;\t]/.test(t)) parts = t.split(/[;\t]+/).map((q) => q.trim().replace(',', '.'));
      else if (/\s/.test(t)) parts = t.split(/\s+/).map((q) => q.replace(',', '.'));
      else parts = t.split(',').map((q) => q.trim());
      parts = parts.filter((q) => q !== '');
      const v = parts.map(Number);
      if (parts.length >= 2 && isFinite(v[0]) && isFinite(v[1])) { rows.push([v[0], v[1]]); started = true; }
      else if (started) throw new CCGenError('Line ' + (k + 1) + ' is not a pair of numbers: "' + t.slice(0, 40) + '".', 'EXP');
    });
    return rows;
  };
  G.util = U;
})(globalThis.CCGen = globalThis.CCGen || {});
