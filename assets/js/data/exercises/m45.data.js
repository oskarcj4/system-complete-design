SD.defineExercise('m45-indice', {
  title: 'el índice de los videos de reseña',
  scenario: '<p>Mercado Barrio suma una pestaña de <b>videos de reseña</b> con su propio recomendador. Hay <b>30 millones de videos</b>, cada uno con un vector de '
    + '<b>256 dimensiones</b> en float32 que sale de la torre de ítems. Se publican unos <b>200 000 videos por día</b>, el modelo se reentrena cada semana y la '
    + 'recuperación tiene <b>25 ms</b>. Las máquinas del servicio tienen <b>64 GB</b> de RAM (un supuesto). Los videos se filtran por país: hay 10, y el más chico, '
    + 'Uruguay, tiene el 2&#8239;% de los videos. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'exacta', type: 'single', fixed: true,
      prompt: '¿Cuántos bytes lee una búsqueda exacta contra todos los videos?',
      options: ['3.07 GB', '7.68 GB', '30.72 GB', '122.88 GB'],
      answer: 2,
      explain: '30 000 000 × 256 × 4 B = 30.72 GB por consulta. A 200 GB/s son unos 154 ms solo en leer, seis veces el presupuesto de la recuperación. 7.68 GB olvida los 4 bytes del float32 y 122.88 GB los cuenta dos veces. Repasa 45.1.'
    },
    {
      id: 'hnsw', type: 'single', fixed: true,
      prompt: 'Con un HNSW de M = 32, FAISS usa 4d + 8M bytes por vector. ¿Cuánto ocupa el índice?',
      options: ['30.72 GB', '38.4 GB', '46.08 GB', '76.8 GB'],
      answer: 1,
      explain: '4 × 256 + 8 × 32 = 1 024 + 256 = 1 280 B por video, y 30 000 000 × 1 280 B = 38.4 GB. Entra en una máquina de 64 GB, pero sin mucho margen para construir el índice nuevo al lado. 76.8 GB es el índice de ítems de 45.6. Repasa 45.6.'
    },
    {
      id: 'ivfpq', type: 'single', fixed: true,
      prompt: 'Con IVF-PQ de 64 bytes por código y el id de 8 bytes, ¿cuánto ocupa?',
      options: ['1.92 GB', '2.16 GB', '7.2 GB', '30.72 GB'],
      answer: 1,
      explain: '30 000 000 × (64 + 8) B = 2.16 GB: entran varias versiones en la misma máquina. Partir 256 dimensiones en 64 trozos deja trozos de 4 números, más compresión que en 45.7, así que el recall se mide y se reordena con los vectores completos. Repasa 45.7.'
    },
    {
      id: 'nprobe', type: 'single', fixed: true,
      prompt: 'Usas las 262 144 celdas que recomienda FAISS para 10 a 100 millones de vectores, con nprobe = 32. ¿Cuántos vectores mira cada consulta?',
      options: ['unos 114', 'unos 3 662', 'unos 8 192', 'unos 937 500'],
      answer: 1,
      explain: '30 000 000 × 32 / 262 144 = 3 662. Cada celda tiene unos 114 videos, y mirar 32 celdas son 32 × 114. 937 500 serían 30 millones divididos por 32. Repasa 45.7.'
    },
    {
      id: 'pais', type: 'single',
      prompt: '¿Cómo resuelves el filtro por país?',
      options: [
        'Filtrar después: pedir 4 000 vecinos y quedarse con los del país, porque la mezcla rellena con otras fuentes',
        'Filtrar antes en todos los países: armar el subconjunto del país y buscar exacto, porque así el recall es perfecto',
        'Un índice por país, porque el país es estable, tiene pocos valores y separa casi todo',
        'Agregar el país al vector como una dimensión más'
      ],
      answer: 2,
      explain: 'Filtrar después deja unos 80 de 4 000 en Uruguay. Buscar exacto en Brasil, con millones de videos, vuelve a ser caro. Una dimensión más no garantiza nada: es una preferencia, no un filtro. Un índice por país resuelve el caso común, y el filtro de stock o de bloqueos sigue al final. Repasa 45.8.'
    },
    {
      id: 'nuevos', type: 'single',
      prompt: 'Llegan 200 000 videos por día y tienen que poder recomendarse en minutos. ¿Qué haces?',
      options: [
        'Insertarlos en el índice principal a medida que llegan, porque HNSW acepta inserciones y así no hace falta otro índice',
        'Un índice delta para lo publicado desde la noche, buscado junto al principal, con lápidas',
        'Reconstruir el índice entero cada hora, con PQ',
        'Dejar que los videos nuevos entren solo por la fuente de populares, hasta la reconstrucción de la noche'
      ],
      answer: 1,
      explain: 'Son unos 2.3 por segundo. Un delta los hace buscables en segundos sin tocar el principal, que se reconstruye en paz, y las lápidas sacan lo borrado al leer. Insertar en el principal durante semanas degrada el grafo, y reconstruir cada hora es caro y no es "en minutos". Repasa 45.9.'
    },
    {
      id: 'version', type: 'single',
      prompt: 'El modelo se reentrena cada semana. ¿Cómo despliegas el modelo nuevo?',
      options: [
        'Primero la torre de usuario y, cuando esté estable, el índice nuevo, para cambiar una cosa por vez',
        'Primero el índice nuevo y después la torre de usuario, porque el índice es lo que más tarda en construirse',
        'Las dos juntas: el índice nuevo se arma al lado y el par se cambia de una vez',
        'Solo el índice: la torre de usuario queda fija'
      ],
      answer: 2,
      explain: 'Los vectores de dos entrenamientos distintos no se pueden comparar: cambiar uno sin el otro vuelve ruido las recomendaciones sin errores en los logs. El índice lleva la versión del modelo y el delta rechaza vectores de otra versión. Repasa 45.9.'
    },
    {
      id: 'cola', type: 'multi',
      prompt: 'El índice de Brasil se reparte en 8 shards y cada uno tiene un 1 % de respuestas lentas. ¿Qué haces? Marca todas las que correspondan.',
      options: [
        'Réplicas de cada shard y una segunda request a otra réplica si la primera tarda',
        'Aceptar los resultados parciales cuando vence el deadline de la fuente',
        'Esperar a los 8 shards siempre, porque sin uno se pierden candidatos buenos',
        'Contar con que el 7.7 % de las requests espera a algún shard lento si no haces nada'
      ],
      answer: [0, 1, 3],
      explain: '1 − 0.99⁸ = 7.7 %: es la latencia de cola con fan-out de M00. Hedging y resultados parciales la cortan; perder un shard de ocho es perder un octavo de los candidatos de una fuente, no la recomendación. Esperar siempre hace que la fuente entera pierda el deadline. Repasa 45.10.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Índice:</b> IVF-PQ, 2.16 GB por versión, con 262 144 celdas, nprobe a medir (32 mira unos 3 662 videos) y reordenamiento con los vectores completos guardados aparte. HNSW (38.4 GB) es una alternativa si se reparte por país y la memoria alcanza para dos versiones.</li>'
    + '<li><b>Filtros:</b> un índice por país; stock, bloqueos y ya visto al final, en los filtros del embudo.</li>'
    + '<li><b>Frescura:</b> principal reconstruido de noche, delta para los 200 000 videos del día y lápidas para lo borrado.</li>'
    + '<li><b>Versiones:</b> índice y torre de usuario se despliegan como un par, con el índice nuevo construido al lado.</li>'
    + '<li><b>Cola:</b> réplicas por shard, hedging, resultados parciales al vencer el deadline y el recall medido contra la búsqueda exacta con consultas reales.</li>'
    + '</ul>'
});
