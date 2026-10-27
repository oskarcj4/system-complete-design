/* Widgets del M64 (anatomía de un harness):
   <div data-sim="editexact">  una herramienta de edición por reemplazo exacto: cuándo aplica, cuándo es ambigua y cuándo rechaza
   <div data-calc="ctxbudget"> el contexto de una sesión turno a turno: prefijo fijo, historial, compactación y costo con y sin caché */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ---------- editexact ---------- */

  var FILE = [
    'def precio(item):',
    '    if item is None:',
    '        return None',
    '    return item.precio * 1.21',
    '',
    'def stock(item):',
    '    if item is None:',
    '        return None',
    '    return item.stock'
  ].join('\n');

  var CASES = {
    unico: { name: 'Único', old: '    return item.precio * 1.21', neu: '    return round(item.precio * 1.21, 2)', stale: false },
    ambiguo: { name: 'Ambiguo', old: '        return None', neu: '        return 0', stale: false },
    contexto: { name: 'Con contexto', old: 'def stock(item):\n    if item is None:\n        return None', neu: 'def stock(item):\n    if item is None:\n        return 0', stale: false },
    espacios: { name: 'Espacios distintos', old: '  return item.stock', neu: '  return max(item.stock, 0)', stale: false },
    cambiado: { name: 'Archivo cambiado', old: '    return item.precio * 1.21', neu: '    return item.precio * 1.19', stale: true }
  };

  function count(hay, needle) {
    if (!needle) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
    return n;
  }

  function initEdit(host) {
    host.classList.add('sim');
    var file = h('textarea', { class: 'ae-area', rows: '9', spellcheck: 'false', 'aria-label': 'Contenido del archivo' });
    var oldS = h('textarea', { class: 'ae-area', rows: '3', spellcheck: 'false', 'aria-label': 'old_string' });
    var newS = h('textarea', { class: 'ae-area', rows: '3', spellcheck: 'false', 'aria-label': 'new_string' });
    var stale = h('input', { type: 'checkbox', id: 'ae-stale' + Math.random().toString(36).slice(2, 7) });
    var all = h('input', { type: 'checkbox', id: 'ae-all' + Math.random().toString(36).slice(2, 7) });
    var out = h('pre', { class: 'tc-pre ae-out' }, [h('code')]);
    var verdict = h('p', { class: 'tc-verdict', 'aria-live': 'polite' });
    var bApply = h('button', { type: 'button', class: 'btn btn--primary', text: 'Aplicar la edición' });

    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Casos' });
    Object.keys(CASES).forEach(function (k, idx) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': idx === 0 ? 'true' : 'false', text: CASES[k].name });
      b.addEventListener('click', function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        load(k);
      });
      g.appendChild(b);
    });

    function load(k) {
      var c = CASES[k];
      file.value = FILE; oldS.value = c.old; newS.value = c.neu;
      stale.checked = c.stale; all.checked = false;
      apply();
    }
    function apply() {
      var src = file.value, o = oldS.value, n = newS.value, k = count(src, o);
      out.firstChild.textContent = '';
      verdict.className = 'tc-verdict';
      if (stale.checked) {
        verdict.textContent = '✗ Rechazada: el archivo cambió desde la última lectura (otro proceso o tú lo editaron). El modelo tiene que volver a leerlo antes de editar.';
        verdict.className += ' is-bad';
        return;
      }
      if (!o) {
        verdict.textContent = '✗ old_string vacío: no hay nada que buscar.';
        verdict.className += ' is-bad';
        return;
      }
      if (k === 0) {
        verdict.textContent = '✗ Sin coincidencias: old_string no aparece tal cual (mira espacios, tabulaciones y saltos de línea). El error vuelve al modelo, que suele releer y reintentar.';
        verdict.className += ' is-bad';
        return;
      }
      if (k > 1 && !all.checked) {
        verdict.textContent = '✗ Ambigua: old_string aparece ' + k + ' veces. Hay que sumar líneas de contexto para que sea única, o pedir replace_all a propósito.';
        verdict.className += ' is-bad';
        return;
      }
      var res = all.checked ? src.split(o).join(n) : src.replace(o, function () { return n; });
      var a = src.split('\n'), b = res.split('\n'), lines = [];
      var max = Math.max(a.length, b.length);
      for (var i = 0; i < max; i++) {
        if (a[i] === b[i]) lines.push('  ' + (b[i] === undefined ? '' : b[i]));
        else {
          if (a[i] !== undefined) lines.push('- ' + a[i]);
          if (b[i] !== undefined) lines.push('+ ' + b[i]);
        }
      }
      out.firstChild.textContent = lines.join('\n');
      verdict.textContent = '✓ Aplicada: ' + (all.checked ? k + ' reemplazos (replace_all).' : '1 reemplazo, en el único lugar donde aparece.') + ' El modelo solo escribió las líneas que cambian.';
      verdict.className += ' is-ok';
    }
    bApply.addEventListener('click', apply);

    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Editar por reemplazo exacto' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      g,
      h('div', { class: 'ae-grid' }, [
        h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'precios.py (lo que hay en disco)' }), file]),
        h('div', { class: 'ae-col' }, [
          h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'old_string' }), oldS]),
          h('div', { class: 'field' }, [h('span', { class: 'tc-label', text: 'new_string' }), newS])
        ])
      ]),
      h('div', { class: 'tc-row' }, [
        h('label', { class: 'ae-check', for: all.id }, [all, ' replace_all']),
        h('label', { class: 'ae-check', for: stale.id }, [stale, ' El archivo cambió desde la última lectura']),
        bApply
      ]),
      verdict, out
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Las reglas son las de la herramienta Edit de Claude Code y de str_replace en el editor de texto de Anthropic: coincidencia exacta, única salvo replace_all, y lectura previa. Puedes editar los tres campos.' }));
    load('unico');
  }

  /* ---------- ctxbudget ---------- */

  var PRESETS = {
    corta: { name: 'Tarea corta', v: { sys: 3000, tools: 6000, mem: 1500, turnos: 15, porTurno: 3000, win: 200000, umbral: 80, resumen: 6000, pin: 3, pout: 15 } },
    larga: { name: 'Sesión larga', v: { sys: 3000, tools: 6000, mem: 1500, turnos: 120, porTurno: 3000, win: 200000, umbral: 80, resumen: 6000, pin: 3, pout: 15 } },
    mcp: { name: 'Muchos servidores MCP', v: { sys: 3000, tools: 40000, mem: 1500, turnos: 60, porTurno: 3000, win: 200000, umbral: 80, resumen: 6000, pin: 3, pout: 15 } },
    memoria: { name: 'CLAUDE.md enorme', v: { sys: 3000, tools: 6000, mem: 25000, turnos: 60, porTurno: 3000, win: 200000, umbral: 80, resumen: 6000, pin: 3, pout: 15 } }
  };

  var SALIDA = 300;   // tokens que escribe el modelo por turno (supuesto)

  var ctxCore = {
    run: function (v) {
      var fijo = v.sys + v.tools + v.mem, lim = v.win * v.umbral / 100;
      var hist = 0, prev = 0, comp = 0, firstComp = 0, serie = [];
      var inSin = 0, cRead = 0, cWrite = 0, out = 0;
      for (var t = 1; t <= v.turnos; t++) {
        var ctx = fijo + hist;
        if (ctx > lim) {                       // compactar antes de mandar
          comp++; if (!firstComp) firstComp = t;
          hist = Math.min(v.resumen, hist);
          ctx = fijo + hist;
          prev = fijo;                         // la caché sobrevive solo hasta el prefijo fijo
        }
        serie.push(ctx);
        inSin += ctx;
        var leido = t === 1 ? 0 : Math.min(prev, ctx);
        cRead += leido; cWrite += ctx - leido;
        prev = ctx;
        hist += v.porTurno + SALIDA;
        out += SALIDA;
      }
      var M = 1e6;
      return {
        fijo: fijo, pctFijo: fijo / v.win, comp: comp, firstComp: firstComp, serie: serie, lim: lim,
        inSin: inSin, costoSin: inSin / M * v.pin + out / M * v.pout,
        costoCon: cRead / M * v.pin * 0.1 + cWrite / M * v.pin * 1.25 + out / M * v.pout,
        hit: inSin ? cRead / inSin : 0
      };
    }
  };
  SD.ctxCore = ctxCore;

  function chart(r, v) {
    var W = 640, H = 200, L = 48, B = 26, T = 12;
    var n = r.serie.length, x = function (i) { return L + (W - L - 10) * (n > 1 ? i / (n - 1) : 0); };
    var y = function (val) { return T + (H - T - B) * (1 - val / v.win); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tokens de entrada de cada turno, con el límite de compactación y la ventana">';
    s += '<path class="sim-axis" style="fill:none" d="M' + L + ' ' + T + ' V' + (H - B) + ' H' + (W - 10) + '"/>';
    s += '<path class="sim-grid" d="M' + L + ' ' + y(r.lim) + ' H' + (W - 10) + '" style="fill:none; stroke-dasharray:5 4"/>';
    s += '<text class="sim-label" x="' + (W - 12) + '" y="' + (y(r.lim) - 4) + '" text-anchor="end">umbral de compactación</text>';
    s += '<rect x="' + L + '" y="' + y(r.fijo) + '" width="' + (W - L - 10) + '" height="' + (H - B - y(r.fijo)) + '" style="fill: var(--l-service); opacity: 0.18"/>';
    s += '<text class="sim-label" x="' + (L + 6) + '" y="' + (H - B - 4) + '">prefijo fijo</text>';
    var d = '';
    r.serie.forEach(function (val, i) { d += (i ? ' L' : 'M') + x(i).toFixed(1) + ' ' + y(val).toFixed(1); });
    s += '<path d="' + d + '" style="fill:none; stroke: var(--link); stroke-width: 2"/>';
    s += '<text class="sim-label" x="' + (L - 6) + '" y="' + (T + 4) + '" text-anchor="end">' + F.num(Math.round(v.win / 1000)) + 'k</text>';
    s += '<text class="sim-label" x="' + (L - 6) + '" y="' + (H - B) + '" text-anchor="end">0</text>';
    s += '<text class="sim-label" x="' + L + '" y="' + (H - 6) + '">turno 1</text>';
    s += '<text class="sim-label" x="' + (W - 10) + '" y="' + (H - 6) + '" text-anchor="end">turno ' + n + '</text>';
    return s + '</svg>';
  }

  function initBudget(host) {
    host.classList.add('sim');
    var uid = 0, fields = [];
    function num(key, label, step, hint) {
      var id = 'cb' + (++uid) + Math.random().toString(36).slice(2, 6);
      var i = h('input', { id: id, type: 'number', min: 0, step: step, inputmode: 'decimal' });
      var kids = [h('label', { for: id, text: label }), i];
      if (hint) kids.push(h('p', { class: 'field-hint', text: hint }));
      i.addEventListener('input', run);
      fields.push({ key: key, input: i });
      return h('div', { class: 'field' }, kids);
    }
    var grid = h('div', { class: 'ae-fields' }, [
      num('sys', 'System prompt del harness (tokens)', 500),
      num('tools', 'Definiciones de herramientas (tokens)', 500),
      num('mem', 'Archivos de memoria (tokens)', 500),
      num('porTurno', 'Tokens que suma cada turno', 500, 'Llamada + resultado recortado.'),
      num('turnos', 'Turnos de la sesión', 1),
      num('win', 'Ventana del modelo (tokens)', 1000),
      num('umbral', 'Compactar al llegar al (%)', 5),
      num('resumen', 'Tamaño del resumen (tokens)', 500),
      num('pin', 'USD por millón de tokens de entrada', 0.1),
      num('pout', 'USD por millón de tokens de salida', 0.5)
    ]);
    var plot = h('div', { class: 'sim-scroll ae-chart' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    var cur = 'corta';
    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Escenarios' });
    Object.keys(PRESETS).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': k === cur ? 'true' : 'false', text: PRESETS[k].name });
      b.addEventListener('click', function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        set(k);
      });
      g.appendChild(b);
    });
    function set(k) {
      fields.forEach(function (f) { f.input.value = PRESETS[k].v[f.key]; });
      run();
    }
    function read() {
      var v = {};
      fields.forEach(function (f) { v[f.key] = Math.max(0, parseFloat(f.input.value) || 0); });
      v.turnos = Math.max(1, Math.min(1000, Math.round(v.turnos)));
      v.win = Math.max(1000, v.win);
      v.umbral = Math.min(100, Math.max(10, v.umbral));
      return v;
    }
    function run() {
      var v = read(), r = ctxCore.run(v);
      plot.innerHTML = chart(r, v);
      stats.textContent = '';
      [['Prefijo fijo', F.num(r.fijo) + ' tokens (' + F.pct(r.pctFijo, 0) + ' de la ventana)'],
       ['Compactaciones', r.comp ? r.comp + ' (la primera en el turno ' + r.firstComp + ')' : 'ninguna'],
       ['Entrada facturada', F.num(Math.round(r.inSin)) + ' tokens'],
       ['Sin caché', 'USD ' + r.costoSin.toFixed(2)],
       ['Con caché del prefijo', 'USD ' + r.costoCon.toFixed(2) + ' (' + F.pct(r.hit, 0) + ' leído de caché)']
      ].forEach(function (x) { stats.appendChild(h('div', { class: 'sim-stat' }, [h('span', { text: x[0] }), h('b', { text: x[1] })])); });
      note.textContent = r.fijo > v.win * 0.15
        ? 'El prefijo fijo ocupa mucho: cada turno lo paga entero y deja menos lugar para el trabajo. Sacar herramientas o recortar la memoria rinde más que compactar.'
        : (r.comp ? 'Cada compactación tira la caché de todo lo que estaba después del prefijo fijo y pierde detalles: el turno siguiente se paga casi entero.'
          : 'Sin compactar, cada turno reenvía todo lo anterior. La caché convierte esa repetición en lecturas a un décimo del precio.');
    }
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'El contexto de una sesión, turno a turno' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [g, grid, plot, stats, note]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Cuenta simplificada: el modelo escribe 300 tokens por turno, la caché lee el prefijo del turno anterior a 0.1 veces el precio de entrada y escribe lo nuevo a 1.25 veces (la proporción documentada por Anthropic). Los precios son de ejemplo: usa los de tu proveedor.' }));
    set(cur);
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="editexact"]').forEach(initEdit);
    document.querySelectorAll('[data-calc="ctxbudget"]').forEach(initBudget);
  });
})();
