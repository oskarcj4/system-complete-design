SD.defineQuiz('m69', {
  title: 'Quiz: orquestadores de agentes', pass: 0.7,
  questions: [
    { id: 'cuando', type: 'single',
      prompt: 'Tienes que revisar 1 200 archivos. ¿Cuál es la razón principal para usar muchos agentes chicos y no uno con una ventana de contexto enorme?',
      options: [
        'Cada agente empieza con contexto limpio, falla por separado y el trabajo hecho se guarda',
        'Los modelos cobran menos por token cuando la request es corta que cuando es larga',
        'Un solo agente no puede leer más de un archivo por sesión con las herramientas de lectura',
        'Los proveedores no admiten sesiones de más de una hora con el mismo identificador'
      ],
      answer: 0,
      explain: 'El agente solo acumula contexto hasta compactar y olvidar, y una falla a mitad pierde todo. El precio por token no cambia con el largo, y nada impide leer muchos archivos en una sesión. Ver 69.1.' },
    { id: 'bare', type: 'single',
      prompt: 'Un orquestador lanza <code>claude -p</code> sobre repositorios de terceros. ¿Por qué agregar <code>--bare</code>?',
      options: [
        'Porque sin él la salida llega como texto libre y no se puede pedir el formato JSON',
        'Porque sin él se cargan los hooks y los servidores MCP del repositorio, sin aprobación',
        'Porque sin él el harness usa el modelo más caro disponible para la cuenta de la clave',
        'Porque sin él el proceso queda esperando en la terminal que alguien apruebe cada herramienta'
      ],
      answer: 1,
      explain: 'Sin --bare, -p carga .claude/settings.json y .mcp.json del proyecto como una sesión interactiva, sin el diálogo de confianza: el repositorio decide qué código corre. --output-format json funciona con o sin --bare, y en headless las aprobaciones pendientes se niegan, no se esperan. Ver 69.2.' },
    { id: 'allowed', type: 'single',
      prompt: '¿Qué hace <code>--allowedTools "Read,Grep"</code> en un comando headless?',
      options: [
        'Restringe el agente a esas dos herramientas y bloquea todas las demás de la sesión',
        'Aprueba esas dos sin preguntar, pero no impide usar las otras si las reglas las permiten',
        'Define cuáles herramientas se describen al modelo en el system prompt de la sesión',
        'Activa el sandbox de solo lectura del sistema operativo para todo el proceso del harness'
      ],
      answer: 1,
      explain: 'allowedTools es una lista de aprobación automática, no una restricción. Para solo lectura se quitan herramientas con --disallowedTools y se usa --permission-mode dontAsk para negar lo que pediría permiso. Ver 69.2.' },
    { id: 'structured', type: 'single',
      prompt: 'Una tarea termina con <code>subtype: "error_max_turns"</code> y sin <code>structured_output</code>. ¿Cómo la registra el orquestador?',
      options: [
        'Como analizada sin hallazgos, porque el agente no encontró nada que reportar',
        'Como error, para reintentarla: nadie terminó de revisar esos archivos',
        'Como analizada, guardando el campo result en texto libre como hallazgo',
        'Como pendiente de revalidación, para que otro agente decida si había algo'
      ],
      answer: 1,
      explain: 'Sin salida estructurada no hay resultado: contarla como limpia marca como revisado algo que nadie revisó. Va a error y se reintenta. Revalidar es para hallazgos que existen. Ver 69.3 y 69.8.' },
    { id: 'lote', type: 'single',
      prompt: 'Con 15 000 tokens de arranque por sesión, ¿qué ahorra pasar de un agente por archivo (1 200) a lotes de 5 archivos?',
      options: [
        'Unos 14.4 millones de tokens de arranque, porque se pagan 240 arranques y no 1 200',
        'Nada, porque el prompt caching ya hace gratis el system prompt repetido en cada sesión',
        'La mitad del costo total de la corrida, porque cada archivo se lee una vez menos',
        'Unos 3.6 millones de tokens, que es lo que ocupan los arranques de los 240 lotes'
      ],
      answer: 0,
      explain: '1 200 × 15 000 = 18 millones contra 240 × 15 000 = 3.6 millones: se ahorran 14.4 millones. El caching abarata el prefijo pero no lo hace gratis, y los archivos se leen igual. Ver 69.4.' },
    { id: 'lease', type: 'single',
      prompt: 'Un worker muere con <code>kill -9</code> mientras tiene tres archivos en <code>processing</code>. ¿Qué diseño los libera sin intervención?',
      options: [
        'Reintentar la corrida entera desde cero, borrando el estado guardado en disco',
        'Un reclamo con plazo que vence solo, y un cierre que comprueba quién tiene la tarea',
        'Un lock sin plazo que se libera cuando el proceso del worker cierra sus archivos',
        'Un segundo worker que vigila al primero y le reenvía las tareas si deja de responder'
      ],
      answer: 1,
      explain: 'Un lease vence y la tarea vuelve a estar disponible; el cierre condicionado al run_id hace de fencing token para que el worker viejo no escriba tarde. Un kill -9 no deja limpiar nada. Ver 69.5.' },
    { id: 'rpm', type: 'single',
      prompt: 'Cada lote hace 40 llamadas en 6 minutos y tu clave admite 50 requests por minuto. ¿Qué pasa si subes de 7 a 20 lotes a la vez?',
      options: [
        'La corrida termina casi tres veces antes, porque hay casi tres veces más agentes',
        'Llegan 429 y reintentos, y la corrida no termina antes: el límite fija el ritmo',
        'El proveedor sube el límite solo cuando detecta tráfico sostenido de la misma clave',
        'Cada agente hace menos llamadas por lote, porque comparten la ventana de contexto'
      ],
      answer: 1,
      explain: '20 × 40 ÷ 6 ≈ 133 requests por minuto contra un límite de 50: las que sobran vuelven con 429 y los backoffs se acumulan. El máximo útil es 50 ÷ 6.7 ≈ 7. Ver 69.6.' },
    { id: 'tope', type: 'single',
      prompt: 'Tope de 20 USD, 1.50 USD por lote, 5 lotes en vuelo y el tope se revisa al terminar cada lote. ¿Cuánto puede gastar la corrida como máximo?',
      options: [
        'Exactamente 20 USD, porque el tope corta los lotes en vuelo en cuanto se alcanza',
        'Unos 26 USD: lo que entró en el tope más los 4 lotes que estaban en vuelo',
        'Unos 27.50 USD: el tope más los 5 lotes que estaban en vuelo al alcanzarlo',
        'Unos 21.50 USD, porque solo puede pasarse en el lote que estaba terminando'
      ],
      answer: 1,
      explain: 'Entran 13 lotes (19.50 USD); al terminar el que alcanza el tope quedan 4 en vuelo que terminan igual: 6 USD más. La cota es (lotes en vuelo − 1) × costo por lote. Para no pasarlo, se reserva antes de lanzar. Ver 69.7.' },
    { id: 'revalidar', type: 'multi',
      prompt: '¿Qué es cierto de la revalidación de hallazgos? Marca todas.',
      options: [
        'El revalidador recibe el hallazgo, no la conversación que lo produjo',
        'Cuesta parecido a investigar, por eso se usa en la severidad alta',
        'Sube el recall, porque encuentra lo que el scan no marcó como candidato',
        'Anota un veredicto en el hallazgo sin borrar lo que había antes'
      ],
      answer: [0, 1, 3],
      explain: 'Otro contexto evita heredar el razonamiento del primero; relee el código, así que cuesta parecido; y anota sin borrar. No sube el recall: el techo lo ponen los matchers. Ver 69.9.' },
    { id: 'aislar', type: 'single',
      prompt: 'Un archivo analizado trae un comentario que pide mandar <code>$ANTHROPIC_API_KEY</code> a un dominio externo. ¿Qué lo hace inofensivo en el modo sandbox?',
      options: [
        'Que el prompt del orquestador le prohíbe al agente seguir instrucciones del código',
        'Que la clave no está en la caja y la salida solo llega a los hosts del modelo',
        'Que el modelo detecta el comentario como injection y lo ignora en todos los casos',
        'Que la copia del código se sube sin comentarios, porque el tarball los elimina'
      ],
      answer: 1,
      explain: 'La credencial queda en el host y la agrega la salida, que solo deja pasar hacia los hosts del modelo. El prompt y el modelo ayudan, pero no son garantías; el tarball excluye .git, no los comentarios. Ver 69.10.' },
    { id: 'ci', type: 'single',
      prompt: 'En el job de CI, ¿por qué la clave del modelo va solo en el paso del escaneo?',
      options: [
        'Porque GitHub cobra los secretos por paso y así el job sale más barato',
        'Porque otros pasos, como pnpm install, corren código de dependencias que podría leerla',
        'Porque DeepSec rechaza la clave si la encuentra definida en más de un paso del job',
        'Porque los secretos de un job entero no llegan a los pasos que usan pnpm'
      ],
      answer: 1,
      explain: 'Los scripts de instalación de dependencias corren código de terceros. Con la clave en todo el job, cualquiera de ellos podría leerla. Es la misma advertencia de Codex sobre CODEX_API_KEY. Ver 69.11.' }
  ]
});
