/* Decisiones guiadas de A13: el SSO con un servidor de autorización propio, un BFF y un resource server. */
SD.defineExercise('a13-oauth', {
  title: 'el single sign-on donde el token nunca toca el navegador',
  scenario: '<p>La tienda crece: dos aplicaciones y un API aparte, con una sola cuenta para todo. Tres piezas: un servidor de autorización en Cloudflare Workers que emite y firma tokens <code>ES256</code>, un BFF con Spring Cloud Gateway que es el cliente OAuth2 y guarda los tokens del lado servidor, y un API resource server que los valida sin guardar sesión. Flujo Authorization Code con PKCE, refresh rotatorio y single sign-on. Decide cómo se comporta cada pieza.</p>',
  steps: [
    {
      id: 'token-vive',
      type: 'single',
      prompt: 'En el patrón BFF, el navegador llama a <code>/api/productos</code> y recibe datos. ¿Qué credencial maneja el navegador?',
      options: [
        'El access token, guardado en <code>localStorage</code> para que el JavaScript de la SPA lo adjunte en cada llamada al API',
        'El access token y el refresh token, los dos en cookies, para poder renovar sin volver a pasar por el servidor de autorización',
        'Solo una cookie de sesión del BFF, opaca y <code>HttpOnly</code>: el token lo guarda el BFF y lo releva por dentro',
        'El id_token en una cabecera, que el API lee para saber quién es el usuario y qué permisos tiene'
      ],
      answer: 2,
      explain: 'Esa es la regla del patrón BFF: el token vive donde se puede proteger, el servidor, nunca en el navegador. El navegador solo tiene una cookie opaca; el BFF traduce esa cookie en un <code>Bearer</code> al hablar con el API. Guardar el token en <code>localStorage</code> lo pondría al alcance de un XSS. Vuelve al paso 8.'
    },
    {
      id: 'pkce',
      type: 'single',
      prompt: 'Un atacante intercepta el código de autorización en la redirección del navegador e intenta canjearlo en <code>/token</code>. ¿Por qué falla?',
      options: [
        'Porque el código viaja cifrado con la clave pública del servidor y solo el BFF, con su clave privada registrada en el alta del cliente, puede descifrarlo y usarlo',
        'Porque le falta el <code>code_verifier</code>, el secreto que el BFF generó y que nunca viajó por la URL; el servidor rehace su hash y lo compara con el <code>challenge</code>',
        'Porque el servidor detecta la IP del atacante y la bloquea antes de responder al canje del código',
        'Porque el código solo se puede canjear desde el mismo navegador que lo recibió, atado por una huella del dispositivo'
      ],
      answer: 1,
      explain: 'Eso es PKCE. El BFF mandó en <code>/authorize</code> solo el <em>hash</em> del verifier (el <code>challenge</code>); el verifier en claro aparece únicamente en el canje, de servidor a servidor. Sin él, el código interceptado no vale, y además es de un solo uso. Vuelve al paso 4.'
    },
    {
      id: 'redirect-exacta',
      type: 'single',
      prompt: 'Un cliente pide <code>/authorize</code> con <code>redirect_uri=https://app.localhost.evil.com/cb</code>, un host pegado al legítimo. ¿Qué hace el servidor?',
      options: [
        'Responde con una página de error y 400: no redirige a una uri que no coincide, carácter por carácter, con una registrada, porque enviar el código a un destino no validado sería regalárselo',
        'Redirige a esa uri con un parámetro de error, respetando el protocolo de reportar el fallo al cliente que lo pidió aunque la uri no esté registrada',
        'Acepta la uri porque comparte el prefijo <code>https://app.localhost</code> con la registrada, y el subdominio extra se considera parte del mismo sitio',
        'Emite el código igual, pero lo marca para que el resource server lo rechace más tarde si detecta que el destino era sospechoso'
      ],
      answer: 0,
      explain: 'La <code>redirect_uri</code> se compara por igualdad exacta contra la lista registrada. Un match por prefijo o por comodín de host dejaría pasar el subdominio pegado y entregaría el código al atacante. Y si la uri no se validó, no se redirige a ella ni para reportar el error. Vuelve al paso 3.'
    },
    {
      id: 'refresh-reuso',
      type: 'single',
      prompt: 'El refresh rota en cada canje. Llega a <code>/token</code> un refresh que el servidor ya había marcado como consumido. ¿Qué concluye y qué hace?',
      options: [
        'Que es un reintento normal del cliente tras un corte, así que le entrega una copia del último refresh válido de esa familia para no interrumpir la sesión',
        'Que el token simplemente venció, así que responde con un error y le pide al cliente que inicie el flujo de autorización desde el principio',
        'Que podría ser un reuso, así que lo deja pasar una vez más y solo revoca la familia si vuelve a repetirse en los siguientes minutos',
        'Que hay un robo: revoca la familia entera, así que ni ese token ni los posteriores de la familia sirven ya y el usuario tiene que entrar de nuevo'
      ],
      answer: 3,
      explain: 'Un token ya consumido que vuelve es la señal de reuso: lo tienen dos partes a la vez, el legítimo y el ladrón. El servidor revoca toda la familia, así que la copia robada sirve, como mucho, una vez, y el usuario tiene que entrar de nuevo. Vuelve al paso 6.'
    },
    {
      id: 'aud',
      type: 'single',
      prompt: 'Llega al API un JWT con firma válida de tu servidor, no vencido, pero con <code>aud</code> de otro servicio. ¿Qué pasa si el resource server valida la audiencia?',
      options: [
        'Lo acepta: la firma válida y la vigencia bastan, y el <code>aud</code> es solo informativo sobre para qué cliente se emitió originalmente el token',
        'Lo rechaza con 401: el <code>aud</code> ata el token a su destinatario, este no es <code>sso-api</code>, y así un token legítimo de otro servicio no se cuela aquí',
        'Lo acepta pero descarta los scopes, tratándolo como un token anónimo con permisos de solo lectura por precaución',
        'Lo reenvía al servidor de autorización para que decida, porque el resource server no puede resolver la audiencia por su cuenta sin introspección'
      ],
      answer: 1,
      explain: 'El <code>aud</code> es lo que ata un token a su destinatario. Sin validarlo, un token emitido para otro recurso —pero firmado por el mismo servidor— pasaría aquí. Por eso la validación suma el <code>aud</code> a la firma, el emisor y la vigencia. Vuelve al paso 10.'
    },
    {
      id: 'es256-jwks',
      type: 'single',
      prompt: 'El servidor firma con <code>ES256</code> (asimétrico) y publica un JWKS, en vez de usar <code>HS256</code> con un secreto compartido con el API. ¿Qué gana?',
      options: [
        'Que el API verifica con la clave pública y nunca tiene un secreto capaz de firmar, así que filtrarle una clave no permitiría emitir tokens a nombre del servidor',
        'Que los tokens ocupan menos y viajan más rápido, porque la firma elíptica es más corta que cualquier esquema basado en un secreto simétrico compartido',
        'Que ya no hace falta validar la vigencia del token, porque la firma asimétrica incluye por diseño un vencimiento que el verificador comprueba solo',
        'Que el servidor puede rotar la clave sin avisar a nadie, porque con firma asimétrica los tokens viejos siguen siendo válidos para siempre sin necesidad de un JWKS'
      ],
      answer: 0,
      explain: 'Con firma asimétrica, el resource server solo tiene la clave pública: verifica, pero no podría firmar un token. Con un secreto compartido, ese secreto en el API también sirve para emitir. El <code>kid</code> en cada token y las tres claves del JWKS permiten rotar sin cortar los tokens vivos. Vuelve al paso 2.'
    },
    {
      id: 'scope',
      type: 'single',
      prompt: 'beto tiene el scope <code>productos.read</code> pero no <code>productos.write</code>. Entra en la SPA e intenta agregar un producto. ¿Qué ocurre?',
      options: [
        'La SPA le oculta el botón de agregar, y como no puede ni intentarlo, la cuestión de los permisos del token nunca llega a plantearse en el API',
        'El BFF revisa los scopes de la sesión antes de relevar la llamada y la corta él mismo, sin molestar al resource server con una petición que sabe que fallará',
        'El API responde 403: el scope del token, no la interfaz, es quien decide, y el token de beto no incluye <code>productos.write</code> aunque vea el botón',
        'El servidor de autorización emite un token nuevo con el scope elevado automáticamente, confiando en que la SPA no mostraría el botón a quien no debe'
      ],
      answer: 2,
      explain: 'Quien decide es el <em>scope</em> dentro del token, en el resource server, no la interfaz. La SPA es la misma para los dos usuarios; el token de beto no trae <code>productos.write</code>, así que el API responde 403. Fiarse de que la interfaz "esconde" el botón no es autorización. Vuelve al paso 10.'
    },
    {
      id: 'logout',
      type: 'single',
      prompt: 'ana pulsa "Salir", vuelve a la pantalla de entrar y luego reabre la app. Se le pide la contraseña otra vez. ¿Por qué no entró directo?',
      options: [
        'Porque la cookie del BFF tenía <code>Max-Age=0</code> y el navegador la borró, pero la sesión del servidor de autorización seguiría abierta un rato más por su cuenta',
        'Porque el logout encadenó: cerró la sesión del BFF y también la del SSO en el servidor, y sin esa sesión el servidor ya no la reconoce sin la contraseña',
        'Porque cada login genera un par PKCE nuevo y el anterior ya no sirve, lo que obliga a reautenticarse aunque la sesión del SSO siguiera viva',
        'Porque el access token había vencido a los cinco minutos y sin él el BFF no puede reconstruir la sesión del navegador'
      ],
      answer: 1,
      explain: 'Cerrar solo el BFF dejaría viva la sesión del SSO, y la siguiente app entraría sin pedir nada. Por eso el logout redirige al <code>/logout</code> del servidor para cerrar también el SSO. Si no, habrías reentrado sin escribir la contraseña. Vuelve al paso 11.'
    }
  ],
  solution: '<p>El hilo de A13: el token vive donde se puede proteger —el servidor—, nunca en el navegador, que solo tiene una cookie opaca. PKCE ata el canje del código a un secreto que no viajó; la <code>redirect_uri</code> exacta cierra el robo del código; el refresh rotatorio delata el reuso revocando la familia. El resource server valida firma, emisor, vigencia, audiencia y scope, y es el scope del token —no la interfaz— quien autoriza. Y el single sign-on nace de una sola sesión en el servidor, que el logout tiene que cerrar junto con la del BFF.</p>'
});
