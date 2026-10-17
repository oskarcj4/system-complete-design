/* Widgets de M43 (datos, eventos y features):
   <div data-sim="leakage">  dos pipelines entrenan el mismo modelo, uno con la feature "CTR del ítem" calculada en el instante
                             de cada impresión y otro con el mes entero (fuga del futuro); compara la métrica offline con la
                             online. Datos sintéticos con semilla fija: el resultado se calcula, no está escrito.
   <div data-sim="posbias">  el mismo par de ítems en distintas posiciones: clics observados = probabilidad de examinar la
                             posición × atractivo del ítem, y la corrección por propensión inversa.
   La lógica pura está en SD.eventsCore, sin DOM, para probarla en Node. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ======================= Lógica pura ======================= */

  function rng(seed) {                       /* mulberry32: el mismo resultado en cada navegador */
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function logit(p) { return Math.log(p / (1 - p)); }

  /* AUC: de todos los pares (un clic, un no clic), la fracción en que el clic tiene el puntaje más alto.
     Se calcula con los rangos (Mann-Whitney), con empates promediados. */
  function auc(scores, labels) {
    var idx = scores.map(function (_, i) { return i; }).sort(function (a, b) { return scores[a] - scores[b]; });
    var rankSum = 0, pos = 0, i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && scores[idx[j + 1]] === scores[idx[i]]) j++;
      var r = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) if (labels[idx[k]]) { rankSum += r; pos++; }
      i = j + 1;
    }
    var neg = idx.length - pos;
    return pos && neg ? (rankSum - pos * (pos + 1) / 2) / (pos * neg) : 0.5;
  }

  /* Regresión logística con tres pesos (sesgo, feature del ítem, afinidad), por Newton: pocas iteraciones exactas. */
  function fitLogistic(X1, X2, Y) {
    var w = [0, 0, 0];
    for (var it = 0; it < 25; it++) {
      var g = [0, 0, 0], H = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (var n = 0; n < Y.length; n++) {
        var x = [1, X1[n], X2[n]], p = sigmoid(w[0] + w[1] * x[1] + w[2] * x[2]), s = p * (1 - p);
        for (var a = 0; a < 3; a++) {
          g[a] += (Y[n] - p) * x[a];
          for (var b = 0; b < 3; b++) H[a][b] += s * x[a] * x[b];
        }
      }
      for (var d = 0; d < 3; d++) H[d][d] += 1e-6 + 1;   /* un poco de regularización: estabiliza Newton */
      var step = solve3(H, g);
      w = [w[0] + step[0], w[1] + step[1], w[2] + step[2]];
      if (Math.abs(step[0]) + Math.abs(step[1]) + Math.abs(step[2]) < 1e-7) break;
    }
    return w;
  }
  function solve3(A, b) {
    var m = A.map(function (row, i) { return row.concat([b[i]]); });
    for (var c = 0; c < 3; c++) {
      var piv = c;
      for (var r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
      var t = m[c]; m[c] = m[piv]; m[piv] = t;
      for (var r2 = 0; r2 < 3; r2++) {
        if (r2 === c) continue;
        var f = m[r2][c] / m[c][c];
        for (var k = c; k < 4; k++) m[r2][k] -= f * m[c][k];
      }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  }

  /* El experimento de 43.8. 400 ítems, 35 días. Días 1 a 21: entrenamiento; 22 a 28: evaluación offline;
     29 a 35: producción. Cada impresión tiene una afinidad usuario-ítem z y el clic sale de
     sigmoide(logit del ítem + z). El modelo ve x1 = logit del CTR suavizado del ítem y x2 = z con ruido. */
  var ITEMS = 400, DAYS = 35, PRIOR = 20;
  function leakage(perDay, seed) {
    var r = rng(seed || 42), items = [], d, i, k;
    for (i = 0; i < ITEMS; i++) items.push(-3.4 + 0.9 * gauss(r));
    var imps = [];                                   /* {item, day, z, x2, y} */
    for (d = 1; d <= DAYS; d++) for (i = 0; i < ITEMS; i++) for (k = 0; k < perDay; k++) {
      var z = gauss(r), y = r() < sigmoid(items[i] + z) ? 1 : 0;
      imps.push({ item: i, day: d, x2: z + 0.8 * gauss(r), y: y });
    }
    /* Clics e impresiones por ítem y día, para calcular la feature en cualquier instante */
    var C = [], N = [], globalC = 0, globalN = 0;
    for (i = 0; i < ITEMS; i++) { C.push(new Array(DAYS + 1).fill(0)); N.push(new Array(DAYS + 1).fill(0)); }
    imps.forEach(function (m) { C[m.item][m.day] += m.y; N[m.item][m.day]++; if (m.day <= 28) { globalC += m.y; globalN++; } });
    var mean = globalC / globalN;
    function smoothed(c, n) { return logit((c + PRIOR * mean) / (n + PRIOR)); }
    /* Acumulados: antes del día d (punto en el tiempo) y del mes entero (días 1 a 28, con la fuga) */
    var before = [], month = [];
    for (i = 0; i < ITEMS; i++) {
      var cb = [0], nb = [0], cc = 0, nn = 0;
      for (d = 1; d <= DAYS; d++) { cb.push(cc); nb.push(nn); cc += C[i][d]; nn += N[i][d]; }
      before.push({ c: cb, n: nb });
      var cm = 0, nm = 0;
      for (d = 1; d <= 28; d++) { cm += C[i][d]; nm += N[i][d]; }
      month.push(smoothed(cm, nm));
    }
    function pit(m) { return smoothed(before[m.item].c[m.day], before[m.item].n[m.day]); }
    function leak(m) { return month[m.item]; }

    function run(featTrain) {
      var tr = imps.filter(function (m) { return m.day <= 21; });
      var w = fitLogistic(tr.map(featTrain), tr.map(function (m) { return m.x2; }), tr.map(function (m) { return m.y; }));
      function score(set, feat) {
        return auc(set.map(function (m) { return w[0] + w[1] * feat(m) + w[2] * m.x2; }), set.map(function (m) { return m.y; }));
      }
      var off = imps.filter(function (m) { return m.day >= 22 && m.day <= 28; });
      var on = imps.filter(function (m) { return m.day >= 29; });
      /* Offline, cada pipeline se evalúa con su propia feature. En producción solo existe el pasado: punto en el tiempo. */
      return { w: w, offline: score(off, featTrain), online: score(on, pit) };
    }
    var honest = run(pit), leaky = run(leak);
    /* Referencia: el mejor orden posible con lo que el modelo puede ver no supera al que conoce la verdad */
    return { honest: honest, leaky: leaky, impressions: imps.length, clicks: globalC, mean: mean };
  }

  /* Sesgo de posición (43.9). Probabilidad de que alguien mire cada posición de una lista de 10: un supuesto
     con la forma que describen los estudios de eye tracking, no una medición. */
  var EXAM = [1, 0.75, 0.6, 0.5, 0.42, 0.36, 0.31, 0.27, 0.24, 0.21];
  function posbias(relA, posA, relB, posB) {
    var eA = EXAM[posA - 1], eB = EXAM[posB - 1];
    var ctrA = relA * eA, ctrB = relB * eB;
    return { eA: eA, eB: eB, ctrA: ctrA, ctrB: ctrB, corrA: ctrA / eA, corrB: ctrB / eB };
  }

  SD.eventsCore = { rng: rng, auc: auc, fitLogistic: fitLogistic, leakage: leakage, EXAM: EXAM, posbias: posbias };

  /* ======================= DOM ======================= */

  function chips(list, def, onPick, aria) {
    var box = h('div', { class: 'calc-presets', role: 'group', 'aria-label': aria });
    list.forEach(function (it) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': it[0] === def ? 'true' : 'false', text: it[1] });
      b.addEventListener('click', function () {
        box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(it[0]);
      });
      box.appendChild(b);
    });
    return box;
  }
  function a3(x) { return F.num(x, 3); }

  function initLeakage(host) {
    var cache = {};
    var table = h('div', { class: 'table-wrap' });
    var chart = h('div', { class: 'sim-scroll ev-chart' });
    var note = h('p', { class: 'sim-note' });
    var live = h('div', { 'aria-live': 'polite' }, [table, chart, note]);
    function draw(per) {
      var R = cache[per] || (cache[per] = leakage(per, 42));
      var rows = [['Con la feature en el instante de cada impresión', R.honest], ['Con la feature del mes entero (fuga)', R.leaky]];
      table.innerHTML = '<table class="t"><thead><tr><th>Pipeline</th><th class="r">AUC offline</th><th class="r">AUC en producción</th><th class="r">Peso del CTR del ítem</th><th class="r">Peso de la afinidad</th></tr></thead><tbody>' +
        rows.map(function (row) {
          return '<tr><td>' + row[0] + '</td><td class="r">' + a3(row[1].offline) + '</td><td class="r">' + a3(row[1].online) + '</td><td class="r">' + F.num(row[1].w[1], 2) + '</td><td class="r">' + F.num(row[1].w[2], 2) + '</td></tr>';
        }).join('') + '</tbody></table>';
      /* Barras: offline y online de cada pipeline, sobre un eje de 0.5 (azar) a 1 */
      var W = 640, H = 170, l = 230, pw = W - l - 60, X = function (v) { return l + Math.max(0, (v - 0.5) / 0.5) * pw; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="AUC offline y en producción de los dos pipelines, en barras sobre un eje que va de 0.5, el azar, a 1.">';
      var bars = [['Sin fuga, offline', R.honest.offline, '--l-service'], ['Sin fuga, producción', R.honest.online, '--l-service'],
        ['Con fuga, offline', R.leaky.offline, '--l-gpu'], ['Con fuga, producción', R.leaky.online, '--l-gpu']];
      bars.forEach(function (b, i) {
        var y = 14 + i * 32 + (i > 1 ? 10 : 0);
        s += '<text class="sim-label" x="' + (l - 10) + '" y="' + (y + 15) + '" text-anchor="end">' + b[0] + '</text>';
        s += '<rect x="' + l + '" y="' + y + '" width="' + Math.max(2, X(b[1]) - l).toFixed(1) + '" height="22" rx="4" class="dg-layer" style="--c: var(' + b[2] + ')"/>';
        s += '<text class="sim-val" x="' + (X(b[1]) + 6).toFixed(1) + '" y="' + (y + 15) + '">' + a3(b[1]) + '</text>';
      });
      s += '<line x1="' + l + '" x2="' + (l + pw) + '" y1="' + (H - 18) + '" y2="' + (H - 18) + '" class="sim-axis" stroke="var(--separator)"/>';
      s += '<text class="sim-axis" x="' + l + '" y="' + (H - 4) + '" text-anchor="middle">0.5 (azar)</text><text class="sim-axis" x="' + (l + pw) + '" y="' + (H - 4) + '" text-anchor="middle">1</text>';
      chart.innerHTML = s + '</svg>';
      var gap = R.leaky.offline - R.leaky.online, loss = R.honest.online - R.leaky.online;
      note.textContent = 'Con ' + per + ' impresión' + (per > 1 ? 'es' : '') + ' por ítem y día (' + F.num(R.impressions, 0) + ' impresiones en 35 días), el pipeline con fuga promete ' + a3(R.leaky.offline) +
        ' offline y entrega ' + a3(R.leaky.online) + ' en producción: ' + (gap > 0 ? 'pierde ' + a3(gap) : 'no pierde') + '. ' +
        (loss > 0.001 ? 'Además queda ' + a3(loss) + ' por debajo del pipeline sin fuga, porque aprendió a confiar en una feature que en producción no trae la información del futuro.' :
          'Con tantas impresiones, la fuga casi no cambia la feature y el daño es chico: la fuga pesa más en los ítems con pocas impresiones.');
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Fuga del futuro: offline contra producción' }),
      chips([[1, '1 impresión por ítem y día'], [3, '3'], [10, '10'], [30, '30']], 1, draw, 'Impresiones por ítem y día')]));
    host.appendChild(h('div', { class: 'sim-body' }, [live]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Datos sintéticos con semilla fija: 400 ítems, 35 días, una afinidad usuario-ítem por impresión. Entrena con los días 1 a 21, evalúa offline con los días 22 a 28 y "en producción" con los días 29 a 35, donde la feature solo puede salir del pasado. El AUC es la fracción de pares (un clic, un no clic) en que el clic tiene el puntaje más alto; se explica en M46. Los números salen del cálculo en tu navegador, no de un sistema real.' }));
    draw(1);
  }

  function initPosbias(host) {
    var st = { relA: 10, posA: 1, relB: 15, posB: 8 };
    function range(label, key, min, max, step, suffix) {
      var id = 'pb' + key + Math.random().toString(36).slice(2, 7);
      var inp = h('input', { id: id, type: 'range', min: min, max: max, step: step, value: st[key] });
      var val = h('output', { for: id, text: st[key] + suffix });
      inp.addEventListener('input', function () { st[key] = +inp.value; val.textContent = inp.value + suffix; draw(); });
      return h('div', { class: 'field' }, [h('label', { for: id, text: label }), inp, val]);
    }
    var chart = h('div', { class: 'sim-scroll ev-chart' }), table = h('div', { class: 'table-wrap' }), note = h('p', { class: 'sim-note' });
    var swap = h('button', { type: 'button', class: 'btn', text: 'Intercambiar posiciones' });
    swap.addEventListener('click', function () { var t = st.posA; st.posA = st.posB; st.posB = t; syncPos(); draw(); });
    var posA = range('Posición de A', 'posA', 1, 10, 1, ''), posB = range('Posición de B', 'posB', 1, 10, 1, '');
    function syncPos() {
      [[posA, 'posA'], [posB, 'posB']].forEach(function (p) { p[0].querySelector('input').value = st[p[1]]; p[0].querySelector('output').textContent = st[p[1]]; });
    }
    function draw() {
      var r = posbias(st.relA / 100, st.posA, st.relB / 100, st.posB);
      var W = 640, H = 210, l = 40, bw = 50, base = 170;
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Probabilidad de que alguien mire cada una de las 10 posiciones, de 1 en la primera a 0.21 en la décima, con las posiciones de A y B marcadas.">';
      EXAM.forEach(function (e, i) {
        var x = l + i * (bw + 6), hh = e * 130, mark = (i + 1 === st.posA ? 'A' : '') + (i + 1 === st.posB ? 'B' : '');
        s += '<rect x="' + x + '" y="' + (base - hh).toFixed(1) + '" width="' + bw + '" height="' + hh.toFixed(1) + '" rx="4" class="' + (mark ? 'dg-layer' : 'dg-box') + '"' + (mark ? ' style="--c: var(' + (mark === 'A' ? '--l-service' : '--l-gpu') + ')"' : '') + '/>';
        s += '<text class="sim-val" x="' + (x + bw / 2) + '" y="' + (base - hh - 6).toFixed(1) + '" text-anchor="middle">' + F.num(e, 2) + '</text>';
        s += '<text class="sim-axis" x="' + (x + bw / 2) + '" y="' + (base + 16) + '" text-anchor="middle">' + (i + 1) + '</text>';
        if (mark) s += '<text class="sim-label" x="' + (x + bw / 2) + '" y="' + (base - 10) + '" text-anchor="middle">' + mark + '</text>';
      });
      s += '<text class="sim-axis" x="' + l + '" y="' + (H - 6) + '">Posición en la lista · altura: probabilidad de que la miren (supuesto, dibujo)</text>';
      chart.innerHTML = s + '</svg>';
      function p(x) { return F.num(x * 100, 1) + ' %'; }
      table.innerHTML = '<table class="t"><thead><tr><th>Ítem</th><th class="r">Atractivo real</th><th class="r">Posición</th><th class="r">CTR que ves</th><th class="r">CTR / probabilidad de mirar</th></tr></thead><tbody>' +
        '<tr><td>A</td><td class="r">' + st.relA + ' %</td><td class="r">' + st.posA + '</td><td class="r">' + p(r.ctrA) + '</td><td class="r">' + p(r.corrA) + '</td></tr>' +
        '<tr><td>B</td><td class="r">' + st.relB + ' %</td><td class="r">' + st.posB + '</td><td class="r">' + p(r.ctrB) + '</td><td class="r">' + p(r.corrB) + '</td></tr></tbody></table>';
      var naive = r.ctrA >= r.ctrB ? 'A' : 'B', truth = st.relA >= st.relB ? 'A' : 'B';
      note.textContent = 'Mirando solo los clics, gana ' + naive + ' (' + p(Math.max(r.ctrA, r.ctrB)) + ' contra ' + p(Math.min(r.ctrA, r.ctrB)) + '). ' +
        (naive === truth ? 'Coincide con el atractivo real.' : 'Pero el más atractivo es ' + truth + ': los clics premian la posición. Si el modelo aprende de estos clics, ' + naive + ' sigue arriba y ' + truth + ' nunca sube.') +
        ' Dividir por la probabilidad de mirar devuelve el atractivo real, si la curva está bien estimada.';
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Sesgo de posición' }), swap]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [range('Atractivo de A (%)', 'relA', 1, 40, 1, ''), posA, range('Atractivo de B (%)', 'relB', 1, 40, 1, ''), posB]),
      h('div', { 'aria-live': 'polite' }, [chart, table, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Modelo de examen: hacen clic quienes miran la posición y además les atrae el ítem, así que CTR = probabilidad de mirar × atractivo. La curva es un supuesto con la forma habitual, no una medición; en un sistema real se estima con experimentos que intercambian posiciones.' }));
    draw();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="leakage"]').forEach(initLeakage);
    document.querySelectorAll('[data-sim="posbias"]').forEach(initPosbias);
  });
})();
