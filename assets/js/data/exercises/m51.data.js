SD.defineExercise('m51-objetivo', {
  title: 'el objetivo del feed de Mercado Barrio',
  scenario: '<p>El feed de inicio de Mercado Barrio mezcla productos y videos de reseña. Su puntaje hoy es <code>0.7 · tiempo + 0.3 · p(compra)</code>. '
    + 'La métrica norte es <b>compras por usuario activo por semana</b>. Una encuesta muestra que el <b>38&#8239;%</b> de las sesiones largas terminan con "estuve más de lo que quería", '
    + 'y los videos de unboxing sensacionalista pasaron del 9 al 24&#8239;% de las impresiones en tres meses. Te piden rediseñar el objetivo sin perder la métrica norte. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'diagnostico', type: 'single',
      prompt: '¿Por qué crecieron los unboxing sensacionalistas?',
      options: [
        'Porque los vendedores los suben más, y el catálogo de videos cambió solo',
        'Porque retienen, el puntaje pesa el tiempo un 70&#8239;% y el bucle los fue subiendo',
        'Porque el índice vectorial los recupera mejor que a las reseñas, por ser más largos',
        'Porque el modelo está mal calibrado y sobreestima p(compra) para los videos'
      ],
      answer: 1,
      explain: 'Con el tiempo como mayor peso, lo que retiene sube, y más impresiones dan más etiquetas positivas. Es el bucle de 51.4. Repasa 51.1 y 51.4.'
    },
    {
      id: 'etiqueta', type: 'single',
      prompt: '¿Qué señal nueva agregas primero al objetivo?',
      options: [
        'La satisfacción declarada: una encuesta en una muestra de impresiones que entrena una cabeza nueva',
        'El número de comentarios, porque indica que el contenido genera conversación',
        'La cantidad de veces que se comparte, porque compartir es una señal de calidad',
        'El tiempo de la sesión entera en lugar del tiempo por ítem, que es más estable y más difícil de inflar con un solo video'
      ],
      answer: 0,
      explain: 'Comentarios y compartidos también premian lo que provoca, como mostró el caso de las interacciones significativas. La satisfacción declarada mide lo que la conducta no ve. Repasa 51.5 y 51.6.'
    },
    {
      id: 'pesos', type: 'single',
      prompt: '¿Cómo queda el puntaje?',
      options: [
        '0.3 · tiempo + 0.3 · p(compra) + 0.4 · p(satisfecho) − 0.5 · p(no me interesa)',
        '1.0 · p(satisfecho), sin tiempo ni compra, para no premiar nada que retenga',
        '0.7 · tiempo + 0.3 · p(compra) + 0.1 · p(satisfecho), para no mover nada de golpe',
        '0.5 · p(compra) + 0.5 · p(satisfecho), sin tiempo, porque el tiempo es el problema'
      ],
      answer: 0,
      explain: 'Se baja el tiempo sin tirarlo, se mantiene la compra (la métrica norte), se suma la satisfacción con peso real y se resta lo que la gente rechaza. Un 0.1 no cambia la mezcla; sacar el tiempo del todo pierde una señal útil. Repasa 51.6.'
    },
    {
      id: 'tope', type: 'single',
      prompt: '¿Dónde pones un tope del 15&#8239;% para los videos de una misma categoría?',
      options: [
        'En el entrenamiento, quitando ejemplos de esa categoría del log',
        'En el re-ranking, como regla sobre la lista final',
        'En la recuperación, pidiendo menos candidatos a esa fuente',
        'En el feature store, con una feature que baje el puntaje de la categoría'
      ],
      answer: 1,
      explain: 'Un tope de dosis es una propiedad de la lista, y la lista se arma en el re-ranking. Quitar ejemplos o candidatos lo hace de forma indirecta e imprecisa. Repasa 51.6 y M47.'
    },
    {
      id: 'medir', type: 'multi',
      prompt: '¿Con qué métricas evalúas el cambio en el A/B? Elige todas las que correspondan.',
      options: [
        'Compras por usuario activo por semana, como métrica principal',
        '"Estuve más de lo que quería" y tiempo bien usado, como métricas de protección',
        'Retención y satisfacción en el holdout, a meses',
        'Solo el tiempo visto, porque es el que más se va a mover y el que detecta antes cualquier efecto'
      ],
      answer: [0, 1, 2],
      explain: 'La métrica norte decide, las de protección frenan y el holdout mide lo que tarda. El tiempo va a bajar a propósito: usarlo como criterio deshace el rediseño. Repasa 51.5 y M49.'
    },
    {
      id: 'resultado', type: 'single',
      prompt: 'Tras cuatro semanas: compras +0.4&#8239;% (intervalo −0.3 a +1.1), tiempo −11&#8239;%, "estuve más de lo que quería" del 38 al 22&#8239;%. ¿Qué decides?',
      options: [
        'No lanzar: el tiempo bajó un 11&#8239;% y eso va a bajar la publicidad',
        'Lanzar: la métrica norte no empeoró, el arrepentimiento bajó mucho, y el holdout sigue midiendo',
        'Repetir el A/B hasta que las compras salgan significativas a favor',
        'Lanzar solo para usuarios nuevos, para no cambiarles de golpe el feed a los que ya están acostumbrados al actual'
      ],
      answer: 1,
      explain: 'El objetivo era no perder la métrica norte, y no se perdió (el intervalo incluye el cero y es angosto); lo que se quería mejorar mejoró mucho. Repetir hasta que salga es una trampa de M49. Repasa 51.6 y 51.10.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Diagnóstico:</b> el peso del tiempo y el bucle subieron lo que retiene.</li>'
    + '<li><b>Señal nueva:</b> satisfacción declarada, con encuesta y una cabeza más del modelo.</li>'
    + '<li><b>Puntaje:</b> 0.3 · tiempo + 0.3 · p(compra) + 0.4 · p(satisfecho) − 0.5 · p(no me interesa).</li>'
    + '<li><b>Dosis:</b> tope del 15&#8239;% por categoría en el re-ranking.</li>'
    + '<li><b>Medición:</b> compras como principal, arrepentimiento y tiempo bien usado como protección, holdout a meses.</li>'
    + '<li><b>Decisión:</b> lanzar, porque la métrica norte se sostuvo y el arrepentimiento bajó de 38 a 22&#8239;%.</li>'
    + '</ul>'
});
