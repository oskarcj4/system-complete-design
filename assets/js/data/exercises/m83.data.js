SD.defineExercise('m83-auditoria', {
  title: 'la revisión antes del cierre de postulaciones',
  scenario: '<p>Antes de abrir el período de postulaciones, la coordinación pide una revisión. El sistema va detrás de Cloudflare, carga un widget de chat de un proveedor, cada oportunidad tiene cupos y el buscador de estudiantes valida el correo con una regex. Encuentras cinco cosas; decide qué hacer con cada una.</p>',
  steps: [
    { id: 'iframe', type: 'single',
      prompt: 'Las respuestas no tienen <code>frame-ancestors</code> ni <code>X-Frame-Options</code>. ¿Qué agregas?',
      options: [
        "frame-ancestors 'none' y X-Frame-Options: DENY",
        "frame-ancestors * para que el chat del proveedor funcione",
        'Un script que detecta si la página está en un iframe y se recarga',
        'Nada, porque los formularios ya llevan token CSRF'
      ],
      answer: 0,
      explain: 'El chat del proveedor se enmarca dentro de tu página, no al revés: frame-ancestors no lo afecta. Los scripts que salen del iframe se eluden con sandbox. El token CSRF viaja dentro del iframe.' },
    { id: 'cache', type: 'single',
      prompt: '<code>GET /api/perfil.php</code> responde sin <code>Cache-Control</code>. Cloudflare cachea por extensión. ¿Qué haces?',
      options: [
        'Nada, porque Cloudflare no cachea .php por defecto',
        'Agregar una regla en el panel de Cloudflare que no cachee nada bajo la ruta /api/',
        'Cache-Control: private, no-store en las respuestas personales',
        'Mover el perfil a una ruta que termine en .json'
      ],
      answer: 2,
      explain: 'Hoy no cachea .php, pero /perfil.php/x.css termina en .css. La regla de Cloudflare ayuda y se olvida en la próxima migración. La cabecera viaja con la respuesta, la mire quien la mire.' },
    { id: 'cupos', type: 'single',
      prompt: 'La postulación hace <code>SELECT cupos</code>, compara en PHP y después <code>UPDATE</code>. ¿Qué cambias?',
      options: [
        'Un SELECT … FOR UPDATE sin ninguna transacción explícita alrededor de las dos sentencias',
        'Un UPDATE condicional con cupos > 0 y UNIQUE por estudiante',
        'Un semáforo en PHP con flock sobre un archivo de bloqueo',
        'Un límite de una request por segundo por usuario'
      ],
      answer: 1,
      explain: 'FOR UPDATE sin transacción suelta el bloqueo al terminar la sentencia. flock no sirve con más de un servidor. El límite por usuario no impide que dos usuarios distintos se lleven el último cupo.' },
    { id: 'regex', type: 'single',
      prompt: 'La regex del correo es <code>^([a-z0-9]+\\.?)+@…$</code>. ¿Qué haces?',
      options: [
        'Subir pcre.backtrack_limit para que nunca devuelva false',
        'Mover la validación al frontend para no cargar el servidor',
        'Dejarla, porque PHP ya corta en un millón de pasos',
        'Largo máximo, regex sin anidar y tratar false como error'
      ],
      answer: 3,
      explain: 'Subir el límite hace más largo el ataque. El frontend se salta. PHP corta, pero si el código trata false como "no coincide" sigue adelante con la entrada sin validar.' },
    { id: 'chat', type: 'single',
      prompt: 'El widget de chat se carga con <code>&lt;script src&gt;</code> del proveedor y se actualiza solo. ¿Qué haces?',
      options: [
        'SRI con el hash del archivo que el proveedor sirve hoy',
        'Copiarlo a tu servidor, servirlo tú mismo y no volver a actualizarlo nunca más',
        'Solo en páginas públicas, no en el panel, y limitado por la CSP',
        'Nada: es un proveedor conocido'
      ],
      answer: 2,
      explain: 'SRI rompe el chat con la próxima actualización. Una copia congelada pierde los arreglos de seguridad. Lo razonable es reducir dónde corre (lejos del panel de administración) y quién lo carga.' }
  ],
  solution: '<ul><li><code>frame-ancestors \'none\'</code> y <code>X-Frame-Options: DENY</code> en <code>core/cabeceras.php</code>.</li><li><code>Cache-Control: private, no-store</code> en toda respuesta personal, y una regla en la CDN como segunda capa.</li><li><code>UPDATE … WHERE cupos &gt; 0</code> en una transacción con el <code>INSERT</code>, y <code>UNIQUE (oportunidad_id, estudiante_id)</code>.</li><li>Correo: largo máximo de 254, una regex sin cuantificadores anidados (o <code>filter_var(FILTER_VALIDATE_EMAIL)</code>), y <code>false</code> como error.</li><li>Chat: fuera del panel de administración, permitido por la CSP solo donde se usa.</li></ul>'
});
