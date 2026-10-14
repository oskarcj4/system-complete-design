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
