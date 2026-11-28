/* Aplicación de conocimiento: índice de mini-proyectos (proyectos.html) y ruta de las guías (proyectos/).
   tier: 'core' (núcleo) | 'extra' (ampliación).
   status: 'proposed' (sin guía) | 'ready' (guía publicada en href).
   repo: el enlace a tu repositorio del proyecto, una vez publicado. Si está vacío, la guía acepta el enlace
     guardado en el navegador. Un proyecto se marca como terminado con el enlace y su lista de comprobación completa.
   repoName: el nombre sugerido para el repositorio. mods: ids de course.data.js.
   Cada proyecto se construye solo, sin código de otro; "Cómo conectar", al final de cada guía, solo nombra
   proyectos anteriores en esta lista.
   aiTracks: los tutoriales de AI Engineering, una serie aparte (al final del archivo). */
window.SD = window.SD || {};
SD.data = SD.data || {};
SD.data.projects = {
  blocks: [
    { id: 'b1', name: 'Bloque 1', items: ['a00', 'a01', 'a02', 'a03', 'a04'], note: 'El laboratorio, Nginx, la API, la caché y las réplicas.' },
    { id: 'b2', name: 'Bloque 2', items: ['a05', 'a06', 'a07', 'a29'], note: 'Dos primarios, sharding, Kubernetes con k3s y un servidor seguro de una VM a una VPC.' },
    { id: 'b3', name: 'Bloque 3', items: ['a08', 'a09', 'a10', 'a11', 'a12'], note: 'Líder, colas, resiliencia, archivos y sesiones.' },
    { id: 'b4', name: 'Bloque 4', items: ['a13', 'a14', 'a15', 'a27', 'a28', 'a16', 'a17'], note: 'OAuth, observabilidad, pagos idempotentes, cien asientos (dos veces), búsqueda y geografía.' },
    { id: 'b5', name: 'Bloque 5', items: ['a18', 'a19', 'a20', 'a21', 'a22'], note: 'Kafka, entrega continua y el ChatGPT en una CPU.' },
    { id: 'b6', name: 'Bloque 6', items: ['c1', 'c2'], note: 'Los dos sistemas completos, cada uno en su repositorio.' }
  ],

  tracks: [
    {
      id: 'base', label: 'Base', title: 'El laboratorio', line: '--label-3',
      intro: 'Las piezas y convenciones que repite cada proyecto. No explica cómo crear un proyecto de Spring: fija las versiones, la base de datos y la forma de medir.',
      items: [
        { id: 'a00', num: 'A00', title: 'El laboratorio común', tier: 'core', status: 'ready', href: 'proyectos/a00-laboratorio.html', repo: 'https://github.com/oskarcj4/ia-system-proyect-a00', repoName: 'a00-laboratorio', mods: ['m00', 'm05'], front: false,
          excuse: 'Una API de notas, la más chica posible, para fijar lo que repiten todos los proyectos.',
          learn: 'Una API en capas (controlador, servicio, repositorio) con Java 21, Spring Boot 4 y JPA; PostgreSQL 17 detrás de PgBouncer en un compose; qué rompe el modo transacción de PgBouncer (SET que se filtran, advisory locks de sesión y prepared statements), medido; Flyway directo a PostgreSQL; pruebas con Testcontainers; un workflow de GitHub Actions; y Gatling con una assertion sobre el p99.',
          stack: ['Docker Compose', 'PostgreSQL 17', 'PgBouncer', 'Spring Data JPA', 'Testcontainers', 'GitHub Actions', 'Gatling'] }
      ]
    },
    {
      id: 'f', label: 'Parte I', title: 'Fundamentos, construidos', line: '--line-p1',
      intro: 'Un proyecto por concepto clave de M01 a M11. Empiezan en Docker Compose y pasan a Kubernetes con k3s cuando el concepto lo pide.',
      items: [
        { id: 'a01', num: 'A01', title: 'Detrás de Nginx', tier: 'core', status: 'ready', href: 'proyectos/a01-nginx.html', repo: '', repoName: 'a01-nginx', mods: ['m01', 'm03'], front: false,
          excuse: 'Un acortador de enlaces con tres réplicas, una de ellas lenta a propósito.',
          learn: 'Reverse proxy con TLS local y HTTP/2, keepalive y timeouts hacia el upstream, cabeceras X-Forwarded-*, round robin contra least_conn con una réplica lenta, fallas pasivas con max_fails y una zona compartida entre workers, reintento en otra réplica y límite de tasa con limit_req. Mides el p99 de cada algoritmo con Gatling.',
          stack: ['Nginx', 'Spring Boot × 3', 'PostgreSQL + PgBouncer', 'Gatling'] },
        { id: 'a02', num: 'A02', title: 'Una API que no se rompe', tier: 'core', status: 'ready', href: 'proyectos/a02-api.html', repo: '', repoName: 'a02-api', mods: ['m02'], front: false,
          excuse: 'El catálogo de una librería con un millón de libros.',
          learn: 'Paginación por cursor contra OFFSET, medida con EXPLAIN ANALYZE; ETag e If-None-Match (304); If-Match para concurrencia optimista (428 y 412); errores con ProblemDetail (RFC 9457); versionado por cabecera con Spring 7, con Deprecation y Sunset; y el contrato en OpenAPI.',
          stack: ['PostgreSQL + PgBouncer', 'springdoc-openapi'] },
        { id: 'a03', num: 'A03', title: 'Caché que aguanta un pico', tier: 'core', status: 'ready', href: 'proyectos/a03-cache.html', repo: '', repoName: 'a03-cache', mods: ['m04'], front: false,
          excuse: 'Una tienda en su día de ofertas: diez productos se llevan ocho de cada diez visitas.',
          learn: 'Cache-aside en dos niveles escrito a mano (Caffeine en cada réplica y Redis compartido), TTL con jitter, cache stampede con un lock SET NX y servir lo vencido, invalidación por Redis Pub/Sub, write-through del precio, y write-behind del contador de visitas, que llega a PostgreSQL en lotes idempotentes aunque la app se caiga a mitad.',
          stack: ['Redis', 'Caffeine', 'PostgreSQL + PgBouncer', 'Gatling'] },
        { id: 'a04', num: 'A04', title: 'Primario y réplicas', tier: 'core', status: 'ready', href: 'proyectos/a04-replicas.html', repo: '', repoName: 'a04-replicas', mods: ['m05'], front: false,
          excuse: 'Una red de bibliotecas: muchas consultas y pocos préstamos.',
          learn: 'Replicación por streaming del WAL con slots, un PgBouncer para escribir y otro para leer, LazyConnectionDataSourceProxy con @Transactional(readOnly = true), el lag que te muestra datos viejos y cómo leer lo que escribiste con el LSN, réplica síncrona contra asíncrona (FIRST contra ANY), la promoción manual con pg_promote() y cómo volver a sumar al viejo primario como réplica con pg_rewind.',
          stack: ['PostgreSQL × 3', 'PgBouncer × 2', 'Docker Compose', 'Gatling'] },
        { id: 'a05', num: 'A05', title: 'Dos primarios', tier: 'core', status: 'ready', href: 'proyectos/a05-dos-primarios.html', repo: '', repoName: 'a05-dos-primarios', mods: ['m05', 'm06'], front: false,
          excuse: 'El inventario de dos sucursales que venden cada una por su lado.',
          learn: 'Replicación lógica en las dos direcciones con origin = none (multi-master), los conflictos que provocas a propósito y cómo los cuenta pg_stat_subscription_stats, la replicación trabada por un choque de clave y ALTER SUBSCRIPTION SKIP, y cómo evitarlos por diseño: cada fila con una sucursal dueña, UUIDv7, transferencias con recibo idempotente y un solo dueño del catálogo.',
          stack: ['PostgreSQL × 2', 'Replicación lógica', 'Testcontainers'] },
        { id: 'a06', num: 'A06', title: 'Repartir los datos', tier: 'core', status: 'ready', href: 'proyectos/a06-sharding.html', repo: '', repoName: 'a06-sharding', mods: ['m05', 'm06'], front: false,
          excuse: 'Los pedidos de una tienda en línea, repartidos por cliente.',
          learn: 'Particiones mensuales con poda por id gracias a UUIDv7, borrar un mes con DETACH en vez de DELETE, sharding en la aplicación con hashing consistente y nodos virtuales, un pool por shard, pasar de dos a tres shards en vivo con doble escritura, backfill y verificación, y consultas que cruzan shards con un plazo y resultados parciales.',
          stack: ['PostgreSQL × 3', 'Hashing consistente', 'Gatling'] },
        { id: 'a07', num: 'A07', title: 'Kubernetes para sistemas distribuidos', tier: 'core', status: 'ready', href: 'proyectos/a07-kubernetes.html', repo: '', repoName: 'a07-kubernetes', mods: ['m03', 'm05', 'm08'], front: false,
          excuse: 'Un servicio de cuentas y sesiones que no puede cortarse cuando lo despliegas.',
          learn: 'Un clúster k3s de tres nodos dentro de Docker con registro local, Deployments y Services, la entrada con Gateway API sobre Traefik, probes y apagado ordenado para desplegar sin errores, HPA, PodDisruptionBudget, y PostgreSQL con CloudNativePG: primario, réplica, failover automático y PgBouncer como Pooler, con los timeouts que acortan el corte.',
          stack: ['k3s', 'Gateway API (Traefik)', 'CloudNativePG', 'PgBouncer', 'Gatling'] },
        { id: 'a08', num: 'A08', title: 'Un solo líder', tier: 'core', status: 'ready', href: 'proyectos/a08-lider.html', repo: '', repoName: 'a08-lider', mods: ['m06', 'm07'], front: false,
          excuse: 'Recordatorios que nunca salen dos veces y nunca se pierden.',
          learn: 'Elección de líder entre tres réplicas con un Lease de Kubernetes y el LeaderElector de fabric8, con permisos mínimos; relevo ordenado contra caída, medidos segundo a segundo; un líder congelado con kill -STOP que despierta creyéndose líder y manda duplicados y cancelados; un proveedor de mentira que comprueba el fencing token y la Idempotency-Key; y ShedLock como alternativa, con su límite.',
          stack: ['k3s', 'Lease (fabric8)', 'CloudNativePG', 'ShedLock'] },
        { id: 'a09', num: 'A09', title: 'Colas y pub/sub', tier: 'core', status: 'ready', href: 'proyectos/a09-colas.html', repo: '', repoName: 'a09-colas', mods: ['m07'], front: false,
          excuse: 'Una tienda que confirma cada pedido por correo: ni cero correos, ni dos.',
          learn: 'Outbox transaccional en PostgreSQL con un relay que reparte el trabajo con SKIP LOCKED, Redis Streams con un grupo de consumo, XACK después del correo, XPENDING y XCLAIM para lo que quedó colgado, una cola de mensajes muertos y un consumidor idempotente. Caídas provocadas en cada punto del camino, rechazos SMTP al azar, lag, backpressure y un recorte que nadie nota; y Redis Pub/Sub, que entrega a todos o a nadie. Los correos llegan a Mailpit.',
          stack: ['Redis Streams', 'PostgreSQL + PgBouncer', 'Mailpit'] },
        { id: 'a10', num: 'A10', title: 'Cuando Redis se cae', tier: 'core', status: 'ready', href: 'proyectos/a10-circuit-breaker.html', repo: '', repoName: 'a10-circuit-breaker', mods: ['m04', 'm05', 'm08'], front: false,
          excuse: 'Un catálogo con caché en Redis, al que se le apaga el nodo de Redis en plena carga.',
          learn: 'Cache-aside en dos niveles con Caffeine y Redis, y la misma falla con cinco defensas que se suman: timeouts cortos, un circuit breaker de Resilience4j que tira la conexión colgada, una compuerta que rechaza con 503 lo que la base no puede atender, y la copia local vieja. Después, un master, una réplica y tres Sentinels: el failover planeado, el nodo apagado y el nodo congelado. Todo en k3s, con k6 adentro del clúster a 30 requests por segundo. En la parte 3, sin caché: un gateway con token bucket en Lua y dos servicios, uno que se rompe y otro que se defiende con deadlines propagados hasta la base, reintentos con jitter y presupuesto, breaker, bulkheads y la vuelta en frío con calentamiento y rampa.',
          stack: ['Redis + Sentinel', 'Caffeine', 'Resilience4j', 'PostgreSQL + PgBouncer', 'Lua', 'k3s', 'k6'] },
        { id: 'a11', num: 'A11', title: 'Archivos y URLs firmadas', tier: 'core', status: 'ready', href: 'proyectos/a11-album.html', repo: '', repoName: 'a11-album', mods: ['m09'], front: true,
          excuse: 'Un álbum de fotos compartido.',
          learn: 'Un almacén local que solo obedece URLs firmadas con tu propio HMAC (método, tipo, tamaño y vencimiento dentro de la firma, comparación en tiempo constante y rotación de claves), subida directa desde el navegador con su preflight de CORS, una confirmación que no le cree al navegador, videos de 2 GiB en partes que se retoman, miniaturas en un worker con lease que no muere por una bomba de descompresión, URLs de lectura que el navegador puede cachear, la limpieza de lo que deja cada falla, y lo mismo sobre Cloudflare R2 con el S3Presigner del AWS SDK.',
          stack: ['Cloudflare R2', 'Disco local', 'PostgreSQL + PgBouncer'] },
        { id: 'a12', num: 'A12', title: 'Sesiones, cookies y CSRF', tier: 'core', status: 'ready', href: 'proyectos/a12-sesiones.html', repo: '', repoName: 'a12-sesiones', mods: ['m10'], front: true,
          excuse: 'El panel de administración de una tienda.',
          learn: 'Qué manda el navegador en cada request (cookies, Origin y cabeceras), sesión en el servidor con Spring Session y Redis contra JWT, los atributos HttpOnly, Secure y SameSite, CSRF y CORS con Spring Security, y cerrar la sesión en todos los dispositivos.',
          stack: ['Spring Security', 'Spring Session', 'Redis', 'Nginx'] },
        { id: 'a13', num: 'A13', title: 'OAuth 2 y OIDC con un servidor en Workers', tier: 'core', status: 'ready', href: 'proyectos/a13-oauth.html', repo: '', repoName: 'a13-oauth', mods: ['m10'], front: true,
          excuse: 'Un inicio de sesión único para varias aplicaciones.',
          learn: 'El servidor de autorización en TypeScript sobre Cloudflare Workers, un IdP local con usuarios sembrados: Authorization Code con PKCE, access tokens JWT firmados con ES256, refresh tokens que rotan con detección de reuso guardados en D1, JWKS y rotación de claves. Del lado de Java, Spring Boot como resource server con scopes y Spring Cloud Gateway como BFF: el token nunca llega al JavaScript del navegador.',
          stack: ['Cloudflare Workers (TypeScript)', 'D1', 'Spring Cloud Gateway', 'Spring Security'] },
        { id: 'a14', num: 'A14', title: 'Observabilidad de un backend y su base', tier: 'core', status: 'ready', href: 'proyectos/a14-observabilidad.html', repo: '', repoName: 'a14-observabilidad', mods: ['m11', 'm05'], front: true,
          excuse: 'Encontrar por qué una API se volvió lenta un martes a las once.',
          learn: 'Traces con OpenTelemetry de la API a PgBouncer, PostgreSQL y Redis, métricas RED y USE, logs con trace_id, los exporters de PostgreSQL, PgBouncer y Redis, la consulta lenta en pg_stat_statements, y un SLO con alertas por burn rate.',
          stack: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Tempo', 'Loki'] },
        { id: 'a15', num: 'A15', title: 'Idempotencia de punta a punta', tier: 'core', status: 'ready', href: 'proyectos/a15-pagos.html', repo: '', repoName: 'a15-pagos', mods: ['m02', 'm27'], front: true,
          excuse: 'Un botón de pagar.',
          learn: 'El doble clic y los reintentos del navegador, una Idempotency-Key que genera el navegador y conserva para reintentar, la tabla de claves con restricción única y la huella del body (422 si cambia, 409 si sigue en curso), guardar y repetir la respuesta, vencer las claves a las 24 h, y por qué un advisory lock de sesión no sirve detrás de PgBouncer en modo transacción. Encima, el pago real con Stripe Checkout en modo de prueba: un endpoint partido en fases con claves deterministas hacia Stripe, webhooks firmados guardados en una inbox, y el reembolso que pide el cliente, con sus fallas asíncronas.',
          stack: ['Stripe (modo de prueba)', 'Stripe CLI', 'PostgreSQL + PgBouncer', 'Redis'] },
        { id: 'a27', num: 'A27', title: 'Cien asientos con locks pesimistas', tier: 'core', status: 'ready', href: 'proyectos/a27-cine.html', repo: '', repoName: 'a27-cine', mods: ['m05', 'm27', 'm17'], front: true,
          excuse: 'La taquilla de un cine: reserva de 30 s y checkout de 3 min.',
          learn: 'SELECT … FOR UPDATE NOWAIT para que dos personas no tomen el mismo asiento, holds con vencimiento que todos ven apartados, la toma de un hold vencido, un barrido con SKIP LOCKED que cancela el PaymentIntent antes de liberar, la prórroga única cuando el banco pide 3D Secure y cómo maneja el navegador cada error del pago, el código de cada boleto, y el mapa en vivo por SSE con Redis Pub/Sub.',
          stack: ['Stripe (modo de prueba)', 'Stripe CLI', 'PostgreSQL + PgBouncer', 'Redis Pub/Sub', 'SSE'] },
        { id: 'a28', num: 'A28', title: 'Cien asientos con la base como árbitro', tier: 'core', status: 'ready', href: 'proyectos/a28-cine.html', repo: '', repoName: 'a28-cine', mods: ['m05', 'm27', 'm17'], front: true,
          excuse: 'La misma taquilla, sin barrido obligatorio y sin reembolsos por tiempo.',
          learn: 'Cada apartado como un rango de tiempo y una exclusion constraint con btree_gist que prohíbe que dos se pisen, vencimientos que no escriben nada, autorizar y capturar con capture_method=manual, cancelar la retención cuando el asiento se perdió, la prórroga de 3D Secure por adelantado, y la comparación con A27 con el worker apagado.',
          stack: ['Stripe (modo de prueba)', 'Stripe CLI', 'PostgreSQL + PgBouncer', 'btree_gist', 'Redis Pub/Sub', 'SSE'] },
        { id: 'a16', num: 'A16', title: 'Búsqueda', tier: 'core', status: 'proposed', repo: '', mods: ['m05', 'm30'], front: false,
          excuse: 'Un buscador de recetas.',
          learn: 'Primero lo que alcanza con PostgreSQL (tsvector, GIN y pg_trgm); después Elasticsearch alimentado por un outbox, un analizador para español, autocompletado, ajuste de relevancia y reindexar sin cortes con alias.',
          stack: ['Elasticsearch', 'PostgreSQL + PgBouncer'] },
        { id: 'a17', num: 'A17', title: 'Lo que está cerca', tier: 'core', status: 'proposed', repo: '', mods: ['m04', 'm05'], front: false,
          excuse: 'Repartidores cerca de ti.',
          learn: 'PostGIS con geography e índice GiST, los k más cercanos con el operador <->, ST_DWithin para radios y geocercas con ST_Contains. Las posiciones que cambian cada pocos segundos van a Redis GEO; las que hay que guardar llegan a PostgreSQL en lotes.',
          stack: ['PostGIS', 'PgBouncer', 'Redis GEO'] },
        { id: 'a18', num: 'A18', title: 'Kafka con reintentos y DLQ', tier: 'core', status: 'proposed', repo: '', mods: ['m07'], front: false,
          excuse: 'Los cobros mensuales de un servicio de suscripción, sobre un log.',
          learn: 'Particiones y orden por clave, consumer groups y rebalanceo, lag, retención y reprocesar desde un offset, el productor idempotente, reintentos con backoff en topics de reintento, una DLQ para los mensajes que no se pueden procesar y cómo reinyectarlos, y un consumidor idempotente con una tabla de procesados.',
          stack: ['Kafka (KRaft)', 'Spring for Apache Kafka', 'PostgreSQL + PgBouncer'] },
        { id: 'a19', num: 'A19', title: 'Del commit al clúster', tier: 'core', status: 'proposed', repo: '', mods: [], front: false,
          excuse: 'Que cada push llegue solo al clúster.',
          learn: 'GitHub Actions con pruebas en Testcontainers, una imagen por capas publicada en GHCR, escaneo con Trivy, y despliegue GitOps con Argo CD dentro de un clúster k3s local, sin abrirlo a internet.',
          stack: ['GitHub Actions', 'GHCR', 'Trivy', 'Argo CD', 'k3s'] }
      ]
    },
    {
      id: 'ia', label: 'Parte II', title: 'Un ChatGPT en una sola CPU', line: '--line-p2',
      intro: 'Un modelo chico servido con Ollama en una CPU. Va a ser lento, y eso es parte de la lección: los mismos cuellos de botella que M12 a M20 miden en GPUs, a escala de una computadora.',
      items: [
        { id: 'a20', num: 'A20', title: 'Banco de inferencia en una CPU', tier: 'core', status: 'proposed', repo: '', mods: ['m12', 'm13', 'm14', 'm15'], front: false,
          excuse: '¿Cuánto aguanta tu computadora?',
          learn: 'Ollama en Docker y Spring AI; tiempo al primer token y tokens por segundo; prefill contra decode con prompts largos; el mismo modelo en q4_K_M y q8_0; concurrencia con OLLAMA_NUM_PARALLEL (throughput contra latencia); y el cold start al cargar un modelo. Con modelos de 0.5 a 3 mil millones de parámetros; la tabla de resultados la llenas con tu hardware.',
          stack: ['Ollama', 'Spring AI', 'Gatling'] },
        { id: 'a21', num: 'A21', title: 'Conversación y streaming', tier: 'core', status: 'proposed', repo: '', mods: ['m16', 'm17', 'm20'], front: true,
          excuse: 'Un chat propio con un modelo chico.',
          learn: 'Conversaciones y mensajes en PostgreSQL, SSE de punta a punta a través de Spring Cloud Gateway y Nginx sin buffering, cancelar la generación cuando el cliente se va, una ventana deslizante con resumen para el contexto, y títulos generados en segundo plano.',
          stack: ['Ollama', 'Spring AI', 'PostgreSQL + PgBouncer', 'Spring Cloud Gateway', 'Nginx'] },
        { id: 'a22', num: 'A22', title: 'Cuotas, cola y router', tier: 'core', status: 'proposed', repo: '', mods: ['m18', 'm19', 'm20'], front: true,
          excuse: 'Diez personas comparten la misma CPU.',
          learn: 'Cuotas por tokens que se reservan y se reconcilian en Redis con Lua, una generación a la vez con una cola que muestra tu posición, 429 con Retry-After, y un router entre un modelo chico y uno mediano según el largo del prompt.',
          stack: ['Ollama', 'Redis', 'Spring Cloud Gateway', 'Prometheus'] }
      ]
    },
    {
      id: 'casos', label: 'Parte III', title: 'Casos de estudio, en chico', line: '--line-p3',
      intro: 'Versiones reducidas de los casos del curso. Son ampliaciones: se escriben después de los sistemas completos, si quieres más.',
      items: [
        { id: 'a23', num: 'A23', title: 'Mini WhatsApp', tier: 'extra', status: 'proposed', repo: '', mods: ['m29'], front: true,
          excuse: 'Un chat entre amigos con confirmaciones de entrega.',
          learn: 'WebSocket en varios pods, un registro de sesiones en Redis para saber en qué pod está cada persona, buzón para quien no está conectado, confirmaciones de enviado, entregado y leído, presencia con TTL y la tormenta de reconexión al reiniciar un pod.',
          stack: ['Spring WebSocket', 'Redis', 'PostgreSQL + PgBouncer', 'k3s'] },
        { id: 'a24', num: 'A24', title: 'Mini Twitter', tier: 'extra', status: 'proposed', repo: '', mods: ['m30'], front: false,
          excuse: 'Un timeline para cien cuentas y una famosa.',
          learn: 'Ids Snowflake, fan-out en escritura a timelines en Redis, el caso híbrido para la cuenta famosa y contadores con write-behind.',
          stack: ['Redis', 'Redis Streams', 'PostgreSQL + PgBouncer'] },
        { id: 'a25', num: 'A25', title: 'Mini Docs', tier: 'extra', status: 'proposed', repo: '', mods: ['m31'], front: true,
          excuse: 'Un editor de texto para dos personas a la vez.',
          learn: 'La función transform de OT llevada a Java, un dueño por documento con lease y época, el log de revisiones con escritura condicional, snapshots en R2 y los cursores de los demás por WebSocket.',
          stack: ['Spring WebSocket', 'PostgreSQL + PgBouncer', 'Redis', 'Cloudflare R2', 'k3s'] },
        { id: 'a26', num: 'A26', title: 'CDN casero', tier: 'extra', status: 'proposed', repo: '', mods: ['m28'], front: false,
          excuse: 'Servir las imágenes de una galería desde cerca.',
          learn: 'proxy_cache de Nginx con claves, stale-while-revalidate y purga, Cache-Control y ETag bien puestos, y un Worker con la Cache API delante de tu origen.',
          stack: ['Nginx', 'Cloudflare Workers', 'Cloudflare R2'] }
      ]
    },
    {
      id: 'seg', label: 'Parte IV', title: 'Seguridad, construida', line: '--line-p4',
      intro: 'Las defensas de la Parte IV puestas en un servidor de verdad, y separadas en capas cuando hace falta escalar.',
      items: [
        { id: 'a29', num: 'A29', title: 'Un servidor seguro: de una VM a una VPC', tier: 'core', status: 'ready', href: 'proyectos/a29-servidor-seguro.html', repo: '', repoName: 'a29-servidor-seguro', mods: ['m32', 'm33', 'm35', 'm37', 'm57'], front: true,
          excuse: 'Una API de notas privadas con cada defensa puesta, primero en una VM y después repartida.',
          learn: 'SSH solo con llave, nftables con entrada y salida filtradas por usuario, fail2ban, auditd y un sandbox de systemd; Nginx con TLS, ModSecurity y el OWASP CRS, límites y lista blanca de rutas; dos roles de PostgreSQL y migraciones aparte; el bloqueo de cuenta atómico frente a 50 hilos; cinco VMs en tres redes con keepalived y una IP virtual; y k3s con Pod Security restricted, NetworkPolicy por flecha y un HPA por capa.',
          stack: ['Vagrant', 'nftables', 'ModSecurity + CRS', 'keepalived', 'k3s', 'Gatling'] }
      ]
    }
  ],

  capstones: [
    { id: 'c1', num: 'C1', title: 'Pagos distribuidos', status: 'proposed', repo: '', mods: ['m27', 'cpa'],
      excuse: 'Una pasarela de pagos para tiendas, en chico.',
      learn: 'Cada pago como máquina de estados, un ledger de doble entrada que siempre suma cero, webhooks firmados con HMAC y reintentos, conciliación diaria, y lecturas desde réplicas sin romper leer lo que escribiste. Es el sistema que junta las bases de datos distribuidas con la idempotencia.',
      uses: ['a04', 'a07', 'a15', 'a18', 'a10', 'a13', 'a14', 'a19'] },
    { id: 'c2', num: 'C2', title: 'Pedidos a domicilio', status: 'proposed', repo: '', mods: ['m04', 'm07', 'm29'],
      excuse: 'Una app de comida para un barrio.',
      learn: 'Catálogo con búsqueda y caché, fotos con URLs firmadas, pago idempotente, asignar el repartidor libre más cercano sin asignarlo dos veces, seguimiento en vivo por WebSocket con Pub/Sub entre pods, y avisos por cola.',
      uses: ['a03', 'a11', 'a15', 'a16', 'a17', 'a09', 'a07', 'a14'] }
  ],

  /* Tutoriales de AI Engineering (sección #ia-engineering de proyectos.html): otra serie, en Python.
     Misma forma que tracks; la ruta y el anterior/siguiente de sus guías se quedan dentro de la serie. */
  aiTracks: [
    {
      id: 'ia', label: 'AI Engineering', title: 'Agentes, evals y RAG', line: '--line-p2',
      intro: 'Sistemas con modelos de lenguaje, en Python, con un modelo por API (Claude) y uno local (Ollama) a la par. Cada guía construye algo que se rompe de verdad y lo comprueba con pruebas y evals.',
      items: [
        { id: 'ia00', num: 'IA00', title: 'El laboratorio de IA', tier: 'core', status: 'ready', href: 'proyectos/ia00-laboratorio.html', repo: '', repoName: 'ia00-laboratorio', mods: ['m25', 'm22'], front: false,
          excuse: 'Antes del primer agente de verdad, el laboratorio donde vas a trabajar toda la serie.',
          learn: 'uv, Docker Compose y Ollama desde cero, y un agente pequeño que consulta el stock de un almacén: el mismo código con Claude y con qwen3:8b, el bucle escrito a mano y después como grafo de LangGraph, una reposición que se propone, se aprueba con interrupt y se aplica una sola vez, permisos puestos en la base, pruebas con un modelo falso y evals con pass^k.',
          stack: ['Python 3.13', 'uv', 'LangGraph', 'Claude', 'Ollama', 'PostgreSQL'] },
        { id: 'ia01', num: 'IA01', title: 'Un agente de guardia', tier: 'core', status: 'ready', href: 'proyectos/ia01-agente-guardia.html', repo: '', repoName: 'ia01-agente-guardia', mods: ['m25', 'm22', 'm11'], front: false,
          excuse: 'Son las 3 de la mañana y la tienda se rompe. El agente investiga antes de despertarte.',
          learn: 'Un grafo de LangGraph: triage con salida estructurada, un bucle con herramientas de solo lectura (métricas de Prometheus, logs, runbooks con RAG en pgvector y SQL con un rol de solo lectura), presupuesto de pasos y de tokens en el estado, aprobación humana con interrupt antes de cambiar un flag o cancelar una consulta, checkpoints en PostgreSQL que sobreviven a un kill -9, y un informe final. El mismo agente con Claude y con un modelo local en Ollama, evals de tres incidentes con pass^k y una línea de log envenenada.',
          stack: ['Python 3.13', 'LangGraph', 'Claude', 'Ollama', 'PostgreSQL + pgvector', 'Prometheus', 'Phoenix'] },
        { id: 'ia02', num: 'IA02', title: 'Un analista de datos', tier: 'core', status: 'ready', href: 'proyectos/ia02-analista.html', repo: '', repoName: 'ia02-analista', mods: ['m25', 'm20', 'm05', 'm10'], front: false,
          excuse: 'Preguntas de negocio, en español, contra la base de una tienda, con cada cifra auditable.',
          learn: 'Un grafo de LangGraph que entiende la pregunta y se detiene con interrupt a aclararla si es ambigua, escribe SQL con un rol de PostgreSQL de solo lectura (plazo, tope de filas y de conexiones), corre Python en un contenedor de Docker sin red, de solo lectura y con topes de memoria, CPU, procesos y tiempo, y entrega un informe donde cada número cita su consulta, fila y columna. Un verificador escrito en código vuelve a correr cada consulta antes de entregar. Una API con FastAPI, pruebas con un modelo falso, un script que prueba cada barrera, un producto envenenado y evals de doce preguntas con pass^k, con Claude y con Ollama.',
          stack: ['Python 3.13', 'LangGraph', 'Claude', 'Ollama', 'PostgreSQL', 'Docker como sandbox', 'pandas', 'FastAPI', 'Phoenix'] },
        { id: 'ia03', num: 'IA03', title: 'Soporte que reembolsa', tier: 'core', status: 'ready', href: 'proyectos/ia03-soporte.html', repo: '', repoName: 'ia03-soporte', mods: ['m25', 'm22', 'm27', 'm10'], front: false,
          excuse: 'El agente del ejercicio de M25, construido.',
          learn: 'Un clasificador que manda lo conocido a workflows y lo abierto al agente, pedidos leídos con row-level security, una política de reembolsos escrita en código con aprobación sobre 50 USD, pagos con idempotency key contra un proveedor que falla a propósito, y clientes simulados para evals con pass^k.',
          stack: ['Python 3.13', 'LangGraph', 'Claude', 'Ollama', 'PostgreSQL con RLS', 'pgvector', 'FastAPI', 'Phoenix'] },
        { id: 'ia04', num: 'IA04', title: 'Revisor de pull requests por MCP', tier: 'core', status: 'ready', href: 'proyectos/ia04-revisor.html', repo: '', repoName: 'ia04-revisor', mods: ['m25', 'm10', 'm67', 'm71'], front: false,
          excuse: 'Un revisor que comenta tus pull requests.',
          learn: 'Un servidor MCP propio por Streamable HTTP con OAuth, que verifica la audiencia y el scope de cada token, lee una forja local con un token de solo lectura y deja comentarios en una cola que una persona aprueba antes de publicarlos, con la regla de dos frente a tres pull requests envenenados.',
          stack: ['Python 3.13', 'SDK de MCP para Python', 'OAuth y JWT', 'Forgejo', 'LangGraph', 'Claude', 'Ollama', 'PostgreSQL'] },
        { id: 'ia05', num: 'IA05', title: 'Preguntas a la documentación, con evals', tier: 'core', status: 'ready', href: 'proyectos/ia05-docs.html', repo: '', repoName: 'ia05-docs', mods: ['m16', 'm22', 'm17'], front: false,
          excuse: 'Preguntas sobre las páginas de este curso, con citas que se comprueban.',
          learn: 'Troceado por sección y fijo, embeddings locales en pgvector con HNSW, búsqueda por palabras en español, fusión con RRF, re-ranking opcional, respuestas con citas verificadas sin modelo, y evals en dos capas: la búsqueda sin tokens y la respuesta con un juez calibrado con el kappa de Cohen.',
          stack: ['Python 3.13', 'PostgreSQL + pgvector', 'Ollama', 'Claude', 'FastAPI', 'pytest'] },
        { id: 'ia06', num: 'IA06', title: 'Un agente de voz', tier: 'extra', status: 'ready', href: 'proyectos/ia06-voz.html', repo: '', repoName: 'ia06-voz', mods: ['m24', 'm25'], front: false,
          excuse: 'Una línea que agenda citas por teléfono.',
          learn: 'STT, modelo y TTS en streaming, fin de turno, interrupciones con truncado, herramientas con aprobación y el presupuesto de latencia medido de punta a punta.',
          stack: ['Python 3.13', 'Pipecat', 'WebRTC', 'Whisper', 'Piper', 'Claude', 'Ollama', 'PostgreSQL', 'pytest'] },
        { id: 'ia07', num: 'IA07', title: 'Tu propio harness', tier: 'core', status: 'ready', href: 'proyectos/ia07-harness.html', repo: '', repoName: 'ia07-harness', mods: ['m62', 'm25'], front: false,
          excuse: 'Las 40 líneas de M62, convertidas en un harness de verdad.',
          learn: 'Herramientas para leer y editar por reemplazo exacto, permisos allow, ask y deny, recorte y compactación del contexto, los dos dialectos de API y todo dentro de un contenedor; probado con un modelo falso y medido con Claude y con un modelo de Ollama.',
          stack: ['Python 3.13', 'uv', 'Claude', 'Ollama', 'Docker', 'pytest'] },
        { id: 'ia08', num: 'IA08', title: 'Un mini-DeepSec', tier: 'core', status: 'ready', href: 'proyectos/ia08-mini-deepsec.html', repo: '', repoName: 'ia08-deepsec', mods: ['m69', 'm72', 'm62', 'm55', 'm25'], front: false,
          excuse: 'Un orquestador que reparte las líneas sospechosas de tu código entre llamadas a un modelo, sin pasarse de requests ni de dólares.',
          learn: 'Un escaneo con doce expresiones regulares, una cola en SQLite con una clave por tarea, lotes analizados a la vez con un semáforo y un límite de requests por minuto, un tope de gasto con reserva, reintentos clasificados con retry-after, reanudación sin pagar dos veces, deduplicación y un segundo revisor, sobre una víctima con once fallas plantadas; probado con un modelo falso y medido con Claude y con un modelo local por recall y pass^k.',
          stack: ['Python 3.13', 'uv', 'SQLite', 'asyncio', 'Claude', 'Ollama', 'pytest'] }
      ]
    }
  ],

  /* Guías de ML System Design (sección #ml-system-design de proyectos.html): otra serie, en Python, que acompaña
     a la Parte VI. Misma forma que aiTracks. Todas están propuestas; el plan está en PLAN_ML_GUIAS.md. */
  mlTracks: [
    {
      id: 'ml', label: 'ML System Design', title: 'Sistemas de recomendación, construidos', line: '--line-p6',
      intro: 'Una guía por idea de la Parte VI, en Python y con datos públicos: la línea base, dos algoritmos para recomendar productos, la recuperación vectorial, un ranker, amigos con un grafo, exploración, experimentos y un feed completo. Cada una se mide contra lo más popular. Publicadas ML00 y ML01; las demás, próximamente.',
      items: [
        { id: 'ml00', num: 'ML00', title: 'El laboratorio de recomendación', tier: 'core', status: 'ready', href: 'proyectos/ml00-laboratorio.html', repo: '', repoName: 'ml00-laboratorio', mods: ['m42', 'm43'], front: false,
          excuse: 'Antes del primer algoritmo, el lugar donde vas a medir todos.',
          learn: 'uv desde cero, MovieLens descargado con su checksum y pasado a Parquet, DuckDB para mirarlo con SQL, una partición por tiempo de dos maneras con las fugas contadas, la matriz usuario-ítem dispersa en CSR y las métricas recall@k, NDCG@k y cobertura, probadas con ejemplos resueltos a mano; el azar medido con cinco semillas como piso, y tres fallas provocadas.',
          stack: ['Python 3.13', 'uv', 'pandas', 'scipy', 'DuckDB'] },
        { id: 'ml01', num: 'ML01', title: 'La línea base: lo popular, bien medido', tier: 'core', status: 'ready', href: 'proyectos/ml01-linea-base.html', repo: '', repoName: 'ml01-linea-base', mods: ['m42', 'm44', 'm49'], front: false,
          excuse: 'Si tu modelo no le gana a esto, no lo lances.',
          learn: 'Lo popular de cuatro maneras (conteo, por género, con decaimiento y con promedio bayesiano), probado con los ejemplos de M44; un informe que las compara con el azar con recall@10, NDCG@10 y cobertura, cada media con su intervalo por bootstrap y la diferencia pareada contra el conteo; una API con FastAPI y caché en Redis que sigue respondiendo si Redis cae; y la fuga del futuro, provocada a propósito.',
          stack: ['Python 3.13', 'uv', 'pandas', 'FastAPI', 'Redis'] },
        { id: 'ml02', num: 'ML02', title: '«Comprados juntos» con filtrado colaborativo', tier: 'core', status: 'proposed', repo: '', mods: ['m44', 'm53'], front: false,
          excuse: 'La página de producto de una tienda real.',
          learn: 'Próximamente. Co-ocurrencia ítem a ítem sobre las facturas de Online Retail II con scipy, coseno, Jaccard y lift comparados, soporte mínimo, el top-k precalculado en Redis y su API; el trade-off entre lo obvio y lo sorprendente, medido.',
          stack: ['Python 3.13', 'scipy', 'Redis', 'FastAPI'] },
        { id: 'ml03', num: 'ML03', title: '«Para ti» con factorización implícita', tier: 'core', status: 'proposed', repo: '', mods: ['m44', 'm53'], front: false,
          excuse: 'El inicio personalizado de la misma tienda.',
          learn: 'Próximamente. ALS implícito con confianza y BPR, búsqueda de factores y regularización, por qué te recomienda lo que te recomienda, reranking por diversidad y margen, y la tabla de qué modelo usar según tus datos.',
          stack: ['Python 3.13', 'implicit', 'scipy', 'FastAPI'] },
        { id: 'ml04', num: 'ML04', title: 'Recuperación con two-tower y búsqueda vectorial', tier: 'core', status: 'proposed', repo: '', mods: ['m45'], front: false,
          excuse: 'De un catálogo entero a cien candidatos en milisegundos.',
          learn: 'Próximamente. Dos torres en PyTorch con negativos del lote, los vectores de los ítems en FAISS (HNSW e IVF-PQ) y en pgvector, recall contra búsqueda exacta, latencia p99, filtros por stock y un índice que se queda viejo.',
          stack: ['PyTorch', 'FAISS', 'PostgreSQL + pgvector', 'Ollama (opcional)'] },
        { id: 'ml05', num: 'ML05', title: 'Un ranker con LightGBM y features sin fugas', tier: 'core', status: 'proposed', repo: '', mods: ['m43', 'm46'], front: false,
          excuse: 'Ordenar los candidatos con lo que sabías en ese momento, y nada más.',
          learn: 'Próximamente. Features con point-in-time join en DuckDB sobre RetailRocket, LightGBM binario y LambdaMART, calibración isotónica, NDCG contra la línea base, y dos fallas provocadas: una feature con fuga y el training-serving skew.',
          stack: ['LightGBM', 'DuckDB', 'pandas', 'FastAPI'] },
        { id: 'ml06', num: 'ML06', title: 'Personas que quizás conozcas, con Neo4j', tier: 'core', status: 'proposed', repo: '', mods: ['m48'], front: false,
          excuse: 'Amigos de amigos, sin revelar lo que no debes.',
          learn: 'Próximamente. Un grafo social en Neo4j, Cypher para vecinos comunes y Adamic-Adar, PageRank personalizado con Graph Data Science, tope del segundo salto, evaluación ocultando aristas, la misma consulta con listas en Redis y filtros de privacidad probados.',
          stack: ['Neo4j', 'Cypher', 'Graph Data Science', 'Redis'] },
        { id: 'ml07', num: 'ML07', title: 'Explorar con bandits', tier: 'core', status: 'proposed', repo: '', mods: ['m47'], front: false,
          excuse: 'Cien videos nuevos y pocas impresiones para probarlos.',
          learn: 'Próximamente. Un simulador de clics con epsilon-greedy, UCB y Thompson, el regret con varias semillas, un bandit contextual y el bucle de retroalimentación reproducido con y sin exploración.',
          stack: ['Python 3.13', 'numpy'] },
        { id: 'ml08', num: 'ML08', title: 'Un A/B y una evaluación contrafactual', tier: 'extra', status: 'proposed', repo: '', mods: ['m49'], front: false,
          excuse: '¿Lo lanzas? Antes, cuántos usuarios necesitas y qué dicen los logs.',
          learn: 'Próximamente. Potencia y tamaño de muestra, un A/B simulado con efecto novedad y SRM, CUPED, y la evaluación IPS y SNIPS con la propensión registrada del Open Bandit Dataset.',
          stack: ['Python 3.13', 'numpy', 'scipy'] },
        { id: 'ml09', num: 'ML09', title: 'Un feed de punta a punta en 200 ms', tier: 'extra', status: 'proposed', repo: '', mods: ['m50', 'm52'], front: false,
          excuse: 'Todo junto, bajo carga y con piezas que se caen.',
          learn: 'Próximamente. Eventos en Redpanda, features en Redis, candidatos de tres fuentes, filtros, ranker y re-ranking con un timeout por etapa, degradación a lo popular, traces con OpenTelemetry y carga con k6 contra el p99.',
          stack: ['Redpanda', 'Redis', 'LightGBM', 'FastAPI', 'OpenTelemetry', 'k6'] }
      ]
    }
  ],

  /* Guías de Blue Team y DevSecOps (sección #devsecops de proyectos.html): la serie SEC, defensiva, sobre la
     Tienda Norte mínima de SEC00. Misma forma que aiTracks. Plan en PLAN_DEVSECOPS.md. */
  secTracks: [
    {
      id: 'sec', label: 'Blue Team y DevSecOps', title: 'Tienda Norte, vigilada y endurecida', line: '--line-p7',
      intro: 'Una guía por idea de la Parte VII, sobre una tienda pequeña que levantas en tu máquina: el pipeline, la cadena de suministro, la infraestructura, el clúster, la detección y la respuesta. Cada técnica se simula solo contra tu laboratorio y termina en la alerta que la ve. Publicadas SEC00 a SEC08: la serie está completa.',
      items: [
        { id: 'sec00', num: 'SEC00', title: 'El laboratorio: Tienda Norte y su SIEM', tier: 'core', status: 'ready', href: 'proyectos/sec00-laboratorio.html', repoName: 'sec00-laboratorio', repo: '', mods: ['m59', 'm54'], front: false,
          excuse: 'Una tienda pequeña, sus logs en un solo lugar y la primera alerta que salta sola.',
          learn: 'Tienda Norte mínima en FastAPI con PostgreSQL y Nginx, un evento JSON por cada cosa que importa, Wazuh 4.14 en un solo nodo leyendo esos logs por volúmenes de solo lectura, tres reglas propias (una de correlación) probadas con wazuh-logtest, un script que provoca fuerza bruta, pedidos ajenos y escaneo solo contra tu laboratorio, y tres fallas que dejan ciego al SIEM.',
          stack: ['Docker Compose', 'Wazuh 4.14', 'FastAPI', 'PostgreSQL', 'Nginx'] },
        { id: 'sec01', num: 'SEC01', title: 'Un pipeline que falla el build', tier: 'core', status: 'ready', href: 'proyectos/sec01-pipeline.html', repoName: 'sec01-pipeline', repo: '', mods: ['m55', 'm56'], front: false,
          excuse: 'El commit con una clave adentro no llega a main.',
          learn: 'GitHub Actions con cinco jobs sobre Tienda Norte: pytest para el formato del log, gitleaks sobre toda la historia, Semgrep con reglas propias, Trivy sobre la imagen y ZAP baseline sobre la tienda levantada, con excepciones que vencen y cinco fallas plantadas.',
          stack: ['GitHub Actions', 'Semgrep', 'gitleaks', 'Trivy', 'ZAP'] },
        { id: 'sec02', num: 'SEC02', title: 'SBOM, firma y verificación', tier: 'core', status: 'ready', href: 'proyectos/sec02-sbom-firma.html', repoName: 'sec02-sbom-firma', repo: '', mods: ['m56'], front: false,
          excuse: 'Saber qué hay en la imagen y que la firmaste tú.',
          learn: 'La imagen de Tienda Norte con su SBOM de Syft, Grype antes de subirla, la firma sin llaves de cosign, la provenance de GitHub y un despliegue que solo levanta lo que verifica.',
          stack: ['Syft', 'Grype', 'cosign', 'SLSA'] },
        { id: 'sec03', num: 'SEC03', title: 'Infraestructura como código revisada', tier: 'core', status: 'ready', href: 'proyectos/sec03-iac.html', repoName: 'sec03-iac', repo: '', mods: ['m37', 'm55'], front: false,
          excuse: 'El bucket público se rechaza en el pull request, no en el incidente.',
          learn: 'Terraform para la nube de Tienda Norte (red, bucket privado, RDS e IAM), un plan sin cuenta con el lock file en solo lectura en cada pull request, Checkov con una lista corta que corta, siete reglas propias en Rego v1 con sus pruebas en Conftest y seis errores de configuración plantados.',
          stack: ['Terraform', 'Checkov', 'Conftest', 'OPA'] },
        { id: 'sec04', num: 'SEC04', title: 'Un clúster endurecido y vigilado', tier: 'core', status: 'ready', href: 'proyectos/sec04-cluster.html', repoName: 'sec04-cluster', repo: '', mods: ['m57', 'm56'], front: false,
          excuse: 'Un pod comprometido que no llega a ningún lado.',
          learn: 'Tienda Norte en k3s: Pod Security restricted, una ValidatingAdmissionPolicy con dos imágenes por digest, la firma de SEC02 exigida con un ImageValidatingPolicy de Kyverno, NetworkPolicy que niegan todo y abren tres conexiones, y Falco con una regla propia para las shells en la tienda; seis fallas, cada una cortada por su capa.',
          stack: ['k3s', 'Kyverno', 'Falco'] },
        { id: 'sec05', num: 'SEC05', title: 'Detection as code', tier: 'core', status: 'ready', href: 'proyectos/sec05-deteccion.html', repoName: 'sec05-deteccion', repo: '', mods: ['m59'], front: false,
          excuse: 'Las reglas de detección en el repositorio, con pruebas.',
          learn: 'Las reglas de Tienda Norte en Sigma con sus correlaciones, probadas con pySigma y su backend de SQLite sobre casos positivos y negativos que casi alertan, un job nuevo en el pipeline que vigila el par de cada regla en Wazuh, Falco en el SIEM, una alerta de silencio por fuente y una emulación por técnica, con la forma de Atomic Red Team, solo contra el laboratorio.',
          stack: ['Sigma', 'pySigma', 'Atomic Red Team', 'Wazuh'] },
        { id: 'sec06', num: 'SEC06', title: 'Un incidente de punta a punta', tier: 'core', status: 'ready', href: 'proyectos/sec06-incidente.html', repoName: 'sec06-incidente', repo: '', mods: ['m60'], front: false,
          excuse: 'Del aviso a la línea de tiempo, sin pisar la evidencia.',
          learn: 'auditd y osquery en el servidor de la tienda y leídos por Wazuh, un incidente jugado con guion solo contra tu laboratorio, el triaje con osquery, la contención con pause, la evidencia en orden de volatilidad con su hash y su custodia, la línea de tiempo en UTC con cinco fuentes comparada con el guion, y el postmortem con acciones.',
          stack: ['auditd', 'osquery', 'Wazuh'] },
        { id: 'sec07', num: 'SEC07', title: 'Señuelos', tier: 'core', status: 'ready', href: 'proyectos/sec07-senuelos.html', repoName: 'sec07-senuelos', repo: '', mods: ['m59', 'm38'], front: false,
          excuse: 'Una credencial que nadie debería usar, y la alerta cuando alguien la usa.',
          learn: 'Cuatro señuelos en Tienda Norte: una cuenta sin clave posible, un token en el repositorio que la API reconoce sin delatarse, una vista de PostgreSQL que escribe RAISE LOG al leerse y un archivo de llaves falsas vigilado por auditd; cada uno con su regla de nivel 12 en Wazuh, su par en Sigma con casos, su emulación, sus falsos positivos medidos y su fila en un inventario.',
          stack: ['Wazuh', 'PostgreSQL', 'Python'] },
        { id: 'sec08', num: 'SEC08', title: 'Un agente de triaje de alertas', tier: 'extra', status: 'ready', href: 'proyectos/sec08-triaje.html', repoName: 'sec08-triaje', repo: '', mods: ['m59', 'm25'], front: false,
          excuse: 'El agente lee las alertas; contener lo apruebas tú.',
          learn: 'Un agente en LangGraph que lee las alertas del indexer de Wazuh con su CA, junta la regla y las relacionadas, y propone severidad y una de tres acciones con Claude o un modelo local; la alerta va al prompt entre etiquetas y escapada, pausar la API espera un interrupt y lleva una clave de idempotencia en SQLite, el grafo se prueba sin modelo y el juicio se mide con pass^k en seis casos, uno con inyección.',
          stack: ['Python 3.13', 'LangGraph', 'Wazuh'] }
      ]
    }
  ],

  /* Guías de seguridad web (sección #seguridad-web de proyectos.html): la serie WEB, en PHP, sobre el sistema de
     control de prácticas del usuario, que es su repositorio oficial. Misma forma que aiTracks. Plan en PLAN_SEGURIDAD_WEB.md. */
  webTracks: [
    {
      id: 'web', label: 'Seguridad web', title: 'Tu sistema de prácticas, atacado y cerrado', line: '--line-p9',
      intro: 'Una guía por hueco, en PHP 8.3 sobre tu propio repositorio: cada una provoca la falla en tu laboratorio, la cierra con un cambio pequeño y lo prueba. Publicadas WEB00 a WEB10: la serie está completa.',
      items: [
        { id: 'web00', num: 'WEB00', title: 'El laboratorio', tier: 'core', status: 'ready', href: 'proyectos/web00-laboratorio.html', repoName: 'web00-laboratorio', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m73', 'm74', 'm80'], front: false,
          excuse: 'Tu sistema andando, un sitio atacante en otro host y un script que mira tu servidor desde afuera.',
          learn: 'XAMPP con PHP 8.3, MariaDB, el frontend de Vite con su proxy, un host virtual atacante.test para las pruebas entre orígenes, la re-auditoría del repositorio y dos fallas del entorno provocadas.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web01', num: 'WEB01', title: 'Lo que no debe verse', tier: 'core', status: 'ready', href: 'proyectos/web01-lo-que-no-debe-verse.html', repoName: 'web01-lo-que-no-debe-verse', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m73', 'm78', 'm83'], front: false,
          excuse: 'Lo que tu servidor entrega sin que nadie lo pida.',
          learn: 'Una respuesta central con Content-Type y códigos HTTP reales, errores al registro y no al cliente, el arranque que se niega con la clave del ejemplo, .git y archivos sueltos fuera del alcance de Apache, y expose_php apagado.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web02', num: 'WEB02', title: 'Sesión y login seguros', tier: 'core', status: 'ready', href: 'proyectos/web02-sesion.html', repoName: 'web02-sesion', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m74', 'm81'], front: false,
          excuse: 'Una cookie firmada que se puede revocar, y un login que no se deja adivinar.',
          learn: 'Versión de sesión en la base, cierre de todas las sesiones al cambiar la contraseña, límite de intentos por cuenta y por IP, hash de relleno contra la enumeración, la IP comparada entera y sin session_start.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web03', num: 'WEB03', title: 'CSRF', tier: 'core', status: 'ready', href: 'proyectos/web03-csrf.html', repoName: 'web03-csrf', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m74', 'm76'], front: false,
          excuse: 'Qué detiene una request que el navegador manda sin que la víctima lo sepa.',
          learn: 'El token que ya tienes, Origin y Sec-Fetch-Site como segunda barrera, la lista de orígenes en un solo lugar, una matriz de pruebas con curl y el ataque desde atacante.test.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web04', num: 'WEB04', title: 'CORS', tier: 'core', status: 'ready', href: 'proyectos/web04-cors.html', repoName: 'web04-cors', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m75'], front: false,
          excuse: 'Catorce copias de la misma cabecera, y una con un error.',
          learn: 'Un cors.php único con la lista exacta de orígenes, Vary: Origin, el preflight respondido antes de la sesión, una prueba de CLI con los orígenes que engañan a una comparación mal hecha y la migración de los 14 endpoints con un script.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web05', num: 'WEB05', title: 'XSS en el feed de oportunidades', tier: 'core', status: 'ready', href: 'proyectos/web05-xss.html', repoName: 'web05-xss', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m77', 'm78'], front: false,
          excuse: 'Un título de oferta con HTML adentro.',
          learn: 'Un payload mínimo contra React y contra la API abierta como página, enlaceSeguro() para las URL que vienen de la base, diez sumideros migrados con un script, dos reglas de oxlint y una prueba con node --test.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web06', num: 'WEB06', title: 'Control de acceso', tier: 'core', status: 'ready', href: 'proyectos/web06-control-acceso.html', repoName: 'web06-control-acceso', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m80'], front: false,
          excuse: 'La rejilla de M80, aplicada endpoint por endpoint.',
          learn: 'Encontrar los huecos que sobreviven a una API bien autorizada y cerrarlos autorizando la acción que se ejecuta, con una matriz de curl de cuatro sesiones.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web07', num: 'WEB07', title: 'Inyecciones', tier: 'core', status: 'ready', href: 'proyectos/web07-inyecciones.html', repoName: 'web07-inyecciones', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m79'], front: false,
          excuse: 'PDO bien configurado y los identificadores con lista permitida.',
          learn: 'Cerrar los bordes que una consulta preparada no cubre: emulación, comodines de LIKE, ORDER BY con lista, la bitácora y un registro en JSON.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web08', num: 'WEB08', title: 'Subir el CV y SSRF', tier: 'core', status: 'ready', href: 'proyectos/web08-subir-cv-ssrf.html', repoName: 'web08-subir-cv-ssrf', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m82', 'm80'], front: false,
          excuse: 'Un CV público para quien tenga el link, y una vista previa que podría mirar adentro.',
          learn: 'Sacar los documentos de htdocs y servirlos con autorización, y validar una URL saliente por su IP resuelta, conectando a esa IP y revisando cada redirección.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web09', num: 'WEB09', title: 'Cabeceras', tier: 'core', status: 'ready', href: 'proyectos/web09-cabeceras.html', repoName: 'web09-cabeceras', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m78', 'm83'], front: false,
          excuse: 'Cualquier sitio enmarca la aplicación, y un XSS que se escape corre sin nada que lo frene.',
          learn: 'Servir el build en el mismo origen que la API, desplegar una CSP primero en report-only y después en bloqueo, y mandar las cabeceras de la API desde un solo lugar.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] },
        { id: 'web10', num: 'WEB10', title: 'Carreras y lógica de negocio', tier: 'core', status: 'ready', href: 'proyectos/web10-carreras.html', repoName: 'web10-carreras', repo: 'https://github.com/oskarcj4/Sistema-Control-Practicas', mods: ['m83', 'm39'], front: false,
          excuse: 'Dos reclutadores confirman a la vez, y el estudiante recibe "aceptada" y "rechazada" por la misma postulación.',
          learn: 'Provocar cuatro carreras con curl --parallel y cerrarlas con la herramienta que le toca a cada una: la llave única, el UPDATE condicional o la transacción con SELECT … FOR UPDATE.',
          stack: ['PHP 8.3', 'XAMPP', 'MariaDB'] }
      ]
    }
  ]
};
