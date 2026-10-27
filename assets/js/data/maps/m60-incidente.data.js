/* Mapa del M60: cuatro incidentes de Tienda Norte vistos desde la respuesta.
   La infraestructura es la del hilo de la Parte VII (diseño de referencia). Los comportamientos de CloudTrail,
   IAM, IMDSv2 y del audit log de Kubernetes son los documentados por AWS y por Kubernetes; las horas, las IP
   (rangos de documentación de RFC 5737) y los identificadores son de ejemplo. Los ataques se muestran solo
   como el rastro que dejan. */
(function () {
  var DOC = '<span class="badge badge--doc">Documentado</span>';
  var REF = '<span class="badge badge--ref">Diseño de referencia</span>';

  SD.defineMap('m60-incidente', {
    title: 'Respuesta a incidentes en Tienda Norte',
    intro: 'La infraestructura de Tienda Norte con cuatro incidentes. A la izquierda, el origen desconocido; en el centro, la entrega, el clúster y los datos; arriba, la cuenta de la nube; a la derecha, el SIEM y el equipo de respuesta. Cada paso dice lo que se ve, lo que se hace y lo que no se toca.',
    start: 'equipo',
    stepPanel: true,
    pieces: true,
    groups: [
      { id: 'g-int', label: 'Internet', x: 50, y: 50, w: 220, h: 140 },
      { id: 'g-cloud', label: 'Cuenta de la nube', x: 730, y: 50, w: 560, h: 140 },
      { id: 'g-ent', label: 'Entrega y plano de control', x: 390, y: 250, w: 900, h: 140 },
      { id: 'g-k8s', label: 'Nodos del clúster', x: 390, y: 450, w: 900, h: 140 },
      { id: 'g-data', label: 'Datos y metadatos', x: 390, y: 650, w: 900, h: 320 },
      { id: 'g-soc', label: 'Detección y respuesta', x: 1440, y: 50, w: 560, h: 920 }
    ],
    nodes: [
      { id: 'externo', layer: 'external', label: 'Origen desconocido', sub: '203.0.113.0/24', x: 160, y: 120,
        brief: 'Quien usa lo robado: solo se conoce por su rastro (IP, agente, horario).',
        why: '<p>En la respuesta, el atacante no es una persona que se ve: es un conjunto de rastros. Modelarlo como un nodo ayuda a preguntar por cada arista que sale de él qué registro la habría visto.</p>',
        info: {
          resp: '<p>No es una pieza de Tienda Norte. Representa todo lo que llega desde afuera con credenciales o pedidos que no son legítimos. Lo que se sabe de él sale de <code>sourceIPAddress</code>, <code>userAgent</code> y del horario en los registros.</p>',
          api: '<p>Usa las mismas API que todos: HTTPS hacia el ingress y las API de la nube con una credencial robada. Por eso la detección mira <b>quién</b> y <b>desde dónde</b>, no el tipo de pedido.</p>',
          data: '<p>Los indicadores de un incidente (IP, agentes, hashes de binarios) se guardan en el caso y alimentan las detecciones de la vuelta.</p>',
          fail: '<ul><li><b>Bloquear solo la IP:</b> cambia de IP en minutos. La contención real es sobre la credencial o el acceso.</li><li><b>"Contraatacar":</b> nunca. Se contiene lo propio, y lo demás lo deciden legal y las autoridades.</li></ul>',
          nums: '<ul><li>Las IP de este mapa son del rango de documentación 203.0.113.0/24 (RFC 5737).</li></ul>'
        } },
      { id: 'iam', layer: 'external', label: 'IAM', sub: 'usuarios, roles, llaves', x: 840, y: 120,
        brief: 'Las identidades de la nube: donde se desactivan llaves y se revocan sesiones.',
        why: '<p>En la nube, el perímetro es la identidad. Casi toda contención de un incidente en la nube termina siendo un cambio en IAM: desactivar una llave, revocar sesiones de un rol, quitar una política.</p>',
        info: {
          resp: '<p>Autentica cada llamada a la API de la nube y decide si se permite (<a href="m37-nube.html#iam">M37.2</a>). En la respuesta es la palanca de contención más rápida.</p>',
          api: '<pre data-lang="shell"><code>aws iam update-access-key --user-name ci-deployer \\\n  --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive\naws iam list-access-keys --user-name backup-legacy</code></pre><p>Para un rol, "revocar sesiones activas" agrega una política que niega los tokens emitidos antes de ese momento ' + DOC + '.</p>',
          data: '<p>Usuarios con llaves de larga vida, roles con credenciales temporales y las políticas que los atan. Cada llave tiene un id (<code>AKIA…</code>) que aparece en CloudTrail.</p>',
          fail: '<ul><li><b>Borrar la llave en lugar de desactivarla:</b> no agrega seguridad y complica cruzarla con CloudTrail.</li><li><b>Desactivar una llave y no buscar las que creó:</b> la persistencia sigue ahí.</li></ul>',
          nums: '<ul><li>Desactivar una llave tarda segundos; la propagación de cambios de IAM es eventual y suele ser de segundos ' + DOC + '.</li></ul>'
        } },
      { id: 'trail', layer: 'external', label: 'CloudTrail', sub: 'registro de cada llamada', x: 1180, y: 120,
        brief: 'Registra cada llamada a la API de la nube: quién, desde dónde, qué y cuándo.',
        why: '<p>Sin CloudTrail no hay línea de tiempo de la nube. Y lo que no se configuró antes (eventos de datos, retención larga) no se puede pedir después.</p>',
        info: {
          resp: '<p>Guarda los eventos de gestión de 90 días en el historial sin configurar nada; un trail a un bucket da retención propia y validación de integridad ' + DOC + '.</p>',
          api: '<pre data-lang="shell"><code>aws cloudtrail lookup-events --start-time 2026-03-14T02:00Z \\\n  --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAIOSFODNN7EXAMPLE</code></pre><p>El historial acepta un solo atributo por búsqueda; para cruzar varios hace falta CloudTrail Lake o el SIEM ' + DOC + '.</p>',
          data: '<pre data-lang="json"><code>{ "eventTime": "2026-03-14T04:05:12Z",\n  "eventName": "CreateAccessKey",\n  "userIdentity": { "userName": "ci-deployer" },\n  "sourceIPAddress": "203.0.113.45" }</code></pre>',
          fail: '<ul><li><b>Sin eventos de datos de S3:</b> se ve que listaron buckets, no qué objetos leyeron.</li><li><b>El trail en la misma cuenta, con permiso de borrarlo:</b> quien compromete la cuenta borra el registro. Va a una cuenta aparte.</li></ul>',
          nums: '<ul><li>90 días de eventos de gestión en el historial, por región ' + DOC + '.</li></ul>'
        } },
      { id: 'ci', layer: 'external', label: 'GitHub Actions', sub: 'build, pruebas y publicación', x: 500, y: 320,
        brief: 'El pipeline que compila, firma y publica; si tiene secretos, es un blanco.',
        why: '<p>El CI tiene permisos de producción: publica imágenes y despliega. Un secreto de larga vida en un job es una credencial esperando a filtrarse (<a href="m56-supply-chain.html#ci">M56.4</a>).</p>',
        info: {
          resp: '<p>Construye la imagen, genera el SBOM, la firma y la publica en el registro. En el incidente 1, también es por donde se filtró la llave.</p>',
          api: '<p>Con OIDC, el job pide credenciales temporales a la nube con su identidad (repositorio, rama, workflow), sin guardar ninguna llave ' + DOC + '.</p>',
          data: '<p>Logs de cada job (que pueden contener lo que un paso imprimió), secretos del repositorio y artefactos.</p>',
          fail: '<ul><li><b>Una acción por tag que cambia:</b> el patrón de tj-actions (<a href="m56-supply-chain.html#casos">M56.2</a>).</li><li><b>Borrar los logs del job filtrado:</b> son evidencia. Se restringe su acceso y se copian.</li></ul>',
          nums: '<ul><li>Las credenciales de OIDC duran lo que pida el rol, típicamente una hora.</li></ul>'
        } },
      { id: 'registry', layer: 'db', label: 'Registro de imágenes', sub: 'imágenes firmadas por digest', x: 840, y: 320,
        brief: 'Guarda las imágenes firmadas; dice qué digest se publicó y cuándo.',
        why: '<p>En un incidente de contenedor, la pregunta "¿esta imagen es la que construimos?" se responde comparando el digest que corre con el que firmó el pipeline.</p>',
        info: {
          resp: '<p>Guarda imágenes por digest con su firma y su SBOM (<a href="m56-supply-chain.html#firmas">M56.7</a>). Su log dice quién publicó cada una.</p>',
          api: '<pre data-lang="shell"><code>cosign verify registro.tiendanorte.example/api@sha256:… \\\n  --certificate-identity-regexp "^https://github.com/tienda-norte/" \\\n  --certificate-oidc-issuer https://token.actions.githubusercontent.com</code></pre>',
          data: '<p>Manifiestos, capas, firmas, attestations y el log de pushes.</p>',
          fail: '<ul><li><b>Tags mutables:</b> <code>api:latest</code> no dice qué corría ayer. Se investiga por digest.</li></ul>',
          nums: '<ul><li>El SBOM de cada digest responde en minutos "¿qué imágenes tienen esta librería?".</li></ul>'
        } },
      { id: 'k8sapi', layer: 'service', label: 'API server de K8s', sub: 'audit log activado', x: 1180, y: 320,
        brief: 'El plano de control: crea pods, aplica políticas y registra cada pedido en el audit log.',
        why: '<p>Todo cambio en el clúster pasa por aquí. Si el audit log está activo, aquí está quién creó, borró o abrió un <code>exec</code> en cada pod.</p>',
        info: {
          resp: '<p>Recibe cada pedido a la API de Kubernetes y lo registra según la política de auditoría. En la respuesta, es donde se aplican la cuarentena y el cordon.</p>',
          api: '<pre data-lang="shell"><code>kubectl apply -f cuarentena.yaml\nkubectl label pod api-7d9f-x2k -n tienda cuarentena=si app=api-cuarentena --overwrite\nkubectl cordon ip-10-0-3-7</code></pre>',
          data: '<p>Eventos de auditoría con <code>user</code>, <code>verb</code>, <code>objectRef</code>, <code>sourceIPs</code> y la hora, al nivel que pida la política ' + DOC + '.</p>',
          fail: '<ul><li><b>Audit log apagado:</b> es el valor por defecto sin política ' + DOC + '. No se sabrá quién hizo qué.</li><li><b>Nivel RequestResponse para todo:</b> registra el cuerpo de los Secrets. Para ellos, Metadata.</li></ul>',
          nums: '<ul><li>Cuatro niveles: None, Metadata, Request y RequestResponse ' + DOC + '.</li></ul>'
        } },
      { id: 'ingress', layer: 'edge', label: 'Ingress', sub: 'HTTPS hacia la API', x: 500, y: 520,
        brief: 'La entrada HTTPS al clúster: sus logs dicen qué pedidos llegaron y desde dónde.',
        why: '<p>Cuando la entrada fue por la aplicación (SSRF, una dependencia vulnerable), el log de acceso del ingress es el primer registro del ataque.</p>',
        info: {
          resp: '<p>Termina TLS y enruta a los pods de la API. Su log de acceso, con la ruta y los parámetros, va al SIEM.</p>',
          api: '<p><code>GET /api/v1/vista-previa?url=…</code>: el patrón de SSRF de <a href="m55-appsec.html#casos">M55.9</a>.</p>',
          data: '<p>Logs de acceso con IP, ruta, código y bytes; el id de request que también aparece en los logs de la API.</p>',
          fail: '<ul><li><b>Logs de acceso sin la query string:</b> se pierde justo el parámetro del ataque.</li></ul>',
          nums: '<ul><li>Con el id de request, de una línea del ingress se llega al trace de la API (<a href="m11-observabilidad.html#logs">M11.4</a>).</li></ul>'
        } },
      { id: 'api', layer: 'service', label: 'Pods de la API', sub: 'Java, rol de la instancia', x: 840, y: 520,
        brief: 'La API de Tienda Norte: en dos incidentes es el punto de entrada.',
        why: '<p>La aplicación expuesta es la superficie más grande. Contenerla sin matarla permite investigar mientras un reemplazo limpio atiende el tráfico.</p>',
        info: {
          resp: '<p>Atiende a los clientes, lee y escribe en la base, y obtiene credenciales del rol de la instancia por el servicio de metadatos.</p>',
          api: '<p>En cuarentena: fuera del Service y del ReplicaSet por la etiqueta, sin red por la NetworkPolicy, con su memoria intacta.</p>',
          data: '<p>Variables de entorno con secretos, el token de la service account montado, el sistema de archivos del contenedor.</p>',
          fail: '<ul><li><b>kubectl delete pod:</b> el contenedor y su memoria desaparecen; el ReplicaSet crea otro igual de vulnerable.</li><li><b>Rotar los secretos antes de saber cuáles vio:</b> se rota de nuevo después; mejor el inventario primero.</li></ul>',
          nums: '<ul><li>El reemplazo limpio entra en segundos; el pod en cuarentena se conserva hasta cerrar la investigación.</li></ul>'
        } },
      { id: 'sensor', layer: 'service', label: 'Sensor de runtime', sub: 'procesos y conexiones', x: 1180, y: 520,
        brief: 'Vigila lo que hacen los contenedores en el nodo: procesos nuevos, conexiones, archivos.',
        why: '<p>Los registros de la API no ven un proceso que nace dentro de un contenedor. Un sensor en el nodo sí (Falco es el ejemplo de M57 y M59).</p>',
        info: {
          resp: '<p>Observa las llamadas al sistema de cada contenedor y emite alertas: una shell que no debería existir, una conexión a un pool de minería, un binario escrito en <code>/tmp</code>.</p>',
          api: '<p>Manda cada alerta al SIEM con el pod, la imagen, el proceso y la línea de comandos.</p>',
          data: '<pre data-lang="json"><code>{ "rule": "Proceso inesperado en el contenedor",\n  "pod": "api-7d9f-x2k", "proc": "/tmp/.x/kworkerd",\n  "time": "2026-03-20T11:42:03Z" }</code></pre>',
          fail: '<ul><li><b>Reglas sin ajustar:</b> tantas alertas que nadie las lee. Es el tema de la calidad de las detecciones en M59.</li></ul>',
          nums: '<ul><li>Una alerta por evento raro, no por cada llamada al sistema.</li></ul>'
        } },
      { id: 'db', layer: 'db', label: 'PostgreSQL', sub: 'pedidos y clientes', x: 500, y: 720,
        brief: 'Los datos de clientes y pedidos: lo que más importa proteger y lo que define la severidad.',
        why: '<p>La pregunta "¿salieron datos de clientes?" decide la severidad y las notificaciones. Se responde con los logs de la base y de la aplicación.</p>',
        info: {
          resp: '<p>Guarda pedidos y clientes. La API se conecta con un rol propio (<a href="m35-seguridad-bd.html">M35</a>).</p>',
          api: '<p>En la erradicación se rota la contraseña del rol de la API si el pod comprometido la tenía en su entorno.</p>',
          data: '<p>Logs de conexión y, si está activo, pgaudit con las consultas a tablas sensibles.</p>',
          fail: '<ul><li><b>Sin registro de quién consultó qué:</b> no se puede descartar una lectura masiva.</li></ul>',
          nums: '<ul><li>Restaurar desde un backup anterior al primer evento tarda lo que se ensayó (<a href="m34-sysadmin.html#backups">M34.4</a>).</li></ul>'
        } },
      { id: 'imds', layer: 'edge', label: 'Metadatos de la instancia', sub: '169.254.169.254', x: 840, y: 720,
        brief: 'Entrega al nodo las credenciales temporales de su rol; con IMDSv2 pide un token.',
        why: '<p>Es el blanco de un SSRF en la nube: si la aplicación hace pedidos a URL que elige el usuario, puede terminar pidiendo las credenciales del rol (<a href="m37-nube.html#incidentes">M37.8</a>).</p>',
        info: {
          resp: '<p>Sirve datos de la instancia y las credenciales temporales del rol a los procesos que corren en ella.</p>',
          api: '<p>IMDSv2 exige un token pedido con <code>PUT</code> y un límite de saltos; se puede volver obligatorio por instancia ' + DOC + '.</p>',
          data: '<p>Credenciales temporales con su vencimiento; cada uso aparece en CloudTrail con el ARN del rol.</p>',
          fail: '<ul><li><b>IMDSv1 habilitado:</b> un pedido reenviado alcanza las credenciales.</li><li><b>Un rol amplio:</b> lo que se roba vale tanto como lo que el rol permite.</li></ul>',
          nums: '<ul><li>Las credenciales del rol vencen solas en horas, pero alcanzan para leer mucho.</li></ul>'
        } },
      { id: 'fileserver', layer: 'db', label: 'Servidor de archivos', sub: 'contabilidad y facturas', x: 1180, y: 720,
        brief: 'Un servidor Linux con carpetas compartidas de la oficina: el blanco del ransomware.',
        why: '<p>No todo está en Kubernetes: la oficina tiene un servidor con documentos. Es donde un ransomware hace más daño y donde el backup inmutable decide el final.</p>',
        info: {
          resp: '<p>Comparte carpetas por SMB a la oficina. Manda sus logs y su monitoreo de integridad de archivos al SIEM.</p>',
          api: '<p>Aislarlo de la red sin apagarlo (en la nube, un security group sin reglas; en el lugar, desconectar el puerto del switch) conserva la memoria.</p>',
          data: '<p>Documentos, un archivo señuelo vigilado (un honeytoken como los de <a href="m38-active-directory.html#detectar">M38.6</a>) y los logs de acceso por usuario.</p>',
          fail: '<ul><li><b>Apagarlo de inmediato:</b> se pierde la memoria, donde a veces está la clave o el proceso que cifra.</li><li><b>Restaurar sobre el mismo servidor:</b> si la persistencia sigue, vuelve a cifrar.</li></ul>',
          nums: '<ul><li>Cientos de archivos renombrados por minuto es una señal que ninguna persona produce.</li></ul>'
        } },
      { id: 'backup', layer: 'db', label: 'Backup inmutable', sub: 'object lock, cuenta aparte', x: 1180, y: 900,
        brief: 'Copias que nadie puede borrar ni cambiar hasta que vence su retención.',
        why: '<p>Un backup que el atacante puede borrar no sirve contra ransomware: lo primero que buscan es la consola de backups.</p>',
        info: {
          resp: '<p>Recibe una copia diaria del servidor de archivos y de la base, en una cuenta aparte, con object lock.</p>',
          api: '<p>La restauración se hace sobre un servidor reconstruido, no sobre el comprometido.</p>',
          data: '<p>Copias con fecha. La línea de tiempo dice cuál es anterior al acceso inicial.</p>',
          fail: '<ul><li><b>Nunca restaurado en una prueba:</b> no es un backup (<a href="m34-sysadmin.html#backups">M34.4</a>).</li></ul>',
          nums: '<ul><li>Con copia diaria, se pierde a lo sumo un día de cambios; el RPO lo elige el negocio.</li></ul>'
        } },
      { id: 'siem', layer: 'queue', label: 'SIEM', sub: 'logs de todas las fuentes', x: 1540, y: 510, w: 140, h: 860, bus: true,
        brief: 'Junta los registros de todas las fuentes en UTC, corre las reglas y abre las alertas.',
        why: '<p>Sin un lugar común, la línea de tiempo se arma a mano desde seis consolas. El SIEM es donde las fuentes se cruzan (lo construye M59).</p>',
        info: {
          resp: '<p>Recibe CloudTrail, el audit log de Kubernetes, el sensor de runtime y los logs de los servidores; normaliza, guarda y corre las detecciones.</p>',
          api: '<p>Las consultas de la investigación son búsquedas por identidad, IP o recurso dentro de una ventana de tiempo.</p>',
          data: '<p>Eventos normalizados con hora UTC, fuente, identidad, acción y recurso.</p>',
          fail: '<ul><li><b>Retención corta:</b> si el acceso inicial fue hace 45 días y se guardan 30, el principio de la historia no existe.</li></ul>',
          nums: '<ul><li>La retención se decide antes del incidente; una referencia común es un año para los registros de seguridad ' + REF + '.</li></ul>'
        } },
      { id: 'equipo', layer: 'client', label: 'Equipo de respuesta', sub: 'IC, investigación, escriba', x: 1860, y: 510,
        brief: 'Recibe la alerta, declara la severidad, decide la contención y lleva la bitácora.',
        why: '<p>Las herramientas detectan; las decisiones (contener, apagar, notificar) son de personas con roles claros (<a href="#preparar">60.2</a>).</p>',
        info: {
          resp: '<p>El incident commander coordina, investigación busca el alcance, operaciones contiene, el escriba anota cada decisión con su hora en UTC.</p>',
          api: '<p>Trabaja en un canal fuera de banda y con cuentas de respuesta probadas de antemano.</p>',
          data: '<p>La bitácora del caso, la línea de tiempo, la evidencia con su cadena de custodia.</p>',
          fail: '<ul><li><b>Todos investigan, nadie decide:</b> por eso hay un IC.</li><li><b>Contener en partes:</b> avisa al atacante.</li></ul>',
          nums: '<ul><li>Se mide desde el primer evento malicioso: tiempo hasta detectar, contener y recuperar.</li></ul>'
        } }
    ],
    edges: [
      { id: 'e-ext-iam', from: 'externo', to: 'iam', label: 'API con credencial robada' },
      { id: 'e-ext-ing', from: 'externo', to: 'ingress', label: 'HTTPS' },
      { id: 'e-ci-iam', from: 'ci', to: 'iam', label: 'llave u OIDC', labelAt: 0.4 },
      { id: 'e-ci-reg', from: 'ci', to: 'registry', label: 'push' },
      { id: 'e-reg-k8s', from: 'registry', to: 'k8sapi', label: 'digest' },
      { id: 'e-iam-trail', from: 'iam', to: 'trail', label: 'cada llamada' },
      { id: 'e-trail-siem', from: 'trail', to: 'siem', label: 'eventos', async: true },
      { id: 'e-k8s-siem', from: 'k8sapi', to: 'siem', label: 'audit log', async: true },
      { id: 'e-k8s-api', from: 'k8sapi', to: 'api', label: 'crea pods' },
      { id: 'e-ing-api', from: 'ingress', to: 'api' },
      { id: 'e-api-sensor', from: 'api', to: 'sensor', label: 'syscalls' },
      { id: 'e-sensor-siem', from: 'sensor', to: 'siem', label: 'alertas', async: true },
      { id: 'e-api-db', from: 'api', to: 'db', label: 'SQL' },
      { id: 'e-api-imds', from: 'api', to: 'imds', label: 'credenciales' },
      { id: 'e-fs-siem', from: 'fileserver', to: 'siem', label: 'logs y FIM', async: true },
      { id: 'e-fs-bk', from: 'fileserver', to: 'backup', label: 'copia diaria' },
      { id: 'e-siem-eq', from: 'siem', to: 'equipo', label: 'alerta' }
    ],
    scenarios: [
      {
        id: 'llave', title: 'Una llave filtrada en el CI',
        goal: 'Cómo se contiene una credencial de la nube sin perder el rastro, y por qué la persistencia obliga a buscar lo que la llave creó.',
        desc: 'Una acción de terceros alterada vuelca los secretos de un job en el log; alguien usa la llave horas después.',
        steps: [
          { at: 'ci', kind: 'fail', tag: '02:14', ms: 1000, title: 'Un job vuelca sus secretos en el log',
            text: '<b>Se ve:</b> nada todavía. Una acción de terceros por tag, alterada en origen, imprime las variables del job en el log. Entre ellas, la llave de larga vida de <code>ci-deployer</code>.',
            why: 'Es el patrón de tj-actions (<a href="m56-supply-chain.html#casos">M56.2</a>). Con la acción por SHA y OIDC no habría habido nada que filtrar.' },
          { from: 'externo', to: 'iam', kind: 'req', tag: '03:41', ms: 300, title: 'La llave se usa desde una IP nueva',
            text: '<b>Se ve:</b> <code>GetCallerIdentity</code> y después <code>ListBuckets</code> desde 203.0.113.45, una IP que esa llave nunca usó, con un agente distinto al del CI.',
            code: 'aws sts get-caller-identity   # lo primero que corre quien prueba una llave', lang: 'shell' },
          { from: 'iam', to: 'trail', kind: 'async', tag: 'evento', ms: 200, title: 'CloudTrail registra cada llamada',
            text: 'Cada llamada queda con <code>userIdentity</code>, <code>sourceIPAddress</code> y la hora. Los eventos de gestión están en el historial sin configurar nada ' + DOC + '.',
            why: 'Los <b>eventos de datos</b> de S3 no: si no se activaron, no se sabrá qué objetos se leyeron.' },
          { at: 'trail', kind: 'fail', tag: '04:05', ms: 200, title: 'La llave crea otra llave',
            text: '<b>Se ve:</b> <code>CreateAccessKey</code> para el usuario <code>backup-legacy</code>. Es persistencia: aunque se desactive la primera llave, queda la segunda.',
            code: '{ "eventName": "CreateAccessKey",\n  "userIdentity": { "userName": "ci-deployer" },\n  "requestParameters": { "userName": "backup-legacy" } }', lang: 'json' },
          { from: 'trail', to: 'siem', kind: 'async', tag: 'regla', ms: 120000, title: 'La regla salta',
            text: 'Una regla del SIEM mira <code>CreateAccessKey</code> hecho por una identidad de CI fuera de los runners. Salta a las 04:07, 26 minutos después del primer uso.' },
          { from: 'siem', to: 'equipo', kind: 'req', tag: 'alerta', ms: 600000, title: 'Se declara SEV2',
            text: '<b>Se hace:</b> el de guardia confirma que no es el pipeline, declara SEV2 y asigna IC y escriba. La bitácora empieza a las 04:20.',
            why: 'Una credencial de producción usada por un tercero es SEV2 aunque todavía no se vea robo de datos (<a href="#triaje">60.3</a>).' },
          { at: 'iam', kind: 'info', tag: '04:31', ms: 30000, title: 'Las dos llaves quedan inactivas',
            text: '<b>Se hace:</b> desactivar las dos llaves a la vez, la filtrada y la creada. <b>No se toca:</b> no se borran, ni las llaves ni el usuario: su id es lo que se busca en CloudTrail.',
            code: 'aws iam update-access-key --user-name ci-deployer \\\n  --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive\naws iam update-access-key --user-name backup-legacy \\\n  --access-key-id AKIAI44QH8DHBEXAMPLE --status Inactive', lang: 'shell',
            why: 'Contener todo a la vez: desactivar una y dejar la otra avisa y da tiempo (<a href="#contener">60.4</a>).' },
          { at: 'trail', kind: 'info', tag: 'línea de tiempo', ms: 3600000, title: 'Se arma la línea de tiempo',
            text: 'Todas las llamadas de las dos llaves desde 02:14, en UTC, más los logs del job del CI y la bitácora. El registro de imágenes y el clúster no muestran actividad: el alcance se reduce a la cuenta de la nube.' },
          { from: 'ci', to: 'iam', kind: 'req', tag: 'OIDC', ms: 1000, title: 'El CI deja de tener llaves',
            text: '<b>Se erradica:</b> el CI pasa a pedir credenciales temporales con OIDC (<a href="m56-supply-chain.html#ci-oidc">M56.4</a>), la acción se fija por SHA, y se activan los eventos de datos en el bucket de pedidos.',
            why: 'Cada acción del postmortem cae en una pieza: pipeline, detección, registros y runbook (<a href="#postmortem">60.11</a>).' }
        ]
      },
      {
        id: 'mineria', title: 'Un contenedor que mina',
        goal: 'Cómo se aísla un pod sin matarlo, qué se copia antes de reconstruir y por qué la pregunta clave es por dónde entró.',
        desc: 'Una dependencia vulnerable de la API permite ejecutar código y aparece un proceso de minería.',
        steps: [
          { from: 'externo', to: 'ingress', kind: 'req', tag: 'HTTPS', ms: 80, title: 'Un pedido raro entra por el ingress',
            text: '<b>Se ve, después:</b> en el log de acceso, un pedido con un cuerpo que explota una dependencia con una vulnerabilidad conocida de la API (el tema de M58).' },
          { from: 'ingress', to: 'api', kind: 'req', tag: 'pedido', ms: 40, title: 'La API lo procesa',
            text: 'El código de la dependencia ejecuta lo que traía el pedido. Desde aquí, el atacante corre procesos con el usuario del contenedor.' },
          { from: 'api', to: 'sensor', kind: 'fail', tag: 'proceso', ms: 2000, title: 'Nace un proceso que no debería existir',
            text: '<b>Se ve:</b> el sensor del nodo detecta un binario escrito en <code>/tmp</code> que se ejecuta y abre conexiones a un pool de minería. La CPU del pod sube al 100&#8239;%.' },
          { from: 'sensor', to: 'siem', kind: 'async', tag: 'alerta', ms: 1000, title: 'La alerta llega al SIEM',
            text: 'Con el pod, la imagen por digest, el proceso y la línea de comandos.' },
          { from: 'siem', to: 'equipo', kind: 'req', tag: 'SEV3', ms: 300000, title: 'Se declara SEV3',
            text: '<b>Se hace:</b> triaje. Es real, el daño visible es CPU y costo, no se ve acceso a datos todavía. SEV3, que sube si aparece algo más.' },
          { at: 'k8sapi', kind: 'info', tag: 'cuarentena', ms: 10000, title: 'Cuarentena sin matar el pod',
            text: '<b>Se hace:</b> NetworkPolicy de cuarentena, cambiar la etiqueta <code>app</code> para sacarlo del Service y del ReplicaSet, y <code>cordon</code> del nodo. <b>No se toca:</b> no se borra el pod ni se reinicia el nodo.',
            code: 'kubectl apply -f cuarentena.yaml\nkubectl label pod api-7d9f-x2k -n tienda cuarentena=si app=api-cuarentena --overwrite\nkubectl cordon ip-10-0-3-7', lang: 'shell',
            why: 'El ReplicaSet crea un reemplazo limpio y el tráfico sigue; el pod sospechoso conserva memoria y archivos (<a href="#contener">60.4</a>).' },
          { at: 'api', kind: 'info', tag: 'evidencia', ms: 900000, title: 'Se copia lo volátil y después el disco',
            text: '<b>Se hace:</b> procesos, conexiones y el binario de <code>/tmp</code> con su hash, a un almacén aparte; después, el snapshot del volumen del nodo. Todo con su ficha de custodia.',
            why: 'Orden de volatilidad: lo que muere con el pod primero (<a href="#evidencia">60.5</a>).' },
          { from: 'k8sapi', to: 'siem', kind: 'async', tag: 'audit', ms: 5000, title: 'El audit log descarta otra entrada',
            text: 'Nadie abrió un <code>exec</code> ni creó pods fuera del pipeline: la entrada fue por la aplicación, no por el plano de control.' },
          { from: 'registry', to: 'k8sapi', kind: 'info', tag: 'digest', ms: 2000, title: 'La imagen que corre es la firmada',
            text: 'El digest del pod coincide con el firmado por el pipeline: la imagen no fue cambiada. El problema estaba en una dependencia que la imagen ya traía.' },
          { from: 'ci', to: 'registry', kind: 'req', tag: 'parche', ms: 600000, title: 'Se reconstruye con la dependencia parcheada',
            text: '<b>Se erradica:</b> imagen nueva desde el pipeline, rotación del token de la service account y de la contraseña de la base que el pod tenía en su entorno, y una regla nueva para esa clase de proceso.',
            why: 'Reconstruir, no limpiar; rotar todo lo que el pod pudo ver (<a href="#erradicar">60.9</a>).' }
        ]
      },
      {
        id: 'ssrf', title: 'Un SSRF hacia la metadata',
        goal: 'Cómo se contiene el robo de credenciales temporales de un rol, que no se pueden desactivar una por una.',
        desc: 'Un parámetro de URL de la API permite pedir la dirección de metadatos y sacar las credenciales del rol.',
        steps: [
          { from: 'externo', to: 'ingress', kind: 'req', tag: '?url=', ms: 80, title: 'Un pedido con una URL interna',
            text: '<b>Se ve, después:</b> en el log del ingress, pedidos a la vista previa de enlaces con la dirección de metadatos como parámetro (el caso SSRF de <a href="m55-appsec.html#casos">M55.9</a>).' },
          { from: 'ingress', to: 'api', kind: 'req', tag: 'pedido', ms: 40, title: 'La API sigue la URL',
            text: 'La API no valida contra una lista de destinos permitidos.' },
          { from: 'api', to: 'imds', kind: 'fail', tag: 'IMDSv1', ms: 10, title: 'La metadata responde',
            text: 'El nodo todavía acepta IMDSv1, sin token: la respuesta trae las credenciales temporales del rol. Es el patrón de Capital One (<a href="m37-nube.html#incidentes">M37.8</a>).' },
          { from: 'externo', to: 'iam', kind: 'req', tag: 'rol', ms: 300, title: 'Las credenciales se usan desde afuera',
            text: '<b>Se ve:</b> llamadas firmadas con las credenciales del rol del nodo desde una IP que no es de la cuenta. AWS GuardDuty tiene un hallazgo específico para credenciales de una instancia usadas fuera de ella ' + DOC + '.' },
          { from: 'iam', to: 'trail', kind: 'async', tag: 'evento', ms: 200, title: 'Queda en CloudTrail', text: 'Con el ARN del rol asumido y la IP externa.' },
          { from: 'trail', to: 'siem', kind: 'async', tag: 'regla', ms: 60000, title: 'Salta la alerta', text: 'Identidad de una instancia usada desde una IP externa.' },
          { from: 'siem', to: 'equipo', kind: 'req', tag: 'SEV2', ms: 300000, title: 'Se declara SEV2', text: 'Credenciales de producción en manos de un tercero.' },
          { at: 'iam', kind: 'info', tag: 'revocar', ms: 30000, title: 'Se revocan las sesiones del rol',
            text: '<b>Se hace:</b> "revocar sesiones activas" sobre el rol, que niega todo token emitido antes de ahora ' + DOC + '. Los nodos legítimos piden credenciales nuevas solos. <b>No se toca:</b> no se borra el rol: rompe producción y no agrega nada.',
            why: 'Una credencial temporal no se desactiva de a una: se invalida por fecha de emisión.' },
          { at: 'imds', kind: 'info', tag: 'IMDSv2', ms: 60000, title: 'IMDSv2 obligatorio',
            text: '<b>Se erradica:</b> los nodos exigen token de sesión y límite de saltos; la API valida los destinos contra una lista; el rol pierde los permisos que no usaba.' },
          { at: 'trail', kind: 'info', tag: 'alcance', ms: 3600000, title: 'Qué hizo el rol robado',
            text: 'La línea de tiempo con todas las llamadas del rol desde IP externas. Si leyó objetos de S3 y no hay eventos de datos, el alcance queda abierto y legal lo trata como posible exposición.' }
        ]
      },
      {
        id: 'ransomware', title: 'Ransomware en el servidor de archivos',
        goal: 'Por qué se aísla sin apagar, por qué el backup inmutable decide el final y por qué se restaura en un servidor nuevo.',
        desc: 'Los documentos de la oficina empiezan a renombrarse en masa con una extensión nueva.',
        steps: [
          { at: 'fileserver', kind: 'fail', tag: 'cifrado', ms: 60000, title: 'Archivos renombrados en masa',
            text: '<b>Se ve:</b> cientos de archivos por minuto cambian de extensión y el archivo señuelo de la carpeta de contabilidad se modifica.' },
          { from: 'fileserver', to: 'siem', kind: 'async', tag: 'FIM', ms: 5000, title: 'El monitoreo de integridad avisa',
            text: 'El honeytoken (<a href="m38-active-directory.html#detectar">M38.6</a>) no lo toca ninguna persona: su cambio es una señal casi sin falsos positivos.' },
          { from: 'siem', to: 'equipo', kind: 'req', tag: 'SEV1', ms: 300000, title: 'SEV1 y canal fuera de banda',
            text: '<b>Se hace:</b> SEV1, se suman dirección y legal, y el equipo pasa al canal fuera de banda: si alguien tuvo una cuenta de administrador, puede leer el correo.' },
          { at: 'fileserver', kind: 'info', tag: 'aislar', ms: 60000, title: 'Aislar de la red sin apagar',
            text: '<b>Se hace:</b> se corta la red del servidor (un security group sin reglas o el puerto del switch). <b>No se toca:</b> no se apaga: la memoria puede tener el proceso que cifra y, a veces, su clave.',
            why: 'Cortar la red detiene el cifrado de otras carpetas compartidas y conserva lo volátil (<a href="#evidencia">60.5</a>).' },
          { at: 'fileserver', kind: 'info', tag: 'evidencia', ms: 1800000, title: 'Memoria, procesos y snapshot',
            text: 'Lo volátil a un almacén aparte con su hash, y el snapshot del disco. La línea de tiempo empieza en los logs de acceso: una cuenta de la VPN sin MFA entró tres días antes.' },
          { from: 'fileserver', to: 'backup', kind: 'req', tag: 'verificar', ms: 600000, title: 'El backup inmutable sigue ahí',
            text: 'El atacante intentó borrar los backups y no pudo: object lock en otra cuenta. La línea de tiempo dice cuál es anterior al acceso inicial: el de hace cuatro días.',
            why: 'Restaurar uno posterior al acceso puede traer la persistencia de vuelta.' },
          { at: 'backup', kind: 'info', tag: 'restaurar', ms: 7200000, title: 'Restaurar en un servidor nuevo',
            text: '<b>Se recupera:</b> servidor reconstruido desde una imagen limpia, datos del backup elegido, todas las credenciales de la VPN y del dominio rotadas, MFA obligatoria. Si el dominio entero se vio comprometido, la recuperación es la de <a href="m38-active-directory.html#recuperar">M38.8</a>.' },
          { at: 'equipo', kind: 'info', tag: 'notificar', ms: 1000, title: 'Comunicar y notificar',
            text: 'Legal decide si hubo datos personales expuestos y si corre un plazo como las 72 horas del RGPD ' + DOC + '. Pagar o no un rescate es una decisión del negocio con legal, no del equipo técnico.' }
        ]
      }
    ]
  });
})();
