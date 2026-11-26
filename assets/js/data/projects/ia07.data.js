/* Decisiones guiadas de IA07 (Tu propio harness). Formato en core/exercise.js. */

SD.defineExercise('ia07-harness', {
  title: 'el harness de un asistente de programación',
  scenario: '<p>Un equipo de cuatro personas quiere un asistente de programación en la terminal que arregle bugs de su repositorio de Python. Va a usar Claude, o un modelo local cuando el código no pueda salir de la oficina. El repositorio tiene un <code>.env</code> con secretos de prueba y las pruebas corren en un par de segundos. Nadie quiere vigilar cada paso, pero tampoco que el agente haga algo que no entendió. Tienes que tomar ocho decisiones de diseño.</p>',
  steps: [
    {
      id: 'editar', type: 'single',
      prompt: 'El modelo tiene que cambiar tres líneas de un archivo de 400. ¿Cómo se las pide la herramienta de edición?',
      options: [
        'Que reescriba el archivo entero con el cambio aplicado, porque así el resultado queda completo y no depende de nada anterior.',
        'El texto exacto que hay hoy y el que lo reemplaza, con un error si aparece cero o varias veces, y sin editar un archivo que no leyó.',
        'Los números de línea que cambian y el texto nuevo, porque una posición es más corta que repetir el texto viejo.',
        'Un parche en formato diff que el modelo escribe completo, con sus encabezados, para que lo aplique una herramienta estándar.'
      ],
      answer: 1,
      explain: 'El reemplazo exacto deja el cambio a la vista y falla con un mensaje que el modelo puede corregir. Reescribir el archivo entero gasta tokens y borra sin avisar lo que el modelo no copió bien. Los números de línea se desfasan en cuanto algo cambió arriba, y los modelos cuentan líneas peor de lo que parece. Un diff exige encabezados y contexto perfectos, y cualquier error lo rechaza entero. Es el mecanismo del paso 4 y de M64.'
    },
    {
      id: 'donde-viven-las-reglas', type: 'single',
      prompt: 'El agente no debe leer el <code>.env</code>. ¿Dónde se pone esa regla?',
      options: [
        'En el programa, antes de ejecutar la herramienta, con un <code>deny</code> que el modelo no puede negociar ni levantar.',
        'En el system prompt, con una instrucción clara y un ejemplo de lo que está prohibido leer, para que el modelo la recuerde en cada turno.',
        'En el entrenamiento: se afina el modelo con ejemplos de rechazo, y así no depende de que alguien programe nada.',
        'En un segundo modelo que mira cada llamada y responde si le parece segura, y que se corre con una temperatura de cero.'
      ],
      answer: 0,
      explain: 'Un prompt es una petición, y un archivo que el modelo lea puede contener otra que la contradiga. Un afinado no da garantías y no lo controlas. Un segundo modelo se puede convencer con el mismo truco que al primero. Una regla en el programa se evalúa siempre, con el mismo resultado, y se prueba con un test. El prompt la repite, pero no es lo que protege (paso 6, M66).'
    },
    {
      id: 'bash', type: 'single',
      prompt: 'El agente necesita correr las pruebas con bash. ¿Cómo se juzgan los comandos?',
      options: [
        'Una lista larga de comandos prohibidos, con <code>rm</code>, <code>curl</code> y <code>sudo</code>, y todo lo demás se permite sin preguntar.',
        'Se le pide al modelo que explique qué hace el comando antes de ejecutarlo, y se permite si la explicación suena razonable.',
        'Una lista corta de lo permitido, una de lo prohibido, y lo que no está en ninguna se pregunta a una persona.',
        'Se permite cualquier comando que empiece con <code>python</code> o con <code>ls</code>, porque son los que usan las pruebas.'
      ],
      answer: 2,
      explain: 'Una lista de prohibidos siempre deja fuera la forma que nadie previó, y un comando es texto libre. La explicación del modelo es otra pieza de texto que puede ser engañosa. Permitir por el primer verbo deja pasar <code>python -c</code> con cualquier cosa adentro. Con una lista corta de permitidos, lo desconocido se pregunta, y ante la duda no se permite (paso 6).'
    },
    {
      id: 'ask-sin-nadie', type: 'single',
      prompt: 'Una corrida de los evals corre sin nadie delante y el modelo pide editar un archivo que requiere aprobación. ¿Qué hace el harness?',
      options: [
        'Lo permite, porque nadie está para negarlo y una corrida automática no puede quedarse esperando una respuesta que nunca llega.',
        'Reintenta la pregunta cada pocos segundos hasta que alguien conteste, para no perder el trabajo hecho hasta ese punto.',
        'Detiene toda la corrida con una excepción, porque una aprobación pendiente es un error de configuración que hay que arreglar.',
        'Lo deniega y le devuelve al modelo el motivo como un error, porque una aprobación que nadie da es un no.'
      ],
      answer: 3,
      explain: 'Si nadie aprueba, el permiso no existe. Permitirlo convierte el <code>ask</code> en un <code>allow</code> cuando se apaga la persona. Esperar sin fin cuelga una corrida y su costo. Cortar con una excepción pierde el trabajo y no le deja al modelo corregir. Con la negación y el motivo, el modelo puede intentar otro camino o decir que no pudo (paso 8, M25).'
    },
    {
      id: 'donde-corre-bash', type: 'single',
      prompt: 'Los comandos ya pasaron la política. ¿Dónde se ejecutan?',
      options: [
        'En tu máquina, con un usuario sin privilegios, porque la política ya revisó el comando y una segunda barrera es redundante.',
        'En un contenedor sin red, con el sistema de archivos de solo lectura, sin capabilities y con solo el proyecto montado.',
        'En un contenedor con red, pero con una lista de dominios permitidos, para que pueda instalar las dependencias que le falten.',
        'En tu máquina, dentro de un directorio temporal, para que los archivos que cree no se mezclen con los del proyecto.'
      ],
      answer: 1,
      explain: 'La política mira el texto; la caja limita lo que el proceso puede hacer aunque el texto engañe. Un contenedor sin red no sale a internet por mucho que se lo pida. Con una lista de dominios hay que mantener la lista y confiar en el proxy. Un directorio temporal en tu máquina no frena nada: el proceso sigue viendo todo tu disco (paso 5, M66).'
    },
    {
      id: 'donde-cortar', type: 'single',
      prompt: 'La sesión pasa el umbral y hay que compactar. ¿Dónde se corta la conversación?',
      options: [
        'En el mensaje número veinte, contando desde el principio, porque un número fijo es predecible y fácil de probar.',
        'Justo después de cada resultado de herramienta, porque ahí el modelo ya terminó de ver lo que había pedido.',
        'Se borran los resultados más viejos y se dejan las llamadas, para que el modelo vea qué hizo sin cargar lo que leyó.',
        'Justo antes de un mensaje del asistente, para que cada llamada que se conserva quede junto a su resultado.'
      ],
      answer: 3,
      explain: 'La API exige que cada llamada tenga su resultado, y que los roles se alternen. Cortar en un número fijo parte una llamada de su resultado y la siguiente petición falla. Cortar después de un resultado deja un mensaje de usuario justo antes del resumen, que también es de usuario. Una llamada sin resultado es justo lo que la API rechaza. Cortar antes de un mensaje del asistente garantiza el par completo (paso 7, M68).'
    },
    {
      id: 'salida-gigante', type: 'single',
      prompt: 'Un <code>pytest</code> devuelve 9 000 líneas. ¿Qué pasa con ese resultado?',
      options: [
        'Se acorta antes de entrar al historial, conservando el principio y el final con un aviso de lo omitido.',
        'Entra completo, y si la ventana se llena, la compactación lo resume cuando llegue al umbral.',
        'Se resume con el modelo cada vez, para que el historial solo tenga la versión corta de cada resultado.',
        'Se devuelven solo las primeras 100 líneas, porque lo importante de un resultado siempre viene al principio.'
      ],
      answer: 0,
      explain: 'Lo que entra al historial se paga en cada turno siguiente, así que se recorta antes de entrar. En pytest, el principio dice qué corrió y el final cómo terminó. Dejarlo entrar y compactar después paga el costo mientras tanto. Resumir cada resultado agrega una llamada al modelo por herramienta y puede inventar. Las primeras líneas pierden el resumen final, que es lo que se busca (paso 8, M64).'
    },
    {
      id: 'medir', type: 'single',
      prompt: 'Cambias el modelo y quieres saber si el agente sigue arreglando bugs. ¿Cómo lo mides?',
      options: [
        'Le preguntas al agente si terminó bien la tarea, y cuentas las veces que responde que sí.',
        'Cinco tareas con una prueba oculta que el agente no ve, tres intentos cada una, y cuántas salen bien las tres veces.',
        'Corres cada tarea una vez con las pruebas visibles del repositorio, y cuentas cuántas quedan en verde.',
        'Cuentas los turnos que gasta cada tarea, porque un agente que termina en pocos turnos es un agente que acierta.'
      ],
      answer: 1,
      explain: 'Lo que dice el modelo de sí mismo no es una medida. Con las pruebas visibles, el agente puede editarlas para que pasen. Un modelo es variable: una sola corrida no distingue acertar de tener suerte, y pass^k sí. Los turnos miden costo, no corrección: un agente puede terminar rápido con un arreglo malo. La prueba oculta decide qué es "salió bien" (paso 10, M72).'
    }
  ],
  solution: '<ul><li>Edición por reemplazo exacto: error si el texto aparece cero o varias veces y obligación de leer antes de editar.</li><li>Las reglas en el programa, no en el prompt: <code>deny</code>, <code>ask</code> y <code>allow</code>, en ese orden.</li><li>En bash, una lista corta de permitidos y lo desconocido se pregunta; un <code>ask</code> sin nadie es un no.</li><li>La caja es un contenedor sin red, de solo lectura y con solo el proyecto montado.</li><li>Compactar cortando antes de un mensaje del asistente, y recortar los resultados antes de que entren al historial.</li><li>Medir con tareas, pruebas ocultas y pass^k, no con lo que el modelo dice de sí mismo.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia07-p-config', {
  kind: 'predict', title: 'una variable con texto',
  scenario: '<p>Exportas <code>HARNESS_MAX_TURNOS=diez</code> y corres <code>uv run python -c "from harness.config import CFG"</code>.</p>',
  steps: [{
    id: 'que-pasa', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Se importa sin error y <code>max_turnos</code> queda en 25, el valor por defecto.',
      'Se importa sin error y <code>max_turnos</code> queda con el texto <code>diez</code>.',
      'Falla con un <code>ValueError</code> al importar el módulo, porque <code>int("diez")</code> se evalúa al definir la clase.',
      'Se importa, y el error aparece más tarde, cuando el bucle usa <code>max_turnos</code> por primera vez.'
    ],
    answer: 2,
    explain: 'Los valores por defecto de un <code>dataclass</code> se calculan una vez, cuando Python lee la clase, es decir, al importar. <code>int("diez")</code> lanza un <code>ValueError</code> en ese momento. Un error temprano y claro es mejor que uno a mitad de una corrida.'
  }]
});

SD.defineExercise('ia07-p-modelo', {
  kind: 'predict', title: 'el modelo de Ollama sin dialecto',
  scenario: '<p>Exportas <code>HARNESS_MODELO=ollama</code> y no tocas <code>HARNESS_DIALECTO</code>. Llamas a <code>crear_modelo()</code>.</p>',
  steps: [{
    id: 'que-clase', type: 'single',
    prompt: '¿Qué te devuelve?',
    options: [
      'Un <code>ModeloOpenAI</code>, porque Ollama es el servidor que habla el dialecto de OpenAI.',
      'Un <code>ModeloAnthropic</code> con el caché prendido, igual que con Claude.',
      'Un <code>ModeloAnthropic</code> apuntando a <code>localhost:11434</code> y con el caché apagado.',
      'Un <code>ValueError</code>, porque con Ollama hay que elegir el dialecto a mano.'
    ],
    answer: 2,
    explain: 'El dialecto por defecto es <code>anthropic</code>, y Ollama lo acepta desde la versión 0.14. El caché se apaga porque el servidor no anuncia que lo soporte. <code>ModeloOpenAI</code> solo sale con <code>HARNESS_DIALECTO=openai</code>.'
  }]
});

SD.defineExercise('ia07-p-falso', {
  kind: 'predict', title: 'un guion que se acaba',
  scenario: '<p>Armas <code>m = ModeloFalso([decir("hola")])</code> y llamas a <code>m.responder("s", [], [])</code> dos veces seguidas.</p>',
  steps: [{
    id: 'segunda', type: 'single',
    prompt: '¿Qué pasa en la segunda llamada?',
    options: [
      'Devuelve otra vez <code>hola</code>, porque el modelo falso repite su última respuesta.',
      'Devuelve una respuesta vacía, sin texto y sin llamadas, para que el bucle termine.',
      'Falla con un <code>AssertionError</code> que dice que el guion se acabó.',
      'Falla con un <code>IndexError</code> al sacar un elemento de una lista vacía.'
    ],
    answer: 2,
    explain: 'El modelo falso comprueba con un <code>assert</code> que quede guion antes de sacar la respuesta, justamente para que no salga un <code>IndexError</code> sin explicación. Una prueba que llama al modelo más veces de lo previsto está mal escrita, y el mensaje lo dice.'
  }]
});

SD.defineExercise('ia07-p-herramientas', {
  kind: 'predict', title: 'un texto que aparece muchas veces',
  scenario: '<p>El modelo ya leyó <code>tienda/precios.py</code>, donde la palabra <code>precio</code> aparece 8 veces. Pide <code>edit_file</code> con <code>antiguo="precio"</code> y <code>nuevo="p"</code>, sin <code>reemplazar_todo</code>.</p>',
  steps: [{
    id: 'resultado', type: 'single',
    prompt: '¿Qué le devuelve la herramienta?',
    options: [
      'Un <code>ErrorHerramienta</code> que dice que el texto aparece 8 veces y le sugiere agregar líneas de alrededor o usar <code>reemplazar_todo</code>.',
      '<code>Editado tienda/precios.py: 1 reemplazo(s)</code>, porque sin <code>reemplazar_todo</code> se cambia solo la primera aparición.',
      '<code>Editado tienda/precios.py: 8 reemplazo(s)</code>, porque un texto que se repite se reemplaza en todas partes.',
      'Un error que dice <code>No encontré ese texto</code>, porque una palabra suelta no es un texto exacto.'
    ],
    answer: 0,
    explain: 'Con más de una aparición y sin <code>reemplazar_todo</code>, la herramienta se niega a adivinar cuál: cambiar la primera podría ser el lugar equivocado. El mensaje trae la cuenta y dos salidas, que es todo lo que el modelo necesita para corregirse.'
  }]
});

SD.defineExercise('ia07-p-caja', {
  kind: 'predict', title: 'escribir fuera del proyecto',
  scenario: '<p>Levantas la caja con <code>compose.yaml</code> y ejecutas dentro <code>touch /nuevo.txt</code>.</p>',
  steps: [{
    id: 'resultado', type: 'single',
    prompt: '¿Qué devuelve <code>ejecutar</code>?',
    options: [
      'Código 0 y sin salida: el archivo se crea dentro del contenedor y desaparece cuando la caja se destruye.',
      'Un código distinto de 0 y un mensaje que incluye <code>Read-only file system</code>.',
      'El código 124 y <code>El comando pasó el tiempo límite</code>, porque <code>touch</code> se queda esperando.',
      'Código 0, y el archivo aparece en la carpeta del proyecto en tu máquina, porque está montada.'
    ],
    answer: 1,
    explain: 'El contenedor tiene <code>read_only: true</code>: solo se puede escribir en <code>/tmp</code> y en el proyecto montado en <code>/work</code>. <code>/</code> es de solo lectura. El volumen montado es <code>/work</code>, no <code>/</code>, así que nada llega a tu máquina.'
  }]
});

SD.defineExercise('ia07-p-permisos', {
  kind: 'predict', title: 'una redirección',
  scenario: '<p>El modelo pide <code>bash</code> con <code>python -m pytest -q &gt; salida.txt</code>. La lista permitida incluye <code>python -m pytest *</code>.</p>',
  steps: [{
    id: 'decision', type: 'single',
    prompt: '¿Qué decide <code>Permisos.decidir</code>?',
    options: [
      '<code>allow</code>, porque el comando empieza con <code>python -m pytest</code>, que está en la lista.',
      '<code>deny</code>, porque ninguna regla permite escribir un archivo con una redirección.',
      '<code>ask</code>, porque una redirección esconde algo que el patrón no ve y no se adivina.',
      '<code>allow</code> en el modo <code>acceptEdits</code> y <code>ask</code> en el modo <code>default</code>.'
    ],
    answer: 2,
    explain: 'Antes de mirar la lista permitida, <code>_bash</code> busca <code>&lt;</code>, <code>&gt;</code>, <code>$(</code> y comillas invertidas. Si hay alguno, pregunta. Los modos solo cambian lo que pasa con <code>edit_file</code>, no con bash. No es <code>deny</code> porque ningún patrón prohibido coincide.'
  }]
});

SD.defineExercise('ia07-p-contexto', {
  kind: 'predict', title: 'recortar un texto de 100 caracteres',
  scenario: '<p>Llamas a <code>recortar("a" * 100, 30)</code>.</p>',
  steps: [{
    id: 'omitidos', type: 'single',
    prompt: '¿Cuántos caracteres dice el aviso que omitió?',
    options: ['30', '70', '85', '100'],
    fixed: true,
    answer: 1,
    explain: 'El límite es 30, así que se conserva la mitad, 15, al principio y 15 al final: 30 en total. Los 100 menos esos 30 son 70 omitidos. El aviso queda entre las dos mitades.'
  }]
});

SD.defineExercise('ia07-p-bucle', {
  kind: 'predict', title: 'editar sin nadie que apruebe',
  scenario: '<p>Un modelo falso lee <code>tienda/paginas.py</code>, pide editarlo y después dice "listo". El modo es <code>default</code> y no hay función <code>aprobar</code>.</p>',
  steps: [{
    id: 'efecto', type: 'single',
    prompt: '¿Qué ve el modelo tras pedir la edición, y cómo queda el archivo?',
    options: [
      'Ve <code>Editado …</code> y el archivo queda arreglado, porque la edición es válida.',
      'Ve <code>No aprobado: edita un archivo</code> como error, y el archivo queda sin cambios.',
      'Ve <code>Denegado por la política</code>, y el archivo queda sin cambios, porque editar siempre se deniega.',
      'El bucle se detiene con una excepción, y el archivo queda sin cambios.'
    ],
    answer: 1,
    explain: 'En el modo <code>default</code>, editar es un <code>ask</code>. Sin función <code>aprobar</code>, un <code>ask</code> se trata como un no, pero distinto de un <code>deny</code>: el mensaje empieza con <code>No aprobado</code>. El bucle sigue, y el modelo recibe el error en un <code>tool_result</code>.'
  }]
});

SD.defineExercise('ia07-p-cli', {
  kind: 'predict', title: 'preparar dos veces',
  scenario: '<p>Corres <code>preparar</code>, el agente edita <code>trabajo/proyecto/tienda/paginas.py</code>, y vuelves a correr <code>preparar</code>.</p>',
  steps: [{
    id: 'que-queda', type: 'single',
    prompt: '¿Qué hay en <code>paginas.py</code> después?',
    options: [
      'El archivo con la edición del agente, porque <code>preparar</code> no pisa lo que ya existe.',
      'Una mezcla: el archivo editado más lo que cambió en <code>victima/</code>.',
      'El archivo original de <code>victima/</code>, con el bug otra vez, porque <code>preparar</code> borra la carpeta y la copia de nuevo.',
      'Nada: <code>preparar</code> falla porque la carpeta de trabajo ya existe.'
    ],
    answer: 2,
    explain: 'Si el destino existe, <code>preparar</code> lo borra con <code>shutil.rmtree</code> y copia de nuevo. Es lo que quieres para empezar cada experimento igual, y también la razón por la que no debes guardar nada tuyo en <code>trabajo/</code>.'
  }]
});

SD.defineExercise('ia07-p-evals', {
  kind: 'predict', title: 'pass^3 de cinco tareas',
  scenario: '<p>Corres los evals con <code>--k 3</code>. Los intentos de cada tarea salen así: t1 bien, bien, bien; t2 bien, mal, bien; t3 bien, bien, bien; t4 mal, mal, mal; t5 bien, bien, bien.</p>',
  steps: [{
    id: 'passk', type: 'single',
    prompt: '¿Cuánto vale pass^3?',
    options: ['0.4', '0.6', '0.73', '0.8'],
    fixed: true,
    answer: 1,
    explain: 'pass^3 cuenta las tareas donde los tres intentos salieron bien: t1, t3 y t5, tres de cinco, es decir 0.6. La fracción de intentos que salieron bien es otra cosa: 11 de 15, que da 0.73. La t2, con una falla, no cuenta.'
  }]
});
