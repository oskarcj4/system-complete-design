SD.defineQuiz('m47', {
  title: 'Quiz: re-ranking y exploración', pass: 0.7,
  questions: [
    { id: 'lista', type: 'single',
      prompt: 'El ranker pone cinco zapatillas de running casi iguales en los primeros lugares, cada una con un puntaje alto y bien calibrado. ¿Por qué igual es una mala lista?',
      options: [
        'Porque los puntajes altos y parecidos indican que el modelo se sobreajustó a esa categoría en el entrenamiento',
        'Porque la quinta vale mucho menos si ya viste cuatro, y el ranker puntúa cada ítem sin ver a los demás',
        'Porque el sesgo de posición hace que las de abajo no reciban clics, y eso baja el CTR promedio de toda la lista',
        'Porque las reglas de negocio prohíben más de dos ítems de una categoría en pantalla'
      ],
      answer: 1,
      explain: 'El ranker mira un par (persona, ítem) por vez: no sabe qué hay al lado. La utilidad de un ítem depende de los anteriores, y eso solo lo puede decidir una etapa que mire la lista entera. Vuelve a 47.1.' },
    { id: 'mmr', type: 'single', fixed: true,
      prompt: 'Con λ = 0.6, ya se eligió A. El candidato C tiene puntaje 0.85 y similitud 0.6 con A. ¿Cuál es su valor de MMR?',
      options: ['0.270', '0.332', '0.510', '0.750'],
      answer: 0,
      explain: '0.6 × 0.85 − 0.4 × 0.6 = 0.51 − 0.24 = 0.270. 0.510 olvida restar la similitud; 0.332 es el valor del video H; 0.750 resta la similitud sin multiplicarla por 1 − λ y sin el λ del puntaje. Vuelve a 47.2.' },
    { id: 'reglas', type: 'single',
      prompt: '¿Por qué "no mostrar ítems de un vendedor que la persona bloqueó" va en una capa de reglas y no como una feature del ranker?',
      options: [
        'Porque el ranker no puede recibir features booleanas, solo contadores y embeddings que salgan del feature store',
        'Porque una regla se cumple siempre y cambia en minutos; un modelo la cumple en promedio y cambia al reentrenar',
        'Porque la feature tendría muy pocos ejemplos positivos y el modelo nunca llegaría a aprender un peso para ella',
        'Porque la capa de reglas corre antes de la recuperación y así evita traer candidatos que después se descartan'
      ],
      answer: 1,
      explain: 'Un ranker que aprendió que lo bloqueado tiene pocos clics lo pone abajo, pero no lo saca. Una regla se cumple siempre, se cambia hoy y se explica. Las reglas del re-ranking corren al final, no antes de la recuperación. Vuelve a 47.3.' },
    { id: 'frescura', type: 'single', fixed: true,
      prompt: 'El impulso de frescura es 1 + 0.5 · 2^(−edad / 6 h). ¿Cuánto vale a las 12 horas?',
      options: ['1.031', '1.125', '1.25', '1.5'],
      answer: 1,
      explain: '2^(−12/6) = 2^(−2) = 0.25, y 1 + 0.5 × 0.25 = 1.125. 1.5 es al nacer, 1.25 a las 6 horas y 1.031 a las 24. Vuelve a 47.4.' },
    { id: 'beta', type: 'single',
      prompt: 'Un ítem tiene 2 clics en 10 impresiones y otro, 20 clics en 100. ¿Qué dicen sus Beta(3, 9) y Beta(21, 81)?',
      options: [
        'Que el primero es mejor, porque su promedio de 0.25 es más alto que el 0.206 del segundo y eso es lo que se usa',
        'Que son casi iguales, porque los dos tienen un CTR observado del 20 % y la Beta no agrega información',
        'Que tienen promedios parecidos, pero se sabe mucho menos del primero: su curva es más ancha',
        'Que el segundo es más confiable: la Beta pesa más los clics recientes'
      ],
      answer: 2,
      explain: 'Los promedios son 3 / 12 = 0.25 y 21 / 102 = 0.206: parecidos. Lo que cambia es el ancho: con 10 impresiones, la curva es ancha. Esa duda es lo que usa Thompson. La Beta no distingue clics viejos de nuevos. Vuelve a 47.5.' },
    { id: 'thompson', type: 'single',
      prompt: '¿Por qué Thompson sampling explora un brazo sin datos aunque otro tenga un buen CTR medido?',
      options: [
        'Porque sortea de la curva de cada brazo, y la de un brazo sin datos es plana: a veces gana el sorteo',
        'Porque reserva un 10 % fijo de las impresiones para brazos al azar, igual que epsilon-greedy con ε = 0.1',
        'Porque suma a cada brazo un bono de √(2 ln t / n) que es infinito cuando el brazo no tiene impresiones',
        'Porque ordena los brazos por cantidad de impresiones y siempre juega primero el que tiene menos'
      ],
      answer: 0,
      explain: 'Thompson saca un número de la Beta de cada brazo y juega el mayor; una curva plana o ancha gana sorteos seguido. El 10&#8239;% fijo es epsilon-greedy y el bono es UCB1. Vuelve a 47.5.' },
    { id: 'ab-bandit', type: 'single',
      prompt: 'Necesitas un número para un informe: "la variante B sube las compras un X % con su intervalo". ¿Bandit o A/B?',
      options: [
        'Bandit, porque gana más clics durante la prueba y al final su estimación de cada brazo es más precisa',
        'A/B, porque reparte el tráfico fijo y mide la diferencia; el bandit casi no muestra el brazo malo',
        'Bandit contextual, porque el contexto reduce la varianza y da el mismo intervalo con menos tráfico',
        'Ninguno: con dos variantes alcanza con comparar el CTR de una semana antes y una semana después'
      ],
      answer: 1,
      explain: 'El bandit deja de mostrar lo malo en cuanto lo sabe: gana durante la prueba y por eso mide mal la diferencia. Para una decisión con un número y un intervalo, un A/B. Antes contra después mezcla el cambio con todo lo demás que pasó. Vuelve a 47.5.' },
    { id: 'bucle', type: 'multi',
      prompt: 'En el simulador, veinte ítems iguales se ordenan por clics acumulados durante 30 días. ¿Qué ayuda a cortar el bucle? Elige todas las que correspondan.',
      options: [
        'Ordenar por clics sobre la atención de cada posición, con un previo chico',
        'Reservar tráfico para exploración, que también deja datos sin sesgo',
        'Entrenar el ranker más seguido, para que los clics nuevos entren antes al modelo siguiente',
        'Subir los candidatos de 10 000 a 20 000'
      ],
      answer: [0, 1],
      explain: 'La corrección por posición mide calidad y no exposición, y la exploración le da datos a lo que no se muestra. Entrenar más seguido acelera el bucle en lugar de cortarlo, y más candidatos no cambian qué llega arriba. Vuelve a 47.7 y 47.8.' },
    { id: 'posicion', type: 'single',
      prompt: 'Entrenas el ranker con la posición como feature. ¿Qué valor le das a esa feature al servir?',
      options: [
        'La posición real en que va a quedar el ítem, que se calcula primero con un ranker sin la feature',
        'Un valor al azar entre 1 y 10, para que el modelo no favorezca ninguna posición en particular',
        'La misma para todos los candidatos (la 1), así el puntaje compara sin la ventaja del lugar',
        'La posición promedio que tuvo el ítem en el log de impresiones de la última semana'
      ],
      answer: 2,
      explain: 'Al entrenar, la posición real separa calidad y lugar; al servir, una constante para todos hace que el puntaje compare solo calidad. La posición promedio del log reintroduce el sesgo que se quería sacar. Vuelve a 47.8.' },
    { id: 'presupuesto', type: 'single', fixed: true,
      prompt: 'Mercado Barrio tiene 4 000 000 000 de impresiones por día, dedica un 5 % a explorar y recibe 500 000 productos nuevos por día. ¿Cuántas impresiones le tocan a cada nuevo?',
      options: ['40', '400', '4 000', '8 000'],
      answer: 1,
      explain: '4 000 000 000 × 0.05 = 200 000 000, y 200 000 000 / 500 000 = 400. 8 000 reparte todo el tráfico, sin el 5&#8239;%; 4 000 divide por 50 000 nuevos en lugar de 500 000, y 40 divide de más por 10. Vuelve a 47.9.' }
  ]
});
