SD.defineQuiz('cph', {
  title: 'Checkpoint H: la plataforma de agentes de un equipo', pass: 0.7,
  questions: [
    { id: 'capa', type: 'single',
      prompt: 'Un modelo se niega a escribir un script que borra archivos. Alguien propone cambiar de harness para que no se niegue. ¿Qué pasa?',
      options: [
        'Funciona: el rechazo lo decide el system prompt del harness, que se puede reescribir',
        'No cambia de forma confiable: el rechazo viene del entrenamiento y del proveedor',
        'Funciona solo con harnesses open source, que no agregan reglas propias al modelo',
        'Funciona si el nuevo harness usa el dialecto de OpenAI en lugar del de Anthropic'
      ],
      answer: 1,
      explain: 'Las capas del modelo y del proveedor no las mueve ningún harness. Ver M62.10.' },
    { id: 'dialecto', type: 'single',
      prompt: 'Quieres usar un harness que habla el dialecto de Anthropic con un servidor que solo habla el de OpenAI. ¿Qué necesitas?',
      options: [
        'Nada: los dos dialectos son compatibles y cualquier servidor entiende ambos',
        'Un traductor en el medio, como un gateway que convierta un dialecto en el otro',
        'Reentrenar el modelo para que emita las llamadas a herramientas en el otro formato',
        'Cambiar el chat template del modelo dentro del archivo GGUF que sirve el servidor'
      ],
      answer: 1,
      explain: 'Los dialectos difieren en la forma de los mensajes y las herramientas; un traductor los convierte. Ver M62.3 y M70.6.' },
    { id: 'parser', type: 'single',
      prompt: 'Un modelo open weights emite sus llamadas a herramientas como texto con sus propias etiquetas. ¿Quién las convierte en el JSON que recibe el harness?',
      options: [
        'El harness, que lee el texto con una expresión regular propia de cada modelo',
        'El parser de herramientas del servidor de inferencia, según el formato del modelo',
        'El propio modelo, que tiene un modo de salida JSON que se activa con la temperatura',
        'El gateway, que es la única pieza que conoce el formato de cada proveedor'
      ],
      answer: 1,
      explain: 'El chat template pone las herramientas en el prompt y el parser del servidor recupera las llamadas. Ver M63.4.' },
    { id: 'restringida', type: 'single',
      prompt: '¿Qué garantiza la decodificación restringida con un esquema JSON?',
      options: [
        'Que la llamada respete el esquema; no que los valores sean los correctos',
        'Que el modelo elija siempre la herramienta correcta para cada tarea',
        'Que los argumentos sean correctos, porque el esquema valida su contenido',
        'Que el modelo nunca llame a una herramienta que no figura en la lista'
      ],
      answer: 0,
      explain: 'La máscara deja solo tokens válidos para el esquema: la forma queda garantizada; el contenido sigue siendo del modelo. Ver M63.6.' },
    { id: 'editar', type: 'single',
      prompt: 'Una edición por reemplazo exacto falla porque el texto a reemplazar aparece tres veces en el archivo. ¿Qué hace un harness bien diseñado?',
      options: [
        'Reemplaza la primera aparición y avisa de las otras dos al terminar',
        'Devuelve un error y pide más contexto alrededor, o replace_all si es lo que se quiere',
        'Reemplaza las tres, porque si el texto es igual el cambio debería aplicarse en todas',
        'Reescribe el archivo entero con la versión que el modelo tenga en el contexto'
      ],
      answer: 1,
      explain: 'Ambiguo es error: el modelo agrega contexto hasta que sea único. Ver M64.4.' },
    { id: 'compactar', type: 'single',
      prompt: 'En una sesión larga, el harness compacta el historial. ¿Qué se pierde?',
      options: [
        'Nada: la compactación guarda todo el historial comprimido sin pérdida',
        'Detalle: el resumen conserva decisiones y estado, no cada salida de herramienta',
        'Solo el system prompt, que se vuelve a cargar desde el disco al turno siguiente',
        'El caché del prefijo, pero el contenido de cada turno queda igual que antes'
      ],
      answer: 1,
      explain: 'Compactar es resumir: se pierde detalle y por eso conviene guardar lo importante fuera del contexto. Ver M64.8 y M68.7.' },
    { id: 'costo', type: 'single',
      prompt: 'Un set de 50 tareas con 5 corridas cada una, a 0.447 USD por tarea. ¿Cuánto cuesta?',
      options: ['22.35 USD', '111.75 USD', '223.50 USD', '447 USD'], fixed: true,
      answer: 1,
      explain: '50 × 5 × 0.447 = 111.75 USD. Ver M65.7 y M72.7.' },
    { id: 'passk', type: 'single',
      prompt: 'Un agente va a correr solo de noche. ¿Qué métrica importa?',
      options: [
        'pass@k: que alguna de las k corridas resuelva la tarea',
        'pass^k: que las k corridas de una tarea la resuelvan',
        'La tasa media por corrida, porque resume a las otras dos',
        'El puntaje del modelo en SWE-bench Verified'
      ],
      answer: 1,
      explain: 'Solo, sin nadie que elija la buena, importa la consistencia. Ver M65.8 y M72.7.' },
    { id: 'reglas', type: 'single',
      prompt: '¿Dónde conviene que viva la regla que impide leer <code>.env</code>?',
      options: [
        'En el system prompt, para que el modelo sepa por qué no debe leerlo',
        'En las reglas deny del harness y, mejor aún, fuera del alcance del sandbox',
        'En un comentario dentro del propio archivo .env que el modelo vea primero',
        'En el archivo de memoria del repositorio, junto con las convenciones del equipo'
      ],
      answer: 1,
      explain: 'Los permisos se imponen fuera del modelo; el sandbox cubre lo que la regla no ve, como un cat en bash. Ver M66.2 y M66.4.' },
    { id: 'egress', type: 'single',
      prompt: 'Un agente con la credencial de producción lee PRs de terceros. ¿Qué cambio reduce más el daño de una injection?',
      options: [
        'Pedirle en el prompt que ignore las instrucciones dentro de los PRs',
        'Quitar el egress o la credencial, para que no tenga las tres propiedades',
        'Usar un modelo más grande, que distingue mejor instrucciones de datos',
        'Leer los PRs con temperatura cero para que el agente sea determinista'
      ],
      answer: 1,
      explain: 'Es la trifecta o la regla de dos: quitar una propiedad acota el daño. Ver M66.6, M66.7 y M71.7.' },
    { id: 'mcp', type: 'single',
      prompt: 'Un equipo conecta 12 servidores MCP con 150 herramientas y el agente empeora. ¿Qué es lo más probable?',
      options: [
        'Las definiciones ocupan contexto fijo en cada turno y le cuesta elegir',
        'Los servidores MCP agregan latencia de red y el modelo corta antes',
        'MCP no admite más de cinco servidores a la vez y descarta los demás',
        'Las herramientas se ejecutan en paralelo y sus resultados se pisan'
      ],
      answer: 0,
      explain: 'Cada definición viaja en cada turno; con muchas se gasta contexto y se elige peor. Se cargan bajo demanda. Ver M67.3.' },
    { id: 'hook', type: 'single',
      prompt: '¿Qué diferencia a un hook de una instrucción en el archivo de memoria?',
      options: [
        'El hook es código que el harness corre siempre; la instrucción la sigue el modelo si quiere',
        'El hook solo funciona en modo sin preguntas; la instrucción funciona en cualquier modo',
        'Ninguna: los dos se cargan en el contexto y el modelo decide cuál aplicar',
        'El hook se escribe en Python y la instrucción en Markdown, pero hacen lo mismo'
      ],
      answer: 0,
      explain: 'Lo que tiene que pasar siempre va en un hook; lo que es guía, en memoria. Ver M67.5.' },
    { id: 'orden', type: 'single',
      prompt: 'El system prompt empieza con la hora actual. ¿Qué efecto tiene?',
      options: [
        'Mejora las respuestas, porque el modelo sabe siempre en qué momento está',
        'Rompe el caché del prefijo cada vez que cambia, y todo lo de después se paga entero',
        'Ninguno: el caché ignora los primeros tokens del prompt al calcular la clave',
        'Hace que el modelo responda más rápido porque el prompt cambia poco'
      ],
      answer: 1,
      explain: 'El caché es por prefijo: lo que cambia va al final. Ver M68.3.' },
    { id: 'orq', type: 'single',
      prompt: 'Un orquestador revisa 2 000 archivos en lotes en paralelo y un límite de requests por minuto empieza a devolver 429. ¿Qué ajustas primero?',
      options: [
        'Subir los lotes a la vez para terminar antes de que el límite se reinicie',
        'Bajar la concurrencia a la que aguanta el límite y reintentar con backoff',
        'Mandar cada archivo en su propia request para que cada una sea más chica',
        'Desactivar el tope de gasto, que es lo que dispara el error de límite'
      ],
      answer: 1,
      explain: 'La concurrencia se calcula contra el límite; reintentar sin espera empeora. Ver M69 (concurrencia y presupuesto).' },
    { id: 'moe', type: 'single',
      prompt: 'Un MoE de 30.5 mil millones de parámetros totales y 3.3 activos, en Q4_K_M. ¿Cuánta memoria ocupan los pesos?',
      options: [
        'Unos 2 GB, porque solo se cargan los parámetros activos de cada token',
        'Unos 18.3 GB: la memoria la deciden los parámetros totales',
        'Unos 61 GB, porque los MoE no se pueden cuantizar a 4 bits',
        'Unos 9 GB, la mitad, porque los expertos se cargan a demanda'
      ],
      answer: 1,
      explain: '30.5 × 4.8 ÷ 8 ≈ 18.3 GB. Los activos deciden el cálculo y lo que se lee por token. Ver M70.4.' },
    { id: 'local', type: 'single',
      prompt: '¿Cuál es una buena razón para servir un modelo propio en lugar de usar una API?',
      options: [
        'Que siempre sale más barato, porque no se paga por token',
        'Un contrato que prohíbe que los datos salgan de la red',
        'Que los modelos propios llaman herramientas con más precisión',
        'Que el modelo propio no necesita evals, porque no cambia de versión'
      ],
      answer: 1,
      explain: 'Las razones obligatorias son de datos y contratos; por costo depende del volumen. Ver M70.1.' },
    { id: 'jail', type: 'single',
      prompt: '¿Qué diferencia a un jailbreak de una prompt injection?',
      options: [
        'En el jailbreak ataca el usuario; en la injection, un tercero a través del contenido',
        'El jailbreak usa texto y la injection usa imágenes o archivos adjuntos',
        'El jailbreak afecta a modelos abiertos y la injection solo a los de una API',
        'Ninguna: son dos nombres para la misma técnica según el proveedor'
      ],
      answer: 0,
      explain: 'Quién ataca y quién es la víctima. Ver M71.1.' },
    { id: 'frr', type: 'single',
      prompt: 'Una defensa contra jailbreaks reporta su tasa de éxito de ataque. ¿Qué más necesitas para evaluarla?',
      options: [
        'Nada, si la tasa se midió sobre un set público grande',
        'Su tasa de falsos rechazos y su costo de cómputo',
        'El tamaño del modelo que se usó para generar los ataques',
        'La latencia de la primera respuesta con la defensa activada'
      ],
      answer: 1,
      explain: 'Rechazar todo da cero ataques exitosos. Ver M71.6.' },
    { id: 'grader', type: 'single',
      prompt: 'Un agente aprueba los evals borrando el test que fallaba. ¿Qué lo evita?',
      options: [
        'Un LLM juez que lea el mensaje final y confirme que el bug quedó arreglado',
        'Tests ocultos y una regla sobre la trayectoria que prohíba editar tests/',
        'Subir la temperatura para que el agente explore otras soluciones',
        'Correr cada tarea una sola vez para que el agente no aprenda el truco'
      ],
      answer: 1,
      explain: 'Estado final con tests que el agente no ve y reglas sobre los pasos. Ver M72.5 y M72.6.' },
    { id: 'ci', type: 'multi',
      prompt: '¿Qué cambios deberían correr los evals de agentes en CI? Marca todos los que correspondan.',
      options: [
        'Un cambio en el archivo de memoria del repositorio',
        'Una nueva versión fijada del modelo o del harness',
        'Una descripción de herramienta reescrita',
        'Un cambio en los colores de la interfaz web'
      ],
      answer: [0, 1, 2],
      explain: 'Todo lo que cambia lo que el modelo ve o puede hacer. Ver M72.8.' }
  ]
});
