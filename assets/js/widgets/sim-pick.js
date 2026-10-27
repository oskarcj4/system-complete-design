/* Widgets del M65 (elegir un harness):
   <div data-sim="harnesspick"> matriz ponderada: pesos por criterio, criterios eliminatorios y el ranking de cinco harnesses
   <div data-calc="passk">      pass@k contra pass^k para dos combinaciones, y si la diferencia se distingue del ruido con N tareas */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ---------- harnesspick ---------- */

  var CRIT = [
    { id: 'local', name: 'Datos en tu red', hint: 'Apuntarlo a un servidor propio o local' },
    { id: 'multi', name: 'Varios proveedores', hint: 'Cambiar de modelo sin cambiar de harness' },
    { id: 'ci', name: 'Sin nadie mirando', hint: 'Headless, salida JSON, permisos declarativos' },
    { id: 'sandbox', name: 'Aislamiento', hint: 'Sandbox del sistema por defecto' },
    { id: 'ext', name: 'Extensible', hint: 'Hooks, MCP, skills, subagentes' },
    { id: 'abierto', name: 'Código abierto', hint: 'Licencia que permite auditar y bifurcar' },
    { id: 'ide', name: 'Dentro del editor', hint: 'Experiencia integrada al IDE' }
  ];

  // Puntajes de 0 a 3. Diseño de referencia: juicio del curso sobre la documentación pública, no una medición.
  var HARN = [
    { name: 'Claude Code', s: { local: 2, multi: 1, ci: 3, sandbox: 2, ext: 3, abierto: 0, ide: 2 } },
    { name: 'Codex CLI', s: { local: 2, multi: 2, ci: 3, sandbox: 3, ext: 2, abierto: 3, ide: 2 } },
    { name: 'OpenCode', s: { local: 3, multi: 3, ci: 2, sandbox: 1, ext: 2, abierto: 3, ide: 1 } },
    { name: 'Aider', s: { local: 3, multi: 3, ci: 2, sandbox: 0, ext: 1, abierto: 3, ide: 1 } },
    { name: 'Cursor', s: { local: 1, multi: 2, ci: 1, sandbox: 2, ext: 2, abierto: 0, ide: 3 } }
  ];

  var PRESETS = {
    fintech: { name: 'Fintech regulada', w: { local: 3, multi: 1, ci: 2, sandbox: 3, ext: 2, abierto: 2, ide: 1 }, must: ['local'] },
    startup: { name: 'Startup que itera rápido', w: { local: 0, multi: 1, ci: 1, sandbox: 1, ext: 3, abierto: 0, ide: 3 }, must: [] },
    ci: { name: 'Bot de CI', w: { local: 1, multi: 1, ci: 3, sandbox: 3, ext: 2, abierto: 1, ide: 0 }, must: ['ci'] },
    lab: { name: 'Laboratorio de modelos', w: { local: 3, multi: 3, ci: 1, sandbox: 1, ext: 1, abierto: 3, ide: 0 }, must: ['multi'] }
  };

  var pickCore = {
    rank: function (w, must) {
      var max = 0;
      CRIT.forEach(function (c) { max += 3 * (w[c.id] || 0); });
      return HARN.map(function (x) {
        var sc = 0, out = [];
        CRIT.forEach(function (c) {
          sc += x.s[c.id] * (w[c.id] || 0);
          if (must.indexOf(c.id) >= 0 && x.s[c.id] < 2) out.push(c.name);
        });
        return { name: x.name, score: sc, pct: max ? sc / max : 0, out: out };
      }).sort(function (a, b) { return (a.out.length - b.out.length) || (b.score - a.score); });
    }
  };
  SD.pickCore = pickCore;

  function initPick(host) {
    host.classList.add('sim');
    var w = {}, must = [], rows = {};
    var list = h('ol', { class: 'pk-rank', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Casos' });
    Object.keys(PRESETS).forEach(function (k, i) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': i === 0 ? 'true' : 'false', text: PRESETS[k].name });
      b.addEventListener('click', function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        set(k);
      });
      g.appendChild(b);
    });
    var tbl = h('div', { class: 'pk-crit' });
    CRIT.forEach(function (c) {
      var id = 'pk' + c.id + Math.random().toString(36).slice(2, 6);
      var r = h('input', { type: 'range', min: 0, max: 3, step: 1, id: id, 'aria-label': 'Peso de ' + c.name });
      var val = h('b', { class: 'pk-w' });
      var m = h('input', { type: 'checkbox', id: id + 'm' });
      r.addEventListener('input', function () { w[c.id] = +r.value; run(); });
      m.addEventListener('change', function () {
        must = must.filter(function (x) { return x !== c.id; });
        if (m.checked) must.push(c.id);
        run();
      });
      rows[c.id] = { r: r, m: m, val: val };
      tbl.appendChild(h('div', { class: 'pk-row' }, [
        h('div', { class: 'pk-name' }, [h('label', { for: id, text: c.name }), h('span', { class: 'field-hint', text: c.hint })]),
        r, val,
        h('label', { class: 'ae-check', for: id + 'm' }, [m, ' Eliminatorio'])
      ]));
    });
    function set(k) {
      var p = PRESETS[k];
      must = p.must.slice();
      CRIT.forEach(function (c) {
        w[c.id] = p.w[c.id]; rows[c.id].r.value = p.w[c.id]; rows[c.id].m.checked = must.indexOf(c.id) >= 0;
      });
      run();
    }
    function run() {
      CRIT.forEach(function (c) { rows[c.id].val.textContent = '×' + (w[c.id] || 0); });
      var r = pickCore.rank(w, must);
      list.textContent = '';
      r.forEach(function (x) {
        var bar = h('span', { class: 'pk-bar' }, [h('span', { style: 'width:' + Math.round(x.pct * 100) + '%' })]);
        list.appendChild(h('li', { class: x.out.length ? 'is-out' : '' }, [
          h('span', { class: 'pk-h', text: x.name }), bar,
          h('span', { class: 'pk-s', text: x.out.length ? '✗ falla: ' + x.out.join(', ') : F.pct(x.pct, 0) })
        ]));
      });
      var vivos = r.filter(function (x) { return !x.out.length; });
      note.textContent = vivos.length >= 2 && vivos[0].pct - vivos[1].pct < 0.1
        ? 'Los dos primeros quedan a menos de 10 puntos: la matriz no decide. Ese es el momento de medir con tus tareas (65.8).'
        : (vivos.length ? 'La matriz descarta; no elige. Lleva a los dos o tres primeros a una prueba con tus tareas antes de decidir.'
          : 'Ningún harness pasa los criterios eliminatorios: afloja uno o considera un harness propio.');
    }
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Una matriz para descartar harnesses' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [g, tbl, list, note]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Diseño de referencia. Los puntajes de 0 a 3 son un juicio del curso a partir de la documentación pública de cada harness, y cambian con cada versión: revísalos para tu caso. Un criterio eliminatorio descarta al que tenga menos de 2.' }));
    set('fintech');
  }

  /* ---------- passk ---------- */

  var passCore = {
    at: function (p, k) { return 1 - Math.pow(1 - p, k); },
    hat: function (p, k) { return Math.pow(p, k); },
    diff: function (pa, pb, n) {          // diferencia de tasas con n tareas, sin parear
      var se = Math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n);
      return { d: pb - pa, half: 1.96 * se };
    }
  };
  SD.passCore = passCore;

  function initPass(host) {
    host.classList.add('sim');
    var fields = {};
    function num(key, label, min, max, step, val, hint) {
      var id = 'ps' + key + Math.random().toString(36).slice(2, 6);
      var i = h('input', { id: id, type: 'number', min: min, max: max, step: step, value: val, inputmode: 'decimal' });
      i.addEventListener('input', run);
      fields[key] = i;
      var kids = [h('label', { for: id, text: label }), i];
      if (hint) kids.push(h('p', { class: 'field-hint', text: hint }));
      return h('div', { class: 'field' }, kids);
    }
    var grid = h('div', { class: 'ae-fields' }, [
      num('pa', 'Combinación A: aciertos por intento (%)', 0, 100, 1, 70, 'Harness y modelo actuales.'),
      num('pb', 'Combinación B: aciertos por intento (%)', 0, 100, 1, 78, 'La candidata.'),
      num('k', 'k (intentos)', 1, 20, 1, 4),
      num('n', 'Tareas del set', 5, 2000, 5, 50)
    ]);
    var plot = h('div', { class: 'sim-scroll ae-chart' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    function chart(pa, pb, k) {
      var W = 640, H = 210, L = 44, B = 28, T = 14, K = 10;
      var x = function (i) { return L + (W - L - 120) * (i - 1) / (K - 1); };
      var y = function (v) { return T + (H - T - B) * (1 - v); };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="pass@k y pass^k de las dos combinaciones para k de 1 a 10">';
      s += '<path class="sim-axis" style="fill:none" d="M' + L + ' ' + T + ' V' + (H - B) + ' H' + (W - 110) + '"/>';
      [0, 0.5, 1].forEach(function (v) { s += '<text class="sim-label" x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v * 100) + '%</text>'; });
      for (var i = 1; i <= K; i++) s += '<text class="sim-label" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + i + '</text>';
      var series = [[pa, passCore.at, 'var(--l-client)', '5 4', 'A pass@k'], [pb, passCore.at, 'var(--link)', '5 4', 'B pass@k'],
                    [pa, passCore.hat, 'var(--l-client)', '', 'A pass^k'], [pb, passCore.hat, 'var(--link)', '', 'B pass^k']];
      var labels = [];
      series.forEach(function (S) {
        var d = '';
        for (var i = 1; i <= K; i++) d += (i > 1 ? ' L' : 'M') + x(i).toFixed(1) + ' ' + y(S[1](S[0], i)).toFixed(1);
        s += '<path d="' + d + '" style="fill:none; stroke:' + S[2] + '; stroke-width:2' + (S[3] ? '; stroke-dasharray:' + S[3] : '') + '"/>';
        labels.push({ y: y(S[1](S[0], K)) + 4, t: S[4] });
      });
      labels.sort(function (a, b) { return a.y - b.y; });
      for (var j = 1; j < labels.length; j++) labels[j].y = Math.max(labels[j].y, labels[j - 1].y + 14);   // sin pisarse
      labels.forEach(function (l) { s += '<text class="sim-label" x="' + (x(K) + 8) + '" y="' + l.y.toFixed(1) + '">' + l.t + '</text>'; });
      s += '<path d="M' + x(k) + ' ' + T + ' V' + (H - B) + '" style="stroke: var(--label-3); stroke-width:1"/>';
      return s + '</svg>';
    }
    function run() {
      var pa = Math.min(1, Math.max(0, (+fields.pa.value || 0) / 100));
      var pb = Math.min(1, Math.max(0, (+fields.pb.value || 0) / 100));
      var k = Math.max(1, Math.min(20, Math.round(+fields.k.value || 1)));
      var n = Math.max(1, Math.round(+fields.n.value || 1));
      plot.innerHTML = chart(pa, pb, Math.min(k, 10));
      var d = passCore.diff(pa, pb, n);
      stats.textContent = '';
      [['pass@' + k + ' (A / B)', F.pct(passCore.at(pa, k), 0) + ' / ' + F.pct(passCore.at(pb, k), 0)],
       ['pass^' + k + ' (A / B)', F.pct(passCore.hat(pa, k), 0) + ' / ' + F.pct(passCore.hat(pb, k), 0)],
       ['Diferencia por intento', (d.d >= 0 ? '+' : '') + F.num(d.d * 100, 1) + ' puntos'],
       ['Intervalo del 95 %', '± ' + F.num(d.half * 100, 1) + ' puntos']
      ].forEach(function (x) { stats.appendChild(h('div', { class: 'sim-stat' }, [h('span', { text: x[0] }), h('b', { text: x[1] })])); });
      note.textContent = Math.abs(d.d) > d.half
        ? '✓ Con ' + n + ' tareas la diferencia queda fuera del ruido. Sigue mirando por tarea: un promedio mejor puede esconder tareas que antes salían y ahora no.'
        : '✗ Con ' + n + ' tareas la diferencia cabe dentro del ruido: no puedes decir cuál es mejor. Suma tareas, o compara de a pares sobre las mismas tareas, que achica el intervalo.';
    }
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'pass@k, pass^k y el ruido de un set chico' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [grid, plot, stats, note]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Supone intentos independientes con la misma tasa en todas las tareas: pass@k = 1 − (1 − p)^k y pass^k = p^k. El intervalo es el de dos proporciones con N tareas sin parear (1.96 errores estándar); comparar las mismas tareas en las dos combinaciones lo achica.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="harnesspick"]').forEach(initPick);
    document.querySelectorAll('[data-calc="passk"]').forEach(initPass);
  });
})();
