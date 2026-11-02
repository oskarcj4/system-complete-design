/* Widgets de M48 (grafos y recomendación de amigos).
   <div data-sim="ppr">        un grafo de 15 personas: PageRank personalizado desde Ana (cálculo exacto por iteración
                               y una caminata aleatoria con semilla), contra vecinos comunes y Adamic-Adar.
   <div data-calc="fof">       la explosión del segundo salto: amigos, amigos de cada amigo, cuentas grandes y un tope
                               por amigo; aristas leídas, bytes y tiempo con un costo por arista que se dice como supuesto.
   <div data-calc="graphshard"> partir un grafo: personas, grado, particiones y estrategia (hash o por comunidad);
                               particiones que toca una consulta de amigos de amigos y aristas cortadas.
   Lógica pura en SD.graphCore. */
(function () {
  'use strict';
  var SD = window.SD;

  /* ---------- Grafo de juguete (el de la Figura 48.5) ---------- */
  var NAMES = ['Ana', 'Carla', 'Diego', 'Eva', 'Luis', 'Marta', 'Nico', 'Olga', 'Pablo', 'Rosa', 'Saúl', 'Tere', 'Uma', 'Vera', 'Walter'];
  var EDGES = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [4, 5], [2, 4], [2, 6], [2, 7], [2, 8], [2, 9], [2, 10], [6, 7], [8, 9],
    [3, 11], [3, 12], [11, 12], [11, 13], [13, 14], [12, 13], [5, 3]];
  var POS = [[380, 200], [250, 120], [520, 140], [270, 290], [390, 50], [110, 110], [650, 50], [710, 130], [700, 220], [620, 290],
    [520, 300], [150, 350], [380, 360], [260, 410], [80, 410]];

  function adjacency(n, edges) {
    var adj = [];
    for (var i = 0; i < n; i++) adj.push([]);
    edges.forEach(function (e) { adj[e[0]].push(e[1]); adj[e[1]].push(e[0]); });
    return adj;
  }
  var ADJ = adjacency(NAMES.length, EDGES);

  /* PageRank personalizado por iteración: x = α·e_s + (1 − α)·x·P */
  function ppr(adj, s, alpha, iters) {
    var n = adj.length, x = [], i;
    for (i = 0; i < n; i++) x.push(i === s ? 1 : 0);
    for (var t = 0; t < (iters || 200); t++) {
      var y = [];
      for (i = 0; i < n; i++) y.push(0);
      y[s] += alpha;
      for (var u = 0; u < n; u++) {
        var d = adj[u].length;
        for (var k = 0; k < d; k++) y[adj[u][k]] += (1 - alpha) * x[u] / d;
      }
      x = y;
    }
    return x;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* Caminata con reinicio: cuenta visitas (sin contar la casa) */
  function walk(adj, s, alpha, steps, seed) {
    var r = rng(seed || 48), cur = s, visits = [];
    for (var i = 0; i < adj.length; i++) visits.push(0);
    for (var t = 0; t < steps; t++) {
      if (r() < alpha) cur = s;
      else cur = adj[cur][Math.floor(r() * adj[cur].length)];
      visits[cur]++;
    }
    return visits;
  }

  function common(adj, a, b) {
    return adj[a].filter(function (x) { return adj[b].indexOf(x) >= 0; });
  }
  function adamicAdar(adj, a, b) {
    return common(adj, a, b).reduce(function (s, c) { return s + 1 / Math.log(adj[c].length); }, 0);
  }
  function jaccard(adj, a, b) {
    var c = common(adj, a, b).length;
    return c / (adj[a].length + adj[b].length - c);
  }

  /* Explosión del segundo salto */
  function fof(o) {
    var normal = Math.max(0, o.amigos - o.grandes);
    var porNormal = Math.min(o.grado, o.tope || Infinity);
    var porGrande = Math.min(o.gradoGrande, o.tope || Infinity);
    var aristas = normal * porNormal + o.grandes * porGrande;
    var sinTope = normal * o.grado + o.grandes * o.gradoGrande;
    return {
      aristas: aristas, sinTope: sinTope, lecturas: o.amigos,
      bytes: aristas * 8, ms: aristas * o.nsArista / 1e6,
      parteGrandes: aristas ? o.grandes * porGrande / aristas : 0
    };
  }

  /* Particiones que toca una consulta de amigos de amigos */
  function distinct(P, draws) {           // particiones distintas esperadas al tirar `draws` veces al azar entre P
    if (P <= 1) return 1;
    return P * (1 - Math.pow(1 - 1 / P, draws));
  }
  function shard(o) {
    var local = o.estrategia === 'hash' ? 1 / o.P : o.local;
    var remotos = o.grado * (1 - local);
    var pasos1 = o.estrategia === 'hash' ? distinct(o.P, o.grado) : 1 + distinct(o.P - 1, remotos) * (o.P > 1 ? 1 : 0);
    var aristas = o.N * o.grado;           // cada amistad guardada en las dos direcciones
    return {
      local: local, cortadas: 1 - local, particiones: Math.min(o.P, pasos1),
      remotos: remotos, aristas: aristas, bytes: aristas * o.bytesArista,
      porParticion: aristas * o.bytesArista / o.P
    };
  }

  SD.graphCore = { NAMES: NAMES, EDGES: EDGES, POS: POS, ADJ: ADJ, adjacency: adjacency, ppr: ppr, walk: walk,
    common: common, adamicAdar: adamicAdar, jaccard: jaccard, fof: fof, shard: shard, distinct: distinct };

  if (!SD.h) return;
  var h = SD.h, F = SD.fmt;
  function pct(x, d) { return F.num(x * 100, d === undefined ? 1 : d) + ' %'; }
  function stat(label, value) {
    return h('div', { class: 'sim-stat' }, [h('span', { class: 'sim-stat-label', text: label }), h('b', { class: 'sim-stat-value', text: value })]);
  }
  function chips(list, cur, onPick, label) {
    var wrap = h('div', { class: 'calc-presets', role: 'group', 'aria-label': label });
    list.forEach(function (it) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': String(it[0] === cur), text: it[1] });
      b.addEventListener('click', function () {
        wrap.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); onPick(it[0]);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function numField(label, val, min, max, step, on) {
    var inp = h('input', { type: 'number', value: String(val), min: String(min), max: String(max), step: String(step), inputmode: 'numeric' });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); if (!isNaN(v)) on(Math.max(min, Math.min(max, v))); });
    return { el: h('label', { class: 'field' }, [h('span', { text: label }), inp]), inp: inp };
  }

  /* ---------- PPR ---------- */
  function initPPR(root) {
    var st = { alpha: 0.15, mode: 'ppr', steps: 0, seed: 48 };
    var svgWrap = h('div', { class: 'sim-scroll gr-plot' }), list = h('ol', { class: 'gr-list' }),
      stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var out = h('div', { 'aria-live': 'polite' }, [stats, list, note]);
    var walkBtn = h('button', { type: 'button', class: 'btn', text: 'Caminar 10 000 pasos' });
    var resetBtn = h('button', { type: 'button', class: 'btn', text: 'Volver al cálculo exacto' });
    walkBtn.addEventListener('click', function () { st.steps = 10000; st.seed++; render(); });
    resetBtn.addEventListener('click', function () { st.steps = 0; render(); });
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'A quién recomendarle a Ana' })]));
    root.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [
        chips([['ppr', 'PageRank personalizado'], ['cn', 'Vecinos comunes'], ['aa', 'Adamic-Adar']], st.mode, function (m) { st.mode = m; render(); }, 'Cómo se puntúa'),
        chips([[0.15, 'α = 0.15'], [0.3, 'α = 0.3'], [0.5, 'α = 0.5']], st.alpha, function (a) { st.alpha = a; render(); }, 'Probabilidad de volver a casa'),
        h('div', { class: 'calc-presets' }, [walkBtn, resetBtn])
      ]), svgWrap, out]));

    function render() {
      var x = ppr(ADJ, 0, st.alpha), vis = st.steps ? walk(ADJ, 0, st.alpha, st.steps, st.seed) : null;
      var friends = ADJ[0], cand = [];
      for (var i = 1; i < NAMES.length; i++) if (friends.indexOf(i) < 0) cand.push(i);
      function score(i) {
        if (st.mode === 'cn') return common(ADJ, 0, i).length;
        if (st.mode === 'aa') return adamicAdar(ADJ, 0, i);
        return vis ? vis[i] / st.steps : x[i];
      }
      cand.sort(function (a, b) { return score(b) - score(a) || a - b; });
      var maxS = Math.max.apply(null, cand.map(score)) || 1;
      /* dibujo */
      var s = '<svg viewBox="0 0 770 456" role="img" aria-label="Grafo de 15 personas. Ana está al centro con tres amigas y amigos: Carla, Diego y Eva. El tamaño de cada círculo es su puntaje para Ana según el criterio elegido.">';
      EDGES.forEach(function (e) {
        var a = POS[e[0]], b = POS[e[1]], mine = e[0] === 0 || e[1] === 0;
        s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" class="' + (mine ? 'gr-edge gr-edge--mine' : 'gr-edge') + '"/>';
      });
      NAMES.forEach(function (nm, i) {
        var p = POS[i], cls = i === 0 ? 'gr-node gr-node--home' : friends.indexOf(i) >= 0 ? 'gr-node gr-node--friend' : 'gr-node';
        var r = 16;
        if (i !== 0 && friends.indexOf(i) < 0) r = 9 + 17 * Math.sqrt(score(i) / maxS);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r.toFixed(1) + '" class="' + cls + '"/>';
        s += '<text class="sim-label" x="' + p[0] + '" y="' + (p[1] + r + 14).toFixed(1) + '" text-anchor="middle">' + nm + ' (' + ADJ[i].length + ')</text>';
      });
      s += '</svg>';
      svgWrap.innerHTML = s;
      /* lista */
      list.innerHTML = '';
      cand.slice(0, 6).forEach(function (i) {
        var c = common(ADJ, 0, i).map(function (k) { return NAMES[k]; });
        var val = st.mode === 'cn' ? F.num(score(i)) : F.num(score(i), 3);
        list.appendChild(h('li', {}, [h('b', { text: NAMES[i] }), document.createTextNode(' · ' + val + ' · ' + (c.length ? 'en común: ' + c.join(' y ') : 'ningún amigo en común'))]));
      });
      stats.innerHTML = '';
      stats.appendChild(stat('Criterio', st.mode === 'ppr' ? (vis ? 'Caminata de ' + F.num(st.steps) + ' pasos' : 'PPR exacto') : st.mode === 'cn' ? 'Vecinos comunes' : 'Adamic-Adar'));
      stats.appendChild(stat('Primera recomendación', NAMES[cand[0]]));
      stats.appendChild(stat('Vera (a 3 saltos)', st.mode === 'ppr' ? F.num(vis ? vis[13] / st.steps : x[13], 3) : '0: no la ve'));
      if (st.mode === 'ppr') {
        note.textContent = 'La caminata sale de Ana, salta a un vecino al azar y en cada paso vuelve a casa con probabilidad α. El puntaje es la fracción del tiempo que pasa en cada persona. Con α = 0.15, Vera, que no tiene ningún amigo en común con Ana, queda por encima de los amigos de Diego: Diego tiene 7 amigos y reparte su paso entre todos. Con α = 0.5 la caminata casi no se aleja y Vera cae.' + (vis ? ' La caminata con semilla se acerca al cálculo exacto; con menos pasos, los puntajes chicos se mueven.' : '');
      } else if (st.mode === 'cn') {
        note.textContent = 'Vecinos comunes cuenta amigos compartidos: Marta y Luis tienen 2, y nueve personas empatan con 1. No distingue un amigo en común muy sociable (Diego, 7 amigos) de uno con pocos, y no ve a nadie más allá de dos saltos.';
      } else {
        note.textContent = 'Adamic-Adar suma 1 / ln(grado) por cada amigo en común: Carla (3 amigos) aporta 0.910 y Diego (7), 0.514. Marta gana a Luis (1.632 contra 1.424) porque su segundo amigo en común con Ana es Eva (4 amigos, 0.721) y el de Luis es Diego.';
      }
    }
    render();
  }

  /* ---------- Explosión del segundo salto ---------- */
  var FOF_PRESETS = {
    tipica: { label: 'Persona típica', amigos: 200, grado: 200, grandes: 0, gradoGrande: 1000000, tope: 0 },
    grandes: { label: 'Sigue a 2 cuentas grandes', amigos: 200, grado: 200, grandes: 2, gradoGrande: 1000000, tope: 0 },
    topada: { label: 'Las mismas, con tope de 1 000', amigos: 200, grado: 200, grandes: 2, gradoGrande: 1000000, tope: 1000 },
    hub: { label: 'Nodo con 5 000 amigos de 5 000', amigos: 5000, grado: 5000, grandes: 0, gradoGrande: 1000000, tope: 0 }
  };
  function initFOF(root) {
    var st = Object.assign({ nsArista: 50 }, FOF_PRESETS.tipica);
    var fields = {}, stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' }), bar = h('div', { class: 'sim-scroll gr-plot' });
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Amigos de amigos: cuántas aristas lee una consulta' })]));
    var presets = chips(Object.keys(FOF_PRESETS).map(function (k) { return [k, FOF_PRESETS[k].label]; }), 'tipica', function (k) {
      Object.assign(st, FOF_PRESETS[k]);
      Object.keys(fields).forEach(function (f) { fields[f].inp.value = String(st[f]); });
      render();
    }, 'Casos');
    [['amigos', 'Amigos de la persona', 1, 5000, 1], ['grado', 'Amigos de cada amigo (típico)', 1, 5000, 1],
      ['grandes', 'Amigos que son cuentas grandes', 0, 50, 1], ['gradoGrande', 'Seguidores de cada cuenta grande', 1000, 100000000, 1000],
      ['tope', 'Tope de aristas por amigo (0 = sin tope)', 0, 100000, 100], ['nsArista', 'Nanosegundos por arista (supuesto)', 1, 10000, 1]].forEach(function (f) {
      fields[f[0]] = numField(f[1], st[f[0]], f[2], f[3], f[4], function (v) { st[f[0]] = v; render(); });
    });
    root.appendChild(h('div', { class: 'sim-body' }, [presets,
      h('div', { class: 'sim-controls' }, Object.keys(fields).map(function (k) { return fields[k].el; })),
      h('div', { 'aria-live': 'polite' }, [stats, bar, note])]));
    function render() {
      var r = fof(st);
      stats.innerHTML = '';
      stats.appendChild(stat('Aristas leídas', F.num(r.aristas)));
      stats.appendChild(stat('Sin tope serían', F.num(r.sinTope)));
      stats.appendChild(stat('Bytes de ids (8 por arista)', F.bytes(r.bytes)));
      stats.appendChild(stat('Tiempo de lectura', F.num(r.ms, r.ms < 10 ? 2 : 0) + ' ms'));
      var w = 600, ratio = r.parteGrandes;
      bar.innerHTML = '<svg viewBox="0 0 620 64" role="img" aria-label="Qué parte de las aristas leídas viene de las cuentas grandes">' +
        '<rect x="10" y="12" width="' + (w * (1 - ratio)).toFixed(1) + '" height="26" rx="4" class="gr-bar"/>' +
        '<rect x="' + (10 + w * (1 - ratio)).toFixed(1) + '" y="12" width="' + (w * ratio).toFixed(1) + '" height="26" rx="4" class="gr-bar gr-bar--hot"/>' +
        '<text class="sim-label" x="10" y="56">amigos típicos: ' + pct(1 - ratio, 0) + '</text>' +
        '<text class="sim-label" x="610" y="56" text-anchor="end">cuentas grandes: ' + pct(ratio, 0) + '</text></svg>';
      var msg = 'Cada amigo es una lectura de su lista de adyacencia: ' + F.num(r.lecturas) + ' lecturas. ';
      if (st.grandes && !st.tope) msg += 'Dos cuentas grandes alcanzan para que casi toda la consulta sea leer sus seguidores, que además no sirven como candidatos: nadie conoce a un millón de personas. ';
      else if (st.grandes && st.tope) msg += 'Con el tope, de cada cuenta grande se leen como mucho ' + F.num(st.tope) + ' aristas (una muestra o las más recientes): la consulta vuelve a ser la de una persona típica. ';
      if (r.ms > 200) msg += 'Más de 200 ms solo en leer: no cabe en una request en línea. Se precalcula por lotes o se corta antes.';
      else msg += 'El costo por arista es un supuesto para leer ids en memoria; leerlos de un servicio por red cuesta mucho más.';
      note.textContent = msg;
    }
    render();
  }

  /* ---------- Partir el grafo ---------- */
  function initShard(root) {
    var st = { N: 20000000, grado: 200, P: 64, estrategia: 'hash', local: 0.75, bytesArista: 16 };
    var fields = {}, stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' }), plot = h('div', { class: 'sim-scroll gr-plot' });
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Partir un grafo social' })]));
    var strat = chips([['hash', 'Hash por persona'], ['comunidad', 'Por comunidad']], 'hash', function (k) { st.estrategia = k; render(); }, 'Estrategia');
    [['N', 'Personas', 1000, 3000000000, 1000], ['grado', 'Amigos promedio', 1, 5000, 1], ['P', 'Particiones', 1, 4096, 1],
      ['local', 'Aristas locales por comunidad (supuesto, 0 a 1)', 0, 1, 0.05], ['bytesArista', 'Bytes por arista guardada', 8, 256, 1]].forEach(function (f) {
      fields[f[0]] = numField(f[1], st[f[0]], f[2], f[3], f[4], function (v) { st[f[0]] = f[0] === 'P' ? Math.round(v) : v; render(); });
    });
    root.appendChild(h('div', { class: 'sim-body' }, [strat,
      h('div', { class: 'sim-controls' }, Object.keys(fields).map(function (k) { return fields[k].el; })),
      h('div', { 'aria-live': 'polite' }, [stats, plot, note])]));
    function render() {
      var r = shard(st);
      stats.innerHTML = '';
      stats.appendChild(stat('Aristas cortadas', pct(r.cortadas)));
      stats.appendChild(stat('Particiones que toca "amigos de Ana"', F.num(r.particiones, 1) + ' de ' + F.num(st.P)));
      stats.appendChild(stat('Grafo guardado (dos direcciones)', F.bytes(r.bytes)));
      stats.appendChild(stat('Por partición', F.bytes(r.porParticion)));
      var cells = '', n = Math.min(st.P, 64), cols = 16, touched = Math.round(r.particiones / st.P * n);
      for (var i = 0; i < n; i++) {
        var x = 10 + (i % cols) * 37, y = 8 + Math.floor(i / cols) * 30;
        cells += '<rect x="' + x + '" y="' + y + '" width="31" height="24" rx="4" class="' + (i < touched ? 'gr-cell gr-cell--hit' : 'gr-cell') + '"/>';
      }
      var rows = Math.ceil(n / cols);
      plot.innerHTML = '<svg viewBox="0 0 610 ' + (rows * 30 + 30) + '" role="img" aria-label="Particiones que toca la consulta de amigos de una persona">' + cells +
        '<text class="sim-label" x="10" y="' + (rows * 30 + 22) + '">' + (st.P > 64 ? 'Se dibujan 64 de ' + F.num(st.P) + ' particiones, en proporción. ' : '') + 'Marcadas: las que hay que consultar.</text></svg>';
      if (st.estrategia === 'hash') {
        note.textContent = 'Con hash, cada amigo cae en una partición al azar: con ' + F.num(st.grado) + ' amigos y ' + F.num(st.P) + ' particiones, la consulta toca casi todas. Solo 1 de cada ' + F.num(st.P) + ' aristas queda dentro de una partición. Es simple y reparte parejo, y por eso es lo que más se usa con un caché delante (TAO).';
      } else {
        note.textContent = 'Por comunidad, los amigos tienden a vivir juntos: con ' + pct(st.local, 0) + ' de aristas locales, quedan unos ' + F.num(r.remotos, 0) + ' amigos remotos y la consulta toca menos particiones. La fracción local es un supuesto: depende del grafo y del algoritmo de partición, y se degrada a medida que la gente agrega amigos nuevos.';
      }
    }
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="ppr"]').forEach(initPPR);
    document.querySelectorAll('[data-calc="fof"]').forEach(initFOF);
    document.querySelectorAll('[data-calc="graphshard"]').forEach(initShard);
  });
})();
