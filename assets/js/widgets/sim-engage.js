/* Widget de M51 (algoritmos de engagement):
   <div data-sim="engage">   un objetivo con tres pesos (tiempo visto, satisfacción declarada y "no me interesa")
                             y un tope por categoría; muestra la mezcla del feed simulado y lo que pasa con el
                             tiempo, la satisfacción, el arrepentimiento y los "no me interesa".
   Lógica en SD.engageCore. Las seis categorías y sus números son sintéticos, elegidos para mostrar el mecanismo;
   la página lo dice. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* t: segundos vistos por ítem; sat: fracción que responde "me gustó verlo" en la encuesta;
     nmi: fracción que toca "no me interesa"; reg: fracción que dice "preferiría no haberlo visto". */
  var CATS = [
    { id: 'amigos', name: 'Lo que publican tus seguidos', t: 30, sat: 0.85, nmi: 0.01, reg: 0.03 },
    { id: 'resenas', name: 'Reseñas útiles', t: 40, sat: 0.80, nmi: 0.02, reg: 0.05 },
    { id: 'tutoriales', name: 'Tutoriales', t: 70, sat: 0.75, nmi: 0.03, reg: 0.05 },
    { id: 'ofertas', name: 'Ofertas con cuenta regresiva', t: 25, sat: 0.45, nmi: 0.08, reg: 0.20 },
    { id: 'unboxing', name: 'Unboxing sensacionalista', t: 55, sat: 0.40, nmi: 0.06, reg: 0.30 },
    { id: 'polemicas', name: 'Polémicas e indignación', t: 85, sat: 0.25, nmi: 0.12, reg: 0.45 }
  ];
  var ITEMS = 20, TAU = 0.08;

  var core = {
    cats: CATS,
    score: function (c, w) { return w.t * c.t / 85 + w.s * c.sat - w.n * c.nmi * 8; },
    mix: function (w, cap) {
      var sc = CATS.map(function (c) { return core.score(c, w); });
      var mx = Math.max.apply(null, sc);
      var e = sc.map(function (s) { return Math.exp((s - mx) / TAU); });
      var z = e.reduce(function (a, b) { return a + b; }, 0);
      var p = e.map(function (x) { return x / z; });
      if (cap) {
        /* tope por categoría: lo que sobra se reparte entre las que no llegaron, en proporción a su peso */
        for (var k = 0; k < 10; k++) {
          var extra = 0, free = 0;
          p.forEach(function (x, i) { if (x > cap) { extra += x - cap; p[i] = cap; } else if (x < cap) free += x; });
          if (extra < 1e-9) break;
          p = p.map(function (x) { return x < cap ? x + extra * x / free : x; });
        }
      }
      return p;
    },
    run: function (w, cap) {
      var p = core.mix(w, cap), r = { p: p, t: 0, sat: 0, nmi: 0, reg: 0 };
      CATS.forEach(function (c, i) { r.t += p[i] * c.t; r.sat += p[i] * c.sat; r.nmi += p[i] * c.nmi; r.reg += p[i] * c.reg; });
      r.min = ITEMS * r.t / 60;
      return r;
    }
  };
  SD.engageCore = core;

  var PRESETS = [
    { id: 'tiempo', name: 'Solo tiempo visto', w: { t: 1, s: 0, n: 0 }, cap: false,
      note: 'El objetivo premia los segundos y nada más. El modelo no "quiere" polémica: descubre que retiene, y la sube. El tiempo es el más alto de los cuatro casos y la satisfacción, la más baja.' },
    { id: 'satisf', name: 'Tiempo y satisfacción', w: { t: 0.5, s: 0.5, n: 0 }, cap: false,
      note: 'La encuesta "¿te gustó verlo?" entra como etiqueta con el mismo peso que el tiempo. Los tutoriales ganan: retienen y además gustan. El tiempo baja un 22 % y el arrepentimiento, de 41 a 9 %.' },
    { id: 'nmi', name: 'Con "no me interesa"', w: { t: 0.5, s: 0.5, n: 0.5 }, cap: false,
      note: 'Cada "no me interesa" resta. Es la señal negativa más barata de juntar y la que más rápido corrige: lo que la gente rechaza a propósito deja de subir aunque retenga.' },
    { id: 'tope', name: 'Satisfacción y tope', w: { t: 0.5, s: 0.5, n: 0.5 }, cap: 0.3, capOn: true,
      note: 'Además, ninguna categoría pasa del 30 % del feed: un tope de dosis. Cuesta tiempo (de 19.3 a 15.9 minutos) y algo de arrepentimiento, porque el lugar que dejan los tutoriales lo ocupan categorías que gustan menos. A cambio, el feed no se vuelve de un solo tema.' }
  ];

  function stat(label, value) {
    return h('div', { class: 'sim-stat' }, [h('span', { class: 'sim-stat-label', text: label }), h('b', { class: 'sim-stat-value', text: value })]);
  }
  function chip(text, pressed, fn) {
    return h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': pressed ? 'true' : 'false', text: text, onclick: fn });
  }

  function init(root) {
    var st = { w: { t: 1, s: 0, n: 0 }, cap: false, preset: 'tiempo' };
    root.classList.add('sim');
    root.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Qué aprende el feed según el objetivo' })]));
    var body = h('div', { class: 'sim-body' });
    root.appendChild(body);
    var presets = h('div', { class: 'sim-controls', role: 'group', 'aria-label': 'Objetivos de ejemplo' });
    PRESETS.forEach(function (p) {
      presets.appendChild(chip(p.name, p.id === st.preset, function () {
        st.w = { t: p.w.t, s: p.w.s, n: p.w.n }; st.cap = !!p.cap; st.preset = p.id; sync(); render();
      }));
    });
    body.appendChild(presets);
    var ctr = h('div', { class: 'sim-controls eg-sliders' });
    var sliders = {};
    [['t', 'Peso del tiempo visto'], ['s', 'Peso de la satisfacción declarada'], ['n', 'Peso de "no me interesa"']].forEach(function (d) {
      var id = 'eg' + d[0] + Math.random().toString(36).slice(2, 6);
      var out = h('output', { for: id, class: 'eg-val' });
      var inp = h('input', { id: id, type: 'range', min: 0, max: 1, step: 0.05, value: st.w[d[0]] });
      inp.addEventListener('input', function () { st.w[d[0]] = parseFloat(inp.value); st.preset = null; sync(); render(); });
      sliders[d[0]] = { inp: inp, out: out };
      ctr.appendChild(h('div', { class: 'field' }, [h('label', { for: id }, [d[1] + ' ', out]), inp]));
    });
    var capId = 'egc' + Math.random().toString(36).slice(2, 6);
    var cap = h('input', { id: capId, type: 'checkbox' });
    cap.addEventListener('change', function () { st.cap = cap.checked; st.preset = null; sync(); render(); });
    ctr.appendChild(h('div', { class: 'field eg-check' }, [cap, h('label', { for: capId, text: 'Tope de 30 % por categoría' })]));
    body.appendChild(ctr);
    var bars = h('div', { class: 'eg-bars' }), stats = h('div', { class: 'sim-stats' }), note = h('p', { class: 'sim-note' });
    body.appendChild(h('div', { 'aria-live': 'polite' }, [bars, stats, note]));
    root.appendChild(h('p', { class: 'sim-foot', text: 'Seis categorías sintéticas con números elegidos para mostrar el mecanismo, no medidos en ninguna plataforma. El feed sale de un softmax sobre el puntaje de cada categoría.' }));

    function sync() {
      Object.keys(sliders).forEach(function (k) { sliders[k].inp.value = st.w[k]; sliders[k].out.textContent = F.num(st.w[k], 2); });
      cap.checked = !!st.cap;
      presets.querySelectorAll('button').forEach(function (b, i) { b.setAttribute('aria-pressed', PRESETS[i].id === st.preset ? 'true' : 'false'); });
    }
    function render() {
      var r = core.run(st.w, st.cap ? 0.3 : 0);
      bars.innerHTML = '';
      CATS.forEach(function (c, i) {
        var pct = r.p[i] * 100;
        bars.appendChild(h('div', { class: 'eg-row' }, [
          h('span', { class: 'eg-name' }, [c.name, c.reg >= 0.2 ? h('small', { class: 'eg-flag', text: ' · arrepentimiento ' + F.num(c.reg * 100, 0) + ' %' }) : '']),
          h('span', { class: 'eg-track' }, [h('span', { class: 'eg-fill eg-fill--' + (c.reg >= 0.2 ? 'bad' : 'ok'), style: 'width:' + Math.max(0.5, pct).toFixed(1) + '%' })]),
          h('span', { class: 'eg-pct', text: F.num(pct, 0) + ' %' })
        ]));
      });
      stats.innerHTML = '';
      stats.appendChild(stat('Minutos por sesión de 20 ítems', F.num(r.min, 1)));
      stats.appendChild(stat('"Me gustó verlo"', F.num(r.sat * 100, 0) + ' %'));
      stats.appendChild(stat('"Preferiría no haberlo visto"', F.num(r.reg * 100, 0) + ' %'));
      stats.appendChild(stat('"No me interesa" cada 100 ítems', F.num(r.nmi * 100, 1)));
      var p = PRESETS.filter(function (x) { return x.id === st.preset; })[0];
      note.textContent = p ? p.note : 'Pesos a mano. Las barras en naranja son las categorías con mucho arrepentimiento (20 % o más): mira cuánto del feed ocupan según el objetivo.';
    }
    sync(); render();
  }

  SD.ready(function () { document.querySelectorAll('[data-sim="engage"]').forEach(init); });
})();
