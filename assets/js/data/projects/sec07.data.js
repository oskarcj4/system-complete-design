/* Decisiones guiadas y predicciones de SEC07 (señuelos). Formato en core/exercise.js. */

SD.defineExercise('sec07-senuelos', {
  title: 'Los señuelos de Tienda Norte',
  scenario: '<p>Tienda Norte ya tiene reglas para los ataques que conoce. Quieres una alarma para lo que no conoce: alguien que ya entró y anda mirando. La idea es dejar cosas que nadie legítimo usa (una cuenta, un token, una tabla y un archivo) y alertar cuando alguien las toca. Son seis decisiones.</p>',
  steps: [
    {
      id: 'donde', type: 'single',
      prompt: '¿Dónde dejas el token señuelo?',
      options: [
        'En un archivo del repositorio que parece de configuración real.',
        'En un comentario que diga "no usar, es una trampa", para que nadie del equipo lo pruebe.',
        'En el <code>.env</code> que no se sube, que es donde viven los secretos de verdad.',
        'En la configuración de Wazuh, que es donde se escribe la regla que lo detecta.'
      ],
      answer: 0,
      explain: 'Un señuelo funciona si parece valioso donde un atacante lo buscaría: un archivo de configuración en el repositorio. Un comentario que lo delata lo anula; en el <code>.env</code> no lo ve quien solo tiene el repositorio. Está en <a href="#paso-token">el paso 2</a>.'
    },
    {
      id: 'respuesta', type: 'single',
      prompt: '¿Qué responde la API cuando alguien usa el token señuelo?',
      options: [
        'Un 403 "acceso denegado", para que quede claro que se detectó el intento.',
        'Lo mismo que con cualquier token desconocido: 401 "Token desconocido".',
        'Un 200 con datos falsos, para mantener al atacante ocupado más tiempo.',
        'Nada: corta la conexión sin responder, para no darle información.'
      ],
      answer: 1,
      explain: 'Si la respuesta es distinta, el atacante aprende que ese token era una trampa y deja de usar lo demás que robó. Los datos falsos son otra herramienta (una honeypot) y piden mucho más cuidado. Está en <a href="#paso-token">el paso 2</a>.'
    },
    {
      id: 'gitleaks', type: 'single',
      prompt: 'El job <code>secretos</code> de SEC01 marca el token señuelo. ¿Qué haces?',
      options: [
        'Agregas <code># gitleaks:allow</code> en la misma línea del token, que es lo más localizado.',
        'Apagas la regla <code>generic-api-key</code>, que es la que da el aviso.',
        'Una excepción por ruta en <code>gitleaks.toml</code>, solo para ese archivo.',
        'Sacas el señuelo del repositorio: un escáner que falla no se negocia.'
      ],
      answer: 2,
      explain: 'El comentario queda al lado del token y le avisa al atacante; apagar la regla deja pasar los secretos reales. La excepción por ruta afecta un solo archivo y vive en otro. El costo es que quien lea <code>gitleaks.toml</code> sabe cuál es: está en <a href="#limitaciones">Limitaciones</a>.'
    },
    {
      id: 'tabla', type: 'single',
      prompt: 'El usuario de la base es superusuario. ¿Cómo sabes que alguien leyó la tabla señuelo?',
      options: [
        'Con un trigger <code>ON SELECT</code> que escribe en una tabla de auditoría.',
        'Con una política de RLS y <code>FORCE ROW LEVEL SECURITY</code>, que registra cada fila que lee cualquier usuario.',
        'Con una vista sobre valores fijos que llama a una función con <code>RAISE LOG</code>.',
        'Mirando el tamaño de la tabla en <code>pg_stat_user_tables</code> una vez por hora.'
      ],
      answer: 2,
      explain: 'PostgreSQL no tiene triggers de SELECT, y un superusuario se salta la RLS aunque esté forzada. La vista no tiene tabla debajo que leer directamente, y la función corre para quien sea. <code>pg_stat_user_tables</code> cuenta lecturas de tablas, no de vistas. Está en <a href="#paso-tabla">el paso 3</a>.'
    },
    {
      id: 'ruido', type: 'single',
      prompt: 'Tu propio <code>grep -r</code> sobre <code>/srv</code> disparó el archivo señuelo. ¿Qué haces?',
      options: [
        'Mantienes la regla, confirmas con el <code>auid</code> que fuiste tú y lo anotas.',
        'Bajas la regla a nivel 3, porque un señuelo que salta con un grep es ruido.',
        'Excluyes <code>/usr/bin/grep</code> en la regla de Wazuh, porque los atacantes usan <code>cat</code>.',
        'Borras el archivo: un señuelo que molesta al equipo no vale la pena.'
      ],
      answer: 0,
      explain: 'Un atacante también usa <code>grep</code>, y bajar el nivel esconde el único aviso que importa. El <code>auid</code> dice qué persona inició la sesión, así que confirmar es rápido. El falso positivo se anota para medir la tasa. Está en <a href="#paso-ruido">el paso 7</a>.'
    },
    {
      id: 'cuantos', type: 'single',
      prompt: '¿Cuántos señuelos pones?',
      options: [
        'Uno en cada tabla y en cada carpeta, para que no haya un rincón sin vigilar.',
        'Uno solo, bien elegido, para no tener que mantener varios.',
        'Tantos como alertas por día pueda revisar el equipo, que es el límite real.',
        'Pocos, cada uno en un inventario con dónde está, su regla y quién lo sabe.'
      ],
      answer: 3,
      explain: 'Cada señuelo es algo que mantener, rotar y explicarle al equipo; uno que nadie recuerda termina borrado o disparado por un compañero. El inventario es lo que los mantiene vivos. Está en <a href="#paso-inventario">el paso 8</a>.'
    }
  ],
  solution: '<ul><li>El token, en un archivo de configuración que parece real.</li><li>La misma respuesta que cualquier token desconocido.</li><li>Una excepción de gitleaks por ruta.</li><li>La tabla, como vista sobre valores fijos con una función que hace <code>RAISE LOG</code>.</li><li>El falso positivo se confirma con el <code>auid</code> y se anota.</li><li>Pocos señuelos, todos en un inventario.</li></ul>'
});

SD.defineExercise('sec07-p-cliente', {
  kind: 'predict', title: 'lo que ve quien lee la tabla',
  scenario: '<p>Alguien con la clave de la base corre <code>SELECT * FROM clientes_tarjetas;</code> en <code>psql</code>. La función de la vista hace <code>RAISE LOG</code>, y <code>client_min_messages</code> tiene su valor por defecto.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué ve en su terminal?',
    options: [
      'Las tres filas y nada más.',
      'Las tres filas y tres líneas <code>LOG: SENUELO tocado</code>.',
      'Un error de permisos.',
      'Cero filas.'
    ],
    answer: 0,
    explain: 'El valor por defecto de <code>client_min_messages</code> es <code>NOTICE</code>, y para el cliente <code>LOG</code> está por debajo: el mensaje va solo al log del servidor. El atacante ve tres filas normales.'
  }]
});

SD.defineExercise('sec07-p-dump', {
  kind: 'predict', title: 'un volcado entero',
  scenario: '<p>En lugar de mirar tabla por tabla, el atacante corre <code>pg_dump</code> de la base entera.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Sale la alerta 100152?',
    options: [
      'Sí, una vez por cada fila de la vista.',
      'Sí, una sola vez.',
      'No: de la vista, guarda solo su definición.',
      'No, porque <code>pg_dump</code> no tiene permiso para leer las vistas de otro esquema.'
    ],
    answer: 2,
    explain: '<code>pg_dump</code> copia los datos de las tablas y, de las vistas, solo su definición. La función no corre. Es una limitación de este señuelo; la cuenta señuelo sí queda en el volcado y salta cuando alguien la prueba.'
  }]
});

SD.defineExercise('sec07-p-token', {
  kind: 'predict', title: 'la respuesta al token señuelo',
  scenario: '<p>Alguien manda <code>GET /api/pedidos/1</code> con <code>Authorization: Bearer</code> y el token de <code>config/respaldo.env</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué responde la API?',
    options: [
      '403 <code>Acceso denegado</code>',
      '401 <code>Token desconocido</code>',
      '200 con el pedido 1',
      '404 <code>No existe</code>'
    ],
    answer: 1,
    explain: '<code>sesion()</code> escribe el evento <code>senuelo_token</code> y lanza la misma excepción que con un token que no está en <code>SESIONES</code>. Desde afuera no hay diferencia.'
  }]
});

SD.defineExercise('sec07-p-ls', {
  kind: 'predict', title: 'listar no es leer',
  scenario: '<p>auditd vigila <code>/srv/tienda/respaldo/credenciales-aws</code> con <code>-p r</code>. Alguien corre <code>ls -l /srv/tienda/respaldo/</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Sale la alerta 100153?',
    options: [
      'Sí: <code>ls</code> tiene que leer la carpeta donde está el archivo.',
      'Sí, pero con nivel más bajo.',
      'No: <code>ls</code> no abre el archivo para leerlo.',
      'No, porque <code>ls</code> no pasa por auditd.'
    ],
    answer: 2,
    explain: '<code>ls -l</code> lee la carpeta y llama a <code>stat</code> sobre el archivo, pero no lo abre. La vigilancia con <code>r</code> salta al abrirlo para leer, como hacen <code>cat</code>, <code>grep</code> o <code>tar</code>.'
  }]
});
