SD.defineExercise('m43-eventos', {
  title: 'el registro de "comprados juntos"',
  scenario: '<p>Mercado Barrio va a poner en la página de cada producto una fila <b>"comprados juntos"</b>: 4 productos que suelen comprarse con el que '
    + 'estás mirando, en un carrusel que se desliza de costado. La página de producto se abre unas <b>60 millones de veces por día</b> y la fila '
    + 'queda abajo, después de las fotos y la descripción. Antes de cualquier modelo, vas a diseñar qué se registra y cómo se vuelve un ejemplo '
    + 'de entrenamiento, decisión por decisión.</p>',
  steps: [
    {
      id: 'impresion', type: 'single',
      prompt: '¿Qué registra la API cuando sirve la fila?',
      options: [
        'Una impresión por producto sugerido, con request_id, producto de la página, posición, modelo y variante',
        'Un solo evento por request con la lista de los 4 productos, para no multiplicar el volumen por cuatro',
        'Nada: alcanza con que la app registre los clics, porque la lista se puede recalcular con el modelo'
      ],
      answer: 0,
      explain: 'Cada producto sugerido es un ejemplo distinto y necesita su posición. Un evento con la lista se puede guardar, pero el generador de ejemplos igual tiene que expandirlo, y es fácil perder la posición. Recalcular la lista no sirve: el modelo cambia, el catálogo cambia y la variante del experimento no se recupera. Repasa 43.1.'
    },
    {
      id: 'visto', type: 'single',
      prompt: 'La fila está abajo de la página y mucha gente no llega. ¿Cómo separas lo servido de lo visto?',
      options: [
        'Contar como vista toda la fila servida, porque la persona pudo bajar a mirarla si quería',
        'Que la app mande el tiempo en pantalla de cada producto, con una regla única de qué es visto',
        'Contar como visto solo lo que recibió un clic, porque es la única prueba de que alguien miró'
      ],
      answer: 1,
      explain: 'Si todo lo servido cuenta como visto, la fila aprende que nada gusta, porque la mayoría no la vio. Si solo lo clicado es visto, no hay negativos. El tiempo en pantalla con una sola regla (por ejemplo, la mitad del producto visible durante un segundo) en iOS, Android y la web es lo que funciona. En un carrusel, los productos 3 y 4 pueden no verse nunca. Repasa 43.1 y 43.4.'
    },
    {
      id: 'etiqueta', type: 'single',
      prompt: '¿Qué es un positivo para un producto sugerido?',
      options: [
        'Un clic en el producto sugerido, porque es la señal que llega en segundos y hay de sobra',
        'Que aparezca en cualquier compra de la persona en los 30 días siguientes',
        'Que se compre en la misma orden que el producto de la página, atado a su request_id'
      ],
      answer: 2,
      explain: 'La superficie promete "comprados juntos": el positivo es que se compren juntos. Un clic es curiosidad. Cualquier compra en 30 días mezcla lo que la fila sugirió con lo que la persona iba a comprar igual. Atar la compra al request_id dice qué impresión la produjo. Repasa 43.1.'
    },
    {
      id: 'carrito', type: 'single',
      prompt: 'La persona agrega el producto sugerido al carrito y paga dos días después desde la web. ¿Cómo llega el request_id a la compra?',
      options: [
        'Buscando en el data lake la última impresión de ese producto para esa persona, en el lote nocturno',
        'Guardándolo en la línea del carrito al agregar el producto, para que viaje hasta la orden',
        'No hace falta: la compra se atribuye a la fila si el producto se mostró en las últimas 48 horas'
      ],
      answer: 1,
      explain: 'El id tiene que viajar con la acción: la línea del carrito lo guarda y la orden lo hereda, en cualquier dispositivo. Buscar la última impresión adivina, y falla cuando el producto se mostró en dos superficies. Una ventana de atribución por tiempo le regala a la fila compras que no produjo. Repasa 43.1.'
    },
    {
      id: 'reintento', type: 'single',
      prompt: 'En la red móvil, cerca del 1&#8239;% de los lotes de eventos llega dos veces. ¿Dónde se resuelve?',
      options: [
        'En la API de eventos, consultando una base antes de publicar cada evento en Kafka',
        'En la app, que espera la confirmación antes de mandar el lote siguiente y nunca reintenta',
        'En el procesador, por event_id, con ventana corta y una dedupe completa en el lote'
      ],
      answer: 2,
      explain: 'La API tiene que responder rápido; si consulta una base por evento, una base lenta frena a la app. La app no puede dejar de reintentar: si la respuesta se pierde, no sabe si llegó. El procesador descarta por event_id en una ventana de horas, y el lote nocturno, que lee el día entero, atrapa los tardíos. Repasa 43.2.'
    },
    {
      id: 'feature', type: 'single',
      prompt: 'Quieres la feature "veces que A y B se compraron juntos en 30 días". ¿Con qué valor entra cada ejemplo de entrenamiento?',
      options: [
        'Con el valor del último día del período de entrenamiento, que es el más completo que hay',
        'Con el valor al instante de la impresión, el último anterior, tomado del feature store offline',
        'Con el valor de hoy, leído del feature store online, para que sea igual al que se sirve'
      ],
      answer: 1,
      explain: 'El valor del último día y el de hoy incluyen las compras que produjo la propia impresión: es una fuga del futuro, y la feature va a parecer mucho más útil de lo que es. El point-in-time join toma el último valor anterior a cada impresión. Repasa 43.8.'
    },
    {
      id: 'skew', type: 'single',
      prompt: 'El conteo en lote excluye las órdenes canceladas; el contador en streaming las suma al llegar y nunca las resta. ¿Qué haces?',
      options: [
        'Nada, porque las cancelaciones son pocas y el modelo las compensa',
        'Entrenar con el contador de streaming también, para que el entrenamiento vea los mismos errores',
        'Una sola definición en el feature store para los dos lados, o entrenar con lo servido'
      ],
      answer: 2,
      explain: 'Son dos cálculos de la misma feature: training-serving skew. El modelo no compensa algo que nunca vio. Entrenar con el contador de streaming solo sirve si se toma del log de lo servido, que es una de las dos defensas. Repasa 43.6 y 43.7.'
    },
    {
      id: 'posicion', type: 'single',
      prompt: 'En el carrusel, el producto 1 tiene cuatro veces el CTR del producto 4. ¿Cómo sabes cuánto es posición y cuánto es el producto?',
      options: [
        'Intercambiando al azar posiciones vecinas en poco tráfico, y registrando la posición',
        'Asumiendo que la caída es la misma que en el feed, porque los usuarios miran las listas igual',
        'Mostrando siempre los 4 productos en orden aleatorio, para todos'
      ],
      answer: 0,
      explain: 'La curva de posición depende de la superficie: un carrusel horizontal no se mira como un feed vertical. Aleatorizar todo el tráfico la mide, pero empeora la fila para todos. Intercambios suaves en, por ejemplo, un 1&#8239;% del tráfico la miden barato, y con ella se pesa cada clic. Repasa 43.9.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Impresiones:</b> una por producto sugerido, con request_id, producto de la página, posición, modelo, variante y served_at en UTC.</li>'
    + '<li><b>Visto:</b> la app manda viewed_ms con una regla única para todos los clientes; lo servido y no visto queda sin etiqueta.</li>'
    + '<li><b>Positivo:</b> el producto sugerido se compra en la misma orden que el de la página, atado por request_id.</li>'
    + '<li><b>Atribución:</b> el request_id se guarda en la línea del carrito y la orden lo hereda.</li>'
    + '<li><b>Duplicados:</b> event_id generado en la app, dedupe en el procesador con ventana corta y dedupe completa en el lote.</li>'
    + '<li><b>Features:</b> conteos de compras conjuntas con una sola definición en el feature store y point-in-time join al entrenar.</li>'
    + '<li><b>Sesgo de posición:</b> intercambios suaves en una fracción chica del tráfico para estimar la curva del carrusel.</li>'
    + '</ul>'
});
