SD.defineExercise('m49-lanzar', {
  title: 'el ranker con resultados mixtos',
  scenario: '<p>El ranker nuevo del feed de Mercado Barrio subió el NDCG@10 offline un <b>3&#8239;%</b>. Corrió un A/B de <b>14 días</b> con <b>1 000 000 de usuarios por grupo</b>. '
    + 'La métrica principal, compras por usuario en el día, subió de <b>5.00&#8239;%</b> a <b>5.12&#8239;%</b>. El panel muestra además 18 métricas más; la retención a 7 días bajó '
    + '<b>0.3 puntos</b>, con un intervalo de −0.5 a −0.1. Producto quiere lanzar el lunes. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'srm', type: 'single',
      prompt: '¿Qué miras primero?',
      options: [
        'La métrica principal, porque es la que se fijó antes de empezar y la que decide el lanzamiento',
        'Que los grupos tengan el tamaño esperado (SRM), porque si no, nada de lo demás vale',
        'La retención, porque es la única métrica que bajó y es la que más preocupa a producto',
        'El efecto de los primeros días, para ver si hubo novedad antes de mirar el promedio'
      ],
      answer: 1,
      explain: 'Un SRM indica que la asignación o el registro están rotos, y entonces ningún número del panel es confiable. Se mira primero, siempre. Repasa 49.9.'
    },
    {
      id: 'significa', type: 'single', fixed: true,
      prompt: 'Con 1 000 000 por grupo y p = 0.05, el error estándar de la diferencia es √(2 × 0.0475 / 1 000 000) ≈ 0.031 puntos. La diferencia es 0.12 puntos. ¿Cuánto vale z?',
      options: ['1.2', '2.0', '3.9', '12'],
      answer: 2,
      explain: '0.12 / 0.031 ≈ 3.9: bastante más que 1.96. 12 divide por 0.01 en lugar de 0.031, 1.2 divide por 0.1, y 2.0 es el umbral redondeado, no el resultado. Repasa 49.3.'
    },
    {
      id: 'novedad', type: 'single',
      prompt: 'La diferencia fue de +0.25 puntos la primera semana y +0.04 la segunda. ¿Qué concluyes?',
      options: [
        'Que el efecto real es el promedio de las dos semanas, +0.12, porque así lo midió el experimento',
        'Que buena parte fue novedad: el efecto estable parece cercano a +0.04 y hay que medirlo más',
        'Que la segunda semana tuvo un problema técnico, porque un ranker no cambia de efecto solo',
        'Que el efecto crece con el tiempo, porque la primera semana incluye la aversión al cambio'
      ],
      answer: 1,
      explain: 'Un efecto que cae de +0.25 a +0.04 es la forma típica de la novedad. El promedio mezcla la parte que se va con la que queda. Lo honesto es extender el experimento o mirar la cohorte que ya pasó la primera semana. Repasa 49.2.'
    },
    {
      id: 'retencion', type: 'single',
      prompt: 'La retención a 7 días bajó 0.3 puntos con un intervalo que no cruza el cero. ¿Qué haces con eso?',
      options: [
        'Ignorarla: con 19 métricas, alguna iba a salir significativa por azar',
        'Tratarla como métrica de protección: si se fijó antes como tal, frena el lanzamiento hasta entenderla',
        'Compensarla: +0.12 en compras vale más que −0.3 en retención si se pasan a dinero',
        'Lanzar y medir la retención en el holdout, que es donde se miden las métricas de largo plazo'
      ],
      answer: 1,
      explain: 'Si la retención estaba entre las métricas de protección, su caída frena el lanzamiento: es justo el cambio que gana compras hoy y pierde gente mañana. El argumento de las muchas métricas vale para las de exploración, no para las de protección. Repasa 49.8 y 49.9.'
    },
    {
      id: 'siguiente', type: 'multi',
      prompt: '¿Qué propones antes de decidir? Elige todas las que correspondan.',
      options: [
        'Extender el experimento dos semanas, con la duración fija desde hoy',
        'Analizar con CUPED, usando las compras del mes anterior al experimento',
        'Mirar la retención por segmento para ver dónde cae',
        'Repetir el A/B con 2 000 000 por grupo hasta que la retención deje de ser significativa'
      ],
      answer: [0, 1, 2],
      explain: 'Más tiempo mide el efecto estable, CUPED da más precisión con los mismos usuarios y los segmentos dicen qué arreglar. Repetir hasta que algo deje de ser significativo es la trampa de mirar hasta que convenga. Repasa 49.4 y 49.9.'
    },
    {
      id: 'decision', type: 'single',
      prompt: 'Después de dos semanas más, compras: +0.05 puntos (intervalo +0.01 a +0.09). Retención a 7 días: −0.2 (intervalo −0.4 a 0.0). ¿Qué decides?',
      options: [
        'Lanzar, porque la métrica principal es significativa y la retención ya toca el cero',
        'No lanzar todavía: buscar en los segmentos qué baja la retención y probar una versión corregida',
        'Lanzar al 50&#8239;% de los usuarios, para repartir el riesgo entre ganar compras y perder retención',
        'Volver al offline y subir el NDCG un poco más, porque el problema es que el modelo no es mejor'
      ],
      answer: 1,
      explain: 'Un efecto chico en compras con una retención que sigue apuntando para abajo no es un ganador claro. Lanzar a la mitad no mide nada nuevo, y un NDCG más alto no arregla algo que offline no ve. Repasa 49.8 y 49.9.'
    }
  ],
  solution: '<ul>'
    + '<li><b>SRM primero:</b> con los grupos del tamaño esperado, el resto se puede mirar.</li>'
    + '<li><b>Significancia:</b> +0.12 puntos con un error estándar de 0.031 es z ≈ 3.9, pero el promedio esconde la novedad (+0.25 y +0.04).</li>'
    + '<li><b>Protección:</b> la retención a 7 días estaba fijada como métrica de protección y bajó; eso frena el lanzamiento.</li>'
    + '<li><b>Siguiente paso:</b> dos semanas más con duración fija, análisis con CUPED y la retención por segmento.</li>'
    + '<li><b>Decisión:</b> no lanzar esta versión; corregir lo que baja la retención y volver a probar. Offline no ve la retención.</li>'
    + '</ul>'
});
