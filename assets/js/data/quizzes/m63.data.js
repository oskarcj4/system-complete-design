SD.defineQuiz('m63', {
  title: 'Quiz: tool calling por dentro', pass: 0.7,
  questions: [
    { id: 'template', type: 'single',
      prompt: 'Mandas a vLLM una request con <code>tools</code> para Qwen3. ¿Qué recibe el modelo?',
      options: [
        'Un solo texto armado por el chat template, con las herramientas escritas dentro del system',
        'El JSON de la request tal cual, porque los modelos con tool calling se entrenan para leer JSON',
        'Los mensajes como texto y las herramientas por un canal aparte que no consume tokens de entrada',
        'Un embedding por herramienta que el servidor suma al estado oculto antes de la primera capa'
      ],
      answer: 0,
      explain: 'El modelo solo ve tokens. El chat template (Jinja, en tokenizer_config.json) convierte mensajes y herramientas en un texto con tokens especiales; las herramientas son texto en el system y se pagan como entrada. Ver 63.2.' },
    { id: 'texto', type: 'single',
      prompt: 'Con un modelo local, el agente a veces termina diciendo "voy a leer el archivo" sin leerlo. ¿Cuál es la causa más probable?',
      options: [
        'El modelo tiene la ventana de contexto llena y descarta en silencio las herramientas de la request',
        'La llamada salió como texto: el parser del servidor no la reconoció o el JSON estaba roto',
        'El harness usa tool_choice none por defecto cuando el servidor no es de un proveedor',
        'El modelo eligió responder sin herramientas porque la temperatura estaba demasiado alta'
      ],
      answer: 1,
      explain: 'Un JSON roto o un formato que el parser no conoce no da error: da texto. Para el bucle, sin tool_calls significa que terminó. Se arregla con el parser correcto y detectando restos de llamada en el harness. Ver 63.4.' },
    { id: 'ollama', type: 'single',
      prompt: 'Ollama responde <code>does not support tools</code> con un modelo que, según su model card, sí soporta herramientas. ¿Qué cambias?',
      options: [
        'El dialecto del harness: Ollama solo acepta herramientas en el dialecto de Anthropic',
        'El parámetro tool_choice, que debe ser auto para que Ollama active el soporte',
        'La variante del modelo o su template: el que bajaste no trae la parte de herramientas',
        'La cuantización: los modelos en 4 bits pierden la capacidad de emitir llamadas válidas'
      ],
      answer: 2,
      explain: 'Ese error sale cuando el template del modelo no tiene la sección de herramientas. El arreglo es una variante con el template correcto o un Modelfile con el template oficial. Ver 63.2.' },
    { id: 'garantia', type: 'single',
      prompt: 'Activas decodificación restringida con el esquema de <code>leer_archivo</code>. ¿Qué queda garantizado?',
      options: [
        'Que la ruta exista en el proyecto, porque la gramática se compila contra el sistema de archivos',
        'Que el modelo elija la herramienta correcta para la tarea, porque la máscara descarta las demás',
        'Que la calidad de la decisión mejore, porque el modelo ya no gasta probabilidad en tokens inválidos',
        'Que los argumentos cumplan la forma del esquema: tipos, campos obligatorios y valores del enum'
      ],
      answer: 3,
      explain: 'La gramática garantiza la forma, no el contenido: no sabe si el archivo existe ni si leer era lo correcto. Y si fuerza una opción que el modelo no quería, la calidad puede bajar. Ver 63.6.' },
    { id: 'strict', type: 'single',
      prompt: 'En el modo estricto de OpenAI, ¿cómo se declara un argumento opcional?',
      options: [
        'Se lo deja fuera de required y se agrega "optional": true en su definición',
        'Se lo pone en required con un tipo que admite null, y additionalProperties en false',
        'Se lo declara en un segundo esquema anidado que el modelo puede omitir',
        'Se usa additionalProperties: true para que el modelo pueda agregarlo cuando le haga falta'
      ],
      answer: 1,
      explain: 'El modo estricto exige que todos los campos estén en required y additionalProperties: false; lo opcional se expresa como ["integer", "null"]. Ver 63.5.' },
    { id: 'forzar', type: 'single',
      prompt: 'Forzaste una herramienta con <code>tool_choice: {"type": "tool"}</code> en Anthropic. ¿Qué pierdes?',
      options: [
        'El texto y el thinking antes de la llamada, porque la API pre-llena el turno con el tool_use',
        'La validación del esquema, porque forzar la herramienta desactiva el modo estricto',
        'Las llamadas en paralelo a otras herramientas, que quedan acumuladas para el turno siguiente del bucle',
        'La caché de las definiciones de herramientas, que se vuelven a procesar en cada request'
      ],
      answer: 0,
      explain: 'Con any o tool la respuesta empieza directamente con el tool_use: sin texto ni thinking. Además, en los modelos más nuevos forzar da 400 y se recomienda auto con strict. Cambiar tool_choice invalida la caché de los mensajes, no la de las herramientas. Ver 63.7.' },
    { id: 'paralelo', type: 'multi',
      prompt: 'El modelo pide tres herramientas en un turno: dos lecturas y una edición. ¿Qué es correcto en el harness? (varias)',
      options: [
        'Correr las dos lecturas a la vez y la edición sola',
        'Mandar un tool_result por cada id, todos en el mismo mensaje user',
        'Responder solo la edición, que es la que tiene efectos, y omitir las lecturas',
        'Ejecutar las tres a la vez, porque el modelo ya decidió que son independientes'
      ],
      answer: [0, 1],
      explain: 'Cada llamada necesita su resultado (si falta uno, 400). Que el modelo las pida juntas no las hace seguras en concurrencia: las lecturas pueden ir a la vez, lo que escribe va en orden. Ver 63.8.' },
    { id: 'maxtokens', type: 'single',
      prompt: 'Un turno vuelve con <code>stop_reason: "max_tokens"</code> y el último bloque es un <code>tool_use</code>. ¿Qué haces?',
      options: [
        'Ejecutarlo: si la API lo marcó como tool_use, los argumentos ya fueron validados',
        'Reenviar la misma request sin cambios, porque max_tokens es un error transitorio',
        'No ejecutarlo: los argumentos pueden estar cortados; subes el límite o compactas',
        'Ejecutarlo con tool_choice none en el turno siguiente para que el modelo lo cierre'
      ],
      answer: 2,
      explain: 'Con max_tokens la generación se cortó, y la última llamada puede ser JSON a medias. Ejecutarla es ejecutar algo que el modelo no terminó de pedir. Ver 63.9.' },
    { id: 'stream', type: 'single',
      prompt: 'Con streaming, tu harness falla con errores de JSON que no aparecen sin streaming. ¿Por qué?',
      options: [
        'El servidor comprime los argumentos en streaming y hay que descomprimirlos antes',
        'Los fragmentos de distintas llamadas llegan mezclados en un solo string que después ya no se puede separar',
        'En streaming el modelo no usa la decodificación restringida y genera JSON inválido',
        'Parsea cada input_json_delta, que es JSON parcial; hay que acumular por índice y parsear al cierre'
      ],
      answer: 3,
      explain: 'Cada delta es un pedazo ("{\"ru"). Se concatena en el buffer de su índice (los índices separan llamadas intercaladas) y se parsea en content_block_stop. Ver 63.10.' },
    { id: 'traducir', type: 'single',
      prompt: 'Un gateway traduce de Anthropic a OpenAI. Una herramienta devolvió <code>is_error: true</code>. ¿Qué tiene que hacer el gateway?',
      options: [
        'Escribir el error de forma explícita en el content del mensaje tool, porque OpenAI no tiene ese campo',
        'Descartar el resultado y repetir la llamada, porque OpenAI no acepta resultados de error',
        'Mapearlo a finish_reason: "error" en la respuesta siguiente para que el modelo lo vea',
        'Pasarlo como campo is_error dentro del mensaje tool, que OpenAI acepta aunque no aparezca en su documentación'
      ],
      answer: 0,
      explain: 'OpenAI no tiene equivalente de is_error: si el traductor lo tira, el modelo cree que la herramienta funcionó. La convención es escribirlo en el texto ("Error: …"). Ver 63.12.' }
  ]
});
