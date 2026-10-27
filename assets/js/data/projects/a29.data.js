/* Decisiones guiadas de A29 (Un servidor seguro: de una VM a una VPC). Formato en core/exercise.js. */

SD.defineExercise('a29-borde', {
  title: 'las defensas de la API de notas',
  scenario: '<p>La API de notas corre como en esta guía: Nginx con el OWASP CRS delante, la API en Spring Boot y PostgreSQL con dos roles. Empezó en una VM, y el equipo la va a separar en capas. Tienes que tomar cinco decisiones.</p>',
  steps: [
    {
      id: 'orden', type: 'order',
      prompt: 'Ordena las capas por las que pasa una request, de afuera hacia adentro, en la etapa 2.',
      items: [
        'nftables del borde: solo 80 y 443',
        'Nginx: TLS y ModSecurity con el CRS',
        'Nginx: límite por IP y rutas públicas',
        'nftables de la app: 8080 solo desde los bordes',
        'La API: token y dueño de la nota',
        'PostgreSQL: pg_hba y el rol notas_app'
      ],
      explain: 'Primero lo barato y sin estado de la aplicación: el firewall tira lo que ni siquiera va a un puerto publicado. Después se descifra (sin TLS terminado, el WAF no ve nada), el WAF mira el contenido, y el gateway decide si la ruta existe y si la IP no se pasó del límite. La API sabe quién eres y de quién es cada nota. La base, al final, solo le deja a ese rol leer y escribir filas. Ver el <a href="#paso-borde">paso 3</a> y M32, 32.9.'
    },
    {
      id: 'migrar', type: 'single',
      prompt: 'Alguien propone dejar <code>spring.flyway.enabled=true</code> en la API, con el usuario <code>notas_owner</code>, para no tener un servicio de migraciones aparte. ¿Qué pierdes?',
      options: [
        'Nada: Flyway usa el rol dueño solo durante el arranque y después la API vuelve a conectarse como notas_app.',
        'Que la clave del dueño viva en el entorno de la API, y quien la tome pueda borrar el esquema.',
        'El orden de las migraciones: con dos réplicas arrancando a la vez, cada una aplicaría la suya por separado.',
        'Que el arranque tarde más, porque Flyway abre su propio pool de conexiones al empezar.'
      ],
      answer: 1,
      explain: 'Flyway sí abre su conexión con el usuario que le des, pero la clave queda en <code>/etc/notas/notas.env</code> o en el Secret del pod durante toda su vida. Quien ejecute código en la API puede leer su propio entorno y conectarse como dueño: <code>DROP TABLE</code> vuelve a ser posible. Flyway ya ordena las migraciones con un lock en la base, así que dos réplicas no se pisan. Ver el <a href="#paso-base">paso 2</a>.'
    },
    {
      id: 'egreso', type: 'single',
      prompt: 'La regla <code>meta skuid "notas" … reject</code> de la salida, ¿qué ataque corta cuando alguien ya ejecuta código dentro de la API?',
      options: [
        'Que lea las notas de otros usuarios con un SELECT directo a la base, sin pasar por la API.',
        'Que abra una conexión hacia afuera para bajar herramientas o sacar los datos.',
        'Que escale a root con un binario setuid que encuentre en el sistema de archivos de la VM.',
        'Que escuche en un puerto nuevo para recibir conexiones de afuera.'
      ],
      answer: 1,
      explain: 'El filtro de salida por usuario corta lo que el proceso inicia: bajar un segundo programa, llamar a un servidor de control o mandar la base a otra máquina. Leer la base es tráfico permitido (en la etapa 2 es justo lo único que sí puede abrir), y para eso está el rol de mínimo privilegio. El setuid lo frenan <code>NoNewPrivileges</code> y <code>RestrictSUIDSGID</code> de systemd, y un puerto nuevo lo frena la cadena de entrada con <code>policy drop</code>. Ver el <a href="#paso-firewall">paso 4</a>.'
    },
    {
      id: 'limite', type: 'single',
      prompt: 'En la etapa 3, el WAF quedó entre ServiceLB y el gateway. ¿Por qué el gateway limita por token y no por IP?',
      options: [
        'Porque detrás del WAF y de ServiceLB la IP de origen es la de un pod o un nodo, no la del cliente.',
        'Porque limitar por IP en Nginx necesita un módulo extra que la imagen sin privilegios no trae de fábrica.',
        'Porque un token identifica mejor a un usuario que una IP, y en la etapa 2 ya era así.',
        'Porque Kubernetes reparte las requests entre las réplicas del gateway y cada una tendría su propio contador.'
      ],
      answer: 0,
      explain: 'Cada salto que hace proxy cambia la IP de origen: ServiceLB hace SNAT y el WAF abre su propia conexión al gateway. Un límite por <code>$binary_remote_addr</code> en el gateway pondría a todos los clientes en el mismo balde. El límite por réplica es cierto, pero pasaba igual en la etapa 2 con dos bordes; y en la etapa 2 el límite era por IP, no por token. Ver el <a href="#paso-k8s">paso 7</a>.'
    },
    {
      id: 'vip', type: 'single',
      prompt: 'Con keepalived, borde1 tiene la IP virtual. Detienes Nginx en borde1 pero la VM sigue viva. ¿Qué pasa?',
      options: [
        'Nada: VRRP solo mira si la máquina responde, y borde1 sigue mandando sus anuncios cada segundo como siempre.',
        'borde2 toma la IP solo si alguien reinicia keepalived en borde1 a mano.',
        'El script de salud baja la prioridad de borde1 de 150 a 90, y borde2, con 100, toma la IP.',
        'Los dos bordes quedan con la IP a la vez hasta que borde1 vuelva a levantar Nginx.'
      ],
      answer: 2,
      explain: 'Sin <code>track_script</code>, VRRP solo sabría que keepalived vive. El script <code>nginx_vivo</code> resta 60 cuando falla dos veces: 150 − 60 = 90, menos que los 100 de borde2, que deja de ver a un par con más prioridad y toma la IP. Dos dueños a la vez pasan cuando los anuncios no llegan (un firewall que tira el protocolo 112), no cuando baja la prioridad. Ver el <a href="#comprueba-vrrp">falla de VRRP</a>.'
    }
  ],
  solution: '<ul><li>El orden: firewall del borde, TLS y WAF, límites y rutas, firewall de la app, autorización en la API, permisos en la base.</li><li>Las migraciones van aparte, con el rol dueño; la API solo tiene la clave de <code>notas_app</code>.</li><li>El filtro de salida por usuario corta lo que el proceso tomado inicia hacia afuera.</li><li>Detrás de proxies, el límite fino va por identidad (el token), no por IP.</li><li>keepalived necesita un script de salud: si no, mueve la IP solo cuando muere la máquina entera.</li></ul>'
});
