/* Widget de M59 (detection engineering).
   - <div data-sim="detrule"></div>  Un día de inicios de sesión fallidos del panel de soporte contra una regla
     que se ajusta (agrupar por, umbral, ventana, exclusiones): verdaderos y falsos positivos, ataques que se
     escapan, precisión y minutos de triaje.
   Los eventos son sintéticos y los dos ataques se describen solo por el rastro que dejan.
   La lógica está en SD.detectCore para poder probarla sin DOM. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;
  var core = SD.detectCore = {};

  // t: minuto del día; u: cuenta; ip: origen; a: ataque al que pertenece (null si es normal).
  var EVENTS = [];
  function add(t, u, ip, a) { EVENTS.push({ t: t, u: u, ip: ip, a: a || null }); }
  // La sonda sintética mal configurada: falla cada 10 minutos desde la red de la oficina.
  [0, 10, 20, 30, 40, 50, 60, 70].forEach(function (t) { add(t, 'monitor-sintetico', '10.20.0.5'); });
  // Ataque A, password spraying: una IP, ocho cuentas, un intento por cuenta en diez minutos.
  ['ana', 'bruno', 'carla', 'diego', 'elena', 'fede', 'gabi', 'hugo'].forEach(function (u, i) {
    add(120 + [0, 1, 3, 4, 6, 7, 8, 9][i], u, '203.0.113.50', 'spray');
  });
  // Ataque B, fuerza bruta lenta: una cuenta, seis intentos en una hora, cada uno desde otra IP.
  [0, 1, 2, 3, 4, 5].forEach(function (i) { add(200 + i * 12, 'ana', '198.51.100.' + (10 + i), 'lento'); });
  // Las 9:00 después de rotar las contraseñas: ocho personas se equivocan una vez desde la salida NAT de la oficina.
  ['ines', 'juan', 'luis', 'marta', 'nora', 'pedro', 'rosa', 'sara'].forEach(function (u, i) {
    add(300 + [0, 4, 8, 12, 16, 20, 25, 30][i], u, '10.20.0.1');
  });
  // Errores sueltos desde casa.
  add(400, 'luis', '192.0.2.7'); add(401, 'luis', '192.0.2.7');
  add(500, 'pedro', '192.0.2.9'); add(502, 'pedro', '192.0.2.9'); add(504, 'pedro', '192.0.2.9');
  add(610, 'marta', '192.0.2.30'); add(700, 'tomas', '192.0.2.44'); add(705, 'tomas', '192.0.2.44');
  add(900, 'nora', '192.0.2.61'); add(1100, 'vera', '192.0.2.80');
  EVENTS.sort(function (x, y) { return x.t - y.t; });
  core.events = EVENTS;

  var ATTACKS = { spray: 'Password spraying desde una IP', lento: 'Fuerza bruta lenta contra ana' };
  var OFFICE = /^10\.20\./;
  var TRIAGE_MIN = 15;

  function key(e, by) { return by === 'user' ? e.u : by === 'ip' ? e.ip : e.u + ' @ ' + e.ip; }

  // Ventana deslizante por grupo. Cuenta eventos, o cuentas distintas si se agrupa por IP con distinct.
  core.run = function (rule) {
    var groups = {}, alerts = [];
    EVENTS.forEach(function (e) {
      if (rule.exOffice && OFFICE.test(e.ip)) { return; }
      if (rule.exMonitor && e.u === 'monitor-sintetico') { return; }
      var k = key(e, rule.by);
      var g = groups[k] || (groups[k] = { q: [], mute: -1 });
      g.q.push(e);
      while (g.q.length && e.t - g.q[0].t > rule.win) { g.q.shift(); }
      var n = rule.distinct ? Object.keys(g.q.reduce(function (m, x) { m[x.u] = 1; return m; }, {})).length : g.q.length;
      if (n >= rule.thr && e.t > g.mute) {
        var atk = null;
        g.q.forEach(function (x) { if (x.a) { atk = x.a; } });
        alerts.push({ t: e.t, key: k, n: n, a: atk });
        g.mute = e.t + rule.win;
        g.q = [];
      }
    });
    var caught = {};
    alerts.forEach(function (al) { if (al.a) { caught[al.a] = true; } });
    var tp = alerts.filter(function (al) { return al.a; }).length;
    return { alerts: alerts, tp: tp, fp: alerts.length - tp, caught: caught };
  };

  function hhmm(t) { var hh = Math.floor(t / 60), mm = t % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }

  var PRESETS = [
    { id: 'ingenua', label: 'La regla ingenua', rule: { by: 'user', thr: 3, win: 5, exOffice: false, exMonitor: false, distinct: false } },
    { id: 'spray', label: 'Contra el spraying', rule: { by: 'ip', thr: 8, win: 10, exOffice: false, exMonitor: false, distinct: true } },
    { id: 'lento', label: 'Contra el ataque lento', rule: { by: 'user', thr: 6, win: 60, exOffice: false, exMonitor: true, distinct: false } }
  ];

  function chipRow(opts, get, set) {
    var row = h('div', { 'class': 'dr-chips', role: 'group' }, opts.map(function (o) {
      return h('button', { 'class': 'chip-btn', type: 'button', 'data-v': String(o.v), onclick: function () { set(o.v); } }, [o.label]);
    }));
    row.sync = function () {
      row.querySelectorAll('.chip-btn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(get()) === b.getAttribute('data-v') ? 'true' : 'false');
      });
    };
    return row;
  }

  function build(root) {
    var rule = Object.assign({}, PRESETS[0].rule);
    var byRow = chipRow([{ v: 'user', label: 'Usuario' }, { v: 'ip', label: 'IP' }, { v: 'both', label: 'Usuario e IP' }],
      function () { return rule.by; }, function (v) { rule.by = v; if (v !== 'ip') { rule.distinct = false; } render(); });
    var winRow = chipRow([5, 10, 30, 60, 120].map(function (m) { return { v: m, label: m + ' min' }; }),
      function () { return rule.win; }, function (v) { rule.win = v; render(); });
    var thrIn = h('input', { type: 'range', min: '2', max: '12', step: '1', id: SD.slug('dr-thr-' + Math.random()), oninput: function () { rule.thr = +thrIn.value; render(); } });
    var thrOut = h('b');
    function toggle(label, prop) {
      return h('button', { 'class': 'chip-btn', type: 'button', 'data-p': prop, onclick: function () { rule[prop] = !rule[prop]; if (prop === 'distinct' && rule[prop]) { rule.by = 'ip'; } render(); } }, [label]);
    }
    var exRow = h('div', { 'class': 'dr-chips', role: 'group' }, [
      toggle('Contar cuentas distintas (solo por IP)', 'distinct'),
      toggle('Excluir la cuenta monitor-sintetico', 'exMonitor'),
      toggle('Excluir la red de la oficina 10.20.0.0/16', 'exOffice')
    ]);
    var presetRow = h('div', { 'class': 'dr-chips' }, PRESETS.map(function (p) {
      return h('button', { 'class': 'btn', type: 'button', onclick: function () { rule = Object.assign({}, p.rule); render(); } }, [p.label]);
    }));
    var timeline = h('div', { 'class': 'dr-time' });
    var stats = h('div', { 'class': 'sim-stats' });
    var list = h('ul', { 'class': 'dr-alerts' });
    var verdict = h('p', { 'class': 'dr-verdict' });

    function render() {
      byRow.sync(); winRow.sync();
      thrIn.value = String(rule.thr); thrOut.textContent = String(rule.thr);
      exRow.querySelectorAll('.chip-btn').forEach(function (b) { b.setAttribute('aria-pressed', rule[b.getAttribute('data-p')] ? 'true' : 'false'); });
      var r = core.run(rule);

      timeline.textContent = '';
      var alertT = {};
      r.alerts.forEach(function (al) { alertT[al.t] = al.a ? 'tp' : 'fp'; });
      EVENTS.forEach(function (e) {
        var hidden = (rule.exOffice && OFFICE.test(e.ip)) || (rule.exMonitor && e.u === 'monitor-sintetico');
        var cls = 'dr-ev' + (e.a ? ' is-atk' : '') + (hidden ? ' is-hidden' : '');
        timeline.appendChild(h('span', { 'class': cls, style: 'left:' + (e.t / 1440 * 100).toFixed(2) + '%', title: hhmm(e.t) + ' ' + e.u + ' desde ' + e.ip + (e.a ? ' (ataque)' : '') }));
      });
      Object.keys(alertT).forEach(function (t) {
        timeline.appendChild(h('span', { 'class': 'dr-mark ' + (alertT[t] === 'tp' ? 'is-tp' : 'is-fp'), style: 'left:' + (t / 1440 * 100).toFixed(2) + '%' }));
      });

      stats.textContent = '';
      var prec = r.alerts.length ? Math.round(r.tp / r.alerts.length * 100) : null;
      var nCaught = Object.keys(r.caught).length;
      [['Alertas en el día', String(r.alerts.length)], ['Verdaderas', String(r.tp)], ['Falsas', String(r.fp)],
        ['Precisión', prec == null ? '—' : prec + ' %'], ['Ataques detectados', nCaught + ' de 2'],
        ['Triaje', SD.fmt.num(r.alerts.length * TRIAGE_MIN) + ' min']].forEach(function (p) {
        stats.appendChild(h('div', { 'class': 'sim-stat' }, [h('span', { text: p[0] }), h('b', { text: p[1] })]));
      });

      list.textContent = '';
      r.alerts.forEach(function (al) {
        list.appendChild(h('li', { 'class': al.a ? 'is-tp' : 'is-fp' }, [
          h('b', { text: (al.a ? '✓ Verdadera' : '✗ Falsa') + ' · ' + hhmm(al.t) }),
          h('span', { text: ' ' + al.key + ': ' + al.n + (rule.distinct ? ' cuentas distintas' : ' fallos') + ' en ' + rule.win + ' min' + (al.a ? ' (' + ATTACKS[al.a] + ')' : '') })
        ]));
      });
      if (!r.alerts.length) { list.appendChild(h('li', { 'class': 'dr-none', text: 'La regla no dio ninguna alerta en todo el día.' })); }

      var missed = Object.keys(ATTACKS).filter(function (a) { return !r.caught[a]; }).map(function (a) { return ATTACKS[a]; });
      var cls, txt;
      if (missed.length === 2) { cls = 'is-bad'; txt = '✗ Los dos ataques pasan sin alerta. Mira cómo agrupa la regla: el spraying usa una IP y muchas cuentas; el ataque lento, una cuenta y muchas IP.'; }
      else if (missed.length) { cls = r.fp ? 'is-warn' : 'is-ok'; txt = (r.fp ? '◐ ' : '✓ ') + 'Atrapa un ataque' + (r.fp ? ' con ' + r.fp + ' falsa(s)' : ' sin falsos positivos') + '. Se escapa: ' + missed[0] + '. Ese comportamiento necesita su propia regla.'; }
      else { cls = r.fp ? 'is-warn' : 'is-ok'; txt = r.fp ? '◐ Atrapa los dos, pero a costa de ' + r.fp + ' alerta(s) falsa(s) por día. Multiplica por 30 reglas.' : '✓ Atrapa los dos sin falsos positivos. Revisa qué excluiste: cada exclusión es un punto ciego.'; }
      verdict.className = 'dr-verdict ' + cls;
      verdict.textContent = txt;
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'Una regla contra un día del panel de soporte' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'sim-controls' }, [
          h('div', { 'class': 'field' }, [h('p', { 'class': 'dr-flabel', text: 'Agrupar por' }), byRow]),
          h('div', { 'class': 'field' }, [h('label', { 'class': 'dr-flabel', 'for': thrIn.id }, ['Umbral: alerta con ', thrOut, ' o más']), thrIn]),
          h('div', { 'class': 'field' }, [h('p', { 'class': 'dr-flabel', text: 'Ventana' }), winRow]),
          h('div', { 'class': 'field' }, [h('p', { 'class': 'dr-flabel', text: 'Ajustes y exclusiones' }), exRow]),
          h('div', { 'class': 'field' }, [h('p', { 'class': 'dr-flabel', text: 'Puntos de partida' }), presetRow])
        ]),
        h('div', { 'class': 'dr-timewrap' }, [
          timeline,
          h('div', { 'class': 'dr-axis' }, ['00:00', '06:00', '12:00', '18:00', '24:00'].map(function (t) { return h('span', { text: t }); }))
        ]),
        h('p', { 'class': 'dr-legend' }, [
          h('span', { 'class': 'dr-key dr-key--ev' }), ' evento normal ',
          h('span', { 'class': 'dr-key dr-key--atk' }), ' evento de un ataque ',
          h('span', { 'class': 'dr-key dr-key--tp' }), ' alerta verdadera ',
          h('span', { 'class': 'dr-key dr-key--fp' }), ' alerta falsa'
        ]),
        h('div', { 'aria-live': 'polite' }, [stats, verdict, list]),
        h('p', { 'class': 'sim-note', text: 'Cuarenta eventos sintéticos de un día. Una alerta por grupo y por ventana. El triaje supone 15 minutos por alerta.' })
      ])
    ]));
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="detrule"]').forEach(build);
  });
})();
