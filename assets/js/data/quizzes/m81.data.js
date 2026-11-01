SD.defineQuiz('m81', {
  title: 'Quiz: Autenticación y sesiones', pass: 0.7,
  questions: [
    { id: 'firmada', type: 'single',
      prompt: '¿Qué pierde una sesión firmada, como la cookie del sistema, frente a una sesión con estado?',
      options: [
        'La integridad: un usuario puede cambiar su rol editando el JSON',
        'La posibilidad de retirarla antes de que venza',
        'La confidencialidad, porque el HMAC deja leer la clave',
        'La compatibilidad con SameSite y con HttpOnly'
      ],
      answer: 1,
      explain: 'El HMAC impide cambiar el JSON, y la cookie lleva HttpOnly y SameSite igual. Lo que no hay es una fila que borrar: la cookie vale hasta exp. Repasa 81.1 y 81.3.' },
    { id: 'payload', type: 'single',
      prompt: '¿Puede leer cualquiera el contenido de la cookie del sistema si la obtiene?',
      options: [
        'No, porque el HMAC-SHA256 cifra el JSON con COOKIE_KEY',
        'No, porque base64 estricto solo se decodifica en el servidor',
        'Sí: está firmada, no cifrada, y por eso no lleva secretos',
        'Solo si además conoce la IP que quedó guardada en el payload'
      ],
      answer: 2,
      explain: 'Base64 es una codificación, no un cifrado, y un HMAC autentica sin ocultar. Repasa 81.2.' },
    { id: 'ip', type: 'single',
      prompt: 'La cookie se firmó con la IP <code>10.0.0.1</code>. ¿Qué pasa si llega una request desde <code>10.0.0.12</code>?',
      options: [
        'Pasa, porque strpos solo comprueba que la IP empiece igual',
        'Se rechaza, porque strpos compara las dos cadenas completas',
        'Se rechaza, porque REMOTE_ADDR incluye también el puerto',
        'Pasa solo si las dos IP están en la misma subred /24'
      ],
      answer: 0,
      explain: 'strpos(..., ...) === 0 pregunta si la cadena empieza con la otra. La comparación exacta es hash_equals o ===. Repasa 81.2.' },
    { id: 'version', type: 'single',
      prompt: '¿Qué hace que el logout invalide también una copia robada de la cookie?',
      options: [
        'Mandar Set-Cookie con Max-Age=0 al navegador de Ana',
        'Rotar COOKIE_KEY cada vez que un usuario cierra sesión',
        'Bajar COOKIE_LIFETIME a cinco minutos para todas las sesiones',
        'Subir version_sesion en la base y compararla en checkAuth'
      ],
      answer: 3,
      explain: 'Max-Age=0 solo borra la cookie de ese navegador. Rotar la clave cierra las sesiones de todos. Una vida corta reduce la ventana pero no revoca. Repasa 81.3.' },
    { id: 'fijacion', type: 'single',
      prompt: '¿En qué momento se llama a <code>session_regenerate_id(true)</code>?',
      options: [
        'En cada request, para que el id cambie todo el tiempo',
        'Justo después de verificar la contraseña en el login',
        'Al cerrar sesión, para que el id viejo no sirva más',
        'Al abrir la página de login, antes del formulario'
      ],
      answer: 1,
      explain: 'La sesión se vuelve valiosa al autenticarse: ahí el id que el atacante plantó tiene que dejar de servir. Repasa 81.4.' },
    { id: 'nist', type: 'multi',
      prompt: '¿Qué pide NIST SP 800-63B para las contraseñas? Marca todas.',
      options: [
        'Rechazar las que aparecen en listas de contraseñas filtradas',
        'Exigir mayúsculas, números y símbolos en cada contraseña',
        'Permitir pegar, para que funcionen los gestores',
        'Obligar a cambiarlas cada 90 días'
      ],
      answer: [0, 2],
      explain: 'NIST pide largo, lista de filtradas y permitir pegar; desaconseja las reglas de composición y la rotación periódica sin evidencia de filtración. Repasa 81.5.' },
    { id: 'tiempo', type: 'single',
      prompt: 'El login responde "usuario o contraseña incorrectos" en los dos casos. ¿Cómo se enumeran usuarios igual?',
      options: [
        'Por el código HTTP, que es 404 si el usuario no existe',
        'Por la cookie, que el servidor emite aunque falle la contraseña',
        'Por el tiempo: password_verify solo corre si el usuario existe',
        'Por el largo del mensaje, que cambia según el idioma del usuario'
      ],
      answer: 2,
      explain: 'password_verify es lenta a propósito; la diferencia se mide desde afuera. Se arregla con un hash de relleno. Repasa 81.6.' },
    { id: 'stuffing', type: 'single',
      prompt: '¿Por qué un límite de 10 intentos por cuenta no frena el credential stuffing?',
      options: [
        'Porque el ataque usa SQL injection y no pasa por el formulario',
        'Porque los atacantes rotan la cookie de sesión en cada intento',
        'Porque el límite por cuenta solo cuenta los intentos con éxito',
        'Porque el ataque prueba un solo par por cuenta, desde muchas IPs'
      ],
      answer: 3,
      explain: 'Cada cuenta recibe uno o dos intentos; ningún contador por cuenta se dispara. Lo frenan MFA, la lista de filtradas y la detección. Repasa 81.7.' },
    { id: 'bloqueo', type: 'single',
      prompt: '¿Qué riesgo tiene bloquear una cuenta de forma permanente tras 10 fallos?',
      options: [
        'Que cualquiera puede bloquear la cuenta de otro a propósito',
        'Que el atacante aprende la contraseña por el mensaje de bloqueo',
        'Que la base crece sin límite con la tabla de intentos',
        'Que el bloqueo no se aplica a las cookies firmadas'
      ],
      answer: 0,
      explain: 'Es una denegación de servicio gratis. Mejor un retardo creciente y un 429 que expira. Repasa 81.7.' },
    { id: 'passkey', type: 'single',
      prompt: '¿Por qué una passkey resiste el phishing y un código TOTP no?',
      options: [
        'Porque la passkey usa un código de 8 dígitos en lugar de 6',
        'Porque el navegador firma el origen real dentro de la respuesta',
        'Porque el servidor guarda la clave privada de la passkey cifrada',
        'Porque TOTP viaja por SMS y la passkey viaja por HTTPS'
      ],
      answer: 1,
      explain: 'Con TOTP la persona decide a qué sitio le da el código. En WebAuthn el origen va firmado y un sitio falso recibe una firma que no sirve. La privada nunca sale del dispositivo. Repasa 81.8.' },
    { id: 'reset', type: 'single',
      prompt: '¿Por qué el enlace de restablecimiento no se arma con <code>$_SERVER[\'HTTP_HOST\']</code>?',
      options: [
        'Porque HTTP_HOST no incluye el esquema https de la URL',
        'Porque el atacante elige Host y recibe el token de la víctima',
        'Porque HTTP_HOST cambia entre el balanceador y PHP',
        'Porque el token queda guardado en el log de accesos'
      ],
      answer: 1,
      explain: 'Es password reset poisoning: el correo legítimo lleva un enlace al dominio del atacante. La URL sale de la configuración. Repasa 81.9.' }
  ]
});
