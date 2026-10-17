/* Decisiones guiadas de IA00 (El laboratorio de IA). Formato en core/exercise.js. */

SD.defineExercise('ia00-laboratorio', {
  title: 'un agente pequeño que consulta y repone stock',
  scenario: '<p>El laboratorio corre como en esta guía: PostgreSQL 17 en Docker con los roles <code>lab_lector</code> y <code>lab_actor</code>, Ollama con qwen3:8b o Claude por la API, y un grafo de LangGraph con dos herramientas de lectura, una acción <code>Reponer</code> que pasa por <code>interrupt</code> y checkpoints en PostgreSQL. El tope es de 8 pasos. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'versiones', type: 'single',
      prompt: 'En <code>pyproject.toml</code>, ¿cómo escribes la versión de LangGraph?',
      options: [
        '<code>langgraph&gt;=1.2</code>, para recibir solas las correcciones y las mejoras nuevas.',
        '<code>langgraph==1.2.13</code>, la versión exacta que probó la guía.',
        '<code>langgraph</code> sin versión, porque <code>uv.lock</code> ya anota la que se instaló.',
        '<code>langgraph~=1.0</code>, que deja pasar cualquier versión 1.x compatible.'
      ],
      answer: 1,
      explain: 'Con <code>&gt;=</code> o <code>~=</code>, quien clone tu repositorio dentro de unos meses puede instalar otra versión, con otros nombres o comportamientos. <code>uv.lock</code> ayuda, pero solo si se sube y nadie corre <code>uv lock --upgrade</code>. Fijar con <code>==</code> deja el contrato escrito en el archivo que todos leen.'
    },
    {
      id: 'sin-permiso', type: 'single',
      prompt: 'El modelo pide <code>Reponer</code>. ¿Qué impide que se aplique sin tu aprobación?',
      options: [
        'La regla del prompt que le dice al modelo que una persona aprueba o rechaza cada reposición.',
        'Que <code>Reponer</code> tiene un límite de 100 unidades, así que el daño posible es chico.',
        'La arista que manda a <code>aprobar</code>, y que <code>Reponer</code> no tiene una función que la corra.',
        'Que el modelo local no sabe llamar acciones con efecto, solo herramientas de lectura sin parámetros.'
      ],
      answer: 2,
      explain: 'El prompt es un pedido: el modelo puede no cumplirlo, pero aunque lo ignore, la propuesta sigue siendo solo un mensaje. Lo que la ejecuta está en tu código: la arista manda todo mensaje con <code>Reponer</code> al nodo <code>aprobar</code>, y el nodo <code>herramientas</code> ni siquiera la conoce. El tope de 100 limita el tamaño del daño, no lo evita.'
    },
    {
      id: 'memoria', type: 'single',
      prompt: 'Preguntas dos veces en el mismo hilo y el modelo recuerda la primera pregunta. ¿Dónde estaba guardada?',
      options: [
        'En el checkpoint de PostgreSQL: el grafo vuelve a mandarle al modelo toda la conversación.',
        'En el modelo, que guarda por un rato las conversaciones recientes de cada usuario que le escribe.',
        'En Ollama, que mantiene el contexto de cada sesión abierta hasta que se reinicia.',
        'En la memoria del proceso de <code>lab</code>, que sigue vivo entre un comando y el siguiente.'
      ],
      answer: 0,
      explain: 'Un modelo de chat no recuerda nada entre llamadas: recibe la lista de mensajes y responde. Cada comando <code>lab</code> es un proceso nuevo que termina al responder. Lo que sobrevive es el checkpoint: al empezar, el grafo lee el estado del hilo, le suma la pregunta nueva y le manda todo al modelo. Es lo que comprueba <code>test_el_checkpoint_recuerda_la_conversacion</code>.'
    },
    {
      id: 'error', type: 'single',
      prompt: '<code>consultar_stock</code> falla porque la tabla está bloqueada. ¿Qué tiene que pasar?',
      options: [
        'El grafo se detiene con la excepción, para que veas en la terminal exactamente qué pasó.',
        'La herramienta reintenta en un bucle hasta que la tabla se libere, sin avisarle al modelo.',
        'El grafo salta al nodo <code>sin_pasos</code>, porque una herramienta caída no deja seguir.',
        'El error vuelve al modelo como un resultado que empieza con <code>ERROR:</code>, y él decide.'
      ],
      answer: 3,
      explain: 'Si la excepción corta el grafo, se pierde la pregunta y el modelo no puede decir nada útil. Reintentar sin tope cuelga el comando mientras dure el bloqueo. Un error como resultado deja que el modelo cuente lo que pasó o pruebe otra cosa, y el tope de pasos sigue cortando si insiste. El <code>statement_timeout</code> de 2&#8239;s asegura que el error llegue rápido.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '¿De dónde sale la clave con la que <code>aplicar</code> anota cada reposición?',
      options: [
        'De un <code>uuid4()</code> nuevo generado en <code>actuar</code>, para que nunca se repita.',
        'Del id del hilo y del id de la llamada del modelo, que quedaron en el checkpoint.',
        'Del producto y la cantidad, para que dos reposiciones iguales cuenten como una sola.',
        'De la hora en que apruebas, redondeada al segundo, que identifica tu decisión.'
      ],
      answer: 1,
      explain: 'La clave tiene que ser la misma si <code>actuar</code> se repite y distinta para dos reposiciones distintas. Un <code>uuid4()</code> cambia en cada ejecución y no reconoce la repetición. Producto y cantidad confunden dos reposiciones legítimas iguales en días distintos. La hora no es estable. El id de la llamada ya está guardado junto con el mensaje del modelo.'
    },
    {
      id: 'antes-interrupt', type: 'single',
      prompt: 'Alguien agrega en <code>aprobar</code>, antes de <code>interrupt()</code>, una línea que suma 1 a un contador en la base. ¿Qué pasa?',
      options: [
        'El contador sube una vez, porque LangGraph recuerda qué líneas del nodo ya corrieron.',
        'El contador no sube nunca, porque <code>interrupt</code> deshace lo que el nodo hizo antes.',
        'El contador sube una vez, porque el grafo reanuda justo en la línea de <code>interrupt</code>.',
        'Sube dos veces, porque al reanudar el nodo corre otra vez desde arriba.'
      ],
      answer: 3,
      explain: 'Al reanudar con <code>Command(resume=…)</code>, LangGraph corre el nodo otra vez desde su primera línea; esta vez <code>interrupt()</code> devuelve la decisión en lugar de detenerse. Lo que había antes se ejecuta de nuevo. Por eso <code>aprobar</code> solo arma la propuesta y el efecto vive en <code>actuar</code>, con su clave.'
    },
    {
      id: 'falso', type: 'single',
      prompt: '<code>test_reponer_espera_la_aprobacion</code> pasa con el modelo falso. ¿Qué te dice eso?',
      options: [
        'Que el grafo se detiene antes del efecto cuando se pide <code>Reponer</code>.',
        'Que qwen3:8b y Claude proponen reposiciones correctas, porque el guion imita su forma.',
        'Que la tabla <code>reposiciones</code> rechaza una clave repetida, como hace PostgreSQL.',
        'Nada útil, porque un modelo que responde con un guion no se parece a uno de verdad.'
      ],
      answer: 0,
      explain: 'El guion fija lo que pide el modelo, así que la prueba mide solo tu código: la arista, el <code>interrupt</code> y que <code>actuar</code> aplique después. No dice nada de si el modelo propone bien; eso lo miden los evals. Tampoco prueba PostgreSQL: <code>Almacen</code> lo reemplaza. Que no se parezca al modelo es justo lo que la hace repetible.'
    },
    {
      id: 'pass-k', type: 'single',
      prompt: 'El caso <code>reponer</code> acertó 2 de 3 intentos. ¿Qué número miras para dejar que el agente reponga sin revisar cada propuesta?',
      options: [
        'pass@3, que dio «sí»: el modelo sabe resolver el caso, y eso es lo que importa.',
        'El promedio, 67&#8239;%, porque resume en un número los tres intentos del caso.',
        'pass^3, que dio «no»: en una de cada tres corridas propondría una reposición equivocada.',
        'Ninguno: con solo tres intentos no se puede concluir nada sobre un modelo de lenguaje que cambia.'
      ],
      answer: 2,
      explain: 'pass@k sirve cuando una persona elige el mejor de varios intentos. Un agente que actúa solo corre una vez cada vez, muchas veces: necesitas que acierte siempre, y eso es pass^k. Si 2 de 3 reflejara una probabilidad de 2/3, acertar tres seguidas sería 8/27, cerca de 0.30. Tres intentos no dan la probabilidad exacta, pero un «no» en pass^3 ya basta para no soltarlo.'
    }
  ],
  solution: '<ul><li>Versiones exactas con <code>==</code> en <code>pyproject.toml</code>.</li><li>La acción se detiene en el código: la arista manda a <code>aprobar</code> y <code>Reponer</code> no tiene función que la ejecute.</li><li>La memoria está en el checkpoint, no en el modelo.</li><li>Los errores de las herramientas vuelven como resultados.</li><li>La clave sale del hilo y del id de la llamada.</li><li>Nada con efectos antes del <code>interrupt</code>.</li><li>Las pruebas miden el grafo; los evals, el modelo.</li><li>Para un agente que actúa solo, pass^k.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia00-p-caos', {
  kind: 'predict', title: 'los escenarios',
  scenario: '<p>Ya corriste <code>uv run python caos.py agotar</code>. Ahora corres <code>uv run python caos.py estado</code>.</p>',
  steps: [{
    id: 'taza', type: 'single',
    prompt: '¿Qué línea aparece para la taza?',
    options: ['<code>producto taza 3 10</code>', '<code>producto taza 40 10</code>', '<code>producto taza 0 10</code>', '<code>reposición taza 7</code>'],
    answer: 0,
    explain: '<code>agotar</code> corre primero <code>normal</code> (la taza vuelve a 40) y después deja la taza en 3 y el termo en 0. El 10 es el mínimo de la taza, que viene del <code>INSERT</code> de <code>init.sql</code>. <code>estado</code> imprime nombre, stock y mínimo; no hay reposiciones, porque <code>normal</code> las borró.'
  }]
});

SD.defineExercise('ia00-p-config', {
  kind: 'predict', title: 'la configuración',
  scenario: '<p>Corres <code>LAB_MAX_PASOS=3 uv run python -c "from lab.config import CFG; print(CFG)"</code> y ves <code>max_pasos=3</code>. En la misma terminal, sin nada delante, corres <code>uv run python -c "from lab.config import CFG; print(CFG.max_pasos)"</code>.</p>',
  steps: [{
    id: 'prefijo', type: 'single',
    prompt: '¿Qué imprime el segundo comando?',
    options: [
      '8: la variable delante de un comando vale solo para ese comando',
      '3: la variable quedó guardada en la terminal desde el comando anterior',
      '3: <code>CFG</code> se guardó en disco la primera vez que se creó',
      'Nada: falla porque <code>LAB_MAX_PASOS</code> ya no existe'
    ],
    answer: 0,
    explain: '<code>VAR=valor comando</code> pone la variable solo en el entorno de ese proceso. El segundo comando no la tiene, así que <code>os.environ.get("LAB_MAX_PASOS", "8")</code> usa el valor por defecto. Para que dure, usa <code>export LAB_MAX_PASOS=3</code> o ponla en <code>.env</code>. <code>CFG</code> se arma cada vez que arranca un proceso; no se guarda en ningún lado.'
  }]
});

SD.defineExercise('ia00-p-modelos', {
  kind: 'predict', title: 'los dos modelos',
  scenario: '<p>Ollama está cerrado: no corre la app ni <code>ollama serve</code>. Corres el comando del paso, con <code>modelo_chat("ollama").invoke(…)</code>.</p>',
  steps: [{
    id: 'cerrado', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Falla con un error de conexión: nadie escucha en el 11434 local',
      'Contesta Claude en su lugar, porque <code>init_chat_model</code> tiene un respaldo',
      'Imprime una respuesta vacía, porque el modelo no alcanzó a cargarse',
      'Ollama se abre solo cuando alguien llama a su puerto'
    ],
    answer: 0,
    explain: 'La conexión se abre al llamar a <code>invoke()</code>. Con Ollama cerrado no hay nada en <code>localhost:11434</code> y la llamada falla con un error de conexión. No hay respaldo automático: el proveedor sale de <code>LAB_MODELO</code> o del argumento, y cambiarlo es una decisión tuya. Abre Ollama y vuelve a correrlo.'
  }]
});

SD.defineExercise('ia00-p-herr', {
  kind: 'predict', title: 'las herramientas de lectura',
  scenario: '<p>Corres <code>uv run python caos.py normal</code> y después <code>uv run python -c "from lab.herramientas import bajo_minimo; print(bajo_minimo.invoke({}))"</code>.</p>',
  steps: [{
    id: 'vacio', type: 'single',
    prompt: '¿Qué imprime?',
    options: [
      'El texto «Ningún producto está por debajo del mínimo.»',
      'Una lista vacía, <code>[]</code>, porque el <code>SELECT</code> no devolvió filas',
      'Las cinco filas, cada una con su stock, su mínimo y lo que falta',
      '<code>None</code>, porque la función no encontró nada que devolver'
    ],
    answer: 0,
    explain: 'Con <code>normal</code>, todos los productos están sobre su mínimo: el <code>SELECT … WHERE stock &lt; minimo</code> no devuelve filas y la función contesta con su aviso. Una herramienta siempre devuelve un texto que el modelo pueda leer: una lista vacía o <code>None</code> no le dicen qué pasó.'
  }]
});

SD.defineExercise('ia00-p-bucle', {
  kind: 'predict', title: 'el bucle',
  scenario: '<p>Corres <code>uv run lab preguntar "¿Cuánto stock hay de sombrero?"</code>. El modelo pide <code>consultar_stock({"nombre": "sombrero"})</code>.</p>',
  steps: [{
    id: 'inexistente', type: 'single',
    prompt: '¿Qué recibe el modelo en el <code>ToolMessage</code>?',
    options: [
      'El aviso «No existe el producto sombrero» y la lista de productos',
      'Un texto <code>ERROR: KeyError</code>, porque sombrero no está en la tabla',
      'Nada: el bucle se corta y te muestra el error en la terminal',
      'Un stock de 0, que es lo que devuelve la base cuando no hay filas'
    ],
    answer: 0,
    explain: '<code>consultar_stock</code> no lanza una excepción: si el <code>SELECT</code> no devuelve filas, contesta con un texto que trae los cinco productos. El modelo lo lee y puede corregirse. El <code>try</code>/<code>except</code> del bucle es para los errores de verdad, como un nombre de herramienta inventado o la base caída.'
  }]
});

SD.defineExercise('ia00-p-acciones', {
  kind: 'predict', title: 'la acción',
  scenario: '<p>Llamas a <code>aplicar({"producto": "taza", "cantidad": 500, "motivo": "prueba"}, "a-mano:2", "yo")</code>.</p>',
  steps: [{
    id: 'tope', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Falla con un <code>ValidationError</code> de Pydantic, sin abrir la conexión',
      'La base rechaza el <code>UPDATE</code>: <code>lab_actor</code> no puede sumar tanto stock',
      'Se suman 500: el tope de 100 solo lo ve el modelo, no tu código',
      'Se suman 100, el máximo, y la respuesta avisa del recorte'
    ],
    answer: 0,
    explain: '<code>aplicar</code> valida con <code>Reponer.model_validate(args)</code> antes del <code>with</code>. <code>Field(le=100)</code> rechaza 500 con un <code>ValidationError</code> que nombra el campo <code>cantidad</code>. La regla la impone tu código, no el modelo, y la base ni se toca. Pydantic no recorta valores: rechaza.'
  }]
});

SD.defineExercise('ia00-p-grafo', {
  kind: 'predict', title: 'las aristas del grafo',
  scenario: '<p>El último mensaje del estado es un <code>AIMessage</code> con dos <code>tool_calls</code>: <code>bajo_minimo</code> y <code>Reponer</code>. <code>pasos</code> vale 2 y el tope es 8.</p>',
  steps: [{
    id: 'arista', type: 'single',
    prompt: '¿Qué devuelve <code>despues_del_modelo</code>?',
    options: ['<code>"aprobar"</code>', '<code>"herramientas"</code>', '<code>"sin_pasos"</code>', '<code>END</code>'],
    answer: 0,
    explain: 'Hay llamadas, así que no es <code>END</code>; 2 es menor que 8, así que no es <code>sin_pasos</code>; y una de las llamadas es <code>Reponer</code>, así que va a <code>aprobar</code>. La lectura no se pierde: <code>actuar</code> corre también las llamadas de lectura que vinieron junto con la acción.'
  }]
});

SD.defineExercise('ia00-p-cli', {
  kind: 'predict', title: 'los comandos',
  scenario: '<p>El hilo <code>hilo-1</code> se detuvo en <code>aprobar</code>. Sin decidir, corres <code>uv run lab agente "¿Cuánto stock hay de gorra?"</code>, que usa <code>hilo-1</code> por defecto.</p>',
  steps: [{
    id: 'pendiente', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Avisa que <code>hilo-1</code> espera tu decisión y no corre la pregunta',
      'Descarta la propuesta pendiente y empieza la pregunta nueva de cero',
      'Corre la pregunta nueva y la propuesta sigue esperando debajo',
      'Aprueba la propuesta pendiente, porque seguir equivale a aprobar'
    ],
    answer: 0,
    explain: '<code>main()</code> mira <code>grafo.get_state(config).next</code>: si no está vacío, el hilo está detenido, y el comando imprime «El hilo hilo-1 espera tu decisión. Corre: lab aprobar hilo-1». Mezclar una pregunta nueva con una propuesta pendiente dejaría llamadas sin responder en el historial. Para otra conversación, usa <code>--hilo</code> con otro nombre.'
  }]
});

SD.defineExercise('ia00-p-evals', {
  kind: 'predict', title: 'un intento del eval',
  scenario: '<p>En el caso <code>reponer</code>, el modelo propone taza 7 y termo 6, y después del rechazo no propone nada más. Lo esperado es taza 7 y termo 5.</p>',
  steps: [{
    id: 'regla', type: 'single',
    prompt: '¿Cómo termina el intento?',
    options: [
      'FALLA en reposiciones: la regla rechaza y lo propuesto no coincide',
      'ok: el termo quedó por encima de su mínimo, que es lo que se pide',
      'ok en reposiciones, porque la taza sí coincide con lo que se esperaba',
      'FALLA en respuesta, porque el texto final menciona el rechazo'
    ],
    answer: 0,
    explain: 'La regla de <code>intento()</code> aprueba solo si cada acción propuesta coincide con lo esperado; termo 6 no coincide, así que rechaza. Al final, <code>{taza: 7, termo: 6}</code> no es igual a <code>{taza: 7, termo: 5}</code> y el check <code>reposiciones</code> da falso. Un eval revisa lo que el agente hizo, no si su texto suena bien.'
  }]
});
