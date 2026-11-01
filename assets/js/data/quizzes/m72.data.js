SD.defineQuiz('m72', {
  title: 'Quiz: evals de agentes', pass: 0.7,
  questions: [
    { id: 'final', type: 'single',
      prompt: 'Un equipo evalúa su agente de código con un LLM juez que lee el mensaje final y decide si la tarea quedó resuelta. ¿Cuál es el problema principal?',
      options: [
        'Que el juez es caro: conviene un modelo más chico que lea el mismo mensaje final',
        'Que el agente dice "listo" resuelva o no; hay que mirar el estado final',
        'Que el mensaje final es demasiado corto para que el juez tenga suficiente contexto',
        'Ninguno: si el juez está calibrado contra personas, el mensaje final alcanza'
      ],
      answer: 1,
      explain: 'El mensaje final es lo menos confiable de una corrida. El resultado se juzga con tests ocultos sobre el estado final, y el proceso con la trayectoria. Ver 72.1.' },
    { id: 'tray', type: 'single',
      prompt: 'Una corrida arregla el bug y los tests ocultos pasan, pero en el camino el agente corrió <code>git push --force</code>. ¿Qué grader lo detecta?',
      options: [
        'Los tests ocultos, si se corren de nuevo un rato después del push',
        'Una regla sobre la trayectoria que revisa los comandos que corrió',
        'El LLM juez, que lee el parche final y decide si es correcto',
        'El presupuesto de tokens, porque un push forzado consume más'
      ],
      answer: 1,
      explain: 'El estado final está bien; lo peligroso está en el camino. Las reglas sobre los pasos son código: baratas y sin ruido. Ver 72.1 y 72.6.' },
    { id: 'diagonal', type: 'single',
      prompt: 'Comparas el harness 1 con el modelo A contra el harness 2 con el modelo B y el segundo saca 8 puntos más. ¿Qué puedes concluir?',
      options: [
        'Que el modelo B es mejor, porque el modelo pesa más que el harness en el resultado',
        'Nada sobre la causa: cambiaron dos cosas a la vez, harness y modelo',
        'Que el harness 2 es mejor, porque los harnesses explican la mayor parte de la diferencia',
        'Que la combinación es mejor solo si la diferencia supera los 5 puntos'
      ],
      answer: 1,
      explain: 'Es una comparación en diagonal. Se cambia una cosa por vez, con lo demás fijo. Ver 72.4.' },
    { id: 'contam', type: 'single',
      prompt: 'Un modelo nuevo saca 20 puntos más que el anterior en un benchmark público y casi lo mismo en tu set propio. ¿Cuál es una explicación probable?',
      options: [
        'Tu set propio está mal: si el benchmark sube, tu set tiene que subir también',
        'Contaminación, o que el benchmark mide algo distinto de tu trabajo',
        'Que el benchmark usa más corridas por tarea y por eso su número es más alto',
        'Que tu set propio tiene tests ocultos, que siempre bajan el puntaje de un modelo nuevo'
      ],
      answer: 1,
      explain: 'Si las tareas estaban en el entrenamiento, el modelo recuerda. Y un benchmark mide sus tareas, no las tuyas. Se decide con el set propio. Ver 72.3.' },
    { id: 'ocultos', type: 'single',
      prompt: '¿Por qué los tests de una tarea de eval no están en el repositorio que ve el agente?',
      options: [
        'Para que la corrida sea más rápida, porque el agente no pierde tiempo leyéndolos',
        'Para que el agente no ajuste el código a los tests en lugar de arreglar el problema',
        'Porque los harnesses no permiten correr tests que estén dentro del repositorio',
        'Para ahorrar tokens de contexto, ya que los tests suelen ser archivos muy largos'
      ],
      answer: 1,
      explain: 'Con los tests a la vista, el agente puede escribir un caso especial o borrar el test que falla. Ver 72.5 y 72.6.' },
    { id: 'commit', type: 'single',
      prompt: 'Una tarea del set apunta a la rama <code>main</code> del repositorio. ¿Qué pasa con el tiempo?',
      options: [
        'Nada: main es la versión más estable y la tarea refleja el código actual',
        'La tarea cambia sola: puede volverse trivial, imposible o dejar de correr',
        'El eval se vuelve más estricto, porque main tiene más tests que un commit viejo',
        'El costo de la tarea baja, porque main tiene el código más optimizado'
      ],
      answer: 1,
      explain: 'Una tarea es un commit fijo con una imagen fija. Una tarea que cambia es otra tarea, y la comparación con la línea base deja de valer. Ver 72.5.' },
    { id: 'ic', type: 'single',
      prompt: 'Con 50 tareas y una tasa de 0.6, ¿cuál es aproximadamente el intervalo del 95&#8239;%?',
      options: ['± 3.4 puntos', '± 6.8 puntos', '± 13.6 puntos', '± 27 puntos'], fixed: true,
      answer: 2,
      explain: '1.96 × √(0.6 × 0.4 ÷ 50) ≈ 0.136. Con 200 tareas, la mitad: 6.8. Comparar pareado lo achica. Ver 72.7.' },
    { id: 'costo', type: 'single',
      prompt: 'A 0.447 USD por tarea, ¿cuánto cuesta correr 50 tareas con 5 corridas cada una?',
      options: ['22.35 USD', '111.75 USD', '223.50 USD', '447 USD'], fixed: true,
      answer: 1,
      explain: '50 × 5 × 0.447 = 111.75 USD. Por eso el set completo corre de noche y en cada PR va un subconjunto. Ver 72.7 y 72.8.' },
    { id: 'ci', type: 'multi',
      prompt: '¿Qué cambios deberían disparar los evals del agente en CI? Marca todos los que correspondan.',
      options: [
        'Un cambio en el system prompt que el agente recibe en cada sesión',
        'Una herramienta nueva o una descripción de herramienta reescrita',
        'Un cambio de color en la interfaz web',
        'Subir la versión fijada del modelo o la del harness que lo corre'
      ],
      answer: [0, 1, 3],
      explain: 'Dispara un eval todo lo que cambia lo que el modelo ve o puede hacer. La interfaz no lo cambia. Ver 72.8.' },
    { id: 'seg', type: 'single',
      prompt: 'Una defensa contra injection baja el éxito de los ataques del 20&#8239;% al 2&#8239;% y la utilidad del 70&#8239;% al 35&#8239;%. ¿Cómo se lee?',
      options: [
        'Como un éxito: lo único que importa en un eval de seguridad es el éxito de los ataques',
        'Como un costo alto: hay que mirar las dos métricas y buscar otra defensa o calibrarla',
        'Como un error de medición, porque una defensa no puede cambiar la utilidad del agente',
        'Como un empate: lo que gana en seguridad lo pierde en utilidad, y da lo mismo usarla'
      ],
      answer: 1,
      explain: 'Como en AgentDojo, una defensa se juzga por las dos métricas, igual que en M71 con los falsos rechazos. Ver 72.9.' }
  ]
});
