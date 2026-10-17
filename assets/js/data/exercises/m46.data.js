SD.defineExercise('m46-pesos', {
  title: 'el ranker del feed de Mercado Barrio',
  scenario: '<p>Mercado Barrio reemplaza el ranker pesado de su feed. Recibe <b>500 candidatos</b> del ranking liviano y tiene <b>50 ms</b>. En el log de '
    + 'impresiones hay clics (un 3&#8239;% de las impresiones), compras (un 0.1&#8239;%), reproducciones de más de 10 segundos y "ocultar". Hay <b>20 millones '
    + 'de personas activas</b> por día y para entrenar se guarda solo un <b>5&#8239;% de las impresiones sin clic</b>. El equipo de producto estima que un clic '
    + 'vale en promedio 0.05 USD de margen futuro y una compra, 2 USD (un supuesto de este ejercicio). Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'predecir', type: 'single',
      prompt: '¿Qué tiene que predecir el ranker?',
      options: [
        'Un único puntaje de engagement aprendido de un promedio de todas las acciones del log',
        'Una probabilidad por acción (clic, compra, video, ocultar), con una cabeza por cada una',
        'Solo la compra, porque es lo único que deja dinero y las demás acciones son ruido para el negocio',
        'El orden de la lista con una pérdida listwise, porque al final lo que se muestra es un orden'
      ],
      answer: 1,
      explain: 'Cada acción tiene su etiqueta, y la mezcla la decide el producto con pesos que cambian sin reentrenar. Predecir solo compras tira el 97&#8239;% de la señal (los clics), y una pérdida listwise no da probabilidades para sumar con pesos. Repasa 46.1 y 46.6.'
    },
    {
      id: 'familia', type: 'single',
      prompt: 'Las features son contadores y tasas (tabulares) más los ids de persona, ítem y vendedor, con millones de valores cada uno. ¿Qué familia eliges?',
      options: [
        'Un GBDT solo, porque gana con features tabulares y los ids se pueden usar como features categóricas',
        'Una regresión logística con cruces a mano, porque es la que mejor escala con 500 candidatos',
        'Un modelo profundo multi-tarea con tablas de embeddings, con el GBDT actual como línea de base',
        'Un transformer sobre la historia, sin features tabulares, porque la secuencia ya las contiene todas'
      ],
      answer: 2,
      explain: 'Los ids con millones de valores necesitan embeddings, que el GBDT no aprende; el modelo profundo multi-tarea usa las dos cosas y comparte lo aprendido entre tareas. El GBDT queda como la línea de base que el modelo nuevo tiene que superar. Repasa 46.3 y 46.5.'
    },
    {
      id: 'tabla', type: 'single', fixed: true,
      prompt: 'El embedding de persona es de 64 float32. ¿Cuánto ocupa la tabla de las 20 millones de personas activas?',
      options: ['1.28 GB', '5.12 GB', '20.48 GB', '40.96 GB'],
      answer: 1,
      explain: '20 000 000 × 64 × 4 B = 5.12 GB. 1.28 GB olvida los 4 bytes del float32; 20.48 GB y 40.96 GB los cuentan de más. Con la tabla de ítems, la memoria es casi toda de tablas: se reparten por filas entre GPUs. Repasa 46.5.'
    },
    {
      id: 'recal', type: 'single', fixed: true,
      prompt: 'Con <i>w</i> = 0.05, el modelo predice p(clic) = 0.2 para un ítem. ¿Qué probabilidad de clic real corresponde?',
      options: ['0.0100', '0.0123', '0.0500', '0.2000'],
      answer: 1,
      explain: 'q = p / (p + (1 − p) / w) = 0.2 / (0.2 + 0.8 / 0.05) = 0.2 / 16.2 = 0.0123. 0.0100 es multiplicar por w, que solo aproxima para p chicas, y 0.2 es no corregir: la suma con pesos quedaría inflada. Repasa 46.9.'
    },
    {
      id: 'peso', type: 'single', fixed: true,
      prompt: 'Si el clic pesa 1, ¿qué peso le da a la compra la estimación de producto?',
      options: ['4', '20', '40', '400'],
      answer: 2,
      explain: '2 USD / 0.05 USD = 40: una compra vale 40 clics. El peso sale de una decisión de producto en una unidad común, no del modelo, y por eso se revisa con experimentos. Repasa 46.8.'
    },
    {
      id: 'guardrail', type: 'single',
      prompt: 'En el A/B, el peso 40 sube las compras un 2&#8239;% y los "ocultar" un 15&#8239;%. ¿Qué haces?',
      options: [
        'Lanzarlo, porque las compras son el objetivo y ocultar no cuesta dinero en el corto plazo',
        'Darle a ocultar un peso negativo y tratarlo como guardrail, y repetir el experimento',
        'Bajar el peso de la compra a 4, para que el feed vuelva a parecerse al que había antes',
        'Sacar la cabeza de ocultar del modelo, porque una tarea negativa confunde a las demás'
      ],
      answer: 1,
      explain: 'Un 15&#8239;% más de ocultar es una señal de que el feed empeora para la gente aunque hoy venda más; los pesos de Twitter restan 74 por feedback negativo por esa razón. El guardrail se mira en cada experimento y su umbral lo fija el producto. Repasa 46.8.'
    },
    {
      id: 'offline', type: 'multi',
      prompt: 'Antes del A/B, ¿qué reportas offline sobre el log partido por tiempo?',
      options: [
        'NDCG@50 por persona, promediado',
        'Log loss normalizada de cada tarea',
        'Razón predicho/observado por país',
        'El CTR del log de entrenamiento'
      ],
      answer: [0, 1, 2],
      explain: 'NDCG mide el orden de lo que se ve; la log loss normalizada, las probabilidades de cada cabeza; y la razón predicho/observado por segmento, la calibración que necesita la suma con pesos. El CTR del log de entrenamiento está deformado por el 5&#8239;% de negativos y no mide al modelo. Repasa 46.10.'
    },
    {
      id: 'cascada', type: 'multi',
      prompt: 'Sobre una muestra, el pesado puntúa los 9 000 candidatos y solo 41 de sus 50 mejores pasan el corte del liviano. ¿Qué ayuda?',
      options: [
        'Destilar el liviano con los puntajes del pesado',
        'Pasar 800 candidatos al pesado si entra en los 50 ms',
        'Entrenar el liviano solo con compras, que son lo que vale',
        'Subir el learning rate del pesado para que aprenda antes'
      ],
      answer: [0, 1],
      explain: 'El recall de la cascada es 41 / 50 = 82&#8239;%. La destilación hace que el liviano quiera lo mismo que el pesado, y más candidatos suben el recall a cambio de latencia (800 × 0.1 ms = 80 ms, que no entra sin un pesado más rápido). Entrenar el liviano con otro objetivo lo aleja del pesado. Repasa 46.11.'
    }
  ],
  solution: '<ul>'
    + '<li>Una probabilidad por acción (clic, compra, video de más de 10 segundos, ocultar) en un modelo profundo multi-tarea con tablas de embeddings, con el GBDT actual como línea de base.</li>'
    + '<li>La tabla de personas ocupa 20 000 000 × 64 × 4 B = 5.12 GB; con la de ítems, las tablas se reparten por filas entre GPUs y las capas densas se copian en todas.</li>'
    + '<li>Las probabilidades se corrigen por el submuestreo: con w = 0.05, un 0.2 del modelo es 0.0123 de verdad. Se vigila la razón predicho/observado por país y por hora.</li>'
    + '<li>Puntaje = p(clic) + 40 · p(compra) + peso · p(video) − peso · p(ocultar), con el 40 sacado de 2 USD / 0.05 USD y ocultar como guardrail en cada experimento.</li>'
    + '<li>Offline: NDCG@50 por persona, log loss normalizada por tarea y calibración por segmento. El A/B decide.</li>'
    + '<li>La cascada pierde un 18&#8239;% del top del pesado: se destila el liviano y se evalúa pasar más candidatos si el pesado se acelera.</li>'
    + '</ul>'
});
