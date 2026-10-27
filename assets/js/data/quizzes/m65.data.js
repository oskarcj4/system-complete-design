SD.defineQuiz('m65', {
  title: 'Quiz: elegir un harness', pass: 0.7,
  questions: [
    { id: 'ranking', type: 'single',
      prompt: 'Un harness encabeza un ranking público de agentes de código. ¿Para qué sirve ese dato en tu decisión?',
      options: [
        'Para decidir, porque el benchmark usa repositorios reales y eso lo hace representativo de cualquier equipo',
        'Para nada, porque los rankings públicos están inflados por los proveedores y no miden nada útil',
        'Para la lista corta: mide sus tareas y su combinación de harness y modelo, que no son las de tu equipo',
        'Para elegir el modelo, pero no el harness, porque el benchmark fija siempre el mismo harness'
      ],
      answer: 2,
      explain: 'El resultado depende de tareas, harness y modelo a la vez. El ranking fija al menos una en un valor que no es el tuyo. Ver 65.1.' },
    { id: 'elim', type: 'single',
      prompt: 'El código no puede salir de la red de la empresa. En la matriz, ¿cómo se trata ese criterio?',
      options: [
        'Como eliminatorio: el harness que no pueda apuntar a un servidor propio queda fuera aunque gane en lo demás',
        'Con el peso más alto de la matriz, para que el harness que lo cumpla tenga ventaja en el ranking final',
        'Como un criterio más, porque un harness muy extensible puede compensar con otras virtudes',
        'Fuera de la matriz: se resuelve después, con un contrato de zero data retention con cualquier proveedor'
      ],
      answer: 0,
      explain: 'Un criterio que, si no se cumple, invalida el harness, no suma puntos: descarta. Mezclarlos deja ganar a uno que no puede usarse. ZDR no cambia que los datos salgan. Ver 65.2.' },
    { id: 'abierto', type: 'single',
      prompt: 'Eliges un harness con licencia MIT para que los datos no salgan. ¿Qué falta revisar?',
      options: [
        'Nada: un harness abierto no puede mandar datos a terceros porque cualquiera vería el código que lo hace',
        'Solo la telemetría, porque los prompts de un harness abierto se procesan siempre en la máquina local',
        'Que la licencia MIT permita uso comercial, porque sin eso no se puede usar dentro de una empresa',
        'A qué servidor de modelo lo apuntas: contra una API comercial manda lo mismo que uno con licencia propietaria'
      ],
      answer: 3,
      explain: 'Lo que deja los datos en tu red es el servidor del modelo. La licencia te deja auditar qué hace el harness. Ver 65.6.' },
    { id: 'cache', type: 'single',
      prompt: 'En la cuenta de 65.7, ¿qué pasa con el costo si el harness rompe la caché del prefijo en cada turno?',
      options: [
        'Nada importante: la caché solo ahorra latencia, el precio por token de entrada es el mismo',
        'La entrada se paga casi entera: la parte que era lectura de caché pasa a precio completo',
        'Baja, porque ya no se pagan las escrituras de caché a 1.25 veces el precio de entrada',
        'Sube solo la salida, porque el modelo tiene que volver a generar lo que estaba cacheado'
      ],
      answer: 1,
      explain: 'Con 85 % leído de caché, la entrada cuesta 0.33 USD por tarea; sin caché, 1.2 USD. Lectura a 0.1 veces el precio, escritura a 1.25. Ver 65.7 y M64.8.' },
    { id: 'veredicto', type: 'single',
      prompt: 'En el set de tareas propio, ¿quién decide si una tarea se resolvió?',
      options: [
        'El agente, que al terminar dice si cumplió el pedido, porque es quien conoce los detalles de lo que hizo',
        'Un LLM como juez que compara el diff del agente con el del PR original y puntúa el parecido',
        'Una prueba que pasa con el arreglo y falla sin él, corrida después de que el agente termina',
        'Una persona del equipo que revisa cada diff, porque las pruebas no capturan la intención del cambio'
      ],
      answer: 2,
      explain: 'Un agente que dice "listo" no terminó hasta que la prueba pasa. Un diff distinto al original puede ser correcto. Revisar a mano no escala a cientos de corridas. Ver 65.8.' },
    { id: 'passk', type: 'single',
      prompt: 'Un agente va a corregir fallas en CI sin nadie que revise cada intento. ¿Qué métrica importa más?',
      options: [
        'pass^k: que la tarea se resuelva todas las veces, porque cada fallo cuesta',
        'pass@k: que se resuelva alguna vez en k intentos, porque CI puede reintentar',
        'La tasa por intento, porque pass@k y pass^k se deducen de ella en cualquier caso',
        'El costo por token, porque en CI la calidad ya la garantizan las pruebas'
      ],
      answer: 0,
      explain: 'pass@k sirve cuando alguien elige entre intentos; sin nadie mirando, lo que importa es la consistencia. Solo con tasas iguales en todas las tareas se deducen de p. Ver 65.8.' },
    { id: 'p08', type: 'single',
      prompt: 'Si cada intento acierta con p = 0.8, ¿cuánto da pass^4?',
      options: ['80 %', '41 %', '99.8 %', '20 %'], fixed: true,
      answer: 1,
      explain: 'pass^4 = 0.8^4 = 0.4096, cerca de 41 %. pass@4 sería 1 − 0.2^4 = 99.84 %. Ver 65.8.' },
    { id: 'ruido', type: 'single',
      prompt: 'Con 50 tareas, B acierta 78 % por intento y A 70 %. ¿Qué concluyes?',
      options: [
        'Que B es mejor: 8 puntos es una diferencia grande para un agente de código',
        'Que A es mejor, porque una diferencia chica suele indicar que B se sobreajustó al set de tareas',
        'Que no se distingue del ruido sin parear: el intervalo del 95 % ronda ±17 puntos',
        'Que hay que repetir con k más alto, porque más intentos por tarea eliminan el ruido del set'
      ],
      answer: 2,
      explain: 'El error estándar de la diferencia con 50 tareas es cerca de 0.088; por 1.96, ±17 puntos. Más intentos por tarea no quitan el ruido de qué tareas se eligieron: hacen falta más tareas o parear. Ver 65.9 y el widget.' },
    { id: 'diseno', type: 'single',
      prompt: 'Quieres saber si conviene cambiar de harness, de modelo, o de los dos. ¿Qué diseño usas?',
      options: [
        'Cambiar los dos a la vez y comparar con lo actual, que es lo más barato y responde lo que importa',
        'Un 2 × 2: dos harnesses por dos modelos, todos sobre las mismas tareas y con los mismos k intentos',
        'Primero el modelo con el harness actual, y si mejora, quedarse sin probar el otro harness',
        'Un benchmark público para el modelo y tu set de tareas solo para el harness'
      ],
      answer: 1,
      explain: 'Cambiando dos cosas a la vez no sabes cuál ayudó; puede que una mejore y la otra empeore. El 2 × 2 separa los efectos. Ver 65.9.' },
    { id: 'salir', type: 'multi',
      prompt: '¿Qué abarata cambiar de harness más adelante? (varias)',
      options: [
        'Escribir las reglas del proyecto en AGENTS.md y hacer que el CLAUDE.md del repositorio lo importe',
        'Poner las integraciones en servidores MCP en lugar de en hooks propios',
        'Configurar todo en los formatos propios del harness, que son los más completos',
        'Mantener el set de tareas versionado para comparar el reemplazo'
      ],
      answer: [0, 1, 3],
      explain: 'Los formatos abiertos viajan; los propios se reescriben. El set de tareas es lo que permite comparar el próximo candidato en un día. Ver 65.11.' }
  ]
});
