/* Decisiones guiadas de WEB07 (inyecciones). Formato en core/exercise.js. */

SD.defineExercise('web07-inyecciones', {
  title: 'los bordes que una consulta preparada no cubre',
  scenario: '<p>La API del sistema de prácticas usa <code>prepare</code> con <code>?</code> en todas sus consultas. Aun así, buscar <code>%</code> en usuarios devuelve gente, producto pide ordenar "Mis ofertas" por columna, y la bitácora muestra un hash de bcrypt. Son seis decisiones.</p>',
  steps: [
    {
      id: 'columnas', type: 'single',
      prompt: '<code>registrar()</code> arma la lista de columnas del <code>INSERT</code> con <code>implode(&#39;, &#39;, $columnas)</code>. ¿Es una inyección?',
      options: [
        'Sí: cualquier variable dentro del string de SQL es una inyección, aunque la consulta use signos de pregunta.',
        'No: las columnas salen de las llaves de una constante del código, no de la request.',
        'Sí, salvo que se escapen los nombres con backticks antes de unirlos con implode.',
        'No, porque PDO revisa los nombres de columna contra la tabla antes de compilar la consulta.'
      ],
      answer: 1,
      explain: '<code>$columnas</code> son las llaves de <code>CAMPOS_FORMULARIO</code> más las dos de los documentos: fragmentos escritos en el código. La pregunta no es si hay una variable, sino de dónde sale. PDO no revisa nombres; los backticks no arreglan un nombre que viene del cliente. Está en <a href="#excusa">la excusa</a>.'
    },
    {
      id: 'like', type: 'single',
      prompt: '<code>search()</code> usa <code>LIKE ?</code> con el patrón <code>&#39;%&#39; . $termino . &#39;%&#39;</code>. Con <code>?q=%</code>, ¿qué pasa?',
      options: [
        'MariaDB rechaza el patrón con un error de sintaxis, porque tres % seguidos no son un LIKE válido.',
        'Nada raro: el signo de pregunta convierte el % en un carácter literal, igual que haría con una comilla simple.',
        'Coincide con todos los usuarios activos: el ? evita la inyección, pero % sigue siendo un comodín de LIKE.',
        'Devuelve solo los usuarios cuyo nombre empieza con %, porque LIKE ancla el patrón al principio.'
      ],
      answer: 2,
      explain: 'El parámetro garantiza que el valor sea un string, no qué significa ese string para <code>LIKE</code>. <code>%%%</code> es un patrón válido que coincide con todo. Por eso <code>likeContiene</code> escapa <code>%</code>, <code>_</code> y la barra. Está en <a href="#paso-like">el paso 2</a>.'
    },
    {
      id: 'orden', type: 'single',
      prompt: 'Producto quiere ordenar "Mis ofertas" por cierre o por título. ¿Cómo llega el orden al SQL?',
      options: [
        'Con un mapa de nombres públicos a fragmentos escritos en el código, y 400 si el nombre no está.',
        'Con ORDER BY ? y el nombre de la columna como parámetro, para que PDO lo escape como cualquier otro valor.',
        'Con ORDER BY $orden, después de validar con una regex que solo tenga letras, números y guion bajo.',
        'Con ORDER BY $orden entre backticks, que MariaDB trata siempre como un nombre y nunca como código.'
      ],
      answer: 0,
      explain: 'Un <code>?</code> en <code>ORDER BY</code> es un valor constante: ordena por el string, es decir, no ordena. La regex deja elegir cualquier columna de las tablas unidas, y los backticks se cierran con otro backtick. El cliente elige una llave; el SQL lo escribe el código. Está en <a href="#paso-orden">el paso 3</a>.'
    },
    {
      id: 'bitacora', type: 'single',
      prompt: 'La bitácora tacha las llaves que se llaman <code>password</code>. ¿Por qué el hash nuevo quedó en claro?',
      options: [
        'Porque bcrypt no es una contraseña, y la regla de tachado solo se aplica a contraseñas en texto plano.',
        'Porque el UPDATE de la contraseña se ejecuta antes de que AuditLog sepa qué usuario hizo el cambio.',
        'Porque json_encode de la bitácora escribe los arrays anidados sin pasar por la función de tachado.',
        'Porque con signos de pregunta posicionales las llaves del array son 0 y 1, y no hay nombre por el que tachar.'
      ],
      answer: 3,
      explain: '<code>execute([$hash, $id])</code> llega a la bitácora como <code>[0 =&gt; hash, 1 =&gt; id]</code>. La regla nueva mira la sentencia: si nombra una columna sensible, no guarda ningún valor. El usuario sí estaba (por eso hay fila), y el tachado sí recorre los anidados. Está en <a href="#paso-bitacora">el paso 4</a>.'
    },
    {
      id: 'log', type: 'single',
      prompt: 'El mensaje de una excepción trae un dato con <code>\\n</code>. ¿Qué cierra la inyección en el registro?',
      options: [
        'Quitar los saltos con str_replace antes de llamar a error_log, para que el mensaje quede en una línea.',
        'Escribir cada evento como una línea de JSON, que codifica el salto de línea y los demás caracteres de control.',
        'Guardar el registro dentro de htdocs, donde Apache lo sirve como texto y nadie puede editarlo.',
        'Pasar el mensaje por htmlspecialchars, que convierte los saltos de línea en entidades de HTML.'
      ],
      answer: 1,
      explain: '<code>json_encode</code> escribe <code>\\n</code>, <code>\\r</code> y el resto de los caracteres de control como secuencias de escape, así que ningún dato parte la línea, y al leerla el dato vuelve igual. <code>str_replace</code> se olvida de alguno; <code>htmlspecialchars</code> no toca los saltos; el registro va fuera de <code>htdocs</code> (WEB01). Está en <a href="#paso-registro">el paso 5</a>.'
    },
    {
      id: 'probar', type: 'multi',
      prompt: '¿Qué prueba, sin cargas que lean datos, que el <code>ORDER BY</code> armado con el dato es inyectable? Marca todas las correctas.',
      options: [
        'Pedir una columna que no existe y encontrar Unknown column, con ese nombre, en el registro.',
        'Ver que el 500 trae una referencia, porque toda referencia significa que hubo una inyección.',
        'Pedir el mismo orden con la lista permitida y ver un 400 sin referencia.',
        'Medir que la request tarda más que las otras, porque un ORDER BY inválido siempre es más lento.'
      ],
      answer: [0, 2],
      explain: 'Si el texto del cliente aparece en el error del parser, llegó al parser: con eso alcanza. Y el 400 sin referencia muestra que con la lista la consulta nunca se armó. Una referencia solo dice que hubo una excepción, y el tiempo no prueba nada aquí. Está en <a href="#comprueba-fallas">la falla 2</a>.'
    }
  ],
  solution: '<ul><li>La conexión apaga <code>ATTR_EMULATE_PREPARES</code>: la plantilla y los datos viajan separados.</li><li><code>likeContiene()</code> escapa <code>%</code>, <code>_</code> y la barra, y la usan las tres búsquedas.</li><li>"Mis ofertas" ordena con <code>ORDENES_CREADOR</code>; un nombre que no está da 400.</li><li>La bitácora no guarda los valores de una sentencia que nombra una columna sensible.</li><li>El registro escribe un objeto JSON por línea con <code>registrar()</code>.</li></ul>'
});
