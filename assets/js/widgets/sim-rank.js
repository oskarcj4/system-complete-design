/* Widgets del ranking (M46):
   <div data-sim="ndcg">       una lista de cuatro ítems con su relevancia; se reordena y se ve cómo cambian DCG, IDCG,
                               NDCG@k, precisión@k y recall@k, con la ganancia y el descuento de cada posición
   <div data-sim="calib">      un modelo entrenado con datos sintéticos (con semilla), mal calibrado de tres formas, y tres
                               correcciones (la fórmula del submuestreo, Platt e isotónica): diagrama de fiabilidad, ECE,
                               la razón predicho / observado, log loss y un AUC que no cambia
   <div data-calc="multiobj">  cinco publicaciones con la probabilidad de cinco acciones; con los pesos se arma el puntaje
                               y el orden; presets "solo me gusta", "sin castigar lo negativo" y los pesos que Twitter
                               publicó en abril de 2023
   La lógica pura está en SD.rankCore, sin DOM, para probarla en Node. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* ======================= Lógica pura ======================= */

  function gain(rel) { return Math.pow(2, rel) - 1; }
  function disc(pos) { return 1 / (Math.log(pos + 1) / Math.LN2); }   /* pos empieza en 1 */

  /* rels: relevancias en el orden de la lista; k: cuántas posiciones cuentan. Relevante = relevancia de 1 o más. */
  function rankMetrics(rels, k) {
    k = Math.max(1, Math.min(k, rels.length));
    var dcg = 0, rows = [];
    rels.forEach(function (r, i) {
      var g = gain(r), d = disc(i + 1), c = i < k ? g * d : 0;
      dcg += c;
      rows.push({ pos: i + 1, rel: r, gain: g, disc: d, contrib: c, counted: i < k });
    });
    var ideal = rels.slice().sort(function (a, b) { return b - a; }), idcg = 0;
    for (var i = 0; i < k; i++) idcg += gain(ideal[i]) * disc(i + 1);
    var relTotal = rels.filter(function (r) { return r > 0; }).length, relTop = 0;
    for (var j = 0; j < k; j++) if (rels[j] > 0) relTop++;
    return { rows: rows, dcg: dcg, idcg: idcg, ndcg: idcg > 0 ? dcg / idcg : 0, prec: relTop / k, recall: relTotal ? relTop / relTotal : 0, relTop: relTop, relTotal: relTotal, k: k };
  }

  /* El cambio de DCG al intercambiar las posiciones i y j (desde 1): es el peso de LambdaRank para ese par. */
  function swapDelta(rels, i, j) {
    return Math.abs((gain(rels[i - 1]) - gain(rels[j - 1])) * (disc(i) - disc(j)));
  }

  /* ---- Calibración ---- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function sig(z) { return 1 / (1 + Math.exp(-z)); }
  function logit(p) { p = Math.min(1 - 1e-6, Math.max(1e-6, p)); return Math.log(p / (1 - p)); }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  var CAL_N = 6000, CAL_SEED = 46, W_SUB = 0.1;
  /* La probabilidad verdadera de cada impresión sale de un logit normal (media −2, desvío 1.2: la mayoría baja,
     como un CTR). La etiqueta es una moneda con esa probabilidad. Cada escenario deforma la predicción. */
  var CAL_SCEN = {
    bien: { name: 'Bien calibrado', f: function (z, r) { return sig(z + 0.25 * gauss(r)); } },
    sub: { name: 'Entrenado con submuestreo (w = 0.1)', f: function (z, r) { var t = sig(z + 0.25 * gauss(r)); return t / (t + (1 - t) * W_SUB); } },
    conf: { name: 'Sobreconfiado', f: function (z, r) { return sig(1.9 * (z + 0.25 * gauss(r)) + 1.8); } }
  };
  function calibData(scen) {
    var r = rng(CAL_SEED), out = [];
    for (var i = 0; i < CAL_N; i++) {
      var z = -2 + 1.2 * gauss(r), t = sig(z), y = r() < t ? 1 : 0;
      out.push({ p: CAL_SCEN[scen].f(z, r), y: y });
    }
    return out;
  }
  function fitPlatt(d) {
    var a = 1, b = 0;
    for (var it = 0; it < 60; it++) {             /* Newton en dos variables sobre la log loss */
      var ga = 0, gb = 0, haa = 0, hab = 0, hbb = 0;
      d.forEach(function (e) {
        var x = logit(e.p), q = sig(a * x + b), g = q - e.y, w = q * (1 - q);
        ga += g * x; gb += g; haa += w * x * x; hab += w * x; hbb += w;
      });
      haa += 1e-6; hbb += 1e-6;
      var det = haa * hbb - hab * hab; if (!det) break;
      a -= (hbb * ga - hab * gb) / det; b -= (haa * gb - hab * ga) / det;
    }
    return function (p) { return sig(a * logit(p) + b); };
  }
  function fitIsotonic(d) {                        /* pool adjacent violators */
    var s = d.slice().sort(function (u, v) { return u.p - v.p; }), blocks = [];
    s.forEach(function (e) {
      blocks.push({ sum: e.y, n: 1, lo: e.p, hi: e.p });
      while (blocks.length > 1 && blocks[blocks.length - 2].sum / blocks[blocks.length - 2].n >= blocks[blocks.length - 1].sum / blocks[blocks.length - 1].n) {
        var b2 = blocks.pop(), b1 = blocks[blocks.length - 1];
        b1.sum += b2.sum; b1.n += b2.n; b1.hi = b2.hi;
      }
    });
    return function (p) {
      var lo = 0, hi = blocks.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (blocks[mid].hi < p) lo = mid + 1; else hi = mid; }
      return Math.min(1 - 1e-4, Math.max(1e-4, blocks[lo].sum / blocks[lo].n));
    };
  }
  var CAL_FIX = {
    none: { name: 'Sin corregir' },
    sub: { name: 'Fórmula del submuestreo' },
    platt: { name: 'Platt' },
    iso: { name: 'Isotónica' }
  };
  /* Ajusta la corrección con la primera mitad y evalúa en la segunda, como se hace con un conjunto de calibración aparte. */
  function calibrate(scen, fix) {
    var all = calibData(scen), half = all.length / 2, fitSet = all.slice(0, half), test = all.slice(half), g;
    if (fix === 'sub') g = function (p) { return p / (p + (1 - p) / W_SUB); };
    else if (fix === 'platt') g = fitPlatt(fitSet);
    else if (fix === 'iso') g = fitIsotonic(fitSet);
    else g = function (p) { return p; };
    var pts = test.map(function (e) { return { p: g(e.p), raw: e.p, y: e.y }; });
    return evalCal(pts);
  }
  function auc(pts) {
    var s = pts.slice().sort(function (a, b) { return a.raw - b.raw; }), rank = 0, sumPos = 0, nPos = 0, i = 0;
    while (i < s.length) {
      var j = i; while (j + 1 < s.length && s[j + 1].raw === s[i].raw) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) if (s[k].y) { sumPos += avg; nPos++; }
      i = j + 1;
    }
    var nNeg = s.length - nPos;
    return nPos && nNeg ? (sumPos - nPos * (nPos + 1) / 2) / (nPos * nNeg) : 0.5;
  }
  function evalCal(pts) {
    var B = 10, bins = [];
    for (var b = 0; b < B; b++) bins.push({ n: 0, sp: 0, sy: 0 });
    var sp = 0, sy = 0, ll = 0;
    pts.forEach(function (e) {
      var k = Math.min(B - 1, Math.floor(e.p * B));
      bins[k].n++; bins[k].sp += e.p; bins[k].sy += e.y;
      sp += e.p; sy += e.y;
      var p = Math.min(1 - 1e-6, Math.max(1e-6, e.p));
      ll -= e.y ? Math.log(p) : Math.log(1 - p);
    });
    var ece = 0;
    bins.forEach(function (x) { if (x.n) { x.mp = x.sp / x.n; x.my = x.sy / x.n; ece += x.n / pts.length * Math.abs(x.mp - x.my); } });
    return { bins: bins, ece: ece, ratio: sy ? sp / sy : 0, meanP: sp / pts.length, meanY: sy / pts.length, logloss: ll / pts.length, auc: auc(pts), n: pts.length };
  }

  /* ---- Combinar objetivos ---- */
  var ACTIONS = [
    { k: 'fav', name: 'Me gusta' },
    { k: 'rt', name: 'Retweet' },
    { k: 'reply', name: 'Respuesta' },
    { k: 'neg', name: 'Feedback negativo' },
    { k: 'report', name: 'Denuncia' }
  ];
  /* Probabilidades inventadas para el ejemplo (no son de Twitter): cada publicación tiene un perfil distinto. */
  var POSTS = [
    { k: 'meme', name: 'Un meme que circula', p: { fav: 0.22, rt: 0.06, reply: 0.004, neg: 0.003, report: 0.0002 } },
    { k: 'pregunta', name: 'Una pregunta a la comunidad', p: { fav: 0.05, rt: 0.006, reply: 0.04, neg: 0.0008, report: 0.00005 } },
    { k: 'polemica', name: 'Una provocación política', p: { fav: 0.16, rt: 0.05, reply: 0.06, neg: 0.012, report: 0.002 } },
    { k: 'noticia', name: 'Una noticia de último momento', p: { fav: 0.09, rt: 0.05, reply: 0.008, neg: 0.0015, report: 0.0001 } },
    { k: 'hilo', name: 'Un hilo técnico de alguien que sigues', p: { fav: 0.07, rt: 0.02, reply: 0.015, neg: 0.0004, report: 0.00002 } }
  ];
  var WEIGHTS = {
    likes: { name: 'Solo me gusta', w: { fav: 1, rt: 0, reply: 0, neg: 0, report: 0 } },
    sinNeg: { name: 'Sin castigar lo negativo', w: { fav: 0.5, rt: 1, reply: 13.5, neg: 0, report: 0 } },
    twitter: { name: 'Pesos de Twitter (abril de 2023)', w: { fav: 0.5, rt: 1, reply: 13.5, neg: -74, report: -369 } }
  };
  function score(post, w) {
    var parts = {}, total = 0;
    ACTIONS.forEach(function (a) { parts[a.k] = (w[a.k] || 0) * post.p[a.k]; total += parts[a.k]; });
    return { total: total, parts: parts };
  }
  function order(w) {
    return POSTS.map(function (p) { var s = score(p, w); return { post: p, total: s.total, parts: s.parts }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  SD.rankCore = { gain: gain, disc: disc, rankMetrics: rankMetrics, swapDelta: swapDelta, calibData: calibData, calibrate: calibrate,
    evalCal: evalCal, auc: auc, fitPlatt: fitPlatt, fitIsotonic: fitIsotonic, CAL_SCEN: CAL_SCEN, CAL_FIX: CAL_FIX, W_SUB: W_SUB,
    ACTIONS: ACTIONS, POSTS: POSTS, WEIGHTS: WEIGHTS, score: score, order: order };

  /* ======================= Interfaz ======================= */

  var uid = 0;
  function stat(label, value) { return h('div', { class: 'sim-stat' }, [h('span', { text: label }), h('b', { text: value })]); }
  function n3(x) { return F.num(x, 3); }
  function chipRow(list, def, onPick, aria) {
    var box = h('div', { class: 'calc-presets', role: 'group', 'aria-label': aria });
    Object.keys(list).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': k === def ? 'true' : 'false', text: list[k].name });
      b.addEventListener('click', function () {
        box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(k);
      });
      box.appendChild(b);
    });
    box.clear = function () { box.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); };
    return box;
  }

  /* ---- NDCG ---- */
  var NDCG_START = [{ name: 'Ítem A', rel: 0 }, { name: 'Ítem B', rel: 3 }, { name: 'Ítem C', rel: 2 }, { name: 'Ítem D', rel: 0 }];
  function initNdcg(host) {
    var items = NDCG_START.map(function (x) { return { name: x.name, rel: x.rel }; }), k = 3;
    var table = h('div', { class: 'table-wrap' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var kid = 'nk' + (++uid);
    var kSel = h('select', { id: kid }, [1, 2, 3, 4].map(function (v) { var o = h('option', { value: v, text: String(v) }); if (v === k) o.selected = true; return o; }));
    kSel.addEventListener('change', function () { k = +kSel.value; draw(); });
    var bModel = h('button', { type: 'button', class: 'btn', text: 'Orden del modelo' }), bIdeal = h('button', { type: 'button', class: 'btn', text: 'Orden ideal' });
    bModel.addEventListener('click', function () { items = NDCG_START.map(function (x) { return { name: x.name, rel: x.rel }; }); draw(); });
    bIdeal.addEventListener('click', function () { items.sort(function (a, b) { return b.rel - a.rel; }); draw(); });
    function move(i, d) { var j = i + d; if (j < 0 || j >= items.length) return; var t = items[i]; items[i] = items[j]; items[j] = t; draw(); }
    function draw() {
      var r = rankMetrics(items.map(function (x) { return x.rel; }), k);
      var tb = h('tbody');
      items.forEach(function (it, i) {
        var row = r.rows[i], rid = 'nr' + (++uid);
        var rs = h('select', { id: rid, 'aria-label': 'Relevancia de ' + it.name }, [0, 1, 2, 3].map(function (v) { var o = h('option', { value: v, text: String(v) }); if (v === it.rel) o.selected = true; return o; }));
        rs.addEventListener('change', function () { it.rel = +rs.value; draw(); });
        var up = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Subir ' + it.name, text: '↑' });
        var dn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Bajar ' + it.name, text: '↓' });
        up.disabled = i === 0; dn.disabled = i === items.length - 1;
        up.addEventListener('click', function () { move(i, -1); });
        dn.addEventListener('click', function () { move(i, 1); });
        tb.appendChild(h('tr', { class: row.counted ? '' : 'rk-out' }, [
          h('td', { class: 'r', text: String(row.pos) }),
          h('td', { class: 'rk-item' }, [h('span', { class: 'rk-name', text: it.name }), up, dn]),
          h('td', {}, [rs]),
          h('td', { class: 'r', text: String(row.gain) }),
          h('td', { class: 'r', text: n3(row.disc) }),
          h('td', { class: 'r', text: row.counted ? n3(row.contrib) : 'no cuenta' })
        ]));
      });
      table.innerHTML = '';
      table.appendChild(h('table', { class: 't rk-table' }, [
        h('thead', {}, [h('tr', {}, ['Posición', 'Ítem', 'Relevancia', 'Ganancia 2^rel − 1', 'Descuento 1 / log₂(pos + 1)', 'Aporte'].map(function (x) { return h('th', { text: x }); }))]),
        tb]));
      stats.innerHTML = '';
      stats.appendChild(stat('DCG@' + r.k, n3(r.dcg)));
      stats.appendChild(stat('IDCG@' + r.k, n3(r.idcg)));
      stats.appendChild(stat('NDCG@' + r.k, n3(r.ndcg)));
      stats.appendChild(stat('Precisión@' + r.k, F.num(r.prec, 3) + ' (' + r.relTop + ' de ' + r.k + ')'));
      stats.appendChild(stat('Recall@' + r.k, r.relTotal ? F.num(r.recall, 3) + ' (' + r.relTop + ' de ' + r.relTotal + ')' : 'sin relevantes'));
      if (!r.idcg) note.textContent = 'Sin ningún ítem relevante no hay orden ideal: NDCG queda indefinido, y aquí se muestra 0.';
      else if (Math.abs(r.ndcg - 1) < 1e-9) note.textContent = 'Orden ideal: lo más relevante arriba. NDCG vale 1 aunque la precisión no lo sea, porque compara contra lo mejor que se podía hacer con estos ítems.';
      else note.textContent = 'NDCG = DCG / IDCG = ' + n3(r.dcg) + ' / ' + n3(r.idcg) + ' = ' + n3(r.ndcg) + '. Cambiar el orden dentro de las primeras ' + r.k + ' posiciones no mueve la precisión ni el recall, pero sí el NDCG: el de arriba pesa más.';
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'NDCG: cuánto vale cada posición' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [h('div', { class: 'field' }, [h('label', { for: kid, text: 'k (posiciones que cuentan)' }), kSel]), bModel, bIdeal]),
      table, h('div', { 'aria-live': 'polite' }, [stats, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Relevancia de 0 a 3, como la anotaría una persona (0: no sirve; 3: justo lo que buscaba). Para la precisión y el recall, relevante es 1 o más. Mueve los ítems con las flechas o cambia sus relevancias.' }));
    draw();
  }

  /* ---- Calibración ---- */
  function initCalib(host) {
    var scen = 'sub', fix = 'none';
    var plot = h('div', { class: 'sim-scroll rk-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var scenChips = chipRow(CAL_SCEN, scen, function (k2) { scen = k2; draw(); }, 'Cómo se entrenó el modelo');
    var fixChips = chipRow(CAL_FIX, fix, function (k2) { fix = k2; draw(); }, 'Corrección');
    function draw() {
      var r = calibrate(scen, fix), W = 600, H = 380, L = 64, T = 20, P = 300, X = function (v) { return L + v * P * 1.6; }, Y = function (v) { return T + (1 - v) * P; };
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Diagrama de fiabilidad: en el eje horizontal la probabilidad predicha, agrupada en diez tramos; en el vertical, la fracción de impresiones de ese tramo que terminó en clic. Un modelo calibrado queda sobre la diagonal.">';
      for (var g = 0; g <= 10; g += 2) {
        var v = g / 10;
        s += '<line class="sim-grid" x1="' + L + '" x2="' + X(1) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>';
        s += '<text class="sim-axis" x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + F.num(v, 1) + '</text>';
        s += '<line class="sim-grid" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + Y(0) + '" y2="' + Y(1) + '"/>';
        s += '<text class="sim-axis" x="' + X(v) + '" y="' + (Y(0) + 18) + '" text-anchor="middle">' + F.num(v, 1) + '</text>';
      }
      s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(1) + '" y2="' + Y(1) + '" stroke="var(--label-3)" stroke-width="1.5" stroke-dasharray="5 4"/>';
      s += '<text class="sim-label" x="' + X(0.5) + '" y="' + Y(0.64) + '" text-anchor="end">calibrado perfecto</text>';
      var prev = null, maxN = 1;
      r.bins.forEach(function (b) { if (b.n > maxN) maxN = b.n; });
      r.bins.forEach(function (b) {
        if (!b.n) return;
        var cx = X(b.mp), cy = Y(b.my), rad = 4 + 10 * Math.sqrt(b.n / maxN);
        if (prev) s += '<line x1="' + prev[0].toFixed(1) + '" y1="' + prev[1].toFixed(1) + '" x2="' + cx.toFixed(1) + '" y2="' + cy.toFixed(1) + '" stroke="var(--l-service)" stroke-width="2"/>';
        prev = [cx, cy];
      });
      r.bins.forEach(function (b) {
        if (!b.n) return;
        var cx = X(b.mp), cy = Y(b.my), rad = 4 + 10 * Math.sqrt(b.n / maxN);
        s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="var(--l-service)" fill-opacity="0.35" stroke="var(--l-service)" stroke-width="1.5"><title>' + b.n + ' impresiones; predicho ' + F.num(b.mp, 3) + ', observado ' + F.num(b.my, 3) + '</title></circle>';
      });
      s += '<text class="sim-label" x="' + X(0.5) + '" y="' + (H - 6) + '" text-anchor="middle">Probabilidad predicha (promedio del tramo)</text>';
      s += '<text class="sim-label" x="16" y="' + Y(0.5) + '" text-anchor="middle" transform="rotate(-90 16 ' + Y(0.5) + ')">Fracción con clic</text>';
      plot.innerHTML = s + '</svg>';
      stats.innerHTML = '';
      stats.appendChild(stat('ECE', F.num(r.ece, 3)));
      stats.appendChild(stat('Predicho / observado', F.num(r.ratio, 2)));
      stats.appendChild(stat('Log loss', F.num(r.logloss, 3)));
      stats.appendChild(stat('AUC', F.num(r.auc, 3)));
      var msg = 'Promedio predicho ' + F.num(r.meanP * 100, 1) + ' %, clics reales ' + F.num(r.meanY * 100, 1) + ' %. ';
      if (fix === 'none' && scen === 'sub') msg += 'El modelo vio 1 de cada 10 negativos al entrenar, así que cree que los clics son mucho más comunes: los puntos quedan debajo de la diagonal. La fórmula del submuestreo lo corrige sin datos nuevos.';
      else if (fix === 'none' && scen === 'conf') msg += 'Sobreconfiado: lo que predice alto pasa menos de lo que dice y lo que predice bajo, más. El orden está bien; los números, no.';
      else if (fix === 'sub' && scen !== 'sub') msg += 'La fórmula del submuestreo solo sirve si el modelo se entrenó con submuestreo: aplicada a otro modelo, lo descalibra.';
      else if (fix !== 'none') msg += 'Fíjate en el AUC: no cambió. Las tres correcciones son funciones crecientes, así que no alteran el orden; solo arreglan los números.';
      else msg += 'Los puntos siguen la diagonal: cuando dice 0.2, pasa el 20 % de las veces.';
      note.textContent = msg;
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Calibración: ¿un 0.2 es un 20 %?' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('p', { class: 'rs-group', text: 'Cómo se entrenó el modelo' }), scenChips,
      h('p', { class: 'rs-group', text: 'Corrección' }), fixChips,
      h('div', { 'aria-live': 'polite' }, [stats, plot, note])]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Datos sintéticos con semilla: 6 000 impresiones; las correcciones se ajustan con la mitad y todo se mide en la otra mitad. ECE: el promedio, pesado por cantidad, de la distancia entre lo predicho y lo observado en cada tramo. El tamaño de cada punto es la cantidad de impresiones del tramo.' }));
    draw();
  }

  /* ---- Combinar objetivos ---- */
  function initMultiobj(host) {
    var f = {}, inCol = h('div', { class: 'calc-inputs' }), outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' });
    ACTIONS.forEach(function (a) {
      var id = 'mo' + (++uid), i = h('input', { id: id, type: 'number', step: 0.5, value: WEIGHTS.twitter.w[a.k], inputmode: 'decimal' });
      f[a.k] = i;
      inCol.appendChild(h('div', { class: 'field' }, [h('label', { for: id, text: 'Peso de ' + a.name.toLowerCase() }), i]));
    });
    var chips = chipRow(WEIGHTS, 'twitter', function (k2) { ACTIONS.forEach(function (a) { f[a.k].value = WEIGHTS[k2].w[a.k]; }); run(); }, 'Pesos de ejemplo');
    function read() { var w = {}; ACTIONS.forEach(function (a) { var n = parseFloat(f[a.k].value); w[a.k] = isFinite(n) ? n : 0; }); return w; }
    function run() {
      var w = read(), o = order(w), maxAbs = 1e-9;
      o.forEach(function (x) { maxAbs = Math.max(maxAbs, Math.abs(x.total)); });
      outCol.innerHTML = '';
      o.forEach(function (x, i) {
        var top = ACTIONS.map(function (a) { return { a: a, v: x.parts[a.k] }; }).filter(function (z) { return z.v !== 0; })
          .sort(function (p, q) { return Math.abs(q.v) - Math.abs(p.v); }).slice(0, 2)
          .map(function (z) { return z.a.name.toLowerCase() + ' ' + (z.v > 0 ? '+' : '−') + F.num(Math.abs(z.v), 3); }).join(', ');
        var pct = Math.abs(x.total) / maxAbs * 100;
        outCol.appendChild(h('div', { class: 'out-row' }, [
          h('span', { class: 'out-label', text: (i + 1) + '. ' + x.post.name }),
          h('output', { class: 'out-value', text: (x.total < 0 ? '−' : '') + F.num(Math.abs(x.total), 3) }),
          h('span', { class: 'out-formula' }, [
            h('span', { class: 'rk-bar' + (x.total < 0 ? ' rk-bar--neg' : ''), style: 'width:' + pct.toFixed(1) + '%' }),
            h('span', { text: top ? 'pesa más: ' + top : 'todos los pesos en cero' })])
        ]));
      });
    }
    ACTIONS.forEach(function (a) { f[a.k].addEventListener('input', function () { chips.clear(); run(); }); });
    var probs = h('div', { class: 'table-wrap' }, [h('table', { class: 't' }, [
      h('thead', {}, [h('tr', {}, [h('th', { text: 'Publicación' })].concat(ACTIONS.map(function (a) { return h('th', { class: 'r', text: 'p(' + a.name.toLowerCase() + ')' }); })))]),
      h('tbody', {}, POSTS.map(function (p) { return h('tr', {}, [h('td', { text: p.name })].concat(ACTIONS.map(function (a) { return h('td', { class: 'r', text: F.sig(p.p[a.k]) }); }))); }))])]);
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: 'De cinco probabilidades a un puntaje' }), chips]));
    host.appendChild(probs);
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Puntaje = Σ peso × probabilidad. Los pesos de Twitter son los que publicó en su repositorio el 5 de abril de 2023 para estas cinco acciones (también tenía otras, como el clic en el perfil). Las probabilidades de las cinco publicaciones son inventadas para el ejemplo.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="ndcg"]').forEach(initNdcg);
    document.querySelectorAll('[data-sim="calib"]').forEach(initCalib);
    document.querySelectorAll('[data-calc="multiobj"]').forEach(initMultiobj);
  });
})();
