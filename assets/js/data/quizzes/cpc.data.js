/* Checkpoint C: examen integrador de las Partes I a III, en el escenario del cobro por uso. Cada explicación dice qué módulo repasar. */
SD.defineQuiz('cpc', {
  title: 'Examen del Checkpoint C',
  pass: 0.7,
  questions: [
    {
      id: 'clave-recarga', type: 'single',
      prompt: 'Dos workers procesan a la vez el mismo cruce del umbral de recarga de org_7. ¿Qué idempotency key evita que Stripe cobre dos veces?',
      options: [
        'Un UUID nuevo que cada worker genera al empezar a procesar el cruce.',
        'Una clave hecha con la organización y la versión del saldo en el cruce.',
        'El offset del mensaje en Kafka, que identifica cada publicación del cruce.',
        'La hora del cruce redondeada al minuto, junto con el id de la organización.'
      ],
      answer: 1,
      explain: 'Las dos copias del trabajo tienen que llegar a la misma clave, así que la clave sale del hecho y no del proceso: org_7:recarga:saldo-v4182. Un UUID por proceso es justo lo que causó los dos cobros del piloto. El offset cambia si el gateway y el barrido publican el mismo cruce, y la hora redondeada depende del reloj de cada worker y puede juntar dos cruces legítimos. Repasa M27, idempotencia, y la recarga de la solución.'
    },
    {
      id: 'webhook-orden', type: 'single',
      prompt: 'Al worker le llega <code>charge.dispute.closed</code>, con la disputa ganada, antes que <code>charge.dispute.created</code>. ¿Qué hace?',
      options: [
        'Lo devuelve a la cola hasta que llegue el created, para respetar el orden de Stripe.',
        'Asienta solo el cierre, porque es el estado final y el created ya no aporta nada.',
        'Relee la disputa con la API y asienta la apertura y el cierre según su estado.',
        'Responde 500 a Stripe para que el evento vuelva a llegar después del created.'
      ],
      answer: 2,
      explain: 'Stripe no garantiza el orden de los eventos, así que no hay un orden que respetar: el worker lee el objeto actual y asienta lo que falta, con un source_ref por hecho (dp_…:abierta y dp_…:cerrada). Esperar al created puede bloquear para siempre; asentar solo el cierre deja el ledger sin el retiro; y un 500 provoca reentregas sin arreglar nada. Repasa M27, webhooks.'
    },
    {
      id: 'ledger-columna', type: 'single',
      prompt: 'En el piloto, la suma de las columnas <code>balance</code> difiere en 3&#8239;400 USD de lo que dice Stripe. ¿Por qué un ledger de doble entrada sí podría explicar la diferencia?',
      options: [
        'Porque guarda nanodólares enteros, y la columna perdía decimales en cada resta.',
        'Porque cada asiento se replica a otra región y no se pierde si cae la base.',
        'Porque sus transacciones son serializables y la columna usaba read committed.',
        'Porque cada movimiento es un asiento inmutable con su origen, comparable con Stripe.'
      ],
      answer: 3,
      explain: 'Una columna que se resta guarda solo el resultado: si está mal, no queda nada para averiguar por qué. El ledger guarda cada hecho con su source_ref, y la conciliación lo compara línea por línea con las balance transactions de Stripe. Los enteros evitan errores de redondeo, pero no explican 3 400 USD; el aislamiento evita un tipo de error, pero no deja historia. Repasa M27, ledger.'
    },
    {
      id: 'redondeo', type: 'single',
      prompt: 'Una organización prepago hace 100&#8239;000 requests por mes de 0.008 USD cada una. ¿Dónde se redondea al centavo?',
      options: [
        'Una vez por línea de factura; el saldo y el ledger guardan nanodólares.',
        'En cada request, para que el saldo y la factura muestren siempre centavos.',
        'En cada asiento horario, porque el ledger solo acepta montos en centavos.',
        'En la compra, vendiendo créditos en múltiplos exactos del costo medio.'
      ],
      answer: 0,
      explain: 'Redondear cada request de 0.008 a 0.01 cobra un 25&#8239;% de más; hacia abajo, el uso sería gratis. El saldo y el ledger guardan nanodólares sin redondear, y solo la factura redondea, una vez por línea. Repasa M21, precios y redondeo.'
    },
    {
      id: 'valkey-caido', type: 'single',
      prompt: 'Valkey no responde. Una organización prepago de nivel 1 con 3 USD de saldo manda una request. ¿Qué recibe?',
      options: [
        'Un 402 insufficient_balance, porque sin Valkey no se puede probar que tiene saldo.',
        'Un 429 con Retry-After, porque el saldo que no se puede verificar cuenta como cuota.',
        'Una respuesta normal: toda organización prepago tiene 5 USD de sobregiro a ciegas.',
        'Un 503 con Retry-After, porque no tiene saldo holgado y el problema es del proveedor.'
      ],
      answer: 3,
      explain: 'En el nivel 1, el saldo holgado empieza en 20 USD (20 minutos de 1 USD por minuto). Con 3 USD no se la atiende a ciegas, y el error dice la verdad: el problema es nuestro y reintentar en unos segundos tiene sentido. Un 402 la mandaría a comprar sin motivo, y un 429 culparía a su ritmo. Repasa M18, admisión, y el saldo en caliente de la solución.'
    },
    {
      id: 'tope-lag', type: 'single', fixed: true,
      prompt: 'Con las cuentas del M21 (2 USD por segundo de gasto y hasta 50 streams de 0.48 USD en vuelo), ¿cuánto puede pasarse una organización de su tope de gasto si Kafka acumula 60 s de lag?',
      options: ['4 USD', '28 USD', '144 USD', '1&#8239;000 USD'],
      answer: 2,
      explain: '2 USD/s × 60 s + 50 × 0.48 = 120 + 24 = 144 USD. Sin lag, con unos 2 s de demora, son 2 × 2 + 24 = 28 USD. El saldo prepago no tiene este problema porque no depende de Kafka: se descuenta en el gateway. Repasa M21, cuánto puede pasarse un tope.'
    },
    {
      id: 'lost-update', type: 'single',
      prompt: 'Dos pestañas de una cuenta nueva compran 80 USD a la vez. Las dos leen que la cuenta lleva 0 USD comprados y las dos pasan el tope de 100. ¿Qué lo evita?',
      options: [
        'Una idempotency key compartida, para que la segunda devuelva la primera compra.',
        'Bloquear la fila de la organización con FOR UPDATE antes de leer el total.',
        'Leer el total desde la réplica, que tiene un snapshot consistente del mes.',
        'Un CHECK en credit_purchases que impida compras de más de 100 USD cada una.'
      ],
      answer: 1,
      explain: 'Es una carrera de leer y después escribir: las dos transacciones leen el mismo total. Bloquear la organización las pone en fila, y la segunda lee los 80 de la primera. Son dos compras distintas, así que no comparten clave; la réplica puede estar atrasada; y cada compra de 80 pasaría un CHECK por compra. Repasa M05, transacciones y aislamiento.'
    },
    {
      id: 'escrow', type: 'single',
      prompt: 'El enlace entre us-east-1, región de origen de org_7, y eu-west-1 se corta. ¿Cuánto de más puede gastar org_7 en eu-west-1?',
      options: [
        'Nada de más: gasta como mucho los 0.50 USD que ya le prestó el origen.',
        'Su saldo completo, porque la réplica del ledger en eu-west-1 lo tiene copiado.',
        'Hasta 5 USD, porque cada región aplica el sobregiro por separado sobre su copia.',
        'Lo que gaste en 10 minutos, porque toda organización se atiende a ciegas.'
      ],
      answer: 0,
      explain: 'El origen descuenta lo que presta en el momento de prestarlo, así que el dinero nunca está disponible en las dos regiones a la vez. Cortado el enlace, eu-west-1 gasta el préstamo y después solo sigue con las organizaciones de saldo holgado. La réplica del ledger es para leer y recuperar, no para autorizar. Repasa M18, escrow, y M06, CAP.'
    },
    {
      id: 'event-id', type: 'single',
      prompt: 'El gateway no recibe la confirmación de Kafka y reintenta mandar un evento de uso. ¿Qué evita que el uso se cuente dos veces?',
      options: [
        'El productor idempotente de Kafka, que descarta cualquier reenvío del gateway.',
        'Un event_id calculado del request_id, igual en cada reintento, que se deduplica.',
        'El asiento horario, que suma por organización y no ve los eventos sueltos.',
        'Un event_id aleatorio por envío, comparado contra los eventos de la última hora.'
      ],
      answer: 1,
      explain: 'El id tiene que salir de la request, para que todas las copias lo compartan, y el procesador deduplica por él. El productor idempotente solo cubre los reintentos de una misma sesión del productor, no los de un gateway que se reinicia o reenvía desde su spool. El asiento horario suma lo que le llega, con copias incluidas. Repasa M21, el id del evento.'
    },
    {
      id: 'reintento', type: 'single',
      prompt: 'La llamada que cobra la recarga en Stripe da timeout. ¿Cómo reintenta el worker?',
      options: [
        'Con backoff exponencial, jitter y la misma idempotency key del primer intento.',
        'De inmediato y con una clave nueva, porque el primer intento no tuvo respuesta.',
        'Con backoff exponencial y una clave nueva por intento, para no repetir el error.',
        'No reintenta: espera al webhook payment_intent.succeeded para saber qué pasó.'
      ],
      answer: 0,
      explain: 'Un timeout no dice si el cobro se hizo. Con la misma clave, Stripe devuelve el resultado del primero si llegó a ejecutarse, o lo ejecuta ahora si no. Una clave nueva puede cobrar dos veces, y esperar un webhook de un cobro que quizás nunca se creó deja la recarga colgada. Backoff y jitter evitan la tormenta de reintentos. Repasa M08, reintentos, y M27, idempotencia.'
    },
    {
      id: 'hmac-t', type: 'single',
      prompt: '¿Por qué la firma de los webhooks que mandas a los clientes incluye el timestamp dentro del HMAC?',
      options: [
        'Para que el cliente ordene los eventos según el momento en que ocurrieron.',
        'Para que cada reentrega tenga otra firma y el cliente no la deduplique por error.',
        'Para rotar el secreto sin que las firmas anteriores dejen de ser válidas.',
        'Para que una entrega capturada no sirva si se reenvía fuera de la tolerancia.'
      ],
      answer: 3,
      explain: 'Si el timestamp no estuviera firmado, un atacante que captura una entrega podría reenviarla con un timestamp nuevo. Firmado, cambiarlo invalida la firma, y el cliente rechaza lo que pasa de 5 minutos. El orden se resuelve con el estado del objeto, y la deduplicación usa el id whe_…, no la firma. Repasa M36, HMAC, y M27, webhooks.'
    },
    {
      id: 'alerta-negocio', type: 'single',
      prompt: 'El receptor de webhooks responde 200, pero un bug impide que el worker acredite las compras. ¿Qué señal lo detecta primero?',
      options: [
        'La tasa de 5xx del receptor, que sube cuando falla el procesamiento.',
        'Eventos sin procesar de más de 15 minutos y menos compras acreditadas.',
        'La latencia p99 del receptor, que crece mientras se acumulan los eventos.',
        'El uso de CPU de los workers, que baja cuando dejan de procesar.'
      ],
      answer: 1,
      explain: 'El receptor está sano: guarda y responde 200, así que ni sus errores ni su latencia cambian. El síntoma está en el negocio: eventos que no se procesan y compras que no se acreditan. La CPU baja por muchos motivos, entre ellos que haya poco tráfico. Repasa M11, alertas por síntomas.'
    },
    {
      id: 'desafio-borde', type: 'multi',
      prompt: 'Durante el card testing, alguien activa un desafío del borde para todo el dominio. ¿Qué se rompe? Marca todas las que correspondan.',
      options: [
        'Las llamadas de los clientes a la API de inferencia, que hacen programas.',
        'Los webhooks de Stripe, que no resuelven desafíos y se reintentan por días.',
        'El formulario de compra, que deja de aceptar a las personas que compran.',
        'La firma de los webhooks, porque el borde reescribe el cuerpo del evento.'
      ],
      answer: [0, 1],
      explain: 'Un desafío es para navegadores con una persona delante. Los programas que llaman a la API y Stripe no lo resuelven: los clientes reciben errores y los webhooks se acumulan en reintentos. Las personas sí pasan el desafío del formulario, que es justo donde va. El desafío no modifica el cuerpo de lo que deja pasar. Repasa M28, el borde, y la tabla de rutas de la solución.'
    },
    {
      id: 'tres-ds', type: 'single',
      prompt: '¿Qué cambia pedir 3D Secure en la primera compra de cada cuenta?',
      options: [
        'El titular ya no puede abrir una disputa por fraude sobre un pago autenticado.',
        'La responsabilidad por fraude pasa al emisor, aunque la disputa pueda llegar.',
        'Stripe deja de cobrar la tarifa de 15 USD por las disputas de esa tarjeta.',
        'Las recargas futuras sin el cliente quedan exentas de pedir autenticación.'
      ],
      answer: 1,
      explain: 'Con 3D Secure, la responsabilidad por un fraude pasa al banco emisor y Stripe adjunta la evidencia, pero la disputa todavía puede abrirse. Las tarifas no cambian, y un cobro sin el cliente presente puede volver a pedir autenticación (authentication_required): por eso existe el estado requiere_accion. Repasa M27, SCA y disputas.'
    },
    {
      id: 'costo-disputa', type: 'single', fixed: true,
      prompt: 'Antes del rediseño, una tarjeta robada compraba 300 USD de créditos y los gastaba en un día. Con la GPU al 35&#8239;% del precio, ¿cuánto le costaba a la empresa esa disputa?',
      options: ['24.00 USD', '129.49 USD', '324.00 USD', '429.49 USD'],
      answer: 1,
      explain: '15 de tarifa + 9.00 de la comisión que no vuelve (2.9&#8239;% de 300 + 0.30) + 105.49 de GPU por servicio que nadie pagó = 129.49 USD. Los 300 vuelven al titular, pero se habían cobrado, así que no son una pérdida. 24 cuenta solo la caja y olvida la GPU. Repasa M27, disputas, y las estimaciones de la solución.'
    },
    {
      id: 'conciliacion', type: 'single',
      prompt: 'En la conciliación diaria aparecen cuatro diferencias. ¿Cuál se atiende primero?',
      options: [
        'Un payout de Stripe que todavía no aparece en el extracto del banco.',
        'La comisión mensual de Billing, que está en Stripe y no tiene asiento.',
        'Un cobro de 40 USD que está en Stripe y no tiene asiento en el ledger.',
        'Una hora de uso tardía que entró como v2, con 0.12 USD de diferencia.'
      ],
      answer: 2,
      explain: 'Un cobro sin asiento es un cliente que pagó y no recibió sus créditos: casi siempre un webhook perdido, que el barrido recupera, pero hay que confirmarlo. El payout en tránsito tarda uno o dos días hábiles, la comisión mensual la asienta una regla y las horas tardías entran como versión nueva. Repasa M27, conciliación.'
    },
    {
      id: 'tramos', type: 'single',
      prompt: 'org_7 tiene 2 USD de saldo y lanza 40 streams caros a la vez. Con tramos de 0.05 USD y 5 USD de sobregiro, ¿cómo termina?',
      options: [
        'Con −11 USD, como en el piloto, porque cada stream se cobra al terminar.',
        'Con 0 USD exactos, porque cada stream reserva de entrada su costo máximo.',
        'Como mucho en −5 USD: los streams que no consiguen otro tramo se cortan.',
        'Con −2 USD, porque cada stream puede pasarse un tramo de 0.05 del saldo.'
      ],
      answer: 2,
      explain: 'Los 40 streams reservan 40 tramos, justo los 2 USD, y siguen pidiendo tramos mientras generan. El script niega cualquier tramo que lleve el saldo por debajo de −5, y el stream que no lo consigue se corta con un error y paga lo usado. Reservar el máximo no deja a nadie gastar de más, pero bloquea saldo que nunca se usa. Repasa M21, créditos, y M18, reservar.'
    },
    {
      id: 'pdf-ajeno', type: 'single',
      prompt: 'Un atacante pide <code>GET /v1/billing/invoices/{id}/pdf</code> con ids de facturas de otras organizaciones. ¿Qué tiene que pasar?',
      options: [
        'Recibe un 403, que le dice que la factura existe pero no tiene permiso.',
        'Recibe un 404, igual que si no existiera; se comprueba antes de firmar.',
        'Recibe una URL firmada de 5 minutos, que vence antes de que la use.',
        'Recibe un 302 a la URL firmada: la seguridad la da el secreto de la URL.'
      ],
      answer: 1,
      explain: 'Es BOLA: la autorización se comprueba por objeto, antes de generar nada. Un 404 igual al de una factura inexistente no revela qué ids existen. Firmar primero le entrega la factura, dure lo que dure la URL. Repasa M10, BOLA, y M09, URLs firmadas.'
    },
    {
      id: 'enteros', type: 'single',
      prompt: '¿Por qué el ledger guarda el dinero en nanodólares dentro de un <code>bigint</code> y no en un <code>double</code>?',
      options: [
        'Porque un bigint ocupa la mitad de bytes y el ledger crece más despacio.',
        'Porque PostgreSQL no permite indexar columnas de tipo double precision.',
        'Porque un double no representa 0.1 exacto y el error se acumula al sumar.',
        'Porque Stripe recibe los montos en nanodólares en cada PaymentIntent.'
      ],
      answer: 2,
      explain: 'Un double guarda una aproximación binaria de 0.1, y millones de sumas acumulan el error. Los enteros suman exacto. Los dos tipos ocupan 8 bytes, PostgreSQL indexa los dos, y Stripe recibe centavos, no nanodólares. Repasa M21, dinero entero, y M27, ledger.'
    },
    {
      id: 'camino-recarga', type: 'order',
      prompt: 'Ordena el camino de una recarga automática, desde el cruce del umbral hasta el saldo caliente.',
      items: [
        'El script de Lua marca el cruce con la versión del saldo',
        'El gateway publica el cruce en el tópico cruces de Kafka',
        'El worker inserta la recarga con la clave de esa versión',
        'El worker crea el PaymentIntent con off_session y su clave',
        'El ledger asienta el cobro con source_ref pi_…:captura',
        'El proyector suma los créditos al saldo caliente según el tx_id'
      ],
      explain: 'El cruce se detecta en la misma operación que el descuento, sale por Kafka, se convierte en una recarga única por versión, se cobra con una clave derivada y se asienta. El saldo caliente se entera del ledger por el outbox, y el proyector aplica cada asiento una sola vez. Repasa la recarga de la solución y M07, outbox.'
    }
  ]
});
