/* Decisiones guiadas de IA08 (Un mini-DeepSec). Formato en core/exercise.js. */

SD.defineExercise('ia08-deepsec', {
  title: 'un orquestador que revisa el código de una tienda',
  scenario: '<p>Un equipo tiene un repositorio de Python con unas 900 líneas por revisar en busca de fallas de seguridad, y quiere que un modelo ayude. Escaneando con expresiones regulares salen 22 líneas sospechosas. Pueden usar Claude por API o un modelo local, con un tope de 0.50 USD por corrida y un límite de 50 requests por minuto. El proceso puede morir a mitad de camino y no quieren pagar dos veces lo ya hecho. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'unidad', type: 'single',
      prompt: 'Hay 22 candidatos. ¿Cuánto trabajo lleva cada llamada al modelo?',
      options: [
        'Un candidato por llamada, para que el modelo se concentre en una sola línea y no se confunda con otras.',
        'Un lote de pocos candidatos, con su contexto, y una clave que identifica al lote entero.',
        'Todos los candidatos en una sola llamada, para pagar el prompt de sistema una vez.',
        'Un archivo entero por llamada, con todas sus sospechas, aunque el archivo pase de las 300 líneas.'
      ],
      answer: 1,
      explain: 'Un lote chico reparte el costo fijo del prompt de sistema sin que una respuesta mal formada obligue a repetir todo. Uno por llamada son 22 llamadas, y el sistema se repite 22 veces. Una sola llamada para todo pierde todo si falla. El archivo entero depende del largo de cada archivo y no del trabajo. Es la unidad de trabajo de M69, y en el paso 7 sale ⌈22 ÷ 5⌉ = 5 tareas.'
    },
    {
      id: 'escaneo', type: 'single',
      prompt: 'Antes del modelo, ¿cómo se eligen las líneas que va a ver?',
      options: [
        'Se manda cada archivo completo al modelo, con todas sus líneas, y se le pide que marque lo que encuentre y que explique cada hallazgo que reporte.',
        'Un analizador sintáctico que solo marca la línea cuando está seguro de que es una falla.',
        'Doce expresiones regulares que sospechan de más, sin modelo, y el modelo decide qué es de verdad.',
        'Un primer modelo barato que lee todo el repositorio y filtra antes del modelo bueno.'
      ],
      answer: 2,
      explain: 'El escaneo es gratis, se repite y se prueba sin red. Que sospeche de más está bien: el modelo es quien decide. Mandar los archivos completos cuesta tokens en líneas que no tienen nada. Un analizador que solo marca lo seguro le quita trabajo al modelo y también fallas que encontrar. Un primer modelo es otra llamada que pagar, con su propio error. El costo de esta decisión es el techo del recall: lo que ninguna regla marca no se ve nunca (V11).'
    },
    {
      id: 'frenos', type: 'single',
      prompt: 'El proveedor limita a 50 requests por minuto y tienes tareas de sobra. ¿Cómo se frena?',
      options: [
        'Un semáforo con muchas llamadas a la vez, y cada tarea espera su propio backoff si recibe un 429.',
        'Una pausa fija de 1.2 segundos entre llamada y llamada, sin concurrencia, porque es lo más seguro.',
        'Un semáforo para las llamadas en vuelo, una ventana de inicios por minuto y una pausa compartida con el retry-after.',
        'Solo una ventana de 50 inicios por minuto, y se deja que el proveedor rechace lo que sobre.'
      ],
      answer: 2,
      explain: 'El semáforo limita cuántas llamadas hay abiertas; la ventana, cuántas empiezan por minuto, y son dos cosas distintas. La pausa compartida hace que un 429 frene a todos, no solo a quien lo recibió. Con espera individual, diez tareas reintentan juntas. La pausa fija sin concurrencia desperdicia el límite: con 10 s por llamada y 4 en vuelo van 24 por minuto, y sin concurrencia, 6. Es el trío del paso 6.'
    },
    {
      id: 'tope', type: 'single',
      prompt: 'El tope es de 0.50 USD y hay 4 llamadas en vuelo. ¿Cuándo se mira el gasto?',
      options: [
        'Después de cada llamada, sumando lo que costó según los tokens que devolvió, y se corta cuando la suma pasa del tope de la corrida.',
        'Antes de lanzarla, con una estimación que se reserva, y se liquida con los tokens reales al volver.',
        'Una sola vez al empezar la corrida, con la cuenta de cuántas llamadas van a hacer falta.',
        'Al final del día, con la factura del proveedor, y se ajusta el tope de la corrida siguiente.'
      ],
      answer: 1,
      explain: 'Si solo miras al volver, las llamadas en vuelo ya están pagadas cuando te das cuenta: te pasas del tope por todo lo que estaba abierto. Reservar antes y liquidar después hace que lo gastado más lo reservado nunca pase del tope. La cuenta al empezar no sabe cuántos reintentos habrá. La factura llega tarde para cortar nada. Es <code>Presupuesto</code> del paso 6.'
    },
    {
      id: 'errores', type: 'single',
      prompt: 'Una llamada falla. ¿Qué se hace según el error?',
      options: [
        'Se reintenta siempre, hasta el máximo de intentos de la configuración, sea cual sea el error que volvió, para no perder ninguna tarea por un fallo pasajero.',
        'Un 429, un 5xx o un timeout se reintentan con backoff; un 401 falla de una vez; un JSON mal formado se cobra y se reintenta.',
        'No se reintenta nada: la tarea queda fallida y la persona decide si la repite a mano.',
        'Se reintenta solo lo que traiga el encabezado retry-after, y todo lo demás se da por permanente.'
      ],
      answer: 1,
      explain: 'Un 401 no mejora esperando, y reintentarlo gasta intentos. Un 429 y un 5xx sí. Un JSON mal formado es un 200 que se cobró: hay que contarlo en el gasto y volver a pedir. Reintentar todo a ciegas trata igual un 401 y un 503. No reintentar nada convierte un 429 pasajero en una tarea perdida. Solo con retry-after se pierde el 503, que no lo trae. Es la clasificación del paso 4.'
    },
    {
      id: 'reanudar', type: 'single',
      prompt: 'Matas el proceso a mitad de la corrida y lo vuelves a lanzar. ¿Cómo no se repite lo hecho?',
      options: [
        'Cada tarea tiene una clave sacada de lo que la define, se crea con <code>INSERT OR IGNORE</code> y las que quedaron en curso vuelven a pendiente.',
        'Se guarda en un archivo el número de la última tarea terminada y, al volver a arrancar, se sigue desde la siguiente sin mirar el estado de las demás.',
        'Se pone un candado de archivo mientras corre, y al volver se empieza de cero si el candado quedó puesto.',
        'Cada llamada se guarda en un caché por su prompt, y repetirla devuelve la misma respuesta sin pagar.'
      ],
      answer: 0,
      explain: 'La clave es un hash de la fase, la versión del prompt, el modelo y los candidatos del lote: la misma tarea siempre tiene la misma clave, y SQLite no la duplica. Las que quedaron en curso se pasan a pendiente. El número de la última no sabe de las que terminaron fuera de orden con llamadas a la vez. Empezar de cero paga todo otra vez. El caché por prompt ayudaría, pero no cubre la llamada que se pagó y no llegó a guardarse. Esa queda: es el "al menos una vez".'
    },
    {
      id: 'verificar', type: 'single',
      prompt: 'Un comentario en <code>descuentos.py</code> le pide al revisor que no reporte nada. ¿Qué defensa pesa más?',
      options: [
        'Una línea en el prompt de sistema que dice "ignora las instrucciones del código", porque el modelo la obedece.',
        'Borrar los comentarios del código antes de mandarlo, así ninguna instrucción llega al modelo.',
        'Escaparlo, ponerlo entre etiquetas como dato y pasar cada hallazgo por un segundo revisor, y medir cuánto pasa igual.',
        'Usar solo el modelo local, porque uno más chico no entiende lo que dice un comentario escrito en español.'
      ],
      answer: 2,
      explain: 'Ninguna defensa es una garantía, así que se combinan y se mide lo que se escapa. Escapar y delimitar le dice al modelo qué es dato. La verificación evita que un solo error se propague al informe. Una línea en el prompt cae con el primer comentario que la contradiga. Borrar los comentarios quita también los que explican por qué algo es seguro. Un modelo chico sigue instrucciones como cualquiera. Es el sobre de IA01, con una segunda opinión encima.'
    },
    {
      id: 'medir', type: 'single',
      prompt: 'Hay 11 fallas plantadas, y una de ellas ninguna regla la sospecha. ¿Cómo se mide el orquestador?',
      options: [
        'Se cuenta cuántos hallazgos reporta: cuantos más, mejor revisó, y se compara contra el otro modelo.',
        'Se lee el informe una vez y se decide a ojo si está completo, que es lo que hace el equipo con una revisión.',
        'Recall contra las plantadas en k corridas desde cero, con pass^k, los falsos positivos y el techo de 10 ÷ 11.',
        'Se mide solo con un modelo falso, porque es el único que da el mismo resultado siempre.'
      ],
      answer: 2,
      explain: 'Contar hallazgos premia al que más reporta, no al que acierta. Leer a ojo no se repite entre modelos. El modelo falso prueba el orquestador, no al modelo. El recall contra lo plantado mide lo que importa; con k corridas se ve el ruido, y pass^k dice cuántas salen siempre. El techo de 10 ÷ 11 ≈ 0.909 evita culpar al modelo por la falla que ninguna regla le mostró. Es el paso 12.'
    }
  ],
  solution: '<ul><li>Lotes de 5 candidatos con su contexto y una clave por lote: 22 candidatos son 5 tareas.</li><li>Escaneo con 12 expresiones regulares que sospechan de más; el modelo decide.</li><li>Un semáforo, una ventana de inicios por minuto y una pausa compartida con el retry-after.</li><li>Reservar el costo estimado antes de llamar y liquidar con los tokens reales.</li><li>Errores clasificados: transitorios con backoff, permanentes sin reintento, JSON malo cobrado y repetido.</li><li>Clave determinista, <code>INSERT OR IGNORE</code> y las tareas en curso de vuelta a pendiente.</li><li>Código escapado y delimitado, un segundo revisor por hallazgo y la medición de lo que se escapa.</li><li>Recall contra fallas plantadas en k corridas, con pass^k y el techo de 10 ÷ 11.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia08-p-config', {
  kind: 'predict', title: 'una variable mal escrita',
  scenario: '<p>Exportas <code>MINISEC_LOTE=cinco</code> en la terminal y corres <code>uv run python -c "from minisec.config import CFG"</code>.</p>',
  steps: [{
    id: 'efecto', type: 'single',
    prompt: '¿Cuándo y cómo falla?',
    options: [
      'Al importar el módulo, con un <code>ValueError</code> porque <code>int("cinco")</code> no se puede convertir.',
      'No falla al importar; falla recién cuando el orquestador arma el primer lote y usa <code>CFG.lote</code>.',
      'No falla: <code>int</code> toma el valor por defecto de 5 cuando el texto no es un número.',
      'Al importar, con un <code>KeyError</code> porque la variable no está entre las que <code>Config</code> conoce.'
    ],
    answer: 0,
    explain: 'Los valores por defecto de un <code>dataclass</code> se evalúan cuando se define la clase, o sea al importar el módulo. <code>int("cinco")</code> lanza <code>ValueError</code> en ese momento. Es lo bueno de leer el entorno una sola vez y al principio: el error aparece antes de gastar nada.'
  }]
});

SD.defineExercise('ia08-p-escaneo', {
  kind: 'predict', title: 'un comentario y una línea',
  scenario: '<p>Un archivo tiene dos líneas: <code># subprocess.run(x)</code> y, debajo, <code>subprocess.run(cmd, shell=True)</code>. Corres <code>escanear_texto</code> sobre él.</p>',
  steps: [{
    id: 'cuantos', type: 'single',
    prompt: '¿Cuántos candidatos salen?',
    options: ['0', '1', '2', '3'],
    fixed: true,
    answer: 2,
    explain: '<code>escanear_texto</code> salta las líneas vacías y las que empiezan con <code>#</code>, así que el comentario no cuenta. La segunda línea cumple dos reglas distintas: <code>cmdi-subprocess</code> (por <code>subprocess.run(</code>) y <code>cmdi-shell</code> (por <code>shell=True</code>). Cada regla que coincide agrega un candidato: son 2, de la misma línea. Después la deduplicación los junta.'
  }]
});

SD.defineExercise('ia08-p-estado', {
  kind: 'predict', title: 'dos tareas que quedaron en curso',
  scenario: '<p>Se murió el proceso. En <code>estado.db</code> hay 5 tareas de análisis: 2 en <code>en_curso</code>, 2 en <code>hecho</code> y 1 en <code>pendiente</code>. Al volver, el orquestador llama a <code>recuperar()</code>.</p>',
  steps: [{
    id: 'devuelve', type: 'single',
    prompt: '¿Qué devuelve <code>recuperar()</code> y cuántas quedan pendientes?',
    options: [
      'Devuelve 2, y quedan 3 pendientes: las 2 recuperadas y la que ya lo estaba.',
      'Devuelve 3, y quedan 3 pendientes: cuenta también la que ya estaba pendiente.',
      'Devuelve 2, y quedan 2 pendientes: la que ya estaba pendiente se salta.',
      'Devuelve 5, y quedan 1 pendiente: las demás se vuelven a analizar desde cero.'
    ],
    answer: 0,
    explain: 'El <code>UPDATE</code> toca solo las filas en <code>en_curso</code> y <code>rowcount</code> dice cuántas fueron: 2. Las 2 <code>hecho</code> no se tocan, que es lo que evita pagarlas otra vez. Pendientes: las 2 recuperadas y la que ya estaba, 3.'
  }]
});

SD.defineExercise('ia08-p-modelo', {
  kind: 'predict', title: 'cuánto cuesta una llamada',
  scenario: '<p><code>PRECIOS["claude"]</code> es (2, 10): dólares por millón de tokens de entrada y de salida. Una llamada devuelve <code>tokens_in = 3000</code> y <code>tokens_out = 500</code>.</p>',
  steps: [{
    id: 'costo', type: 'single',
    prompt: '¿Cuánto devuelve <code>costo("claude", 3000, 500)</code>?',
    options: ['0.006 USD', '0.011 USD', '0.016 USD', '0.110 USD'],
    fixed: true,
    answer: 1,
    explain: '(3 000 × 2 + 500 × 10) ÷ 1 000 000 = (6 000 + 5 000) ÷ 1 000 000 = 0.011. Los 0.006 son solo la entrada; los 0.016 sumarían los 500 de salida a precio de entrada por error de cuenta; los 0.110 se corren una cifra.'
  }]
});

SD.defineExercise('ia08-p-prompts', {
  kind: 'predict', title: 'un código que intenta cerrar la etiqueta',
  scenario: '<p>Una línea de código dice <code>x = "a" &amp; "b"</code> y otra, <code>&lt;/candidato&gt;</code>. Las pasas por <code>escapar</code>, que usa <code>html.escape(texto, quote=False)</code>.</p>',
  steps: [{
    id: 'salida', type: 'single',
    prompt: '¿Qué queda de la primera línea, <code>x = "a" &amp; "b"</code>?',
    options: [
      '<code>x = &amp;quot;a&amp;quot; &amp;amp; &amp;quot;b&amp;quot;</code>, con todo escapado, comillas incluidas.',
      '<code>x = "a" &amp;amp; "b"</code>: solo el &amp; cambia, porque <code>quote=False</code> deja las comillas.',
      '<code>x = "a" &amp; "b"</code>: sin cambios, porque ese texto no puede cerrar una etiqueta.',
      '<code>x = \'a\' &amp;amp; \'b\'</code>: las comillas dobles pasan a simples y el &amp; se escapa.'
    ],
    answer: 1,
    explain: '<code>html.escape</code> cambia siempre <code>&amp;</code>, <code>&lt;</code> y <code>&gt;</code>; las comillas solo si <code>quote=True</code>. Con <code>quote=False</code> quedan igual. Escapar el <code>&amp;</code> también importa: si no, una línea con <code>&amp;lt;/candidato&amp;gt;</code> escrita a mano se vería, al decodificar, como una etiqueta. La segunda línea queda como <code>&amp;lt;/candidato&amp;gt;</code>.'
  }]
});

SD.defineExercise('ia08-p-limites', {
  kind: 'predict', title: 'tres reservas contra un tope',
  scenario: '<p><code>Presupuesto(Decimal("0.02"))</code> sin gasto previo. Pides, una tras otra, <code>reservar(Decimal("0.008"))</code> tres veces, sin liquidar ni liberar.</p>',
  steps: [{
    id: 'respuestas', type: 'single',
    prompt: '¿Qué devuelven las tres?',
    options: [
      '<code>True True True</code>: cada una es menor que el tope.',
      '<code>True True False</code>: la tercera haría 0.024 y el tope es 0.02.',
      '<code>True False False</code>: con la segunda ya se pasa del tope.',
      '<code>False False False</code>: ninguna es segura sin saber el gasto real.'
    ],
    answer: 1,
    explain: '<code>reservar</code> compara gastado + reservado + estimado con el tope. Primera: 0.008 ≤ 0.02. Segunda: 0.016 ≤ 0.02. Tercera: 0.024 > 0.02, devuelve <code>False</code> y no reserva. Por eso con 4 llamadas en vuelo no te pasas del tope: la suma incluye lo que todavía no volvió.'
  }]
});

SD.defineExercise('ia08-p-fases', {
  kind: 'predict', title: 'tres hallazgos de la misma categoría',
  scenario: '<p>Tres hallazgos brutos del mismo archivo y la misma categoría, en las líneas 6, 9 y 13 (cada uno con <code>linea_fin</code> igual a su línea). <code>CERCA</code> vale 3. Llamas a <code>deduplicar</code>.</p>',
  steps: [{
    id: 'cuantos', type: 'single',
    prompt: '¿Cuántos hallazgos salen?',
    options: ['1', '2', '3', '0'],
    fixed: true,
    answer: 1,
    explain: 'Se ordenan por línea y se compara cada uno con el último que quedó. El de la 9 está a 9 − 6 = 3 líneas del de la 6: 3 ≤ 3, se junta y el último ahora termina en la 9. El de la 13 está a 13 − 9 = 4: más que 3, es otro. Salen 2: uno de las líneas 6 a 9 y otro de la 13.'
  }]
});

SD.defineExercise('ia08-p-procesar', {
  kind: 'predict', title: 'cuánto espera el tercer reintento',
  scenario: '<p><code>espera_de(intento, pedida, azar)</code> devuelve <code>pedida</code> si no es <code>None</code>, y si no, <code>min(60, 2 ** (intento − 1)) × (0.5 + azar())</code>. Llamas a <code>espera_de(3, None, lambda: 0.5)</code>.</p>',
  steps: [{
    id: 'segundos', type: 'single',
    prompt: '¿Cuántos segundos devuelve?',
    options: ['2.0', '4.0', '6.0', '8.0'],
    fixed: true,
    answer: 1,
    explain: '2 ** (3 − 1) = 4, y el tope de 60 no se alcanza. El azar da 0.5, entonces el factor es 0.5 + 0.5 = 1.0 y la espera es 4.0 s. Con el azar entre 0 y 1 el factor va de 0.5 a 1.5: dos tareas que fallaron juntas no vuelven a la vez.'
  }]
});

SD.defineExercise('ia08-p-cli', {
  kind: 'predict', title: 'analizar dos veces',
  scenario: '<p>Después de <code>uv run minisec escanear</code> y un <code>uv run minisec analizar</code> que terminó con las 5 tareas hechas, corres <code>uv run minisec analizar</code> otra vez.</p>',
  steps: [{
    id: 'tareas', type: 'single',
    prompt: '¿Qué dice la línea de las tareas nuevas, y cuántas llamadas hace al modelo?',
    options: [
      '<code>analisis: 5 tareas nuevas</code>, y 5 llamadas: repite lo que ya estaba.',
      '<code>analisis: 0 tareas nuevas, 0 pendientes</code>, y 0 llamadas.',
      '<code>analisis: 0 tareas nuevas</code>, pero 5 llamadas porque las hechas se revalidan.',
      '<code>analisis: 22 tareas nuevas</code>: la segunda vez cuenta cada candidato aparte.'
    ],
    answer: 1,
    explain: 'La clave de cada lote depende de la fase, la versión del prompt, el modelo y los candidatos. Con los mismos candidatos la clave es la misma, <code>INSERT OR IGNORE</code> no inserta y <code>crear_tarea</code> devuelve 0. Las 5 ya están <code>hecho</code>, no hay pendientes y no sale ninguna llamada. Si cambias <code>VERSION</code> en <code>prompts.py</code> o el modelo, las claves cambian y sí se vuelve a pagar: es a propósito.'
  }]
});

SD.defineExercise('ia08-p-pruebas', {
  kind: 'predict', title: 'una respuesta que no es JSON',
  scenario: '<p>El cliente de prueba <code>PrimeroMalo</code> contesta con un texto que no es JSON la primera vez que lo llaman y, a partir de ahí, como un oráculo. Hay 5 tareas de análisis y <code>intentos = 4</code>.</p>',
  steps: [{
    id: 'llamadas', type: 'single',
    prompt: '¿Cuántas llamadas hace el cliente en total, y cuántas se cobran?',
    options: [
      '5 llamadas, 5 cobradas: la mala no cuenta porque no se pudo leer.',
      '6 llamadas, 5 cobradas: la mala se descarta sin cobrarla, porque no se pudo interpretar como JSON.',
      '6 llamadas, 6 cobradas: la respuesta mala vino del servidor, y se paga.',
      '10 llamadas, 6 cobradas: cada tarea reintenta una vez por si acaso.'
    ],
    answer: 2,
    explain: 'Una tarea hace una llamada de más: 5 + 1 = 6. El servidor contestó 200 con tokens, y el proveedor los cobra aunque el JSON esté mal: por eso <code>ErrorFormato</code> pasa por <code>liquidar</code> antes de reintentar. Con 0.005 USD por llamada, el gasto es 6 × 0.005 = 0.030, y es lo que comprueba <code>test_una_respuesta_que_no_es_json_se_reintenta_y_se_cobra</code>.'
  }]
});

SD.defineExercise('ia08-p-fallas', {
  kind: 'predict', title: 'el tope se acaba a la mitad',
  scenario: '<p>El script corre el análisis con un tope tan bajo que no alcanza para los 5 lotes. Después sube el tope y corre otra vez. El cliente cuenta sus llamadas.</p>',
  steps: [{
    id: 'total', type: 'single',
    prompt: '¿Cuántas llamadas hizo el cliente en total entre las dos pasadas?',
    options: ['Más de 5: los lotes que cortó el tope se repiten.', 'Exactamente 5: nada se repite.', 'Menos de 5: la segunda pasada reutiliza respuestas.', '10: cada pasada intenta los 5.'],
    answer: 1,
    explain: 'Una tarea que no alcanza el presupuesto no se lanza: vuelve a pendiente sin llamar. La segunda pasada solo toma las pendientes. Entre las dos se hacen las 5 llamadas, ninguna repetida. Es lo que verifica <code>cliente.llamadas == 5</code> en el script.'
  }]
});

SD.defineExercise('ia08-p-evals', {
  kind: 'predict', title: 'el recall de un modelo perfecto',
  scenario: '<p>El modelo ve todos los candidatos que le llegan, los clasifica bien y confirma cada hallazgo. Hay 11 fallas plantadas y la regla V11 no existe: ninguna regla sospecha de <code>pedidos.py</code>.</p>',
  steps: [{
    id: 'recall', type: 'single',
    prompt: '¿Cuánto da el recall máximo?',
    options: ['1.000', '0.909', '0.818', '0.500'],
    fixed: true,
    answer: 1,
    explain: 'Un modelo no encuentra lo que nunca ve. Las 10 plantadas que alguna regla sospecha sí le llegan; V11 no. Recall = 10 ÷ 11 ≈ 0.909. Si tu modelo saca 1.000, algo está mal en la medición, por ejemplo un hallazgo que cae cerca de V11 por casualidad.'
  }]
});
