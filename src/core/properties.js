/* CCGen núcleo: propriedades do concreto a partir de f_ck (fib MC2010 (2012), NBR 6118, EC2, valores informados). Unidades: N, mm, MPa. */
(function (G) {
  'use strict';
  const P = {};
  P.METHODS = {
    fib: 'fib MC2010 (2012)',
    nbr: 'NBR 6118 (2023)',
    ec2: 'Eurocode 2 (EN 1992-1-1:2023)'
  };
  P.AGGREGATES = [
    { id: 'basalt', label: 'Basalt / diabase (1.2)', alphaE: 1.2 },
    { id: 'granite', label: 'Granite / gneiss (1.0)', alphaE: 1.0 },
    { id: 'limestone', label: 'Limestone (0.9)', alphaE: 0.9 },
    { id: 'sandstone', label: 'Sandstone (0.7)', alphaE: 0.7 }
  ];
  /** Propriedades que o usuário pode substituir. */
  P.OVERRIDABLE = ['fcm', 'fc0', 'ftm', 'Eci', 'E0', 'GF', 'Gch'];

  function ftmFib(fck, fcm) { return fck <= 50 ? 0.30 * Math.pow(fck, 2 / 3) : 2.12 * Math.log(1 + 0.1 * fcm); }
  function ftmNbr(fck) { return fck <= 50 ? 0.30 * Math.pow(fck, 2 / 3) : 2.12 * Math.log(1 + 0.11 * fck); }
  function ftmEc2(fck) { return fck <= 50 ? 0.30 * Math.pow(fck, 2 / 3) : 1.1 * Math.pow(fck, 1 / 3); }
  function EciFib(fcm, aE) { return 21500 * aE * Math.pow(fcm / 10, 1 / 3); }
  function EciNbr(fck, aE) { return fck <= 50 ? aE * 5600 * Math.sqrt(fck) : 21500 * aE * Math.pow(fck / 10 + 1.25, 1 / 3); }

  /** input: { fck, method, alphaE, overrides }; retorna { values, origins, warnings } */
  P.compute = function (input) {
    const fck = input.fck;
    const method = input.method || 'fib';
    const aE = input.alphaE == null ? 1.0 : input.alphaE;
    const ov = input.overrides || {};
    const warnings = [];
    if (!(fck > 0)) throw new G.util.CCGenError('f_ck must be a positive number (MPa).', 'FCK');
    if (!P.METHODS[method]) throw new G.util.CCGenError('Unknown property method: ' + method, 'MODEL');
    const label = method === 'nbr' ? 'NBR 6118 (2023)' : method === 'ec2' ? 'Eurocode 2 (2023)' : 'fib MC2010 (2012)';
    const origins = {};
    const has = (k) => ov[k] != null && G.util.isNum(ov[k]);
    const v = {};
    const take = (k, auto, lab) => { if (has(k)) { origins[k] = 'manual'; return ov[k]; } origins[k] = lab || label; return auto(); };

    v.fck = fck; v.alphaE = aE; v.method = method;
    v.fcm = take('fcm', () => fck + 8, method === 'nbr' ? 'f_ck + 8 (adopted)' : label);
    v.ftm = take('ftm', () => method === 'nbr' ? ftmNbr(fck) : method === 'ec2' ? ftmEc2(fck) : ftmFib(fck, v.fcm));
    v.Eci = take('Eci', () => method === 'nbr' ? EciNbr(fck, aE) : EciFib(v.fcm, aE), method === 'ec2' ? 'fib MC2010 (2012, Eurocode 2 gives none)' : label);
    v.E0 = take('E0', () => {
      if (method === 'ec2') return 9500 * aE * Math.pow(v.fcm, 1 / 3);   // E_cm, Eq. 5.1
      if (method === 'nbr') return Math.min(1, 0.8 + 0.2 * fck / 80) * v.Eci;
      return Math.min(1, 0.8 + 0.2 * v.fcm / 88) * v.Eci;
    });
    v.GF = take('GF', () => 0.073 * Math.pow(v.fcm, 0.18), method === 'nbr' ? 'fib MC2010 (2012, NBR 6118 gives none)' : method === 'ec2' ? 'fib MC2010 (2012, Eurocode 2 gives none)' : label);
    v.fc0 = take('fc0', () => 0.4 * v.fcm, 'derived: 0.4 f_cm');
    v.ft0 = v.ftm; origins.ft0 = 'derived: f_tm';
    v.ec0 = v.fc0 / v.E0; origins.ec0 = 'derived: f_c0 / E_0';
    v.et0 = v.ftm / v.E0; origins.et0 = 'derived: f_tm / E_0';
    v.Gch = take('Gch', () => Math.pow(v.fcm / v.ftm, 2) * v.GF, 'derived: (f_cm/f_tm)^2 G_F');

    // V1: faixas de validade
    if (method === 'nbr' && (fck < 20 || fck > 90)) warnings.push({ id: 'V1', level: 'warning', msg: 'f_ck = ' + fck + ' MPa is outside the C20–C90 range of NBR 6118.' });
    if (method === 'nbr' && fck > 50 && fck < 55) warnings.push({ id: 'V1', level: 'warning', msg: 'NBR 6118 expressions are given for C50 or below and C55 or above; the C55–C90 branch is being used.' });
    if (method === 'ec2' && (fck < 12 || fck > 100)) warnings.push({ id: 'V1', level: 'warning', msg: 'f_ck = ' + fck + ' MPa is outside the C12–C100 range of Eurocode 2 (Table 5.1).' });
    if (method === 'fib' && (fck < 12 || fck > 120)) warnings.push({ id: 'V1', level: 'warning', msg: 'f_ck = ' + fck + ' MPa is outside the usual range of fib MC2010 (2012, C12–C120).' });
    const nManual = P.OVERRIDABLE.filter(has);
    if (nManual.length) warnings.push({ id: 'V9', level: 'warning', msg: 'User-defined values (' + nManual.join(', ') + '): make sure they are mutually consistent (mixing sources can give an incoherent set).' });
    return { values: v, origins, warnings };
  };
  G.properties = P;
})(globalThis.CCGen = globalThis.CCGen || {});
