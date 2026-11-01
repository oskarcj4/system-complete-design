SD.defineQuiz('m85', {
  title: 'Quiz: WebAssembly', pass: 0.7,
  questions: [
    { id: 'pasos', type: 'order',
      prompt: 'Ordena lo que hace el navegador con un <code>.wasm</code> antes de correrlo.',
      items: ['Descargarlo con fetch', 'Validarlo: tipos y saltos', 'Compilarlo a código de máquina', 'Instanciarlo con sus imports'],
      explain: 'La validación va antes de compilar: un módulo con tipos que no cierran no llega a correr. Repasa 85.1.' },
    { id: 'permisos', type: 'single',
      prompt: '¿Qué permisos tiene un módulo de Wasm en una página, comparado con el JavaScript de esa página?',
      options: [
        'Más que la página: corre como código nativo y abre sockets propios',
        'Los mismos que la página, y llega al DOM sin pasar por el JavaScript',
        'Ninguno propio: solo lo que el JavaScript le pasa como imports',
        'Los de la extensión del navegador que lo compiló'
      ],
      answer: 2,
      explain: 'Un módulo no tiene instrucciones para el DOM ni la red. Todo lo que hace afuera pasa por los imports. Repasa 85.3.' },
    { id: 'overflow', type: 'single',
      prompt: 'Un <code>strcpy</code> de 20 letras en un <code>char nombre[16]</code> compilado a Wasm. ¿Qué pasa?',
      options: [
        'El motor lo detiene con un trap en cuanto escribe el byte 17 del buffer',
        'Pisa la variable de al lado, dentro de la memoria del módulo',
        'Escribe en la memoria de JavaScript y puede cambiar el DOM',
        'El compilador lo rechaza porque Wasm no tiene punteros'
      ],
      answer: 1,
      explain: 'La comprobación es contra el final de la memoria lineal, no contra cada variable. El trap solo llega si se pasa el final de la memoria. Repasa 85.2.' },
    { id: 'nativo', type: 'single',
      prompt: '¿Por qué un desbordamiento puede ser más fácil de aprovechar dentro de Wasm que en un binario nativo?',
      options: [
        'Porque Wasm no comprueba ningún acceso a memoria',
        'Porque la memoria lineal de un módulo se comparte entre todas las pestañas',
        'Porque el navegador ejecuta Wasm con permisos de administrador',
        'Dentro de la memoria lineal no hay canarios, ASLR ni solo lectura'
      ],
      answer: 3,
      explain: 'Las defensas que el sistema operativo da a un proceso nativo no existen dentro de la memoria lineal. Repasa 85.2.' },
    { id: 'imports', type: 'single',
      prompt: 'Un proveedor pide el import <code>ejecutar: (p, n) =&gt; eval(leer(p, n))</code>. ¿Qué haces?',
      options: [
        'Negarlo: con ese import el módulo corre JavaScript en tu página',
        'Darlo, porque el sandbox de Wasm limita lo que hace eval',
        'Darlo solo si el .wasm se descarga con integrity y la CSP es estricta',
        'Darlo y validar el resultado con una expresión regular'
      ],
      answer: 0,
      explain: 'El sandbox es tan chico como sus imports. Un import con eval o fetch con credenciales lo deja del tamaño de la página. Repasa 85.3.' },
    { id: 'salida', type: 'single',
      prompt: '¿Cómo muestras un texto que devolvió el módulo?',
      options: [
        'Con innerHTML, porque lo devolvió código compilado que es tuyo',
        'Con document.write, que el módulo no puede alcanzar',
        'Con textContent, como cualquier dato que vino del usuario',
        'Con eval, para convertir los bytes en una cadena'
      ],
      answer: 2,
      explain: 'Lo que sale del módulo lo escribió código en C con la entrada del usuario. Es un dato. Repasa 85.3.' },
    { id: 'spectre', type: 'single',
      prompt: '¿Qué frena a Spectre frente a un módulo de Wasm?',
      options: [
        'El trap del motor al acceder fuera de la memoria lineal',
        'La validación de tipos que hace el navegador al instanciar',
        "La palabra 'wasm-unsafe-eval' en la CSP de la página",
        'Un proceso por sitio y el aislamiento con COOP y COEP'
      ],
      answer: 3,
      explain: 'Spectre no respeta el sandbox del lenguaje: lee por canales laterales. Lo frena que el otro sitio no esté en el mismo proceso. Repasa 85.4.' },
    { id: 'php', type: 'single',
      prompt: 'Alguien propone usar WordPress Playground para la gestión real de postulaciones. ¿Qué respondes?',
      options: [
        'Sirve, porque PHP compilado a Wasm corre en un sandbox más fuerte que Apache',
        'No: sin servidor, quien tiene la pestaña controla datos y permisos',
        'Sirve si la base SQLite se cifra con la COOKIE_KEY',
        'Sirve si se agrega una CSP con wasm-unsafe-eval'
      ],
      answer: 1,
      explain: 'Correr PHP en el cliente es quitar el servidor. Nadie autoriza y todo secreto que se ponga ahí se publica. Repasa 85.5.' },
    { id: 'wasi', type: 'single',
      prompt: 'Corres un validador de PDF con <code>wasmtime run --dir=./subidas/tmp::/entrada</code>. ¿Qué puede leer?',
      options: [
        'Solo lo que hay en ./subidas/tmp, que ve como /entrada',
        'Todo lo que pueda leer el usuario del sistema que lo lanza',
        'Todo el disco, pero solo en modo de lectura',
        'Nada: WASI no tiene acceso a archivos'
      ],
      answer: 0,
      explain: 'WASI da capacidades: el módulo empieza sin nada y recibe solo esa carpeta. Repasa 85.6.' },
    { id: 'csp', type: 'single',
      prompt: 'Con la CSP estricta de M78, el <code>.wasm</code> no compila. ¿Qué agregas a <code>script-src</code>?',
      options: [
        "'unsafe-eval', que habilita compilar código en tiempo de ejecución",
        "'unsafe-inline', para que el módulo pueda cargar sus scripts",
        "'wasm-unsafe-eval', que permite Wasm sin habilitar eval()",
        "El dominio de la CDN con un comodín, para que lo descargue"
      ],
      answer: 2,
      explain: "'unsafe-eval' también abre eval() de JavaScript a un XSS. La palabra específica de Wasm existe para no tener que usarla. Repasa 85.7." }
  ]
});
