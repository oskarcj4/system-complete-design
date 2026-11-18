/* Decisiones guiadas de WEB04 (CORS). Formato en core/exercise.js. */

SD.defineExercise('web04-cors', {
  title: 'la política CORS del sistema de prácticas',
  scenario: '<p>Hoy el frontend llama a la API por el proxy de Vite y las cabeceras CORS están copiadas en 14 endpoints con el origen fijo <code>http://localhost:5173</code>. Vas a dejar una sola política para el día que el frontend llame a Apache directo. Son seis decisiones.</p>',
  steps: [
    {
      id: 'proxy', type: 'single',
      prompt: 'Con el proxy de Vite, el frontend en <code>localhost:5173</code> hace un <code>POST</code> con <code>X-CSRF-Token</code>. ¿Hay preflight?',
      options: [
        'Sí: toda request con una cabecera propia pide preflight, venga de donde venga.',
        'No: para el navegador la API está en el mismo origen que la página, y CORS no entra.',
        'Sí, pero lo responde Vite y nunca llega a Apache ni a PHP.',
        'No, porque el proxy quita la cabecera X-CSRF-Token antes de mandar la request a Apache.'
      ],
      answer: 1,
      explain: 'La ruta es relativa, así que la request va a <code>localhost:5173</code>, el mismo origen de la página. El navegador no pregunta nada; Vite la reenvía con las cabeceras intactas. Por eso nadie vio el preflight roto. Está en <a href="#excusa">la excusa</a>.'
    },
    {
      id: 'antes', type: 'single',
      prompt: 'Sin proxy, ¿por qué el preflight a <code>postulaciones.php</code> falla hoy, si el endpoint sí manda <code>Access-Control-Allow-Origin</code>?',
      options: [
        'Porque Allow-Methods no incluye OPTIONS, y el navegador exige que el método del preflight esté en la lista.',
        'Porque el origen fijo no coincide con el del frontend sin proxy, que pasa a ser http://localhost.',
        'Porque el OPTIONS no trae cookie, llega a requireAuth y recibe 401, y el preflight necesita un 2xx.',
        'Porque PHP no recibe requests OPTIONS a menos que el .htaccess las habilite de forma explícita.'
      ],
      answer: 2,
      explain: 'El preflight nunca lleva cookies; <code>requireAuth</code> no encuentra sesión y corta. Con un estado que no es 2xx, el navegador no manda la request real. <code>OPTIONS</code> no tiene que estar en <code>Allow-Methods</code>, el origen de la página sigue siendo <code>localhost:5173</code> y Apache sí entrega el <code>OPTIONS</code>. Está en <a href="#excusa-viaje">la figura WEB04.3</a>.'
    },
    {
      id: 'reflejar', type: 'single',
      prompt: 'Alguien "arregla" CORS devolviendo el <code>Origin</code> que llegue, con <code>Allow-Credentials: true</code>. ¿Quién lee tu sesión con <code>GET login.php</code>?',
      options: [
        'Cualquier sitio de internet, porque la cookie viaja con credentials: include desde cualquier lado.',
        'Nadie, porque SameSite=Strict impide que la cookie viaje en toda request de otro origen.',
        'Solo el frontend, porque el navegador compara el Origin devuelto con el de la página que lo pidió.',
        'Una página del mismo sitio, como localhost:8081: recibe la cookie y ahora también la respuesta.'
      ],
      answer: 3,
      explain: '<code>Strict</code> frena a <code>atacante.test</code>, que es otro sitio: lee la respuesta, pero es un 401. <code>localhost:8081</code> es otro origen del mismo sitio: la cookie viaja, y con el origen reflejado puede leer el nombre y el <code>csrfToken</code>. Está en <a href="#excusa">la figura WEB04.2</a> y en <a href="#comprueba-fallas">la falla 1</a>.'
    },
    {
      id: 'asterisco', type: 'single',
      prompt: '¿Por qué no sirve <code>Access-Control-Allow-Origin: *</code> para este frontend?',
      options: [
        'Porque el navegador no deja leer con * una respuesta pedida con credenciales, y apiFetch las manda siempre.',
        'Porque * solo vale para GET, y el frontend también hace POST, PUT y DELETE.',
        'Porque * habilita a cualquier sitio a mandar escrituras con la cookie de la víctima.',
        'Porque Apache rechaza el asterisco en esa cabecera cuando el sitio no usa HTTPS.'
      ],
      answer: 0,
      explain: '<code>apiFetch</code> usa <code>credentials: \'include\'</code>, y con credenciales el navegador exige un origen exacto. El asterisco no tiene que ver con el método ni con HTTPS, y CORS no decide qué requests salen: eso es CSRF, y lo cubre WEB03. Está en <a href="#paso-cors">el paso 1</a> y en <a href="#comprueba-fallas">la falla 3</a>.'
    },
    {
      id: 'vary', type: 'single',
      prompt: 'Con la lista, la respuesta de <code>oportunidades.php</code> cambia según el <code>Origin</code>. ¿Qué evita <code>Vary: Origin</code>?',
      options: [
        'Que el navegador mande la cookie a un origen que no está en la lista de permitidos.',
        'Que un caché le sirva a un origen la respuesta guardada para otro, con su Allow-Origin.',
        'Que el preflight se repita en cada request: el navegador lo guarda según el valor de Vary.',
        'Que PHP tenga que leer el .env en cada request para armar la lista de orígenes.'
      ],
      answer: 1,
      explain: '<code>Vary</code> le dice a cualquier caché que la clave incluye el <code>Origin</code>. Sin eso, un caché podría guardar la respuesta con <code>Allow-Origin: http://localhost:5173</code> y dársela a otro origen, o guardar la de un rechazo y dársela al frontend. La cookie no depende de <code>Vary</code>, y el preflight se guarda con <code>Max-Age</code>. Está en <a href="#paso-cors">el paso 1</a>.'
    },
    {
      id: 'orden', type: 'multi',
      prompt: '¿Cuáles de estas afirmaciones sobre <code>aplicarCors</code> son ciertas?',
      options: [
        'Tiene que ir antes de requireAuth, porque el preflight no lleva sesión.',
        'Frena los formularios de otro sitio, porque no les manda Allow-Origin.',
        'Devuelve el Origin solo después de compararlo con la lista exacta.',
        'Hace innecesaria la comprobación de origen de WEB03 en las escrituras.'
      ],
      answer: [0, 2],
      explain: 'El preflight termina en <code>aplicarCors</code> con 204, sin cookie. El origen se compara antes de escribirlo en la cabecera. Pero CORS solo decide quién lee: un formulario de otro sitio llega igual a PHP, y por eso la capa de WEB03 sigue haciendo falta. Está en <a href="#limites">las limitaciones</a>.'
    }
  ],
  solution: '<ul><li>Con el proxy no hay CORS; sin proxy, el preflight sin cookie hoy muere en <code>requireAuth</code>.</li><li><code>cors.php</code>: <code>Vary: Origin</code> siempre, el origen exacto de la lista con credenciales, y el preflight con 204 antes de la sesión.</li><li>Nunca <code>*</code> ni el <code>Origin</code> reflejado: el vecino del mismo sitio recibe la cookie.</li><li>CORS decide quién lee; quién escribe lo decide WEB03.</li></ul>'
});
