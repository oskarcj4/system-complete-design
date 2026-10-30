SD.defineExercise('m68-contexto', {
  title: 'el contexto de un agente de soporte',
  scenario: '<p>Un agente propio, sobre la API, atiende tickets de soporte de un SaaS. Cada ticket es una sesión de 30 a 60 turnos. Su prompt empieza con <code>Hoy es {fecha y hora}</code>, sigue con 15 000 tokens de herramientas, 6 000 de instrucciones y un manual de producto de 40 000 tokens pegado entero. Las herramientas leen la base de clientes y los logs, y cada lectura devuelve entre 3 000 y 10 000 tokens. En los tickets largos, el agente se contradice al final y la factura de entrada no baja aunque el caché está activado. Decide paso a paso.</p>',
  steps: [
    { id: 'fecha', type: 'single',
      prompt: '¿Qué haces con <code>Hoy es {fecha y hora}</code> al principio del prompt?',
      options: [
        'La dejas, porque el modelo necesita saber la hora antes de leer las instrucciones',
        'La pasas al mensaje del usuario de cada turno, al final del request',
        'La quitas y le das al agente una herramienta que devuelva la hora si la pide',
        'La redondeas al día, y la dejas al principio, para que cambie una vez por fecha'
      ],
      answer: 1,
      explain: 'Al final no rompe ningún prefijo. Redondear ayuda, pero sigue invalidando todo una vez por día y el lugar sigue mal; una herramienta suma un turno para un dato de 10 tokens.' },
    { id: 'manual', type: 'single',
      prompt: 'El manual de 40 000 tokens va pegado entero en cada ticket. ¿Qué haces?',
      options: [
        'Lo dejas: con caché cuesta una décima y así el agente lo tiene todo a mano',
        'Lo resumes a 4 000 tokens con un modelo y pegas el resumen en lugar del manual',
        'Lo divides por tema, pones un índice corto en el prompt y una herramienta para leer cada tema',
        'Lo mueves al final del prompt, después de la conversación, para que el modelo lo atienda más que al resto'
      ],
      answer: 2,
      explain: 'Índice liviano y lectura a pedido: entra lo que el ticket necesita. El caché baja el costo pero no la atención; un resumen pierde justo el detalle que se busca; al final rompe el caché en cada turno.' },
    { id: 'logs', type: 'single',
      prompt: 'Las lecturas de logs llenan la ventana a mitad de un ticket largo. ¿Qué agregas primero?',
      options: [
        'Edición de contexto que limpie resultados viejos, con keep bajo y clear_at_least alto',
        'Compactación cada 5 turnos, para que la ventana nunca pase de la mitad',
        'Un límite de 3 lecturas de logs por ticket, y que el agente pida ayuda al pasarlo',
        'Una ventana de un millón de tokens, para que los tickets largos entren enteros'
      ],
      answer: 0,
      explain: 'El problema son resultados viejos: se quitan sin resumir lo demás. Compactar tan seguido pierde detalle y reescribe el caché; el límite corta tickets legítimos; la ventana grande posterga el context rot.' },
    { id: 'contradice', type: 'single',
      prompt: 'Al final de los tickets largos, el agente ofrece algo que al principio había dicho que no correspondía. ¿Qué lo evita mejor?',
      options: [
        'Repetir en el system prompt que el agente nunca se contradiga',
        'Una herramienta de notas por ticket: decisiones y lo descartado, que relee antes de responder',
        'Subir la temperatura para que el modelo explore menos y repita más lo que ya dijo',
        'Guardar todas las respuestas anteriores al principio del prompt, antes de las herramientas y del system'
      ],
      answer: 1,
      explain: 'Lo decidido vive en disco y sobrevive a limpiezas y resúmenes. Pedirlo en el prompt no cambia lo que hay en la ventana; ponerlo al principio rompe el caché en cada turno.' },
    { id: 'cliente', type: 'single',
      prompt: 'Para buscar el historial de un cliente, el agente lee 20 tickets viejos. ¿Cómo lo resuelves?',
      options: [
        'Dejando que los lea en el contexto principal, porque el agente necesita el detalle',
        'Precargando los 20 tickets al empezar cada sesión, para que estén cuando hagan falta',
        'Con un subagente que lea el historial y devuelva un resumen corto con lo relevante',
        'Con un RAG sobre todos los tickets de todos los clientes que traiga los cinco más parecidos'
      ],
      answer: 2,
      explain: 'Lee mucho y devuelve poco: el caso del subagente. Precargar paga todo en cada ticket; el RAG trae lo parecido de otros clientes, no la historia de este.' },
    { id: 'medir', type: 'single',
      prompt: '¿Cómo compruebas que los cambios funcionan?',
      options: [
        'Revisando a mano tres tickets largos y comparando las respuestas con las de antes',
        'Mirando que el costo total del mes baje, porque si baja el contexto está mejor armado',
        'Midiendo solo cache_read_input_tokens, porque si sube los cambios funcionaron',
        'Con un set de tickets y varias corridas por caso: aciertos con pass^k, tokens y caché'
      ],
      answer: 3,
      explain: 'Se mide calidad y costo juntos y con repeticiones. El caché solo mide costo; tres tickets no dicen nada estable; el mes mezcla el cambio con el volumen.' }
  ],
  solution: '<ul><li>La fecha va al final, en el mensaje del turno; el punto de caché, al final del system.</li><li>El manual se divide en temas: índice de unas 40 líneas en el prompt y una herramienta <code>leer_manual(tema)</code>.</li><li>Edición de contexto con <code>clear_tool_uses</code>, <code>keep</code> 3 y <code>clear_at_least</code> alto, excluyendo la herramienta de notas.</li><li>Una herramienta de notas por ticket con decisiones, pendientes y descartes, que el agente relee antes de cada respuesta.</li><li>Un subagente para el historial del cliente, con un resumen de no más de 1 500 tokens.</li><li>Un set de 50 tickets reales anonimizados, 5 corridas por caso: pass^k, tokens de entrada, proporción leída del caché y segundos.</li></ul>'
});
