SD.defineExercise('m72-evals', {
  title: 'los evals del agente que arregla bugs de facturación',
  scenario: '<p>Un equipo de 12 personas usa un agente de código para arreglar bugs del servicio de facturación. Hoy lo juzgan "a ojo". Quieren pasar a un modelo nuevo y cambiar el system prompt, y necesitan saber si mejora. Tienen el historial de 300 PRs de bugs de los últimos dos años y un presupuesto de 600 USD por mes para evals. Cada tarea cuesta unos 0.447 USD.</p>',
  steps: [
    { id: 'origen', type: 'single',
      prompt: '¿De dónde sacan las tareas del set?',
      options: [
        'De SWE-bench Verified, porque son tareas revisadas por personas y ya traen tests',
        'De sus PRs: commit anterior al arreglo, el issue como enunciado y tests ocultos',
        'Le piden al mismo agente que invente 200 bugs de facturación con sus soluciones',
        'De los mensajes del canal de soporte, con la respuesta que dio la persona como esperada'
      ],
      answer: 1,
      explain: 'Son el trabajo que el agente va a hacer, con tests reales. SWE-bench no es su código; tareas inventadas por el agente se contaminan solas; el soporte no tiene estado final que juzgar. Ver 72.5.' },
    { id: 'graders', type: 'single',
      prompt: '¿Con qué graders juzgan cada corrida?',
      options: [
        'Un LLM juez que lee la trayectoria entera y pone una nota del 1 al 10',
        'Tests ocultos, reglas de alcance, presupuesto y un juez solo para la explicación',
        'Lo que dice el agente al final, verificado por una persona en cada corrida',
        'Solo los tests ocultos: lo demás es estilo y no cambia si el bug quedó arreglado'
      ],
      answer: 1,
      explain: 'Lo objetivo con código; el juez solo para lo que el código no ve. Una persona en cada corrida no escala; solo tests deja pasar caminos peligrosos. Ver 72.6.' },
    { id: 'tamano', type: 'single',
      prompt: 'Con 600 USD al mes, ¿qué tamaño de set y cuántas corridas?',
      options: [
        '300 tareas con 5 corridas cada noche, para tener la máxima precisión posible',
        '20 tareas con 1 corrida, para gastar lo menos posible y correrlas en cada PR',
        '100 tareas × 5 en las corridas grandes y un subset de 20 en los PRs',
        '300 tareas con 1 corrida, porque más tareas siempre es mejor que más corridas'
      ],
      answer: 2,
      explain: '300 × 5 × 0.447 son 670 USD por noche: imposible. 20 tareas tienen un intervalo enorme. 100 × 5 = 500 corridas, unos 224 USD: dos corridas grandes al mes y subsets baratos en los PRs. Ver 72.7.' },
    { id: 'comparar', type: 'single',
      prompt: 'Quieren el modelo nuevo y el prompt nuevo. ¿Cómo lo comparan?',
      options: [
        'Ambos cambios juntos contra la versión actual, en una sola corrida grande',
        'Primero el modelo nuevo con el prompt actual; luego el prompt con el ganador',
        'El modelo nuevo en un benchmark público y el prompt nuevo en el set propio',
        'Le preguntan al equipo cuál de las dos versiones le gustó más durante una semana'
      ],
      answer: 1,
      explain: 'Una cosa por vez, con lo demás fijo, en el mismo set y pareado. Juntos no se sabe qué produjo la diferencia. Ver 72.4.' },
    { id: 'umbral', type: 'single',
      prompt: 'El modelo nuevo sale 3 puntos arriba con 100 tareas, comparado pareado, y el intervalo de la diferencia es ±5. ¿Qué hacen?',
      options: [
        'Lo adoptan: 3 puntos arriba es una mejora y cualquier mejora vale',
        'Lo descartan: si no supera el intervalo, el modelo nuevo es peor',
        'Nada demostrado: deciden por costo, latencia o seguridad, o miden más',
        'Repiten la corrida hasta que salga una diferencia mayor que el intervalo'
      ],
      answer: 2,
      explain: 'Una diferencia dentro del ruido no dice que sea mejor ni peor. Se decide con las otras dimensiones o con más tareas; repetir hasta que salga es buscar el resultado. Ver 72.7.' },
    { id: 'seguridad', type: 'single',
      prompt: 'El agente lee issues que escriben clientes. ¿Qué suman al set?',
      options: [
        'Nada: los issues los filtra el equipo de soporte antes de que lleguen',
        'Tareas con instrucciones plantadas, midiendo utilidad y ataque',
        'Un clasificador que borra del set los issues que parezcan sospechosos',
        'Una regla en el system prompt para que ignore instrucciones en los issues'
      ],
      answer: 1,
      explain: 'Es contenido no confiable: se mide con ataques plantados y dos métricas, como AgentDojo. Ver 72.9 y M71.7.' }
  ],
  solution: '<ul><li>Set: 100 tareas de sus PRs de bugs, cada una con el commit anterior al arreglo, una imagen fija, el issue como enunciado y los tests del PR ocultos.</li><li>Graders: tests ocultos, reglas de alcance (solo <code>facturacion/</code>) y comandos prohibidos, presupuesto por corrida, y un juez con rúbrica solo para la explicación del PR, calibrado con una muestra leída por personas.</li><li>Ruido y costo: 5 corridas por tarea en las corridas grandes (unos 224 USD), un subset de 20 tareas con una corrida en cada PR que cambie el prompt, las herramientas o las versiones; comparación pareada con intervalo.</li><li>Comparación: un cambio por vez; primero el modelo, después el prompt.</li><li>Seguridad: 15 o 20 tareas con instrucciones plantadas en el issue, con utilidad y éxito del ataque.</li><li>Mantenimiento: cada falla del agente en producción entra como tarea; el set tiene dueño y se revisa en PRs.</li></ul>'
});
