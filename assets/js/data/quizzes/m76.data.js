SD.defineQuiz('m76', {
  title: 'Quiz: CSRF', pass: 0.7,
  questions: [
    { id: 'que', type: 'single',
      prompt: '¿Qué necesita un atacante para un CSRF contra una API que autentica con cookies?',
      options: [
        'Leer la cookie de sesión de la víctima con JavaScript desde su propia página',
        'Que el navegador de la víctima mande una request; la cookie va sola',
        'Leer la respuesta de la API para saber si la acción funcionó antes de seguir',
        'Que la API tenga una política de CORS que acepte su origen con credenciales'
      ],
      answer: 1,
      explain: 'CSRF es de solo escritura: el atacante no lee nada. El navegador adjunta la cookie según el destino, y el efecto ocurre cuando la request llega. Repasa 76.1 y 76.2.' },
    { id: 'cors', type: 'single',
      prompt: 'Tu API no tiene ninguna cabecera CORS. Un formulario de otro sitio le manda un POST. ¿Qué pasa?',
      options: [
        'El navegador no deja salir el formulario porque la API no autoriza ese origen',
        'El navegador manda un preflight OPTIONS y el POST nunca sale',
        'PHP rechaza la request porque no reconoce el Origin',
        'El POST llega y se ejecuta; el otro sitio solo no puede leer la respuesta'
      ],
      answer: 3,
      explain: 'Un formulario manda una request simple, que no espera permiso. CORS decide quién lee, no quién envía (M75). Repasa 76.2.' },
    { id: 'lax', type: 'single',
      prompt: 'La cookie de sesión tiene <code>SameSite=Lax</code>. ¿Cuál de estos ataques sigue funcionando?',
      options: [
        'Un formulario POST desde ofertas-gratis.example que se envía solo',
        'Un <code>&lt;img&gt;</code> en otro sitio que apunta a un GET de la API que solo lee datos',
        'Un formulario POST desde blog.practicas.edu.gt, que es del mismo sitio',
        'Un fetch con mode no-cors y Content-Type text/plain desde otro sitio'
      ],
      answer: 2,
      explain: 'SameSite mira el sitio, no el origen: un subdominio del mismo sitio manda la cookie. Lax frena el POST y las subrequests de otro sitio, y un GET que solo lee no tiene efecto que aprovechar. Repasa 76.4.' },
    { id: 'ingenuo', type: 'single',
      prompt: '¿Por qué falla el double submit ingenuo (el mismo valor aleatorio en una cookie y en una cabecera, sin firma)?',
      options: [
        'Porque un subdominio puede escribir una cookie para todo el sitio y plantar el par',
        'Porque el atacante puede leer la cookie de tu sitio desde el suyo con document.cookie',
        'Porque los formularios HTML pueden mandar cabeceras propias como X-CSRF-Token',
        'Porque comparar dos strings en PHP no es posible en tiempo constante'
      ],
      answer: 0,
      explain: 'El servidor solo comprueba que la cookie y la cabecera coincidan. Quien controla un subdominio fija la cookie (cookie tossing) y manda el mismo valor. Firmar o derivar el token con una clave lo evita. Repasa 76.5.' },
    { id: 'derivado', type: 'multi',
      prompt: '¿Qué es cierto del token de <code>csrf.php</code> del sistema, un HMAC de la cookie con <code>COOKIE_KEY</code>? Marca todas.',
      options: [
        'Cambia cuando cambia la cookie, por ejemplo con un login nuevo',
        'No necesita guardar nada en el servidor',
        'Frena a un XSS que corre en el mismo origen, porque el XSS tampoco conoce la clave',
        'Sin la clave, el atacante no lo puede fabricar'
      ],
      answer: [0, 1, 3],
      explain: 'Está atado a la sesión, no tiene estado y depende de una clave. Un XSS corre en tu origen: puede leer el token de la página o pedirlo, así que ningún token lo frena. Repasa 76.5.' },
    { id: 'null', type: 'single',
      prompt: 'Una request llega con <code>Origin: null</code>. ¿Qué hace la comprobación de origen?',
      options: [
        'La acepta, porque null significa que la request viene del mismo origen',
        'La rechaza: un iframe con sandbox lo produce, y el atacante lo puede provocar',
        'La acepta si también viene la cookie de sesión, porque eso prueba que es el usuario',
        'Mira la cabecera Host, que el navegador fija y no se puede cambiar'
      ],
      answer: 1,
      explain: 'null aparece en sandbox, data: y redirecciones entre orígenes, y un atacante lo provoca a propósito. Nunca va en la lista. Host lo escribe el cliente. Repasa 76.6.' },
    { id: 'meta', type: 'single',
      prompt: 'Con la política de aislamiento de recursos, ¿qué request <b>cross-site</b> se deja pasar?',
      options: [
        'Un POST de formulario, porque es una navegación de nivel superior',
        'Un fetch con mode cors, porque el servidor ya decide con CORS',
        'Una imagen, porque no puede cambiar nada en el servidor',
        'Una navegación GET de nivel superior, como seguir un enlace'
      ],
      answer: 3,
      explain: 'La política acepta same-origin, same-site y none, y de lo cross-site solo la navegación GET. Por eso el GET no debe cambiar estado. Repasa 76.7 y la figura 76.7.' },
    { id: 'login', type: 'single',
      prompt: '¿Por qué el token atado a la sesión no frena un login CSRF?',
      options: [
        'Porque antes del login no hay cookie: no hay sesión a la que atar el token',
        'Porque login.php usa GET y el token solo se pide en los métodos que escriben',
        'Porque el atacante conoce el token: es el de su propia cuenta de estudiante',
        'Porque SameSite=Lax ya lo frena y el token se desactiva para no duplicar'
      ],
      answer: 0,
      explain: 'El ataque mete a la víctima en la cuenta del atacante antes de que haya sesión. La defensa es comprobar Origin y Fetch Metadata en el login, o una sesión previa con su propio token. Repasa 76.8.' },
    { id: 'json', type: 'single',
      prompt: 'Una API recibe JSON con <code>json_decode(file_get_contents("php://input"))</code>. ¿Está a salvo de CSRF por eso?',
      options: [
        'Sí: un formulario HTML no puede mandar un cuerpo JSON',
        'Sí, porque PHP rechaza los cuerpos que no traen Content-Type: application/json',
        'No: un fetch no-cors con text/plain lleva un cuerpo JSON y PHP lo decodifica',
        'No, porque json_decode también acepta los cuerpos de formulario urlencoded'
      ],
      answer: 2,
      explain: 'Hay que rechazar todo Content-Type distinto de application/json: así un formulario no sirve y un fetch con JSON dispara un preflight. PHP no lo comprueba por ti. Repasa 76.3 y 76.8.' },
    { id: 'orden', type: 'order',
      prompt: 'Ordena las comprobaciones del middleware, de la primera a la última.',
      items: [
        'Fetch Metadata: rechazar lo cross-site que no es una navegación',
        'Origin exacto en los métodos que escriben',
        'La sesión con checkAuth()',
        'El token con requireCsrfToken()',
        'El rol y el dueño del recurso'
      ],
      explain: 'De lo más barato y sin estado a lo que necesita la sesión. El token se calcula a partir de la cookie, así que va después de validarla. Repasa 76.9.' }
  ]
});
