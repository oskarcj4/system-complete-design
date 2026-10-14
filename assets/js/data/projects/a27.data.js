/* Decisiones guiadas de A27 (Cien asientos con locks pesimistas). Formato en core/exercise.js. */

SD.defineExercise('a27-cine', {
  title: 'un cine que no vende un asiento dos veces',
  scenario: '<p>El cine corre como en esta guía: dos réplicas de la api, un worker con el barrido cada 5&#8239;s, PostgreSQL detrás de PgBouncer en modo transaction con 4 conexiones reales, Redis para el mapa en vivo y Stripe en modo de prueba. Una reserva aparta los asientos 30&#8239;s; el pago, 3 minutos más. Cuando se abre la venta, 200 personas piden F7 en el mismo segundo. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'dos-niveles', type: 'single',
      prompt: 'Un asiento tiene que quedar apartado 30&#8239;s mientras el cliente decide. ¿Qué lo mantiene apartado?',
      options: [
        'Un <code>SELECT … FOR UPDATE</code> en una transacción abierta durante los 30&#8239;s, que libera al hacer commit.',
        'La columna <code>status</code> con su vencimiento; el lock de fila solo protege el instante del cambio.',
        'Un advisory lock de sesión por asiento, que se suelta solo si el proceso de la api muere.',
        'Una clave en Redis con <code>SET NX EX 30</code>, y la base solo se entera al vender.'
      ],
      answer: 1,
      explain: 'Un lock de fila dura lo que su transacción, y una transacción de 30&#8239;s ocuparía una de las 4 conexiones de PgBouncer por comprador: el quinto esperaría. Un advisory lock de sesión no sobrevive al modo transaction de PgBouncer. Y con Redis como dueño del apartado tendrías dos fuentes de verdad que pueden discrepar. El apartado es una columna con vencimiento; el lock dura milisegundos (paso 3).'
    },
    {
      id: 'nowait', type: 'single',
      prompt: 'Doscientas requests piden F7 en el mismo milisegundo. ¿Cómo pide el lock la transacción de reservar?',
      options: [
        'Con <code>FOR UPDATE</code> que espera su turno, para que todas lleguen a leer el estado.',
        'Con <code>FOR UPDATE SKIP LOCKED</code>, y si la fila no aparece, el asiento está libre.',
        'Con <code>FOR UPDATE NOWAIT</code>, y el error <code>55P03</code> se responde como 409.',
        'Sin lock, con un <code>UPDATE … WHERE version = :v</code> que falla si alguien escribió antes.'
      ],
      answer: 2,
      explain: 'Esperar su turno solo sirve para descubrir después que el asiento ya está apartado, mientras cada espera ocupa una conexión. <code>SKIP LOCKED</code> esconde la fila tomada, y leer "no apareció" como "libre" es justo el error que hay que evitar. El lock optimista hace que 199 lean y decidan para fallar al escribir. Con <code>NOWAIT</code>, las 199 reciben 409 con <code>Retry-After: 1</code> antes de hacer nada (paso 3).'
    },
    {
      id: 'orden', type: 'single',
      prompt: 'Reservar, pasar al pago, vender y liberar bloquean asientos y la reserva. ¿Qué evita los deadlocks?',
      options: [
        'Que todos tomen los asientos primero, por <code>id</code>, y después la reserva.',
        'Subir el nivel de aislamiento a <code>SERIALIZABLE</code>, que detecta los ciclos antes de que ocurran.',
        'Un <code>lock_timeout</code> de 2&#8239;s, para que el ciclo se rompa solo cuando una se rinde.',
        'Bloquear la fila de la función antes de todo, así una sola transacción toca la sala a la vez.'
      ],
      answer: 0,
      explain: 'Dos transacciones que piden los mismos locks en el mismo orden no pueden esperarse en círculo. <code>SERIALIZABLE</code> aborta por conflictos de lectura, no ordena los locks, y suma errores <code>40001</code>. Un timeout rompe el ciclo, pero después de que ocurrió. Y bloquear la función serializa todas las reservas de la sala. El orden vive en <code>SeatSql.LOCK_OF_RESERVATION</code> (paso 3).'
    },
    {
      id: 'barrido', type: 'single',
      prompt: 'El barrido corre en dos workers. ¿Cómo toma las reservas vencidas que va a procesar?',
      options: [
        'Con un líder elegido por lease, que es el único que barre mientras el otro espera.',
        'Con <code>FOR UPDATE NOWAIT</code>, y si una fila está tomada, aborta la vuelta entera.',
        'Con <code>FOR UPDATE SKIP LOCKED</code>: cada worker salta las filas que tiene el otro.',
        'Sin lock, porque el <code>UPDATE … WHERE status = \'held\'</code> ya es atómico por sí solo.'
      ],
      answer: 2,
      explain: 'El barrido no compite con un comprador: si una fila está tomada, la ve en la vuelta siguiente, 5&#8239;s después. Con <code>SKIP LOCKED</code>, dos workers se reparten las filas sin elegir líder. <code>NOWAIT</code> haría fallar la vuelta entera por una sola fila. Y el <code>UPDATE</code> de la reserva sola no libera los asientos en la misma transacción ni respeta el orden de locks (paso 7).'
    },
    {
      id: 'cancelar-antes', type: 'single',
      prompt: 'Un checkout venció a los 3 minutos y su PaymentIntent está en <code>requires_payment_method</code>. ¿Qué hace el barrido?',
      options: [
        'Libera los asientos ya, y si después llega un pago, el worker lo reembolsa.',
        'Cancela el PaymentIntent y, solo si Stripe lo confirma cancelado, libera los asientos.',
        'Espera al webhook <code>payment_intent.canceled</code>, que Stripe manda solo al vencer el plazo.',
        'Extiende el plazo 60&#8239;s más, porque el cliente todavía puede escribir la tarjeta.'
      ],
      answer: 1,
      explain: 'Liberar primero deja una ventana en la que otro reserva el asiento y el primero paga: cargo y reembolso por algo que no compró. Stripe no sabe del plazo y no cancela nada solo. La prórroga es para <code>requires_action</code>, no para un formulario vacío. Un PaymentIntent cancelado ya no se puede confirmar, así que después del cancel liberar es seguro (paso 7).'
    },
    {
      id: 'cancel-falla', type: 'single',
      prompt: 'El cancel del barrido falla con <code>payment_intent_unexpected_state</code>. ¿Qué hace?',
      options: [
        'Lo da por cancelado, porque ese código dice que ya no está en un estado confirmable.',
        'Vuelve a leer el PaymentIntent y decide por su estado: si es <code>succeeded</code>, vende.',
        'Repite el cancel con la misma clave fija hasta que Stripe responda 200.',
        'Marca la reserva como huérfana y deja que la red de reembolsos lo resuelva.'
      ],
      answer: 1,
      explain: 'Ese código suele significar que el cliente pagó en ese instante: interpretarlo como cancelado regalaría un asiento pagado. Repetir con la misma clave devolvería el mismo error guardado por Stripe. Y el huérfano es para pagos sin asientos, no para uno que todavía se puede vender. El barrido nunca decide por el texto de un error: relee y aplica la tabla (paso 7).'
    },
    {
      id: 'prorroga', type: 'single',
      prompt: 'Al vencer el checkout, el PaymentIntent está en <code>requires_action</code>: el banco abrió 3D Secure. ¿Qué regla usas?',
      options: [
        'Cancelar igual: el plazo es el plazo, y el cliente puede volver a reservar si el asiento sigue libre.',
        'Extender 60&#8239;s cada vez que el barrido lo vea en <code>requires_action</code>.',
        'Una sola prórroga de 60&#8239;s, marcada con <code>grace_used</code> y avisada al dueño.',
        'Subir el plazo del checkout a 5 minutos para todos, así el 3D Secure siempre entra.'
      ],
      answer: 2,
      explain: 'En <code>requires_action</code> la demora es del banco, no del cliente, y cancelar castiga a quien sí estaba pagando. Extender cada vez permite retener los asientos indefinidamente con una tarjeta que nunca se verifica. Alargar todos los plazos bloquea más asientos por gente que ya se fue. Una sola prórroga deja un máximo conocido, 4 minutos, y el <code>WHERE NOT grace_used</code> impide darla dos veces (paso 8).'
    },
    {
      id: 'orden-eventos', type: 'single',
      prompt: 'El mapa en vivo llega por Redis Pub/Sub a dos réplicas, y los mensajes pueden llegar desordenados. ¿Cómo sabe el navegador cuál es el último estado de F7?',
      options: [
        'Por la hora en que llegó el mensaje al navegador: el último en llegar es el más nuevo.',
        'Por un contador de la función que suma 1 en cada transacción y viaja en cada evento.',
        'Por <code>LISTEN/NOTIFY</code>, que entrega los eventos en el orden de los commits.',
        'Por la versión del asiento, el <code>updated_at</code> escrito bajo su lock, y descarta las menores.'
      ],
      answer: 3,
      explain: 'La hora de llegada es justo lo que se desordena. Un contador por función convierte esa fila en un lock que serializa todas las reservas. <code>LISTEN/NOTIFY</code> necesita una sesión dedicada, que PgBouncer en modo transaction no da. Como el <code>UPDATE</code> espera el lock de la fila, las versiones de un mismo asiento solo crecen, y el navegador descarta un evento con versión menor o igual (paso 9).'
    }
  ],
  solution: '<ul><li>El apartado es una columna con vencimiento; el lock de fila dura milisegundos y protege solo el cambio.</li><li>Las requests del navegador piden el lock con <code>NOWAIT</code> y responden 409 con <code>Retry-After: 1</code>.</li><li>Todos bloquean primero los asientos, por <code>id</code>, y después la reserva: sin ciclos, sin deadlocks.</li><li>El barrido usa <code>SKIP LOCKED</code>, y dos workers se reparten las filas sin líder.</li><li>Un checkout vencido se cancela en Stripe antes de liberar los asientos.</li><li>Si el cancel falla, se relee el PaymentIntent y se decide por su estado, nunca por el error.</li><li>Una sola prórroga de 60&#8239;s en <code>requires_action</code>, con un máximo conocido de 4 minutos.</li><li>Cada asiento viaja con su versión, y el navegador descarta lo viejo.</li></ul>'
});
