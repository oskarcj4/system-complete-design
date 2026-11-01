SD.defineQuiz('m79', {
  title: 'Quiz: Inyecciones en el servidor', pass: 0.7,
  questions: [
    { id: 'raiz', type: 'single',
      prompt: '¿Cuál es la defensa preferida contra cualquier inyección?',
      options: [
        'Escapar cada carácter especial del intérprete antes de armar el string',
        'Un WAF que bloquee las requests con caracteres sospechosos',
        'Mandar el código y el dato por canales separados',
        'Validar que el dato no tenga comillas, punto y coma ni saltos de línea'
      ],
      answer: 2,
      explain: 'Parámetros, arreglo de argumentos, variables de plantilla. El escape es el último recurso y la lista negra siempre olvida algo. Repasa 79.1.' },
    { id: 'emula', type: 'single',
      prompt: 'Con <code>pdo_mysql</code> y los valores por defecto, ¿qué pasa con una consulta preparada?',
      options: [
        'PDO emula: escapa cada valor y arma el string en PHP',
        'Se compila en el servidor y los valores viajan en otro paquete',
        'PDO la rechaza si la conexión no tiene ATTR_EMULATE_PREPARES',
        'Los valores se mandan sin escapar, porque el servidor los separa'
      ],
      answer: 0,
      explain: 'El defecto de pdo_mysql es emular. Es seguro con el charset en el DSN; con EMULATE_PREPARES en false, la plantilla y los valores viajan separados. Repasa 79.2 y la figura 79.3.' },
    { id: 'orderby', type: 'single',
      prompt: 'La búsqueda permite <code>?orden=fecha_cierre</code>. ¿Cómo lo pones en la consulta?',
      options: [
        'Como parámetro: <code>ORDER BY ?</code> con el valor de la request',
        'Concatenado, después de escaparlo con PDO::quote',
        'Con una lista: la clave elige un fragmento de SQL fijo',
        'Concatenado, si solo tiene letras y guiones bajos'
      ],
      answer: 2,
      explain: 'Un identificador no puede ser parámetro: ORDER BY ? ordena por una constante. quote lo convierte en un literal. Validar con regex deja elegir cualquier columna. Repasa 79.3.' },
    { id: 'segundo', type: 'single',
      prompt: '¿Qué es una inyección SQL de segundo orden?',
      options: [
        'Una inyección que necesita dos requests seguidas para funcionar',
        'Un dato guardado bien que después se concatena en otra consulta',
        'Una inyección en la segunda consulta de una transacción',
        'Una inyección que usa UNION para leer una segunda tabla'
      ],
      answer: 1,
      explain: 'El dato entra con parámetros y otro proceso lo toma de la base como si fuera de confianza. Un dato de la base sigue siendo del usuario. Repasa el callout de 79.3.' },
    { id: 'shell', type: 'single',
      prompt: '¿Por qué <code>proc_open([\'pdftotext\', \'--\', $ruta, \'-\'], …)</code> no tiene inyección de comandos?',
      options: [
        'Porque proc_open escapa los argumentos con escapeshellarg por dentro',
        'Porque llama al programa sin shell, con cada argumento aparte',
        'Porque el doble guion desactiva los metacaracteres de la shell',
        'Porque pdftotext rechaza los nombres de archivo con punto y coma'
      ],
      answer: 1,
      explain: 'Con un arreglo no hay shell: nada interpreta ; ni $( ). El -- evita otra cosa, que un nombre que empieza con guion se lea como opción. Repasa 79.4.' },
    { id: 'lfi', type: 'single',
      prompt: 'Con <code>allow_url_include</code> apagado, ¿qué sigue siendo posible con <code>include $_GET[\'pagina\']</code>?',
      options: [
        'Nada, porque sin esa opción include solo acepta rutas absolutas',
        'Solo incluir archivos de la misma carpeta, porque ../ queda bloqueado',
        'Incluir una URL de otro servidor, porque esa opción solo afecta a require',
        'Incluir un archivo local, como un log, o leer código con php://filter'
      ],
      answer: 3,
      explain: 'La opción solo cierra la inclusión remota. ../ y los wrappers locales siguen. La lista de páginas permitidas cierra todo. Repasa 79.5.' },
    { id: 'ssti', type: 'single',
      prompt: 'Una institución escribe su plantilla de correo y el texto <code>{{ 7*7 }}</code> llega como 49. ¿Qué pasa?',
      options: [
        'El texto se compila como plantilla y el motor evalúa expresiones',
        'Un XSS: el navegador del destinatario calculó la expresión',
        'Nada grave: el motor solo evalúa cuentas, no llama métodos',
        'Una inyección SQL en la consulta que guarda la plantilla'
      ],
      answer: 0,
      explain: 'Es SSTI: el dato es la plantilla. El alcance depende de los objetos disponibles y en muchos motores llega a ejecutar código. Repasa 79.6.' },
    { id: 'logs', type: 'single',
      prompt: '¿Cómo evitas entradas falsas en el log de logins fallidos?',
      options: [
        'Quitando las comillas del nombre de usuario antes de escribirlo',
        'Escribiendo el log en un archivo que solo root puede leer',
        'Un registro JSON por línea: el salto de línea queda escapado',
        'Usando error_log, que ya quita los saltos de línea de PHP 8'
      ],
      answer: 2,
      explain: 'El salto de línea crea la entrada falsa; en JSON se escribe como \\n dentro del campo. Los permisos no cambian lo que se escribe. Repasa 79.7.' },
    { id: 'xxe', type: 'single',
      prompt: 'En PHP 8 con libxml 2.9 o posterior, ¿cuándo vuelve el riesgo de XXE?',
      options: [
        'Siempre que el XML tenga una DTD, sin importar los flags',
        'Cuando el código pasa LIBXML_NOENT o LIBXML_DTDLOAD',
        'Cuando el XML pesa más de lo que admite memory_limit',
        'Nunca: libxml quitó por completo las entidades externas'
      ],
      answer: 1,
      explain: 'Por defecto no se cargan; los flags las vuelven a activar, y aparecen en ejemplos viejos. Las entidades internas todavía permiten bombas de expansión. Repasa 79.8.' },
    { id: 'unser', type: 'single',
      prompt: '¿Por qué <code>unserialize($_COOKIE[\'prefs\'])</code> es peligroso aunque no haya eval en el proyecto?',
      options: [
        'Porque crea objetos que elige el atacante y dispara sus métodos mágicos',
        'Porque la cookie puede ser más larga que lo que admite memory_limit',
        'Porque unserialize ejecuta como PHP el string que recibe',
        'Porque el resultado se escribe en la sesión sin firmar'
      ],
      answer: 0,
      explain: 'El atacante encadena __wakeup o __destruct de clases que ya existen. unserialize no ejecuta el string como código: crea objetos. json_decode no crea objetos de clases. Repasa 79.9.' }
  ]
});
