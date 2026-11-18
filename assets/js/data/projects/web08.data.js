/* Decisiones guiadas de WEB08 (subir el CV y SSRF). Formato en core/exercise.js. */

SD.defineExercise('web08-archivos', {
  title: 'los documentos subidos y una URL que el servidor visita',
  scenario: '<p>La subida de CVs del sistema de prácticas ya valida el tipo por contenido, usa nombres aleatorios y apaga PHP en <code>uploads/</code>. Aun así, un CV se abre sin sesión con su link, y producto pide una vista previa del sitio web de cada institución. Son seis decisiones.</p>',
  steps: [
    {
      id: 'nombre', type: 'single',
      prompt: 'El link de un CV tiene 32 caracteres hexadecimales aleatorios. ¿Por qué no alcanza como control de acceso?',
      options: [
        'Porque 32 caracteres hexadecimales se recorren en unas horas con un script que pruebe nombres en paralelo.',
        'Porque un link no pregunta quién lo abre: se reenvía, queda en historiales y sigue abriendo cuando ya no debería.',
        'Porque Apache lista los archivos de la carpeta si alguien pide la ruta sin el nombre del archivo.',
        'Porque el nombre sale de random_bytes, que en Windows usa un generador que no es criptográfico.'
      ],
      answer: 1,
      explain: '128 bits no se adivinan, y <code>Options -Indexes</code> ya impide el listado. El problema es otro: el link es la autorización entera, no vence y no sabe si la postulación se retiró. Es el id difícil de adivinar de <a href="../modules/m80-control-acceso.html#traversal">M80</a>. Está en <a href="#excusa">la excusa</a>.'
    },
    {
      id: 'carpeta', type: 'single',
      prompt: 'Ya existe <code>archivos.php</code>, que revisa el dueño. ¿Por qué además hay que sacar los documentos de <code>htdocs</code>?',
      options: [
        'Porque readfile solo puede leer archivos que están fuera de la carpeta que sirve Apache.',
        'Porque así los archivos quedan cifrados en disco y nadie con acceso al servidor puede leerlos.',
        'Porque mientras Apache los sirva, el link viejo abre el archivo sin pasar por el script.',
        'Porque PHP no puede abrir archivos subidos que estén dentro de una carpeta con un .htaccess.'
      ],
      answer: 2,
      explain: 'Un script que pregunta no sirve si hay otra puerta que no pregunta. Mover la carpeta (y negar la vieja) vuelve obligatorio el camino por <code>archivos.php</code>. <code>readfile</code> lee cualquier ruta, y mover no cifra nada. Está en <a href="#paso-carpeta">el paso 1</a>.'
    },
    {
      id: 'tipo', type: 'single',
      prompt: '¿De dónde sale el <code>Content-Type</code> con el que <code>archivos.php</code> entrega un documento?',
      options: [
        'De una lista por extensión que solo tiene pdf, jpg y png: un .html o un .svg nunca se sirven.',
        'Del tipo que mandó el navegador al subirlo, guardado en la base junto con el link del archivo.',
        'De mime_content_type sobre el archivo en disco, para que el tipo siempre coincida con el contenido.',
        'De la extensión que tenía el nombre original del archivo cuando la estudiante lo subió.'
      ],
      answer: 0,
      explain: 'El tipo que manda el navegador lo elige quien sube; el nombre original ni se guarda. La subida ya revisó el contenido, y al servir alcanza una lista corta: si algo raro llegara a la carpeta, no sale como HTML. Con <code>nosniff</code>, el navegador no adivina otro. Está en <a href="#paso-reglas">el paso 2</a>.'
    },
    {
      id: 'arroba', type: 'single',
      prompt: 'La vista previa recibe <code>http://sitio.example@169.254.169.254/</code>. ¿Qué host visitaría curl?',
      options: [
        'sitio.example, porque es lo primero que aparece después de las dos barras de la URL.',
        'Ninguno: curl rechaza las URLs que traen una arroba antes de la ruta y devuelve un error.',
        'Los dos, uno detrás del otro, porque curl trata la arroba como una lista de destinos.',
        '169.254.169.254: lo de antes de la arroba es un usuario, no el host.'
      ],
      answer: 3,
      explain: 'En una URL, <code>usuario:clave@host</code>: lo que va antes de la arroba son credenciales. Por eso <code>destinoPermitido</code> rechaza cualquier URL con <code>user</code> o <code>pass</code>, y valida el host que entrega <code>parse_url</code>, no el texto. Está en <a href="#paso-url">el paso 4</a>.'
    },
    {
      id: 'redir', type: 'single',
      prompt: 'Un sitio público responde <code>302 Location: http://127.0.0.1/interno/…</code>. ¿Qué hace <code>obtenerExterna</code>?',
      options: [
        'Sigue la redirección con curl, porque la primera URL ya pasó la validación y era pública.',
        'No la sigue sola: arma la URL nueva, la valida desde cero y la rechaza por ser interna.',
        'Devuelve el 302 como vista previa, porque una redirección no tiene título que mostrar.',
        'La sigue solo si el Location es relativo, y los absolutos los descarta sin validarlos.'
      ],
      answer: 1,
      explain: '<code>CURLOPT_FOLLOWLOCATION</code> está apagado. Cada salto pasa por <code>siguienteUrl</code> y vuelve a <code>destinoPermitido</code>, hasta tres veces. Es lo que la versión ingenua no hace: <code>file_get_contents</code> sigue hasta 20 redirecciones sin preguntar. Está en <a href="#comprueba-fallas">la falla 1</a>.'
    },
    {
      id: 'error', type: 'single',
      prompt: 'El sitio está caído, o el puerto cerrado, o tarda más de cuatro segundos. ¿Qué responde la vista previa?',
      options: [
        'Un 422 con el motivo exacto, igual que cuando la URL no pasa la validación.',
        'Un 200 con el título vacío, para que el panel no muestre un error por un sitio ajeno.',
        'Un 502 que dice lo mismo en los tres casos, y el detalle va al registro.',
        'Un 504 si tardó y un 502 si estaba cerrado, para que la administradora sepa qué pasó.'
      ],
      answer: 2,
      explain: 'Si cada caso tuviera su respuesta, la vista previa serviría para escanear puertos: es la SSRF ciega de <a href="../modules/m82-archivos-ssrf.html#ssrf">82.4</a>. El 422 sí dice el motivo, porque habla de la URL que mandaste, no de lo que pasó al conectar. Está en <a href="#paso-vista">el paso 5</a>.'
    }
  ],
  solution: '<ul><li>Un link aleatorio no es un control: los documentos salen de <code>htdocs</code> y los entrega un script que pregunta por el dueño.</li><li>El tipo al servir sale de una lista corta, con <code>nosniff</code>, <code>no-store</code> y <code>Cross-Origin-Resource-Policy</code>.</li><li>Una URL que el servidor visita se valida por la IP resuelta, se conecta a esa IP y cada redirección se valida de nuevo.</li><li>Los errores de conexión responden igual; el detalle va al registro.</li></ul>'
});
