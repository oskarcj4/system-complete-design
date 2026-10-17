SD.defineQuiz('m44', {
  title: 'Quiz: modelos clásicos',
  pass: 0.7,
  questions: [
    {
      id: 'decaimiento', type: 'single', fixed: true,
      prompt: 'Con decaimiento exponencial y vida media de 24 horas, ¿cuánto suman 100 ventas hechas hace 72 horas?',
      options: ['50', '33.3', '25', '12.5'],
      answer: 3,
      explain: 'Cada 24 horas el peso se reduce a la mitad: 0.5 elevado a 72 / 24 da 0.125, y 100 × 0.125 = 12.5. 33.3 sería un decaimiento lineal en tres días. Repasa 44.1 y la figura 44.1.'
    },
    {
      id: 'bayes', type: 'single', fixed: true,
      prompt: 'Con un prior de 20 votos de 4.0, ¿qué puntaje bayesiano tiene un producto con un solo voto de 5 estrellas?',
      options: ['4.05', '4.50', '4.69', '5.00'],
      answer: 0,
      explain: '(20 × 4.0 + 5) / (20 + 1) = 85 / 21 = 4.05. Un voto mueve poco al producto desde el prior; el de 2 000 votos de 4.7 queda en 4.69 y le gana. Repasa 44.1 y la figura 44.2.'
    },
    {
      id: 'idf', type: 'single',
      prompt: 'En TF-IDF, la palabra "nueva" aparece en todos los títulos del catálogo. ¿Qué peso recibe?',
      options: [
        'El máximo, porque es la palabra que más se repite en el catálogo',
        'Cero: ln(N / N) = 0, porque no ayuda a distinguir ningún título',
        'Uno, porque el tf de cada título vale 1 y el idf no la cambia',
        'Depende del largo del título, porque el tf se divide por las palabras'
      ],
      answer: 1,
      explain: 'El idf es ln(N / df). Si df = N, el idf es ln(1) = 0, y el peso tf × idf es 0 en todos los títulos. Es la idea de TF-IDF: lo común no distingue. Algunas bibliotecas suavizan el idf y no llega a 0. Repasa 44.2 y la figura 44.3.'
    },
    {
      id: 'coseno', type: 'single',
      prompt: '¿Por qué se usa el coseno, y no el producto punto, para comparar dos columnas de la matriz usuario-ítem?',
      options: [
        'Porque es más rápido de calcular que el producto punto con matrices dispersas',
        'Porque normaliza el largo, y un ítem que compra todo el mundo no gana todos los pares',
        'Porque el producto punto solo se puede usar con embeddings, no con ceros y unos',
        'Porque el coseno cuenta las compras repetidas y el producto punto solo sí o no'
      ],
      answer: 1,
      explain: 'El producto punto entre columnas de ceros y unos es la cantidad de compradores en común, y crece con lo popular: las pilas comparten compradores con todo. Dividir por la raíz de las compras de cada ítem frena ese efecto. Es más caro, no más barato. Repasa 44.3 y 44.4.'
    },
    {
      id: 'jaccard', type: 'single', fixed: true,
      prompt: 'Compraron A: {u1, u2, u4}. Compraron B: {u1, u2, u3}. ¿Cuánto vale el índice de Jaccard entre A y B?',
      options: ['0.333', '0.5', '0.667', '0.816'],
      answer: 1,
      explain: 'En los dos están u1 y u2; en alguno están u1, u2, u3 y u4. 2 / 4 = 0.5. El coseno de los mismos vectores de ceros y unos es 2 / √(3 × 3) = 0.667. Repasa 44.3 y la figura 44.5.'
    },
    {
      id: 'itemcf', type: 'single',
      prompt: 'Con las compras u1 {A, B}, u2 {A, B, C}, u3 {B, C} y u4 {A, D}, ¿qué ve primero quien mira A?',
      options: [
        'C, porque es el ítem que más se compró junto con B, el vecino de A',
        'D, porque la única persona que compró D también compró A',
        'B, con coseno 0.667: dos de los tres compradores de A compraron B',
        'Ninguno: con cuatro personas no hay datos suficientes para el coseno'
      ],
      answer: 2,
      explain: 'cos(A, B) = 2 / (√3 × √3) = 0.667, cos(A, D) = 1 / √3 = 0.577 y cos(A, C) = 1 / (√3 × √2) = 0.408. Quien mira A ve B, D y C, en ese orden. D queda segundo aunque tiene un solo comprador en común. Repasa 44.4 y la figura 44.6.'
    },
    {
      id: 'escala', type: 'multi',
      prompt: '¿Por qué el ítem a ítem escala mejor que el usuario a usuario en un catálogo grande? Marca todas las que correspondan.',
      options: [
        'Solo cuenta los pares de ítems que alguien compró junto, no todos los pares de personas',
        'Los vecinos de un ítem cambian despacio, así que la tabla se calcula de noche y dura',
        'Servir es una lectura por clave, que no depende del tamaño del catálogo',
        'No necesita historias de compras, porque los ítems ya traen su descripción'
      ],
      answer: [0, 1, 2],
      explain: 'Ítem a ítem cuenta pares dentro de cada historia (unos 2 × 10¹² contra 1.25 × 10¹⁵ pares de personas), su tabla es estable y se sirve con una lectura. Sí necesita historias: el que no las necesita es el filtrado por contenido. Repasa 44.4 y 44.5.'
    },
    {
      id: 'memoria', type: 'single', fixed: true,
      prompt: 'Mercado Barrio tiene 50 millones de personas y 100 millones de ítems. ¿Cuánto ocupa una factorización con 64 factores en float32?',
      options: ['3.84 GB', '19.2 GB', '38.4 GB', '384 GB'],
      answer: 2,
      explain: '(50 000 000 + 100 000 000) × 64 × 4 B = 38.4 GB. 19.2 GB sería contar solo los ítems, o usar 2 B por número. Repasa 44.6.'
    },
    {
      id: 'sobreajuste', type: 'single',
      prompt: 'En el widget, k = 5 y λ = 0 dejan el error de entrenamiento en 0.00 y el de prueba en 1.19. ¿Qué pasó?',
      options: [
        'El modelo convergió: un error de entrenamiento de 0 es el objetivo del descenso por gradiente',
        'Sobreajuste: con más números libres que datos, copió lo conocido y no aprendió un patrón',
        'La tasa de aprendizaje fue demasiado grande y el descenso saltó al otro lado del valle',
        'Faltan pasos: con 500 más, el error de prueba también llega a 0 como el otro'
      ],
      answer: 1,
      explain: 'Con k = 5 hay 60 números libres para 27 calificaciones: el modelo puede reproducirlas todas y en los huecos predice cualquier cosa. Con k = 2 y λ = 0.1 el error de prueba baja a 0.76. Una tasa demasiado grande haría subir el error de entrenamiento, no bajarlo a 0. Repasa 44.6.'
    },
    {
      id: 'confianza', type: 'single', fixed: true,
      prompt: 'Con ALS para feedback implícito, c = 1 + α · conteo y α = 40. ¿Qué confianza tiene un ítem visto 3 veces?',
      options: ['41', '43', '120', '121'],
      answer: 3,
      explain: '1 + 40 × 3 = 121. Un hueco tiene confianza 1: también cuenta, pero poco. 120 olvida el 1 que tienen todas las celdas. Repasa 44.7.'
    },
    {
      id: 'bpr', type: 'single',
      prompt: '¿Qué compara la pérdida de BPR?',
      options: [
        'La calificación predicha con la real, celda por celda, como la factorización',
        'El puntaje de un ítem que la persona tocó contra el de uno que no tocó',
        'Las listas de dos personas parecidas, para que reciban ítems parecidos',
        'El CTR de cada ítem en la posición 1 contra el CTR en la posición 10'
      ],
      answer: 1,
      explain: 'BPR toma tríos (persona, ítem tocado, ítem no tocado) y su pérdida, −ln σ(x_ui − x_uj), crece cuando el no tocado queda arriba: con diferencia −1 vale 1.313; con diferencia 2, 0.127. Es una pérdida por pares. Repasa 44.8 y la figura 44.13.'
    },
    {
      id: 'frio', type: 'multi',
      prompt: 'Un vendedor publica una zapatilla hace diez minutos. Nadie la vio todavía. ¿Qué la puede recomendar? Marca todas las que correspondan.',
      options: [
        'El embedding de su título y su foto, que la pone cerca de zapatillas con historia',
        'Una fracción chica de tráfico de exploración, para que junte sus primeras impresiones',
        'La tabla de vecinos del ítem a ítem, que la relaciona con lo que se compra junto',
        'La factorización, que ya tiene un vector para cada ítem del catálogo actual'
      ],
      answer: [0, 1],
      explain: 'El ítem nuevo no tiene columna en la matriz: ni el ítem a ítem ni la factorización tienen nada de él hasta que alguien lo toque y se reentrene. El contenido sí lo describe, y la exploración (M47) le da sus primeras impresiones. Repasa 44.9.'
    }
  ]
});
