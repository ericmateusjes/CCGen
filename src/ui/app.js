/* CCGen: controlador da interface. */
(function () {
  'use strict';
  const G = globalThis.CCGen, $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const COLORS = ['var(--c0)', 'var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
  const st = { res: null, snaps: [] };
  const num = (el) => { const v = Number(String(el.value).trim().replace(',', '.')); return el.value.trim() === '' ? NaN : v; };
  const sup = (s) => s;

  // ---------- controles
  const fill = (sel, obj) => { const s = $(sel); Object.keys(obj).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = obj[k]; s.appendChild(o); }); };
  fill('#method', G.properties.METHODS); fill('#compModel', G.compression.MODELS); fill('#tensModel', G.tension.MODELS);
  fill('#compDamage', G.damage.METHODS); fill('#tensDamage', G.damage.METHODS);
  G.properties.AGGREGATES.forEach((a) => { const o = document.createElement('option'); o.value = a.alphaE; o.textContent = a.label; $('#agg').appendChild(o); });
  $('#agg').value = '1'; $('#method').value = 'fib'; $('#compModel').value = 'kra'; $('#tensModel').value = 'cor'; $('#compDamage').value = 'alf'; $('#tensDamage').value = 'alf';   // padrões
  const PROPS = [['fcm', 'f<sub>cm</sub>', 'MPa'], ['fc0', 'f<sub>c0</sub>', 'MPa'], ['ftm', 'f<sub>tm</sub>', 'MPa'], ['Eci', 'E<sub>ci</sub>', 'MPa'], ['E0', 'E<sub>0</sub>', 'MPa'], ['GF', 'G<sub>F</sub>', 'N/mm'], ['Gch', 'G<sub>ch</sub>', 'N/mm']];
  PROPS.forEach(([k, lab, u]) => {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td>' + lab + ' <span class="u">' + u + '</span></td><td><input type="checkbox" id="a_' + k + '" checked aria-label="Automatic ' + k + '"></td><td><input type="text" id="p_' + k + '" inputmode="decimal" readonly></td>';
    $('#propsTable tbody').appendChild(tr);
  });
  const ADV = [['Na', 'Points, ascending branch (compression)', 14, 'int'], ['Nd', 'Points, descending branch (compression)', 34, 'int'], ['Nt', 'Points, tension', 50, 'int'],
    ['sigmaLim', 'Stress limit σ<sub>lim</sub>/f<sub>cm</sub> (0 = off)', 0.05], ['epsMax', 'Strain limit ε<sub>max</sub>', 0.02], ['dmax', 'd<sub>max</sub>', 0.99],
    ['bc', 'b<sub>c</sub> (Birtel–Mark)', 0.7], ['bt', 'b<sub>t</sub> (Birtel–Mark)', 0.1], ['hogEu', 'ε<sub>u</sub> Hognestad', 0.0038], ['hogEcm', 'ε<sub>cm</sub> Hognestad (blank = 2f<sub>cm</sub>/E<sub>0</sub>)', '']];
  ADV.forEach(([k, lab, v]) => { const d = document.createElement('div'); d.className = 'row'; d.innerHTML = '<label for="o_' + k + '">' + lab + '</label><input type="text" id="o_' + k + '" inputmode="decimal" value="' + v + '">'; $('#adv').appendChild(d); });
  Object.keys(G.exporter.UNITS).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = G.exporter.UNITS[k].label; $('#fUnit').appendChild(o); });
  [['ecm', 'ε<sub>cm</sub>', 'strain at f<sub>cm</sub>'], ['ecu', 'ε<sub>cu</sub>', 'end of the curve']].forEach(([k, lab, tip]) => {
    const tr = document.createElement('tr'); tr.title = 'Depends on the compression model (' + tip + '). Change it in Settings (⚙).';
    tr.innerHTML = '<td>' + lab + ' <span class="u">–</span></td><td></td><td><input type="text" id="p_' + k + '" readonly></td>';
    $('#propsTable tbody').appendChild(tr);
  });
  const presets = G.exporter.CDP_PRESETS;
  Object.keys(presets).forEach((k) => { const o = document.createElement('option'); o.value = k; o.textContent = presets[k].label; $('#ePreset').appendChild(o); });
  const setPreset = () => { const p = presets[$('#ePreset').value]; $('#ePsi').value = p.psi; $('#eEcc').value = p.ecc; $('#eFb').value = p.fb0fc0; $('#eK').value = +p.K.toFixed(4); $('#eVis').value = p.visc; };
  setPreset();

  // ---------- configuração ↔ interface
  function readCfg() {
    const cfg = { fck: num($('#fck')), method: $('#method').value, alphaE: Number($('#agg').value), leq: num($('#leq')), overrides: {},
      compModel: $('#compModel').value, compDamage: $('#compDamage').value, tensModel: $('#tensModel').value, tensDamage: $('#tensDamage').value, opts: {} };
    PROPS.forEach(([k]) => { if (!$('#a_' + k).checked) { const v = num($('#p_' + k)); if (isFinite(v)) cfg.overrides[k] = v; } });
    ADV.forEach(([k, , , t]) => { const v = num($('#o_' + k)); if (k === 'hogEcm') cfg.opts[k] = isFinite(v) ? v : null; else if (isFinite(v)) cfg.opts[k] = t === 'int' ? Math.round(v) : v; });
    cfg.opts.extend = $('#extend').checked;
    cfg.exp = { comp: readExp('xc'), tens: readExp('xt') };
    return cfg;
  }
  function readExp(id) {
    const q = { kind: $('#' + id + 'Kind').value, rows: null }, txt = $('#' + id + 'Text').value;
    try { q.rows = G.util.parseTable(txt); } catch (e) { q.err = e.message; }
    return q;
  }
  function writeExp(id, q) {
    $('#' + id + 'Kind').value = q && q.kind || $('#' + id + 'Kind').options[0].value;
    $('#' + id + 'Text').value = q && q.rows ? q.rows.map((r) => r.join('\t')).join('\n') : '';
  }
  function expInfo() {
    [['xc', st.res.cfg.exp && st.res.cfg.exp.comp], ['xt', st.res.cfg.exp && st.res.cfg.exp.tens]].forEach(([id, q]) => {
      $('#' + id + 'Info').textContent = !q ? '' : q.err ? q.err : q.rows && q.rows.length ? q.rows.length + ' points read.' : 'No data.';
    });
  }
  function extVis() { $('#extRow').style.display = ['nbr', 'ec2', 'fibmc'].includes($('#compModel').value) ? '' : 'none'; }
  function writeCfg(c) {
    const m = G.pipeline.merge(c);
    $('#fck').value = m.fck; $('#method').value = m.method; $('#agg').value = String(m.alphaE); $('#leq').value = m.leq;
    ['compModel', 'compDamage', 'tensModel', 'tensDamage'].forEach((k) => { $('#' + k).value = m[k]; });
    PROPS.forEach(([k]) => { const has = m.overrides[k] != null; $('#a_' + k).checked = !has; $('#p_' + k).readOnly = !has; if (has) $('#p_' + k).value = m.overrides[k]; });
    ADV.forEach(([k]) => { $('#o_' + k).value = m.opts[k] == null ? '' : m.opts[k]; });
    $('#extend').checked = m.opts.extend !== false; extVis();
    writeExp('xc', m.exp && m.exp.comp); writeExp('xt', m.exp && m.exp.tens);
  }
  // ---------- execução
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(update, 120); };
  $('#ver').textContent = 'v' + G.util.VERSION;
  function update() {
    extVis();
    st.res = G.pipeline.run(readCfg());
    render();
  }
  const fmtOpts = () => ({ sep: $('#fSep').value, notation: $('#fNot').value, dec: $('#fDec').value === 'comma' ? 'comma' : 'point', digits: Math.min(12, Math.max(2, Math.round(num($('#fDig'))) || 6)) });

  // ---------- exibição
  const plots = {};
  function mk(id, title, xl, yl, onHover) { plots[id] = new G.Plot($('#' + id), { title, xLabel: xl, yLabel: yl, onHover }); }
  const unload = (o, xs, off) => (si, i) => {
    const q = o(), j = i - (off || 0);
    if (si !== 0 || !q || j < 0) return null;
    return { series: [{ x: [xs(q)[j], q.epl[j]], y: [q.sigma[j], 0] }], text: 'unloading → ε^pl = ' + q.epl[j].toExponential(3) + ', d = ' + q.d[j].toFixed(3) };
  };
  mk('c1', 'σ_c – ε_c', 'ε_c (–)', 'σ_c (MPa)', unload(() => st.res && st.res.comp, (q) => q.eps));
  mk('c2', 'd_c – ε_c^ch', 'ε_c^ch (–)', 'd_c (–)');
  mk('t1', 'σ_t – ε_t', 'ε_t (–)', 'σ_t (MPa)', unload(() => st.res && st.res.tens, (q) => q.et, 1));
  mk('t2', 'd_t – ε_t^ck', 'ε_t^ck (–)', 'd_t (–)');
  mk('m1', 'Compression: σ_c – ε_c', 'ε_c (–)', 'σ_c (MPa)'); mk('m2', 'Compression: d_c – ε_c^ch', 'ε_c^ch (–)', 'd_c (–)');
  mk('m3', 'Tension: σ_t – ε_t', 'ε_t (–)', 'σ_t (MPa)'); mk('m4', 'Tension: d_t – ε_t^ck', 'ε_t^ck (–)', 'd_t (–)');

  function expSeries(r) {   // pontos experimentais sobre as curvas
    const out = { c: null, t: null }, ex = r.cfg.exp;
    if (!r.props || !ex) return out;
    const sty = { color: 'var(--c3)', nopath: true, r: 3.2, nohover: true };
    try { if (ex.comp && ex.comp.rows && ex.comp.rows.length) { const q = G.compression.expCurve(r.props, ex.comp); out.c = Object.assign({ x: q.eps, y: q.sigma }, sty); } } catch (e) { /* aparece no aviso ao selecionar o modelo */ }
    try { if (ex.tens && ex.tens.rows && ex.tens.rows.length) { const q = G.tension.expCurve(r.props, ex.tens, r.cfg.leq); out.t = Object.assign({ x: q.et, y: q.sigma }, sty); } } catch (e) { /* idem */ }
    return out;
  }
  function renderCurves() {
    const r = st.res, c = r.comp, t = r.tens, xs = expSeries(r);
    if (c) { plots.c1.set([{ x: c.eps, y: c.sigma, color: 'var(--c0)', extFrom: c.info && c.info.ext ? c.info.extFrom : null }, xs.c]); plots.c2.set([{ x: c.ein.slice(1), y: c.d.slice(1), color: 'var(--c0)' }]); } else { plots.c1.set([xs.c]); plots.c2.set([]); }
    if (t) { plots.t1.set([{ x: [0].concat(t.et), y: [0].concat(t.sigma), color: 'var(--c1)' }, xs.t]); plots.t2.set([{ x: t.eck, y: t.d, color: 'var(--c1)' }]); } else { plots.t1.set([xs.t]); plots.t2.set([]); }
    $('#limNote').innerHTML = (r.limitNote || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/([A-Za-zεσ])_([A-Za-z0-9]+)/g, '$1<sub>$2</sub>').replace(/([A-Za-zεσ])\^([A-Za-z]+)/g, '$1<sup>$2</sup>');
  }
  function banner() {
    const r = st.res, b = $('#banner'); b.innerHTML = '';
    r.errors.forEach((e) => { const d = document.createElement('div'); d.className = 'msg error'; d.textContent = (e.id ? e.id + ' · ' : '') + e.msg; b.appendChild(d); });
    const st_ = $('#status'), ne = r.errors.length;
    st_.className = 'badge ' + (ne ? 'err' : 'ok'); st_.textContent = ne ? ne + ' error' + (ne > 1 ? 's' : '') : 'No errors';
    const wb = $('#warnBtn'), nw = r.warnings.length; wb.hidden = !nw; $('#warnCount').textContent = nw; wb.title = nw + ' warning' + (nw > 1 ? 's' : '') + ' – click to read';
    const wl = $('#warnList'); wl.innerHTML = '';
    r.warnings.forEach((m) => { const li = document.createElement('li'); li.className = 'warning'; li.innerHTML = '<span class="id"></span><span></span>'; li.children[0].textContent = m.id; li.children[1].textContent = m.msg; wl.appendChild(li); });
    if (!nw && $('#warnDlg').open) $('#warnDlg').close();
    const pill = $('#chkCount'); pill.textContent = ne || '✓'; pill.className = 'pill ' + (ne ? 'err' : '');
  }
  function props() {
    const r = st.res; if (!r.props) return; const p = r.props;
    PROPS.forEach(([k]) => { const a = $('#a_' + k).checked, inp = $('#p_' + k); inp.readOnly = a; if (a) inp.value = String(+p[k].toPrecision(6)); });
    const fe = (v) => (v == null || !isFinite(v) ? '–' : String(+v.toPrecision(5)));
    $('#p_ecm').value = fe(r.comp && r.comp.ecm); $('#p_ecu').value = fe(r.comp && r.comp.eu);
    $('#derived').innerHTML = 'ε<sub>c0</sub> = f<sub>c0</sub>/E<sub>0</sub> = ' + p.ec0.toExponential(3) + ' · ε<sub>t0</sub> = f<sub>tm</sub>/E<sub>0</sub> = ' + p.et0.toExponential(3);
  }
  function tables() {
    const r = st.res, box = $('#tables'); box.innerHTML = '';
    if (!r.tables) { box.innerHTML = '<p class="hint">Tables are available when the run has no errors.</p>'; return; }
    const o = fmtOpts(), sc = G.exporter.scaled(r, $('#fUnit').value), S = sc.unit.S;
    const defs = [['compHardening', 'Compression hardening', ['σ_c (' + S + ')', 'ε_c^ch (–)']], ['compDamage', 'Compression damage', ['d_c (–)', 'ε_c^ch (–)']], ['tensStiffening', 'Tension stiffening', ['σ_t (' + S + ')', 'ε_t^ck (–)']], ['tensDamage', 'Tension damage', ['d_t (–)', 'ε_t^ck (–)']]];
    const disp = $('#tTens').value === 'displacement';
    if (disp) { defs[2][3] = 'tensStiffeningW'; defs[3][3] = 'tensDamageW'; defs[2][2][1] = defs[3][2][1] = 'w (' + sc.unit.L + ')'; }
    r.tablesText = {};
    defs.forEach(([k, title, h, kd]) => {
      const rows = sc[kd || k], card = document.createElement('div'); card.className = 'card tblcard';
      const txt = G.exporter.tableText(rows, o), xl = G.exporter.tableText(rows, Object.assign({}, o, { sep: 'tab' }));
      const col = (j) => rows.map((q) => G.exporter.fmtD(q[j], o)).join('\n');
      r.tablesText[k] = [title, txt];
      card.innerHTML = '<h3><span>' + title + ' <span class="hint">(' + rows.length + ' rows)</span></span><span class="bt"><button class="mini" type="button" data-a="t">Copy as text</button><button class="mini" type="button" data-a="x">Copy for Abaqus</button></span></h3><div class="scroll"><table class="data"><thead><tr><th>' + G.Plot.html(h[0]) + '<button class="col" type="button" data-c="0" title="Copy this column">⧉</button></th><th>' + G.Plot.html(h[1]) + '<button class="col" type="button" data-c="1" title="Copy this column">⧉</button></th></tr></thead><tbody>' +
        rows.map((q) => '<tr><td>' + G.exporter.fmtD(q[0], o) + '</td><td>' + G.exporter.fmtD(q[1], o) + '</td></tr>').join('') + '</tbody></table></div>';
      $$('button', card).forEach((b) => { b.onclick = () => copy(b.dataset.a === 't' ? txt : b.dataset.a === 'x' ? xl : col(Number(b.dataset.c)), b); });
      box.appendChild(card);
    });
  }
  function checks() {
    const r = st.res, ul = $('#checks'); ul.innerHTML = '';
    const all = r.errors;   // só mensagens de erro
    if (!r.errors.length) { const li = document.createElement('li'); li.className = 'good'; li.innerHTML = '<span class="id">OK</span><span>No errors.</span>'; ul.appendChild(li); }
    all.forEach((m) => { const li = document.createElement('li'); li.className = m.level; li.innerHTML = '<span class="id"></span><span></span>'; li.children[0].textContent = m.id; li.children[1].textContent = m.msg; ul.appendChild(li); });
  }
  function label(r) { const c = r.cfg; return 'C' + c.fck + ' ' + c.compModel + '/' + c.compDamage + ' · ' + c.tensModel + '/' + c.tensDamage + ' · l=' + c.leq; }
  function compare() {
    const r = st.res, all = st.snaps.concat(r.comp && r.tens ? [{ label: 'Current', cur: true, comp: r.comp, tens: r.tens }] : []);
    const mkS = (get) => all.map((s, i) => Object.assign(get(s), { name: s.label, color: s.cur ? 'var(--fg)' : COLORS[s.ci], width: s.cur ? 2.4 : 1.6, markers: !!s.cur }));
    plots.m1.set(mkS((s) => ({ x: s.comp.eps, y: s.comp.sigma }))); plots.m2.set(mkS((s) => ({ x: s.comp.ein.slice(1), y: s.comp.d.slice(1) })));
    plots.m3.set(mkS((s) => ({ x: [0].concat(s.tens.et), y: [0].concat(s.tens.sigma) }))); plots.m4.set(mkS((s) => ({ x: s.tens.eck, y: s.tens.d })));
    const ul = $('#snapList'); ul.innerHTML = '';
    st.snaps.forEach((s, i) => { const li = document.createElement('li'); li.innerHTML = '<span class="sw" style="background:' + COLORS[s.ci] + '"></span><span></span><button class="mini" type="button">Remove</button>'; li.children[1].textContent = s.label; li.children[2].onclick = () => { st.snaps.splice(i, 1); compare(); }; ul.appendChild(li); });
  }
  function exportTab() {
    const r = st.res, out = $('#eOut');
    if (!r.ok || !r.tables) { out.value = '** Export is disabled while the run has errors. See the Checks tab.'; return; }
    try { out.value = G.exporter.inp(r, exportOpts()); } catch (e) { out.value = '** ' + e.message; }
  }
  function exportOpts() {
    const f = fmtOpts(), d = num($('#eRho'));
    return { name: ($('#eName').value.trim() || 'CONCRETE').replace(/[^A-Za-z0-9_-]/g, '_'), nu: num($('#eNu')) || 0.2, density: isFinite(d) && d > 0 ? d : null, tensionType: $('#eTens').value, units: $('#fUnit').value, notation: f.notation, digits: f.digits,
      cdp: { psi: num($('#ePsi')), ecc: num($('#eEcc')), fb0fc0: num($('#eFb')), K: num($('#eK')), visc: num($('#eVis')) } };
  }
  function render() { banner(); expInfo(); props(); renderCurves(); checks(); tables(); compare(); exportTab(); }

  // ---------- auxiliares
  function copy(text, btn) {
    const done = () => { if (btn) { const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = t; }, 1100); } };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignora */ } document.body.removeChild(ta); }
  }
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 500);
  }

  // ---------- eventos
  $('#side').addEventListener('input', (e) => { if (e.target.closest('#propsTable') || e.target.id === 'fck' || e.target.tagName) schedule(); });
  $('#side').addEventListener('change', (e) => {
    const m = /^a_(.+)$/.exec(e.target.id || ''); if (m) { const inp = $('#p_' + m[1]); inp.readOnly = e.target.checked; if (!e.target.checked) inp.focus(); }
    schedule();
  });
  const docs = G.docs.render($('#docNav'), $('#docBody'));
  $$('.tabs button').forEach((b) => { b.onclick = () => { $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b)); $$('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
    if (b.dataset.tab === 'docs') docs.spy(); }; });
  $('#csvAll').onclick = () => {
    const r = st.res; if (!r.tables) return; const f = fmtOpts();
    download('ccgen-tables.csv', '\ufeff' + G.exporter.csv(r, { units: $('#fUnit').value, tensionData: $('#tTens').value, notation: f.notation, digits: f.digits, dec: f.dec }), 'text/csv;charset=utf-8');
  };
  ['xc', 'xt'].forEach((id) => {
    $('#' + id + 'File').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('#' + id + 'Text').value = String(rd.result); schedule(); }; rd.readAsText(f); e.target.value = ''; };
    $('#' + id + 'Clr').onclick = () => { $('#' + id + 'Text').value = ''; schedule(); };
  });
  $('#tab-exp').addEventListener('input', schedule); $('#tab-exp').addEventListener('change', schedule);
  $('#leqCub').onclick = () => { try { const v = G.tools.leqCuboid(num($('#la')), num($('#lb')), num($('#lc'))); $('#leq').value = +v.toPrecision(6); schedule(); } catch (e) { alert('Enter a, b and c (mm).'); } };
  $('#leqVA').onclick = () => { try { const v = G.tools.leqSolid(num($('#lV')), num($('#lA'))); $('#leq').value = +v.toPrecision(6); schedule(); } catch (e) { alert('Enter V and Amax.'); } };
  // comparação e malha
  $('#snap').onclick = () => { const r = st.res; if (!r.comp || !r.tens) return; const cp = (o, keys) => { const q = {}; keys.forEach((k) => { q[k] = o[k].slice(); }); return q; };
    st.snaps.push({ label: label(r), ci: st.snaps.length % 7 === 0 ? 1 : (st.snaps.length % 6) + 1, comp: cp(r.comp, ['eps', 'ein', 'sigma', 'd']), tens: cp(r.tens, ['w', 'sigma', 'et', 'eck', 'd']) });
    if (st.snaps.length > 6) st.snaps.shift(); compare(); };
  $('#snapClr').onclick = () => { st.snaps = []; compare(); };
  $('#meshRun').onclick = () => {
    const list = $('#meshList').value.split(/[;,\s]+/).map(Number).filter((v) => v > 0).slice(0, 30); if (!list.length) return;
    const cfg = readCfg(); const rows = G.tools.meshSensitivity(cfg, list), f = (v, n) => (v == null || !isFinite(v) ? '–' : n ? v.toExponential(n) : String(+v.toPrecision(4)));
    $('#meshTable').innerHTML = '<thead><tr>' + ['l_eq (mm)', 'Status', 'ε_u (–)', 'ρ', 'd_{c,max}', '∫σdε^in·l_eq / G_ch', 'w_c (mm)', 'd_{t,max}', '∫σdε^ck·l_eq / G_F'].map((h) => '<th>' + G.Plot.html(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((q) => '<tr class="' + (q.ok ? '' : 'bad') + '"><td>' + q.leq + '</td><td class="st">' + (q.ok ? 'ok' + (q.warnings ? ' (' + q.warnings + ' warn.)' : '') : String(q.error || 'error').replace(/</g, '&lt;').slice(0, 110)) + '</td><td>' + f(q.eu, 3) + '</td><td>' + f(q.rho) + '</td><td>' + f(q.dcMax) + '</td><td>' + f(q.gc / q.Gch) + '</td><td>' + f(q.wc) + '</td><td>' + f(q.dtMax) + '</td><td>' + f(q.gt / q.GF) + '</td></tr>').join('') + '</tbody>';
  };
  $('#meshWin').onclick = () => { const cfg = readCfg(); const w = G.tools.leqWindow(cfg, 1, 2000);
    $('#meshWinOut').textContent = w.min == null ? 'No feasible l_eq found between 1 and 2000 mm for this configuration.' : 'Feasible window for the current configuration: ' + w.min.toFixed(1) + ' mm ≤ l_eq ≤ ' + (w.max >= 2000 ? '2000+' : w.max.toFixed(1)) + ' mm (the run completes without errors).'; };
  // exportação
  $('#ePreset').onchange = () => { setPreset(); exportTab(); };
  $$('#tab-export input, #tab-export select').forEach((e) => e.addEventListener('input', exportTab));
  const wd = $('#warnDlg');
  $('#warnBtn').onclick = () => { if (wd.showModal) wd.showModal(); else wd.setAttribute('open', ''); };
  $('#warnClose').onclick = () => wd.close(); wd.addEventListener('click', (e) => { if (e.target === wd) wd.close(); });
  const dlg = $('#settings');
  $('#gearBtn').onclick = () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); };
  $('#setClose').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('input', schedule); dlg.addEventListener('change', schedule);
  $('#tab-tables').addEventListener('change', (e) => { if (e.target.id === 'fUnit' || e.target.id === 'tTens') { tables(); exportTab(); } });
  $('#eCopy').onclick = (e) => copy($('#eOut').value, e.target);
  $('#eDown').onclick = () => { if (st.res.ok) download(exportOpts().name + '.inp', $('#eOut').value); };
  $('#cfgSave').onclick = () => download('ccgen-config.json', G.exporter.configJSON(st.res), 'application/json');
  $('#cfgLoad').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { writeCfg(G.exporter.parseConfig(String(rd.result))); update(); } catch (err) { alert(err.message); } }; rd.readAsText(f); e.target.value = ''; };
  // tema
  try { const t = localStorage.getItem('ccgen-theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) { /* ignora */ }
  $('#themeBtn').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('ccgen-theme', nx); } catch (e) { /* ignora */ } };

  update();
})();
