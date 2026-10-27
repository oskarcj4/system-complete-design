/* Widgets de la Parte VII, primer bloque (M54 a M57).
   - <div data-sim="stride"></div>       STRIDE por elemento sobre el DFD de Tienda Norte (M54)
   - <div data-sim="appsecpipe"></div>   Qué herramienta atrapa cada falla y en qué etapa (M55)
   - <div data-sim="supplychain"></div>  Eslabones, ataques y controles de la cadena de suministro (M56)
   - <div data-sim="podsec"></div>       Un pod contra los Pod Security Standards (M57)
   La lógica está en SD.devsecCore para poder probarla sin DOM. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, kids) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  function chips(options, isOn, onToggle, multi) {
    return h('div', { 'class': 'ds-chips', role: 'group' }, options.map(function (o) {
      return h('button', {
        'class': 'chip-btn', type: 'button', 'aria-pressed': isOn(o.id) ? 'true' : 'false', 'data-id': o.id,
        onclick: function () { onToggle(o.id); }
      }, [o.label]);
    }));
  }

  function syncChips(row, isOn) {
    row.querySelectorAll('.chip-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', isOn(b.getAttribute('data-id')) ? 'true' : 'false');
    });
  }

  var core = SD.devsecCore = {};

  /* ======================================================================
     M54: STRIDE por elemento
     ====================================================================== */

  var LETTERS = [
    { k: 'S', name: 'Spoofing' }, { k: 'T', name: 'Tampering' }, { k: 'R', name: 'Repudiation' },
    { k: 'I', name: 'Information disclosure' }, { k: 'D', name: 'Denial of service' }, { k: 'E', name: 'Elevation of privilege' }
  ];
  // Tabla de STRIDE por elemento (Microsoft SDL). La R de un almacén aplica solo si guarda registros.
  var APPLIES = { externa: 'SR', proceso: 'STRIDE', almacen: 'TID', almacenLogs: 'TRID', flujo: 'TID' };
  var TYPE_NAME = { externa: 'Entidad externa', proceso: 'Proceso', almacen: 'Almacén', almacenLogs: 'Almacén con registros', flujo: 'Flujo de datos' };

  var ELEMENTS = [
    { id: 'cliente', label: 'Cliente', type: 'externa', x: 20, y: 40, w: 110, h: 44, threats: {
      S: ['Alguien usa la sesión robada de un cliente', 'Cookies HttpOnly y SameSite, rotar la sesión al iniciar, MFA opcional'],
      R: ['Un cliente niega haber hecho un pedido', 'Registrar el pedido con hora, IP y confirmación por correo'] } },
    { id: 'soporte', label: 'Soporte', type: 'externa', x: 20, y: 170, w: 110, h: 44, threats: {
      S: ['Una cuenta de soporte robada por phishing', 'MFA resistente a phishing (llaves FIDO2) y VPN'],
      R: ['Soporte niega haber hecho un reembolso', 'Log de auditoría de cada acción del panel'] } },
    { id: 'psp', label: 'PSP', type: 'externa', x: 560, y: 40, w: 100, h: 44, threats: {
      S: ['Alguien imita al PSP y manda webhooks falsos', 'Verificar la firma del webhook y consultar el pago al PSP (M39)'],
      R: ['El PSP dice que nunca mandó ese evento', 'Guardar el evento crudo con su firma en el inbox (M39)'] } },
    { id: 'api', label: 'API de la tienda', type: 'proceso', x: 200, y: 38, w: 150, h: 48, threats: {
      S: ['Usar un token ajeno o falsificado', 'Validar firma, emisor y vencimiento del token (M10)'],
      T: ['Cambiar el precio en el cuerpo del pedido', 'Recalcular el precio en el servidor; el cliente solo manda ids y cantidades'],
      R: ['Pedidos sin rastro de quién los hizo', 'Log estructurado con usuario, pedido y trace id (M11)'],
      I: ['BOLA: pedir GET /pedidos/{id} de otra cuenta', 'Filtrar por dueño en la consulta y probarlo con un test de integración'],
      D: ['Una búsqueda sin límite que satura la base', 'Paginación con tope, límite de tasa y timeout de consulta'],
      E: ['Asignación masiva: mandar "rol": "admin" en el JSON', 'DTO con la lista de campos permitidos'] } },
    { id: 'panel', label: 'Panel de soporte', type: 'proceso', x: 232, y: 166, w: 150, h: 48, threats: {
      S: ['Reusar la sesión del panel desde otro equipo', 'Sesión corta ligada al dispositivo, solo por VPN'],
      T: ['Editar un pedido que ya se envió', 'Estados que solo avanzan, validados en la base (M39)'],
      R: ['Borrar un pedido sin dejar rastro', 'Log de auditoría que el panel no puede borrar'],
      I: ['Ver direcciones y teléfonos completos de todos', 'Mostrar enmascarado; el dato completo pide un motivo y queda registrado'],
      D: ['Un export masivo que tumba la base', 'Exports en la réplica y por una cola'],
      E: ['Una cuenta de cliente que llega al panel', 'Panel en otro dominio, con rol y sesión propios'] } },
    { id: 'worker', label: 'Worker de pagos', type: 'proceso', x: 410, y: 104, w: 140, h: 48, threats: {
      S: ['Procesar un webhook falso', 'Verificar la firma antes de tocar nada'],
      T: ['Un evento alterado mientras espera en la cola', 'Cola con escritura solo para el receptor y lectura solo para el worker'],
      R: ['No saber qué evento cambió un pedido', 'Inbox con el id del evento en cada cambio (M39)'],
      I: ['Logs con el payload completo del PSP', 'Registrar solo el id, el tipo y el resultado'],
      D: ['Una tormenta de webhooks repetidos', 'Idempotencia por id de evento y procesar después de responder (M39)'],
      E: ['El worker se conecta a la base como dueño', 'Un rol de base con solo los permisos que usa (M35)'] } },
    { id: 'base', label: 'Base de pedidos', type: 'almacen', x: 180, y: 290, w: 170, h: 40, threats: {
      T: ['Un UPDATE directo sobre pedidos desde una consola', 'Roles por servicio y bitácora con triggers (M35)'],
      I: ['Un backup sin cifrar que se filtra', 'Cifrado del backup con claves en KMS (M37)'],
      D: ['Disco lleno por una tabla sin purga', 'Retención por tabla y alerta de disco al 80 %'] } },
    { id: 'logs', label: 'Logs de auditoría', type: 'almacenLogs', x: 410, y: 290, w: 170, h: 40, threats: {
      T: ['Borrar las líneas que delatan una acción', 'Solo-adición, en otra cuenta (M37)'],
      R: ['Sin integridad, los logs no sirven de prueba', 'Almacenamiento inmutable (WORM) o hash encadenado'],
      I: ['Logs con tokens o datos personales', 'Redactar antes de escribir'],
      D: ['Llenar los logs para tapar una acción', 'Cuotas por fuente y alerta de volumen anómalo'] } },
    { id: 'f-cli-api', label: 'Cliente → API', type: 'flujo', cx: 165, cy: 62, threats: {
      T: ['Alterar la request en tránsito', 'TLS en todo el camino'],
      I: ['Interceptar el pedido en una red pública', 'TLS y HSTS'],
      D: ['Inundar la API de requests', 'Borde con protección DDoS y límite de tasa (M28, M08)'] } },
    { id: 'f-api-base', label: 'API → base', type: 'flujo', cx: 212, cy: 240, threats: {
      T: ['Una consulta modificada por inyección', 'Consultas parametrizadas, nunca concatenar'],
      I: ['Conexión sin TLS dentro de la red', 'TLS hacia la base y verificar el certificado'],
      D: ['El pool de conexiones agotado', 'Pool acotado y timeouts de consulta'] } },
    { id: 'f-psp-worker', label: 'PSP → worker', type: 'flujo', cx: 535, cy: 96, threats: {
      T: ['Un webhook con el monto cambiado', 'La firma cubre el cuerpo completo'],
      I: ['Webhooks con datos de más', 'Pedir al PSP solo los eventos que se usan'],
      D: ['Reintentos del PSP que se acumulan', 'Responder 2xx rápido y procesar en segundo plano (M39)'] } }
  ];

  core.strideFor = function (type) { return APPLIES[type]; };
  core.strideElements = ELEMENTS;
  core.strideTotal = function () {
    return ELEMENTS.reduce(function (n, e) { return n + Object.keys(e.threats).length; }, 0);
  };

  function buildStride(root) {
    var sel = 'api';
    var seen = {};
    var svg = s('svg', { viewBox: '0 0 680 350', 'class': 'ds-dfd', role: 'group', 'aria-label': 'Diagrama de flujo de datos de Tienda Norte' });
    var defs = s('defs', {}, [s('marker', { id: 'dsStrideA', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, [s('path', { d: 'M0 0 L10 5 L0 10 z', 'class': 'dg-arrow' })])]);
    svg.appendChild(defs);
    // fronteras
    [['M175 20 V340', 'internet'], ['M175 262 H600', 'la base'], ['M545 20 V262', 'terceros']].forEach(function (b) {
      svg.appendChild(s('path', { d: b[0], 'class': 'dg-frame ds-boundary' }));
    });
    // flechas fijas
    [['M130 56 L198 56'], ['M130 190 L230 190'], ['M350 56 L558 56'], ['M560 80 L552 104', true], ['M212 86 L212 288'], ['M300 214 L300 288'], ['M480 152 L480 288'], ['M382 200 L450 288']].forEach(function (a) {
      svg.appendChild(s('path', { d: a[0], 'class': 'dg-edge', 'marker-end': 'url(#dsStrideA)' }));
    });
    var nodes = {};
    ELEMENTS.forEach(function (e) {
      var g = s('g', { 'class': 'ds-node', tabindex: '0', role: 'button', 'data-id': e.id, 'aria-label': e.label + ', ' + TYPE_NAME[e.type] });
      if (e.type === 'flujo') {
        g.appendChild(s('circle', { cx: e.cx, cy: e.cy, r: 13, 'class': 'ds-flow' }));
        g.appendChild(s('text', { x: e.cx, y: e.cy + 4, 'text-anchor': 'middle', 'class': 'dg-tiny ds-flow-t' }, ['F']));
      } else if (e.type === 'externa') {
        g.appendChild(s('rect', { x: e.x, y: e.y, width: e.w, height: e.h, rx: 2, 'class': 'dg-box dg-box--em ds-shape' }));
        g.appendChild(s('text', { x: e.x + e.w / 2, y: e.y + e.h / 2 + 4, 'text-anchor': 'middle', 'class': 'dg-small' }, [e.label]));
      } else if (e.type === 'proceso') {
        g.appendChild(s('rect', { x: e.x, y: e.y, width: e.w, height: e.h, rx: 22, 'class': 'dg-layer ds-shape', style: '--c: var(--l-service)' }));
        g.appendChild(s('text', { x: e.x + e.w / 2, y: e.y + e.h / 2 + 4, 'text-anchor': 'middle', 'class': 'dg-small' }, [e.label]));
      } else {
        g.appendChild(s('rect', { x: e.x, y: e.y, width: e.w, height: e.h, 'class': 'ds-store-hit' }));
        g.appendChild(s('path', { d: 'M' + e.x + ' ' + e.y + ' H' + (e.x + e.w) + ' M' + e.x + ' ' + (e.y + e.h) + ' H' + (e.x + e.w), 'class': 'ds-store' }));
        g.appendChild(s('text', { x: e.x + e.w / 2, y: e.y + e.h / 2 + 4, 'text-anchor': 'middle', 'class': 'dg-small' }, [e.label]));
      }
      function pick() { sel = e.id; render(); }
      g.addEventListener('click', pick);
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); } });
      nodes[e.id] = g;
      svg.appendChild(g);
    });
    svg.appendChild(s('text', { x: 182, y: 34, 'class': 'dg-tiny' }, ['frontera: internet']));
    svg.appendChild(s('text', { x: 552, y: 34, 'class': 'dg-tiny' }, ['frontera: terceros']));
    svg.appendChild(s('text', { x: 590, y: 280, 'class': 'dg-tiny', 'text-anchor': 'end' }, ['frontera: la base']));

    var out = h('div', { 'class': 'ds-out', 'aria-live': 'polite' });
    var count = h('p', { 'class': 'ds-count' });

    function render() {
      var e = ELEMENTS.filter(function (x) { return x.id === sel; })[0];
      seen[sel] = true;
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('is-sel', k === sel); });
      var ap = APPLIES[e.type];
      out.textContent = '';
      out.appendChild(h('p', { 'class': 'ds-head' }, [h('b', { text: e.label }), ' · ' + TYPE_NAME[e.type] + ': aplican ' + ap.split('').join(', ')]));
      out.appendChild(h('div', { 'class': 'ds-letters' }, LETTERS.map(function (l) {
        var on = ap.indexOf(l.k) !== -1;
        return h('span', { 'class': 'ds-letter' + (on ? ' is-on' : ''), title: l.name }, [h('b', { text: l.k }), h('span', { text: on ? l.name : 'no aplica' })]);
      })));
      var list = h('ul', { 'class': 'ds-threats' });
      LETTERS.forEach(function (l) {
        var t = e.threats[l.k];
        if (!t) { return; }
        list.appendChild(h('li', {}, [h('span', { 'class': 'ds-tag', text: l.k }), h('span', {}, [h('b', { text: t[0] + '. ' }), 'Mitigación: ' + t[1] + '.'])]));
      });
      if (e.type === 'almacen') {
        list.appendChild(h('li', { 'class': 'ds-muted' }, [h('span', { 'class': 'ds-tag', text: 'R' }), h('span', { text: 'No aplica aquí: este almacén no guarda los registros que sirven de prueba. Esa R vive en los logs de auditoría.' })]));
      }
      out.appendChild(list);
      var visited = Object.keys(seen).length;
      count.textContent = 'Elementos revisados: ' + visited + ' de ' + ELEMENTS.length + '. Amenazas en todo el diagrama: ' + core.strideTotal() + '.';
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'STRIDE por elemento en Tienda Norte' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'ds-scroll' }, [svg]),
        h('p', { 'class': 'sim-note', text: 'Toca un elemento. Las cajas rectas son entidades externas, las redondeadas procesos, las de dos líneas almacenes y los círculos F, flujos de datos. Las líneas punteadas son fronteras de confianza.' }),
        out, count
      ])
    ]));
    render();
  }

  /* ======================================================================
     M55: qué herramienta atrapa cada falla y en qué etapa
     ====================================================================== */

  // Costo relativo de arreglar en cada etapa: supuesto didáctico, no una medición.
  var STAGES = [
    { id: 'commit', name: 'Commit', cost: 1 }, { id: 'pr', name: 'Pull request', cost: 2 },
    { id: 'build', name: 'Build', cost: 3 }, { id: 'staging', name: 'Staging', cost: 10 },
    { id: 'prod', name: 'Producción', cost: 30 }
  ];
  var TOOLS = [
    { id: 'secretos', label: 'Secret scanning', stage: 'commit' },
    { id: 'revision', label: 'Revisión de código', stage: 'pr' },
    { id: 'sast', label: 'SAST', stage: 'pr' },
    { id: 'abuso', label: 'Pruebas de abuso', stage: 'pr' },
    { id: 'sca', label: 'SCA', stage: 'build' },
    { id: 'dast', label: 'DAST', stage: 'staging' },
    { id: 'iast', label: 'IAST', stage: 'staging' },
    { id: 'waf', label: 'WAF', stage: 'prod' }
  ];
  // 2 = la atrapa de forma fiable; 1 = a veces o solo en parte (el WAF bloquea, no arregla).
  var FLAWS = [
    { id: 'sqli', name: 'SQL concatenada en la búsqueda', by: { revision: 1, sast: 2, dast: 2, iast: 2, waf: 1 } },
    { id: 'bola', name: 'BOLA en GET /pedidos/{id}', by: { revision: 1, abuso: 2 } },
    { id: 'llave', name: 'Llave de AWS en application.yaml', by: { secretos: 2, revision: 1 } },
    { id: 'log4j', name: 'log4j-core 2.14.1 transitiva', by: { sca: 2, waf: 1 } },
    { id: 'mass', name: 'Asignación masiva del rol', by: { revision: 2, abuso: 2, sast: 1 } },
    { id: 'path', name: 'Path traversal en facturas', by: { sast: 2, dast: 2, iast: 2, waf: 1, revision: 1 } },
    { id: 'ssrf', name: 'SSRF al importar imagen', by: { revision: 2, iast: 2, sast: 1, dast: 1 } },
    { id: 'deser', name: 'readObject() sobre la request', by: { sast: 2, iast: 2, revision: 1 } }
  ];
  var PRESETS = [
    { id: 'waf', label: 'Solo WAF', on: ['waf'] },
    { id: 'scan', label: 'Solo escáneres', on: ['sast', 'sca', 'dast'] },
    { id: 'tienda', label: 'Pipeline de Tienda Norte', on: ['secretos', 'revision', 'sast', 'abuso', 'sca', 'dast', 'iast', 'waf'] }
  ];
  var STAGE_IDX = {}; STAGES.forEach(function (st, i) { STAGE_IDX[st.id] = i; });

  // Para una falla y un juego de herramientas: la primera etapa donde se atrapa de forma fiable,
  // o si solo queda una detección parcial, la primera parcial.
  core.catchFlaw = function (flaw, on) {
    var best = null;
    TOOLS.forEach(function (t) {
      var lvl = flaw.by[t.id] || 0;
      if (!lvl || !on[t.id]) { return; }
      var cand = { tool: t, level: lvl, stage: STAGES[STAGE_IDX[t.stage]] };
      if (!best || lvl > best.level || (lvl === best.level && STAGE_IDX[t.stage] < STAGE_IDX[best.tool.stage])) { best = cand; }
    });
    return best;
  };
  core.appsecTools = TOOLS; core.appsecFlaws = FLAWS;

  function buildAppsec(root) {
    var on = {};
    PRESETS[2].on.forEach(function (id) { on[id] = true; });
    var toolRow = chips(TOOLS, function (id) { return !!on[id]; }, function (id) { on[id] = !on[id]; render(); });
    var presetRow = chips(PRESETS, function () { return false; }, function (id) {
      on = {};
      PRESETS.filter(function (p) { return p.id === id; })[0].on.forEach(function (t) { on[t] = true; });
      render();
    });
    var table = h('table', { 'class': 'ds-grid' });
    var stats = h('div', { 'class': 'sim-stats' });
    var verdict = h('p', { 'class': 'ds-verdict' });
    var live = h('div', { 'aria-live': 'polite' }, [stats, verdict]);

    function render() {
      syncChips(toolRow, function (id) { return !!on[id]; });
      table.textContent = '';
      table.appendChild(h('thead', {}, [h('tr', {}, ['Falla plantada', 'La atrapa', 'Etapa', 'Costo'].map(function (t) { return h('th', { text: t }); }))]));
      var tb = h('tbody'), full = 0, part = 0, miss = 0, cost = 0;
      FLAWS.forEach(function (f) {
        var c = core.catchFlaw(f, on);
        var who, stage, cc;
        if (!c) {
          miss++; cost += 100;
          who = h('span', { 'class': 'ds-cell-bad', text: '✗ Se escapa' }); stage = 'la encuentra alguien de afuera'; cc = '100 (incidente)';
        } else if (c.level === 2) {
          full++; cost += c.stage.cost;
          who = h('span', { 'class': 'ds-cell-ok', text: '✓ ' + c.tool.label }); stage = c.stage.name; cc = String(c.stage.cost);
        } else {
          part++; cost += c.stage.cost + 30;
          who = h('span', { 'class': 'ds-cell-warn', text: '◐ ' + c.tool.label + ' (a veces)' }); stage = c.stage.name; cc = (c.stage.cost + 30) + ' (riesgo de escape)';
        }
        tb.appendChild(h('tr', {}, [h('td', { text: f.name }), h('td', {}, [who]), h('td', { text: stage }), h('td', { 'class': 'r', text: cc })]));
      });
      table.appendChild(tb);
      stats.textContent = '';
      [['Atrapadas', full + ' de 8'], ['A medias', String(part)], ['Se escapan', String(miss)], ['Costo relativo', String(cost)]].forEach(function (p) {
        stats.appendChild(h('div', { 'class': 'sim-stat' }, [h('span', { text: p[0] }), h('b', { text: p[1] })]));
      });
      verdict.className = 'ds-verdict ' + (miss ? 'is-bad' : part ? 'is-warn' : 'is-ok');
      verdict.textContent = miss
        ? '✗ ' + miss + ' falla(s) llegan a producción sin que nadie las vea. Mira qué tienen en común: casi siempre son de lógica o de configuración.'
        : part
          ? '◐ Nada se escapa del todo, pero ' + part + ' falla(s) dependen de una herramienta que solo a veces las ve.'
          : '✓ Las ocho se atrapan de forma fiable. Fíjate en qué etapa: cuanto más a la izquierda, más barato.';
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'El pipeline contra ocho fallas plantadas' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'sim-controls' }, [
          h('div', { 'class': 'field' }, [h('p', { 'class': 'ds-flabel', text: 'Herramientas activas' }), toolRow]),
          h('div', { 'class': 'field' }, [h('p', { 'class': 'ds-flabel', text: 'Puntos de partida' }), presetRow])
        ]),
        h('div', { 'class': 'ds-scroll' }, [table]),
        live,
        h('p', { 'class': 'sim-note', text: 'Costo relativo por etapa: commit 1, pull request 2, build 3, staging 10, producción 30; una falla que se escapa cuenta 100 y una atrapada "a veces" suma 30 por el riesgo. Son supuestos didácticos para comparar, no mediciones.' })
      ])
    ]));
    render();
  }

  /* ======================================================================
     M56: eslabones, ataques y controles de la cadena de suministro
     ====================================================================== */

  var SC_LINKS = ['Fuente', 'Dependencias', 'CI', 'Artefacto', 'Registro', 'Despliegue'];
  var SC_CONTROLS = [
    { id: 'review', label: 'Revisión obligatoria y MFA' },
    { id: 'lock', label: 'Lockfile con hash' },
    { id: 'proxy', label: 'Proxy y scope propio' },
    { id: 'sha', label: 'Acciones por SHA' },
    { id: 'oidc', label: 'OIDC en el CI' },
    { id: 'slsa', label: 'Build aislado (SLSA L3)' },
    { id: 'sign', label: 'Firmar la imagen' },
    { id: 'verify', label: 'Verificar al admitir' }
  ];
  // cut: alternativas (O); cada alternativa es una lista de controles que hacen falta juntos (Y).
  // part: controles que ayudan sin cortar del todo.
  var SC_ATTACKS = [
    { id: 'cuenta', name: 'Commit malicioso con una cuenta robada', link: 0, cut: [['review']], part: ['slsa'],
      why: 'Otra persona tiene que aprobar el cambio; la provenance solo deja rastro del commit.' },
    { id: 'typo', name: 'Typosquatting: un paquete con nombre parecido', link: 1, cut: [['proxy']], part: ['review'],
      why: 'El proxy con lista permitida no deja bajar lo que nadie aprobó; la revisión a veces lo nota.' },
    { id: 'confusion', name: 'Dependency confusion con un nombre interno', link: 1, cut: [['proxy'], ['lock']], part: [],
      why: 'Un solo origen por scope, o un lockfile con hash que no acepta otra versión.' },
    { id: 'accion', name: 'Una acción del CI con el tag movido', link: 2, cut: [['sha']], part: ['oidc'],
      why: 'El SHA no se mueve. OIDC limita el daño: lo que se filtre vence en minutos.' },
    { id: 'llave', name: 'Robar la llave de la nube guardada en el CI', link: 2, cut: [['oidc']], part: [],
      why: 'Sin llaves de larga vida no hay nada que robar.' },
    { id: 'build', name: 'Build envenenado, al estilo SolarWinds', link: 3, cut: [['slsa', 'verify']], part: ['slsa'],
      why: 'La provenance de una plataforma aislada solo sirve si la admisión la exige.' },
    { id: 'registro', name: 'Imagen reemplazada en el registro', link: 4, cut: [['sign', 'verify']], part: ['sign', 'verify'],
      why: 'Hacen falta las dos: firmar sin verificar o verificar sin firmar no cortan nada.' }
  ];

  core.scStatus = function (atk, on) {
    var full = atk.cut.some(function (alt) { return alt.every(function (c) { return on[c]; }); });
    if (full) { return 2; }
    return atk.part.some(function (c) { return on[c]; }) ? 1 : 0;
  };
  core.scAttacks = SC_ATTACKS;

  function buildSupply(root) {
    var on = {};
    var row = chips(SC_CONTROLS, function (id) { return !!on[id]; }, function (id) { on[id] = !on[id]; render(); });
    var all = h('div', { 'class': 'ds-chips' }, [
      h('button', { 'class': 'btn', type: 'button', onclick: function () { SC_CONTROLS.forEach(function (c) { on[c.id] = true; }); render(); } }, ['Activar todos']),
      h('button', { 'class': 'btn', type: 'button', onclick: function () { on = {}; render(); } }, ['Quitar todos'])
    ]);
    var lanes = h('div', { 'class': 'ds-lanes' });
    var stats = h('div', { 'class': 'sim-stats' });
    var verdict = h('p', { 'class': 'ds-verdict' });

    function render() {
      syncChips(row, function (id) { return !!on[id]; });
      lanes.textContent = '';
      var n = [0, 0, 0];
      SC_LINKS.forEach(function (name, li) {
        var atks = SC_ATTACKS.filter(function (a) { return a.link === li; });
        var lane = h('div', { 'class': 'ds-lane' }, [h('p', { 'class': 'ds-lane-name', text: name })]);
        if (!atks.length) { lane.appendChild(h('p', { 'class': 'ds-lane-empty', text: 'Sin ataque propio: hereda lo que llegue de antes.' })); }
        atks.forEach(function (a) {
          var st = core.scStatus(a, on); n[st]++;
          var mark = st === 2 ? '✓ Cortado' : st === 1 ? '◐ A medias' : '✗ Abierto';
          lane.appendChild(h('div', { 'class': 'ds-atk ' + (st === 2 ? 'is-ok' : st === 1 ? 'is-warn' : 'is-bad') }, [
            h('b', { text: mark + '. ' }), h('span', { text: a.name + '. ' }), h('span', { 'class': 'ds-why', text: a.why })
          ]));
        });
        lanes.appendChild(lane);
      });
      stats.textContent = '';
      [['Cortados', n[2] + ' de ' + SC_ATTACKS.length], ['A medias', String(n[1])], ['Abiertos', String(n[0])]].forEach(function (p) {
        stats.appendChild(h('div', { 'class': 'sim-stat' }, [h('span', { text: p[0] }), h('b', { text: p[1] })]));
      });
      verdict.className = 'ds-verdict ' + (n[0] ? 'is-bad' : n[1] ? 'is-warn' : 'is-ok');
      verdict.textContent = n[0]
        ? '✗ Quedan ' + n[0] + ' entradas abiertas. Un atacante elige la más barata, como en el árbol de M54.'
        : n[1] ? '◐ No queda nada abierto del todo, pero ' + n[1] + ' ataque(s) dependen de un control que solo reduce el daño.'
          : '✓ Los siete ataques quedan cortados. Lo que no corta ningún control: un mantenedor de confianza que mete una puerta trasera bien hecha.';
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'Siete ataques contra la cadena de Tienda Norte' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'sim-controls' }, [h('div', { 'class': 'field' }, [h('p', { 'class': 'ds-flabel', text: 'Controles activos' }), row]), all]),
        h('div', { 'aria-live': 'polite' }, [lanes, stats, verdict])
      ])
    ]));
    render();
  }

  /* ======================================================================
     M57: un pod contra los Pod Security Standards
     ====================================================================== */
  var PS_FIELDS = [
    { id: 'privileged', label: 'privileged', opts: [['false', 'false'], ['true', 'true']] },
    { id: 'hostns', label: 'hostPID y hostNetwork', opts: [['false', 'false'], ['true', 'true']] },
    { id: 'hostpath', label: 'volumen hostPath', opts: [['no', 'ninguno'], ['si', '/var/run del nodo']] },
    { id: 'caps', label: 'capabilities', opts: [['def', 'las del runtime'], ['drop', 'drop: ALL'], ['nbs', 'drop: ALL + NET_BIND_SERVICE'], ['sysadmin', 'add: SYS_ADMIN']] },
    { id: 'nonroot', label: 'runAsNonRoot', opts: [['unset', 'sin definir'], ['true', 'true']] },
    { id: 'ape', label: 'allowPrivilegeEscalation', opts: [['unset', 'sin definir'], ['false', 'false']] },
    { id: 'seccomp', label: 'seccompProfile', opts: [['unset', 'sin definir'], ['rd', 'RuntimeDefault'], ['unc', 'Unconfined']] },
    { id: 'rofs', label: 'readOnlyRootFilesystem', opts: [['false', 'false'], ['true', 'true']] },
    { id: 'sa', label: 'automountServiceAccountToken', opts: [['true', 'true (por defecto)'], ['false', 'false']] }
  ];
  var PS_PRESETS = [
    { id: 'vacio', label: 'Sin securityContext', cfg: { privileged: 'false', hostns: 'false', hostpath: 'no', caps: 'def', nonroot: 'unset', ape: 'unset', seccomp: 'unset', rofs: 'false', sa: 'true' } },
    { id: 'debug', label: 'Pod de depuración', cfg: { privileged: 'true', hostns: 'true', hostpath: 'si', caps: 'def', nonroot: 'unset', ape: 'unset', seccomp: 'unset', rofs: 'false', sa: 'true' } },
    { id: 'restr', label: 'La API de Tienda Norte', cfg: { privileged: 'false', hostns: 'false', hostpath: 'no', caps: 'drop', nonroot: 'true', ape: 'false', seccomp: 'rd', rofs: 'true', sa: 'false' } }
  ];
  var REACH = ['el contenedor', 'el clúster, según el RBAC', 'el nodo'];

  // Devuelve las violaciones por nivel, el nivel más estricto que cumple y lo que ganaría
  // alguien que ya ejecuta código dentro. reach: 0 contenedor, 1 clúster (token), 2 nodo.
  core.podEval = function (c) {
    var base = [], restr = [], gains = [], reach = 0, invalid = null;
    function gain(r, t) { gains.push({ reach: r, text: t }); reach = Math.max(reach, r); }
    if (c.privileged === 'true') {
      base.push('privileged: true');
      gain(2, 'Ve los dispositivos del nodo y conserva casi todas las capabilities: un contenedor privileged es, en la práctica, root en el nodo.');
      if (c.ape === 'false') { invalid = 'Kubernetes rechaza esta combinación al validar el objeto: un contenedor privileged siempre puede escalar, así que allowPrivilegeEscalation: false no tiene sentido con él.'; }
    }
    if (c.hostns === 'true') {
      base.push('hostPID o hostNetwork: true');
      gain(2, 'Ve los procesos del nodo y usa su red, por fuera de cualquier NetworkPolicy, con acceso a lo que escucha solo en el nodo.');
    }
    if (c.hostpath === 'si') {
      base.push('volumen hostPath');
      restr.push('tipo de volumen no permitido (hostPath)');
      gain(2, 'Lee y escribe archivos del nodo: logs de otros pods, credenciales del kubelet o el socket del runtime de contenedores.');
    }
    if (c.caps === 'sysadmin') {
      base.push('capabilities.add: SYS_ADMIN (fuera de la lista de baseline)');
      gain(2, 'SYS_ADMIN es la capability que más vías de escape conocidas abre: queda cerca de privileged.');
    }
    if (c.seccomp === 'unc') { base.push('seccompProfile: Unconfined'); }
    if (c.nonroot !== 'true') {
      restr.push('runAsNonRoot no es true');
      gain(0, 'Si la imagen no declara un USER, corre como root dentro del contenedor. El escape de runc de 2019 necesitaba justamente root dentro.');
    }
    if (c.ape !== 'false') {
      restr.push('allowPrivilegeEscalation no es false');
      if (c.privileged !== 'true') { gain(0, 'Un binario setuid de la imagen puede darle más privilegios que los que tenía al arrancar.'); }
    }
    if (c.caps === 'def' || c.caps === 'sysadmin') {
      restr.push('capabilities sin drop: ALL');
      if (c.caps === 'def' && c.privileged !== 'true') { gain(0, 'Conserva las capabilities que el runtime da por defecto (CHOWN, SETUID, NET_RAW y otras): menos que root completo, más de lo que la app usa.'); }
    }
    if (c.seccomp === 'unset') {
      restr.push('seccompProfile sin definir (tiene que ser RuntimeDefault o Localhost)');
      gain(0, 'Sin perfil, Kubernetes corre el contenedor Unconfined salvo que el kubelet tenga seccompDefault: todas las syscalls al alcance, también las que tengan un bug del kernel.');
    } else if (c.seccomp === 'unc') {
      restr.push('seccompProfile: Unconfined');
      gain(0, 'Unconfined deja todas las syscalls al alcance, también las que tengan un bug del kernel compartido.');
    }
    if (c.rofs !== 'true') { gain(0, 'Puede escribir en el sistema de archivos del contenedor: bajar herramientas y dejarlas mientras el pod viva. No lo exige ningún nivel, pero cuesta poco.'); }
    if (c.sa === 'true') { gain(1, 'Encuentra un token en /var/run/secrets/kubernetes.io/serviceaccount y habla con el API server con los permisos de esa service account.'); }
    if (!gains.length) { gains.push({ reach: 0, text: 'Ejecuta código con los permisos de la app y nada más: lee lo que la app lee y llega a donde la NetworkPolicy deje.' }); }
    var level = base.length ? 'privileged' : restr.length ? 'baseline' : 'restricted';
    return { baseline: base, restricted: restr, level: level, gains: gains, reach: reach, invalid: invalid };
  };

  core.podYaml = function (c) {
    var L = ['spec:'];
    if (c.sa === 'false') { L.push('  automountServiceAccountToken: false'); }
    if (c.hostns === 'true') { L.push('  hostPID: true', '  hostNetwork: true'); }
    var pod = [];
    if (c.nonroot === 'true') { pod.push('    runAsNonRoot: true'); }
    if (c.seccomp !== 'unset') { pod.push('    seccompProfile:', '      type: ' + (c.seccomp === 'rd' ? 'RuntimeDefault' : 'Unconfined')); }
    if (pod.length) { L.push('  securityContext:'); L = L.concat(pod); }
    L.push('  containers:', '  - name: api', '    image: ghcr.io/tienda-norte/api@sha256:4f2a…');
    var ctr = [];
    if (c.privileged === 'true') { ctr.push('      privileged: true'); }
    if (c.ape === 'false') { ctr.push('      allowPrivilegeEscalation: false'); }
    if (c.rofs === 'true') { ctr.push('      readOnlyRootFilesystem: true'); }
    if (c.caps === 'drop') { ctr.push('      capabilities:', '        drop: ["ALL"]'); }
    if (c.caps === 'nbs') { ctr.push('      capabilities:', '        drop: ["ALL"]', '        add: ["NET_BIND_SERVICE"]'); }
    if (c.caps === 'sysadmin') { ctr.push('      capabilities:', '        add: ["SYS_ADMIN"]'); }
    if (ctr.length) { L.push('    securityContext:'); L = L.concat(ctr); }
    if (c.hostpath === 'si') {
      L.push('    volumeMounts:', '    - name: nodo', '      mountPath: /host/run', '  volumes:', '  - name: nodo', '    hostPath:', '      path: /var/run');
    }
    return L.join('\n');
  };

  function buildPodsec(root) {
    var cfg = {};
    Object.keys(PS_PRESETS[0].cfg).forEach(function (k) { cfg[k] = PS_PRESETS[0].cfg[k]; });
    var rows = PS_FIELDS.map(function (f) {
      var row = chips(f.opts.map(function (o) { return { id: o[0], label: o[1] }; }),
        function (id) { return cfg[f.id] === id; }, function (id) { cfg[f.id] = id; render(); });
      return { f: f, row: row, el: h('div', { 'class': 'ps-field' }, [h('p', { 'class': 'ps-flabel', text: f.label }), row]) };
    });
    var presets = h('div', { 'class': 'ds-chips' }, PS_PRESETS.map(function (p) {
      return h('button', { 'class': 'btn', type: 'button', onclick: function () {
        Object.keys(p.cfg).forEach(function (k) { cfg[k] = p.cfg[k]; }); render();
      } }, [p.label]);
    }));
    var levels = h('div', { 'class': 'ps-levels' });
    var why = h('div', { 'class': 'ps-why' });
    var gainsEl = h('ul', { 'class': 'ps-gains' });
    var stats = h('div', { 'class': 'sim-stats' });
    var verdict = h('p', { 'class': 'ds-verdict' });
    var yaml = h('pre', { 'class': 'ps-yaml' });

    function render() {
      rows.forEach(function (r) { syncChips(r.row, function (id) { return cfg[r.f.id] === id; }); });
      var ev = core.podEval(cfg);
      levels.textContent = '';
      [['privileged', [], 'Privileged'], ['baseline', ev.baseline, 'Baseline'], ['restricted', ev.baseline.concat(ev.restricted), 'Restricted']].forEach(function (l) {
        var ok = !l[1].length;
        levels.appendChild(h('div', { 'class': 'ps-level ' + (ok ? 'is-ok' : 'is-bad') }, [
          h('b', { text: (ok ? '✓ ' : '✗ ') + l[2] }), h('span', { text: ok ? 'lo admite' : 'lo rechaza' })
        ]));
      });
      why.textContent = '';
      if (ev.baseline.length || ev.restricted.length) {
        why.appendChild(h('p', { 'class': 'ps-sub', text: 'Lo que lo deja fuera de cada nivel' }));
        var ul = h('ul', { 'class': 'ps-list' });
        ev.baseline.forEach(function (t) { ul.appendChild(h('li', {}, [h('b', { text: 'Baseline y restricted: ' }), t])); });
        ev.restricted.forEach(function (t) { ul.appendChild(h('li', {}, [h('b', { text: 'Restricted: ' }), t])); });
        why.appendChild(ul);
      }
      gainsEl.textContent = '';
      ev.gains.forEach(function (g) {
        gainsEl.appendChild(h('li', { 'class': g.reach === 2 ? 'is-bad' : g.reach === 1 ? 'is-warn' : '' }, [g.text]));
      });
      stats.textContent = '';
      [['Nivel más estricto que cumple', ev.level], ['Hasta dónde llega quien entre', REACH[ev.reach]]].forEach(function (p) {
        stats.appendChild(h('div', { 'class': 'sim-stat' }, [h('span', { text: p[0] }), h('b', { text: p[1] })]));
      });
      if (ev.invalid) {
        verdict.className = 'ds-verdict is-warn';
        verdict.textContent = '⚠ ' + ev.invalid;
      } else {
        verdict.className = 'ds-verdict ' + (ev.reach === 2 ? 'is-bad' : ev.level === 'restricted' ? 'is-ok' : 'is-warn');
        verdict.textContent = ev.reach === 2
          ? '✗ Con este pod, una falla en la app se convierte en el nodo entero y en todos los pods que corren en él.'
          : ev.level === 'restricted'
            ? '✓ Cumple restricted. Lo que queda depende de la app, de la red y del runtime al día.'
            : '◐ Cumple ' + ev.level + ', pero quien entre tiene más de lo que la app necesita. Restricted cuesta pocas líneas.';
      }
      yaml.textContent = core.podYaml(cfg);
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: 'Un pod contra los Pod Security Standards' })]),
      h('div', { 'class': 'sim-body' }, [
        h('div', { 'class': 'sim-controls ps-controls' }, rows.map(function (r) { return r.el; })),
        h('div', { 'class': 'field' }, [h('p', { 'class': 'ds-flabel', text: 'Puntos de partida' }), presets]),
        h('div', { 'class': 'ps-out', 'aria-live': 'polite' }, [
          levels, why, h('p', { 'class': 'ps-sub', text: 'Qué ganaría alguien que ya ejecuta código dentro' }), gainsEl, stats, verdict
        ]),
        h('details', { 'class': 'ps-details' }, [h('summary', { text: 'Ver el manifiesto que resulta' }), yaml])
      ])
    ]));
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="stride"]').forEach(buildStride);
    document.querySelectorAll('[data-sim="appsecpipe"]').forEach(buildAppsec);
    document.querySelectorAll('[data-sim="supplychain"]').forEach(buildSupply);
    document.querySelectorAll('[data-sim="podsec"]').forEach(buildPodsec);
  });
})();
