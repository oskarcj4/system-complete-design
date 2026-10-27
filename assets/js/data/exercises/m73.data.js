SD.defineExercise('m73-frontera', {
  title: 'qué va de cada lado en el frontend del sistema de prácticas',
  scenario: '<p>Vas a escribir el frontend del sistema de control de prácticas: una página en HTML y JavaScript que llama a la API en PHP con <code>fetch</code>. Los estudiantes ven el feed de oportunidades y postulan; los reclutadores autorizados publican ofertas. El equipo te pasa cinco decisiones. En cada una, elige dónde va la comprobación o qué API del DOM usar.</p>',
  steps: [
    { id: 'boton', type: 'single',
      prompt: 'Los estudiantes no pueden publicar ofertas. ¿Qué alcanza?',
      options: [
        'Ocultar el botón "Publicar" cuando el rol del usuario guardado en localStorage es estudiante',
        'Que el endpoint compruebe el rol y autorizado_publicar con la sesión firmada; el botón oculto es opcional',
        'Deshabilitar el botón y además minificar app.js, para que nadie encuentre la ruta de la API',
        'Que el formulario mande el rol en un campo oculto y el endpoint lo compare con una lista'
      ],
      answer: 1,
      explain: 'El botón, localStorage y los campos ocultos están del lado del navegador: se cambian a mano. La ruta de la API se ve en Network. Lo único que decide es el endpoint, con lo que prueba la cookie firmada.' },
    { id: 'autor', type: 'single',
      prompt: '¿De dónde sale <code>creado_por</code> al crear una oferta?',
      options: [
        'Del id de la sesión que el servidor leyó de la cookie firmada',
        'De un campo oculto que el frontend llena con el id que devolvió el login',
        'Del body, pero el servidor lo acepta solo si coincide con el formato de un entero positivo',
        'De una cabecera X-User-Id que agrega app.js en cada fetch a la API del sistema'
      ],
      answer: 0,
      explain: 'Un campo oculto, el body y una cabecera los escribe el cliente. Validar el formato no prueba que sea el suyo. La identidad sale de lo que el servidor firmó con COOKIE_KEY.' },
    { id: 'fecha', type: 'single',
      prompt: 'La fecha de cierre no puede estar en el pasado. ¿Dónde se valida?',
      options: [
        'Solo en el navegador, con un input de tipo date y el atributo min con la fecha de hoy',
        'Solo en el servidor, porque validar dos veces duplica la regla y termina desincronizada',
        'En el servidor siempre, y en el navegador también si quieres avisar antes de enviar',
        'En la base, con un trigger, porque PHP y el navegador pueden equivocarse por la zona horaria'
      ],
      answer: 2,
      explain: 'La regla que vale es la del servidor, porque una request a mano salta el formulario. La del navegador es para la experiencia: avisa sin ir y volver. Un CHECK o trigger en la base es un respaldo útil, pero no reemplaza la validación con un mensaje claro.' },
    { id: 'pintar', type: 'single',
      prompt: 'La descripción de una oferta llega del JSON y se pinta en la tarjeta. ¿Cómo?',
      options: [
        'Con innerHTML, porque el JSON ya viene escapado por json_encode del lado del servidor',
        'Con innerHTML después de quitar las etiquetas script con una expresión regular',
        'Con textContent, para que el string quede como texto y el parser no intervenga',
        'Con document.write, porque escribe el texto antes de que el parser termine el documento'
      ],
      answer: 2,
      explain: 'json_encode escapa para JSON, no para HTML: al leerlo, el string vuelve a tener los signos tal cual. Quitar script con regex no alcanza (hay muchas otras formas de ejecutar, M77). document.write también pasa por el parser.' },
    { id: 'error', type: 'single',
      prompt: 'Una consulta falla y el modelo llama a <code>Response::debugError($e)</code>. ¿Qué debería ver el navegador?',
      options: [
        'El mensaje de la excepción, porque ayuda al usuario a reportar el error con detalle',
        'El mensaje de la excepción solo si la request viene de localhost',
        'Un mensaje genérico y un código HTTP 500; el detalle va al log del servidor',
        'Un código 200 con code -1, para no revelar que hubo un error en el servidor'
      ],
      answer: 2,
      explain: 'El mensaje de PDO trae nombres de tablas, columnas y a veces partes de la consulta: es información para un atacante. Detrás de un proxy, la request también puede parecer de localhost. Un 200 con error confunde a los clientes y a los monitores. Se arregla en la guía WEB01.' }
  ],
  solution: '<ul><li>El control de acceso y la identidad viven en el servidor, con la sesión firmada; el botón oculto es solo comodidad.</li><li><code>creado_por</code> sale de la sesión, nunca del body ni de una cabecera.</li><li>Las reglas de negocio se validan en el servidor siempre; en el navegador, para avisar antes.</li><li>Los datos de usuarios se pintan con <code>textContent</code>.</li><li>Los errores salen genéricos y con su código HTTP; el detalle va al log.</li></ul>'
});
