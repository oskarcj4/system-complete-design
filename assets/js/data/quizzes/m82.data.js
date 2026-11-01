SD.defineQuiz('m82', {
  title: 'Quiz: Archivos, SSRF y redirecciones', pass: 0.7,
  questions: [
    { id: 'peor', type: 'single',
      prompt: '¿Cuál de los cinco controles de una subida evita una web shell aunque los otros fallen?',
      options: [
        'El límite de tamaño, porque una web shell ocupa varios megabytes',
        'Guardar fuera del webroot, para que el servidor nunca lo ejecute',
        'El nombre aleatorio, porque el atacante no sabe cómo abrirlo',
        'Comprobar el Content-Type que manda el navegador'
      ],
      answer: 1,
      explain: 'Una web shell cabe en una línea. El nombre aleatorio se filtra si la respuesta lo devuelve. Si el archivo no está en una carpeta que Apache sirve, no se ejecuta. Repasa 82.1 y 82.3.' },
    { id: 'tipo', type: 'single',
      prompt: '¿De dónde sale el tipo real de un archivo subido?',
      options: [
        'De la extensión del nombre que mandó el usuario',
        'Del Content-Type de la parte del multipart',
        'De los primeros bytes del contenido, con finfo',
        'De la cabecera Accept de la request'
      ],
      answer: 2,
      explain: 'La extensión y el Content-Type los escribe el cliente. finfo lee el archivo. Repasa 82.2.' },
    { id: 'lista', type: 'single',
      prompt: '¿Por qué una lista de extensiones prohibidas (<code>.php</code>) no alcanza?',
      options: [
        'Porque deja pasar .phtml, .phar, .PhP y otras variantes',
        'Porque PHP ejecuta cualquier archivo, tenga la extensión que tenga',
        'Porque el navegador cambia la extensión al subir el archivo',
        'Porque move_uploaded_file conserva siempre la extensión original'
      ],
      answer: 0,
      explain: 'Apache interpreta varias extensiones como PHP según su configuración, y Windows ignora un punto final. Una lista de permitidos no tiene ese problema. Repasa 82.2.' },
    { id: 'poliglota', type: 'single',
      prompt: 'finfo dice <code>image/gif</code> y el archivo contiene <code>&lt;?php</code> más adelante. ¿Qué es?',
      options: [
        'Un falso positivo de finfo, porque un GIF no puede tener texto',
        'Un GIF corrupto que GD no va a poder abrir',
        'Un archivo que finfo marca como application/x-php',
        'Un políglota: válido como GIF y con código adentro'
      ],
      answer: 3,
      explain: 'Es GIF de verdad y también tiene PHP. Por eso el tipo real no reemplaza guardar fuera del webroot, y por eso las imágenes se vuelven a codificar. Repasa 82.2.' },
    { id: 'svg', type: 'single',
      prompt: '¿Qué riesgo tiene servir un SVG subido <code>inline</code> desde tu dominio?',
      options: [
        'Ninguno: un SVG es una imagen y el navegador no ejecuta imágenes',
        'Que puede llevar script y ejecutarse en tu origen',
        'Que el SVG puede ocupar más memoria que un PNG del mismo tamaño',
        'Que los SVG no se pueden volver a codificar con GD'
      ],
      answer: 1,
      explain: 'Un SVG abierto como documento es XML con script, en tu origen. Se sirve como descarga, desde otro dominio o no se acepta. Repasa 82.2.' },
    { id: 'ssrf', type: 'single',
      prompt: '¿Qué tiene una SSRF que un atacante desde internet no tiene?',
      options: [
        'La cookie de sesión de la víctima que está mirando la página',
        'La clave privada del certificado TLS del servidor',
        'La posición del servidor, dentro de la red y la nube',
        'Permiso para escribir en la base de datos de la aplicación'
      ],
      answer: 2,
      explain: 'El servidor ve la red interna y el servicio de metadatos. La SSRF le presta esa posición al atacante. Repasa 82.4.' },
    { id: 'imdsv2', type: 'single',
      prompt: '¿Por qué IMDSv2 frena la mayoría de las SSRF?',
      options: [
        'Porque exige un token pedido con PUT y una cabecera propia',
        'Porque cambia la dirección del servicio a una IP aleatoria',
        'Porque solo responde a requests firmadas con la clave del rol',
        'Porque cifra las credenciales con la clave de la instancia'
      ],
      answer: 0,
      explain: 'Una SSRF típica controla la URL de un GET, no el método ni las cabeceras. Con el límite de saltos, un contenedor detrás de un puente tampoco llega. Repasa 82.5.' },
    { id: 'rebinding', type: 'single',
      prompt: 'El código resuelve el host, comprueba que la IP sea pública y llama a curl con la URL. ¿Qué falla?',
      options: [
        'Nada, siempre que la IP comprobada no sea privada ni de loopback',
        'Que gethostbynamel no resuelve dominios con IPv6',
        'Que curl no acepta URLs con el puerto 443 explícito',
        'Que curl resuelve otra vez y el DNS puede responder otra IP'
      ],
      answer: 3,
      explain: 'Es DNS rebinding: dos preguntas al DNS, dos respuestas. CURLOPT_RESOLVE conecta a la IP que se validó. Repasa 82.6.' },
    { id: 'reglas', type: 'multi',
      prompt: '¿Qué reglas lleva la función que visita una URL libre? Marca todas.',
      options: [
        'Solo http y https, y solo los puertos 80 y 443',
        'No seguir redirecciones sin validarlas de nuevo',
        'Rechazar el host si contiene la palabra localhost',
        'Timeout y tamaño máximo de respuesta'
      ],
      answer: [0, 1, 3],
      explain: 'Buscar "localhost" en el texto no sirve: 127.1, 0x7f000001 y un dominio que resuelve a 127.0.0.1 pasan. Se valida la IP resuelta. Repasa 82.6.' },
    { id: 'redir', type: 'single',
      prompt: '¿Qué valor de <code>next</code> parece una ruta local y lleva a otro dominio?',
      options: [
        '<code>/mis-postulaciones?id=101</code>',
        '<code>//practicas-edu.example</code>',
        '<code>/perfil#datos</code>',
        '<code>/./inicio</code>'
      ],
      answer: 1,
      explain: 'Una URL que empieza con // es relativa al esquema: el navegador la lee como otro host. La defensa es una lista de destinos. Repasa 82.7.' },
    { id: 'guardadas', type: 'single',
      prompt: '<code>sitio_web</code> se guarda con <code>trim</code> y se pinta como enlace. ¿Cuál es el riesgo?',
      options: [
        'Una SSRF, porque el servidor visita la URL al guardarla',
        'Una inyección SQL, porque la URL va en el INSERT',
        'Un XSS con javascript: cuando alguien hace clic',
        'Un path traversal, porque la URL puede llevar ../'
      ],
      answer: 2,
      explain: 'Nadie la visita desde el servidor y el INSERT usa parámetros. El esquema javascript: en un href ejecuta código en tu origen. Repasa 82.8.' }
  ]
});
