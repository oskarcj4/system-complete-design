SD.defineExercise('m76-api', {
  title: 'cerrar el CSRF del sistema de prácticas',
  scenario: '<p>El sistema pasa a producción: frontend en <code>https://app.practicas.edu.gt</code>, API en <code>https://api.practicas.edu.gt</code> y el blog de la universidad en <code>blog.practicas.edu.gt</code>, de otro equipo. La cookie de sesión es <code>HttpOnly</code> y <code>Secure</code>. Hoy hay un token derivado con HMAC (<code>csrf.php</code>) que <code>requireAuth()</code> exige en los métodos que escriben, pero ningún endpoint lo entrega. Decide las capas.</p>',
  steps: [
    { id: 'samesite', type: 'single',
      prompt: '¿Qué SameSite le pones a la cookie de sesión?',
      options: [
        '<code>None</code>, porque el frontend y la API son orígenes distintos',
        '<code>Lax</code>: frena lo de otros sitios y deja entrar por un enlace',
        '<code>Strict</code>, y con eso ya no hace falta el token en ningún endpoint',
        'Ninguno, porque Chrome ya aplica Lax a las cookies que no lo declaran'
      ],
      answer: 1,
      explain: 'app. y api. son el mismo sitio, así que Lax no estorba al frontend. None manda la cookie desde cualquier sitio. Strict no frena al blog, que es del mismo sitio. Sin atributo hay excepción de dos minutos y navegadores que no lo aplican.' },
    { id: 'entrega', type: 'single',
      prompt: '¿Cómo llega el token al frontend?',
      options: [
        'En la respuesta del login y del GET de login.php, y el frontend lo guarda en memoria',
        'En un parámetro de la URL de cada página, para que el frontend lo lea con location.search',
        'En una cookie sin HttpOnly que el frontend copia a la cabecera, sin firma',
        'En localStorage, porque así sobrevive a recargar la página sin pedirlo otra vez'
      ],
      answer: 0,
      explain: 'Una respuesta JSON solo la lee tu origen. La URL se filtra en el historial y el Referer. La cookie sin firma es el double submit ingenuo. localStorage dura más y no protege más: un XSS lee las dos cosas igual.' },
    { id: 'blog', type: 'single',
      prompt: 'Un XSS en el blog manda formularios a la API. ¿Qué capa lo frena mejor?',
      options: [
        'SameSite=Strict, porque el blog está en otro subdominio',
        'Fetch Metadata con la política estándar, que rechaza lo same-site',
        'El Origin exacto: blog.practicas.edu.gt no está en la lista',
        'CORS, porque el blog no está en Access-Control-Allow-Origin'
      ],
      answer: 2,
      explain: 'El blog es el mismo sitio: SameSite manda la cookie y la política estándar deja pasar same-site. CORS no frena el envío. Un Origin comparado con una lista exacta sí lo frena, y el token también, porque el blog no puede leer la página del frontend.' },
    { id: 'login', type: 'single',
      prompt: '¿Qué protege el login contra el login CSRF?',
      options: [
        'requireCsrfToken() en login.php, con el token de la sesión anterior',
        'Nada: un login no cambia datos, así que no hace falta protegerlo',
        'SameSite=Lax en la cookie que crea el login',
        'Fetch Metadata y el Origin exacto antes de buscar al usuario'
      ],
      answer: 3,
      explain: 'Antes del login no hay sesión: ni token atado a ella ni cookie que SameSite pueda frenar. El login sí cambia algo: en qué cuenta queda el navegador. Origin y Fetch Metadata no necesitan sesión.' },
    { id: 'error', type: 'single',
      prompt: '¿Con qué código responde la API cuando rechaza por CSRF?',
      options: [
        '200 con code -1 en el JSON, como el resto de los errores de hoy',
        '403, antes de abrir la conexión a la base',
        '500, porque la request no se pudo procesar por un error del servidor',
        '302 al login, para que la persona vuelva a entrar y pruebe otra vez'
      ],
      answer: 1,
      explain: 'Un rechazo de seguridad es un 403: el WAF, los registros y el frontend lo distinguen de un error de negocio. No es un error del servidor, y redirigir esconde el rechazo y confunde al fetch.' }
  ],
  solution: '<ul><li>Cookie <code>__Host-sesion</code> con <code>Secure</code>, <code>HttpOnly</code> y <code>SameSite=Lax</code>.</li><li>Ningún <code>GET</code> cambia datos.</li><li><code>requireFetchMetadata()</code> en todo, <code>requireOrigenPropio()</code> en las escrituras y en el login, con la lista exacta de orígenes.</li><li>El token derivado en todo lo que escribe, entregado en el JSON del login y del <code>GET</code> de <code>login.php</code>, y con una clave propia (<code>CSRF_KEY</code>).</li><li>Rechazos con 403 y sin tocar la base.</li></ul>'
});
