/* Decisiones guiadas de A28: cien asientos con la base como árbitro. */
SD.defineExercise('a28-cine', {
  title: 'el cine sin locks de asiento',
  scenario: '<p>El cine de A27: 100 asientos a 8.50&#8239;USD, 30&#8239;s para decidir y 3 minutos para pagar. Esta vez cada apartado es una fila de <code>seat_claims</code> con un rango <code>tstzrange</code>, una restricción de exclusión prohíbe que dos rangos del mismo asiento se solapen, y el PaymentIntent se crea con <code>capture_method=manual</code>. Decide cómo se comporta cada pieza.</p>',
  steps: [
    {
      id: 'regla',
      type: 'single',
      prompt: 'Quieres que la base garantice "un asiento, un dueño mientras dure el apartado". ¿Cómo lo escribes?',
      options: [
        'Un índice único parcial sobre <code>seat_id</code> con <code>WHERE expires_at &gt; now()</code>',
        'Una restricción de exclusión con GiST: mismo <code>seat_id</code> y rangos que se solapan',
        'Un <code>UNIQUE (seat_id, status)</code> y un barrido que cambia el status al vencer',
        'Un trigger <code>BEFORE INSERT</code> que lee los claims vigentes del asiento y rechaza la fila si encuentra uno'
      ],
      answer: 1,
      explain: 'PostgreSQL no acepta <code>now()</code> en el predicado de un índice, porque el índice no se recalcula cuando pasa el tiempo. El <code>UNIQUE</code> con barrido vuelve a A27: la corrección depende de un proceso. El trigger lee sin bloquear, y dos transacciones a la vez pasan las dos. La exclusión con <code>btree_gist</code> compara cada fila nueva contra las que se solapan, incluidas las que todavía no confirmaron. Vuelve al paso 3.'
    },
    {
      id: 'vencer',
      type: 'single',
      prompt: 'Un hold de F7 terminó hace un segundo y el worker está caído. Beto pide F7. ¿Qué pasa?',
      options: [
        'Recibe un 409, porque el claim de ana sigue con <code>kind = hold</code> hasta que el worker lo anule',
        'Lo reserva: su rango empieza después de que terminó el de ana, y la restricción no ve solapamiento',
        'Recibe un 409 <code>SEATS_BUSY</code> con <code>Retry-After</code>, que se repite hasta que la reserva de ana pase a <code>expired</code> en el barrido',
        'Lo reserva, pero solo si la api primero borra el claim vencido de ana en la misma transacción'
      ],
      answer: 1,
      explain: 'Los rangos son semiabiertos, <code>[inicio, fin)</code>: un claim que empieza cuando termina otro no lo pisa. El <code>kind</code> y el status de la reserva no participan en la restricción, y nadie tiene <code>DELETE</code> sobre <code>seat_claims</code>. Por eso el worker caído solo atrasa los status. Vuelve al paso 3 y a "El mapa en dos navegadores, sin worker".'
    },
    {
      id: 'carrera',
      type: 'single',
      prompt: 'Dos reservas de F7 llegan en el mismo milisegundo. Ninguna lee el asiento antes de insertar. ¿Qué ve la segunda?',
      options: [
        'Inserta sin esperar, y la base deja los dos claims hasta que el barrido detecte el duplicado',
        'Espera en el índice a que la primera termine; si la primera confirma, falla con <code>23P01</code>',
        'Falla de inmediato con <code>40P01</code>, porque dos transacciones tocaron la misma fila de <code>seats</code>',
        'Recibe un <code>55P03</code> como con <code>NOWAIT</code>, porque la fila del asiento quedó bloqueada'
      ],
      answer: 1,
      explain: 'La comprobación de una restricción de exclusión espera a la transacción que insertó el claim en conflicto: si confirma, la nuestra falla con <code>23P01</code>; si se deshace, la nuestra sigue. No hay fila de <code>seats</code> bloqueada, así que no hay <code>55P03</code>, y <code>40P01</code> solo aparece si dos transacciones se esperan en círculo. Vuelve al paso 4.'
    },
    {
      id: 'captura',
      type: 'single',
      prompt: 'El banco autorizó el pago de ana. ¿En qué orden van la venta en la base y la captura en Stripe?',
      options: [
        'Primero capturar, para asegurar el dinero, y después vender; si la venta falla, reembolsar',
        'Primero vender en una transacción; si la base acepta, capturar; si no, cancelar la autorización',
        'Las dos dentro de la misma transacción de la base, para que la captura se deshaga sola si el <code>COMMIT</code> falla',
        'Solo vender: Stripe captura solo a los siete días si nadie cancela la autorización antes'
      ],
      answer: 1,
      explain: 'La venta es lo que puede fallar, con <code>23P01</code> si otro tomó el asiento, así que va primero. Si falla, se cancela una autorización y no hay nada que devolver. Una llamada a Stripe no se deshace con un <code>ROLLBACK</code>, y una autorización que nadie captura vence sin cobrar, no se captura sola. Vuelve al paso 6.'
    },
    {
      id: 'tardio',
      type: 'single',
      prompt: 'La autorización de ana llega 20&#8239;s después de que venció su checkout. Beto no tomó el asiento. ¿Qué hace <code>finalize</code>?',
      options: [
        'Cancela la autorización, porque una reserva vencida no puede venderse aunque el asiento esté libre',
        'Vende desde <code>now()</code> con un rango hasta <code>infinity</code>, y como no choca con nadie, captura',
        'Alarga el rango vencido del checkout hasta ahora, y después lo convierte en <code>sold</code>',
        'Deja la reserva en <code>expired</code> y captura igual, porque el dinero ya está retenido'
      ],
      answer: 1,
      explain: 'La venta inserta un claim <code>[ahora, infinity)</code>. Si el asiento sigue libre, entra y el pago tardío no hace daño; si beto lo tomó, la base responde <code>23P01</code> y la reserva pasa a <code>seat_lost</code> con la autorización cancelada. Alargar un rango vencido podría pisar al que tomó el asiento en medio, y capturar sin vender es cobrar sin asiento. Vuelve al paso 6.'
    },
    {
      id: 'prorroga',
      type: 'single',
      prompt: '¿Cuándo se da la prórroga de 3D Secure en este diseño?',
      options: [
        'Cuando el checkout ya venció, si el PaymentIntent está en <code>requires_action</code>, como en A27',
        'Mientras el rango sigue vigente: el barrido mira los que vencen en los próximos 10&#8239;s',
        'Al crear el checkout, para todos los pagos con tarjeta, con 4 minutos en lugar de 3',
        'Cuando el navegador avisa que el banco abrió el desafío, con un <code>POST</code> propio'
      ],
      answer: 1,
      explain: 'Al vencer, otro usuario puede insertar su claim en el mismo instante, y alargar el nuestro chocaría con <code>23P01</code>. Darla a todos alarga también los de quien se fue, y un aviso del navegador es algo que el cliente controla. Con una ventana de 10&#8239;s y 5&#8239;s entre vueltas cortas del barrido, cada checkout pasa dos veces por ella. Vuelve al paso 8.'
    },
    {
      id: 'cancelar',
      type: 'single',
      prompt: 'Ana cancela su reserva en pago y Stripe no responde. ¿Qué devuelve el <code>DELETE</code>?',
      options: [
        '503, porque no puede liberar los asientos hasta que el PaymentIntent quede cancelado',
        '200: los claims se anulan primero, y el barrido cancela el PaymentIntent más tarde',
        '202, y la reserva queda en <code>checkout</code> hasta que Stripe confirme el cancel',
        '409 <code>INVALID_STATE</code>, porque una reserva con PaymentIntent solo se cancela desde Stripe'
      ],
      answer: 1,
      explain: 'En A27 había que cancelar el pago antes de liberar, y el <code>DELETE</code> podía responder 503. Aquí liberar no es peligroso: si el banco autoriza después, <code>finalize</code> encuentra la reserva cancelada y cancela la autorización. Los asientos vuelven al mapa al instante. Vuelve al paso 10.'
    },
    {
      id: 'worker',
      type: 'single',
      prompt: 'El worker estuvo caído una hora en pleno estreno. ¿Qué quedó mal?',
      options: [
        'Los checkouts vencidos de esa hora siguen apartando sus asientos hasta que el worker los libere',
        'Nada se vendió dos veces: se atrasaron los status, las prórrogas y las capturas reintentadas',
        'Las autorizaciones de esa hora se capturaron sin vender, y hay que reembolsarlas a mano',
        'La restricción dejó de comprobarse, porque el índice GiST lo mantiene el worker'
      ],
      answer: 1,
      explain: 'Los asientos vuelven solos al terminar cada rango, y la restricción la comprueba PostgreSQL en cada escritura. Sin worker no hubo prórrogas, los status quedaron en <code>held</code> o <code>checkout</code> vencidos y alguna captura esperó; nada de eso vende dos veces ni cobra un asiento ajeno. Vuelve a la figura A28.6.'
    }
  ],
  solution: '<ul>' +
    '<li>La regla vive en la base: una restricción de exclusión con <code>btree_gist</code> sobre <code>(seat_id WITH =, active_during WITH &amp;&amp;)</code>, y rangos semiabiertos que empiezan en <code>now()</code>.</li>' +
    '<li>Reservar inserta un claim por asiento, en orden de id, sin leer ni bloquear asientos. <code>23P01</code> es un 409 con el asiento perdido; <code>40P01</code> y <code>57014</code> son un 409 con <code>Retry-After</code>.</li>' +
    '<li>Vencer no escribe nada: el rango queda en el pasado. Nadie borra un claim; anular es cerrar su rango en <code>now()</code>.</li>' +
    '<li>El pago se autoriza con <code>capture_method=manual</code>, se vende en la base con un rango <code>[now(), infinity)</code> y recién entonces se captura. Si la venta choca, se cancela la autorización y no hay reembolsos.</li>' +
    '<li>La prórroga de 3D Secure se da por adelantado, con el rango vigente, una sola vez.</li>' +
    '<li>Cancelar libera primero y cierra el pago después. El worker queda para los status, las prórrogas, los pagos abiertos y las capturas pendientes, y su caída no rompe ninguna regla.</li>' +
    '</ul>'
});
