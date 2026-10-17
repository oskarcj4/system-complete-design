/* Ejercicios guiados: un escenario de diseño que se resuelve decisión por decisión.
   <div data-exercise="m06-planificador"></div> + SD.defineExercise('m06-planificador', {
     title, scenario (HTML), steps: [preguntas con el formato del quiz: single | multi | order], solution (HTML) })
   Cada decisión muestra su explicación al responderla; la siguiente aparece cuando el lector quiere seguir.
   Al final se muestra la solución de referencia completa, que también se puede abrir en cualquier momento.
   No cuenta para el checkpoint ni se guarda en el progreso. Necesita core/quiz.js (SD.quizKit).
   kind: 'predict' lo vuelve un «Predice la salida» (tutoriales de IA): una o dos preguntas sobre lo que va a imprimir
   un comando, antes de correrlo. Cambian los textos y solution es opcional. */
(function () {
  'use strict';

  var SD = window.SD;
  var h = SD.h;

  function render(host, id) {
    var ex = SD.data.exercises && SD.data.exercises[id];
    host.innerHTML = '';
    if (!ex || !SD.quizKit) {
      console.warn('[SD ejercicio] no existe el ejercicio', id);
      return;
    }
    var html = SD.quizKit.html, n = ex.steps.length, results = [];
    var predict = ex.kind === 'predict';
    var word = predict ? ['pregunta', 'preguntas'] : ['decisión', 'decisiones'];
    var titleId = 'gx-' + id;
    host.classList.add('gx');
    if (predict) host.classList.add('gx--predict');
    host.setAttribute('role', 'group');
    host.setAttribute('aria-labelledby', titleId);

    host.appendChild(h('p', { class: 'gx-title', id: titleId, text: (predict ? 'Predice la salida: ' : 'Ejercicio guiado: ') + ex.title }));
    host.appendChild(h('p', {
      class: 'gx-meta',
      text: predict
        ? 'Antes de correrlo, elige lo que crees que va a aparecer. Al responder, ves por qué.'
        : n + ' decisiones. Cada una explica su porqué al responderla, y al final está la solución completa.'
    }));
    host.appendChild(html('div', 'gx-scenario', ex.scenario));
    var list = h('ol', { class: 'gx-steps' });
    host.appendChild(list);
    var summary = h('div', { class: 'gx-summary', hidden: true, role: 'status' });
    host.appendChild(summary);
    var sol = null;
    if (ex.solution) {
      sol = h('details', { class: 'gx-solution' }, [h('summary', { text: predict ? 'Ver qué aparece y por qué' : 'Ver la solución de referencia' })]);
      sol.appendChild(html('div', 'gx-solution-body', ex.solution));
      host.appendChild(sol);
    }

    function showStep(i) {
      var q = ex.steps[i], type = q.type || 'single';
      var li = h('li', { class: 'q gx-step', 'data-type': type });
      var hint = type === 'multi' ? ' Elige todas las correctas.' : type === 'order' ? ' Ordena de primero a último.' : '';
      var label = word[0].charAt(0).toUpperCase() + word[0].slice(1);
      var qnum = ((n > 1 || !predict ? label + ' ' + (i + 1) + ' de ' + n + '.' : '') + hint).trim();
      if (qnum) li.appendChild(h('p', { class: 'q-num', text: qnum }));
      var prompt = html('p', 'q-prompt', q.prompt);
      prompt.setAttribute('tabindex', '-1');
      li.appendChild(prompt);
      var done = function (ok) {
        results[i] = ok;
        if (i + 1 < n) {
          var next = h('button', { type: 'button', class: 'btn gx-next', text: 'Siguiente ' + word[0] });
          next.addEventListener('click', function () { next.remove(); showStep(i + 1); });
          li.appendChild(next);
        } else {
          finish();
        }
      };
      if (type === 'order') SD.quizKit.order(q, li, done); else SD.quizKit.choice(q, li, done);
      list.appendChild(li);
      if (i > 0) prompt.focus();
    }

    function finish() {
      var ok = results.filter(Boolean).length;
      summary.hidden = false;
      summary.innerHTML = '';
      summary.appendChild(h('p', {
        class: 'gx-score',
        text: predict
          ? ok + ' de ' + n + (n === 1 ? ' predicción acertada' : ' predicciones acertadas')
          : ok + ' de ' + n + (n === 1 ? ' decisión coincide' : ' decisiones coinciden') + ' con la solución de referencia'
      }));
      summary.appendChild(h('p', {
        class: 'gx-verdict',
        text: predict
          ? (ok === n
            ? 'Leíste bien el código. Ahora córrelo y compara con lo que sale en tu terminal.'
            : 'Vuelve a la marca del código que explica esa parte, y después córrelo para verlo.')
          : (ok === n
            ? 'Tomaste las mismas decisiones que la referencia. Léela igual: los detalles de implementación también cuentan.'
            : 'Vuelve a leer las explicaciones de las decisiones que no coincidieron, y después la solución completa.')
      }));
      summary.appendChild(h('button', {
        type: 'button', class: 'btn btn--ghost', text: 'Empezar de nuevo',
        onclick: function () {
          render(host, id);
          host.scrollIntoView({ block: 'start' });
          var first = host.querySelector('.opt, .icon-btn');
          if (first) first.focus({ preventScroll: true });
        }
      }));
      if (sol) sol.open = true;
    }

    showStep(0);
  }

  SD.ready(function () {
    document.querySelectorAll('[data-exercise]').forEach(function (el) { render(el, el.getAttribute('data-exercise')); });
  });
})();
