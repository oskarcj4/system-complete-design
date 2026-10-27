SD.defineExercise('m63-local', {
  title: 'llevar un harness de Claude a un modelo local',
  scenario: '<p>Tu equipo tiene un harness propio que habla el dialecto de Anthropic y funciona bien con Claude. Por privacidad, un repositorio tiene que revisarse con un modelo local: Qwen3 servido con vLLM en una GPU propia, que habla el dialecto de OpenAI. El harness tiene 12 herramientas, pide varias lecturas por turno y usa streaming para mostrar el progreso. En la primera prueba, el agente termina a mitad de las tareas diciendo cosas como "ahora voy a buscar la función".</p>',
  steps: [
    { id: 'diag', type: 'single',
      prompt: '¿Qué miras primero?',
      options: [
        'La respuesta cruda de vLLM: si el <tool_call> aparece como texto en content, falta el parser',
        'El system prompt del harness, para pedirle al modelo con más énfasis que use herramientas',
        'La temperatura del modelo, que en vLLM por defecto es alta y hace que abandone las tareas',
        'El tamaño de la ventana de contexto, porque doce herramientas no entran en la de Qwen3'
      ],
      answer: 0,
      explain: 'El síntoma (anuncia una acción y termina) es el de una llamada que llegó como texto. Antes de tocar el prompt se mira la salida cruda del servidor: si el <tool_call> está en content, el problema es de infraestructura. Ver 63.4.' },
    { id: 'parser', type: 'single',
      prompt: 'Confirmas que las llamadas vienen como texto. ¿Qué cambias?',
      options: [
        'Un regex en el harness que busque {"name": en el texto y arme la llamada a mano',
        'Levantar vLLM con --enable-auto-tool-choice y --tool-call-parser hermes',
        'Cambiar a tool_choice required para que vLLM sepa que tiene que devolver llamadas',
        'Convertir el modelo a GGUF y servirlo con Ollama, que siempre reconoce las llamadas'
      ],
      answer: 1,
      explain: 'Qwen3 usa el formato estilo Hermes y vLLM lo parsea con esos dos flags (documentado por Qwen). Un regex propio reimplementa mal el parser; Ollama depende igual del template. Ver 63.4.' },
    { id: 'dialecto', type: 'single',
      prompt: 'El harness habla Anthropic y vLLM habla OpenAI. ¿Qué te preocupa más del traductor?',
      options: [
        'Que el traductor agregue latencia, porque cada request pasa por un proceso más',
        'Que los ids de llamada cambien de formato y el modelo no reconozca los suyos',
        'Que is_error se pierda y el modelo crea que una herramienta fallida funcionó',
        'Que el system prompt quede en un mensaje aparte y el modelo lo lea con menos peso'
      ],
      answer: 2,
      explain: 'Los ids y el system se mapean sin pérdida; la latencia de un proxy local es mínima. is_error no existe en OpenAI: si no se escribe en el texto, el agente repite herramientas fallidas convencido de que anduvieron. Ver 63.12.' },
    { id: 'restriccion', type: 'single',
      prompt: 'Una de cada treinta llamadas trae JSON roto. ¿Qué haces?',
      options: [
        'Subir la temperatura para que el modelo explore otras formas de escribir el JSON',
        'Pedir en el system prompt que el modelo revise el JSON antes de cerrar la llamada',
        'Reintentar la request entera cada vez que el parseo falle, hasta tres veces',
        'Activar salidas estructuradas en vLLM para los argumentos, con esquemas estrictos'
      ],
      answer: 3,
      explain: 'Con decodificación restringida el JSON roto es imposible. Reintentar paga turnos y no arregla la causa; pedirlo en el prompt reduce la tasa pero no la lleva a cero. Ver 63.6.' },
    { id: 'paralelo', type: 'single',
      prompt: 'Las tareas tardan el doble de turnos que con Claude, aunque terminan bien. ¿Qué explica la diferencia?',
      options: [
        'El modelo pide menos llamadas por turno que Claude, así que el bucle da más vueltas',
        'vLLM serializa las llamadas en paralelo y las devuelve en turnos separados',
        'El traductor parte cada respuesta con varias llamadas en varios mensajes',
        'El modelo local no recibe los resultados de las lecturas y las vuelve a pedir'
      ],
      answer: 0,
      explain: 'Cada modelo emite llamadas como se entrenó: uno pide tres lecturas juntas, otro de a una. No es un error, es un costo en turnos que se mide al comparar modelos. Ver 63.3 y 63.8.' },
    { id: 'stream', type: 'single',
      prompt: 'Con el streaming activado aparecen errores de parseo que sin streaming no estaban. ¿Dónde está el problema?',
      options: [
        'En vLLM, que no soporta streaming de llamadas y las manda incompletas',
        'En el traductor o el harness: parsean fragmentos de arguments antes del cierre',
        'En el modelo, que genera JSON distinto cuando sabe que la respuesta va en stream',
        'En la red: los eventos SSE llegan desordenados y hay que reordenarlos por tiempo'
      ],
      answer: 1,
      explain: 'Los argumentos llegan en pedazos con un index. Se acumulan por índice y se parsean al terminar; parsear antes falla aunque el modelo haya generado JSON perfecto. Ver 63.10.' }
  ],
  solution: '<ul><li>Diagnóstico por capas: salida cruda del servidor antes que el prompt.</li><li>vLLM con <code>--enable-auto-tool-choice --tool-call-parser hermes</code>.</li><li>Un gateway que traduce Anthropic a OpenAI y escribe <code>is_error</code> como texto explícito, con una prueba de dos llamadas en paralelo, un error y un turno largo.</li><li>Salidas estructuradas para los argumentos, con esquemas cerrados.</li><li>Streaming acumulado por índice, parseo al cierre.</li><li>Medir turnos, tokens y tareas resueltas contra Claude con el mismo set (M65): el modelo local puede necesitar más turnos por emitir de a una llamada.</li></ul>'
});
