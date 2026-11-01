/* Checkpoint I: examen integrador de la Parte IX (M73 a M85). Cada explicación dice qué módulo repasar.
   Todo defensivo: patrón vulnerable y su arreglo; nada de procedimiento ofensivo. */
SD.defineQuiz('cpi', {
  title: 'Examen del Checkpoint I',
  pass: 0.7,
  questions: [
    { id: 'frontera', type: 'single',
      prompt: 'El frontend oculta el botón "Aprobar" a los estudiantes. ¿Qué impide que un estudiante apruebe una postulación?',
      options: [
        'Nada, salvo que el endpoint compruebe el rol en el servidor',
        'Que el botón no existe en su DOM y no puede llamar al endpoint',
        'Que el JavaScript minificado no deja leer la URL del endpoint',
        'Que la política de CORS solo deja pasar al frontend oficial'
      ],
      answer: 0,
      explain: 'Lo que corre en el navegador lo controla el usuario: puede mandar la request con curl o desde DevTools. Repasa M73 (la frontera de confianza) y M80.' },
    { id: 'origen', type: 'single',
      prompt: '<code>https://app.ejemplo.cl</code> y <code>https://api.ejemplo.cl</code>, ¿son el mismo origen y el mismo sitio?',
      options: [
        'Mismo origen y mismo sitio, porque comparten el dominio ejemplo.cl',
        'Distinto origen y distinto sitio, porque cambia el subdominio de la URL',
        'Distinto origen y mismo sitio: cambia el host, no el dominio registrable',
        'Mismo origen y distinto sitio, porque el esquema es el mismo'
      ],
      answer: 2,
      explain: 'El origen compara esquema, host y puerto; el sitio, el esquema y el dominio registrable. Por eso SameSite no frena una request entre subdominios. Repasa M74.' },
    { id: 'sesion', type: 'single',
      prompt: '¿Dónde guardas el identificador de sesión del sistema de prácticas?',
      options: [
        'En localStorage, para mandarlo a mano en un header Authorization',
        'En una cookie __Host- con Secure, HttpOnly y SameSite=Lax',
        'En sessionStorage, que se borra al cerrar la pestaña',
        'En una variable global del JavaScript del frontend'
      ],
      answer: 1,
      explain: 'Con HttpOnly un XSS no la lee, y __Host- impide que un subdominio la pise. Repasa M74 (dónde guardar una sesión).' },
    { id: 'cors', type: 'single',
      prompt: 'La API responde <code>Access-Control-Allow-Origin</code> con el <code>Origin</code> que llegue y <code>Allow-Credentials: true</code>. ¿Qué pasa?',
      options: [
        'Nada grave: el navegador rechaza esa combinación por sí solo y la bloquea',
        'Solo afecta a las requests simples, no a las que piden preflight',
        'Cualquier sitio lee las respuestas de la API con la cookie del usuario',
        'La API queda abierta a CSRF, pero no a que lean sus respuestas'
      ],
      answer: 2,
      explain: 'El navegador rechaza el comodín con credenciales, pero no un origen reflejado. La política va con una lista exacta y Vary: Origin. Repasa M75.' },
    { id: 'csrf', type: 'single',
      prompt: '¿Por qué CORS no protege contra CSRF?',
      options: [
        'Porque CORS solo se aplica a las requests que usan el método GET',
        'Porque el preflight se puede saltar cambiando el Content-Type a application/json',
        'Porque CORS solo existe en los navegadores basados en Chromium',
        'Porque decide quién lee la respuesta; la request ya llegó y se ejecutó'
      ],
      answer: 3,
      explain: 'Un formulario de otro sitio manda un POST simple sin preflight; el servidor lo procesa aunque el atacante no lea la respuesta. Repasa M75 y M76.' },
    { id: 'token', type: 'single',
      prompt: '¿Qué hace que un token CSRF funcione?',
      options: [
        'Que el atacante no puede leerlo desde otro sitio ni adivinarlo',
        'Que viaja en una cookie con SameSite=Strict que el atacante no ve',
        'Que se genera en el frontend con Math.random en cada envío',
        'Que se compara con == para evitar fallas de tipos en PHP'
      ],
      answer: 0,
      explain: 'La Same-Origin Policy impide leerlo desde otro sitio, y su aleatoriedad impide fabricarlo. Se compara con hash_equals. Repasa M76.' },
    { id: 'contexto', type: 'single',
      prompt: 'Un nombre del usuario va en <code>&lt;a href="…"&gt;</code>. ¿Basta con <code>htmlspecialchars</code>?',
      options: [
        'Sí: con ENT_QUOTES escapa todo lo que el navegador puede ejecutar',
        'No: en un href también hay que validar el esquema, como javascript:',
        'Sí, siempre que la página tenga una CSP con lista de dominios',
        'No: en un atributo hay que usar json_encode en lugar del escape de HTML'
      ],
      answer: 1,
      explain: 'El escape evita salir del atributo, pero una URL javascript: no necesita salir. Cada contexto tiene su regla. Repasa M77 (el contexto decide).' },
    { id: 'dom', type: 'single',
      prompt: 'El frontend muestra el título de una oportunidad con <code>el.innerHTML = titulo</code>. ¿Qué cambias?',
      options: [
        'Escapar el título en el servidor y dejar innerHTML como está',
        'Filtrar el título con una regex que quite las etiquetas script',
        'Usar el.textContent = titulo',
        'Usar insertAdjacentHTML, que no ejecuta los scripts insertados'
      ],
      answer: 2,
      explain: 'textContent trata el valor como texto. Una regex no alcanza: un onerror en una imagen no necesita script. Repasa M77 (fuentes y sumideros).' },
    { id: 'csp', type: 'single',
      prompt: '¿Por qué la CSP estricta usa nonce y strict-dynamic en vez de una lista de dominios?',
      options: [
        'Porque una lista de dominios no funciona en Firefox ni en Safari',
        'Porque el nonce cifra el script y el atacante no puede leerlo',
        'Porque strict-dynamic bloquea también los estilos en línea',
        'Porque en un dominio permitido suele haber algo que sirve para saltarla'
      ],
      answer: 3,
      explain: 'Una CDN o un endpoint JSONP permitido alcanza para cargar código del atacante. El nonce marca cada script legítimo. Repasa M78.' },
    { id: 'preparada', type: 'single',
      prompt: 'La consulta usa <code>ORDER BY $_GET[\'orden\']</code>. ¿Qué haces?',
      options: [
        'Elegir la columna de una lista permitida en el código',
        'Pasar el valor como parámetro con ? en la consulta preparada',
        'Escapar el valor con addslashes antes de concatenarlo',
        'Ponerlo entre comillas simples para que MySQL lo trate como texto'
      ],
      answer: 0,
      explain: 'Un parámetro solo puede ser un valor, no el nombre de una columna. Lo que no puede ser parámetro sale de una lista. Repasa M79.' },
    { id: 'bola', type: 'single',
      prompt: 'Una empresa edita <code>PUT /oportunidades.php?id=42</code>, que es de otra empresa. ¿Qué falta?',
      options: [
        'Comprobar que la sesión existe antes de leer el id',
        'Comprobar el dueño: WHERE id = ? AND empresa_id = la de la sesión',
        'Pedir el rol de empresa, que tiene permiso para editar oportunidades',
        'Usar un id aleatorio en lugar de un número correlativo'
      ],
      answer: 1,
      explain: 'Tiene sesión y el rol correcto; le falta la tercera pregunta, la del dueño. Un id aleatorio solo lo esconde. Repasa M80 (BOLA).' },
    { id: 'masiva', type: 'single',
      prompt: 'El estudiante manda <code>{"estado": "aprobada"}</code> al actualizar su postulación, y se guarda. ¿Qué falla?',
      options: [
        'Falta el token CSRF en el cuerpo de la request',
        'La consulta no es preparada y se puede inyectar el campo estado',
        'La sesión no se regeneró después del login',
        'Asignación masiva: no hay lista de campos permitidos por rol'
      ],
      answer: 3,
      explain: 'El servidor copia todos los campos que llegan. Cada rol tiene su lista de campos que puede escribir. Repasa M80.' },
    { id: 'fijacion', type: 'single',
      prompt: '¿Qué evita <code>session_regenerate_id(true)</code> al iniciar sesión?',
      options: [
        'Que alguien adivine la contraseña con fuerza bruta',
        'Que la cookie viaje en una request desde otro sitio',
        'Que un id de sesión fijado antes del login quede autenticado',
        'Que la sesión dure más que el tiempo de inactividad'
      ],
      answer: 2,
      explain: 'Si el id no cambia, quien lo fijó antes del login comparte la sesión autenticada. Repasa M81 (fijación de sesión).' },
    { id: 'enum', type: 'single',
      prompt: 'El login dice "usuario no existe" o "contraseña incorrecta" según el caso. ¿Qué cambias?',
      options: [
        'El mismo mensaje y el mismo tiempo de respuesta en los dos casos',
        'Mostrar el mensaje solo después de tres intentos fallidos',
        'Mandar el mensaje en un header en lugar de en el cuerpo',
        'Cifrar la respuesta para que solo el frontend la lea'
      ],
      answer: 0,
      explain: 'Dos mensajes, o dos tiempos distintos, dicen qué cuentas existen. Repasa M81 (enumeración).' },
    { id: 'subida', type: 'single',
      prompt: '¿Cómo compruebas que un CV subido es un PDF?',
      options: [
        'Por la extensión .pdf del nombre que manda el navegador',
        'Por el Content-Type application/pdf de la parte del formulario',
        'Por el tamaño, que en un PDF real pasa de unos pocos KB',
        'Por su contenido, con finfo y la firma %PDF- al principio'
      ],
      answer: 3,
      explain: 'El nombre y el Content-Type los escribe el cliente. Después se guarda fuera del web root con un nombre aleatorio. Repasa M82.' },
    { id: 'ssrf', type: 'single',
      prompt: 'La vista previa visita la URL que pega la empresa. ¿Qué la protege de pedir <code>169.254.169.254</code>?',
      options: [
        'Exigir que la URL empiece con https:// antes de visitarla',
        'Resolver una vez, rechazar IPs privadas y no seguir redirecciones',
        'Buscar la cadena 169.254 en la URL y rechazarla si aparece',
        'Visitarla con un timeout corto para que no alcance a responder'
      ],
      answer: 1,
      explain: 'Un nombre que resuelve a esa IP o una redirección esquivan el filtro de texto. Segunda capa: IMDSv2. Repasa M82 (SSRF).' },
    { id: 'carrera', type: 'single',
      prompt: 'Quedan 2 cupos y llegan 5 postulaciones a la vez. ¿Qué evita que entren las 5?',
      options: [
        'Leer los cupos, comprobar que hay y después restar uno',
        'Un rate limit de una postulación por segundo por usuario',
        'UPDATE … SET cupos = cupos - 1 WHERE id = ? AND cupos > 0',
        'Desactivar el botón en el frontend después del primer clic'
      ],
      answer: 2,
      explain: 'Leer y después escribir deja una ventana; el UPDATE condicional comprueba y resta en un solo paso. Repasa M83 (carreras).' },
    { id: 'click', type: 'single',
      prompt: '¿Qué cabecera evita que otro sitio cargue el panel en un iframe transparente?',
      options: [
        "Content-Security-Policy: frame-ancestors 'none'",
        'Cross-Origin-Opener-Policy: same-origin',
        'Access-Control-Allow-Origin con el origen propio',
        'Referrer-Policy: no-referrer'
      ],
      answer: 0,
      explain: 'frame-ancestors dice quién puede enmarcar la página; COOP trata ventanas abiertas, no iframes. Repasa M83 (clickjacking).' },
    { id: 'action', type: 'single',
      prompt: 'En Next.js, una Server Action <code>aprobar(id)</code> solo se usa desde una página de coordinadores. ¿Qué comprueba?',
      options: [
        'Nada más: la página ya está protegida por el middleware',
        'Solo la entrada, porque la sesión la comprobó la página',
        'Nada: Next.js compara Origin y Host, y eso basta',
        'Sesión, rol y entrada, como cualquier endpoint POST público'
      ],
      answer: 3,
      explain: 'Una Server Action es un endpoint POST que cualquiera puede llamar; el middleware es un chequeo optimista. Repasa M84.' },
    { id: 'wasm', type: 'single',
      prompt: 'El CV se valida en el navegador con un módulo de Wasm. ¿Qué pasa con la validación del servidor?',
      options: [
        'Se quita, porque el sandbox de Wasm no se puede saltar',
        'Se queda: la del navegador avisa y la del servidor decide',
        'Se quita si el .wasm se descarga con integrity',
        'Se reemplaza por una firma que el módulo pone en el archivo'
      ],
      answer: 1,
      explain: 'El sandbox protege a la página del módulo, no al servidor del usuario: el usuario manda el POST que quiera. Repasa M85.' }
  ]
});
