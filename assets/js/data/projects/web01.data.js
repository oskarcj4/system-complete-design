/* Decisiones guiadas de WEB01 (Lo que no debe verse). Formato en core/exercise.js. */

SD.defineExercise('web01-exposicion', {
  title: 'lo que tu servidor entrega sin que nadie lo pida',
  scenario: '<p>La API del sistema de prácticas responde todo con HTTP 200, cada endpoint pone su propio <code>Content-Type</code> y el <code>.htaccess</code> mira solo el final de la URL. Vas a ordenar cómo responde y qué entrega Apache. Son seis decisiones.</p>',
  steps: [
    {
      id: 'centro', type: 'single',
      prompt: 'Catorce endpoints ponen <code>header(\'Content-Type: application/json\')</code> a mano. ¿Dónde conviene fijarlo?',
      options: [
        'En cada endpoint, como está, pero revisado con una lista de comprobación antes de cada despliegue.',
        'En Response::json, por donde pasa toda respuesta, para que un endpoint nuevo no pueda olvidarlo.',
        'En el frontend, que debe leer siempre el cuerpo como JSON sin importar lo que diga la cabecera.',
        'En el .htaccess, con una cabecera fija para toda la carpeta api, incluidos los archivos estáticos.'
      ],
      answer: 1,
      explain: 'Un solo punto de salida hace imposible olvidarlo: el endpoint 15 hereda el tipo sin saberlo. Una lista de comprobación depende de la memoria, el frontend no puede corregir lo que el navegador ya interpretó, y una cabecera fija en Apache le pondría JSON también a un error de PHP en HTML. Está en <a href="#paso-response">el paso 1</a>.'
    },
    {
      id: 'codigo', type: 'single',
      prompt: 'Un endpoint llama a <code>Response::error("Usuario no autenticado", -2)</code> sin código HTTP. Con la tabla del paso 1, ¿qué código sale?',
      options: ['200', '400', '401', '403'],
      fixed: true,
      answer: 2,
      explain: 'Si quien llama no da el código HTTP, se deduce del <code>code</code>: <code>-2</code> es 401, \"identifícate\". 403 es para una sesión válida sin el rol, y por eso <code>requireAuth</code> lo pasa explícito. Está en <a href="#endpoints">los endpoints</a> y en <a href="#paso-middleware">el paso 5</a>.'
    },
    {
      id: 'detalle', type: 'single',
      prompt: 'Una consulta falla con un <code>PDOException</code>. ¿Qué le llega al cliente con <code>serverError</code>?',
      options: [
        'El mensaje de la excepción sin la ruta del archivo, que es la única parte que le sirve a un atacante.',
        'Un 500 con un mensaje genérico y un id corto, que también queda en el registro con el detalle.',
        'Un 200 con un cuerpo vacío, para que el frontend no muestre ningún error a la persona usuaria.',
        'Un 503 con Retry-After, porque una base que falla suele volver sola en unos segundos.'
      ],
      answer: 1,
      explain: 'El mensaje de PDO dice qué tabla, qué columna o qué servidor falló: sin la ruta sigue filtrando. El 200 vacío esconde la falla, y el 503 promete algo que no sabes. El id es lo único que viaja por los dos caminos. Está en <a href="#paso-errores">el paso 2</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '<code>COOKIE_KEY</code> falta en el <code>.env</code>. ¿Qué hace el backend después de esta guía?',
      options: [
        'Usa una clave por defecto escrita en el código, para que el sitio siga disponible mientras alguien la configura.',
        'Genera una clave aleatoria en cada request, de modo que ninguna cookie se pueda falsificar.',
        'Se niega a responder: devuelve 500 y deja el motivo en el registro.',
        'Sigue igual, pero marca todas las cookies como inválidas hasta que la clave aparezca en el archivo.'
      ],
      answer: 2,
      explain: 'Fallar cerrado: mejor un servidor caído que uno que firma con una clave que todos conocen. Una clave por defecto termina repetida en todas las instalaciones, y una aleatoria por request invalida toda sesión en la request siguiente. Está en <a href="#paso-env">el paso 3</a>.'
    },
    {
      id: 'regla', type: 'single',
      prompt: '¿Por qué la regla vieja <code>^(core|models)</code> no protegía <code>api/core/auth.php</code>?',
      options: [
        'Porque mod_rewrite no se aplica a los archivos .php, que pasan directo al intérprete.',
        'Porque el .htaccess está en la raíz del proyecto y la ruta que ve empieza por api/.',
        'Porque la bandera NC hace que la regla no distinga mayúsculas y nunca coincida con rutas reales.',
        'Porque la regla estaba después de la de los estáticos y la cadena de reescritura terminaba antes.'
      ],
      answer: 1,
      explain: 'En un <code>.htaccess</code>, la ruta se ve relativa a la carpeta del archivo: aquí, <code>api/core/auth.php</code>, que no empieza por <code>core</code>. mod_rewrite sí se aplica a los .php, <code>NC</code> amplía las coincidencias y la regla estaba antes de la de estáticos. Está en <a href="#paso-htaccess">el paso 4</a>.'
    },
    {
      id: 'capas', type: 'multi',
      prompt: '¿Cuáles de estas medidas siguen protegiendo el <code>.env</code> si alguien borra el <code>.htaccess</code>?',
      options: [
        'Haber movido el archivo a C:/xampp/secretos, fuera de htdocs.',
        'El bloque FilesMatch del final del .htaccess.',
        'Que Env::exigir rechace la clave del ejemplo al arrancar.',
        'La regla RewriteRule (^|/)\\. de la sección (1).'
      ],
      answer: [0, 2],
      explain: 'Fuera de <code>htdocs</code>, el archivo no tiene URL, con o sin <code>.htaccess</code>. Y aunque alguien vuelva a copiar el <code>.env</code> del ejemplo, <code>exigir</code> no deja arrancar. <code>FilesMatch</code> y la regla (1) viven en el mismo archivo borrado. Está en <a href="#infraestructura">la figura WEB01.2</a> y en <a href="#comprueba-fallas">la falla 3</a>.'
    }
  ],
  solution: '<ul><li>Una sola salida, <code>Response::json</code>, fija el tipo, el código HTTP y el formato.</li><li>401 sin sesión, 403 sin rol, 500 con referencia ante una excepción.</li><li>El backend no arranca sin una clave propia de 32 caracteres o más.</li><li>El <code>.env</code> fuera de <code>htdocs</code>, y el <code>.htaccess</code> mira cada segmento de la ruta.</li></ul>'
});
