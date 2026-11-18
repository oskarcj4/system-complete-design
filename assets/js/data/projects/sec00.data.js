/* Decisiones guiadas y predicciones de SEC00 (el laboratorio: Tienda Norte y su SIEM). Formato en core/exercise.js. */

SD.defineExercise('sec00-lab', {
  title: 'el laboratorio de Tienda Norte',
  scenario: '<p>Tienda Norte tiene una API, una base y un proxy, y dos personas que la cuidan medio día por semana. Quieres ver en un solo lugar lo que pasa y que la primera alerta salte sola, sin escribir cien reglas. Son seis decisiones.</p>',
  steps: [
    {
      id: 'formato', type: 'single',
      prompt: '¿En qué formato escribe la API sus eventos de seguridad?',
      options: [
        'Una línea JSON por evento, con campos fijos que el SIEM lee con su decoder json.',
        'Texto libre en español, porque las personas del SOC lo leen más rápido en la consola.',
        'Una fila por evento en la base de la tienda, que el SIEM consulta cada minuto.',
        'Syslog con el mensaje en texto, porque cualquier SIEM trae decoders de syslog.'
      ],
      answer: 0,
      explain: 'Con JSON, Wazuh separa los campos sin un decoder propio y una regla puede comparar <code>evento</code>, <code>usuario</code> o <code>ip</code> por nombre. El texto libre obliga a escribir expresiones regulares que se rompen con cada cambio de mensaje, y la base de la tienda no es un lugar para la evidencia. Está en <a href="#paso-registro">el paso 2</a>.'
    },
    {
      id: 'ip', type: 'single',
      prompt: 'La API está detrás de Nginx. ¿De dónde saca la IP que escribe en el evento?',
      options: [
        'De la conexión TCP que llega a uvicorn, que es la del cliente real.',
        'De X-Real-IP, que pone Nginx: nadie más le habla a la API.',
        'Del encabezado X-Forwarded-For que mande el cliente, tomando el primer valor.',
        'De ninguno: la IP la agrega Wazuh al leer la línea, con la del contenedor.'
      ],
      answer: 1,
      explain: 'La conexión que ve uvicorn es la de Nginx. La API no publica puertos, así que el único que le habla es Nginx, que pisa <code>X-Real-IP</code> con <code>$remote_addr</code>. Un <code>X-Forwarded-For</code> que manda el cliente lo escribe quien quiera. Está en <a href="#paso-proxy">el paso 4</a>.'
    },
    {
      id: 'ajeno', type: 'single',
      prompt: 'beto pide un pedido de ana. ¿Qué responde la API y qué deja en el registro?',
      options: [
        '403 al cliente, porque el pedido existe, y un evento pedido_ajeno con el número.',
        '404 al cliente y nada en el registro, para no llenar el log con errores de usuarios.',
        '404 al cliente, igual que si no existiera, y un evento pedido_ajeno con el número.',
        '200 con el pedido vacío, y un evento pedido_ajeno para que el SIEM decida.'
      ],
      answer: 2,
      explain: 'El cliente no aprende si el pedido existe, porque 404 es igual para los dos casos. El SIEM sí lo sabe, porque el evento solo se escribe cuando el pedido existe y es de otra persona: un número que no existe no es señal de BOLA. Está en <a href="#paso-api">el paso 3</a>.'
    },
    {
      id: 'logs', type: 'single',
      prompt: '¿Cómo llegan los logs de la tienda al manager de Wazuh?',
      options: [
        'Con un agente de Wazuh instalado dentro de cada contenedor de la tienda.',
        'Con el puerto 514 de syslog abierto, y Nginx y la API mandando por la red.',
        'Con volúmenes con nombre, montados de solo lectura en el manager.',
        'Con un cron que copia los archivos al manager cada cinco minutos con docker cp.'
      ],
      answer: 2,
      explain: 'Un volumen compartido es lo más corto en una sola máquina: la tienda escribe, el manager lee y no puede borrar. Un agente por contenedor agrega una pieza por imagen, y el cron llega tarde. En producción va un agente por nodo; está en <a href="#limitaciones-produccion">Qué cambia en producción</a>.'
    },
    {
      id: 'umbral', type: 'single',
      prompt: 'Un login fallido aislado es normal. ¿Cómo se convierte en alerta la fuerza bruta?',
      options: [
        'Con una regla de nivel 15 para cada login fallido, para no perder ninguno.',
        'Con una regla de correlación: 8 fallidos de una IP en 120 s.',
        'Con un script en la API que cuenta fallidos y escribe un evento fuerza_bruta.',
        'Con una búsqueda manual en el dashboard cada mañana, filtrando por login_fallido.'
      ],
      answer: 1,
      explain: 'La regla 100101 deja cada fallido en nivel 5, y la 100102 cuenta con <code>frequency</code>, <code>timeframe</code> y <code>same_field</code>. Contar en la API mezcla la detección con el negocio, y la búsqueda manual depende de que alguien se acuerde. Está en <a href="#paso-reglas">el paso 7</a>.'
    },
    {
      id: 'prueba', type: 'single',
      prompt: 'Escribiste las reglas. ¿Cómo compruebas que están bien antes de provocar nada?',
      options: [
        'Mirando el dashboard una hora: si no salta nada raro, las reglas están bien.',
        'Reiniciando el manager: si arranca sin errores en su log, cada regla coincide con el evento que esperas.',
        'Pegando una línea de ejemplo en wazuh-logtest y leyendo qué regla coincide y con qué nivel.',
        'Con el script de provocar contra la tienda de otra persona, que tiene más tráfico.'
      ],
      answer: 2,
      explain: '<code>wazuh-logtest</code> pasa una línea por el decoder y las reglas sin esperar tráfico, y dice cuál coincidió. Que el manager arranque solo prueba que el XML es válido. Y el script se usa solo contra tu laboratorio. Está en <a href="#comprueba-logtest">Las reglas, línea por línea</a>.'
    }
  ],
  solution: '<ul><li>Eventos en una línea JSON con campos fijos.</li><li>La IP sale de <code>X-Real-IP</code>, que pone Nginx, y la API no publica puertos.</li><li>404 para lo ajeno, y el evento <code>pedido_ajeno</code> solo si el pedido existe.</li><li>Los logs viajan por volúmenes con nombre, de solo lectura en el manager.</li><li>Un evento suelto en nivel bajo y una regla de correlación que lo sube.</li><li>Cada regla probada con <code>wazuh-logtest</code> antes de provocar.</li></ul>'
});

SD.defineExercise('sec00-p-registro', {
  kind: 'predict', title: 'un campo que intenta pisar otro',
  scenario: '<p>Desde la API se llama <code>evento("login_fallido", usuario="ana", ip="10.0.0.5", app="otra")</code>.</p>',
  steps: [{
    id: 'app', type: 'single',
    prompt: '¿Qué valor tiene <code>app</code> en la línea que queda en <code>api.log</code>?',
    options: [
      '"tienda": el campo de la llamada se descarta porque ya estaba en la línea',
      '"otra": los campos de la llamada se aplican al final con update, así que pisan los anteriores',
      'La línea no se escribe: json.dumps falla con una clave repetida',
      'Aparecen las dos claves app, una detrás de la otra, en la misma línea'
    ],
    answer: 0,
    explain: 'La marca (3) filtra con <code>if k not in linea</code>: <code>app</code>, <code>ts</code> y <code>evento</code> ya están, así que se ignoran. Por eso las reglas pueden confiar en que <code>app</code> es siempre <code>tienda</code>. Un diccionario de Python no tiene claves repetidas.'
  }]
});

SD.defineExercise('sec00-p-pedido', {
  kind: 'predict', title: 'dos pedidos que no son de beto',
  scenario: '<p>beto, con su token, pide <code>GET /api/pedidos/2</code> (es de ana) y después <code>GET /api/pedidos/999</code> (no existe).</p>',
  steps: [{
    id: 'eventos', type: 'single',
    prompt: '¿Qué responde la API y cuántos eventos <code>pedido_ajeno</code> quedan en el registro?',
    options: [
      '403 y 404, con un evento por cada pedido',
      '404 y 404, con un evento solo por el pedido 2',
      '404 y 404, con un evento por cada pedido',
      '403 y 404, con un evento solo por el pedido 2'
    ],
    fixed: true,
    answer: 1,
    explain: 'La marca (7) responde 404 en los dos casos: <code>fila is None</code> para el 999 y <code>fila[1] != uid</code> para el 2. La marca (8) escribe el evento solo si <code>fila is not None</code>, es decir, solo para el pedido 2.'
  }]
});

SD.defineExercise('sec00-p-regla', {
  kind: 'predict', title: 'doce logins fallidos en pocos segundos',
  scenario: '<p>Corres <code>python provocar.py fuerza</code>, que manda 12 logins fallidos de ana desde la misma IP en unos segundos. Las reglas son las de <code>tienda_rules.xml</code>.</p>',
  steps: [{
    id: 'alertas', type: 'single',
    prompt: '¿Qué alertas de la regla 100102 (nivel 10) esperas en <code>alerts.json</code>?',
    options: [
      'Ninguna: la 100102 solo cuenta fallidos de usuarios distintos',
      'Ninguna: hacen falta 8 fallidos por minuto, sostenidos durante los dos minutos completos de la ventana',
      'Doce, una por cada login fallido, porque cada uno coincide con la 100101',
      'Al menos una, porque 12 fallidos de la misma IP pasan el umbral de 8 en 120 s'
    ],
    answer: 3,
    explain: 'La 100102 coincide cuando la 100101 se cumplió <code>frequency="8"</code> veces en <code>timeframe="120"</code> segundos con el mismo valor de <code>ip</code> (<code>same_field</code>). Doce en unos segundos pasan con margen. Las doce sí dejan alertas de la 100101, de nivel 5.'
  }]
});

SD.defineExercise('sec00-p-escaneo', {
  kind: 'predict', title: 'cuántas rutas prueba el escaneo',
  scenario: '<p>Corres <code>python provocar.py escaneo</code> sin <code>-n</code>, así que vale el número por defecto.</p>',
  steps: [{
    id: 'cuantas', type: 'single',
    prompt: '¿Cuántas requests manda la función <code>escaneo</code>?',
    options: ['6', '12', '20', '25'],
    fixed: true,
    answer: 3,
    explain: 'El valor por defecto de <code>-n</code> es 12, pero la marca (5) usa <code>max(n, 25)</code>: manda 25, que recorren las seis rutas varias veces. Son más de las 20 en 60 segundos que pide la regla 100112, así que alcanzan para dispararla.'
  }]
});
