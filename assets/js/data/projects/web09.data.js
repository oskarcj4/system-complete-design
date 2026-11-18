/* Decisiones guiadas de WEB09 (cabeceras). Formato en core/exercise.js. */

SD.defineExercise('web09-cabeceras', {
  title: 'las cabeceras del frontend compilado y de la API',
  scenario: '<p>El sistema de prácticas va a servir su frontend compilado desde Apache, en <code>localhost:8080</code>, con la API en el mismo origen. La API ya manda <code>nosniff</code>; el frontend no manda nada, y cualquier sitio lo puede enmarcar. Son seis decisiones.</p>',
  steps: [
    {
      id: 'nonce', type: 'single',
      prompt: 'El <code>index.html</code> del build es estático y carga un solo <code>.js</code> con <code>&lt;script src&gt;</code>. ¿Qué lleva <code>script-src</code>?',
      options: [
        'Un nonce fijo escrito en el index.html, igual en cada respuesta, porque el archivo no cambia entre builds.',
        'Un nonce nuevo por respuesta y strict-dynamic, que es la CSP estricta que recomienda Google para toda página.',
        "'self': no hay scripts inline ni nadie que genere un nonce, y en el origen no se sube ningún .js.",
        "'self' y 'unsafe-inline', para que React pueda poner sus estilos y scripts en la página sin errores."
      ],
      answer: 2,
      explain: 'Un nonce sirve si el servidor genera cada respuesta y lo cambia cada vez; uno fijo es un secreto publicado. Sin scripts inline, <code>\'self\'</code> alcanza, siempre que nadie pueda subir un <code>.js</code> al origen (desde WEB08, nadie). Es el caso de <a href="../modules/m78-csp-cabeceras.html#spa">78.4</a>. Está en <a href="#paso-reporte">el paso 3</a>.'
    },
    {
      id: 'dev', type: 'single',
      prompt: '¿Por qué la CSP se prueba contra el build en Apache y no se pone en <code>server.headers</code> del <code>pnpm dev</code>?',
      options: [
        'Porque Vite en desarrollo inyecta scripts inline para el recargado en caliente, y la política estricta lo rompe.',
        'Porque el servidor de desarrollo de Vite no deja mandar cabeceras propias en ninguna de sus respuestas.',
        'Porque en desarrollo la API está en otro origen, y la CSP no permite nombrar orígenes distintos del propio.',
        'Porque una CSP solo se aplica a páginas servidas por un servidor de producción, no a localhost.'
      ],
      answer: 0,
      explain: 'Vite sí acepta cabeceras, y una CSP puede nombrar otros orígenes; el problema es que el servidor de desarrollo necesita lo que la política estricta prohíbe. El trade-off está en <a href="../modules/m78-csp-cabeceras.html#php">78.8</a>, y la decisión en <a href="#paso-build">el paso 2</a>.'
    },
    {
      id: 'reportonly', type: 'single',
      prompt: 'Con la política en <code>Content-Security-Policy-Report-Only</code>, ¿qué pasa en <code>atacante.test/web09.html</code>?',
      options: [
        'El iframe queda vacío, porque frame-ancestors se aplica siempre, aunque la política sea solo de reporte.',
        'El navegador pregunta a la persona si quiere mostrar la página enmarcada, y manda un reporte con la respuesta.',
        'La aplicación se carga sin estilos, porque report-only bloquea las hojas de estilo pero deja pasar los iframes.',
        'La aplicación se ve dentro del iframe y llega un reporte de frame-ancestors: report-only no bloquea.'
      ],
      answer: 3,
      explain: 'Report-only evalúa toda la política, también <code>frame-ancestors</code>, y solo reporta. Por eso la etapa 1 sirve para encontrar lo que se rompería, y por eso no es una defensa. Es la falla 1, en <a href="#comprueba-fallas">las fallas</a>.'
    },
    {
      id: 'documento', type: 'single',
      prompt: 'La API manda <code>frame-ancestors \'none\'</code> en toda respuesta. ¿Qué pasa con el CV de <code>archivos.php</code>?',
      options: [
        'Nada: frame-ancestors solo se aplica a respuestas HTML, y un PDF se dibuja igual dentro de un iframe.',
        'El iframe del CV en el panel queda en blanco: archivos.php la cambia por \'self\' y los orígenes del .env.',
        'El CV se descarga en lugar de mostrarse, porque el navegador cambia inline por attachment al ver la política.',
        'Solo se rompe en Firefox, porque Chrome aplica frame-ancestors únicamente a documentos del mismo origen.'
      ],
      answer: 1,
      explain: '<code>frame-ancestors</code> se aplica a cualquier documento que se quiera enmarcar, también un PDF. <code>cabecerasDocumento</code> reemplaza solo esa parte de la política, y <code>header()</code> hace que la última gane. Está en <a href="#paso-api">el paso 1</a>.'
    },
    {
      id: 'hsts', type: 'single',
      prompt: 'El laboratorio es http. ¿Qué pasa con <code>Strict-Transport-Security</code>?',
      options: [
        'Se manda igual: el navegador la guarda y la usa cuando el sitio pase a https.',
        'Se manda con max-age=0 en http, para que el navegador borre cualquier HSTS anterior del host.',
        'No se manda: por http el navegador la ignora, y la condición expr la deja solo para https.',
        'Se manda, y el navegador redirige solo a https aunque el servidor no tenga certificado.'
      ],
      answer: 2,
      explain: 'Una HSTS que llega por http la pudo inventar cualquiera en el medio, así que el navegador no la toma. Mandarla igual no hace daño ni sirve; la condición <code>expr=%{HTTPS} == \'on\'</code> deja la línea lista para cuando haya https. Está en <a href="#paso-hsts">el paso 5</a>.'
    },
    {
      id: 'filtro', type: 'single',
      prompt: '<code>cabecerasDocumento</code> filtra los orígenes de <code>ORIGENES_PERMITIDOS</code> antes de escribirlos. Si el <code>.env</code> los escribe la misma persona, ¿para qué?',
      options: [
        'Para que un error de tipeo no rompa el arranque de PHP, que falla si una cabecera tiene caracteres raros.',
        'Para ahorrar bytes: una política con orígenes repetidos pesa el doble y el navegador la recorta.',
        'Para que el navegador acepte la política, que rechaza entera cualquier CSP con un origen que no responde.',
        'Porque un ; empieza otra directiva y un * deja enmarcar a cualquiera: la configuración también es dato.'
      ],
      answer: 3,
      explain: 'El valor termina dentro de una cabecera con su propia sintaxis. Un <code>;</code> o un <code>*</code> en el <code>.env</code> cambiarían qué dice la política, sin un error que lo avise. La falla 4 lo muestra con la prueba. Está en <a href="#paso-api">el paso 1</a>.'
    }
  ],
  solution: '<ul><li>La CSP se prueba contra el build, servido como en producción y en el mismo origen que la API.</li><li>Una SPA estática sin scripts inline usa <code>script-src \'self\'</code>; el nonce espera a que el servidor genere el HTML.</li><li>Report-only primero, con un endpoint que no confía en lo que recibe; después, bloqueo.</li><li>La API dice "nada" desde <code>aplicarCors</code>, y solo el documento cambia quién lo enmarca.</li><li>HSTS solo por https, con un <code>max-age</code> corto al principio.</li></ul>'
});
