/* Simuladores paso a paso de M39 (manejo de pagos):
     <div data-sim="seatrace"></div>  dos transacciones quieren el mismo asiento, con seis estrategias
     <div data-sim="idemkey"></div>   la fila de idempotency_keys ante cinco situaciones
     <div data-sim="whinbox"></div>   el inbox de webhooks ante duplicados, desorden, firmas falsas y lentitud
   Los tres usan el mismo motor: cada escenario tiene carriles (columnas), pasos (filas) y un veredicto.
   Las filas aparecen de a una; la nota del paso actual se anuncia con aria-live. Sin animaciones. */
(function () {
  'use strict';
  var SD = window.SD, h = SD.h;

  /* Celda: 'texto' o ['texto', 'ok' | 'bad' | 'warn']. Paso: { c: [celda, …], n: 'nota' }. */
  function cell(c) { return typeof c === 'string' ? { t: c, k: '' } : { t: c[0] || '', k: c[1] || '' }; }

  function build(root, cfg) {
    var state = { sc: 0, step: 0 };
    var chips = h('div', { 'class': 'pay-chips', role: 'group', 'aria-label': cfg.pick });
    var desc = h('p', { 'class': 'pay-desc' });
    var codeHost = h('div', { 'class': 'pay-code' });
    var table = h('table', { 'class': 't pay-table' });
    var note = h('p', { 'class': 'pay-note', 'aria-live': 'polite' });
    var verdict = h('div', { 'class': 'pay-verdict', 'aria-live': 'polite' });
    var counter = h('span', { 'class': 'pay-count' });
    var bPrev = h('button', { 'class': 'btn', type: 'button', text: 'Anterior', onclick: function () { go(state.step - 1); } });
    var bNext = h('button', { 'class': 'btn btn--primary', type: 'button', text: 'Siguiente paso', onclick: function () { go(state.step + 1); } });
    var bAll = h('button', { 'class': 'btn', type: 'button', text: 'Ver todo', onclick: function () { go(cfg.scenarios[state.sc].steps.length - 1); } });
    var bReset = h('button', { 'class': 'btn', type: 'button', text: 'Reiniciar', onclick: function () { go(0); } });

    cfg.scenarios.forEach(function (sc, i) {
      chips.appendChild(h('button', {
        'class': 'chip-btn', type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false', text: sc.label,
        onclick: function () { pick(i); }
      }));
    });

    function pick(i) {
      state.sc = i; state.step = 0;
      chips.querySelectorAll('.chip-btn').forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      var sc = cfg.scenarios[i];
      desc.innerHTML = sc.desc;
      codeHost.textContent = '';
      if (sc.code) {
        var pre = h('pre', { 'data-lang': sc.lang || 'sql' }, [h('code', { text: sc.code })]);
        codeHost.appendChild(pre);
        if (SD.highlight) SD.highlight(codeHost);
      }
      table.textContent = '';
      var head = h('tr', null, [h('th', { text: '#' })].concat(cfg.lanes.map(function (l) { return h('th', { text: l }); })));
      table.appendChild(h('thead', null, [head]));
      var body = h('tbody');
      sc.steps.forEach(function (st, k) {
        var tr = h('tr', { 'data-k': k }, [h('td', { 'class': 'r', text: String(k + 1) })]);
        st.c.forEach(function (c) {
          var x = cell(c);
          tr.appendChild(h('td', { 'class': x.k ? 'is-' + x.k : null, text: x.t }));
        });
        body.appendChild(tr);
      });
      table.appendChild(body);
      render();
    }

    function go(k) {
      var n = cfg.scenarios[state.sc].steps.length;
      state.step = Math.max(0, Math.min(n - 1, k));
      render();
    }

    function render() {
      var sc = cfg.scenarios[state.sc], n = sc.steps.length;
      table.querySelectorAll('tbody tr').forEach(function (tr, k) {
        tr.hidden = k > state.step;
        tr.classList.toggle('pay-cur', k === state.step);
      });
      note.textContent = sc.steps[state.step].n || '';
      counter.textContent = 'Paso ' + (state.step + 1) + ' de ' + n;
      bPrev.disabled = state.step === 0;
      bNext.disabled = state.step === n - 1;
      verdict.textContent = '';
      verdict.className = 'pay-verdict';
      if (state.step === n - 1) {
        var v = sc.verdict;
        verdict.className = 'pay-verdict is-' + v.k;
        verdict.appendChild(h('b', { text: { ok: '✓ ', bad: '✗ ', warn: '! ' }[v.k] + v.title }));
        verdict.appendChild(h('span', { text: ' ' + v.text }));
      }
    }

    root.appendChild(h('div', { 'class': 'sim' }, [
      h('div', { 'class': 'sim-head' }, [h('span', { 'class': 'sim-title', text: cfg.title })]),
      h('div', { 'class': 'sim-body' }, [
        chips, desc, codeHost,
        h('div', { 'class': 'table-wrap pay-wrap' }, [table]),
        note,
        h('div', { 'class': 'sim-controls pay-controls' }, [bPrev, bNext, bAll, bReset, counter]),
        verdict,
        cfg.foot ? h('p', { 'class': 'sim-note', text: cfg.foot }) : null
      ])
    ]));
    pick(0);
  }

  /* ------------------------------------------------------------------ seatrace */
  var SEATRACE = {
    title: 'Ana y Beto quieren el asiento F7 en el mismo instante',
    pick: 'Estrategia de concurrencia',
    lanes: ['Transacción de Ana', 'Fila F7', 'Transacción de Beto'],
    foot: 'Nivel de aislamiento: READ COMMITTED, el de PostgreSQL por defecto. Los tiempos son ilustrativos: cada paso dura milisegundos.',
    scenarios: [
      {
        label: 'Leer y luego escribir',
        desc: 'La aplicación lee el estado, decide en su código y después escribe, sin proteger lo que leyó.',
        code: "SELECT status FROM seats WHERE id = 7;          -- 'available'\n-- la aplicación decide que está libre\nUPDATE seats SET status = 'held', reservation_id = $mia WHERE id = 7;",
        steps: [
          { c: ['BEGIN; SELECT status → available', 'available, sin lock', ''], n: 'Ana lee F7 libre. Leer no toma ningún lock.' },
          { c: ['', 'available, sin lock', 'BEGIN; SELECT status → available'], n: 'Beto lee lo mismo: los dos tienen la misma foto.' },
          { c: ['UPDATE F7 = Ana (lock de fila)', 'held por Ana, sin confirmar', ''], n: 'Ana escribe. El UPDATE toma el lock de la fila.' },
          { c: ['COMMIT', 'held por Ana', ''], n: 'Ana confirma y suelta el lock.' },
          { c: ['', ['held por Beto: pisó a Ana', 'bad'], ['UPDATE F7 = Beto; COMMIT', 'bad']], n: 'Beto escribe con lo que leyó en el paso 2. Su UPDATE no mira el estado actual.' }
        ],
        verdict: { k: 'bad', title: 'Actualización perdida.', text: 'Los dos creen que F7 es suyo. Si los dos pagan, vendiste el asiento dos veces y alguien se entera en la puerta del cine.' }
      },
      {
        label: 'UPDATE condicional',
        desc: 'La decisión va en el WHERE: una sola sentencia lee, decide y escribe.',
        code: "UPDATE seats SET status = 'held', reservation_id = $mia\nWHERE id = 7 AND status = 'available'\nRETURNING id;                                    -- 0 filas: otro llegó antes",
        steps: [
          { c: ["UPDATE … WHERE status = 'available' → 1 fila", 'held por Ana, lock de Ana', ''], n: 'Ana encuentra la fila libre, la bloquea y la cambia.' },
          { c: ['', 'lock de Ana', ["UPDATE … WHERE status = 'available' → espera", 'warn']], n: 'Beto quiere la misma fila y espera el lock de Ana.' },
          { c: ['COMMIT', 'held por Ana, sin lock', ''], n: 'Ana confirma.' },
          { c: ['', 'held por Ana', ['vuelve a evaluar el WHERE: 0 filas → 409', 'ok']], n: 'PostgreSQL vuelve a evaluar el WHERE de Beto sobre la versión recién confirmada: ya no cumple.' }
        ],
        verdict: { k: 'ok', title: 'Un solo dueño.', text: 'En READ COMMITTED, quien espera un lock vuelve a evaluar su condición con la versión nueva de la fila. Beto ve 0 filas y responde 409, sin SELECT previo y sin lock explícito.' }
      },
      {
        label: 'FOR UPDATE NOWAIT',
        desc: 'Lock pesimista que no espera: si la fila está tomada, falla en el acto.',
        code: "SELECT status FROM seats WHERE id = 7 FOR UPDATE NOWAIT;\n-- 55P03 lock_not_available si otra transacción la tiene\nUPDATE seats SET status = 'held', reservation_id = $mia WHERE id = 7;",
        steps: [
          { c: ['SELECT … FOR UPDATE NOWAIT → available', 'available, lock de Ana', ''], n: 'Ana lee y bloquea a la vez: nadie puede cambiar F7 hasta que termine.' },
          { c: ['', 'lock de Ana', ['SELECT … FOR UPDATE NOWAIT → error 55P03', 'ok']], n: 'Beto no espera: recibe el error al instante.' },
          { c: ['', 'lock de Ana', ['ROLLBACK; 409 SEAT_UNAVAILABLE', 'ok']], n: 'La API traduce el SQLSTATE 55P03 a un 409.' },
          { c: ['UPDATE F7 = Ana; COMMIT', 'held por Ana', ''], n: 'Ana termina sin haber esperado a nadie.' }
        ],
        verdict: { k: 'ok', title: 'Rápido y sin deadlocks.', text: 'Como ninguna transacción espera a otra, no pueden formar un ciclo. Sirve cuando la respuesta a un choque es «no disponible», no «inténtalo de nuevo».' }
      },
      {
        label: 'FOR UPDATE con espera',
        desc: 'Lock pesimista que espera, acotado con lock_timeout para no colgar la conexión.',
        code: "SET LOCAL lock_timeout = '2s';\nSELECT status FROM seats WHERE id = 7 FOR UPDATE;\n-- decide con el dato devuelto, ya protegido",
        steps: [
          { c: ['SELECT … FOR UPDATE → available', 'available, lock de Ana', ''], n: 'Ana toma el lock al leer.' },
          { c: ['', 'lock de Ana', ['SELECT … FOR UPDATE → espera (máx. 2 s)', 'warn']], n: 'Beto espera. Si pasan 2 s, recibe 55P03 en lugar de seguir esperando.' },
          { c: ['UPDATE F7 = Ana; COMMIT', 'held por Ana, sin lock', ''], n: 'Ana termina en milisegundos y suelta el lock.' },
          { c: ['', 'held por Ana', ['recibe la versión nueva: held → 409', 'ok']], n: 'Beto despierta con el dato nuevo y decide bien.' }
        ],
        verdict: { k: 'ok', title: 'Correcto, con una espera.', text: 'Conviene cuando la segunda transacción tiene que hacer su trabajo igual, por ejemplo aplicar otro evento a la misma orden. Toma los locks siempre en el mismo orden para no crear deadlocks.' }
      },
      {
        label: 'Optimista con versión',
        desc: 'Nadie bloquea al leer; el choque se descubre al escribir, comparando una versión.',
        code: "SELECT status, version FROM seats WHERE id = 7;   -- version = 41\nUPDATE seats SET status = 'held', version = version + 1\nWHERE id = 7 AND version = 41;                     -- 0 filas: alguien cambió la fila",
        steps: [
          { c: ['SELECT → available, v41', 'available, v41', ''], n: 'Ana lee sin bloquear y anota la versión.' },
          { c: ['', 'available, v41', 'SELECT → available, v41'], n: 'Beto también.' },
          { c: ['UPDATE … WHERE version = 41 → 1 fila; COMMIT', 'held por Ana, v42', ''], n: 'Ana escribe primero: la versión sube a 42.' },
          { c: ['', 'held por Ana, v42', ['UPDATE … WHERE version = 41 → 0 filas', 'warn']], n: 'La versión de Beto ya no existe.' },
          { c: ['', 'held por Ana, v42', ['relee: held → 409', 'ok']], n: 'Beto vuelve a leer y descubre que F7 ya no está libre.' }
        ],
        verdict: { k: 'ok', title: 'Correcto, con trabajo tirado.', text: 'Brilla cuando hay tiempo humano entre leer y escribir (un formulario abierto, el ETag de M02) o cuando los choques son raros. Con 200 personas sobre el mismo asiento, 199 hacen el trabajo y lo descartan.' }
      },
      {
        label: 'Exclusion constraint',
        desc: 'El apartado es un rango de tiempo y la base prohíbe que dos rangos del mismo asiento se solapen.',
        code: "INSERT INTO seat_claims (seat_id, reservation_id, kind, active_during)\nVALUES (7, $mia, 'hold', tstzrange(now(), now() + interval '30 seconds'));\n-- 23P01 exclusion_violation si se solapa con otro claim de F7",
        steps: [
          { c: ['INSERT claim [19:00:00, 19:00:30)', 'claim de Ana, sin confirmar', ''], n: 'Ana inserta su rango. No hay SELECT ni regla en el código.' },
          { c: ['', 'claim de Ana, sin confirmar', ['INSERT claim solapado → espera', 'warn']], n: 'El índice de la restricción ve un posible choque y Beto espera a que Ana termine.' },
          { c: ['COMMIT', 'claim de Ana confirmado', ''], n: 'Ana confirma.' },
          { c: ['', 'claim de Ana', ['23P01 exclusion_violation → 409', 'ok']], n: 'Ahora el choque es seguro: la base rechaza el INSERT de Beto.' }
        ],
        verdict: { k: 'ok', title: 'La regla vive en la base.', text: 'Aunque un camino del código olvide verificar, dos apartados solapados del mismo asiento no pueden existir. Si Ana hubiera hecho ROLLBACK, el INSERT de Beto habría pasado.' }
      }
    ]
  };

  /* ------------------------------------------------------------------ idemkey */
  var IDEMKEY = {
    title: 'La fila de idempotency_keys, paso a paso',
    pick: 'Situación',
    lanes: ['Cliente y API', 'Fila de la clave K', 'Proveedor de pagos'],
    foot: 'K es el UUID que el navegador generó al pulsar Pagar. La clave hacia el proveedor sale del id de la orden: pay-create:{orden}.',
    scenarios: [
      {
        label: 'Doble clic',
        desc: 'El cliente manda la misma request dos veces, con la misma clave y el mismo body.',
        steps: [
          { c: ['POST /v1/orders, K, {"qty": 1}', 'INSERT: started, lease 30 s, orden creada', ''], n: 'La clave es nueva: se crea la fila y se toma el lease.' },
          { c: ['', 'started', 'crea pay_1 con pay-create:{orden}'], n: 'Fase remota, fuera de cualquier transacción.' },
          { c: ['TX3: guarda pay_1; responde 201', 'finished, 201 y body guardados', ''], n: 'La última fase guarda el resultado y la respuesta.' },
          { c: ['POST otra vez, K, {"qty": 1}', 'existe, misma huella, finished', ''], n: 'El INSERT … ON CONFLICT no inserta; la fila dice que ya terminó.' },
          { c: [['201 repetido, Idempotent-Replayed: true', 'ok'], 'sin cambios', ['sin llamada', 'ok']], n: 'Se repite la respuesta guardada. El proveedor no se entera.' }
        ],
        verdict: { k: 'ok', title: 'Un cobro.', text: 'El segundo clic recibe exactamente lo que recibió el primero, sin volver a ejecutar nada.' }
      },
      {
        label: 'Otro body',
        desc: 'El cliente reusa la clave para una intención distinta.',
        steps: [
          { c: ['POST K, {"qty": 1} → 201', 'finished, huella h1', 'pay_1'], n: 'La primera compra termina bien.' },
          { c: ['POST K, {"qty": 3}', 'huella h2 ≠ h1', ''], n: 'La huella del body no coincide con la guardada.' },
          { c: [['422 IDEMPOTENCY_KEY_REUSED', 'ok'], 'sin cambios', ''], n: 'No se ejecuta ni se repite.' }
        ],
        verdict: { k: 'ok', title: 'Error del cliente, dicho en voz alta.', text: 'Repetir el 201 le diría «tu compra de 3 salió bien» cuando se cobró 1. Por eso se compara la huella del body y la ruta, y un cambio es 422.' }
      },
      {
        label: 'Dos a la vez',
        desc: 'Una segunda request con la misma clave llega mientras la primera todavía corre.',
        steps: [
          { c: ['Request 1: POST K', 'INSERT: started, locked_until = ahora + 30 s', ''], n: 'La primera toma el lease.' },
          { c: ['Request 2: POST K', 'existe, sin terminar, lease vigente', ''], n: 'La segunda no puede tomarla.' },
          { c: [['Request 2: 409 IDEMPOTENCY_IN_PROGRESS, Retry-After: 1', 'warn'], '', ''], n: 'No espera ni ejecuta: avisa que vuelva en un segundo.' },
          { c: ['Request 1: 201', 'finished', 'pay_1 creado una vez'], n: 'La primera termina.' },
          { c: ['Request 2, 1 s después: POST K', 'finished', ''], n: 'El reintento de la segunda llega.' },
          { c: [['201 repetido', 'ok'], 'sin cambios', ''], n: 'Recibe la respuesta de la primera.' }
        ],
        verdict: { k: 'ok', title: 'Un cobro, dos respuestas iguales.', text: 'El 409 no guarda nada: es un «todavía no», no una respuesta final. El cliente reintenta con la misma clave.' }
      },
      {
        label: 'La API muere',
        desc: 'La API cae entre la llamada al proveedor y la transacción que guarda el resultado.',
        steps: [
          { c: ['POST K', 'started, lease 30 s, orden creada', ''], n: 'Primera fase confirmada.' },
          { c: ['', 'started', 'pay_1 creado con pay-create:{orden}'], n: 'El proveedor ya creó el pago.' },
          { c: [['la API muere antes de TX3', 'bad'], 'queda started; el lease sigue corriendo', ''], n: 'Nadie guardó pay_1 en tu base.' },
          { c: ['timeout; el cliente reintenta K a los 40 s', 'started, lease vencido: se toma de nuevo', ''], n: 'El lease vencido dice que su dueño murió: el reintento retoma.' },
          { c: ['', 'started', ['pay-create:{orden} otra vez → el mismo pay_1', 'ok']], n: 'La misma clave hacia el proveedor devuelve el mismo objeto.' },
          { c: [['TX3: guarda pay_1; 201', 'ok'], 'finished', ''], n: 'Termina como si nada.' }
        ],
        verdict: { k: 'ok', title: 'Un cobro, aunque la API murió.', text: 'Funciona por dos claves: la del cliente (K), que permite retomar, y la determinista hacia el proveedor, que impide crear un segundo pago.' }
      },
      {
        label: 'Clave nueva por reintento',
        desc: 'Un cliente mal diseñado genera un UUID nuevo en cada intento.',
        steps: [
          { c: ['POST K1', 'K1: started, orden 1', ''], n: 'Primer intento.' },
          { c: ['', 'K1: started', 'pay_1 creado'], n: 'El proveedor cobra.' },
          { c: [['la respuesta se pierde; timeout', 'bad'], 'K1: finished', ''], n: 'El cliente no sabe que funcionó.' },
          { c: ['reintenta con K2 (nueva)', 'K2: fila nueva, orden 2', ''], n: 'Para el servidor es otra intención.' },
          { c: ['', 'K2: started', ['pay_2 creado', 'bad']], n: 'Segundo cobro.' }
        ],
        verdict: { k: 'bad', title: 'Dos cobros.', text: 'La clave tiene que nacer con la intención (al pulsar Pagar) y sobrevivir a cada reintento. Una clave nueva por intento no protege nada.' }
      }
    ]
  };

  /* ------------------------------------------------------------------ whinbox */
  var WHINBOX = {
    title: 'Webhooks: qué hace el inbox con cada entrega',
    pick: 'Entrega',
    lanes: ['Proveedor', 'Webhook y provider_events', 'Worker y orden'],
    foot: 'La orden empieza en awaiting_payment. El worker siempre vuelve a leer el pago en el proveedor antes de actuar.',
    scenarios: [
      {
        label: 'Normal',
        desc: 'Un evento de pago exitoso, entregado una vez.',
        steps: [
          { c: ['POST evt_1 payment.succeeded', 'firma ok; INSERT evt_1; 200', ''], n: 'Verificar, guardar y responder: nada más.' },
          { c: ['', 'evt_1 pendiente', 'toma evt_1 con SKIP LOCKED; lee pay_1: succeeded'], n: 'El worker no confía en el payload: pregunta.' },
          { c: ['', 'evt_1 processed_at = now()', ["UPDATE … WHERE status = 'awaiting_payment' → paid", 'ok']], n: 'Transición que solo avanza y evento marcado.' }
        ],
        verdict: { k: 'ok', title: 'Entregado.', text: 'El proveedor recibió su 200 en milisegundos y el trabajo se hizo aparte.' }
      },
      {
        label: 'Duplicado',
        desc: 'El proveedor entrega el mismo evento dos veces, algo que sus documentos advierten que pasa.',
        steps: [
          { c: ['POST evt_1', 'INSERT evt_1; 200', ''], n: 'Primera entrega.' },
          { c: ['POST evt_1 otra vez', ['ON CONFLICT (event_id) DO NOTHING: 0 filas; 200', 'ok'], ''], n: 'La clave primaria hace el trabajo de deduplicar.' },
          { c: ['', 'una sola fila evt_1', ['procesa evt_1 una vez', 'ok']], n: 'No hay segunda tarea.' }
        ],
        verdict: { k: 'ok', title: 'Una vez.', text: 'Responder 200 también al duplicado es correcto: si respondes error, el proveedor lo seguirá reintentando.' }
      },
      {
        label: 'Desordenado',
        desc: 'El reembolso llega antes que el pago.',
        steps: [
          { c: ['POST evt_2 charge.refunded', 'INSERT evt_2; 200', ''], n: 'El evento más nuevo llega primero.' },
          { c: ['', 'evt_2', 'lee pay_1: cobrado y reembolsado entero → refunded'], n: 'El worker aplica el estado actual del pago, no el evento.' },
          { c: ['POST evt_1 payment.succeeded (tarde)', 'INSERT evt_1; 200', ''], n: 'Llega el evento viejo.' },
          { c: ['', 'evt_1', ["lee pay_1: refunded; UPDATE … WHERE status = 'awaiting_payment' → 0 filas", 'ok']], n: 'La orden ya está más adelante. El UPDATE no la hace retroceder.' }
        ],
        verdict: { k: 'ok', title: 'El orden no importa.', text: 'Releer el objeto y avanzar solo hacia adelante vuelve irrelevante el orden de llegada.' }
      },
      {
        label: 'Aplicar el payload',
        desc: 'Un worker ingenuo copia el estado del evento a la orden, sin releer ni condicionar.',
        steps: [
          { c: ['POST evt_2 charge.refunded', 'INSERT evt_2; 200', ''], n: 'Igual que antes.' },
          { c: ['', 'evt_2', "SET status = 'refunded'"], n: 'Hasta aquí, bien.' },
          { c: ['POST evt_1 payment.succeeded (tarde)', 'INSERT evt_1; 200', ''], n: 'Llega el evento viejo.' },
          { c: ['', 'evt_1', ["SET status = 'paid' (sin WHERE)", 'bad']], n: 'La orden vuelve a paid: se entrega el producto de una compra devuelta.' }
        ],
        verdict: { k: 'bad', title: 'Retrocedió.', text: 'Un evento es un aviso de que algo cambió, no la verdad actual. Relee el objeto y condiciona cada UPDATE al estado anterior.' }
      },
      {
        label: 'Firma falsa',
        desc: 'Alguien llama a tu endpoint con un evento inventado, o repite uno viejo que capturó.',
        steps: [
          { c: [['POST «payment.succeeded» con firma inventada', 'bad'], ['HMAC no coincide: 400; nada se guarda', 'ok'], ''], n: 'La firma es la autenticación del endpoint.' },
          { c: [['POST un evento real capturado hace 10 min', 'bad'], ['timestamp fuera de ±300 s: 400', 'ok'], ''], n: 'La tolerancia corta las repeticiones.' },
          { c: ['', '', ['sin trabajo', 'ok']], n: 'Aunque una firma pasara, el worker relee el pago con su propia clave: un evento no puede inventar dinero.' }
        ],
        verdict: { k: 'ok', title: 'Rechazado.', text: 'Firma sobre el body crudo, comparación en tiempo constante, tolerancia de tiempo y, detrás, releer el objeto.' }
      },
      {
        label: 'Procesar dentro',
        desc: 'El endpoint hace todo el trabajo antes de responder.',
        steps: [
          { c: ['POST evt_1', ['lee al proveedor, actualiza, envía el correo…', 'warn'], ''], n: 'La respuesta tarda lo que tarde la parte más lenta.' },
          { c: [['sin 2xx a tiempo: reintenta evt_1', 'bad'], 'el primero sigue corriendo', ''], n: 'Para el proveedor, la entrega falló.' },
          { c: ['', ['dos procesamientos a la vez', 'bad'], ['correo enviado dos veces', 'bad']], n: 'La lentitud se convirtió en duplicados.' }
        ],
        verdict: { k: 'bad', title: 'Lentitud convertida en duplicados.', text: 'Responde 2xx en cuanto el evento está guardado y procesa aparte. Así una base lenta no le parece al proveedor una entrega fallida.' }
      }
    ]
  };

  SD.ready(function () {
    document.querySelectorAll('[data-sim="seatrace"]').forEach(function (el) { build(el, SEATRACE); });
    document.querySelectorAll('[data-sim="idemkey"]').forEach(function (el) { build(el, IDEMKEY); });
    document.querySelectorAll('[data-sim="whinbox"]').forEach(function (el) { build(el, WHINBOX); });
  });
})();
