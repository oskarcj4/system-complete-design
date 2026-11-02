SD.defineExercise('m50-incidente', {
  title: 'el martes en que bajó el CTR',
  scenario: '<p>Martes, 11:40. El CTR del feed de Mercado Barrio bajó un <b>8&#8239;%</b> desde las 10:15, solo en Android y en web. No hay errores: la API responde a tiempo (p99 de <b>141 ms</b>) y el ranker no cambió desde el jueves. '
    + 'A las 10:05 se desplegó una versión nueva del job de Flink que calcula las features en tiempo real. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'mirar', type: 'single',
      prompt: '¿Qué miras primero?',
      options: [
        'La tasa de valores por defecto y la edad de las features en tiempo real, desde las 10:00',
        'El AUC offline del modelo del jueves, recalculado con los datos de esta mañana',
        'La latencia p99 de cada etapa, porque un feed más lento siempre tiene menos clics',
        'El código del ranker, porque un CTR que baja suele ser un error en la función de puntaje'
      ],
      answer: 0,
      explain: 'Algo cambió a las 10:05 y el síntoma empezó a las 10:15: lo primero es mirar si las features que produce ese job llegan, y cuán viejas. La latencia está dentro del presupuesto y el ranker no cambió. Repasa 50.4 y 50.8.'
    },
    {
      id: 'causa', type: 'single',
      prompt: 'La feature <code>clics_10m</code> pasó de 0.1&#8239;% a 34&#8239;% de valores por defecto, y el lag del consumidor de Flink crece desde las 10:05. ¿Qué pasa?',
      options: [
        'El modelo se volvió viejo: la gente cambió de gustos el martes y hay que reentrenarlo hoy',
        'El job se atrasa, llega el valor por defecto y el modelo ve algo que no vio al entrenar',
        'Es un efecto de novedad del despliegue de la app, que se va a corregir solo en unos días',
        'La caché de respaldo está sirviendo el feed de ayer a una parte de los usuarios activos'
      ],
      answer: 1,
      explain: 'Es training-serving skew producido por un pipeline: el modelo entrenó con clics_10m real y ahora recibe ceros. No da error, da peores órdenes. Que sea solo Android y web sugiere que esas particiones son las atrasadas. Repasa 50.4 y 50.8.'
    },
    {
      id: 'mitigar', type: 'single',
      prompt: '¿Qué haces ahora, antes de entender el bug del job?',
      options: [
        'Reentrenar el ranker con los datos de esta mañana, para que aprenda a usar el valor por defecto',
        'Volver el job a la versión anterior y, hasta que se ponga al día, rankear sin esa feature',
        'Apagar el ranking pesado y servir el feed de respaldo estático hasta que se arregle el job',
        'Subir el timeout del feature store de 15 a 60 ms para darle tiempo a que lleguen los valores'
      ],
      answer: 1,
      explain: 'Rollback de lo que cambió y, mientras se pone al día, un escalón de respaldo pensado para eso. Reentrenar con datos rotos enseña el error; el respaldo estático es un escalón demasiado abajo; y el timeout no sirve, porque el valor llega a tiempo, solo que viejo. Repasa 50.9.'
    },
    {
      id: 'log', type: 'single',
      prompt: '¿Qué haces con las impresiones de las 10:15 a las 12:00?',
      options: [
        'Nada especial: son datos reales de lo que la gente vio y entrenan igual que los demás',
        'Marcarlas y sacarlas del entrenamiento, porque las features que vio el modelo estaban rotas',
        'Borrarlas del log, para que no quede ningún registro de un feed que salió degradado',
        'Duplicarlas, para que el modelo aprenda más rápido a convivir con el valor por defecto cuando vuelva a pasar'
      ],
      answer: 1,
      explain: 'Si se entrena con ellas como si fueran normales, el modelo aprende de un feed que nadie eligió. Borrarlas pierde la evidencia del incidente. Se marcan y se excluyen. Repasa 50.9.'
    },
    {
      id: 'alertas', type: 'multi',
      prompt: '¿Qué alertas lo habrían detectado antes que el CTR? Elige todas las que correspondan.',
      options: [
        'La tasa de valores por defecto por feature, con umbral',
        'El lag del consumidor de Flink, con umbral',
        'El PSI por hora del puntaje del ranker',
        'La latencia p99 de la API del feed, medida etapa por etapa'
      ],
      answer: [0, 1, 2],
      explain: 'Las tres miden la causa o su efecto inmediato en el modelo. La latencia estuvo bien todo el tiempo: el incidente no la tocó. Repasa 50.8.'
    },
    {
      id: 'prevenir', type: 'single',
      prompt: '¿Qué cambio del proceso evita que se repita?',
      options: [
        'Prohibir los despliegues del job de Flink en horario laboral, para que nunca afecten el pico de tráfico de la mañana',
        'Desplegar el job nuevo en shadow, en un espacio aparte, y comparar sus valores con el viejo',
        'Reentrenar el ranker todos los días a las 10:00, justo después de cada despliegue del job',
        'Quitar las features en tiempo real del modelo, porque son las que fallan más seguido'
      ],
      answer: 1,
      explain: 'El job de features merece el mismo shadow que el modelo: corre a la par, se comparan los valores y el lag, y recién después pasa al feature store real. Prohibir horarios solo corre el problema y quitar las features pierde lo que más vale. Repasa 50.7.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Mirar:</b> lo que cambió (el job de Flink) y sus señales: valores por defecto y edad de las features.</li>'
    + '<li><b>Causa:</b> el job nuevo se atrasa, el feature store devuelve valores por defecto y el modelo recibe algo que no vio al entrenar.</li>'
    + '<li><b>Mitigar:</b> rollback del job y, mientras se pone al día, el ranker sin esa feature.</li>'
    + '<li><b>Log:</b> marcar y excluir las impresiones del incidente.</li>'
    + '<li><b>Alertas:</b> tasa de valores por defecto, lag del consumidor y PSI del puntaje.</li>'
    + '<li><b>Prevenir:</b> shadow para el job de features, como para el modelo.</li>'
    + '</ul>'
});
