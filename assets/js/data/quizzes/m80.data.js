SD.defineQuiz('m80', {
  title: 'Quiz: Control de acceso roto', pass: 0.7,
  questions: [
    { id: 'navegador', type: 'single',
      prompt: '¿Por qué SameSite, CORS y la CSP no ayudan contra un BOLA?',
      options: [
        'Porque el atacante es tu propio usuario, con sesión, desde tu origen',
        'Porque un BOLA siempre se hace con curl, y curl ignora esas cabeceras',
        'Porque esas defensas solo cubren métodos POST, y el BOLA usa GET',
        'Porque el BOLA ocurre en la base de datos y no pasa por el navegador'
      ],
      answer: 0,
      explain: 'Esas defensas frenan a otro sitio. En un BOLA, quien manda la request tiene permiso de mandarla; lo que no tiene es permiso sobre ese objeto. Repasa la introducción y 80.1.' },
    { id: 'tres', type: 'order',
      prompt: 'Ordena las tres preguntas del control de acceso.',
      items: [
        '¿Quién eres? (sesión)',
        '¿Puedes usar esta función? (rol)',
        '¿Este objeto es tuyo? (dueño)'
      ],
      explain: 'Sesión, función y objeto. La tercera necesita el objeto, por eso vive en el modelo. Repasa 80.1.' },
    { id: 'where', type: 'single',
      prompt: '¿Dónde va la comprobación del dueño de una postulación?',
      options: [
        'En el frontend, ocultando las postulaciones ajenas de la lista',
        'En un if después de leer la fila, comparando estudiante_id',
        'En el WHERE de la consulta, junto con el id',
        'En el middleware, antes de saber qué fila se pide'
      ],
      answer: 2,
      explain: 'Una consulta que solo puede devolver lo tuyo protege también las listas, y no se olvida en el siguiente endpoint. El middleware no conoce la fila. Repasa 80.3.' },
    { id: 'codigo', type: 'single',
      prompt: 'Beto pide una postulación que existe pero es de Ana. ¿Qué responde la API?',
      options: [
        '403, porque existe y Beto no tiene permiso sobre ella',
        '401, para que Beto vuelva a iniciar sesión con otra cuenta',
        '200 con los datos vacíos, para no revelar nada',
        '404, lo mismo que si no existiera'
      ],
      answer: 3,
      explain: 'Un 403 confirma que el id existe y permite enumerar. Para un objeto ajeno, la respuesta es la misma que para uno inexistente. Repasa 80.3.' },
    { id: 'uuid', type: 'single',
      prompt: 'Cambias los ids numéricos de las postulaciones por UUID. ¿Cerraste el BOLA?',
      options: [
        'Sí, porque un UUID de 122 bits aleatorios no se puede adivinar',
        'No: los ids se filtran en URLs y logs, y falta comprobar el dueño',
        'Sí, siempre que el UUID sea versión 4 y no versión 1',
        'No, porque los UUID se pueden derivar del id numérico'
      ],
      answer: 1,
      explain: 'El UUID dificulta adivinar, pero un id compartido o filtrado sigue abriendo el objeto. Es una capa extra; la comprobación del dueño es la obligatoria. Repasa 80.3.' },
    { id: 'bfla', type: 'single',
      prompt: 'Un estudiante llama a <code>GET usuarios.php</code> con curl y recibe la lista. ¿Qué falla es?',
      options: [
        'BOLA, porque lee objetos de otros usuarios',
        'BFLA: usa una función que no es de su rol',
        'Asignación masiva, porque la respuesta trae campos de más',
        'CSRF, porque la request no lleva el token'
      ],
      answer: 1,
      explain: 'Listar usuarios es una función de administración; el problema es el rol, no un objeto concreto. Y hoy ni siquiera pide sesión. Repasa 80.2 y 80.4.' },
    { id: 'defecto', type: 'single',
      prompt: '¿Qué pasa con un endpoint nuevo que nadie agregó a la tabla de política?',
      options: [
        'Queda abierto hasta que alguien le agregue roles',
        'Pide solo sesión, sin comprobar el rol',
        'Se rechaza: lo que no está en la tabla, se niega',
        'Hereda la política del endpoint más parecido'
      ],
      answer: 2,
      explain: 'Denegar por defecto hace que el olvido cierre en lugar de abrir. Repasa 80.4.' },
    { id: 'masiva', type: 'multi',
      prompt: '¿Qué campos de una request no debería aceptar nunca <code>postulaciones.php</code> del body de un estudiante? Marca todos.',
      options: [
        '<code>estudiante_id</code>',
        '<code>oportunidad_id</code>',
        '<code>estado_postulacion</code>',
        '<code>isAdmin</code>'
      ],
      answer: [0, 2, 3],
      explain: 'El estudiante elige a qué oportunidad se postula. Quién es sale de la sesión; el estado lo cambia el reclutador; isAdmin no es un campo de la postulación. Repasa 80.5.' },
    { id: 'salida', type: 'single',
      prompt: 'El frontend muestra nombre y carrera de cada usuario, pero el JSON trae también el correo y el teléfono. ¿Qué hay que cambiar?',
      options: [
        'Nada, porque el frontend no los muestra en la pantalla',
        'Cifrar el correo y el teléfono en el JSON de la respuesta',
        'Ocultarlos con CSS en lugar de no dibujarlos en la tabla',
        'Una lista de campos de salida por rol en la API'
      ],
      answer: 3,
      explain: 'Lo que viaja en el JSON ya se filtró: cualquiera lo lee en la pestaña de red. La autorización por propiedad incluye la salida. Repasa 80.5.' },
    { id: 'trav', type: 'single',
      prompt: 'Para descargar un CV, ¿qué haces primero?',
      options: [
        'Comprobar que la postulación es del usuario y tomar el nombre de la base',
        'Quitar ../ del parámetro con str_replace y unirlo a la carpeta',
        'Comprobar con realpath que la ruta del parámetro queda dentro',
        'Aceptar solo nombres que terminen en .pdf'
      ],
      answer: 0,
      explain: 'Solo realpath deja bajar el CV de otro: es un BOLA con archivos. str_replace se elude con ....// y la extensión no limita la carpeta. Repasa 80.8.' }
  ]
});
