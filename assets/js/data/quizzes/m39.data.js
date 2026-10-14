SD.defineQuiz('m39', {
  title: 'Quiz: manejo de pagos', pass: 0.7,
  questions: [
    {
      id: 'irreversible', type: 'single',
      prompt: '¿Por qué un sistema de pagos se diseña a partir de sus invariantes y no del caso feliz?',
      options: [
        'Porque los proveedores exigen una lista de invariantes firmada para activar el modo live',
        'Porque un cobro no se deshace con un ROLLBACK y las redes fallan todos los días con volumen',
        'Porque las invariantes reemplazan a las pruebas automáticas y ahorran tiempo de desarrollo',
        'Porque el caso feliz ya lo resuelve el proveedor y al comercio solo le quedan los errores'
      ],
      answer: 1,
      explain: 'Cuando el banco aprobó, el dinero ya salió; corregirlo exige otra operación (un reembolso). Y cada tramo (cliente, proveedor, webhook) falla una de cada muchas veces, que con volumen es todos los días. Por eso primero se escribe lo que nunca puede pasar y después dónde vive la defensa. Ver 39.1.'
    },
    {
      id: 'intento', type: 'single',
      prompt: 'La primera tarjeta de un cliente fue rechazada y paga con otra. ¿Por qué conviene una tabla <code>payment_attempts</code> aparte de <code>orders</code>?',
      options: [
        'Porque el id del pago no cabe en la fila de la orden y PostgreSQL limita su ancho',
        'Porque así cada intento queda con su clave hacia el proveedor y no pisa el rastro del anterior',
        'Porque el proveedor exige que cada intento tenga su propia orden con un monto distinto',
        'Porque separar las tablas evita tener que congelar el monto en el momento de crear la orden'
      ],
      answer: 1,
      explain: 'La orden es la intención (una) y los intentos son las veces que tocaste al proveedor (varias). Si el id del pago vive en la orden, el segundo intento sobrescribe al primero y pierdes el registro de qué llamaste y con qué clave, justo lo que necesitas cuando la conciliación no cuadra. Ver 39.3.'
    },
    {
      id: 'alcance', type: 'single',
      prompt: '¿Por qué la clave primaria de <code>idempotency_keys</code> es <code>(user_id, idem_key)</code> y no solo <code>idem_key</code>?',
      options: [
        'Porque así dos usuarios con el mismo UUID no chocan y nadie lee la respuesta guardada de otro',
        'Porque PostgreSQL no permite una clave primaria de tipo uuid si no va acompañada de otra columna',
        'Porque el user_id hace que la clave venza sola a las 24 horas sin necesidad de un job aparte',
        'Porque el proveedor recibe la misma clave primaria y necesita saber a qué usuario cobrarle'
      ],
      answer: 0,
      explain: 'El alcance por usuario (o por cuenta) aísla las claves: una colisión, accidental o buscada, no mezcla dos intenciones ni permite leer la respuesta guardada de otro probando claves. Ver 39.4.'
    },
    {
      id: 'huella', type: 'single',
      prompt: 'Un cliente reusa una clave ya terminada, pero con <code>{"qty": 3}</code> en lugar de <code>{"qty": 1}</code>. ¿Qué responde el servidor?',
      options: [
        'El 201 guardado, porque la clave es la misma y la idempotencia manda repetir la respuesta',
        'Un 409 con Retry-After, para que el cliente espere a que termine la request original',
        'Un 422, porque la huella del body no coincide y es otra intención con la misma clave',
        'Un 201 nuevo, porque el body distinto indica una compra nueva que hay que ejecutar'
      ],
      answer: 2,
      explain: 'Se compara el SHA-256 del body canónico (y el método y la ruta). Repetir el 201 le diría «tu compra de 3 salió bien» cuando se cobró 1, y ejecutar de nuevo usaría una clave ya gastada. Un cambio de huella es un error del cliente: 422. Ver 39.4 y el simulador.'
    },
    {
      id: 'lease', type: 'single',
      prompt: '¿Por qué la exclusión entre dos requests con la misma clave usa un lease en la columna <code>locked_until</code> y no un advisory lock de sesión?',
      options: [
        'Porque los advisory locks solo admiten claves numéricas y la clave de idempotencia es un UUID',
        'Porque detrás de PgBouncer en modo transacción la conexión cambia de dueño y el lock de sesión queda mal',
        'Porque un advisory lock bloquea la tabla entera y frena a todos los demás usuarios a la vez',
        'Porque el lease se guarda en Redis, que es más rápido que cualquier mecanismo de PostgreSQL'
      ],
      answer: 1,
      explain: 'El lock de sesión vive en la conexión física, que el pooler reparte entre clientes en cada transacción. El de transacción funciona con el pooler, pero la request no cabe en una sola transacción: en el medio está la llamada al proveedor. Un lease como dato vence solo si el dueño muere. Ver 39.4.'
    },
    {
      id: 'fases', type: 'single',
      prompt: '¿Qué pasa si envuelves todo el endpoint de pago, llamada al proveedor incluida, en una sola transacción de la base?',
      options: [
        'Nada grave: la transacción garantiza que el cobro y la orden se confirman o se deshacen juntos',
        'Que el proveedor rechaza la llamada porque detecta una transacción abierta del otro lado',
        'Que la base aborta la transacción a los 5 segundos por la configuración por defecto de PostgreSQL',
        'Que una conexión queda ocupada mientras esperas, y un ROLLBACK posterior no deshace el cobro'
      ],
      answer: 3,
      explain: 'La transacción no abarca al proveedor: si hace ROLLBACK después de que cobró, tu base dice «no pasó nada» y el dinero salió igual. Además ocupa una conexión del pool y sus locks durante toda la espera, así que un proveedor lento te tumba. La alternativa son fases atómicas. Ver 39.5.'
    },
    {
      id: 'determinista', type: 'single',
      prompt: '¿Por qué la clave que mandas al proveedor es <code>pay-create:{orden}</code> y no un UUID nuevo por llamada?',
      options: [
        'Para que la repetición de la llamada, por cualquier motivo, devuelva el mismo pago y no cree otro',
        'Para que el proveedor pueda ordenar los pagos por fecha sin consultar a la base del comercio',
        'Porque los proveedores rechazan los UUID como clave y solo aceptan textos con dos puntos',
        'Para ocultar el id interno de la orden y evitar que el proveedor lo use en sus reportes'
      ],
      answer: 0,
      explain: 'Si la API muere, el worker reintenta o dos barridos ven la misma fila, la llamada se repite con la misma clave y el proveedor devuelve el objeto que ya creó. Por la misma razón, los parámetros que dependen del tiempo se calculan una vez y se guardan. Ver 39.5.'
    },
    {
      id: 'cero', type: 'single',
      prompt: 'El worker aplica <code>UPDATE orders SET status = \'paid\' … WHERE id = $1 AND status = \'awaiting_payment\'</code> y afecta 0 filas. ¿Qué debe hacer?',
      options: [
        'Lanzar un error para que el evento vuelva a la cola y se reintente más tarde',
        'Forzar la transición con un UPDATE sin condición, porque el proveedor confirmó el pago',
        'Terminar sin error: otro camino ya aplicó la transición o la orden está más adelante',
        'Crear una orden nueva en estado paid para no perder el pago confirmado por el proveedor'
      ],
      answer: 2,
      explain: 'Cero filas significa casi siempre «alguien ya hizo esto» (la página de éxito llegó primero) o que la orden avanzó (un reembolso). Reintentar llena las alertas de ruido y forzar haría retroceder el estado. Ver 39.6.'
    },
    {
      id: 'condicional', type: 'single',
      prompt: 'Ana y Beto ejecutan <code>UPDATE seats SET status = \'held\' WHERE id = 7 AND status = \'available\'</code> a la vez, en READ COMMITTED. ¿Qué pasa?',
      options: [
        'Los dos afectan una fila, porque cada uno leyó la fila libre antes de que el otro escribiera',
        'Beto espera el lock de Ana, vuelve a evaluar el WHERE sobre la versión nueva y afecta 0 filas',
        'PostgreSQL aborta a uno de los dos con un error de serialización que hay que reintentar',
        'Beto recibe un error 55P03 al instante porque el UPDATE nunca espera locks de otra transacción'
      ],
      answer: 1,
      explain: 'En READ COMMITTED, quien espera el lock de una fila vuelve a evaluar su condición contra la versión recién confirmada. Ya no está available, así que el UPDATE de Beto no cambia nada. Es el lock más barato: sin SELECT previo ni FOR UPDATE. Ver 39.7 y el simulador.'
    },
    {
      id: 'nowait', type: 'single',
      prompt: 'Doscientas personas quieren el mismo asiento y quien pierde debe ver «no disponible». ¿Qué variante del lock pesimista conviene?',
      options: [
        'FOR UPDATE NOWAIT, que falla en el acto y se traduce a un 409',
        'FOR UPDATE sin límite, para que cada persona espere su turno en orden',
        'FOR SHARE, que deja leer a todos y bloquea solo al que escribe',
        'SERIALIZABLE sin locks, reintentando la transacción hasta 199 veces'
      ],
      answer: 0,
      explain: 'Con NOWAIT la segunda transacción recibe 55P03 sin esperar, y como nadie espera, no se forman deadlocks. Esperar en fila solo para descubrir que el asiento se vendió ocupa conexiones y tiempo. FOR SHARE no impide el choque entre dos que escriben. Ver 39.7.'
    },
    {
      id: 'deadlock', type: 'single',
      prompt: 'Ana bloquea F7 y después pide F8; Beto bloquea F8 y después pide F7. ¿Cuál es la prevención correcta?',
      options: [
        'Subir deadlock_timeout a 10 segundos para que PostgreSQL tarde más en abortar a una',
        'Usar un lock de tabla en cada reserva para que solo una transacción toque los asientos',
        'Reintentar siempre la transacción abortada, porque el deadlock es un error inevitable',
        'Tomar los locks siempre en el mismo orden, por ejemplo con ORDER BY id FOR UPDATE'
      ],
      answer: 3,
      explain: 'Si todos bloquean primero F7 y después F8, quien llega segundo espera en F7 sin tener nada tomado, y el ciclo no puede formarse. El lock de tabla también lo evita, pero serializa todas las reservas del cine. Ver 39.7.'
    },
    {
      id: 'dosniveles', type: 'single',
      prompt: 'El asiento debe quedar apartado 3 minutos mientras el cliente paga. ¿Por qué no se usa un lock de fila de 3 minutos?',
      options: [
        'Porque PostgreSQL limita los locks de fila a 60 segundos y los suelta solos después',
        'Porque el lock dura su transacción: ocupa una conexión por cliente y queda colgado si el servidor cae',
        'Porque un lock de fila impide que otros lean el asiento, y el mapa de asientos dejaría de cargar',
        'Porque el proveedor de pagos necesita escribir en la fila del asiento durante el checkout'
      ],
      answer: 1,
      explain: 'Una transacción abierta mientras una persona mira la pantalla ocupa una conexión del pool por persona (con 20 conexiones, la 21 espera) y retrasa el VACUUM. Por eso el lock de fila dura milisegundos y el apartado es un dato: status y hold_expires_at. Ver 39.8.'
    },
    {
      id: 'cancelar', type: 'single',
      prompt: 'Vence un checkout de 3 minutos con un pago en vuelo. En el diseño de locks y barrido, ¿qué hace el barrido antes de liberar el asiento?',
      options: [
        'Libera el asiento de inmediato y, si el pago llega después, lo reembolsa por la vía normal',
        'Espera 24 horas por si el pago llega tarde, con el asiento apartado durante todo ese tiempo',
        'Cancela el pago en el proveedor y libera solo si la cancelación se confirma',
        'Pregunta al navegador del cliente si sigue en la página de pago antes de decidir'
      ],
      answer: 2,
      explain: 'Si liberas primero y el cliente termina de pagar un segundo después, cobraste un asiento que ya es de otro. Cancelar antes de liberar cierra esa carrera; si el proveedor dice que el pago ya terminó, el dinero ganó y el asiento no se libera. Ver 39.8.'
    },
    {
      id: 'rangos', type: 'multi',
      prompt: 'En el diseño de rangos con exclusion constraint y captura manual, ¿qué es cierto? Marca todas las correctas.',
      options: [
        'Dos apartados solapados del mismo asiento no pueden existir aunque el código olvide verificar',
        'Un apartado vence sin que nadie lo actualice, porque su rango queda en el pasado',
        'Si el asiento ya es de otro, se cancela la autorización y no hace falta reembolsar',
        'El barrido sigue siendo necesario para que no se venda un asiento dos veces'
      ],
      answer: [0, 1, 2],
      explain: 'La restricción vive en la base, el rango vence solo y la captura manual retiene sin cobrar, así que perder el asiento se resuelve cancelando la retención. El barrido deja de ser necesario para la corrección: si se cae, nadie compra dos veces. Ver 39.9.'
    },
    {
      id: 'caliente', type: 'single',
      prompt: 'Cada transacción sostiene el lock del saldo de una cuenta unos 5 ms. ¿Cuántas transacciones por segundo admite esa fila como máximo?',
      options: ['50', '200', '500', '2 000'],
      fixed: true,
      answer: 1,
      explain: 'Una fila con lock admite una transacción a la vez: 1 / 0.005 s = 200 por segundo, sin importar cuántas réplicas de la API haya. Para subir el techo se acorta el lock, se reparte la fila en N o se convierte el stock en unidades tomadas con SKIP LOCKED. Ver 39.10.'
    },
    {
      id: 'webhook', type: 'multi',
      prompt: '¿Qué hace un endpoint de webhooks bien diseñado? Marca todas las correctas.',
      options: [
        'Verifica la firma HMAC sobre el body crudo, con tolerancia de tiempo',
        'Inserta el evento con ON CONFLICT (event_id) DO NOTHING y responde 2xx',
        'Copia el estado del payload a la orden antes de responder al proveedor',
        'Responde 200 también a un evento duplicado que ya estaba guardado'
      ],
      answer: [0, 1, 3],
      explain: 'Verificar, guardar y responder; nada más. El procesamiento va en un worker que relee el objeto en el proveedor, porque el payload puede ser viejo o llegar desordenado, y procesar antes de responder convierte la lentitud en reintentos duplicados. Ver 39.11.'
    },
    {
      id: 'embudo', type: 'single',
      prompt: 'El endpoint de webhooks estuvo caído una hora. ¿Qué evita que las órdenes pagadas en esa hora queden en <code>awaiting_payment</code>?',
      options: [
        'Nada: los webhooks son el único camino y el proveedor los reenvía siempre en orden',
        'Un reintento manual del equipo de soporte, que revisa las órdenes atascadas cada mañana',
        'Que el cliente vuelve a la página de éxito y el barrido preguntan, y llaman a la misma función',
        'Que el proveedor captura los pagos solo cuando el comercio responde al webhook correspondiente'
      ],
      answer: 2,
      explain: 'El webhook es el camino más rápido, nunca el único. El regreso del cliente y el barrido (y la conciliación diaria) llaman a la misma función idempotente, que relee el pago y aplica una transición condicionada. Ver 39.12.'
    },
    {
      id: 'failover', type: 'single',
      prompt: 'Orquestas dos proveedores. El primero responde con un timeout. ¿Qué haces?',
      options: [
        'Mandas el pago al segundo proveedor de inmediato, para no hacer esperar al cliente',
        'Preguntas al primero con la misma clave si el pago existe antes de decidir',
        'Marcas la orden como fallida y le pides al cliente que vuelva a pagar',
        'Reintentas en el primero con una clave nueva, porque la anterior quedó gastada'
      ],
      answer: 1,
      explain: 'Un timeout no dice si el primero cobró. Pasar al segundo puede cobrar dos veces; pedirle al cliente que pague de nuevo, también. El failover solo ocurre ante un error definitivo; ante un timeout se pregunta con la clave determinista. Ver 39.13.'
    },
    {
      id: 'reembolso', type: 'single',
      prompt: '¿Por qué el endpoint de reembolso responde <code>202</code> y el reembolso real lo crea un worker?',
      options: [
        'Porque así la API no necesita permiso de reembolsar, y una API comprometida no devuelve dinero',
        'Porque los proveedores tardan días en procesar un reembolso y el endpoint no puede esperar',
        'Porque el código 202 es el único que los proveedores aceptan para operaciones de dinero',
        'Porque el worker puede elegir otra tarjeta para devolver el dinero si la original venció'
      ],
      answer: 0,
      explain: 'Es mínimo privilegio aplicado a las claves del proveedor: la API crea y lee pagos; solo el worker cancela, captura y reembolsa, con la clave refund:{orden}. El dinero vuelve únicamente al método original. Ver 39.14 y 39.15.'
    },
    {
      id: 'idor', type: 'single',
      prompt: 'Un usuario pide <code>GET /v1/orders/{id}</code> de una orden que no es suya. ¿Qué responde el servidor?',
      options: [
        '403, para dejarle claro que la orden existe pero no tiene permiso para verla',
        '404, para no confirmar siquiera que la orden existe',
        '200 sin el monto, para no romper el cliente que espera un objeto',
        '401, para obligarlo a iniciar sesión de nuevo con otra cuenta'
      ],
      answer: 1,
      explain: 'Toda consulta lleva AND user_id = :actual, así que para ese usuario la orden no existe. Un 403 confirmaría que el id es válido, algo que ayuda a enumerar órdenes. Ver 39.15.'
    }
  ]
});
