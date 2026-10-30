SD.defineExercise('m67-extender', {
  title: 'ordenar las extensiones de un equipo',
  scenario: '<p>Un equipo de 15 personas usa Claude Code en un monorepo de TypeScript con un servicio de facturación en PostgreSQL. Su <code>CLAUDE.md</code> tiene 900 líneas: comandos, convenciones, la guía completa de migraciones, el runbook de deploy y una lista de 40 reglas de estilo. Cada persona instaló por su cuenta entre 6 y 12 servidores MCP. Al abrir una sesión, <code>/context</code> muestra el 34&#8239;% de la ventana ocupado antes del primer pedido. Decide paso a paso.</p>',
  steps: [
    { id: 'guia', type: 'single',
      prompt: '¿Qué haces con la guía de migraciones de 300 líneas que está en CLAUDE.md?',
      options: [
        'La dejas en CLAUDE.md, porque el modelo tiene que conocerla antes de tocar cualquier archivo',
        'La pasas a una skill cuya descripción nombre las migraciones y su carpeta',
        'La conviertes en un hook PreToolUse que la imprima cada vez que el agente edita un archivo',
        'La mueves a un servidor MCP que la sirva como recurso'
      ],
      answer: 1,
      explain: 'Se usa en una fracción de las tareas: es conocimiento bajo demanda. Un hook que la imprime la vuelve a meter al contexto; un servidor MCP para un texto estático es infraestructura de más.' },
    { id: 'estilo', type: 'single',
      prompt: 'Las 40 reglas de estilo (comillas, punto y coma, imports ordenados). ¿Dónde van?',
      options: [
        'En una skill de estilo que el modelo cargue cada vez que escriba código nuevo',
        'En las primeras líneas de CLAUDE.md, para que el modelo les preste más atención',
        'En Prettier y ESLint, con un hook PostToolUse que los corra',
        'En un subagente revisor de estilo que lea cada archivo editado y devuelva los errores'
      ],
      answer: 2,
      explain: 'Una regla que una herramienta comprueba no se le pide al modelo. El hook la aplica siempre, sin tokens. Un subagente por cada edición es caro y lento.' },
    { id: 'mcp', type: 'single',
      prompt: 'Cada persona tiene entre 6 y 12 servidores. ¿Cómo ordenas los MCP?',
      options: [
        'Los del equipo en .mcp.json con versión fija y búsqueda; los personales, en local',
        'Todos en .mcp.json, para que cada persona tenga los servidores de todas las demás',
        'Ninguno: se prohíben los servidores MCP y el agente usa solo bash con curl a las APIs',
        'Cada uno en user, para que no ocupen espacio en el repositorio y cada uno elija los suyos'
      ],
      answer: 0,
      explain: 'Lo compartido se versiona y se revisa; lo personal no se le impone al resto. Unirlos todos suma definiciones; curl suelto pierde la autorización y el diseño de las herramientas.' },
    { id: 'base', type: 'single',
      prompt: 'Varios piden un servidor MCP de la base de facturación. ¿Cómo lo das?',
      options: [
        'Con el usuario de la aplicación, porque ya tiene los permisos que necesita el código',
        'Con un usuario de solo lectura, y una regla en CLAUDE.md que diga no modificar datos',
        'Con un rol de la base que solo puede leer una réplica de staging',
        'Con el usuario administrador en una sesión con modo plan, que impide las escrituras'
      ],
      answer: 2,
      explain: 'El permiso lo impone la base, no el texto ni el modo del harness (el modo plan no ve dentro de un servidor MCP). Una réplica de staging saca además los datos reales de la trifecta.' },
    { id: 'investigar', type: 'single',
      prompt: 'Una tarea frecuente es "¿qué servicios llaman a esta función?", que lee decenas de archivos. ¿Qué agregas?',
      options: [
        'Una línea en CLAUDE.md que pida buscar con cuidado en todo el monorepo',
        'Un subagente de solo lectura con un modelo chico que devuelva la lista de llamadas',
        'Un hook SessionStart que precargue el grafo de dependencias completo en cada sesión',
        'Una skill con el procedimiento de búsqueda, para que el modelo lo siga en su contexto'
      ],
      answer: 1,
      explain: 'Lee mucho y devuelve poco: es el caso del subagente. La skill daría el procedimiento, pero las lecturas quedarían en el contexto principal; el hook precarga todo en cada sesión.' },
    { id: 'repartir', type: 'single',
      prompt: '¿Cómo llega todo esto a las 15 personas y se mantiene al día?',
      options: [
        'Un documento en la wiki con los pasos para copiar cada archivo en ~/.claude',
        'Un plugin del proyecto en un marketplace interno, con versión, instalado con --scope project',
        'Un script de bash que cada persona corre al empezar el día y sobrescribe su configuración',
        'Un CLAUDE.md más largo que explique cómo instalar cada skill, hook y subagente'
      ],
      answer: 1,
      explain: 'El plugin empaqueta skills, hooks, subagentes y servidores con una versión que se actualiza de una vez. La wiki y el script divergen; el CLAUDE.md más largo deshace el primer paso.' }
  ],
  solution: '<ul><li>CLAUDE.md de unas 60 líneas: comandos, convenciones que no se deducen del código y punteros a las skills.</li><li>Skills <code>migraciones</code> y <code>deploy</code> (esta última con <code>disable-model-invocation: true</code>).</li><li>Estilo en Prettier y ESLint, aplicados con un hook <code>PostToolUse</code> sobre <code>Edit|Write</code>; las pruebas en un hook <code>Stop</code>.</li><li>Servidores del equipo en <code>.mcp.json</code> con versión fijada y búsqueda de herramientas; la base, con un rol de lectura sobre una réplica de staging.</li><li>Un subagente <code>buscar-llamadas</code> de solo lectura con un modelo chico.</li><li>Todo en un plugin del proyecto, versionado en el marketplace interno. Meta: menos del 10&#8239;% de la ventana al empezar.</li></ul>'
});
