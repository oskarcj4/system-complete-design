SD.defineExercise('m70-local', {
  title: 'un asistente de código para un estudio que no puede sacar datos',
  scenario: '<p>Un estudio de software de 8 personas trabaja con el código de un banco. El contrato prohíbe que ese código salga de la red del estudio. Quieren un agente de código para las 8 personas, a veces 4 a la vez. Tienen presupuesto para un servidor con dos GPUs de 48 GB (96 GB en total) y para la API de un modelo grande, que pueden usar con sus proyectos internos, que no son del banco.</p>',
  steps: [
    { id: 'razon', type: 'single',
      prompt: '¿Qué decide que el modelo para el código del banco sea propio?',
      options: [
        'El costo: con 8 personas, un servidor propio sale más barato que la API',
        'El contrato: los datos no pueden salir, y eso es una razón obligatoria',
        'La latencia: un modelo en la red local responde siempre más rápido que una API',
        'La calidad: un modelo propio se puede ajustar al estilo de código del banco'
      ],
      answer: 1,
      explain: 'Es la razón que no se negocia. Por costo, con 8 personas la API sale más barata; la latencia de un modelo local no siempre es menor; ajustar el modelo es otro proyecto. Ver 70.1.' },
    { id: 'servidor', type: 'single',
      prompt: '¿Qué servidor ponen en la máquina de dos GPUs?',
      options: [
        'Ollama, una instancia por persona, cada una con su copia del modelo',
        'vLLM con tensor parallel en las dos GPUs, compartido por las 8 personas',
        'LM Studio en cada laptop, para que nadie dependa de un servidor central',
        'llama.cpp con la mitad de las capas en la CPU para dejar lugar al KV'
      ],
      answer: 1,
      explain: 'Cuatro sesiones a la vez sobre la misma GPU es batching y prefix caching: vLLM. Ocho copias no entran; las laptops no tienen la memoria; capas en CPU vuelven todo lento. Ver 70.2.' },
    { id: 'modelo', type: 'single',
      prompt: 'Tienen 96 GB. ¿Qué modelo eligen para empezar a medir?',
      options: [
        'Kimi K2 en Q2_K, porque es el mejor agente abierto y así entra en la memoria',
        'Un denso de 8B en BF16, para dejar casi toda la memoria libre al KV cache',
        'Qwen3-30B-A3B en FP8, unos 31 GB, con lugar para el KV de varias sesiones',
        'Qwen3-235B-A22B en Q4_K_M, que ocupa unos 141 GB y se reparte con la CPU'
      ],
      answer: 2,
      explain: 'Un billón de parámetros en 2 bits sigue pasando de 250 GB; 235B en 4.8 bits son 141 GB y no entran; un 8B deja memoria pero es un agente flojo. El MoE de 30B entra con KV para varias sesiones y es rápido. Ver 70.4 y 70.5.' },
    { id: 'gateway', type: 'single',
      prompt: '¿Cómo evitan que una tarea del banco termine en la API por error?',
      options: [
        'Un gateway con un nombre "banco" que solo apunta al vLLM, sin fallback',
        'Una regla en el system prompt que le pide al agente no usar la API externa',
        'Un fallback hacia la API solo cuando el vLLM tarde más de 30 segundos',
        'Pedirle a cada persona que revise el modelo configurado antes de empezar'
      ],
      answer: 0,
      explain: 'La regla vive en la infraestructura: el nombre del banco no tiene salida. Un prompt no es un control; un fallback por timeout es justo la fuga; revisar a mano falla tarde o temprano. Ver 70.7.' },
    { id: 'falla', type: 'single',
      prompt: 'El primer día, el agente responde bien preguntas pero nunca edita archivos: las llamadas aparecen como texto. ¿Qué revisan?',
      options: [
        'Que la temperatura esté en 0 para que el modelo siga el formato al pie de la letra',
        'Que vLLM tenga el parser de herramientas del modelo activado',
        'Que el modelo tenga permiso de escritura sobre la carpeta del proyecto',
        'Que el harness use el dialecto de OpenAI y no el de Anthropic'
      ],
      answer: 1,
      explain: 'Llamada como texto es el síntoma del parser: --enable-auto-tool-choice y el --tool-call-parser que corresponde. Los permisos darían un error al editar, no texto. Ver 70.8.' },
    { id: 'medir', type: 'single',
      prompt: '¿Cómo deciden si el modelo local alcanza o si hay que pedir otra excepción al contrato?',
      options: [
        'Con el puntaje del modelo en los benchmarks públicos de agentes de código',
        'Con la opinión de las dos personas que más lo usaron la primera semana',
        'Con su set de tareas internas, varias corridas por tarea, contra el modelo grande',
        'Con el tiempo de respuesta medio del servidor durante una semana de uso'
      ],
      answer: 2,
      explain: 'El set propio con pass^k compara lo que importa: tareas como las suyas. Los benchmarks públicos miden otra cosa, la opinión es anecdótica y la latencia no dice si resuelve. Ver 70.8 y M65.8.' }
  ],
  solution: '<ul><li>Razón: el contrato. El código del banco se queda en la red; los proyectos internos pueden usar la API.</li><li>Servidor: vLLM con tensor parallel en las dos GPUs, prefix caching y el parser de herramientas del modelo.</li><li>Modelo para empezar: Qwen3-30B-A3B en FP8 (unos 31 GB), con lugar para el KV de las sesiones en paralelo.</li><li>Gateway: un nombre "banco" que solo apunta al vLLM y no tiene fallback; otro "interno" que va a la API.</li><li>Medición: set de tareas con varias corridas y pass^k, el modelo local contra el grande en los proyectos internos, antes de decidir si alcanza.</li><li>Operación: versiones fijas del modelo y del servidor, monitoreo de memoria y tokens por segundo, alguien responsable del servidor.</li></ul>'
});
