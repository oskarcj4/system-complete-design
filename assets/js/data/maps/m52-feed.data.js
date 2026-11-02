/* Mapa del M52: el feed de video corto "Clip" de punta a punta. Es un diseño de referencia armado con lo que publicaron
   TikTok (Newsroom 2020), ByteDance (Monolith, 2022), YouTube (Covington 2016 y el blog de 2021) y lo visto en M42 a M51.
   Lo que viene de una fuente lleva su badge en la caja. Se lee de arriba abajo: personas, entrada, una request del feed,
   índices y el log, y aprender. */
SD.defineMap('m52-feed', {
  title: 'Clip: un feed de video corto',
  intro: 'El recomendador de un feed de video corto con 50 millones de usuarios activos por día. Arriba, quien mira y quien publica; en el medio, la request del feed con sus cuatro etapas; abajo, el log de eventos, las features en streaming y el entrenamiento. Elige un escenario para ver un viaje paso a paso, o toca una pieza para ver sus cinco pestañas.',
  start: 'api',
  stepPanel: true,
  pieces: true,
  groups: [
    { id: 'g-per', label: 'Personas y experimentos', x: 20, y: 54, w: 2230, h: 110 },
    { id: 'g-ent', label: 'Entrada', x: 20, y: 264, w: 2230, h: 110 },
    { id: 'g-req', label: 'Una request del feed: 200 ms', x: 20, y: 474, w: 2230, h: 110 },
    { id: 'g-idx', label: 'Índices, features, reglas y el log', x: 20, y: 684, w: 2230, h: 110 },
    { id: 'g-apr', label: 'Aprender: segundos a días', x: 20, y: 894, w: 2230, h: 110 }
  ],
  nodes: [
    /* ---------- Personas y experimentos ---------- */
    { id: 'lucia', layer: 'client', label: 'Lucía', sub: 'mira el feed en la app', x: 540, y: 120,
      brief: 'Quien mira: pide el feed, baja los videos de la CDN y manda lo que hace con cada uno.',
      info: {
        resp: '<p>Abre la app y desliza. Cada página trae 8 videos; la app pide la siguiente cuando quedan 3 por ver, así el deslizar nunca espera a la red.</p>',
        api: '<pre><code>GET  /v1/feed?cursor=…&amp;n=8\nPOST /v1/events        lotes de eventos\nGET  https://v.clip.example/…/720p.mp4</code></pre>',
        data: '<p>La app guarda los eventos en un búfer y los manda en lotes cada 10 segundos o al pasar a segundo plano. Guarda también la página siguiente ya descargada.</p>',
        fail: '<ul><li><b>Sin red:</b> muestra lo que ya bajó y guarda los eventos para después.</li><li><b>Eventos duplicados:</b> cada evento lleva un id, y el stream descarta los repetidos.</li></ul>',
        nums: '<ul><li>40 videos por día en promedio; 5 páginas por día con 8 videos cada una.</li><li>Unos 3 eventos por video: impresión, fin de la vista con el porcentaje visto, y a veces like, compartir o "no me interesa".</li></ul>'
      } },
    { id: 'exp', layer: 'service', label: 'Experimentos', sub: 'asigna variante por usuario', x: 1300, y: 120,
      brief: 'Decide en qué variante de cada experimento está cada usuario, con un hash estable.',
      why: '<p>Sin una asignación estable, la misma persona vería el modelo A y el B en días distintos y el A/B mediría ruido. Ver <a href="m49-experimentos.html#ab-rec">M49</a>.</p>',
      info: {
        resp: '<p>Devuelve la variante de cada experimento activo para un usuario: <code>hash(usuario, experimento) mod 1000</code> contra los rangos de cada variante.</p>',
        api: '<pre><code>GET /assign?user=u_77\n200 { "ranker": "v41", "explore_budget": "b" }</code></pre>',
        data: '<p>La configuración de los experimentos, en memoria y versionada. La asignación no se guarda: se recalcula con el hash.</p>',
        fail: '<ul><li><b>Se cae:</b> la API usa la variante de control para todos y lo marca en el log, para excluir esas requests del análisis.</li></ul>',
        nums: '<ul><li>Responde en menos de 1 ms: es un hash y una tabla.</li></ul>'
      } },
    { id: 'creadora', layer: 'client', label: 'Mara', sub: 'publica un video nuevo', x: 2060, y: 120,
      brief: 'Quien publica: sube un video de 20 segundos que todavía nadie vio.',
      info: {
        resp: '<p>Graba y sube un video. Lo que más le importa es que alguien lo vea: con cero vistas, ningún modelo sabe si es bueno.</p>',
        api: '<pre><code>POST /v1/uploads           pide una URL firmada\nPUT  https://up.clip.example/…  el archivo\nPOST /v1/videos            título, música, etiquetas</code></pre>',
        data: '<p>Nada en el dispositivo después de subir.</p>',
        fail: '<ul><li><b>Se corta la subida:</b> sube por partes y reanuda desde la última confirmada.</li></ul>',
        nums: '<ul><li>500 000 videos nuevos por día en Clip: 1&#8239;% de los usuarios activos publica uno.</li></ul>'
      } },

    /* ---------- Entrada ---------- */
    { id: 'cdn', layer: 'edge', label: 'CDN de video', sub: 'segmentos en varias calidades', x: 160, y: 330,
      brief: 'Sirve los videos desde cerca de quien mira; es la mayor parte de los bytes y del costo.',
      info: {
        resp: '<p>Entrega los archivos de video, ya transcodificados en varias calidades. La app empieza a bajar el siguiente video antes de que Lucía deslice.</p>',
        api: '<pre><code>GET https://v.clip.example/v/9f3c/720p.mp4\nRange: bytes=0-524287</code></pre>',
        data: '<p>Copias en caché por video y calidad. Un video publicado no cambia: el caché dura semanas.</p>',
        fail: '<ul><li><b>Un video viral:</b> millones de pedidos del mismo archivo; al origen llega uno por PoP.</li><li><b>Un PoP cae:</b> el tráfico va al siguiente.</li></ul>',
        nums: '<ul><li>Un video de 30 s a unos 1 Mbps son unos 3.75 MB. 2 000 millones de vistas por día son unos 7.5 PB por día.</li></ul>'
      } },
    { id: 'api', layer: 'service', label: 'API del feed', sub: 'orquesta las cuatro etapas', x: 540, y: 330,
      brief: 'Recibe el pedido del feed, llama a cada etapa del embudo con su presupuesto y registra las impresiones.',
      why: '<p>Alguien tiene que sostener el presupuesto de 200 ms y decidir qué hacer cuando una etapa no llega: esa es la API. Ver <a href="m50-serving-recomendacion.html#presupuesto">M50</a>.</p>',
      info: {
        resp: '<p>Pide la variante, los candidatos, el ranking liviano, el pesado y el re-ranking, cada uno con su timeout. Devuelve 8 videos y publica las impresiones sin esperar.</p>',
        api: '<pre><code>GET /v1/feed?cursor=c_12&amp;n=8\n200 { "items": [ { "video_id": "v_9f3c", "url": "…/720p.mp4",\n                 "slot": "rank", "req_id": "r_51" } , … ],\n      "cursor": "c_13" }</code></pre>',
        data: '<p>Sin estado propio. El cursor lleva qué videos ya se mostraron en la sesión, para no repetir.</p>',
        fail: '<ul><li><b>El ranking pesado no llega:</b> usa el orden del liviano y marca la respuesta como degradada.</li><li><b>Candidatos vacíos:</b> devuelve el feed de respaldo de lo popular, regenerado cada hora.</li></ul>',
        nums: '<ul><li>250 millones de requests por día: 2 894 por segundo en promedio, unas 8 681 en el pico (3 veces).</li></ul>'
      } },
    { id: 'eventos', layer: 'edge', label: 'Ingesta de eventos', sub: 'POST /v1/events', x: 1680, y: 330,
      brief: 'Recibe los lotes de eventos de la app, los valida y los publica en Kafka.',
      info: {
        resp: '<p>Valida el formato, completa la hora del servidor y publica cada evento en su tópico. Responde 202 en cuanto Kafka confirma.</p>',
        api: '<pre><code>POST /v1/events\n[ { "id": "e_1", "type": "view_end", "video_id": "v_9f3c",\n    "req_id": "r_51", "watched_ms": 15000, "duration_ms": 15000 } ]\n202</code></pre>',
        data: '<p>Nada: es un paso hacia Kafka.</p>',
        fail: '<ul><li><b>Kafka lento:</b> la app reintenta con el mismo id de evento; los duplicados se descartan después.</li></ul>',
        nums: '<ul><li>6 000 millones de eventos por día: 69 444 por segundo en promedio, unos 208 000 en el pico.</li></ul>'
      } },
    { id: 'subida', layer: 'service', label: 'Subida', sub: 'guarda y transcodifica', x: 2060, y: 330,
      brief: 'Recibe el archivo, lo transcodifica a varias calidades y lo manda a revisar.',
      info: {
        resp: '<p>Guarda el original en almacenamiento de objetos, genera las calidades (360p, 540p, 720p, 1080p) y pasa el video a moderación.</p>',
        api: '<pre><code>POST /v1/videos { "upload_id": "up_3", "caption": "…" }\n201 { "video_id": "v_a771", "status": "processing" }</code></pre>',
        data: '<p>El original y las calidades en almacenamiento de objetos, que es el origen de la CDN. Una fila por video con su estado.</p>',
        fail: '<ul><li><b>La transcodificación falla:</b> se reintenta desde el original; el video no se distribuye hasta tener todas las calidades.</li></ul>',
        nums: '<ul><li>500 000 videos por día: 5.8 por segundo en promedio.</li></ul>'
      } },

    /* ---------- Una request del feed ---------- */
    { id: 'candidatos', layer: 'service', label: 'Candidatos', sub: 'varias fuentes en paralelo', x: 160, y: 540,
      brief: 'Junta unos 5 000 candidatos de varias fuentes: vecinos del vector, seguidos, populares y exploración.',
      why: '<p>Puntuar millones de videos por request es imposible; la recuperación reduce el catálogo a miles. Ver <a href="m45-recuperacion.html#fuentes">M45</a>.</p>',
      info: {
        resp: '<p>Llama a las fuentes a la vez y une sus listas: vecinos del vector de Lucía (two-tower), lo nuevo de sus seguidos, lo popular de su región y la tanda de exploración de videos nuevos.</p>',
        api: '<pre><code>candidates(user=u_77, n=5000)\n→ [ (v_9f3c, "ann"), (v_a771, "explore"), … ]</code></pre>',
        data: '<p>Sin estado propio: lee el índice vectorial, el grafo y la lista de exploración.</p>',
        fail: '<ul><li><b>Una fuente no llega a tiempo:</b> se sigue sin ella; las otras alcanzan.</li></ul>',
        nums: '<ul><li>5 000 candidatos por request; unos 25 ms de presupuesto.</li></ul>'
      } },
    { id: 'liviano', layer: 'service', label: 'Ranking liviano', sub: '5 000 → 500', x: 540, y: 540,
      brief: 'Un modelo barato que deja los 500 mejores de 5 000, en CPU.',
      info: {
        resp: '<p>Un producto punto entre el vector de Lucía y el de cada video más unas pocas features. Deja los 500 mejores.</p>',
        api: '<pre><code>light_rank(user, 5000 ids) → 500 ids</code></pre>',
        data: '<p>Los vectores de los videos, en memoria.</p>',
        fail: '<ul><li><b>Se cae:</b> el pesado recibe los primeros 500 por la fuente de recuperación, sin reordenar.</li></ul>',
        nums: '<ul><li>8 681 requests por segundo × 5 000 = 43.4 millones de puntuaciones por segundo en el pico.</li></ul>'
      } },
    { id: 'pesado', layer: 'gpu', label: 'Ranking pesado', sub: 'multi-tarea, en GPU', x: 920, y: 540,
      brief: 'Un modelo multi-tarea que predice, para 500 videos, si se ven enteros, se repiten, se comparten o se descartan.',
      why: '<p>Es donde vive lo que el feed premia: los pesos que combinan las probabilidades. Ver <a href="m46-ranking.html#combinar">M46</a> y <a href="m51-engagement.html#alternativas">M51</a>.</p>',
      info: {
        resp: '<p>Lee las features de Lucía y de los 500 videos y predice varias cosas a la vez: p(verlo entero), tiempo esperado, p(repetir), p(like), p(compartir), p(seguir al creador) y p(no me interesa). El puntaje es una suma con pesos.</p>',
        api: '<pre><code>rank(user_feats, 500 × video_feats, model="v41")\n→ [ { "video": "v_9f3c", "p_finish": 0.62, "p_share": 0.03,\n      "p_nmi": 0.01, "score": 0.71 }, … ]</code></pre>',
        data: '<p>El modelo cargado desde el registro y una tabla de embeddings sin colisiones (<a href="m50-serving-recomendacion.html#entrenamiento">Monolith</a>).</p>',
        fail: '<ul><li><b>Se cae o se pasa de su presupuesto:</b> la API sigue con el orden del liviano (escenario "Cae el ranking pesado").</li></ul>',
        nums: '<ul><li>8 681 × 500 = 4.34 millones de puntuaciones por segundo; a 20 MFLOP cada una, 8.7 GPUs L4 sin holgura y 13 con un 40&#8239;% más.</li></ul>'
      } },
    { id: 'rerank', layer: 'service', label: 'Re-ranking', sub: 'diversidad y exploración', x: 1300, y: 540,
      brief: 'Arma la página final: diversidad de creadores y temas, sin repetir, con un lugar para exploración.',
      info: {
        resp: '<p>Toma los 500 ordenados y arma 8: no más de un video por creador, no más de 2 del mismo tema seguidos, uno de cada 8 lugares para la tanda de exploración, y las reglas de integridad.</p>',
        api: '<pre><code>rerank(500 ordenados, sesión) → 8 videos con su slot</code></pre>',
        data: '<p>Lo mostrado en la sesión, que viene en el cursor.</p>',
        fail: '<ul><li><b>Las reglas no responden:</b> se aplica la última lista conocida; nunca se distribuye un video sin veredicto.</li></ul>',
        nums: '<ul><li>Unos 5 ms: es lógica sobre 500 elementos.</li></ul>'
      } },
    { id: 'moderacion', layer: 'gpu', label: 'Moderación', sub: 'antes de distribuir', x: 2060, y: 540,
      brief: 'Clasificadores de video, audio y texto, y revisión humana para los dudosos, antes de la primera impresión.',
      why: '<p>Un video que se recomienda a miles de personas en minutos tiene que revisarse antes, no después. Ver 52.10.</p>',
      info: {
        resp: '<p>Corre clasificadores sobre fotogramas, audio y texto. Los claros pasan o se rechazan solos; los dudosos van a revisión humana. El veredicto se guarda en las reglas.</p>',
        api: '<pre><code>moderate(v_a771) → { "verdict": "ok", "labels": ["cocina"],\n                     "eligible_for_reco": true }</code></pre>',
        data: '<p>El veredicto y las etiquetas de cada video.</p>',
        fail: '<ul><li><b>La cola de revisión humana crece:</b> los dudosos esperan; no se distribuyen hasta tener veredicto.</li></ul>',
        nums: '<ul><li>5.8 videos por segundo; si cada uno pide 2 segundos de GPU, unas 12 GPUs en promedio.</li></ul>'
      } },

    /* ---------- Índices, features, reglas y el log ---------- */
    { id: 'vector', layer: 'db', label: 'Índice vectorial', sub: 'HNSW de los videos', x: 160, y: 750,
      brief: 'Los vectores de los videos elegibles, en un índice de vecinos aproximados.',
      info: {
        resp: '<p>Devuelve los videos cuyo vector está más cerca del de Lucía. Un video nuevo entra en cuanto se aprueba y se calcula su vector de contenido.</p>',
        api: '<pre><code>knn(query=vec(u_77), k=2000, filtro=elegible)</code></pre>',
        data: '<p>Unos 50 millones de videos elegibles de los últimos meses, con vectores de 128 dimensiones.</p>',
        fail: '<ul><li><b>Una réplica se atrasa:</b> los videos nuevos tardan más en aparecer, pero el resto funciona.</li></ul>',
        nums: '<ul><li>50 M × 128 × 4 bytes = 25.6 GB solo los vectores, más el grafo de HNSW.</li></ul>'
      } },
    { id: 'grafo', layer: 'db', label: 'Grafo de seguidos', sub: 'a quién sigue cada uno', x: 540, y: 750,
      brief: 'Quién sigue a quién, para traer lo nuevo de los seguidos.',
      info: {
        resp: '<p>Devuelve las cuentas que sigue Lucía y, de cada una, sus videos recientes.</p>',
        api: '<pre><code>following(u_77) → [c_12, c_90, …]</code></pre>',
        data: '<p>Listas de adyacencia por usuario. Ver <a href="m48-grafos-amigos.html#grafo">M48</a>.</p>',
        fail: '<ul><li><b>Lento:</b> la fuente de seguidos se salta en esa request.</li></ul>',
        nums: '<ul><li>En un feed de video corto, lo de los seguidos es una parte chica del feed; la mayoría viene de fuera de la red.</li></ul>'
      } },
    { id: 'fstore', layer: 'cache', label: 'Feature store', sub: 'en línea, en memoria', x: 920, y: 750,
      brief: 'Las features de usuarios y videos, algunas actualizadas cada pocos segundos por el stream.',
      info: {
        resp: '<p>Devuelve en una lectura por lotes las features de Lucía (lo que vio en la sesión, sus temas) y de los 500 videos (vistas completas, compartidos y "no me interesa" de la última hora).</p>',
        api: '<pre><code>MGET u:u_77:session v:v_9f3c:1h v:v_a771:1h …</code></pre>',
        data: '<p>Claves por usuario y por video con vencimiento. Ver <a href="m50-serving-recomendacion.html#features-online">M50</a>.</p>',
        fail: '<ul><li><b>Clave caliente:</b> un video viral se lee miles de veces por segundo (escenario "Un video viral").</li></ul>',
        nums: '<ul><li>500 videos + 1 usuario por request: unas 4.3 millones de lecturas de clave por segundo en el pico.</li></ul>'
      } },
    { id: 'reglas', layer: 'service', label: 'Reglas', sub: 'integridad y elegibilidad', x: 1300, y: 750,
      brief: 'Qué videos se pueden recomendar y a quién: veredictos de moderación, edad y bloqueos.',
      info: {
        resp: '<p>Responde, para una lista de videos y un usuario, cuáles son elegibles: con veredicto de moderación, aptos para su edad y de creadores que no bloqueó ni ocultó.</p>',
        api: '<pre><code>eligible(user=u_77, videos=[…]) → [true, false, …]</code></pre>',
        data: '<p>Veredictos por video, en memoria, y listas de ocultos por usuario.</p>',
        fail: '<ul><li><b>Sin respuesta:</b> se usa la última lista conocida. Un video sin veredicto nunca es elegible.</li></ul>',
        nums: '<ul><li>Unos 2 ms por request.</li></ul>'
      } },
    { id: 'kafka', layer: 'queue', label: 'Kafka', sub: 'eventos e impresiones', x: 1680, y: 750,
      brief: 'El log de todo lo que pasa: impresiones, vistas, likes, videos aprobados.',
      info: {
        resp: '<p>Guarda los eventos en orden por partición, para que los lean el stream de features y el data lake a su ritmo. Ver <a href="m07-mensajeria.html#kafka">M07</a>.</p>',
        api: '<pre><code>topic events       partición por usuario\ntopic impressions  partición por usuario\ntopic videos       partición por video</code></pre>',
        data: '<p>7 días de retención. Los consumidores guardan su offset.</p>',
        fail: '<ul><li><b>Un consumidor se atrasa:</b> crece su lag; las features del stream llegan tarde pero nada se pierde.</li></ul>',
        nums: '<ul><li>208 000 eventos por segundo en el pico × 200 bytes = unos 42 MB/s.</li></ul>'
      } },
    { id: 'registry', layer: 'db', label: 'Registro de modelos', sub: 'versiones y canary', x: 2060, y: 750,
      brief: 'Guarda cada versión del modelo con sus métricas y decide qué réplicas cargan cuál.',
      info: {
        resp: '<p>Recibe las versiones nuevas del entrenamiento con sus métricas offline y las despliega al ranking pesado: primero a unas pocas réplicas (canary), después a todas.</p>',
        api: '<pre><code>POST /models/ranker/v42 { "auc": 0.781, "ece": 0.012 }\nPUT  /deploy/ranker { "v42": 0.05, "v41": 0.95 }</code></pre>',
        data: '<p>Los pesos de cada versión y su historia. Ver <a href="m19-router-flota.html#registry">M19</a>.</p>',
        fail: '<ul><li><b>El canary empeora:</b> se vuelve a la versión anterior en minutos, sin entrenar nada.</li></ul>',
        nums: '<ul><li>Los pesos densos del ranker pesan pocos GB; las tablas de embeddings, mucho más, y se actualizan aparte.</li></ul>'
      } },

    /* ---------- Aprender ---------- */
    { id: 'stream', layer: 'queue', label: 'Stream de features', sub: 'Flink: segundos', x: 920, y: 960,
      brief: 'Lee los eventos y actualiza features en segundos: la sesión de cada usuario y los contadores de cada video.',
      info: {
        resp: '<p>Mantiene ventanas por video (vistas completas y compartidos de la última hora) y por usuario (lo visto en la sesión). También calcula el vector de los videos nuevos y los inserta en el índice.</p>',
        api: '<pre><code>view_end(u_77, v_9f3c, 100 %)  →  SET u:u_77:session …\n                                  INCRBY v:v_9f3c:1h:finish 1</code></pre>',
        data: '<p>El estado de las ventanas, con checkpoints. Ver <a href="m50-serving-recomendacion.html#features-online">M50</a>.</p>',
        fail: '<ul><li><b>Se atrasa:</b> el feed sigue, con features de hace minutos en lugar de segundos.</li></ul>',
        nums: '<ul><li>Del evento a la feature, unos 5 a 30 segundos.</li></ul>'
      } },
    { id: 'lake', layer: 'db', label: 'Data lake', sub: 'eventos e impresiones', x: 1680, y: 960,
      brief: 'Todo el log, guardado en archivos por hora: la fuente del entrenamiento y del análisis de experimentos.',
      info: {
        resp: '<p>Guarda cada evento y cada impresión en archivos Parquet por hora. Se une una impresión con lo que pasó después usando <code>req_id</code>.</p>',
        api: '<pre><code>s3://clip-lake/impressions/dt=2026-11-01/hr=14/…parquet</code></pre>',
        data: '<p>Un año de eventos.</p>',
        fail: '<ul><li><b>Llega tarde un archivo:</b> el entrenamiento espera esa hora o la salta, y lo dice.</li></ul>',
        nums: '<ul><li>6 000 millones de eventos × 200 bytes = 1.2 TB por día, unos 438 TB al año.</li></ul>'
      } },
    { id: 'train', layer: 'gpu', label: 'Entrenamiento', sub: 'continuo, por horas', x: 2060, y: 960,
      brief: 'Reentrena el ranker con los datos de las últimas horas y sube cada versión al registro.',
      info: {
        resp: '<p>Cada pocas horas toma las impresiones con sus etiquetas (¿se vio entero?, ¿se compartió?) y sigue entrenando desde la última versión. Monolith describe un entrenamiento en línea que sincroniza los parámetros con el serving en minutos <span class="badge badge--doc">Documentado</span>.</p>',
        api: '<pre><code>train(desde=v41, datos=últimas 6 h) → v42</code></pre>',
        data: '<p>Checkpoints del modelo.</p>',
        fail: '<ul><li><b>Datos rotos:</b> si una feature llegó por defecto en una hora, el modelo aprende basura; por eso se validan los datos antes (<a href="m50-serving-recomendacion.html#deriva">M50</a>).</li></ul>',
        nums: '<ul><li>Unas 4 instancias de 4 GPUs en promedio.</li></ul>'
      } }
  ],
  edges: [
    { id: 'e1', from: 'lucia', to: 'cdn', both: true, label: 'video' },
    { id: 'e2', from: 'lucia', to: 'api', both: true, label: 'GET /v1/feed' },
    { id: 'e3', from: 'lucia', to: 'eventos', both: true, label: 'POST /v1/events' },
    { id: 'e4', from: 'creadora', to: 'subida', both: true, label: 'subir' },
    { id: 'e5', from: 'api', to: 'exp', both: true, label: 'variante' },
    { id: 'e6', from: 'api', to: 'candidatos', both: true },
    { id: 'e7', from: 'api', to: 'liviano', both: true },
    { id: 'e8', from: 'api', to: 'pesado', both: true },
    { id: 'e9', from: 'api', to: 'rerank', both: true },
    { id: 'e10', from: 'api', to: 'eventos', async: true, label: 'impresiones' },
    { id: 'e11', from: 'candidatos', to: 'vector', both: true },
    { id: 'e12', from: 'candidatos', to: 'grafo', both: true },
    { id: 'e13', from: 'liviano', to: 'fstore', both: true },
    { id: 'e14', from: 'pesado', to: 'fstore', both: true },
    { id: 'e15', from: 'rerank', to: 'reglas', both: true },
    { id: 'e16', from: 'subida', to: 'moderacion', both: true },
    { id: 'e17', from: 'moderacion', to: 'reglas', label: 'veredicto' },
    { id: 'e18', from: 'moderacion', to: 'kafka', async: true },
    { id: 'e19', from: 'eventos', to: 'kafka', async: true },
    { id: 'e20', from: 'kafka', to: 'stream', async: true },
    { id: 'e21', from: 'stream', to: 'fstore' },
    { id: 'e22', from: 'stream', to: 'vector', label: 'video nuevo' },
    { id: 'e23', from: 'kafka', to: 'lake', async: true },
    { id: 'e24', from: 'lake', to: 'train' },
    { id: 'e25', from: 'train', to: 'registry' },
    { id: 'e26', from: 'registry', to: 'pesado', label: 'despliega' }
  ],
  scenarios: [
    {
      id: 'feed', title: 'Pedir el feed',
      goal: 'Las cuatro etapas del embudo en una request, con el presupuesto de cada una.',
      desc: 'Lucía desliza y la app pide la página siguiente. La API junta 5 000 candidatos, los baja a 500, los ordena con el modelo multi-tarea y arma 8 con diversidad y un lugar de exploración.',
      steps: [
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'La app pide la página siguiente', text: 'Quedan 3 videos por ver en la página actual: la app pide la siguiente para que deslizar nunca espere a la red.', code: 'GET /v1/feed?cursor=c_12&n=8', lang: 'http' },
        { from: 'api', to: 'exp', kind: 'req', tag: 'assign(u_77)', ms: 0.5, title: 'Qué variante le toca', text: 'Un hash estable del usuario decide en qué variante de cada experimento está.' },
        { from: 'exp', to: 'api', kind: 'res', tag: 'ranker v41', ms: 0.5, title: '', text: '' },
        { from: 'api', to: 'candidatos', kind: 'req', tag: 'candidates(5000)', ms: 1, title: 'Etapa 1: recuperar', text: 'Las fuentes corren en paralelo y la etapa dura lo que tarda la más lenta, con un tope de 25 ms.', why: 'Puntuar 50 millones de videos por request es imposible: la recuperación los baja a miles con métodos baratos.' },
        { from: 'candidatos', to: 'vector', kind: 'req', tag: 'knn(vec(u_77), 2000)', ms: 1, title: 'Vecinos del vector de Lucía', text: 'El vector de Lucía resume lo que vio; el índice devuelve los videos más cercanos.' },
        { from: 'candidatos', to: 'grafo', kind: 'req', tag: 'following(u_77)', ms: 1, title: 'Lo nuevo de sus seguidos', text: 'Una fuente chica en un feed de video corto, pero la que más espera ver quien sigue a alguien.' },
        { from: 'vector', to: 'candidatos', kind: 'res', tag: '2 000 ids', ms: 8, title: '', text: '' },
        { from: 'grafo', to: 'candidatos', kind: 'res', tag: '300 ids', ms: 4, title: 'Se unen las fuentes', text: 'Más lo popular de su región y la tanda de exploración de videos nuevos. Se quitan los repetidos y los ya vistos.' },
        { from: 'candidatos', to: 'api', kind: 'res', tag: '5 000 candidatos', ms: 2, title: '', text: '' },
        { from: 'api', to: 'liviano', kind: 'req', tag: 'light_rank(5000)', ms: 1, title: 'Etapa 2: ranking liviano', text: 'Un producto punto y pocas features: 5 000 puntuaciones en unos milisegundos de CPU.' },
        { from: 'liviano', to: 'fstore', kind: 'req', tag: 'MGET u:u_77', ms: 1, title: 'Pocas features', text: 'Solo las de Lucía; las de los videos van en memoria con su vector.' },
        { from: 'fstore', to: 'liviano', kind: 'res', tag: 'sesión de u_77', ms: 1, title: '', text: '' },
        { from: 'liviano', to: 'api', kind: 'res', tag: '500 ids', ms: 6, title: 'Quedan 500', text: '' },
        { from: 'api', to: 'pesado', kind: 'req', tag: 'rank(500, v41)', ms: 1, title: 'Etapa 3: ranking pesado', text: 'El modelo multi-tarea predice siete cosas para cada video y las combina en un puntaje.', why: 'Es la etapa cara: corre en GPU y solo sobre 500, por eso el embudo existe.' },
        { from: 'pesado', to: 'fstore', kind: 'req', tag: 'MGET 500 videos', ms: 1, title: 'Las features de los 500', text: 'Una lectura por lotes: vistas completas, compartidos y "no me interesa" de la última hora de cada video.' },
        { from: 'fstore', to: 'pesado', kind: 'res', tag: '500 × features', ms: 4, title: '', text: '' },
        { from: 'pesado', to: 'api', kind: 'res', tag: '500 con puntaje', ms: 30, title: 'Ordenados', text: 'Cada video con p(verlo entero), p(compartir), p(no me interesa) y su puntaje.', code: '{ "video": "v_9f3c", "p_finish": 0.62, "p_share": 0.03, "p_nmi": 0.01, "score": 0.71 }', lang: 'json' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'rerank(500)', ms: 1, title: 'Etapa 4: re-ranking', text: 'Un video por creador, no más de dos del mismo tema seguidos y un lugar de cada 8 para exploración.' },
        { from: 'rerank', to: 'reglas', kind: 'req', tag: 'eligible(…)', ms: 1, title: 'Solo lo elegible', text: 'Con veredicto de moderación, apto para su edad y de creadores que no ocultó.' },
        { from: 'reglas', to: 'rerank', kind: 'res', tag: 'elegibles', ms: 1, title: '', text: '' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '8 videos', ms: 2, title: 'La página final', text: '' },
        { from: 'api', to: 'lucia', kind: 'res', tag: '200 · 8 videos', ms: 30, title: 'Respuesta', text: 'Ids, URLs de la CDN y el <code>req_id</code> que va a volver en cada evento.' },
        { from: 'api', to: 'eventos', kind: 'async', tag: '8 impresiones', ms: 2, title: 'Las impresiones, sin esperar', text: 'Lo que se mostró, en qué posición y con qué modelo. Sin ellas no hay negativos para entrenar.' },
        { from: 'lucia', to: 'cdn', kind: 'req', tag: 'GET 720p.mp4', ms: 20, title: 'El video, desde la CDN', text: 'La app ya bajó el principio del primero mientras mostraba el anterior.' }
      ]
    },
    {
      id: 'vista', title: 'Ver un video entero',
      goal: 'Cómo una vista completa cambia el feed siguiente en segundos.',
      desc: 'Lucía mira entero un video de cocina de 15 segundos y lo repite. El evento viaja al stream, que actualiza su sesión; la página siguiente trae más cocina.',
      steps: [
        { from: 'lucia', to: 'eventos', kind: 'req', tag: 'view_end 200 %', ms: 40, title: 'La app manda el evento', text: 'Lo vio entero y una vez más: 30 segundos de un video de 15. La repetición es una señal fuerte.', code: '{ "type": "view_end", "video_id": "v_9f3c", "req_id": "r_51", "watched_ms": 30000, "duration_ms": 15000 }', lang: 'json' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'events · u_77', ms: 5, title: 'Al log', text: 'Partición por usuario: los eventos de Lucía quedan en orden.' },
        { from: 'eventos', to: 'lucia', kind: 'res', tag: '202', ms: 30, title: '', text: '' },
        { from: 'kafka', to: 'stream', kind: 'async', tag: 'view_end', ms: 200, title: 'El stream lo lee', text: 'Actualiza dos cosas: la sesión de Lucía y los contadores del video.' },
        { from: 'stream', to: 'fstore', kind: 'req', tag: 'SET u:u_77:session', ms: 3000, title: 'Features nuevas', text: 'La sesión ahora dice "cocina, visto entero y repetido". El video suma una vista completa en su ventana de una hora.', why: 'Con un lote cada hora, el feed tardaría una hora en notar lo que Lucía disfruta ahora. Ver M50.' },
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'La página siguiente', text: 'Pocos segundos después.' },
        { from: 'api', to: 'pesado', kind: 'req', tag: 'rank(500)', ms: 1, title: 'El ranker lee la sesión nueva', text: '' },
        { from: 'pesado', to: 'fstore', kind: 'req', tag: 'MGET', ms: 1, title: '', text: '' },
        { from: 'fstore', to: 'pesado', kind: 'res', tag: 'sesión: cocina', ms: 4, title: 'La feature fresca', text: 'Los videos de cocina suben en p(verlo entero).' },
        { from: 'pesado', to: 'api', kind: 'res', tag: 'cocina arriba', ms: 30, title: '', text: '' },
        { from: 'api', to: 'lucia', kind: 'res', tag: '8 videos, 2 de cocina', ms: 30, title: 'El feed cambió', text: 'El re-ranking deja como máximo dos del mismo tema seguidos: más cocina, pero no solo cocina.' }
      ]
    },
    {
      id: 'nuevo', title: 'Un video nuevo y su primera tanda',
      goal: 'Cómo consigue sus primeras impresiones un video que nadie vio.',
      desc: 'Mara sube un video. Pasa por moderación, entra al índice y a la lista de exploración, recibe una tanda de 300 impresiones y, según cómo le va, una más grande.',
      steps: [
        { from: 'creadora', to: 'subida', kind: 'req', tag: 'POST /v1/videos', ms: 300, title: 'Mara publica', text: 'El archivo ya subió por partes; ahora se crea el video.' },
        { from: 'subida', to: 'moderacion', kind: 'req', tag: 'moderate(v_a771)', ms: 60000, title: 'Transcodificar y revisar', text: 'Se generan las calidades y corren los clasificadores. Este es claro: no necesita revisión humana.', why: 'Revisar antes de la primera impresión: un video que se reparte a miles en minutos no se puede revisar después.' },
        { from: 'moderacion', to: 'reglas', kind: 'req', tag: 'veredicto: ok', ms: 5, title: 'Elegible', text: 'Desde ahora las reglas lo dejan pasar.' },
        { from: 'moderacion', to: 'kafka', kind: 'async', tag: 'video_aprobado', ms: 5, title: 'Al log', text: '' },
        { from: 'kafka', to: 'stream', kind: 'async', tag: 'video_aprobado', ms: 200, title: '', text: '' },
        { from: 'stream', to: 'vector', kind: 'req', tag: 'insert(v_a771)', ms: 2000, title: 'Al índice y a la exploración', text: 'Con un vector de contenido (imagen, audio y texto), porque todavía no hay interacciones. Entra a la lista de exploración con una tanda de 300 impresiones.', why: 'Sin vistas, el filtrado colaborativo no sabe nada del video: el arranque en frío de M44.' },
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'Lucía pide su feed', text: 'Le gusta la cocina, y el video de Mara es de cocina.' },
        { from: 'api', to: 'candidatos', kind: 'req', tag: 'candidates', ms: 1, title: '', text: '' },
        { from: 'candidatos', to: 'vector', kind: 'req', tag: 'fuente: exploración', ms: 1, title: 'La fuente de exploración', text: 'Busca videos de la lista de exploración cerca del vector de Lucía.' },
        { from: 'vector', to: 'candidatos', kind: 'res', tag: 'v_a771', ms: 8, title: '', text: '' },
        { from: 'candidatos', to: 'api', kind: 'res', tag: '5 000 + exploración', ms: 2, title: '', text: '' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'slot de exploración', ms: 1, title: 'Un lugar de cada 8', text: 'El re-ranking pone el video de Mara en el lugar de exploración, aunque el ranker no tenga datos.' },
        { from: 'rerank', to: 'api', kind: 'res', tag: 'v_a771 en el lugar 5', ms: 2, title: '', text: '' },
        { from: 'api', to: 'lucia', kind: 'res', tag: '8 videos', ms: 30, title: '', text: '' },
        { from: 'lucia', to: 'eventos', kind: 'req', tag: 'view_end 100 %', ms: 40, title: 'Lucía lo ve entero', text: 'Una de las 300 impresiones de la tanda.' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'events', ms: 5, title: '', text: '' },
        { from: 'kafka', to: 'stream', kind: 'async', tag: 'view_end', ms: 200, title: '', text: '' },
        { from: 'stream', to: 'fstore', kind: 'req', tag: 'tanda: 186 / 300', ms: 3000, title: 'Se cierra la tanda', text: 'Tras 300 impresiones, 186 vistas completas: 62&#8239;%, por encima del umbral para su duración. Pasa a la tanda de 3 000.', why: 'Las tandas acotan el costo de probar: un video malo gasta 300 impresiones y no 300 000.' }
      ]
    },
    {
      id: 'viral', title: 'Un video viral: la clave caliente',
      goal: 'Qué pasa cuando millones de personas ven el mismo video en una hora.',
      desc: 'Un video pasa de 3 000 a 5 millones de vistas en una hora. Sus contadores se escriben y se leen miles de veces por segundo.',
      steps: [
        { from: 'lucia', to: 'cdn', kind: 'req', tag: 'GET v_beef/720p', ms: 10, title: 'La CDN lo absorbe', text: 'Está en caché en cada PoP: al origen llega un pedido por PoP.' },
        { from: 'lucia', to: 'eventos', kind: 'req', tag: '1 400 view_end/s', ms: 40, title: 'Miles de eventos por segundo', text: '5 millones de vistas en una hora son unos 1 400 eventos por segundo del mismo video.' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'partición por usuario', ms: 5, title: 'Se reparten bien', text: 'Los eventos se particionan por usuario, no por video: no hay una partición caliente en Kafka.' },
        { from: 'kafka', to: 'stream', kind: 'async', tag: 'agregado por 1 s', ms: 1000, title: 'El stream pre-agrega', text: 'Cada tarea suma los eventos del video durante un segundo y escribe una vez.', why: 'Escribir cada evento en la misma clave serían 1 400 incrementos por segundo en un solo nodo del feature store.' },
        { from: 'stream', to: 'fstore', kind: 'req', tag: 'INCRBY v_beef … (1/s por tarea)', ms: 5, title: 'Pocas escrituras', text: 'Con 32 tareas, 32 escrituras por segundo en lugar de 1 400.' },
        { from: 'pesado', to: 'fstore', kind: 'req', tag: 'MGET v_beef × 4 000/s', ms: 1, title: 'La lectura caliente', text: 'El video está entre los candidatos de casi todos: su clave se lee en miles de requests por segundo.' },
        { from: 'fstore', to: 'pesado', kind: 'res', tag: 'caché local 1 s', ms: 1, title: 'Caché local en el ranker', text: 'Cada réplica del ranker guarda un segundo las claves más leídas. Un segundo de atraso no cambia el orden.' }
      ]
    },
    {
      id: 'caida', title: 'Cae el ranking pesado',
      goal: 'El feed sigue respondiendo, peor, y lo marca.',
      desc: 'Un despliegue deja sin memoria las GPUs del ranking pesado. La API no espera: sigue con el orden del liviano.',
      down: ['pesado'],
      steps: [
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'Lucía pide su feed', text: '' },
        { from: 'api', to: 'candidatos', kind: 'req', tag: 'candidates', ms: 1, title: '', text: '' },
        { from: 'candidatos', to: 'api', kind: 'res', tag: '5 000', ms: 25, title: 'Recuperar funciona', text: '' },
        { from: 'api', to: 'liviano', kind: 'req', tag: 'light_rank', ms: 1, title: '', text: '' },
        { from: 'liviano', to: 'api', kind: 'res', tag: '500 ordenados', ms: 8, title: 'El liviano también', text: '' },
        { from: 'api', to: 'pesado', kind: 'fail', tag: 'timeout 50 ms', ms: 50, title: 'El pesado no responde', text: 'La API corta a los 50 ms de su presupuesto. El circuit breaker se abre y las requests siguientes ni lo intentan.', why: 'Esperar el timeout en cada request sumaría 50 ms a todas sin ganar nada. Ver M08.' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'rerank(orden liviano)', ms: 1, title: 'Re-ranking sobre el orden del liviano', text: 'Diversidad, exploración y reglas siguen funcionando.' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '8 videos', ms: 2, title: '', text: '' },
        { from: 'api', to: 'lucia', kind: 'res', tag: '200 · degradado', ms: 30, title: 'Un feed peor, no una pantalla vacía', text: 'Lucía no ve un error. El orden es algo peor: las vistas completas bajan unos puntos mientras dura.' },
        { from: 'api', to: 'eventos', kind: 'async', tag: 'impresiones degraded=true', ms: 2, title: 'Marcado en el log', text: 'Para no entrenar con estas impresiones como si fueran del modelo, y para medir cuánto costó el incidente.' }
      ]
    },
    {
      id: 'canary', title: 'Un modelo nuevo en canary',
      goal: 'Del entrenamiento al tráfico real, de a poco.',
      desc: 'El entrenamiento produce v42. Pasa las métricas offline, va a unas pocas réplicas y a un 1&#8239;% de usuarios, y se compara con v41.',
      steps: [
        { from: 'lake', to: 'train', kind: 'req', tag: 'últimas 6 h', ms: 600000, title: 'Entrenar desde v41', text: 'Impresiones con sus etiquetas: ¿se vio entero?, ¿se compartió?, ¿"no me interesa"?' },
        { from: 'train', to: 'registry', kind: 'req', tag: 'v42 · AUC 0.781', ms: 1000, title: 'Registrar v42', text: 'Con sus métricas offline contra el mismo set de validación que v41. Si empeoran, no avanza.' },
        { from: 'registry', to: 'pesado', kind: 'req', tag: 'deploy v42 → 5 % de réplicas', ms: 60000, title: 'Canary', text: 'Unas pocas réplicas cargan v42. Si su latencia o sus errores suben, se vuelve atrás sin que el experimento empiece.' },
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'Lucía pide su feed', text: '' },
        { from: 'api', to: 'exp', kind: 'req', tag: 'assign(u_77)', ms: 0.5, title: '', text: '' },
        { from: 'exp', to: 'api', kind: 'res', tag: 'ranker v42 (1 %)', ms: 0.5, title: 'Le toca v42', text: 'El 1&#8239;% de los usuarios, por hash, siempre los mismos.' },
        { from: 'api', to: 'pesado', kind: 'req', tag: 'rank(500, v42)', ms: 1, title: '', text: '' },
        { from: 'pesado', to: 'api', kind: 'res', tag: '500 con puntaje', ms: 30, title: '', text: '' },
        { from: 'api', to: 'eventos', kind: 'async', tag: 'impresión model=v42', ms: 2, title: 'El modelo va en la impresión', text: 'Así el análisis separa lo que vio cada grupo.' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'impressions', ms: 5, title: '', text: '' },
        { from: 'kafka', to: 'lake', kind: 'async', tag: 'por hora', ms: 3600000, title: 'El análisis', text: 'Se comparan los dos grupos en vistas completas por sesión, con las métricas de protección de M51: "no me interesa" y arrepentimiento. Ver M49.' }
      ]
    },
    {
      id: 'nmi', title: '"No me interesa"',
      goal: 'Una señal negativa que cambia el feed siguiente.',
      desc: 'Lucía toca "No me interesa" en un video de bromas. El evento llega al stream, que actualiza su sesión; el ranker penaliza el tema y las reglas ocultan al creador.',
      steps: [
        { from: 'lucia', to: 'eventos', kind: 'req', tag: 'not_interested', ms: 40, title: 'Lucía lo toca', text: 'Una señal rara y explícita: vale mucho más que un video saltado.', code: '{ "type": "not_interested", "video_id": "v_77aa", "creator": "c_404", "topic": "bromas" }', lang: 'json' },
        { from: 'eventos', to: 'kafka', kind: 'async', tag: 'events', ms: 5, title: '', text: '' },
        { from: 'kafka', to: 'stream', kind: 'async', tag: 'not_interested', ms: 200, title: '', text: '' },
        { from: 'stream', to: 'fstore', kind: 'req', tag: 'u_77: −bromas, oculta c_404', ms: 3000, title: 'La sesión aprende', text: 'Baja el interés en el tema y agrega el creador a la lista de ocultos por 30 días.' },
        { from: 'lucia', to: 'api', kind: 'req', tag: 'GET /v1/feed', ms: 30, title: 'La página siguiente', text: '' },
        { from: 'api', to: 'pesado', kind: 'req', tag: 'rank(500)', ms: 1, title: '', text: '' },
        { from: 'pesado', to: 'fstore', kind: 'req', tag: 'MGET', ms: 1, title: '', text: '' },
        { from: 'fstore', to: 'pesado', kind: 'res', tag: '−bromas', ms: 4, title: 'Penaliza el tema', text: 'El puntaje resta 3 × p(no me interesa), y esa probabilidad subió para los videos de bromas.' },
        { from: 'pesado', to: 'api', kind: 'res', tag: '500 con puntaje', ms: 30, title: '', text: '' },
        { from: 'api', to: 'rerank', kind: 'req', tag: 'rerank', ms: 1, title: '', text: '' },
        { from: 'rerank', to: 'reglas', kind: 'req', tag: 'eligible(u_77, …)', ms: 1, title: 'Las reglas ocultan al creador', text: 'Ningún video de c_404 por 30 días, aunque puntúe alto.' },
        { from: 'reglas', to: 'rerank', kind: 'res', tag: 'sin c_404', ms: 1, title: '', text: '' },
        { from: 'rerank', to: 'api', kind: 'res', tag: '8 videos', ms: 2, title: '', text: '' },
        { from: 'api', to: 'lucia', kind: 'res', tag: 'sin bromas', ms: 30, title: 'Se nota en la página siguiente', text: 'Un control que cambia algo de verdad, y se ve que lo cambió (M51).' }
      ]
    }
  ]
});
