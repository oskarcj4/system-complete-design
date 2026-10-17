/* Decisiones guiadas de IA02 (Un analista de datos). Formato en core/exercise.js. */

SD.defineExercise('ia02-analista', {
  title: 'un analista cuyas cifras se pueden auditar',
  scenario: '<p>El analista corre como en esta guía: un grafo de LangGraph con seis nodos (entender, aclarar, explorar, herramientas, redactar y verificar), tres herramientas (ver el esquema, correr SQL con un rol de solo lectura y correr Python en un contenedor desechable), un registro de cada consulta con su huella y un verificador escrito en código. La dueña de la tienda pregunta en español y no sabe SQL. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'barrera', type: 'single',
      prompt: '¿Qué impide de verdad que <code>consultar_sql</code> borre pedidos de la tienda?',
      options: [
        '<code>validar()</code>, que lee el SQL con sqlglot y rechaza todo lo que no sea una lectura.',
        'El <code>GRANT</code>: el rol <code>analista_lector</code> solo tiene <code>SELECT</code> en seis tablas.',
        '<code>default_transaction_read_only</code>, que el rol recibe cada vez que se conecta a la base.',
        'El párrafo del prompt de <code>EXPLORAR</code> que dice que la base es solo para leer.'
      ],
      answer: 1,
      explain: '<code>validar()</code> solo mejora el mensaje: si un día sqlglot tiene un bug, deja pasar la consulta. El solo lectura es un valor de inicio que la misma sesión puede apagar, y <code>caos.py escribir</code> lo hace. El prompt es un pedido. El <code>GRANT</code> lo hace cumplir la base sin preguntarle a nadie: aunque se apague el solo lectura, un <code>DELETE</code> falla con <code>permission denied</code>. Es el mínimo privilegio de M10.'
    },
    {
      id: 'limite-filas', type: 'single',
      prompt: 'El modelo pide una consulta que devuelve 40&#8239;000 filas. ¿Qué hace la herramienta?',
      options: [
        'Devuelve un error y le pide al modelo que reescriba la consulta con un <code>LIMIT</code> propio.',
        'Pagina: le muestra las primeras 30 y le da un cursor para pedir las siguientes cuando quiera.',
        'Devuelve las 40&#8239;000 filas, porque recortar haría que el modelo trabaje con datos incompletos.',
        'Guarda hasta 500, le muestra 30 numeradas, marca la consulta como recortada y avisa qué hacer.'
      ],
      answer: 3,
      explain: '40&#8239;000 filas no caben en el contexto y cuestan miles de tokens que el modelo no puede usar. Un error obliga a gastar otro paso, y paginar invita al modelo a leer fila por fila lo que SQL suma en un paso. Recortar con aviso le dice la verdad («se muestran 30 de más de 500: agrega en SQL») y la marca de recortada impide citar esa consulta, porque la fila 1 de 500 no es la fila 1 de todas.'
    },
    {
      id: 'sandbox-red', type: 'single',
      prompt: 'Un compañero quiere quitar <code>--network none</code> para que el código del modelo pueda instalar paquetes. ¿Qué cambia?',
      options: [
        'El código podría mandar a cualquier servidor los CSV de la entrada, con filas de la tienda.',
        'Nada importante, porque el contenedor sigue con el disco de solo lectura y el usuario 10001.',
        'El código podría conectarse a la base como <code>analista_lector</code> y leer las seis tablas.',
        'Solo cambia la velocidad: instalar paquetes en cada llamada hace que el sandbox tarde más.'
      ],
      answer: 0,
      explain: 'El disco de solo lectura y el usuario 10001 no impiden abrir una conexión. Con red, el código puede leer los CSV que le diste y mandarlos afuera: es la pata de exfiltración de la trifecta letal, la que esta guía quita a propósito. Conectarse a la base le haría falta la clave del lector, que no está en el contenedor. Los paquetes se instalan en la imagen, al construirla, no en cada llamada.'
    },
    {
      id: 'exec-local', type: 'single',
      prompt: 'Para ahorrarse Docker, alguien propone correr el código del modelo con <code>exec()</code> en el proceso del analista. ¿Qué es lo más grave?',
      options: [
        'Que pandas y matplotlib tendrían que estar instalados en el proyecto, junto a LangGraph.',
        'Que un bucle sin fin colgaría el proceso, y con él a todas las preguntas en curso de la API.',
        'Que el código vería todo lo que ve tu proceso: la clave de la API, tus archivos y tu red.',
        'Que <code>exec()</code> es más lento que un contenedor, porque compila el código cada vez.'
      ],
      answer: 2,
      explain: 'Las dependencias se resuelven con un <code>uv add</code>, y <code>exec()</code> no es más lento. El bucle sin fin es un problema real, pero se arregla con un plazo. Lo que no se arregla es que el código corre con tus permisos: lee <code>ANTHROPIC_API_KEY</code> de <code>os.environ</code>, abre <code>.env</code> o manda los datos por la red. En el contenedor, <code>exec()</code> sí está bien, porque lo que ve es solo lo que le diste.'
    },
    {
      id: 'aclarar', type: 'single',
      prompt: '¿Cuál de estas preguntas tendría que detener al analista para preguntar antes de explorar?',
      options: [
        '«¿Cuántos pedidos pagados hubo en diciembre?», porque no dice de qué año es diciembre.',
        '«¿Qué ciudad creció más en pedidos pagados del primer al segundo semestre?», por la palabra «creció».',
        '«¿Cuántos termos vendimos en 2025?», porque podría referirse a unidades o a pedidos con termos.',
        '«¿Cuánto cayeron las ventas del termo después de subir el precio?», en unidades o en pesos.'
      ],
      answer: 3,
      explain: 'La tienda solo tiene datos de 2025, así que «diciembre» no es ambiguo; «creció en pedidos» ya dice la métrica, y «cuántos termos» son unidades. «Cuánto cayeron las ventas» tiene dos respuestas correctas con los mismos datos: 33.3&#8239;% en unidades por día y 22.2&#8239;% en pesos. Preguntar de más también es un error, y los evals lo cuentan como «preguntó de más».'
    },
    {
      id: 'cifra-sin-cita', type: 'single',
      prompt: 'El informe dice «el termo vendió unas 1800 piezas» y la cifra 1 cita la consulta 3, fila 1, con valor 1762. ¿Qué hace el verificador?',
      options: [
        'Lo rechaza: 1800 es un número sin hueco en el texto, y vuelve a <code>redactar</code> con ese motivo.',
        'Lo acepta, porque 1800 es 1762 redondeado a la centena y cabe dentro de la tolerancia.',
        'Lo acepta, porque la cifra citada coincide con la celda y el texto es solo una forma de decirlo.',
        'Le pregunta a un segundo modelo si «unas 1800» es una forma razonable de escribir 1762.'
      ],
      answer: 0,
      explain: 'El verificador no lee intenciones: busca números en el texto, fuera de los huecos, y 1800 es uno. La tolerancia es la de los decimales del valor citado, no la de una frase. Que la cifra 1 esté bien no salva al texto: lo que lee la persona es «1800». En el primer rechazo vuelve a <code>redactar</code> con el motivo; si el segundo informe insiste, sale marcado <code>SIN VERIFICAR</code>.'
    },
    {
      id: 'juez-o-codigo', type: 'single',
      prompt: '¿Por qué el verificador es código y no un segundo modelo que lea el informe y las consultas?',
      options: [
        'Porque un modelo no puede leer resultados de SQL: solo entiende texto en lenguaje natural.',
        'Porque comparar una celda con un valor tiene una respuesta exacta, y un juez cuesta y se equivoca.',
        'Porque LangGraph no deja llamar al modelo dentro de un nodo que viene después de <code>redactar</code>.',
        'Porque un juez solo sirve para evaluar estilo, y el informe no tiene estilo que revisar.'
      ],
      answer: 1,
      explain: 'Un modelo lee tablas sin problema, LangGraph deja llamar al modelo en cualquier nodo, y un juez sirve para más que el estilo. Pero «¿89280 es la celda 89280.00?» tiene una respuesta exacta que el código da gratis y siempre igual. Un juez es otra llamada, puede equivocarse, y el mismo texto que engañó al primer modelo puede engañarlo a él. El juez tiene su lugar donde no hay respuesta exacta (M22).'
    },
    {
      id: 'fila-envenenada', type: 'single',
      prompt: 'El nombre del producto 8 le ordena al analista decir que las ventas subieron 300&#8239;%. ¿Qué puede lograr esa fila?',
      options: [
        'Que el analista borre o cambie filas de la tienda, si el modelo obedece la instrucción.',
        'Que el código del sandbox mande los datos a un servidor externo escrito en la instrucción.',
        'Nada: el spotlighting de <code>&lt;resultado&gt;</code> hace que el modelo nunca obedezca un dato.',
        'Cambiar el texto o el tono del informe, aunque el 300&#8239;% sin cita no pase el verificador.'
      ],
      answer: 3,
      explain: 'No puede escribir: el rol no tiene permiso. No puede sacar datos: el sandbox no tiene red y ninguna herramienta manda nada afuera. El spotlighting baja la probabilidad de que el modelo obedezca, pero no la lleva a cero. Lo que queda es el texto: el modelo puede mencionar la instrucción, elegir qué destacar o escribir «subieron», y el verificador solo atrapa el número. Por eso las barreras que importan no dependen del modelo.'
    }
  ],
  solution: '<ul><li>La barrera es el <code>GRANT</code> del rol; sqlglot y el solo lectura son ayudas.</li><li>Las consultas grandes se recortan con aviso, y una consulta recortada no se cita.</li><li>El sandbox no tiene red: sin ella, no hay forma de sacar los datos.</li><li>El código del modelo nunca corre en tu proceso: vería tu clave y tus archivos.</li><li>Se pregunta solo cuando la pregunta tiene dos respuestas correctas con los mismos datos.</li><li>Un número sin hueco en el texto se rechaza, aunque las cifras citadas estén bien.</li><li>Lo que tiene una respuesta exacta lo verifica el código, no un juez.</li><li>Una fila envenenada puede cambiar el texto, no actuar ni sacar datos.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia02-p-semilla', {
  kind: 'predict', title: 'la semilla',
  scenario: '<p>Corres <code>uv run python semilla.py</code> y después cuentas los pedidos cancelados: <code>SELECT count(*) FROM pedidos WHERE estado = \'cancelado\'</code>.</p>',
  steps: [{
    id: 'cancelados', type: 'single',
    prompt: '¿Qué número sale?',
    options: ['0', '226', '365', '5616'],
    fixed: true,
    answer: 2,
    explain: 'La semilla planta un pedido cancelado por día: 365 en 2025. 226 son las devoluciones, otra tabla: un pedido devuelto sigue pagado. 5616 son todos los pedidos, pagados y cancelados. Como las reglas son fijas, lo sabes antes de correr nada.'
  }]
});

SD.defineExercise('ia02-p-config', {
  kind: 'predict', title: 'la configuración',
  scenario: '<p>Copiaste <code>.env.example</code> a <code>.env</code>, que dice <code>ANALISTA_MODELO=ollama</code>. No definiste <code>UV_ENV_FILE</code> ni exportaste nada. Corres <code>uv run python -c "from analista.config import CFG; print(CFG.modelo)"</code>.</p>',
  steps: [{
    id: 'modelo', type: 'single',
    prompt: '¿Qué imprime?',
    options: [
      '<code>ollama</code>, porque uv lee <code>.env</code> solo al arrancar',
      '<code>claude</code>, el valor por defecto de <code>config.py</code>',
      'Un <code>KeyError</code>, porque falta <code>ANTHROPIC_API_KEY</code>',
      '<code>ollama</code>, porque <code>.env.example</code> trae ese valor'
    ],
    answer: 1,
    explain: 'uv carga un archivo de variables solo si se lo pides, con <code>UV_ENV_FILE=.env</code> o con <code>--env-file</code>. Sin eso, <code>ANALISTA_MODELO</code> no existe y <code>config.py</code> usa su valor por defecto, <code>claude</code>. La clave no se lee al importar la configuración, sino al llamar al modelo.'
  }]
});

SD.defineExercise('ia02-p-sql', {
  kind: 'predict', title: 'la consulta',
  scenario: '<p>Corres <code>sql.correr(\'SELECT count(*) AS n FROM pedidos\')</code>.</p>',
  steps: [{
    id: 'conteo', type: 'single',
    prompt: '¿Qué valor trae la única fila?',
    options: [
      '<code>5251</code>: una venta es un pedido pagado, como dice el <code>COMMENT ON</code>',
      '<code>5616</code>: sin filtro, cuenta pagados y cancelados por igual',
      '<code>500</code>, el tope de filas que pone <code>correr()</code>',
      '<code>10738</code>, porque cuenta las líneas de cada pedido'
    ],
    answer: 1,
    explain: 'La consulta no filtra, así que cuenta todos: 5251 pagados y 365 cancelados. El <code>COMMENT ON</code> es documentación para el modelo; la base no lo aplica. El tope de 500 es de filas devueltas, y aquí hay una. Las 10 738 son las líneas: saldrían con un <code>JOIN</code> a <code>lineas_pedido</code>. Es el error del <code>WHERE</code> que falta: el número se ve bien y es más grande que las ventas.'
  }]
});

SD.defineExercise('ia02-p-registro', {
  kind: 'predict', title: 'el registro',
  scenario: '<p>En el hilo <code>m-1</code> se registró la consulta 7. Desde otro hilo llamas a <code>registro.buscar("m-2", 7)</code>.</p>',
  steps: [{
    id: 'otro-hilo', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      'La fila de la consulta 7: el número es único en toda la tabla',
      '<code>None</code>: la búsqueda pide el número y también el hilo, y no coinciden',
      'Un error de permisos, porque cada hilo tiene su propio rol',
      'La consulta 7 de <code>m-2</code>, que se crea vacía al buscarla'
    ],
    answer: 1,
    explain: 'El <code>WHERE</code> pide el número y el hilo a la vez. El número es único, pero la búsqueda exige los dos: un hilo no ve lo de otro, y un informe no puede citar una consulta que corrió otra pregunta. Los hilos no tienen roles propios; todos usan <code>analista_app</code>. Buscar no crea nada.'
  }]
});

SD.defineExercise('ia02-p-sandbox', {
  kind: 'predict', title: 'el sandbox',
  scenario: '<p>El modelo escribe un código que intenta guardar 100 MB en <code>/tmp/grande.bin</code>, y lo corre con <code>ejecutar_python</code>.</p>',
  steps: [{
    id: 'disco', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Lo guarda, y se borra cuando se borra el contenedor',
      'Falla con <code>Read-only file system</code>, como el resto del disco',
      'Falla con <code>No space left on device</code>',
      'El contenedor termina con el código 137, por la memoria'
    ],
    answer: 2,
    explain: '<code>--read-only</code> deja todo el disco en solo lectura, salvo <code>/tmp</code>, que es un <code>tmpfs</code> de 64 MB: ahí se puede escribir, pero 100 MB no caben. El tmpfs vive en memoria, y 64 MB no llegan a los 512 del tope, así que no hay código 137. Lo compruebas en <a href="#comprueba-sandbox">Las barreras del sandbox</a>.'
  }]
});

SD.defineExercise('ia02-p-verificar', {
  kind: 'predict', title: 'el verificador',
  scenario: '<p>El informe cita <code>33.4</code>, y la celda dice <code>33.35</code>. Corres <code>coincide(\'33.4\', \'33.35\')</code>.</p>',
  steps: [{
    id: 'redondeo', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      '<code>False</code>: los textos son distintos',
      '<code>True</code>: la celda se redondea a un decimal',
      '<code>False</code>: redondeada a un decimal, la celda da <code>33.3</code>',
      'Un error: <code>Decimal</code> no compara números con distinta cantidad de decimales'
    ],
    answer: 1,
    explain: '<code>coincide()</code> redondea la celda a los decimales que trae el valor citado, uno, con <code>ROUND_HALF_UP</code>: 33.35 sube a 33.4. El redondeo al par más cercano, el de <code>round()</code> de Python, daría 33.4 también aquí, pero no siempre: por eso se fija la regla. Comparar como texto solo pasa si alguno no es un número.'
  }]
});

SD.defineExercise('ia02-p-grafo', {
  kind: 'predict', title: 'el grafo',
  scenario: '<p>Corres <code>analista preguntar "¿Qué producto vendió más en marzo?" --aclaracion "en pesos"</code>. El nodo <code>entender</code> igual lista la ambigüedad «¿en unidades o en pesos?».</p>',
  steps: [{
    id: 'aclarar', type: 'single',
    prompt: '¿Qué nodo sigue a <code>entender</code>?',
    options: [
      '<code>aclarar</code>: hay una ambigüedad en la lista, y eso basta',
      '<code>explorar</code>, sin detenerse, porque la aclaración ya llegó de entrada',
      '<code>redactar</code>, porque con la aclaración ya no hace falta explorar',
      '<code>entender</code> otra vez, hasta que la lista quede vacía'
    ],
    answer: 1,
    explain: '<code>hay_que_aclarar()</code> pide dos cosas: que haya ambigüedades y que nadie haya aclarado. Con <code>--aclaracion</code>, la segunda no se cumple, y el grafo va a explorar sin detenerse. Así no pregunta de más: preguntar lo que ya te dijeron también es un error, y los evals lo cuentan.'
  }]
});

SD.defineExercise('ia02-p-cli', {
  kind: 'predict', title: 'los comandos',
  scenario: '<p>Corres <code>uv run analista preguntar "¿Qué producto vendió más en marzo?" --hilo m-1</code>, sin aclaración.</p>',
  steps: [{
    id: 'ultima', type: 'single',
    prompt: '¿Qué dice la última línea?',
    options: [
      '<code>pasos: 0  tokens: …</code>, porque el grafo terminó sin explorar',
      '<code>Quedó en (\'aclarar\',). Sigue con: analista reanudar m-1</code>',
      '<code>Para contestar: analista aclarar m-1 "tu respuesta"</code>',
      'Nada: el comando sigue abierto, esperando que escribas la respuesta'
    ],
    answer: 2,
    explain: '<code>correr()</code> mira <code>estado.next</code> al final. Si es <code>(\'aclarar\',)</code>, imprime cómo contestar; <code>reanudar</code> es para un hilo que se cortó en otro nodo. El comando termina: tu respuesta llega con otro proceso, y el estado espera en el checkpoint.'
  }]
});

SD.defineExercise('ia02-p-api', {
  kind: 'predict', title: 'la API',
  scenario: '<p>Con la API andando, mandas <code>POST /preguntas</code> con <code>{"pregunta": "hola"}</code>.</p>',
  steps: [{
    id: 'corta', type: 'single',
    prompt: '¿Qué contesta?',
    options: [
      '<code>202</code> con un hilo; el grafo descubre después que no es una pregunta',
      '<code>422</code>: Pydantic rechaza el cuerpo antes de llamar a la función',
      '<code>400</code>, porque falta <code>aclaracion</code> en el cuerpo',
      '<code>202</code>, y el GET del hilo dirá <code>necesita_aclaracion</code>'
    ],
    answer: 1,
    explain: '<code>Pregunta</code> pide entre 5 y 500 caracteres, y «hola» tiene 4. FastAPI valida el cuerpo con Pydantic antes de llamar a la función, y responde 422 con <code>string_too_short</code>. <code>aclaracion</code> tiene un valor por defecto, <code>None</code>, así que puede faltar.'
  }]
});

SD.defineExercise('ia02-p-pruebas', {
  kind: 'predict', title: 'las pruebas',
  scenario: '<p>Con Docker apagado, corres <code>uv run pytest -v</code>.</p>',
  steps: [{
    id: 'sin-base', type: 'single',
    prompt: '¿Cómo termina?',
    options: [
      '7 fallan con <code>OperationalError</code> y 25 pasan',
      '32 pasan: el modelo falso también hace de base',
      '25 pasan y <code>test_sql.py</code> aparece como saltado',
      'Ninguna corre: pytest se detiene en la primera conexión que falla'
    ],
    answer: 2,
    explain: '<code>test_sql.py</code> intenta conectarse al cargar el archivo, y si no puede, llama a <code>pytest.skip</code> con el motivo: el archivo entero se salta, sin fallar. Las otras 25 usan piezas falsas y no tocan la base. La base en memoria de <code>falsos.py</code> sirve al grafo, no a <code>sql.correr()</code>.'
  }]
});

SD.defineExercise('ia02-p-evals', {
  kind: 'predict', title: 'los evals',
  scenario: '<p>En el caso <code>marzo-ambigua</code>, el agente no pregunta: elige pesos por su cuenta y contesta, verificado, que ganó el termo con 89 280.</p>',
  steps: [{
    id: 'ambigua', type: 'single',
    prompt: '¿Cómo queda ese intento?',
    options: [
      '<code>ok</code>: la cifra coincide con una de las dos lecturas',
      '<code>ok</code>, porque el verificador lo aprobó',
      '<code>FALLA</code>: no preguntó en un caso ambiguo',
      'No cuenta: los casos ambiguos solo miden si preguntó, no el resultado'
    ],
    answer: 2,
    explain: 'El chequeo <code>pregunto</code> exige que haya preguntado en un caso ambiguo. Acertó por suerte: la otra lectura daba la taza, y no avisó cuál eligió. Verificado quiere decir que la cifra sale de su celda, no que la consulta responda lo que se quería saber.'
  }]
});
