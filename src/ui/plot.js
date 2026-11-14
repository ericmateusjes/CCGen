/* CCGen: gráfico SVG simples, sem dependências, com leitura ao passar o mouse. */
(function (G) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg', W = 560, H = 380, M = { l: 84, r: 16, t: 12, b: 58 };
  let uid = 0;
  function el(n, a, p) { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function niceTicks(a, b, n) {
    if (!(b > a)) b = a + 1;
    const raw = (b - a) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, t = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return { ticks: t, step };
  }
  function tickFmt(ticks, step) {
    const mx = Math.max.apply(null, ticks.map(Math.abs));
    if (mx !== 0 && (mx < 1e-2 || mx >= 1e5)) return (v) => (v === 0 ? '0' : v.toExponential(1).replace('e+', 'e'));
    const dec = Math.min(8, Math.max(0, -Math.floor(Math.log10(step))));
    return (v) => v.toFixed(dec);
  }
  // marcação: "ε_c^in" → subscrito c e sobrescrito in; "d_{c,max}" para índices longos
  function tokens(str) { const out = []; const re = /([_^])(\{[^}]+\}|[A-Za-z0-9,]+)/g; let i = 0, m; while ((m = re.exec(str))) { if (m.index > i) out.push([0, str.slice(i, m.index)]); out.push([m[1] === '_' ? 1 : -1, m[2].replace(/[{}]/g, '')]); i = re.lastIndex; } if (i < str.length) out.push([0, str.slice(i)]); return out; }
  function html(str) { return tokens(str).map(([k, t]) => (k === 0 ? t : k === 1 ? '<sub>' + t + '</sub>' : '<sup>' + t + '</sup>')).join(''); }
  function svgText(node, str) {
    let cur = 0; node.textContent = '';
    tokens(str).forEach(([k, t]) => { const ts = document.createElementNS(NS, 'tspan'), sh = k === 0 ? 0 : k === 1 ? 4 : -5; ts.textContent = t; if (sh !== cur) ts.setAttribute('dy', sh - cur); if (k) ts.setAttribute('font-size', '11.5'); cur = sh; node.appendChild(ts); });
  }
  function val(v) { const a = Math.abs(v); return v === 0 ? '0' : (a < 1e-2 || a >= 1e5) ? v.toExponential(3) : String(+v.toPrecision(4)); }

  /** o: {title, xLabel, yLabel, onHover(série, ponto) → {series, text} | null} */
  function Plot(host, o) {
    this.o = o; this.series = []; this.id = 'pc' + (++uid);
    host.classList.add('plot');
    const head = document.createElement('div'); head.className = 'plot-head';
    const t = document.createElement('span'); t.className = 'plot-title'; t.innerHTML = html(o.title); head.appendChild(t);
    host.appendChild(head);
    this.svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'svg', role: 'img', 'aria-label': o.title });
    host.appendChild(this.svg);
    this.bind();
  }
  Plot.prototype.set = function (series) { this.series = series.filter((s) => s && s.x && s.x.length); this.draw(); };
  Plot.prototype.extent = function () {
    let x0 = 0, x1 = -Infinity, y0 = 0, y1 = -Infinity;
    this.series.forEach((s) => { for (let i = 0; i < s.x.length; i++) { if (isFinite(s.x[i]) && isFinite(s.y[i])) { x0 = Math.min(x0, s.x[i]); x1 = Math.max(x1, s.x[i]); y0 = Math.min(y0, s.y[i]); y1 = Math.max(y1, s.y[i]); } } });
    if (!isFinite(x1)) { x1 = 1; y1 = 1; }
    if (x1 === x0) x1 = x0 + 1; if (y1 === y0) y1 = y0 + 1;
    return { x0, x1: x1 + 0.03 * (x1 - x0), y0, y1: y1 + 0.06 * (y1 - y0) };
  };
  function path(s, X, Y) { let d = ''; for (let i = 0; i < s.x.length; i++) { if (!isFinite(s.x[i]) || !isFinite(s.y[i])) continue; d += (d ? 'L' : 'M') + X(s.x[i]).toFixed(1) + ' ' + Y(s.y[i]).toFixed(1); } return d; }
  Plot.prototype.draw = function () {
    const svg = this.svg, v = this.extent();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const pw = W - M.l - M.r, ph = H - M.t - M.b;
    const X = (x) => M.l + (x - v.x0) / (v.x1 - v.x0) * pw, Y = (y) => M.t + ph - (y - v.y0) / (v.y1 - v.y0) * ph;
    this.map = { v, pw, ph, X, Y };
    const cp = el('clipPath', { id: this.id }, el('defs', {}, svg)); el('rect', { x: M.l - 4, y: M.t - 4, width: pw + 8, height: ph + 8 }, cp);
    const tx = niceTicks(v.x0, v.x1, 5), ty = niceTicks(v.y0, v.y1, 6), fx = tickFmt(tx.ticks, tx.step), fy = tickFmt(ty.ticks, ty.step);
    const g = el('g', { class: 'grid' }, svg);
    tx.ticks.forEach((t) => { const x = X(t); el('line', { x1: x, x2: x, y1: M.t, y2: M.t + ph }, g); el('text', { x, y: M.t + ph + 20, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = fx(t); });
    ty.ticks.forEach((t) => { const y = Y(t); el('line', { x1: M.l, x2: M.l + pw, y1: y, y2: y }, g); el('text', { x: M.l - 8, y: y + 5, 'text-anchor': 'end', class: 'tick' }, svg).textContent = fy(t); });
    el('rect', { x: M.l, y: M.t, width: pw, height: ph, class: 'frame' }, svg);
    svgText(el('text', { x: M.l + pw / 2, y: H - 10, 'text-anchor': 'middle', class: 'axl' }, svg), this.o.xLabel);
    const yl = el('text', { transform: 'translate(18,' + (M.t + ph / 2) + ') rotate(-90)', 'text-anchor': 'middle', class: 'axl' }, svg); svgText(yl, this.o.yLabel);
    const cl = el('g', { 'clip-path': 'url(#' + this.id + ')' }, svg);
    this.series.forEach((s) => {
      const col = s.color || 'var(--c0)';
      if (!s.nopath) {
        const i0 = s.extFrom != null ? s.x.findIndex((v) => v >= s.extFrom) : -1;
        if (i0 > 0) {   // contínuo até o prolongamento; tracejado depois
          el('path', { d: path({ x: s.x.slice(0, i0 + 1), y: s.y.slice(0, i0 + 1) }, X, Y), fill: 'none', stroke: col, 'stroke-width': s.width || 1.6, 'stroke-linejoin': 'round' }, cl);
          el('path', { d: path({ x: s.x.slice(i0), y: s.y.slice(i0) }, X, Y), fill: 'none', stroke: col, 'stroke-width': s.width || 1.6, 'stroke-dasharray': '6 4', 'stroke-linejoin': 'round' }, cl);
        } else el('path', { d: path(s, X, Y), fill: 'none', stroke: col, 'stroke-width': s.width || 1.6, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round' }, cl);
      }
      if (s.markers !== false) for (let i = 0; i < s.x.length; i++) el('circle', { cx: X(s.x[i]), cy: Y(s.y[i]), r: s.r || 2.7, fill: col, class: 'mk' }, cl);
    });
    const named = this.series.filter((s) => s.name);
    if (named.length > 1) {
      const lg = el('g', { class: 'legend' }, svg); let yy = M.t + 18;
      named.slice(0, 9).forEach((s) => {
        const txt = el('text', { x: M.l + pw - 34, y: yy, 'text-anchor': 'end' }, lg); txt.textContent = s.name.length > 34 ? s.name.slice(0, 33) + '…' : s.name;
        el('line', { x1: M.l + pw - 30, x2: M.l + pw - 8, y1: yy - 5, y2: yy - 5, stroke: s.color || 'var(--c0)', 'stroke-width': 2.6, 'stroke-dasharray': s.dash || '' }, lg); yy += 18;
      });
    }
    this.extra = el('g', { 'clip-path': 'url(#' + this.id + ')' }, svg);
    this.hover = el('g', { class: 'hover', style: 'display:none' }, svg);
    this.hc = el('circle', { r: 5.5, class: 'hc' }, this.hover);
    this.tipBg = el('rect', { class: 'tipbg', rx: 4, style: 'display:none' }, svg); this.ht = el('text', { class: 'ht' }, svg);
  };
  /** Dica ao lado do ponto. */
  Plot.prototype.setTip = function (lines, px, py) {
    const t = this.ht, bg = this.tipBg; t.textContent = '';
    if (!lines) { bg.style.display = 'none'; return; }
    lines.forEach((ln, k) => { const ts = document.createElementNS(NS, 'tspan'); ts.textContent = ln; ts.setAttribute('x', 0); ts.setAttribute('dy', k ? 17 : 0); t.appendChild(ts); });
    t.setAttribute('transform', 'translate(0,0)'); const bb = t.getBBox(), w = bb.width + 12, h = bb.height + 8;
    let x = px + 12, y = py - h - 4;
    if (x + w > W - M.r) x = px - 12 - w;
    if (x < M.l) x = M.l + 2;
    if (y < M.t) y = py + 12;
    if (y + h > H - M.b) y = H - M.b - h - 2;
    t.setAttribute('transform', 'translate(' + (x + 6 - bb.x) + ',' + (y + 4 - bb.y) + ')');
    bg.setAttribute('x', x); bg.setAttribute('y', y); bg.setAttribute('width', w); bg.setAttribute('height', h); bg.style.display = '';
  };
  Plot.prototype.bind = function () {
    const svg = this.svg, self = this;
    const pt = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    const clear = () => { self.hover.style.display = 'none'; self.setTip(null); while (self.extra.firstChild) self.extra.removeChild(self.extra.firstChild); };
    svg.addEventListener('pointermove', (e) => {
      const p = pt(e), m = self.map;
      if (!m || p.x < M.l || p.x > W - M.r || p.y < M.t || p.y > H - M.b) { clear(); return; }
      let best = null, bd = 1e9;
      self.series.forEach((s, si) => { if (s.nohover) return; for (let i = 0; i < s.x.length; i++) { const dx = m.X(s.x[i]) - p.x, dy = m.Y(s.y[i]) - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { s, si, i }; } } });
      while (self.extra.firstChild) self.extra.removeChild(self.extra.firstChild);
      if (best && bd < 60 * 60) {
        const s = best.s, i = best.i; self.hover.style.display = ''; self.hc.setAttribute('cx', m.X(s.x[i])); self.hc.setAttribute('cy', m.Y(s.y[i]));
        const lines = [(s.name ? s.name + ': ' : '') + '(' + val(s.x[i]) + ', ' + val(s.y[i]) + ')'];
        const ex = self.o.onHover ? self.o.onHover(best.si, i) : null;
        if (ex) {
          ex.series.forEach((q) => { el('path', { d: path(q, m.X, m.Y), fill: 'none', stroke: q.color || 'var(--c3)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, self.extra); q.x.forEach((x, k) => el('circle', { cx: m.X(x), cy: m.Y(q.y[k]), r: 4, fill: q.color || 'var(--c3)' }, self.extra)); });
          if (ex.text) lines.push(ex.text);
        }
        self.setTip(lines, m.X(s.x[i]), m.Y(s.y[i]));
      } else clear();
    });
    svg.addEventListener('pointerleave', clear);
  };
  Plot.html = html;
  G.Plot = Plot;
})(globalThis.CCGen = globalThis.CCGen || {});
