/* Widgets del M63 (tool calling por dentro):
   <div data-sim="toolfmt">      la misma llamada a herramienta en cinco formatos: dos dialectos de API y tres chat templates
   <div data-sim="constrained">  decodificación restringida paso a paso: qué propone el modelo, qué deja pasar la gramática */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  /* ---------- toolfmt ---------- */

  var CASES = {
    una: { name: 'Una llamada' },
    dos: { name: 'Dos en paralelo' },
    error: { name: 'Resultado con error' }
  };

  var RES_OK = '1  import os\\n2  def main():\\n3      ...';
  var RES_ERR = 'Error: no existe src/app.py';

  /* Cada formato devuelve { text, notes } para un caso. Los textos de los templates son los de los
     tokenizer_config.json publicados, con el system prompt abreviado. */
  var FORMATS = {
    anthropic: {
      name: 'Anthropic (Messages)',
      render: function (c) {
        var calls = ['    {"type": "tool_use", "id": "toolu_01A", "name": "leer_archivo",\n     "input": {"ruta": "src/app.py"}}'];
        var res = ['    {"type": "tool_result", "tool_use_id": "toolu_01A",\n     "content": "' + (c === 'error' ? RES_ERR + '",\n     "is_error": true}' : RES_OK + '"}')];
        if (c === 'dos') {
          calls.push('    {"type": "tool_use", "id": "toolu_01B", "name": "buscar",\n     "input": {"patron": "def main"}}');
          res.push('    {"type": "tool_result", "tool_use_id": "toolu_01B",\n     "content": "src/app.py:2"}');
        }
        return '// Respuesta del modelo (stop_reason: "tool_use")\n{"role": "assistant", "content": [\n    {"type": "text", "text": "Voy a leer el archivo."},\n' +
          calls.join(',\n') + '\n]}\n\n// Lo que manda el harness después: los resultados van en un mensaje user\n{"role": "user", "content": [\n' + res.join(',\n') + '\n]}';
      },
      notes: {
        una: 'Los argumentos llegan como objeto JSON en input. El resultado vuelve en un mensaje con rol user, dentro de un bloque tool_result que nombra el id de la llamada.',
        dos: 'Las dos llamadas van en el mismo turno, como dos bloques tool_use. Los dos resultados vuelven juntos en un solo mensaje user, y los tool_result van primero en su contenido.',
        error: 'is_error: true le dice al modelo que la herramienta falló. Es un campo propio: OpenAI no tiene equivalente.'
      }
    },
    openai: {
      name: 'OpenAI (Chat Completions)',
      render: function (c) {
        var calls = ['    {"id": "call_7f", "type": "function",\n     "function": {"name": "leer_archivo", "arguments": "{\\"ruta\\": \\"src/app.py\\"}"}}'];
        var res = ['{"role": "tool", "tool_call_id": "call_7f", "content": "' + (c === 'error' ? RES_ERR : RES_OK) + '"}'];
        if (c === 'dos') {
          calls.push('    {"id": "call_8a", "type": "function",\n     "function": {"name": "buscar", "arguments": "{\\"patron\\": \\"def main\\"}"}}');
          res.push('{"role": "tool", "tool_call_id": "call_8a", "content": "src/app.py:2"}');
        }
        return '// Respuesta del modelo (finish_reason: "tool_calls")\n{"role": "assistant", "content": "Voy a leer el archivo.", "tool_calls": [\n' +
          calls.join(',\n') + '\n]}\n\n// Un mensaje con rol tool por cada llamada\n' + res.join('\n');
      },
      notes: {
        una: 'Los argumentos llegan como un string que contiene JSON: hay que hacer json.loads, y puede venir mal formado. Cada resultado es un mensaje propio con rol tool.',
        dos: 'Dos entradas en tool_calls y dos mensajes tool, uno por id. parallel_tool_calls: false limita el turno a una llamada.',
        error: 'No hay campo de error: el fallo se escribe en el texto del content. Un traductor desde Anthropic tiene que convertir is_error en texto.'
      }
    },
    qwen: {
      name: 'Qwen (texto del template)',
      render: function (c) {
        var call = '<tool_call>\n{"name": "leer_archivo", "arguments": {"ruta": "src/app.py"}}\n</tool_call>';
        var res = '<tool_response>\n' + (c === 'error' ? RES_ERR : RES_OK).replace(/\\n/g, '\n') + '\n</tool_response>';
        if (c === 'dos') {
          call += '\n<tool_call>\n{"name": "buscar", "arguments": {"patron": "def main"}}\n</tool_call>';
          res += '\n<tool_response>\nsrc/app.py:2\n</tool_response>';
        }
        return '<|im_start|>system\n…\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>\n{"type": "function", "function": {"name": "leer_archivo", …}}\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags: …<|im_end|>\n<|im_start|>user\nLee src/app.py<|im_end|>\n<|im_start|>assistant\nVoy a leer el archivo.\n' +
          call + '<|im_end|>\n<|im_start|>user\n' + res + '<|im_end|>\n<|im_start|>assistant\n';
      },
      notes: {
        una: 'Esto es lo que el modelo lee y escribe de verdad: texto. Las herramientas viajan dentro del system prompt, y la llamada es un JSON entre etiquetas <tool_call>. El servidor (vLLM con --tool-call-parser hermes, Ollama) la busca y la convierte en tool_calls.',
        dos: 'Dos llamadas son dos bloques <tool_call> seguidos. Los resultados vuelven en un turno user con un <tool_response> por llamada, en el mismo orden: este formato no tiene ids.',
        error: 'El template no distingue un error de un resultado: el texto del error es todo lo que el modelo ve.'
      }
    },
    llama: {
      name: 'Llama 3.1 (texto)',
      render: function (c) {
        var call = '{"name": "leer_archivo", "parameters": {"ruta": "src/app.py"}}';
        var res = '<|start_header_id|>ipython<|end_header_id|>\n\n' + (c === 'error' ? RES_ERR : RES_OK).replace(/\\n/g, '\n') + '<|eot_id|>';
        if (c === 'dos') {
          call += '<|eot_id|>\n  (el template de Llama 3.1 espera una llamada por turno:\n   la segunda llega en el turno siguiente)';
        } else {
          call += '<|eot_id|>';
        }
        return '<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nEnvironment: ipython\n…<|eot_id|><|start_header_id|>user<|end_header_id|>\n\nGiven the following functions, please respond with a JSON for a function call …\n{"type": "function", "function": {"name": "leer_archivo", …}}\n\nLee src/app.py<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n' +
          call + '\n' + res + '<|start_header_id|>assistant<|end_header_id|>\n\n';
      },
      notes: {
        una: 'La llamada es un JSON suelto con la clave parameters (no arguments), y el resultado vuelve con un rol propio, ipython. Las herramientas definidas por ti van en el mensaje del usuario.',
        dos: 'El template de Llama 3.1 está pensado para una llamada por turno. Si tu harness espera varias en paralelo, con este modelo llegan de a una y la tarea tarda más turnos.',
        error: 'Como en Qwen, el error es solo texto en el turno ipython.'
      }
    },
    kimi: {
      name: 'Kimi K2 (texto)',
      render: function (c) {
        var calls = '<|tool_call_begin|>functions.leer_archivo:0<|tool_call_argument_begin|>{"ruta": "src/app.py"}<|tool_call_end|>';
        var res = '{"role": "tool", "tool_call_id": "functions.leer_archivo:0", "name": "leer_archivo",\n "content": "' + (c === 'error' ? RES_ERR : RES_OK) + '"}';
        if (c === 'dos') {
          calls += '\n<|tool_call_begin|>functions.buscar:1<|tool_call_argument_begin|>{"patron": "def main"}<|tool_call_end|>';
          res += '\n{"role": "tool", "tool_call_id": "functions.buscar:1", "name": "buscar", "content": "src/app.py:2"}';
        }
        return '<|im_assistant|>assistant<|im_middle|>Voy a leer el archivo.<|tool_calls_section_begin|>\n' + calls +
          '\n<|tool_calls_section_end|><|im_end|>\n\n// Los resultados se mandan como mensajes tool (el template los convierte en texto)\n' + res;
      },
      notes: {
        una: 'Kimi usa tokens especiales para cada borde: abrir la sección, abrir una llamada, separar el id de los argumentos, cerrar. El id lleva el nombre y un índice: functions.leer_archivo:0.',
        dos: 'Varias llamadas van dentro de la misma sección, cada una con su índice. Un parser que no conoce estos tokens deja todo como texto.',
        error: 'El error es el content del mensaje tool; el modelo lo lee como cualquier resultado.'
      }
    }
  };

  function chips(label, dict, cur, onPick) {
    var g = h('div', { class: 'calc-presets', role: 'group', 'aria-label': label });
    Object.keys(dict).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': k === cur ? 'true' : 'false', text: dict[k].name });
      b.addEventListener('click', function () {
        g.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(k);
      });
      g.appendChild(b);
    });
    return g;
  }

  function initFmt(host) {
    host.classList.add('sim');
    var fk = 'anthropic', ck = 'una';
    var pre = h('pre', { class: 'tc-pre', tabindex: '0' }, [h('code')]);
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });
    function run() {
      var f = FORMATS[fk];
      pre.firstChild.textContent = f.render(ck);
      note.textContent = f.notes[ck];
    }
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'La misma llamada, cinco formatos' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls tc-controls' }, [
        h('div', { class: 'tc-field' }, [h('span', { class: 'tc-label', text: 'Formato' }), chips('Formato', FORMATS, fk, function (k) { fk = k; run(); })]),
        h('div', { class: 'tc-field' }, [h('span', { class: 'tc-label', text: 'Caso' }), chips('Caso', CASES, ck, function (k) { ck = k; run(); })])
      ]),
      pre, note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Los dos primeros son JSON de la API; los otros tres, el texto que el servidor arma con el chat template del modelo (system prompt abreviado con …). Los templates cambian entre versiones de un mismo modelo: el que vale es el del tokenizer_config.json que sirves.' }));
    run();
  }

  /* ---------- constrained ---------- */

  /* Esquema: {"ruta": string, "modo": "leer" | "contar"}, los dos obligatorios, sin campos extra.
     Probabilidades inventadas para el ejemplo; lo que se respeta es qué deja pasar la gramática. */
  var STEPS = [
    { why: 'Empieza el objeto. Un texto amable o un bloque de Markdown no son JSON: la máscara los anula.',
      c: [['{"', 55, 1], ['Claro', 25, 0], ['```json', 14, 0], ['{', 6, 1]] },
    { why: 'Las claves posibles son ruta y modo. path no está en el esquema y additionalProperties es false.',
      c: [['ruta', 70, 1], ['path', 18, 0], ['modo', 12, 1]] },
    { why: 'Después de una clave solo cabe cerrar la comilla y poner dos puntos.',
      c: [['":', 90, 1], ['_archivo', 10, 0]] },
    { why: 'ruta es un string: null o un arreglo no valen.',
      c: [[' "', 88, 1], [' null', 7, 0], [' [', 5, 0]] },
    { why: 'Dentro de un string casi todo vale: la gramática no sabe si la ruta existe.',
      c: [['src', 80, 1], ['/', 20, 1]] },
    { why: 'Sigue el string.',
      c: [['/app.py', 83, 1], ['/app', 17, 1]] },
    { why: 'Cerrar el objeto aquí dejaría afuera modo, que es obligatorio: "} queda enmascarado.',
      c: [['",', 90, 1], ['"}', 10, 0]] },
    { why: 'Espacio antes de la siguiente clave.',
      c: [[' "', 95, 1], ['\\n', 5, 1]] },
    { why: 'Queda una sola clave posible: modo. linea no existe en el esquema.',
      c: [['modo', 60, 1], ['linea', 40, 0]] },
    { why: 'Dos puntos y comilla.',
      c: [['": "', 100, 1]] },
    { why: 'Aquí se separan los caminos: el modelo prefiere editar, que no está en el enum. Sin restricción, sale una llamada inválida.',
      c: [['editar', 48, 0], ['leer', 41, 1], ['contar', 11, 1]] },
    { why: 'Cerrar el string y el objeto. Ya están las dos claves: ahora "} sí vale.',
      c: [['"}', 97, 1], ['",', 3, 0]] }
  ];

  function pick(cands, constrained) {
    var best = null;
    cands.forEach(function (x) {
      if (constrained && !x[2]) return;
      if (!best || x[1] > best[1]) best = x;
    });
    return best;
  }

  function initCons(host) {
    host.classList.add('sim');
    var on = true, i = 0;
    var out = h('pre', { class: 'tc-pre tc-out' }, [h('code')]);
    var list = h('ul', { class: 'tc-cands', 'aria-live': 'polite' });
    var why = h('p', { class: 'sim-note' });
    var verdict = h('p', { class: 'tc-verdict', 'aria-live': 'polite' });
    var stepLbl = h('span', { class: 'tc-step' });
    var bPrev = h('button', { type: 'button', class: 'btn', text: 'Anterior' });
    var bNext = h('button', { type: 'button', class: 'btn btn--primary', text: 'Siguiente token' });
    var bReset = h('button', { type: 'button', class: 'btn', text: 'Reiniciar' });
    var bMode = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': 'true', text: 'Con decodificación restringida' });

    function generated(n) {
      var s = '';
      for (var k = 0; k < n; k++) s += pick(STEPS[k].c, on)[0];
      return s;
    }
    function render() {
      var st = STEPS[Math.min(i, STEPS.length - 1)];
      out.firstChild.textContent = generated(i) + (i < STEPS.length ? '▌' : '');
      stepLbl.textContent = i < STEPS.length ? 'Token ' + (i + 1) + ' de ' + STEPS.length : 'Terminado';
      list.textContent = '';
      verdict.textContent = '';
      verdict.className = 'tc-verdict';
      if (i < STEPS.length) {
        var chosen = pick(st.c, on);
        st.c.forEach(function (x) {
          var masked = on && !x[2];
          var li = h('li', { class: 'tc-cand' + (masked ? ' is-masked' : '') + (x === chosen ? ' is-chosen' : '') }, [
            h('code', { text: x[0] }),
            h('span', { class: 'tc-bar' }, [h('span', { style: 'width:' + x[1] + '%' })]),
            h('span', { class: 'tc-p', text: x[1] + ' %' }),
            h('span', { class: 'tc-tag', text: x === chosen ? '✓ elegido' : (masked ? '✗ enmascarado' : (x[2] ? 'permitido' : 'fuera del esquema')) })
          ]);
          list.appendChild(li);
        });
        why.textContent = st.why;
      } else {
        why.textContent = '';
        var ok = generated(STEPS.length).indexOf('editar') < 0;
        verdict.textContent = ok ? '✓ La llamada cumple el esquema: el harness puede ejecutarla sin validar de nuevo la forma (sí el contenido).'
          : '✗ modo: "editar" no está en el enum. Sin restricción, la validación falla y hay que devolverle el error al modelo y pagar otro turno.';
        verdict.className = 'tc-verdict ' + (ok ? 'is-ok' : 'is-bad');
      }
      bPrev.disabled = i === 0;
      bNext.disabled = i >= STEPS.length;
    }
    bNext.addEventListener('click', function () { if (i < STEPS.length) { i++; render(); } });
    bPrev.addEventListener('click', function () { if (i > 0) { i--; render(); } });
    bReset.addEventListener('click', function () { i = 0; render(); });
    bMode.addEventListener('click', function () {
      on = !on;
      bMode.setAttribute('aria-pressed', on ? 'true' : 'false');
      bMode.textContent = on ? 'Con decodificación restringida' : 'Sin restricción';
      render();
    });

    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Decodificación restringida, token por token' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('p', { class: 'tc-schema' }, [h('code', { text: 'leer_archivo: {"ruta": string, "modo": "leer" | "contar"}, los dos obligatorios, additionalProperties: false' })]),
      h('div', { class: 'sim-controls tc-row' }, [bMode, stepLbl]),
      out, list, why, verdict,
      h('div', { class: 'tc-row' }, [bPrev, bNext, bReset])
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Las probabilidades son de ejemplo. Los tokens reales dependen del tokenizer del modelo y no coinciden con las piezas del JSON: el motor tiene que razonar sobre bytes, no sobre tokens.' }));
    render();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="toolfmt"]').forEach(initFmt);
    document.querySelectorAll('[data-sim="constrained"]').forEach(initCons);
  });
})();
