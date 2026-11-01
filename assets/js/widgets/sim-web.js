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

/* Widgets de M76–M80 (Parte IX):
   <div data-sim="csrf">    cinco formas de CSRF contra cinco defensas que se encienden y se apagan (M76)
   <div data-sim="xssctx">  un valor en cinco contextos de salida con un escape elegible: qué queda en el HTML
                            y si el navegador ejecutaría algo (M77). Nada se inserta en la página: todo se
                            muestra como texto y el veredicto sale de reglas, no de ejecutar el payload.
   <div data-sim="csp">     cinco políticas de CSP contra cinco inyecciones y dos scripts legítimos (M78)
   <div data-sim="acl">     seis personas contra una acción del sistema de prácticas, con los chequeos de
                            sesión, rol, dueño e id de la sesión (M80)
   La lógica está en SD.webCore (csrfRun, xssEscape, xssJudge, aclRun). */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  function chips(label, items, cur, onPick) {
    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': label });
    items.forEach(function (it, i) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': i === cur ? 'true' : 'false', text: it.name });
      b.addEventListener('click', function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(i);
      });
      g.appendChild(b);
    });
    return g;
  }
  function card(state, title, verdict, pre, extra) {
    var cls = state === 'ok' ? 'is-ok' : state === 'no' ? 'is-no' : 'is-info';
    var icon = state === 'ok' ? '✓ ' : state === 'no' ? '✕ ' : '→ ';
    var kids = [h('b', { text: title }), h('span', { class: 'wb-verdict', text: icon + verdict })];
    if (pre) kids.push(h('pre', { class: 'wb-http', text: pre }));
    if (extra) kids.push(h('span', { class: 'wb-detail', text: extra }));
    return h('div', { class: 'wb-cookie ' + cls }, kids);
  }
  function frame(host, title, kids, foot) {
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: title })]));
    host.appendChild(h('div', { class: 'sim-body' }, kids));
    if (foot) host.appendChild(h('p', { class: 'sim-foot', text: foot }));
  }

  /* ---------------- M76: CSRF ---------------- */
  var CSRF_ATTACKS = [
    { id: 'form', name: 'Formulario POST desde ofertas-gratis.example', site: 'cross', method: 'POST', nav: true, cookie: true,
      req: 'POST /api/endpoints/oportunidades.php\nOrigin: https://ofertas-gratis.example\nSec-Fetch-Site: cross-site\nSec-Fetch-Mode: navigate\nContent-Type: application/x-www-form-urlencoded',
      effect: 'publica una oferta falsa a nombre de Carla' },
    { id: 'get', name: 'Enlace GET con efecto: ?accion=cerrar&id=7', site: 'cross', method: 'GET', nav: true, cookie: true, getEffect: true,
      req: 'GET /api/endpoints/oportunidades.php?accion=cerrar&id=7\nSec-Fetch-Site: cross-site\nSec-Fetch-Mode: navigate\n(sin Origin: es una navegación GET)',
      effect: 'cierra la oportunidad 7, si un GET cambia algo' },
    { id: 'nocors', name: 'fetch no-cors con text/plain', site: 'cross', method: 'POST', nav: false, cookie: true,
      req: 'POST /api/endpoints/postulaciones.php\nOrigin: https://ofertas-gratis.example\nSec-Fetch-Site: cross-site\nSec-Fetch-Mode: no-cors\nContent-Type: text/plain',
      effect: 'crea una postulación a nombre de la víctima' },
    { id: 'blog', name: 'Formulario desde blog.practicas.edu.gt (con un XSS)', site: 'same', method: 'POST', nav: true, cookie: true,
      req: 'POST /api/endpoints/oportunidades.php\nOrigin: https://blog.practicas.edu.gt\nSec-Fetch-Site: same-site\nSec-Fetch-Mode: navigate',
      effect: 'publica una oferta falsa desde un subdominio del mismo sitio' },
    { id: 'login', name: 'Login CSRF con la cuenta del atacante', site: 'cross', method: 'POST', nav: true, cookie: false, login: true,
      req: 'POST /api/endpoints/login.php\nOrigin: https://ofertas-gratis.example\nSec-Fetch-Site: cross-site\n(sin cookie: todavía no hay sesión)',
      effect: 'la víctima queda dentro de la cuenta del atacante' }
  ];
  var CSRF_DEF = [
    { id: 'samesite', name: 'Cookie SameSite=Lax' },
    { id: 'getsafe', name: 'Ningún GET cambia datos' },
    { id: 'fetchmeta', name: 'Fetch Metadata (aislamiento de recursos)' },
    { id: 'origin', name: 'Origin exacto en las escrituras' },
    { id: 'token', name: 'Token X-CSRF-Token (csrf.php)' }
  ];
  var CSRF_PRESETS = [
    { name: 'Ninguna', on: [] },
    { name: 'Solo SameSite', on: ['samesite'] },
    { name: 'Tu sistema hoy', on: ['getsafe', 'token'] },
    { name: 'Las cinco', on: ['samesite', 'getsafe', 'fetchmeta', 'origin', 'token'] }
  ];
  function csrfBlocks(a, d) {
    if (d === 'samesite') return a.cookie && a.site === 'cross' && !(a.nav && a.method === 'GET') ? 'la cookie no viaja' : '';
    if (d === 'getsafe') return a.getEffect ? 'el GET no cambia nada' : '';
    if (d === 'fetchmeta') return a.site === 'cross' && !(a.nav && a.method === 'GET') ? 'cross-site y no es una navegación GET: 403' : '';
    if (d === 'origin') return a.method !== 'GET' ? 'el Origin no está en la lista: 403' : '';
    if (d === 'token') return a.method !== 'GET' && !a.login ? 'falta X-CSRF-Token y el formulario no puede ponerlo' : '';
    return '';
  }
  function csrfRun(a, on) {
    var by = [];
    on.forEach(function (d) { var w = csrfBlocks(a, d); if (w) by.push({ d: d, why: w }); });
    return { blocked: by.length > 0, by: by };
  }
  SD.webCore = SD.webCore || {};
  SD.webCore.csrfRun = csrfRun;
  SD.webCore.CSRF_ATTACKS = CSRF_ATTACKS;

  function initCsrf(host) {
    var on = CSRF_PRESETS[2].on.slice();
    var boxes = {};
    var list = h('div', { class: 'wb-flow', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    var defs = h('div', {}, CSRF_DEF.map(function (d) {
      var c = h('input', { type: 'checkbox' });
      boxes[d.id] = c;
      c.addEventListener('change', function () {
        on = CSRF_DEF.map(function (x) { return x.id; }).filter(function (k) { return boxes[k].checked; });
        presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        run();
      });
      return h('label', { class: 'wb-check' }, [c, h('span', { text: d.name })]);
    }));
    var presets = chips('Combinaciones', CSRF_PRESETS, 2, function (i) { on = CSRF_PRESETS[i].on.slice(); run(); });
    function run() {
      CSRF_DEF.forEach(function (d) { boxes[d.id].checked = on.indexOf(d.id) >= 0; });
      list.innerHTML = '';
      var pass = 0;
      CSRF_ATTACKS.forEach(function (a) {
        var r = csrfRun(a, on);
        if (!r.blocked) pass++;
        var names = r.by.map(function (b) { return CSRF_DEF.filter(function (x) { return x.id === b.d; })[0].name + ' (' + b.why + ')'; });
        list.appendChild(card(r.blocked ? 'ok' : 'no', a.name, r.blocked ? 'bloqueado' : 'pasa: ' + a.effect, a.req,
          r.blocked ? 'Lo frena: ' + names.join('; ') + '.' : 'Ninguna capa encendida lo frena.'));
      });
      note.textContent = pass === 0 ? 'Las cinco formas quedan bloqueadas, y casi todas por más de una capa: si una falla, otra responde.'
        : pass + ' de 5 formas siguen pasando. ' + (on.indexOf('token') >= 0 && pass ? 'El token no cubre el login (no hay sesión) ni un GET con efecto.' : 'Sin token ni Origin, todo lo que es mismo sitio pasa.');
    }
    frame(host, 'Cinco formas de CSRF contra las defensas', [presets, h('div', { class: 'wb-grid' }, [h('div', {}, [h('p', { class: 'wb-cap', text: 'Defensas encendidas' }), defs]), list]), note],
      'Modelo de un navegador actual. SameSite=Lax sin la excepción de los dos minutos. En el laboratorio, con todo en localhost, SameSite no frena nada (mismo sitio).');
    run();
  }

  /* ---------------- M77: XSS por contexto ---------------- */
  var XSS_VALUES = [
    { name: 'Etiqueta script', v: '<script>alert(document.domain)</script>' },
    { name: 'Rompe comillas simples', v: "x' autofocus onfocus='alert(document.domain)" },
    { name: 'Esquema javascript:', v: 'javascript:alert(document.domain)' },
    { name: 'Rompe un string de JS', v: "';alert(document.domain);//" },
    { name: 'Cierra el script', v: '</script><script>alert(document.domain)</script>' },
    { name: 'Texto normal', v: 'Práctica en "Banco Norte" & socios' }
  ];
  var XSS_ESC = [
    { v: 'none', name: 'Sin escape (echo $v)' },
    { v: 'compat', name: 'htmlspecialchars en PHP 8.0 (sin flags: ENT_COMPAT)' },
    { v: 'quotes', name: 'htmlspecialchars con ENT_QUOTES | ENT_SUBSTITUTE' },
    { v: 'json', name: 'json_encode con JSON_HEX_TAG | APOS | QUOT | AMP' },
    { v: 'url', name: 'Esquema http o https, y después ENT_QUOTES' }
  ];
  var XSS_CTX = [
    { id: 'body', name: 'Cuerpo HTML', tpl: '<p>{}</p>' },
    { id: 'attr', name: 'Atributo con comillas simples', tpl: "<input value='{}'>" },
    { id: 'href', name: 'URL en un href', tpl: '<a href="{}">CV</a>' },
    { id: 'js', name: 'String dentro de <script>', tpl: "<script>var q = '{}';</script>", tplJson: '<script>var q = {};</script>' },
    { id: 'css', name: 'Valor en un style', tpl: '<p style="color: {}">' }
  ];
  function hsc(s, quotes) {
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return quotes ? s.replace(/'/g, '&#039;') : s;
  }
  function xssEscape(v, e) {
    if (e === 'none') return v;
    if (e === 'compat') return hsc(v, false);
    if (e === 'quotes') return hsc(v, true);
    if (e === 'json') {
      return JSON.stringify(v).replace(/</g, '\\u003C').replace(/>/g, '\\u003E').replace(/'/g, '\\u0027').replace(/&/g, '\\u0026')
        .replace(/\\"/g, '\\u0022');
    }
    if (e === 'url') return hsc(/^(https?:\/\/|\/)/i.test(v.trim()) ? v : '#', true);
    return v;
  }
  function decodeEnt(s) {
    return s.replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  var HANDLER = /\son\w+\s*=/i, TAG = /<\s*(script|img|svg|iframe)\b|<[a-z][^>]*\son\w+\s*=/i;
  function xssJudge(ctx, out, e, v) {
    if (ctx === 'body') {
      if (TAG.test(out)) return { state: 'no', text: 'ejecuta: el parser crea un elemento nuevo' };
      return { state: 'ok', text: decodeEnt(out) === v ? 'texto, y se ve igual que el original' : 'texto, pero no se ve igual (escape del contexto equivocado)' };
    }
    if (ctx === 'attr') {
      if (out.indexOf("'") >= 0) return HANDLER.test(out) ? { state: 'no', text: 'ejecuta: sale del atributo y agrega un manejador' } : { state: 'no', text: 'rompe el atributo: cambia la estructura' };
      return { state: 'ok', text: decodeEnt(out) === v ? 'queda dentro del valor' : 'queda dentro del valor, pero alterado' };
    }
    if (ctx === 'href') {
      if (out.indexOf('"') >= 0) return { state: 'no', text: 'rompe el atributo href' };
      if (/^\s*javascript:/i.test(decodeEnt(out))) return { state: 'no', text: 'ejecuta al hacer clic: el escape HTML no cambia el esquema' };
      return { state: 'ok', text: out === '#' || decodeEnt(out) !== v ? 'enlace inerte: el esquema no está permitido' : 'enlace normal' };
    }
    if (ctx === 'js') {
      if (/<\/script/i.test(out)) return { state: 'no', text: 'ejecuta: el parser HTML cierra el script antes que JavaScript lo lea' };
      if (e !== 'json' && out.indexOf("'") >= 0) return { state: 'no', text: 'ejecuta: sale del string y el resto es código' };
      if (e === 'json') return { state: 'ok', text: 'string de JavaScript válido, con el texto exacto' };
      return { state: 'ok', text: decodeEnt(out) === out ? 'no ejecuta' : 'no ejecuta, pero JavaScript ve &#039; y &quot; literales: texto corrupto' };
    }
    if (ctx === 'css') {
      if (out.indexOf('"') >= 0) return HANDLER.test(out) ? { state: 'no', text: 'ejecuta: sale del style y agrega un manejador' } : { state: 'no', text: 'rompe el atributo style' };
      if (/[;:()]/.test(decodeEnt(out))) return { state: 'info', text: 'no ejecuta JavaScript, pero puede cambiar el estilo o cargar una URL: usa una lista de valores' };
      return { state: 'ok', text: 'un valor de color inofensivo' };
    }
    return { state: 'info', text: '' };
  }
  SD.webCore.xssEscape = xssEscape;
  SD.webCore.xssJudge = xssJudge;

  function initXss(host) {
    var st = { v: 0, e: 'none' };
    var list = h('div', { class: 'wb-flow', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    var sel = h('select', { 'aria-label': 'Escape' });
    XSS_ESC.forEach(function (x) { sel.appendChild(h('option', { value: x.v, text: x.name })); });
    sel.addEventListener('change', function () { st.e = sel.value; run(); });
    function run() {
      var v = XSS_VALUES[st.v].v, bad = 0;
      list.innerHTML = '';
      XSS_CTX.forEach(function (c) {
        var out = xssEscape(v, st.e);
        var tpl = st.e === 'json' && c.tplJson ? c.tplJson : c.tpl;
        var j = xssJudge(c.id, out, st.e, v);
        if (j.state === 'no') bad++;
        list.appendChild(card(j.state, c.name, j.text, tpl.replace('{}', out)));
      });
      note.textContent = bad === 0 ? 'Ningún contexto ejecuta con este valor y este escape. Mira si el texto se ve igual: un escape del contexto equivocado no ejecuta, pero rompe los datos.'
        : bad + ' de 5 contextos ejecutan o se rompen. No hay un escape que sirva para todos: cada contexto tiene el suyo.';
    }
    frame(host, 'Un valor en cinco contextos de salida', [
      chips('Valor que llega del usuario', XSS_VALUES, 0, function (i) { st.v = i; run(); }),
      h('label', { class: 'field' }, [h('span', { text: 'Cómo lo imprime PHP' }), sel]),
      list, note
    ], 'Nada de esto se inserta en la página: el HTML se muestra como texto y el veredicto sale de reglas del parser. Desde PHP 8.1, htmlspecialchars sin flags ya usa ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML401.');
    run();
  }

  /* ---------------- M78: CSP ---------------- */
  var CSP_POL = [
    { id: 'none', name: 'Sin CSP', hdr: '(ninguna cabecera Content-Security-Policy)' },
    { id: 'list', name: 'Lista de dominios', hdr: "Content-Security-Policy: script-src 'self' https://cdn.jsdelivr.net" },
    { id: 'inline', name: "Con 'unsafe-inline'", hdr: "Content-Security-Policy: script-src 'self' 'unsafe-inline'" },
    { id: 'nobase', name: 'Nonce sin base-uri', hdr: "Content-Security-Policy: script-src 'nonce-R4nd0m' 'strict-dynamic'; object-src 'none'" },
    { id: 'strict', name: 'Nonce estricta', hdr: "Content-Security-Policy: script-src 'nonce-R4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'" }
  ];
  var CSP_ITEMS = [
    { name: 'Inyección: <script> inline', bad: true, code: '<script>alert(document.domain)</script>' },
    { name: 'Inyección: manejador de evento', bad: true, code: '<img src=x onerror="alert(document.domain)">' },
    { name: 'Inyección: script de un CDN permitido', bad: true, code: '<script src="https://cdn.jsdelivr.net/npm/(una librería con un gadget)"></script>' },
    { name: 'Inyección: <base> que cambia las URL relativas', bad: true, code: '<base href="https://ofertas-gratis.example/">\n…y después tu propio <script nonce="R4nd0m" src="/js/app.js">' },
    { name: 'Inyección: adivinar el nonce', bad: true, code: '<script nonce="abc123">alert(document.domain)</script>' },
    { name: 'Tuyo: script inline con nonce', bad: false, code: '<script nonce="R4nd0m">iniciarFeed();</script>' },
    { name: 'Tuyo: /js/app.js carga otro script', bad: false, code: "const s = document.createElement('script');\ns.src = '/js/graficos.js'; document.head.append(s);" }
  ];
  // [ejecuta, por qué] por política y por ítem
  var CSP_RES = {
    none: [[1, 'sin política, todo corre'], [1, 'sin política, todo corre'], [1, 'sin política, todo corre'], [1, 'tu app.js se carga desde el sitio atacante'], [1, 'sin política, el nonce no importa'], [1, 'corre'], [1, 'corre']],
    list: [[0, "no hay 'unsafe-inline'"], [0, "los manejadores son inline"], [1, 'el CDN está en la lista: cualquier archivo suyo corre'], [0, 'la URL resuelta no está en la lista (y tu app se rompe)'], [0, "no hay 'unsafe-inline'"], [0, 'se bloquea: esta política no conoce el nonce'], [1, "'self' permite /js/graficos.js"]],
    inline: [[1, "'unsafe-inline' permite todo script inline"], [1, "'unsafe-inline' permite los manejadores"], [0, 'el CDN no está en la lista'], [0, "la URL resuelta no es 'self'"], [1, "'unsafe-inline' no mira nonces"], [1, 'corre'], [1, "'self'"]],
    nobase: [[0, 'no tiene el nonce'], [0, 'los manejadores no llevan nonce'], [0, "con 'strict-dynamic' se ignoran las listas de dominios"], [1, 'tu script con nonce se carga desde el sitio atacante: el nonce viaja con él'], [0, 'el nonce no coincide'], [1, 'tiene el nonce'], [1, "'strict-dynamic' confía en lo que crea un script con nonce"]],
    strict: [[0, 'no tiene el nonce'], [0, 'los manejadores no llevan nonce'], [0, "con 'strict-dynamic' se ignoran las listas de dominios"], [0, "base-uri 'none' ignora el <base> inyectado"], [0, 'el nonce no coincide: es aleatorio por respuesta'], [1, 'tiene el nonce'], [1, "'strict-dynamic' confía en lo que crea un script con nonce"]]
  };
  SD.webCore.CSP_RES = CSP_RES;

  function initCsp(host) {
    var cur = 4;
    var hdr = h('pre', { class: 'wb-http' });
    var list = h('div', { class: 'wb-flow', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note' });
    function run() {
      var p = CSP_POL[cur], res = CSP_RES[p.id], ran = 0, broke = 0;
      hdr.textContent = p.hdr;
      list.innerHTML = '';
      CSP_ITEMS.forEach(function (it, i) {
        var r = res[i], runs = !!r[0];
        if (it.bad && runs) ran++;
        if (!it.bad && !runs) broke++;
        var good = it.bad ? !runs : runs;
        list.appendChild(card(good ? 'ok' : 'no', it.name, (runs ? 'el navegador lo ejecuta: ' : 'bloqueado: ') + r[1], it.code));
      });
      note.textContent = ran + ' de 5 inyecciones se ejecutan' + (broke ? ', y ' + broke + ' de tus propios scripts dejan de funcionar.' : '; tus dos scripts funcionan.') +
        (p.id === 'strict' ? ' Es la política recomendada: nonce por respuesta, strict-dynamic, object-src y base-uri.' : '');
    }
    frame(host, 'Una política de CSP contra cinco inyecciones', [
      chips('Política', CSP_POL, cur, function (i) { cur = i; run(); }), hdr, list, note
    ], "El nonce R4nd0m es un ejemplo: en serio, son 128 bits aleatorios nuevos en cada respuesta. Modelo de un navegador actual con CSP nivel 3; no incluye 'unsafe-eval', Trusted Types ni report-to.");
    run();
  }

  /* ---------------- M80: control de acceso ---------------- */
  var ACL_PEOPLE = [
    { id: 'anon', name: 'Sin sesión', role: null },
    { id: 'ana', name: 'Ana, estudiante 12', role: 'estudiante' },
    { id: 'beto', name: 'Beto, estudiante 15', role: 'estudiante' },
    { id: 'carla', name: 'Carla, reclutadora 31 (dueña de la 7)', role: 'reclutador' },
    { id: 'diego', name: 'Diego, reclutador 40', role: 'reclutador' },
    { id: 'admin', name: 'Administradora', role: 'admin' }
  ];
  var ACL_ACTIONS = [
    { name: 'Ver la postulación 101 (de Ana a la oportunidad 7)', req: 'GET postulaciones.php?id=101', roles: ['estudiante', 'reclutador', 'admin'], owners: ['ana', 'carla', 'admin'],
      today: { auth: false, rol: false, owner: false, sid: false } },
    { name: 'Editar la oportunidad 7', req: 'PUT oportunidades.php  id=7&titulo=…', roles: ['reclutador', 'admin'], owners: ['carla', 'admin'],
      today: { auth: true, rol: true, owner: false, sid: false } },
    { name: 'Cambiar el estado de la postulación 101', req: 'PUT postulaciones.php  accion=estado&id=101&estado=aceptada', roles: ['reclutador', 'admin'], owners: ['carla', 'admin'],
      today: { auth: false, rol: false, owner: false, sid: false } },
    { name: 'Postularse con estudiante_id=12 en el body', req: 'POST postulaciones.php  oportunidad_id=7&estudiante_id=12', roles: ['estudiante'], owners: null, sid: ['ana'],
      today: { auth: false, rol: false, owner: false, sid: false } },
    { name: 'Listar todos los usuarios, con sus correos', req: 'GET usuarios.php', roles: ['admin'], owners: null,
      today: { auth: false, rol: false, owner: false, sid: false } }
  ];
  var ACL_CHECKS = [
    { id: 'auth', name: 'Sesión: requireAuth()' },
    { id: 'rol', name: 'Rol: ¿esta función es para ti?' },
    { id: 'owner', name: 'Dueño: ¿este objeto es tuyo?' },
    { id: 'sid', name: 'El id sale de la sesión, no del body' }
  ];
  function aclExpected(a, p) {
    if (!p.role || a.roles.indexOf(p.role) < 0) return false;
    if (a.owners && a.owners.indexOf(p.id) < 0) return false;
    if (a.sid && a.sid.indexOf(p.id) < 0) return false;
    return true;
  }
  function aclRun(a, p, c) {
    if (c.auth && !p.role) return { ok: false, by: 'no hay sesión: 401' };
    if (c.rol && (!p.role || a.roles.indexOf(p.role) < 0)) return { ok: false, by: 'el rol no tiene esta función: 403' };
    if (c.owner && a.owners && a.owners.indexOf(p.id) < 0) return { ok: false, by: 'no es el dueño: 404' };
    if (c.sid && a.sid && a.sid.indexOf(p.id) < 0) return { ok: true, by: 'se crea, pero a nombre de quien tiene la sesión', self: true };
    return { ok: true, by: 'pasa' };
  }
  SD.webCore.aclRun = aclRun;
  SD.webCore.aclExpected = aclExpected;

  function initAcl(host) {
    var st = { a: 1, c: null };
    var boxes = {};
    var tbody = h('tbody', {});
    var reqEl = h('pre', { class: 'wb-http' });
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });
    var checks = h('div', {}, ACL_CHECKS.map(function (k) {
      var cb = h('input', { type: 'checkbox' });
      boxes[k.id] = cb;
      cb.addEventListener('change', function () {
        st.c = {}; ACL_CHECKS.forEach(function (x) { st.c[x.id] = boxes[x.id].checked; });
        run();
      });
      return h('label', { class: 'wb-check' }, [cb, h('span', { text: k.name })]);
    }));
    var todayBtn = h('button', { type: 'button', class: 'btn', text: 'Volver a lo que hace tu código hoy' });
    todayBtn.addEventListener('click', function () { st.c = null; run(); });
    function run() {
      var a = ACL_ACTIONS[st.a], c = st.c || a.today, leaks = 0, over = 0;
      ACL_CHECKS.forEach(function (k) { boxes[k.id].checked = !!c[k.id]; });
      reqEl.textContent = a.req;
      tbody.innerHTML = '';
      ACL_PEOPLE.forEach(function (p) {
        var exp = aclExpected(a, p), r = aclRun(a, p, c);
        var real = r.ok && !r.self;
        var good = real === exp;
        if (real && !exp) leaks++;
        if (!real && exp) over++;
        var verdict = good ? '✓ correcto' : real ? '✕ acceso indebido' : '✕ bloquea de más';
        tbody.appendChild(h('tr', {}, [
          h('td', { text: p.name }), h('td', { text: exp ? 'sí' : 'no' }), h('td', { text: r.by }),
          h('td', { class: good ? 'wb-good' : 'wb-bad', text: verdict })]));
      });
      note.textContent = (st.c ? 'Con estos chequeos: ' : 'Lo que hace tu código hoy (leído del repositorio): ') +
        (leaks ? leaks + ' acceso' + (leaks > 1 ? 's' : '') + ' indebido' + (leaks > 1 ? 's' : '') + '. ' : 'ningún acceso indebido. ') +
        (over ? over + ' persona' + (over > 1 ? 's' : '') + ' bloqueada' + (over > 1 ? 's' : '') + ' sin razón.' : '');
    }
    frame(host, 'Quién puede hacer qué en el sistema de prácticas', [
      chips('Acción', ACL_ACTIONS, 1, function (i) { st.a = i; st.c = null; run(); }), reqEl,
      h('div', { class: 'wb-grid wb-grid--stack' }, [
        h('div', {}, [h('p', { class: 'wb-cap', text: 'Chequeos en el endpoint' }), checks, todayBtn]),
        h('div', { class: 'table-wrap' }, [h('table', { class: 't' }, [h('thead', {}, [h('tr', {}, ['Quién', '¿Debería?', 'Qué pasa', 'Veredicto'].map(function (x) { return h('th', { text: x }); }))]), tbody])])
      ]), note
    ], 'Lo de hoy sale de leer endpoints/*.php el 2026-10-31: postulaciones.php y usuarios.php no llaman a requireAuth; oportunidades.php comprueba sesión y rol, pero no el dueño. El 404 en lugar del 403 evita confirmar que el objeto existe.');
    run();
  }

  /* ---------------- M85: la memoria lineal de un módulo Wasm ----------------
     Un modelo de 64 bytes, a escala, de la memoria de un módulo.
     No ejecuta Wasm: simula byte a byte lo que haría un strcpy compilado a Wasm. */
  var WM_SIZE = 64;
  var WM_LAYOUTS = [
    { name: 'El buffer, y después es_admin', regions: [
      { id: 'buf', from: 0, to: 16, label: 'nombre[16]' },
      { id: 'adm', from: 16, to: 20, label: 'es_admin (i32)' },
      { id: 'cnt', from: 20, to: 24, label: 'intentos (i32)', init: [3, 0, 0, 0] }] },
    { name: 'El buffer al final de la memoria', regions: [
      { id: 'adm', from: 40, to: 44, label: 'es_admin (i32)' },
      { id: 'cnt', from: 44, to: 48, label: 'intentos (i32)', init: [3, 0, 0, 0] },
      { id: 'buf', from: 48, to: 64, label: 'nombre[16]' }] }
  ];
  var WM_COPY = [{ name: 'strcpy: copia hasta el final del texto' }, { name: 'Con límite: 15 bytes y el 0 final' }];
  function wmRun(layout, mode, text) {
    var mem = [], owner = [], i;
    for (i = 0; i < WM_SIZE; i++) { mem.push(0); owner.push('free'); }
    layout.regions.forEach(function (rg) {
      for (var k = rg.from; k < rg.to; k++) { owner[k] = rg.id; if (rg.init) mem[k] = rg.init[k - rg.from]; }
    });
    var buf = layout.regions.filter(function (x) { return x.id === 'buf'; })[0];
    var bytes = [];
    for (i = 0; i < text.length; i++) { var c = text.charCodeAt(i); bytes.push(c < 128 ? c : 63); }
    if (mode === 1) bytes = bytes.slice(0, buf.to - buf.from - 1);
    bytes.push(0);
    var touched = {}, outside = 0, trap = false, written = 0;
    for (i = 0; i < bytes.length; i++) {
      var at = buf.from + i;
      if (at >= WM_SIZE) { trap = true; break; }
      mem[at] = bytes[i]; touched[at] = true; written++;
      if (at >= buf.to) outside++;
    }
    var a = layout.regions.filter(function (x) { return x.id === 'adm'; })[0].from;
    var admin = mem[a] + mem[a + 1] * 256 + mem[a + 2] * 65536 + mem[a + 3] * 16777216;
    return { mem: mem, owner: owner, touched: touched, outside: outside, trap: trap, written: written, admin: admin, total: bytes.length };
  }
  SD.webCore.wmRun = wmRun;

  function initWasm(host) {
    var st = { l: 0, m: 0 };
    var input = h('input', { class: 'wb-input', type: 'text', value: 'Ana', maxlength: '40', 'aria-label': 'Nombre que llega del usuario' });
    var grid = h('div', { class: 'wm-grid', role: 'img' });
    var legend = h('div', { class: 'wm-legend' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });
    var outsideBox = h('p', { class: 'wm-host' });
    var presets = [
      { name: 'Un nombre corto', t: 'Ana' },
      { name: 'Un nombre de 17 letras', t: 'Ana Maria Lopez R' },
      { name: 'Un nombre de 24 letras', t: 'AAAAAAAAAAAAAAAAAAAAAAAA' }
    ];
    function stat(label, val) { return h('div', { class: 'sim-stat' }, [h('span', { class: 'sim-stat-label', text: label }), h('b', { text: val })]); }
    function run() {
      var L = WM_LAYOUTS[st.l], r = wmRun(L, st.m, input.value);
      grid.innerHTML = '';
      for (var i = 0; i < WM_SIZE; i++) {
        var v = r.mem[i], ch = v >= 32 && v < 127 ? String.fromCharCode(v) : '·';
        var cls = 'wm-cell wm-' + r.owner[i] + (r.touched[i] ? ' is-w' : '') + (r.touched[i] && r.owner[i] !== 'buf' ? ' is-bad' : '');
        grid.appendChild(h('span', { class: cls, title: 'byte ' + i + ' = ' + v }, [h('small', { text: String(i) }), h('b', { text: ch }), h('i', { text: (v < 16 ? '0' : '') + v.toString(16) })]));
      }
      grid.setAttribute('aria-label', 'Memoria de 64 bytes; ' + r.written + ' bytes escritos, ' + r.outside + ' fuera del buffer' + (r.trap ? ', y un trap al llegar al byte 64' : ''));
      legend.innerHTML = '';
      L.regions.forEach(function (rg) { legend.appendChild(h('span', { class: 'wm-key wm-' + rg.id, text: rg.label + ' · bytes ' + rg.from + '–' + (rg.to - 1) })); });
      legend.appendChild(h('span', { class: 'wm-key is-bad', text: 'escrito fuera del buffer' }));
      stats.innerHTML = '';
      stats.appendChild(stat('Bytes a copiar', String(r.total)));
      stats.appendChild(stat('Fuera del buffer', String(r.outside)));
      stats.appendChild(stat('es_admin', String(r.admin)));
      stats.appendChild(stat('Resultado', r.trap ? 'trap' : r.outside ? 'variable pisada' : 'correcto'));
      outsideBox.textContent = 'Fuera de la memoria lineal (el DOM, las cookies, la memoria del motor, otras pestañas): intacto' + (r.trap ? '. El trap detuvo el módulo al intentar escribir el byte 64.' : '.');
      if (r.trap) note.textContent = '✕ Trap: la escritura llegó al final de la memoria y el motor la detuvo con "RuntimeError: memory access out of bounds". Lo que ya había escrito dentro de la memoria queda escrito. El sandbox protege a la página, no al módulo.';
      else if (r.outside) note.textContent = '✕ El texto pisó ' + r.outside + ' byte' + (r.outside > 1 ? 's' : '') + ' que no eran del buffer: es_admin vale ' + r.admin + ', distinto de 0, así que el programa cree que es administrador. Wasm no lo impide: es memoria del mismo módulo.';
      else note.textContent = '✓ El texto cabe en el buffer' + (st.m === 1 && input.value.length > 15 ? ', recortado a 15 letras y el 0 final' : '') + '. es_admin sigue en 0.';
    }
    input.addEventListener('input', run);
    var pre = chips('Nombre', presets, 0, function (i) { input.value = presets[i].t; run(); });
    frame(host, 'La memoria lineal de un módulo Wasm', [
      pre, h('label', { class: 'field' }, [h('span', { text: 'Nombre que llega del usuario (ASCII)' }), input]),
      chips('Copia', WM_COPY, 0, function (i) { st.m = i; run(); }),
      chips('Distribución', WM_LAYOUTS, 0, function (i) { st.l = i; run(); }),
      h('div', { class: 'sim-scroll' }, [grid]), legend, stats, outsideBox, note
    ], 'Modelo a escala: la memoria real de un módulo mide al menos una página de 64 KiB y la distribución la decide el compilador. El widget simula un strcpy compilado a Wasm, byte a byte; no ejecuta Wasm. Las letras fuera de ASCII se copian como "?".');
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="csrf"]').forEach(initCsrf);
    document.querySelectorAll('[data-sim="xssctx"]').forEach(initXss);
    document.querySelectorAll('[data-sim="csp"]').forEach(initCsp);
    document.querySelectorAll('[data-sim="acl"]').forEach(initAcl);
    document.querySelectorAll('[data-sim="wasmmem"]').forEach(initWasm);
  });
})();
