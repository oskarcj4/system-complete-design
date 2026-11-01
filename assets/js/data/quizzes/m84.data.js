SD.defineQuiz('m84', {
  title: 'Quiz: Modelos de renderizado: PHP, SPA y Next.js', pass: 0.7,
  questions: [
    { id: 'spa', type: 'single',
      prompt: 'En la SPA del sistema de prácticas, ¿qué cambia respecto de PHP clásico?',
      options: [
        'La autorización pasa al JavaScript, que ahora decide qué se muestra',
        'El escape lo hace el JavaScript que arma el DOM, y la API sigue autorizando',
        'El CSRF desaparece porque las requests son fetch con JSON',
        'El servidor deja de ver los datos y solo sirve archivos'
      ],
      answer: 1,
      explain: 'El JavaScript del cliente se lee y se cambia; no puede autorizar. Lo que sí se mueve es el escape: textContent en lugar de htmlspecialchars. Repasa 84.1.' },
    { id: 'hidratar', type: 'single',
      prompt: 'Un layout escribe <code>&lt;script&gt;window.__D = ${JSON.stringify(datos)}&lt;/script&gt;</code>. ¿Qué falla?',
      options: [
        'Nada: JSON.stringify escapa las comillas y produce JSON válido',
        'Que JSON.stringify no escapa los acentos y rompe la codificación',
        'Que un valor con </script> cierra el script y lo que sigue es HTML',
        'Que el script no lleva type="application/json" y no se ejecuta'
      ],
      answer: 2,
      explain: 'El parser de HTML busca </script> sin saber de JSON. Hay que escapar < como \\u003c, que es lo que hace JSON_HEX_TAG en PHP. Repasa 84.2.' },
    { id: 'frontera', type: 'single',
      prompt: 'Una página pasa <code>usuario={usuario}</code> (la fila entera) a un Client Component que muestra el nombre. ¿Qué pasa?',
      options: [
        'Nada: React solo serializa las props que el componente usa',
        'El build falla porque la fila trae tipos que no se serializan',
        'Solo se filtra si el componente hace console.log de la prop',
        'Todas las columnas viajan en el payload y se ven en la pestaña Red'
      ],
      answer: 3,
      explain: 'Lo que cruza la frontera use client se serializa entero, se use o no. La defensa es un DTO con los campos que el cliente necesita. Repasa 84.3.' },
    { id: 'serveronly', type: 'single',
      prompt: '¿Para qué sirve <code>import \'server-only\'</code> en el módulo que lee la base?',
      options: [
        'Hace que el build falle si un Client Component lo importa',
        'Cifra las consultas que el módulo manda a la base',
        'Marca el módulo como Server Action y lo publica como POST',
        'Impide que el middleware lea las variables de entorno'
      ],
      answer: 0,
      explain: 'Es un guardia del build: si el módulo termina en el bundle del cliente, la compilación se detiene. Repasa 84.3.' },
    { id: 'publico', type: 'single',
      prompt: 'Una clave secreta se llama <code>NEXT_PUBLIC_STRIPE_SK</code> y ningún componente la muestra. ¿Está expuesta?',
      options: [
        'No, porque solo se publica lo que un componente dibuja',
        'Solo si la página que la usa es un Client Component',
        'Sí: el build la copia literal en el JavaScript del cliente',
        'No, porque Next.js cifra las variables de entorno del bundle'
      ],
      answer: 2,
      explain: 'El prefijo NEXT_PUBLIC_ significa "reemplázala en el bundle". Hay que quitarle el prefijo y rotarla, porque ya se publicó. Repasa 84.4.' },
    { id: 'accion', type: 'single',
      prompt: '¿Qué es, para un atacante, una función con <code>\'use server\'</code>?',
      options: [
        'Código privado del servidor, que solo puede llamar el propio componente',
        'Un endpoint POST que puede llamar con cualquier argumento',
        'Una función que solo corre durante el build, no en cada request',
        'Un endpoint GET protegido por el identificador cifrado de la acción'
      ],
      answer: 1,
      explain: 'Next.js la convierte en un POST. El identificador está en el bundle; no es autorización. Sesión, rol y validación van dentro. Repasa 84.5.' },
    { id: 'csrf', type: 'single',
      prompt: '¿Cómo frena Next.js el CSRF contra las Server Actions?',
      options: [
        'Con un token anti-CSRF escondido en cada formulario',
        'Con una cookie SameSite=Strict que agrega a cada respuesta',
        'Rechazando las acciones que no traen el identificador cifrado',
        'Solo acepta POST y compara Origin con Host antes de ejecutar'
      ],
      answer: 3,
      explain: 'Es la comprobación de Origin de M76, hecha por el framework. Detrás de un proxy hay que declarar allowedOrigins con la lista exacta. Repasa 84.5.' },
    { id: 'middleware', type: 'single',
      prompt: '¿Qué enseñó CVE-2025-29927 sobre el middleware de Next.js?',
      options: [
        'Que autorizar solo ahí deja todo abierto si el middleware no corre',
        'Que el middleware tiene que consultar la base en cada request',
        'Que hay que mover el control de acceso al Client Component',
        'Que basta con bloquear la ruta /admin en el archivo robots.txt'
      ],
      answer: 0,
      explain: 'Una cabecera interna hacía que el middleware no corriera. Las apps que repetían la comprobación en la capa de datos no perdieron nada. Repasa 84.6.' },
    { id: 'href', type: 'single',
      prompt: 'Un Client Component dibuja <code>&lt;a href={o.sitioWeb}&gt;</code>. ¿Qué no resuelve el escape de React?',
      options: [
        'Las comillas dentro del valor, que cierran el atributo',
        'Los caracteres < y > dentro del valor del atributo',
        'El esquema: React escapa el valor, no decide si es http',
        'Los acentos, que React convierte en entidades numéricas'
      ],
      answer: 2,
      explain: 'Escapar evita que el valor salga del atributo, no que sea javascript:. Valida el esquema al guardar (M82). Repasa 84.7.' },
    { id: 'rsc', type: 'single',
      prompt: '¿Por qué ninguna validación dentro de la Server Action frenaba CVE-2025-55182?',
      options: [
        'Porque la falla estaba en el navegador, no en el servidor',
        'Porque la acción no validaba el tipo de los argumentos',
        'Porque solo afectaba a apps que usaban NEXT_PUBLIC_ en secretos',
        'Porque el decodificador del framework corre antes de tu código'
      ],
      answer: 3,
      explain: 'La deserialización del cuerpo pasa antes de llamar a la acción. Solo protegen el SCA y actualizar a tiempo. Repasa 84.8.' }
  ]
});
