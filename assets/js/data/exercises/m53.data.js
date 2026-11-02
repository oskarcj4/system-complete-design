SD.defineExercise('m53-catalogo', {
  title: 'las recomendaciones de una ferretería en línea',
  scenario: '<p>Una ferretería en línea tiene 80 000 productos, 300 000 sesiones por día, un 4&#8239;% de conversión y un 70&#8239;% de visitantes sin cuenta. Hoy la página de producto muestra "lo más vendido de la categoría" en todos los productos. '
    + 'Te piden recomendaciones en la página de producto y en el carrito, con un equipo de dos personas y tres meses. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'primero', type: 'single',
      prompt: '¿Qué construyes primero?',
      options: [
        'Comprados juntos con co-ocurrencia y lift, calculado cada noche',
        'Un modelo de dos torres con embeddings de texto e imagen de los 80 000 productos',
        'Un GRU4Rec para los visitantes sin cuenta, que son la mayoría de las sesiones',
        'Un ranker de árboles para la página de producto con p(compra) en 7 días'
      ],
      answer: 0,
      explain: 'Con 12 000 pedidos por día (300 000 × 4&#8239;%) hay datos para co-ocurrencia desde el primer mes, es barato y se explica. Lo demás se compara contra esto después. Repasa 53.4 y 53.10.'
    },
    {
      id: 'pedidos', type: 'single',
      prompt: '¿Cuántos pedidos por año tiene la ferretería para contar pares?',
      options: ['438 000', '4.38 M', '43.8 M', '120 M'],
      answer: 1,
      explain: '300 000 × 0.04 = 12 000 por día; × 365 = 4.38 M. Es la décima parte de Almacén Sur: alcanza para los productos que se venden, no para la cola larga. Repasa 53.1.'
    },
    {
      id: 'tornillos', type: 'single',
      prompt: 'Los tornillos están en el 30&#8239;% de los pedidos y salen como complemento de todo. ¿Qué haces?',
      options: [
        'Ordenas por lift en lugar de conteo, con soporte mínimo y encogimiento',
        'Los sacas a mano de la tabla con una lista de productos prohibidos que mantiene el equipo',
        'Subes el tope por pedido de 50 a 500 productos para tener más pares de cada producto',
        'Bajas el soporte mínimo a 1 para que los productos raros compitan con los tornillos'
      ],
      answer: 0,
      explain: 'El lift compara contra lo esperado: un producto que está en todo tiene un esperado alto. Una lista a mano no escala y se olvida. Repasa 53.4.'
    },
    {
      id: 'anonimos', type: 'single',
      prompt: 'El 70&#8239;% de las sesiones no tiene cuenta. ¿Qué haces para ellas en la página de producto?',
      options: [
        'Nada distinto: comprados juntos depende del producto, no de la persona',
        'Les pides que creen una cuenta antes de ver recomendaciones, porque sin historia no hay nada que personalizar',
        'Les muestras lo más vendido de la categoría, como hoy',
        'Esperas a tener un modelo de secuencias antes de mostrarles nada'
      ],
      answer: 0,
      explain: 'La página de producto parte de un producto: la tabla sirve igual con o sin cuenta. La sesión importa en el inicio, no acá. Repasa 53.2 y 53.7.'
    },
    {
      id: 'carrito', type: 'single',
      prompt: 'En el carrito hay un taladro y brocas. ¿Cómo armas sus recomendaciones?',
      options: [
        'Unes los comprados juntos de los dos, sumas puntajes, quitas lo que ya está y los sustitutos',
        'Usas solo los comprados juntos del producto más caro del carrito, que es el que define la compra y el margen del pedido',
        'Muestras lo más vendido de la tienda, porque en el carrito ya decidió',
        'Usas los vistos juntos del taladro, para ofrecer otro taladro mejor'
      ],
      answer: 0,
      explain: 'El carrito pregunta "¿qué te falta?": complementos de todo lo que lleva, sin repetir ni reemplazar. Otro taladro en el carrito compite con la compra. Repasa 53.2.'
    },
    {
      id: 'medir', type: 'multi',
      prompt: '¿Cómo decides si lanzarlo? Elige todas las que correspondan.',
      options: [
        'Un A/B contra "lo más vendido de la categoría", con ingresos por sesión',
        'La conversión y la tasa de devoluciones como métricas de protección',
        'CUPED con el gasto de las semanas anteriores para acortar el experimento',
        'El recall en 20 offline: si sube, se lanza sin A/B'
      ],
      answer: [0, 1, 2],
      explain: 'Offline sirve para descartar, no para lanzar. Con 300 000 sesiones por día, la varianza de los ingresos hace que CUPED valga la pena. Repasa 53.11.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Primero:</b> comprados juntos con co-ocurrencia y lift, en un lote nocturno, contra la línea base de lo más vendido.</li>'
    + '<li><b>Datos:</b> 4.38 M pedidos por año; soporte mínimo y encogimiento para la cola larga.</li>'
    + '<li><b>Tornillos:</b> los resuelve el lift.</li>'
    + '<li><b>Sin cuenta:</b> la página de producto no los distingue.</li>'
    + '<li><b>Carrito:</b> unión de complementos, sin lo que ya está ni sustitutos.</li>'
    + '<li><b>Medición:</b> A/B con ingresos por sesión, conversión y devoluciones como protección, CUPED.</li>'
    + '</ul>'
});
