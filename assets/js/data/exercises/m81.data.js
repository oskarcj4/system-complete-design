SD.defineExercise('m81-login', {
  title: 'el login del cierre de postulaciones',
  scenario: '<p>El último día de postulaciones, el log muestra 40&#8239;000 intentos de login fallidos en una hora, desde 1&#8239;800 IPs distintas, contra 3&#8239;200 cuentas: uno o dos intentos por cuenta. Unas 25 cuentas entraron. El sistema usa la cookie firmada de 81.2, sin <code>version_sesion</code>, sin MFA y sin límite de intentos. Decide qué hacer.</p>',
  steps: [
    { id: 'que', type: 'single',
      prompt: '¿Qué ataque es?',
      options: [
        'Fuerza bruta contra pocas cuentas, porque son 40 000 intentos',
        'Credential stuffing: pares filtrados, uno o dos por cuenta',
        'Una denegación de servicio que busca tumbar el login',
        'Enumeración de usuarios por los tiempos de respuesta del login'
      ],
      answer: 1,
      explain: 'Muchas cuentas, uno o dos intentos cada una, muchas IPs y aciertos sin probar muchas contraseñas: son credenciales reutilizadas de otra filtración.' },
    { id: 'ya', type: 'single',
      prompt: 'Las 25 cuentas comprometidas tienen cookies válidas por 8 horas. ¿Qué haces primero?',
      options: [
        'Rotar COOKIE_KEY: se cierran todas las sesiones',
        'Pedir a esas 25 personas que cierren sesión desde su navegador',
        'Esperar a que venzan solas, porque 8 horas es una ventana corta para un atacante',
        'Bloquear sus cuentas con estado_cuenta y revisar qué hicieron'
      ],
      answer: 0,
      explain: 'Sin version_sesion, la única forma de invalidar una cookie firmada antes de exp es cambiar la clave: cierra todas las sesiones, un costo aceptable en un incidente. Su logout no toca la copia del atacante, y hoy checkAuth no lee estado_cuenta. Después, restablecer las 25 contraseñas.' },
    { id: 'limite', type: 'single',
      prompt: '¿Qué límite de intentos ayuda más contra este patrón?',
      options: [
        'Por cuenta, 10 intentos en 15 minutos',
        'Global, un máximo de intentos por minuto para todo el login',
        'Por IP y por subred, y un aviso por fallos totales',
        'Bloqueo permanente de la cuenta al tercer fallo'
      ],
      answer: 2,
      explain: 'Por cuenta no se dispara con uno o dos intentos. Un tope global bloquea también a los estudiantes reales el día del cierre. El bloqueo permanente es una DoS. El límite por IP sube el costo y la alerta lo hace visible; no lo detiene solo.' },
    { id: 'raiz', type: 'single',
      prompt: '¿Qué cambio quita el valor de las contraseñas filtradas?',
      options: [
        'Exigir mayúsculas, números y símbolos a partir de hoy',
        'Obligar a todos a cambiar la contraseña cada 90 días',
        'Subir el costo de Argon2id para que cada intento tarde más',
        'MFA, y rechazar contraseñas que aparecen en filtraciones'
      ],
      answer: 3,
      explain: 'Las reglas de composición y la rotación no cambian que la contraseña sea la misma de otro sitio. Un hash más lento no frena intentos en línea. Con MFA la contraseña sola no alcanza; con la lista de filtradas, la reutilizada no se acepta.' },
    { id: 'despues', type: 'single',
      prompt: '¿Qué agregas para la próxima vez?',
      options: [
        'version_sesion y una regla de detección',
        'Un CAPTCHA permanente en el login para todos los usuarios',
        'Ocultar el formulario de login detrás de una URL secreta',
        'Atar la cookie a la IP del login con una comparación exacta'
      ],
      answer: 0,
      explain: 'Revocar solo las 25 sesiones sin cerrar las de todos, y enterarse en minutos y no al día siguiente. El CAPTCHA permanente castiga a todos y se resuelve con servicios pagos; la URL secreta no es un control; la IP cambia en el celular.' }
  ],
  solution: '<ul><li>Es credential stuffing: uno o dos intentos por cuenta desde 1&#8239;800 IPs.</li><li>Ahora: rotar <code>COOKIE_KEY</code> (cierra todas las sesiones), restablecer las 25 contraseñas y revisar qué hizo cada cuenta.</li><li>Límite por IP y por subred con 429, más una alerta por fallos totales (M59).</li><li>MFA (obligatorio para administradores) y rechazo de contraseñas filtradas con k-anonimato.</li><li><code>version_sesion</code> en la cookie y en la base, para la próxima revocación sin cerrar a todos.</li></ul>'
});
