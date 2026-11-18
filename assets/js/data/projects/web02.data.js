/* Decisiones guiadas de WEB02 (Sesión y login seguros). Formato en core/exercise.js. */

SD.defineExercise('web02-sesion', {
  title: 'una sesión que se puede revocar',
  scenario: '<p>La cookie del sistema es <code>base64(json)|hmac</code> y el servidor no guarda nada de ella. Una estudiante dejó la sesión abierta en el laboratorio, alguien prueba contraseñas contra <code>login.php</code> y la respuesta tarda distinto según exista la cuenta. Son seis decisiones.</p>',
  steps: [
    {
      id: 'firma', type: 'single',
      prompt: 'La estudiante cambia su contraseña. Con el código de antes de esta guía, ¿qué pasa con la cookie del laboratorio?',
      options: [
        'Deja de valer, porque la firma HMAC se calcula con el hash de la contraseña del usuario.',
        'Sigue valiendo hasta su exp, porque la firma usa COOKIE_KEY y esa clave no cambió con la contraseña.',
        'Deja de valer en la siguiente request, porque refrescarAuthDesdeBD vuelve a verificar la contraseña.',
        'Sigue valiendo solo si el laboratorio tiene la misma IP que la casa de la estudiante.'
      ],
      answer: 1,
      explain: 'La firma depende del contenido y de <code>COOKIE_KEY</code>; la contraseña no entra en ninguno de los dos. <code>refrescarAuthDesdeBD</code> relee roles y estado, no la contraseña, y la IP del laboratorio es la del laboratorio. Está en <a href="#excusa">la excusa</a>.'
    },
    {
      id: 'version', type: 'single',
      prompt: '¿Por qué la versión de sesión se compara en <code>refrescarAuthDesdeBD</code> y no en otro lugar?',
      options: [
        'Porque es la única función que se ejecuta antes de validar la firma de la cookie, y así se ahorra el cálculo del HMAC.',
        'Porque es donde vive la conexión a la base con permisos de escritura sobre usuarios.',
        'Porque ya lee la fila del usuario en cada request: comparar la versión no agrega consultas.',
        'Porque el frontend la llama de forma explícita cada vez que cambia de pantalla en la SPA.'
      ],
      answer: 2,
      explain: 'La consulta de roles y estado ya existe y corre en cada request autenticada; sumar una columna sale gratis. La firma se valida antes, en <code>checkAuth</code>, y el frontend no llama a esa función. Está en <a href="#paso-checkauth">el paso 2</a>.'
    },
    {
      id: 'bloqueo', type: 'single',
      prompt: 'El límite por cuenta podría bloquear la cuenta hasta que la desbloquee un administrador. ¿Por qué la guía usa una ventana de 15 minutos?',
      options: [
        'Porque un bloqueo permanente deja a cualquiera sin acceso con solo conocer su usuario.',
        'Porque MariaDB no permite borrar renglones de una tabla con un índice por fecha.',
        'Porque 15 minutos es lo que exige la norma de contraseñas de la facultad para estudiantes.',
        'Porque el frontend no tiene una pantalla para que el administrador desbloquee cuentas, y no se quiere crear.'
      ],
      answer: 0,
      explain: 'Un bloqueo que hay que levantar a mano convierte el límite en un ataque de denegación de servicio contra una persona. La ventana frena la fuerza bruta y se levanta sola. MariaDB borra sin problema y no hay norma de por medio. Está en <a href="#paso-throttle">el paso 3</a>.'
    },
    {
      id: 'orden', type: 'single',
      prompt: '¿Qué hace la línea <code>password_verify($contrasena, $hash) &amp;&amp; $result !== false</code> que no hace <code>$result !== false &amp;&amp; password_verify(...)</code>?',
      options: [
        'Nada: PHP evalúa las dos partes siempre y el resultado es el mismo en los dos órdenes.',
        'Verifica primero, así que password_verify corre también cuando la cuenta no existe.',
        'Evita un warning de PHP cuando $hash es null, porque password_verify no acepta null.',
        'Hace que el login sea más rápido para las cuentas que existen, que son las que importan.'
      ],
      answer: 1,
      explain: 'PHP corta en el primer falso. Con la cuenta inexistente primero, <code>password_verify</code> no corre y la respuesta sale antes: eso es lo que se mide para enumerar cuentas. <code>$hash</code> nunca es null aquí, porque cae al de relleno. Está en <a href="#paso-login">el paso 4</a> y en <a href="#comprueba-fallas">la falla 2</a>.'
    },
    {
      id: 'ip', type: 'single',
      prompt: 'La comparación vieja era <code>strpos($_SERVER[\'REMOTE_ADDR\'], $data[\'ip\']) === 0</code>. ¿Cuál de estas cookies aceptaba sin deber hacerlo?',
      options: [
        'Una emitida para ::1 y usada desde 127.0.0.1, porque las dos son direcciones de loopback.',
        'Una emitida para 127.0.0.1 y usada desde 127.0.0.10, otra IP que empieza igual.',
        'Una emitida para 10.0.0.5 y usada desde 10.0.0.4, porque comparten los tres primeros octetos.',
        'Ninguna: strpos compara la cadena completa cuando la posición esperada es cero.'
      ],
      answer: 1,
      explain: '<code>strpos</code> busca una subcadena: <code>127.0.0.1</code> está al principio de <code>127.0.0.10</code>. Con <code>::1</code> contra <code>127.0.0.1</code> no hay coincidencia, y <code>10.0.0.4</code> no contiene <code>10.0.0.5</code>. Está en <a href="#paso-checkauth">el paso 2</a> y lo prueba <a href="#comprueba-pruebas">sesion_test.php</a>.'
    },
    {
      id: 'token', type: 'single',
      prompt: 'Después del cambio de contraseña, la pestaña que lo hizo intenta postularse sin recargar. ¿Por qué funciona?',
      options: [
        'Porque requireCsrfToken acepta el token viejo durante un minuto después de un cambio de cookie.',
        'Porque el cambio de contraseña desactiva la comprobación CSRF hasta la siguiente vez que se entra.',
        'Porque la respuesta del cambio trae un csrfToken nuevo, calculado sobre la cookie nueva, y apiFetch lo guarda.',
        'Porque el token CSRF se calcula con el id del usuario, que no cambia al cambiar la contraseña.'
      ],
      answer: 2,
      explain: 'El token es el HMAC de la cookie, y la cookie cambió; el viejo ya no coincide. <code>apiFetch</code> guarda el <code>csrfToken</code> de cualquier respuesta, y <code>changePassword</code> lo devuelve. No hay período de gracia ni se desactiva nada. Está en <a href="#paso-cambio">el paso 5</a>.'
    }
  ],
  solution: '<ul><li>La cookie lleva <code>v</code>; la base, <code>version_sesion</code>. Si no coinciden, 401.</li><li>Cambiar la contraseña sube la versión en el mismo <code>UPDATE</code> y reemite la cookie de quien la cambió, con su <code>csrfToken</code>.</li><li>5 fallos por cuenta y 20 por IP en 15 minutos; después, 429 con <code>Retry-After</code>.</li><li><code>password_verify</code> corre siempre, contra el hash real o el de relleno; la IP se compara entera.</li></ul>'
});
