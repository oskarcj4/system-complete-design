/* Widgets de la Parte VII, segundo bloque (M58 a M61).
   - <div data-sim="vulnprio"></div>   Veinte hallazgos y tres políticas de priorización con la misma capacidad (M58)
   - <div data-sim="dmarc"></div>      Un mensaje contra SPF, DKIM y DMARC con registros editables (M61)
   La lógica está en SD.blueCore para poder probarla sin DOM. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  var core = SD.blueCore = {};

  /* ======================================================================
     M58: priorizar veinte hallazgos con la misma capacidad de arreglo
     ====================================================================== */

  // Hallazgos sintéticos de Tienda Norte. crit: criticidad del activo (1 baja, 2 media, 3 alta).
  var FINDINGS = [
    { id: 1, name: 'Log4j en la API', cvss: 10.0, epss: 0.97, kev: true, exposed: true, reach: true, crit: 3 },
    { id: 2, name: 'OpenSSL en la imagen del batch', cvss: 9.8, epss: 0.02, kev: false, exposed: false, reach: false, crit: 1 },
    { id: 3, name: 'Ingress controller del clúster', cvss: 7.5, epss: 0.6, kev: true, exposed: true, reach: true, crit: 3 },
    { id: 4, name: 'libxml2 en el worker de pagos', cvss: 9.1, epss: 0.01, kev: false, exposed: false, reach: true, crit: 3 },
    { id: 5, name: 'Plugin del CMS del blog', cvss: 8.8, epss: 0.4, kev: true, exposed: true, reach: true, crit: 1 },
    { id: 6, name: 'Librería de PDF de los reportes', cvss: 9.8, epss: 0.003, kev: false, exposed: false, reach: false, crit: 2 },
    { id: 7, name: 'Jackson databind en la API', cvss: 8.1, epss: 0.15, kev: false, exposed: true, reach: true, crit: 3 },
    { id: 8, name: 'Framework del panel de administración', cvss: 9.0, epss: 0.3, kev: false, exposed: true, reach: true, crit: 2 },
    { id: 9, name: 'glibc en la imagen base', cvss: 7.8, epss: 0.05, kev: false, exposed: false, reach: true, crit: 2 },
    { id: 10, name: 'Redis de staging', cvss: 9.8, epss: 0.08, kev: false, exposed: false, reach: true, crit: 1 },
    { id: 11, name: 'VPN de la oficina', cvss: 9.8, epss: 0.9, kev: true, exposed: true, reach: true, crit: 3 },
    { id: 12, name: 'libwebp en el servicio de imágenes', cvss: 8.8, epss: 0.9, kev: true, exposed: true, reach: true, crit: 2 },
    { id: 13, name: 'Driver JDBC antiguo', cvss: 9.3, epss: 0.005, kev: false, exposed: false, reach: false, crit: 3 },
    { id: 14, name: 'Node en la herramienta de build', cvss: 9.8, epss: 0.01, kev: false, exposed: false, reach: false, crit: 1 },
    { id: 15, name: 'Spring en el panel de soporte', cvss: 7.3, epss: 0.25, kev: false, exposed: false, reach: true, crit: 2 },
    { id: 16, name: 'nginx del frontend', cvss: 5.9, epss: 0.12, kev: false, exposed: true, reach: true, crit: 2 },
    { id: 17, name: 'curl en la imagen del batch', cvss: 9.8, epss: 0.004, kev: false, exposed: false, reach: false, crit: 1 },
    { id: 18, name: 'Servidor de correo saliente', cvss: 6.5, epss: 0.3, kev: true, exposed: true, reach: true, crit: 1 },
    { id: 19, name: 'SnakeYAML en el worker', cvss: 9.8, epss: 0.02, kev: false, exposed: false, reach: true, crit: 3 },
    { id: 20, name: 'Servidor de archivos interno', cvss: 8.1, epss: 0.7, kev: true, exposed: false, reach: true, crit: 2 }
  ];

  // Riesgo didáctico: probabilidad de explotación × exposición × alcanzabilidad × impacto.
  // Supuestos: un hallazgo en KEV cuenta con probabilidad 1; interno pesa 0.25; no alcanzable, 0.1.
  core.risk = function (f) {
    var p = f.kev ? 1 : f.epss;
    return p * (f.exposed ? 1 : 0.25) * (f.reach ? 1 : 0.1) * f.crit * f.cvss / 10;
  };

  var POLICIES = [
    { id: 'cvss', label: 'Solo CVSS' },
    { id: 'kev', label: 'KEV primero, después CVSS' },
    { id: 'riesgo', label: 'Riesgo combinado' }
  ];

  core.order = function (policy, list) {
    var arr = (list || FINDINGS).slice();
    var byCvss = function (a, b) { return b.cvss - a.cvss || b.epss - a.epss || a.id - b.id; };
    if (policy === 'cvss') { arr.sort(byCvss); }
    else if (policy === 'kev') { arr.sort(function (a, b) { return (b.kev - a.kev) || byCvss(a, b); }); }
    else { arr.sort(function (a, b) { return core.risk(b) - core.risk(a) || a.id - b.id; }); }
    return arr;
  };

  core.summary = function (policy, cap) {
    var arr = core.order(policy);
    var total = FINDINGS.reduce(function (s, f) { return s + core.risk(f); }, 0);
    var done = arr.slice(0, cap);
    var closed = done.reduce(function (s, f) { return s + core.risk(f); }, 0);
    return {
      order: arr, fixed: done.map(function (f) { return f.id; }),
      pct: closed / total,
      kevOpen: arr.slice(cap).filter(function (f) { return f.kev; }).length,
      kevTotal: FINDINGS.filter(function (f) { return f.kev; }).length,
      critFixed: done.filter(function (f) { return f.cvss >= 9; }).length,
      critTotal: FINDINGS.filter(function (f) { return f.cvss >= 9; }).length
    };
  };
  core.findings = FINDINGS;

  function yes(b, y, n) { return b ? y : n; }

  function buildPrio(root) {
    var policy = 'cvss', cap = 5;
    var row = h('div', { 'class': 'vp-chips', role: 'group', 'aria-label': 'Política de priorización' }, POLICIES.map(function (p) {
      return h('button', { 'class': 'chip-btn', type: 'button', 'data-id': p.id, onclick: function () { policy = p.id; render(); } }, [p.label]);
    }));
    var capOut = h('output', { 'class': 'vp-cap' });
    var range = h('input', { type: 'range', min: '1', max: '10', step: '1', value: String(cap), id: 'vp-cap-' + Math.random().toString(36).slice(2, 7) });
    range.addEventListener('input', function () { cap = +range.value; render(); });
    var tbody = h('tbody');
    var stats = h('div', { 'class': 'sim-stats' });
    var verdict = h('p', { 'class': 'vp-verdict' });
    var maxRisk = Math.max.apply(null, FINDINGS.map(core.risk));

    function render() {
      row.querySelectorAll('.chip-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === policy ? 'true' : 'false'); });
      capOut.textContent = cap + ' por semana';
      var s = core.summary(policy, cap);
      tbody.textContent = '';
      s.order.forEach(function (f, i) {
        var fixed = i < cap;
        var r = core.risk(f);
        tbody.appendChild(h('tr', { 'class': fixed ? 'is-fixed' : '' }, [
          h('td', { 'class': 'r', text: String(i + 1) }),
          h('td', {}, [h('span', { text: f.name }), fixed ? h('span', { 'class': 'vp-tag', text: '✓ esta semana' }) : null]),
          h('td', { 'class': 'r', text: f.cvss.toFixed(1) }),
          h('td', { 'class': 'r', text: String(f.epss) }),
          h('td', { text: yes(f.kev, 'Sí', 'No') }),
          h('td', { text: yes(f.exposed, 'Internet', 'Interno') }),
          h('td', { text: yes(f.reach, 'Sí', 'No') }),
          h('td', { text: ['', 'Baja', 'Media', 'Alta'][f.crit] }),
          h('td', {}, [h('span', { 'class': 'vp-bar' }, [h('span', { style: 'width:' + Math.max(2, r / maxRisk * 100).toFixed(1) + '%' })])])
        ]));
      });
      stats.textContent = '';
      [['Riesgo cerrado esta semana', Math.round(s.pct * 100) + ' %'],
       ['KEV que siguen abiertos', s.kevOpen + ' de ' + s.kevTotal],
       ['CVSS ≥ 9 arreglados', s.critFixed + ' de ' + s.critTotal]].forEach(function (p) {
        stats.appendChild(h('div', { 'class': 'sim-stat' }, [h('span', { text: p[0] }), h('b', { text: p[1] })]));
      });
      var msg = {
        cvss: '✗ Ordenar por CVSS gasta la semana en "críticos" que nadie explota o que no se alcanzan, y deja abiertos hallazgos que ya están en KEV.',
        kev: '◐ KEV primero mejora mucho, pero dentro del KEV vuelve a ordenar por CVSS: un servidor interno puede pasar delante de algo expuesto a internet.',
        riesgo: '✓ Con la misma capacidad, el riesgo combinado cierra más riesgo: explotación, exposición, alcanzabilidad e impacto juntos.'
      }[policy];
      verdict.className = 'vp-verdict ' + (policy === 'cvss' ? 'is-bad' : policy === 'kev' ? 'is-warn' : 'is-ok');
      verdict.textContent = msg;
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'Veinte hallazgos, una semana de capacidad' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'sim-controls' }, [
          h('div', { 'class': 'field' }, [h('p', { 'class': 'vp-flabel', text: 'Política' }), row]),
          h('div', { 'class': 'field' }, [h('label', { 'for': range.id, text: 'Arreglos por semana' }), range, capOut])
        ]),
        h('div', { 'aria-live': 'polite' }, [
          stats, verdict,
          h('div', { 'class': 'table-wrap vp-scroll' }, [h('table', { 'class': 't vp-table' }, [
            h('thead', {}, [h('tr', {}, ['#', 'Hallazgo', 'CVSS', 'EPSS', 'KEV', 'Exposición', 'Alcanzable', 'Activo', 'Riesgo'].map(function (t) { return h('th', { text: t }); }))]),
            tbody
          ])])
        ]),
        h('p', { 'class': 'sim-note', text: 'Riesgo didáctico (supuesto): probabilidad (1 si está en KEV, si no el EPSS) × exposición (interno pesa 0.25) × alcanzabilidad (no alcanzable pesa 0.1) × criticidad del activo × CVSS / 10. Los hallazgos son sintéticos.' })
      ])
    ]));
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="vulnprio"]').forEach(buildPrio);
  });
})();

/* ======================================================================
   M61: un mensaje contra SPF, DKIM y DMARC
   <div data-sim="dmarc"></div>
   ====================================================================== */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, core = SD.blueCore;

  var SERVERS = {
    google: { label: 'Google Workspace (209.85.220.41)', ip: '209.85.220.41' },
    prov: { label: 'Proveedor transaccional (198.51.100.7)', ip: '198.51.100.7' },
    ajeno: { label: 'Servidor desconocido (203.0.113.50)', ip: '203.0.113.50' },
    lista: { label: 'Lista de correo que reenvía (192.0.2.25)', ip: '192.0.2.25' }
  };
  var MAILFROM = ['tiendanorte.example', 'envios.tiendanorte.example', 'proveedor.example', 'lists.ejemplo.org'];
  var FROMS = ['tiendanorte.example', 'tiendan0rte.example'];
  var DKIMS = {
    none: 'Sin firma',
    tn: 'd=tiendanorte.example, válida',
    tnrota: 'd=tiendanorte.example, rota (la lista cambió el asunto)',
    prov: 'd=proveedor.example, válida'
  };

  // Dominio organizacional didáctico: las dos últimas etiquetas.
  core.orgDomain = function (d) { return d.split('.').slice(-2).join('.'); };
  core.aligned = function (a, b, mode) { return mode === 's' ? a === b : core.orgDomain(a) === core.orgDomain(b); };

  // SPF del dominio del sobre según el servidor que conecta.
  core.spf = function (msg, rec) {
    var d = msg.mailFrom, s = msg.server;
    if (d === 'tiendanorte.example') {
      if ((s === 'google' && rec.incGoogle) || (s === 'prov' && rec.incProv)) { return 'pass'; }
      return rec.all === '-all' ? 'fail' : 'softfail';
    }
    if (d === 'envios.tiendanorte.example') { return s === 'prov' ? 'pass' : 'fail'; }
    if (d === 'proveedor.example') { return s === 'prov' ? 'pass' : 'fail'; }
    return s === 'lista' ? 'pass' : 'fail';
  };

  core.dmarcEval = function (msg, rec) {
    var r = { lookalike: msg.from !== 'tiendanorte.example' };
    r.spf = core.spf(msg, rec);
    r.spfAligned = core.aligned(msg.mailFrom, msg.from, rec.aspf);
    r.dkim = msg.dkim === 'none' ? 'none' : msg.dkim === 'tnrota' ? 'fail' : 'pass';
    r.dkimDomain = msg.dkim === 'prov' ? 'proveedor.example' : msg.dkim === 'none' ? '' : 'tiendanorte.example';
    r.dkimAligned = r.dkimDomain !== '' && core.aligned(r.dkimDomain, msg.from, rec.adkim);
    r.pass = (r.spf === 'pass' && r.spfAligned) || (r.dkim === 'pass' && r.dkimAligned);
    var p = rec.p;
    if (rec.t && p !== 'none') { p = p === 'reject' ? 'quarantine' : 'none'; }
    r.applied = r.pass ? 'deliver' : p;
    return r;
  };

  var PRESETS = [
    { id: 'ws', label: 'Correo de una persona', msg: { server: 'google', mailFrom: 'tiendanorte.example', from: 'tiendanorte.example', dkim: 'tn' } },
    { id: 'provmal', label: 'Proveedor sin configurar', msg: { server: 'prov', mailFrom: 'proveedor.example', from: 'tiendanorte.example', dkim: 'prov' } },
    { id: 'provbien', label: 'Proveedor bien configurado', msg: { server: 'prov', mailFrom: 'envios.tiendanorte.example', from: 'tiendanorte.example', dkim: 'tn' } },
    { id: 'spoof', label: 'Suplantación', msg: { server: 'ajeno', mailFrom: 'tiendanorte.example', from: 'tiendanorte.example', dkim: 'none' } },
    { id: 'lista', label: 'Lista de correo', msg: { server: 'lista', mailFrom: 'lists.ejemplo.org', from: 'tiendanorte.example', dkim: 'tnrota' } },
    { id: 'parecido', label: 'Dominio parecido', msg: { server: 'ajeno', mailFrom: 'tiendan0rte.example', from: 'tiendan0rte.example', dkim: 'none' } }
  ];

  var uid = 0;

  function buildDmarc(root) {
    uid += 1;
    var msg = Object.assign({}, PRESETS[0].msg);
    var rec = { incGoogle: true, incProv: false, all: '~all', p: 'none', adkim: 'r', aspf: 'r', t: false };
    var preset = 'ws';

    function select(id, label, opts, key) {
      var sel = h('select', { id: 'dm-' + key + '-' + uid });
      opts.forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
      sel.addEventListener('change', function () { msg[key] = sel.value; preset = ''; render(); });
      return { el: h('div', { 'class': 'field' }, [h('label', { 'for': sel.id, text: label }), sel]), sel: sel, key: key };
    }
    var sels = [
      select('server', 'Servidor que conecta', Object.keys(SERVERS).map(function (k) { return [k, SERVERS[k].label]; }), 'server'),
      select('mailFrom', 'Sobre (MAIL FROM)', MAILFROM.map(function (d) { return [d, d]; }), 'mailFrom'),
      select('from', 'From: visible', FROMS.map(function (d) { return [d, d]; }), 'from'),
      select('dkim', 'Firma DKIM', Object.keys(DKIMS).map(function (k) { return [k, DKIMS[k]]; }), 'dkim')
    ];

    var presetRow = h('div', { 'class': 'dm-chips', role: 'group', 'aria-label': 'Mensajes de ejemplo' });
    PRESETS.forEach(function (p) {
      var b = h('button', { type: 'button', 'class': 'chip-btn', 'data-id': p.id, text: p.label });
      b.addEventListener('click', function () { preset = p.id; msg = Object.assign({}, p.msg); render(); });
      presetRow.appendChild(b);
    });

    function chipGroup(label, opts, get, set) {
      var row = h('div', { 'class': 'dm-chips', role: 'group', 'aria-label': label });
      opts.forEach(function (o) {
        var b = h('button', { type: 'button', 'class': 'chip-btn', 'data-v': String(o[0]), text: o[1] });
        b.addEventListener('click', function () { set(o[0]); render(); });
        row.appendChild(b);
      });
      return { el: h('div', { 'class': 'field' }, [h('p', { 'class': 'dm-flabel', text: label }), row]), row: row, get: get };
    }
    var groups = [
      chipGroup('SPF: include de Google', [[true, 'Sí'], [false, 'No']], function () { return rec.incGoogle; }, function (v) { rec.incGoogle = v; }),
      chipGroup('SPF: include del proveedor', [[true, 'Sí'], [false, 'No']], function () { return rec.incProv; }, function (v) { rec.incProv = v; }),
      chipGroup('SPF: final', [['~all', '~all'], ['-all', '-all']], function () { return rec.all; }, function (v) { rec.all = v; }),
      chipGroup('DMARC: política p=', [['none', 'none'], ['quarantine', 'quarantine'], ['reject', 'reject']], function () { return rec.p; }, function (v) { rec.p = v; }),
      chipGroup('Alineación de SPF (aspf)', [['r', 'relajada'], ['s', 'estricta']], function () { return rec.aspf; }, function (v) { rec.aspf = v; }),
      chipGroup('Alineación de DKIM (adkim)', [['r', 'relajada'], ['s', 'estricta']], function () { return rec.adkim; }, function (v) { rec.adkim = v; }),
      chipGroup('Modo de prueba (t=y)', [[true, 'Sí'], [false, 'No']], function () { return rec.t; }, function (v) { rec.t = v; })
    ];

    var records = h('pre', { 'class': 'dm-records' });
    var checks = h('div', { 'class': 'dm-checks' });
    var verdict = h('p', { 'class': 'dm-verdict' });
    var report = h('p', { 'class': 'dm-report' });

    function row(name, result, detail, ok) {
      return h('div', { 'class': 'dm-check ' + (ok ? 'is-ok' : 'is-bad') }, [
        h('b', { text: (ok ? '✓ ' : '✗ ') + name }), h('span', { text: result }), h('span', { 'class': 'dm-detail', text: detail })
      ]);
    }

    function render() {
      presetRow.querySelectorAll('.chip-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === preset ? 'true' : 'false'); });
      sels.forEach(function (s) { s.sel.value = msg[s.key]; });
      groups.forEach(function (g) {
        g.row.querySelectorAll('.chip-btn').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(g.get()) ? 'true' : 'false'); });
      });
      var spfTxt = 'v=spf1' + (rec.incGoogle ? ' include:_spf.google.com' : '') + (rec.incProv ? ' include:spf.proveedor.example' : '') + ' ' + rec.all;
      var dmTxt = 'v=DMARC1; p=' + rec.p + '; adkim=' + rec.adkim + '; aspf=' + rec.aspf + (rec.t ? '; t=y' : '') + '; rua=mailto:dmarc@tiendanorte.example';
      records.textContent = 'tiendanorte.example.         TXT "' + spfTxt + '"\n_dmarc.tiendanorte.example.  TXT "' + dmTxt + '"';

      var r = core.dmarcEval(msg, rec);
      checks.textContent = '';
      verdict.className = 'dm-verdict';
      if (r.lookalike) {
        checks.appendChild(row('DMARC de tiendanorte.example', 'no participa', 'El From: es tiendan0rte.example, otro dominio. El receptor busca el DMARC de ese dominio, que es del atacante y puede publicar lo que quiera.', false));
        verdict.classList.add('is-warn');
        verdict.textContent = '◐ Llega a la bandeja si el atacante configuró su dominio. Ningún registro de la tienda lo frena: se detectan los registros de dominios parecidos y se piden de baja (61.9).';
        report.textContent = 'Este mensaje no aparece en los reportes de la tienda.';
        return;
      }
      var spfOk = r.spf === 'pass' && r.spfAligned;
      checks.appendChild(row('SPF', r.spf + ' para ' + msg.mailFrom, r.spf !== 'pass' ? 'La IP ' + SERVERS[msg.server].ip + ' no está autorizada por el SPF de ' + msg.mailFrom + '.' :
        r.spfAligned ? 'Pasó y el dominio del sobre está alineado con el From:.' : 'Pasó, pero para ' + msg.mailFrom + ', que no está alineado con el From:' + (rec.aspf === 's' ? ' en modo estricto.' : '.'), spfOk));
      var dkOk = r.dkim === 'pass' && r.dkimAligned;
      checks.appendChild(row('DKIM', r.dkim === 'none' ? 'sin firma' : r.dkim + ' con d=' + r.dkimDomain,
        r.dkim === 'none' ? 'No hay firma que verificar.' : r.dkim === 'fail' ? 'El hash ya no coincide: alguien cambió el mensaje después de firmarlo.' :
        r.dkimAligned ? 'Firma válida y d= alineado con el From:.' : 'Firma válida, pero de ' + r.dkimDomain + ', no del dominio del From:.', dkOk));
      checks.appendChild(row('DMARC', r.pass ? 'pass' : 'fail', r.pass ? 'Al menos uno de los dos pasó alineado.' : 'Ninguno de los dos pasó alineado con tiendanorte.example.', r.pass));

      var txt = {
        deliver: '✓ Entrega normal: DMARC pasó.',
        none: '◐ Se entrega igual (p=none) y queda en el reporte. Sirve para mirar, no protege a nadie.',
        quarantine: '◐ Va a la carpeta de spam (quarantine).',
        reject: '✗ Rechazado en la conversación SMTP: 550 5.7.1, el mensaje no se acepta.'
      }[r.applied];
      if (!r.pass && rec.t && rec.p !== 'none') { txt += ' Con t=y, el receptor aplica un nivel menos que ' + rec.p + '.'; }
      var legit = msg.server !== 'ajeno';
      if (!r.pass && legit) { txt += ' Ojo: este mensaje es legítimo. Antes de endurecer la política hay que arreglar esta fuente.'; }
      if (r.pass && !legit) { txt += ' Ojo: un servidor desconocido pasó.'; }
      verdict.classList.add(r.applied === 'deliver' ? (legit ? 'is-ok' : 'is-bad') : (legit ? 'is-bad' : r.applied === 'none' ? 'is-warn' : 'is-ok'));
      verdict.textContent = txt;
      report.textContent = 'En el reporte rua de mañana: fuente ' + SERVERS[msg.server].ip + ', 1 mensaje, SPF ' + r.spf + (r.spfAligned ? ' alineado' : ' no alineado') +
        ', DKIM ' + r.dkim + (r.dkimAligned ? ' alineado' : '') + ', disposición ' + (r.applied === 'deliver' ? 'none' : r.applied) + '.';
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'Un mensaje contra SPF, DKIM y DMARC' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'field' }, [h('p', { 'class': 'dm-flabel', text: 'Mensaje de ejemplo' }), presetRow]),
        h('div', { 'class': 'sim-controls dm-grid' }, sels.map(function (s) { return s.el; })),
        h('p', { 'class': 'dm-sub', text: 'Registros de tiendanorte.example' }),
        h('div', { 'class': 'sim-controls dm-grid' }, groups.map(function (g) { return g.el; })),
        h('div', { 'class': 'dm-scroll' }, [records]),
        h('div', { 'aria-live': 'polite' }, [checks, verdict, report]),
        h('p', { 'class': 'sim-note', text: 'Simplificaciones: el dominio organizacional son las dos últimas etiquetas (RFC 9989 lo busca recorriendo el árbol del DNS); el SPF de envios.tiendanorte.example, proveedor.example y lists.ejemplo.org autoriza solo a su propio servidor. Las IP son de rangos de documentación.' })
      ])
    ]));
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="dmarc"]').forEach(buildDmarc);
  });
})();
