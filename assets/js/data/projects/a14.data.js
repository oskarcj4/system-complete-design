/* Decisiones guiadas de A14: observar una API de Spring Boot con PgBouncer, PostgreSQL y Redis. */
SD.defineExercise('a14-observabilidad', {
  title: 'la tienda que se puso lenta un martes a las once',
  scenario: '<p>La tienda de la guía: una API de Spring Boot con el agente de OpenTelemetry, PgBouncer en modo transaction con 8 conexiones reales, PostgreSQL 18 con dos millones de pedidos y Redis como caché de productos. Las señales van por OTLP a un Collector, y de ahí a Prometheus, Tempo y Loki. El SLO de latencia dice que el 99&#8239;% de las listas de pedidos responde en 250&#8239;ms o menos. Decide cómo se observa y cómo se investiga.</p>',
  steps: [
    {
      id: 'umbral',
      type: 'single',
      prompt: 'El histograma de HTTP del agente tiene cubetas en 100, 250 y 500&#8239;ms. ¿Por qué el umbral del SLO es 250&#8239;ms y no 200?',
      options: [
        'Porque 250 es un borde de cubeta: «cuántas tardaron 250&#8239;ms o menos» se lee exacto de la cubeta <code>le="0.25"</code>',
        'Porque Prometheus solo acepta umbrales de latencia que sean múltiplos de 50&#8239;ms en las reglas de grabación',
        'Porque 200&#8239;ms está por debajo del p50 de la ruta, y un SLO por debajo de la mediana no deja presupuesto',
        'Porque con 200&#8239;ms la alerta dispararía con cada pico, y 250 da un margen fijo del 25&#8239;% sobre el objetivo'
      ],
      answer: 0,
      explain: 'Un histograma solo sabe cuántas requests cayeron hasta cada borde. Con un umbral en un borde, la fracción buena sale de una cubeta sin estimar nada; con 200&#8239;ms habría que interpolar dentro de la cubeta de 100 a 250, y la alerta dependería de esa estimación. Vuelve a «Histogramas y percentiles» en Antes de empezar.'
    },
    {
      id: 'span-largo',
      type: 'single',
      prompt: 'Durante el incidente del reporte, el span de JDBC de una lista de pedidos dura 700&#8239;ms, pero en <code>pg_stat_statements</code> la media de esa misma consulta sigue en 2&#8239;ms. ¿Qué explica la diferencia?',
      options: [
        '<code>pg_stat_statements</code> promedia todas las ejecuciones del día, y las lentas de los últimos minutos se diluyen entre miles de rápidas',
        'El span cuenta la espera en la fila de PgBouncer; <code>pg_stat_statements</code> mide desde que la consulta llega a PostgreSQL',
        'El agente suma al span de JDBC el tiempo de serializar el JSON de la respuesta, que con 20 filas es grande',
        'El span incluye el tiempo de pedir la conexión a Hikari, que con hilos virtuales se bloquea mientras corre el reporte'
      ],
      answer: 1,
      explain: 'Con PgBouncer en modo transaction, la espera por una conexión real ocurre después de que la API mandó la consulta: el span de JDBC ya está contando. PostgreSQL no la ve, porque la consulta todavía no le llegó. La prueba está en USE: <code>cl_waiting</code> mayor que cero. Vuelve a «Dos filas antes de la base».'
    },
    {
      id: 'burn',
      type: 'single',
      prompt: 'Una regresión hace que el 30&#8239;% de las listas pase de 250&#8239;ms, de golpe, después de horas sanas. La alerta rápida exige más de 0.144 en las ventanas de 1&#8239;h y de 5&#8239;min, con <code>for: 2m</code>. ¿Cuándo dispara, más o menos?',
      options: [
        'Nunca: con el 30&#8239;% lento el burn rate es 30, pero la alerta rápida solo mira valores sostenidos por una hora completa',
        'A los 2 minutos y medio: la ventana de 5 minutos pasa 0.144 casi de inmediato, y solo falta el <code>for</code>',
        'A los 31 minutos: la de 1&#8239;h necesita 0.144 / 0.3 de la hora, unos 29 minutos, y después los 2 del <code>for</code>',
        'A las 6 horas, cuando la ventana larga se llena de requests lentas y la fracción llega al 30&#8239;%'
      ],
      answer: 2,
      explain: 'La ventana de una hora crece como f × t / 60: con f = 0.3 llega a 0.144 a los 0.144 × 60 / 0.3 ≈ 29 minutos. La de 5 minutos ya está arriba, así que manda la larga; luego el <code>for</code> suma 2 minutos. Con f menor que 0.144 no dispararía nunca. Vuelve a «SLO, presupuesto y burn rate».'
    },
    {
      id: 'cliente-id',
      type: 'single',
      prompt: 'Soporte quiere ver los pedidos lentos de un cliente en particular. ¿Dónde pones el <code>cliente_id</code>?',
      options: [
        'Como etiqueta del histograma de HTTP, para poder sacar el p99 de cada cliente directo desde Prometheus sin buscar traces',
        'En el nombre de la métrica, una por cliente, para que cada serie quede separada y no supere el tope del SDK',
        'En ningún lado: es un dato personal y no debe salir de la base, ni en traces ni en métricas ni en logs',
        'Como atributo del span de la request: en Tempo se busca con TraceQL, y en un span no crea series nuevas'
      ],
      answer: 3,
      explain: 'Cada span ya es único, así que un valor más por span no multiplica nada. En una métrica, cada cliente sería una serie: hasta 150&#8239;000 con los tres canales, y el SDK corta en 2000. El id es un número opaco; un email o un nombre sí serían un problema en Tempo. Vuelve al paso 3 y a «Cardinalidad».'
    },
    {
      id: 'redis-timeout',
      type: 'single',
      prompt: 'Redis está en pausa y no contesta. La lectura de un producto espera el timeout del <code>GET</code>, va a la base y espera el timeout del <code>SET</code>. Con el timeout de 500&#8239;ms, ¿qué ves en las señales?',
      options: [
        'Un p99 de algo más de 1&#8239;s en productos, dos <code>warn</code> por request en Loki y ningún 5xx',
        'Un p99 de 500&#8239;ms en productos, un <code>error</code> por request en Loki y un 503 por cada lectura',
        'El p99 de productos no cambia, porque Lettuce detecta la pausa y deja de mandar comandos mientras dura',
        'Un pico de 5xx en todas las rutas, porque el pool de Hikari se llena de conexiones esperando a Redis'
      ],
      answer: 0,
      explain: 'Dos esperas de 500&#8239;ms más una consulta rápida: un poco más de 1&#8239;s. <code>Catalogo</code> atrapa las dos fallas, escribe un <code>warn</code> por cada una y sigue con la base: falla abierta, sin 5xx. Hikari no tiene que ver: las conexiones de Redis no salen de ese pool. Vuelve al incidente de Redis.'
    },
    {
      id: 'primero',
      type: 'order',
      prompt: 'Suena la alerta de latencia de las listas de pedidos. Ordena la investigación, del primer paso al último.',
      items: [
        'Mirar RED en el tablero: qué ruta sufre y desde cuándo',
        'Abrir un exemplar del p99 de esa ruta y ver en el trace qué span se lleva el tiempo',
        'Mirar USE: si PgBouncer tiene clientes esperando o si la consulta misma es lenta',
        'Buscar la consulta en <code>pg_stat_statements</code> y explicar su plan con <code>EXPLAIN</code>'
      ],
      explain: 'De lo general a lo particular: RED dice qué ruta, el trace dice qué pieza, USE dice si es una fila o la consulta, y la base dice por qué. Saltar directo a la base sin el trace puede mandarte a optimizar una consulta que es rápida y solo espera en la fila. Vuelve a «RED y USE» y a «El viaje de un dato».'
    },
    {
      id: 'collector',
      type: 'single',
      prompt: 'Alguien propone quitar el Collector y que el agente mande directo a Tempo, Prometheus y Loki: «una pieza menos». ¿Qué pierdes?',
      options: [
        'Los exemplars, porque solo el Collector sabe pegar un <code>trace_id</code> a un punto de un histograma antes de mandarlo',
        'Un solo destino para la API: cambiar de backend, muestrear o limpiar datos personales pasaría a ser un deploy de la API',
        'La propagación del contexto entre servicios, que la hace el Collector reescribiendo la cabecera <code>traceparent</code>',
        'Los logs: el agente no puede mandar logs por OTLP sin un Collector en el medio, solo traces y métricas'
      ],
      answer: 1,
      explain: 'El agente puede mandar a cualquier destino OTLP, y los exemplars y el <code>traceparent</code> los pone el SDK, no el Collector. Lo que da el Collector es desacople: la API conoce una dirección, y los reintentos, los lotes, el muestreo y la limpieza de atributos se cambian sin tocar la API. Vuelve a «OTLP y el Collector».'
    },
    {
      id: 'exporter',
      type: 'single',
      prompt: '¿Con qué permisos entra postgres-exporter a la base?',
      options: [
        'Con el dueño, <code>tienda</code>, porque <code>pg_stat_statements</code> solo muestra el texto de las consultas a un superusuario',
        'Con <code>tienda_api</code>, para que las conexiones del exporter cuenten dentro del mismo pool de PgBouncer que la API',
        'Con un rol miembro de <code>pg_monitor</code>, con tope de conexiones, que lee estadísticas pero no las tablas',
        'Sin contraseña desde la red de Docker, porque el exporter solo lee vistas del sistema y nunca toca datos'
      ],
      answer: 2,
      explain: 'Mínimo privilegio: <code>pg_monitor</code> deja leer <code>pg_stat_statements</code> con el texto de todas las consultas y las demás vistas de estadísticas, sin acceso a las tablas. El tope de 3 conexiones evita que un exporter con un bug se coma la base. Y como ese rol ve el texto de todas las consultas, los valores van como parámetros. Vuelve al paso 1.'
    }
  ],
  solution: '<p>El hilo de A14: cada request deja tres rastros con el mismo <code>trace_id</code>, y la investigación va del número a la causa. RED dice qué ruta sufre; un exemplar lleva al trace, que dice qué pieza se lleva el tiempo; USE distingue una fila (PgBouncer con <code>cl_waiting</code>) de una consulta lenta; y <code>pg_stat_statements</code> con <code>EXPLAIN</code> dice por qué. El SLO se escribe sobre un borde de cubeta y se alerta por burn rate con dos ventanas, con la cuenta hecha a mano antes del incidente. El <code>cliente_id</code> va en el span, nunca en una métrica. El Collector desacopla la API de los backends, y cada exporter entra con lo mínimo para leer estadísticas.</p>'
});
