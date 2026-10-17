/* Decisiones guiadas de ML00 (El laboratorio de recomendación). Formato en core/exercise.js. */

SD.defineExercise('ml00-laboratorio', {
  title: 'el laboratorio donde se mide toda la serie',
  scenario: '<p>Tienes las 100 836 calificaciones de MovieLens small en Parquet, de 610 usuarios entre 1996 y 2018, y vas a comparar varios recomendadores durante toda la serie. Cada uno devuelve 10 películas por usuario. Antes del primero, tienes que fijar cómo se separa, qué cuenta y cómo se promedia. Son ocho decisiones.</p>',
  steps: [
    {
      id: 'separar', type: 'single',
      prompt: '¿Cómo separas las calificaciones en entrenamiento y prueba?',
      options: [
        'Al azar, el 90&#8239;% y el 10&#8239;%, con una semilla fija para que salga siempre igual.',
        'Por tiempo, con un corte global en un instante: todo lo anterior entrena y todo lo posterior examina.',
        'Por usuario: el 90&#8239;% de los usuarios entrena y el otro 10&#8239;% se usa entero para la prueba.',
        'Sin separar: entrenas y mides con todo, porque hay pocos datos y cada calificación cuenta.'
      ],
      answer: 1,
      explain: 'En producción entrenas con lo de ayer y sirves lo de mañana: el corte global reproduce eso. Al azar, el entrenamiento queda lleno de calificaciones posteriores a las de la prueba, y la semilla solo hace que la fuga se repita igual. Separar usuarios enteros mide otra cosa, el arranque en frío de un usuario nuevo, y sin separar el modelo se examina con las respuestas. Está en <a href="#ae-particion">la partición por tiempo</a>.'
    },
    {
      id: 'nuevos', type: 'single',
      prompt: 'Con el corte global, hay usuarios que califican por primera vez después del corte. ¿Qué haces con ellos?',
      options: [
        'Los dejas en la prueba: un recomendador bueno tiene que poder atenderlos igual que a los demás.',
        'Pasas sus calificaciones al entrenamiento, para que el modelo tenga algo de qué aprender.',
        'Los sacas de la prueba y anotas en el meta cuántos quedaron afuera por ser nuevos.',
        'Mueves el corte hacia adelante hasta que ningún usuario de la prueba sea nuevo.'
      ],
      answer: 2,
      explain: 'Un usuario sin nada en el entrenamiento no se puede personalizar: cualquier modelo le daría lo mismo, y mezclarlo con los demás ensucia la comparación. Pasarlo al entrenamiento es meter el futuro, y mover el corte cambia la partición para todos. Se saca y se cuenta en <code>fuera_por_usuario_nuevo</code>; el arranque en frío se mide aparte, como en M44.'
    },
    {
      id: 'unidad', type: 'single',
      prompt: '¿Cómo promedias el recall@10 de todo el sistema?',
      options: [
        'Juntando los aciertos de todos y dividiendo por todos los positivos de la prueba, sin separar por persona.',
        'Calculando el recall de cada usuario y promediando entre usuarios: cada uno pesa lo mismo.',
        'Tomando solo a los usuarios con más de 100 calificaciones, que son los que dan una señal estable.',
        'Con la mediana de los recall por usuario, que no se deja mover por los casos raros.'
      ],
      answer: 1,
      explain: 'Si juntas todos los aciertos, un usuario con 300 positivos en la prueba pesa como cien usuarios con 3, y la métrica premia al modelo que acierta con los que más califican. Quedarse con los grandes evalúa otro producto. La mediana de una métrica que casi siempre es 0 o 1 a nivel de usuario dice muy poco. La unidad es el usuario: está en <code>evaluar.por_usuario</code>.'
    },
    {
      id: 'positivo', type: 'single',
      prompt: '¿Qué cuenta como un positivo, algo que al usuario le gustó?',
      options: [
        'Cualquier calificación: si se tomó el trabajo de calificarla, la vio y le importó lo suficiente.',
        'Una calificación por encima del promedio de ese usuario, para corregir a los que califican alto o bajo.',
        'Una calificación de 4 estrellas o más, fija y la misma para todos los modelos.',
        'Solo las de 5 estrellas, para estar seguro de que de verdad le gustó.'
      ],
      answer: 2,
      explain: 'Las tres primeras son defendibles; lo que importa es fijar una y que todos los modelos la compartan. Contar cualquier calificación mezcla las de 1 estrella con las de 5. El promedio por usuario depende de lo que haya en el entrenamiento y se mueve entre particiones. Solo 5 estrellas deja muy pocos positivos y vuelve ruidosa la métrica. El umbral 4.0 vive en <code>config.py</code>, en un solo lugar.'
    },
    {
      id: 'vistas', type: 'single',
      prompt: 'El recomendador quiere devolver una película que el usuario ya calificó en el entrenamiento. ¿La dejas?',
      options: [
        'No: se excluye todo lo que calificó en el entrenamiento, haya sido un positivo o no.',
        'Sí, si le dio 4 estrellas o más: es una película que le gusta y puede volver a verla.',
        'Sí: la métrica ya la va a contar como un error, así que no hace falta filtrarla.',
        'Solo se excluyen las que calificó bajo, porque esas seguro no las quiere.'
      ],
      answer: 0,
      explain: 'Una película ya calificada no puede estar en la prueba de ese usuario (un usuario no califica dos veces la misma), así que ocupa un lugar de la lista sin poder acertar: el modelo que no filtra pierde contra el que filtra por una razón que no tiene que ver con la calidad. El evaluador le pasa al recomendador lo visto para que lo excluya.'
    },
    {
      id: 'catalogo', type: 'single',
      prompt: '¿De qué catálogo elige el recomendador?',
      options: [
        'De las 9 742 películas de <code>movies.csv</code>, porque son todas las que existen en el dataset.',
        'De las películas que aparecen al menos una vez en el entrenamiento, antes del corte.',
        'De las que aparecen en la prueba, que son las únicas que alguien puede acertar.',
        'De las que tienen al menos 50 calificaciones, para no recomendar películas desconocidas.'
      ],
      answer: 1,
      explain: 'Elegir de la prueba es mirar las respuestas. <code>movies.csv</code> incluye películas que nadie calificó todavía al momento del corte: en producción no sabrías nada de ellas. Un mínimo de 50 calificaciones es una decisión de un modelo, no del laboratorio. El catálogo es lo que hay en el entrenamiento, y lo que solo aparece en la prueba se cuenta en <code>eventos_de_peliculas_nuevas</code>.'
    },
    {
      id: 'sin-positivos', type: 'single',
      prompt: 'Un usuario de la prueba solo tiene calificaciones de 2 y 3 estrellas. ¿Qué hace el evaluador?',
      options: [
        'Le pone recall 0, porque ninguna de las películas que se le recomiendan le va a gustar.',
        'Le pone recall 1, porque no había nada que acertar y el modelo no falló en nada.',
        'No lo evalúa: sin relevantes, el recall no está definido.',
        'Usa sus calificaciones de 3 como positivos, para no perder a ese usuario.'
      ],
      answer: 2,
      explain: 'El recall divide por los relevantes: con cero, es 0 / 0. Ponerle 0 castiga a todos los modelos por igual y baja el promedio; ponerle 1 lo sube. Cambiar el umbral para un usuario rompe la definición que comparten todos. <code>relevantes_de</code> solo devuelve usuarios con al menos un positivo, y las métricas lanzan un error si las llamas sin relevantes.'
    },
    {
      id: 'modos', type: 'single',
      prompt: 'El mismo modelo da más recall con la partición por usuario que con la global. ¿Qué concluyes?',
      options: [
        'Que la partición por usuario es mejor, porque evalúa a todos los usuarios y no solo a los recientes.',
        'Que el modelo funciona mejor con usuarios que tienen mucha historia en el entrenamiento.',
        'Que los dos números no se comparan: los modos difieren en sus fugas y en a qué usuarios evalúan.',
        'Que hay un error en el evaluador, porque el mismo modelo tiene que dar lo mismo en las dos.'
      ],
      answer: 2,
      explain: 'Los dos modos evalúan a usuarios distintos y el por usuario tiene fugas: parte de la diferencia puede ser el futuro colado en el entrenamiento. No hay un error: el evaluador es el mismo y los datos no. Se compara entre modelos, dentro de un mismo modo; el global es el que se parece a producción. Lo cuenta <code>fallas.py fuga</code>.'
    }
  ],
  solution: '<ul><li>Partición por tiempo con un corte global, y los usuarios nuevos fuera de la prueba, contados.</li><li>El usuario como unidad: un recall y un NDCG por persona, promediados.</li><li>Positivo: 4 estrellas o más, en <code>config.py</code>.</li><li>Nada de lo visto en el entrenamiento se recomienda, y el catálogo es el del entrenamiento.</li><li>Un usuario sin positivos en la prueba no se evalúa.</li><li>Los números se comparan entre modelos dentro del mismo modo, nunca entre modos.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ml00-p-config', {
  kind: 'predict', title: 'los comandos',
  scenario: '<p>Ya escribiste <code>config.py</code> y <code>cli.py</code>. Corres <code>uv run reco</code>, sin ningún comando.</p>',
  steps: [{
    id: 'sin-comando', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Corre los seis comandos en orden, del primero al último',
      'Imprime la ayuda y termina sin error, como con <code>--help</code>',
      'argparse dice que falta el argumento <code>comando</code> y sale con error',
      'Falla con <code>AttributeError</code>, porque <code>a.f</code> no existe'
    ],
    answer: 2,
    explain: '<code>add_subparsers(dest="comando", required=True)</code> vuelve obligatorio el subcomando: <code>parse_args</code> imprime el uso y <code>the following arguments are required: comando</code>, y sale con código 2. Nunca llega a <code>a.f(a)</code>, así que no hay <code>AttributeError</code>. Sin <code>required=True</code>, sí llegaría y fallaría así.'
  }]
});

SD.defineExercise('ml00-p-descargar', {
  kind: 'predict', title: 'la descarga',
  scenario: '<p>Corriste <code>uv run reco descargar</code> y terminó bien. Lo corres otra vez, sin borrar nada.</p>',
  steps: [{
    id: 'segunda', type: 'single',
    prompt: '¿Qué imprime la segunda vez?',
    options: [
      '<code>bajado: …</code>: vuelve a bajar el zip para tener la versión más nueva',
      '<code>ya estaba: … MD5 correcto</code> y no sale a la red por el zip',
      'Un <code>FileExistsError</code>, porque el zip ya existe en <code>datos/crudo</code>',
      'Nada: ve el zip y termina sin descomprimir ni comprobar'
    ],
    answer: 1,
    explain: '<code>descargar()</code> pregunta primero <code>zip_.exists()</code>. Si está, lo verifica contra <code>config.MD5_ZIP</code> e imprime <code>ya estaba</code>; no llama a <code>bajar</code>. Después descomprime igual (<code>extractall</code> pisa los CSV) e imprime la carpeta. No hay <code>FileExistsError</code>: nada abre el zip para crearlo.'
  }]
});

SD.defineExercise('ml00-p-convertir', {
  kind: 'predict', title: 'la conversión',
  scenario: '<p>En <code>movies.csv</code>, una película tiene <code>genres</code> igual a <code>(no genres listed)</code>. Después de <code>reco convertir</code>, lees su fila de <code>peliculas.parquet</code>.</p>',
  steps: [{
    id: 'generos', type: 'single',
    prompt: '¿Qué tiene en la columna <code>generos</code>?',
    options: [
      'La lista <code>["(no genres listed)"]</code>, con un solo elemento',
      'Una lista vacía, <code>[]</code>, sin ningún género adentro',
      'El texto <code>(no genres listed)</code>, sin convertir a una lista',
      'Un valor nulo, porque <code>split</code> no encuentra el separador'
    ],
    answer: 1,
    explain: 'La comprensión de lista de <code>leer_peliculas</code> pregunta primero si el texto es <code>"(no genres listed)"</code> y en ese caso pone <code>[]</code>. Si no estuviera esa condición, <code>split("|")</code> devolvería una lista con el texto entero, porque no encuentra el separador; nunca un nulo.'
  }]
});

SD.defineExercise('ml00-p-explorar', {
  kind: 'predict', title: 'las consultas',
  scenario: '<p>Corres <code>uv run reco explorar nada</code>. No hay ninguna consulta que se llame <code>nada</code>.</p>',
  steps: [{
    id: 'desconocida', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Un <code>KeyError: \'nada\'</code> al buscarla en <code>CONSULTAS</code>',
      'Corre las seis consultas, como si no le hubieras pasado nombre',
      'argparse la rechaza con <code>invalid choice</code> y la lista de nombres',
      'No imprime ninguna tabla y termina sin error'
    ],
    answer: 3,
    explain: '<code>explorar</code> recorre el diccionario y corre solo las que cumplen <code>solo is None or solo == nombre</code>: con <code>nada</code>, ninguna. No busca la clave, así que no hay <code>KeyError</code>, y el argumento no tiene <code>choices</code>, así que argparse lo acepta. Si quisieras un error, agregarías <code>choices=list(CONSULTAS)</code>.'
  }]
});

SD.defineExercise('ml00-p-partir', {
  kind: 'predict', title: 'la partición',
  scenario: '<p>Corres <code>uv run reco partir --modo global --fraccion 0.3</code>, con otra fracción.</p>',
  steps: [{
    id: 'fugas', type: 'single',
    prompt: '¿Cuánto vale <code>fugas</code> en el JSON?',
    options: [
      'Más que con 0.1, porque el corte cae antes y hay más eventos de prueba',
      'Cero, como con cualquier otra fracción del corte global',
      'Depende de cuántos usuarios nuevos quedaron fuera de la prueba',
      'No aparece: el modo global no cuenta fugas, solo el por usuario'
    ],
    answer: 1,
    explain: 'Con el corte global, todo el entrenamiento cumple <code>ts &lt; corte</code> y toda la prueba <code>ts &gt;= corte</code>, así que ningún evento de entrenamiento es posterior al primero de prueba. Sacar usuarios nuevos achica la prueba, pero no mueve su primer evento antes del corte. <code>guardar</code> cuenta las fugas en los dos modos.'
  }]
});

SD.defineExercise('ml00-p-matriz', {
  kind: 'predict', title: 'la matriz',
  scenario: '<p>El usuario 7 le dio 3.5 estrellas a la película 50, en el entrenamiento. Corres <code>uv run reco matriz</code> con el umbral por defecto.</p>',
  steps: [{
    id: 'tres-y-medio', type: 'single',
    prompt: '¿Qué pasa con esa calificación en la matriz CSR?',
    options: [
      'Se guarda con el valor 3.5, porque CSR guarda los valores, no solo unos',
      'Se guarda como un 0 explícito en <code>data</code>, para recordar que la vio',
      'No se guarda: la celda queda vacía y no ocupa lugar',
      'Se redondea a 4 y se guarda como un positivo'
    ],
    answer: 2,
    explain: '<code>construir</code> filtra <code>rating &gt;= umbral</code> antes de armar la matriz: con 4.0 por defecto, el 3.5 no pasa y no llega a <code>csr_array</code>. Lo que sí queda es la fila del usuario 7 y la columna de la película 50, porque las filas y las columnas salen de todo el entrenamiento, no solo de los positivos.'
  }]
});

SD.defineExercise('ml00-p-metricas', {
  kind: 'predict', title: 'el NDCG',
  scenario: '<p>Calculas <code>ndcg_at_k(["b", "c", "a"], {"b": 3, "c": 2}, 3)</code>: la misma relevancia del ejemplo resuelto, con otro orden.</p>',
  steps: [{
    id: 'orden', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      '0.665, porque los mismos ítems están en la lista',
      '1.0, porque es el orden ideal',
      '0.5, porque dos de los tres ítems son relevantes',
      'Un <code>ValueError</code>, porque <code>"a"</code> no tiene relevancia'
    ],
    answer: 1,
    explain: 'Las relevancias en la lista son 3, 2 y 0: de mayor a menor, igual que <code>ideales</code>. El DCG es el mismo arriba y abajo, 8.893, y el cociente da 1. El 0.665 era con el orden a, b, c. Un ítem que no está en el diccionario vale 0 por <code>relevancia.get(i, 0.0)</code>; no es un error.'
  }]
});

SD.defineExercise('ml00-p-evaluar', {
  kind: 'predict', title: 'el evaluador',
  scenario: '<p>En la prueba, el usuario 42 tiene tres calificaciones: 3.0, 2.5 y 3.5. Corres <code>evaluar.por_usuario</code> con cualquier recomendador.</p>',
  steps: [{
    id: 'sin-relevantes', type: 'single',
    prompt: '¿Qué aparece para el usuario 42 en la tabla?',
    options: [
      'Una fila con recall 0 y NDCG 0',
      'Una fila con recall vacío (NaN), porque no hay nada que acertar',
      'Ninguna fila: no tiene positivos en la prueba',
      'Un <code>ValueError</code> de <code>recall_at_k</code>, que detiene la evaluación'
    ],
    answer: 2,
    explain: 'El bucle recorre <code>relevantes_de(test)</code>, que solo tiene usuarios con al menos una calificación de 4.0 o más. El usuario 42 no está, así que nunca se le pide una lista ni se llama a <code>recall_at_k</code>. El <code>ValueError</code> existe, pero es para quien llame a la métrica sin relevantes por otro camino.'
  }]
});

SD.defineExercise('ml00-p-azar', {
  kind: 'predict', title: 'el azar',
  scenario: '<p>Supón que el catálogo del entrenamiento tiene unas 9 000 películas. Corres <code>uv run reco azar</code> con <i>k</i> = 10.</p>',
  steps: [{
    id: 'recall', type: 'single',
    prompt: '¿Cerca de qué valor queda la media del recall@10?',
    options: [
      'Cerca de 0.1: 10 elegidas de cada 100 relevantes',
      'Cerca de 0.001: 10 de 9 000',
      'Cerca de 0.5: la mitad de las veces acierta alguna',
      'Exactamente 0: el azar no puede acertar nunca'
    ],
    fixed: true,
    answer: 1,
    explain: 'Cada positivo del usuario tiene una probabilidad de 10 / 9 000 de salir entre las 10 elegidas, así que el recall esperado es 10 / 9 000 ≈ 0.0011, sin importar cuántos positivos tenga (la figura ML00.K). No es 0: con cientos de usuarios, algunos aciertos aparecen. <code>reco azar</code> imprime la cuenta con el catálogo real al lado de la media.'
  }]
});
