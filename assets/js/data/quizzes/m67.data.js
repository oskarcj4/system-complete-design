SD.defineQuiz('m67', {
  title: 'Quiz: extender un harness', pass: 0.7,
  questions: [
    { id: 'turno', type: 'single',
      prompt: '¿Cuál de estas extensiones se paga entera en cada turno, aunque la tarea no la use?',
      options: [
        'El cuerpo de una skill instalada, porque el harness lo carga al empezar la sesión',
        'El archivo de memoria, que entra completo al system prompt al empezar',
        'Un hook PostToolUse, porque su programa se agrega al contexto para que el modelo lo conozca',
        'El trabajo de un subagente, que se suma al contexto principal cuando termina su tarea'
      ],
      answer: 1,
      explain: 'De una skill entra al empezar solo la descripción; un hook no entra; de un subagente vuelve solo el resultado. Ver 67.1.' },
    { id: 'alcance', type: 'single',
      prompt: 'Quieres que todo el equipo tenga el servidor MCP de Linear al clonar el repositorio. ¿Qué alcance usas?',
      options: [
        'user, porque así queda en el ~/.claude.json de cada persona sin tocar el repositorio',
        'local, que es el alcance por defecto y el que se comparte con quien clona el proyecto',
        'project, que lo guarda en .mcp.json, versionado, y pide aprobación antes de usarlo',
        'Ninguno: los servidores remotos no se configuran, se descubren solos por OAuth'
      ],
      answer: 2,
      explain: 'local y user viven en ~/.claude.json de una sola persona. project se versiona con el repositorio. Ver 67.2.' },
    { id: 'npx', type: 'single',
      prompt: 'Un .mcp.json arranca un servidor con <code>npx -y @org/servidor</code>, sin versión. ¿Cuál es el problema?',
      options: [
        'Que npx no funciona por stdio y el servidor nunca termina de conectarse con el host',
        'Que cada sesión puede ejecutar una versión nueva publicada por cualquiera con acceso al paquete',
        'Que sin versión el servidor no declara sus herramientas y el harness no puede listarlas',
        'Ninguno: npx usa siempre la versión que quedó en la caché la primera vez que se instaló'
      ],
      answer: 1,
      explain: 'Sin versión fijada, npx resuelve la última publicada: es una dependencia sin lockfile que corre con tus permisos. Ver 67.2 y M56.' },
    { id: 'busqueda', type: 'single',
      prompt: 'Con <code>ENABLE_TOOL_SEARCH=auto</code>, ¿qué hace Claude Code?',
      options: [
        'Busca siempre, salvo que la persona marque algunas herramientas como fijas en la configuración',
        'Carga todo por adelantado y solo busca cuando el modelo pide una herramienta que no existe',
        'Deja que el modelo decida en cada turno si quiere cargar todas las definiciones o buscarlas',
        'Carga todo mientras las definiciones ocupen menos del 10 % de la ventana, y busca si pasan'
      ],
      answer: 3,
      explain: 'auto compara el tamaño de las definiciones con la ventana; auto:N cambia el porcentaje. Ver 67.3.' },
    { id: 'cache', type: 'single',
      prompt: 'Tus definiciones MCP suman 50 000 tokens y están en el prefijo cacheado. ¿Qué sigue siendo un problema?',
      options: [
        'Nada: con caché se pagan a una décima y el modelo las ignora porque ya las vio',
        'Que el caché expira en cada turno porque las herramientas se reordenan al conectarse',
        'Que ocupan ventana y atención del modelo aunque el costo baje a una décima',
        'Que el caché no admite definiciones de herramientas, solo el system prompt y los mensajes'
      ],
      answer: 2,
      explain: 'El caché baja el costo, no el tamaño ni la competencia por la atención. Ver 67.3 y M68.' },
    { id: 'desc', type: 'single',
      prompt: 'Una skill bien escrita nunca se usa sola. ¿Qué es lo primero que revisas?',
      options: [
        'La descripción: es lo único que el modelo lee para decidir, y tiene que decir cuándo usarla',
        'El largo del cuerpo, porque una skill de más de 100 líneas el harness la ignora sin avisar',
        'Que esté en ~/.claude/skills y no en el proyecto, porque las del proyecto solo se invocan a mano',
        'El campo allowed-tools, porque sin él la skill no tiene permiso para cargarse'
      ],
      answer: 0,
      explain: 'Al empezar solo entran nombre y descripción. Si no nombran la situación con las palabras del pedido, el modelo no la elige. Ver 67.4.' },
    { id: 'allowed', type: 'single',
      prompt: 'Una skill declara <code>allowed-tools: Read Grep</code>. Mientras está activa, el modelo pide <code>Bash(rm -rf build)</code>. ¿Qué pasa?',
      options: [
        'Se niega, porque la skill limita las herramientas a las de su lista mientras está activa',
        'Se ejecuta sin preguntar, porque una skill activa hereda todos los permisos del usuario',
        'Sigue las reglas y el modo de siempre: allowed-tools aprueba sin preguntar, no restringe',
        'La skill se desactiva sola porque el modelo pidió algo fuera de su lista'
      ],
      answer: 2,
      explain: 'allowed-tools pre-aprueba las de la lista. Para restringir hay disallowed-tools y las reglas deny. Ver 67.4.' },
    { id: 'stop', type: 'single',
      prompt: 'Un hook <code>Stop</code> corre las pruebas y sale con código 2 si fallan. El agente queda en un bucle sin fin. ¿Qué falta?',
      options: [
        'Mover el hook a PostToolUse, para que corra después de cada edición en lugar de al final',
        'Revisar stop_hook_active y salir con 0 si el agente ya sigue por un pedido anterior del hook',
        'Salir con código 1 en lugar de 2, que es el que indica que el agente tiene que seguir',
        'Un timeout más corto, para que el harness mate el hook y el agente pueda terminar'
      ],
      answer: 1,
      explain: 'stop_hook_active indica que el agente ya continúa por un hook. Sin ese corte, un error que no sabe arreglar no termina nunca. Ver 67.5.' },
    { id: 'sub', type: 'single',
      prompt: '¿Qué ventaja tiene declarar un servidor MCP en el frontmatter de un subagente y no en el proyecto?',
      options: [
        'Que el servidor corre dentro del sandbox del subagente y no con los permisos del usuario',
        'Que sus definiciones entran solo en el contexto del subagente, no en el principal',
        'Que el subagente puede usar el servidor sin OAuth, porque hereda la sesión del principal',
        'Ninguna: los servidores MCP de un subagente se agregan al contexto principal al terminar'
      ],
      answer: 1,
      explain: 'Lo que se declara en el subagente se carga en su contexto. El agente principal no paga esas definiciones. Ver 67.6.' },
    { id: 'riesgos', type: 'multi',
      prompt: '¿Qué partes de un plugin corren en tu máquina con tus permisos? Marca todas las que correspondan.',
      options: [
        'Sus hooks, que el harness ejecuta como programas en cada evento',
        'Sus servidores MCP por stdio, que el harness arranca como subprocesos',
        'Las descripciones de sus skills, que el harness ejecuta para decidir cuándo cargarlas',
        'Sus servidores MCP remotos, que el harness descarga y corre en un contenedor local'
      ],
      answer: [0, 1],
      explain: 'Las descripciones son texto que entra al contexto, no código. Un servidor remoto corre en otra máquina; lo que sale son los argumentos. Ver 67.10.' }
  ]
});
