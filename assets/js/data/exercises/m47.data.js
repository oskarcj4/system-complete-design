SD.defineExercise('m47-explorar', {
  title: 'la primera tanda de los videos nuevos',
  scenario: '<p>Mercado Barrio suma unos <b>200 000 videos de reseña nuevos por día</b>. Hoy casi ninguno pasa de 50 impresiones: el ranker los hunde porque '
    + 'no tienen historia, y los creadores se quejan. El feed muestra <b>4 000 000 000 de impresiones por día</b> (10 lugares por request) y el CTR típico de un '
    + 'video es del <b>4&#8239;%</b>. Producto acepta perder un poco de CTR mientras se aprende, pero quiere que el feed no se llene de videos malos. Vas decisión por decisión.</p>',
  steps: [
    {
      id: 'donde', type: 'single',
      prompt: '¿Dónde pones la exploración de los videos nuevos?',
      options: [
        'En el ranker, con una feature "es nuevo" que el modelo aprenda a premiar con los datos del log',
        'En lugares reservados del re-ranking, con un bandit que elige qué video va en cada uno',
        'En la recuperación, subiendo la cuota de la fuente de contenido para que traiga más videos nuevos',
        'En un feed aparte de "novedades", para no tocar el feed principal'
      ],
      answer: 1,
      explain: 'Un lugar reservado acota el costo (como mucho, un lugar de diez) y el bandit decide quién lo merece. La feature "es nuevo" se aprende de un log donde los nuevos casi no aparecen; traer más candidatos no sirve si el ranker igual los hunde, y un feed aparte casi no recibe tráfico. Repasa 47.3 y 47.5.'
    },
    {
      id: 'presupuesto', type: 'single', fixed: true,
      prompt: 'Reservas un 2&#8239;% de las impresiones para la exploración de videos nuevos. ¿Cuántas le tocan a cada uno por día?',
      options: ['40', '400', '800', '4 000'],
      answer: 1,
      explain: '4 000 000 000 × 0.02 = 80 000 000, y 80 000 000 / 200 000 = 400. 40 divide de más por diez; 800 y 4 000 suponen menos videos nuevos o más tráfico del que hay. Repasa 47.9.'
    },
    {
      id: 'margen', type: 'single',
      prompt: 'Con 400 impresiones y un CTR real del 4&#8239;%, el margen al 95&#8239;% es 1.96 × √(0.04 × 0.96 / 400) ≈ 1.9 puntos. ¿Qué puedes concluir de esas 400?',
      options: [
        'Ordenar bien a todos los videos nuevos entre sí, porque 400 impresiones son muchas para un solo video',
        'Separar los muy buenos (un 8 %) de los muy malos (un 1 %), pero no ordenar los que andan entre 3 y 5 %',
        'Nada todavía: con menos de 1 000 impresiones el CTR no tiene ningún valor estadístico para decidir',
        'Que los videos con 0 clics son malos, porque en 400 impresiones un video bueno siempre tiene al menos uno'
      ],
      answer: 1,
      explain: 'Un margen de ±1.9 puntos separa 8&#8239;% de 1&#8239;%, pero no 3&#8239;% de 5&#8239;%. Por eso el bandit sigue: los que van bien reciben más impresiones y su margen se achica. Cero clics en 400 con CTR del 1&#8239;% pasa un 2&#8239;% de las veces (0.99⁴⁰⁰): raro, no imposible. Repasa 47.9.'
    },
    {
      id: 'politica', type: 'single',
      prompt: '¿Qué política elige qué video nuevo ocupa cada lugar de exploración?',
      options: [
        'Thompson sampling con una Beta por video, que prueba más a los dudosos que podrían ser buenos',
        'Al azar entre los 200 000, así cada video recibe la misma oportunidad',
        'UCB1 con el bono √(2 ln t / n), porque es determinista y así dos réplicas eligen siempre el mismo video',
        'El de mayor CTR medido, porque así el lugar de exploración pierde lo menos posible frente al resto del feed'
      ],
      answer: 0,
      explain: 'Thompson reparte las pruebas según la chance de ser bueno y deja de probar solo cuando la curva se angosta. Al azar gasta lo mismo en los que ya se sabe que son malos; UCB1 con CTR de pocos puntos explora de más; el mayor CTR medido se clava en el primero con suerte. Repasa 47.5.'
    },
    {
      id: 'previo', type: 'single',
      prompt: 'Un creador con muchos videos buenos sube uno nuevo. ¿Con qué Beta arranca su video?',
      options: [
        'Beta(1, 1) como todos, porque cualquier otra cosa es un sesgo a favor de los creadores ya conocidos',
        'Una Beta centrada en el CTR de sus videos anteriores, con un peso chico: el de unas 20 impresiones',
        'Beta(1 + clics, 1 + no clics) con todos los clics de sus videos anteriores sumados, para que arranque seguro',
        'Ninguna: los videos de creadores conocidos no pasan por exploración y van directo al ranker'
      ],
      answer: 1,
      explain: 'Un previo chico centrado en su historia es información real y se corrige rápido si el video es peor. Sumar todos sus clics lo vuelve casi inamovible, y saltar la exploración le saca la oportunidad de medirse. Beta(1, 1) es razonable para un creador sin historia. Repasa 47.5 y el promedio bayesiano de M44.'
    },
    {
      id: 'calidad', type: 'single',
      prompt: 'Producto teme que la exploración llene el feed de videos engañosos que tienen clics pero nadie mira. ¿Qué recompensa usa el bandit?',
      options: [
        'El clic, porque es la señal más rápida y con más volumen; los engañosos se filtran después con reportes',
        'Ver más de 10 segundos o completar el video, y un "no me interesa" cuenta como recompensa negativa',
        'Las compras que genera el video, porque es lo único que le importa al negocio de Mercado Barrio',
        'El tiempo total de la sesión después del video, sin importar lo que la persona haga con el video'
      ],
      answer: 1,
      explain: 'Una recompensa que mira si el video se vio de verdad no premia el clickbait. Las compras son demasiado raras para aprender con 400 impresiones, y el tiempo de sesión empuja hacia lo que retiene, el riesgo de M51. Repasa 47.5 y 42.5 (Goodhart).'
    },
    {
      id: 'medir', type: 'multi',
      prompt: '¿Qué métricas vigilas para saber si la exploración funciona? Elige todas las que correspondan.',
      options: [
        'Cuántos videos nuevos por día llegan a las 1 000 impresiones',
        'El CTR del feed entero contra un grupo sin exploración, con su intervalo',
        'Cuántos creadores nuevos suben un segundo video en ese mes',
        'El CTR de los lugares de exploración, igual al del feed'
      ],
      answer: [0, 1, 2],
      explain: 'La primera mide si la exploración descubre; la segunda, cuánto cuesta; la tercera, si sirve al negocio. Los lugares de exploración tienen por diseño un CTR más bajo: pedirles el mismo es pedir que no exploren. Repasa 47.7 y 47.9.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Dónde:</b> un lugar de cada diez del re-ranking, reservado para videos de menos de 7 días, en la capa de reglas versionada.</li>'
    + '<li><b>Presupuesto:</b> un 2&#8239;% de las impresiones, 80 000 000 por día, unas 400 por video nuevo; los que van bien reciben más, los que van mal dejan de recibir.</li>'
    + '<li><b>Política:</b> Thompson sampling con una Beta por video, con un previo chico centrado en el historial del creador si lo tiene.</li>'
    + '<li><b>Recompensa:</b> ver más de 10 segundos o completar, con "no me interesa" como negativa; los clics solos premian el engaño.</li>'
    + '<li><b>Registro:</b> cada impresión de exploración lleva su propensión, que sirve para corregir el sesgo y para evaluar sin lanzar (M49).</li>'
    + '<li><b>Medir:</b> videos nuevos que llegan a 1 000 impresiones, CTR del feed contra un grupo sin exploración y creadores que vuelven a publicar.</li>'
    + '</ul>'
});
