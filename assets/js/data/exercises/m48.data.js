SD.defineExercise('m48-pymk', {
  title: 'personas que quizás conozcas en Mercado Barrio',
  scenario: '<p>Mercado Barrio lanza contactos entre compradores. Hay <b>20 000 000 de personas activas</b> con <b>200 contactos de promedio</b>, y '
    + 'algunos vendedores tienen <b>1 000 000 de seguidores</b>. Producto quiere una lista de "personas que quizás conozcas" en la portada, con 10 sugerencias '
    + 'y menos de <b>100 ms</b> de respuesta. Confianza y seguridad pide que ninguna sugerencia revele algo de una tercera persona. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'etiqueta', type: 'single',
      prompt: '¿Qué predice el ranker?',
      options: [
        'Que la persona envía la invitación, porque es la acción que produce la sugerencia en pantalla',
        'Que la invitación se acepta, con "reporta" o "bloquea" como segunda tarea con peso negativo',
        'Que la persona mira el perfil, porque es la señal más rápida y con más volumen para empezar',
        'Que las dos personas compran algo juntas en un mes, porque es lo que le importa al negocio'
      ],
      answer: 1,
      explain: 'Aceptar crea la arista y es lo que la otra persona quería; el reporte frena lo que molesta. Enviar premia la curiosidad, mirar perfiles es aún más débil y comprar juntos es demasiado raro para aprender. Repasa 48.2 y 48.10.'
    },
    {
      id: 'fuentes', type: 'multi',
      prompt: '¿Qué fuentes de candidatos usas para una persona con contactos? Elige todas las que correspondan.',
      options: [
        'Amigos de amigos a dos saltos, con tope por amigo',
        'Unas caminatas de PageRank personalizado',
        'Los vendedores más seguidos del barrio',
        'Contactos subidos que también están en la plataforma'
      ],
      answer: [0, 1, 3],
      explain: 'Dos saltos es la fuente más fuerte, el PPR llega más lejos y desempata, y los contactos subidos encuentran a quien conoces fuera, con las reglas de 48.7. Los vendedores más seguidos son popularidad, no personas que conozcas. Repasa 48.4, 48.5 y 48.7.'
    },
    {
      id: 'tope', type: 'single', fixed: true,
      prompt: 'Una persona sigue a 2 vendedores de 1 000 000 de seguidores. Con un tope de 1 000 aristas por amigo, ¿cuántas aristas lee el segundo salto?',
      options: ['40 000', '41 600', '1 041 600', '2 039 600'],
      answer: 1,
      explain: '198 × 200 + 2 × 1 000 = 39 600 + 2 000 = 41 600. 2 039 600 es sin tope, 40 000 cuenta 200 amigos normales y 1 041 600 topa solo a uno de los dos vendedores. Repasa 48.4.'
    },
    {
      id: 'cuando', type: 'single',
      prompt: '¿Dónde corre el segundo salto?',
      options: [
        'En línea, en cada request, para que las sugerencias reflejen siempre el grafo de este momento',
        'Por lotes cada noche para todos, y en línea solo para las amistades nuevas del día',
        'Por lotes cada semana, porque el grafo social cambia poco y así se ahorra cómputo',
        'En línea con un caché de 24 horas por persona, calculado la primera vez que entra'
      ],
      answer: 1,
      explain: 'El lote nocturno mueve el costo fuera de la request (unos 7 minutos con 100 núcleos, con el costo supuesto); las amistades de hoy son pocas y baratas. En cada request no cabe en 100 ms para las personas con muchos contactos, una semana deja afuera las amistades nuevas y el caché perezoso hace lenta la primera visita. Repasa 48.10.'
    },
    {
      id: 'almacen', type: 'single',
      prompt: 'El grafo ocupa unos 64 GB guardado en las dos direcciones. ¿Dónde lo guardas?',
      options: [
        'En Neo4j, porque las consultas de dos saltos se escriben en Cypher y la base las resuelve',
        'En un KV durable con caché, partido por hash, y los candidatos del día en Redis',
        'Solo en Redis, con un conjunto por persona, porque 64 GB entran en memoria',
        'En el data warehouse, porque el lote nocturno lee de ahí y en línea no se necesita el grafo'
      ],
      answer: 1,
      explain: 'Las listas en un KV durable con caché escalan y se leen por id, como TAO; el lote hace los saltos, y Redis sirve lo precalculado. Neo4j cuesta llevarlo a tráfico en línea, Redis solo no es durable y en línea sí se necesita el grafo para las amistades de hoy y los bloqueos. Repasa 48.8.'
    },
    {
      id: 'reglas', type: 'multi',
      prompt: '¿Qué reglas van en la capa de filtros, antes del cupo? Elige todas las que correspondan.',
      options: [
        'Bloqueos en cualquiera de las dos direcciones',
        'No sugerir por una sola señal sensible, como un contacto o un lugar',
        'No mostrar a un menor a adultos sin amigos en común',
        'Bajar a quien tiene poca probabilidad de aceptar'
      ],
      answer: [0, 1, 2],
      explain: 'Las tres primeras se cumplen siempre y no las decide el modelo. Bajar a quien probablemente no acepte es el trabajo del ranker, no una regla. Repasa 48.11.'
    },
    {
      id: 'medir', type: 'single',
      prompt: 'Un ranker nuevo sube las aceptaciones un 8&#8239;% y los reportes por cada mil sugerencias un 30&#8239;%. ¿Qué haces?',
      options: [
        'Lanzarlo: las aceptaciones son la métrica principal y los reportes siguen siendo pocos en total',
        'No lanzarlo: la métrica de daño tiene un límite, y buscar qué segmento sube los reportes',
        'Lanzarlo con un cupo más chico, para que el total de reportes quede igual que antes',
        'Lanzarlo y mirar los reportes en un mes, porque pueden ser personas que se acostumbran'
      ],
      answer: 1,
      explain: 'La métrica de daño es un límite, no un número a compensar: un 30&#8239;% más de reportes son personas molestas o expuestas. Achicar el cupo esconde la tasa, y esperar un mes deja el daño en producción. Repasa 48.11.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Etiqueta:</b> invitación aceptada, con reporte y bloqueo como tareas negativas en un ranker multi-tarea.</li>'
    + '<li><b>Fuentes:</b> dos saltos con tope de 1 000 aristas por amigo, unas caminatas de PPR por persona y contactos subidos con sus reglas.</li>'
    + '<li><b>Cuándo:</b> el segundo salto por lotes cada noche (unas 8 × 10¹¹ lecturas), y en línea solo las amistades del día.</li>'
    + '<li><b>Dónde:</b> las listas en un KV durable con caché, partido por hash; 100 candidatos por persona en Redis, unos 24 GB.</li>'
    + '<li><b>Reglas:</b> bloqueos en las dos direcciones, nada por una sola señal sensible, menores protegidos, rechazados fuera por seis meses, y explicaciones que respetan la privacidad de la lista de amigos.</li>'
    + '<li><b>Medir:</b> aceptadas por cada mil sugerencias, con reportes y bloqueos por cada mil como límite que frena un lanzamiento.</li>'
    + '</ul>'
});
