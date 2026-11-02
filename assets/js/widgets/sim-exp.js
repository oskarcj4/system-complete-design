/* Widgets de M49 (evaluar y experimentar con un recomendador).
   <div data-calc="abpower">  cuántos usuarios por grupo hacen falta para detectar un cambio en una tasa (con la regla 16 σ² / δ²,
                              la fórmula con z y la reducción de CUPED), y cuántos días de tráfico son.
   <div data-sim="cuped">     un A/B sintético con una covariable previa: el intervalo de la diferencia con y sin CUPED.
   <div data-sim="interleave"> dos rankers: team-draft interleaving paso a paso y miles de sesiones simuladas contra un A/B.
   <div data-sim="ips">       evaluar una política nueva con los logs de la vieja: estimador ingenuo, IPS y IPS recortado,
                              repetido 300 veces para ver sesgo y dispersión.
   Lógica pura en SD.expCore. Todos los datos son sintéticos y llevan semilla. */
(function () {
  'use strict';
  var SD = window.SD;

  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function variance(a) { var m = mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return s / (a.length - 1); }

  var Z_ALPHA = { 0.1: 1.645, 0.05: 1.96, 0.01: 2.576 }, Z_POWER = { 0.8: 0.8416, 0.9: 1.2816 };

  /* Tamaño por grupo para una tasa p y un cambio absoluto delta */
  function power(o) {
    var s2 = o.p * (1 - o.p) * (1 - (o.rho || 0) * (o.rho || 0));
    var z = Z_ALPHA[o.alpha] + Z_POWER[o.power];
    var n = 2 * z * z * s2 / (o.delta * o.delta);
    var regla = 16 * s2 / (o.delta * o.delta);
    var porDia = o.diarios * o.fraccion;
    return { s2: s2, z: z, n: n, regla: regla, dias: porDia > 0 ? 2 * n / porDia : Infinity };
  }

  /* A/B sintético con covariable previa X y resultado Y, correlación rho */
  function cuped(o) {
    var r = rng(o.seed), X = [[], []], Y = [[], []], sigma = 3;
    for (var g = 0; g < 2; g++) for (var i = 0; i < o.n; i++) {
      var zx = gauss(r), ze = gauss(r);
      X[g].push(10 + sigma * zx);
      Y[g].push(10 + sigma * (o.rho * zx + Math.sqrt(1 - o.rho * o.rho) * ze) + (g === 1 ? o.efecto : 0));
    }
    var allX = X[0].concat(X[1]), allY = Y[0].concat(Y[1]), mx = mean(allX), my = mean(allY), cov = 0;
    for (var k = 0; k < allX.length; k++) cov += (allX[k] - mx) * (allY[k] - my);
    cov /= allX.length - 1;
    var theta = cov / variance(allX);
    function adj(g) { return Y[g].map(function (y, i) { return y - theta * (X[g][i] - mx); }); }
    var A0 = adj(0), A1 = adj(1);
    function est(a, b) {
      var d = mean(b) - mean(a), se = Math.sqrt(variance(a) / a.length + variance(b) / b.length);
      return { d: d, lo: d - 1.96 * se, hi: d + 1.96 * se, se: se };
    }
    return { plano: est(Y[0], Y[1]), cuped: est(A0, A1), theta: theta, X: X, Y: Y, reduccion: 1 - Math.pow(est(A0, A1).se / est(Y[0], Y[1]).se, 2) };
  }

  /* Team-draft interleaving de dos listas */
  function teamDraft(A, B, r, k) {
    var out = [], team = [], used = {}, ia = 0, ib = 0, na = 0, nb = 0;
    function next(L, i) { while (i < L.length && used[L[i]]) i++; return i; }
    while (out.length < k) {
      ia = next(A, ia); ib = next(B, ib);
      if (ia >= A.length && ib >= B.length) break;
      var pickA = na < nb || (na === nb && r() < 0.5);
      if (ib >= B.length) pickA = true;
      if (ia >= A.length) pickA = false;
      var it = pickA ? A[ia] : B[ib];
      used[it] = true; out.push(it); team.push(pickA ? 'A' : 'B');
      if (pickA) na++; else nb++;
    }
    return { list: out, team: team };
  }

  /* Catálogo de 30 ítems con relevancia real, dos rankers con ruido distinto */
  function rankers(o) {
    var r = rng(o.seed), rel = [], i;
    for (i = 0; i < 30; i++) rel.push(0.02 + 0.5 * Math.pow(r(), 3));
    function ranker(noise) {
      var s = rel.map(function (v, k) { return { k: k, s: v + noise * gauss(r) }; });
      s.sort(function (a, b) { return b.s - a.s; });
      return s.map(function (x) { return x.k; });
    }
    var A = ranker(o.ruidoA);
    return { rel: rel, A: A, B: o.ruidoB === null ? A.slice() : ranker(o.ruidoB) };
  }
  /* Cada sesión es de una persona con su propio nivel de actividad (u): unas hacen muchos más clics que otras */
  function clicks(list, rel, r) {
    var c = [], u = Math.exp(0.9 * gauss(r) - 0.405);
    for (var p = 0; p < list.length; p++) {
      var exam = 1 / Math.log2(p + 2);
      c.push(r() < Math.min(1, exam * rel[list[p]] * u) ? 1 : 0);
    }
    return c;
  }
  function compare(o) {
    var R = rankers(o), r = rng(o.seed * 7 + 1), k = 10;
    var A = R.A.slice(0, k), B = R.B.slice(0, k);
    var ca = [], cb = [], winA = 0, winB = 0, ties = 0;
    for (var s = 0; s < o.sesiones; s++) {
      if (s % 2 === 0) ca.push(clicks(A, R.rel, r).reduce(function (x, y) { return x + y; }, 0));
      else cb.push(clicks(B, R.rel, r).reduce(function (x, y) { return x + y; }, 0));
    }
    for (var t = 0; t < o.sesiones; t++) {
      var td = teamDraft(R.A, R.B, r, k), c = clicks(td.list, R.rel, r), a = 0, b = 0;
      for (var p = 0; p < k; p++) if (c[p]) { if (td.team[p] === 'A') a++; else b++; }
      if (a > b) winA++; else if (b > a) winB++; else ties++;
    }
    var dAB = mean(cb) - mean(ca), seAB = Math.sqrt(variance(ca) / ca.length + variance(cb) / cb.length);
    var dec = winA + winB, pB = dec ? winB / dec : 0.5, seI = dec ? Math.sqrt(0.25 / dec) : 1;
    var dcg = function (L) { return L.slice(0, k).reduce(function (s, it, p) { return s + R.rel[it] / Math.log2(p + 2); }, 0); };
    return { R: R, ab: { d: dAB, z: seAB ? dAB / seAB : 0, mA: mean(ca), mB: mean(cb) },
      il: { winA: winA, winB: winB, ties: ties, pB: pB, z: (pB - 0.5) / seI },
      demo: teamDraft(R.A, R.B, rng(o.seed + 99), k), dcgA: dcg(R.A), dcgB: dcg(R.B) };
  }

  /* IPS: 5 ítems, la política vieja reparte con probabilidades conocidas; la nueva elige siempre `nueva` */
  var CTR = [0.040, 0.030, 0.055, 0.020, 0.035];
  function ips(o) {
    var reps = [], r = rng(o.seed), i;
    var cum = []; var acc = 0; for (i = 0; i < o.vieja.length; i++) { acc += o.vieja[i]; cum.push(acc); }
    for (var rep = 0; rep < 300; rep++) {
      var sumN = 0, sumI = 0, sumC = 0, hits = 0;
      for (var n = 0; n < o.logs; n++) {
        var u = r() * acc, a = 0; while (a < cum.length - 1 && u > cum[a]) a++;
        var y = r() < CTR[a] ? 1 : 0, p = o.vieja[a] / acc;
        sumN += y;
        if (a === o.nueva) { hits++; sumI += y / p; sumC += y * Math.min(1 / p, o.tope); }
      }
      reps.push({ naive: sumN / o.logs, ips: sumI / o.logs, clip: sumC / o.logs, hits: hits });
    }
    function stats(key) { var v = reps.map(function (x) { return x[key]; }); return { m: mean(v), sd: Math.sqrt(variance(v)), v: v }; }
    return { real: CTR[o.nueva], naive: stats('naive'), ips: stats('ips'), clip: stats('clip'), hits: mean(reps.map(function (x) { return x.hits; })),
      pNueva: o.vieja[o.nueva] / acc };
  }

  SD.expCore = { rng: rng, gauss: gauss, power: power, cuped: cuped, teamDraft: teamDraft, rankers: rankers, compare: compare, ips: ips, CTR: CTR };

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
    var inp = h('input', { type: 'number', value: String(val), min: String(min), max: String(max), step: String(step), inputmode: 'decimal' });
    inp.addEventListener('input', function () { var v = parseFloat(inp.value); if (!isNaN(v)) on(Math.max(min, Math.min(max, v))); });
    return { el: h('label', { class: 'field' }, [h('span', { text: label }), inp]), inp: inp };
  }
  function frame(root, title) {
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: title })]));
    var body = h('div', { class: 'sim-body' });
    root.appendChild(body);
    return body;
  }
  /* Intervalos horizontales con la línea del valor real */
  function intervals(rows, real, lo, hi, label) {
    var W = 620, x0 = 150, x1 = 600;
    function X(v) { return x0 + (v - lo) / (hi - lo) * (x1 - x0); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + (rows.length * 44 + 46) + '" role="img" aria-label="' + label + '">';
    s += '<line x1="' + X(real).toFixed(1) + '" y1="10" x2="' + X(real).toFixed(1) + '" y2="' + (rows.length * 44 + 14) + '" class="xp-real"/>';
    s += '<text class="sim-label" x="' + X(real).toFixed(1) + '" y="' + (rows.length * 44 + 32) + '" text-anchor="middle">real: ' + F.num(real, 3) + '</text>';
    if (lo < 0 && hi > 0) s += '<line x1="' + X(0).toFixed(1) + '" y1="10" x2="' + X(0).toFixed(1) + '" y2="' + (rows.length * 44 + 14) + '" class="sim-axis"/>';
    rows.forEach(function (rw, i) {
      var y = 30 + 44 * i, a = Math.max(lo, rw.lo), b = Math.min(hi, rw.hi);
      s += '<text class="sim-label" x="10" y="' + (y + 4) + '">' + rw.name + '</text>';
      s += '<line x1="' + X(a).toFixed(1) + '" y1="' + y + '" x2="' + X(b).toFixed(1) + '" y2="' + y + '" class="xp-ci' + (rw.em ? ' xp-ci--em' : '') + '"/>';
      s += '<circle cx="' + X(Math.max(lo, Math.min(hi, rw.m))).toFixed(1) + '" cy="' + y + '" r="5" class="xp-dot' + (rw.em ? ' xp-ci--em' : '') + '"/>';
    });
    return s + '</svg>';
  }

  /* ---------- abpower ---------- */
  function initPower(root) {
    var st = { p: 5, delta: 0.1, alpha: 0.05, power: 0.8, diarios: 20000000, fraccion: 10, rho: 0 };
    var body = frame(root, 'Cuántos usuarios hacen falta'), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var f = [numField('Tasa base (%)', st.p, 0.1, 90, 0.1, function (v) { st.p = v; render(); }),
      numField('Cambio a detectar (puntos)', st.delta, 0.01, 20, 0.01, function (v) { st.delta = v; render(); }),
      numField('Usuarios por día', st.diarios, 1000, 3000000000, 1000, function (v) { st.diarios = v; render(); }),
      numField('Tráfico en el experimento (%)', st.fraccion, 1, 100, 1, function (v) { st.fraccion = v; render(); }),
      numField('Correlación con el período previo (CUPED, 0 = sin)', st.rho, 0, 0.95, 0.05, function (v) { st.rho = v; render(); })];
    body.appendChild(h('div', { class: 'sim-controls' }, [
      chips([[0.05, 'α = 0.05'], [0.01, 'α = 0.01']], st.alpha, function (v) { st.alpha = v; render(); }, 'Nivel de significancia'),
      chips([[0.8, 'Potencia 80 %'], [0.9, 'Potencia 90 %']], st.power, function (v) { st.power = v; render(); }, 'Potencia')
    ].concat(f.map(function (x) { return x.el; }))));
    body.appendChild(h('div', { 'aria-live': 'polite' }, [stats, note]));
    function render() {
      var r = power({ p: st.p / 100, delta: st.delta / 100, alpha: st.alpha, power: st.power, diarios: st.diarios, fraccion: st.fraccion / 100, rho: st.rho });
      stats.innerHTML = '';
      stats.appendChild(stat('Por grupo (fórmula)', F.num(Math.ceil(r.n))));
      stats.appendChild(stat('Regla 16 σ² / δ²', F.num(Math.ceil(r.regla))));
      stats.appendChild(stat('Varianza σ²', F.num(r.s2, 4)));
      stats.appendChild(stat('Días de tráfico', r.dias < 0.1 ? 'menos de 0.1' : F.num(r.dias, 1)));
      var msg = 'σ² = p · (1 − p)' + (st.rho ? ' · (1 − ρ²)' : '') + ' = ' + F.num(r.s2, 4) + '. La fórmula usa 2 · (z de α + z de la potencia)² = ' + F.num(2 * r.z * r.z, 1) + ' en lugar de 16: con α = 0.05 y 80 % de potencia son 15.7, y la regla redondea a 16. ';
      msg += r.dias < 7 ? 'Aunque alcance con menos, el experimento corre al menos una semana entera: el lunes no se comporta como el sábado, y la primera semana trae efecto novedad.' : 'Más de una semana: conviene un cambio más grande, más tráfico o CUPED.';
      note.textContent = msg;
    }
    render();
  }

  /* ---------- cuped ---------- */
  function initCuped(root) {
    var st = { n: 2000, rho: 0.7, efecto: 0.2, seed: 52 };
    var body = frame(root, 'El mismo A/B con y sin CUPED'), plot = h('div', { class: 'sim-scroll xp-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var f = [numField('Usuarios por grupo', st.n, 100, 20000, 100, function (v) { st.n = Math.round(v); render(); }),
      numField('Efecto real (compras por usuario)', st.efecto, 0, 2, 0.05, function (v) { st.efecto = v; render(); })];
    var again = h('button', { type: 'button', class: 'btn', text: 'Otra muestra' });
    again.addEventListener('click', function () { st.seed++; render(); });
    body.appendChild(h('div', { class: 'sim-controls' }, [
      chips([[0, 'ρ = 0'], [0.5, 'ρ = 0.5'], [0.7, 'ρ = 0.7'], [0.9, 'ρ = 0.9']], st.rho, function (v) { st.rho = v; render(); }, 'Correlación entre antes y durante'),
      f[0].el, f[1].el, again]));
    body.appendChild(h('div', { 'aria-live': 'polite' }, [stats, plot, note]));
    function render() {
      var r = cuped(st), lo = Math.min(-0.1, r.plano.lo, r.cuped.lo) - 0.05, hi = Math.max(r.plano.hi, r.cuped.hi, st.efecto) + 0.05;
      plot.innerHTML = intervals([{ name: 'Diferencia simple', m: r.plano.d, lo: r.plano.lo, hi: r.plano.hi }, { name: 'Con CUPED', m: r.cuped.d, lo: r.cuped.lo, hi: r.cuped.hi, em: true }],
        st.efecto, lo, hi, 'Intervalo del 95 por ciento de la diferencia, con y sin CUPED');
      stats.innerHTML = '';
      stats.appendChild(stat('θ estimado', F.num(r.theta, 2)));
      stats.appendChild(stat('Ancho sin CUPED', '± ' + F.num(1.96 * r.plano.se, 3)));
      stats.appendChild(stat('Ancho con CUPED', '± ' + F.num(1.96 * r.cuped.se, 3)));
      stats.appendChild(stat('Varianza que se va', pct(Math.max(0, r.reduccion), 0)));
      note.textContent = 'Cada usuario tiene sus compras del mes anterior (X) y las de este mes (Y). CUPED resta θ · (X − promedio de X): lo que cada persona iba a comprar igual. La diferencia entre grupos no cambia en promedio, porque X se midió antes del experimento, pero la varianza baja a 1 − ρ² = ' + pct(1 - st.rho * st.rho, 0) + ' de lo que era. Con ρ = 0.7, la mitad de los usuarios dan la misma precisión.';
    }
    render();
  }

  /* ---------- interleave ---------- */
  function initInterleave(root) {
    var st = { ruidoA: 0.25, ruidoB: 0.18, sesiones: 2000, seed: 51 };
    var body = frame(root, 'Interleaving contra A/B'), list = h('div', { class: 'sim-scroll xp-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var again = h('button', { type: 'button', class: 'btn', text: 'Otra semilla' });
    again.addEventListener('click', function () { st.seed++; render(); });
    body.appendChild(h('div', { class: 'sim-controls' }, [
      chips([[500, '500 sesiones'], [2000, '2 000'], [8000, '8 000']], st.sesiones, function (v) { st.sesiones = v; render(); }, 'Sesiones'),
      chips([[0.05, 'B mucho mejor'], [0.18, 'B un poco mejor'], [null, 'B igual a A']], st.ruidoB, function (v) { st.ruidoB = v; render(); }, 'Ranker B'),
      again]));
    body.appendChild(h('div', { 'aria-live': 'polite' }, [list, stats, note]));
    function render() {
      var r = compare(st), d = r.demo;
      var s = '<svg viewBox="0 0 620 120" role="img" aria-label="Una lista intercalada de 10 lugares; cada lugar marca si lo aportó el ranker A o el B">';
      d.list.forEach(function (it, p) {
        var x = 10 + 60 * p, cls = d.team[p] === 'A' ? 'xp-team xp-team--a' : 'xp-team xp-team--b';
        s += '<rect x="' + x + '" y="20" width="52" height="52" rx="8" class="' + cls + '"/>';
        s += '<text class="sim-label" x="' + (x + 26) + '" y="44" text-anchor="middle">ítem ' + (it + 1) + '</text>';
        s += '<text class="sim-val" x="' + (x + 26) + '" y="62" text-anchor="middle">' + d.team[p] + '</text>';
        s += '<text class="sim-label" x="' + (x + 26) + '" y="92" text-anchor="middle">' + (p + 1) + '</text>';
      });
      s += '<text class="sim-label" x="10" y="114">Posición en la lista; la letra dice qué ranker puso ese ítem.</text></svg>';
      list.innerHTML = s;
      stats.innerHTML = '';
      stats.appendChild(stat('A/B: clics por sesión', F.num(r.ab.mA, 3) + ' contra ' + F.num(r.ab.mB, 3)));
      stats.appendChild(stat('A/B: z de la diferencia', F.num(r.ab.z, 1)));
      stats.appendChild(stat('Interleaving: gana B', pct(r.il.pB) + ' de ' + F.num(r.il.winA + r.il.winB) + ' con preferencia'));
      stats.appendChild(stat('Interleaving: z', F.num(r.il.z, 1)));
      note.textContent = 'Cada sesión del A/B ve una sola lista (la mitad A, la mitad B) y se comparan los clics promedio. Cada sesión intercalada ve las dos a la vez: por turnos, cada ranker aporta su mejor ítem que todavía no está, y gana la sesión el que se llevó más clics. Un z mayor que 2 es una diferencia que el azar casi nunca produce. Con las mismas sesiones, el interleaving suele dar un z varias veces más grande: compara dentro de la misma persona y el mismo momento, sin el ruido de que unas personas hacen muchos más clics que otras. ' + (st.ruidoB === null ? 'Con B igual a A, los dos z deberían quedar cerca de 0.' : 'B ordena mejor: su DCG con la relevancia real es ' + F.num(r.dcgB, 2) + ' contra ' + F.num(r.dcgA, 2) + ' de A.');
    }
    render();
  }

  /* ---------- ips ---------- */
  var IPS_PRESETS = {
    explora: { label: 'Vieja que explora', vieja: [0.3, 0.2, 0.2, 0.15, 0.15] },
    golosa: { label: 'Vieja golosa (C al 2 %)', vieja: [0.8, 0.1, 0.02, 0.04, 0.04] },
    nunca: { label: 'Vieja que nunca muestra C', vieja: [0.85, 0.1, 0, 0.025, 0.025] }
  };
  function initIPS(root) {
    var st = { preset: 'explora', logs: 10000, tope: 10, nueva: 2, seed: 49 };
    var body = frame(root, 'Evaluar la política nueva sin lanzarla'), plot = h('div', { class: 'sim-scroll xp-plot' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    var tope = numField('Tope del peso (recorte)', st.tope, 1, 1000, 1, function (v) { st.tope = v; render(); });
    body.appendChild(h('div', { class: 'sim-controls' }, [
      chips(Object.keys(IPS_PRESETS).map(function (k) { return [k, IPS_PRESETS[k].label]; }), st.preset, function (k) { st.preset = k; render(); }, 'Política vieja'),
      chips([[2000, '2 000 logs'], [10000, '10 000'], [50000, '50 000']], st.logs, function (v) { st.logs = v; render(); }, 'Logs'),
      tope.el]));
    body.appendChild(h('div', { 'aria-live': 'polite' }, [stats, plot, note]));
    function render() {
      var P = IPS_PRESETS[st.preset], r = ips({ vieja: P.vieja, logs: st.logs, tope: st.tope, nueva: st.nueva, seed: st.seed });
      function row(name, s, em) { return { name: name, m: s.m, lo: s.m - 1.96 * s.sd, hi: s.m + 1.96 * s.sd, em: em }; }
      plot.innerHTML = intervals([row('Ingenuo', r.naive), row('IPS', r.ips, true), row('IPS recortado', r.clip)], r.real, 0, 0.1,
        'Estimaciones del CTR de la política nueva: el punto es el promedio de 300 repeticiones y la barra, donde cae el 95 por ciento');
      stats.innerHTML = '';
      stats.appendChild(stat('CTR real de la nueva (siempre C)', pct(r.real)));
      stats.appendChild(stat('La vieja mostraba C', pct(r.pNueva, 0)));
      stats.appendChild(stat('Logs útiles por corrida', F.num(r.hits, 0)));
      stats.appendChild(stat('Peso de cada clic en C', r.pNueva ? F.num(1 / r.pNueva, 0) : 'infinito'));
      var msg = 'La política vieja elige entre cinco ítems con las probabilidades que guardó en el log; la nueva mostraría siempre el ítem C. El ingenuo promedia el CTR de los logs: mide la vieja, no la nueva. IPS se queda con los logs donde la vieja mostró C y pesa cada uno por 1 / probabilidad: en promedio da el valor real. ';
      if (st.preset === 'golosa') msg += 'Con C al 2 %, cada clic pesa 50 y la barra se ensancha mucho; el recorte la achica a cambio de un sesgo hacia abajo.';
      else if (st.preset === 'nunca') msg += 'Si la vieja nunca mostró C, no hay ningún log útil: IPS da 0 y no hay corrección posible. Por eso la vieja tiene que explorar (M47).';
      else msg += 'Cuando la vieja explora, IPS y el recorte casi coinciden.';
      note.textContent = msg;
    }
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-calc="abpower"]').forEach(initPower);
    document.querySelectorAll('[data-sim="cuped"]').forEach(initCuped);
    document.querySelectorAll('[data-sim="interleave"]').forEach(initInterleave);
    document.querySelectorAll('[data-sim="ips"]').forEach(initIPS);
  });
})();
