SD.defineExercise('m42-metricas', {
  title: 'las métricas de "personas que quizás conozcas"',
  scenario: '<p>Mercado Barrio quiere que la red social del marketplace crezca. La superficie es <b>"personas que quizás conozcas"</b>: '
    + 'una fila de 10 perfiles en la pestaña de amigos, que se abre unas <b>30 millones de veces por día</b>. Hoy muestra a los vendedores con más '
    + 'seguidores del país. El equipo de producto dice: "queremos que la gente tenga más amigos". Vas a decidir la etiqueta, las métricas y la '
    + 'línea base antes de cualquier modelo, decisión por decisión; cada paso explica por qué, y el siguiente aparece cuando quieras seguir.</p>',
  steps: [
    {
      id: 'objetivo', type: 'single',
      prompt: '"Más amigos" es el objetivo del negocio. ¿Qué lo hace observable?',
      options: [
        'Contar las solicitudes de amistad enviadas desde la fila, porque es la acción que la superficie pide',
        'Contar las conexiones aceptadas que después tienen alguna interacción, como un mensaje o un comentario',
        'Preguntar en una encuesta mensual si la persona siente que tiene más amigos en la app que antes'
      ],
      answer: 1,
      explain: 'Una solicitud enviada no es un amigo: si nadie la acepta, o se acepta y nunca se usa, la red no creció. La encuesta mide lo correcto pero es feedback explícito: pocas respuestas, una por mes, y no sirve como etiqueta por impresión. La conexión aceptada con interacción es lo más cerca del objetivo que se puede observar.'
    },
    {
      id: 'etiqueta', type: 'single',
      prompt: '¿Qué etiqueta usa el modelo para cada perfil mostrado?',
      options: [
        'Envió solicitud a ese perfil en los 7 días siguientes, con una cabeza aparte para "la solicitud fue aceptada"',
        'Tocó el perfil para verlo, porque es la señal más abundante y llega en segundos',
        'La conexión tuvo un mensaje en los 30 días siguientes, como única etiqueta del modelo'
      ],
      answer: 0,
      explain: 'La de 30 días es la más fiel pero tarda un mes y tiene muy pocos positivos: un modelo solo con ella aprende lento y desactualizado. Tocar el perfil es curiosidad, no conexión (Goodhart con los perfiles llamativos). Dos cabezas, enviar y ser aceptada, combinan una señal rápida con una cercana al negocio; el mensaje a 30 días queda como métrica, no como etiqueta. Es la idea del ranking multi-tarea de M46.'
    },
    {
      id: 'norte', type: 'single',
      prompt: '¿Cuál es la métrica norte de la superficie?',
      options: [
        'Solicitudes enviadas por usuario y día desde la fila, porque se mueve rápido y se ve en el A/B',
        'La tasa de aceptación de las solicitudes, porque mide si las sugerencias son buenas y no solo muchas',
        'Usuarios con al menos una conexión activa nueva en 28 días, sobre los usuarios que vieron la fila'
      ],
      answer: 2,
      explain: 'La norte dice si la red crece de verdad. Las solicitudes por día son una proxy que se puede inflar mostrando perfiles a los que la gente manda solicitudes que nadie acepta. La tasa de aceptación sola premia mostrar muy pocos perfiles muy seguros. Usuarios con una conexión activa nueva junta las dos cosas, a cambio de moverse lento.'
    },
    {
      id: 'proteccion', type: 'multi',
      prompt: '¿Qué métricas de protección pones? Marca todas las que correspondan.',
      options: [
        'Solicitudes rechazadas o marcadas como "no conozco a esta persona"',
        'Reportes de acoso o de contacto no deseado que llegan desde la fila',
        'Solicitudes enviadas por usuario y día, para que no bajen respecto de hoy',
        'Latencia p99 de la pestaña de amigos'
      ],
      answer: [0, 1, 3],
      explain: 'Las de protección frenan los cambios que ganan la proxy rompiendo otra cosa: perfiles que nadie conoce (rechazos), perfiles que no deberían sugerirse (acoso, una expareja, alguien que bloqueó) y la latencia. Las solicitudes enviadas son la proxy que se intenta subir, no un tope; y como protección empujarían en la dirección equivocada.'
    },
    {
      id: 'base', type: 'single',
      prompt: '¿Contra qué mides el primer modelo?',
      options: [
        'Contra lo de hoy, los vendedores con más seguidores del país, porque es lo que el modelo reemplaza',
        'Contra amigos de amigos ordenados por cantidad de amigos en común, medido con las mismas métricas',
        'Contra un modelo al azar, porque cualquier mejora sobre el azar prueba que el modelo aprende algo'
      ],
      answer: 1,
      explain: 'Lo de hoy es un piso bajo: sugerir vendedores famosos no conecta amigos. El azar es todavía más bajo. Amigos en común es una regla simple, barata y difícil de superar: es el escalón 4 de la figura 42.7. Si el modelo no le gana claramente, no vale lo que cuesta. Cómo se calcula a escala va en M48.'
    },
    {
      id: 'datos', type: 'single',
      prompt: 'Revisando los datos, ves que la app registra las solicitudes enviadas pero no qué perfiles se mostraron. ¿Qué haces?',
      options: [
        'Entrenar igual, tomando como negativos a todos los usuarios a los que la persona no mandó solicitud',
        'Usar solo los positivos y entrenar el modelo para que se parezca a los perfiles que recibieron solicitudes',
        'Agregar el registro de impresiones (perfil, posición, modelo, variante) y esperar a juntar datos antes de entrenar'
      ],
      answer: 2,
      explain: 'Sin impresiones no hay negativos reales: tomar a todos los usuarios no elegidos como negativos mezcla los que la persona vio y descartó con millones que nunca vio. Solo positivos no enseña a ordenar. La pieza 9 de la Lámina 42.B es obligatoria; cómo se eligen los negativos va en M43.'
    },
    {
      id: 'requisito', type: 'single',
      prompt: '¿Qué requisito no funcional pesa más en esta superficie que en el feed?',
      options: [
        'La privacidad: sugerir a alguien puede revelar una relación que la persona no hizo pública',
        'La frescura: un usuario nuevo tiene que aparecer en las sugerencias de otros en segundos',
        'La latencia: la pestaña de amigos tiene que responder en menos de 50 ms, cuatro veces menos que el feed'
      ],
      answer: 0,
      explain: '"Personas que quizás conozcas" puede exponer contactos de la agenda, una consulta médica compartida o una expareja. Por eso se excluyen señales sensibles y se respetan los bloqueos como filtros. La frescura importa pero no en segundos, y no hay razón para un presupuesto de latencia más estricto que el del feed. Vuelve en M48 y M51.'
    },
    {
      id: 'decision', type: 'single',
      prompt: 'El A/B termina: la norte sube 1.5&#8239;%, las solicitudes enviadas suben 12&#8239;% y los "no conozco a esta persona" suben 30&#8239;% contra un tope acordado de 10&#8239;%. ¿Qué decides?',
      options: [
        'Lanzar, porque la métrica norte subió y es la que importa por encima de las demás',
        'No lanzar: una métrica de protección pasó su tope, y hay que entender qué perfiles se sugieren de más',
        'Lanzar solo a la mitad de los usuarios, para que los rechazos suban la mitad y la norte siga subiendo'
      ],
      answer: 1,
      explain: 'El tope se acuerda antes justamente para no discutirlo después. Un 30&#8239;% más de "no conozco" dice que el modelo sugiere desconocidos que algunos aceptan; eso puede subir la norte a corto plazo y gastar la confianza en la superficie. Lanzar a la mitad reparte el daño en lugar de evitarlo.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Objetivo observable:</b> conexiones aceptadas que después tienen interacción.</li>'
    + '<li><b>Etiqueta:</b> dos cabezas, "envió solicitud en 7 días" y "la solicitud fue aceptada", combinadas en un puntaje.</li>'
    + '<li><b>Métrica norte:</b> usuarios con al menos una conexión activa nueva en 28 días.</li>'
    + '<li><b>Proxies:</b> solicitudes enviadas y aceptadas por usuario y día.</li>'
    + '<li><b>Protección:</b> rechazos y "no conozco", reportes de acoso o contacto no deseado, latencia p99.</li>'
    + '<li><b>Línea base:</b> amigos de amigos por cantidad de amigos en común.</li>'
    + '<li><b>Datos:</b> registrar impresiones con posición, modelo y variante antes de entrenar.</li>'
    + '<li><b>Riesgo principal:</b> privacidad; señales sensibles fuera y bloqueos como filtro.</li>'
    + '<li><b>Lanzamiento:</b> solo si ninguna métrica de protección pasa su tope.</li>'
    + '</ul>'
});
