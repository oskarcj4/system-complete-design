SD.defineExercise('m85-validador', {
  title: 'un validador de CVs en WebAssembly',
  scenario: '<p>Para que los estudiantes no suban PDFs rotos, el equipo quiere validar el CV en el navegador con una librería de PDF escrita en C y compilada a Wasm, y usar la misma librería en el servidor. Revisas cinco decisiones.</p>',
  steps: [
    { id: 'donde', type: 'single',
      prompt: 'Como el navegador ya valida con Wasm, el borrador quita la validación de <code>subir_cv.php</code>. ¿Qué dices?',
      options: [
        'Está bien: el módulo corre en un sandbox y no se puede saltar',
        'Está bien si el .wasm se firma con SRI y una CSP estricta',
        'Que la validación del navegador sea la única, pero con un hash',
        'La del navegador es comodidad; la del servidor (M82) se queda'
      ],
      answer: 3,
      explain: 'El sandbox protege a la página del módulo, no al servidor del usuario: el usuario manda el POST que quiera. SRI asegura qué módulo corre, no que corra.' },
    { id: 'cve', type: 'single',
      prompt: 'La versión de la librería de PDF tiene un CVE de desbordamiento de buffer. ¿Importa en Wasm?',
      options: [
        'Sí: dentro de la memoria lineal el desbordamiento sigue pasando',
        'No: Wasm comprueba cada acceso y un desbordamiento da un trap',
        'Solo si el módulo exporta su memoria lineal al JavaScript de la página',
        'Solo en el servidor, nunca en el navegador'
      ],
      answer: 0,
      explain: 'El trap llega al final de la memoria, no al final del buffer. La falla puede pisar datos del propio módulo, como el resultado de la validación.' },
    { id: 'imports', type: 'single',
      prompt: 'El módulo compilado pide los imports <code>log</code>, <code>fetch_url</code> y <code>run_script</code>. ¿Qué das?',
      options: [
        'Los tres, porque el binario viene de una librería de PDF conocida',
        'Solo log; fetch_url y run_script no hacen falta para validar',
        'Los tres, pero con integrity en el fetch del .wasm',
        'fetch_url y log, y run_script solo en desarrollo'
      ],
      answer: 1,
      explain: 'Validar un PDF no necesita red ni ejecutar código. Cada import es un poder; si la librería se rompe, ese poder lo tiene quien la rompió.' },
    { id: 'csp', type: 'single',
      prompt: "La CSP estricta bloquea la compilación del módulo. ¿Qué cambias?",
      options: [
        "Agregar 'unsafe-eval' a script-src para esa página",
        "Quitar la CSP de la página de subida, que es la única con Wasm",
        "Agregar 'wasm-unsafe-eval' a script-src",
        "Mover el módulo a un dominio con su propia política sin CSP"
      ],
      answer: 2,
      explain: "'unsafe-eval' abre eval() a un XSS. Quitar la CSP pierde la segunda capa contra XSS en la página que más archivos maneja." },
    { id: 'servidor', type: 'single',
      prompt: 'En el servidor, el validador corre con <code>wasmtime run --dir=/ validar.wasm</code>. ¿Qué pides?',
      options: [
        'Dejarlo así, porque WASI ya aísla el módulo del sistema de archivos',
        'Correrlo como root para que pueda leer todas las subidas',
        'Cambiarlo por un proceso nativo que corra con el usuario www-data',
        'Darle solo la carpeta temporal del archivo, sin red ni variables'
      ],
      answer: 3,
      explain: 'Con --dir=/ el módulo ve todo el disco que pueda leer el proceso: se pierde la ventaja de WASI. El proceso nativo hereda todo lo de www-data, .env incluido.' }
  ],
  solution: '<ul><li>La validación del navegador avisa; la del servidor decide (M82).</li><li>Librería actualizada y compilada con sanitizadores en las pruebas.</li><li>Imports: solo <code>log</code>; la salida, con <code>textContent</code>.</li><li><code>\'wasm-unsafe-eval\'</code> en <code>script-src</code> y el <code>.wasm</code> con <code>integrity</code>.</li><li>En el servidor, WASI con la carpeta temporal del archivo, sin red ni variables de entorno.</li></ul>'
});
