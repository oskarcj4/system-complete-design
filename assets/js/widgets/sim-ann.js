/* Widgets de búsqueda de vecinos aproximados (M45):
   <div data-sim="hnsw">     un HNSW de juguete con 60 puntos en el plano y tres pisos: la búsqueda golosa piso por piso,
                             paso a paso, con efSearch y M elegibles; cuenta las distancias calculadas y compara con el
                             vecino exacto
   <div data-calc="annsize">  cuánto ocupa un índice de N vectores de d dimensiones (plano, HNSW, IVF y IVF-PQ) y cuánto
                             lee cada consulta
   La lógica pura está en SD.annCore, sin DOM, para probarla en Node. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ======================= Lógica pura ======================= */

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var N_PTS = 60, SEED = 11;

  /* Puntos en [0.03, 0.97]² y el piso más alto de cada uno: P(piso ≥ 1) = 1/4, P(piso ≥ 2) = 1/16, tope en 2. */
  function makePoints(seed) {
    var r = rng(seed), pts = [];
    for (var i = 0; i < N_PTS; i++) {
      var lvl = 0;
      while (lvl < 2 && r() < 0.25) lvl++;
      pts.push({ x: 0.03 + 0.94 * r(), y: 0.03 + 0.94 * r(), lvl: lvl });
    }
    /* Que el piso 2 tenga al menos dos puntos y el piso 1 al menos seis, para que el dibujo tenga sentido. */
    var top = pts.filter(function (p) { return p.lvl === 2; }).length;
    for (var j = 0; top < 2 && j < N_PTS; j++) if (pts[j].lvl === 1) { pts[j].lvl = 2; top++; }
    var mid = pts.filter(function (p) { return p.lvl >= 1; }).length;
    for (var k = N_PTS - 1; mid < 6 && k >= 0; k--) if (pts[k].lvl === 0) { pts[k].lvl = 1; mid++; }
    return pts;
  }

  function d2(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

  /* En cada piso, cada punto se une con sus m vecinos más cercanos de ese piso (2m en el piso 0), sin dirección. */
  function buildGraph(pts, m) {
    var layers = [];
    for (var L = 0; L <= 2; L++) {
      var ids = [], adj = {};
      pts.forEach(function (p, i) { if (p.lvl >= L) { ids.push(i); adj[i] = {}; } });
      var k = L === 0 ? 2 * m : m;
      ids.forEach(function (i) {
        ids.filter(function (j) { return j !== i; })
          .sort(function (a, b) { return d2(pts[i], pts[a]) - d2(pts[i], pts[b]); })
          .slice(0, k).forEach(function (j) { adj[i][j] = 1; adj[j][i] = 1; });
      });
      var out = {};
      ids.forEach(function (i) { out[i] = Object.keys(adj[i]).map(Number); });
      layers.push({ ids: ids, adj: out });
    }
    var entry = layers[2].ids[0];
    return { layers: layers, entry: entry };
  }

  /* Estado de una búsqueda. En los pisos 2 y 1, golosa con un solo candidato; en el piso 0, con ef candidatos. */
  function searchStart(pts, G, q, ef) {
    var S = { q: q, ef: ef, layer: 2, cur: G.entry, dist: {}, path: [G.entry], visited: {}, done: false, cand: null, res: null, log: [] };
    S.dist[G.entry] = d2(pts[G.entry], q);
    S.visited[G.entry] = 1;
    S.log.push('Entra por el punto de arriba, en el piso 2.');
    return S;
  }

  function measure(S, pts, i) { if (!(i in S.dist)) S.dist[i] = d2(pts[i], S.q); return S.dist[i]; }

  function searchStep(S, pts, G) {
    if (S.done) return S;
    if (S.layer > 0) {
      var best = S.cur, bd = S.dist[S.cur];
      G.layers[S.layer].adj[S.cur].forEach(function (j) { var d = measure(S, pts, j); S.visited[j] = 1; if (d < bd) { bd = d; best = j; } });
      if (best !== S.cur) {
        S.cur = best; S.path.push(best);
        S.log.push('Piso ' + S.layer + ': mira los vecinos y se mueve al más cercano a la consulta.');
      } else {
        S.layer--;
        S.log.push('Ningún vecino está más cerca: baja al piso ' + S.layer + ' desde el mismo punto.');
        if (S.layer === 0) { S.cand = [S.cur]; S.res = [S.cur]; S.expanded = {}; }
      }
      return S;
    }
    /* Piso 0: expande el candidato más cercano que no se expandió; corta cuando ese candidato está más lejos que
       el peor de los ef resultados. */
    S.cand.sort(function (a, b) { return S.dist[a] - S.dist[b]; });
    var c = null;
    while (S.cand.length) { var x = S.cand.shift(); if (!S.expanded[x]) { c = x; break; } }
    S.res.sort(function (a, b) { return S.dist[a] - S.dist[b]; });
    var worst = S.res[S.res.length - 1];
    if (c === null || (S.res.length >= S.ef && S.dist[c] > S.dist[worst])) {
      S.done = true;
      S.log.push('El candidato más cercano que queda está más lejos que los ' + S.ef + ' resultados: la búsqueda termina.');
      return S;
    }
    S.expanded[c] = 1; S.cur = c; if (S.path[S.path.length - 1] !== c) S.path.push(c);
    var added = 0;
    G.layers[0].adj[c].forEach(function (j) {
      if (S.visited[j]) return;
      S.visited[j] = 1;
      var d = measure(S, pts, j);
      S.res.sort(function (a, b) { return S.dist[a] - S.dist[b]; });
      if (S.res.length < S.ef || d < S.dist[S.res[S.res.length - 1]]) {
        S.cand.push(j); S.res.push(j); added++;
        S.res.sort(function (a, b) { return S.dist[a] - S.dist[b]; });
        if (S.res.length > S.ef) S.res.pop();
      }
    });
    S.log.push('Piso 0: expande un candidato; ' + added + (added === 1 ? ' vecino entra' : ' vecinos entran') + ' a la lista de ' + S.ef + '.');
    return S;
  }

  function searchAll(S, pts, G) { var n = 0; while (!S.done && n++ < 500) searchStep(S, pts, G); return S; }

  function exactRank(pts, q, i) {
    var di = d2(pts[i], q), r = 1;
    pts.forEach(function (p, j) { if (j !== i && d2(p, q) < di) r++; });
    return r;
  }

  function bestOf(S) {
    if (S.layer > 0 || !S.res) return S.cur;
    return S.res.slice().sort(function (a, b) { return S.dist[a] - S.dist[b]; })[0];
  }

  /* Tamaños de índice, en bytes. FAISS: plano 4d; HNSW 4d + 8M; IVF-Flat 4d + 8 (el id); IVF-PQ m + 8. */
  function annSize(v) {
    var N = v.n * 1e6, d = v.d, M = v.m, nl = Math.max(1, v.nlist), np = Math.min(Math.max(1, v.nprobe), nl), pq = v.pq, bw = Math.max(1e-9, v.bw) * 1e9;
    var scanned = N * np / nl;
    var r = {
      flat: N * 4 * d, hnsw: N * (4 * d + 8 * M), ivf: N * (4 * d + 8), ivfpq: N * (pq + 8),
      exactRead: N * 4 * d, scanned: scanned, centroidRead: nl * 4 * d,
      ivfRead: scanned * (4 * d + 8), ivfpqRead: scanned * (pq + 8)
    };
    r.exactMs = r.exactRead / bw * 1000;
    r.ivfMs = r.ivfRead / bw * 1000;
    r.ivfpqMs = r.ivfpqRead / bw * 1000;
    r.centroidMs = r.centroidRead / bw * 1000;
    return r;
  }

  /* La primera consulta engaña a la búsqueda golosa con M = 2 y efSearch = 1 (devuelve el décimo más cercano con
     10 distancias); con efSearch = 8 acierta con 21, y con M = 3 acierta con 27 (verificado en Node). */
  var QUERIES = [{ x: 0.6, y: 0.15 }, { x: 0.52, y: 0.47 }, { x: 0.12, y: 0.86 }];

  SD.annCore = { rng: rng, makePoints: makePoints, buildGraph: buildGraph, searchStart: searchStart, searchStep: searchStep,
    searchAll: searchAll, exactRank: exactRank, bestOf: bestOf, annSize: annSize, QUERIES: QUERIES, N_PTS: N_PTS, SEED: SEED };

  if (typeof document === 'undefined') return;

  /* ======================= hnsw ======================= */

  function initHnsw(host) {
    var pts = makePoints(SEED), m = 2, ef = 1, qi = 0, q = { x: QUERIES[0].x, y: QUERIES[0].y }, G = buildGraph(pts, m), S;
    var W = 640, H = 380, P = 20, X = function (x) { return P + x * (W - 2 * P); }, Y = function (y) { return P + y * (H - 2 * P); };
    var plot = h('div', { class: 'sim-scroll ann-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    function reset() { G = buildGraph(pts, m); S = searchStart(pts, G, q, ef); draw(); }
    function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
    function draw() {
      var L = S.layer, lay = G.layers[L], s = '';
      s += '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Sesenta puntos en el plano; se ven las aristas del piso ' + L + ', la consulta y el camino de la búsqueda.">';
      s += '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="10" fill="var(--bg)" stroke="var(--separator)"/>';
      var seen = {};
      lay.ids.forEach(function (i) {
        lay.adj[i].forEach(function (j) {
          var key = i < j ? i + '-' + j : j + '-' + i;
          if (seen[key]) return; seen[key] = 1;
          s += '<line x1="' + X(pts[i].x).toFixed(1) + '" y1="' + Y(pts[i].y).toFixed(1) + '" x2="' + X(pts[j].x).toFixed(1) + '" y2="' + Y(pts[j].y).toFixed(1) + '" stroke="var(--label-3)" stroke-opacity="0.45" stroke-width="1"/>';
        });
      });
      for (var k = 1; k < S.path.length; k++) {
        var a = pts[S.path[k - 1]], b = pts[S.path[k]];
        s += '<line x1="' + X(a.x).toFixed(1) + '" y1="' + Y(a.y).toFixed(1) + '" x2="' + X(b.x).toFixed(1) + '" y2="' + Y(b.y).toFixed(1) + '" stroke="var(--l-gpu)" stroke-width="3"/>';
      }
      var best = bestOf(S);
      pts.forEach(function (p, i) {
        var on = p.lvl >= L, r = 3 + p.lvl * 2.5;
        var fill = S.visited[i] ? 'var(--l-service)' : (on ? 'var(--label-2)' : 'var(--label-3)');
        s += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="' + r + '" fill="' + fill + '" fill-opacity="' + (on ? 1 : 0.35) + '"/>';
      });
      var c = pts[S.cur];
      s += '<circle cx="' + X(c.x).toFixed(1) + '" cy="' + Y(c.y).toFixed(1) + '" r="11" fill="none" stroke="var(--l-gpu)" stroke-width="2.5"/>';
      if (S.done) {
        var bb = pts[best];
        s += '<circle cx="' + X(bb.x).toFixed(1) + '" cy="' + Y(bb.y).toFixed(1) + '" r="15" fill="none" stroke="var(--ok)" stroke-width="2.5"/>';
      }
      var qx = X(q.x), qy = Y(q.y);
      s += '<path d="M' + (qx - 8) + ' ' + qy + ' H' + (qx + 8) + ' M' + qx + ' ' + (qy - 8) + ' V' + (qy + 8) + '" stroke="var(--l-cache)" stroke-width="3"/>';
      s += '<text class="sim-label" x="' + (qx + 10) + '" y="' + (qy - 8) + '">consulta</text>';
      s += '<text class="sim-label" x="' + (W - P) + '" y="' + (P + 10) + '" text-anchor="end">Piso ' + L + ' · ' + lay.ids.length + ' puntos</text>';
      plot.innerHTML = s + '</svg>';
      var svg = plot.querySelector('svg');
      svg.addEventListener('click', function (ev) {
        var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        var loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        q = { x: Math.min(1, Math.max(0, (loc.x - P) / (W - 2 * P))), y: Math.min(1, Math.max(0, (loc.y - P) / (H - 2 * P))) };
        reset();
      });
      var nd = Object.keys(S.dist).length;
      stats.innerHTML = '';
      stats.appendChild(stat('Piso', String(L)));
      stats.appendChild(stat('Distancias calculadas', nd + ' de ' + N_PTS));
      var rank = exactRank(pts, q, best);
      stats.appendChild(stat('Resultado', S.done ? (rank === 1 ? 'el más cercano' : 'el n.º ' + rank + ' más cercano') : 'buscando…'));
      if (S.done) {
        note.textContent = rank === 1
          ? 'Encontró el vecino exacto calculando ' + nd + ' distancias en lugar de las ' + N_PTS + ' de la búsqueda exhaustiva. Con millones de puntos, la diferencia es de miles de veces.'
          : 'Devolvió el punto n.º ' + rank + ' más cercano, no el mejor: la búsqueda golosa se quedó en un mínimo local. Sube efSearch o M y vuelve a buscar: calcula más distancias y acierta más. Esa es la curva de recall contra latencia.';
      } else note.textContent = S.log[S.log.length - 1];
    }
    function sel(label, list, def, on) {
      var id = 'an' + Math.random().toString(36).slice(2, 7);
      var s = h('select', { id: id }, list.map(function (v) { var o = h('option', { value: v, text: String(v) }); if (v === def) o.selected = true; return o; }));
      s.addEventListener('change', function () { on(+s.value); reset(); });
      return h('div', { class: 'field' }, [h('label', { for: id, text: label }), s]);
    }
    var bStep = h('button', { type: 'button', class: 'btn btn--primary', text: 'Un paso' }), bAll = h('button', { type: 'button', class: 'btn', text: 'Hasta el final' }),
      bQ = h('button', { type: 'button', class: 'btn', text: 'Otra consulta' }), bR = h('button', { type: 'button', class: 'btn', text: 'Reiniciar' });
    bStep.addEventListener('click', function () { searchStep(S, pts, G); draw(); });
    bAll.addEventListener('click', function () { searchAll(S, pts, G); draw(); });
    bQ.addEventListener('click', function () { qi = (qi + 1) % QUERIES.length; q = { x: QUERIES[qi].x, y: QUERIES[qi].y }; reset(); });
    bR.addEventListener('click', reset);
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'HNSW: buscar bajando de piso' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [sel('efSearch', [1, 2, 4, 8], ef, function (v) { ef = v; }), sel('M (vecinos por piso)', [2, 3, 4], m, function (v) { m = v; }), bStep, bAll, bQ, bR]),
      h('div', { 'aria-live': 'polite' }, [stats, plot, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Toca el plano para mover la consulta. Los puntos más grandes llegan a pisos más altos: uno de cada cuatro sube al piso 1 y uno de cada dieciséis al 2. Se ven las aristas del piso en el que está la búsqueda; en azul, los puntos cuya distancia ya se calculó. Simplificado: cada punto se une con sus M vecinos más cercanos del piso (2M en el piso 0); el HNSW real arma el grafo insertando de a uno, con una heurística que elige vecinos en varias direcciones.' }));
    reset();
  }

  /* ======================= annsize ======================= */

  var uid = 0;
  function num(label, value, step) {
    var id = 'as' + (++uid);
    var i = h('input', { id: id, type: 'number', min: 0, step: step, value: value, inputmode: 'decimal' });
    return { el: h('div', { class: 'field' }, [h('label', { for: id, text: label }), i]), input: i };
  }
  function out(label, formula) {
    var v = h('output', { class: 'out-value' });
    return { el: h('div', { class: 'out-row' }, [h('span', { class: 'out-label', text: label }), v, h('span', { class: 'out-formula', text: formula })]), v: v };
  }
  function ms(x) { return x >= 1000 ? F.num(x / 1000, 1) + ' s' : x >= 1 ? F.num(x, 1) + ' ms' : F.num(x * 1000, 0) + ' µs'; }

  function initAnnsize(host) {
    var f = {
      n: num('Vectores (millones)', 100, 1), d: num('Dimensiones (d)', 128, 1), m: num('HNSW: vecinos por punto (M)', 32, 1),
      nlist: num('IVF: celdas (nlist)', 262144, 1), nprobe: num('IVF: celdas que mira cada consulta (nprobe)', 64, 1),
      pq: num('PQ: bytes por código (m)', 64, 1), bw: num('Ancho de banda de memoria (GB/s, supuesto)', 200, 1)
    };
    var o = {
      flat: out('Plano (exacto)', 'N × 4d'), hnsw: out('HNSW', 'N × (4d + 8M)'), ivf: out('IVF-Flat', 'N × (4d + 8 del id)'), ivfpq: out('IVF-PQ', 'N × (m + 8)'),
      exact: out('Una consulta exacta lee', 'N × 4d bytes, al ancho de banda'),
      scan: out('Vectores que mira IVF por consulta', 'N × nprobe / nlist'),
      ivfq: out('Una consulta IVF-Flat lee en las celdas', 'vectores que mira × (4d + 8)'),
      ivfpqq: out('Una consulta IVF-PQ lee en las celdas', 'vectores que mira × (m + 8)'),
      cent: out('Comparar contra todos los centroides lee', 'nlist × 4d; FAISS lo evita con un HNSW de centroides')
    };
    function run() {
      var v = {};
      Object.keys(f).forEach(function (k) { var n = parseFloat(f[k].input.value); v[k] = isFinite(n) && n >= 0 ? n : 0; });
      var r = annSize(v);
      o.flat.v.textContent = F.bytes(r.flat); o.hnsw.v.textContent = F.bytes(r.hnsw); o.ivf.v.textContent = F.bytes(r.ivf); o.ivfpq.v.textContent = F.bytes(r.ivfpq);
      o.exact.v.textContent = F.bytes(r.exactRead) + ' · ' + ms(r.exactMs);
      o.scan.v.textContent = F.num(Math.round(r.scanned), 0);
      o.ivfq.v.textContent = F.bytes(r.ivfRead) + ' · ' + ms(r.ivfMs);
      o.ivfpqq.v.textContent = F.bytes(r.ivfpqRead) + ' · ' + ms(r.ivfpqMs);
      o.cent.v.textContent = F.bytes(r.centroidRead) + ' · ' + ms(r.centroidMs);
    }
    var inCol = h('div', { class: 'calc-inputs' }), outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' });
    Object.keys(f).forEach(function (k) { inCol.appendChild(f[k].el); f[k].input.addEventListener('input', run); });
    Object.keys(o).forEach(function (k) { outCol.appendChild(o[k].el); });
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: 'Cuánto ocupa un índice y cuánto lee una consulta' })]));
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Bytes por vector según la documentación de FAISS: float32 de 4 B por dimensión, 8 B por enlace en el piso 0 del HNSW y 8 B del id en los índices IVF. El tiempo es solo el de leer los bytes al ancho de banda que elijas, un supuesto: no cuenta el cómputo ni los saltos de memoria. Con pocas celdas, comparar contra todos los centroides es barato; con cientos de miles, costaría más que las celdas, y FAISS los busca con un HNSW chico. HNSW no tiene una fórmula de cuántos vectores lee: depende de efSearch y se mide.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="hnsw"]').forEach(initHnsw);
    document.querySelectorAll('[data-calc="annsize"]').forEach(initAnnsize);
  });
})();
