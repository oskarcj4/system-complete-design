SD.defineExercise('m52-nuevo', {
  title: 'las tandas de exploración de Clip',
  scenario: '<p>Los creadores de Clip se quejan: el 60&#8239;% de los videos nuevos recibe menos de 50 vistas. Hoy no hay tandas: un video nuevo entra a los candidatos solo por su vector de contenido y compite por puntaje con los demás. '
    + 'Clip tiene 500 000 videos nuevos por día y 2 000 millones de vistas. Producto acepta gastar hasta el <b>10&#8239;%</b> de las vistas en videos nuevos. Te piden diseñar las tandas. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'porque', type: 'single',
      prompt: '¿Por qué los videos nuevos casi no reciben vistas hoy?',
      options: [
        'Porque compiten por puntaje sin datos de interacción, y el ranker los deja abajo',
        'Porque la moderación tarda demasiado y cuando terminan ya no son nuevos para nadie',
        'Porque el índice vectorial no los encuentra hasta que se reconstruye cada noche',
        'Porque la CDN tarda en copiarlos a los PoP y la API los descarta por lentos'
      ],
      answer: 0,
      explain: 'El arranque en frío: sin vistas, las cabezas del ranker no tienen señal y predicen bajo. Repasa 52.5.'
    },
    {
      id: 'tamano', type: 'single',
      prompt: 'Con un presupuesto del 10&#8239;% de las vistas, ¿cuántas impresiones puede tener como máximo la primera tanda si todos los videos la reciben?',
      options: ['40', '400', '4 000', '40 000'],
      answer: 1,
      explain: '10&#8239;% de 2 000 M = 200 M impresiones por día; ÷ 500 000 videos = 400. Elegir 300 deja margen para las tandas siguientes. Repasa 52.5.'
    },
    {
      id: 'audiencia', type: 'single',
      prompt: '¿A quién le muestras la primera tanda?',
      options: [
        'A personas al azar, para que la medida no tenga ningún sesgo de selección',
        'A personas cercanas al vector de contenido del video, en el lugar de exploración',
        'A los seguidores del creador, que son quienes más probablemente lo vean entero',
        'A los usuarios más activos, porque generan más eventos y la tanda se cierra antes'
      ],
      answer: 1,
      explain: 'Al azar, un video de cocina fracasa con quien no ve cocina. Los seguidores son pocos o ninguno para un creador nuevo, y los más activos no representan a nadie. Repasa 52.5.'
    },
    {
      id: 'puerta', type: 'single',
      prompt: '¿Qué compara la puerta al cerrar cada tanda?',
      options: [
        'Los likes absolutos de la tanda contra un número fijo, igual para todos los videos',
        'La tasa de vistas completas contra la esperada para esa duración',
        'El tiempo total visto contra el de los videos más vistos del día',
        'La cantidad de seguidores que ganó el creador durante la tanda'
      ],
      answer: 1,
      explain: 'La finalización es la señal principal, y se normaliza por duración para no premiar solo lo corto. Repasa 52.4 y 52.5.'
    },
    {
      id: 'escalon', type: 'single',
      prompt: '¿De qué tamaño es la segunda tanda, y por qué?',
      options: [
        'Unas 10 veces más grande: con 3 000 el margen baja a ±1.8 puntos y el riesgo sigue acotado',
        'Igual a la primera, para que todos los videos reciban exactamente el mismo trato',
        'Ilimitada: si pasó la primera puerta, ya puede competir en el ranking normal',
        'La mitad de la primera, porque ya se sabe que el video funciona'
      ],
      answer: 0,
      explain: 'Con 300 se separan los muy buenos de los muy malos (±5.7 puntos). La segunda tanda refina con más precisión sin arriesgar 300 000 impresiones en un video que tuvo suerte. Repasa 52.5.'
    },
    {
      id: 'medir', type: 'multi',
      prompt: '¿Cómo sabes si las tandas mejoraron Clip? Elige todas las que correspondan.',
      options: [
        'Un A/B con las tandas solo en un grupo de creadores nuevos, midiendo cuántos vuelven a publicar',
        'Las vistas completas por sesión de quienes miran, como métrica de protección',
        'La fracción de videos nuevos que llegan al ranking normal en 7 días',
        'Contar cuántos videos nuevos recibieron alguna vista, sin comparar contra nada'
      ],
      answer: [0, 1, 2],
      explain: 'El efecto en creadores (vuelven a publicar), el costo en quien mira (vistas completas) y el resultado del embudo de tandas. Un número sin comparación no dice nada: con tandas, todos reciben vistas por diseño. Repasa 52.5 y M49.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Causa:</b> arranque en frío; los nuevos compiten por puntaje sin datos.</li>'
    + '<li><b>Primera tanda:</b> 300 impresiones (el máximo con el 10&#8239;% es 400), a personas cercanas al vector de contenido, en el lugar de exploración.</li>'
    + '<li><b>Puerta:</b> vistas completas contra lo esperado para la duración.</li>'
    + '<li><b>Escalones:</b> 300, 3 000 y 30 000, cada uno 10 veces el anterior.</li>'
    + '<li><b>Medición:</b> A/B en creadores nuevos (vuelven a publicar), vistas completas de quien mira como protección y paso al ranking normal en 7 días.</li>'
    + '</ul>'
});
