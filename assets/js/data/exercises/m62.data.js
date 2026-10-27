SD.defineExercise('m62-pila', {
  title: 'la pila de agentes de un equipo chico',
  scenario: '<p>Un equipo de cinco personas mantiene una API de pagos en un monorepo. Quiere usar agentes de programación todos los días y un bot que revise cada PR buscando vulnerabilidades. Para bajar costos, propone usar Kimi por la API de Moonshot. Hay un módulo, <code>conciliacion/</code>, con datos reales de clientes en fixtures. Tienes que decidir la pila capa por capa.</p>',
  steps: [
    { id: 'endpoint', type: 'single',
      prompt: 'El equipo ya usa Claude Code. ¿Cómo lo conectas a Kimi?',
      options: [
        'Pides a Moonshot un plugin de Claude Code que cambie el modelo desde la interfaz del editor',
        'Apuntas ANTHROPIC_BASE_URL al endpoint /anthropic de Moonshot, con su credencial',
        'Descargas los pesos de Kimi y los cargas con Ollama en la laptop de cada persona',
        'Pones un proxy LiteLLM que traduzca Messages a Chat Completions hacia /v1'
      ],
      answer: 1,
      explain: 'Moonshot habla el dialecto de Anthropic en /anthropic: no hace falta traductor. LiteLLM funcionaría, pero suma una pieza y una traducción que puede perder campos. Kimi completo no entra en una laptop (unos 500 GB en 4 bits).' },
    { id: 'datos', type: 'single',
      prompt: 'Antes de usarlo en todo el monorepo, ¿qué revisas?',
      options: [
        'Solo el precio por millón de tokens de entrada y de salida, porque es la razón del cambio',
        'Que el modelo saque buen puntaje en un benchmark público de programación',
        'Qué guarda Moonshot, cuánto tiempo y con qué términos: tu código viaja a su API',
        'Que Claude Code siga actualizándose, porque Anthropic da soporte a endpoints de terceros'
      ],
      answer: 2,
      explain: 'Apuntar un harness a una API es mandarle tu código. Los fixtures con datos de clientes lo hacen más serio. Anthropic no da soporte a endpoints de terceros, y el benchmark no dice nada de tus datos.' },
    { id: 'sensible', type: 'single',
      prompt: '¿Qué haces con <code>conciliacion/</code>?',
      options: [
        'Una regla Read deny sobre la carpeta y listo: el agente no puede leerla de ninguna forma',
        'Modelo local en Ollama para esa carpeta, y los fixtures reales fuera del repositorio',
        'Le pides al modelo en CLAUDE.md que no lea esa carpeta, porque las instrucciones se respetan',
        'Lo trabajas con Kimi igual, porque los proveedores cifran el tráfico con TLS'
      ],
      answer: 1,
      explain: 'Una regla deny es política del harness, no un sandbox, y una instrucción en CLAUDE.md cambia lo que el modelo intenta, no lo que puede. TLS protege el viaje, no lo que el proveedor hace después. Lo que no puede salir, no sale: modelo local, y los datos reales fuera del repositorio.' },
    { id: 'bot', type: 'single',
      prompt: 'El bot de PR corre <code>claude -p</code> en CI. ¿Qué permisos le das?',
      options: [
        'Sin Bash ni edición (--disallowedTools y dontAsk), salida JSON y un tope de turnos',
        'bypassPermissions, porque en CI no hay nadie para aprobar y si no se traba',
        'Todas las herramientas con modo acceptEdits, para que pueda arreglar lo que encuentre',
        'Las mismas reglas que usan las personas, copiadas de su settings.local.json'
      ],
      answer: 0,
      explain: 'Revisar no requiere editar ni correr comandos. Un PR puede traer una injection en un comentario o un README: con solo lectura, lo peor que logra es un mal informe. settings.local.json es personal y no se versiona.' },
    { id: 'costo', type: 'single',
      prompt: 'El primer escaneo de todo el monorepo da 3 000 candidatos. ¿Cómo lo corres?',
      options: [
        'Todos a la vez con concurrencia máxima, para terminar antes y pagar menos',
        'Con un modelo más chico, sin tope, porque el costo por token es bajo',
        'Saltando el scan y dándole el repositorio entero a un solo agente con contexto largo',
        'Con --limit y un tope de gasto la primera vez, y en cada PR solo el diff'
      ],
      answer: 3,
      explain: 'Cada candidato es una sesión de agente completa. La primera corrida acotada te da el costo por candidato con tus números; después, en CI, el diff mantiene el gasto proporcional al cambio. La concurrencia no baja el costo, solo el tiempo, y te acerca al límite de requests por minuto.' },
    { id: 'local', type: 'single',
      prompt: 'Una persona quiere el agente sin ninguna pregunta en su laptop. ¿Qué le recomiendas?',
      options: [
        'Que use --dangerously-skip-permissions directo en su máquina, porque el modelo es confiable',
        'Que mantenga el modo por defecto, porque la autonomía total no se puede hacer segura',
        'Autonomía total en un devcontainer con solo el repositorio y una clave con tope',
        'Que cambie a otro harness que no tenga sistema de permisos y así no le pregunte nada'
      ],
      answer: 2,
      explain: 'Menos preguntas es razonable dentro de una caja desechable: solo el repositorio montado, sin su $HOME ni sus credenciales, y una clave que pueda revocar. Fuera de la caja, un malentendido o una injection en un archivo leído llega a toda su máquina.' }
  ],
  solution: '<ul><li><b>Servidor y dialecto:</b> Claude Code contra <code>https://api.moonshot.ai/anthropic</code>, con <code>ANTHROPIC_BASE_URL</code>, <code>ANTHROPIC_AUTH_TOKEN</code> y el id del modelo copiado de la consola; <code>/status</code> para comprobarlo.</li><li><b>Datos:</b> revisar los términos de Moonshot antes de usarlo; <code>conciliacion/</code> con un modelo local y los fixtures reales fuera del repositorio.</li><li><b>Bot de PR:</b> <code>claude -p</code> con solo lectura, salida JSON y tope de turnos; primera corrida con <code>--limit</code> y tope de gasto, después solo el diff.</li><li><b>Autonomía:</b> sin preguntas solo dentro de un devcontainer con el repositorio y una clave propia con tope.</li><li><b>Medir:</b> el mismo set de tareas del equipo con Claude y con Kimi, repetido, antes de cambiar del todo.</li></ul>'
});
