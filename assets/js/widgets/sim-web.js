/* Widgets de la Parte IX (Seguridad web):
   <div data-sim="domparse">  escribe HTML y mira el árbol que arma el parser del navegador, con las
                              correcciones que hace solo; compara con lo que crea textContent.
   El HTML se analiza con DOMParser, que arma un documento inerte: no ejecuta scripts, no dispara
   eventos y no descarga recursos. El árbol se dibuja con textContent, nunca con innerHTML.
   La lógica está en SD.webCore para poder probarla sin el DOM de la página. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  var PRESETS = [
    { name: 'Etiquetas sin cerrar', html: '<p>Hola <b>mundo',
      note: 'Faltan </b> y </p>, y también <html>, <head> y <body>. El parser no falla: los agrega. La especificación de HTML dice exactamente cómo corregir cada error, así que todos los navegadores arman el mismo árbol.' },
    { name: 'Tabla sin tbody', html: '<table><tr><td>Backend</td><td>Remoto</td></tr></table>',
      note: 'No escribiste <tbody>, pero el árbol lo tiene: el parser lo inserta. Un selector como "table > tr" no encuentra nada por eso.' },
    { name: 'Un div dentro de una tabla', html: '<table><div>Aviso</div><tr><td>Fila</td></tr></table>',
      note: 'Un <div> no puede ir directo en una tabla, así que el parser lo saca y lo pone antes de la tabla (foster parenting). El orden del árbol ya no es el orden del texto.' },
    { name: 'Un párrafo con un div', html: '<p>Uno<div>Dos</div></p>',
      note: 'Un <div> cierra el <p> abierto. El </p> final queda huérfano y el parser crea un párrafo vacío para él: tres nodos donde escribiste dos.' },
    { name: 'Marcado dentro de <title>', html: '<title><b>Ofertas</b></title>',
      note: 'Dentro de <title> (y de <textarea>) el parser no reconoce etiquetas: todo es texto. El mismo string es marcado en un lugar y texto en otro. A eso se le llama contexto, y es la base de M77.' },
    { name: 'Atributo sin comillas', html: '<a href=/ofertas title=Práctica remota>Ver</a>',
      note: 'Sin comillas, el valor termina en el primer espacio: title vale "Práctica" y "remota" pasa a ser otro atributo, vacío. Un valor que mete un espacio cambia la estructura.' }
  ];

  /* Recorre el árbol y devuelve líneas {depth, kind, text} */
  function walk(node, depth, out) {
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 1) {
        var attrs = [];
        for (var j = 0; j < n.attributes.length; j++) {
          var a = n.attributes[j];
          attrs.push(a.value === '' ? a.name + '=""' : a.name + '="' + a.value + '"');
        }
        out.push({ depth: depth, kind: 'el', text: n.tagName.toLowerCase() + (attrs.length ? ' ' + attrs.join(' ') : '') });
        walk(n.tagName === 'TEMPLATE' ? n.content : n, depth + 1, out);
      } else if (n.nodeType === 3) {
        if (n.data.trim() !== '') out.push({ depth: depth, kind: 'text', text: JSON.stringify(n.data) });
      } else if (n.nodeType === 8) {
        out.push({ depth: depth, kind: 'comment', text: '<!--' + n.data + '-->' });
      }
    }
    return out;
  }

  function parse(src) {
    var doc = new DOMParser().parseFromString(src, 'text/html');
    var lines = [{ depth: 0, kind: 'el', text: 'html' }].concat(walk(doc.documentElement, 1, []));
    var els = lines.filter(function (l) { return l.kind === 'el'; }).length;
    return { lines: lines, elements: els, texts: lines.filter(function (l) { return l.kind === 'text'; }).length };
  }

  SD.webCore = { parse: parse, PRESETS: PRESETS };

  function initDomparse(host) {
    var cur = 0;
    var ta = h('textarea', { class: 'wb-input', rows: '3', spellcheck: 'false', 'aria-label': 'HTML que vas a analizar' });
    var tree = h('ol', { class: 'wb-tree', 'aria-label': 'Árbol del DOM' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Ejemplos' });

    function run() {
      var r = parse(ta.value);
      tree.innerHTML = '';
      r.lines.forEach(function (l) {
        tree.appendChild(h('li', { class: 'wb-' + l.kind, style: '--d:' + l.depth, text: l.text }));
      });
      stats.innerHTML = '';
      [['Con innerHTML: elementos', SD.fmt.num(r.elements)], ['Nodos de texto', SD.fmt.num(r.texts)], ['Con textContent', '1 nodo de texto']].forEach(function (x) {
        stats.appendChild(h('div', { class: 'sim-stat' }, [h('span', { text: x[0] }), h('b', { text: x[1] })]));
      });
    }
    PRESETS.forEach(function (p, i) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': i === cur ? 'true' : 'false', text: p.name });
      b.addEventListener('click', function () {
        cur = i;
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        ta.value = p.html; note.textContent = p.note; run();
      });
      g.appendChild(b);
    });
    ta.addEventListener('input', function () {
      g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      note.textContent = 'Tu propio HTML. El documento es inerte: los scripts no corren y nada se descarga.';
      run();
    });

    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Del string al árbol: lo que arma el parser' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [g]),
      h('label', { class: 'field' }, [h('span', { text: 'HTML' }), ta]),
      h('div', { class: 'wb-grid' }, [h('div', { class: 'wb-panel' }, [h('p', { class: 'wb-cap', text: 'Árbol del DOM' }), tree]), h('div', { class: 'wb-panel' }, [stats, note])])
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'El árbol sale de DOMParser, el mismo parser de HTML de tu navegador, sobre un documento sin ventana: no ejecuta scripts ni descarga nada. Se omiten los nodos de texto que son solo espacios.' }));
    ta.value = PRESETS[0].html; note.textContent = PRESETS[0].note;
    run();
  }

  /* ---------- origins: mismo origen, mismo sitio y qué cookies viajan (M74) ---------- */
  /* Un recorte de la Public Suffix List, suficiente para los ejemplos. La lista real tiene miles de entradas. */
  var PSL = ['com', 'org', 'net', 'io', 'dev', 'example', 'gt', 'edu.gt', 'com.gt', 'co.uk', 'github.io', 'vercel.app'];

  function siteOf(u) {
    var host = u.hostname;
    if (host === 'localhost' || /^[\d.]+$/.test(host) || host.indexOf(':') >= 0) return u.protocol + '//' + host;
    var labels = host.split('.'), best = '';
    for (var i = 0; i < labels.length; i++) {
      var suf = labels.slice(i).join('.');
      if (PSL.indexOf(suf) >= 0 && suf.length > best.length) best = suf;
    }
    if (!best) return u.protocol + '//' + host;
    var n = best.split('.').length;
    return u.protocol + '//' + labels.slice(-(n + 1)).join('.');
  }

  var REQS = {
    fetch: { name: 'fetch desde JavaScript', top: false, method: 'GET' },
    form: { name: 'Formulario POST', top: true, method: 'POST' },
    link: { name: 'Enlace (navegar con GET)', top: true, method: 'GET' },
    img: { name: '<img> o <script>', top: false, method: 'GET' },
    iframe: { name: 'Un <iframe>', top: false, method: 'GET' }
  };

  function judge(a, b, rk) {
    var A, B;
    try { A = new URL(a); B = new URL(b); } catch (e) { return null; }
    var r = REQS[rk];
    var sameOrigin = A.origin === B.origin;
    var sA = siteOf(A), sB = siteOf(B), sameSite = sA === sB;
    var secure = B.protocol === 'https:' || B.hostname === 'localhost';
    var lax = sameSite || (r.top && r.method === 'GET');
    var read;
    if (rk === 'fetch') read = sameOrigin ? 'Sí: mismo origen' : 'Solo si el servidor de destino lo permite con CORS (M75)';
    else if (rk === 'iframe') read = sameOrigin ? 'Sí: puede tocar el DOM del iframe' : 'No: el DOM del iframe es de otro origen';
    else if (rk === 'img') read = sameOrigin ? 'Sí' : 'No puede leer los bytes; solo usarlos (mostrar la imagen, correr el script)';
    else read = 'La respuesta reemplaza la página: la ve el usuario, no el JavaScript de A';
    return {
      originA: A.origin, originB: B.origin, siteA: sA, siteB: sB, sameOrigin: sameOrigin, sameSite: sameSite,
      strict: sameSite, lax: lax, none: secure, read: read, req: r
    };
  }

  SD.webCore.siteOf = siteOf;
  SD.webCore.judge = judge;

  var PAIRS = [
    { name: 'La API del proyecto', a: 'http://localhost/SistemaControlPracticas/index.html', b: 'http://localhost/SistemaControlPracticas/api/endpoints/oportunidades.php',
      note: 'Mismo esquema, mismo host y mismo puerto: mismo origen. Es el caso normal del sistema de prácticas.' },
    { name: 'Otro puerto en localhost', a: 'http://localhost:8080/atacante.html', b: 'http://localhost/SistemaControlPracticas/api/endpoints/oportunidades.php',
      note: 'El puerto cambia el origen, pero no el sitio: los dos son el sitio http://localhost. SameSite no te protege de otra aplicación en otro puerto de tu misma máquina. Por eso WEB00 usa un nombre distinto para el sitio atacante.' },
    { name: 'Subdominios', a: 'https://app.practicas.edu.gt/ofertas', b: 'https://api.practicas.edu.gt/v1/ofertas',
      note: 'Orígenes distintos, mismo sitio (practicas.edu.gt, porque edu.gt es un sufijo público). Las cookies Strict viajan. Si un subdominio cualquiera queda comprometido, es "mismo sitio".' },
    { name: 'Otro sitio', a: 'https://ofertas-gratis.example/promo', b: 'https://app.practicas.edu.gt/api/postular',
      note: 'Sitios distintos. Strict no viaja nunca; Lax solo en una navegación GET de nivel superior. Es el escenario de CSRF (M76).' },
    { name: 'Dos usuarios de github.io', a: 'https://ana.github.io/', b: 'https://beto.github.io/',
      note: 'Parecen subdominios del mismo sitio, pero github.io está en la Public Suffix List: cada usuario es un sitio distinto, y una cookie de ana.github.io nunca llega a beto.github.io.' },
    { name: 'http contra https', a: 'http://app.practicas.edu.gt/', b: 'https://app.practicas.edu.gt/',
      note: 'Mismo host, distinto esquema: distinto origen y, con la definición actual (schemeful same-site), distinto sitio. Una página por http no cuenta como mismo sitio que la de https.' }
  ];

  function yesno(v) { return v ? 'Sí' : 'No'; }

  function initOrigins(host) {
    var pi = 0, rk = 'fetch';
    var ia = h('input', { type: 'text', spellcheck: 'false', 'aria-label': 'URL de la página que inicia' });
    var ib = h('input', { type: 'text', spellcheck: 'false', 'aria-label': 'URL de destino' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var cookies = h('div', { class: 'wb-cookies', 'aria-live': 'polite' });
    var read = h('p', { class: 'sim-note' });
    var note = h('p', { class: 'sim-note' });
    var gp = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Ejemplos' });
    var gr = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Tipo de request' });

    function run() {
      var r = judge(ia.value.trim(), ib.value.trim(), rk);
      stats.innerHTML = ''; cookies.innerHTML = '';
      if (!r) { read.textContent = 'Escribe dos URL completas, con http:// o https://.'; return; }
      [['Origen de A', r.originA], ['Origen de B', r.originB], ['Mismo origen', yesno(r.sameOrigin)], ['Mismo sitio', yesno(r.sameSite) + ' (' + r.siteB.replace(/^https?:\/\//, '') + ')']].forEach(function (x) {
        stats.appendChild(h('div', { class: 'sim-stat' }, [h('span', { text: x[0] }), h('b', { class: 'wb-break', text: x[1] })]));
      });
      [['SameSite=Strict', r.strict, r.strict ? 'viaja: la request es del mismo sitio' : 'no viaja: la request sale de otro sitio'],
       ['SameSite=Lax', r.lax, r.lax ? (r.sameSite ? 'viaja: mismo sitio' : 'viaja: navegación GET de nivel superior') : 'no viaja: otro sitio y no es una navegación GET'],
       ['SameSite=None; Secure', r.none, r.none ? 'viaja, si el navegador permite cookies de terceros' : 'no se guarda: None exige Secure y el destino no es https']].forEach(function (x) {
        cookies.appendChild(h('div', { class: 'wb-cookie ' + (x[1] ? 'is-ok' : 'is-no') }, [
          h('b', { text: x[0] }), h('span', { class: 'wb-verdict', text: x[1] ? '✓ Viaja' : '✕ No viaja' }), h('span', { text: x[2] })]));
      });
      read.textContent = '¿El JavaScript de A puede leer la respuesta? ' + r.read;
    }
    function chip(group, label, pressed, fn) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': pressed ? 'true' : 'false', text: label });
      b.addEventListener('click', function () {
        group.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        fn(); run();
      });
      group.appendChild(b);
    }
    PAIRS.forEach(function (p, i) {
      chip(gp, p.name, i === pi, function () { pi = i; ia.value = p.a; ib.value = p.b; note.textContent = p.note; });
    });
    Object.keys(REQS).forEach(function (k) { chip(gr, REQS[k].name, k === rk, function () { rk = k; }); });
    [ia, ib].forEach(function (inp) { inp.addEventListener('input', function () { note.textContent = 'Tus propias URL. El sitio se calcula con un recorte de la Public Suffix List.'; run(); }); });

    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Origen, sitio y qué cookies viajan' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [gp]),
      h('label', { class: 'field' }, [h('span', { text: 'A: la página donde está el código' }), ia]),
      h('label', { class: 'field' }, [h('span', { text: 'B: adonde va la request' }), ib]),
      h('div', { class: 'sim-controls' }, [h('span', { class: 'hs-label', text: 'Cómo sale la request' }), gr]),
      stats, cookies, read, note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Modelo simplificado de las reglas de Chrome y Firefox en 2026: ignora la excepción de dos minutos de Chrome para cookies sin atributo SameSite (Lax+POST), los bloqueos de cookies de terceros de cada navegador y las extensiones. La Public Suffix List es un recorte.' }));
    ia.value = PAIRS[0].a; ib.value = PAIRS[0].b; note.textContent = PAIRS[0].note;
    run();
  }

  /* ---------- cors: una request contra una política de CORS (M75) ---------- */
  var API = 'https://api.practicas.edu.gt';
  var ALLOWED = ['https://app.practicas.edu.gt', 'http://localhost:5173'];
  var CORS_ORIGINS = [
    { v: 'https://app.practicas.edu.gt', name: 'El frontend (app.)' },
    { v: 'https://blog.practicas.edu.gt', name: 'El blog (mismo sitio)' },
    { v: 'https://ofertas-gratis.example', name: 'Otro sitio' },
    { v: 'https://practicas.edu.gt.ofertas-gratis.example', name: 'Un dominio que contiene el nombre' },
    { v: 'null', name: 'Origin: null (iframe con sandbox, file://)' }
  ];
  var POLICIES = {
    none: { name: 'Sin cabeceras CORS', note: 'Es lo que hace hoy tu response.php. La request simple igual llega y se ejecuta; solo la lectura queda bloqueada.' },
    star: { name: 'Access-Control-Allow-Origin: *', note: 'Cualquier origen lee, pero sin credenciales: con credentials: "include" el navegador rechaza el comodín. Sirve para datos públicos, nunca para una API con sesión.' },
    reflect: { name: 'Reflejar el Origin con credenciales', note: 'El error más común: copiar el Origin de la request en la respuesta. Equivale a que cualquier sitio lea las respuestas con la sesión del usuario, si la cookie viaja.' },
    regex: { name: 'Regex sin ancla: /practicas\\.edu\\.gt/', note: 'Busca el texto en cualquier parte del Origin: practicas.edu.gt.ofertas-gratis.example también pasa. Se compara contra una lista exacta, no con una expresión.' },
    nullok: { name: 'Lista que acepta "null"', note: 'null lo manda cualquier página dentro de un iframe con sandbox, así que aceptarlo es aceptar a cualquiera que sepa hacer un iframe.' },
    list: { name: 'Lista exacta con credenciales', note: 'La política correcta: solo los orígenes de la lista, con credenciales, los métodos y cabeceras que usa el frontend y Vary: Origin para que una caché no mezcle respuestas.' }
  };
  var METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
  var CTYPES = ['text/plain', 'application/x-www-form-urlencoded', 'application/json'];

  function corsPolicy(pk, origin, reqHeaders) {
    var all = 'GET, POST, PUT, DELETE', hdrs = 'Content-Type, X-CSRF-Token';
    if (pk === 'none') return {};
    if (pk === 'star') return { acao: '*', acam: all, acah: hdrs };
    if (pk === 'reflect') return { acao: origin, acac: 'true', acam: all, acah: reqHeaders.join(', ') || hdrs };
    var ok = pk === 'regex' ? /practicas\.edu\.gt/.test(origin)
      : ALLOWED.indexOf(origin) >= 0 || (pk === 'nullok' && origin === 'null');
    if (!ok) return { vary: 'Origin' };
    return { acao: origin, acac: 'true', acam: 'GET, POST', acah: hdrs, vary: 'Origin' };
  }

  function listHas(list, item) {
    return (list || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).indexOf(item.toLowerCase()) >= 0;
  }

  /* La comprobación que hace el navegador con la respuesta (de la request o del preflight). */
  function corsCheck(h, origin, cred) {
    if (!h.acao) return 'falta Access-Control-Allow-Origin';
    if (h.acao === '*' && cred) return 'el comodín * no vale con credenciales';
    if (h.acao !== '*' && h.acao !== origin) return 'Access-Control-Allow-Origin no coincide con el Origin';
    if (cred && h.acac !== 'true') return 'falta Access-Control-Allow-Credentials: true';
    return '';
  }

  function corsRun(o) {
    var reqHeaders = [];
    if (o.ctype !== 'text/plain' && o.ctype !== 'application/x-www-form-urlencoded') reqHeaders.push('content-type');
    if (o.csrf) reqHeaders.push('x-csrf-token');
    var simple = ['GET', 'POST'].indexOf(o.method) >= 0 && reqHeaders.length === 0;
    var h = corsPolicy(o.policy, o.origin, reqHeaders);
    var r = { simple: simple, reqHeaders: reqHeaders, headers: h, preflightFail: '', readFail: '' };
    if (!simple) {
      r.preflightFail = corsCheck(h, o.origin, o.cred);
      if (!r.preflightFail && ['GET', 'POST'].indexOf(o.method) < 0 && !listHas(h.acam, o.method)) r.preflightFail = 'el método no está en Access-Control-Allow-Methods';
      if (!r.preflightFail) reqHeaders.forEach(function (x) { if (!r.preflightFail && !listHas(h.acah, x)) r.preflightFail = 'la cabecera ' + x + ' no está en Access-Control-Allow-Headers'; });
    }
    r.sent = simple || !r.preflightFail;
    var sameSite = o.origin !== 'null' && SD.webCore.siteOf(new URL(o.origin)) === SD.webCore.siteOf(new URL(API));
    r.cookie = o.cred && sameSite;
    if (r.sent) r.readFail = corsCheck(h, o.origin, o.cred);
    return r;
  }

  SD.webCore.corsRun = corsRun;

  function hdrText(h, extra) {
    var lines = [];
    if (h.acao) lines.push('Access-Control-Allow-Origin: ' + h.acao);
    if (h.acac) lines.push('Access-Control-Allow-Credentials: ' + h.acac);
    if (extra && h.acam) lines.push('Access-Control-Allow-Methods: ' + h.acam);
    if (extra && h.acah) lines.push('Access-Control-Allow-Headers: ' + h.acah);
    if (h.vary) lines.push('Vary: ' + h.vary);
    return lines.length ? lines.join('\n') : '(ninguna cabecera Access-Control-*)';
  }

  function initCors(host) {
    var st = { origin: CORS_ORIGINS[2].v, policy: 'none', method: 'POST', ctype: 'application/x-www-form-urlencoded', csrf: false, cred: true };
    var out = h('div', { class: 'wb-flow', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });

    function select(label, key, opts) {
      var s = h('select', { 'aria-label': label });
      opts.forEach(function (x) {
        var op = h('option', { value: x.v, text: x.name });
        if (x.v === st[key]) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { st[key] = s.value; run(); });
      return h('label', { class: 'field' }, [h('span', { text: label }), s]);
    }
    function check(label, key) {
      var c = h('input', { type: 'checkbox' });
      c.checked = st[key];
      c.addEventListener('change', function () { st[key] = c.checked; run(); });
      return h('label', { class: 'wb-check' }, [c, h('span', { text: label })]);
    }
    function box(ok, title, text, pre) {
      var state = ok === 'info' ? 'is-info' : ok ? 'is-ok' : 'is-no';
      var icon = ok === 'info' ? '→ ' : ok ? '✓ ' : '✕ ';
      var kids = [h('b', { text: title }), h('span', { class: 'wb-verdict', text: icon + text })];
      if (pre) kids.push(h('pre', { class: 'wb-http', text: pre }));
      return h('div', { class: 'wb-cookie ' + state }, kids);
    }

    function run() {
      var r = corsRun(st);
      out.innerHTML = '';
      var reqH = 'Origin: ' + st.origin;
      if (!r.simple) {
        var pre = 'OPTIONS /v1/postulaciones\nOrigin: ' + st.origin + '\nAccess-Control-Request-Method: ' + st.method +
          (r.reqHeaders.length ? '\nAccess-Control-Request-Headers: ' + r.reqHeaders.join(', ') : '') + '\n\n204 No Content\n' + hdrText(r.headers, true);
        out.appendChild(box(!r.preflightFail, '1. Preflight', r.preflightFail ? 'rechazado: ' + r.preflightFail : 'aprobado', pre));
      } else {
        out.appendChild(box(true, '1. Preflight', 'no hace falta: es una request simple', null));
      }
      if (r.sent) {
        var body = st.method + ' /v1/postulaciones\n' + reqH + '\nContent-Type: ' + st.ctype +
          (st.csrf ? '\nX-CSRF-Token: …' : '') + (r.cookie ? '\nCookie: __Host-sesion=…' : '') + '\n\n200 OK\n' + hdrText(r.headers, false);
        out.appendChild(box('info', '2. La request', 'llega y PHP la ejecuta' + (r.cookie ? ', con la cookie' : ', sin la cookie'), body));
      } else {
        out.appendChild(box(true, '2. La request', 'nunca sale: el servidor solo vio el OPTIONS', null));
      }
      out.appendChild(r.sent
        ? box(!r.readFail, '3. ¿El JavaScript lee la respuesta?', r.readFail ? 'no: ' + r.readFail : 'sí, la lee completa', null)
        : box(true, '3. ¿El JavaScript lee la respuesta?', 'no hay respuesta que leer', null));
      var verdict = st.origin === 'https://app.practicas.edu.gt'
        ? (r.sent && !r.readFail ? 'Es tu frontend y funciona: bien.' : 'Es tu frontend y no funciona: la política es demasiado estricta para él.')
        : (r.sent && !r.readFail && r.cookie ? 'Un origen ajeno lee respuestas con la sesión del usuario: la política tiene un agujero.'
          : r.sent && !r.readFail ? 'Un origen ajeno lee la respuesta, pero sin cookie: solo ve lo que vería cualquiera sin sesión.'
          : r.sent ? 'No lee la respuesta, pero la request llegó y se ejecutó. Contra eso no protege CORS: es CSRF (M76).'
          : 'El preflight frenó la request antes de que llegara.');
      note.textContent = POLICIES[st.policy].note + ' ' + verdict;
    }

    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Una request contra una política de CORS' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'wb-grid' }, [
        h('div', {}, [
          select('Página que hace el fetch (Origin)', 'origin', CORS_ORIGINS),
          select('Política del servidor ' + API.replace('https://', ''), 'policy', Object.keys(POLICIES).map(function (k) { return { v: k, name: POLICIES[k].name }; })),
          select('Método', 'method', METHODS.map(function (m) { return { v: m, name: m }; })),
          select('Content-Type', 'ctype', CTYPES.map(function (c) { return { v: c, name: c }; })),
          check('Cabecera X-CSRF-Token', 'csrf'),
          check('credentials: "include" (manda la cookie)', 'cred')
        ]),
        out
      ]),
      note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'La cookie de sesión tiene SameSite=Lax: en un fetch solo viaja si la página es del mismo sitio que la API (M74). Modelo simplificado: no incluye Access-Control-Expose-Headers, Max-Age del preflight ni los comodines en Allow-Headers.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="domparse"]').forEach(initDomparse);
    document.querySelectorAll('[data-sim="origins"]').forEach(initOrigins);
    document.querySelectorAll('[data-sim="cors"]').forEach(initCors);
  });
})();
