/* Widget del M68 (context engineering y memoria):
   <div data-sim="promptorder"> dónde va un dato que cambia (la hora, el git status) dentro del prompt, y qué le hace
   al caché del prefijo en una sesión de N turnos: tokens leídos del caché, escritos y costo con y sin caché.
   Lógica en SD.promptCore. Los tamaños de las capas y el precio son supuestos del ejemplo. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, fmt = SD.fmt;

  var LAYERS = { tools: 14000, system: 3000, project: 4000, dyn: 50 };
  var CACHE_WRITE = 1.25, CACHE_READ = 0.1, PRICE = 3 / 1e6;   // supuesto: entrada a US$ 3 por millón

  // Tokens que van antes del dato dinámico, según su posición.
  function before(pos, conv) {
    if (pos === 'start') return 0;
    if (pos === 'system') return LAYERS.tools + LAYERS.system;
    return LAYERS.tools + LAYERS.system + LAYERS.project + conv;   // 'end': junto al pedido nuevo
  }

  var promptCore = {
    run: function (p) {
      var fixed = LAYERS.tools + LAYERS.system + LAYERS.project + LAYERS.dyn;
      var turns = [], prev = 0, read = 0, write = 0, plain = 0;
      for (var t = 1; t <= p.turns; t++) {
        var conv = p.perTurn * t;
        var total = fixed + conv;
        var hit;
        if (t === 1) hit = 0;
        else if (p.mcp && t === Math.ceil(p.turns / 2)) hit = 0;            // cambia la lista de herramientas
        else if (p.change === 'turn' && p.pos !== 'end') hit = Math.min(prev, before(p.pos, conv));
        else hit = prev;                                                     // el prefijo anterior coincide entero
        var w = total - hit;
        turns.push({ t: t, hit: hit, write: w, total: total });
        read += hit; write += w; plain += total; prev = total;
      }
      var cached = (read * CACHE_READ + write * CACHE_WRITE) * PRICE;
      return { turns: turns, read: read, write: write, plain: plain, hitRate: read / plain,
        costPlain: plain * PRICE, costCached: cached };
    }
  };
  SD.promptCore = promptCore;

  var POS = [['start', 'Al principio del system prompt'], ['system', 'Después del system prompt'], ['end', 'Al final, con el pedido nuevo']];
  var CHG = [['turn', 'Cambia en cada turno (hora con minutos)'], ['session', 'Fijo en la sesión (solo la fecha)']];

  function init(host) {
    host.classList.add('sim');
    var p = { pos: 'start', change: 'turn', turns: 40, perTurn: 3000, mcp: false };

    function chips(list, key, label) {
      var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': label });
      list.forEach(function (o) {
        var b = h('button', { type: 'button', class: 'chip-btn', 'data-v': o[0], text: o[1] });
        b.addEventListener('click', function () { p[key] = o[0]; run(); });
        g.appendChild(b);
      });
      return g;
    }
    function num(key, label, min, max, step) {
      var id = 'po' + key + Math.random().toString(36).slice(2, 6);
      var i = h('input', { type: 'number', id: id, min: min, max: max, step: step, value: p[key] });
      i.addEventListener('input', function () { var v = +i.value; if (!isNaN(v) && v >= min) { p[key] = Math.min(max, v); run(); } });
      return h('div', { class: 'field' }, [h('label', { for: id, text: label }), i]);
    }
    var posG = chips(POS, 'pos', 'Dónde va el dato que cambia');
    var chgG = chips(CHG, 'change', 'Cada cuánto cambia');
    var mcpId = 'pomcp' + Math.random().toString(36).slice(2, 6);
    var mcpBox = h('input', { type: 'checkbox', id: mcpId });
    mcpBox.addEventListener('change', function () { p.mcp = mcpBox.checked; run(); });

    var strip = h('div', { class: 'po-strip', 'aria-hidden': 'true' });
    var chart = h('div', { class: 'po-chart sim-scroll' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }

    function drawStrip() {
      strip.textContent = '';
      var order = [['tools', 'herramientas'], ['system', 'system'], ['project', 'proyecto'], ['conv', 'conversación']];
      var idx = { start: 0, system: 2, end: 4 }[p.pos];
      var segs = order.map(function (o) { return { k: o[0], name: o[1] }; });
      segs.splice(idx, 0, { k: 'dyn', name: p.change === 'turn' ? 'hora 14:07' : 'fecha' });
      segs.forEach(function (s) {
        strip.appendChild(h('span', { class: 'po-seg po-' + s.k + (s.k === 'dyn' && p.change === 'turn' ? ' po-dyn--hot' : ''), text: s.name }));
      });
    }

    function drawChart(r) {
      var W = 640, H = 150, n = r.turns.length, bw = (W - 40) / n;
      var max = r.turns[n - 1].total;
      var NS = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 30));
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Tokens por turno: parte leída del caché y parte escrita');
      function rect(x, y, w, hh, cls) {
        var e = document.createElementNS(NS, 'rect');
        e.setAttribute('x', x.toFixed(1)); e.setAttribute('y', y.toFixed(1));
        e.setAttribute('width', Math.max(0, w).toFixed(1)); e.setAttribute('height', Math.max(0, hh).toFixed(1));
        e.setAttribute('class', cls); svg.appendChild(e);
      }
      function text(x, y, s, anchor) {
        var e = document.createElementNS(NS, 'text');
        e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('class', 'sim-label');
        if (anchor) e.setAttribute('text-anchor', anchor);
        e.textContent = s; svg.appendChild(e);
      }
      r.turns.forEach(function (d, i) {
        var x = 36 + i * bw, hr = H * d.hit / max, hw = H * d.write / max;
        rect(x, H - hr, bw - 1, hr, 'po-bar-read');
        rect(x, H - hr - hw, bw - 1, hw, 'po-bar-write');
      });
      var ax = document.createElementNS(NS, 'line');
      ax.setAttribute('x1', 34); ax.setAttribute('x2', W - 4); ax.setAttribute('y1', H); ax.setAttribute('y2', H);
      ax.setAttribute('class', 'sim-axis'); svg.appendChild(ax);
      text(30, 12, fmt.num(Math.round(max / 1000)) + ' k', 'end');
      text(30, H, '0', 'end');
      text(36, H + 16, 'turno 1', 'start');
      text(W - 4, H + 16, 'turno ' + n, 'end');
      chart.textContent = '';
      chart.appendChild(svg);
      chart.appendChild(h('p', { class: 'po-legend' }, [
        h('span', { class: 'po-key po-key--read' }), document.createTextNode('leído del caché (0.1×)'),
        h('span', { class: 'po-key po-key--write' }), document.createTextNode('escrito en el caché (1.25×)')
      ]));
    }

    function run() {
      posG.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === p.pos ? 'true' : 'false'); });
      chgG.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === p.change ? 'true' : 'false'); });
      var r = promptCore.run(p);
      drawStrip(); drawChart(r);
      stats.textContent = '';
      stats.appendChild(stat('Tokens de entrada en la sesión', fmt.num(r.plain)));
      stats.appendChild(stat('Leídos del caché', fmt.pct(r.hitRate)));
      stats.appendChild(stat('Sin caché', 'US$ ' + r.costPlain.toFixed(2)));
      stats.appendChild(stat('Con caché', 'US$ ' + r.costCached.toFixed(2)));
      var msg;
      if (p.change === 'turn' && p.pos === 'start') msg = 'La hora cambia en cada turno y está antes que todo: ningún prefijo coincide y cada turno se escribe entero a 1.25×. Sale más caro que no tener caché.';
      else if (p.change === 'turn' && p.pos === 'system') msg = 'Herramientas y system se leen del caché, pero el proyecto y toda la conversación quedan detrás de la hora y se vuelven a escribir en cada turno.';
      else msg = 'Todo lo del turno anterior coincide y se lee a 0.1×; solo se escribe lo nuevo. Es el orden que usan los harnesses: lo que casi no cambia, primero.';
      if (p.mcp) msg += ' En el turno ' + Math.ceil(p.turns / 2) + ' cambia la lista de herramientas y la sesión entera se vuelve a escribir una vez.';
      note.textContent = msg;
    }

    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: '¿Dónde pones lo que cambia?' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'Dónde va el dato que cambia' }), posG]),
      h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'Cada cuánto cambia' }), chgG]),
      h('div', { class: 'ae-fields' }, [num('turns', 'Turnos de la sesión', 2, 80, 1), num('perTurn', 'Tokens nuevos por turno', 200, 20000, 100)]),
      h('label', { class: 'po-check', for: mcpId }, [mcpBox, document.createTextNode(' Conectar un servidor MCP a mitad de sesión (herramientas cargadas por adelantado)')]),
      strip, chart, stats, note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Supuestos: herramientas 14 000 tokens, system 3 000, proyecto 4 000, el dato 50; entrada a US$ 3 por millón, escritura de caché 1.25× y lectura 0.1×, sin pausas más largas que el TTL. El caché coincide por prefijo exacto: un cambio invalida todo lo que viene después.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="promptorder"]').forEach(init);
  });
})();
