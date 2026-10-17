/* Widgets de la Parte VI (sistemas de recomendación):
   <div data-sim="funnel">   el embudo de un recomendador: requests por segundo, puntuaciones por segundo en cada etapa
                             y la latencia acumulada contra el presupuesto (M42)
   <div data-calc="sparsity"> la matriz usuario-ítem: celdas, densidad y cuánto ocupa densa contra CSR (M43)
   <div data-sim="itemcf">   filtrado colaborativo ítem a ítem: una matriz de compras 4 × 4 editable, el coseno entre ítems y
                             lo que se recomienda a quien mira cada uno (M44)
   <div data-sim="mf">       factorización de matrices: 6 personas × 6 películas, entrenada paso a paso con descenso por
                             gradiente, con k factores y regularización; error de entrenamiento contra el de prueba (M44)
   La lógica pura está en SD.recsysCore, sin DOM, para probarla en Node. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ======================= Lógica pura ======================= */

  /* Las etapas del embudo en el orden en que corre una request. kind: 'fixed' cuesta lo mismo con cualquier
     cantidad de ítems; 'per' cuesta (ítems que entran) × (ms por ítem). */
  var STAGES = [
    { k: 'ret', name: 'Recuperación', kind: 'fixed', c: '--l-cache' },
    { k: 'fil', name: 'Filtros', kind: 'fixed', c: '--l-edge' },
    { k: 'fea', name: 'Features', kind: 'fixed', c: '--l-db' },
    { k: 'lig', name: 'Ranking liviano', kind: 'per', c: '--l-service' },
    { k: 'hea', name: 'Ranking pesado', kind: 'per', c: '--l-gpu' },
    { k: 'rer', name: 'Re-ranking', kind: 'fixed', c: '--l-queue' },
    { k: 'net', name: 'Red y armado', kind: 'fixed', c: '--l-client' }
  ];

  /* Mercado Barrio (42.7). Los milisegundos son supuestos de diseño, no mediciones. */
  var PRESETS = {
    mb: { name: 'Mercado Barrio', v: { dau: 20, opens: 20, peak: 3, catalog: 100, cand: 10000, pass: 90, heavyN: 500, rerankN: 50, screen: 10,
      msLig: 0.002, msHea: 0.1, ret: 25, fil: 5, fea: 15, rer: 5, net: 20, budget: 200 } },
    sinLiviano: { name: 'Sin ranking liviano', v: { dau: 20, opens: 20, peak: 3, catalog: 100, cand: 10000, pass: 90, heavyN: 9000, rerankN: 50, screen: 10,
      msLig: 0, msHea: 0.1, ret: 25, fil: 5, fea: 15, rer: 5, net: 20, budget: 200 } },
    pesadoGrande: { name: 'Pesado 3 veces más caro', v: { dau: 20, opens: 20, peak: 3, catalog: 100, cand: 10000, pass: 90, heavyN: 500, rerankN: 50, screen: 10,
      msLig: 0.002, msHea: 0.3, ret: 25, fil: 5, fea: 15, rer: 5, net: 20, budget: 200 } }
  };

  function funnel(p) {
    var catalog = Math.max(1, p.catalog * 1e6);
    var cand = Math.min(Math.max(1, Math.round(p.cand)), catalog);
    var filtered = Math.max(1, Math.round(cand * Math.min(100, Math.max(0, p.pass)) / 100));
    var heavyIn = Math.min(Math.max(1, Math.round(p.heavyN)), filtered);
    var rerankIn = Math.min(Math.max(1, Math.round(p.rerankN)), heavyIn);
    var screen = Math.min(Math.max(1, Math.round(p.screen)), rerankIn);
    var rpsAvg = p.dau * 1e6 * p.opens / 86400, rpsPeak = rpsAvg * p.peak;
    /* Con un ranking liviano de costo cero, el pesado recibe todo lo que sale de los filtros. */
    var hasLight = p.msLig > 0;
    if (!hasLight) heavyIn = filtered;
    var stages = [
      { k: 'ret', items: catalog, out: cand, ms: p.ret },
      { k: 'fil', items: cand, out: filtered, ms: p.fil },
      { k: 'fea', items: heavyIn, out: heavyIn, ms: p.fea },
      { k: 'lig', items: hasLight ? filtered : 0, out: heavyIn, ms: hasLight ? filtered * p.msLig : 0 },
      { k: 'hea', items: heavyIn, out: rerankIn, ms: heavyIn * p.msHea },
      { k: 'rer', items: rerankIn, out: screen, ms: p.rer },
      { k: 'net', items: screen, out: screen, ms: p.net }
    ];
    var total = 0, worst = null, acc = 0;
    stages.forEach(function (s, i) {
      s.name = STAGES[i].name; s.c = STAGES[i].c; s.kind = STAGES[i].kind;
      total += s.ms; acc += s.ms; s.until = acc;
      if (!worst || s.ms > worst.ms) worst = s;
    });
    var over = null;
    for (var i = 0; i < stages.length; i++) if (stages[i].until > p.budget) { over = stages[i]; break; }
    return {
      rpsAvg: rpsAvg, rpsPeak: rpsPeak, catalog: catalog, cand: cand, filtered: filtered, heavyIn: heavyIn,
      rerankIn: rerankIn, screen: screen, stages: stages, total: total, margin: p.budget - total, over: over, worst: worst,
      scoresLight: hasLight ? rpsPeak * filtered : 0, scoresHeavy: rpsPeak * heavyIn,
      /* Lo que tardaría el ranking pesado si tuviera que puntuar el catálogo entero, en segundos */
      heavyAllSec: catalog * p.msHea / 1000
    };
  }

  /* La matriz usuario-ítem (43.3). users e items en millones, nnz en miles de millones de interacciones.
     Densa: una celda por pareja. CSR: por cada celda con dato, su valor y el índice de su columna, más un
     puntero de 8 bytes por fila (indptr, con una entrada de más). */
  function sparsity(p) {
    var users = p.users * 1e6, items = p.items * 1e6, nnz = Math.min(p.nnz * 1e9, users * items);
    var cells = users * items;
    return {
      cells: cells, nnz: nnz, density: cells ? nnz / cells : 0,
      dense: cells * p.valB,
      csr: nnz * (p.valB + p.idxB) + (users + 1) * 8,
      perUser: users ? nnz / users : 0, perItem: items ? nnz / items : 0
    };
  }

  /* Ítem a ítem (44.4). M: filas = usuarios, columnas = ítems, con 0 o 1. Devuelve el coseno entre cada par de
     columnas: compras en común / (raíz de las compras de uno × raíz de las del otro). */
  function itemSims(M) {
    var n = M[0].length, cnt = [], S = [];
    for (var i = 0; i < n; i++) { cnt.push(M.reduce(function (a, row) { return a + row[i]; }, 0)); }
    for (i = 0; i < n; i++) {
      S.push([]);
      for (var j = 0; j < n; j++) {
        var both = M.reduce(function (a, row) { return a + row[i] * row[j]; }, 0);
        S[i].push({ both: both, cos: cnt[i] && cnt[j] ? both / Math.sqrt(cnt[i] * cnt[j]) : 0 });
      }
    }
    return { S: S, cnt: cnt };
  }
  /* Lo que se muestra a quien mira el ítem i: los demás, de mayor a menor coseno, sin los de coseno 0. */
  function itemTop(sims, i, k) {
    return sims.S[i].map(function (x, j) { return { j: j, cos: x.cos, both: x.both }; })
      .filter(function (x) { return x.j !== i && x.cos > 0; })
      .sort(function (a, b) { return b.cos - a.cos || a.j - b.j; }).slice(0, k);
  }

  /* Factorización de matrices (44.6). Seis personas y seis películas (tres comedias, tres dramas). Un número es una
     calificación de entrenamiento; {t: n} es de prueba (el modelo no la ve, sirve para medir); null no se sabe. */
  var MF_USERS = ['Ana', 'Beto', 'Caro', 'Dani', 'Eli', 'Fede'];
  var MF_ITEMS = ['Comedia 1', 'Comedia 2', 'Comedia 3', 'Drama 1', 'Drama 2', 'Drama 3'];
  var MF_R = [
    [5, { t: 5 }, 4, 1, null, 2],
    [5, 4, 4, 2, { t: 1 }, 2],
    [2, 2, 1, null, 4, { t: 5 }],
    [{ t: 1 }, 1, 1, 5, 4, 5],
    [2, 1, 1, 4, { t: 5 }, 5],
    [{ t: 4 }, null, 3, 2, 2, 3]
  ];
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* Predicción = promedio global + u · v. Los factores empiezan con números chicos al azar (semilla fija). */
  function mfInit(k, seed) {
    var r = rng(seed), U = [], V = [], tr = [], te = [];
    for (var a = 0; a < 6; a++) {
      U.push([]); V.push([]);
      for (var f = 0; f < k; f++) { U[a].push((r() - 0.5) * 0.6); V[a].push((r() - 0.5) * 0.6); }
    }
    MF_R.forEach(function (row, u) {
      row.forEach(function (c, i) {
        if (c === null) return;
        if (typeof c === 'object') te.push([u, i, c.t]); else tr.push([u, i, c]);
      });
    });
    var mu = tr.reduce(function (x, e) { return x + e[2]; }, 0) / tr.length;
    return { k: k, U: U, V: V, mu: mu, tr: tr, te: te, steps: 0, hist: [] };
  }
  function mfPred(S, u, i) {
    var d = S.mu;
    for (var f = 0; f < S.k; f++) d += S.U[u][f] * S.V[i][f];
    return d;
  }
  function mfRmse(S, set) {
    return Math.sqrt(set.reduce(function (x, e) { var d = e[2] - mfPred(S, e[0], e[1]); return x + d * d; }, 0) / set.length);
  }
  /* Un paso de descenso por gradiente sobre todas las calificaciones de entrenamiento a la vez.
     Pérdida = suma de (real − predicción)² + lam × (suma de los cuadrados de todos los factores). */
  function mfStep(S, lr, lam) {
    var zero = function (M) { return M.map(function (r) { return r.map(function () { return 0; }); }); };
    var gU = zero(S.U), gV = zero(S.V), a, f;
    S.tr.forEach(function (e) {
      var err = e[2] - mfPred(S, e[0], e[1]);
      for (f = 0; f < S.k; f++) { gU[e[0]][f] += -2 * err * S.V[e[1]][f]; gV[e[1]][f] += -2 * err * S.U[e[0]][f]; }
    });
    for (a = 0; a < 6; a++) for (f = 0; f < S.k; f++) { gU[a][f] += 2 * lam * S.U[a][f]; gV[a][f] += 2 * lam * S.V[a][f]; }
    for (a = 0; a < 6; a++) for (f = 0; f < S.k; f++) { S.U[a][f] -= lr * gU[a][f]; S.V[a][f] -= lr * gV[a][f]; }
    S.steps++;
    S.hist.push([mfRmse(S, S.tr), mfRmse(S, S.te)]);
  }
  var MF_LR = 0.02, MF_SEED = 7;

  SD.recsysCore = { STAGES: STAGES, PRESETS: PRESETS, funnel: funnel, sparsity: sparsity, itemSims: itemSims, itemTop: itemTop,
    MF_R: MF_R, mfInit: mfInit, mfStep: mfStep, mfPred: mfPred, mfRmse: mfRmse, MF_LR: MF_LR, MF_SEED: MF_SEED };

  /* ======================= DOM ======================= */

  var uid = 0;
  function num(label, value, step) {
    var id = 'rs' + (++uid);
    var i = h('input', { id: id, type: 'number', min: 0, step: step, value: value, inputmode: 'decimal' });
    return { el: h('div', { class: 'field' }, [h('label', { for: id, text: label }), i]), input: i };
  }
  function out(label, formula) {
    var v = h('output', { class: 'out-value' });
    return { el: h('div', { class: 'out-row' }, [h('span', { class: 'out-label', text: label }), v, h('span', { class: 'out-formula', text: formula })]), v: v, f: null };
  }
  function chipRow(list, def, onPick, aria) {
    var box = h('div', { class: 'calc-presets', role: 'group', 'aria-label': aria });
    Object.keys(list).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': k === def ? 'true' : 'false', text: list[k].name });
      b.addEventListener('click', function () {
        box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(k);
      });
      box.appendChild(b);
    });
    box.clear = function () { box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); };
    return box;
  }
  function ms(x) { return F.num(x, x < 10 ? 1 : 0) + ' ms'; }
  function big(x) {
    if (x >= 1e9) return F.num(x / 1e9, 1) + ' mil millones';
    if (x >= 1e6) return F.num(x / 1e6, 1) + ' millones';
    return F.num(Math.round(x), 0);
  }
  function dur(sec) {
    if (sec >= 3600) return F.num(sec / 3600, 1) + ' h';
    if (sec >= 60) return F.num(sec / 60, 1) + ' min';
    return F.num(sec, 1) + ' s';
  }

  var FIELDS = [
    ['Tráfico', [['dau', 'Usuarios activos por día (millones)', 1], ['opens', 'Aperturas del feed por usuario y día', 1], ['peak', 'Factor de pico', 0.5]]],
    ['Embudo', [['catalog', 'Catálogo (millones de ítems)', 1], ['cand', 'Candidatos que trae la recuperación', 500], ['pass', 'Pasan los filtros (%)', 5],
      ['heavyN', 'Entran al ranking pesado', 50], ['rerankN', 'Entran al re-ranking', 10], ['screen', 'En pantalla', 1]]],
    ['Tiempos (p99, supuestos)', [['msLig', 'Ranking liviano: ms por ítem', 0.001], ['msHea', 'Ranking pesado: ms por ítem', 0.01],
      ['ret', 'Recuperación (ms)', 5], ['fil', 'Filtros (ms)', 1], ['fea', 'Features (ms)', 5], ['rer', 'Re-ranking (ms)', 1], ['net', 'Red y armado (ms)', 5],
      ['budget', 'Presupuesto (ms)', 10]]]
  ];

  function initFunnel(host) {
    var f = {}, inCol = h('div', { class: 'calc-inputs' });
    FIELDS.forEach(function (g) {
      inCol.appendChild(h('p', { class: 'rs-group', text: g[0] }));
      g[1].forEach(function (x) {
        f[x[0]] = num(x[1], PRESETS.mb.v[x[0]], x[2]);
        inCol.appendChild(f[x[0]].el);
      });
    });
    var o = {
      rps: out('Requests por segundo', ''),
      light: out('Puntuaciones por segundo, ranking liviano', 'en el pico: requests × ítems que puntúa'),
      heavy: out('Puntuaciones por segundo, ranking pesado', 'en el pico'),
      total: out('Latencia de una request', ''),
      worst: out('La etapa más cara', ''),
      all: out('Si el pesado puntuara todo el catálogo', 'catálogo × ms por ítem, para una sola request')
    };
    var chart = h('div', { class: 'sim-scroll rs-chart' });
    var chips = chipRow(PRESETS, 'mb', function (k) {
      Object.keys(f).forEach(function (key) { f[key].input.value = PRESETS[k].v[key]; });
      run();
    }, 'Configuraciones de ejemplo');

    function read() {
      var v = {};
      Object.keys(f).forEach(function (k) { var n = parseFloat(f[k].input.value); v[k] = isFinite(n) && n >= 0 ? n : 0; });
      if (!(v.budget > 0)) v.budget = 200;
      return v;
    }

    function draw(r, budget) {
      var W = 700, H = 330, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Arriba, cuántos ítems quedan después de cada etapa, en escala logarítmica. Abajo, la latencia de cada etapa apilada contra el presupuesto.">';
      /* El embudo: ancho proporcional al logaritmo de los ítems */
      var rows = [['Catálogo', r.catalog, '--l-external'], ['Recuperación', r.cand, '--l-cache'], ['Filtros', r.filtered, '--l-edge'],
        ['Ranking liviano', r.heavyIn, '--l-service'], ['Ranking pesado', r.rerankIn, '--l-gpu'], ['Re-ranking', r.screen, '--l-queue']];
      var maxL = Math.log10(Math.max(10, r.catalog)), cx = 360, maxW = 440;
      rows.forEach(function (row, i) {
        var w = Math.max(14, (Math.log10(Math.max(1, row[1])) + 0.3) / (maxL + 0.3) * maxW), y = 12 + i * 30;
        s += '<rect x="' + (cx - w / 2).toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="22" rx="4" class="dg-layer" style="--c: var(' + row[2] + ')"/>';
        s += '<text class="sim-label" x="12" y="' + (y + 15) + '">' + (i === 0 ? 'Catálogo' : 'Después de ' + row[0].toLowerCase()) + '</text>';
        s += '<text class="sim-val" x="' + (W - 12) + '" y="' + (y + 15) + '" text-anchor="end">' + big(row[1]) + '</text>';
      });
      s += '<text class="sim-axis" x="' + cx + '" y="194" text-anchor="middle">Ancho en escala logarítmica: cada escalón es un orden de magnitud menos</text>';
      /* La latencia apilada */
      var y0 = 236, bh = 34, l = 12, pw = W - 24, max = Math.max(r.total, budget) * 1.08, X = function (t) { return l + t / max * pw; }, t = 0;
      r.stages.forEach(function (st) {
        if (st.ms <= 0) return;
        var a = X(t), b = X(t + st.ms);
        s += '<rect x="' + a.toFixed(1) + '" y="' + y0 + '" width="' + Math.max(1, b - a - 1).toFixed(1) + '" height="' + bh + '" class="dg-layer" style="--c: var(' + st.c + ')"/>';
        if (b - a > 30) s += '<text class="sim-val" x="' + ((a + b) / 2).toFixed(1) + '" y="' + (y0 + 22) + '" text-anchor="middle">' + F.num(st.ms, st.ms < 10 ? 1 : 0) + '</text>';
        t += st.ms;
      });
      var bx = X(budget);
      s += '<line x1="' + bx.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y1="' + (y0 - 16) + '" y2="' + (y0 + bh + 8) + '" stroke="var(--label)" stroke-width="1.5" stroke-dasharray="4 3"/>';
      s += '<text class="sim-label" x="' + (bx - 4).toFixed(1) + '" y="' + (y0 - 22) + '" text-anchor="end">presupuesto: ' + F.num(budget, 0) + ' ms</text>';
      r.stages.forEach(function (st, i) {
        var col = i % 4, row = Math.floor(i / 4), x = l + col * 172, y = y0 + bh + 22 + row * 18;
        s += '<rect x="' + x + '" y="' + (y - 10) + '" width="11" height="11" rx="2" class="dg-layer" style="--c: var(' + st.c + ')"/>';
        s += '<text class="sim-axis" x="' + (x + 16) + '" y="' + y + '">' + st.name + '</text>';
      });
      chart.innerHTML = s + '</svg>';
    }

    function run() {
      var v = read(), r = funnel(v);
      o.rps.v.textContent = big(r.rpsPeak) + ' en el pico';
      o.rps.v.nextSibling.textContent = big(r.rpsAvg) + ' en promedio: ' + F.num(v.dau, 0) + ' M × ' + F.num(v.opens, 0) + ' / 86 400 s, por ' + F.num(v.peak, 1);
      o.light.v.textContent = r.scoresLight ? big(r.scoresLight) : 'sin ranking liviano';
      o.heavy.v.textContent = big(r.scoresHeavy);
      o.heavy.v.nextSibling.textContent = 'en el pico: ' + big(r.rpsPeak) + ' × ' + F.num(r.heavyIn, 0) + ' ítems';
      o.total.v.textContent = (r.margin >= 0 ? '✓ ' : '✗ ') + ms(r.total);
      o.total.v.nextSibling.textContent = r.margin >= 0 ? 'sobran ' + ms(r.margin) + ' del presupuesto' : 'te pasas ' + ms(-r.margin) + '; el presupuesto se acaba en ' + r.over.name.toLowerCase();
      o.worst.v.textContent = r.worst.name;
      o.worst.v.nextSibling.textContent = ms(r.worst.ms) + ', el ' + F.num(r.total ? r.worst.ms / r.total * 100 : 0, 0) + ' % del total';
      o.all.v.textContent = dur(r.heavyAllSec);
      draw(r, v.budget);
    }

    var outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' });
    Object.keys(f).forEach(function (k) { f[k].input.addEventListener('input', function () { chips.clear(); run(); }); });
    Object.keys(o).forEach(function (k) { outCol.appendChild(o[k].el); });
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: 'El embudo de un recomendador' }), chips]));
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('div', { class: 'vis-chart-wrap' }, [chart]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Los milisegundos son supuestos de diseño para Mercado Barrio, no mediciones. Los de los rankings son por ítem y ya incluyen el batching: el costo real depende del modelo y del hardware. Sumar los p99 de las etapas es pesimista, porque rara vez todas tocan su p99 en la misma request: deja margen.' }));
    run();
  }

  function initSparsity(host) {
    var def = { users: 50, items: 100, nnz: 10, valB: 4, idxB: 4 };
    var f = {
      users: num('Usuarios (millones)', def.users, 1), items: num('Ítems (millones)', def.items, 1),
      nnz: num('Interacciones en un año (miles de millones)', def.nnz, 1),
      valB: num('Bytes por valor', def.valB, 1), idxB: num('Bytes por índice de columna', def.idxB, 1)
    };
    var o = {
      cells: out('Celdas de la matriz', 'usuarios × ítems'),
      dens: out('Densidad', 'interacciones / celdas'),
      dense: out('Guardada densa', 'celdas × bytes por valor'),
      csr: out('Guardada en CSR', 'interacciones × (valor + índice) + 8 B por fila'),
      avg: out('Interacciones por usuario y por ítem', 'promedios; la mayoría tiene muchas menos')
    };
    function run() {
      var v = {};
      Object.keys(f).forEach(function (k) { var n = parseFloat(f[k].input.value); v[k] = isFinite(n) && n >= 0 ? n : 0; });
      var r = sparsity(v);
      o.cells.v.textContent = r.cells >= 1e15 ? F.num(r.cells / 1e15, 1) + ' × 10¹⁵' : big(r.cells);
      o.dens.v.textContent = F.sig(r.density * 100) + ' %';
      o.dens.v.nextSibling.textContent = 'una celda de cada ' + (r.density ? big(1 / r.density) : '—');
      o.dense.v.textContent = F.bytes(r.dense);
      o.csr.v.textContent = F.bytes(r.csr);
      o.avg.v.textContent = F.num(r.perUser, 0) + ' y ' + F.num(r.perItem, 0);
    }
    var inCol = h('div', { class: 'calc-inputs' }), outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' });
    Object.keys(f).forEach(function (k) { inCol.appendChild(f[k].el); f[k].input.addEventListener('input', run); });
    Object.keys(o).forEach(function (k) { outCol.appendChild(o[k].el); });
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: 'La matriz usuario-ítem, densa o dispersa' })]));
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Las cifras de Mercado Barrio son del caso ficticio del curso. Los bytes son los de un float32 y un entero de 32 bits; con índices de 64 bits, el CSR crece la mitad. Ningún sistema real guarda la matriz densa: la cuenta muestra por qué.' }));
    run();
  }

  /* ---------- itemcf ---------- */
  var CF_USERS = ['u1', 'u2', 'u3', 'u4'], CF_ITEMS = ['A', 'B', 'C', 'D'];
  var CF_START = [[1, 1, 0, 0], [1, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1]];

  function initItemcf(host) {
    var M = CF_START.map(function (r) { return r.slice(); });
    var grid = h('div', { class: 'table-wrap' }), sims = h('div', { class: 'table-wrap' }), note = h('p', { class: 'sim-note' });
    function cell(u, i) {
      var b = h('button', { type: 'button', class: 'chip-btn rs-cell', 'aria-pressed': M[u][i] ? 'true' : 'false',
        'aria-label': CF_USERS[u] + ' compró ' + CF_ITEMS[i] + ': ' + (M[u][i] ? 'sí' : 'no'), text: M[u][i] ? '1' : '0' });
      b.addEventListener('click', function () { M[u][i] = 1 - M[u][i]; draw(); var nb = grid.querySelector('[data-c="' + u + '-' + i + '"]'); if (nb) nb.focus(); });
      b.setAttribute('data-c', u + '-' + i);
      return b;
    }
    function draw() {
      var table = h('table', { class: 't rs-grid' });
      var head = h('tr', null, [h('th', { text: 'Compró' })].concat(CF_ITEMS.map(function (n) { return h('th', { class: 'r', text: n }); })));
      table.appendChild(h('thead', null, [head]));
      var body = h('tbody');
      M.forEach(function (row, u) {
        body.appendChild(h('tr', null, [h('td', { text: CF_USERS[u] })].concat(row.map(function (x, i) { return h('td', { class: 'r' }, [cell(u, i)]); }))));
      });
      table.appendChild(body);
      grid.innerHTML = ''; grid.appendChild(table);
      var r = itemSims(M);
      var html = '<table class="t"><thead><tr><th>Coseno</th>' + CF_ITEMS.map(function (n) { return '<th class="r">' + n + '</th>'; }).join('') + '<th>Quien mira este ítem ve</th></tr></thead><tbody>';
      CF_ITEMS.forEach(function (n, i) {
        html += '<tr><td><b>' + n + '</b> (' + r.cnt[i] + ')</td>';
        CF_ITEMS.forEach(function (m, j) { html += '<td class="r">' + (i === j ? '—' : F.num(r.S[i][j].cos, 3)) + '</td>'; });
        var top = itemTop(r, i, 3);
        html += '<td>' + (top.length ? top.map(function (x) { return CF_ITEMS[x.j]; }).join(', ') : 'nada: nadie lo compró con otro') + '</td></tr>';
      });
      sims.innerHTML = html + '</tbody></table>';
      var ab = r.S[0][1];
      note.textContent = 'A y B: ' + ab.both + ' persona' + (ab.both === 1 ? '' : 's') + ' compraron los dos; A tiene ' + r.cnt[0] + ' compras y B ' + r.cnt[1] +
        ', así que el coseno es ' + ab.both + ' / √(' + r.cnt[0] + ' × ' + r.cnt[1] + ') = ' + F.num(ab.cos, 3) + '. Entre paréntesis, cuántas personas compraron cada ítem: un ítem que compra todo el mundo aparece en muchos pares, y la raíz del denominador lo frena.';
    }
    var reset = h('button', { type: 'button', class: 'btn', text: 'Volver al ejemplo' });
    reset.addEventListener('click', function () { M = CF_START.map(function (r) { return r.slice(); }); draw(); });
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Ítem a ítem: quienes compraron esto también compraron' }), reset]));
    host.appendChild(h('div', { class: 'sim-body' }, [grid, h('div', { 'aria-live': 'polite' }, [sims, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Toca una celda para agregar o quitar una compra. El coseno se calcula sobre las columnas: cada ítem es un vector con un 1 por cada persona que lo compró. Es el ejemplo de la figura 44.6; en Mercado Barrio las columnas tienen 50 millones de posiciones, casi todas en 0.' }));
    draw();
  }

  /* ---------- mf ---------- */
  function initMf(host) {
    var k = 2, lam = 0.1, S = mfInit(k, MF_SEED);
    var grid = h('div', { class: 'table-wrap' }), chart = h('div', { class: 'sim-scroll ev-chart' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    function reset() { S = mfInit(k, MF_SEED); draw(); }
    function run(n) { for (var i = 0; i < n; i++) mfStep(S, MF_LR, lam); draw(); }
    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
    function draw() {
      var html = '<table class="t rs-grid"><thead><tr><th></th>' + ['Com. 1', 'Com. 2', 'Com. 3', 'Dra. 1', 'Dra. 2', 'Dra. 3'].map(function (n) { return '<th class="r">' + n + '</th>'; }).join('') + '</tr></thead><tbody>';
      MF_R.forEach(function (row, u) {
        html += '<tr><td>' + ['Ana', 'Beto', 'Caro', 'Dani', 'Eli', 'Fede'][u] + '</td>';
        row.forEach(function (c, i) {
          var p = F.num(mfPred(S, u, i), 1);
          if (c === null) html += '<td class="r"><span class="rs-pred">' + p + '</span></td>';
          else if (typeof c === 'object') html += '<td class="r rs-test"><span class="rs-pred">' + p + '</span><span class="rs-real">prueba: ' + c.t + '</span></td>';
          else html += '<td class="r"><b>' + c + '</b><span class="rs-real">' + p + '</span></td>';
        });
        html += '</tr>';
      });
      grid.innerHTML = html + '</tbody></table>';
      var trE = mfRmse(S, S.tr), teE = mfRmse(S, S.te);
      stats.innerHTML = '';
      stats.appendChild(stat('Pasos', F.num(S.steps, 0)));
      stats.appendChild(stat('Error de entrenamiento', F.num(trE, 2)));
      stats.appendChild(stat('Error de prueba', F.num(teE, 2)));
      /* Curvas del error, entrenamiento y prueba, contra los pasos */
      var W = 640, H = 200, l = 44, b = 170, top = 16, n = Math.max(100, S.steps), Y = function (v) { return b - Math.min(2.2, v) / 2.2 * (b - top); };
      var X = function (i) { return l + i / n * (W - l - 20); };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Error de entrenamiento y error de prueba en cada paso del entrenamiento.">';
      [0, 0.5, 1, 1.5, 2].forEach(function (v) {
        s += '<line class="sim-grid" x1="' + l + '" x2="' + (W - 20) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '"/>';
        s += '<text class="sim-axis" x="' + (l - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F.num(v, 1) + '</text>';
      });
      [[0, '--l-service', 'entrenamiento'], [1, '--l-gpu', 'prueba']].forEach(function (c, ci) {
        if (!S.hist.length) return;
        var pts = S.hist.map(function (e, i) { return X(i + 1).toFixed(1) + ',' + Y(e[c[0]]).toFixed(1); }).join(' ');
        s += '<polyline points="' + pts + '" fill="none" stroke="var(' + c[1] + ')" stroke-width="2.5"' + (ci ? ' stroke-dasharray="6 4"' : '') + '/>';
      });
      s += '<text class="sim-label" x="' + l + '" y="' + (H - 8) + '">Pasos (hasta ' + F.num(n, 0) + ') · línea llena: entrenamiento · línea cortada: prueba</text>';
      chart.innerHTML = s + '</svg>';
      if (!S.steps) note.textContent = 'Los factores empiezan al azar y todas las predicciones están cerca del promedio. Entrena unos pasos y mira cómo se separan las comedias de los dramas.';
      else if (trE < 0.05 && teE > 1) note.textContent = 'Sobreajuste: el modelo reproduce casi exacto las calificaciones que vio (error de entrenamiento ' + F.num(trE, 2) + ') y se equivoca más con las que no vio (' + F.num(teE, 2) + '). Con tantos factores y sin regularización, memoriza. Sube la regularización o baja k.';
      else note.textContent = 'Después de ' + F.num(S.steps, 0) + ' pasos, el error de entrenamiento es ' + F.num(trE, 2) + ' y el de prueba ' + F.num(teE, 2) + '. Predecir siempre el promedio (' + F.num(S.mu, 2) + ') da un error de prueba de ' + F.num(Math.sqrt(S.te.reduce(function (x, e) { return x + (e[2] - S.mu) * (e[2] - S.mu); }, 0) / S.te.length), 2) + '.';
    }
    function sel(label, list, def, on) {
      var id = 'mf' + label.length + Math.random().toString(36).slice(2, 6);
      var s = h('select', { id: id }, list.map(function (v) { var o = h('option', { value: v, text: String(v) }); if (v === def) o.selected = true; return o; }));
      s.addEventListener('change', function () { on(+s.value); reset(); });
      return h('div', { class: 'field' }, [h('label', { for: id, text: label }), s]);
    }
    var b1 = h('button', { type: 'button', class: 'btn btn--primary', text: 'Un paso' }), b50 = h('button', { type: 'button', class: 'btn', text: '50 pasos' }),
      b500 = h('button', { type: 'button', class: 'btn', text: '500 pasos' }), b0 = h('button', { type: 'button', class: 'btn', text: 'Reiniciar' });
    b1.addEventListener('click', function () { run(1); });
    b50.addEventListener('click', function () { run(50); });
    b500.addEventListener('click', function () { run(500); });
    b0.addEventListener('click', reset);
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Factorización de matrices, paso a paso' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [sel('Factores (k)', [1, 2, 3, 4, 5], k, function (v) { k = v; }), sel('Regularización (λ)', [0, 0.1, 0.3, 1], lam, function (v) { lam = v; }), b1, b50, b500, b0]),
      h('div', { 'aria-live': 'polite' }, [stats, grid, chart, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'En negrita, las calificaciones con las que entrena el modelo, y debajo lo que predice. En las celdas "prueba" hay una calificación real que el modelo no ve: con ellas se mide el error de prueba. Las celdas vacías no se conocen. Predicción = promedio + u · v; cada paso es un paso de descenso por gradiente con tasa 0.02 sobre todas las calificaciones a la vez, desde factores al azar con semilla fija. El error es la raíz del error cuadrático medio, en estrellas.' }));
    draw();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="itemcf"]').forEach(initItemcf);
    document.querySelectorAll('[data-sim="mf"]').forEach(initMf);
    document.querySelectorAll('[data-calc="sparsity"]').forEach(initSparsity);
    document.querySelectorAll('[data-sim="funnel"]').forEach(initFunnel);
  });
})();
