/* Decisiones guiadas de A12: el panel de una tienda, con sesión en Redis, cookie __Host- y CSRF. */
SD.defineExercise('a12-sesiones', {
  title: 'el panel que sabe quién eres sin un token',
  scenario: '<p>El panel de una tienda, con ana (<code>ADMIN</code>), beto y carla (<code>STAFF</code>). La sesión vive en Redis con Spring Session; la cookie <code>__Host-SESSION</code> lleva solo un id opaco. Detrás del Nginx de A01, dos réplicas sin afinidad. Las defensas del navegador —<code>SameSite</code>, el token CSRF, Fetch Metadata— se encienden y apagan con variables de entorno. Decide cómo se comporta cada pieza.</p>',
  steps: [
    {
      id: 'sin-afinidad',
      type: 'single',
      prompt: 'Nginx reparte sin sesiones pegajosas: el login de ana lo atendió <code>app1</code>, y su siguiente request cae en <code>app2</code>. ¿Por qué sigue conectada?',
      options: [
        'Porque Spring Security copia la sesión entre las dos réplicas al autenticar, como un clúster de Tomcat',
        'Porque la sesión vive en Redis y la cookie lleva solo el id: cualquier réplica la lee con ese id',
        'Porque Nginx guarda la sesión y se la inyecta a la réplica que le toque en cada request',
        'Porque la cookie lleva la sesión entera firmada, y cualquier réplica la verifica sin consultar nada'
      ],
      answer: 1,
      explain: 'Ese es el punto de sacar la sesión del proceso. La cookie <code>__Host-SESSION</code> no lleva datos, solo el id; el estado está en Redis, y las dos réplicas lo leen igual. Por eso no hacen falta sesiones pegajosas, que estorban al desplegar. Vuelve al paso 3.'
    },
    {
      id: 'host-prefix',
      type: 'single',
      prompt: 'La cookie se llama <code>__Host-SESSION</code>. El subdominio vecino <code>blog.tienda.localhost</code> intenta escribir una cookie <code>__Host-SESSION</code> con <code>Domain=tienda.localhost</code> para fijártela. ¿Qué pasa?',
      options: [
        'El navegador la rechaza: el prefijo <code>__Host-</code> prohíbe <code>Domain</code>, y exige <code>Secure</code> y <code>Path /</code>',
        'La escribe, pero el panel la ignora porque no coincide con la de Redis',
        'La escribe y reemplaza la tuya, porque el prefijo <code>__Host-</code> es solo una convención de nombres que el servidor podría ignorar',
        'El navegador la acepta solo si el vecino usa HTTPS, que es el caso'
      ],
      answer: 0,
      explain: 'El prefijo <code>__Host-</code> lo hace cumplir el navegador, no el servidor: rechaza en silencio cualquier cookie con ese nombre que traiga <code>Domain</code>, que no sea <code>Secure</code> o cuyo <code>Path</code> no sea <code>/</code>. Así un subdominio no puede escribir ni pisar la cookie de sesión del panel. Vuelve al paso 5.'
    },
    {
      id: 'samesite',
      type: 'single',
      prompt: 'Con <code>SameSite=Lax</code>, una página de <code>malo.localhost</code> dispara al cargar un <code>POST</code> de cambio de precio al panel. ¿Qué manda el navegador?',
      options: [
        'La request con la cookie adjunta, porque <code>Lax</code> solo bloquea <code>Strict</code> y aquí la cookie viaja a cualquier request dirigida al panel',
        'Nada: <code>Lax</code> bloquea la request entera antes de salir del navegador',
        'La request, pero sin la cookie: <code>Lax</code> no la adjunta a un <code>POST</code> que nace en otro sitio',
        'La request con la cookie, pero marcándola para que el panel la rechace'
      ],
      answer: 2,
      explain: 'La request sale igual —<code>SameSite</code> no bloquea el envío—, pero el navegador no adjunta la cookie, porque es un <code>POST</code> que nace en otro sitio. El panel la ve como anónima. <code>Lax</code> es la defensa más barata contra CSRF, y por eso es el valor por defecto. Vuelve al paso 5.'
    },
    {
      id: 'fetch-metadata',
      type: 'single',
      prompt: 'Apagas el token CSRF para un experimento, pero dejas Fetch Metadata encendido. Llega ese mismo <code>POST</code> desde <code>malo.localhost</code>. ¿Qué responde el panel?',
      options: [
        '204: sin token CSRF, ya no hay nada que valide la escritura',
        '403 <code>CROSS_SITE_BLOCKED</code>: Fetch Metadata ve <code>Sec-Fetch-Site: cross-site</code> y corta',
        '403 <code>no_server_token</code>, porque Fetch Metadata no decide por su cuenta y termina delegando en el token CSRF que acabas de apagar',
        '302 al login, porque sin token el panel te trata como anónima'
      ],
      answer: 1,
      explain: 'Son capas independientes. Fetch Metadata lee <code>Sec-Fetch-Site</code>, que el navegador pone y una página no puede falsear, y bloquea la escritura <code>cross-site</code> antes de llegar al token. Esa es la idea de defensa en profundidad: quitar una capa no abre la puerta. Vuelve al paso 7.'
    },
    {
      id: 'cors',
      type: 'single',
      prompt: 'Abres <code>TIENDA_CORS_ORIGINS=https://malo.localhost:8443</code>. Esa página hace un <code>fetch</code> de cambio de precio con credenciales. ¿Qué logra CORS abierto?',
      options: [
        'Nada contra la escritura: CORS deja leer la respuesta, pero la escritura la siguen parando el token y Fetch Metadata',
        'Que la escritura pase, porque abrir CORS a un origen le concede permiso para enviar peticiones de escritura usando tu sesión activa',
        'Que la escritura pase solo si además <code>SameSite</code> es <code>None</code>',
        'Que el navegador deje de mandar la cookie a ese origen, por seguridad'
      ],
      answer: 0,
      explain: 'CORS gobierna quién puede <em>leer</em> una respuesta de otro origen, no si una escritura se manda o se ejecuta. Con CORS abierto, esa página podría leer <code>/v1/me</code> con tu sesión, pero el <code>POST</code> de cambio de precio lo siguen rechazando el token y Fetch Metadata. CORS nunca fue la defensa contra CSRF. Vuelve al paso 8.'
    },
    {
      id: 'tossing',
      type: 'single',
      prompt: 'En modo <code>TIENDA_CSRF=cookie</code> (doble envío simple), el vecino <code>blog.tienda.localhost</code> escribe una cookie <code>XSRF-TOKEN=conocido</code> con <code>Domain=tienda.localhost</code> y manda ese valor en la cabecera. ¿Por qué pasa la validación?',
      options: [
        'Porque el panel guarda el token en Redis y, por una colisión improbable, el valor que el vecino eligió coincide con el que estaba guardado',
        'Porque el doble envío compara la cookie con la cabecera, y el vecino controla las dos: las dos valen <code>conocido</code>',
        'Porque <code>Domain</code> hace que el panel confíe en cualquier cookie del sitio',
        'Porque en modo <code>cookie</code> el panel no valida nada, solo registra'
      ],
      answer: 1,
      explain: 'El doble envío por cookie confía en que nadie más escriba tus cookies: compara cookie contra cabecera, y aquí el vecino puso las dos. Con el token en la sesión no hay cookie que pisar, y con <code>cookie-host</code> el prefijo <code>__Host-</code> le impide escribir esa cookie. Por eso el panel usa el token en la sesión. Vuelve al paso 6.'
    },
    {
      id: 'absoluto',
      type: 'single',
      prompt: 'Bajas el tope absoluto a <code>2m</code> y haces una request cada diez segundos. A los dos minutos y pico, ¿qué pasa con la sesión?',
      options: [
        'Sigue viva: cada request reinició el reloj, así que nunca llega a los dos minutos',
        'Vence por inactividad, porque diez segundos entre requests es demasiado',
        'Vence: el reloj absoluto arranca en el login y no se reinicia con la actividad',
        'Sigue viva hasta que cierres el navegador, porque el tope solo aplica al cerrar'
      ],
      answer: 2,
      explain: 'Son dos relojes distintos. La inactividad (30&#8239;min) sí se reinició con cada request. El absoluto (aquí 2&#8239;min) arranca en el instante del login y no se reinicia nunca: a los dos minutos la sesión muere aunque estés en plena actividad. Eso acota cuánto sirve una sesión robada que se usa sin parar. Vuelve al paso 9.'
    },
    {
      id: 'redis-caido',
      type: 'single',
      prompt: 'Redis se cae. Llega una request con una cookie de sesión válida. Sin <code>StoreDownFilter</code>, ¿qué haría Spring Security, y por qué es el peor resultado?',
      options: [
        'Devolvería 500 con un stack trace: ruidoso, pero seguro, porque no deja entrar a nadie',
        'Esperaría a que Redis vuelva y luego respondería normal, sin que nadie lo note',
        'La trataría como anónima, un fail-open: deja pasar sin poder verificar quién eres',
        'Cerraría la sesión y te mandaría al login, que es exactamente lo correcto'
      ],
      answer: 2,
      explain: 'Sin la sesión de Redis, Spring Security vería una request sin sesión y la trataría como anónima: un fail-open, dejar pasar justo cuando no puede autenticar. <code>StoreDownFilter</code> envuelve la cadena, atrapa el fallo de conexión y responde 503 con <code>Retry-After</code>. El panel cierra, no abre. Vuelve al paso 12.'
    }
  ],
  solution: '<ul>' +
    '<li>La sesión vive en Redis con Spring Session; la cookie <code>__Host-SESSION</code> lleva solo un id opaco, así que cualquier réplica la lee sin afinidad.</li>' +
    '<li>La cookie se blinda atributo por atributo: <code>__Host-</code> (que el navegador hace cumplir), <code>HttpOnly</code>, <code>Secure</code> y <code>SameSite=Lax</code>, la primera defensa contra CSRF.</li>' +
    '<li>Dos capas más, independientes, paran la escritura de otro sitio: el token CSRF en la sesión y Fetch Metadata, que lee <code>Sec-Fetch-Site</code> y corre antes.</li>' +
    '<li>CORS abre lecturas entre orígenes, no escrituras: abrirlo deja leer la respuesta con tu sesión, pero el token y Fetch Metadata siguen parando el <code>POST</code>.</li>' +
    '<li>El doble envío por cookie cede ante un vecino que escribe cookies; el token en la sesión y <code>cookie-host</code> no.</li>' +
    '<li>Dos relojes: inactividad que se renueva, y un tope absoluto que acota una sesión robada. Listar y cerrar sesiones por un identificador derivado, y un tope de tres.</li>' +
    '<li>Si Redis cae, el panel falla cerrado con 503, nunca anónimo.</li>' +
    '</ul>'
});
