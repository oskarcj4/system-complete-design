/* Decisiones guiadas de ML02 (Comprados juntos: filtrado colaborativo ítem-ítem). Formato en core/exercise.js. */

SD.defineExercise('ml02-comprados-juntos', {
  title: 'comprados juntos, medido contra la línea base',
  scenario: '<p>Tienes el laboratorio de ML00, la línea base de ML01 (el conteo de positivos) y una matriz usuario-película con un 1 por cada calificación de 4.0 o más. Ahora vas a decir qué películas se ven juntas, recomendar con eso y servirlo detrás de una API con Redis. Son ocho decisiones.</p>',
  steps: [
    {
      id: 'normalizar', type: 'single',
      prompt: 'Para decir cuánto se parecen dos películas, ¿qué usas como puntaje?',
      options: [
        'Cuántos usuarios dieron positivo a las dos, tal cual: es lo que significa «comprados juntos».',
        'Los usuarios en común dividido por la raíz del producto de los positivos de cada una (el coseno).',
        'Los usuarios en común dividido por el total de usuarios, que es la probabilidad de que coincidan.',
        'Los usuarios en común dividido por los positivos de la película que buscas, sin mirar la otra.'
      ],
      answer: 1,
      explain: 'El conteo crudo premia a las películas muy vistas: una que todos vieron queda vecina de todas. El coseno divide por lo popular de las dos y deja lo que tienen de propio. Dividir por el total de usuarios solo cambia la escala y conserva el orden del conteo. Dividir solo por la película que buscas deja arriba, de nuevo, a las más populares. Está en <a href="#ae-medidas">las medidas</a>.'
    },
    {
      id: 'lift', type: 'single',
      prompt: 'El lift de un par da 100, el de otro da 4. ¿Qué quiere decir el 100?',
      options: [
        'Que el par es 25 veces más fiable que el otro, porque su lift es 25 veces mayor.',
        'Que 100 usuarios dieron positivo a las dos películas, frente a 4 del otro par.',
        'Que el par es el mejor de la lista, y puedes recomendarlo primero sin mirar más.',
        'Que se ven juntas 100 veces más que por pura casualidad.'
      ],
      answer: 3,
      explain: 'Lift es lo observado entre lo esperado si fueran independientes. Un 100 dice cuánto se aleja de la casualidad, no cuántos usuarios hay detrás: con un solo usuario en común y dos películas raras también puede dar un número enorme. Por eso no es una medida de fiabilidad ni de calidad. Está en <a href="#ae-medidas">las medidas</a>.'
    },
    {
      id: 'soporte', type: 'single',
      prompt: 'Con lift, arriba quedan pares de películas raras que coincidieron una sola vez. ¿Qué haces?',
      options: [
        'Pones un soporte mínimo y descartas los pares con pocos usuarios en común.',
        'Dejas el lift y esperas: con más datos esos pares se acomodan solos.',
        'Cambias el lift por el conteo crudo, que no tiene ese problema.',
        'Quitas de la lista las películas raras, aunque tengan muchos usuarios en común con otras.'
      ],
      answer: 0,
      explain: 'Un par visto una vez no es evidencia, es una coincidencia. El soporte mínimo exige evidencia antes de medir. Esperar no arregla nada: siempre habrá películas nuevas con pocos datos. El conteo crudo tiene el problema contrario, el de lo popular. Quitar las raras borra también pares con evidencia. Está en <a href="#ae-soporte">el soporte mínimo</a>.'
    },
    {
      id: 'semillas', type: 'single',
      prompt: 'Para recomendarle a un usuario, ¿de qué películas sales a buscar vecinas?',
      options: [
        'De todas las que calificó en el entrenamiento, porque cada calificación dice algo.',
        'De la última que calificó, que es lo que tiene más fresco.',
        'De sus positivos del entrenamiento: 4.0 o más, como en la matriz.',
        'De las que calificó con 4.0 o más en todo el dataset, para tener más semillas.'
      ],
      answer: 2,
      explain: 'La matriz se armó con positivos, así que las vecinas hablan de lo que gustó. Salir desde una película que el usuario calificó con 1 estrella recomienda lo que se parece a lo que no le gustó. Usar solo la última tira casi toda la historia. Usar el dataset entero mete calificaciones de la prueba: una fuga. Está en <a href="#paso-recomendar">el recomendador</a>.'
    },
    {
      id: 'corte', type: 'single',
      prompt: 'Calculas los pares con todas las calificaciones y después mides con la prueba. ¿Qué pasa con la métrica?',
      options: [
        'Sale más alta de lo real, porque los pares ya vieron la prueba.',
        'Sale igual, porque los pares no usan la prueba para ordenar nada.',
        'Sale más baja, porque hay más ruido cuando hay más datos.',
        'Sale igual en promedio, y solo cambia la cobertura.'
      ],
      answer: 0,
      explain: 'Si la película de la prueba entra a los pares, la lista ya contiene la pista de la respuesta. Es la fuga de ML00 y ML01, ahora escondida en una matriz. Por eso la matriz sale solo del entrenamiento, y <code>fallas.py fuga</code> te muestra cuánto sube. Está en <a href="#comprueba-fallas">las fallas</a>.'
    },
    {
      id: 'memoria', type: 'single',
      prompt: 'Con 10 000 películas, ¿qué guardas para servir la API?',
      options: [
        'La matriz de similitud entera, 10 000 por 10 000, para responder cualquier par.',
        'Las 50 vecinas de cada película, ordenadas, que son unas 500 000 filas.',
        'La matriz usuario-película, y calculas la similitud en cada request.',
        'Solo las vecinas de las 100 películas más populares, que son las que se piden.'
      ],
      answer: 1,
      explain: 'La matriz entera son 100 millones de celdas, casi todas ceros o ruido. Calcular en cada request repite un cálculo que no cambia. Guardar solo las populares deja sin respuesta a la cola, que es donde un recomendador sirve. Las 50 vecinas por película son 500 000 filas: cabe en memoria. Está en <a href="#ae-topk">el top-k</a>.'
    },
    {
      id: 'leer', type: 'single',
      prompt: 'El informe dice, para el coseno, <code>+0.0120 [+0.0030, +0.0210]</code> en <code>ndcg_vs_conteo</code>. ¿Qué concluyes?',
      options: [
        'Que con estos usuarios el coseno es mejor que el conteo, y la mejora es chica.',
        'Que es un empate: la diferencia es de 0.012 y eso es casi cero.',
        'Que el coseno es 1.2 % mejor que el conteo, y lo recomendarías en cualquier caso.',
        'Que faltan remuestreos, porque el intervalo no es simétrico alrededor de la diferencia.'
      ],
      answer: 0,
      explain: 'El intervalo queda entero a la derecha del 0, así que la diferencia es real para estos usuarios. Que sea chica o grande lo dice el tamaño, y eso lo juzgas con lo que cuesta mantenerlo. No es un porcentaje, y el intervalo no tiene por qué ser simétrico. Está en <a href="ml01-linea-base.html#ae-pareada">la diferencia pareada de ML01</a>.'
    },
    {
      id: 'caido', type: 'single',
      prompt: 'Redis no contesta. ¿Qué hace la API de comprados juntos?',
      options: [
        'Devuelve un 503: sin la caché no puede asegurar que la lista esté al día.',
        'Reintenta hasta que Redis conteste, para no dar nunca una respuesta que no sea de la caché.',
        'Responde desde memoria e indica que Redis está caído.',
        'Devuelve una lista vacía con un 200, y deja que el cliente decida qué mostrar.'
      ],
      answer: 2,
      explain: 'Las vecinas están también en un Parquet que la API carga al arrancar; Redis solo las acelera. Un 503 o reintentos convierten una caché en una dependencia dura. Una lista vacía con un 200 miente: dice que no hay vecinas. Responder desde memoria y marcar <code>"redis": "caido"</code> mantiene el servicio y deja ver la falla. Está en <a href="#paso-api">la API</a>.'
    }
  ]
});

SD.defineExercise('ml02-p-laboratorio', {
  kind: 'predict', title: 'los comandos de ml02',
  scenario: '<p>Copiaste el laboratorio y los archivos <code>config.py</code> y <code>cli.py</code> de este paso. Corres <code>uv run reco --help</code>.</p>',
  steps: [{
    id: 'comandos', type: 'single',
    prompt: '¿Cuántos comandos aparecen en la lista entre llaves?',
    options: ['7', '9', '11', '14'],
    fixed: true,
    answer: 2,
    explain: 'El analizador tiene once subcomandos: <code>descargar</code>, <code>convertir</code>, <code>partir</code>, <code>matriz</code> y <code>azar</code> del laboratorio, y <code>vecinos</code>, <code>comprados</code>, <code>informe</code>, <code>barrido</code>, <code>publicar</code> y <code>servir</code>. <code>explorar</code> no está: esta guía no usa DuckDB.'
  }]
});

SD.defineExercise('ml02-p-coseno', {
  kind: 'predict', title: 'el coseno de A con D',
  scenario: '<p>La matriz de juguete tiene cuatro usuarios y cuatro películas: A la vieron u1, u2 y u4; D solo u4; y A y D coinciden en u4. Calculas el coseno entre A y D con juntos / √(nA · nD).</p>',
  steps: [{
    id: 'valor', type: 'single',
    prompt: '¿Cuánto vale, redondeado a tres decimales?',
    options: ['0.333', '0.577', '0.667', '1.000'],
    answer: 1,
    explain: 'juntos = 1, nA = 3 y nD = 1, así que el coseno es 1 / √3 = 0.577. El 0.333 es 1/3, que olvida la raíz. El 0.667 es el par A con B, que tiene dos usuarios en común. El 1.000 sería si todos los que vieron D vieran A y al revés.'
  }]
});

SD.defineExercise('ml02-p-recomendar', {
  kind: 'predict', title: 'la lista de quien eligió A y C',
  scenario: '<p>Con la misma matriz de juguete, un usuario tiene como semillas A y C. El puntaje de cada película es la suma de su coseno con A y con C. Ya vio A y C, así que no se recomiendan. Los cosenos son AB 0.667, AD 0.577, BC 0.816 y AC 0.408.</p>',
  steps: [{
    id: 'orden', type: 'single',
    prompt: '¿Cuál es la lista de dos, de la primera a la segunda?',
    options: [
      'D y después B, porque D se parece mucho a A',
      'B y después D, con 1.483 y 0.577',
      'B y después A, porque A es la más parecida a C',
      'D y después B, porque D tiene un solo positivo y eso la hace más específica'
    ],
    answer: 1,
    explain: 'B suma 0.667 (con A) y 0.816 (con C): 1.483. D solo se parece a A: 0.577. A no entra, porque ya la vio. Sumar las filas premia a las películas que se parecen a varias de las que le gustaron.'
  }]
});

SD.defineExercise('ml02-p-informe', {
  kind: 'predict', title: 'la fila del conteo',
  scenario: '<p>Corres <code>uv run reco informe --modo por-usuario</code>. La columna <code>ndcg_vs_conteo</code> es la diferencia pareada de cada variante contra el conteo, con su intervalo.</p>',
  steps: [{
    id: 'cero', type: 'single',
    prompt: '¿Qué dice esa columna en la fila del conteo, y cuántas filas tiene la tabla?',
    options: [
      '<code>NaN</code>, y cinco filas, porque el conteo no tiene contra qué compararse',
      '<code>+0.0000 [+0.0000, +0.0000]</code>, y seis filas en total',
      '<code>+0.0000 [+0.0000, +0.0000]</code>, y cuatro filas: azar y tres medidas',
      'Un valor chico con un intervalo que cruza el cero, y seis filas'
    ],
    answer: 1,
    explain: 'El conteo se resta a sí mismo usuario por usuario: todas las diferencias son 0 exacto. Las filas son el azar, el conteo, coseno, jaccard, lift y lift sin soporte: seis. Si la fila del conteo no es cero, el orden de los usuarios está mal.'
  }]
});

SD.defineExercise('ml02-p-api', {
  kind: 'predict', title: 'un k fuera de rango',
  scenario: '<p>La API de comprados juntos acepta <code>k</code> de 1 a 50, porque guarda 50 vecinas por película. Pides <code>/v1/items/1/comprados-juntos?k=51</code>.</p>',
  steps: [{
    id: 'codigo', type: 'single',
    prompt: '¿Qué código HTTP devuelve?',
    options: ['200, con las 50 que hay', '404', '422', '503'],
    answer: 2,
    explain: 'FastAPI valida <code>k</code> con <code>Query(ge=1, le=...)</code> antes de entrar a la función y responde 422. Un 404 sería para una película que no existe, y un 503 para una tabla que no se calculó. Un 200 con 50 le diría al cliente que obtuvo lo que pidió, y no es así.'
  }]
});
