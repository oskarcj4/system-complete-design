SD.defineExercise('m54-stride', {
  title: 'el threat model de "exportar mis pedidos"',
  scenario: '<p>Tienda Norte quiere que cada cliente pueda pedir un <b>export de sus pedidos en CSV</b>. El diseño: '
    + 'el cliente aprieta un botón, la API encola un trabajo, un <b>worker de exports</b> lee los pedidos de la base, '
    + 'escribe el CSV en un <b>bucket</b> y el servicio de correo le manda al cliente un enlace para bajarlo. '
    + 'Vas a hacer el threat model decisión por decisión, con las cuatro preguntas, STRIDE por elemento y la matriz.</p>',
  steps: [
    {
      id: 'fronteras', type: 'single',
      prompt: '¿Qué frontera de confianza nueva aparece con esta funcionalidad?',
      options: [
        'Ninguna: el worker y el bucket están dentro de la red de la tienda',
        'La del enlace de descarga: el bucket se abre a internet a través del correo',
        'La de la base, porque el worker de exports es un proceso nuevo que se conecta a ella',
        'La de la cola, porque los mensajes viajan entre dos procesos de la tienda'
      ],
      answer: 1,
      explain: 'El enlace sale por correo y se abre desde cualquier navegador: el bucket queda expuesto a internet por una puerta nueva. La base ya tenía su frontera y la cola está del mismo lado que la API. Ver 54.2.'
    },
    {
      id: 'enlace', type: 'single',
      prompt: 'El enlace del correo apunta a <code>/exports/1043.csv</code>. ¿Qué letra de STRIDE y qué mitigación?',
      options: [
        'Spoofing; pedir usuario y contraseña al abrir cualquier enlace del correo',
        'Denial of service; limitar las descargas por día y por cada cliente',
        'Information disclosure; una URL firmada, de corta vida y ligada al dueño',
        'Tampering; calcular un hash del archivo y mandarlo dentro del correo'
      ],
      answer: 2,
      explain: 'Un id secuencial en la URL deja pedir el export de otro (una BOLA sobre archivos). La URL firmada de M09 con vencimiento corto y un id aleatorio corta la filtración. Ver 54.3.'
    },
    {
      id: 'worker', type: 'single',
      prompt: 'El worker de exports recibe de la cola el mensaje <code>{"cliente": 77}</code>. ¿Cuál es la amenaza principal sobre ese proceso?',
      options: [
        'Que un mensaje alterado le haga exportar los pedidos de otro cliente',
        'Que el worker tarde demasiado en exportar los pedidos más antiguos del cliente',
        'Que el CSV quede con codificación distinta a la que espera Excel',
        'Que el correo llegue a la carpeta de spam en algunos proveedores'
      ],
      answer: 0,
      explain: 'Si cualquiera puede escribir en la cola, puede pedir el export de otro cliente: tampering en el flujo y elevation en el worker. La mitigación es que solo la API escriba en esa cola y que el id venga de la sesión, no del cuerpo. Ver 54.3.'
    },
    {
      id: 'csv', type: 'single',
      prompt: 'Un pedido tiene como nota <code>=HYPERLINK("http://...")</code>. ¿Qué amenaza aparece al abrir el CSV en una planilla?',
      options: [
        'Ninguna: un CSV es texto plano y no puede ejecutar nada en la planilla que lo abra',
        'Inyección de fórmulas: la planilla interpreta la celda como una fórmula',
        'Denegación de servicio en la base por leer notas largas al exportar',
        'Repudiation: el cliente puede negar después que escribió esa nota'
      ],
      answer: 1,
      explain: 'Las planillas evalúan las celdas que empiezan con =, +, - o @. La mitigación es prefijar esas celdas con una comilla simple al escribir el CSV. Es una amenaza de un flujo que cruza hacia una herramienta que no controlas. Ver 54.3.'
    },
    {
      id: 'dos', type: 'single',
      prompt: 'Un cliente aprieta el botón 500 veces. ¿Dónde lo ubicas en la matriz y qué haces?',
      options: [
        'Probabilidad baja e impacto bajo: se acepta y no se hace nada más',
        'Probabilidad alta e impacto alto: se apaga la funcionalidad por completo',
        'Probabilidad media e impacto medio: un export a la vez por cliente',
        'Probabilidad alta e impacto bajo: se transfiere al proveedor de correo'
      ],
      answer: 2,
      explain: 'Es fácil de hacer y llena la cola y el correo, pero no filtra datos. Un export en curso por cliente (una clave única en la cola) y un límite por día lo mitigan sin apagar nada. Ver 54.5.'
    },
    {
      id: 'retencion', type: 'single',
      prompt: '¿Cuánto tiempo deberían quedar los CSV en el bucket?',
      options: [
        'Para siempre, así el cliente puede volver a bajarlos cuando quiera',
        'Lo justo para descargarlos, con una regla de ciclo de vida que los borre',
        'Hasta que el cliente cierre su cuenta, y después se mueven a un archivo',
        'Un año, que es el plazo habitual de retención de los logs de auditoría de la tienda'
      ],
      answer: 1,
      explain: 'Cada CSV guardado es una copia más de datos personales que se puede filtrar. Es una amenaza de LINDDUN (data disclosure) y de STRIDE (information disclosure en el almacén). Una regla que borre a las 24 horas la reduce. Ver 54.6.'
    },
    {
      id: 'verificar', type: 'multi',
      prompt: 'Cuarta pregunta: ¿cómo compruebas que las mitigaciones existen?',
      options: [
        'Una prueba que pide el export de otro cliente y espera un 404',
        'Una prueba que abre un enlace vencido y espera un 403',
        'Una alerta si un cliente genera más de 20 exports en un día',
        'Una nota en el design doc que diga que el riesgo ya está mitigado'
      ],
      answer: [0, 1, 2],
      explain: 'Las pruebas comprueban que la mitigación está en el código y la alerta, que se nota si alguien la busca. Una nota en el documento no comprueba nada. Ver 54.7.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Frontera nueva:</b> el bucket expuesto a internet a través del enlace del correo.</li>'
    + '<li><b>Enlace:</b> id aleatorio y URL firmada de 15 minutos, emitida solo al dueño autenticado; el correo lleva un enlace a la tienda, que firma al momento.</li>'
    + '<li><b>Cola y worker:</b> solo la API escribe; el id del cliente sale de la sesión; el worker se conecta con un rol de solo lectura.</li>'
    + '<li><b>CSV:</b> neutralizar celdas que empiezan con =, +, - o @.</li>'
    + '<li><b>Abuso:</b> un export en curso por cliente y un tope diario.</li>'
    + '<li><b>Retención:</b> borrar a las 24 horas con una regla del bucket.</li>'
    + '<li><b>Verificación:</b> pruebas de 404 y 403, y una alerta de volumen.</li>'
    + '</ul>'
});
