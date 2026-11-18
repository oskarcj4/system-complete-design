/* Decisiones guiadas de WEB00 (El laboratorio). Formato en core/exercise.js. */

SD.defineExercise('web00-laboratorio', {
  title: 'el laboratorio de la serie de seguridad web',
  scenario: '<p>Tienes el sistema de prácticas andando con XAMPP y Vite, y vas a sumar un sitio atacante y un script que mira el servidor desde afuera. Cada decisión es una de las que se toman al armar el laboratorio. Son seis.</p>',
  steps: [
    {
      id: 'host', type: 'single',
      prompt: 'El sitio atacante podría ser <code>http://localhost:8081</code> o <code>http://atacante.test</code>. ¿Por qué la guía elige el segundo?',
      options: [
        'Porque Apache de XAMPP no puede escuchar en un puerto distinto del 80 con más de un sitio.',
        'Porque el puerto no cambia el sitio, y SameSite lo trataría como el mismo sitio.',
        'Porque CORS solo se activa cuando cambia el nombre del host, y nunca cuando cambia el puerto.',
        'Porque Chrome bloquea las páginas servidas desde puertos distintos de 80 y 443 en localhost.'
      ],
      answer: 1,
      explain: 'El sitio se define por el esquema y el dominio registrable; el puerto no cuenta. Dos orígenes con distinto puerto y el mismo host son del mismo sitio, y entonces la cookie <code>SameSite</code> viajaría y el ataque no sería de otro sitio. Apache sí escucha varios puertos, CORS sí se activa con un puerto distinto (el origen lo incluye) y Chrome no bloquea puertos. Está en <a href="#excusa">la excusa</a> y en <a href="../modules/m74-origen-cookies.html">M74</a>.'
    },
    {
      id: 'vhost', type: 'single',
      prompt: 'En <code>httpd-vhosts.conf</code> pones primero un bloque para <code>localhost</code> y después el de <code>atacante.test</code>. ¿Para qué sirve el primero?',
      options: [
        'Para que Apache pueda leer el .htaccess raíz del proyecto, que no se carga sin un host virtual declarado.',
        'Para registrar el dominio localhost en el DNS del sistema y que el navegador lo resuelva.',
        'Para que localhost siga en htdocs: si ningún nombre coincide, responde el primer host virtual.',
        'Para activar mod_rewrite en los dos hosts, que en Apache 2.4 se habilita por separado en cada bloque VirtualHost.'
      ],
      answer: 2,
      explain: 'Apache elige por el nombre pedido y, si ninguno coincide, usa el primer host virtual. Sin el bloque de <code>localhost</code> al principio, <code>http://localhost</code> serviría el sitio del atacante. El .htaccess, el DNS y los módulos no dependen de ese bloque. Está en <a href="#infra-vhost">el sitio del atacante</a>.'
    },
    {
      id: 'git', type: 'single',
      prompt: 'La regla del .htaccess es <code>\\.(sql|env|log|lock|git)$</code>. ¿Qué pasa con una request a <code>/.git/config</code>?',
      options: [
        'La regla no coincide porque mira cómo termina la URL, que acaba en config, así que el archivo podría servirse.',
        'La regla coincide, porque la ruta contiene la palabra git, y Apache responde 403.',
        'La regla coincide solo si la request trae una cookie de sesión válida del usuario.',
        'La regla no se evalúa nunca, porque Apache ignora toda carpeta que empiece por punto.'
      ],
      answer: 0,
      explain: 'El <code>$</code> ancla el final: <code>/.git</code> coincide, pero <code>/.git/config</code> termina en <code>config</code>. Apache no ignora las carpetas con punto y la regla no mira cookies. Por eso la guía no da el resultado por sabido: lo mide el script. Está en <a href="#paso-verificar">el script que mira desde afuera</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: 'Alguien deja <code>COOKIE_KEY=clave_secreta_cambiar</code> en producción. ¿Qué puede hacer quien lea el repositorio?',
      options: [
        'Nada importante: la clave solo cifra la cookie y el contenido sigue siendo ilegible sin la contraseña.',
        'Descargar la base de datos entera, porque la clave de la cookie es también la de MariaDB.',
        'Fabricar una cookie firmada y válida para cualquier usuario.',
        'Leer las contraseñas, que se cifran con esa clave.'
      ],
      answer: 2,
      explain: 'La cookie no se cifra, se <em>firma</em>: <code>base64(json)|hmac</code>. Con la clave se calcula la firma de un JSON cualquiera, por ejemplo con <code>isAdmin</code> en true. No es la clave de la base ni protege contraseñas (esas usan <code>password_hash</code>). Está en <a href="#infra-env"><code>api/core/.env</code></a> y en <a href="../modules/m81-autenticacion-sesiones.html">M81</a>.'
    },
    {
      id: 'curl', type: 'single',
      prompt: 'Una prueba con <code>curl</code> contra la API devuelve JSON sin errores de CORS. ¿Qué concluyes?',
      options: [
        'Que la API ya tiene una política de CORS correcta, porque curl respeta las mismas reglas que el navegador.',
        'Que ningún navegador podrá leer la respuesta, porque curl se parece mucho al peor caso.',
        'Que CORS no se probó: curl no aplica ninguna regla del navegador.',
        'Que la cookie SameSite funciona bien, porque curl manda la cookie solo cuando la request sale desde el mismo sitio.'
      ],
      answer: 2,
      explain: 'CORS y <code>SameSite</code> los hace cumplir el navegador. <code>curl</code> envía lo que le pidas y lee lo que llegue, sin consultar ninguna política. Por eso la guía usa una página en otro sitio para lo que decide el navegador y deja <code>curl</code> para el protocolo. Está en <a href="#paso-atacante">el sitio atacante</a>.'
    },
    {
      id: 'error', type: 'single',
      prompt: 'Con la base en otro puerto, el login responde <code>Ocurrio un error</code> y no dice qué falló. ¿Qué es lo correcto hacer?',
      options: [
        'Devolver el mensaje completo de la excepción, para que el desarrollador lo vea directo en el frontend.',
        'Dejar el mensaje genérico hacia el cliente y registrar el detalle en un archivo del servidor.',
        'Quitar el try/catch de la conexión, de modo que PHP muestre su pantalla de error con todos los datos.',
        'Responder siempre 200 con un cuerpo vacío, para que nadie sepa que algo falló en el servidor.'
      ],
      answer: 1,
      explain: 'Hacia afuera, un mensaje genérico; hacia adentro, el detalle en un registro que el cliente no ve. Mostrar la excepción filtra rutas y consultas, quitar el <code>try/catch</code> muestra aún más, y un 200 vacío esconde la falla incluso a tu monitoreo. Se hace en WEB01. Está en <a href="#comprueba-fallas">fallas provocadas</a>.'
    }
  ],
  solution: '<ul><li>El atacante lleva otro host, no otro puerto; el primer host virtual es <code>localhost</code>.</li><li>La regla del .htaccess mira solo el final de la URL: se mide, no se supone.</li><li>La clave de la cookie debe ser propia y aleatoria; <code>curl</code> no prueba CORS.</li><li>Errores genéricos hacia afuera y detalle en un registro del servidor.</li></ul>'
});
