SD.defineExercise('m44-comprados', {
  title: 'el modelo de "comprados juntos"',
  scenario: '<p>En M43 diseñaste el registro de la fila <b>"comprados juntos"</b> de la página de producto de Mercado Barrio: 4 productos en un carrusel, '
    + 'unas <b>60 millones de aperturas por día</b>. Ahora toca elegir el modelo. El catálogo tiene <b>100 millones de ítems</b>, hay <b>50 millones de personas</b> '
    + 'registradas y unas <b>10 000 millones de interacciones fuertes</b> por año. La fila tiene que salir en menos de <b>25 ms</b> de la recuperación. '
    + 'Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'familia', type: 'single',
      prompt: '¿Qué familia de modelos usas para "comprados juntos"?',
      options: [
        'Contenido: productos con título y categoría parecidos al que se está mirando',
        'Ítem a ítem sobre las compras: el coseno entre columnas de la matriz',
        'Usuario a usuario: lo que compraron las personas parecidas a quien mira',
        'Popularidad por categoría: lo más vendido de la categoría del producto'
      ],
      answer: 1,
      explain: '"Comprados juntos" es una relación de comportamiento: la botella que se compra con la zapatilla no se parece a la zapatilla en el texto. Ítem a ítem la encuentra y se explica sola. Usuario a usuario es caro e inestable, y la popularidad no depende del producto que se mira. Repasa 44.4 y 44.5.'
    },
    {
      id: 'cuando', type: 'single',
      prompt: '¿Cuándo se calculan los vecinos de cada producto?',
      options: [
        'En cada request, con el coseno entre la columna del producto y el resto',
        'Una vez por semana, porque las compras de un día casi no cambian el resultado',
        'De noche, en un job que guarda los vecinos; la request los lee por clave',
        'Al publicar cada producto, una sola vez, con las compras que tenga ese día'
      ],
      answer: 2,
      explain: 'Comparar una columna con 100 millones de columnas en 25 ms no entra. El job nocturno cuenta pares dentro de cada historia y deja una tabla que se lee con una clave. Una vez por semana deja afuera lo de los últimos días, y al publicar el producto todavía no tiene compras. Repasa 44.4 y la figura 44.7.'
    },
    {
      id: 'tabla', type: 'single', fixed: true,
      prompt: 'Guardas 50 vecinos por producto, cada uno con un id de 8 B y un puntaje de 4 B. ¿Cuánto ocupa la tabla?',
      options: ['6 GB', '40 GB', '60 GB', '600 GB'],
      answer: 2,
      explain: '100 000 000 × 50 × 12 B = 60 GB. 40 GB olvida el puntaje; 600 GB guarda 500 vecinos. Entra en un clúster chico de Redis. Repasa 44.4.'
    },
    {
      id: 'pilas', type: 'single',
      prompt: 'Las pilas aparecen en casi todos los pedidos. ¿Cómo evitas que salgan como "comprados juntos" de todo?',
      options: [
        'Contar co-compras crudas y sacar a mano los productos que no deberían salir en ninguna fila',
        'Usar el coseno: la columna de las pilas es larga y su parecido con cada ítem baja',
        'Mostrar solo productos de la misma categoría que el que se está mirando',
        'Descartar los pedidos de más de dos productos, que mezclan cosas sin relación'
      ],
      answer: 1,
      explain: 'Contadas crudas, las pilas comparten compradores con todo. El coseno divide por la raíz de las compras de cada ítem, y lo que compra todo el mundo queda abajo. Filtrar por categoría pierde los complementos, que es justo lo que se busca, y sacar a mano no escala. Repasa 44.4.'
    },
    {
      id: 'minimo', type: 'single',
      prompt: 'Dos productos raros los compró la misma persona, una sola vez. Su coseno da 1. ¿Qué haces?',
      options: [
        'Nada: un coseno de 1 es el parecido más alto posible y merece estar primero',
        'Pedir al menos 3 compradores en común, o correr el coseno hacia 0 con un prior',
        'Descartar los productos con menos de mil ventas, porque son ruido del catálogo',
        'Duplicar el peso de esas compras, para que los productos raros tengan más datos'
      ],
      answer: 1,
      explain: 'Un coseno de 1 con un solo comprador en común es ruido. Exigir un mínimo de compradores en común, o encoger el puntaje como el promedio bayesiano de 44.1, deja los pares con evidencia. Descartar todo lo que vende poco deja afuera la cola larga entera. Repasa 44.1 y 44.4.'
    },
    {
      id: 'ventana', type: 'single',
      prompt: '¿Qué pares de compras cuentas como "comprados juntos"?',
      options: [
        'Cualquier par en la historia completa de cada persona, desde que se registró',
        'Solo productos del mismo pedido, porque es lo único que es comprar a la vez',
        'Pares dentro de una ventana corta, por ejemplo la misma sesión o pocos días',
        'Pares de vistas en lugar de compras, porque hay muchas más y el job es más preciso'
      ],
      answer: 2,
      explain: 'Dos compras separadas por un año casi no se relacionan, y el mismo pedido es demasiado estricto: la funda del teléfono se suele comprar unos días después. Una ventana corta junta lo que se compra para lo mismo. Las vistas sirven para "vistos juntos", que es otra fila. Repasa 44.4.'
    },
    {
      id: 'nuevo', type: 'single',
      prompt: 'Un producto publicado hoy no tiene compras. ¿Qué muestra su fila "comprados juntos"?',
      options: [
        'Nada hasta que tenga compras, porque cualquier otra cosa sería inventar la relación',
        'Los vecinos de un producto parecido por contenido, con un rótulo como "relacionados"',
        'Productos al azar del catálogo, para que la fila no quede vacía en la página del producto nuevo',
        'Los vecinos que da la factorización, que ya tiene un vector para cada producto'
      ],
      answer: 1,
      explain: 'Es el arranque en frío del ítem. El embedding del título y la foto encuentra un producto parecido con historia, y sus vecinos son una buena aproximación; conviene cambiar el rótulo, porque todavía no son comprados juntos. La factorización tampoco conoce el ítem nuevo. Repasa 44.2 y 44.9.'
    },
    {
      id: 'medir', type: 'single',
      prompt: '¿Cómo decides si el ítem a ítem es mejor que la fila actual, que muestra lo más vendido de la categoría?',
      options: [
        'Con el coseno promedio de los vecinos mostrados, que mide cuánto se parecen',
        'Con un experimento contra la fila actual, midiendo la métrica norte y las de protección',
        'Comparando el error RMSE de los dos modelos sobre las compras de la semana pasada',
        'Preguntando a un grupo de vendedores qué fila les parece más útil para sus productos'
      ],
      answer: 1,
      explain: 'La línea base de M42 se vence con un experimento y con la métrica que importa para el negocio, mirando también las de protección. El coseno promedio mide al modelo contra sí mismo, y el RMSE mide calificaciones, no si la gente compra. Los experimentos son M49. Repasa 44.10 y M42.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Modelo:</b> ítem a ítem con coseno sobre compras y carritos dentro de una ventana corta, con un mínimo de 3 compradores en común.</li>'
    + '<li><b>Cálculo:</b> un job nocturno que cuenta pares dentro de cada historia, recortada a los últimos 100 ítems, y deja 50 vecinos por producto: 60 GB en un key-value store.</li>'
    + '<li><b>Servir:</b> una lectura por clave con el id del producto, filtros de stock y de ya comprado, y los 4 primeros al carrusel.</li>'
    + '<li><b>Arranque en frío:</b> para un producto sin compras, los vecinos de su producto más parecido por embedding, con el rótulo "relacionados".</li>'
    + '<li><b>Medición:</b> un experimento contra lo más vendido de la categoría, con la métrica norte de M42 y sus métricas de protección.</li>'
    + '</ul>'
});
