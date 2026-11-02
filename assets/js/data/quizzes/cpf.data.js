SD.defineQuiz('cpf', {
  title: 'Checkpoint F: ML System Design', pass: 0.7,
  questions: [
    { id: 'norte', type: 'single',
      prompt: 'La métrica norte de Mercado Barrio son las compras por persona en 28 días. ¿Por qué el ranker no la optimiza directamente?',
      options: [
        'Porque se mueve lento y con mucho ruido, y el modelo necesita etiquetas cercanas a cada impresión',
        'Porque es una métrica de negocio y los modelos de ML solo pueden optimizar métricas técnicas como el AUC',
        'Porque las compras no se registran en el log de eventos, solo en la base de pagos',
        'Porque optimizarla directamente está prohibido por la DSA en los marketplaces europeos'
      ],
      answer: 0,
      explain: 'Se optimizan señales cercanas (clic, carrito, compra en 7 días) y la métrica norte se mira en el experimento. Repasa M42.' },
    { id: 'linea-base', type: 'single',
      prompt: '¿Contra qué se compara el primer modelo del feed?',
      options: [
        'Contra una línea base simple, como lo más vendido por categoría, en un A/B',
        'Contra el modelo de la competencia, medido con los datos públicos de sus rankings',
        'Contra un modelo aleatorio, que es el único que no tiene sesgo de popularidad',
        'Contra el mejor modelo publicado en la literatura para el mismo conjunto de datos'
      ],
      answer: 0,
      explain: 'Si un modelo no le gana a la línea base simple, no vale lo que cuesta operarlo. Repasa M42.' },
    { id: 'pico', type: 'single', fixed: true,
      prompt: '20 M personas abren el feed 20 veces por día, con un pico de 3 veces el promedio. ¿Cuántas requests por segundo en el pico?',
      options: ['4 630', '13 889', '138 889', '400 000'],
      answer: 1,
      explain: '400 M ÷ 86 400 = 4 630; × 3 = 13 889. Repasa M42.' },
    { id: 'embudo', type: 'single',
      prompt: '¿Por qué hace falta la etapa de recuperación antes del ranking?',
      options: [
        'Porque ningún modelo que mire cada ítem recorre 100 M en 200 ms',
        'Porque el ranker solo acepta ítems que ya fueron vistos por la persona alguna vez',
        'Porque la recuperación es la que aplica las reglas de negocio, como el stock',
        'Porque el ranking necesita una lista ordenada por fecha para poder puntuarla'
      ],
      answer: 0,
      explain: '100 M × 0.1 ms son casi 3 horas por request; los índices ni siquiera miran la mayoría de los ítems. Repasa M42 y M45.' },
    { id: 'fuga', type: 'single',
      prompt: 'Un modelo da un AUC excelente offline y no mejora nada en producción. Usa "ventas del ítem en el mes" calculada al final del mes. ¿Qué pasó?',
      options: [
        'Una fuga del futuro: la feature contenía información posterior a la impresión',
        'Sobreajuste por tener demasiados árboles, que se arregla bajando la profundidad',
        'Sesgo de posición: los ítems de arriba tienen más ventas por estar arriba',
        'Deriva de datos: los usuarios cambiaron de gustos entre el entrenamiento y el lanzamiento'
      ],
      answer: 0,
      explain: 'Las features se calculan point-in-time, con lo que se sabía en el momento de la impresión. Repasa M43.' },
    { id: 'negativos', type: 'single',
      prompt: '¿Qué es un buen negativo para entrenar el ranker del feed?',
      options: [
        'Un ítem que se mostró y la persona no tocó, registrado con su impresión',
        'Un ítem del catálogo elegido al azar, que la persona nunca vio en el feed',
        'Un ítem que la persona compró hace más de un año y ya no le interesa',
        'Un ítem con mala valoración, porque seguro no le gusta a nadie'
      ],
      answer: 0,
      explain: 'Para el ranker, el negativo es lo que se mostró y no funcionó; los aleatorios sirven en la recuperación. Repasa M43.' },
    { id: 'item-item', type: 'single',
      prompt: '¿Por qué "comprados juntos" se ordena por lift y no por conteo?',
      options: [
        'Porque el conteo premia lo que se compra con todo, y el lift lo compara contra lo esperado por azar',
        'Porque el lift se calcula más rápido que el conteo, que necesita ordenar todos los pares',
        'Porque el conteo no funciona con datos implícitos, solo con calificaciones',
        'Porque el lift no necesita soporte mínimo y el conteo sí'
      ],
      answer: 0,
      explain: 'Lift = observado ÷ esperado. Y sí necesita soporte mínimo: con pocos datos explota. Repasa M53.' },
    { id: 'frio', type: 'single',
      prompt: 'Un vendedor publica un producto hoy. ¿Cómo entra al feed y a "parecidos"?',
      options: [
        'Por su contenido en el índice, y con un hueco de exploración en el feed',
        'No entra hasta que acumule 1 000 ventas, para no arriesgar la calidad del feed',
        'Por los factores de ALS, que se calculan para cada producto apenas se publica',
        'Por la tabla de comprados juntos de esta noche'
      ],
      answer: 0,
      explain: 'Sin interacciones, el contenido es lo único que hay; la exploración le da sus primeras impresiones. Repasa M44, M47 y M53.' },
    { id: 'hnsw', type: 'single',
      prompt: 'En HNSW, ¿qué pasa si subes efSearch?',
      options: [
        'Sube el recall y sube la latencia de cada consulta',
        'Baja la memoria que ocupa el índice',
        'El índice se reconstruye con más pisos y tarda más en construirse',
        'Sube el recall sin costo de latencia, porque solo cambia el orden final'
      ],
      answer: 0,
      explain: 'efSearch es cuántos candidatos explora la búsqueda: más candidatos, más distancias calculadas. M controla la memoria. Repasa M45.' },
    { id: 'filtro-ann', type: 'single',
      prompt: 'Filtras por "envía a tu zona" después de traer 300 vecinos del índice, y a veces quedan 4. ¿Qué haces?',
      options: [
        'Filtrar dentro de la búsqueda o partir el índice por zona, y pedir más vecinos',
        'Mostrar los 4 y completar con ítems que no envían a la zona, marcados como tales',
        'Bajar efSearch para que la búsqueda sea más rápida',
        'Quitar el filtro, porque la persona puede elegir otra dirección de envío'
      ],
      answer: 0,
      explain: 'Un filtro muy selectivo después de la búsqueda vacía la lista. Repasa M45.' },
    { id: 'calibrar', type: 'single',
      prompt: '¿Por qué el ranker multi-tarea necesita probabilidades calibradas?',
      options: [
        'Porque se suman con pesos, y una probabilidad inflada pesa más de lo que le toca',
        'Porque sin calibrar el AUC baja, y el AUC es lo que decide el lanzamiento',
        'Porque los árboles solo aceptan probabilidades calibradas como entrada',
        'Porque la calibración reemplaza al A/B cuando hay pocas impresiones'
      ],
      answer: 0,
      explain: 'La calibración no cambia el orden de una sola probabilidad (ni el AUC), pero sí la suma ponderada. Repasa M46.' },
    { id: 'ndcg', type: 'single',
      prompt: '¿Qué mide NDCG en k que no mide la precisión en k?',
      options: [
        'Que lo relevante esté arriba, porque descuenta según la posición',
        'Cuántos ítems relevantes hay en total en el catálogo, aunque no se muestren',
        'Si las probabilidades del modelo están calibradas con las tasas reales',
        'Cuánto tarda el ranker en puntuar los k primeros ítems'
      ],
      answer: 0,
      explain: 'La precisión cuenta los relevantes en los k primeros sin importar el orden; NDCG premia tenerlos arriba. Repasa M46.' },
    { id: 'mmr', type: 'single',
      prompt: 'El feed muestra 10 zapatillas seguidas. ¿Qué etapa lo arregla?',
      options: [
        'El re-ranking, con MMR o una regla de máximo por categoría',
        'La recuperación, trayendo menos candidatos de la fuente de dos torres',
        'El ranking pesado, bajando el peso de p(compra) en la combinación',
        'Los filtros, dejando una sola zapatilla'
      ],
      answer: 0,
      explain: 'La diversidad es una propiedad de la lista, no de cada ítem: la mira el re-ranking. Repasa M47.' },
    { id: 'bandit', type: 'single',
      prompt: '¿Qué hace Thompson sampling con un ítem nuevo de pocas impresiones?',
      options: [
        'Lo muestra a veces, porque su incertidumbre alta le da muestras altas de vez en cuando',
        'No lo muestra nunca, porque su media estimada es cero hasta tener datos',
        'Lo muestra arriba hasta que junte 1 000 impresiones',
        'Lo muestra con una probabilidad fija del 10&#8239;%, como ε-greedy'
      ],
      answer: 0,
      explain: 'Muestrea de la distribución de cada brazo: la incertidumbre es lo que explora. Repasa M47.' },
    { id: 'pymk-explosion', type: 'single', fixed: true,
      prompt: 'Con 200 contactos de promedio, ¿cuántos caminos de dos saltos tiene una persona, antes de quitar repetidos?',
      options: ['200', '400', '40 000', '8 000 000'],
      answer: 2,
      explain: '200 × 200 = 40 000; con los muy conectados explota más, y por eso se pone un tope por amigo. Repasa M48.' },
    { id: 'pymk-dano', type: 'multi',
      prompt: '¿Qué reglas lleva PYMK en Mercado Barrio? Elige todas las que correspondan.',
      options: [
        'Nunca sugerir a quien bloqueaste o te bloqueó',
        'No sugerir menores a adultos que no conocen',
        'No revelar qué compra alguien sin su permiso',
        'Sugerir primero a quien tiene más contactos, para crecer más rápido'
      ],
      answer: [0, 1, 2],
      explain: 'PYMK puede exponer a personas que no quieren ser encontradas; las reglas son filtros duros. Repasa M48.' },
    { id: 'red', type: 'single',
      prompt: '¿Por qué un A/B de PYMK por persona da un resultado sesgado?',
      options: [
        'Porque las sugerencias del grupo A llegan a personas del grupo B',
        'Porque PYMK tiene poco tráfico para un A/B',
        'Porque la aceptación de amistades no se puede medir en una ventana de 7 días',
        'Porque el grafo cambia de noche y los grupos se reasignan en cada recálculo'
      ],
      answer: 0,
      explain: 'Efectos de red: se aleatoriza por clústeres del grafo. Repasa M49.' },
    { id: 'cuped', type: 'single', fixed: true,
      prompt: 'Un experimento necesita 20 M personas por grupo. CUPED quita el 40&#8239;% de la varianza. ¿Cuántas necesita ahora?',
      options: ['8 M', '12 M', '16 M', '20 M'],
      answer: 1,
      explain: 'n es proporcional a la varianza: 20 M × 0.6 = 12 M. Repasa M49.' },
    { id: 'degradar', type: 'order',
      prompt: 'Ordena la degradación del feed, del primer escalón al último, cuando el sistema está cada vez peor.',
      items: [
        'Quitar el ranking pesado y ordenar con el liviano',
        'Usar las features de ayer en lugar de las de tiempo real',
        'Servir el feed precalculado de la última sesión',
        'Servir lo popular cacheado, igual para todos'
      ],
      explain: 'Cada escalón quita calidad para conservar disponibilidad; lo popular cacheado es el piso. Repasa M50.' },
    { id: 'engagement', type: 'multi',
      prompt: 'Los videos de reseña suben el tiempo en el feed pero no las compras. ¿Qué miras antes de lanzar? Elige todas las que correspondan.',
      options: [
        'Las compras por persona y las devoluciones, no solo el tiempo',
        '"No me interesa" y el arrepentimiento en encuestas',
        'Las sesiones a la madrugada, sobre todo en menores',
        'Solo el tiempo en el feed, porque es la métrica que más se mueve'
      ],
      answer: [0, 1, 2],
      explain: 'El tiempo puede subir por compulsión, no por valor; se vigila con métricas de daño y de negocio. Repasa M51.' }
  ]
});
