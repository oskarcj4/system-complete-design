SD.defineQuiz('m83', {
  title: 'Quiz: Otros ataques que toda web debe cerrar', pass: 0.7,
  questions: [
    { id: 'click', type: 'single',
      prompt: '¿Qué evita el clickjacking?',
      options: [
        'Un token CSRF en el formulario que recibe el clic',
        "frame-ancestors 'none' en la CSP de la página",
        'SameSite=None en la cookie de sesión del sistema',
        'Una CSP con script-src y un nonce por respuesta'
      ],
      answer: 1,
      explain: 'El clic sale de tu propia página, dentro del iframe, así que el token viaja igual. Hay que impedir que la página se enmarque. Repasa 83.1.' },
    { id: 'origen', type: 'single',
      prompt: '¿Qué comprobación de <code>postMessage</code> es correcta?',
      options: [
        "e.origin.includes('practicas.edu.gt')",
        "e.origin.endsWith('practicas.edu.gt')",
        "e.origin === 'https://ayuda.practicas.edu.gt'",
        "e.data.origen === 'https://ayuda.practicas.edu.gt'"
      ],
      answer: 2,
      explain: 'includes acepta practicas.edu.gt.evil.example; endsWith acepta evilpracticas.edu.gt; e.data lo escribe quien manda el mensaje. e.origin lo pone el navegador. Repasa 83.2.' },
    { id: 'proto', type: 'single',
      prompt: '¿Por qué <code>{"__proto__": {"isAdmin": true}}</code> afecta a objetos que nunca tocó?',
      options: [
        'Porque JSON.parse convierte __proto__ en una variable global',
        'Porque el merge copia isAdmin a cada objeto de la memoria',
        'Porque el navegador guarda el JSON en localStorage',
        'Porque se escribe en Object.prototype, del que todos heredan'
      ],
      answer: 3,
      explain: 'La mezcla recursiva sigue __proto__ hasta el prototipo compartido; los objetos heredan la propiedad sin copiarla. Repasa 83.3.' },
    { id: 'veneno', type: 'single',
      prompt: '¿Qué hace posible el envenenamiento de caché?',
      options: [
        'Que el origen usa un dato que no está en la clave de la caché',
        'Que la caché guarda respuestas con Cache-Control: no-store',
        'Que el atacante tiene acceso al panel de la CDN',
        'Que la respuesta lleva Vary: Origin'
      ],
      answer: 0,
      explain: 'La caché cree que dos requests son iguales y el origen las responde distinto. Vary es justamente la forma de agregar ese dato a la clave. Repasa 83.4.' },
    { id: 'engano', type: 'single',
      prompt: 'La víctima visita <code>/perfil.php/x.css</code> y su perfil queda en la CDN. ¿Qué lo evita en el origen?',
      options: [
        'Devolver 404 a cualquier ruta que termine en .css',
        'Cache-Control: private, no-store en el perfil',
        'Vary: Cookie en todas las respuestas del sitio',
        'Cambiar la extensión de los estilos a .style'
      ],
      answer: 1,
      explain: 'Las respuestas personales nunca van a una caché compartida, la pida quien la pida. Repasa 83.4.' },
    { id: 'smuggle', type: 'single',
      prompt: '¿Dónde se corrige el request smuggling?',
      options: [
        'En PHP, validando Content-Length antes de leer el body',
        'En el WAF, con una regla que busca GET dentro de un POST',
        'En la infraestructura: HTTP/2 al origen y rechazar CL y TE juntos',
        'En el navegador, con una CSP que limite connect-src'
      ],
      answer: 2,
      explain: 'El desacuerdo es entre el proxy y el servidor; PHP recibe la request ya cortada. Las reglas de WAF se eluden, que es el punto del ataque. Repasa 83.5.' },
    { id: 'carrera', type: 'single',
      prompt: 'Dos estudiantes se postulan al último cupo al mismo tiempo. ¿Qué evita que entren los dos?',
      options: [
        'Leer el cupo con SELECT y comprobarlo con un if antes del INSERT',
        'Un sleep aleatorio entre la lectura y la escritura',
        'Desactivar el botón en el frontend después del primer clic',
        'UPDATE … SET cupos = cupos - 1 WHERE id = ? AND cupos > 0'
      ],
      answer: 3,
      explain: 'El SELECT y el if son justamente la ventana de la carrera. El botón no frena requests a mano. El UPDATE condicional decide en una sola sentencia. Repasa 83.6.' },
    { id: 'redos', type: 'single',
      prompt: 'En PHP, <code>preg_match</code> devuelve <code>false</code> con una entrada larga. ¿Qué significa?',
      options: [
        'Se alcanzó el límite de backtracking: es un error, no un "no"',
        'Que la entrada no coincide con la expresión',
        'Que la expresión tiene un error de sintaxis y no compiló',
        'Que la entrada tiene caracteres que no son UTF-8 válido'
      ],
      answer: 0,
      explain: 'false es error (preg_last_error dice cuál); 0 es "no coincide". Tratar false como 0 deja pasar la entrada sin validar. Repasa 83.7.' },
    { id: 'sri', type: 'single',
      prompt: '¿Para qué script no sirve SRI?',
      options: [
        'Una versión fija de una librería servida desde una CDN',
        'Un script de analítica que el proveedor actualiza solo',
        'Un archivo propio servido desde tu mismo dominio',
        'Una hoja de estilos de una CDN con versión en la URL'
      ],
      answer: 1,
      explain: 'SRI ata la etiqueta a un hash exacto; si el archivo cambia legítimamente, deja de cargar. Para esos, la CSP y aislarlo en un iframe. Repasa 83.8.' },
    { id: 'leaks', type: 'multi',
      prompt: '¿Qué defensas frenan los XS-Leaks? Marca todas.',
      options: [
        'SameSite=Lax o Strict en la cookie de sesión',
        'Rechazar Sec-Fetch-Site: cross-site en lo sensible',
        'Cifrar el cuerpo de las respuestas con AES',
        'COOP para cortar la referencia a la ventana'
      ],
      answer: [0, 1, 3],
      explain: 'El atacante no lee el cuerpo, así que cifrarlo no cambia nada; observa efectos. Sin sesión, con la request rechazada o sin la ventana, no hay qué observar. Repasa 83.9.' }
  ]
});
