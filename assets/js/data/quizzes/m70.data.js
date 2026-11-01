SD.defineQuiz('m70', {
  title: 'Quiz: modelos open weights y serving propio', pass: 0.7,
  questions: [
    { id: 'cuando', type: 'single',
      prompt: 'Un equipo de 12 personas gasta 708 USD al mes en una API y propone alquilar una H100 a 2.50 USD por hora "para ahorrar". ¿Qué dice la cuenta?',
      options: [
        'Ahorra: los tokens de un modelo propio no tienen costo por uso, solo la luz del servidor',
        'Cuesta más: 730 horas son unos 1 825 USD, sin operar y con un modelo más flojo',
        'Da igual: el alquiler y la API cuestan parecido si la GPU se usa solo en horario laboral',
        'Ahorra solo si el modelo propio es un MoE, porque lee menos por token'
      ],
      answer: 1,
      explain: 'La GPU se paga ociosa o no. Para ese volumen la API es más barata, y el modelo que entra en una H100 resuelve menos. El propio gana con una razón que no es de costo o con volumen constante. Ver 70.1.' },
    { id: 'servidor', type: 'single',
      prompt: 'Un equipo de 15 personas quiere usar un modelo propio en una sola GPU, varias a la vez. ¿Qué servidor encaja mejor?',
      options: [
        'Ollama, porque es el más fácil de instalar y mantener, y ya habla los dos dialectos de API',
        'LM Studio, porque su interfaz deja ver qué modelo está cargado en cada momento',
        'vLLM, porque mete muchas requests en la misma pasada y reutiliza el prefijo común',
        'llama.cpp, porque puede repartir capas entre la GPU y la CPU cuando falta memoria en la GPU'
      ],
      answer: 2,
      explain: 'Con varias personas a la vez manda el batching y el prefix caching (M15). Ollama y LM Studio están pensados para una persona; repartir capas en la CPU hace todo más lento. Ver 70.2.' },
    { id: 'gguf', type: 'single',
      prompt: '¿Qué trae un archivo GGUF además de los pesos?',
      options: [
        'La arquitectura, el tokenizer y el chat template, todo en el mismo archivo',
        'El código del servidor de inferencia ya compilado para cada tipo de GPU compatible',
        'Un resumen de los datos de entrenamiento, para poder recalibrar la cuantización',
        'Una licencia firmada que el servidor verifica antes de cargar el modelo'
      ],
      answer: 0,
      explain: 'GGUF es un solo archivo con metadatos (arquitectura, tokenizer, chat template, tipo de cuantización) y tensores. No trae código ni datos de entrenamiento. Ver 70.3.' },
    { id: 'q4km', type: 'single',
      prompt: 'Un modelo de 30.5 mil millones de parámetros en <code>Q4_K_M</code>. ¿Cuánto ocupan los pesos, aproximadamente?',
      options: ['15.3 GB', '18.3 GB', '30.5 GB', '61 GB'], fixed: true,
      answer: 1,
      explain: 'Q4_K_M son unos 4.8 bits por peso, no 4: 30.5 × 10^9 × 4.8 ÷ 8 = 18.3 GB. 15.3 sería 4 bits exactos; 61, BF16. Ver 70.3 y 70.5.' },
    { id: 'moe', type: 'single',
      prompt: 'Kimi K2 tiene un billón de parámetros y 32 mil millones activos. ¿Por qué no entra en una GPU de 80 GB aunque "use" 32?',
      options: [
        'Porque el KV cache de un MoE guarda una copia por cada experto activo',
        'Porque el router puede elegir cualquier experto en el próximo token y todos deben estar cargados',
        'Porque los expertos inactivos se mantienen siempre en 16 bits aunque el resto del modelo esté cuantizado',
        'Porque la licencia de los pesos abiertos exige servir el modelo completo dentro de un solo nodo'
      ],
      answer: 1,
      explain: 'La memoria la deciden los parámetros totales; los activos, el cálculo y lo que se lee por token. El KV no se copia por experto. Ver 70.4.' },
    { id: 'cota', type: 'single',
      prompt: 'En una GPU con 1 000 GB/s de ancho de banda, ¿cuál es la cota superior del decode de una conversación con un MoE que lee 2 GB de parámetros activos por token?',
      options: ['50 tokens/s', '200 tokens/s', '500 tokens/s', '2 000 tokens/s'], fixed: true,
      answer: 2,
      explain: 'Ancho de banda ÷ bytes leídos por token: 1 000 ÷ 2 = 500. Es una cota: la real es menor porque también se leen el KV y otras cosas. Ver 70.4.' },
    { id: 'kv', type: 'single',
      prompt: 'Qwen3-30B-A3B entra justo en 24 GB con 32 768 tokens de contexto. Quieres el doble de contexto. ¿Qué cambio es el más directo?',
      options: [
        'Pasar el KV cache a q8_0, que lo divide por dos con poca pérdida',
        'Pasar los pesos de Q4_K_M a Q8_0 para que la atención sea más precisa',
        'Activar tensor parallel en la misma GPU para repartir la memoria del KV',
        'Bajar max_tokens de la respuesta, que es lo que más ocupa en el KV'
      ],
      answer: 0,
      explain: 'El KV crece con el contexto: con el doble no entra en 16 bits y sí en 8. Q8_0 en los pesos ocupa más; tensor parallel necesita varias GPUs; max_tokens es una parte chica del contexto. Ver 70.5.' },
    { id: 'contexto', type: 'single',
      prompt: 'Conectas Claude Code a Ollama en una GPU de 16 GB y el agente ignora las herramientas desde el primer turno. ¿Qué revisas primero?',
      options: [
        'La versión del dialecto de Anthropic, porque Ollama solo habla el de OpenAI',
        'La temperatura, porque con temperatura alta el modelo deja de llamar herramientas y responde con texto',
        'El contexto: con menos de 24 GiB Ollama usa 4 096 tokens y corta el comienzo del prompt',
        'La clave de API, porque Ollama rechaza el token y responde con texto genérico'
      ],
      answer: 2,
      explain: 'Ollama elige el contexto por VRAM; con menos de 24 GiB son 4 096 tokens, y el prompt de un harness se pasa de eso. Ollama habla Anthropic desde la 0.14.0 y no revisa la clave. Ver 70.5 y 70.8.' },
    { id: 'fallback', type: 'multi',
      prompt: 'Configuras un gateway con los nombres "confidencial", "barato" y "difícil". ¿Qué reglas son sensatas? Marca todas las que correspondan.',
      options: [
        '"barato" cae a la API si el vLLM propio falla',
        '"confidencial" no tiene fallback hacia un proveedor externo',
        'Un clasificador decide en cada request si va a "barato" o a "difícil"',
        'El gateway registra equipo, modelo y tokens de cada request'
      ],
      answer: [0, 1, 3],
      explain: 'Fallback hacia arriba sí, hacia afuera con datos confidenciales no; el gateway es la fuente del costo. Elegir el nombre por tipo de tarea suele funcionar mejor que un clasificador por request. Ver 70.7.' },
    { id: 'parser', type: 'single',
      prompt: 'Con vLLM, la llamada del modelo aparece en la respuesta como texto <code>&lt;tool_call&gt;{…}</code> y el bucle del harness termina. ¿Cuál es la causa más probable?',
      options: [
        'El modelo no fue entrenado con herramientas y hay que cambiarlo por otro',
        'El servidor no tiene el parser de herramientas activado, o no es el del modelo',
        'El harness usa el dialecto de Anthropic y vLLM no reconoce los bloques tool_use',
        'El contexto es demasiado corto y el modelo cortó la llamada a la mitad'
      ],
      answer: 1,
      explain: 'El modelo emitió la llamada en su formato; falta que el servidor la convierta (--enable-auto-tool-choice y el --tool-call-parser que corresponde). Ver 70.8 y M63.4.' }
  ]
});
