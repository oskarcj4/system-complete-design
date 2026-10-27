SD.defineQuiz('m62', {
  title: 'Quiz: la pila de un agente', pass: 0.7,
  questions: [
    { id: 'kimi', type: 'single',
      prompt: 'Claude Code puede usar Kimi cambiando solo variables de entorno. ¿Por qué?',
      options: [
        'Porque Moonshot expone un endpoint con el mismo dialecto de API que habla Claude Code',
        'Porque Kimi se entrenó con salidas de Claude y entiende su formato interno de herramientas',
        'Porque Claude Code trae un traductor integrado que convierte Messages a Chat Completions',
        'Porque los pesos de Kimi se descargan y Claude Code los carga dentro de su propio proceso'
      ],
      answer: 0,
      explain: 'Claude Code habla el dialecto de Anthropic (/v1/messages). Moonshot ofrece ese dialecto en https://api.moonshot.ai/anthropic, así que basta con ANTHROPIC_BASE_URL y una credencial. Si el servidor solo hablara Chat Completions, haría falta un traductor como LiteLLM. Repasa 62.3.' },
    { id: 'quien', type: 'single',
      prompt: 'El modelo responde con <code>tool_use bash "pytest -x"</code>. ¿Quién ejecuta pytest?',
      options: [
        'El servidor de inferencia, que corre las herramientas antes de devolver la respuesta',
        'El modelo, que tiene acceso a una shell durante la generación de tokens',
        'El harness, que lee la llamada, decide el permiso y corre el comando en tu máquina',
        'La interfaz, porque es la única pieza que tiene acceso a la terminal del usuario'
      ],
      answer: 2,
      explain: 'El modelo solo escribe un JSON con la llamada. El harness la interpreta, aplica sus reglas de permiso, la ejecuta y devuelve el resultado como un mensaje más. Todo el poder y todo el riesgo están en el harness. Repasa 62.5.' },
    { id: 'dentro', type: 'multi',
      prompt: '¿Cuáles viven <b>dentro</b> de un harness y lo extienden?',
      options: [
        'Un servidor MCP que expone una herramienta para consultar Postgres',
        'Un hook que corre el linter después de cada edición',
        'DeepSec lanzando un agente por cada candidato que encontró',
        'Una skill con las instrucciones para publicar un módulo',
        'Un bot de CI que corre claude -p sobre cada PR'
      ],
      answer: [0, 1, 3],
      explain: 'MCP, hooks y skills son extensiones: el harness las carga y las usa. DeepSec y un bot de CI son orquestadores: viven fuera y lanzan harnesses en modo headless como procesos. Repasa 62.8.' },
    { id: 'cred', type: 'single',
      prompt: 'En Claude Code tienes exportadas <code>ANTHROPIC_AUTH_TOKEN</code> (de Moonshot) y <code>ANTHROPIC_API_KEY</code> (de Anthropic). ¿Cuál se usa?',
      options: [
        'ANTHROPIC_API_KEY, porque las claves de API tienen prioridad sobre cualquier token',
        'ANTHROPIC_AUTH_TOKEN, que va como Authorization: Bearer y está antes en el orden',
        'Ninguna: Claude Code falla al arrancar si encuentra dos credenciales a la vez',
        'La última que exportaste en la terminal, porque la sesión lee solo la más reciente'
      ],
      answer: 1,
      explain: 'En el orden documentado de Claude Code, ANTHROPIC_AUTH_TOKEN va antes que ANTHROPIC_API_KEY. Igual conviene el unset de la clave vieja para no confundirte, y /status muestra cuál está en uso. Repasa 62.13.' },
    { id: 'deny', type: 'single',
      prompt: 'Tienes <code>deny: ["Bash(aws *)"]</code> y <code>allow: ["Bash(aws s3 ls)"]</code>. El agente pide <code>aws s3 ls</code>. ¿Qué pasa?',
      options: [
        'Corre, porque la regla allow es más específica y la especificidad gana',
        'Pregunta, porque dos reglas en conflicto se resuelven pidiéndote permiso',
        'Corre, porque las reglas allow se leen primero y la primera coincidencia decide',
        'Se bloquea, porque se evalúa deny primero y la primera coincidencia decide'
      ],
      answer: 3,
      explain: 'Claude Code evalúa deny, después ask, después allow, y la especificidad no cambia ese orden. Un allow no puede abrir una excepción dentro de un deny. Repasa 62.10.' },
    { id: 'rechazo', type: 'single',
      prompt: 'Un modelo se niega a una tarea en Claude Code. Pruebas el mismo modelo en OpenCode con otro system prompt. ¿Qué esperas?',
      options: [
        'Que acepte, porque el rechazo lo producía el system prompt de Claude Code',
        'Que acepte, porque OpenCode no envía las políticas de uso del proveedor al modelo',
        'Probablemente el mismo rechazo: viene del entrenamiento y del proveedor, no del harness',
        'Un error de la API, porque cambiar de harness invalida la sesión con el proveedor'
      ],
      answer: 2,
      explain: 'Un harness solo mueve la capa de permisos; lo que el modelo rechaza lo aprendió en el entrenamiento, y la API suma los términos y clasificadores del proveedor. Para trabajo legítimo, lo que funciona es dar contexto claro. Repasa 62.10.' },
    { id: 'moe', type: 'single',
      prompt: 'Un MoE de un billón de parámetros activa 32 mil millones por token. ¿Cuánta memoria piden sus pesos en 4 bits?',
      options: [
        'Unos 16 GB, porque solo se cargan en memoria los expertos activos',
        'Unos 500 GB, porque todos los expertos tienen que estar en memoria',
        'Unos 64 GB, porque los expertos inactivos se guardan comprimidos en disco',
        'Unos 32 GB, porque cada parámetro activo ocupa un byte en 4 bits'
      ],
      answer: 1, fixed: false,
      explain: '10^12 parámetros × 0.5 bytes = 500 GB. Cada token pasa por expertos distintos, así que hay que tenerlos todos cargados: la memoria va con los parámetros totales, el cómputo con los activos. Repasa 62.11.' },
    { id: 'scan', type: 'single',
      prompt: 'DeepSec corre una etapa <code>scan</code> sin IA antes de lanzar agentes. ¿Para qué?',
      options: [
        'Para reducir con matchers baratos y repetibles lo que van a revisar los agentes caros',
        'Para encontrar todas las vulnerabilidades reales, de modo que los agentes solo las confirmen',
        'Para entrenar un modelo propio con el código del repositorio antes de investigarlo',
        'Para descargar los pesos del modelo elegido y dejarlos listos en el disco local'
      ],
      answer: 0,
      explain: 'Cada candidato es una sesión de agente completa; el scan los acota sin gastar tokens y da lo mismo en cada corrida. No pretende encontrar todo: es el filtro barato de un embudo. Repasa 62.9.' },
    { id: 'orden', type: 'order',
      prompt: 'Ordena una vuelta del bucle de un agente.',
      items: [
        'El harness manda al modelo el system, las herramientas y los mensajes',
        'El modelo responde con una llamada a una herramienta',
        'El harness decide el permiso y ejecuta la herramienta',
        'El harness agrega el resultado a los mensajes y vuelve a llamar al modelo'
      ],
      explain: 'El harness arma la request, el modelo pide, el harness ejecuta y devuelve. Se repite hasta que el modelo responde sin llamadas. Repasa 62.5.' }
  ]
});
