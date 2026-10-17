SD.defineQuiz('m42', {
  title: 'Quiz: el método de ML System Design',
  pass: 0.7,
  questions: [
    {
      id: 'bucle', type: 'single',
      prompt: '¿Qué tiene un recomendador que no tiene un servicio de software clásico?',
      options: [
        'Aprende de las reacciones a lo que él mismo mostró, y eso cambia sus propios datos',
        'Necesita GPUs para cada request, porque ningún modelo de ranking se puede servir en CPU',
        'No puede tener un SLO de latencia, porque el tiempo de un modelo no se puede acotar',
        'Su código cambia con cada reentrenamiento, así que cada versión del modelo es un deploy nuevo del servicio'
      ],
      answer: 0,
      explain: 'El bucle de la figura 42.1: lo que se muestra genera los datos de la próxima versión, y lo que nunca se mostró no tiene datos. El código puede no cambiar al reentrenar, hay modelos que corren en CPU y el embudo existe justamente para cumplir un presupuesto de latencia. Repasa 42.1.'
    },
    {
      id: 'embudo', type: 'single',
      prompt: 'Con 0.1 ms por ítem, el ranking pesado tardaría unas tres horas sobre los 100 millones de ítems de Mercado Barrio. ¿Qué resuelve ese problema?',
      options: [
        'Un caché de la lista final por usuario, que evita volver a puntuar el catálogo en cada request',
        'Un embudo: una recuperación barata deja miles de candidatos y el modelo pesado solo ve unos cientos',
        'Repartir el catálogo entre 10 000 réplicas, para que cada una puntúe 10 000 ítems en un segundo',
        'Bajar la precisión del modelo a 8 bits, que divide el tiempo por ítem lo suficiente para recorrerlo todo'
      ],
      answer: 1,
      explain: '100 000 000 × 0.1 ms = 10 000 s. Ni con 8 bits ni con un caché se baja eso a 200 ms: el caché no sirve para el primer pedido ni cuando cambia el contexto, y 10 000 réplicas por request no se pagan. Cada etapa del embudo ve menos ítems y gasta más por ítem. Repasa 42.2 y 42.7.'
    },
    {
      id: 'etiqueta', type: 'single',
      prompt: 'El equipo elige como etiqueta "compró en los 7 días siguientes a la impresión". ¿Qué problema trae esa elección?',
      options: [
        'Tiene demasiados positivos, así que el modelo aprende a recomendar todo y no distingue entre ítems',
        'No se puede medir en un A/B, porque las compras ocurren fuera de la app y no tienen el id de la variante',
        'Las impresiones de la última semana aún no tienen etiqueta, y contarlas como negativas es un error',
        'Mezcla feedback explícito con implícito, y el modelo no puede aprender de las dos señales a la vez'
      ],
      answer: 2,
      explain: 'Una etiqueta cercana al negocio tarda en conocerse: la impresión del 1 de marzo recién se puede etiquetar el 8. Comprar es raro, así que hay pocos positivos, no muchos, y es feedback implícito. Cómo se tratan los positivos que llegan tarde va en M43. Repasa 42.4.'
    },
    {
      id: 'niveles', type: 'single',
      prompt: '¿Cuál de estas es una métrica de protección en el feed de Mercado Barrio?',
      options: [
        'Compras por usuario en 28 días, porque el cambio no puede salir si el negocio no mejora',
        'La tasa de clics, porque si baja el feed perdió interés y hay que volver atrás',
        'Las compras a 7 días, porque protegen al experimento del ruido que tiene la métrica norte',
        'La latencia p99, que no se intenta mejorar con el ranking pero no puede pasar su tope'
      ],
      answer: 3,
      explain: 'Las de protección no se intentan subir: se acuerda cuánto pueden empeorar. Compras a 28 días es la métrica norte; el CTR y las compras a 7 días son proxies. Repasa 42.5 y la figura 42.4.'
    },
    {
      id: 'goodhart', type: 'single',
      prompt: 'Un modelo nuevo sube la tasa de clics un 9&#8239;% en el A/B, y el tiempo visto y las compras bajan. ¿Qué explica mejor el resultado?',
      options: [
        'El modelo aprendió a conseguir clics con títulos que atraen y no cumplen: Goodhart',
        'El experimento tiene pocos usuarios, y con más días las compras van a subir junto con la tasa de clics',
        'El tiempo visto baja porque hay más clics: cada visita se reparte entre más ítems y eso es esperable',
        'La tasa de clics se calculó sin impresiones, así que el 9&#8239;% es un error de medición y no un cambio real'
      ],
      answer: 0,
      explain: 'Cuando una medida se convierte en objetivo deja de ser buena medida. YouTube documentó en 2016 que ordenar por CTR promueve videos engañosos que la gente no termina. Sin impresiones no hay CTR, así que la medición existe; y repartir las visitas no explica que bajen las compras. Repasa 42.5.'
    },
    {
      id: 'feedback', type: 'multi',
      prompt: '¿Qué afirmaciones sobre el feedback implícito son correctas? Marca todas las que correspondan.',
      options: [
        'Hay mucho más que explícito, porque cada visita deja clics, tiempos y compras',
        'Un clic dice que algo llamó la atención, no que haya gustado',
        'Que alguien no toque un ítem prueba que ese ítem no le interesa',
        'Solo existe cuando la persona usa una escala, como estrellas o un me gusta'
      ],
      answer: [0, 1],
      explain: 'El implícito es lo que la persona hace: abunda y es ambiguo. No tocar algo puede ser que no lo vio o que estaba más abajo en la lista (el sesgo de posición de M43). Las escalas son feedback explícito. Repasa la figura 42.3.'
    },
    {
      id: 'sinml', type: 'single',
      prompt: 'Una tienda nueva tiene 300 productos y 2 000 clientes, y quiere "recomendaciones personalizadas". ¿Qué le propones primero?',
      options: [
        'Un modelo de factorización de matrices, que funciona bien con pocos datos porque comprime la matriz',
        'Un two-tower preentrenado con otro catálogo, para no esperar a tener datos propios',
        'Una portada curada y lo popular por categoría, medidos, registrando impresiones y compras',
        'No mostrar recomendaciones hasta tener un millón de eventos, para que el primer modelo salga bien'
      ],
      answer: 2,
      explain: 'Con 300 ítems se recorren de un vistazo y hay pocos datos de interacción: es la primera caja de la figura 42.6. La línea base medida es el número que cualquier modelo futuro tiene que superar, y los datos que se registran hoy son los que lo van a entrenar. Repasa 42.6.'
    },
    {
      id: 'cuenta', type: 'single',
      prompt: 'Mercado Barrio llega a 13 889 requests por segundo en el pico. Si el ranking pesado recibe 500 candidatos por request, ¿cuántas puntuaciones por segundo hace?',
      options: ['Unas 694 000', 'Unas 6.9 millones', 'Unas 69 millones', 'Unas 125 millones'],
      fixed: true,
      answer: 1,
      explain: '13 889 × 500 = 6 944 444, unas 6.9 millones. 125 millones es el ranking liviano, que puntúa 9 000 candidatos por request. Repasa la tabla de 42.7.'
    },
    {
      id: 'tamano', type: 'single',
      prompt: 'Alguien propone sacar el ranking liviano y pasar los 9 000 candidatos filtrados directo al pesado, "porque acierta más". Con los supuestos de 42.7, ¿qué pasa?',
      options: [
        'Nada grave: el pesado agrega unos 50 ms y la request sigue entrando en los 200 ms del presupuesto',
        'La request tarda unos 900 ms solo en el pesado y se pasa del presupuesto más de cuatro veces',
        'La latencia no cambia porque el pesado procesa en lotes, pero el costo de GPU se multiplica por 18',
        'El recall baja, porque el pesado está entrenado con 500 candidatos y no sabe ordenar 9 000'
      ],
      answer: 1,
      explain: '9 000 × 0.1 ms = 900 ms, contra un presupuesto de 200. El batching ya está dentro de los 0.1 ms por ítem, así que no lo salva, y el recall depende de la recuperación, no del ranking. Es la configuración "Sin ranking liviano" del widget. Repasa 42.7.'
    },
    {
      id: 'orden', type: 'order',
      prompt: 'Ordena los primeros pasos para razonar el diseño de un recomendador.',
      items: ['Aclarar la superficie, la escala y qué es éxito', 'Elegir la métrica norte, las proxies, las de protección y la etiqueta', 'Revisar qué datos existen y cuáles faltan', 'Medir una línea base', 'Dibujar el embudo con sus números', 'Elegir los modelos de cada etapa'],
      explain: 'Los cuatro primeros pasos no tienen ningún modelo. Empezar por "uso un two-tower" es diseñar sin saber qué se optimiza ni contra qué se compara. Repasa 42.10 y la figura 42.9.'
    }
  ]
});
