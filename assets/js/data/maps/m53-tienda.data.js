/* Mapa del M53: las recomendaciones de una tienda en línea, "Almacén Sur". Es un diseño de referencia armado con lo
   que publicaron Amazon (Linden, Smith y York 2003; Smith y Linden 2017), Hidasi y colaboradores (GRU4Rec, 2016) y
   lo visto en M42 a M50. Se lee de arriba abajo: personas, entrada, una request, tablas e índices, y el lote nocturno. */
SD.defineMap('m53-tienda', {
  title: 'Almacén Sur: recomendar productos',
  intro: 'Las recomendaciones de una tienda en línea con 2 millones de productos y 3 millones de personas activas por día. Arriba, quien compra, quien mira sin cuenta y quien vende; en el medio, la request con sus etapas; abajo, las tablas que se calculan cada noche. Elige un escenario para ver un viaje paso a paso, o toca una pieza para ver sus cinco pestañas.',
  start: 'api',
  stepPanel: true,
  pieces: true,
  groups: [
    { id: 'g-per', label: 'Personas', x: 20, y: 54, w: 1850, h: 110 },
    { id: 'g-ent', label: 'Entrada', x: 20, y: 264, w: 1850, h: 110 },
    { id: 'g-req', label: 'Una request: 150 ms', x: 20, y: 474, w: 1850, h: 110 },
    { id: 'g-idx', label: 'Tablas, índices, features y el log', x: 20, y: 684, w: 1850, h: 110 },
    { id: 'g-lot', label: 'El lote de cada noche', x: 20, y: 894, w: 1850, h: 110 }
  ],
  nodes: [
    /* ---------- Personas ---------- */
    { id: 'anon', layer: 'client', label: 'Visitante sin cuenta', sub: 'mira tres carpas', x: 160, y: 120,
      brief: 'Alguien que entra desde un buscador, sin sesión iniciada: solo se sabe lo que hace ahora.',
      info: {
        resp: '<p>Llega desde un buscador a una carpa, mira otras dos y se va o compra. El 40&#8239;% de las sesiones de Almacén Sur son así.</p>',
        api: '<pre><code>GET  /v1/recs/session?sid=s_9&amp;n=12\nPOST /v1/events</code></pre>',
        data: '<p>Una cookie con un id de sesión aleatorio, sin datos personales. La sesión dura 30 minutos sin actividad.</p>',
        fail: '<ul><li><b>Bloquea cookies:</b> recibe lo popular de la categoría que mira, sin sesión.</li></ul>',
        nums: '<ul><li>40&#8239;% de 4 millones de sesiones por día: 1.6 millones de sesiones anónimas.</li></ul>'
      } },
    { id: 'sofia', layer: 'client', label: 'Sofía', sub: 'compra con su cuenta', x: 540, y: 120,
      brief: 'Clienta con historia: dos años de compras, vistas y búsquedas.',
      info: {
        resp: '<p>Abre la tienda, mira la página de una carpa, agrega una bolsa de dormir al carrito y paga.</p>',
        api: '<pre><code>GET  /v1/recs/home?n=24\nGET  /v1/recs/product/p_carpa?n=8\nGET  /v1/recs/cart\nPOST /v1/events</code></pre>',
        data: '<p>Nada que el recomendador necesite: la historia vive en el servidor.</p>',
        fail: '<ul><li><b>Sin red:</b> la app muestra lo último que cargó.</li></ul>',
        nums: '<ul><li>Una persona activa promedio abre el inicio 2 veces por día y mira 6 páginas de producto por sesión.</li></ul>'
      } },
    { id: 'vendedor', layer: 'client', label: 'Vendedores', sub: 'publican y actualizan stock', x: 1680, y: 120,
      brief: 'Las 1 500 tiendas que venden en Almacén Sur: suben productos, precios y stock.',
      info: {
        resp: '<p>Publican productos y actualizan precio y stock, a mano o con una integración que llama a la API cada pocos minutos.</p>',
        api: '<pre><code>PUT /v1/sellers/s_12/items/p_carpa\n{ "price": 89.90, "stock": 0 }</code></pre>',
        data: '<p>Su catálogo vive en el servicio de catálogo.</p>',
        fail: '<ul><li><b>Integración rota:</b> el stock queda viejo; por eso se vuelve a comprobar al pagar.</li></ul>',
        nums: '<ul><li>1 500 vendedores, 2 millones de productos activos.</li><li>Unas 300 000 actualizaciones de stock o precio por día.</li></ul>'
      } },

    /* ---------- Entrada ---------- */
    { id: 'api', layer: 'service', label: 'API de recomendaciones', sub: 'una ruta por superficie', x: 540, y: 330,
      brief: 'Recibe el pedido de cada superficie (inicio, producto, carrito) y arma la respuesta con un presupuesto de 150 ms.',
      why: '<p>Cada superficie pide algo distinto: la página de producto quiere complementos, el inicio quiere variedad. Una ruta por superficie deja que cada una tenga su algoritmo y su respaldo.</p>',
      info: {
        resp: '<p>Para el inicio, orquesta candidatos, ranking y re-ranking. Para la página de producto, lee las tablas ítem a ítem y filtra. Siempre devuelve algo: si una pieza falla, lo popular de la categoría.</p>',
        api: '<pre><code>GET /v1/recs/home?n=24\nGET /v1/recs/product/{id}?n=8\nGET /v1/recs/session?sid=…</code></pre>',
        data: '<p>Sin estado propio.</p>',
        fail: '<ul><li><b>Una pieza lenta:</b> corta con su timeout y usa el respaldo de esa superficie, marcado como degradado.</li></ul>',
        nums: '<ul><li>Pico de 833 requests por segundo en páginas de producto y 208 en el inicio.</li></ul>'
      } },
    { id: 'eventos', layer: 'edge', label: 'Ingesta de eventos', sub: 'vistas, carrito, compras', x: 920, y: 330,
      brief: 'Recibe lo que hace cada persona y cada impresión que mostró la API, y lo pone en Kafka.',
      info: {
        resp: '<p>Valida cada evento, le agrega la hora del servidor y lo publica en Kafka. Responde 202 sin esperar a nadie más.</p>',
        api: '<pre><code>POST /v1/events\n[{ "type": "add_to_cart", "item": "p_bolsa", "req_id": "r_8" }]</code></pre>',
        data: '<p>Nada: lo que recibe va a Kafka.</p>',
        fail: '<ul><li><b>Kafka lento:</b> responde 503 y la app reintenta con el mismo id de evento.</li></ul>',
        nums: '<ul><li>Unos 60 millones de eventos por día, con las impresiones.</li></ul>'
      } },
    { id: 'catalogo', layer: 'service', label: 'Catálogo', sub: 'productos, precio y stock', x: 1680, y: 330,
      brief: 'La fuente de verdad de cada producto: título, categoría, precio, stock, zonas de envío y margen.',
      info: {
        resp: '<p>Guarda el catálogo y publica cada cambio en Kafka y en la caché de stock y precio.</p>',
        api: '<pre><code>PUT /v1/sellers/{s}/items/{id}\nGET /v1/items/{id}</code></pre>',
        data: '<p>PostgreSQL, una fila por producto y vendedor.</p>',
        fail: '<ul><li><b>Se cae:</b> la caché de stock sigue con el último valor; se compra igual porque el pago vuelve a comprobar.</li></ul>',
        nums: '<ul><li>2 millones de productos, 300 000 cambios por día.</li></ul>'
      } },

    /* ---------- Una request ---------- */
    { id: 'sesion', layer: 'service', label: 'Recomendador de sesión', sub: 'para quien no tiene cuenta', x: 160, y: 540,
      brief: 'Recomienda a partir de lo que la persona miró en esta sesión, sin historia ni cuenta.',
      why: '<p>Sin él, el 40&#8239;% de las sesiones recibiría solo lo popular. Con las últimas tres vistas ya hay señal: el mismo tipo de producto, un rango de precio, una marca.</p>',
      info: {
        resp: '<p>Toma los últimos productos vistos y junta sus vecinos de "vistos juntos" de las tablas ítem a ítem, con más peso a lo más reciente. GRU4Rec mostró que una red recurrente sobre la secuencia de la sesión mejora a la versión ítem a ítem <span class="badge badge--doc">Documentado</span>; Almacén Sur empieza por lo simple.</p>',
        api: '<pre><code>session_recs(sid, vistos=[p_c1, p_c2, p_c3], n=12)</code></pre>',
        data: '<p>Los últimos 20 eventos de la sesión, en el feature store, con 30 minutos de vida.</p>',
        fail: '<ul><li><b>Sesión vacía:</b> lo popular de la categoría de la página.</li></ul>',
        nums: '<ul><li>3 lecturas de tabla y una mezcla: menos de 10 ms.</li></ul>'
      } },
    { id: 'candidatos', layer: 'service', label: 'Candidatos', sub: 'tres fuentes, 500', x: 540, y: 540,
      brief: 'Junta 500 productos para el inicio de Sofía desde tres fuentes en paralelo.',
      info: {
        resp: '<p>Vecinos del vector de Sofía en el índice (300), complementos de sus últimas compras en las tablas (150) y populares de sus categorías (50).</p>',
        api: '<pre><code>candidates(u_42) → 500 ids</code></pre>',
        data: '<p>Sin estado: lee el índice y las tablas.</p>',
        fail: '<ul><li><b>Cae una fuente:</b> sigue con las otras dos.</li></ul>',
        nums: '<ul><li>Presupuesto de 30 ms, todas las fuentes en paralelo.</li></ul>'
      } },
    { id: 'ranker', layer: 'service', label: 'Ranker', sub: 'árboles, p(compra)', x: 920, y: 540,
      brief: 'Ordena los 500 candidatos por probabilidad de compra con un modelo de árboles.',
      info: {
        resp: '<p>Un GBDT (<a href="m46-ranking.html#arboles">M46</a>) predice p(compra en 7 días) con features del producto (precio, margen, valoraciones, ventas de la semana) y de la persona (categorías, rango de precio).</p>',
        api: '<pre><code>rank(u_42, 500 ids) → 500 puntajes</code></pre>',
        data: '<p>El modelo en memoria, una versión por día.</p>',
        fail: '<ul><li><b>Se cae:</b> la API ordena por el puntaje de ALS, que ya trae cada candidato.</li></ul>',
        nums: '<ul><li>208 × 500 = 104 000 puntuaciones por segundo en el pico; caben en CPU.</li></ul>'
      } },
    { id: 'rerank', layer: 'service', label: 'Re-ranking', sub: 'margen, diversidad, stock', x: 1300, y: 540,
      brief: 'Arma la lista final: quita lo que no hay, mezcla margen con p(compra), reparte categorías y vendedores.',
      why: '<p>El ranker puntúa productos sueltos. Sin re-ranking, la lista sería 24 carpas, algunas sin stock y casi todas del vendedor más grande.</p>',
      info: {
        resp: '<p>Filtra stock y zona de envío, ajusta por margen con un peso chico, aplica MMR por categoría, un máximo de 3 por vendedor y un lugar patrocinado marcado.</p>',
        api: '<pre><code>rerank(500 con puntaje) → 24</code></pre>',
        data: '<p>Las reglas, versionadas.</p>',
        fail: '<ul><li><b>Stock no responde:</b> devuelve la lista sin filtrar y marca cada producto para comprobarlo al mostrarlo.</li></ul>',
        nums: '<ul><li>O(n × k) con n = 50 y k = 24: menos de 2 ms.</li></ul>'
      } },
    { id: 'stock', layer: 'cache', label: 'Stock y precio', sub: 'caché, segundos', x: 1680, y: 540,
      brief: 'Stock, precio y zonas de envío de cada producto, actualizados en segundos.',
      info: {
        resp: '<p>Responde en lote si hay stock y si se envía a la zona de la persona.</p>',
        api: '<pre><code>MGET stock:p_1 … stock:p_500</code></pre>',
        data: '<p>Valkey: 2 millones de claves, unos 200 MB.</p>',
        fail: '<ul><li><b>Desactualizada:</b> el pago vuelve a comprobar el stock real: la caché nunca vende lo que no hay.</li></ul>',
        nums: '<ul><li>Se actualiza en menos de 5 s después de cada cambio del catálogo.</li></ul>'
      } },

    /* ---------- Tablas, índices, features y el log ---------- */
    { id: 'tablas', layer: 'db', label: 'Tablas ítem a ítem', sub: 'comprados juntos y vistos juntos', x: 160, y: 750,
      brief: 'Para cada producto, sus 20 mejores complementos (comprados juntos) y sus 20 mejores parecidos (vistos juntos).',
      why: '<p>La página de producto es la superficie más vista. Con las tablas calculadas de noche, servirla es leer una clave: no hace falta ningún modelo en línea.</p>',
      info: {
        resp: '<p>Una clave por producto y por tipo de tabla. Es el algoritmo de Linden, Smith y York (2003): la tabla de ítems relacionados se calcula offline y servir no depende del número de clientes <span class="badge badge--doc">Documentado</span>.</p>',
        api: '<pre><code>GET cj:p_carpa → [(p_bolsa, 96.8), (p_linterna, 41.2), …]\nGET vj:p_carpa → [(p_carpa2, 0.31), …]</code></pre>',
        data: '<p>2 millones × 2 tablas × 20 vecinos × 8 B = 640 MB, en un almacén clave-valor replicado.</p>',
        fail: '<ul><li><b>Se cae:</b> la página de producto usa el índice vectorial para parecidos y lo popular de la categoría para complementos.</li></ul>',
        nums: '<ul><li>Una lectura por página: 833 por segundo en el pico.</li></ul>'
      } },
    { id: 'vector', layer: 'db', label: 'Índice vectorial', sub: 'factores de ALS', x: 540, y: 750,
      brief: 'Los vectores de los 2 millones de productos, con un índice HNSW para buscar vecinos.',
      info: {
        resp: '<p>Busca los productos más cercanos al vector de una persona o de otro producto (<a href="m45-recuperacion.html#hnsw">M45</a>).</p>',
        api: '<pre><code>knn(vec(u_42), 300, filtro=categoria_activa)</code></pre>',
        data: '<p>2 millones × 64 × 4 B = 512 MB de vectores, más el grafo de HNSW.</p>',
        fail: '<ul><li><b>Se cae:</b> los candidatos siguen con las tablas y lo popular.</li></ul>',
        nums: '<ul><li>Unos 2 ms por consulta.</li></ul>'
      } },
    { id: 'fstore', layer: 'cache', label: 'Feature store', sub: 'persona y producto', x: 920, y: 750,
      brief: 'Las features de cada persona (vector de ALS, categorías, sesión) y de cada producto (ventas de la semana).',
      info: {
        resp: '<p>Entrega en un solo pedido las features de la persona y de los 500 candidatos.</p>',
        api: '<pre><code>MGET u:u_42 p:p_1 … p:p_500</code></pre>',
        data: '<p>Valkey; los vectores de las personas se escriben cada noche y la sesión en segundos.</p>',
        fail: '<ul><li><b>Lento:</b> el ranker usa valores por defecto y la respuesta se marca para no entrenar con ella.</li></ul>',
        nums: '<ul><li>10 millones de personas con vector × 64 × 4 B = 2.56 GB.</li></ul>'
      } },
    { id: 'kafka', layer: 'queue', label: 'Kafka', sub: 'eventos y cambios del catálogo', x: 1300, y: 750,
      brief: 'El log de cada vista, carrito, compra e impresión, y de cada cambio del catálogo.',
      info: {
        resp: '<p>Guarda los eventos en orden por persona. Los consumen la sesión en tiempo real y el data lake.</p>',
        api: '<pre><code>topics: events, impressions, catalog_changes</code></pre>',
        data: '<p>7 días de retención.</p>',
        fail: '<ul><li><b>Lag del consumidor:</b> la sesión se atrasa; el lote de la noche no cambia.</li></ul>',
        nums: '<ul><li>60 millones de eventos por día, unos 700 por segundo en promedio.</li></ul>'
      } },
    { id: 'ads', layer: 'service', label: 'Patrocinados', sub: 'subasta, etiqueta visible', x: 1680, y: 750,
      brief: 'Elige el producto patrocinado de cada lista con una subasta entre los relevantes.',
      why: '<p>Un patrocinado sin etiqueta o sin relevancia rompe la confianza en toda la lista. Por eso compite solo entre productos que ya pasaron el umbral de relevancia, y va marcado.</p>',
      info: {
        resp: '<p>Entre los candidatos con p(compra) sobre un umbral, gana el que más paga por la relevancia esperada. Va siempre con la etiqueta "Patrocinado".</p>',
        api: '<pre><code>auction(u_42, candidatos_relevantes) → p_77, cpc 0.40</code></pre>',
        data: '<p>Las campañas de los vendedores y su presupuesto diario.</p>',
        fail: '<ul><li><b>Se cae:</b> la lista sale sin patrocinado. Nunca se rellena con uno sin subasta.</li></ul>',
        nums: '<ul><li>1 lugar de cada 12 como máximo.</li></ul>'
      } },

    /* ---------- El lote de cada noche ---------- */
    { id: 'batch', layer: 'service', label: 'Lote nocturno', sub: 'co-ocurrencia, ALS, ranker', x: 540, y: 960,
      brief: 'Cada noche recalcula las tablas ítem a ítem, los vectores de ALS y el ranker con los datos del día.',
      why: '<p>Las tres piezas cambian despacio: los pares que se compran juntos no cambian en una hora. Calcularlas de noche hace que servirlas sea leer una clave.</p>',
      info: {
        resp: '<p>Tres trabajos en orden: la co-ocurrencia con lift (unos minutos), ALS implícito con 15 iteraciones (unos 15 minutos) y el ranker de árboles. Cada salida se valida antes de publicarse.</p>',
        api: '<pre><code>cooc(pedidos 365 d) → tablas\nals(interacciones 365 d, k=64) → vectores\ntrain_gbdt(impresiones 30 d) → ranker</code></pre>',
        data: '<p>Lee el data lake; escribe tablas, vectores y modelo con una versión.</p>',
        fail: '<ul><li><b>Falla o da raro:</b> no publica y queda la versión de ayer, que sirve igual.</li></ul>',
        nums: '<ul><li>Unas 2 horas de cómputo en total, en máquinas que se apagan al terminar.</li></ul>'
      } },
    { id: 'lake', layer: 'db', label: 'Data lake', sub: 'eventos y pedidos', x: 1300, y: 960,
      brief: 'Todos los eventos, impresiones y pedidos en archivos por día.',
      info: {
        resp: '<p>Guarda la historia para los lotes y para el análisis de experimentos.</p>',
        api: '<pre><code>s3://almacen-lake/events/dt=2026-11-01/…</code></pre>',
        data: '<p>Parquet particionado por día.</p>',
        fail: '<ul><li><b>Llega tarde un día:</b> el lote espera o corre con lo que hay y lo dice.</li></ul>',
        nums: '<ul><li>60 millones de eventos × 200 B = 12 GB por día, 4.4 TB al año.</li></ul>'
      } }
  ],
  edges: [
    { id: 'e1', from: 'anon', to: 'api', both: true, label: 'GET /v1/recs' },
    { id: 'e2', from: 'sofia', to: 'api', both: true },
    { id: 'e3', from: 'anon', to: 'eventos', both: true },
    { id: 'e4', from: 'sofia', to: 'eventos', both: true, label: 'POST /v1/events' },
    { id: 'e5', from: 'vendedor', to: 'catalogo', both: true, label: 'stock y precio' },
    { id: 'e6', from: 'api', to: 'sesion', both: true },
    { id: 'e7', from: 'api', to: 'candidatos', both: true },
    { id: 'e8', from: 'api', to: 'ranker', both: true },
    { id: 'e9', from: 'api', to: 'rerank', both: true },
    { id: 'e10', from: 'api', to: 'eventos', async: true, label: 'impresiones' },
    { id: 'e11', from: 'api', to: 'tablas', both: true },
    { id: 'e12', from: 'sesion', to: 'tablas', both: true },
    { id: 'e13', from: 'candidatos', to: 'vector', both: true },
    { id: 'e14', from: 'candidatos', to: 'tablas', both: true },
    { id: 'e15', from: 'ranker', to: 'fstore', both: true },
    { id: 'e16', from: 'rerank', to: 'stock', both: true },
    { id: 'e17', from: 'rerank', to: 'ads', both: true },
    { id: 'e18', from: 'catalogo', to: 'stock' },
    { id: 'e19', from: 'catalogo', to: 'kafka', async: true },
    { id: 'e20', from: 'eventos', to: 'kafka', async: true },
    { id: 'e21', from: 'kafka', to: 'fstore', async: true, label: 'sesión' },
    { id: 'e22', from: 'kafka', to: 'lake', async: true },
    { id: 'e23', from: 'lake', to: 'batch' },
    { id: 'e24', from: 'batch', to: 'tablas' },
    { id: 'e25', from: 'batch', to: 'vector' },
    { id: 'e26', from: 'batch', to: 'ranker', label: 'modelo' }
  ],
  scenarios: [
    {
      id: 'producto', title: 'La página de una carpa',
      goal: 'La superficie más vista se sirve con una lectura y un filtro.',
      desc: 'Sofía abre la página de una carpa. La API lee los complementos ya calculados, quita los que no hay y devuelve 8.',
      steps: [
        { from: 'sofia', to: 'api', kind: 'req', tag: 'GET /v1/recs/product/p_carpa', ms: 30, title: 'Sofía abre la carpa', text: 'La página pide "comprados juntos" y "parecidos" en paralelo.', code: 'GET /v1/recs/product/p_carpa?n=8', lang: 'http' },
        { from: 'api', to: 'tablas', kind: 'req', tag: 'GET cj:p_carpa', ms: 1, title: 'Una lectura', text: 'Los 20 mejores complementos de la carpa, calculados anoche con lift.', why: 'El cálculo caro (contar pares en 43.8 millones de pedidos) se hizo de noche; ahora es leer una clave.' },
        { from: 'tablas', to: 'api', kind: 'res', tag: 'bolsa 96.8, linterna 41.2, …', ms: 2, title: 'Complementos, no populares', text: 'Gracias al lift, la bolsa de dormir gana a las pilas, que se compran con todo.', code: '[["p_bolsa", 96.8], ["p_linterna", 41.2], ["p_esterilla", 38.0], …]', lang: 'json' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'filtrar 20', ms: 1, title: 'Filtros duros', text: '' },
        { from: 'rerank', to: 'stock', kind: 'req', tag: 'MGET stock:…', ms: 1, title: '¿Hay y llega?', text: 'Stock y zona de envío de Sofía.' },
        { from: 'stock', to: 'rerank', kind: 'res', tag: 'p_esterilla: 0', ms: 2, title: 'Sin stock', text: 'La esterilla no tiene stock: sale de la lista y sube el siguiente.' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '8', ms: 1, title: '', text: '' },
        { from: 'api', to: 'sofia', kind: 'res', tag: '8 complementos', ms: 30, title: 'En 70 ms', text: 'Con un req_id para unir cada impresión con lo que pase después.' },
        { from: 'api', to: 'eventos', kind: 'async', tag: 'impresiones r_8', ms: 2, title: 'Las impresiones al log', text: 'Sin ellas no hay negativos para entrenar el ranker (M43).' }
      ]
    },
    {
      id: 'inicio', title: 'El inicio de Sofía',
      goal: 'Candidatos, ranking y re-ranking con margen y diversidad.',
      desc: 'Sofía abre la tienda. La API junta 500 candidatos, los ordena por p(compra) y arma 24 con margen, categorías variadas y un patrocinado marcado.',
      steps: [
        { from: 'sofia', to: 'api', kind: 'req', tag: 'GET /v1/recs/home', ms: 30, title: 'Sofía abre la tienda', text: '' },
        { from: 'api', to: 'candidatos', kind: 'req', tag: 'candidates(u_42)', ms: 1, title: 'Etapa 1: candidatos', text: 'Tres fuentes en paralelo.' },
        { from: 'candidatos', to: 'vector', kind: 'req', tag: 'knn(vec(u_42), 300)', ms: 1, title: 'Vecinos de su vector', text: 'El vector de ALS de Sofía, calculado anoche, contra los vectores de los productos.' },
        { from: 'vector', to: 'candidatos', kind: 'res', tag: '300', ms: 2, title: '', text: '' },
        { from: 'candidatos', to: 'tablas', kind: 'req', tag: 'GET cj:últimas compras', ms: 1, title: 'Complementos de lo que compró', text: 'Compró una carpa la semana pasada: una linterna tiene sentido; otra carpa, no.' },
        { from: 'tablas', to: 'candidatos', kind: 'res', tag: '150', ms: 2, title: '', text: '' },
        { from: 'candidatos', to: 'api', kind: 'res', tag: '500', ms: 5, title: '', text: '' },
        { from: 'api', to: 'ranker', kind: 'req', tag: 'rank(500)', ms: 1, title: 'Etapa 2: p(compra)', text: '' },
        { from: 'ranker', to: 'fstore', kind: 'req', tag: 'MGET u_42 + 500', ms: 1, title: '', text: '' },
        { from: 'fstore', to: 'ranker', kind: 'res', tag: 'features', ms: 3, title: '', text: '' },
        { from: 'ranker', to: 'api', kind: 'res', tag: '500 con p(compra)', ms: 15, title: 'Árboles en CPU', text: '104 000 puntuaciones por segundo en el pico caben en CPU.' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'rerank(500)', ms: 1, title: 'Etapa 3: la lista', text: 'Margen con un peso chico, MMR por categoría y como máximo 3 por vendedor.', why: 'Ordenar solo por margen mostraría lo que conviene a la tienda, no lo que Sofía compraría: la conversión cae y con ella el margen total.' },
        { from: 'rerank', to: 'stock', kind: 'req', tag: 'MGET stock', ms: 1, title: '', text: '' },
        { from: 'stock', to: 'rerank', kind: 'res', tag: 'ok', ms: 2, title: '', text: '' },
        { from: 'rerank', to: 'ads', kind: 'req', tag: 'auction(relevantes)', ms: 1, title: 'Un lugar patrocinado', text: 'Solo compiten productos que ya pasaron el umbral de relevancia.' },
        { from: 'ads', to: 'rerank', kind: 'res', tag: 'p_77 · Patrocinado', ms: 3, title: '', text: '' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '24', ms: 1, title: '', text: '' },
        { from: 'api', to: 'sofia', kind: 'res', tag: '24 productos', ms: 30, title: 'El inicio', text: 'Con el patrocinado marcado como tal.' }
      ]
    },
    {
      id: 'anonimo', title: 'Un visitante sin cuenta',
      goal: 'Recomendar con solo tres vistas.',
      desc: 'Alguien llega desde un buscador y mira tres carpas. Sin historia, el recomendador de sesión usa esas tres vistas.',
      steps: [
        { from: 'anon', to: 'eventos', kind: 'req', tag: 'view × 3', ms: 40, title: 'Tres vistas', text: 'Tres carpas para 4 personas, entre 80 y 120 USD.' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'events · s_9', ms: 5, title: '', text: '' },
        { from: 'kafka', to: 'fstore', kind: 'async', tag: 'SET s_9:session', ms: 2000, title: 'La sesión en segundos', text: 'Los últimos 20 eventos de la sesión, con 30 minutos de vida.' },
        { from: 'anon', to: 'api', kind: 'req', tag: 'GET /v1/recs/session', ms: 30, title: 'Pide recomendaciones', text: '' },
        { from: 'api', to: 'sesion', kind: 'req', tag: 'session_recs(s_9)', ms: 1, title: 'Sin cuenta, con sesión', text: '' },
        { from: 'sesion', to: 'tablas', kind: 'req', tag: 'GET vj:c1 vj:c2 vj:c3', ms: 1, title: 'Vistos juntos de cada una', text: 'Los parecidos de las tres carpas, con más peso a la última.', why: 'Lo que se mira junto en una sesión son sustitutos: otras carpas parecidas. Lo que se compra junto son complementos.' },
        { from: 'tablas', to: 'sesion', kind: 'res', tag: '60', ms: 2, title: '', text: '' },
        { from: 'sesion', to: 'api', kind: 'res', tag: '12 carpas y afines', ms: 3, title: '', text: '' },
        { from: 'api', to: 'anon', kind: 'res', tag: '12', ms: 30, title: 'Sin saber quién es', text: 'Carpas de 4 personas en su rango de precio, sin datos personales.' }
      ]
    },
    {
      id: 'lote', title: 'El lote de cada noche',
      goal: 'Las tres piezas que se recalculan y cómo se publican.',
      desc: 'A las 2 de la mañana, el lote lee el último año de pedidos e interacciones y recalcula las tablas, los vectores y el ranker.',
      steps: [
        { from: 'kafka', to: 'lake', kind: 'async', tag: 'eventos del día', ms: 3600000, title: 'El día cerrado', text: 'Los eventos del día ya están en el lake, en Parquet.' },
        { from: 'lake', to: 'batch', kind: 'req', tag: '43.8 M pedidos', ms: 600000, title: 'Co-ocurrencia con lift', text: 'Cuenta pares por pedido, calcula el lift y se queda con los 20 mejores por producto con soporte mínimo.', why: 'Contar crudo devuelve lo que se compra con todo (pilas, bolsas). El lift compara contra lo que se esperaría por azar.' },
        { from: 'batch', to: 'tablas', kind: 'req', tag: 'cj:* versión 2026-11-02', ms: 300000, title: 'Tablas nuevas', text: 'Se escriben con una versión nueva y se cambia el puntero cuando terminan, para no servir una tabla a medias.' },
        { from: 'lake', to: 'batch', kind: 'req', tag: '500 M interacciones', ms: 900000, title: 'ALS implícito', text: '15 iteraciones con 64 factores: unos 15 minutos.' },
        { from: 'batch', to: 'vector', kind: 'req', tag: '2 M vectores', ms: 600000, title: 'Índice nuevo', text: 'Se construye el HNSW nuevo al lado y se cambia cuando está listo.' },
        { from: 'batch', to: 'ranker', kind: 'req', tag: 'gbdt 2026-11-02', ms: 60000, title: 'Ranker nuevo', text: 'Solo si su AUC y su calibración en el día de validación no empeoran más que el umbral.' }
      ]
    },
    {
      id: 'sin-stock', title: 'Se agota un producto',
      goal: 'Un filtro duro que se actualiza en segundos, no de noche.',
      desc: 'Un vendedor deja en cero el stock de la bolsa de dormir. La próxima página de la carpa ya no la muestra.',
      steps: [
        { from: 'vendedor', to: 'catalogo', kind: 'req', tag: 'PUT stock=0', ms: 50, title: 'Se agota', text: '', code: 'PUT /v1/sellers/s_12/items/p_bolsa\n{ "stock": 0 }', lang: 'http' },
        { from: 'catalogo', to: 'stock', kind: 'req', tag: 'SET stock:p_bolsa 0', ms: 2000, title: 'La caché en segundos', text: '' },
        { from: 'catalogo', to: 'kafka', kind: 'async', tag: 'catalog_changes', ms: 5, title: 'Al log', text: 'El lote de la noche también se entera.' },
        { from: 'sofia', to: 'api', kind: 'req', tag: 'GET /v1/recs/product/p_carpa', ms: 30, title: 'Otra visita a la carpa', text: '' },
        { from: 'api', to: 'tablas', kind: 'req', tag: 'GET cj:p_carpa', ms: 1, title: 'La tabla sigue igual', text: 'La bolsa sigue primera en la tabla de anoche.' },
        { from: 'tablas', to: 'api', kind: 'res', tag: 'bolsa, linterna, …', ms: 2, title: '', text: '' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'filtrar', ms: 1, title: '', text: '' },
        { from: 'rerank', to: 'stock', kind: 'req', tag: 'MGET', ms: 1, title: '', text: '' },
        { from: 'stock', to: 'rerank', kind: 'res', tag: 'p_bolsa: 0', ms: 2, title: 'El filtro la quita', text: 'El stock es un filtro duro, aplicado al servir; el precio, en cambio, es una feature del ranker.', why: 'Si el stock fuera solo una feature, un producto agotado con mucho puntaje se seguiría mostrando.' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '8 sin la bolsa', ms: 1, title: '', text: '' },
        { from: 'api', to: 'sofia', kind: 'res', tag: '8', ms: 30, title: '', text: '' }
      ]
    },
    {
      id: 'compra', title: 'Sofía compra',
      goal: 'Una compra cambia lo que conviene mostrar.',
      desc: 'Sofía compra la carpa y la bolsa. Desde ese momento, otra carpa es una mala recomendación y una linterna, una buena.',
      steps: [
        { from: 'sofia', to: 'eventos', kind: 'req', tag: 'purchase', ms: 40, title: 'Compra', text: '', code: '{ "type": "purchase", "order": "o_5", "items": ["p_carpa", "p_bolsa"] }', lang: 'json' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'events · u_42', ms: 5, title: '', text: '' },
        { from: 'kafka', to: 'fstore', kind: 'async', tag: 'u_42: compró carpa', ms: 2000, title: 'La feature en segundos', text: '"Compró en la categoría carpas hace 0 días."', why: 'Sin ella, el inicio de mañana le mostraría más carpas: lo que ALS aprendió es que le interesan las carpas, no que ya tiene una.' },
        { from: 'kafka', to: 'lake', kind: 'async', tag: 'por hora', ms: 3600000, title: 'Al lake', text: 'Esta noche, el pedido suma 1 al par (carpa, bolsa).' },
        { from: 'sofia', to: 'api', kind: 'req', tag: 'GET /v1/recs/home', ms: 30, title: 'Vuelve al inicio', text: '' },
        { from: 'api', to: 'ranker', kind: 'req', tag: 'rank(500)', ms: 1, title: '', text: '' },
        { from: 'ranker', to: 'fstore', kind: 'req', tag: 'MGET', ms: 1, title: '', text: '' },
        { from: 'fstore', to: 'ranker', kind: 'res', tag: 'compró carpa: 0 d', ms: 3, title: 'Baja lo duradero ya comprado', text: 'El ranker aprendió que quien acaba de comprar una carpa casi nunca compra otra en 7 días.' },
        { from: 'ranker', to: 'api', kind: 'res', tag: 'linterna arriba', ms: 15, title: '', text: '' },
        { from: 'api', to: 'sofia', kind: 'res', tag: '24 sin carpas', ms: 30, title: 'Complementos, no repetidos', text: '' }
      ]
    },
    {
      id: 'caida', title: 'Se caen las tablas',
      goal: 'La página de producto sigue mostrando algo razonable.',
      desc: 'El almacén clave-valor de las tablas no responde. La API usa el índice vectorial para parecidos y marca la respuesta.',
      down: ['tablas'],
      steps: [
        { from: 'sofia', to: 'api', kind: 'req', tag: 'GET /v1/recs/product/p_carpa', ms: 30, title: 'Sofía abre la carpa', text: '' },
        { from: 'api', to: 'tablas', kind: 'fail', tag: 'timeout 20 ms', ms: 20, title: 'Las tablas no responden', text: 'Timeout corto: la página no espera.' },
        { from: 'api', to: 'candidatos', kind: 'req', tag: 'similar(p_carpa)', ms: 1, title: 'El respaldo', text: '' },
        { from: 'candidatos', to: 'vector', kind: 'req', tag: 'knn(vec(p_carpa), 20)', ms: 1, title: 'Parecidos por vector', text: 'Los vecinos del vector de la carpa son otras carpas: sustitutos, no complementos.', why: 'Es peor que la tabla de comprados juntos, pero mucho mejor que una caja vacía.' },
        { from: 'vector', to: 'candidatos', kind: 'res', tag: '20', ms: 2, title: '', text: '' },
        { from: 'candidatos', to: 'api', kind: 'res', tag: '20', ms: 1, title: '', text: '' },
        { from: 'api', to: 'sofia', kind: 'res', tag: '8 · degraded', ms: 30, title: 'Degradado y marcado', text: 'La caja cambia el título a "Parecidos" y las impresiones se marcan para no entrenar con ellas (M50).' }
      ]
    }
  ]
});
