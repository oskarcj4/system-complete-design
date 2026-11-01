SD.defineExercise('m78-politica', {
  title: 'las cabeceras del sistema de prácticas',
  scenario: '<p>El sistema tiene dos partes: la API en PHP, que solo responde JSON, y una SPA de Vite que Apache sirve como archivos estáticos. La SPA carga Chart.js desde <code>cdn.jsdelivr.net</code> y tiene un script inline de arranque. Hoy ninguna respuesta lleva cabeceras de seguridad. Decide cada una.</p>',
  steps: [
    { id: 'api', type: 'single',
      prompt: '¿Qué CSP lleva la API?',
      options: [
        "<code>default-src 'none'; frame-ancestors 'none'</code>: no carga nada",
        "La misma que la SPA, para tener una sola política que mantener",
        "Ninguna, porque una API que devuelve JSON no ejecuta scripts",
        "<code>script-src 'self'</code>, por si algún día sirve una página"
      ],
      answer: 0,
      explain: 'La API no carga nada ni se enmarca: su política es nada. Si alguien abre un JSON en el navegador, no corre nada. Ninguna política deja ese caso sin límite.' },
    { id: 'chart', type: 'single',
      prompt: '¿Qué haces con Chart.js del CDN?',
      options: [
        'Permitir https://cdn.jsdelivr.net en script-src, porque es un CDN conocido',
        'Empaquetarlo con Vite, o cargarlo con SRI desde tu propio script',
        'Agregar unsafe-inline, porque Chart.js crea estilos en línea',
        'Permitir https: en script-src para cualquier CDN con HTTPS'
      ],
      answer: 1,
      explain: 'Permitir el CDN permite cualquier paquete que sirva, con gadgets. Empaquetarlo con Vite lo deja en tu origen. SRI fija el archivo exacto (M83). https: permite cualquier sitio.' },
    { id: 'inline', type: 'single',
      prompt: '¿Y el script inline de arranque de la SPA?',
      options: [
        "Permitirlo con 'unsafe-inline', porque es un solo script",
        'Un nonce fijo escrito en el index.html en cada build',
        'Moverlo a un archivo, o permitirlo con su hash SHA-256',
        "Dejar la CSP sin script-src, para que default-src 'self' lo cubra"
      ],
      answer: 2,
      explain: "unsafe-inline permite cualquier inline, también el inyectado. Un nonce fijo no protege. default-src 'self' no permite inline. El hash permite solo ese contenido exacto." },
    { id: 'rollout', type: 'single',
      prompt: '¿Cómo la activas?',
      options: [
        'En bloqueo desde el primer día, y arreglar lo que se rompa',
        'En una etiqueta meta, para no tocar la configuración de Apache',
        'Solo en desarrollo, contra vite dev, que es donde se nota',
        'En Report-Only con un endpoint de reportes, y luego bloquear'
      ],
      answer: 3,
      explain: 'Report-Only muestra lo que se rompería sin romperlo. meta no admite report-only ni frame-ancestors, y vite dev inyecta inline que el build no tiene.' },
    { id: 'coep', type: 'single',
      prompt: '¿Activas COEP require-corp en la SPA?',
      options: [
        'No: no usas SharedArrayBuffer y rompería recursos sin CORP',
        'Sí, porque sin COEP la página no tiene ningún aislamiento',
        'Sí, porque es la defensa contra el clickjacking del panel',
        'Solo en la API, que es donde están todos los datos personales'
      ],
      answer: 0,
      explain: 'COEP sirve para obtener crossOriginIsolated, y rompe recursos de otro origen sin CORP. COOP same-origin ya separa las ventanas. El clickjacking lo frena frame-ancestors.' }
  ],
  solution: '<ul><li>API: <code>Content-Type: application/json</code>, <code>nosniff</code>, <code>default-src \'none\'; frame-ancestors \'none\'</code>, CORP <code>same-site</code>, <code>Referrer-Policy: no-referrer</code> y <code>Cache-Control: no-store</code>.</li><li>SPA: Chart.js empaquetado por Vite; el script de arranque en un archivo o con hash; <code>script-src</code> estricta, <code>object-src \'none\'</code>, <code>base-uri \'none\'</code>, <code>frame-ancestors \'none\'</code> y <code>connect-src</code> con la URL de la API.</li><li>Apache: HSTS, <code>nosniff</code>, Referrer-Policy, Permissions-Policy y COOP <code>same-origin</code>.</li><li>Primero en Report-Only con <code>csp-report.php</code>, después en bloqueo.</li></ul>'
});
