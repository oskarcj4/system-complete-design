/* Widget del M70 (modelos open weights y serving propio):
   <div data-calc="localfit">  un modelo (denso o MoE), una cuantización, un contexto y una GPU:
   memoria de los pesos, del KV cache y del resto, si entra, y la cota de tokens por segundo del decode. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h, F = SD.fmt;

  /* Configuraciones publicadas (config.json de cada modelo en Hugging Face).
     kv = bytes de KV cache por token en 16 bits: 2 × capas × cabezas KV × dim de cabeza × 2 B,
     o (kv_lora_rank + qk_rope_head_dim) × capas × 2 B en los modelos con MLA (DeepSeek y Kimi). */
  var MODELS = {
    q30: { name: 'Qwen3-30B-A3B (MoE)', total: 30.5, active: 3.3, kv: 2 * 48 * 4 * 128 * 2 },
    q32: { name: 'Qwen3-32B (denso)', total: 32.8, active: 32.8, kv: 2 * 64 * 8 * 128 * 2 },
    q235: { name: 'Qwen3-235B-A22B (MoE)', total: 235, active: 22, kv: 2 * 94 * 4 * 128 * 2 },
    ds3: { name: 'DeepSeek-V3 (MoE, MLA)', total: 671, active: 37, kv: (512 + 64) * 61 * 2 },
    k2: { name: 'Kimi K2 (MoE, MLA)', total: 1000, active: 32, kv: (512 + 64) * 61 * 2 }
  };
  var QUANTS = {
    bf16: { name: 'BF16 (16 bits)', bpw: 16 },
    q8: { name: 'Q8_0 (unos 8.5 bits)', bpw: 8.5 },
    fp8: { name: 'FP8 (8 bits)', bpw: 8 },
    q4: { name: 'Q4_K_M (unos 4.8 bits)', bpw: 4.8 }
  };
  var KVT = { f16: { name: 'KV en 16 bits', f: 1 }, q8: { name: 'KV en q8_0', f: 0.5 } };
  var GPUS = {
    g4090: { name: 'Una RTX 4090 (24 GB, 1 008 GB/s)', mem: 24, bw: 1008 },
    g5090: { name: 'Una RTX 5090 (32 GB, 1 792 GB/s)', mem: 32, bw: 1792 },
    h100: { name: 'Una H100 (80 GB, 3 350 GB/s)', mem: 80, bw: 3350 },
    h100x8: { name: 'Ocho H100 (640 GB en total)', mem: 640, bw: 8 * 3350 }
  };
  var PRESETS = {
    agente: { name: 'Agente en una 4090', v: { m: 'q30', q: 'q4', kvt: 'f16', ctx: 32768, g: 'g4090', extra: 1.5 } },
    kvq8: { name: 'Mismo, KV en q8_0', v: { m: 'q30', q: 'q4', kvt: 'q8', ctx: 32768, g: 'g4090', extra: 1.5 } },
    denso: { name: 'Denso de 32B', v: { m: 'q32', q: 'q4', kvt: 'f16', ctx: 32768, g: 'g4090', extra: 1.5 } },
    kimi: { name: 'Kimi K2 en 8 H100', v: { m: 'k2', q: 'fp8', kvt: 'f16', ctx: 131072, g: 'h100x8', extra: 40 } }
  };

  var localCore = {
    fit: function (m, bpw, kvf, ctx, gpu, extra) {
      var pesos = m.total * 1e9 * bpw / 8 / 1e9;          // GB
      var kv = m.kv * kvf * ctx / 1e9;                      // GB, una conversación
      var total = pesos + kv + extra;
      var leidos = m.active * 1e9 * bpw / 8 / 1e9;          // GB que se leen por token en el decode
      return { pesos: pesos, kv: kv, total: total, entra: total <= gpu.mem, libre: gpu.mem - total,
        leidos: leidos, tps: leidos > 0 ? gpu.bw / leidos : 0, conv: kv > 0 ? Math.floor(Math.max(0, gpu.mem - pesos - extra) / kv) : 0 };
    }
  };
  SD.localCore = localCore;

  function sel(label, map, id) {
    var s = h('select', { id: id });
    Object.keys(map).forEach(function (k) { s.appendChild(h('option', { value: k, text: map[k].name })); });
    return { el: h('div', { class: 'field' }, [h('label', { for: id, text: label }), s]), input: s };
  }
  function num(label, id, step, hint) {
    var i = h('input', { id: id, type: 'number', min: 0, step: step, inputmode: 'decimal' });
    var kids = [h('label', { for: id, text: label }), i];
    if (hint) kids.push(h('p', { class: 'field-hint', text: hint }));
    return { el: h('div', { class: 'field' }, kids), input: i };
  }

  var uid = 0;
  function initFit(host) {
    var p = 'lf' + (++uid) + '-';
    var f = {
      m: sel('Modelo', MODELS, p + 'm'),
      q: sel('Cuantización de los pesos', QUANTS, p + 'q'),
      kvt: sel('Tipo del KV cache', KVT, p + 'k'),
      ctx: num('Contexto de una conversación (tokens)', p + 'c', 1024, 'Un agente de código necesita decenas de miles.'),
      g: sel('Hardware', GPUS, p + 'g'),
      extra: num('Resto: buffers y runtime (GB)', p + 'e', 0.5, 'Supuesto: mídelo con nvidia-smi u ollama ps.')
    };
    function out(label, formula) {
      var v = h('output', { class: 'out-value' });
      return { el: h('div', { class: 'out-row' }, [h('span', { class: 'out-label', text: label }), v, h('span', { class: 'out-formula', text: formula })]), v: v };
    }
    var o = {
      pesos: out('Pesos', 'parámetros totales × bits por peso ÷ 8'),
      kv: out('KV cache de una conversación', 'bytes por token × contexto'),
      total: out('Memoria total', 'pesos + KV + resto'),
      conv: out('Conversaciones de ese largo que caben', '(memoria − pesos − resto) ÷ KV de una'),
      tps: out('Cota de tokens por segundo (decode, una)', 'ancho de banda ÷ bytes de los parámetros activos')
    };
    var note = h('p', { class: 'sim-note', 'aria-live': 'polite' });
    var presets = h('div', { class: 'calc-presets', role: 'group', 'aria-label': 'Ejemplos' });
    function set(k) {
      var v = PRESETS[k].v;
      f.m.input.value = v.m; f.q.input.value = v.q; f.kvt.input.value = v.kvt; f.g.input.value = v.g;
      f.ctx.input.value = v.ctx; f.extra.input.value = v.extra;
      presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
      run();
    }
    Object.keys(PRESETS).forEach(function (k) {
      var b = h('button', { type: 'button', class: 'chip-btn', 'aria-pressed': 'false', 'data-k': k, text: PRESETS[k].name });
      b.addEventListener('click', function () { set(k); });
      presets.appendChild(b);
    });
    function run() {
      var m = MODELS[f.m.input.value], g = GPUS[f.g.input.value];
      var ctx = Math.max(0, Math.round(parseFloat(f.ctx.input.value) || 0));
      var extra = Math.max(0, parseFloat(f.extra.input.value) || 0);
      var r = localCore.fit(m, QUANTS[f.q.input.value].bpw, KVT[f.kvt.input.value].f, ctx, g, extra);
      o.pesos.v.textContent = F.num(r.pesos, 1) + ' GB';
      o.kv.v.textContent = F.num(r.kv, 2) + ' GB';
      o.total.v.textContent = F.num(r.total, 1) + ' GB de ' + F.num(g.mem, 0) + (r.entra ? ' (entra)' : ' (no entra)');
      o.conv.v.textContent = F.num(r.conv, 0);
      o.tps.v.textContent = r.entra ? 'hasta ' + F.num(r.tps, 0) + ' tokens/s' : 'no aplica';
      var msg = [];
      if (!r.entra) msg.push('No entra: faltan ' + F.num(-r.libre, 1) + ' GB. Bajar la cuantización recorta los pesos; bajar el contexto o pasar el KV a q8_0 recorta el KV. Si el servidor descarga capas a la CPU, el modelo corre, pero el decode cae al ancho de banda de la RAM.');
      else if (r.libre < 2) msg.push('Entra justo: quedan ' + F.num(r.libre, 1) + ' GB. Un contexto más largo o una segunda conversación ya no caben.');
      else msg.push('Entra con ' + F.num(r.libre, 1) + ' GB libres.');
      if (m.total !== m.active) msg.push('Es un MoE: la memoria la deciden los ' + F.num(m.total, 1) + ' mil millones de parámetros totales, la velocidad, los ' + F.num(m.active, 1) + ' activos.');
      msg.push('La cota de velocidad supone que leer los pesos activos es lo único que limita; la real es menor.');
      note.textContent = msg.join(' ');
    }
    ['m', 'q', 'kvt', 'g', 'ctx', 'extra'].forEach(function (k) {
      f[k].input.addEventListener(f[k].input.tagName === 'SELECT' ? 'change' : 'input', function () {
        presets.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        run();
      });
    });
    var inCol = h('div', { class: 'calc-inputs' }, [presets, f.m.el, f.q.el, f.kvt.el, f.ctx.el, f.g.el, f.extra.el]);
    var outCol = h('div', { class: 'calc-outputs', 'aria-live': 'polite' }, Object.keys(o).map(function (k) { return o[k].el; }).concat([note]));
    host.classList.add('calc');
    host.appendChild(h('div', { class: 'calc-head' }, [h('p', { class: 'calc-title', text: '¿Entra este modelo en esta GPU?' })]));
    host.appendChild(h('div', { class: 'calc-body' }, [inCol, outCol]));
    host.appendChild(h('p', { class: 'calc-foot', text: 'Parámetros y forma del KV cache tomados de la configuración publicada de cada modelo. Los bits por peso de Q4_K_M y Q8_0 son aproximados, y el resto (buffers de cómputo, runtime) es un supuesto. GB de 10^9 bytes. Ocho GPUs se tratan como una sola memoria, sin el costo de repartir el modelo.' }));
    set('agente');
  }

  SD.ready(function () {
    document.querySelectorAll('[data-calc="localfit"]').forEach(initFit);
  });
})();
