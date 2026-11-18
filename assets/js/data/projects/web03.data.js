/* Decisiones guiadas de WEB03 (CSRF). Formato en core/exercise.js. */

SD.defineExercise('web03-csrf', {
  title: 'las capas contra CSRF del sistema de prácticas',
  scenario: '<p>La cookie sale con <code>SameSite=Strict</code> y toda escritura exige un <code>X-CSRF-Token</code> derivado de la cookie. Vas a sumar la capa que mira de dónde viene la request y a cerrar el <code>Content-Type</code>. Son seis decisiones.</p>',
  steps: [
    {
      id: 'vecino', type: 'single',
      prompt: 'Una página en <code>http://localhost:8081</code> manda un formulario a la API en <code>http://localhost</code>. Con <code>SameSite=Strict</code>, ¿viaja la cookie?',
      options: [
        'No: Strict solo la manda cuando la request sale del mismo origen, con el mismo esquema, host y puerto.',
        'Sí: para SameSite cuenta el sitio, y un puerto distinto en el mismo host no cambia el sitio.',
        'Solo si el formulario es GET, porque Strict bloquea los POST que vienen de otra página.',
        'Solo si la página del 8081 la leyó antes con document.cookie y la copió en el formulario.'
      ],
      answer: 1,
      explain: '<code>SameSite</code> compara sitios (esquema y dominio registrable), no orígenes. <code>localhost:8081</code> y <code>localhost</code> son el mismo sitio, así que la cookie viaja en GET y en POST. <code>document.cookie</code> no la ve, porque es <code>HttpOnly</code>. Por eso hace falta la capa nueva. Está en <a href="#excusa">la figura WEB03.2</a>.'
    },
    {
      id: 'sinorigen', type: 'single',
      prompt: 'Una request que escribe llega sin <code>Origin</code> y sin <code>Sec-Fetch-Site</code>. ¿Qué hace <code>requireOrigenConfiable</code>?',
      options: [
        'La rechaza con 403, porque toda request legítima de un navegador trae al menos una de las dos.',
        'La deja pasar al token: sin esas cabeceras no es un navegador, y CSRF necesita uno.',
        'La deja pasar sin token, porque un cliente sin cabeceras de navegador no tiene cookie ajena.',
        'Mira el Referer y la rechaza si no coincide con alguno de los orígenes de la lista.'
      ],
      answer: 1,
      explain: 'CSRF es un navegador engañado que manda la cookie de la víctima. <code>curl</code> o un script no tienen esa cookie, así que no hay a quién engañar; igual pasan por el token. Rechazarlas dejaría fuera las pruebas y las integraciones. Está en <a href="#paso-origen">el paso 1</a>.'
    },
    {
      id: 'prefijo', type: 'single',
      prompt: '¿Por qué <code>esOrigenPermitido</code> usa <code>in_array</code> exacto y no <code>str_starts_with($origen, \'http://localhost:5173\')</code>?',
      options: [
        'Porque in_array es más rápido que comparar cadenas cuando la lista tiene más de un origen.',
        'Porque http://localhost:5173.atacante.test empieza igual que el permitido y es un host de otra persona.',
        'Porque str_starts_with no existe en PHP 8.3 y habría que escribirla a mano con substr.',
        'Porque el navegador manda el Origin con la ruta completa de la página y hay que cortarla primero.'
      ],
      answer: 1,
      explain: 'Un origen que <em>empieza</em> como el permitido puede ser un subdominio de otro dominio. La matriz lo prueba con una fila. <code>str_starts_with</code> existe desde PHP 8.0, y <code>Origin</code> nunca lleva ruta. Está en <a href="#paso-origen">el paso 1</a> y en <a href="#comprueba-matriz">la matriz</a>.'
    },
    {
      id: 'tipo', type: 'single',
      prompt: 'Un <code>fetch</code> desde otro sitio manda <code>Content-Type: text/plain; application/json</code>. ¿Por qué no hay preflight?',
      options: [
        'Porque el navegador mira el tipo sin sus parámetros, y ese tipo es text/plain.',
        'Porque los fetch con mode no-cors nunca hacen preflight, tengan el Content-Type que tengan.',
        'Porque el servidor respondió antes con Access-Control-Allow-Headers: Content-Type.',
        'Porque el preflight solo se dispara con métodos PUT y DELETE, y este fetch es un POST.'
      ],
      answer: 0,
      explain: 'El navegador parsea el tipo y mira su esencia: <code>text/plain</code>, con un parámetro inválido que ignora. <code>no-cors</code> no permite cabeceras que no sean seguras (las quitaría), un POST también puede pedir preflight, y el preflight ocurre antes de cualquier respuesta. Está en <a href="#paso-content-type">el paso 4</a>.'
    },
    {
      id: 'login', type: 'single',
      prompt: '¿Qué gana un atacante con un login CSRF, si no se lleva ninguna contraseña?',
      options: [
        'Nada importante: la víctima ve una cuenta ajena, se da cuenta enseguida y sale de ella.',
        'La sesión de la víctima, porque el login le devuelve al atacante la cookie nueva.',
        'Que la víctima trabaje en la cuenta del atacante, y lo que escriba quede ahí para él.',
        'El token CSRF de la víctima, que el login devuelve en el cuerpo de la respuesta.'
      ],
      answer: 2,
      explain: 'La víctima queda dentro de una cuenta que controla el atacante; si sube su CV o completa su perfil, el atacante lo lee después. La cookie y el token van al navegador de la víctima, no al atacante, y en una SPA no siempre se nota de quién es la cuenta. Está en <a href="#paso-login">el paso 3</a>.'
    },
    {
      id: 'capas', type: 'multi',
      prompt: 'En la falla 2 comentas <code>requireCsrfToken()</code>. ¿Qué requests de la matriz pasan ahora y antes no?',
      options: [
        'La que trae el Origin del frontend y no trae token.',
        'La que trae Origin: http://atacante.test y un token válido.',
        'La que trae Sec-Fetch-Site: cross-site y un token válido.',
        'La que viene sin Origin ni Sec-Fetch-Site y con un token válido.'
      ],
      answer: [0],
      explain: 'Sin el token, solo cambia la fila que dependía del token: la que trae un <code>Origin</code> permitido. Las de otro origen las sigue cortando la capa nueva, y la que viene sin cabeceras ya pasaba antes. Que el <code>Origin</code> lo escriba <code>curl</code> es la razón para no quedarse solo con esa capa. Está en <a href="#comprueba-fallas">las fallas</a>.'
    }
  ],
  solution: '<ul><li><code>SameSite</code> no frena al mismo sitio: <code>localhost:8081</code> manda la cookie.</li><li><code>requireOrigenConfiable</code> corta <code>cross-site</code>, un <code>Origin</code> fuera de la lista exacta y <code>same-site</code> sin <code>Origin</code>; sin cabeceras, decide el token.</li><li>El login la llama antes de leer el cuerpo.</li><li><code>readJsonInput</code> compara el tipo sin parámetros y responde 415.</li></ul>'
});
