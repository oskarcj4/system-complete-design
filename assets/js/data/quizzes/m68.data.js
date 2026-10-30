SD.defineQuiz('m68', {
  title: 'Quiz: context engineering y memoria', pass: 0.7,
  questions: [
    { id: 'orden', type: 'single',
      prompt: '¿Por qué un harness pone las herramientas y el system prompt antes que la conversación?',
      options: [
        'Porque el modelo atiende más a lo primero y las herramientas son lo más importante del prompt',
        'Porque cambian casi nunca, y el caché coincide por prefijo: lo estable primero se reutiliza',
        'Porque la API exige ese orden y rechaza un request con mensajes antes que el system prompt',
        'Porque así las herramientas quedan fuera del límite de la ventana y no cuentan como tokens'
      ],
      answer: 1,
      explain: 'El caché coincide por prefijo exacto. Lo que menos cambia va primero para que todo lo anterior al cambio se lea a 0.1×. Ver 68.1 y 68.3.' },
    { id: 'hora', type: 'single',
      prompt: 'Una plantilla pone la fecha con la hora en la primera línea del system prompt. Con caché activado, ¿qué pasa con el costo de entrada?',
      options: [
        'Baja a una décima, porque el resto del system sigue igual entre turnos',
        'Queda igual que sin caché, porque el sistema detecta el cambio y deja de cachear ese request',
        'Sube por encima de no tener caché: nada coincide y todo se escribe a 1.25× en cada turno',
        'Baja a la mitad, porque el caché guarda el system y la conversación por separado'
      ],
      answer: 2,
      explain: 'Un cambio al principio invalida todo lo que sigue. Cada turno se escribe entero, y escribir cuesta 1.25× la entrada. Ver 68.3.' },
    { id: 'claudemd', type: 'single',
      prompt: 'Editas CLAUDE.md a mitad de una sesión de Claude Code. ¿Qué pasa?',
      options: [
        'El caché se invalida y el próximo turno ya usa la versión nueva',
        'Nada, hasta /clear, /compact o reiniciar: se leyó al empezar y el caché sigue intacto',
        'El harness lo vuelve a leer en el turno siguiente y lo agrega al final de la conversación',
        'La sesión se reinicia sola para cargar la versión nueva y se pierde la historia'
      ],
      answer: 1,
      explain: 'El CLAUDE.md de la raíz se lee una vez al empezar y queda en memoria. La edición entra con /clear, /compact o al reiniciar. Ver 68.3.' },
    { id: 'rot', type: 'single',
      prompt: 'En el turno 150 el agente acierta menos que en el 10, aunque la ventana no está llena. ¿Qué explica mejor el efecto?',
      options: [
        'El caché expiró y el modelo procesa el contexto con menos precisión al recalcularlo',
        'La temperatura sube sola a medida que crece la conversación para variar las respuestas',
        'Context rot: más tokens reparten la atención y lo relevante compite con resultados viejos',
        'El modelo trunca en silencio los primeros 100 turnos al pasar la mitad de la ventana'
      ],
      answer: 2,
      explain: 'Más contexto diluye la atención aunque todo entre. La respuesta es menos contexto, mejor elegido. Ver 68.4.' },
    { id: 'jit', type: 'single',
      prompt: '¿En qué caso conviene la búsqueda justo a tiempo (glob, grep, Read) por sobre traer fragmentos con RAG al empezar?',
      options: [
        'Un repositorio de código que cambia a diario, con nombres exactos que se pueden buscar',
        'Diez millones de documentos de texto libre consultados por personas que no conocen los términos',
        'Una pregunta que se responde siempre en una sola vuelta y donde la latencia es lo único que importa',
        'Un corpus fijo que no cambia nunca y ya está indexado con embeddings de buena calidad'
      ],
      answer: 0,
      explain: 'Lo justo a tiempo siempre está fresco y trae lo que confirma; brilla con nombres exactos. RAG gana en texto libre masivo o cuando hace falta una sola vuelta. Ver 68.5.' },
    { id: 'automem', type: 'single',
      prompt: 'La memoria automática de Claude Code, ¿qué carga al empezar cada sesión?',
      options: [
        'Todos los archivos de memoria del proyecto, sin límite, para no olvidar nada',
        'Nada: el agente la lee con una herramienta solo cuando decide que la necesita',
        'Solo lo que se escribió en la última sesión, y lo anterior queda archivado',
        'Las primeras 200 líneas o 25 KB de MEMORY.md; los temas, a pedido'
      ],
      answer: 3,
      explain: 'El índice entra al empezar con tope; el detalle vive en archivos por tema que se leen cuando hacen falta. Ver 68.6.' },
    { id: 'notas', type: 'single',
      prompt: 'Después de compactar, el agente vuelve a intentar un enfoque que ya había descartado. ¿Qué lo evita?',
      options: [
        'Subir el umbral de compactación para que el resumen se haga con más contexto disponible',
        'Un archivo de notas en disco con lo hecho, lo pendiente y lo descartado, que relee al seguir',
        'Pedirle al modelo en el system prompt que recuerde siempre las decisiones anteriores',
        'Desactivar la compactación y usar una ventana de un millón de tokens para toda la tarea'
      ],
      answer: 1,
      explain: 'El resumen guarda lo hecho y rara vez por qué se descartó lo otro. Las notas viven en disco y sobreviven a la compactación. Ver 68.6.' },
    { id: 'sobrevive', type: 'multi',
      prompt: 'En Claude Code, ¿qué vuelve a la ventana después de compactar? Marca todas las que correspondan.',
      options: [
        'El CLAUDE.md de la raíz y la memoria automática, leídos otra vez del disco',
        'Hasta cinco archivos leídos o editados hace poco',
        'Los cuerpos de las skills usadas, cada uno completo sin importar su largo',
        'Las reglas por ruta que se habían cargado al tocar archivos de esas carpetas'
      ],
      answer: [0, 1],
      explain: 'Las skills vuelven con tope de 5 000 tokens cada una; las reglas por ruta salen y vuelven al tocar esos archivos. Ver 68.7.' },
    { id: 'clear', type: 'single',
      prompt: 'Con edición de contexto, ¿para qué sirve <code>clear_at_least</code>?',
      options: [
        'Para limpiar siempre una cantidad mínima en cada turno, haya o no resultados viejos',
        'Para que el modelo no pueda volver a pedir una herramienta cuyo resultado se limpió',
        'Para no limpiar poco y seguido: cada limpieza reescribe el caché desde ese punto',
        'Para fijar cuántos resultados recientes quedan intactos después de limpiar los demás'
      ],
      answer: 2,
      explain: 'Limpiar cambia la historia e invalida el caché desde ahí. Si se limpia, que valga la pena. Lo de los recientes es keep. Ver 68.8.' },
    { id: 'sub', type: 'single',
      prompt: 'Comparado con compactar, ¿qué ventaja tiene delegar una investigación amplia a un subagente?',
      options: [
        'Que el subagente lee del caché del principal y su trabajo sale casi gratis',
        'Que lo leído nunca entra al contexto principal, y el caché del principal queda intacto',
        'Que el subagente guarda todo lo que leyó en la memoria automática del proyecto',
        'Que el subagente no tiene límite de ventana porque corre fuera del harness'
      ],
      answer: 1,
      explain: 'El subagente trabaja en su propio contexto y devuelve un resumen. Su primer request no lee el caché del principal: calienta uno propio. Ver 68.9.' }
  ]
});
