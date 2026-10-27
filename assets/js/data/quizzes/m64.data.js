SD.defineQuiz('m64', {
  title: 'Quiz: anatomía de un harness', pass: 0.7,
  questions: [
    { id: 'orden', type: 'single',
      prompt: 'Un harness pone la fecha y la hora con segundos en la primera línea del system prompt. ¿Qué consecuencia tiene?',
      options: [
        'Ninguna: el proveedor cachea cada bloque del system por separado y solo vuelve a procesar ese',
        'Ninguna request comparte prefijo, así que la caché no sirve y cada turno se paga entero',
        'El modelo atiende peor la fecha porque queda lejos del final, donde mira con más atención',
        'La compactación se dispara antes, porque la fecha cuenta como historial que crece cada turno'
      ],
      answer: 1,
      explain: 'La caché guarda el prefijo hasta el primer byte que cambia. Lo variable va al final; lo estable, primero. Ver 64.2.' },
    { id: 'ambigua', type: 'single',
      prompt: 'El modelo pide reemplazar <code>return None</code> y la herramienta responde que aparece 2 veces. ¿Qué es lo correcto?',
      options: [
        'Que la herramienta cambie la primera aparición, que es la que el modelo leyó más recientemente',
        'Que el harness reescriba el archivo entero con la versión que el modelo tiene en su contexto',
        'Que el modelo sume líneas de contexto hasta que el fragmento sea único, o pida replace_all a propósito',
        'Que el harness reintente con un fuzzy match que elija la aparición más parecida al resto del pedido'
      ],
      answer: 2,
      explain: 'La ambigüedad se rechaza a propósito: adivinar cuál cambiar es la forma de romper código sin que nadie lo note. Ver 64.4 y el widget.' },
    { id: 'stale', type: 'single',
      prompt: '¿Por qué una herramienta de edición rechaza el cambio si el archivo cambió desde la última lectura?',
      options: [
        'Porque el modelo trabajaría sobre una versión vieja y podría pisar un cambio de otro proceso o tuyo',
        'Porque el sistema operativo bloquea el archivo mientras otro proceso lo tiene abierto para escribir',
        'Porque la caché del prompt ya no coincide con el disco y el proveedor rechazaría el turno siguiente',
        'Porque el número de línea del Read anterior queda corrido y old_string ya no se puede ubicar'
      ],
      answer: 0,
      explain: 'Es control de concurrencia optimista: si el archivo cambió, el modelo relee antes de editar. Ver 64.4.' },
    { id: 'formato', type: 'single',
      prompt: 'Tu modelo edita mal con reemplazo exacto y bien con parches. ¿Qué dice M64 sobre eso?',
      options: [
        'Que el problema es la temperatura: con 0 cualquier modelo aprende a usar reemplazo exacto',
        'Que hay que agregar ejemplos de reemplazo exacto al system prompt hasta que el modelo lo aprenda',
        'Que es raro: todos los modelos actuales se entrenan con los mismos formatos de edición',
        'Que es esperable: rinde mejor el formato que el modelo practicó, y Aider elige uno por modelo'
      ],
      answer: 3,
      explain: 'Codex usa apply_patch porque sus modelos se entrenaron con él; Aider mide el formato por modelo en su benchmark. Ver 64.4 y M63.11.' },
    { id: 'grep', type: 'single',
      prompt: '¿Qué gana la búsqueda agéntica con grep y glob frente a un índice de embeddings del repositorio?',
      options: [
        'Encuentra conceptos con otras palabras mejor que el índice, porque el modelo reformula la búsqueda',
        'Siempre ve el código actual, encuentra nombres exactos y no hay índice que mantener',
        'Resuelve cualquier pregunta en una sola consulta, sin gastar turnos del modelo',
        'Funciona igual de bien en un monorepo de millones de líneas que en uno chico'
      ],
      answer: 1,
      explain: 'Lo que pierde es turnos: cada búsqueda es una vuelta. En monorepos enormes un índice o un repo map ahorra vueltas. Ver 64.5.' },
    { id: 'bash', type: 'multi',
      prompt: '¿Qué decisiones hacen usable una herramienta de bash para un agente? (varias)',
      options: [
        'Sin stdin, para que un comando que pide confirmación falle en lugar de colgarse',
        'Recortar la salida larga en cabeza y cola, con un aviso de cuántas líneas se omitieron',
        'Devolver solo stdout, porque stderr suele traer ruido que confunde al modelo',
        'Esconder el exit code y dejar que el modelo deduzca de la salida si funcionó'
      ],
      answer: [0, 1],
      explain: 'Timeout, sin stdin, cabeza y cola, y el exit code siempre. Los errores suelen ir por stderr: tirarlo es tirar la causa. Ver 64.6.' },
    { id: 'todo', type: 'single',
      prompt: 'En una tarea larga, el agente arregla el bug y termina sin el test que había planeado. ¿Qué pieza falta?',
      options: [
        'Una lista de tareas como herramienta, que vuelve al contexto en cada turno',
        'Un subagente que escriba los tests en paralelo mientras el principal corrige el bug',
        'Una ventana más grande, para que el plan del principio no quede fuera del contexto',
        'Un archivo de memoria que diga que siempre hay que escribir tests antes de terminar'
      ],
      answer: 0,
      explain: 'El plan del turno 3 queda enterrado bajo decenas de resultados. Convertido en estado visible, el modelo lo lee en lugar de recordarlo. Ver 64.7.' },
    { id: 'mcp', type: 'single',
      prompt: 'Conectas 8 servidores MCP con 40&#8239;000 tokens de definiciones en total. ¿Qué pasa con cada turno?',
      options: [
        'Nada: las definiciones se cachean y se pagan solo una vez por sesión, sin ocupar ventana',
        'El modelo ignora las herramientas que no usa, y su descripción deja de contar como entrada',
        'Esos tokens ocupan ventana en cada turno, se pagan (o se leen de caché) y adelantan la compactación',
        'El harness rechaza la sesión porque el system prompt supera el máximo de tokens permitido'
      ],
      answer: 2,
      explain: 'Las herramientas son texto en el system: ocupan ventana siempre. Con caché se leen más baratas, pero siguen ocupando lugar. Prueba el escenario del widget. Ver 64.8.' },
    { id: 'memoria', type: 'single',
      prompt: '¿Qué conviene poner en un CLAUDE.md o AGENTS.md?',
      options: [
        'Una descripción detallada de cada módulo del código para que el agente no tenga que leerlo',
        'Todo el historial de decisiones del equipo, para que el agente entienda por qué está así el código',
        'Las instrucciones de estilo de respuesta del modelo, que el harness no puede configurar de otro modo',
        'Comandos exactos, reglas que no se ven en el código, lugares prohibidos y cómo saber que terminó'
      ],
      answer: 3,
      explain: 'Lo que un colega nuevo necesitaría y no puede deducir. Lo que el agente puede leer solo cuesta tokens en cada request. Ver 64.9.' },
    { id: 'sub', type: 'single',
      prompt: '¿Cuándo NO conviene un subagente?',
      options: [
        'Para explorar mucho y responder poco, como "dónde se valida la sesión"',
        'Para una edición que necesita todo lo que el agente principal ya sabe',
        'Para revisar tres módulos independientes en paralelo',
        'Para una revisión con otro punto de vista, sin el sesgo de lo ya hecho'
      ],
      answer: 1,
      explain: 'El subagente empieza sin el contexto del principal y devuelve un resumen. Si la tarea necesita ese contexto, se pierde en el traspaso. Ver 64.10.' }
  ]
});
