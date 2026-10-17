SD.defineQuiz('m46', {
  title: 'Quiz: ranking', pass: 0.7,
  questions: [
    { id: 'porque', type: 'single',
      prompt: '¿Por qué un ranker predice una probabilidad por cada acción (clic, compra, ocultar) en lugar de un solo puntaje de "qué tan bueno es"?',
      options: [
        'Porque cada acción tiene su etiqueta en el log, y la mezcla se decide con pesos que cambian sin reentrenar',
        'Porque un solo puntaje no cabe en float32 cuando se combinan cuatro acciones con escalas muy distintas',
        'Porque las redes con una sola salida no pueden aprender cruces entre las features de la persona y del ítem',
        'Porque el re-ranking necesita las cuatro probabilidades por separado para aplicar la diversidad de cada acción'
      ],
      answer: 0,
      explain: '"Qué tan bueno es" no tiene etiqueta; clic, compra y ocultar sí. Con probabilidades separadas, el producto cambia los pesos de la combinación sin tocar el modelo, y cada probabilidad se compara contra la frecuencia real. Vuelve a 46.1.' },
    { id: 'sigmoide', type: 'single',
      prompt: 'Una regresión logística tiene <i>b</i> = −3.0 y pesos 1.2 (miró la categoría), 1.5 (ya le compró al vendedor) y −0.8 (precio alto). Si las tres features valen 1, ¿qué probabilidad da?',
      options: ['0.047', '0.069', '0.250', '0.426'],
      fixed: true, answer: 2,
      explain: 'z = −3.0 + 1.2 + 1.5 − 0.8 = −1.1 y σ(−1.1) = 1 / (1 + e^1.1) = 0.250. 0.047 es sin ninguna señal, 0.069 es categoría y precio alto, y 0.426 es categoría y vendedor con precio normal. Vuelve a 46.2.' },
    { id: 'logloss', type: 'single',
      prompt: 'Tres impresiones: p = 0.8 con clic, p = 0.3 sin clic y p = 0.1 con clic. ¿Qué dice su log loss?',
      options: [
        'Que las tres pesan parecido, porque la log loss promedia errores absolutos entre la predicción y la etiqueta',
        'Que la tercera es casi todo el total: decir 0.1 y que haya clic cuesta −ln 0.1 = 2.303 de un total de 2.883',
        'Que la segunda es la peor, porque predecir 0.3 sin clic es un falso positivo y esos se castigan el doble',
        'Que el modelo está bien, porque el promedio de las predicciones (0.4) es parecido a la tasa de clics'
      ],
      answer: 1,
      explain: 'Las pérdidas son 0.223, 0.357 y 2.303, con promedio 0.961: la tercera es el 80&#8239;% del total. La log loss castiga mucho la confianza equivocada; no son errores absolutos, y un promedio parecido al CTR no dice nada de cada impresión. Vuelve a 46.2.' },
    { id: 'cruces', type: 'single',
      prompt: 'Un equipo tiene un ranker de regresión logística y otro de GBDT con las mismas features tabulares. ¿Qué hace el GBDT que la regresión no hace sola?',
      options: [
        'Aprende un vector por cada id de ítem, así que generaliza a ítems parecidos a los que vio',
        'Se actualiza de a poco con los datos de la última hora, sin reentrenar desde cero cada día',
        'Encuentra cruces y umbrales entre features, porque cada hoja queda debajo de varias preguntas',
        'Da probabilidades calibradas por construcción, porque cada hoja guarda la tasa de clics real'
      ],
      answer: 2,
      explain: 'Una hoja debajo de dos preguntas es un cruce de dos features, y el árbol elige el umbral. Los ids con millones de valores y la actualización de a poco son los límites del GBDT, que empujan hacia los modelos profundos; y un GBDT también puede descalibrarse. Vuelve a 46.3.' },
    { id: 'ltr', type: 'single',
      prompt: 'Las salidas del ranker se van a sumar con pesos de producto y también se usan para cobrar anuncios por clic. ¿Qué tipo de pérdida conviene?',
      options: [
        'Listwise con LambdaMART, porque optimiza NDCG directamente y eso deja los números en la escala correcta',
        'Pairwise, porque comparar pares de la misma lista produce probabilidades que se pueden sumar entre listas',
        'Pointwise con log loss, porque da probabilidades que se calibran y significan lo mismo en cualquier lista',
        'Cualquiera, porque una vez ordenada la lista todas las pérdidas dan los mismos números a los ítems de arriba'
      ],
      answer: 2,
      explain: 'Sumar con pesos y cobrar necesita probabilidades que signifiquen lo que dicen. Las pérdidas pairwise y listwise dan puntajes que ordenan bien una lista, pero no son probabilidades ni se comparan entre listas. Vuelve a 46.4.' },
    { id: 'lambda', type: 'single',
      prompt: '¿Qué agrega LambdaRank a los gradientes por pares de RankNet?',
      options: [
        'Pesa cada par por cuánto cambiaría NDCG si los dos ítems se intercambiaran',
        'Reemplaza los pares por tríos, para que la pérdida vea tres posiciones a la vez',
        'Deriva NDCG de forma exacta, cambiando el logaritmo del descuento por una recta',
        'Ignora los pares fuera del top 10, para que el entrenamiento sea diez veces más corto'
      ],
      answer: 0,
      explain: 'NDCG no se deriva (salta cuando dos ítems se cruzan), así que LambdaRank toma el gradiente de RankNet y lo multiplica por |ΔNDCG| del intercambio: un par mal ordenado arriba pesa mucho más que uno abajo. LambdaMART es esa idea con árboles con boosting. Vuelve a 46.4.' },
    { id: 'tablas', type: 'single',
      prompt: 'Un DLRM tiene un embedding de 64 float32 para cada uno de 100 millones de ítems y 10 millones de parámetros en sus capas densas. ¿Qué domina su memoria?',
      options: [
        'Las capas densas, porque cada parámetro denso se usa en todas las requests y se guarda con sus gradientes',
        'La tabla de ítems: 100 000 000 × 64 × 4 B = 25.6 GB, contra unos 40 MB de todas las capas densas juntas',
        'Los cruces de a pares, porque con k vectores hay k(k − 1)/2 productos punto que se guardan por ítem',
        'Las activaciones del MLP de arriba, que crecen con el tamaño del lote y pasan de 100 GB en el pico'
      ],
      answer: 1,
      explain: 'El modelo es casi todo tablas. Por eso las tablas se reparten entre GPUs por filas (paralelismo de modelo) y las capas densas se copian en todas (paralelismo de datos), y se achican con hashing o cuantización. Los cruces se calculan en cada pasada, no se guardan. Vuelve a 46.5.' },
    { id: 'mmoe', type: 'single',
      prompt: 'En un ranker multi-tarea con capas compartidas, la compra (rara) empeora desde que se agregó la tarea de clic (abundante). ¿Qué propone MMoE?',
      options: [
        'Entrenar las dos tareas por turnos, una época de clics y una de compras, para que no compartan gradientes',
        'Varios expertos en paralelo y una compuerta por tarea, que decide cuánto toma de cada experto',
        'Una sola cabeza que predice p(clic) · p(compra), así la tarea rara queda dentro de la abundante',
        'Duplicar los ejemplos de compra hasta igualar los de clic, para que las capas compartidas los pesen igual'
      ],
      answer: 1,
      explain: 'Es transferencia negativa: las capas compartidas se acomodan a la tarea con más gradientes. Con MMoE, si las tareas se parecen las compuertas eligen los mismos expertos; si no, cada una se queda con los suyos. Vuelve a 46.6.' },
    { id: 'din', type: 'single',
      prompt: 'Promediar los embeddings de los últimos 100 ítems de la persona pierde información. ¿Qué cambia la atención con el candidato como consulta (DIN)?',
      options: [
        'Ordena la historia por fecha y descarta lo que tiene más de una semana, que ya no dice nada de la persona',
        'Aprende un peso fijo por posición de la historia, así lo reciente cuenta más que lo de hace un mes',
        'Cada ítem visto pesa según su parecido con el candidato, así la historia se resume distinto para cada uno',
        'Reemplaza la historia por el embedding de la última búsqueda, que es la señal más fresca de lo que quiere'
      ],
      answer: 2,
      explain: 'Para unas zapatillas de running importa la remera de running que miró, no el libro de cocina: el softmax de los parecidos con el candidato pondera la historia. Un peso fijo por posición resuelve el orden, pero no qué importa para cada candidato. Vuelve a 46.7.' },
    { id: 'pesos', type: 'single',
      prompt: 'Con pesos que dan mucho valor a las respuestas y ningún castigo al feedback negativo, una publicación provocadora queda primera. ¿Qué lo corrige en los pesos de Twitter de 2023?',
      options: [
        'Que las respuestas valen menos que los me gusta, así que provocar no paga en la suma pesada',
        'Un filtro previo que saca las publicaciones polémicas antes del ranker, sin que entren a la suma',
        'Pesos negativos grandes: −74 por feedback negativo y −369 por denuncia, que se restan del puntaje',
        'Un tope al puntaje de cada publicación, para que ninguna sume más de lo que suma un me gusta'
      ],
      answer: 2,
      explain: 'En el README de abril de 2023, la respuesta pesa 13.5 (el me gusta, 0.5), así que provocar sí paga; lo que lo frena son los pesos negativos. Los pesos los elige el producto, no el modelo. Vuelve a 46.8.' },
    { id: 'calib', type: 'single',
      prompt: 'Se entrenó con un 10&#8239;% de los negativos (<i>w</i> = 0.1) y el modelo predice 0.2 para un ítem. ¿Qué probabilidad real corresponde?',
      options: ['0.020', '0.024', '0.200', '0.714'],
      fixed: true, answer: 1,
      explain: 'q = p / (p + (1 − p) / w) = 0.2 / (0.2 + 0.8 / 0.1) = 0.2 / 8.2 = 0.024. Multiplicar por w (0.020) es una aproximación que solo vale para p muy chicas. Vuelve a 46.9.' },
    { id: 'auccal', type: 'multi',
      prompt: 'Se aplica una calibración isotónica a un modelo sobreconfiado. ¿Qué métricas pueden cambiar?',
      options: [
        'La log loss',
        'La razón entre clics esperados y clics observados',
        'El AUC',
        'El NDCG de cada lista'
      ],
      answer: [0, 1],
      explain: 'La isotónica es una función creciente: no cambia el orden, así que no mueve el AUC ni el NDCG. Sí cambia los números, y con ellos la log loss y la razón predicho/observado. Vuelve a 46.9 y 46.10.' },
    { id: 'ndcg', type: 'single',
      prompt: 'El modelo devolvió tres ítems con relevancias 0, 3 y 2. ¿Cuánto vale su NDCG@3?',
      options: ['0.333', '0.665', '0.750', '1.000'],
      fixed: true, answer: 1,
      explain: 'DCG = 0 + 7 / log₂ 3 + 3 / log₂ 4 = 4.417 + 1.5 = 5.917; IDCG (orden 3, 2, 0) = 7 + 3 / 1.585 = 8.893; NDCG = 0.665. 0.333 sería la fracción de ítems arriba que están bien. Vuelve a 46.10.' },
    { id: 'cascada', type: 'single',
      prompt: 'En la cascada, el liviano deja 500 de 9 000 candidatos. ¿Cómo se mide cuánto pierde respecto del pesado?',
      options: [
        'Con el AUC del liviano sobre el log, porque si separa bien positivos y negativos no puede cortar lo bueno',
        'Comparando la latencia de las dos etapas, porque un liviano rápido deja más tiempo para el pesado',
        'Con el pesado sobre los 9 000 de una muestra, contando cuántos de sus 50 mejores pasan el corte',
        'Con un A/B que apaga el liviano, porque es la única forma de ver lo que el pesado hubiera elegido'
      ],
      answer: 2,
      explain: 'Es el recall de la cascada: offline, sin apuro, el pesado puntúa todo y se ve qué parte de su top sobrevive al liviano. Apagar el liviano en producción costaría 900 ms por request. La destilación sirve para subir ese recall. Vuelve a 46.11.' }
  ]
});
