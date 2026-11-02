/* Widgets de M50 (servir y operar un recomendador):
   <div data-calc="recbudget">   el presupuesto de latencia del feed por etapa, y la flota del ranking pesado
   <div data-sim="freshness">    cuánto tarda la estimación del CTR de un ítem viral según el pipeline de features
   Lógica en SD.serveCore. Los milisegundos y los FLOPs son supuestos de diseño; se dicen así en la página. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ---------- lógica ---------- */
  var core = {
    budget: function (s) {
      var retr = s.modo === 'serie' ? s.fuentes * s.msFuente + 5 : s.msFuente + 5;
      var stages = [
        { id: 'recuperacion', name: 'Recuperación', ms: retr },
        { id: 'filtros', name: 'Filtros', ms: 5 },
        { id: 'features', name: 'Leer features', ms: s.msFeatures },
        { id: 'liviano', name: 'Ranking liviano', ms: s.liviano > 0 ? s.liviano * s.msLiviano : 0 },
        { id: 'pesado', name: 'Ranking pesado', ms: s.pesado * s.msPesado / Math.max(1, s.shards) },
        { id: 'reranking', name: 'Re-ranking', ms: 5 },
        { id: 'red', name: 'Red y armado', ms: 20 }
      ];
      var total = stages.reduce(function (a, b) { return a + b.ms; }, 0);
      var scoresHeavy = s.rps * s.pesado, scoresLight = s.rps * s.liviano;
      var gpusRaw = scoresHeavy * s.mflop * 1e6 / (s.tflops * 1e12);
      return {
        stages: stages, total: total, margin: s.presupuesto - total,
        tail: 1 - Math.pow(0.99, s.fuentes),
        scoresHeavy: scoresHeavy, scoresLight: scoresLight,
        gpusRaw: gpusRaw, gpus: Math.ceil(gpusRaw * (1 + s.holgura / 100))
      };
    },
    /* CTR real de un ítem en la hora t (0 a 24): viral sube a las 2 h y decae; estable no cambia */
    trueCtr: function (kind, t) {
      if (kind === 'estable' || t < 2) return 0.02;
      return 0.02 + 0.08 * Math.exp(-(t - 2) / 8);
    },
    mean: function (kind, a, b) {
      var n = 60, s = 0;
      for (var i = 0; i < n; i++) s += core.trueCtr(kind, a + (b - a) * (i + 0.5) / n);
      return s / n;
    },
    /* Estimación disponible a la hora t según el pipeline */
    estimate: function (kind, pipe, t) {
      if (pipe === 'diario') return 0.02;                         // el lote de anoche: el día anterior entero
      if (pipe === 'hora') {
        var ready = Math.floor(t - 0.25);                        // la hora cerrada más reciente, con 15 min de cálculo
        if (ready < 1) return 0.02;
        return core.mean(kind, ready - 1, ready);
      }
      var tau = 10 / 60, lag = 0.5 / 60, x = 0.02, dt = 1 / 120;  // streaming: promedio móvil de 10 min, 30 s de retraso
      for (var u = 0; u <= t - lag; u += dt) x += (core.trueCtr(kind, u) - x) * dt / tau;
      return x;
    },
    run: function (kind, pipe) {
      var pts = [], react = null, err = 0, n = 0;
      for (var t = 0; t <= 24.0001; t += 0.05) {
        var r = core.trueCtr(kind, t), e = core.estimate(kind, pipe, t);
        pts.push({ t: t, r: r, e: e });
        if (react === null && kind === 'viral' && t >= 2 && e >= 0.05) react = t - 2;
        if (t >= 2 && t <= 8) { err += Math.abs(r - e) / r; n++; }
      }
      return { pts: pts, react: react, err: n ? err / n : 0 };
    }
  };
  SD.serveCore = core;

  function stat(label, value) {
    return h('div', { class: 'sim-stat' }, [h('span', { class: 'sim-stat-label', text: label }), h('b', { class: 'sim-stat-value', text: value })]);
  }
  function chip(text, pressed, fn) {
    return h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': pressed ? 'true' : 'false', text: text, onclick: fn });
  }
  function field(label, value, fn, step) {
    var id = 'sv' + Math.random().toString(36).slice(2, 8);
    var inp = h('input', { id: id, type: 'number', value: value, min: 0, step: step || 'any', inputmode: 'decimal' });
    inp.addEventListener('input', function () { var x = parseFloat(inp.value); if (isFinite(x) && x >= 0) fn(x); });
    return { el: h('div', { class: 'field' }, [h('label', { for: id, text: label }), inp]), inp: inp };
  }
  function frame(root, title) {
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: title })]));
    var body = h('div', { class: 'sim-body' });
    root.appendChild(body);
    return body;
  }

  /* ---------- recbudget ---------- */
  var BASE = { presupuesto: 200, fuentes: 5, msFuente: 20, modo: 'paralelo', msFeatures: 15, liviano: 9000, msLiviano: 0.002,
    pesado: 500, msPesado: 0.1, shards: 1, rps: 400000000 * 3 / 86400, mflop: 20, tflops: 10, holgura: 40 };
  var PRESETS = [
    { name: 'Mercado Barrio', set: {} },
    { name: 'Fuentes en serie', set: { modo: 'serie' } },
    { name: 'Sin ranking liviano', set: { liviano: 0, pesado: 9000 } },
    { name: 'Pesado partido en 4', set: { pesado: 2000, shards: 4 } }
  ];
  function initBudget(root) {
    var st = Object.assign({}, BASE), fields = {};
    var body = frame(root, 'El presupuesto del feed y la flota del ranker');
    var chips = h('div', { class: 'sim-controls', role: 'group', 'aria-label': 'Configuración' });
    PRESETS.forEach(function (p, i) {
      chips.appendChild(chip(p.name, i === 0, function () {
        chips.querySelectorAll('button').forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
        st = Object.assign({}, BASE, p.set);
        Object.keys(fields).forEach(function (k) { fields[k].inp.value = st[k]; });
        render();
      }));
    });
    var grid = h('div', { class: 'sim-controls' });
    [['fuentes', 'Fuentes de candidatos', 1], ['msFuente', 'ms p99 de cada fuente'], ['pesado', 'Ítems al ranking pesado', 1],
     ['msPesado', 'ms por ítem del pesado'], ['shards', 'Partes en paralelo del pesado', 1], ['mflop', 'MFLOP por ítem del pesado'],
     ['tflops', 'TFLOPS efectivos por GPU']].forEach(function (d) {
      fields[d[0]] = field(d[1], st[d[0]], function (x) { st[d[0]] = x; render(); }, d[2]);
      grid.appendChild(fields[d[0]].el);
    });
    var plot = h('div', { class: 'sv-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    body.appendChild(chips); body.appendChild(grid);
    body.appendChild(h('div', { 'aria-live': 'polite' }, [plot, stats, note]));
    function render() {
      var r = core.budget(st), W = 620, x0 = 10, x1 = 610, maxv = Math.max(st.presupuesto, r.total) * 1.05;
      function X(v) { return x0 + v / maxv * (x1 - x0); }
      var s = '<svg viewBox="0 0 ' + W + ' 150" role="img" aria-label="Barra apilada con los milisegundos de cada etapa contra el presupuesto de ' + st.presupuesto + ' ms">';
      var acc = 0;
      r.stages.forEach(function (g, i) {
        if (g.ms <= 0) return;
        var a = X(acc), b = X(acc + g.ms);
        s += '<rect x="' + a.toFixed(1) + '" y="30" width="' + Math.max(1, b - a - 1).toFixed(1) + '" height="34" rx="4" class="sv-seg sv-seg--' + (i % 4) + '"/>';
        if (b - a > 34) s += '<text class="sim-label" x="' + ((a + b) / 2).toFixed(1) + '" y="52" text-anchor="middle">' + F.num(g.ms, g.ms < 10 ? 1 : 0) + '</text>';
        var ly = 84 + (i % 3) * 16;
        s += '<text class="sim-label" x="' + ((a + b) / 2).toFixed(1) + '" y="' + ly + '" text-anchor="middle">' + g.name + '</text>';
        acc += g.ms;
      });
      s += '<line x1="' + X(st.presupuesto).toFixed(1) + '" y1="18" x2="' + X(st.presupuesto).toFixed(1) + '" y2="74" class="sv-limit"/>';
      s += '<text class="sim-label" x="' + X(st.presupuesto).toFixed(1) + '" y="12" text-anchor="' + (X(st.presupuesto) > 540 ? 'end' : 'middle') + '">presupuesto ' + st.presupuesto + ' ms</text>';
      s += '<text class="sim-label" x="10" y="144">Milisegundos p99 por etapa, en el servidor.</text></svg>';
      plot.innerHTML = s;
      stats.innerHTML = '';
      stats.appendChild(stat('Total', F.num(r.total, 0) + ' ms'));
      stats.appendChild(stat(r.margin >= 0 ? 'Margen' : 'Se pasa por', F.num(Math.abs(r.margin), 0) + ' ms'));
      stats.appendChild(stat('Puntuaciones por segundo, pesado', F.num(Math.round(r.scoresHeavy))));
      stats.appendChild(stat('GPUs del pesado (con ' + st.holgura + ' % de holgura)', F.num(r.gpus)));
      note.textContent = (st.modo === 'serie'
        ? 'En serie, la recuperación suma las ' + st.fuentes + ' fuentes: ' + F.num(st.fuentes * st.msFuente, 0) + ' ms antes de rankear nada. '
        : 'En paralelo, la recuperación espera a la fuente más lenta. Con ' + st.fuentes + ' fuentes, la chance de que alguna pase su p99 en una request es 1 − 0.99^' + st.fuentes + ' = ' + F.num(r.tail * 100, 1) + ' %: por eso cada fuente lleva un timeout y la request sigue sin ella. ')
        + 'La flota: ' + F.num(Math.round(r.scoresHeavy)) + ' puntuaciones por segundo × ' + st.mflop + ' MFLOP = ' + F.num(r.gpusRaw, 1) + ' GPUs a ' + st.tflops + ' TFLOPS efectivos, más la holgura para picos y para perder una zona.';
    }
    render();
  }

  /* ---------- freshness ---------- */
  var PIPES = [{ id: 'diario', name: 'Lote diario' }, { id: 'hora', name: 'Cada hora' }, { id: 'stream', name: 'Streaming' }];
  function initFresh(root) {
    var st = { kind: 'viral', pipe: 'stream' };
    var body = frame(root, 'Un video se vuelve viral a las 2 de la mañana');
    var kinds = h('div', { class: 'sim-controls', role: 'group', 'aria-label': 'Ítem' });
    var pipes = h('div', { class: 'sim-controls', role: 'group', 'aria-label': 'Pipeline de features' });
    function group(box, list, key) {
      list.forEach(function (d) {
        box.appendChild(chip(d.name, st[key] === d.id, function () {
          st[key] = d.id;
          box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.textContent === d.name ? 'true' : 'false'); });
          render();
        }));
      });
    }
    group(kinds, [{ id: 'viral', name: 'Ítem viral' }, { id: 'estable', name: 'Ítem estable' }], 'kind');
    group(pipes, PIPES, 'pipe');
    var plot = h('div', { class: 'sv-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    body.appendChild(kinds); body.appendChild(pipes);
    body.appendChild(h('div', { 'aria-live': 'polite' }, [plot, stats, note]));
    function render() {
      var r = core.run(st.kind, st.pipe), x0 = 50, x1 = 600, y0 = 170, y1 = 16;
      function X(t) { return x0 + t / 24 * (x1 - x0); }
      function Y(v) { return y0 - v / 0.11 * (y0 - y1); }
      var s = '<svg viewBox="0 0 620 200" role="img" aria-label="CTR real y CTR estimado del ítem a lo largo de 24 horas">';
      [0, 0.05, 0.1].forEach(function (v) {
        s += '<line x1="' + x0 + '" y1="' + Y(v).toFixed(1) + '" x2="' + x1 + '" y2="' + Y(v).toFixed(1) + '" class="sim-grid"/>';
        s += '<text class="sim-label" x="' + (x0 - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end">' + F.num(v * 100, 0) + ' %</text>';
      });
      [0, 6, 12, 18, 24].forEach(function (t) { s += '<text class="sim-label" x="' + X(t).toFixed(1) + '" y="190" text-anchor="middle">' + t + ' h</text>'; });
      function path(key) { return r.pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p[key]).toFixed(1); }).join(' '); }
      s += '<path d="' + path('r') + '" class="sv-real"/><path d="' + path('e') + '" class="sv-est"/>';
      s += '<text class="sim-label sv-real-t" x="' + (X(2.4)).toFixed(1) + '" y="' + (Y(0.1) + 2).toFixed(1) + '">real</text>';
      s += '<text class="sim-label sv-est-t" x="' + X(19).toFixed(1) + '" y="' + (Y(r.pts[r.pts.length - 30].e) - 8).toFixed(1) + '">lo que ve el ranker</text></svg>';
      plot.innerHTML = s;
      stats.innerHTML = '';
      stats.appendChild(stat('Tarda en reaccionar', st.kind === 'estable' ? 'no hay nada que ver' : r.react === null ? 'más de 22 h' : r.react < 1 ? F.num(r.react * 60, 0) + ' min' : F.num(r.react, 1) + ' h'));
      stats.appendChild(stat('Error medio, de 2 a 8 h', F.num(r.err * 100, 0) + ' %'));
      stats.appendChild(stat('Recálculos por día', st.pipe === 'diario' ? '1' : st.pipe === 'hora' ? '24' : 'continuo'));
      note.textContent = st.pipe === 'diario'
        ? 'El lote de anoche resume el día anterior: el ranker sigue creyendo que el video tiene un 2 % de CTR mientras la gente lo mira cinco veces más. Mañana se entera, cuando el pico ya pasó.'
        : st.pipe === 'hora'
          ? 'Cada hora se recalcula con la hora cerrada anterior, más 15 minutos de cómputo: la estimación llega en escalones y siempre una hora tarde. Sirve para lo que cambia en horas, no en minutos.'
          : 'El stream actualiza un promedio móvil de 10 minutos con 30 segundos de retraso: sigue la subida casi enseguida. Cuesta un job que no se apaga nunca y un feature store que acepta escrituras continuas.';
    }
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-calc="recbudget"]').forEach(initBudget);
    document.querySelectorAll('[data-sim="freshness"]').forEach(initFresh);
  });
})();
