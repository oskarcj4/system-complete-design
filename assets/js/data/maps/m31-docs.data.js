/* Mapa del M31: un editor colaborativo al estilo de Google Docs. Docs no es open source: lo publicado es el algoritmo
   (blog de 2010 y Apache Wave), Zanzibar (2019), el borde de Google (GFE), la Docs API y la Drive API. Cómo se reparten
   hoy las piezas por dentro no está publicado: esas cajas son el diseño de referencia del clon de 31.16 y van marcadas.
   Se lee de arriba abajo: clientes, borde, entrada a Docs, colaboración y permisos, datos y lo que corre en segundo plano. */
SD.defineMap('m31-docs', {
  title: 'Un editor colaborativo por dentro',
  intro: 'La arquitectura de un editor como Google Docs, de arriba abajo: los clientes, el borde de Google, las cuatro puertas de entrada (la página, el canal en tiempo real, la Docs API y la Drive API), la sesión de cada documento con su directorio y los permisos, los datos y, abajo, lo que se calcula después a partir del log. Cada caja dice qué está documentado y qué es diseño de referencia. Los escenarios recorren las operaciones más importantes salto por salto.',
  start: 'sesion',
  stepPanel: true,
  pieces: true,
  groups: [
    { id: 'g-cli', label: 'Clientes', x: 20, y: 50, w: 1820, h: 120 },
    { id: 'g-edge', label: 'Borde de Google', x: 20, y: 260, w: 1820, h: 120 },
    { id: 'g-in', label: 'Entrada a Docs', x: 20, y: 470, w: 1820, h: 120 },
    { id: 'g-col', label: 'Colaboración en vivo', x: 20, y: 680, w: 1000, h: 120 },
    { id: 'g-perm', label: 'Permisos', x: 1100, y: 680, w: 740, h: 120 },
    { id: 'g-data', label: 'Datos', x: 20, y: 900, w: 1820, h: 120 },
    { id: 'g-bg', label: 'En segundo plano', x: 20, y: 1120, w: 1820, h: 270 }
  ],
  nodes: [
    /* ---------- Clientes ---------- */
    { id: 'ana', layer: 'client', label: 'Ana', sub: 'editora en el navegador', x: 380, y: 110,
      brief: 'Edita en el navegador: aplica cada tecla al instante y la manda como una op.',
      info: {
        resp: '<p>Ana escribe en el navegador. Su editor aplica cada tecla en la copia local al instante y la manda al servidor como una operación: nunca espera a la red para mostrar lo que escribió. Lleva la cuenta de qué mandó y todavía no le confirmaron (31.8). Desde 2021, Docs dibuja la página en un canvas en lugar de armarla con el DOM. <span class="badge badge--doc">Documentado</span></p>',
        api: '<pre><code>→ {"tipo": "hola", "rev": 41}\n→ {"tipo": "op", "seq": 17, "base": 41, "op": [{"retain": 5}, {"insert": "!"}]}\n→ {"tipo": "cursor", "rev": 42, "pos": 6}\n← {"tipo": "ack", "seq": 17, "rev": 42}\n← {"tipo": "remota", "rev": 43, "cliente": "t2", "usuario": "beto", "op": […]}</code></pre><p>El protocolo del clon (31.16). <span class="badge badge--ref">Diseño de referencia</span> El de Docs no está documentado.</p>',
        data: '<ul><li><code>rev</code>: la última revisión del servidor que aplicó.</li><li><code>enviada</code>: la op en vuelo, sin ack. Nunca hay más de una.</li><li><code>buffer</code>: lo que escribió mientras esperaba, compuesto en una sola op.</li><li><code>deshacer_pila</code>: las inversas de sus ops, transformadas contra lo que llega de otros.</li><li>Para trabajar sin red, el buffer y el documento se guardan en IndexedDB.</li></ul>',
        fail: '<ul><li><b>Se corta la red:</b> sigue escribiendo; todo va al buffer. Al volver manda <code>hola</code> con su <code>rev</code> y se pone al día (escenario "Volver de offline").</li><li><b>No sabe si su op llegó:</b> la reenvía con el mismo <code>seq</code>; el servidor reconoce el reenvío y no la guarda dos veces.</li><li><b>Se cierra la pestaña con cambios sin ack:</b> se pierden si no estaban guardados en IndexedDB.</li></ul>',
        nums: '<ul><li>Tecla en pantalla: lo que tarda en dibujar, pocos milisegundos. La red no está en ese camino.</li><li>Una op de una tecla pesa unos 60 bytes en JSON.</li><li>Un documento admite hasta 1.02 millones de caracteres. <span class="badge badge--doc">Documentado</span></li></ul>'
      } },
    { id: 'beto', layer: 'client', label: 'Beto', sub: 'editor en otra ciudad', x: 740, y: 110,
      brief: 'Edita el mismo documento a la vez que Ana, a 40 ms del centro de datos.',
      info: {
        resp: '<p>El otro editor del documento, en otra ciudad. Recibe las ops de Ana ya ordenadas por el servidor y las transforma contra lo suyo pendiente antes de aplicarlas, para que el texto que él escribió no se corra de lugar.</p>',
        api: '<p>Los mismos mensajes que Ana. Recibe además <code>cursor</code> con la posición de cada editor y <code>se_fue</code> cuando alguien cierra.</p>',
        data: '<p>Además de su copia, guarda los cursores de los demás en coordenadas del servidor y los muestra corridos por lo que él tiene sin confirmar (31.10). <span class="badge badge--ref">Diseño de referencia</span></p>',
        fail: '<ul><li><b>Escribe en el mismo lugar que Ana:</b> el servidor desempata por orden de llegada y las dos copias quedan iguales (escenario "Dos teclas a la vez").</li><li><b>Le quitan el acceso con el doc abierto:</b> la sesión cierra su conexión (escenario "Compartir y revocar").</li></ul>',
        nums: '<ul><li>40 ms de ida hasta el borde de Google. <span class="badge badge--ref">Diseño de referencia</span></li><li>Ve la tecla de Ana unos 90 ms después de que ella la escribe.</li></ul>'
      } },
    { id: 'app', layer: 'client', label: 'App móvil', sub: 'iOS y Android', x: 1100, y: 110,
      brief: 'El mismo editor en el teléfono, con la lógica compartida escrita en Java.',
      info: {
        resp: '<p>Docs en el teléfono. Google escribe la lógica que no es interfaz en Java y la comparte: J2ObjC la traduce a Objective-C para iOS, y la página de J2ObjC nombra a Docs, Sheets y Slides entre sus usuarios. <span class="badge badge--doc">Documentado</span> Así el modelo, los comandos y la transformación son el mismo código en todas las plataformas: si cada una tuviera su propio transform, tarde o temprano dos copias divergirían.</p>',
        api: '<p>El mismo protocolo de colaboración que el navegador, por la conexión que la app mantiene abierta mientras el documento está en pantalla.</p>',
        data: '<p>Los documentos marcados para usar sin conexión, con sus cambios pendientes.</p>',
        fail: '<ul><li><b>La app pasa a segundo plano:</b> el sistema cierra la conexión. Al volver, la app se pone al día como después de un corte.</li><li><b>Horas en un avión:</b> el escenario "Volver de offline", con muchos cambios de cada lado.</li></ul>',
        nums: '<ul><li>En redes móviles, el viaje de ida y vuelta va de 50 a 300 ms. Por eso importa que la tecla nunca espere a la red.</li></ul>'
      } },
    { id: 'script', layer: 'client', label: 'Script con la API', sub: 'Apps Script o un backend', x: 1460, y: 110,
      brief: 'Un programa que lee y edita documentos con la Docs API.',
      info: {
        resp: '<p>Un programa que edita documentos sin abrirlos: un informe que se completa solo cada lunes, una plantilla que se llena con datos. Usa la Docs API con OAuth y edita a la par de las personas.</p>',
        api: '<pre><code>POST https://docs.googleapis.com/v1/documents/{documentId}:batchUpdate\n{ "requests": [ { "insertText": { "location": { "index": 1 }, "text": "Ventas: 1 204\\n" } } ],\n  "writeControl": { "targetRevisionId": "ALm37BW…" } }</code></pre><p><span class="badge badge--doc">Documentado</span></p>',
        data: '<p>El <code>revisionId</code> de la última lectura, para mandar sus cambios contra esa revisión.</p>',
        fail: '<ul><li><b>Pasa la cuota:</b> 429; se reintenta con backoff exponencial. <span class="badge badge--doc">Documentado</span></li><li><b>Un pedido del lote es inválido:</b> no se aplica ninguno. <span class="badge badge--doc">Documentado</span></li></ul>',
        nums: '<ul><li>Escrituras: 60 por minuto por usuario y 600 por minuto por proyecto. Lecturas: 300 y 3&#8239;000. <span class="badge badge--doc">Documentado</span></li></ul>'
      } },
    /* ---------- Borde ---------- */
    { id: 'gfe', layer: 'edge', label: 'GFE', sub: 'Google Front End: TLS y balanceo', x: 920, y: 320,
      brief: 'El borde de Google: termina TLS, frena ataques y reparte el tráfico.',
      info: {
        resp: '<p>Todo servicio de Google que da a internet se publica detrás del Google Front End: termina las conexiones TLS con los certificados correctos, aplica protecciones contra ataques de denegación de servicio y reenvía cada pedido al servicio que corresponde. <span class="badge badge--doc">Documentado</span> Para Docs reparte cuatro tipos de tráfico: la página, el canal en tiempo real, la Docs API y la Drive API.</p>',
        api: '<pre><code>docs.google.com/document/d/{id}/edit     la página\ndocs.google.com/…                        el canal en tiempo real\ndocs.googleapis.com/v1/documents/…       Docs API\nwww.googleapis.com/drive/v3/files/…      Drive API</code></pre>',
        data: '<p>Sin estado del documento. Sí sabe enrutar: el canal de un documento tiene que llegar a algo que conozca al dueño de su sesión.</p>',
        fail: '<ul><li><b>Cae un punto de presencia:</b> el tráfico entra por el siguiente; las conexiones largas del canal se reabren y el editor se pone al día.</li><li><b>Un ataque de volumen:</b> se frena aquí, antes de llegar a las sesiones.</li></ul>',
        nums: '<ul><li>De 20 a 40 ms desde el usuario hasta el borde más cercano. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } },
    /* ---------- Entrada a Docs ---------- */
    { id: 'canal', layer: 'service', label: 'Canal en tiempo real', sub: 'una conexión larga por pestaña', x: 200, y: 530,
      brief: 'Mantiene abierta la conexión de cada pestaña y la lleva a la sesión del documento.',
      info: {
        resp: '<p>Mantiene una conexión larga por pestaña abierta y la conecta con la sesión del documento: averigua en el directorio qué servidor es el dueño y le pasa los mensajes, en orden. Pone el usuario a partir de la cookie o el token; el cliente nunca dice quién es. <span class="badge badge--ref">Diseño de referencia</span> El transporte de Docs no está documentado: Google publicó el cliente de BrowserChannel y WebChannel en Closure, no el servidor. El clon usa WebSocket.</p>',
        api: '<pre><code>GET /docs/d1/canal  Upgrade: websocket\n→ {"tipo": "hola", "rev": -1}\n← {"tipo": "estado", "rev": 1834, "doc": […], "cursores": {"t2": 120}}</code></pre>',
        data: '<p>Por conexión: el documento, el usuario autenticado y a qué servidor de sesión va. Un cache del directorio con la época de cada asignación.</p>',
        fail: '<ul><li><b>Cae el servidor de sesión:</b> el canal cierra la conexión del cliente, que reconecta; esta vez el directorio da otro dueño.</li><li><b>Cae el gateway:</b> las pestañas reconectan a otro, con jitter para no llegar todas juntas.</li></ul>',
        nums: '<ul><li>Un gateway sostiene unas 10&#8239;000 conexiones: el clon de 31.18 necesita 6. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } },
    { id: 'web', layer: 'service', label: 'Servidor web', sub: 'la página y el arranque', x: 560, y: 530,
      brief: 'Sirve la página del editor tras revisar el permiso y lee el título y el dueño.',
      info: {
        resp: '<p>Atiende <code>/document/d/{id}/edit</code>: revisa que el usuario pueda ver el documento, lee el título y el dueño, y devuelve la página con el código del editor. El contenido llega después, por el canal, desde la sesión del documento. También muestra el historial de versiones. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>GET /document/d/1aBcD…/edit\n200 text/html   la página, el título y el código del editor\n403             sin permiso: la página para pedir acceso</code></pre>',
        data: '<p>Sin estado propio.</p>',
        fail: '<ul><li><b>Zanzibar tarda:</b> la página espera; sin permiso confirmado no se muestra nada del documento.</li><li><b>El enlace es de un documento borrado:</b> 404, sin decir si existió.</li></ul>',
        nums: '<ul><li>La página y el código se cachean en el navegador: abrir un segundo documento solo baja el documento.</li></ul>'
      } },
    { id: 'docsapi', layer: 'service', label: 'Docs API', sub: 'documents.get y batchUpdate', x: 1280, y: 530,
      brief: 'La API pública: lee el documento como un árbol y edita con pedidos por índice.',
      info: {
        resp: '<p>La API pública de Docs. <code>documents.get</code> devuelve el documento como un árbol de pestañas, párrafos y tramos de texto con sus índices; <code>documents.batchUpdate</code> aplica una lista de pedidos de forma atómica. <span class="badge badge--doc">Documentado</span> Sus ediciones entran a la misma sesión que las de las personas (31.3).</p>',
        api: '<pre><code>POST /v1/documents/{id}:batchUpdate\n{ "requests": [ { "deleteContentRange": { "range": { "startIndex": 10, "endIndex": 15 } } },\n                { "insertText": { "location": { "index": 10 }, "text": "gente" } } ],\n  "writeControl": { "requiredRevisionId": "ALm37BW…" } }\n\n200 { "replies": [ {}, {} ], "writeControl": { "requiredRevisionId": "ALm37BX…" } }</code></pre><p><code>requiredRevisionId</code>: falla con 400 si el documento cambió. <code>targetRevisionId</code>: los cambios se transforman contra los de los colaboradores. <span class="badge badge--doc">Documentado</span></p>',
        data: '<p>Sin estado propio. El <code>revisionId</code> es una cadena opaca, no un número: no se compara ni se ordena. <span class="badge badge--doc">Documentado</span></p>',
        fail: '<ul><li><b>Un pedido del lote es inválido:</b> no se aplica ninguno. <span class="badge badge--doc">Documentado</span></li><li><b><code>targetRevisionId</code> demasiado viejo:</b> 400; se vuelve a leer y a armar el lote.</li><li><b>Índices corridos:</b> cada inserción corre los índices de lo que sigue; por eso los lotes se escriben del final hacia el principio. <span class="badge badge--doc">Documentado</span></li></ul>',
        nums: '<ul><li>Índices en unidades UTF-16: un emoji fuera del plano básico ocupa 2. <span class="badge badge--doc">Documentado</span></li><li>60 escrituras por minuto por usuario. <span class="badge badge--doc">Documentado</span></li></ul>'
      } },
    { id: 'driveapi', layer: 'service', label: 'Drive API', sub: 'archivos, permisos y comentarios', x: 1640, y: 530,
      brief: 'Archivos, carpetas, permisos, comentarios y revisiones de cualquier archivo de Drive.',
      info: {
        resp: '<p>Docs es un tipo de archivo de Drive. Lo que no es contenido pasa por la Drive API: crear y mover el archivo, compartirlo, comentar y listar revisiones. <span class="badge badge--doc">Documentado</span></p>',
        api: '<pre><code>POST /drive/v3/files/{fileId}/permissions\n{ "type": "user", "role": "writer", "emailAddress": "beto@ejemplo.com" }\n\nPOST /drive/v3/files/{fileId}/comments?fields=*\n{ "content": "¿mundo o gente?", "anchor": "…" }\n\nGET  /drive/v3/files/{fileId}/revisions</code></pre><p>Roles: <code>owner</code>, <code>organizer</code>, <code>fileOrganizer</code>, <code>writer</code>, <code>commenter</code> y <code>reader</code>. <span class="badge badge--doc">Documentado</span></p>',
        data: '<p>Sin estado propio: escribe en los metadatos, en Zanzibar y en los comentarios.</p>',
        fail: '<ul><li><b>Un comentario anclado creado por la API:</b> Docs no lo muestra anclado, lo trata como un comentario sobre todo el archivo. <span class="badge badge--doc">Documentado</span></li><li><b>Se comparte y enseguida se escribe algo:</b> el permiso nuevo tiene que verse antes que el contenido nuevo; de eso se ocupa el zookie (31.13).</li></ul>',
        nums: '<ul><li>Las revisiones de un Doc no se pueden marcar para guardar para siempre; eso es solo para archivos binarios. <span class="badge badge--doc">Documentado</span></li></ul>'
      } },
    /* ---------- Colaboración en vivo ---------- */
    { id: 'directorio', layer: 'cache', label: 'Directorio de sesiones', sub: 'doc → servidor y época', x: 200, y: 740,
      brief: 'Dice qué servidor es el dueño de cada documento abierto.',
      info: {
        resp: '<p>Una tabla chica: para cada documento abierto, qué servidor es el dueño de su sesión y con qué época. Las asignaciones se escriben con compare-and-set, y los servidores renuevan un heartbeat. Si uno deja de renovarlo, sus documentos se reasignan. <span class="badge badge--ref">Diseño de referencia</span> Sirve para enrutar, no para proteger: la seguridad la da el log (31.8).</p>',
        api: '<pre><code>dueno("d1")                → Asignacion("s7", epoca=12)\nescribir_si("d1", nueva=("s3", 13), esperada=("s7", 12))   # compare-and-set</code></pre>',
        data: '<pre><code>doc_id   servidor   epoca   desde\nd1       s7         12      2026-10-11T10:02:11Z</code></pre><p>En el clon, DynamoDB con escritura condicional. <span class="badge badge--ref">Diseño de referencia</span></p>',
        fail: '<ul><li><b>Dos canales piden el mismo doc a la vez:</b> el compare-and-set deja ganar a uno; el otro lee la asignación ganadora.</li><li><b>Un servidor congelado sigue creyéndose dueño:</b> su próxima escritura en el log falla porque esa revisión ya existe (escenario "Se cae el dueño").</li></ul>',
        nums: '<ul><li>Un acceso por conexión nueva, no por tecla: el canal cachea la respuesta.</li></ul>'
      } },
    { id: 'sesion', layer: 'service', label: 'Servidor de sesión', sub: 'un dueño por documento', x: 740, y: 740,
      brief: 'Ordena los cambios de un documento: los transforma, los guarda y los reparte.',
      info: {
        resp: '<p>El corazón del sistema. Cada documento abierto tiene una sola sesión, en un solo servidor, que procesa los mensajes de a uno: transforma cada op contra lo que el autor no había visto, la guarda como la revisión siguiente, le confirma al autor y la reparte a los demás. Así hay un único orden, como en el blog de 2010, que describe un servidor que transforma contra el log. <span class="badge badge--doc">Documentado</span> Cómo reparte Docs las sesiones entre servidores no está publicado. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>recibir(cliente="t1", seq=17, base=41, op)\n  1. ¿(t1, 17) ya está en el log? → reenvío: ack y nada más\n  2. op = transformar contra las revisiones 42…N\n  3. log.agregar(doc, N + 1)        # falla si ya existe\n  4. ack a t1, remota a los demás, cola de eventos</code></pre>',
        data: '<ul><li>El documento en memoria y su <code>rev</code>.</li><li>Las últimas 1&#8239;000 revisiones, para transformar y detectar reenvíos sin ir a la base.</li><li>Las conexiones, los cursores y las anclas de los comentarios.</li></ul>',
        fail: '<ul><li><b>Se cae:</b> el directorio reasigna el documento y el nuevo dueño lo carga del último snapshot más el log; los clientes reconectan y reenvían lo que no tuvo ack.</li><li><b>Llega un mensaje roto:</b> se cierra esa conexión; la sesión sigue.</li><li><b>Un documento viral:</b> 5&#8239;000 lectores en la misma sesión. Ver el escenario "Un documento viral".</li></ul>',
        nums: '<ul><li>Unos 20&#8239;000 documentos y 20&#8239;000 cambios por segundo por servidor: el clon de 31.18 necesita 3. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } },
    /* ---------- Permisos ---------- */
    { id: 'zanzibar', layer: 'external', label: 'Zanzibar', sub: 'permisos como tuplas', x: 1280, y: 740,
      brief: 'El sistema de autorización de Google: guarda quién puede qué como tuplas y responde checks.',
      info: {
        resp: '<p>El sistema de autorización que Google publicó en 2019 y que usan Calendar, Cloud, Drive, Maps, Photos y YouTube. <span class="badge badge--doc">Documentado</span> Guarda los permisos como tuplas, objeto, relación y sujeto, y responde si un usuario tiene una relación con un objeto recorriendo grupos y carpetas padre. Un índice aparte, Leopard, resuelve rápido los grupos anidados. <span class="badge badge--doc">Documentado</span></p>',
        api: '<pre><code>check(doc:plan#viewer, user:beto, zookie)   → permitido\nwrite(+ doc:plan#writer@user:beto)          → zookie\nwatch(namespace doc)                         → cambios de tuplas\nexpand(doc:plan#viewer)                      → árbol de usuarios</code></pre>',
        data: '<pre><code>doc:plan#owner@user:ana\ndoc:plan#parent@folder:equipo\nfolder:equipo#viewer@group:eng#member\ngroup:eng#member@user:beto</code></pre><p>Sobre Spanner, replicado en más de 30 lugares. <span class="badge badge--doc">Documentado</span></p>',
        fail: '<ul><li><b>New enemy:</b> una réplica atrasada podría aplicar la ACL vieja a contenido nuevo. El zookie que se guarda con el contenido obliga a usar un snapshot al menos tan nuevo (31.13). <span class="badge badge--doc">Documentado</span></li><li><b>Hot spots:</b> el mismo check repetido miles de veces se cachea y se deduplica. <span class="badge badge--doc">Documentado</span></li></ul>',
        nums: '<ul><li>Más de 2 billones de tuplas y más de 10 millones de pedidos por segundo. <span class="badge badge--doc">Documentado</span></li><li>Checks en menos de 10 ms en el p95, con disponibilidad de más de 99.999&#8239;% durante tres años. <span class="badge badge--doc">Documentado</span></li></ul>'
      } },
    /* ---------- Datos ---------- */
    { id: 'log', layer: 'db', label: 'Log de revisiones', sub: '(doc_id, rev) → op', x: 560, y: 960,
      brief: 'Guarda cada cambio una sola vez, en orden: es la verdad del documento.',
      info: {
        resp: '<p>La verdad del documento. El blog de 2010 lo describe como un log de revisiones: cada cambio guardado en orden, y el documento es lo que queda al aplicarlos todos. <span class="badge badge--doc">Documentado</span> En el clon, cada fila es una revisión con su op, su autor y el <code>(cliente, seq)</code> que la mandó. La escritura es condicional: la revisión N + 1 se guarda solo si no existe. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>INSERT INTO revisiones (doc_id, rev, op, usuario, cliente, seq, cuando)\nVALUES ($1, 1835, $2, \'ana\', \'t1\', 17, now());   -- falla si (doc_id, rev) ya existe\n\nSELECT rev, op, cliente, seq FROM revisiones\n WHERE doc_id = $1 AND rev &gt; 1500 ORDER BY rev;</code></pre>',
        data: '<pre><code>doc_id  rev   op                           usuario  cliente  seq  cuando\nd1      1834  [{"retain":5},{"insert":"!"}]  beto     t2       9    10:02:11.204\nd1      1835  [{"retain":12},{"delete":3}]   ana      t1       17   10:02:11.290</code></pre>',
        fail: '<ul><li><b>Dos servidores creen ser dueños:</b> el segundo INSERT de la misma revisión falla y ese servidor cierra la sesión. Es la fencing token del M06: el número de revisión.</li><li><b>Se pierde un snapshot:</b> se rearma reproduciendo el log.</li></ul>',
        nums: '<ul><li>300 bytes por revisión; el clon guarda unas 960 millones por día, 288 GB. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } },
    { id: 'snaps', layer: 'db', label: 'Snapshots', sub: 'el doc entero cada 500', x: 920, y: 960,
      brief: 'Copias del documento entero para abrirlo sin reproducir todo el log.',
      info: {
        resp: '<p>El documento entero cada 500 revisiones. Abrir un documento es cargar el último snapshot y aplicar lo que vino después, no reproducir el log desde el principio. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>ultimo("d1")                 → (1500, doc)\nguardar("d1", 2000, doc)     # cada SNAPSHOT_CADA = 500 revisiones</code></pre>',
        data: '<p>En el clon, un objeto de S3 por snapshot: <code>snapshots/d1/000002000.json</code>. Se pueden borrar los viejos: el log alcanza para rearmarlos.</p>',
        fail: '<ul><li><b>Un snapshot está corrupto:</b> se usa el anterior y más log. Por eso el log es la verdad y el snapshot solo un atajo.</li></ul>',
        nums: '<ul><li>Unos 40 KB cada uno. Con 960 millones de revisiones por día, son 1.9 millones de snapshots y unos 79 GB por día. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } },
    { id: 'coments', layer: 'db', label: 'Comentarios', sub: 'hilos anclados a un rango', x: 1280, y: 960,
      brief: 'Los hilos de comentarios, cada uno anclado a un rango del texto.',
      info: {
        resp: '<p>Los hilos de comentarios con sus respuestas, cada uno anclado a un rango del texto. El ancla se corre con cada op, como un cursor; si el texto comentado se borra, el comentario queda huérfano. <span class="badge badge--ref">Diseño de referencia</span> Las sugerencias no viven aquí: son texto del documento marcado con un id (31.12).</p>',
        api: '<pre><code>POST /drive/v3/files/{fileId}/comments/{commentId}/replies\n{ "content": "Va gente", "action": "resolve" }</code></pre><p>Un comentario se resuelve con una respuesta; <code>resolved</code> es de solo lectura. <span class="badge badge--doc">Documentado</span></p>',
        data: '<pre><code>id    doc_id  inicio  fin  rev   usuario  texto              resuelto\nc81   d1      5       10   1835  ana      ¿mundo o gente?    false</code></pre>',
        fail: '<ul><li><b>Se borra el texto comentado:</b> el comentario queda huérfano y se muestra aparte, sin perderse.</li></ul>',
        nums: '<ul><li>Pocos por documento comparado con las ops: se guardan aparte para no inflar el log.</li></ul>'
      } },
    { id: 'meta', layer: 'db', label: 'Metadatos de Drive', sub: 'título, dueño y carpeta', x: 1640, y: 960,
      brief: 'Lo que Drive sabe de cada archivo: título, dueño, carpeta y fechas.',
      info: {
        resp: '<p>Lo que Drive sabe de cada archivo: título, tipo, dueño, carpeta, fechas de creación y modificación. Lo leen la lista de archivos, la página del editor y la Drive API. <span class="badge badge--ref">Diseño de referencia</span> Bigtable guardaba los datos de Writely, el antecesor de Docs, en 2006; el almacenamiento actual de Docs no está publicado. <span class="badge badge--doc">Documentado</span></p>',
        api: '<pre><code>GET /drive/v3/files/{fileId}?fields=name,owners,parents,modifiedTime</code></pre>',
        data: '<pre><code>{ "id": "1aBcD…", "name": "Plan 2027", "mimeType": "application/vnd.google-apps.document",\n  "owners": [ { "emailAddress": "ana@ejemplo.com" } ], "parents": ["0Bx…"] }</code></pre>',
        fail: '<ul><li><b>Se mueve el archivo a otra carpeta:</b> cambian sus permisos heredados; Zanzibar recibe la tupla nueva del padre.</li></ul>',
        nums: '<ul><li>Se lee mucho más de lo que se escribe: una escritura por cambio de título o de carpeta, no por tecla.</li></ul>'
      } },
    /* ---------- En segundo plano ---------- */
    { id: 'historial', layer: 'service', label: 'Historial de versiones', sub: 'agrupa revisiones', x: 200, y: 1180,
      brief: 'Arma las versiones que ve el usuario agrupando revisiones por tiempo y autor.',
      info: {
        resp: '<p>Lee el log y agrupa las revisiones por tiempo y por autor en las versiones que muestra el historial. Restaurar una versión no borra nada: agrega una revisión nueva que lleva el documento de hoy a como estaba (31.11). Docs guarda el historial de cada cambio desde mayo de 2010, con timestamps al microsegundo, y lo deja ver con permiso de edición. <span class="badge badge--doc">Documentado</span></p>',
        api: '<pre><code>versiones("d1")           → [ {desde: 1, hasta: 312, autores: ["ana"]}, … ]\ndoc_en("d1", rev=1830)   → snapshot 1500 + revisiones 1501…1830</code></pre>',
        data: '<p>Las versiones agrupadas, recalculables desde el log, y los nombres que les pone el usuario.</p>',
        fail: '<ul><li><b>Se atrasa:</b> el historial muestra versiones un poco viejas; la edición no se entera porque lee de la cola, no del camino de la tecla.</li></ul>',
        nums: '<ul><li>Un día de trabajo puede ser decenas de miles de revisiones y una docena de versiones.</li></ul>'
      } },
    { id: 'busqueda', layer: 'service', label: 'Búsqueda', sub: 'índice filtrado por permisos', x: 560, y: 1180,
      brief: 'Indexa el texto y filtra cada resultado por lo que el usuario puede ver.',
      info: {
        resp: '<p>Indexa el texto de los documentos a partir de los eventos de revisión, con algunos segundos de atraso. Cada resultado se filtra por lo que el usuario puede ver: un índice que ignore los permisos filtra secretos en los fragmentos. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>GET /drive/v3/files?q=fullText contains \'sueldos\'</code></pre><p>La búsqueda por texto completo de la Drive API. <span class="badge badge--doc">Documentado</span></p>',
        data: '<p>Términos por documento, más la lista de quién puede leer cada uno, que se actualiza con los cambios de ACL.</p>',
        fail: '<ul><li><b>Le quitan el acceso a Beto:</b> el documento tiene que dejar de aparecer en sus búsquedas aunque el índice no se haya actualizado: se vuelve a revisar el permiso al mostrar cada resultado.</li></ul>',
        nums: '<ul><li>No se indexa cada tecla: se junta un documento por minuto como mucho.</li></ul>'
      } },
    { id: 'avisos', layer: 'service', label: 'Avisos', sub: 'correo por comentarios y menciones', x: 1280, y: 1180,
      brief: 'Manda correos cuando te mencionan, te asignan algo o te comparten un documento.',
      info: {
        resp: '<p>Escucha los eventos de comentarios, menciones y permisos, y manda los correos: "Ana te mencionó", "Ana compartió Plan 2027 contigo". Junta varios en uno si llegan seguidos. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<p>Consume la cola; no tiene API propia.</p>',
        data: '<p>Qué avisó a quién, para no repetir un correo si el evento llega dos veces.</p>',
        fail: '<ul><li><b>El evento llega dos veces:</b> la tabla de avisos enviados lo descarta.</li><li><b>El servicio de correo está caído:</b> los eventos esperan en la cola.</li></ul>',
        nums: '<ul><li>Un correo puede llegar minutos después sin que nadie lo note; una tecla, no.</li></ul>'
      } },
    { id: 'cola', layer: 'queue', label: 'Cola de eventos', sub: 'revisiones, comentarios y cambios de ACL', x: 920, y: 1340, w: 1700, h: 56, bus: true,
      brief: 'Desacopla lo que se calcula después del camino de la tecla.',
      info: {
        resp: '<p>La sesión publica aquí lo que pasó (revisiones, comentarios, documentos que se abren y se cierran) para que el historial, la búsqueda y los avisos lo procesen a su ritmo, lejos del camino de la tecla. <span class="badge badge--ref">Diseño de referencia</span></p>',
        api: '<pre><code>{"tipo": "revision", "doc_id": "d1", "rev": 1835, "usuario": "ana", "cuando": "2026-10-11T10:02:11.290Z"}\n{"tipo": "comentario", "doc_id": "d1", "id": "c81", "menciona": ["beto"]}</code></pre>',
        data: '<p>Se publica después de guardar en el log, nunca antes: un evento de algo que no se guardó dejaría un historial o un aviso falso. Si la publicación puede fallar, va con outbox (M07).</p>',
        fail: '<ul><li><b>Un consumidor se atrasa:</b> solo su función se atrasa; editar no se entera.</li></ul>',
        nums: '<ul><li>En el clon, una revisión por evento serían 960 millones por día; se publica un resumen por documento cada pocos segundos. <span class="badge badge--ref">Diseño de referencia</span></li></ul>'
      } }
  ],
  edges: [
    { id: 'e1', from: 'ana', to: 'gfe', both: true },
    { id: 'e2', from: 'beto', to: 'gfe', both: true },
    { id: 'e3', from: 'app', to: 'gfe', both: true },
    { id: 'e4', from: 'script', to: 'gfe', both: true },
    { id: 'e5', from: 'gfe', to: 'canal', both: true, label: 'canal' },
    { id: 'e6', from: 'gfe', to: 'web', both: true, label: 'la página' },
    { id: 'e7', from: 'gfe', to: 'docsapi', both: true, label: 'Docs API' },
    { id: 'e8', from: 'gfe', to: 'driveapi', both: true, label: 'Drive API' },
    { id: 'e9', from: 'canal', to: 'directorio', both: true, label: '¿dueño?' },
    { id: 'e10', from: 'canal', to: 'sesion', both: true, label: 'mensajes' },
    { id: 'e11', from: 'directorio', to: 'sesion', both: true, label: 'heartbeat' },
    { id: 'e12', from: 'web', to: 'zanzibar', both: true, label: 'check' },
    { id: 'e13', from: 'web', to: 'meta', both: true, label: 'título' },
    { id: 'e14', from: 'web', to: 'historial', both: true, label: 'versiones' },
    { id: 'e15', from: 'docsapi', to: 'sesion', both: true, label: 'batchUpdate' },
    { id: 'e16', from: 'driveapi', to: 'zanzibar', both: true, label: 'permisos' },
    { id: 'e17', from: 'driveapi', to: 'meta', both: true, label: 'files' },
    { id: 'e18', from: 'driveapi', to: 'coments', both: true, label: 'comments' },
    { id: 'e19', from: 'sesion', to: 'zanzibar', both: true, label: 'check · watch' },
    { id: 'e20', from: 'sesion', to: 'log', both: true, label: 'agregar' },
    { id: 'e21', from: 'sesion', to: 'snaps', both: true, label: 'cada 500' },
    { id: 'e22', from: 'sesion', to: 'coments', both: true, label: 'anclas' },
    { id: 'e23', from: 'sesion', to: 'cola', async: true, label: 'eventos' },
    { id: 'e24', from: 'historial', to: 'log', both: true, label: 'lee' },
    { id: 'e25', from: 'cola', to: 'historial', async: true },
    { id: 'e26', from: 'cola', to: 'busqueda', async: true },
    { id: 'e27', from: 'cola', to: 'avisos', async: true }
  ],
  scenarios: [
    {
      id: 'abrir', title: 'Abrir un documento',
      desc: 'Ana abre un documento que nadie tenía abierto. La página llega primero; el contenido, por el canal, desde una sesión que se crea en ese momento.',
      steps: [
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'GET /document/d/d1/edit', ms: 20, title: 'Ana abre el enlace', text: 'El navegador pide la página del editor al borde de Google más cercano.', code: 'GET /document/d/1aBcD…/edit HTTP/2\nHost: docs.google.com\nCookie: SID=…', lang: 'http' },
        { from: 'gfe', to: 'web', kind: 'req', tag: 'TLS terminado', ms: 1, title: 'El GFE la manda al servidor web', text: 'El GFE terminó TLS y reenvía el pedido. <span class="badge badge--doc">Documentado</span>' },
        { from: 'web', to: 'zanzibar', kind: 'req', tag: 'check(d1#viewer, ana)', ms: 0.5, title: '¿Ana puede verlo?', text: 'Sin permiso confirmado no se muestra ni el título.' },
        { from: 'zanzibar', to: 'web', kind: 'res', tag: 'permitido', ms: 3, title: 'Permitido', text: 'Ana es la dueña. El p50 de un check es de unos 3 ms. <span class="badge badge--doc">Documentado</span>' },
        { from: 'web', to: 'meta', kind: 'req', tag: 'título y dueño', ms: 2, title: 'El título y el dueño', text: 'Para la pestaña del navegador y la barra del editor.' },
        { from: 'meta', to: 'web', kind: 'res', tag: '"Plan 2027"', ms: 2, title: 'De los metadatos al servidor web', text: '' },
        { from: 'web', to: 'gfe', kind: 'res', tag: '200 text/html', ms: 1, title: 'La página, sin el contenido', text: 'El código del editor suele estar en la caché del navegador. El texto del documento no viene en la página: llega por el canal, con su número de revisión.' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: '200', ms: 20, title: 'Del GFE a Ana', text: '' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'abrir canal', ms: 20, title: 'El editor abre el canal', text: 'Una conexión larga que va a quedar abierta mientras el documento esté en pantalla. El clon usa WebSocket. <span class="badge badge--ref">Diseño de referencia</span>' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: 'Upgrade: websocket', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'directorio', kind: 'req', tag: 'dueno("d1")', ms: 1, title: '¿Quién es el dueño de d1?', text: 'Nadie lo tenía abierto: no hay asignación. El directorio elige un servidor con espacio y escribe la asignación con compare-and-set.', code: 'escribir_si("d1", nueva=("s7", 12), esperada=None)', lang: 'python' },
        { from: 'directorio', to: 'canal', kind: 'res', tag: 's7, época 12', ms: 1, title: 'Del directorio al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'hola {rev: -1}', ms: 0.5, title: 'Hola, no tengo nada', text: 'El canal agrega el usuario autenticado; el mensaje del cliente solo trae la revisión que tiene: ninguna.', code: '{"tipo": "hola", "rev": -1}', lang: 'json' },
        { from: 'sesion', to: 'snaps', kind: 'req', tag: 'ultimo("d1")', ms: 1, title: 'La sesión se crea', text: 'Carga el último snapshot y después el log que vino detrás.' },
        { from: 'snaps', to: 'sesion', kind: 'res', tag: 'rev 1500 · 40 KB', ms: 15, title: 'De los snapshots a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'desde("d1", 1500)', ms: 1, title: 'Lo que vino después del snapshot', text: '334 revisiones: se aplican en orden y quedan en memoria para transformar y detectar reenvíos.' },
        { from: 'log', to: 'sesion', kind: 'res', tag: '334 revisiones', ms: 8, title: 'Del log a la sesión', text: '' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'estado {rev: 1834}', ms: 0.5, title: 'El documento, con su número', text: 'Desde ahora, Ana manda sus cambios contra la revisión 1834.', code: '{"tipo": "estado", "rev": 1834, "doc": [{"insert": "Plan 2027\\n"}, …], "cursores": {}}', lang: 'json' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'estado', ms: 20, title: 'Ana puede escribir', text: 'Unos 150 ms desde el clic, sin contar el dibujo. Si el documento ya estaba abierto por otro, la sesión ya está en memoria y se ahorran el snapshot y el log.' }
      ]
    },
    {
      id: 'tecla', title: 'Una tecla',
      desc: 'Ana escribe un signo de exclamación. Lo ve al instante; el servidor lo guarda como la revisión 1835 y Beto lo ve unos 90 ms después.',
      steps: [
        { at: 'ana', kind: 'info', tag: 'aplica local', ms: 2, title: 'Ana ve su tecla al instante', text: 'El editor la aplica en la copia local y la manda. Estaba Sincronizado: la op sale ya y queda como <code>enviada</code>.', code: 'op = Op(5, "!", 30)        # retain 5, insert "!", retain 30\ncliente.editar(op)', lang: 'python' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'op seq 17 base 1834', ms: 20, title: 'La op sale', text: 'Con su número de secuencia y la revisión sobre la que se escribió.', code: '{"tipo": "op", "seq": 17, "base": 1834, "op": [{"retain": 5}, {"insert": "!"}, {"retain": 30}]}', lang: 'json' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op · usuario ana', ms: 0.5, title: 'Llega a la sesión', text: 'Por la conexión ya abierta. El canal agrega quién es Ana; el mensaje nunca lo dice.' },
        { at: 'sesion', kind: 'info', tag: 'base = rev: nada que transformar', ms: 0.1, title: 'Nadie escribió en el medio', text: 'La base es la revisión actual: la op queda como vino. Antes revisa que <code>(t1, 17)</code> no esté ya en el log: no es un reenvío.' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'INSERT rev 1835', ms: 1, title: 'Se guarda', text: 'Escritura condicional: falla si la 1835 ya existe.' },
        { from: 'log', to: 'sesion', kind: 'res', tag: 'ok', ms: 8, title: 'Guardada', text: 'Recién ahora se avisa a alguien. Si se confirmara antes de guardar y el servidor cayera, Ana creería guardado algo que no está.' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'ack seq 17 rev 1835', ms: 0.5, title: 'Ack a Ana y remota a Beto', text: 'Ana pasa a la revisión 1835 y queda Sincronizado.', code: '{"tipo": "ack", "seq": 17, "rev": 1835}', lang: 'json' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'ack', ms: 20, title: 'Del GFE a Ana', text: '' },
        { from: 'gfe', to: 'beto', kind: 'async', tag: 'remota rev 1835', ms: 40, title: 'Beto la recibe', text: 'La aplica, transformada contra lo suyo pendiente si tenía algo. Unos 90 ms desde que Ana apretó la tecla.', code: '{"tipo": "remota", "rev": 1835, "cliente": "t1", "usuario": "ana", "op": [{"retain": 5}, {"insert": "!"}, {"retain": 30}]}', lang: 'json' },
        { from: 'sesion', to: 'cola', kind: 'async', tag: 'revisión 1835', ms: 1, title: 'Y, aparte, a la cola', text: 'Para el historial, la búsqueda y los avisos. Nada de eso demora la tecla.' }
      ]
    },
    {
      id: 'simultaneo', title: 'Dos teclas a la vez',
      desc: 'En «gato», Ana agrega una s y Beto un signo de exclamación, los dos en la posición 4 y sobre la misma revisión. Las dos copias tienen que terminar iguales.',
      steps: [
        { at: 'ana', kind: 'info', tag: 'gatos', ms: 1, title: 'Ana escribe la s', text: 'Su copia dice «gatos». Manda la op con base 40.', code: 'Op(4, "s")', lang: 'python' },
        { at: 'beto', kind: 'info', tag: 'gato!', ms: 1, title: 'Beto escribe el signo', text: 'Su copia dice «gato!». También manda con base 40: no vio lo de Ana.', code: 'Op(4, "!")', lang: 'python' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'op base 40', ms: 20, title: 'De Ana al GFE', text: '' },
        { from: 'beto', to: 'gfe', kind: 'req', tag: 'op base 40', ms: 40, title: 'Beto está más lejos', text: 'Su op llega 20 ms después que la de Ana. El orden de llegada decide el empate.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: 'Ana primero', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op de Ana', ms: 0.5, title: 'Llega la de Ana', text: 'Base 40 y el documento va por la 40: se guarda como la 41 sin transformar.' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 41', ms: 8, title: 'De la sesión al log', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op de Beto', ms: 20, title: 'Llega la de Beto', text: 'Base 40, pero el documento ya va por la 41: Beto no vio la s. La sesión la transforma contra la 41. Empate en la posición 4: lo del log va primero, y la op de Beto pasa a la posición 5.', code: 'beto2, _ = transformar(Op(4, "!"), Op(4, "s"), a_primero=False)\n# beto2 == Op(5, "!")', lang: 'python' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 42: «!» en 5', ms: 8, title: 'Se guarda transformada', text: 'El log nunca tiene dos ops en conflicto: tiene una detrás de la otra, cada una ya ajustada a la anterior.' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'a Ana: remota 42', ms: 0.5, title: 'Ana recibe la de Beto ya transformada', text: 'Inserta el signo en la 5: «gatos!».' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'beto', kind: 'res', tag: 'remota 41 y ack 42', ms: 40, title: 'Beto recibe la de Ana', text: 'La transforma contra su op en vuelo con el mismo desempate: la s de Ana va primero. Queda «gatos!», igual que Ana. Este es TP1 (31.5).', code: 'ana2, _ = transformar(Op(4, "s"), Op(4, "!"), a_primero=True)\n# ana2 == Op(4, "s") y "gato!" pasa a "gatos!"', lang: 'python' }
      ]
    },
    {
      id: 'cursor', title: 'Ver el cursor de otro',
      desc: 'Beto mueve el cursor. Ana ve dónde está, aunque los dos estén escribiendo. La presencia no se guarda: si se pierde un mensaje, el siguiente lo corrige.',
      steps: [
        { at: 'beto', kind: 'info', tag: 'solo si está Sincronizado', ms: 1, title: 'Beto mueve el cursor', text: 'Si tiene cambios sin ack, su posición local no le sirve a nadie: espera al ack y la manda entonces.', code: '{"tipo": "cursor", "rev": 1835, "pos": 120}', lang: 'json' },
        { from: 'beto', to: 'gfe', kind: 'req', tag: 'cursor rev 1835 pos 120', ms: 40, title: 'De Beto al GFE', text: '' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'cursor', ms: 0.5, title: 'La sesión lo pone al día', text: 'Si la revisión del mensaje es vieja, corre la posición por las revisiones que vinieron después y la guarda en la revisión actual.' },
        { at: 'sesion', kind: 'info', tag: 'no va al log', ms: 0.1, title: 'La presencia no se guarda', text: 'Vive en memoria. En producción, la sesión junta los cursores cada 50 ms y los manda en lote; el clon reenvía cada uno. <span class="badge badge--ref">Diseño de referencia</span>' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'cursor de t2', ms: 0.5, title: 'A todos menos a Beto', text: '', code: '{"tipo": "cursor", "cliente": "t2", "rev": 1835, "pos": 120}', lang: 'json' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'cursor de Beto', ms: 20, title: 'Ana lo dibuja corrido', text: 'Ana guarda la posición en coordenadas del servidor y la muestra corrida por lo que ella tiene sin confirmar. Si Ana tenía «hola» pendiente al principio, ve el cursor de Beto 4 lugares más allá (31.10).' }
      ]
    },
    {
      id: 'comentario', title: 'Comentar y mencionar',
      desc: 'Ana selecciona «mundo», escribe un comentario y menciona a Beto. El comentario queda anclado al texto y a Beto le llega un correo.',
      steps: [
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'comentar [5, 10) en rev 1835', ms: 20, title: 'Ana comenta', text: 'El rango va con la revisión en que lo eligió: si llegan ops en el camino, la sesión lo corre.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'comentar', ms: 0.5, title: 'La sesión ancla el comentario', text: 'El inicio se mueve como un cursor que empuja; el fin, como uno que no: lo que se escriba justo después de «mundo» no entra en el rango.', code: 'com = sesion.comentar("t1", "c81", rev=1835, inicio=5, fin=10, texto="¿mundo o gente? @beto")', lang: 'python' },
        { from: 'sesion', to: 'coments', kind: 'req', tag: 'INSERT c81', ms: 5, title: 'Se guarda aparte', text: 'Con el rango en la revisión actual. Desde ahora, cada op mueve el ancla.' },
        { from: 'coments', to: 'sesion', kind: 'res', tag: 'ok', ms: 5, title: 'De los comentarios a la sesión', text: '' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'comentario a todos', ms: 0.5, title: 'Lo ven los que tienen el doc abierto', text: '' },
        { from: 'sesion', to: 'cola', kind: 'async', tag: 'comentario · menciona beto', ms: 1, title: 'Un evento para los avisos', text: '' },
        { from: 'cola', to: 'avisos', kind: 'async', tag: 'menciona beto', ms: 200, title: 'Avisos lo procesa', text: 'Revisa que Beto pueda ver el documento: mencionar a alguien sin acceso ofrece compartirlo, no le manda el texto.' },
        { at: 'avisos', kind: 'info', tag: 'correo a Beto', ms: 300, title: '"Ana te mencionó en Plan 2027"', text: 'Con el texto del comentario y un enlace al ancla. Si el evento llega dos veces, la tabla de avisos enviados lo descarta.' },
        { at: 'sesion', kind: 'info', tag: 'Caro borra «mundo»', ms: 1, title: 'Si después borran el texto', text: 'El rango queda vacío y el comentario, huérfano: se muestra aparte, sin perderse.', code: 'com.mover(Op(5, -5, 30))\ncom.huerfano   # True', lang: 'python' }
      ]
    },
    {
      id: 'sugerencia', title: 'Sugerir un cambio',
      desc: 'Beto, en modo sugerencia, cambia «mundo» por «gente». El cambio queda escrito en el documento, marcado; Ana lo acepta.',
      steps: [
        { at: 'beto', kind: 'info', tag: 'sugerir(op, "s1")', ms: 1, title: 'La op se vuelve sugerencia', text: 'El borrado pasa a ser un retain que marca el texto con <code>sug_del</code>; el insert lleva <code>sug_ins</code>. No se borra nada: queda todo escrito y marcado.', code: 'op = sugerir(Op(5, -5, "gente", 30), "s1")\n# [{"retain": 5}, {"insert": "gente", "attributes": {"sug_ins": "s1"}},\n#  {"retain": 5, "attributes": {"sug_del": "s1"}}, {"retain": 30}]', lang: 'python' },
        { from: 'beto', to: 'gfe', kind: 'req', tag: 'op con marcas', ms: 40, title: 'Viaja como cualquier op', text: 'Para el servidor es una op de formato y texto: se transforma y se guarda igual. Las sugerencias no necesitan un camino aparte.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op', ms: 0.5, title: 'Del canal a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 1836', ms: 8, title: 'Se guarda', text: 'La Docs API muestra lo mismo: cada tramo de texto trae <code>suggestedInsertionIds</code> y <code>suggestedDeletionIds</code>. <span class="badge badge--doc">Documentado</span>' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'remota 1836', ms: 0.5, title: 'De la sesión al canal', text: '' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'mundo tachado, gente subrayado', ms: 20, title: 'Ana ve la sugerencia', text: 'Su editor dibuja lo marcado con <code>sug_del</code> tachado y lo marcado con <code>sug_ins</code> subrayado.' },
        { at: 'ana', kind: 'info', tag: 'resolver(doc, "s1", aceptar=True)', ms: 1, title: 'Ana acepta', text: 'Aceptar es otra op: borra lo marcado <code>sug_del</code> y le quita la marca a lo <code>sug_ins</code>. Rechazar hace lo contrario.', code: 'op = resolver(doc, "s1", aceptar=True)   # una op normal, que viaja como cualquier otra', lang: 'python' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'op de aceptar', ms: 20, title: 'De Ana al GFE', text: '' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op', ms: 0.5, title: 'Del canal a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 1837: «hola gente»', ms: 8, title: 'Queda «hola gente»', text: 'Dos revisiones en el log: la sugerencia y la aceptación. El historial puede mostrar las dos.' }
      ]
    },
    {
      id: 'version', title: 'Volver a la versión de las 10:12',
      desc: 'Ana abre el historial y restaura cómo estaba el documento a las 10:12. Nada se borra: la restauración es una revisión más.',
      steps: [
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'historial de d1', ms: 20, title: 'Ana abre el historial', text: 'Necesita permiso de edición.' },
        { from: 'gfe', to: 'web', kind: 'req', tag: '', ms: 1, title: 'Del GFE al servidor web', text: '' },
        { from: 'web', to: 'historial', kind: 'req', tag: 'versiones("d1")', ms: 1, title: 'Las versiones agrupadas', text: 'El historial ya las tiene calculadas a partir de la cola.' },
        { from: 'historial', to: 'web', kind: 'res', tag: '12 versiones', ms: 5, title: 'Del historial al servidor web', text: '' },
        { from: 'web', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del servidor web al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'lista', ms: 20, title: 'Elige la de las 10:12', text: 'Que termina en la revisión 1830.' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'ver rev 1830', ms: 20, title: 'De Ana al GFE', text: '' },
        { from: 'gfe', to: 'web', kind: 'req', tag: '', ms: 1, title: 'Del GFE al servidor web', text: '' },
        { from: 'web', to: 'historial', kind: 'req', tag: 'doc_en("d1", 1830)', ms: 1, title: 'Arma el documento en la 1830', text: 'Último snapshot anterior, la 1500, más las revisiones 1501 a 1830.' },
        { from: 'historial', to: 'log', kind: 'req', tag: 'desde 1500 hasta 1830', ms: 1, title: 'Del historial al log', text: '' },
        { from: 'log', to: 'historial', kind: 'res', tag: '330 revisiones', ms: 10, title: 'Del log al historial', text: '' },
        { from: 'historial', to: 'web', kind: 'res', tag: 'doc en la 1830', ms: 2, title: 'Del historial al servidor web', text: '' },
        { from: 'web', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del servidor web al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'vista previa', ms: 20, title: 'Ana restaura', text: 'Su editor calcula una op que lleva el documento actual al de la 1830 y la manda como cualquier otra.', code: 'op = diferencia(doc_actual, doc_1830)   # borra lo que sobra, inserta lo que falta', lang: 'python' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'op de restaurar', ms: 20, title: 'De Ana al GFE', text: '' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op', ms: 0.5, title: 'Del canal a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 1838: restaurar 10:12', ms: 8, title: 'Una revisión más', text: 'El log no se trunca: las revisiones 1831 a 1837 siguen ahí, y se puede volver a restaurarlas. Si Beto escribió mientras tanto, su cambio se transforma contra la restauración como contra cualquier op.' }
      ]
    },
    {
      id: 'compartir', title: 'Compartir y revocar',
      desc: 'Ana le da edición a Beto; una hora después se la quita. Beto, que tenía el documento abierto, pierde el acceso en el momento.',
      steps: [
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'compartir con beto: writer', ms: 20, title: 'Ana comparte', text: '', code: 'POST /drive/v3/files/1aBcD…/permissions\n{ "type": "user", "role": "writer", "emailAddress": "beto@ejemplo.com" }', lang: 'http' },
        { from: 'gfe', to: 'driveapi', kind: 'req', tag: 'permissions.create', ms: 1, title: 'Del GFE a la Drive API', text: '' },
        { from: 'driveapi', to: 'zanzibar', kind: 'req', tag: 'write +d1#writer@beto', ms: 1, title: 'Una tupla nueva', text: 'El permiso es una tupla. La escritura devuelve un zookie con su instante.' },
        { from: 'zanzibar', to: 'driveapi', kind: 'res', tag: 'zookie z1', ms: 10, title: 'De Zanzibar a la Drive API', text: '' },
        { from: 'driveapi', to: 'gfe', kind: 'res', tag: '200', ms: 1, title: 'De la Drive API al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'compartido', ms: 20, title: 'Beto puede editar', text: 'Abre el documento como en "Abrir un documento"; su check dice <code>writer</code>.' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'quitar a beto', ms: 20, title: 'Una hora después, Ana se lo quita', text: '', code: 'DELETE /drive/v3/files/1aBcD…/permissions/{permissionId}', lang: 'http' },
        { from: 'gfe', to: 'driveapi', kind: 'req', tag: 'permissions.delete', ms: 1, title: 'Del GFE a la Drive API', text: '' },
        { from: 'driveapi', to: 'zanzibar', kind: 'req', tag: 'write -d1#writer@beto', ms: 1, title: 'De la Drive API a Zanzibar', text: '' },
        { from: 'zanzibar', to: 'driveapi', kind: 'res', tag: 'zookie z2', ms: 10, title: 'De Zanzibar a la Drive API', text: '' },
        { from: 'zanzibar', to: 'sesion', kind: 'async', tag: 'watch: cambió d1', ms: 50, title: 'El watch avisa a la sesión', text: 'La sesión tenía el permiso de Beto en caché: ahora lo olvida y vuelve a preguntar, al menos tan fresco como z2.', code: 'sesion.al_cambiar_permisos(zookie="z2")', lang: 'python' },
        { from: 'sesion', to: 'zanzibar', kind: 'req', tag: 'check(d1#viewer, beto, z2)', ms: 0.5, title: '¿Beto sigue pudiendo ver?', text: 'Con el zookie no sirve una réplica atrasada: ve la ACL de después de quitarlo.' },
        { from: 'zanzibar', to: 'sesion', kind: 'res', tag: 'denegado', ms: 3, title: 'De Zanzibar a la sesión', text: '' },
        { from: 'sesion', to: 'canal', kind: 'fail', tag: 'cerrar: ya no tiene acceso', ms: 0.5, title: 'Se cierra la conexión de Beto', text: 'Lo que Beto escriba desde ahora no llega. Lo que escribió antes ya está en el log, con su nombre.', code: '{"tipo": "cerrar", "motivo": "ya no tiene acceso"}', lang: 'json' },
        { from: 'canal', to: 'gfe', kind: 'fail', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'beto', kind: 'fail', tag: 'sin acceso', ms: 40, title: 'Beto ve un aviso', text: 'Si recarga, la página da 403 y le ofrece pedir acceso.' }
      ]
    },
    {
      id: 'offline', title: 'Volver de offline',
      desc: 'Ana estuvo una hora sin red y escribió 30 cambios. Mientras tanto, Beto y Caro guardaron 60 revisiones. Al volver, todo converge sin perder nada.',
      steps: [
        { at: 'ana', kind: 'info', tag: 'rev 120 · sin red', ms: 1, title: 'Ana pierde la red en la revisión 120', text: 'Sigue escribiendo: cada cambio se compone en el buffer, que se guarda en IndexedDB. Si tenía una op en vuelo, no sabe si llegó.' },
        { at: 'ana', kind: 'info', tag: '30 cambios en el buffer', ms: 3600000, title: 'Una hora', text: 'En el servidor, Beto y Caro guardan las revisiones 121 a 180.' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'hola {rev: 120}', ms: 20, title: 'Vuelve la red', text: 'El editor reabre el canal y dice qué revisión tiene.', code: '{"tipo": "hola", "rev": 120}', lang: 'json' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'hola 120', ms: 0.5, title: 'Del canal a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'desde 120', ms: 1, title: 'Lo que Ana no vio', text: 'Las últimas 1&#8239;000 están en memoria; si Ana se hubiera ido más tiempo, se leen del log.' },
        { from: 'log', to: 'sesion', kind: 'res', tag: '60 revisiones', ms: 8, title: 'Del log a la sesión', text: '' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'al_dia {121…180}', ms: 0.5, title: 'Al día', text: 'Si su op en vuelo había llegado antes del corte, está entre estas revisiones con su <code>(cliente, seq)</code>: Ana la cuenta como confirmada. Si no, la reenvía con el mismo seq.' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'al_dia', ms: 20, title: 'Ana transforma su buffer', text: 'Contra cada una de las 60, en orden: lo de los demás va primero en los empates.', code: 'for r in revisiones:\n    _, buffer = transformar(r.op, buffer, a_primero=True)\n    doc = r.op_transformada.aplicar(doc)', lang: 'python' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'op base 180', ms: 20, title: 'Manda todo junto', text: 'Una sola op con los 30 cambios, sobre la 180.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'op', ms: 0.5, title: 'Del canal a la sesión', text: '' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 181', ms: 8, title: 'Guardada', text: 'Converge, pero puede sorprender: si Beto borró el párrafo que Ana editaba, lo que Ana insertó queda suelto. Conviene mostrarle qué cambió mientras no estaba.' }
      ]
    },
    {
      id: 'caida', title: 'Se cae el dueño',
      desc: 'El servidor de sesión de d1 se congela en plena edición. Otro toma el documento y nadie pierde ni duplica un cambio.',
      steps: [
        { at: 'sesion', kind: 'fail', tag: 's7 congelado', ms: 1, down: ['sesion'], title: 's7 deja de responder', text: 'Una pausa larga del recolector de basura, o la red cortada. Ana tenía la op seq 18 en vuelo y no le llegó el ack.' },
        { from: 'canal', to: 'sesion', kind: 'fail', tag: 'timeout', ms: 5000, title: 'El canal se da cuenta', text: 'La conexión con s7 no responde. El canal cierra las conexiones de los clientes de d1.' },
        { from: 'directorio', to: 'sesion', kind: 'fail', tag: 'heartbeat vencido', ms: 10000, title: 's7 no renovó su heartbeat', text: 'El directorio lo da por caído y libera sus documentos.' },
        { from: 'ana', to: 'gfe', kind: 'req', tag: 'hola {rev: 1838}', ms: 20, title: 'Ana reconecta', text: 'Con jitter: si los 40 editores de d1 reconectan juntos, el primero que abre la sesión la ve llena de golpe.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'directorio', kind: 'req', tag: 'dueno("d1")', ms: 1, title: 'Nuevo dueño', text: 'Compare-and-set de s7 época 12 a s3 época 13.', code: 'escribir_si("d1", nueva=("s3", 13), esperada=("s7", 12))', lang: 'python' },
        { from: 'directorio', to: 'canal', kind: 'res', tag: 's3, época 13', ms: 1, title: 'Del directorio al canal', text: '' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'hola 1838 a s3', ms: 0.5, up: ['sesion'], title: 's3 crea la sesión', text: 'Snapshot más log, como al abrir. La seq 18 de Ana había llegado a guardarse como la 1839 antes de la pausa.' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'desde 1500', ms: 8, title: 'De la sesión al log', text: '' },
        { from: 'log', to: 'sesion', kind: 'res', tag: 'hasta 1839', ms: 8, title: 'Del log a la sesión', text: '' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'al_dia {1839}', ms: 0.5, title: 'Ana ve su propia revisión', text: 'La 1839 es <code>(t1, 18)</code>: cuenta como el ack que nunca llegó. No reenvía nada.' },
        { at: 'sesion', kind: 'info', tag: 's7 despierta', ms: 1, title: 's7 vuelve a la vida', text: 'Todavía cree ser el dueño, y tenía en memoria una op de Caro lista para guardarse como la 1840.' },
        { from: 'sesion', to: 'log', kind: 'fail', tag: 'INSERT 1840 de s7', ms: 8, title: 'La escritura de s7 falla', text: 's3 ya guardó otra 1840. El INSERT condicional falla, s7 cierra la sesión y Caro reconecta a s3, donde reenvía con el mismo seq. Nada se pisa ni se duplica: la seguridad la da el log, no el directorio.' }
      ]
    },
    {
      id: 'api', title: 'Un script edita por la API',
      desc: 'Un script agrega una línea con la Docs API mientras Ana escribe. La edición entra a la misma sesión y Ana la ve como la de cualquier colaborador.',
      steps: [
        { from: 'script', to: 'gfe', kind: 'req', tag: 'batchUpdate', ms: 30, title: 'El script manda un lote', text: 'Contra la revisión que leyó, con <code>targetRevisionId</code>: los cambios se transforman contra los de los colaboradores. <span class="badge badge--doc">Documentado</span>', code: 'POST /v1/documents/1aBcD…:batchUpdate\n{ "requests": [ { "insertText": { "location": { "index": 1 }, "text": "Ventas: 1 204\\n" } } ],\n  "writeControl": { "targetRevisionId": "ALm37BW…" } }', lang: 'http' },
        { from: 'gfe', to: 'docsapi', kind: 'req', tag: '', ms: 1, title: 'Del GFE a la Docs API', text: '' },
        { at: 'docsapi', kind: 'info', tag: 'pedidos → op', ms: 1, title: 'Los pedidos se vuelven una op', text: 'Cada pedido por índice se traduce a retain, insert y delete. El <code>revisionId</code> opaco se traduce a una revisión del log. <span class="badge badge--ref">Diseño de referencia</span>' },
        { from: 'docsapi', to: 'sesion', kind: 'req', tag: 'op base 1835', ms: 0.5, title: 'Entra a la sesión', text: 'Como un cliente más, con su propio id y seq: si el script reintenta, el reenvío se detecta igual.' },
        { at: 'sesion', kind: 'info', tag: 'contra 1836…1840', ms: 0.2, title: 'Se transforma', text: 'Ana escribió cinco revisiones desde que el script leyó.' },
        { from: 'sesion', to: 'log', kind: 'req', tag: 'rev 1841', ms: 8, title: 'De la sesión al log', text: '' },
        { from: 'sesion', to: 'docsapi', kind: 'res', tag: 'ok', ms: 0.5, title: 'De la sesión a la Docs API', text: '' },
        { from: 'docsapi', to: 'gfe', kind: 'res', tag: '200 replies', ms: 1, title: 'De la Docs API al GFE', text: '' },
        { from: 'gfe', to: 'script', kind: 'res', tag: '200', ms: 30, title: 'Respuesta', text: '', code: '200 { "replies": [ {} ], "writeControl": { "requiredRevisionId": "ALm37BZ…" } }', lang: 'json' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'remota 1841', ms: 0.5, title: 'Ana la ve', text: 'Como la tecla de un colaborador.' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'ana', kind: 'res', tag: 'remota', ms: 20, title: 'Del GFE a Ana', text: '' }
      ]
    },
    {
      id: 'viral', title: 'Un documento viral',
      desc: 'Un documento público llega a la portada de un sitio: 5 000 personas lo abren en diez minutos. La sesión tiene un solo dueño; hay que protegerla.',
      steps: [
        { from: 'beto', to: 'gfe', kind: 'req', tag: '× 5 000 lectores', ms: 40, title: 'Llegan miles', text: 'Casi todos solo leen.' },
        { from: 'gfe', to: 'canal', kind: 'req', tag: '', ms: 1, title: 'Del GFE al canal', text: '' },
        { from: 'canal', to: 'directorio', kind: 'req', tag: 'dueno("d9")', ms: 1, title: 'El directorio aguanta', text: 'El canal cachea la respuesta: un acceso por gateway, no por lector.' },
        { from: 'canal', to: 'sesion', kind: 'req', tag: 'hola × 5 000', ms: 0.5, title: 'Todos a la misma sesión', text: 'Un solo servidor ordena los cambios de d9. Lo que crece no son los cambios, que son pocos, sino las copias de cada uno y la presencia.' },
        { at: 'sesion', kind: 'info', tag: 'más de 100 abiertos', ms: 1, title: 'El límite de Docs', text: 'Con más de 100 pestañas o dispositivos abiertos, solo el dueño y algunos editores pueden editar. <span class="badge badge--doc">Documentado</span> El resto queda en modo lectura.' },
        { at: 'sesion', kind: 'info', tag: 'presencia: solo un número', ms: 1, title: 'Sin cursores de los lectores', text: 'Con n personas, cada ronda de cursores son n × (n − 1) mensajes: con 5&#8239;000, unos 25 millones. Los lectores no mandan cursor; se muestran como un número. <span class="badge badge--ref">Diseño de referencia</span>' },
        { at: 'sesion', kind: 'info', tag: 'un lote cada 200 ms', ms: 1, title: 'Las ops, en lote', text: 'A los lectores se les mandan las revisiones juntas cada 200 ms en lugar de una por una. Para quien lee, 200 ms no se notan. <span class="badge badge--ref">Diseño de referencia</span>' },
        { from: 'sesion', to: 'canal', kind: 'res', tag: 'lote de revisiones', ms: 0.5, title: 'De la sesión al canal', text: '' },
        { from: 'canal', to: 'gfe', kind: 'res', tag: '', ms: 1, title: 'Del canal al GFE', text: '' },
        { from: 'gfe', to: 'beto', kind: 'res', tag: 'lote', ms: 40, title: 'Si ni así alcanza', text: 'Los lectores pasan a una capa de difusión aparte, que reparte las revisiones ya guardadas y no toca la sesión: es el ejercicio guiado del final.' }
      ]
    }
  ]
});
