/* Decisiones guiadas de A15 (Idempotencia de punta a punta). Formato en core/exercise.js. */

SD.defineExercise('a15-pagos', {
  title: 'un botón de pagar que cobra una sola vez',
  scenario: '<p>La tienda corre como en esta guía: la api crea cada orden y su Checkout Session en Stripe, el webhook guarda los eventos en una inbox y el worker los procesa y hace los reembolsos. Todo entra a PostgreSQL por PgBouncer en modo transaction, con un pool de 4 conexiones por rol. Una llamada a Stripe tarda, en el peor caso, unos 40&#8239;s con su reintento. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'clave-navegador', type: 'single',
      prompt: 'El cliente aprieta Pagar, la red se corta y vuelve a apretar. ¿Dónde nace la <code>Idempotency-Key</code> y cuándo se olvida?',
      options: [
        'En el servidor, en un primer request que la reserva y la devuelve al navegador.',
        'En el navegador, una por clic, para que cada intento se pueda distinguir en los logs.',
        'En el navegador, una por intención de compra, y se olvida con una respuesta definitiva.',
        'En el navegador, en <code>localStorage</code>, y se conserva para todas las compras del cliente.'
      ],
      answer: 2,
      explain: 'La clave tiene que estar en manos de quien reintenta, y tiene que ser la misma en cada intento de la misma compra: una por clic convierte cada reintento en una compra nueva. Reservarla en el servidor agrega un viaje que también puede perderse. Y conservarla para siempre haría que la segunda compra fuera un replay de la primera. <code>app.js</code> la guarda en <code>sessionStorage</code> y la olvida con un 201, un 422 o un 502; con un 409, un 429, un 503 o sin respuesta, la conserva (paso 9).'
    },
    {
      id: 'exclusion', type: 'single',
      prompt: 'Dos requests con la misma clave llegan a la vez. ¿Cómo evitas que las dos llamen a Stripe?',
      options: [
        'Con <code>pg_advisory_lock</code> sobre el hash de la clave, que se suelta solo al cerrar la conexión.',
        'Con un lease en la fila de la clave, que vence a los 60&#8239;s si el proceso muere.',
        'Con <code>synchronized</code> en el método del servicio, que ya serializa las requests iguales.',
        'Con una transacción abierta desde la clave hasta la respuesta de Stripe, que bloquea la fila.'
      ],
      answer: 1,
      explain: 'Detrás de PgBouncer en modo transaction, un advisory lock de sesión queda en una conexión del pool que después atiende a otro cliente (lo viste en "Falla: un advisory lock detrás de PgBouncer"). <code>synchronized</code> solo vale dentro de un proceso. Y una transacción abierta durante 40&#8239;s retiene una de las 4 conexiones del pool por cada compra en curso. El lease es una columna: se escribe en la TX1, cualquiera lo lee, y vence solo. Es más largo que la peor llamada a Stripe para que no venza mientras la primera sigue esperando.'
    },
    {
      id: 'clave-stripe', type: 'single',
      prompt: '¿Qué <code>Idempotency-Key</code> le mandas a Stripe al crear la Checkout Session?',
      options: [
        'Un UUID nuevo en cada intento, para que Stripe no confunda dos llamadas distintas.',
        'La misma clave que mandó el navegador, para que las dos capas usen un solo identificador.',
        'Ninguna, porque Checkout ya deduplica por <code>client_reference_id</code>.',
        '<code>cs-create:{orden}</code>, que sale de la orden y se repite en cada reintento.'
      ],
      answer: 3,
      explain: 'Un UUID por intento crea una sesión nueva en cada reintento, y el cliente podría pagar dos. <code>client_reference_id</code> es un dato para conciliar: Stripe no deduplica por él. La clave del navegador funcionaría, pero es por usuario y la de Stripe es por cuenta, y ata tu contrato con Stripe a lo que mande un cliente. Una clave que sale del id de la orden es única en tu cuenta y es la misma para cualquier reintento de esa orden (paso 4).'
    },
    {
      id: 'quinientos', type: 'single',
      prompt: 'Stripe responde un 500 al crear la sesión. ¿Qué hace la api?',
      options: [
        'Marca la orden <code>failed</code> y guarda un 502 con la clave del cliente.',
        'Suelta el lease y responde 503, para que el cliente reintente con la misma clave.',
        'Reintenta en un bucle con espera exponencial hasta que Stripe responda un 200.',
        'Reintenta con otra clave hacia Stripe, porque la anterior quedó marcada como fallida.'
      ],
      answer: 0,
      explain: 'Stripe guarda la respuesta de la primera request con cada clave, incluidos los 500, y la repite a cada reintento con esa clave. Soltar el lease o reintentar en un bucle devolverían el mismo 500 hasta que Stripe borre la clave. Cambiar la clave hacia Stripe abre la puerta a dos sesiones para la misma orden, si la primera sí se creó. Lo honesto es cerrar la orden y dejar que el cliente empiece otra (paso 4).'
    },
    {
      id: 'fulfillment', type: 'multi',
      prompt: 'Llega un <code>checkout.session.completed</code> firmado. ¿Qué comprueba el worker antes de marcar la orden <code>paid</code>? Elige todas las que correspondan.',
      options: [
        'Que el monto y la moneda de la sesión, leída en la API de Stripe, sean los de la orden.',
        'Que <code>data.object.payment_status</code> del webhook diga <code>paid</code>.',
        'Que el <code>client_reference_id</code> de la sesión sea el id de la orden.',
        'Que la sesión sea la que la orden tiene guardada en <code>stripe_checkout_session_id</code>.',
        'Que el webhook venga de una IP de Stripe, porque la firma sola no alcanza.'
      ],
      answer: [0, 2, 3],
      explain: 'El worker no le cree al body del webhook: vuelve a leer la sesión en Stripe, y compara el monto, la moneda, la orden a la que apunta y que sea la sesión vigente de esa orden. <code>data.object</code> es una foto del momento del evento y puede estar vieja. La IP es una defensa extra que Stripe ofrece, pero la firma es la que prueba que el body no cambió, y releer el objeto es lo que prueba que el pago existe (paso 7).'
    },
    {
      id: 'rol-webhook', type: 'single',
      prompt: 'El rol <code>pagos_webhook</code> solo tiene <code>INSERT</code> en <code>stripe_events</code>. ¿Cómo guarda un evento que puede llegar repetido?',
      options: [
        '<code>ON CONFLICT (event_id) DO NOTHING RETURNING event_id</code>, para saber si insertó.',
        'Un <code>SELECT</code> previo por <code>event_id</code>, y el <code>INSERT</code> solo si no estaba.',
        '<code>ON CONFLICT DO NOTHING</code> sin columna, y cuenta las filas que insertó.',
        'Un <code>INSERT</code> simple, capturando la violación de la clave primaria en Java.'
      ],
      answer: 2,
      explain: '<code>RETURNING</code> y el <code>ON CONFLICT</code> con columna necesitan leer la tabla, y el <code>SELECT</code> previo también: este rol no puede. Capturar la violación en Java funciona, pero aborta la transacción y llena el log de PostgreSQL con errores que no son errores. <code>ON CONFLICT DO NOTHING</code> sin columna solo necesita <code>INSERT</code>, y el número de filas dice si era nuevo (paso 6).'
    },
    {
      id: 'reembolso-lock', type: 'single',
      prompt: 'Dos workers toman la misma orden en <code>refund_requested</code> a la vez. ¿Qué evita el doble reembolso?',
      options: [
        'Un <code>SELECT … FOR UPDATE</code> sobre la orden mientras se espera la respuesta de Stripe.',
        'La clave <code>refund:{orden}</code>: Stripe crea un reembolso y devuelve el mismo a los dos.',
        'Un líder elegido entre los workers, como en A08, para que solo uno haga reembolsos.',
        'El <code>UNIQUE</code> de <code>stripe_refund_id</code>, que impide guardar un segundo reembolso en la orden.'
      ],
      answer: 1,
      explain: 'El <code>FOR UPDATE</code> retiene una conexión durante toda la llamada a Stripe. Un líder funciona, pero es una pieza más para un problema que la clave ya resuelve. Y el <code>UNIQUE</code> de <code>stripe_refund_id</code> llega tarde: actúa cuando las dos llamadas a Stripe ya se hicieron, y no protege nada que esté fuera de tu base. Con la misma clave, Stripe ejecuta una sola vez y le repite el resultado al segundo (paso 8).'
    },
    {
      id: 'fases', type: 'order',
      prompt: 'Ordena lo que pasa cuando la api muere después de que Stripe creó la sesión y el cliente reintenta con la misma clave.',
      items: [
        'La TX1 guarda la clave en <code>started</code>, con su lease, y la orden.',
        'Stripe crea la sesión con <code>cs-create:{orden}</code> y la api muere antes de la TX3.',
        'Un reintento antes de que venza el lease recibe 409 con <code>Retry-After: 1</code>.',
        'Vencido el lease, el reintento retoma la orden y Stripe le devuelve la misma sesión.',
        'La TX3 guarda la sesión y la respuesta 201, y la clave pasa a <code>finished</code>.',
        'Un reintento más recibe el mismo 201 con <code>Idempotent-Replayed: true</code>.'
      ],
      explain: 'Es la figura A15.3 y el experimento "Falla: la api muere después de Stripe". La clave en <code>started</code> es lo que permite retomar; el lease, lo que impide que dos intentos trabajen a la vez; y <code>cs-create:{orden}</code>, lo que hace que retomar no cree otra sesión.'
    }
  ],
  solution: '<ul><li>La clave nace en el navegador, una por intención de compra, y se olvida con una respuesta definitiva.</li><li>La exclusión es un lease en la fila de la clave, más largo que la peor llamada a Stripe; nada de advisory locks de sesión detrás de PgBouncer.</li><li>Hacia Stripe va <code>cs-create:{orden}</code>, que sale de la orden y se repite en cada reintento.</li><li>Un 500 de Stripe cierra la orden como <code>failed</code> y guarda el 502; un error de red suelta el lease y responde 503.</li><li>El worker relee la sesión en Stripe y compara monto, moneda, orden y sesión vigente antes de marcar <code>paid</code>.</li><li>El webhook guarda con <code>ON CONFLICT DO NOTHING</code> sin columna, porque su rol solo inserta.</li><li>El doble reembolso lo evita la clave <code>refund:{orden}</code>, sin locks.</li></ul>'
});
