SD.defineExercise('m74-cookie', {
  title: 'la cookie de sesión del sistema de prácticas',
  scenario: '<p>Vas a reescribir la cookie de sesión del sistema de control de prácticas. Hoy todo corre en <code>http://localhost/SistemaControlPracticas/</code>. El año que viene el frontend va a vivir en <code>https://app.practicas.edu.gt</code> y la API detrás de un proxy en <code>https://app.practicas.edu.gt/api</code>. La universidad también tiene un blog en <code>blog.practicas.edu.gt</code>, que administra otro equipo. Los estudiantes llegan al sistema desde enlaces en correos. Decide cada atributo.</p>',
  steps: [
    { id: 'nombre', type: 'single',
      prompt: '¿Cómo se llama la cookie y qué Domain lleva?',
      options: [
        '<code>sesion</code> con <code>Domain=practicas.edu.gt</code>, para que el blog también reconozca al usuario',
        '<code>__Host-sesion</code>, sin Domain y con Path=/',
        '<code>__Secure-sesion</code> con <code>Domain=app.practicas.edu.gt</code>, para fijar el host a mano',
        '<code>sesion</code> sin Domain, porque los prefijos solo funcionan con https y hoy el laboratorio es http'
      ],
      answer: 1,
      explain: 'Sin Domain la cookie es host-only, y __Host- impide que el blog (otro equipo, otro riesgo) la fije o la pise. Chrome y Firefox aceptan Secure en http://localhost, así que el prefijo funciona también en el laboratorio.' },
    { id: 'samesite', type: 'single',
      prompt: '¿Qué valor de SameSite?',
      options: [
        'Strict, porque es el más restrictivo y la sesión es lo más sensible del sistema',
        'None con Secure, para que funcione también cuando el frontend y la API estén en orígenes distintos',
        'Lax: los enlaces de los correos abren con sesión y los POST de otros sitios van sin ella',
        'Ninguno, porque Chrome ya trata la cookie como Lax por defecto'
      ],
      answer: 2,
      explain: 'Con Strict, quien llega desde un correo ve la página sin sesión. None sería para algo incrustado en otros sitios, y aquí el frontend y la API están en el mismo origen. No depender del valor por defecto: Firefox y Safari no lo aplican igual.' },
    { id: 'expires', type: 'single',
      prompt: 'La sesión dura 8 horas. ¿Qué va en <code>expires</code>?',
      options: [
        '<code>time() + 8 * 3600</code>',
        '<code>8 * 3600</code>, porque setcookie suma el tiempo actual por su cuenta',
        '<code>COOKIE_LIFETIME</code> tal cual sale del .env, para que se pueda cambiar sin tocar el código',
        'Nada: una cookie de sesión del navegador es más segura que una con vencimiento'
      ],
      answer: 0,
      explain: 'expires es un instante de Unix. 28 800 a secas es una fecha de 1970, y el string del .env tiene el mismo problema. Una cookie sin vencimiento puede durar más de lo pensado, porque los navegadores restauran sesiones; el servidor igual tiene que vencer la sesión por su cuenta.' },
    { id: 'flags', type: 'single',
      prompt: 'El .env tiene <code>COOKIE_SECURE</code> y <code>COOKIE_HTTPONLY</code>. ¿Qué haces con ellos?',
      options: [
        'Pasarlos tal cual a setcookie, porque PHP convierte "false" en false',
        'Pasarlos con (bool), para que el string se convierta bien en booleano',
        'Quitarlos del .env y poner <code>true</code> fijo: no hay entorno donde convenga apagarlos',
        'Dejarlos configurables y apagarlos en el laboratorio, porque localhost no tiene https'
      ],
      answer: 2,
      explain: 'Un string no vacío distinto de "0" es verdadero en PHP, también con (bool): "false" da true. Pero lo importante es otra cosa: Secure y HttpOnly no tienen un caso legítimo para apagarse, y localhost ya acepta Secure.' },
    { id: 'logout', type: 'single',
      prompt: '¿Qué hace el logout?',
      options: [
        'Fija la cookie con un valor vacío, sin atributos, porque al borrarla los atributos no importan',
        'Llama a session_destroy(), que también borra la cookie del navegador',
        'Responde con un JSON y el frontend borra la cookie con document.cookie',
        'Invalida la sesión en el servidor y fija la misma cookie, con el mismo Path y sin Domain, con un instante pasado'
      ],
      answer: 3,
      explain: 'El navegador identifica la cookie por nombre, Domain y Path: hay que repetirlos. Con HttpOnly, document.cookie no puede borrarla. Y borrarla del navegador no alcanza si alguien copió el valor: el servidor tiene que revocarla (M81, WEB02).' }
  ],
  solution: '<ul><li><code>__Host-sesion</code>, sin <code>Domain</code>, con <code>Path=/</code>.</li><li><code>Secure</code> y <code>HttpOnly</code> fijos en <code>true</code>, fuera del .env.</li><li><code>SameSite=Lax</code>, escrito siempre.</li><li><code>expires =&gt; time() + 8 * 3600</code>, y el servidor vence la sesión por su cuenta.</li><li>El logout revoca en el servidor y borra con los mismos atributos.</li></ul>'
});
