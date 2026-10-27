SD.defineQuiz('m74', {
  title: 'Quiz: origen, sitio y cookies', pass: 0.7,
  questions: [
    { id: 'origen', type: 'single',
      prompt: '¿Cuál de estas URL es del mismo origen que <code>http://localhost/SistemaControlPracticas/</code>?',
      options: [
        '<code>http://127.0.0.1/SistemaControlPracticas/</code>, porque llega al mismo Apache de la misma máquina',
        '<code>http://localhost:8080/SistemaControlPracticas/</code>, porque el host es el mismo',
        '<code>http://localhost/SistemaControlPracticas/api/endpoints/roles.php</code>',
        '<code>https://localhost/SistemaControlPracticas/</code>, porque el host y la ruta coinciden'
      ],
      answer: 2,
      explain: 'El origen es esquema, host y puerto; la ruta no cuenta. 127.0.0.1 es otro host para el navegador aunque sea la misma máquina, 8080 es otro puerto y https es otro esquema (y otro puerto por defecto). Repasa 74.1.' },
    { id: 'sitio', type: 'single',
      prompt: '<code>https://ana.github.io</code> y <code>https://beto.github.io</code>, ¿son el mismo sitio?',
      options: [
        'Sí: los dos terminan en github.io, que es su dominio registrable común',
        'No: github.io es un sufijo público, así que cada usuario es un sitio',
        'Sí, pero solo si los dos usan https; con http serían sitios distintos',
        'Depende del navegador que se use'
      ],
      answer: 1,
      explain: 'El sitio es el sufijo público más una etiqueta. Como github.io es un sufijo público, el dominio registrable es ana.github.io y beto.github.io por separado. Así una cookie de un usuario no llega al otro. Repasa 74.2.' },
    { id: 'puerto', type: 'single',
      prompt: 'Tu sistema corre en <code>http://localhost</code> y un sitio de prueba en <code>http://localhost:8080</code>. Una cookie con <code>SameSite=Strict</code>, ¿viaja en un <code>POST</code> del sitio de prueba hacia tu API?',
      options: [
        'No, porque el puerto distinto hace que las dos sean sitios distintos para SameSite',
        'No: Strict bloquea todo POST',
        'Sí: son orígenes distintos, pero el puerto no cuenta para el sitio',
        'Sí, porque en localhost el navegador desactiva SameSite para facilitar el desarrollo'
      ],
      answer: 2,
      explain: 'SameSite mira el sitio, y el puerto no forma parte del sitio. Otra aplicación en otro puerto de tu máquina es "de la casa" para las cookies. Por eso el laboratorio usa otro nombre de host para el sitio atacante. Repasa 74.2 y el simulador de 74.6.' },
    { id: 'sop', type: 'single',
      prompt: 'Una página de otro sitio hace <code>fetch</code> con un <code>POST</code> a tu API y la consola dice que CORS lo bloqueó. ¿Qué pasó en tu servidor?',
      options: [
        'Nada: la request nunca salió',
        'La recibió y la ejecutó; el navegador solo escondió la respuesta',
        'Recibió la request, pero PHP la descartó al ver un Origin distinto del suyo',
        'La recibió solo si la cookie tenía SameSite=None, y si no, la rechazó con un 403'
      ],
      answer: 1,
      explain: 'La Same-Origin Policy bloquea leer, no enviar. Una request simple sale, llega y se ejecuta; si cambia datos, el cambio ya ocurrió. PHP no mira Origin salvo que tú lo programes. Repasa 74.3.' },
    { id: 'lax', type: 'multi',
      prompt: 'Una cookie de sesión tiene <code>SameSite=Lax</code>. ¿En qué requests que salen de <b>otro sitio</b> viaja? Marca todas.',
      options: [
        'Un enlace que la persona sigue y abre tu página con GET',
        'Un formulario que hace POST a tu endpoint de postulaciones',
        'Un fetch desde el JavaScript de la otra página',
        'Una etiqueta img que apunta a una URL de tu API',
        'Un iframe que carga una página de tu sistema dentro de la otra página'
      ],
      answer: [0],
      explain: 'Lax solo viaja desde otro sitio en una navegación de nivel superior con método seguro. El POST, el fetch, la imagen y el iframe van sin la cookie. Por eso un GET nunca debe cambiar datos. Repasa 74.6.' },
    { id: 'domain', type: 'single',
      prompt: 'Un equipo pone <code>Domain=practicas.edu.gt</code> en la cookie de sesión "para que sea más segura". ¿Qué consigue?',
      options: [
        'La limita al dominio principal y evita que la reciban los subdominios',
        'Nada: Domain solo cambia lo que se muestra en DevTools, no a quién llega la cookie',
        'La hace viajar a todos los subdominios, también a los que estén comprometidos',
        'Obliga a que la cookie solo viaje por https dentro de ese dominio'
      ],
      answer: 2,
      explain: 'Domain agranda el alcance. Sin él, la cookie es host-only. Con él, llega a api., blog. y a cualquier subdominio que exista mañana. Para una sesión, lo correcto es omitirlo. Repasa 74.5.' },
    { id: 'host', type: 'single',
      prompt: '¿Qué exige el navegador a una cookie llamada <code>__Host-sesion</code>?',
      options: [
        'Que tenga HttpOnly y SameSite=Strict, sin importar el resto de los atributos',
        'Que la fije el dominio principal del sitio y no un subdominio',
        'Secure desde https, Path=/ y ningún atributo Domain',
        'Que el servidor la firme con HMAC antes de mandarla en el Set-Cookie'
      ],
      answer: 2,
      explain: '__Host- exige Secure, Path=/ y prohíbe Domain: queda atada a un solo host y ningún subdominio puede fijarla ni pisarla. No dice nada de HttpOnly, SameSite ni de cómo se genera el valor. Repasa 74.7.' },
    { id: 'expires', type: 'single',
      prompt: 'Un login hace <code>setcookie(COOKIE_NAME, $v, [\'expires\' =&gt; 3600, …])</code>. ¿Qué pasa?',
      options: [
        'Dura una hora desde el login',
        'Llega vencida: expires es un instante, y 3600 cae en 1970',
        'PHP lanza un error porque expires exige un objeto DateTime',
        'El navegador la convierte en cookie de sesión porque el valor es demasiado chico'
      ],
      answer: 1,
      explain: 'expires espera un timestamp de Unix. 3600 es el 1 de enero de 1970 a la una: el navegador borra la cookie al recibirla. La forma correcta es time() + 3600. Repasa 74.10.' },
    { id: 'storage', type: 'single',
      prompt: 'Un script inyectado corre en tu página. La sesión está en una cookie <code>HttpOnly</code>. ¿Qué puede hacer?',
      options: [
        'Nada con la sesión: HttpOnly la protege de cualquier script que corra en la página',
        'Leerla con document.cookie',
        'No la lee, pero sus requests a la API la llevan igual',
        'Leerla desde localStorage, donde el navegador guarda una copia de las cookies HttpOnly'
      ],
      answer: 2,
      explain: 'HttpOnly impide leer la cookie, así que no se la lleva a otra máquina. Pero el script corre con los permisos de la página y sus requests llevan la cookie. Contra eso sirven las defensas de XSS (M77, M78). Repasa 74.9.' },
    { id: 'logout', type: 'single',
      prompt: 'El logout fija la cookie de sesión con un instante pasado, pero la sesión sigue en el navegador. ¿Cuál es la causa más probable?',
      options: [
        'La de borrado tiene otro Path o Domain: es otra cookie',
        'Los navegadores ignoran las fechas pasadas y esperan al vencimiento original',
        'Falta llamar a session_destroy(), que es lo único que borra cookies del navegador',
        'La cookie de borrado no tenía HttpOnly, y el navegador no deja que una cookie sin él reemplace a una HttpOnly'
      ],
      answer: 0,
      explain: 'Una cookie se identifica por nombre, Domain y Path. Para borrarla hay que repetirlos. session_destroy() limpia los datos de la sesión de PHP en el servidor, no la cookie del navegador. Repasa 74.10.' }
  ]
});
