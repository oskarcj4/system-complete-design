/* Decisiones guiadas de IA05 (Preguntas a la documentación, con evals). Formato en core/exercise.js. */

SD.defineExercise('ia05-docs', {
  title: 'preguntas a la documentación de un equipo',
  scenario: '<p>Un equipo de plataforma tiene unas 90 páginas de documentación interna, escritas en español, con secciones que tienen su propio id. Quiere que cualquiera pueda preguntar y recibir una respuesta con el enlace a la sección que la sostiene. Las respuestas no pueden inventar: si algo no está, el sistema tiene que decirlo. Puede usar Claude o un modelo local, y tiene un PostgreSQL. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'agente-o-workflow', type: 'single',
      prompt: 'Cada pregunta sigue los mismos pasos: buscar, responder con citas y comprobarlas. ¿Cómo se arma?',
      options: [
        'Un agente con una herramienta de búsqueda, que decide cuántas veces buscar y cuándo ya tiene suficiente para responder.',
        'Un workflow con los pasos escritos en el código: el modelo solo redacta la respuesta y, si se pide, reordena.',
        'Un solo prompt con las 90 páginas enteras en el contexto, que el modelo lee completas en cada pregunta.',
        'Un agente que primero reescribe la pregunta en tres versiones y después busca con cada una por separado.'
      ],
      answer: 1,
      explain: 'Si los pasos son siempre los mismos, escribirlos en el código da un costo fijo por pregunta y algo que se puede probar sin modelo. Un agente decide cuántas búsquedas hace, y eso cambia el costo y lo que hay que medir. Las 90 páginas en el prompt cuestan cientos de miles de tokens por pregunta y no dicen de qué sección salió cada afirmación. Es la diferencia entre workflow y agente de M25.'
    },
    {
      id: 'troceado', type: 'single',
      prompt: 'Las páginas tienen secciones con id, de largos muy distintos. ¿Cómo se trocean?',
      options: [
        'Ventanas fijas de 200 palabras con 40 de solape, porque todos los trozos quedan del mismo largo y se comparan mejor.',
        'Una página entera por trozo, para que el modelo siempre tenga el contexto completo de lo que lee.',
        'Una sección por trozo, partida entre párrafos solo si pasa de un largo, para que cada trozo tenga una cita.',
        'Una oración por trozo, porque así la búsqueda por significado encuentra exactamente la frase que responde.'
      ],
      answer: 2,
      explain: 'Con las secciones como unidad, cada trozo tiene un id que es su cita, y una idea no queda cortada a la mitad. Las ventanas fijas cruzan de una sección a otra y se citan por la primera palabra. Una página entera es demasiado para un vector, y una oración pierde el contexto que hace falta para responder. Lo mides en el paso 7: la guía compara las dos formas con la misma pregunta.'
    },
    {
      id: 'lexica-o-semantica', type: 'single',
      prompt: 'Muchas preguntas nombran términos exactos, como <code>FORCE ROW LEVEL SECURITY</code> o <code>SameSite</code>. ¿Qué búsqueda se usa?',
      options: [
        'Solo por significado con embeddings, que entiende sinónimos y por eso también encuentra los términos exactos.',
        'Solo por palabras con el tsvector de PostgreSQL, que es exacta y no necesita ningún modelo de embeddings.',
        'Por significado, y si no trae nada con una distancia menor que un umbral, recién entonces por palabras.',
        'Las dos a la vez, y una fusión por puestos que junta las listas aunque sus puntajes no se puedan comparar.'
      ],
      answer: 3,
      explain: 'Un embedding acerca textos que hablan de lo mismo, pero puede no distinguir un nombre exacto de otro parecido; la búsqueda por palabras encuentra el término y no entiende "¿cómo evito que el dueño se salte la política?". La híbrida corre las dos. El umbral de distancia no sirve de aviso: la búsqueda por significado siempre trae algo, aunque no tenga que ver.'
    },
    {
      id: 'rrf', type: 'single',
      prompt: 'La búsqueda por palabras devuelve <code>ts_rank</code> y la de significado, una distancia coseno. ¿Cómo se juntan?',
      options: [
        'Se normalizan los dos puntajes entre 0 y 1 dentro de cada lista y se suman con el mismo peso.',
        'Se suma 1 / (60 + puesto) de cada lista para cada trozo, y gana la suma más alta.',
        'Se toma la lista con el mejor puntaje en su primer puesto, y la otra se descarta para esa pregunta.',
        'Se intercalan: el primero de una lista, el primero de la otra, el segundo de la primera, y así.'
      ],
      answer: 1,
      explain: 'RRF solo usa puestos: un tercer puesto vale lo mismo en las dos listas, aunque un <code>ts_rank</code> de 0.1 y una distancia de 0.3 no signifiquen nada juntos. Normalizar dentro de cada lista hace que el primero valga 1 aunque sea malo. Intercalar no premia a un trozo que aparece arriba en las dos. La cuenta está en la figura IA05.8.'
    },
    {
      id: 'rerank-costo', type: 'single',
      prompt: 'Un re-ranker con el mismo LLM lee 20 candidatos y deja 6. Según la cuenta de la guía, más que duplica el costo de una pregunta. ¿Cuándo se prende?',
      options: [
        'Siempre, porque un modelo que lee los candidatos completos ordena mejor que cualquier fusión por puestos.',
        'Nunca, porque si la búsqueda híbrida no trae la sección entre los 6 primeros, reordenar tampoco la sube.',
        'Cuando los evals muestran que, con él, sube la tasa de respuestas correctas lo bastante para pagarlo.',
        'Solo para las preguntas largas, porque las cortas ya tienen sus términos exactos en la búsqueda por palabras.'
      ],
      answer: 2,
      explain: 'Reordenar puede subir una sección que estaba en el puesto 12 a los seis primeros; no puede subir una que la búsqueda no trajo entre los 20. Si la híbrida ya la pone arriba, el re-ranker paga para no cambiar nada. Por eso es una opción que los evals comparan, apagada por defecto. El largo de la pregunta no dice si la búsqueda acertó.'
    },
    {
      id: 'cita-verificable', type: 'single',
      prompt: '¿Qué se le pide al modelo para que una cita se pueda comprobar sin otro modelo?',
      options: [
        'El id de la sección y una frase copiada del trozo, que el código busca dentro del texto recuperado.',
        'El id de la sección entre corchetes en el texto, y que el código compruebe que esa sección existe en el curso.',
        'Un puntaje de confianza de 0 a 1 por cada afirmación, y que se descarten las que estén por debajo de 0.7.',
        'Que explique con sus palabras qué dice cada sección citada, para que una persona lo compare después.'
      ],
      answer: 0,
      explain: 'Con la frase, el verificador busca un texto dentro de otro: es gratis, determinista y no se equivoca en lo que mide. Que la sección exista no dice que el modelo la haya leído ni que diga eso. Un puntaje de confianza lo inventa el mismo modelo, y una paráfrasis solo se compara con otro modelo o con una persona. El verificador no dice si la respuesta es correcta: eso lo mide el juez.'
    },
    {
      id: 'juez-calibrado', type: 'single',
      prompt: 'Un juez LLM dice que el 85&#8239;% de las respuestas son correctas. ¿Qué haces antes de creerle?',
      options: [
        'Lo corres tres veces sobre las mismas respuestas, y si los tres porcentajes coinciden, el juez es confiable.',
        'Cambias el juez por el modelo más grande disponible, que se equivoca menos que el que responde.',
        'Le pides que explique cada veredicto, y lees las explicaciones de las que marcó como correctas.',
        'Etiquetas 30 respuestas sin ver su veredicto y calculas el kappa de Cohen entre tus etiquetas y las suyas.'
      ],
      answer: 3,
      explain: 'Un juez que coincide consigo mismo puede estar siempre equivocado hacia el mismo lado: repetir mide el ruido, no el sesgo. Un modelo más grande también tiene sesgos, como preferir respuestas largas. Las explicaciones ayudan a entender un desacuerdo, pero hace falta saber dónde están. El kappa descuenta el acuerdo que saldría por azar: un juez que siempre dice "correcta" tiene kappa 0.'
    },
    {
      id: 'que-cambia-primero', type: 'single',
      prompt: 'Las preguntas sobre pagos fallan seguido. ¿Qué miras primero?',
      options: [
        'La tasa de correctas del juez sobre esas preguntas, con el modelo más caro, para ver si es un problema del modelo.',
        'El acierto en k de la búsqueda para esas preguntas: si la sección de oro no llega, el modelo no puede responder.',
        'El prompt de sistema, para agregar una regla sobre pagos que le diga al modelo qué secciones tiene que citar.',
        'El tamaño de los trozos, porque las secciones de pagos son largas y seguro se están partiendo en varias partes.'
      ],
      answer: 1,
      explain: 'La primera capa no gasta tokens y separa dos problemas: si la búsqueda no trae la sección, ningún modelo ni prompt lo arregla; si la trae y la respuesta falla, el problema está en la respuesta o en el oro. Cambiar los trozos puede ser la solución, pero primero hay que saber que es la búsqueda la que falla. Es lo que muestra la falla 2 al olvidar M27.'
    }
  ],
  solution: '<ul><li>Un workflow con pasos fijos: buscar, responder, verificar; el re-ranker como opción.</li><li>Una sección por trozo, partida entre párrafos si pasa de 350 palabras, y la cita es su id.</li><li>Búsqueda híbrida: tsvector en español y embeddings con HNSW, fusionados con RRF (k = 60).</li><li>Una frase copiada por cita, que el código busca en el trozo recuperado.</li><li>Evals en dos capas: la búsqueda con acierto, recall y MRR, sin tokens; la respuesta con un juez calibrado con 30 etiquetas y el kappa.</li><li>Primero la capa barata: si la búsqueda no trae la sección, no se toca el modelo.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia05-p-corpus', {
  kind: 'predict', title: 'bajar el corpus',
  scenario: '<p><code>course.data.js</code> tiene tres entradas: un módulo con <code>href: \'modules/m25-agentes.html\', status: \'ready\'</code>, otro con <code>status: \'soon\'</code> y el mapa con <code>href: \'maps/chatgpt.html\', status: \'ready\'</code>. Corres <code>uv run docs bajar</code>.</p>',
  steps: [{
    id: 'cuantas', type: 'single',
    prompt: '¿Cuántas páginas quedan en <code>corpus/</code>?',
    options: ['0', '1', '2', '3'],
    fixed: true,
    answer: 1,
    explain: 'La expresión <code>PUBLICADA</code> pide <code>href: \'modules/….html\', status: \'ready\'</code>. El módulo <code>soon</code> no tiene <code>ready</code>, y el mapa está en <code>maps/</code>, no en <code>modules/</code>. Queda solo M25.'
  }]
});

SD.defineExercise('ia05-p-ingerir', {
  kind: 'predict', title: 'las secciones',
  scenario: '<p>Una página tiene, en este orden: los objetivos (<code>h2#obj</code>), <code>h2#durable</code> con un párrafo y un widget, <code>h3#durable-retomar</code> con una lista, y <code>h2#comprueba</code> con un párrafo.</p>',
  steps: [{
    id: 'citas', type: 'single',
    prompt: '¿Qué citas devuelve <code>secciones</code>?',
    options: [
      '<code>m25#obj</code>, <code>m25#durable</code>, <code>m25#durable-retomar</code> y <code>m25#comprueba</code>',
      '<code>m25#durable</code> y <code>m25#durable-retomar</code>, porque los objetivos y "Comprueba" se saltan',
      '<code>m25#durable</code> solamente, porque un <code>h3</code> queda dentro de la sección de su <code>h2</code>',
      '<code>m25#obj</code>, <code>m25#durable</code> y <code>m25#durable-retomar</code>, y se corta en "Comprueba"'
    ],
    answer: 1,
    explain: 'Cada encabezado con id abre una sección, también un <code>h3</code>. La lectura se corta en <code>id="comprueba"</code>, y una sección con ancla <code>obj</code> no se guarda: "Al terminar podrás" no responde preguntas. Es lo que prueba <code>test_cada_encabezado_con_id_es_una_seccion</code>.'
  }]
});

SD.defineExercise('ia05-p-trocear', {
  kind: 'predict', title: 'trocear fijo',
  scenario: '<p>Dos secciones de la misma página, con 7 y 5 palabras: 12 en total. Corres <code>fijo(secciones, tamano=5, solape=2)</code>.</p>',
  steps: [{
    id: 'trozos', type: 'single',
    prompt: '¿Cuántos trozos salen?',
    options: ['2', '3', '4', '6'],
    fixed: true,
    answer: 2,
    explain: 'Cada ventana avanza 5 − 2 = 3 palabras: empiezan en 0, 3, 6 y 9. La que empieza en 9 llega al final (9 + 5 ≥ 12) y el bucle termina. Son cuatro, y la tercera cruza de una sección a la otra.'
  }]
});

SD.defineExercise('ia05-p-indexar', {
  kind: 'predict', title: 'indexar dos veces',
  scenario: '<p>Indexas con <code>uv run docs indexar</code> y cuentas las filas de <code>trozos</code>. Sin cambiar nada, vuelves a indexar con el mismo comando y cuentas otra vez.</p>',
  steps: [{
    id: 'cuenta', type: 'single',
    prompt: '¿Qué pasa con la cuenta?',
    options: [
      'Se duplica: el segundo indexado agrega una fila por trozo encima de las que ya estaban.',
      'Queda igual: antes de insertar, se borran las filas de esa misma estrategia y prefijo.',
      'Queda igual: la clave única hace que cada fila repetida choque y el insert la ignore.',
      'Falla el segundo indexado con un error de clave duplicada, y la cuenta no cambia.'
    ],
    answer: 1,
    explain: '<code>indexar</code> corre <code>DELETE FROM trozos WHERE estrategia = %s AND prefijo = %s</code> y después inserta, en la misma transacción. La variante se reemplaza entera; las otras no se tocan.'
  }]
});

SD.defineExercise('ia05-p-rrf', {
  kind: 'predict', title: 'la fusión',
  scenario: '<p>La búsqueda por palabras devuelve los ids <code>[7, 8, 9]</code> y la de significado, <code>[9, 7]</code>. Corres <code>fusionar([[7, 8, 9], [9, 7]])</code>, con k = 60.</p>',
  steps: [{
    id: 'orden', type: 'single',
    prompt: '¿Qué lista sale?',
    options: ['<code>[7, 8, 9]</code>', '<code>[9, 7, 8]</code>', '<code>[7, 9, 8]</code>', '<code>[9, 7]</code>'],
    fixed: true,
    answer: 2,
    explain: '7: 1/61 + 1/62 ≈ 0.03252. 9: 1/63 + 1/61 ≈ 0.03227. 8: 1/62 ≈ 0.01613. El 7 gana por poco: estar segundo en una lista vale casi lo mismo que estar primero. El 8 aparece en una sola y queda último, pero no se pierde.'
  }]
});

SD.defineExercise('ia05-p-recuperacion', {
  kind: 'predict', title: 'las métricas',
  scenario: '<p>Una pregunta tiene una sola sección de oro, y la búsqueda la trae en el séptimo puesto.</p>',
  steps: [{
    id: 'metricas', type: 'single',
    prompt: '¿Cuánto dan el recall en 5 y el rango recíproco de esa pregunta?',
    options: [
      'Recall en 5: 0. Rango recíproco: 1/7.',
      'Recall en 5: 0. Rango recíproco: 0.',
      'Recall en 5: 1. Rango recíproco: 1/7.',
      'Recall en 5: 1/7. Rango recíproco: 1/7.'
    ],
    fixed: true,
    answer: 0,
    explain: 'El recall en 5 mira solo los cinco primeros, y el oro no está: 0. El rango recíproco mira hasta el décimo (<code>k=10</code> por defecto) y da 1 / puesto: 1/7. Por eso las dos métricas cuentan cosas distintas.'
  }]
});

SD.defineExercise('ia05-p-variantes', {
  kind: 'predict', title: 'las variantes',
  scenario: '<p>Tienes indexadas <code>seccion</code> con prefijo y <code>fijo</code> con prefijo. Corres <code>uv run docs indexar --sin-prefijo</code>.</p>',
  steps: [{
    id: 'quedan', type: 'single',
    prompt: '¿Qué variantes hay en la tabla después?',
    options: [
      'Solo <code>seccion</code> sin prefijo, porque cada indexado vacía la tabla antes de empezar.',
      '<code>seccion</code> con y sin prefijo, y <code>fijo</code> con prefijo: tres variantes lado a lado.',
      '<code>seccion</code> sin prefijo y <code>fijo</code> con prefijo, porque la nueva reemplaza a la de la misma estrategia.',
      'Las dos de antes, porque sin prefijo los vectores dan otro largo y no se pueden guardar.'
    ],
    answer: 1,
    explain: 'El <code>DELETE</code> filtra por estrategia y prefijo a la vez: solo borra <code>seccion</code> sin prefijo, que no existía. El largo del vector no depende del prefijo, que es texto que se agrega antes del trozo.'
  }]
});

SD.defineExercise('ia05-p-responder', {
  kind: 'predict', title: 'responder sin trozos',
  scenario: '<p>La búsqueda no trajo nada, y llamas a <code>responder(modelo, "¿Cómo se configura una VLAN?", [])</code>.</p>',
  steps: [{
    id: 'sale', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      'Lo que conteste el modelo, que recibe la pregunta sin trozos y decide él si abstenerse.',
      'Un <code>ValueError</code>, porque el pedido queda sin trozos y el modelo no devuelve el formato.',
      'La respuesta "No está en la documentación.", sin citas, y 0 tokens de entrada y de salida.',
      'Una respuesta vacía con <code>sin_respuesta</code> en falso, que el verificador marca después.'
    ],
    answer: 2,
    explain: 'Lo primero que hace <code>responder</code> es <code>if not trozos: return Respuesta(respuesta=NO_ESTA, citas=[], sin_respuesta=True), 0, 0</code>. Sin nada que citar, no hay nada que el modelo pueda hacer bien, y la abstención sale sin gastar tokens.'
  }]
});

SD.defineExercise('ia05-p-verificar', {
  kind: 'predict', title: 'una frase corta',
  scenario: '<p>El modelo cita <code>m08#por-que-27</code>, que sí se recuperó, con la frase <code>"27 intentos"</code>, que aparece tal cual en el trozo.</p>',
  steps: [{
    id: 'vale', type: 'single',
    prompt: '¿Qué dice el verificador?',
    options: [
      'Que vale: la cita es de un trozo recuperado y la frase está en su texto.',
      'Que no vale, con el motivo <code>la frase tiene menos de 5 palabras</code>.',
      'Que no vale, con el motivo <code>la frase no aparece en el trozo</code>.',
      'Que no vale, con el motivo <code>no es de ningún trozo recuperado</code>.'
    ],
    answer: 1,
    explain: 'El largo se mira antes que la presencia: con <code>MIN_PALABRAS = 5</code>, dos palabras no alcanzan. Una frase de dos palabras aparece en muchos trozos y no prueba que el modelo haya leído ese.'
  }]
});

SD.defineExercise('ia05-p-rerank', {
  kind: 'predict', title: 'el re-ranker falla',
  scenario: '<p>Preguntas con <code>reordenar=True</code> y <code>n=1</code>. La búsqueda trae A y después B. El modelo devuelve algo que no se puede leer como <code>Puntajes</code>.</p>',
  steps: [{
    id: 'queda', type: 'single',
    prompt: '¿Qué trozo llega al modelo que responde?',
    options: [
      'A, porque si el re-ranker falla queda el orden de la búsqueda.',
      'B, porque sin puntajes los dos valen 0 y se ordenan al revés.',
      'Ninguno: el pipeline corta con un <code>ValueError</code> y la API da 502.',
      'A y B, porque sin puntajes no hay con qué recortar a uno solo.'
    ],
    answer: 0,
    explain: 'Si <code>parsed</code> es <code>None</code>, <code>reordenar</code> devuelve <code>candidatos[:n]</code>: el primero de la búsqueda. Los tokens de la llamada fallida se cuentan igual. Es <code>test_si_el_reranker_no_contesta_queda_el_orden_de_la_busqueda</code>.'
  }]
});

SD.defineExercise('ia05-p-api', {
  kind: 'predict', title: 'una pregunta de dos letras',
  scenario: '<p>Con la API corriendo, mandas <code>POST /preguntar</code> con <code>{"pregunta": "ok"}</code>.</p>',
  steps: [{
    id: 'codigo', type: 'single',
    prompt: '¿Qué código devuelve, y cuántos tokens gasta?',
    options: [
      '200 con "No está en la documentación.", después de buscar y llamar al modelo una vez.',
      '422 sin gastar tokens: <code>pregunta</code> pide al menos 3 caracteres.',
      '502, porque el modelo no sabe qué hacer con una pregunta tan corta.',
      '400 con un mensaje propio de la API, después de calcular el embedding.'
    ],
    answer: 1,
    explain: '<code>Pedido</code> declara <code>pregunta: str = Field(min_length=3, max_length=500)</code>. FastAPI valida el cuerpo antes de llamar a la función, así que no se busca, no se calcula un embedding y no se llama al modelo.'
  }]
});

SD.defineExercise('ia05-p-juez', {
  kind: 'predict', title: 'un juez que siempre aprueba',
  scenario: '<p>Un juez dice "correcta" en las 30 respuestas de la muestra. Tú marcaste 21 como correctas y 9 como incorrectas.</p>',
  steps: [{
    id: 'kappa', type: 'single',
    prompt: '¿Cuánto da el kappa?',
    options: ['0', '0.3', '0.7', '1'],
    fixed: true,
    answer: 0,
    explain: 'El acuerdo es 21/30 = 0.7. El azar con las mismas proporciones es 1 × 0.7 + 0 × 0.3 = 0.7. Kappa: (0.7 − 0.7) / (1 − 0.7) = 0. Un 70&#8239;% de acuerdo que no dice nada: es lo que prueba <code>test_un_juez_que_siempre_dice_si_tiene_kappa_cero</code>.'
  }]
});
