/* Widgets de la Parte VIII (AI Engineering):
   <div data-sim="stack">  arma una pila: un harness y un backend; muestra si hablan el mismo dialecto,
                           si hace falta un traductor, a dónde van tus datos y qué se configura.
   La lógica está en SD.harnessCore para poder probarla sin el DOM. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  var HARNESS = {
    cc: { name: 'Claude Code', speaks: ['anthropic'], note: 'Habla el dialecto de Anthropic (Messages). Se apunta a otro servidor con variables de entorno.' },
    codex: { name: 'Codex CLI', speaks: ['openai'], note: 'Habla el dialecto de OpenAI. Otros proveedores se declaran en model_providers de config.toml.' },
    opencode: { name: 'OpenCode', speaks: ['anthropic', 'openai'], note: 'Trae clientes para muchos proveedores: elige el dialecto según el proveedor.' },
    own: { name: 'Tu harness (SDK de OpenAI)', speaks: ['openai'], note: 'El harness de 40 líneas de 62.6: habla Chat Completions con cualquier base_url.' }
  };

  var BACKEND = {
    anthropic: { name: 'API de Anthropic', speaks: ['anthropic', 'openai'], where: 'Anthropic', local: false },
    moonA: { name: 'Moonshot /anthropic', speaks: ['anthropic'], where: 'Moonshot AI', local: false },
    moonO: { name: 'Moonshot /v1', speaks: ['openai'], where: 'Moonshot AI', local: false },
    openai: { name: 'API de OpenAI', speaks: ['openai'], where: 'OpenAI', local: false },
    ollama: { name: 'Ollama local', speaks: ['anthropic', 'openai'], where: 'tu máquina: nada sale', local: true },
    openrouter: { name: 'OpenRouter', speaks: ['openai'], where: 'OpenRouter y el proveedor al que enrute', local: false }
  };

  var DIAL = { anthropic: 'Anthropic (POST /v1/messages)', openai: 'OpenAI (POST /v1/chat/completions)' };

  var BASE = {
    anthropic: 'https://api.anthropic.com/v1/', moonO: 'https://api.moonshot.ai/v1', openai: 'https://api.openai.com/v1',
    ollama: 'http://localhost:11434/v1', openrouter: 'https://openrouter.ai/api/v1'
  };

  function config(hk, bk, mode) {
    if (mode === 'proxy') {
      return '# Un traductor en medio: recibe un dialecto y llama con el otro\n' +
        'litellm --model <proveedor>/<modelo> --port 4000\n\n' +
        (hk === 'cc'
          ? 'export ANTHROPIC_BASE_URL="http://localhost:4000"\nexport ANTHROPIC_AUTH_TOKEN="<clave del proxy>"\nclaude'
          : '# En config.toml, un model_provider con base_url = "http://localhost:4000"\n# (revisa wire_api en la referencia de tu versión de Codex)\ncodex');
    }
    if (hk === 'cc') {
      if (bk === 'anthropic') return 'claude          # /login con tu cuenta, o ANTHROPIC_API_KEY\n# /status muestra qué credencial está en uso';
      if (bk === 'moonA') return 'export ANTHROPIC_BASE_URL="https://api.moonshot.ai/anthropic"\nexport ANTHROPIC_AUTH_TOKEN="<clave de Moonshot>"\nexport ANTHROPIC_MODEL="<id del modelo en la consola>"\nunset ANTHROPIC_API_KEY\nclaude          # /status: URL base de Moonshot';
      if (bk === 'ollama') return 'ollama pull <modelo>\nexport ANTHROPIC_BASE_URL="http://localhost:11434"\nexport ANTHROPIC_AUTH_TOKEN="ollama"     # obligatorio, se ignora\nclaude --model <modelo>';
    }
    if (hk === 'codex') {
      if (bk === 'openai') return 'codex           # inicia sesión con tu cuenta, o OPENAI_API_KEY';
      if (bk === 'ollama') return 'codex --oss     # un modelo open weights servido por Ollama';
      return '# ~/.codex/config.toml\nmodel_provider = "' + bk + '"\nmodel = "<id del modelo>"\n\n[model_providers.' + bk + ']\nname = "' + BACKEND[bk].name + '"\nbase_url = "' + BASE[bk] + '"\nenv_key = "' + (bk === 'moonO' ? 'MOONSHOT' : 'OPENROUTER') + '_API_KEY"\n# revisa wire_api: Codex usa la Responses API de OpenAI';
    }
    if (hk === 'opencode') {
      if (bk === 'ollama') return '// opencode.json\n{\n  "provider": {\n    "ollama": {\n      "npm": "@ai-sdk/openai-compatible",\n      "options": { "baseURL": "http://localhost:11434/v1" },\n      "models": { "<modelo>": {} }\n    }\n  },\n  "model": "ollama/<modelo>"\n}';
      return 'opencode auth login     # elige ' + BACKEND[bk].name + ' y pega la clave\n// opencode.json\n{ "model": "<proveedor>/<modelo>" }';
    }
    if (hk === 'own') {
      if (bk === 'moonA') return '# Mismo proveedor, en el dialecto de tu SDK:\nclient = OpenAI(base_url="https://api.moonshot.ai/v1", api_key=os.environ["MOONSHOT_API_KEY"])';
      var key = { anthropic: 'os.environ["ANTHROPIC_API_KEY"]', moonO: 'os.environ["MOONSHOT_API_KEY"]', openai: 'os.environ["OPENAI_API_KEY"]', ollama: '"ollama"', openrouter: 'os.environ["OPENROUTER_API_KEY"]' }[bk];
      return 'client = OpenAI(base_url="' + BASE[bk] + '", api_key=' + key + ')' +
        (bk === 'anthropic' ? '\n# Capa de compatibilidad de Anthropic: sirve para probar,\n# pero no expone todo lo del dialecto nativo' : '');
    }
    return '';
  }

  function resolve(hk, bk) {
    var H = HARNESS[hk], B = BACKEND[bk];
    var common = H.speaks.filter(function (d) { return B.speaks.indexOf(d) >= 0; });
    var r = { harness: H, backend: B, dialect: null, mode: 'direct', where: B.where, local: B.local, warn: '' };
    if (hk === 'own' && bk === 'moonA') {
      r.mode = 'switch'; r.dialect = 'openai';
      r.warn = 'Tu SDK no habla el dialecto de Anthropic, pero el mismo proveedor ofrece /v1 en el de OpenAI: usa ese.';
    } else if (common.length) {
      r.dialect = common[0];
      if (hk === 'own' && bk === 'anthropic') { r.dialect = 'openai'; r.warn = 'Anthropic documenta una capa de compatibilidad con el SDK de OpenAI. Sirve para comparar modelos; para producción conviene el dialecto nativo.'; }
      if (hk === 'cc' && bk === 'ollama') r.warn = 'Ollama 0.14 o posterior habla Messages. Los modelos que caben en una GPU de consumo son agentes más flojos y el contexto por defecto puede quedar corto: Ollama recomienda al menos 32K.';
      if (hk === 'cc' && bk === 'moonA') r.warn = 'ANTHROPIC_AUTH_TOKEN se manda como Authorization: Bearer y en Claude Code gana sobre ANTHROPIC_API_KEY. El unset evita confusiones. Anthropic no da soporte a endpoints de terceros.';
      if (hk === 'codex' && (bk === 'moonO' || bk === 'openrouter')) { r.mode = 'check'; r.warn = 'Depende de qué parte del dialecto de OpenAI exponga el proveedor: Codex trabaja con la Responses API, y muchos proveedores compatibles solo ofrecen Chat Completions.'; }
    } else {
      r.mode = 'proxy'; r.dialect = H.speaks[0];
      r.warn = 'No comparten dialecto. Un proxy traductor como LiteLLM recibe ' + DIAL[H.speaks[0]].split(' (')[0] + ' y llama a ' + B.name + ' en ' + DIAL[B.speaks[0]].split(' (')[0] + '. Cada traducción puede perder campos (bloques de razonamiento, caché, herramientas del servidor).';
    }
    r.config = config(hk, bk, r.mode);
    return r;
  }

  SD.harnessCore = { HARNESS: HARNESS, BACKEND: BACKEND, resolve: resolve };

  var MODE = { direct: 'Directa', proxy: 'Con traductor', check: 'Verifica el dialecto', switch: 'Cambia de endpoint' };

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
    return h('div', { class: 'field hs-field' }, [h('span', { class: 'hs-label', text: label }), g]);
  }

  function drawPath(r) {
    var W = 720, H = 120, boxes = [
      ['Interfaz', 'terminal o IDE', 'client'],
      ['Harness', r.harness.name, 'service'],
      [r.mode === 'proxy' ? 'Traductor' : 'Dialecto', r.mode === 'proxy' ? 'LiteLLM' : (r.dialect === 'anthropic' ? 'Messages' : 'Chat Completions'), r.mode === 'proxy' ? 'queue' : 'edge'],
      ['Servidor', r.backend.name, r.local ? 'db' : 'external'],
      ['Pesos', r.local ? 'en tu GPU o RAM' : 'en la nube', 'gpu']
    ];
    var bw = 124, gap = (W - bw * 5) / 4, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Camino de una request: interfaz, harness, dialecto o traductor, servidor y pesos">';
    s += '<defs><marker id="hsa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" class="dg-arrow"/></marker></defs>';
    boxes.forEach(function (b, i) {
      var x = i * (bw + gap);
      s += '<rect class="dg-layer" style="--c: var(--l-' + b[2] + ')" x="' + x + '" y="30" width="' + bw + '" height="56" rx="8"/>';
      s += '<text class="dg-small" x="' + (x + bw / 2) + '" y="54" text-anchor="middle">' + SD.escape(b[0]) + '</text>';
      s += '<text class="dg-tiny" x="' + (x + bw / 2) + '" y="72" text-anchor="middle">' + SD.escape(b[1].length > 20 ? b[1].slice(0, 19) + '…' : b[1]) + '</text>';
      if (i < 4) s += '<path class="dg-edge" d="M' + (x + bw + 2) + ' 58 L' + (x + bw + gap - 3) + ' 58" marker-end="url(#hsa)"/>';
    });
    s += '<text class="dg-tiny" x="0" y="16">Lo que corre en tu máquina</text>';
    s += '<path class="dg-feedback" d="M0 100 L' + (r.local ? W : 2 * (bw + gap) + bw) + ' 100"/>';
    s += '<text class="dg-tiny" x="0" y="114">' + (r.local ? 'Todo local: el código no sale' : 'Hasta aquí es local; a la derecha, tu código viaja al proveedor') + '</text>';
    return s + '</svg>';
  }

  function initStack(host) {
    var hk = 'cc', bk = 'moonA';
    var path = h('div', { class: 'sim-scroll hs-path' });
    var stats = h('div', { class: 'sim-stats', 'aria-live': 'polite' });
    var pre = h('pre', { 'data-lang': 'shell' }, [h('code')]);
    var note = h('p', { class: 'sim-note' });
    function run() {
      var r = resolve(hk, bk);
      path.innerHTML = drawPath(r);
      stats.innerHTML = '';
      [['Conexión', MODE[r.mode]], ['Dialecto', r.dialect === 'anthropic' ? 'Anthropic' : 'OpenAI'], ['Tu código va a', r.where]].forEach(function (x) {
        stats.appendChild(h('div', { class: 'sim-stat' }, [h('span', { text: x[0] }), h('b', { text: x[1] })]));
      });
      pre.firstChild.textContent = r.config;
      note.textContent = r.harness.note + ' ' + r.warn;
    }
    host.classList.add('sim');
    host.appendChild(h('div', { class: 'sim-head' }, [h('p', { class: 'sim-title', text: 'Arma tu pila: un harness y un servidor' })]));
    host.appendChild(h('div', { class: 'sim-body' }, [
      h('div', { class: 'sim-controls' }, [
        chips('Harness', HARNESS, hk, function (k) { hk = k; run(); }),
        chips('Servidor', BACKEND, bk, function (k) { bk = k; run(); })
      ]),
      path, stats, pre, note
    ]));
    host.appendChild(h('p', { class: 'sim-foot', text: 'Diseño de referencia con la documentación de octubre de 2026. Los ids de modelo, los flags y las claves de configuración cambian entre versiones: confírmalos con --help y con la documentación de tu versión.' }));
    run();
  }

  SD.ready(function () {
    document.querySelectorAll('[data-sim="stack"]').forEach(initStack);
  });
})();
