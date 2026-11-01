/* Widget del M72 (evals de agentes):
   <div data-sim="trajcheck">  corridas sintéticas de un agente de código sobre un set de tareas, revisadas con
   los graders que el lector prende: lo que dice el agente, los tests ocultos, la trayectoria (archivos fuera de
   alcance, comandos prohibidos) y el presupuesto. Muestra la tasa medida, la real, los aprobados falsos,
   pass^k, el intervalo del 95 % y el costo de la corrida. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var COST = 0.447;   // USD por tarea, la cuenta de M65.7
  var GRADERS = [
    { id: 'dice', name: 'El agente dice que terminó' },
    { id: 'tests', name: 'Tests ocultos' },
    { id: 'tray', name: 'Trayectoria: alcance y comandos' },
    { id: 'pres', name: 'Presupuesto de tokens' }
  ];

  var evalCore = {
    /* Cada tarea tiene una dificultad; cada corrida, cuatro hechos. Valores sintéticos para enseñar la forma. */
    build: function (n, k) {
      var r = rng(72), tasks = [];
      for (var i = 0; i < n; i++) {
        var p = 0.25 + 0.7 * r();               // probabilidad de resolverla en una corrida
        var runs = [];
        for (var j = 0; j < k; j++) {
          var solved = r() < p;
          var outside = r() < 0.10;            // tocó un archivo fuera de alcance o corrió un comando prohibido
          var over = r() < 0.08;               // se pasó del presupuesto
          var says = solved ? r() < 0.97 : r() < 0.70;   // dice "listo" aunque no lo esté, a veces
          runs.push({ solved: solved, outside: outside, over: over, says: says });
        }
        tasks.push(runs);
      }
      return tasks;
    },
    ok: function (run) { return run.solved && !run.outside && !run.over; },
    pass: function (run, g) {
      if (g.dice && !run.says) return false;
      if (g.tests && !run.solved) return false;
      if (g.tray && run.outside) return false;
      if (g.pres && run.over) return false;
      return true;
    },
    eval: function (tasks, g) {
      var runs = 0, meas = 0, real = 0, falseOk = 0, falseBad = 0, allK = 0, allKReal = 0;
      tasks.forEach(function (rs) {
        var every = true, everyReal = true;
        rs.forEach(function (run) {
          runs++;
          var m = evalCore.pass(run, g), t = evalCore.ok(run);
          if (m) meas++; if (t) real++;
          if (m && !t) falseOk++;
          if (!m && t) falseBad++;
          if (!m) every = false; if (!t) everyReal = false;
        });
        if (every) allK++; if (everyReal) allKReal++;
      });
      var p = meas / runs, n = tasks.length;
      return { p: p, real: real / runs, falseOk: falseOk / runs, falseBad: falseBad / runs,
               passk: allK / n, passkReal: allKReal / n, ci: 1.96 * Math.sqrt(p * (1 - p) / n) };
    }
  };
  SD.evalCore = evalCore;

  var uid = 0;
  function init(host) {
    var id = 'ev' + (++uid);
    var state = { n: 50, k: 5, g: { dice: true, tests: false, tray: false, pres: false } };

    var chips = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Graders' });
    GRADERS.forEach(function (gr) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(state.g[gr.id]), text: gr.name });
      b.addEventListener('click', function () { state.g[gr.id] = !state.g[gr.id]; b.setAttribute('aria-pressed', String(state.g[gr.id])); draw(); });
      chips.appendChild(b);
    });
    var nSel = h('select', { id: id + 'n' });
    [20, 50, 200].forEach(function (v) { nSel.appendChild(h('option', { value: v, text: v + ' tareas' })); });
    nSel.value = String(state.n);
    nSel.addEventListener('change', function () { state.n = parseInt(nSel.value, 10); draw(); });
    var kIn = h('input', { type: 'range', id: id + 'k', min: 1, max: 8, step: 1, value: state.k });
    var kOut = h('output', { for: id + 'k' });
    kIn.addEventListener('input', function () { state.k = parseInt(kIn.value, 10); draw(); });

    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var grid = h('div', { class: 'sim-scroll ev-grid', 'aria-hidden': 'true' });
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });

    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
    function pct(x) { return F.num(x * 100, 1) + ' %'; }

    function draw() {
      kOut.textContent = state.k + (state.k === 1 ? ' corrida' : ' corridas');
      var tasks = evalCore.build(state.n, state.k);
      var r = evalCore.eval(tasks, state.g);
      stats.innerHTML = '';
      stats.appendChild(stat('Tasa medida por corrida', pct(r.p) + ' ± ' + F.num(r.ci * 100, 1)));
      stats.appendChild(stat('Tasa real por corrida', pct(r.real)));
      stats.appendChild(stat('Aprobados que no debían', pct(r.falseOk)));
      stats.appendChild(stat('pass^' + state.k + ' medido (todas las corridas)', pct(r.passk)));
      stats.appendChild(stat('Costo de esta corrida del set', F.num(state.n * state.k * COST, 2) + ' USD'));

      grid.innerHTML = '';
      var shown = tasks.slice(0, 20);
      shown.forEach(function (rs, i) {
        var row = h('div', { class: 'ev-row' }, [h('span', { class: 'ev-name', text: 'T' + (i + 1) })]);
        rs.forEach(function (run) {
          var m = evalCore.pass(run, state.g), t = evalCore.ok(run);
          var cls = m && t ? 'ev-cell ev-ok' : (!m && !t ? 'ev-cell ev-bad' : (m ? 'ev-cell ev-false' : 'ev-cell ev-miss'));
          row.appendChild(h('span', { class: cls, text: m && t ? '✓' : (!m && !t ? '✗' : (m ? '!' : '?')) }));
        });
        grid.appendChild(row);
      });

      var msg = [];
      var g = state.g;
      if (!g.dice && !g.tests && !g.tray && !g.pres) msg.push('Sin graders, todo aprueba: la tasa medida es 100 % y no dice nada.');
      else {
        if (g.dice && !g.tests) msg.push('Creerle al agente aprueba corridas que no resolvieron nada.');
        if (g.tests && !g.tray) msg.push('Los tests ocultos atrapan lo que no funciona, pero no las corridas que tocaron archivos fuera de alcance.');
        if (g.tests && g.tray && g.pres) msg.push('Con los tres graders objetivos, la tasa medida coincide con la real.');
      }
      if (state.n === 20) msg.push('Con 20 tareas, el intervalo es tan ancho que dos agentes a 10 puntos de distancia pueden ser iguales.');
      if (state.k > 1) msg.push('pass^' + state.k + ' pide que las ' + state.k + ' corridas aprueben: mide si puedes confiar en el agente, no si alguna vez acierta.');
      note.textContent = msg.join(' ');
    }

    var controls = h('div', { class: 'sim-controls' }, [
      chips,
      h('div', { class: 'field' }, [h('label', { for: id + 'n', text: 'Tamaño del set' }), nSel]),
      h('div', { class: 'field' }, [h('label', { for: id + 'k', text: 'Corridas por tarea (k)' }), kIn, kOut])
    ]);
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Qué aprueba cada grader' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [controls, stats,
      h('p', { class: 'sim-note', text: 'Primeras 20 tareas, una celda por corrida. ✓ aprobada y correcta; ✗ rechazada e incorrecta; ! aprobada sin estar bien; ? rechazada estando bien.' }),
      grid, note]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Corridas sintéticas con semilla fija: cada tarea tiene su dificultad; cada corrida puede resolverla o no, tocar algo fuera de alcance (10 %), pasarse del presupuesto (8 %) y decir que terminó (el 70 % de las que fallan lo dice igual). El costo usa 0.447 USD por tarea, la cuenta de M65.7. Las proporciones son ilustrativas.' }));
    draw();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="trajcheck"]').forEach(init);
  });
})();
