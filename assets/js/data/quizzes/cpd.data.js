/* Checkpoint D: examen integrador de los casos de estudio (M27 a M31). Cada explicación dice qué módulo repasar.
   Varias preguntas ponen el concepto en el contexto del diseño del checkpoint (un chat para equipos). */
SD.defineQuiz('cpd', {
  title: 'Examen del Checkpoint D',
  pass: 0.7,
  questions: [
    /* ---------- M27: pagos tipo Stripe ---------- */
    {
      id: 'idem-concurrente', type: 'single',
      prompt: 'Una API de cobros recibe un segundo POST con la misma <code>Idempotency-Key</code> mientras el primero todavía se está procesando. ¿Qué responde al segundo?',
      options: [
        'Un 200 con un cobro nuevo, porque la clave solo deduplica intentos que ya terminaron',
        'Un conflicto mientras la clave está en uso; cuando el primero termina, su respuesta guardada',
        'Un 202 que encola el segundo detrás del primero y lo procesa después como otro cobro',
        'Un 400, porque una clave repetida es siempre un error del cliente y se rechaza sin mirar'
      ],
      answer: 1,
      explain: 'La clave identifica la operación, no el intento: mientras la primera request la tiene tomada, la segunda recibe un conflicto, y después recibe la respuesta guardada, aunque haya sido un error. Un cobro nuevo es justo lo que la clave tiene que impedir. Repasa <a href="m27-pagos-stripe.html#idempotencia">M27</a>.'
    },
    {
      id: 'ledger-reembolso', type: 'single',
      prompt: 'Un cobro de 49.90 EUR tiene un reembolso parcial de 10 EUR. ¿Qué hace el ledger de doble entrada?',
      options: [
        'Edita el asiento original y le resta 10 EUR al monto, para que el saldo del cliente cuadre',
        'Borra el cobro y lo vuelve a crear por 39.90 EUR con la misma referencia del pedido',
        'Agrega una transacción nueva cuyos asientos suman cero, sin tocar los del cobro',
        'Agrega un solo asiento de −10 EUR en la cuenta del cliente, sin contrapartida'
      ],
      answer: 2,
      explain: 'El ledger es append-only: lo que pasó no se edita, se compensa con asientos nuevos, y cada transacción suma cero por moneda. Un asiento suelto sin contrapartida rompe la invariante. Repasa <a href="m27-pagos-stripe.html#ledger">M27</a>.'
    },
    {
      id: 'webhook-perdido', type: 'single',
      prompt: 'El cliente pagó, pero el webhook <code>payment_intent.succeeded</code> no llega en tres días. ¿Qué tendría que haber hecho el comercio?',
      options: [
        'Esperar: los webhooks se entregan exactamente una vez y siempre terminan llegando',
        'Marcar el pedido como pagado al redirigir al cliente, sin esperar ninguna confirmación',
        'Cancelar el pedido a las 24 horas, porque un pago sin webhook nunca se confirmó',
        'Consultar el estado del pago a la API cuando el evento tarda, sin depender solo del webhook'
      ],
      answer: 3,
      explain: 'Los webhooks llegan al menos una vez, pero pueden demorarse o perderse si el receptor falla; el estado verdadero está en la API del procesador, y la conciliación lo compara con lo que el comercio cree. Repasa <a href="m27-pagos-stripe.html#webhooks">M27</a>.'
    },
    {
      id: 'webhook-orden', type: 'single',
      prompt: 'Tu receptor de webhooks procesa cada evento antes de responder y tarda 40 segundos con algunos. ¿Qué cambias?',
      options: [
        'Guardas el evento por su id con una restricción única, respondes 2xx y lo procesas aparte',
        'Subes el timeout del servidor a 60 segundos, para que el emisor no corte la conexión',
        'Respondes 500 a propósito a los eventos lentos, así el emisor los manda otra vez más tarde',
        'Procesas en paralelo todos los eventos, así ninguno espera a otro ni se acumulan'
      ],
      answer: 0,
      explain: 'El emisor corta a los pocos segundos y reintenta: si procesas antes de responder, recibes el mismo evento varias veces. Se guarda (deduplicando por id), se responde rápido y un worker lo procesa. Repasa <a href="m27-pagos-stripe.html#webhooks">M27</a>.'
    },
    /* ---------- M28: Cloudflare ---------- */
    {
      id: 'tiered', type: 'single',
      prompt: 'Con caché por niveles activada, un PoP recibe una request de un archivo estático que no tiene. ¿A quién le pregunta?',
      options: [
        'Al origen directamente, porque la caché por niveles solo cambia cuánto dura el TTL',
        'A un PoP superior, que pide al origen solo si tampoco lo tiene',
        'A todos los PoPs vecinos a la vez, y usa la primera respuesta que llegue de ellos',
        'A ninguno: responde 404 hasta que el origen empuje el archivo a todos los PoPs'
      ],
      answer: 1,
      explain: 'Los PoPs piden a unos pocos PoPs superiores, que concentran las requests; así el origen recibe muchas menos. Preguntar a todos los vecinos multiplicaría el tráfico interno. Repasa <a href="m28-cloudflare.html#cache">M28</a>.'
    },
    {
      id: 'edge-boot', type: 'single',
      prompt: 'Al abrir la app, el cliente de un chat para equipos descarga todos los canales y todas las personas del workspace. Con 32 000 personas, el arranque es lento. ¿Qué hizo Slack con Flannel?',
      options: [
        'Comprimió el snapshot completo con un algoritmo más agresivo y lo sirvió por HTTP/3',
        'Partió el workspace en varios workspaces chicos, cada uno con su propio snapshot',
        'Puso una caché en el borde que responde poco al arrancar y el resto bajo demanda',
        'Movió el snapshot al almacenamiento local del cliente y lo actualiza una vez por día'
      ],
      answer: 2,
      explain: 'Flannel es una caché de aplicación en los PoPs: el cliente arranca con lo mínimo y pide usuarios y canales cuando los necesita. Slack documentó un arranque 7 veces más chico para 1 500 personas y 44 veces para 32 000. Repasa <a href="m28-cloudflare.html#cache">M28</a> y la solución de este checkpoint.'
    },
    {
      id: 'do-sala', type: 'single',
      prompt: 'En un clon sobre Workers, cada sala de chat necesita que los mensajes queden en un orden único. ¿Qué pieza usas?',
      options: [
        'Workers KV con una clave por mensaje, porque replica a todos los PoPs en segundos',
        'Un Worker sin estado que ordena por la hora del cliente que mandó cada mensaje',
        'Una caché por niveles, porque el PoP superior ve todos los mensajes de la sala',
        'Un Durable Object por sala, el único lugar que recibe y ordena sus mensajes'
      ],
      answer: 3,
      explain: 'Un Durable Object vive en un solo lugar y procesa sus requests de a una: es el dueño único de la sala, igual que un Channel Server lo es de un canal. KV es eventual y la hora del cliente no ordena nada. Repasa <a href="m28-cloudflare.html#estado">M28</a>.'
    },
    {
      id: 'zero-trust', type: 'single',
      prompt: '¿Qué cambia cuando el panel interno de administración pasa detrás de un acceso zero trust en el borde?',
      options: [
        'Cada request se autentica por identidad y dispositivo, aunque venga de la red de la oficina',
        'El panel queda accesible solo desde la VPN, y quien entra a la VPN ya está autorizado',
        'El tráfico se cifra con TLS, cosa que el panel no tenía antes de pasar por el borde',
        'El panel deja de necesitar sus propios roles, porque el borde decide todo lo que se puede hacer'
      ],
      answer: 0,
      explain: 'Zero trust deja de confiar en la red: cada request trae una identidad verificada. La VPN es justo el modelo de perímetro que reemplaza, y los permisos finos siguen en la aplicación. Repasa <a href="m28-cloudflare.html#zero-trust">M28</a>.'
    },
    /* ---------- M29: WhatsApp ---------- */
    {
      id: 'gateways', type: 'single',
      prompt: 'Hay 6 millones de conexiones a la vez, cada una usa unos 30 KB y cada gateway tiene 32 GB, de los que dedicas el 60&#8239;% a conexiones. ¿Cuántos gateways hacen falta como mínimo, sin margen?',
      options: ['7', '10', '19', '188'],
      fixed: true, answer: 1,
      explain: '32 GB × 0.6 / 30 KB = 640 000 conexiones por gateway; 6 000 000 / 640 000 = 9.4, que se redondea a 10. 188 sería usar toda la memoria de una sola conexión por megabyte; 19 ya es con un 50&#8239;% de margen. Repasa <a href="m29-whatsapp.html#conexion">M29</a>.'
    },
    {
      id: 'tormenta', type: 'single',
      prompt: 'Cae un gateway con 640 000 conexiones y todos sus clientes reintentan cada 1 segundo exacto. ¿Qué pasa?',
      options: [
        'Nada grave: el balanceador reparte las reconexiones y cada gateway sano recibe un poco',
        'Los clientes esperan a que el gateway caído vuelva, porque su sesión quedó registrada ahí',
        'Las reconexiones llegan juntas, en olas, y pueden tumbar a los gateways que quedan sanos',
        'El sistema operativo encola los SYN de más y los atiende en orden sin perder ninguno'
      ],
      answer: 2,
      explain: 'Un reintento fijo sincroniza a todos: 640 000 handshakes TLS por segundo contra la flota. Se arregla con backoff exponencial con jitter en los clientes y control de admisión en los servidores. Repasa <a href="m29-whatsapp.html#tormenta">M29</a> y <a href="m08-resiliencia.html#tormenta">M08</a>.'
    },
    {
      id: 'msgid', type: 'single',
      prompt: 'El cliente manda un mensaje, la red se corta antes del ack y lo reenvía al reconectar. ¿Qué evita que aparezca dos veces?',
      options: [
        'Un id que genera el cliente y repite en el reintento, con una escritura condicional por ese id',
        'Que el servidor compare el texto con los últimos mensajes y descarte los que sean iguales',
        'Que el cliente espere cinco minutos antes de reintentar, hasta que el primero seguro llegó',
        'Que TCP retransmita el paquete perdido, porque la capa de transporte ya evita duplicados'
      ],
      answer: 0,
      explain: 'Es la misma idea que la clave de idempotencia de M27: el id nace en el cliente y viaja en cada intento. Comparar textos borra mensajes legítimos ("ok", "ok"), y TCP no sabe nada de dos conexiones distintas. Repasa <a href="m29-whatsapp.html#mensaje">M29</a>.'
    },
    {
      id: 'offline', type: 'single',
      prompt: 'Beto estuvo dos horas sin red. ¿Cómo recibe lo que se perdió?',
      options: [
        'Por las notificaciones push, que guardan cada mensaje hasta que el teléfono las abre',
        'Al reconectar, el cliente pide al servidor lo pendiente desde lo último que tenía',
        'El servidor reenvía por el socket viejo, que el sistema operativo mantuvo abierto',
        'No lo recibe: un chat en tiempo real solo entrega lo que pasa mientras estás conectado'
      ],
      answer: 1,
      explain: 'El push avisa, pero no garantiza nada: Apple y Google pueden demorarlo o descartarlo. La garantía es que el servidor guarda y el cliente pide desde su última posición al reconectar. Repasa <a href="m29-whatsapp.html#offline">M29</a>.'
    },
    /* ---------- M30: Twitter ---------- */
    {
      id: 'fanout-canal', type: 'single',
      prompt: 'Un canal de anuncios tiene 150 000 miembros. ¿Por qué no conviene copiar cada mensaje a una bandeja por persona, como la timeline de M30?',
      options: [
        'Porque Redis no admite listas de más de 100 000 elementos por clave en ningún caso',
        'Porque los mensajes de un canal no tienen id ordenado y no se pueden insertar en una lista',
        'Porque cada persona lee todos los canales del workspace al abrir la app, no solo los suyos',
        'Porque cada mensaje serían 150 000 escrituras, y todos leen la misma lista del canal'
      ],
      answer: 3,
      explain: 'En Twitter cada persona tiene una timeline distinta, mezcla de muchas cuentas; en un chat, todos los miembros leen la misma lista. Se guarda una vez por canal y en vivo solo se empuja a quien está conectado. Repasa <a href="m30-twitter.html#fanout">M30</a>.'
    },
    {
      id: 'snowflake-orden', type: 'single',
      prompt: 'Dos servidores generan ids Snowflake para mensajes del mismo canal en el mismo milisegundo. ¿Qué garantizan esos ids?',
      options: [
        'Que son únicos y ordenados por milisegundo; dentro del mismo, el orden lo decide el nodo',
        'Que reflejan el orden exacto de llegada, porque el reloj de los dos servidores es el mismo',
        'Nada: dos ids del mismo milisegundo pueden chocar y hace falta revisar en la base',
        'Que el de menor número de secuencia siempre se envió primero desde el cliente'
      ],
      answer: 0,
      explain: 'Los 10 bits de nodo hacen únicos los ids, y los 41 de tiempo los ordenan por milisegundo, pero no hay orden causal entre nodos. Si un canal necesita un orden estricto, lo da un dueño único por canal. Repasa <a href="m30-twitter.html#snowflake">M30</a>.'
    },
    {
      id: 'busqueda-permisos', type: 'single',
      prompt: 'La búsqueda de un chat indexa también los canales privados. ¿Dónde se aplica el permiso?',
      options: [
        'En el cliente, que oculta los resultados de canales donde la persona no es miembro',
        'En un índice copiado por persona, con solo lo que esa persona puede leer',
        'En la consulta: el índice filtra por los canales que la persona puede leer',
        'En ningún lado: lo que entra al índice del workspace es visible para todo el workspace'
      ],
      answer: 2,
      explain: 'El servidor arma la lista de canales de la persona y la consulta filtra por ellos; el cliente no es una frontera de seguridad. Un índice por persona copiaría cada mensaje tantas veces como lectores, el mismo problema del fan-out. Repasa <a href="m30-twitter.html#busqueda">M30</a> y <a href="m31-google-docs.html#permisos">M31</a>.'
    },
    {
      id: 'reacciones', type: 'single',
      prompt: 'Un anuncio recibe 3 000 reacciones por segundo. ¿Qué diseño del contador sirve?',
      options: [
        'Un UPDATE de la fila del mensaje por cada reacción, dentro de una transacción serializable',
        'Contar las reacciones en el cliente de cada persona y sumar lo que informen los clientes',
        'Una fila única por (mensaje, persona, emoji) y un total que se acumula en memoria y se vuelca',
        'Guardar solo el total, sin quién reaccionó, para que la escritura sea un entero y nada más'
      ],
      answer: 2,
      explain: 'La fila por persona hace idempotente la reacción (no se cuenta dos veces) y permite quitarla; el total se deriva y se acumula fuera de la fila caliente. Un UPDATE por reacción pone 3 000 transacciones en fila sobre un lock. Repasa <a href="m30-twitter.html#contadores">M30</a>.'
    },
    /* ---------- M31: Google Docs ---------- */
    {
      id: 'presencia', type: 'single',
      prompt: 'En un workspace de 200 000 personas, cada cambio de presencia (activo, ausente) se manda a todos los conectados. ¿Qué lo acota?',
      options: [
        'Mandar la presencia una vez por hora, para que el volumen total quede en un número fijo',
        'Que cada cliente se suscriba solo a la presencia de las personas que tiene en pantalla',
        'Guardar la presencia en la base principal, que la replica a las regiones sin costo extra',
        'Mostrar a todo el workspace como activo siempre, porque nadie mira ese punto verde'
      ],
      answer: 1,
      explain: 'Con 100 000 conectados y 10 cambios por persona al día, mandar todo a todos son más de un millón de mensajes por segundo; con unas 50 suscripciones por persona, unos 580. Es el mismo principio de los cursores de M31: solo a quien lo ve. Repasa <a href="m31-google-docs.html#presencia">M31</a>.'
    },
    {
      id: 'new-enemy', type: 'single',
      prompt: 'Ana saca a Beto de un canal privado y enseguida publica algo delicado. ¿Qué evita que una réplica atrasada de los permisos se lo muestre a Beto?',
      options: [
        'Que los permisos se guarden en caché por cinco minutos, así todas las réplicas coinciden',
        'Que el cliente de Beto borre el canal de su lista apenas recibe el aviso de que salió',
        'Que el mensaje se cifre con una clave que Beto ya no recibe a partir de ese momento',
        'Un token de consistencia guardado con el mensaje, que exige permisos al menos así de nuevos'
      ],
      answer: 3,
      explain: 'Es el problema del new enemy de Zanzibar: el zookie guardado con el contenido obliga a evaluar con una versión de los permisos posterior a la expulsión. Una caché de cinco minutos es justo la ventana del problema. Repasa <a href="m31-google-docs.html#permisos-new-enemy">M31</a>.'
    },
    {
      id: 'tuplas', type: 'single',
      prompt: 'Un archivo compartido en un canal lo puede ver quien sea miembro del canal, incluidas las personas que entren después. ¿Cómo se expresa en Zanzibar?',
      options: [
        'Copiando la lista de miembros al archivo cada vez que alguien entra o sale del canal',
        'Con una ACL fija en el archivo, calculada en el momento en que se compartió',
        'Con una tupla que da viewer del archivo a los miembros del canal, sin copiar la lista',
        'Con un rol global de lector de archivos, que se le da a todo el workspace por defecto'
      ],
      answer: 2,
      explain: 'Es ReBAC: <code>file:F#viewer@channel:C#member</code>. Entrar o salir del canal cambia una sola tupla, la del miembro, y el permiso del archivo se recalcula solo. Copiar listas se desincroniza. Repasa <a href="m31-google-docs.html#permisos-tuplas">M31</a>.'
    },
    {
      id: 'dueno-unico', type: 'single',
      prompt: 'Tras un cambio del anillo, dos servidores creen ser dueños del mismo canal y los dos intentan escribir. ¿Qué lo frena, como en el servidor de sesión de M31?',
      options: [
        'Que el balanceador mande todo el tráfico al servidor más nuevo y apague el otro',
        'Que la base rechace la segunda escritura de la misma posición del log por su clave',
        'Que cada servidor espere un minuto antes de escribir, hasta que el anillo se estabilice',
        'Que los clientes elijan qué servidor creer según cuál les respondió más rápido'
      ],
      answer: 1,
      explain: 'En M31, la clave primaria (doc_id, rev) hace fallar el segundo INSERT de la misma revisión: la base es el árbitro, no la opinión de cada servidor. Esperar un minuto no garantiza nada si un proceso se congela más. Repasa <a href="m31-google-docs.html#servidor">M31</a>.'
    }
  ]
});
