/* Decisiones guiadas de IA01 (Un agente de guardia). Formato en core/exercise.js. */

SD.defineExercise('ia01-guardia', {
  title: 'un agente que investiga antes de despertarte',
  scenario: '<p>El agente corre como en esta guía: un grafo de LangGraph con triage, un bucle de investigación con cuatro herramientas de solo lectura (métricas, logs, runbooks y SQL), dos acciones con efecto (cambiar un flag y cancelar consultas) que pasan por una aprobación, y un informe. Los checkpoints van a PostgreSQL con <code>durability="sync"</code>. El tope es de 12 pasos y 200&#8239;000 tokens por investigación. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'solo-lectura', type: 'single',
      prompt: '¿Dónde pones la garantía de que <code>consultar_sql</code> nunca escribe en la base de la tienda?',
      options: [
        'En el prompt del sistema, con una regla clara que prohíba cualquier escritura.',
        'En un rol de PostgreSQL con solo <code>SELECT</code>, que la base hace cumplir aunque el modelo insista.',
        'En una expresión regular que rechace <code>UPDATE</code>, <code>DELETE</code> e <code>INSERT</code> antes de mandar la consulta.',
        'En el modelo más capaz, porque respeta mejor las instrucciones de seguridad.'
      ],
      answer: 1,
      explain: 'El prompt y el modelo son pedidos, no barreras: una nota envenenada o un error del modelo los saltan. Una expresión regular se equivoca con un <code>WITH … UPDATE</code> o con una función que escribe. El <code>GRANT</code> no depende de nada de eso: si el rol no tiene <code>UPDATE</code>, la base dice que no. Es el privilegio mínimo de M25, y la prueba del paso 4 lo muestra con un <code>UPDATE</code> que falla.'
    },
    {
      id: 'donde-se-detiene', type: 'single',
      prompt: 'El modelo propone <code>CambiarFlag</code>. ¿Dónde se detiene el grafo para pedir permiso?',
      options: [
        'En un <code>input()</code> dentro de la herramienta, que espera la respuesta.',
        'Después del efecto, para que la persona lo revise y lo revierta si no está de acuerdo.',
        'En un nodo con <code>interrupt</code>, antes del efecto, con el estado guardado en el checkpoint.',
        'En ninguna parte: la descripción de la herramienta ya le pide al modelo que confirme.'
      ],
      answer: 2,
      explain: '<code>interrupt</code> pausa el grafo y guarda el estado; la decisión llega días después con <code>Command(resume=…)</code>, aunque el proceso se haya apagado. Un <code>input()</code> bloquea un proceso que tiene que seguir vivo y no sobrevive a una caída. Revisar después del efecto no sirve para lo que no se deshace, como una consulta cancelada. Y el modelo no puede aprobarse a sí mismo.'
    },
    {
      id: 'antes-del-interrupt', type: 'single',
      prompt: 'Alguien agrega en el nodo <code>aprobar</code>, antes del <code>interrupt</code>, un aviso a Slack: "hay una acción esperando". ¿Qué pasa?',
      options: [
        'El aviso sale una sola vez, porque LangGraph guarda en el checkpoint lo que hizo cada línea.',
        'El aviso no sale nunca, porque <code>interrupt</code> descarta lo que el nodo hizo antes de pausarse.',
        'El aviso sale una sola vez, porque el grafo reanuda justo en la línea del <code>interrupt</code>.',
        'El aviso se repite en cada reanudación, porque el nodo vuelve a correr desde el principio.'
      ],
      answer: 3,
      explain: 'Al reanudar, LangGraph corre otra vez el nodo del <code>interrupt</code> desde su primera línea; esta vez <code>interrupt()</code> devuelve la decisión en lugar de pausar. Lo que había antes se ejecuta de nuevo. Por eso <code>aprobar</code> solo arma el pedido, y todo efecto vive en otro nodo, <code>actuar</code>, que corre una vez por decisión.'
    },
    {
      id: 'clave', type: 'single',
      prompt: 'La acción se anota en la tabla <code>acciones</code> con una clave, antes del efecto. ¿De dónde sale la clave?',
      options: [
        'Del id del hilo y del id de la llamada del modelo, que ya quedaron guardados en el checkpoint.',
        'De un <code>uuid4()</code> generado en <code>actuar</code>, para que cada ejecución tenga una clave distinta.',
        'Del nombre de la acción y sus argumentos, para que dos acciones iguales cuenten como una.',
        'De la hora de la aprobación redondeada al segundo, que es la misma en cada intento.'
      ],
      answer: 0,
      explain: 'La clave tiene que ser la misma si <code>actuar</code> se repite después de una caída, y distinta para dos acciones distintas. Un <code>uuid4()</code> nuevo en cada ejecución no reconoce la repetición. El nombre y los argumentos confunden dos acciones legítimas iguales, como apagar el mismo flag en dos incidentes. La hora no es estable. El id de la llamada ya quedó escrito en el checkpoint junto con el mensaje del modelo: es la idempotency key de M27, derivada de quien origina la operación.'
    },
    {
      id: 'quien-corta', type: 'single',
      prompt: '¿Quién decide que una investigación se terminó porque se acabó el presupuesto?',
      options: [
        'El modelo, porque el prompt le pide que pare cuando lleve doce llamadas.',
        'La arista después de <code>investigar</code>, con los pasos y tokens del estado.',
        'El proveedor del modelo, que corta con un error cuando la conversación es demasiado larga.',
        'El checkpointer, que deja de guardar pasos cuando el hilo pasa de cierto tamaño.'
      ],
      answer: 1,
      explain: 'El tope tiene que estar fuera del modelo: un modelo en un bucle no cuenta bien sus propias llamadas, y es justo el caso que el tope existe para cortar. El límite del proveedor llega tarde y con un error en lugar de un informe. La arista lee <code>pasos</code>, <code>tokens_entrada</code> y <code>tokens_salida</code>, que cada nodo suma desde <code>usage_metadata</code>, y manda al informe. Son los topes de M25.'
    },
    {
      id: 'salida-larga', type: 'single',
      prompt: '<code>buscar_logs</code> encuentra 4&#8239;000 líneas que coinciden. ¿Qué le devuelve al modelo?',
      options: [
        'Las 4&#8239;000 líneas, porque el modelo necesita verlas todas para no perderse la causa.',
        'Solo la primera línea, porque la más vieja suele señalar la causa.',
        'Un resumen de las 4&#8239;000 líneas hecho por otra llamada al modelo, sin perder ninguna.',
        'El conteo y las 30 líneas más recientes, recortadas, con un aviso de que hay más.'
      ],
      answer: 3,
      explain: 'Todo lo que devuelve una herramienta entra al contexto y se vuelve a leer, y a pagar, en cada paso siguiente. 4&#8239;000 líneas llenan la ventana de qwen3 y le cuestan a Claude en cada llamada. Un resumen con otra llamada es caro y puede esconder justo la línea rara. El conteo dice cuánto hay, la muestra dice cómo es, y el aviso le dice al modelo que puede afinar el <code>texto</code> o los <code>minutos</code>.'
    },
    {
      id: 'metodo', type: 'single',
      prompt: 'El triage usa <code>with_structured_output</code> con Claude Sonnet 5.5. ¿Con qué <code>method</code>?',
      options: [
        '<code>function_calling</code>, que fuerza la herramienta del esquema con <code>tool_choice</code>.',
        '<code>json_schema</code>, la salida estructurada nativa, sin forzar ninguna herramienta.',
        '<code>json_mode</code>, que pide JSON libre y valida el esquema del lado de LangChain.',
        'Ninguno: se pide JSON en el prompt del sistema y se parsea con <code>json.loads</code>.'
      ],
      answer: 1,
      explain: 'El método por defecto de Claude en LangChain es forzar una herramienta, y Sonnet 5.5 responde 400 a un <code>tool_choice</code> forzado. <code>json_schema</code> usa la salida estructurada nativa: la respuesta cumple el esquema. Para Ollama es además el método por defecto. Pedir JSON en el prompt funciona hasta que el modelo agrega una frase antes de la llave.'
    },
    {
      id: 'veneno', type: 'single',
      prompt: 'Una nota de cliente que aparece en los logs le pide al agente cerrar la tienda. ¿Qué barrera no depende de que el modelo obedezca?',
      options: [
        'El spotlighting: con los resultados dentro de <code>&lt;resultado&gt;</code>, el modelo los ignora.',
        'Un prompt del sistema que diga que los datos de las herramientas nunca son instrucciones.',
        'Que la acción solo se proponga y una persona la lea antes de aplicarla.',
        'Correr el agente con Claude en lugar del modelo local, porque resiste mejor la injection.'
      ],
      answer: 2,
      explain: 'El spotlighting y el prompt bajan la probabilidad de que el modelo obedezca, pero no la llevan a cero: los dos dependen del modelo, sea cual sea. La aprobación no: aunque el modelo proponga cerrar la tienda, nada pasa hasta que alguien lo lee. Junto con el rol del actor, que solo toca tres columnas, son las defensas de arquitectura de la trifecta en M25.'
    }
  ],
  solution: '<ul><li>Los permisos de solo lectura van en un rol de PostgreSQL, no en el prompt.</li><li>Las acciones son esquemas que solo se proponen; el grafo se detiene con <code>interrupt</code> antes del efecto.</li><li>Nada con efectos antes del <code>interrupt</code>: el nodo se repite al reanudar.</li><li>La clave de cada acción sale del hilo y del id de la llamada, guardados en el checkpoint.</li><li>El presupuesto lo corta la arista, con contadores en el estado.</li><li>Las herramientas devuelven poco, con tope y aviso.</li><li>Salida estructurada con <code>json_schema</code>.</li><li>Contra la injection, barreras que no dependen del modelo: aprobación y privilegio mínimo.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia01-p-victima', {
  kind: 'predict', title: 'la víctima',
  scenario: '<p>Copiaste <code>compose.yaml</code>, <code>prometheus.yml</code>, <code>init.sql</code> y los seis archivos de <code>servicios/</code>. Corres <code>docker compose up -d --build</code> y después <code>docker compose ps</code>.</p>',
  steps: [{
    id: 'contenedores', type: 'single',
    prompt: '¿Cuántos contenedores aparecen en <code>Up</code>?',
    options: [
      'Seis: postgres, pagos, tienda, trafico, prometheus y phoenix',
      'Tres, porque la tienda, pagos y el tráfico comparten una imagen',
      'Cinco: Phoenix solo arranca cuando defines <code>GUARDIA_PHOENIX</code>',
      'Siete: los seis del compose más Ollama, que el agente necesita'
    ],
    answer: 0,
    explain: 'Una imagen puede correr en varios contenedores: <code>servicios/</code> se construye una vez y el compose la arranca tres veces, con un <code>command</code> distinto. Phoenix está en el compose y arranca siempre; <code>GUARDIA_PHOENIX</code> solo le dice al agente si mandarle traces. Ollama corre fuera de Docker, en tu máquina.'
  }]
});

SD.defineExercise('ia01-p-caos', {
  kind: 'predict', title: 'los incidentes',
  scenario: '<p>Corres <code>uv run python caos.py deploy</code>, que termina con <code>listo: deploy</code>. Enseguida corres <code>uv run python caos.py estado</code>.</p>',
  steps: [{
    id: 'version', type: 'single',
    prompt: '¿Qué versión imprime <code>estado</code>?',
    options: [
      '<code>versión 2.4.0</code>: cada comando corre <code>normal</code> antes de empezar',
      '<code>versión 2.5.0</code>',
      '<code>versión ?</code>, hasta que la tienda relea la base dentro de 2&#8239;s',
      'Ninguna: <code>estado</code> solo imprime flags y reportes'
    ],
    answer: 1,
    explain: 'El <code>if</code> del final corre <code>normal()</code> antes de cada escenario, salvo con <code>normal</code> y con <code>estado</code>: mirar no deshace nada. <code>estado</code> lee la versión de la tabla <code>despliegues</code>, no de la tienda, así que no espera los 2&#8239;s del refresco. El <code>?</code> es lo que muestra <code>/salud</code> antes de la primera lectura.'
  }]
});

SD.defineExercise('ia01-p-config', {
  kind: 'predict', title: 'la configuración',
  scenario: '<p>Sin nada exportado en la terminal, corres <code>GUARDIA_MODELO=ollama uv run python -c "from guardia.config import CFG; print(CFG.max_pasos, CFG.modelo)"</code>.</p>',
  steps: [{
    id: 'imprime', type: 'single',
    prompt: '¿Qué imprime?',
    options: [
      '<code>12 claude</code>, porque el valor por defecto gana',
      '<code>3 ollama</code>, el tope que usaste en el comando anterior',
      '<code>12 ollama</code>',
      'Un <code>KeyError</code>, porque falta <code>GUARDIA_MAX_PASOS</code>'
    ],
    answer: 2,
    explain: 'La variable delante del comando vale solo para ese proceso: el modelo es <code>ollama</code>. <code>GUARDIA_MAX_PASOS</code> no está, y <code>os.environ.get(…, "12")</code> usa el valor por defecto en lugar de fallar. El 3 del comando anterior no quedó guardado en ningún lado.'
  }]
});

SD.defineExercise('ia01-p-herr', {
  kind: 'predict', title: 'las herramientas',
  scenario: '<p>Con el compose andando, intentas escribir con la herramienta de lectura: <code>consultar_sql.invoke({"sql": "UPDATE flags SET activo = false WHERE nombre = \'checkout_v2\'"})</code>.</p>',
  steps: [{
    id: 'update', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Devuelve <code>La consulta no devolvió filas.</code> y el flag queda en <code>false</code>',
      'Devuelve <code>ERROR: una sola consulta, sin punto y coma en medio.</code>',
      'La base lanza un error de transacción de solo lectura, y el flag no cambia',
      'El flag cambia, porque la conexión usa <code>autocommit=True</code>'
    ],
    answer: 2,
    explain: 'El rol <code>agente_lector</code> tiene las transacciones en solo lectura y no tiene <code>UPDATE</code>: PostgreSQL responde <code>cannot execute UPDATE in a read-only transaction</code>. <code>autocommit</code> decide cuándo se confirma, no qué se permite. La revisión del punto y coma solo mira si hay dos consultas. Aquí la excepción sube; en el paso 7, el grafo la convierte en un texto <code>ERROR: …</code> para el modelo.'
  }]
});

SD.defineExercise('ia01-p-runbooks', {
  kind: 'predict', title: 'los runbooks',
  scenario: '<p>Corres <code>uv run guardia-indexar</code> dos veces seguidas, sin tocar los runbooks. Después cuentas las filas con <code>SELECT count(*) FROM runbooks</code> en la base <code>guardia</code>.</p>',
  steps: [{
    id: 'filas', type: 'single',
    prompt: '¿Cuántas filas hay?',
    options: ['4', '12', '24', 'Ninguna: la segunda corrida falla por clave duplicada'],
    fixed: true,
    answer: 1,
    explain: 'Cuatro runbooks con tres secciones <code>##</code> cada uno dan doce trozos. La segunda corrida choca con la clave <code>(archivo, seccion)</code>, y <code>ON CONFLICT … DO UPDATE</code> reemplaza el texto y el vector en lugar de fallar o duplicar. Por eso puedes indexar de nuevo cada vez que cambias un runbook.'
  }]
});

SD.defineExercise('ia01-p-acciones', {
  kind: 'predict', title: 'las acciones',
  scenario: '<p>Corres <code>uv run python -c "from guardia.acciones import CambiarFlag; CambiarFlag(nombre=\'tienda\', activo=False, motivo=\'x\')"</code>.</p>',
  steps: [{
    id: 'flag', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Un <code>ValidationError</code>: <code>tienda</code> no es uno de los tres flags',
      '<code>permission denied for table flags</code>, porque no hay conexión con el rol actor',
      'Nada: crea el objeto, y el error aparecería recién en el <code>UPDATE</code>',
      'Imprime <code>No existe el flag tienda.</code>, que es lo que devuelve el efecto'
    ],
    answer: 0,
    explain: '<code>nombre</code> es un <code>Literal</code> con tres valores, y Pydantic lo revisa al crear el objeto, antes de cualquier conexión. Crear un <code>CambiarFlag</code> no toca la base: el efecto vive en <code>_cambiar_flag</code>, y solo corre desde <code>aplicar()</code>. Por eso un nombre inventado por el modelo nunca llega al <code>UPDATE</code>.'
  }]
});

SD.defineExercise('ia01-p-grafo', {
  kind: 'predict', title: 'el grafo',
  scenario: '<p>En una misma respuesta, el modelo pide dos cosas: <code>consultar_sql</code> con un <code>SELECT</code>, y <code>CambiarFlag</code> para apagar <code>checkout_v2</code>.</p>',
  steps: [{
    id: 'camino', type: 'single',
    prompt: '¿Qué nodo sigue, y qué pasa con la consulta?',
    options: [
      '<code>herramientas</code>: primero corre la lectura, y la acción espera a la próxima vuelta',
      '<code>aprobar</code>, y la consulta corre después en <code>actuar</code>, junto con tu decisión',
      '<code>aprobar</code>, y la consulta se descarta: el modelo tiene que volver a pedirla',
      '<code>informe</code>, porque pedir una acción y una lectura juntas cierra la investigación'
    ],
    answer: 1,
    explain: '<code>despues_de_investigar</code> manda a <code>aprobar</code> si alguna llamada es una acción. Después, <code>actuar</code> recorre todas las llamadas del mensaje: las acciones se aplican o se rechazan, y las lecturas pasan por <code>ejecutar_lectura</code>. Todas tienen que recibir su <code>ToolMessage</code>, porque la API rechaza una llamada sin respuesta.'
  }]
});

SD.defineExercise('ia01-p-cli', {
  kind: 'predict', title: 'la línea de comandos',
  scenario: '<p><code>guardia investigar … --hilo inc-1</code> terminó con <code>== Necesita aprobación ==</code> y la pista para decidir. Antes de decidir, corres <code>uv run guardia ver inc-1</code>.</p>',
  steps: [{
    id: 'siguiente', type: 'single',
    prompt: '¿Qué dice la primera línea?',
    options: [
      '<code>Siguiente: nada, terminó</code>, porque el comando ya volvió a la terminal',
      '<code>Siguiente: (\'actuar\',)</code>',
      '<code>Siguiente: (\'aprobar\',)</code>',
      'Un error: el hilo vivía en el proceso de <code>investigar</code>, que ya terminó'
    ],
    answer: 2,
    explain: 'El grafo quedó detenido dentro de <code>aprobar</code>, en el <code>interrupt</code>, y el checkpoint guardó que ese es el nodo pendiente. Que el comando haya terminado no cierra el hilo: el estado está en PostgreSQL. <code>actuar</code> todavía no corre, porque falta tu decisión.'
  }]
});

SD.defineExercise('ia01-p-pruebas', {
  kind: 'predict', title: 'las pruebas',
  scenario: '<p>En <code>test_lee_y_termina_con_informe</code>, el guion es <code>[llamada("buscar_logs", …), final()]</code>, y cada respuesta falsa trae <code>usage_metadata</code> con 1000 tokens de entrada y 50 de salida.</p>',
  steps: [{
    id: 'llamadas', type: 'single',
    prompt: '¿Cuántas veces llama el grafo a un modelo, y cuántos tokens suma?',
    options: [
      'Dos veces, una por respuesta del guion: 2100 tokens',
      'Tres veces (triage y las dos del guion): 3150 tokens',
      'Cuatro veces (triage, dos del guion e informe): 4200 tokens',
      'Cinco veces, porque herramientas también llama al modelo: 5250'
    ],
    answer: 2,
    explain: 'El guion solo cubre <code>investigar</code>. El triage y el informe usan <code>with_structured_output</code>, que en el modelo falso devuelve respuestas fijas con el mismo <code>usage_metadata</code>. Son 4 × 1050 = 4200, la cuenta de la última línea de la prueba. <code>herramientas</code> no llama al modelo: corre las funciones.'
  }]
});

SD.defineExercise('ia01-p-evals', {
  kind: 'predict', title: 'los evals',
  scenario: '<p>Corres los evals con <code>--k 3</code>. El caso <code>pagos</code> sale <code>ok</code>, <code>FALLA</code> y <code>ok</code>.</p>',
  steps: [{
    id: 'tabla', type: 'single',
    prompt: '¿Qué fila imprime la tabla para <code>pagos</code>?',
    options: [
      '<code>pagos  sí  no  2 de 3</code>',
      '<code>pagos  no  no  2 de 3</code>',
      '<code>pagos  sí  sí  2 de 3</code>',
      '<code>pagos  no  sí  2 de 3</code>'
    ],
    fixed: true,
    answer: 0,
    explain: 'pass@k pregunta si pasó alguno (<code>any</code>): sí. pass^k pregunta si pasaron todos (<code>all</code>): no, por el intento del medio. La última columna cuenta los aciertos. pass^k en sí con pass@k en no es imposible: si pasan todos, pasó alguno.'
  }]
});
