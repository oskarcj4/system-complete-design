/* Widget del M71 (jailbreak, injection y red teaming):
   <div data-sim="asrfr">  el umbral de un clasificador de seguridad contra la tasa de éxito de ataque
   y los falsos rechazos, sobre un set sintético de ataques (por familia) y de pedidos legítimos.
   No contiene texto de ataques: solo puntajes simulados. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;
  var NS = 'http://www.w3.org/2000/svg';

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function normal(r, m, s) {
    var u = Math.max(1e-9, r()), v = r();
    return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }

  /* Familias: puntaje medio del clasificador de entrada (qué tan "a la vista" está el pedido en un solo mensaje)
     y probabilidad de que el modelo solo, sin clasificadores, ceda. Valores sintéticos para enseñar la forma. */
  var FAM = [
    { id: 'rol', name: 'Rol y persona', inMean: 0.74, comply: 0.30 },
    { id: 'many', name: 'Many-shot', inMean: 0.70, comply: 0.50 },
    { id: 'cresc', name: 'Varios turnos (crescendo)', inMean: 0.42, comply: 0.45 },
    { id: 'suf', name: 'Sufijo adversario', inMean: 0.78, comply: 0.35 },
    { id: 'cod', name: 'Codificación e idiomas', inMean: 0.50, comply: 0.40 }
  ];

  var redCore = {
    build: function () {
      var r = rng(71), att = [], ben = [];
      FAM.forEach(function (f, fi) {
        for (var i = 0; i < 80; i++) {
          att.push({ fam: fi, ins: clamp(normal(r, f.inMean, 0.15)), outs: clamp(normal(r, 0.74, 0.14)), comply: r() < f.comply });
        }
      });
      for (var j = 0; j < 2000; j++) {
        var gris = r() < 0.15;   // pedidos legítimos que se parecen a algo sensible: medicina, tareas de seguridad, ficción
        ben.push({ ins: clamp(gris ? normal(r, 0.46, 0.15) : normal(r, 0.12, 0.08)),
                   outs: clamp(gris ? normal(r, 0.40, 0.15) : normal(r, 0.14, 0.09)) });
      }
      return { att: att, ben: ben };
    },
    eval: function (d, t, useIn, useOut) {
      var ok = 0, byFam = FAM.map(function () { return 0; }), fr = 0;
      d.att.forEach(function (a) {
        if (!a.comply) return;                               // el modelo se negó solo
        if (useIn && a.ins >= t) return;                     // lo frenó la entrada
        if (useOut && a.outs >= t) return;                   // lo frenó la salida
        ok++; byFam[a.fam]++;
      });
      d.ben.forEach(function (b) {
        if ((useIn && b.ins >= t) || (useOut && b.outs >= t)) fr++;
      });
      return { asr: ok / d.att.length, fam: byFam.map(function (n) { return n / (d.att.length / FAM.length); }), frr: fr / d.ben.length };
    }
  };
  SD.redCore = redCore;

  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  var uid = 0;
  function init(host) {
    var id = 'rt' + (++uid);
    var data = redCore.build();
    var state = { t: 0.6, useIn: true, useOut: false, base: 0.001 };

    var range = h('input', { type: 'range', id: id + 'u', min: 0.05, max: 0.95, step: 0.01, value: state.t });
    var rangeOut = h('output', { for: id + 'u' });
    var chips = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Clasificadores' });
    function chip(label, key) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(state[key]), text: label });
      b.addEventListener('click', function () { state[key] = !state[key]; b.setAttribute('aria-pressed', String(state[key])); draw(); });
      chips.appendChild(b);
    }
    chip('Clasificador de entrada', 'useIn');
    chip('Clasificador de salida', 'useOut');
    var baseSel = h('select', { id: id + 'b' });
    [['0.001', '1 de cada 1 000'], ['0.01', '1 de cada 100'], ['0.1', '1 de cada 10']].forEach(function (o) {
      baseSel.appendChild(h('option', { value: o[0], text: o[1] }));
    });
    baseSel.addEventListener('change', function () { state.base = parseFloat(baseSel.value); draw(); });
    range.addEventListener('input', function () { state.t = parseFloat(range.value); draw(); });

    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var famTable = h('div', { class: 'table-wrap' });
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });

    var W = 560, H = 300, L = 56, R = 16, T = 16, B = 44;
    var chart = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Curva de tasa de éxito de ataque contra falsos rechazos al mover el umbral' });
    var maxX = 0.3, maxY = 0.45;
    function X(v) { return L + Math.min(v, maxX) / maxX * (W - L - R); }
    function Y(v) { return H - B - Math.min(v, maxY) / maxY * (H - T - B); }
    function axes() {
      for (var i = 0; i <= 6; i++) {
        var xv = i * 0.05, x = X(xv);
        chart.appendChild(svg('path', { class: 'sim-grid', d: 'M' + x + ' ' + T + ' V' + (H - B) }));
        var tx = svg('text', { class: 'sim-axis', x: x, y: H - B + 16, 'text-anchor': 'middle' }); tx.textContent = Math.round(xv * 100) + ' %'; chart.appendChild(tx);
      }
      for (var j = 0; j <= 4; j++) {
        var y = Y(j * 0.1);
        chart.appendChild(svg('path', { class: 'sim-grid', d: 'M' + L + ' ' + y + ' H' + (W - R) }));
        var ty = svg('text', { class: 'sim-axis', x: L - 8, y: y + 4, 'text-anchor': 'end' }); ty.textContent = (j * 10) + ' %'; chart.appendChild(ty);
      }
      var lx = svg('text', { class: 'sim-label', x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle' }); lx.textContent = 'Falsos rechazos (pedidos legítimos bloqueados)'; chart.appendChild(lx);
      var ly = svg('text', { class: 'sim-label', x: 14, y: T + 4, 'text-anchor': 'start' }); ly.textContent = 'Ataques exitosos'; chart.appendChild(ly);
    }
    var curve = svg('path', { fill: 'none', style: 'stroke: var(--l-gpu); stroke-width: 2.5' });
    var dot = svg('circle', { r: 7, style: 'fill: var(--l-edge); stroke: var(--bg); stroke-width: 2' });
    var dotLab = svg('text', { class: 'sim-val' });
    axes();
    chart.appendChild(curve); chart.appendChild(dot); chart.appendChild(dotLab);

    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }

    function draw() {
      rangeOut.textContent = F.num(state.t, 2);
      var none = !state.useIn && !state.useOut;
      var pts = [];
      for (var t = 0.05; t <= 0.951; t += 0.01) {
        var e = redCore.eval(data, t, state.useIn, state.useOut);
        pts.push(X(e.frr).toFixed(1) + ' ' + Y(e.asr).toFixed(1));
      }
      curve.setAttribute('d', 'M' + pts.join(' L'));
      var r = redCore.eval(data, state.t, state.useIn, state.useOut);
      dot.setAttribute('cx', X(r.frr)); dot.setAttribute('cy', Y(r.asr));
      dotLab.setAttribute('x', X(r.frr) + 12); dotLab.setAttribute('y', Y(r.asr) - 10);
      dotLab.textContent = 'umbral ' + F.num(state.t, 2);
      var base0 = redCore.eval(data, 2, false, false);
      // de lo bloqueado en tráfico real, cuánto era ataque (tasa base)
      var attBlockedShare = 0, nAtt = data.att.length;
      data.att.forEach(function (a) { if ((state.useIn && a.ins >= state.t) || (state.useOut && a.outs >= state.t)) attBlockedShare++; });
      var tpr = attBlockedShare / nAtt;
      var prec = (state.base * tpr + (1 - state.base) * r.frr) > 0 ? state.base * tpr / (state.base * tpr + (1 - state.base) * r.frr) : 0;
      stats.innerHTML = '';
      stats.appendChild(stat('Ataques exitosos, solo el modelo', F.num(base0.asr * 100, 1) + ' %'));
      stats.appendChild(stat('Ataques exitosos, con estas capas', F.num(r.asr * 100, 1) + ' %'));
      stats.appendChild(stat('Falsos rechazos', F.num(r.frr * 100, 1) + ' %'));
      stats.appendChild(stat('De lo bloqueado, cuánto era ataque', none ? 'no aplica' : F.num(prec * 100, 0) + ' %'));
      var rows = FAM.map(function (f, i) {
        return '<tr><td>' + f.name + '</td><td class="r">' + F.num(base0.fam[i] * 100, 0) + ' %</td><td class="r">' + F.num(r.fam[i] * 100, 0) + ' %</td></tr>';
      }).join('');
      famTable.innerHTML = '<table class="t"><thead><tr><th>Familia</th><th>Solo el modelo</th><th>Con estas capas</th></tr></thead><tbody>' + rows + '</tbody></table>';
      var msg = [];
      if (none) msg.push('Sin clasificadores, solo frena el entrenamiento del modelo. Prende una capa.');
      else {
        if (state.useIn && !state.useOut) msg.push('La entrada sola deja pasar sobre todo los ataques en varios turnos y los codificados: ningún mensaje suelto se ve mal.');
        if (state.useOut) msg.push('La salida mira lo que el modelo escribe, sin importar cómo se lo pidieron: recupera lo que la entrada no ve.');
        if (r.frr > 0.05) msg.push('Con este umbral se bloquea más del 5 % de los pedidos legítimos: los usuarios lo notan.');
        msg.push('Con ' + baseSel.options[baseSel.selectedIndex].text + ' pedidos siendo ataques, de cada 100 bloqueos ' + F.num(prec * 100, 0) + ' son ataques y el resto, usuarios legítimos.');
      }
      note.textContent = msg.join(' ');
    }

    var controls = h('div', { class: 'sim-controls' }, [
      chips,
      h('div', { class: 'field' }, [h('label', { for: id + 'u', text: 'Umbral del clasificador (más bajo bloquea más)' }), range, rangeOut]),
      h('div', { class: 'field' }, [h('label', { for: id + 'b', text: 'Qué fracción del tráfico real son ataques' }), baseSel])
    ]);
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Ataques exitosos contra falsos rechazos' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [controls, stats, h('div', { class: 'sim-scroll rt-chart' }, [chart]), famTable, note]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Datos sintéticos con semilla fija: 400 ataques en cinco familias (80 por familia) y 2 000 pedidos legítimos, el 15 % con temas sensibles pero legítimos. Los puntajes y las probabilidades son ilustrativos y no contienen texto de ataques; enseñan la forma de la curva, no las cifras de ningún modelo.' }));
    draw();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="asrfr"]').forEach(init);
  });
})();
