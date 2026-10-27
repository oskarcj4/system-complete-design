SD.defineQuiz('m75', {
  title: 'Quiz: CORS a fondo', pass: 0.7,
  questions: [
    { id: 'quien', type: 'single',
      prompt: '¿Quién hace cumplir una política de CORS?',
      options: [
        'El servidor, que rechaza con un 403 las requests de orígenes que no están en su lista',
        'El navegador, que compara el Origin con las cabeceras de la respuesta',
        'El firewall, que filtra los paquetes según la cabecera Origin de cada request HTTP',
        'El servidor y el navegador por igual: cada uno bloquea la mitad del intercambio'
      ],
      answer: 1,
      explain: 'El servidor solo declara con cabeceras. El navegador decide si entrega la respuesta al JavaScript. curl o un script en otro servidor ignoran CORS por completo. Repasa 75.1.' },
    { id: 'simple', type: 'single',
      prompt: '¿Cuál de estas requests a otro origen sale <b>sin</b> preflight?',
      options: [
        'Un PUT con un cuerpo de texto plano',
        'Un POST con <code>Content-Type: application/json</code>',
        'Un POST con <code>Content-Type: application/x-www-form-urlencoded</code> y sin cabeceras propias',
        'Un GET con la cabecera <code>X-CSRF-Token</code>, porque GET nunca lleva preflight'
      ],
      answer: 2,
      explain: 'Una request simple es la que un formulario HTML ya podía mandar: GET, HEAD o POST, cabeceras seguras y un Content-Type de formulario o texto. PUT, JSON o una cabecera propia disparan el preflight, también en un GET. Repasa 75.2 y la figura 75.3.' },
    { id: 'efecto', type: 'single',
      prompt: 'Una página de otro sitio manda una request simple que crea una postulación. Tu API no tiene cabeceras CORS. ¿Qué pasa?',
      options: [
        'PHP crea la postulación; la otra página no puede leer la respuesta',
        'El navegador bloquea la request antes de que salga, porque no hay política CORS',
        'PHP rechaza la request porque no reconoce el Origin de la otra página',
        'El navegador manda un preflight, el servidor no lo responde bien y la request real no sale nunca'
      ],
      answer: 0,
      explain: 'Las requests simples no esperan permiso: llegan y se ejecutan. El navegador solo esconde la respuesta. Por eso CORS no protege contra CSRF. Repasa 75.2 y 75.7.' },
    { id: 'preflight-auth', type: 'single',
      prompt: 'El <code>GET</code> del frontend a la API funciona, pero el <code>PUT</code> falla en el preflight con un 401. ¿Qué pasa?',
      options: [
        'El navegador no tiene permiso para hacer PUT a otro origen, con ninguna política',
        'La sesión del usuario venció justo entre el GET y el PUT',
        'El endpoint pide sesión antes de responder el OPTIONS, que no lleva cookies',
        'Falta Access-Control-Allow-Origin en la respuesta al GET, que se guarda en la caché'
      ],
      answer: 2,
      explain: 'El preflight no lleva cookies ni body. Si requireAuth() corre antes de atenderlo, devuelve 401 y el navegador no manda el PUT. Se responde el OPTIONS primero, sin autenticar. Repasa 75.3 y 75.9.' },
    { id: 'comodin', type: 'single',
      prompt: 'Con <code>credentials: "include"</code>, el servidor responde <code>Access-Control-Allow-Origin: *</code>. ¿Qué hace el navegador?',
      options: [
        'Entrega la respuesta: el comodín incluye a todos los orígenes, con o sin credenciales',
        'Rechaza la respuesta: con credenciales hace falta el origen exacto y Allow-Credentials: true',
        'Manda la request sin la cookie y entrega la respuesta como si no hubiera sesión',
        'Repite la request con un preflight para pedir un origen concreto'
      ],
      answer: 1,
      explain: 'La especificación prohíbe el comodín con credenciales para que nadie escriba de una vez "todos leen con la sesión del usuario". Hace falta el origen exacto y Access-Control-Allow-Credentials: true. Repasa 75.4.' },
    { id: 'vary', type: 'single',
      prompt: '¿Para qué sirve <code>Vary: Origin</code> en una respuesta con CORS?',
      options: [
        'Para que el navegador mande la cabecera Origin también en las requests al mismo origen',
        'Para que una caché guarde una copia por origen y no sirva la de uno a otro',
        'Para que el servidor varíe los métodos permitidos según el origen que llama',
        'Para que el preflight se repita en cada request y no se use Max-Age'
      ],
      answer: 1,
      explain: 'Si Access-Control-Allow-Origin cambia según el Origin, una caché tiene que guardarlas por separado. Sin Vary, puede servirle a un origen la respuesta de otro. Repasa 75.5.' },
    { id: 'errores', type: 'multi',
      prompt: '¿Cuáles de estas políticas dejan que un origen ajeno lea la API con la sesión del usuario? Marca todas.',
      options: [
        'Copiar <code>$_SERVER["HTTP_ORIGIN"]</code> en Access-Control-Allow-Origin, con Allow-Credentials',
        'Aceptar el origen <code>null</code> además de los de la lista',
        'Comparar con <code>preg_match("/practicas\\.edu\\.gt/", $origin)</code>',
        'Comparar con <code>in_array($origin, CORS_ORIGINS, true)</code> contra una lista exacta'
      ],
      answer: [0, 1, 2],
      explain: 'Reflejar acepta a todos; null lo produce cualquier iframe con sandbox; la regex sin ancla acepta practicas.edu.gt.ofertas-gratis.example. La lista exacta con comparación estricta es la forma correcta. Repasa 75.6.' },
    { id: 'csrf', type: 'single',
      prompt: 'Un equipo dice: "Ya configuramos CORS con una lista exacta, así que estamos protegidos contra CSRF". ¿Qué le respondes?',
      options: [
        'Tienen razón, porque la lista exacta impide que otros orígenes manden requests a la API',
        'Tienen razón solo si además usan Vary: Origin, que impide reusar la respuesta',
        'Tienen razón para los POST, pero no para los GET',
        'No: CORS decide quién lee; una request simple de otro sitio llega y se ejecuta igual'
      ],
      answer: 3,
      explain: 'CORS llega después del efecto. Un formulario de otro sitio manda una request simple sin preflight. Contra CSRF están SameSite, el token y comprobar Origin o Sec-Fetch-Site (M76). Repasa 75.7.' },
    { id: 'curl', type: 'single',
      prompt: '¿Cómo compruebas que tu política no acepta un origen ajeno?',
      options: [
        'Abriendo el frontend en otra pestaña del mismo navegador y mirando si carga',
        'Con <code>curl -i -H "Origin: https://ofertas-gratis.example"</code> y mirando si vuelve en Access-Control-Allow-Origin',
        'Leyendo el log de errores de Apache, donde CORS anota cada origen rechazado',
        'No se puede comprobar fuera del navegador, porque CORS solo existe dentro de él'
      ],
      answer: 1,
      explain: 'El servidor responde lo mismo a curl que al navegador: basta mandar el Origin a mano y leer las cabeceras. Apache no anota nada de CORS, y otra pestaña es el mismo origen. Repasa 75.10.' }
  ]
});
