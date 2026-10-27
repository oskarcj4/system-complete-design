SD.defineExercise('m69-orq', {
  title: 'un bot que revisa los PR de 40 repositorios',
  scenario: '<p>Una empresa tiene 40 repositorios y unos 60 pull requests por día entre todos. Quiere un bot que revise cada PR buscando vulnerabilidades con un agente, comente lo nuevo y no cueste más de 300 USD al mes. Algunos repositorios aceptan PR de personas externas desde forks. La clave del modelo admite 50 requests por minuto, y en una prueba cada lote de 5 archivos hizo 40 llamadas en 6 minutos y costó 1.50 USD.</p>',
  steps: [
    { id: 'unidad', type: 'single',
      prompt: '¿Qué recibe cada agente?',
      options: [
        'Un lote de los archivos cambiados del PR que tienen candidatos, agrupados por módulo',
        'El repositorio entero en cada PR, para que el agente vea el contexto completo del código',
        'Una línea sospechosa por sesión, para que cada hallazgo quede bien atribuido a su origen',
        'El diff completo de todos los PR del día juntos, en una sola sesión nocturna del bot'
      ],
      answer: 0,
      explain: 'El diff acota el trabajo y los candidatos lo filtran sin costo. Una línea por sesión paga muchos arranques; el repositorio entero en cada PR es la factura de un escaneo completo 60 veces por día; juntar el día entero da una sesión gigante que llega tarde.' },
    { id: 'estado', type: 'single',
      prompt: 'El runner de CI a veces se recicla a mitad de un job. ¿Cómo evitas pagar dos veces?',
      options: [
        'Guardar el estado en memoria y reintentar el job completo cuando el runner vuelve',
        'Un registro por lote con estado y reclamo con plazo, en un almacenamiento que sobreviva al runner',
        'Lanzar cada PR dos veces en runners distintos y quedarte con el resultado del primero que termine',
        'Subir el timeout del job a varias horas para que el runner no llegue a reciclarse'
      ],
      answer: 1,
      explain: 'Con el estado afuera y un lease por lote, un corte cuesta el lote en curso. En memoria, el reintento repite todo; duplicar el trabajo duplica la factura; el timeout no evita que el runner se recicle.' },
    { id: 'conc', type: 'single',
      prompt: '¿Cuántos lotes a la vez, en total, entre todos los PR?',
      options: [
        'Unos 20, para que un PR grande no espere detrás de otros en las horas pico',
        'Uno por PR abierto, sin tope, porque cada repositorio tiene su propio runner',
        'Unos 6, con un tope compartido por todos los jobs, para dejar margen bajo el límite',
        'Unos 7 por repositorio, porque el límite de requests se cuenta por cada uno'
      ],
      answer: 2,
      explain: 'Un lote pide 40 ÷ 6 ≈ 6.7 requests por minuto: 50 ÷ 6.7 ≈ 7.5 es el techo, y 6 deja margen para reintentos. El límite es de la clave, compartida por todos los jobs, así que el tope también tiene que ser compartido; 20 llenaría todo de 429.' },
    { id: 'presu', type: 'single',
      prompt: 'Con 60 PR por día, ¿cómo te quedas dentro de 300 USD al mes?',
      options: [
        'Revisar el costo al final de cada mes y apagar el bot si la factura pasó el tope',
        'Bajar la calidad del modelo para todos los PR hasta que el promedio entre en el tope',
        'Un tope por tarea con max_budget_usd y nada más, porque cada lote ya tiene su límite',
        'Un tope por tarea y una reserva contra el saldo del mes antes de lanzar cada lote'
      ],
      answer: 3,
      explain: '300 USD al mes son 200 lotes de 1.50 USD, unos 6 o 7 por día: hay que saber cuánto queda antes de lanzar. El tope por tarea protege de un agente perdido, no del total; revisar al final llega tarde; bajar el modelo a ciegas no garantiza nada.' },
    { id: 'forks', type: 'single',
      prompt: '¿Qué haces con los PR que vienen de forks?',
      options: [
        'Los escaneas igual que los demás, en el mismo job, porque el código de un fork es el que más hay que revisar',
        'Sin la clave en ese job: un job aparte que una persona aprueba o que corre en una caja aislada',
        'Les pides a los autores externos que agreguen su propia clave del modelo como secreto',
        'Los ignoras siempre, porque el código externo no llega a main sin una revisión humana'
      ],
      answer: 1,
      explain: 'Un fork trae código de un tercero: escanearlo con tu clave en el job es dársela. Hay que revisarlo, pero sin el secreto al alcance. Los forks no pueden agregar secretos al repositorio, e ignorarlos deja sin revisar justo lo de afuera.' },
    { id: 'segunda', type: 'single',
      prompt: 'Los desarrolladores se quejan de que la mitad de los comentarios son falsos positivos. ¿Qué cambias primero?',
      options: [
        'Revalidar con otro agente los hallazgos de severidad alta antes de comentarlos',
        'Pedir en el prompt que el agente reporte solo lo que tenga confianza alta',
        'Comentar solo una vez por semana, con todos los hallazgos acumulados del período',
        'Ampliar los matchers para que cada agente tenga más contexto alrededor del candidato'
      ],
      answer: 0,
      explain: 'Una segunda opinión con otro contexto baja los falsos positivos donde importan, y entra en el presupuesto si se limita a severidad alta. Pedir confianza en el prompt no la verifica; agrupar por semana no reduce el ruido; matchers más amplios suben el volumen.' }
  ],
  solution: '<ul><li><b>Unidad:</b> lotes de archivos cambiados con candidatos, agrupados por módulo.</li><li><b>Estado:</b> un registro por lote fuera del runner, con reclamo con plazo y cierre condicionado.</li><li><b>Concurrencia:</b> unos 6 lotes en vuelo con un tope compartido por todos los jobs de la clave.</li><li><b>Presupuesto:</b> tope por tarea y reserva contra el saldo del mes antes de lanzar; lo que no entra queda pendiente.</li><li><b>Forks:</b> sin secretos en el job; aprobación humana o caja aislada con la credencial afuera.</li><li><b>Ruido:</b> revalidar severidad alta y comentar solo los hallazgos nuevos, deduplicados por clave estable.</li></ul>'
});
