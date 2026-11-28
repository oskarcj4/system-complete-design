/* Decisiones guiadas de IA06 (Un agente de voz). Formato en core/exercise.js. */

SD.defineExercise('ia06-voz', {
  title: 'la recepción telefónica de un consultorio',
  scenario: '<p>Un consultorio con dos profesionales quiere que un agente atienda las llamadas para pedir, mover y cancelar citas. Entre que la persona calla y oye una respuesta no debería pasar mucho más de un segundo. La persona puede hablar encima del agente, y la agenda no puede tener dos citas a la misma hora. Tienes una laptop, PostgreSQL, Claude por API y Ollama. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'cascada-o-s2s', type: 'single',
      prompt: '¿Cómo se arma la parte que oye y habla?',
      options: [
        'Un modelo speech-to-speech remoto, porque tiene menos latencia y entiende el tono de la voz sin pasar por texto.',
        'Una cascada en streaming: VAD, Whisper, el modelo y Piper, con cada etapa visible, medible y cambiable.',
        'Una cascada sin streaming, donde Piper espera la respuesta entera para que la voz suene sin cortes raros.',
        'Whisper y Piper en la nube, para que la laptop no cargue modelos y la latencia dependa solo de la red.'
      ],
      answer: 1,
      explain: 'La cascada en streaming corre en tu máquina, deja ver el texto entre etapas y permite medir cada parte. Speech-to-speech gana en latencia pero esconde las etapas y no corre local. Sin streaming, la espera hasta el primer sonido crece con el largo de la respuesta. Ver <a href="#ae-cascada">La cascada</a>.'
    },
    {
      id: 'fin-de-turno', type: 'single',
      prompt: 'El VAD decide el fin de turno por silencio. ¿Qué valor de <code>stop_secs</code> conviene para empezar?',
      options: ['0.05 s, el mínimo que deja Silero', '0.2 s, el valor por defecto de Pipecat', '0.8 s, para no cortar a nadie', '2 s, como en un contestador'],
      fixed: true,
      answer: 1,
      explain: 'El silencio entra entero en cada respuesta. 0.2 s es corto sin cortar a casi nadie; 0.8 s suma 0.6 s por turno, y menos de 0.1 s corta a quien duda. Lo provocas en la <a href="#comprueba-fallas">falla 3</a>.'
    },
    {
      id: 'truncar', type: 'single',
      prompt: 'La persona interrumpe a mitad de la propuesta. ¿Qué debería quedar en la historia del agente?',
      options: [
        'La respuesta entera que escribió el modelo, porque es lo que el agente quiso decir y conviene conservarlo.',
        'Nada de esa respuesta: si la interrumpieron, se borra de la historia para que el modelo empiece de cero.',
        'Solo lo que llegó a sonar, que es lo que la persona oyó de verdad y lo que puede haber respondido.',
        'La respuesta entera con una nota al final que diga "interrumpido", para que el modelo lo sepa.'
      ],
      answer: 2,
      explain: 'La historia tiene que ser lo que pasó en la llamada. Si guarda lo escrito, un sí parece una respuesta a la hora que nunca sonó. Pipecat guarda solo lo que sonó. Ver <a href="#ae-interrupcion">Interrumpir y truncar</a>.'
    },
    {
      id: 'confirmar', type: 'single',
      prompt: '¿Dónde vive la regla de que solo se reserva después de un sí a la propuesta entera?',
      options: [
        'En las instrucciones del modelo, escritas con claridad, porque es el modelo el que decide cuándo llama.',
        'En una función sin modelo que llama la herramienta con efecto antes de tocar la base de datos.',
        'En un segundo modelo que lee la conversación y decide si hubo un sí antes de cada reserva.',
        'En la base, con un trigger que revisa la transcripción guardada antes de aceptar el INSERT.'
      ],
      answer: 1,
      explain: 'Lo que decide si se actúa está en el código. Las instrucciones lo piden pero no lo garantizan; un segundo modelo suma latencia y otra forma de fallar; la base no tiene la conversación. Ver <a href="#paso-regla">el paso 3</a>.'
    },
    {
      id: 'doble-reserva', type: 'single',
      prompt: 'Dos personas dicen que sí a la misma hora en el mismo instante. ¿Qué impide las dos citas?',
      options: [
        'Un SELECT antes del INSERT, que mira si la hora está libre y solo inserta cuando no hay otra cita.',
        'Un lock en Python alrededor de reservar, para que dos llamadas no inserten al mismo tiempo.',
        'La clave de idempotencia, que es única en la tabla y rechaza la segunda reserva de esa hora.',
        'Una restricción de exclusión en PostgreSQL sobre el profesional y la franja de las citas activas.'
      ],
      answer: 3,
      explain: 'La restricción la impone la base, aunque haya muchos procesos. El SELECT previo tiene la carrera de leer y escribir; el lock solo vale dentro de un proceso; y la clave distingue reintentos, no personas distintas. Ver <a href="#ae-exclusion">Dos citas no se pisan</a>.'
    },
    {
      id: 'stt-local-o-api', type: 'single',
      prompt: '¿Por qué Whisper corre en tu máquina y no en una API?',
      options: [
        'Porque el audio, que es el dato más sensible de la llamada, no sale de la máquina, y no hay red en esa etapa.',
        'Porque Whisper local siempre transcribe mejor que cualquier servicio de transcripción en la nube.',
        'Porque las APIs de transcripción no aceptan audio en español con acento de México.',
        'Porque Pipecat no tiene servicios de transcripción remotos y solo trae el Whisper local.'
      ],
      answer: 0,
      explain: 'Local, el audio no sale y la etapa no suma una ida y vuelta por la red. No es más preciso por ser local, y Pipecat sí trae servicios remotos. Ver <a href="#excusa">las fronteras</a>.'
    },
    {
      id: 'presupuesto', type: 'single',
      prompt: 'Tu tabla del paso 7 muestra que <code>llm_inference</code> es la parte más alta con Ollama. ¿Qué cambias primero?',
      options: [
        'Bajas el silencio de fin de turno a 0.05 s, que es la parte más fácil de recortar en cualquier turno.',
        'El modelo: uno más chico, uno en GPU o Claude, porque es la parte que pesa más en tu medición.',
        'Whisper, a un modelo más grande, para que el texto llegue más limpio y el modelo piense menos.',
        'Piper, a una voz de menor calidad, porque sintetizar es lo que más tarda en todas las cascadas.'
      ],
      answer: 1,
      explain: 'Se recorta lo que la medición dice que pesa. Bajar el silencio corta a la gente; un Whisper más grande suma tiempo; y Piper no es lo más alto en tu tabla. Ver <a href="#paso-latencia">el paso 7</a>.'
    },
    {
      id: 'que-medir', type: 'single',
      prompt: '¿Cómo se mide qué tan seguido el modelo hace lo correcto?',
      options: [
        'Hablando con el agente diez veces y anotando a mano cuántas veces la cita quedó bien en la agenda.',
        'Con audio grabado de diálogos reales, pasado por toda la tubería de voz en cada corrida del eval.',
        'Con diálogos en texto, un guion por caso, cada uno k veces, juzgados por cómo queda la agenda.',
        'Con otro modelo que lee cada conversación y le pone una nota de 1 a 10 a la recepcionista.'
      ],
      answer: 2,
      explain: 'En texto, el caso es el mismo cada vez y solo varía el modelo. La voz mezcla Whisper y el VAD con el modelo; a mano son pocos y no repetibles; un juez es otro modelo que puede equivocarse. Ver <a href="#paso-evals">el paso 8</a>.'
    }
  ],
  solution: '<ul><li>Cascada en streaming con Silero, Whisper, el modelo y Piper, en tu máquina.</li><li>Fin de turno por 0.2 s de silencio, medido en cada turno.</li><li>En la historia, solo lo que sonó.</li><li>La regla de la confirmación en código, dentro de <code>confirmar</code>, que no recibe argumentos.</li><li>Restricción de exclusión en PostgreSQL y clave de idempotencia por sesión y propuesta.</li><li>Latencias por parte en un CSV, con mediana y p95.</li><li>Evals en texto con pass^k, juzgados por la agenda.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). */

SD.defineExercise('ia06-p-franjas', {
  kind: 'predict', title: 'las franjas de un día',
  scenario: '<p>Los turnos son de 9:00 a 13:00 y de 15:00 a 18:00, y una cita entra si termina antes del cierre. Corres <code>franjas_del_dia</code> para el martes 1 de diciembre de 2026.</p>',
  steps: [{ id: 'n', type: 'single', prompt: '¿Cuántas franjas devuelve?', options: ['12', '14', '16', '0'], fixed: true, answer: 1,
    explain: 'Ocho por la mañana (9:00 a 12:30) y seis por la tarde (15:00 a 17:30). El martes es día hábil: <code>weekday()</code> da 1.' }]
});

SD.defineExercise('ia06-p-repetir', {
  kind: 'predict', title: 'la misma clave dos veces',
  scenario: '<p><code>caos.py repetir</code> llama dos veces a <code>reservar</code> con la misma clave.</p>',
  steps: [{ id: 'r', type: 'single', prompt: '¿Qué devuelve la segunda llamada?', options: [
    'ocupada, porque la restricción de exclusión rechaza la franja tomada',
    'repetida, con el mismo id de la primera cita',
    'reservada, con un id nuevo, porque cada llamada es otra transacción',
    'un error de clave duplicada que sale como excepción de psycopg'], answer: 1,
    explain: '<code>ON CONFLICT (clave) DO NOTHING</code> no inserta ni falla, y el código busca el id por la clave. La restricción no llega a mirarse: el árbitro es la clave.' }]
});

SD.defineExercise('ia06-p-regla', {
  kind: 'predict', title: 'qué es un sí',
  scenario: '<p>La persona contesta <code>Sí... no, espera</code> a la pregunta del agente.</p>',
  steps: [{ id: 's', type: 'single', prompt: '¿Qué devuelve <code>es_si</code>?', options: [
    'True, porque la frase empieza con "sí"',
    'False, porque contiene un no y gana el no',
    'True, porque "espera" no está en la lista NO',
    'False, porque los puntos suspensivos invalidan la frase'], answer: 1,
    explain: '<code>es_si</code> busca primero cualquier palabra de <code>NO</code>; "no" y "espera" están. Los signos se quitan al normalizar.' }]
});

SD.defineExercise('ia06-p-clave', {
  kind: 'predict', title: 'la clave de idempotencia',
  scenario: '<p>Dos propuestas en la sesión <code>s1</code>, iguales salvo el nombre: <code>Ana Pérez</code> y <code> ana pérez </code>.</p>',
  steps: [{ id: 'c', type: 'single', prompt: '¿Dan la misma clave?', options: [
    'Sí: el nombre se pasa a minúsculas y sin espacios a los lados',
    'No: el hash cambia con cualquier carácter distinto del nombre',
    'Sí: el nombre no forma parte de la clave, solo la hora',
    'No: la propuesta guarda desde distinto y eso entra en el hash'], answer: 0,
    explain: '<code>clave_de</code> usa <code>paciente.strip().lower()</code>, y no usa <code>desde</code>. La prueba <code>test_la_clave_no_depende_de_mayusculas_ni_espacios</code> lo comprueba.' }]
});

SD.defineExercise('ia06-p-modelo', {
  kind: 'predict', title: 'un modelo mal escrito',
  scenario: '<p>Pones <code>VOZ_MODELO=gpt</code> en <code>.env</code> y llamas a <code>cerebro(instrucciones())</code>.</p>',
  steps: [{ id: 'm', type: 'single', prompt: '¿Qué pasa?', options: [
    'Usa Claude, que es el valor por defecto de la configuración',
    'ValueError: Modelo desconocido: gpt. Usa claude u ollama.',
    'Usa Ollama, porque gpt se parece más a un modelo local',
    'Arranca y falla recién en la primera llamada al modelo'], answer: 1,
    explain: 'El valor por defecto solo aplica si la variable no existe. <code>cerebro</code> compara con los dos nombres y si no coincide lanza <code>ValueError</code> al armar la tubería.' }]
});

SD.defineExercise('ia06-p-silencio', {
  kind: 'predict', title: 'el silencio en cuadros',
  scenario: '<p>Con <code>VOZ_SILENCIO=0.2</code> y cuadros de 20 ms.</p>',
  steps: [{ id: 'q', type: 'single', prompt: '¿Cuántos cuadros seguidos sin voz cierran el turno?', options: ['2', '5', '10', '20'], fixed: true, answer: 2,
    explain: '0.2 s / 0.020 s = 10 cuadros. Ver <a href="#ae-audio">El audio en números</a>.' }]
});

SD.defineExercise('ia06-p-percentil', {
  kind: 'predict', title: 'el p95 de cinco turnos',
  scenario: '<p>Los totales de cinco turnos son 0.6, 0.7, 0.8, 0.9 y 1.5 s.</p>',
  steps: [{ id: 'p', type: 'single', prompt: '¿Qué devuelve <code>percentil(valores, 95)</code>?', options: ['0.9', '1.5', '1.38', '0.8'], fixed: true, answer: 1,
    explain: 'Rango más cercano: <code>ceil(0.95 × 5) = 5</code>, el quinto de menor a mayor. Con cinco turnos, el p95 es el peor.' }]
});

SD.defineExercise('ia06-p-interrumpe', {
  kind: 'predict', title: 'el eval que interrumpe',
  scenario: '<p>El caso <code>interrumpe</code>: la persona pide las 10:30, corta la pregunta antes de " a las " y dice "Sí, sí.".</p>',
  steps: [{ id: 'a', type: 'single', prompt: '¿Cómo tiene que quedar la agenda para que el caso salga bien?', options: [
    'Con la cita de Ana a las 10:30, porque al final dijo que sí',
    'Vacía, porque el sí fue a una propuesta que no sonó entera',
    'Con la cita cancelada, porque la interrupción anula la reserva',
    'Con dos citas, la de antes y la de después del corte'], answer: 1,
    explain: '<code>"espera": {}</code>. La regla no encuentra "10:30" en lo que sonó, y <code>confirmar</code> no toca la base.' }]
});
