SD.defineQuiz('m78', {
  title: 'Quiz: CSP y cabeceras de seguridad', pass: 0.7,
  questions: [
    { id: 'rol', type: 'single',
      prompt: '¿Qué papel cumple la CSP frente al XSS?',
      options: [
        'Reemplaza al escape: con una CSP estricta ya no hace falta escapar',
        'Es la segunda línea: si un payload entra al DOM, impide que se ejecute',
        'Limpia el HTML que llega del servidor antes de que el navegador lo parsee',
        'Frena también el CSRF, porque limita a dónde se envían las requests'
      ],
      answer: 1,
      explain: 'La CSP no evita la inyección: evita la ejecución. Tampoco frena HTML sin script ni CSRF. Repasa 78.1.' },
    { id: 'respaldo', type: 'multi',
      prompt: 'Tu política es <code>default-src \'self\'</code> y nada más. ¿Qué queda sin límite? Marca todas.',
      options: [
        '<code>base-uri</code>',
        '<code>script-src</code>',
        '<code>frame-ancestors</code>',
        '<code>form-action</code>'
      ],
      answer: [0, 2, 3],
      explain: 'default-src respalda a las directivas de recursos como script-src, pero no a base-uri, form-action ni frame-ancestors. Repasa 78.2 y la figura 78.2.' },
    { id: 'lista', type: 'single',
      prompt: '¿Por qué <code>script-src \'self\' https://cdn.jsdelivr.net</code> suele ser eludible?',
      options: [
        'Porque el CDN sirve cualquier paquete de npm, con JSONP y gadgets',
        'Porque los CDN no envían las cabeceras CORS que la CSP exige',
        'Porque self incluye todos los subdominios del sitio, también los olvidados',
        'Porque el navegador ignora las listas de dominios si hay más de una'
      ],
      answer: 0,
      explain: 'Permitir un dominio permite todo lo que sirve. El estudio de 2016 encontró que el 94.72 % de las políticas se podía eludir así. Repasa 78.3.' },
    { id: 'compat', type: 'single',
      prompt: 'En <code>script-src \'nonce-X\' \'strict-dynamic\' https: \'unsafe-inline\'</code>, ¿qué hace un navegador con CSP 3?',
      options: [
        'Permite todo script inline, porque unsafe-inline está en la política',
        'Aplica las cuatro fuentes a la vez, y alcanza con que se cumpla una',
        'Rechaza la política entera porque mezcla nonces y unsafe-inline',
        'Usa el nonce y strict-dynamic; ignora https: y también unsafe-inline'
      ],
      answer: 3,
      explain: 'Con un nonce, unsafe-inline se ignora; con strict-dynamic, las listas también. Los dos valores están para los navegadores viejos. Repasa 78.4.' },
    { id: 'cache', type: 'single',
      prompt: 'Una página con nonce se cachea en el CDN y se sirve igual a todos los usuarios. ¿Qué problema hay?',
      options: [
        'Ninguno, porque el nonce solo tiene que ser difícil de adivinar',
        'El nonce se repite, y quien lo lee una vez lo pone en su payload',
        'El CDN quita la cabecera CSP de las respuestas que guarda en caché',
        'El navegador rechaza los nonces de una respuesta que vino de caché'
      ],
      answer: 1,
      explain: 'Un nonce sirve porque cambia en cada respuesta. Si es fijo o se cachea para todos, deja de serlo. Repasa el callout de 78.4.' },
    { id: 'spa', type: 'single',
      prompt: 'El frontend es un <code>index.html</code> estático de Vite, sin PHP. ¿Cómo escribes la política estricta?',
      options: [
        'Con un nonce fijo escrito en el index.html durante el build',
        'Con una lista de dominios, porque sin servidor no hay otra opción',
        'Con el hash SHA-256 de cada script inline que vas a permitir',
        'No se puede: la CSP estricta solo funciona con páginas generadas'
      ],
      answer: 2,
      explain: 'Sin servidor que genere un nonce por respuesta, los hashes del contenido cumplen la misma función, y el nonce fijo no protege nada. Repasa 78.4, en Una SPA estática.' },
    { id: 'reportonly', type: 'single',
      prompt: '¿Qué hace <code>Content-Security-Policy-Report-Only</code>?',
      options: [
        'Bloquea como la normal y además manda un reporte de cada bloqueo',
        'Funciona solo en una etiqueta meta, para probar en el navegador',
        'Evalúa la política y reporta cada violación, sin bloquear nada',
        'Manda los reportes al usuario en la consola y no al servidor'
      ],
      answer: 2,
      explain: 'Evalúa y reporta sin bloquear, para arreglar el código antes de aplicar. No funciona en meta, y puede convivir con una política que bloquea. Repasa 78.5.' },
    { id: 'nosniff', type: 'single',
      prompt: '¿Qué evita <code>X-Content-Type-Options: nosniff</code>?',
      options: [
        'Que una respuesta se interprete como otro tipo distinto al declarado',
        'Que el navegador envíe su propio tipo de contenido en las requests que hace',
        'Que otros sitios lean la respuesta con fetch',
        'Que la respuesta se guarde en la caché del navegador'
      ],
      answer: 0,
      explain: 'Sin nosniff, el navegador puede adivinar el tipo y ejecutar un JSON o un texto como HTML o script. Leer la respuesta lo decide CORS. Repasa 78.6.' },
    { id: 'xxss', type: 'single',
      prompt: '¿Qué haces hoy con <code>X-XSS-Protection</code>?',
      options: [
        'La activas en modo block, porque es la defensa principal contra el XSS',
        'La omites, o la mandas en 0: los navegadores quitaron ese filtro',
        'La reemplazas por un X-Frame-Options con la misma configuración',
        'La mandas solo en la API, porque las páginas HTML ya tienen CSP'
      ],
      answer: 1,
      explain: 'Los navegadores quitaron ese filtro, que además se podía usar para borrar scripts legítimos. La defensa son el escape y la CSP. Repasa 78.6.' },
    { id: 'coop', type: 'single',
      prompt: '¿Qué consigue <code>Cross-Origin-Opener-Policy: same-origin</code>?',
      options: [
        'Que ninguna página de otro origen pueda enmarcar la tuya en un iframe',
        'Que tus imágenes no se puedan incluir desde otro sitio',
        'Que window.opener sea null y la ventana quede en su propio grupo',
        'Que fetch solo se pueda hacer contra tu mismo origen'
      ],
      answer: 2,
      explain: 'COOP corta la relación entre ventanas. Enmarcar lo controla frame-ancestors, incluir recursos CORP, y fetch connect-src. Repasa 78.7.' }
  ]
});
