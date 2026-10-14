SD.defineExercise('m39-festival', {
  title: 'la venta de entradas de un festival',
  scenario: '<p>Un festival vende <b>2 000 entradas generales</b> (sin numerar) a las 10:00. Se esperan unas '
    + '<b>40 000 personas</b> en los primeros minutos. Cada persona compra hasta 4 entradas, paga con tarjeta en el '
    + 'checkout hospedado de un proveedor y recibe las entradas por correo. Tienes PostgreSQL, una API con varias '
    + 'réplicas detrás de PgBouncer en modo transacción, y un worker. Vas a diseñar el sistema decisión por decisión; '
    + 'cada paso explica por qué, y el siguiente aparece cuando quieras seguir.</p>',
  steps: [
    {
      id: 'stock', type: 'single',
      prompt: '¿Cómo guardas el stock de entradas?',
      options: [
        'Una fila con un contador <code>remaining</code> que cada compra decrementa con un UPDATE condicional',
        'Una fila por entrada (2 000 filas) que cada compra toma con <code>FOR UPDATE SKIP LOCKED</code>',
        'Un contador en Redis con DECR y la venta final escrita en la base cuando el pago se confirma'
      ],
      answer: 1,
      explain: 'Con 40 000 personas, un contador único es una fila caliente: si cada transacción sostiene su lock unos 2 ms, el techo es 500 por segundo, y todas las réplicas esperan en la misma fila. Con una fila por entrada, cada compra toma las primeras libres y SKIP LOCKED salta las que otra tiene tomadas, así que las compras no se esperan entre sí. El contador en Redis divide la verdad en dos sistemas. Ver 39.10.'
    },
    {
      id: 'tomar', type: 'single',
      prompt: 'Alguien pide 3 entradas. ¿Cómo las tomas?',
      options: [
        '<code>SELECT … WHERE status = \'available\' LIMIT 3 FOR UPDATE SKIP LOCKED</code> y, si vuelven menos de 3, rollback y 409',
        '<code>SELECT count(*)</code> de las entradas libres y, si quedan 3 o más, un UPDATE de las tres primeras ordenadas por id',
        '<code>SELECT … LIMIT 3 FOR UPDATE NOWAIT</code>, que falla si alguna de las tres está tomada por otro'
      ],
      answer: 0,
      explain: 'Contar y después escribir es leer y luego decidir: dos personas cuentan las mismas libres y se pisan. NOWAIT sobre las primeras tres hace que casi todos choquen en las mismas filas y reciban error aunque queden cientos libres. SKIP LOCKED toma las siguientes libres; si quedan menos de 3, todo o nada. Ver 39.7 y 39.10.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '¿Dónde nace la clave de idempotencia de la compra?',
      options: [
        'En la API, que genera un UUID nuevo al recibir cada request y lo guarda junto con la orden creada',
        'En el navegador, en cada reintento, para que el servidor distinga un intento de otro',
        'En el navegador, al pulsar Comprar, y se repite igual en cada reintento de esa intención'
      ],
      answer: 2,
      explain: 'La clave tiene que nacer con la intención. Si la genera el servidor, el doble clic produce dos requests con dos claves; si el navegador la cambia en cada reintento, un timeout seguido de reintento cobra dos veces. Ver 39.4.'
    },
    {
      id: 'exclusion', type: 'single',
      prompt: 'Dos requests con la misma clave llegan a la vez a réplicas distintas. ¿Cómo evitas que las dos ejecuten?',
      options: [
        'Con <code>pg_advisory_lock</code> sobre el hash de la clave, que es un mutex con nombre en PostgreSQL',
        'Con un lease en <code>locked_until</code>: la segunda ve el lease vigente y responde 409 con Retry-After',
        'Con un lock en memoria en cada réplica de la API, indexado por la clave de idempotencia'
      ],
      answer: 1,
      explain: 'El advisory lock de sesión vive en la conexión física, y PgBouncer en modo transacción la reparte entre clientes. Un lock en memoria no sirve entre réplicas. El lease es un dato: funciona con el pooler y vence solo si su dueño muere. Ver 39.4.'
    },
    {
      id: 'apartado', type: 'single',
      prompt: 'El cliente tarda hasta 10 minutos en el checkout hospedado. ¿Cómo mantienes sus entradas apartadas?',
      options: [
        'Con <code>status = \'held\'</code> y <code>hold_expires_at</code> en las filas, y la transacción ya confirmada',
        'Con la transacción del FOR UPDATE abierta hasta que el cliente vuelva del checkout',
        'Sin apartarlas: se toman recién cuando llega el webhook de pago exitoso'
      ],
      answer: 0,
      explain: 'Una transacción abierta 10 minutos por cliente agota el pool en segundos. Sin apartado, miles pagarían entradas que no existen. El lock de fila dura milisegundos y el apartado es un dato con vencimiento que todos pueden leer sin bloquear. Ver 39.8.'
    },
    {
      id: 'tarde', type: 'single',
      prompt: 'Un apartado vence mientras el cliente todavía está pagando. ¿Qué haces?',
      options: [
        'Liberar las entradas al vencer; si el pago llega después, reembolsarlo de forma automática',
        'Cancelar la sesión de pago en el proveedor y liberar solo si la cancelación se confirma',
        'Extender todos los apartados a 30 minutos para que el caso no ocurra en la práctica'
      ],
      answer: 1,
      explain: 'Liberar primero deja una carrera: el cliente paga un segundo después por entradas que ya son de otro, y el reembolso por tiempo debería ser una alarma, no un camino normal. Apartados de 30 minutos dejarían el festival «agotado» con entradas sin vender. Ver 39.8.'
    },
    {
      id: 'confirmar', type: 'single',
      prompt: '¿Cómo te enteras de que un pago terminó bien?',
      options: [
        'Solo por el webhook, que es la fuente oficial del proveedor y llega siempre antes que el cliente',
        'Solo por la página de éxito, porque el cliente siempre vuelve después de pagar',
        'Por el webhook, la página de éxito y el barrido, que llaman a la misma función idempotente'
      ],
      answer: 2,
      explain: 'El webhook puede tardar o no llegar si tu endpoint estuvo caído, y el cliente puede cerrar la pestaña. Los tres caminos llaman a la misma función, que relee el pago, compara el monto y aplica una transición condicionada: la entrada se emite una sola vez. Ver 39.12.'
    },
    {
      id: 'correo', type: 'single',
      prompt: '¿Cómo garantizas que el correo con las entradas sale una vez que la orden está pagada, aunque el worker muera?',
      options: [
        'Enviándolo dentro del handler, justo después del COMMIT que marca la orden como pagada',
        'Escribiendo una fila en el outbox en la misma transacción que marca la orden como pagada',
        'Enviándolo antes del COMMIT, para que el cliente lo reciba lo antes posible'
      ],
      answer: 1,
      explain: 'Después del COMMIT, si el proceso muere, el correo se pierde; antes, si la transacción falla, el cliente recibe entradas que no pagó. El outbox ata el efecto al cambio de estado y un worker lo envía al menos una vez. Ver 39.14.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Stock:</b> 2 000 filas en <code>tickets</code>, tomadas con <code>LIMIT n FOR UPDATE SKIP LOCKED</code>; todo o nada, y 409 si no alcanzan. Ninguna fila caliente.</li>'
    + '<li><b>Idempotencia:</b> clave nacida en el navegador al pulsar Comprar, tabla <code>(user_id, idem_key)</code> con huella y lease; 409 mientras corre, repetición al terminar, 422 si el body cambia.</li>'
    + '<li><b>Fases:</b> TX1 toma las entradas y crea la orden con el monto congelado; la sesión de pago se crea fuera de la transacción con <code>checkout:{orden}</code>; TX3 guarda el id y la respuesta.</li>'
    + '<li><b>Apartado:</b> <code>status = \'held\'</code> y <code>hold_expires_at</code> con el reloj de la base; el barrido cancela la sesión en el proveedor antes de liberar.</li>'
    + '<li><b>Confirmación:</b> webhook con inbox (firma, <code>ON CONFLICT DO NOTHING</code>, 2xx), página de éxito y barrido hacia la misma función, que relee el pago, compara el monto y aplica <code>UPDATE … WHERE status = …</code>.</li>'
    + '<li><b>Efectos:</b> las entradas y el correo salen por el outbox. Consultas de invariantes cada minuto (entradas vendidas sin orden pagada) y conciliación diaria.</li>'
    + '<li><b>Delante de todo:</b> con 40 000 personas para 2 000 entradas, una fila de espera virtual limita cuántas compiten a la vez; la base sigue decidiendo quién gana.</li>'
    + '</ul>'
});
