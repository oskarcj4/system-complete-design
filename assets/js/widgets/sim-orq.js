/* Widgets del M69 (orquestadores de agentes):
   <div data-calc="orqrun">  cuánto dura y cuánto cuesta una corrida: lotes, concurrencia, límite de requests y tope de gasto */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* Cifras de ejemplo por lote: se reemplazan por las medidas en la primera corrida acotada. */
  var PRESETS = {
    primera: { name: 'Primera corrida acotada', v: { N: 50, B: 5, C: 5, m: 6, u: 1.5, k: 40, rpm: 50, cap: 20 } },
    entero: { name: 'Repositorio entero', v: { N: 3000, B: 5, C: 5, m: 6, u: 1.5, k: 40, rpm: 50, cap: 200 } },
    demas: { name: 'Concurrencia de más', v: { N: 3000, B: 5, C: 20, m: 6, u: 1.5, k: 40, rpm: 50, cap: 200 } },
    pr: { name: 'Un PR (--diff)', v: { N: 14, B: 5, C: 3, m: 6, u: 1.5, k: 40, rpm: 50, cap: 10 } }
  };

  var orqCore = {
    run: function (v) {
      var lotes = Math.ceil(v.N / Math.max(1, v.B));
      var porMin = v.m > 0 ? v.k / v.m : 0;                      // requests por minuto de un lote
      var cMax = porMin > 0 ? Math.max(1, Math.floor(v.rpm / porMin)) : v.C;
      var cEf = Math.max(1, Math.min(v.C, cMax, lotes));
      var rpmPico = Math.min(v.C, lotes) * porMin;
      var caben = v.u > 0 ? Math.floor(v.cap / v.u) : lotes;     // lotes que entran en el tope
      var hechos = Math.min(lotes, caben);
      var corta = caben < lotes;
      var exceso = corta ? Math.min(cEf - 1, lotes - hechos) * v.u : 0;
      return {
        lotes: lotes, cMax: cMax, cEf: cEf, rpmPico: rpmPico, satura: rpmPico > v.rpm,
        minutos: Math.ceil(hechos / cEf) * v.m, costo: hechos * v.u + exceso,
        hechos: hechos, archivos: Math.min(v.N, hechos * v.B), corta: corta, exceso: exceso,
        enVuelo: cEf * v.B
      };
    }
  };
  SD.orqCore = orqCore;

  function initRun(host) {
    var uid = 0;
    function num(key, label, step, hint) {
      var id = 'oq' + (++uid);
      var i = h('input', { id: id, type: 'number', min: 0, step: step, inputmode: 'decimal' });
      var kids = [h('label', { for: id, text: label }), i];
      if (hint) kids.push(h('p', { class: 'field-hint', text: hint }));
      return { key: key, el: h('div', { class: 'field' }, kids), input: i };
    }
    var f = [
      num('N', 'Archivos con candidatos', 1),
      num('B', 'Archivos por lote (--batch-size)', 1),
      num('C', 'Lotes a la vez (--concurrency)', 1),
      num('m', 'Minutos por lote', 0.5, 'Mídelo: durationMs de la primera corrida.'),
      num('u', 'USD por lote', 0.1, 'Mídelo: costUsd de la primera corrida.'),
      num('k', 'Llamadas al modelo por lote', 1),
      num('rpm', 'Límite de requests por minuto de tu clave', 1),
      num('cap', 'Tope de gasto de la corrida (USD)', 1)
    ];
    function out(label, formula) {
      var v = h('output', { class: 'out-value' });
      return { el: h('div', { class: 'out-row' }, [h('span', { class: 'out-label', text: label }), v, h('span', { class: 'out-formula', text: formula })]), v: v };
    }
    var o = {
      lotes: out('Lotes', 'archivos ÷ archivos por lote, hacia arriba'),
      rpm: out('Requests por minuto en el pico', 'lotes a la vez × llamadas ÷ minutos por lote'),
      cef: out('Lotes a la vez que aguanta tu límite', 'límite ÷ requests por minuto de un lote'),
      dur: out('Duración', 'tandas × minutos por lote, con la concurrencia que aguanta el límite'),
      cost: out('Gasto de la corrida', 'lotes hechos × USD por lote + los que estaban en vuelo'),
      cover: out('Archivos revisados', 'lotes que entran en el tope × archivos por lote')
    };
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });
    var presets = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Ejemplos' });
    function set(k) {
      var p = PRESETS[k].v;
      f.forEach(function (x) { x.input.value = p[x.key]; });
      presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
      run();
    }
    Object.keys(PRESETS).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': 'false', 'data-k': k, text: PRESETS[k].name });
      b.addEventListener('click', function () { set(k); });
      presets.appendChild(b);
    });
    function val() {
      var v = {};
      f.forEach(function (x) { var n = parseFloat(x.input.value); v[x.key] = isFinite(n) && n >= 0 ? n : 0; });
      v.N = Math.round(v.N); v.B = Math.max(1, Math.round(v.B)); v.C = Math.max(1, Math.round(v.C)); v.k = Math.round(v.k);
      return v;
    }
    function run() {
      var v = val(), r = orqCore.run(v);
      o.lotes.v.textContent = F.num(r.lotes, 0);
      o.rpm.v.textContent = F.num(r.rpmPico, 0) + (r.satura ? ' (pasa tu límite)' : '');
      o.cef.v.textContent = F.num(r.cMax, 0);
      o.dur.v.textContent = F.duration(r.minutos * 60);
      o.cost.v.textContent = F.num(r.costo, 2) + ' USD';
      o.cover.v.textContent = F.num(r.archivos, 0) + ' de ' + F.num(v.N, 0);
      var msg = [];
      if (r.satura) msg.push('Con ' + F.num(v.C, 0) + ' lotes a la vez pides ' + F.num(r.rpmPico, 0) + ' requests por minuto y tu clave admite ' + F.num(v.rpm, 0) + ': llegan respuestas 429 y reintentos. Subir la concurrencia por encima de ' + F.num(r.cMax, 0) + ' no acorta la corrida; la duración ya está calculada con ' + F.num(r.cEf, 0) + '.');
      if (r.corta) msg.push('El tope corta la corrida: entran ' + F.num(r.hechos, 0) + ' lotes de ' + F.num(r.lotes, 0) + '. Los lotes que estaban en vuelo terminan igual y suman hasta ' + F.num(r.exceso, 2) + ' USD por encima del tope. La próxima corrida retoma los archivos pending.');
      else msg.push('La corrida entra completa en el tope.');
      msg.push('En el pico hay ' + F.num(r.enVuelo, 0) + ' archivos en vuelo.');
      note.textContent = msg.join(' ');
    }
    f.forEach(function (x) { x.input.addEventListener('input', function () { presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); run(); }); });
    var inCol = h('div', { class: 'calc-inputs' }, [presets].concat(f.map(function (x) { return x.el; })));
    var outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' }, Object.keys(o).map(function (k) { return o[k].el; }).concat([note]));
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: 'Cuánto dura y cuánto cuesta una corrida' })]));
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Diseño de referencia. Los minutos, el costo y las llamadas por lote de los ejemplos son ilustrativos: mídelos en tu primera corrida acotada. Supone lotes parecidos entre sí y que el tope se revisa cuando termina cada lote.' }));
    set('primera');
  }

  SD.ready(function () {
    document.querySelectorAll('[data-calc="orqrun"]').forEach(initRun);
  });
})();
