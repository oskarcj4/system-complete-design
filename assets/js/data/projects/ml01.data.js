/* Decisiones guiadas de ML01 (La línea base: lo popular, bien medido). Formato en core/exercise.js. */

SD.defineExercise('ml01-linea-base', {
  title: 'la línea base que toda la serie tiene que superar',
  scenario: '<p>Tienes el laboratorio de ML00: MovieLens small partido por tiempo, el evaluador con recall@10, NDCG@10 y cobertura, y el azar como piso. Ahora vas a construir lo popular de varias maneras, medirlo con márgenes de error y servirlo detrás de una API con caché en Redis. La variante que elijas será la vara de todas las guías que siguen. Son ocho decisiones.</p>',
  steps: [
    {
      id: 'contar', type: 'single',
      prompt: 'En la variante más simple, ¿qué cuentas por película?',
      options: [
        'Cuántas calificaciones tiene, sin mirar las estrellas: cualquier calificación prueba que alguien la vio.',
        'Cuántas calificaciones de 4.0 o más tiene, el mismo umbral de positivo que usa la prueba.',
        'El promedio de sus estrellas, que mide cuánto gustó y no solo cuánta gente la vio.',
        'La suma de sus estrellas, que junta en un número cuánta gente la vio y cuánto le gustó.'
      ],
      answer: 1,
      explain: 'La prueba considera acierto una calificación de 4.0 o más; contar lo mismo que se mide es lo coherente. Contar todas las calificaciones premia lo visto y odiado. El promedio simple pone arriba películas de un solo voto de 5, y la suma de estrellas también le suma puntos a un voto de 1. Está en <a href="#ae-popular">cuatro maneras de contar</a>.'
    },
    {
      id: 'ahora', type: 'single',
      prompt: 'Para el decaimiento, cada positivo pesa según su edad. ¿Desde qué momento mides la edad?',
      options: [
        'Desde el reloj de la máquina en el momento de correr el informe, que es el ahora de verdad.',
        'Desde la última calificación de todo el dataset, entrenamiento y prueba juntos.',
        'Desde la última calificación del entrenamiento, el instante del corte.',
        'Desde la primera calificación del entrenamiento, para que todas las edades sean positivas.'
      ],
      answer: 2,
      explain: 'El modelo vive en el corte: lo que sabe termina ahí. El reloj de la máquina hace que el resultado cambie de un día para otro y deja todos los pesos diminutos, porque los datos terminan en 2018. La última de todo el dataset mira la prueba, que es una fuga. Desde la primera, lo viejo pesaría más que lo nuevo: el decaimiento al revés. Está en <a href="#ae-decaimiento">el decaimiento</a>.'
    },
    {
      id: 'unvoto', type: 'single',
      prompt: 'Ordenadas por promedio de estrellas, arriba quedan películas con un solo voto de 5. ¿Qué haces?',
      options: [
        'Excluyes las películas con menos de 50 votos, para que solo compitan las que tienen una señal estable.',
        'Ordenas por la mediana de las estrellas, que no se deja mover por un voto extremo.',
        'Multiplicas el promedio por el logaritmo de la cantidad de votos, para premiar las muy votadas.',
        'Sumas 20 votos imaginarios con el promedio general, y cada película se aleja de él con sus votos reales.'
      ],
      answer: 3,
      explain: 'El promedio bayesiano empuja hacia el promedio general a las películas con pocos votos y casi no toca a las que tienen miles. Un corte en 50 votos tira información y crea un salto: con 49 desapareces y con 50 compites de igual a igual. La mediana de un solo voto es ese voto. El logaritmo mezcla dos escalas sin una razón para el peso. Está en <a href="#ae-bayesiana">el promedio bayesiano</a>.'
    },
    {
      id: 'sortear', type: 'single',
      prompt: 'Para el intervalo del NDCG@10, ¿qué sortea el bootstrap?',
      options: [
        'Usuarios de la prueba, con reposición: cada usuario es una unidad, como en el promedio de ML00.',
        'Calificaciones de la prueba, con reposición, y con cada sorteo se recalcula el NDCG de cada usuario.',
        'Películas del catálogo, con reposición, porque el modelo puede tener suerte con algunas películas.',
        'Diez grupos de usuarios sin reposición, y el intervalo sale de las diez medias de los grupos.'
      ],
      answer: 0,
      explain: 'La media del NDCG es un promedio entre usuarios, así que la variación que importa es qué usuarios tocaron en la prueba: se sortean usuarios. Sortear calificaciones cambia la prueba de cada usuario, y sortear películas mide otra cosa. Diez grupos dan diez medias, muy pocas para estimar los extremos del 95&#8239;%. Está en <a href="#ae-bootstrap">el bootstrap</a>.'
    },
    {
      id: 'comparar', type: 'single',
      prompt: 'Quieres saber si la bayesiana le gana al conteo. ¿Cómo lo decides?',
      options: [
        'Con los dos intervalos: si no se solapan, una gana; si se solapan, empatan.',
        'Con la resta usuario por usuario sobre los mismos usuarios, y el intervalo de esa resta.',
        'Con la media: si la de la bayesiana es más alta, gana, porque mil remuestreos ya hacen estable la media.',
        'Corriendo el informe con otra semilla: si gana en las dos corridas, la diferencia es real.'
      ],
      answer: 1,
      explain: 'Las dos variantes se miden sobre los mismos usuarios, y gran parte de la variación es de los usuarios: unos son fáciles para las dos y otros difíciles para las dos. La resta pareada cancela esa parte y da un intervalo más angosto. Comparar dos intervalos sueltos es demasiado conservador, la media sola no dice nada del margen y otra semilla solo vuelve a sortear los mismos usuarios. Está en <a href="#ae-pareada">la diferencia pareada</a>.'
    },
    {
      id: 'leer', type: 'single',
      prompt: 'La diferencia del decaimiento contra el conteo da <code>+0.0040 [-0.0020, +0.0100]</code>. ¿Qué concluyes?',
      options: [
        'Que el decaimiento gana: la media es positiva, y el intervalo tiene más lado positivo que negativo.',
        'Que el decaimiento pierde: si el intervalo llega a valores negativos, la variante es peor.',
        'Que con estos usuarios es un empate, y que entre dos que empatan conviene quedarse con la más simple.',
        'Que faltan remuestreos: subes a diez mil hasta que el intervalo deje de cruzar el cero.'
      ],
      answer: 2,
      explain: 'El intervalo cruza el cero: con estos usuarios, el decaimiento podría ser un poco peor o un poco mejor. Eso es un empate, no una victoria por mayoría de lado. Más remuestreos no lo angostan, porque el ancho depende de cuántos usuarios hay, no de cuántos sorteos; y repetir hasta que salga lo que quieres es buscar el resultado. Está en <a href="#ae-pareada">la figura ML01.I</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '¿Qué lleva la clave de Redis de una lista popular?',
      options: [
        'La variante, el género y <i>k</i>: cada combinación de parámetros es una respuesta distinta.',
        'La versión de los datos, la variante y el género, sin <i>k</i>: se guardan 100 y se cortan.',
        'Solo la variante, porque el género se filtra en la API sobre la lista general guardada.',
        'La variante, el género y la hora de la request, para que cada clave venza a su hora.'
      ],
      answer: 1,
      explain: 'Con <i>k</i> en la clave, pedir 5 y después 10 calcula dos veces lo mismo. Sin la versión, después de recargar datos nuevos la API serviría listas viejas hasta que venzan. Filtrar el género sobre la lista general guardada falla si en las 100 primeras hay pocas de ese género. Y la hora en la clave hace que casi ninguna request encuentre algo. Está en <a href="#ae-cache">la caché</a>.'
    },
    {
      id: 'caida', type: 'single',
      prompt: 'Redis no contesta. ¿Qué hace la API?',
      options: [
        'Responde 503, para que el cliente sepa que algo anda mal y reintente más tarde.',
        'Reintenta la lectura tres veces con espera creciente antes de calcular la lista.',
        'Responde una lista vacía con 200, para no hacer esperar al cliente.',
        'Espera 0.2 segundos como máximo, calcula la lista, no intenta guardarla y avisa que Redis cayó.'
      ],
      answer: 3,
      explain: 'La caché es una optimización: sin ella la API puede calcular la respuesta correcta, un poco más lenta. Un 503 convierte una caída de la caché en una caída del servicio. Tres reintentos con espera multiplican la latencia justo cuando algo anda mal. Una lista vacía con 200 es una respuesta incorrecta que parece correcta. Está en <a href="#ae-cache">una caché que se puede caer</a>.'
    }
  ],
  solution: '<ul>' +
    '<li><b>Contar:</b> los positivos, con el mismo umbral que la prueba.</li>' +
    '<li><b>Decaimiento:</b> la edad se mide desde la última calificación del entrenamiento, con vida media configurable.</li>' +
    '<li><b>Pocos votos:</b> el promedio bayesiano, con 20 votos imaginarios y el promedio del entrenamiento como prior.</li>' +
    '<li><b>Bootstrap:</b> mil sorteos de usuarios con reposición y semilla fija; el intervalo son los cuantiles 0.025 y 0.975.</li>' +
    '<li><b>Comparar:</b> la diferencia pareada sobre los mismos usuarios en el mismo orden, con su propio intervalo.</li>' +
    '<li><b>Leer:</b> una variante gana solo si el intervalo de la diferencia queda entero del lado positivo; si cruza el cero, es un empate y se queda la más simple.</li>' +
    '<li><b>Clave:</b> <code>pop:&lt;versión&gt;:&lt;variante&gt;:&lt;género&gt;</code>, con las 100 primeras guardadas y <i>k</i> cortado en cada request.</li>' +
    '<li><b>Redis caído:</b> timeout de 0.2 segundos sin reintentos, la lista calculada, sin <code>SET</code>, y <code>"redis": "caido"</code> en la respuesta.</li>' +
    '</ul>'
});

/* ---------- Predice la salida: uno por paso ---------- */

SD.defineExercise('ml01-p-laboratorio', {
  kind: 'predict', title: 'la ayuda de reco',
  scenario: '<p>Copiaste el laboratorio y los archivos <code>config.py</code> y <code>cli.py</code> de este paso. Corres <code>uv run reco --help</code>.</p>',
  steps: [{
    id: 'comandos', type: 'single',
    prompt: '¿Cuántos comandos aparecen en la lista entre llaves?',
    options: ['4', '7', '8', '11'],
    fixed: true,
    answer: 1,
    explain: 'El analizador tiene siete subcomandos: los cuatro del laboratorio (<code>descargar</code>, <code>convertir</code>, <code>explorar</code> y <code>partir</code>) y los tres nuevos (<code>popular</code>, <code>informe</code> y <code>servir</code>). <code>matriz</code> y <code>azar</code> de ML00 no están: esta guía no usa la matriz, y el azar se mide dentro del informe. Aparecen aunque <code>popular.py</code> todavía no exista, porque cada comando importa su módulo recién al correr.'
  }]
});

SD.defineExercise('ml01-p-popular', {
  kind: 'predict', title: 'el conteo en la terminal',
  scenario: '<p>Corres <code>uv run reco popular --variante conteo --k 5</code>. Cada línea se imprime con <code>f"{p:&gt;10.4f}  {movie_id:&gt;6}  {titulos[movie_id]}"</code>.</p>',
  steps: [{
    id: 'puntaje', type: 'single',
    prompt: '¿Cómo se ven los puntajes de la primera columna?',
    options: [
      'Números enteros seguidos de cuatro ceros después del punto, terminados en .0000',
      'Números entre 0 y 1 con cuatro decimales, porque el conteo se normaliza',
      'Números entre 0.5 y 5, como las estrellas, con cuatro decimales',
      'Números enteros sin punto, porque un conteo no tiene decimales'
    ],
    answer: 0,
    explain: '<code>conteo</code> cuenta filas con <code>size()</code> y las pasa a <code>float</code> con <code>astype(float)</code>; el formato <code>.4f</code> escribe siempre cuatro decimales, así que un conteo entero sale con <code>.0000</code>. No se normaliza: es la cantidad de positivos. Los valores entre 0.5 y 5 son los de la bayesiana.'
  }]
});

SD.defineExercise('ml01-p-bootstrap', {
  kind: 'predict', title: 'un intervalo sin variación',
  scenario: '<p>Corres <code>intervalo([1.0, 1.0, 1.0, 1.0])</code>, con los mil remuestreos y el nivel del 95&#8239;% por defecto.</p>',
  steps: [{
    id: 'punto', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      'El par 1.0 y 1.0: el intervalo es un solo punto',
      'Un par como 0.95 y 1.05, el 5&#8239;% de margen alrededor de la media',
      'Un <code>ValueError</code>, porque con cuatro valores no hay intervalo',
      'El par 0.0 y 1.0, el rango posible de una métrica'
    ],
    answer: 0,
    explain: 'Cualquier sorteo con reposición de cuatro unos es otra vez cuatro unos, así que las mil medias valen 1.0 y sus dos cuantiles también. El 95&#8239;% no es un margen sobre la media: es la parte del medio de las medias sorteadas. El <code>ValueError</code> solo aparece con una lista vacía.'
  }]
});

SD.defineExercise('ml01-p-informe', {
  kind: 'predict', title: 'la fila del conteo',
  scenario: '<p>Corres <code>uv run reco informe --modo global</code>. La columna <code>ndcg_vs_conteo</code> es la diferencia pareada de cada variante contra el conteo, con su intervalo.</p>',
  steps: [{
    id: 'cero', type: 'single',
    prompt: '¿Qué dice esa columna en la fila del conteo?',
    options: [
      '<code>+0.0000 [+0.0000, +0.0000]</code>',
      'Un valor chico con un intervalo que cruza el cero',
      '<code>NaN</code>, porque no tiene contra qué compararse',
      'La misma media que su columna <code>ndcg</code>'
    ],
    answer: 0,
    explain: 'La fila del conteo se resta a sí misma usuario por usuario: todas las diferencias son 0 exacto, y cualquier sorteo de ceros tiene media 0. Sirve de control: si no sale cero, el orden de los usuarios está mal. No es <code>NaN</code> porque sí hay contra qué restar: contra sí misma.'
  }]
});

SD.defineExercise('ml01-p-api', {
  kind: 'predict', title: 'la caché y k',
  scenario: '<p>Con Redis levantado y la caché vacía, pides <code>/v1/recs/popular?k=5</code> y después <code>/v1/recs/popular?k=3</code>.</p>',
  steps: [{
    id: 'fuente', type: 'single',
    prompt: '¿Qué <code>fuente</code> trae la segunda respuesta?',
    options: [
      '<code>"cache"</code>, con las tres primeras de la lista guardada',
      '<code>"calculado"</code>, porque cambió <i>k</i> y la clave es otra',
      'Ninguna: un 422, porque <i>k</i> cambió entre dos requests',
      '<code>"calculado"</code>, porque Redis solo guarda listas de cinco'
    ],
    answer: 0,
    explain: 'La clave es <code>pop:&lt;versión&gt;:conteo:*</code>: no lleva <i>k</i>. La primera request guardó las 100 primeras, y la segunda las encuentra y corta tres con <code>lista[:k]</code>. El 422 solo aparece con un <i>k</i> fuera de 1 a 100.'
  }]
});
