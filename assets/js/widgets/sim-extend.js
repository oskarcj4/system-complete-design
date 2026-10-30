/* Widget del M67 (extender un harness):
   <div data-calc="extbudget"> cuánto contexto fijo ocupan las extensiones en cada turno (archivo de memoria,
   descripciones de skills y herramientas MCP por adelantado o con búsqueda) y cuánto cuesta en una sesión,
   con y sin caché del prefijo. Lógica en SD.extCore. Los tokens por definición y por nombre son supuestos. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, fmt = SD.fmt;

  var NAME_TOKENS = 15;        // supuesto: tokens por nombre de herramienta con búsqueda activa
  var USED_TOOLS = 3;          // supuesto: definiciones que el modelo busca y usa en la sesión
  var CACHE_WRITE = 1.25, CACHE_READ = 0.1;

  var extCore = {
    compute: function (p) {
      var defs = p.servers * p.tools * p.defTokens;
      var mode = p.search;
      if (mode === 'auto') mode = defs < 0.1 * p.window ? 'off' : 'on';
      var mcp = mode === 'off' ? defs : p.servers * p.tools * NAME_TOKENS + Math.min(USED_TOOLS, p.servers * p.tools) * p.defTokens;
      var skills = p.skills * p.skillTokens;
      var fixed = p.memory + skills + mcp;
      var price = p.price / 1e6;
      var noCache = fixed * p.turns * price;
      var cached = fixed * (CACHE_WRITE + CACHE_READ * (p.turns - 1)) * price;
      return { defs: defs, mode: mode, mcp: mcp, skills: skills, memory: p.memory, fixed: fixed,
        pct: fixed / p.window, noCache: noCache, cached: cached, upfront: defs };
    }
  };
  SD.extCore = extCore;

  var PRESETS = {
    pocos: { name: 'Dos servidores', servers: 2, tools: 8, defTokens: 400, skills: 6, skillTokens: 60, memory: 2000, search: 'auto' },
    muchos: { name: 'Diez servidores', servers: 10, tools: 20, defTokens: 450, skills: 25, skillTokens: 60, memory: 3000, search: 'off' },
    todo: { name: 'Plugins a granel', servers: 15, tools: 30, defTokens: 500, skills: 80, skillTokens: 80, memory: 6000, search: 'off' }
  };

  function init(host) {
    host.classList.add('sim');
    var p = { servers: 5, tools: 16, defTokens: 400, skills: 20, skillTokens: 60, memory: 2500, search: 'off', window: 200000, turns: 40, price: 3 };
    var inputs = {};
    function num(key, label, min, max, step) {
      var id = 'ex' + key + Math.random().toString(36).slice(2, 6);
      var i = h('input', { type: 'number', id: id, min: min, max: max, step: step, value: p[key] });
      i.addEventListener('input', function () { var v = +i.value; if (!isNaN(v)) { p[key] = Math.max(min, Math.min(max, v)); run(); } });
      inputs[key] = i;
      return h('div', { class: 'field' }, [h('label', { for: id, text: label }), i]);
    }
    var modeGroup = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Búsqueda de herramientas' });
    [['off', 'Todo por adelantado'], ['auto', 'auto (10 % de la ventana)'], ['on', 'Búsqueda activa']].forEach(function (m) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'data-m': m[0], text: m[1] });
      b.addEventListener('click', function () { p.search = m[0]; run(); });
      modeGroup.appendChild(b);
    });
    var presetGroup = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Ejemplos' });
    Object.keys(PRESETS).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', text: PRESETS[k].name });
      b.addEventListener('click', function () {
        var x = PRESETS[k];
        Object.keys(x).forEach(function (f) { if (f !== 'name') { p[f] = x[f]; if (inputs[f]) inputs[f].value = x[f]; } });
        run();
      });
      presetGroup.appendChild(b);
    });
    var bar = h('div', { class: 'xb-bar', 'aria-hidden': 'true' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
    function run() {
      modeGroup.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === p.search ? 'true' : 'false'); });
      var r = extCore.compute(p);
      bar.textContent = '';
      [['memoria', r.memory, 'xb-mem'], ['skills', r.skills, 'xb-skill'], ['MCP', r.mcp, 'xb-mcp']].forEach(function (s) {
        var w = Math.min(100, 100 * s[1] / p.window);
        if (w > 0) bar.appendChild(h('span', { class: 'xb-seg ' + s[2], style: 'width:' + w.toFixed(2) + '%', title: s[0] + ': ' + fmt.num(s[1]) }));
      });
      stats.textContent = '';
      stats.appendChild(stat('Contexto fijo por turno', fmt.num(Math.round(r.fixed)) + ' tokens'));
      stats.appendChild(stat('De la ventana de 200 000', fmt.pct(r.pct)));
      stats.appendChild(stat('MCP (' + (r.mode === 'off' ? 'todo cargado' : 'con búsqueda') + ')', fmt.num(Math.round(r.mcp))));
      stats.appendChild(stat('Descripciones de skills', fmt.num(r.skills)));
      stats.appendChild(stat('Sesión de 40 turnos sin caché', 'US$ ' + r.noCache.toFixed(2)));
      stats.appendChild(stat('Con caché del prefijo', 'US$ ' + r.cached.toFixed(2)));
      var msg = 'Las definiciones de MCP completas suman ' + fmt.num(r.upfront) + ' tokens. ';
      if (p.search === 'auto') msg += r.mode === 'off' ? 'Ocupan menos del 10 % de la ventana, así que auto las carga todas. ' : 'Pasan del 10 % de la ventana, así que auto activa la búsqueda. ';
      if (r.pct > 0.15) msg += 'Más del 15 % de la ventana se va antes de que el agente lea un archivo: es atención que no usa para tu código.';
      else msg += 'El costo de lo fijo baja mucho con caché, pero lo que ocupa en la ventana no.';
      note.textContent = msg;
    }
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: '¿Cuánto contexto ocupan tus extensiones?' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      presetGroup,
      h('div', { class: 'ae-fields' }, [
        num('servers', 'Servidores MCP', 0, 30, 1), num('tools', 'Herramientas por servidor', 1, 60, 1),
        num('defTokens', 'Tokens por definición', 50, 3000, 50), num('skills', 'Skills instaladas', 0, 200, 1),
        num('skillTokens', 'Tokens por descripción de skill', 10, 400, 10), num('memory', 'Archivo de memoria (tokens)', 0, 40000, 500)
      ]),
      h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'Herramientas MCP' }), modeGroup]),
      bar, stats, note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Supuestos: 15 tokens por nombre de herramienta con búsqueda, 3 definiciones usadas por sesión, entrada a US$ 3 por millón, escritura de caché 1.25× una vez y lectura 0.1× en los 39 turnos siguientes. Solo cuenta lo fijo: la conversación y los archivos leídos van aparte (M68).' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-calc="extbudget"]').forEach(init);
  });
})();
