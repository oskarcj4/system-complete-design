/* Widgets del re-ranking y la exploración (M47):
   <div data-sim="mmr">          diez candidatos con su puntaje del ranker y su categoría; con λ se arma la lista de cinco con
                                 MMR (λ · puntaje − (1 − λ) · la similitud más alta con lo ya elegido), paso a paso
   <div data-sim="bandit">       tres miniaturas con un CTR real escondido; cinco políticas (solo explotar, epsilon-greedy,
                                 UCB1, Thompson y al azar) reparten impresiones; se ven las estimaciones, las Beta de
                                 Thompson y el arrepentimiento acumulado (datos sintéticos con semilla)
   <div data-sim="feedbackloop"> 20 ítems de igual calidad durante 30 días: el ranking por clics acumulados, con o sin
                                 exploración y con o sin corrección por posición; cuántas impresiones se lleva cada uno
   La lógica pura está en SD.banditCore, sin DOM, para probarla en Node. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ======================= Lógica pura ======================= */

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  /* Gamma(k, 1) con Marsaglia y Tsang; Beta(a, b) = X / (X + Y). */
  function gamma(k, r) {
    if (k < 1) return gamma(k + 1, r) * Math.pow(r(), 1 / k);
    var d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      var x = gauss(r), v = 1 + c * x;
      if (v <= 0) continue;
      v = v * v * v;
      var u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function beta(a, b, r) { var x = gamma(a, r), y = gamma(b, r); return x / (x + y); }
  function lnGamma(z) {               /* Lanczos, para dibujar la densidad Beta */
    var g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
      12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
    z -= 1; var x = c[0];
    for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
    var t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betaPdf(x, a, b) {
    if (x <= 0 || x >= 1) return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) + lnGamma(a + b) - lnGamma(a) - lnGamma(b));
  }

  /* ---- MMR ---- */
  var CANDS = [
    { id: 'A', name: 'Zapatilla de running, marca 1', cat: 'run', sub: 'zap', s: 0.90 },
    { id: 'B', name: 'Zapatilla de running, marca 1, otro color', cat: 'run', sub: 'zap', s: 0.88, twin: 'A' },
    { id: 'C', name: 'Zapatilla de running, marca 2', cat: 'run', sub: 'zap', s: 0.85 },
    { id: 'D', name: 'Mochila de hidratación', cat: 'run', sub: 'acc', s: 0.70 },
    { id: 'E', name: 'Reloj con GPS', cat: 'tec', sub: 'rel', s: 0.60 },
    { id: 'F', name: 'Zapatilla de running, marca 3', cat: 'run', sub: 'zap', s: 0.84 },
    { id: 'G', name: 'Medias técnicas', cat: 'run', sub: 'acc', s: 0.66 },
    { id: 'H', name: 'Video de reseña: cómo elegir zapatillas', cat: 'vid', sub: 'vid', s: 0.62 },
    { id: 'I', name: 'Auriculares deportivos', cat: 'tec', sub: 'aur', s: 0.55 },
    { id: 'J', name: 'Zapatilla de running, marca 2, otro color', cat: 'run', sub: 'zap', s: 0.83, twin: 'C' }
  ];
  /* Similitud entre dos candidatos: la misma variante 0.9, misma subcategoría 0.6, misma categoría 0.3, otra 0.1. */
  function simOf(a, b) {
    if (a.id === b.id) return 1;
    if (a.twin === b.id || b.twin === a.id) return 0.9;
    if (a.sub === b.sub) return 0.6;
    if (a.cat === b.cat) return 0.3;
    return 0.1;
  }
  function mmr(cands, lambda, k) {
    var left = cands.slice(), chosen = [], steps = [];
    while (chosen.length < k && left.length) {
      var best = null, rows = [];
      left.forEach(function (c) {
        var maxSim = 0, with_ = null;
        chosen.forEach(function (p) { var s = simOf(c, p); if (s > maxSim) { maxSim = s; with_ = p.id; } });
        var v = lambda * c.s - (1 - lambda) * maxSim;
        var row = { c: c, maxSim: maxSim, with_: with_, v: v };
        rows.push(row);
        if (!best || v > best.v + 1e-12) best = row;
      });
      rows.sort(function (x, y) { return y.v - x.v; });
      steps.push({ rows: rows, pick: best });
      chosen.push(best.c);
      left = left.filter(function (c) { return c !== best.c; });
    }
    var cats = {}, sumS = 0;
    chosen.forEach(function (c) { cats[c.sub] = 1; sumS += c.s; });
    return { chosen: chosen, steps: steps, distinct: Object.keys(cats).length, meanScore: sumS / chosen.length };
  }

  /* ---- Bandit ---- */
  var ARMS = [
    { name: 'Miniatura 1', p: 0.040 },
    { name: 'Miniatura 2', p: 0.050 },
    { name: 'Miniatura 3', p: 0.065 }
  ];
  var POLICIES = {
    greedy: { name: 'Solo explotar' },
    eps: { name: 'Epsilon-greedy (ε = 0.1)' },
    ucb: { name: 'UCB1' },
    ts: { name: 'Thompson' },
    random: { name: 'Al azar (A/B fijo)' }
  };
  var WARM = 20;
  function runBandit(policy, n, seed) {
    var r = rng(seed || 47), arms = ARMS.map(function (a) { return { p: a.p, n: 0, c: 0 }; });
    var best = Math.max.apply(null, ARMS.map(function (a) { return a.p; })), regret = 0, clicks = 0, curve = [];
    var every = Math.max(1, Math.floor(n / 100));
    function est(a) { return a.n ? a.c / a.n : 0; }
    function argmax(f) { var bi = 0, bv = -Infinity; arms.forEach(function (a, i) { var v = f(a, i); if (v > bv) { bv = v; bi = i; } }); return bi; }
    for (var t = 1; t <= n; t++) {
      var i;
      if (policy === 'random') i = Math.floor(r() * arms.length);
      else if (policy === 'ts') i = argmax(function (a) { return beta(1 + a.c, 1 + a.n - a.c, r); });
      else {
        var untried = -1, warm = policy === 'ucb' ? 1 : WARM;          /* cada brazo se prueba WARM veces antes de decidir */
        for (var j = 0; j < arms.length; j++) if (arms[j].n < warm) { untried = j; break; }
        if (untried >= 0) i = untried;
        else if (policy === 'greedy') i = argmax(est);
        else if (policy === 'eps') i = r() < 0.1 ? Math.floor(r() * arms.length) : argmax(est);
        else i = argmax(function (a) { return est(a) + Math.sqrt(2 * Math.log(t) / a.n); });
      }
      var a = arms[i], click = r() < a.p ? 1 : 0;
      a.n++; a.c += click; clicks += click; regret += best - a.p;
      if (t % every === 0 || t === n) curve.push({ t: t, regret: regret });
    }
    return { arms: arms, regret: regret, clicks: clicks, curve: curve, n: n, bestClicks: best * n };
  }

  /* ---- Bucle de retroalimentación ---- */
  var LOOP = { items: 20, days: 30, sessions: 1000, slots: 5, ctr: 0.05 };
  var LOOP_MODES = {
    pop: { name: 'Por clics acumulados' },
    explore: { name: 'Clics + 10 % de exploración' },
    fair: { name: 'CTR corregido por posición + exploración' }
  };
  function exam(pos) { return 1 / (Math.log(pos + 2) / Math.LN2); }   /* pos desde 0: 1, 0.63, 0.5, 0.43, 0.39 */
  function runLoop(mode, days, seed) {
    var r = rng(seed || 7), N = LOOP.items, items = [], d, s, k;
    for (var i = 0; i < N; i++) items.push({ id: i + 1, imp: 0, clk: 0, ex: 0, start: 0.5 * r() });
    var history = [];
    for (d = 0; d < days; d++) {
      for (s = 0; s < LOOP.sessions; s++) {
        var score = items.map(function (it) {
          var v;
          if (mode === 'fair') v = (it.clk + 1) / (it.ex + 20);           /* clics sobre impresiones "examinadas", con un previo */
          else v = it.clk + it.start;                                       /* popularidad: clics acumulados */
          return { it: it, v: v };
        }).sort(function (a, b) { return b.v - a.v; });
        var shown = score.slice(0, LOOP.slots).map(function (x) { return x.it; });
        if (mode !== 'pop') {
          for (k = 0; k < LOOP.slots; k++) if (r() < 0.1) {
            var cand = items[Math.floor(r() * N)];
            if (shown.indexOf(cand) < 0) shown[k] = cand;
          }
        }
        shown.forEach(function (it, pos) {
          var e = exam(pos);
          it.imp++; it.ex += e;
          if (r() < LOOP.ctr * e) it.clk++;
        });
      }
      history.push(items.map(function (it) { return it.imp; }));
    }
    var imps = items.map(function (it) { return it.imp; }), total = imps.reduce(function (a, b) { return a + b; }, 0);
    var sorted = imps.slice().sort(function (a, b) { return b - a; });
    var top3 = (sorted[0] + sorted[1] + sorted[2]) / total;
    var withSome = imps.filter(function (x) { return x >= total * 0.01; }).length;
    /* Gini de la exposición: 0 = todos iguales, 1 = uno se lleva todo */
    var asc = imps.slice().sort(function (a, b) { return a - b; }), cum = 0, g = 0;
    asc.forEach(function (x, i) { cum += x; g += (2 * (i + 1) - N - 1) * x; });
    var gini = g / (N * total);
    return { items: items, total: total, top3: top3, withSome: withSome, gini: gini, history: history };
  }

  SD.banditCore = { rng: rng, beta: beta, betaPdf: betaPdf, CANDS: CANDS, simOf: simOf, mmr: mmr, ARMS: ARMS, POLICIES: POLICIES,
    runBandit: runBandit, LOOP: LOOP, LOOP_MODES: LOOP_MODES, exam: exam, runLoop: runLoop };

  /* ======================= Interfaz ======================= */

  var uid = 0;
  function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
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
    return box;
  }
  function pct(x, d) { return F.num(x * 100, d == null ? 1 : d) + ' %'; }

  /* ---- MMR ---- */
  function initMmr(host) {
    var lambda = 0.6, k = 5;
    var lid = 'mm' + (++uid);
    var range = h('input', { id: lid, type: 'range', min: 0, max: 1, step: 0.05, value: lambda });
    var lout = h('output', { for: lid, text: F.num(lambda, 2) });
    var list = h('ol', { class: 'bd-list' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var stepsBox = h('div', { class: 'table-wrap' });
    range.addEventListener('input', function () { lambda = +range.value; lout.textContent = F.num(lambda, 2); draw(); });
    function draw() {
      var r = mmr(CANDS, lambda, k);
      list.innerHTML = '';
      r.chosen.forEach(function (c, i) {
        var st = r.steps[i].pick;
        list.appendChild(h('li', {}, [h('b', { text: c.id + '. ' + c.name }),
          h('span', { text: ' puntaje ' + F.num(c.s, 2) + (st.with_ ? ' · se parece a ' + st.with_ + ' (' + F.num(st.maxSim, 1) + ')' : ' · el primero no compite con nadie') + ' · MMR ' + F.num(st.v, 3) })]));
      });
      var s2 = r.steps[1];
      stepsBox.innerHTML = '';
      if (s2) {
        stepsBox.appendChild(h('table', { class: 't' }, [
          h('caption', { text: 'Segundo lugar: cada candidato contra lo ya elegido (' + r.chosen[0].id + ')' }),
          h('thead', {}, [h('tr', {}, ['Candidato', 'Puntaje', 'Similitud más alta', 'λ · puntaje − (1 − λ) · similitud'].map(function (x) { return h('th', { text: x }); }))]),
          h('tbody', {}, s2.rows.slice(0, 6).map(function (row) {
            return h('tr', { class: row === s2.pick ? 'bd-pick' : '' }, [h('td', { text: row.c.id }), h('td', { class: 'r', text: F.num(row.c.s, 2) }),
              h('td', { class: 'r', text: F.num(row.maxSim, 1) }),
              h('td', { class: 'r', text: F.num(lambda, 2) + ' × ' + F.num(row.c.s, 2) + ' − ' + F.num(1 - lambda, 2) + ' × ' + F.num(row.maxSim, 1) + ' = ' + F.num(row.v, 3) })]);
          }))]));
      }
      stats.innerHTML = '';
      stats.appendChild(stat('Subcategorías distintas', r.distinct + ' de ' + k));
      stats.appendChild(stat('Puntaje promedio', F.num(r.meanScore, 3)));
      if (lambda >= 0.999) note.textContent = 'Con λ = 1, MMR ignora la similitud: es el orden del ranker. Cuatro zapatillas arriba, dos de ellas el mismo modelo en otro color.';
      else if (lambda <= 0.001) note.textContent = 'Con λ = 0, solo importa no parecerse: la lista es variada, pero mete ítems que el ranker puso abajo de todo.';
      else note.textContent = 'La lista resigna un poco de puntaje promedio a cambio de variedad. El primer lugar siempre es el de mayor puntaje: todavía no hay nada con qué compararlo.';
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'MMR: relevancia contra parecido' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [h('div', { class: 'field' }, [h('label', { for: lid, text: 'λ (cuánto pesa el puntaje frente a la variedad)' }), range, lout])]),
      h('div', { 'aria-live': 'polite' }, [stats, list, note]), stepsBox]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Similitud de ejemplo: el mismo modelo en otro color 0.9, la misma subcategoría 0.6, la misma categoría 0.3 y otra categoría 0.1. En producción sale del coseno entre los embeddings de los ítems (M45). Los puntajes son los del ranker, ya calibrados.' }));
    draw();
  }

  /* ---- Bandit ---- */
  var N_OPTS = [100, 1000, 10000, 50000];
  function initBandit(host) {
    var policy = 'ts', n = 1000, seed = 47;
    var plot = h('div', { class: 'sim-scroll bd-plot' }), table = h('div', { class: 'table-wrap' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var chips = chipRow(POLICIES, policy, function (k2) { policy = k2; draw(); }, 'Política');
    var nid = 'bn' + (++uid);
    var nSel = h('select', { id: nid }, N_OPTS.map(function (v) { var o = h('option', { value: v, text: F.num(v) }); if (v === n) o.selected = true; return o; }));
    nSel.addEventListener('change', function () { n = +nSel.value; draw(); });
    var again = h('button', { type: 'button', class: 'btn', text: 'Otra corrida (otra semilla)' });
    again.addEventListener('click', function () { seed++; draw(); });
    function draw() {
      var r = runBandit(policy, n, seed);
      table.innerHTML = '';
      table.appendChild(h('table', { class: 't' }, [
        h('thead', {}, [h('tr', {}, ['Brazo', 'CTR real (escondido)', 'Impresiones', 'Clics', 'CTR estimado', 'Beta(1 + clics, 1 + no clics)'].map(function (x) { return h('th', { text: x }); }))]),
        h('tbody', {}, r.arms.map(function (a, i) {
          return h('tr', {}, [h('td', { text: ARMS[i].name }), h('td', { class: 'r', text: pct(a.p) }), h('td', { class: 'r', text: F.num(a.n) + ' (' + pct(a.n / r.n, 0) + ')' }),
            h('td', { class: 'r', text: F.num(a.c) }), h('td', { class: 'r', text: a.n ? pct(a.c / a.n) : 'sin datos' }),
            h('td', { class: 'r', text: 'Beta(' + F.num(1 + a.c) + ', ' + F.num(1 + a.n - a.c) + ')' })]);
        }))]));
      /* Densidades Beta de cada brazo */
      var W = 600, H = 220, L = 40, B = 190, X = function (x) { return L + x / 0.15 * (W - L - 20); };
      var curves = '', maxY = 0, pts = [];
      r.arms.forEach(function (a, i) {
        var line = [];
        for (var q = 1; q < 150; q++) { var x = q / 1000; var y = betaPdf(x, 1 + a.c, 1 + a.n - a.c); line.push([x, y]); if (y > maxY) maxY = y; }
        pts.push(line);
      });
      var colors = ['var(--l-service)', 'var(--l-queue)', 'var(--l-gpu)'];
      pts.forEach(function (line, i) {
        var d = line.map(function (p, j) { return (j ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + (B - p[1] / maxY * 160).toFixed(1); }).join(' ');
        curves += '<path d="' + d + '" fill="none" stroke="' + colors[i] + '" stroke-width="2.2"/>';
        var tx = X(ARMS[i].p);
        curves += '<line x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="' + B + '" y2="26" stroke="' + colors[i] + '" stroke-dasharray="3 3"/>';
        var ly = 24 + 18 * i;
        curves += '<line x1="420" x2="444" y1="' + (ly - 4) + '" y2="' + (ly - 4) + '" stroke="' + colors[i] + '" stroke-width="2.2"/>';
        curves += '<text class="sim-label" x="450" y="' + ly + '">' + ARMS[i].name + ' (real ' + pct(ARMS[i].p) + ')</text>';
      });
      var axis = '<line class="sim-grid" x1="' + L + '" x2="' + (W - 20) + '" y1="' + B + '" y2="' + B + '"/>';
      [0, 0.05, 0.1, 0.15].forEach(function (v) { axis += '<text class="sim-axis" x="' + X(v).toFixed(1) + '" y="' + (B + 18) + '" text-anchor="middle">' + pct(v, 0) + '</text>'; });
      plot.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Lo que cree Thompson de cada brazo: una curva Beta por miniatura. Cuantas más impresiones tiene un brazo, más angosta es su curva; las líneas punteadas son el CTR real.">' + axis + curves + '</svg>';
      stats.innerHTML = '';
      stats.appendChild(stat('Clics', F.num(r.clicks)));
      stats.appendChild(stat('Con el mejor brazo siempre', F.num(Math.round(r.bestClicks))));
      stats.appendChild(stat('Arrepentimiento', F.num(r.regret, 1) + ' clics'));
      var bestShare = r.arms[2].n / r.n, msg;
      if (policy === 'greedy') msg = 'Solo explotar prueba cada brazo 20 veces y después se queda con el que tuvo suerte en esas pruebas. Prueba "Otra corrida": a veces acierta, a veces se clava en una miniatura peor para siempre.';
      else if (policy === 'random') msg = 'Al azar es un A/B fijo: aprende bien los tres CTR, pero gasta dos tercios de las impresiones en brazos peores durante toda la prueba.';
      else if (policy === 'eps') msg = 'Epsilon-greedy explora un 10 % al azar para siempre: nunca se clava, pero sigue gastando ese 10 % aunque ya sepa cuál es mejor.';
      else if (policy === 'ucb') msg = 'UCB1 elige el brazo con el mayor techo optimista: la estimación más un bono que crece cuando un brazo tiene pocas impresiones.';
      else msg = 'Thompson saca un número al azar de la curva de cada brazo y juega el mayor. Los brazos dudosos (curva ancha) a veces sacan un número alto y reciben pruebas; cuando la curva se angosta, dejan de recibirlas solos.';
      note.textContent = 'El mejor brazo recibió el ' + pct(bestShare, 0) + ' de las impresiones. ' + msg;
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Tres miniaturas, una política' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [chips,
      h('div', { class: 'sim-controls' }, [h('div', { class: 'field' }, [h('label', { for: nid, text: 'Impresiones' }), nSel]), again]),
      h('div', { 'aria-live': 'polite' }, [stats, table, plot, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Datos sintéticos con semilla. Arrepentimiento: los clics esperados que se perdieron por no mostrar siempre el mejor brazo, Σ (0.065 − CTR del brazo elegido). Las curvas son la creencia de Thompson aunque elijas otra política: con los mismos conteos, cualquiera puede leerlas.' }));
    draw();
  }

  /* ---- Bucle de retroalimentación ---- */
  function initLoop(host) {
    var mode = 'pop', days = 30;
    var did = 'fl' + (++uid);
    var range = h('input', { id: did, type: 'range', min: 1, max: LOOP.days, step: 1, value: days });
    var dout = h('output', { for: did, text: String(days) });
    var plot = h('div', { class: 'sim-scroll bd-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var chips = chipRow(LOOP_MODES, mode, function (k2) { mode = k2; draw(); }, 'Cómo se ordena');
    range.addEventListener('input', function () { days = +range.value; dout.textContent = String(days); draw(); });
    function draw() {
      var r = runLoop(mode, days, 7);
      var W = 620, H = 240, L = 50, B = 200, bw = (W - L - 20) / LOOP.items;
      var max = Math.max.apply(null, r.items.map(function (it) { return it.imp; })) || 1;
      var s = '<line class="sim-grid" x1="' + L + '" x2="' + (W - 20) + '" y1="' + B + '" y2="' + B + '"/>';
      var fair = r.total / LOOP.items, fy = B - fair / max * 170;
      r.items.forEach(function (it, i) {
        var hgt = it.imp / max * 170, x = L + i * bw + 3;
        s += '<rect x="' + x.toFixed(1) + '" y="' + (B - hgt).toFixed(1) + '" width="' + (bw - 6).toFixed(1) + '" height="' + Math.max(1, hgt).toFixed(1) + '" rx="2" fill="var(--l-service)" fill-opacity="0.75"><title>Ítem ' + it.id + ': ' + F.num(it.imp) + ' impresiones, ' + F.num(it.clk) + ' clics</title></rect>';
        if (i % 2 === 0) s += '<text class="sim-axis" x="' + (x + (bw - 6) / 2).toFixed(1) + '" y="' + (B + 16) + '" text-anchor="middle">' + it.id + '</text>';
      });
      s += '<line x1="' + L + '" x2="' + (W - 20) + '" y1="' + fy.toFixed(1) + '" y2="' + fy.toFixed(1) + '" stroke="var(--label-2)" stroke-dasharray="5 4"/>';
      s += '<text class="sim-label" x="' + (W - 22) + '" y="' + (fy - 6).toFixed(1) + '" text-anchor="end">reparto parejo: ' + F.num(Math.round(fair)) + '</text>';
      s += '<text class="sim-label" x="' + ((W + L) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Ítem (los 20 tienen el mismo CTR real, 5 %)</text>';
      plot.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Impresiones acumuladas de cada uno de los 20 ítems. La línea punteada es lo que recibiría cada uno con un reparto parejo.">' + s + '</svg>';
      stats.innerHTML = '';
      stats.appendChild(stat('Los 3 que más recibieron', pct(r.top3, 0) + ' de las impresiones'));
      stats.appendChild(stat('Ítems con al menos 1 %', r.withSome + ' de ' + LOOP.items));
      stats.appendChild(stat('Gini de la exposición', F.num(r.gini, 2)));
      if (mode === 'pop') note.textContent = 'Todos son igual de buenos, y aun así unos pocos se llevan casi todo: los que tuvieron unos clics de suerte el primer día subieron arriba, arriba se ven más, y verse más da más clics. El modelo "confirma" una diferencia que no existe.';
      else if (mode === 'explore') note.textContent = 'La exploración le da algunas impresiones a todos, pero el ranking sigue premiando clics acumulados: el que ya iba adelante sigue sumando más por estar arriba.';
      else note.textContent = 'Dividir los clics por la atención que recibió cada posición (y un previo para los que tienen pocos datos) mide la calidad y no la exposición: como todos son iguales, la exposición se reparte mucho más.';
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Veinte ítems iguales, treinta días' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [chips,
      h('div', { class: 'sim-controls' }, [h('div', { class: 'field' }, [h('label', { for: did, text: 'Días simulados' }), range, dout])]),
      h('div', { 'aria-live': 'polite' }, [stats, plot, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Simulación con semilla: 1 000 sesiones por día, 5 lugares por sesión; la probabilidad de mirar cada lugar es 1 / log₂(posición + 1) (1, 0.63, 0.5, 0.43 y 0.39) y el clic, 5 % de esa probabilidad. Gini: 0 si todos reciben lo mismo, cerca de 1 si uno se lleva todo.' }));
    draw();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="mmr"]').forEach(initMmr);
    document.querySelectorAll('[data-sim="bandit"]').forEach(initBandit);
    document.querySelectorAll('[data-sim="feedbackloop"]').forEach(initLoop);
  });
})();
