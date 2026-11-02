SD.defineQuiz('m50', {
  title: 'Quiz: servir y operar un recomendador', pass: 0.7,
  questions: [
    { id: 'impresion', type: 'single',
      prompt: 'La API del feed publica las impresiones en Kafka. ¿Por qué lo hace sin esperar la confirmación?',
      options: [
        'Porque Kafka no confirma las escrituras de los productores, así que esperar no tendría efecto',
        'Para que un Kafka lento no agregue su latencia al feed: el log queda fuera del camino crítico',
        'Porque las impresiones se pueden perder sin problema: el entrenamiento usa solo los clics',
        'Para que la app reciba la respuesta antes y pueda mostrar los ítems mientras se registran'
      ],
      answer: 1,
      explain: 'El log es necesario para entrenar y medir, pero no para responder. Si se espera, cada tropiezo de Kafka se vuelve latencia del feed. Kafka sí confirma, y las impresiones importan: sin ellas no hay negativos ni propensión. Vuelve a 50.1.' },
    { id: 'mget', type: 'single', fixed: true,
      prompt: 'Leer las features de 9 000 candidatos con una llamada por ítem, a 0.2 ms cada una y en serie, ¿cuánto tarda?',
      options: ['18 ms', '180 ms', '1.8 s', '18 s'],
      answer: 2,
      explain: '9 000 × 0.2 ms = 1 800 ms. Por eso se piden por lotes, en una o pocas llamadas. Vuelve a 50.1.' },
    { id: 'cola', type: 'single', fixed: true,
      prompt: 'Diez fuentes de candidatos en paralelo, cada una pasa su p99 una vez cada cien. ¿En qué fracción de las requests alguna pasa su p99?',
      options: ['1&#8239;%', '4.9&#8239;%', '9.6&#8239;%', '10&#8239;%'],
      answer: 2,
      explain: '1 − 0.99¹⁰ ≈ 0.096. Con cinco fuentes, 4.9&#8239;%. Se acerca a 10&#8239;% pero no llega, porque a veces pasan dos a la vez. Vuelve a 50.2.' },
    { id: 'partir', type: 'single',
      prompt: 'El ranking pesado pasa de 500 a 2 000 ítems, repartidos en cuatro máquinas que puntúan 500 cada una a la vez. ¿Qué pasa?',
      options: [
        'La latencia se multiplica por cuatro, porque cada máquina tiene que esperar a que terminen las otras tres antes de responder',
        'La latencia queda casi igual y la flota crece unas cuatro veces: se compra latencia con dinero',
        'La latencia y la flota quedan iguales, porque las cuatro máquinas se reparten la misma carga',
        'La latencia baja, porque cada máquina recibe una parte más chica del trabajo de la request'
      ],
      answer: 1,
      explain: 'En paralelo, la latencia es la de una parte (500 ítems) más un poco de cola; pero se puntúan cuatro veces más ítems por segundo, así que la flota pasa de 20 a unas 78 GPUs. Vuelve a 50.2.' },
    { id: 'hibrido', type: 'single',
      prompt: 'Mercado Barrio tiene 50 M de usuarios registrados y 20 M activos por día. ¿Por qué no precalcula el feed entero de todos cada noche?',
      options: [
        'Porque el feed precalculado tendría hasta un día de atraso y gastaría cómputo en quien no entra',
        'Porque guardar 50 M de feeds no entra en ninguna base de datos clave-valor conocida',
        'Porque un feed precalculado no se puede leer en menos de 200 ms desde la caché del borde de la CDN',
        'Porque el ranking no se puede correr en lote: solo funciona con una request delante'
      ],
      answer: 0,
      explain: 'Precalcular es rápido de leer pero viejo, y el 60&#8239;% de los feeds no se abriría. 50 M de listas de 50 ids entran sin problema y se leen en milisegundos; el ranking sí corre en lote. Por eso el híbrido: candidatos guardados, ranking al pedir. Vuelve a 50.3.' },
    { id: 'streaming', type: 'single',
      prompt: '¿En qué caso las features en streaming no ganan casi nada frente a un lote cada hora?',
      options: [
        'Cuando el ítem es nuevo y todavía no tiene clics, porque el streaming necesita historia previa',
        'Cuando el ítem es estable: su CTR no cambia, y el valor de hace una hora es igual al de ahora',
        'Cuando el tráfico es alto, porque Flink no alcanza a procesar todos los eventos en segundos',
        'Cuando el modelo se entrena una vez por día, porque no sabría usar una feature más fresca'
      ],
      answer: 1,
      explain: 'La frescura vale lo que cambia la señal: con el ítem estable, los tres ritmos dan lo mismo en el simulador. El streaming sirve justamente para lo nuevo y lo viral, y escala con particiones. Vuelve a 50.4.' },
    { id: 'gpus', type: 'single', fixed: true,
      prompt: '6 944 444 puntuaciones por segundo × 20 MFLOP, en GPUs de 10 TFLOPS efectivos. ¿Cuántas GPUs sin holgura?',
      options: ['1.4', '7', '14', '139'],
      answer: 2,
      explain: '6 944 444 × 2 × 10⁷ ≈ 1.39 × 10¹⁴ FLOP/s; dividido 10¹³, 13.9. Con un 40&#8239;% de holgura, 20. 139 son los TFLOPS totales, no las GPUs. Vuelve a 50.5.' },
    { id: 'colision', type: 'single',
      prompt: 'Con hash, 50 M de usuarios en una tabla de 10 M filas. ¿Qué hace distinta una tabla sin colisiones?',
      options: [
        'Le da a cada id su propio vector, y acota la memoria con un filtro de frecuencia y un vencimiento',
        'Usa diez funciones hash distintas, así dos usuarios casi nunca caen en las mismas diez filas',
        'Guarda los vectores en disco en lugar de memoria, así entran los 50 M sin compartir filas',
        'Agrupa a los usuarios parecidos en la misma fila a propósito, así la colisión no hace daño'
      ],
      answer: 0,
      explain: 'Con 5 usuarios por fila, casi todos comparten vector. La tabla sin colisiones es un mapa de id a vector que crece; entra quien se vio varias veces y sale quien deja de aparecer. Así la describe Monolith. Vuelve a 50.6.' },
    { id: 'psi', type: 'single', fixed: true,
      prompt: 'Un puntaje tenía 25&#8239;% en cada uno de cuatro baldes y ahora tiene 10, 20, 30 y 40&#8239;%. ¿Cuánto da el PSI y qué dice la convención?',
      options: ['0.023: estable', '0.228: mirar', '0.30: actuar', '2.28: actuar'],
      answer: 1,
      explain: '0.137 + 0.011 + 0.009 + 0.071 = 0.228, entre 0.1 y 0.25: un cambio moderado que hay que mirar. Vuelve a 50.8.' },
    { id: 'degradar', type: 'multi',
      prompt: 'El ranker pesado se cae a la hora pico. ¿Qué es cierto? Elige todas las que correspondan.',
      options: [
        'El feed sigue respondiendo con el orden del ranking liviano',
        'Las respuestas degradadas se marcan en el log, para no entrenar con ellas',
        'Lo correcto es devolver un error 503 hasta que vuelva, para no mostrar un feed peor',
        'El feed de respaldo estático se regenera en ese momento llamando al liviano'
      ],
      answer: [0, 1],
      explain: 'El feed siempre responde: un escalón abajo está el orden del liviano, y cada respuesta degradada se marca. Una pantalla vacía cuesta más que un feed peor. El respaldo estático se regenera antes, cada hora, justamente para no depender de nada en el incidente. Vuelve a 50.9.' }
  ]
});
