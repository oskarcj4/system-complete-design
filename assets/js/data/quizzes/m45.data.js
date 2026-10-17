SD.defineQuiz('m45', {
  title: 'Quiz: recuperación a escala', pass: 0.7,
  questions: [
    { id: 'todo', type: 'single',
      prompt: 'Mercado Barrio tiene 100 millones de ítems con vectores de 128 float32. ¿Por qué la recuperación no compara a la persona contra todos?',
      options: [
        'Porque leer los 51.2 GB de vectores toma unos 256 ms a 200 GB/s, diez veces los 25 ms del presupuesto',
        'Porque el producto punto entre vectores de 128 números pierde precisión en float32 con tantos ítems',
        'Porque comparar contra todos devolvería siempre los ítems populares, que tienen los vectores más largos',
        'Porque la torre de ítems tendría que correr 100 millones de veces en cada request para tener los vectores'
      ],
      answer: 0,
      explain: 'Es una cuenta de bytes: 100 000 000 × 128 × 4 B = 51.2 GB por request. La torre de ítems no corre en la request (sus vectores están precalculados), la precisión de float32 alcanza y el sesgo por largo se evita normalizando. Vuelve a 45.1.' },
    { id: 'separar', type: 'single',
      prompt: '¿Qué es lo que hace servible al modelo de dos torres?',
      options: [
        'Que sus dos redes son más chicas que un ranker, así que corren las dos en cada request por debajo de 2 ms',
        'Que ninguna feature mezcla a la persona con el ítem, así que los vectores de los ítems se calculan antes',
        'Que aprende con negativos del lote, y eso le permite saltarse los ítems que la persona nunca va a tocar',
        'Que usa el coseno en lugar del producto punto, y el coseno se puede buscar con un índice invertido'
      ],
      answer: 1,
      explain: 'La separación permite precalcular los 100 millones de vectores de ítems y cargarlos en un índice; en la request solo corre la torre de usuario. El precio es no poder usar cruces persona-ítem, que quedan para el ranking. Vuelve a 45.2.' },
    { id: 'lote', type: 'single',
      prompt: 'En una fila del lote, los logits son 2.0 (el positivo), 0.5 y −1.0. ¿Qué pérdida da el softmax de esa fila?',
      options: ['0.039', '0.241', '0.786', '1.649'],
      fixed: true, answer: 1,
      explain: 'e^2.0 = 7.389, e^0.5 = 1.649 y e^−1.0 = 0.368 suman 9.406; el positivo tiene 7.389 / 9.406 = 0.786 y la pérdida es −ln 0.786 = 0.241. 0.786 es la probabilidad, no la pérdida. Vuelve a 45.3.' },
    { id: 'freq', type: 'single',
      prompt: '¿Para qué se resta el logaritmo de la frecuencia de cada ítem al entrenar con negativos del lote?',
      options: [
        'Para que los ítems raros, que casi nunca aparecen en un lote, no se recomienden a todo el mundo',
        'Para que el softmax no se desborde con lotes grandes, porque e elevado a logits altos pasa del rango de float32',
        'Para que los populares, que aparecen en muchos lotes como negativos, no queden castigados de más',
        'Para que el modelo aprenda la popularidad de cada ítem como un sesgo y el ranking no tenga que usarla'
      ],
      answer: 2,
      explain: 'Un ítem entra al lote cuando alguien lo toca, así que los populares hacen de negativos muchísimas veces. Restar ln p sube más a los raros y deja a los populares con menos peso como negativos (Yi et al., 2019). Vuelve a 45.3.' },
    { id: 'impresiones', type: 'single',
      prompt: 'Un equipo propone entrenar la recuperación solo con impresiones sin clic como negativos, "porque son negativos reales". ¿Qué pasa?',
      options: [
        'Funciona mejor que los negativos al azar, porque son ítems que la persona vio y eligió no tocar',
        'Funciona igual que los del lote, porque las impresiones ya incluyen los ítems populares de cada lote',
        'No se puede: las impresiones sin clic no quedan en el log, solo los clics, y habría que instrumentar la app',
        'El recall cae: lo mostrado ya pasó por el ranking, y la recuperación necesita ver también el catálogo que nunca se mostraría'
      ],
      answer: 3,
      explain: 'Facebook midió una caída absoluta de 55 % en el recall de su búsqueda de personas con impresiones sin clic como negativos, contra negativos al azar (Huang et al., 2020). Los negativos difíciles se agregan en dosis chicas. Vuelve a 45.3.' },
    { id: 'cuotas', type: 'multi',
      prompt: '¿Qué hace la mezcla de fuentes de candidatos de Mercado Barrio? Marca todas las correctas.',
      options: [
        'Le da a cada fuente un máximo de lugares de los 10 000',
        'Omite la fuente que no responde antes del deadline común',
        'Anota de qué fuentes vino cada candidato, como feature del ranking',
        'Espera a la fuente más lenta para no perder candidatos buenos',
        'Ordena los candidatos con el producto punto de las dos torres'
      ],
      answer: [0, 1, 2],
      explain: 'Cuotas, deadline común y origen como feature. Esperar a la lenta rompe el presupuesto, y ordenar es trabajo del ranking: la mezcla solo junta y quita repetidos. Vuelve a 45.4.' },
    { id: 'efsearch', type: 'single',
      prompt: 'En un HNSW ya construido, quieres más recall a costa de latencia sin reconstruir el índice. ¿Qué perilla mueves?',
      options: ['M', 'efConstruction', 'efSearch', 'nlist'],
      fixed: true, answer: 2,
      explain: 'efSearch se elige en cada consulta: cuántos candidatos mantiene la búsqueda en el piso 0. M y efConstruction se fijan al construir, y nlist es de IVF. Vuelve a 45.6.' },
    { id: 'memoria', type: 'single',
      prompt: '100 millones de vectores de 128 dimensiones, IVF con PQ de 64 bytes por código y un id de 8 bytes. ¿Cuánto ocupa el índice, sin contar los centroides?',
      options: ['6.4 GB', '7.2 GB', '51.2 GB', '76.8 GB'],
      fixed: true, answer: 1,
      explain: '100 000 000 × (64 + 8) B = 7.2 GB. 6.4 GB olvida los ids, 51.2 GB son los vectores en float32 sin comprimir y 76.8 GB es un HNSW con M = 32. Vuelve a 45.7.' },
    { id: 'filtro', type: 'single',
      prompt: 'Solo el 1 % del catálogo tiene stock en la ciudad de la persona. ¿Qué pasa si el índice busca 10 000 vecinos y el filtro va después?',
      options: [
        'Quedan unos 100 candidatos, y pedir 100 veces más vuelve a ser la búsqueda cara',
        'Quedan 10 000, porque el índice aproximado salta solo los ítems que no pasan el filtro',
        'Quedan unos 100, pero son los mismos que daría filtrar antes, así que no se pierde nada',
        'Quedan 10 000, porque la mezcla rellena lo que falta con candidatos de otras fuentes'
      ],
      answer: 0,
      explain: 'Filtrar después con un filtro del 1 % deja el 1 % de lo pedido. Un índice no salta lo que no pasa salvo que filtre durante la búsqueda. Lo práctico es particionar por lo estable (el país) y filtrar el resto. Vuelve a 45.8.' },
    { id: 'version', type: 'single',
      prompt: 'El lunes se reentrena el modelo de dos torres y se despliega la torre de usuario nueva; el índice se reconstruye el martes. ¿Qué pasa el lunes?',
      options: [
        'Nada grave: el índice viejo tiene menos frescura, pero los vectores son comparables entre versiones',
        'Los ítems nuevos del delta no aparecen hasta el martes, porque el delta se vacía con cada modelo',
        'La búsqueda tarda más, porque el grafo de HNSW se armó con distancias que ya no coinciden',
        'Las recomendaciones se vuelven ruido sin errores en los logs: los productos punto entre versiones no significan nada'
      ],
      answer: 3,
      explain: 'Cada entrenamiento ubica el espacio a su manera, así que la torre de usuario y el índice tienen que salir del mismo modelo. Se versionan juntos y se cambian como un par, con el índice nuevo construido al lado. Vuelve a 45.9.' }
  ]
});
