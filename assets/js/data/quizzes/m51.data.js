SD.defineQuiz('m51', {
  title: 'Quiz: algoritmos de engagement', pass: 0.7,
  questions: [
    { id: 'objetivo', type: 'single',
      prompt: 'Un feed optimizado solo por tiempo visto empieza a mostrar mucho contenido que indigna. ¿Qué pasó?',
      options: [
        'Alguien del equipo subió el peso de la polémica para ganar el A/B de la semana',
        'El modelo aprendió que ese contenido retiene, y el objetivo premia retener',
        'Los creadores de polémica pagan para aparecer y el ranker no los distingue de los demás',
        'El índice vectorial agrupa la polémica cerca de todo, así que sale en cada recuperación'
      ],
      answer: 1,
      explain: 'Nadie lo decide: el objetivo premia el tiempo y el modelo encuentra lo que lo produce. Después el bucle lo refuerza, porque más impresiones dan más etiquetas positivas. Vuelve a 51.1 y 51.4.' },
    { id: 'variable', type: 'single', fixed: true,
      prompt: 'Cada tirón para actualizar paga con probabilidad 0.1, al azar. ¿Cuál es la probabilidad de 20 tirones seguidos sin premio?',
      options: ['0&#8239;%', '2&#8239;%', '12&#8239;%', '50&#8239;%'],
      answer: 2,
      explain: '0.9²⁰ ≈ 0.12. En un programa fijo de uno cada diez sería 0&#8239;%: después de 10 llega seguro. La incertidumbre es lo que sostiene la conducta. Vuelve a 51.2.' },
    { id: 'skinner', type: 'single',
      prompt: '¿Qué tiene de especial el refuerzo de razón variable frente al fijo, según Ferster y Skinner?',
      options: [
        'Da una recompensa media más alta, y por eso la conducta se vuelve más frecuente',
        'Produce la tasa de respuesta más alta y la conducta que más tarda en apagarse',
        'Funciona solo con recompensas grandes; con chicas, el fijo produce más respuesta',
        'Hace que la conducta se apague más rápido cuando se retiran las recompensas'
      ],
      answer: 1,
      explain: 'Con la misma media, el programa variable produce la respuesta más insistente y la más resistente a la extinción. No paga más: paga sin aviso. Vuelve a 51.2.' },
    { id: 'parada', type: 'single',
      prompt: '¿Qué hace un punto de parada como "Ya viste todo lo nuevo"?',
      options: [
        'Bloquea el feed hasta el día siguiente para cortar el uso compulsivo',
        'Hace visible que lo nuevo terminó; seguir pasa a ser una decisión y no el valor por defecto',
        'Esconde las sugerencias, para que la persona solo vea lo que publican sus seguidos',
        'Reemplaza el scroll infinito por páginas numeradas que hay que tocar una por una'
      ],
      answer: 1,
      explain: 'No prohíbe nada: marca el final de lo nuevo y deja lo que sigue como sugerencias. Es la contramedida del scroll infinito. Vuelve a 51.3.' },
    { id: 'dark', type: 'single',
      prompt: '¿Cuál de estos es un dark pattern?',
      options: [
        'Un botón de "No me interesa" en cada ítem del feed, a la vista',
        'Un aviso de "quedan 2 unidades" que aparece siempre, haya o no stock real',
        'Un recordatorio de pausa después de 60 minutos que se puede descartar',
        'Una opción de ordenar el feed por fecha en lugar de por relevancia'
      ],
      answer: 1,
      explain: 'Una urgencia falsa empuja una decisión con información engañosa: eso es un dark pattern, y el artículo 25 del DSA lo prohíbe. Las otras tres le dan control o información a la persona. Vuelve a 51.3.' },
    { id: 'declarada', type: 'single',
      prompt: '¿Por qué no alcanza con el log para saber si un feed le hace bien a la gente?',
      options: [
        'Porque el log pierde una parte de los eventos, y los que faltan son justo los negativos',
        'Porque el log registra la conducta, y la conducta y lo que la persona dice valorar se separan',
        'Porque el log guarda los eventos solo 30 días y el daño aparece a los meses',
        'Porque el log no tiene la edad de la persona, y el daño se concentra en menores'
      ],
      answer: 1,
      explain: 'La preferencia revelada (lo que hace) y la declarada (lo que valora) divergen en lo que más engancha. Por eso se agregan encuestas, arrepentimiento y uso nocturno. Vuelve a 51.5.' },
    { id: 'guardrail', type: 'single',
      prompt: 'Un cambio sube un 4&#8239;% el tiempo visto y baja un 3&#8239;% el "tiempo bien usado", fijado antes como métrica de protección. ¿Qué haces?',
      options: [
        'Lanzar: el tiempo es la métrica principal y subió más de lo que bajó la otra',
        'No lanzar: una métrica de protección que cae frena el lanzamiento',
        'Lanzar a la mitad de los usuarios y decidir en un mes con más datos',
        'Cambiar la métrica de protección por la retención, que todavía no se movió'
      ],
      answer: 1,
      explain: 'Para eso se fijan antes: un cambio que sube el tiempo y baja lo que la gente valora es el caso exacto que deben frenar. Cambiar la métrica después del experimento es mirar hasta que convenga. Vuelve a 51.5 y a M49.' },
    { id: 'alternativas', type: 'multi',
      prompt: '¿Cuáles cambian el objetivo de un feed para que no premie solo lo que retiene? Elige todas las que correspondan.',
      options: [
        'Entrenar una cabeza que predice la respuesta a "¿te alegra haberlo visto?" y sumarla al puntaje',
        'Restar en el puntaje la probabilidad de "no me interesa"',
        'Topar al 30&#8239;% del feed cualquier categoría en el re-ranking',
        'Subir la temperatura del softmax para que el feed sea más variado al azar'
      ],
      answer: [0, 1, 2],
      explain: 'Satisfacción declarada, señales negativas y topes de dosis cambian lo que se premia o cuánto puede ocupar. Más azar no cambia el objetivo: muestra más de todo, incluido lo que daña. Vuelve a 51.6.' },
    { id: 'dsa38', type: 'single',
      prompt: '¿Qué exige el artículo 38 del DSA a las plataformas muy grandes?',
      options: [
        'Al menos una opción de cada recomendador que no se base en perfilado',
        'Publicar el código fuente del recomendador para que lo audite la Comisión',
        'Prohibir los recomendadores para usuarios menores de 16 años en toda la UE',
        'Pedir consentimiento expreso antes de cada recomendación personalizada'
      ],
      answer: 0,
      explain: 'El artículo 38 pide una opción sin perfilado, como un feed cronológico. El 27 pide explicar los parámetros (a todas las plataformas) y el 28 protege a menores; ninguno exige publicar el código ni prohíbe el recomendador. Vuelve a 51.9.' },
    { id: 'menores', type: 'single',
      prompt: '¿Por qué, para menores, la protección va en los valores por defecto y no en un control opcional?',
      options: [
        'Porque los controles opcionales están prohibidos para menores por el DSA',
        'Porque quien más la necesita es quien menos va a buscar la opción',
        'Porque los menores no saben usar los menús de configuración de una app',
        'Porque así la plataforma no necesita saber la edad de nadie'
      ],
      answer: 1,
      explain: 'El valor por defecto decide lo que pasa cuando nadie elige. Igual hace falta saber o estimar la edad para aplicarlo, y ese es el punto débil. Vuelve a 51.8.' }
  ]
});
