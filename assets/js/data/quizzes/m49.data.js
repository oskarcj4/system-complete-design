SD.defineQuiz('m49', {
  title: 'Quiz: evaluar y experimentar', pass: 0.7,
  questions: [
    { id: 'particion', type: 'single',
      prompt: 'Un equipo evalúa un ranker partiendo el log de 30 días al azar: 80&#8239;% entrenamiento, 20&#8239;% prueba. El NDCG sale muy alto. ¿Qué pasa?',
      options: [
        'El modelo entrena con interacciones posteriores a las que se prueban y ve el futuro, así que la métrica sale optimista',
        'Nada grave: al azar o por tiempo da lo mismo si las dos particiones tienen la misma proporción de clics',
        'El NDCG alto se debe a que el 20&#8239;% de prueba es poco; con 50&#8239;% de prueba la métrica bajaría a su valor real',
        'La partición al azar mezcla usuarios entre grupos, y eso solo es un problema en los A/B, no offline'
      ],
      answer: 0,
      explain: 'Con la partición al azar, el modelo aprende del día 28 y se prueba con el día 3: es una fuga. Se parte por tiempo, como en producción. La proporción de clics o el tamaño de la prueba no arreglan la fuga. Vuelve a 49.1.' },
    { id: 'offline-online', type: 'single',
      prompt: '¿Por qué un ranker que gana offline puede no ganar en el A/B?',
      options: [
        'Porque las métricas offline se calculan con menos decimales que las del A/B y redondean a favor',
        'Porque offline solo reordena lo que mostró la política vieja; online elige qué mostrar y la gente reacciona',
        'Porque el A/B usa usuarios distintos a los del log, y los del log ya se acostumbraron al ranker viejo',
        'Porque offline se mide con el modelo entrenado y online con una copia cuantizada que pierde precisión'
      ],
      answer: 1,
      explain: 'El log no sabe qué habría pasado con ítems que nunca se mostraron, la métrica offline no es la de negocio y la gente reacciona a lo nuevo. Por eso offline descarta y el A/B decide. Vuelve a 49.1.' },
    { id: 'unidad', type: 'single',
      prompt: '¿Por qué se asigna la variante por usuario con un hash estable y no sorteando en cada request?',
      options: [
        'Porque calcular un hash es más barato que generar un número al azar en cada request',
        'Porque así la misma persona ve siempre lo mismo y los efectos no se mezclan entre variantes',
        'Porque sortear por request daría grupos de distinto tamaño y siempre saltaría el chequeo de SRM',
        'Porque la ley obliga a que cada usuario sepa en qué experimento está y el hash lo identifica'
      ],
      answer: 1,
      explain: 'Si cada request sorteara, una persona vería los dos rankers y su comportamiento mezclaría los dos efectos. El hash del usuario y del experimento es estable y reparte independiente entre experimentos. Sortear por request no rompe el tamaño de los grupos. Vuelve a 49.2.' },
    { id: 'n', type: 'single', fixed: true,
      prompt: 'La tasa base es del 5&#8239;% y quieres detectar una décima de punto. Con la regla 16 σ² / δ², ¿cuántos usuarios por grupo?',
      options: ['76 000', '380 000', '760 000', '1 520 000'],
      answer: 2,
      explain: 'σ² = 0.05 × 0.95 = 0.0475; 16 × 0.0475 / 0.001² = 760 000. 1 520 000 son los dos grupos juntos, 380 000 usa 8 en lugar de 16, y 76 000 pierde un cero. Vuelve a 49.3.' },
    { id: 'mitad', type: 'single', fixed: true,
      prompt: 'Si en lugar de 0.1 puntos quieres detectar 0.05, ¿cuántas veces más usuarios hacen falta?',
      options: ['2', '4', '8', '16'],
      answer: 1,
      explain: 'δ va al cuadrado en el denominador: con la mitad de δ, el tamaño se multiplica por 2² = 4. Vuelve a 49.3.' },
    { id: 'cuped', type: 'single',
      prompt: 'La correlación entre las compras del mes anterior y las del experimento es ρ = 0.7. ¿Qué hace CUPED con el tamaño necesario?',
      options: [
        'Lo baja a un 30&#8239;%, porque quita la parte del ruido que explica la historia, que es ρ',
        'Lo baja a un 51&#8239;%, porque la varianza se multiplica por 1 − ρ² = 1 − 0.49',
        'No lo cambia: CUPED corrige el sesgo del efecto medido, no la varianza del experimento',
        'Lo baja a un 70&#8239;%, porque solo se usa la parte de la historia que coincide con el período'
      ],
      answer: 1,
      explain: 'La varianza ajustada es var(Y) · (1 − ρ²); con ρ = 0.7, el 51&#8239;%, y 760 000 pasan a 387 600. CUPED no cambia el efecto promedio: baja la varianza. Vuelve a 49.4.' },
    { id: 'interleaving', type: 'single',
      prompt: '¿Por qué el interleaving detecta diferencias entre dos rankers con muchas menos sesiones que un A/B?',
      options: [
        'Porque cada persona compara los dos rankers a la vez, y su nivel de actividad deja de ser ruido',
        'Porque muestra listas más largas, con 20 lugares en lugar de 10, y junta el doble de clics por sesión',
        'Porque cuenta solo los clics en las primeras posiciones, que son los que tienen menos varianza',
        'Porque usa un umbral de significancia más bajo, de 0.1 en lugar de 0.05'
      ],
      answer: 0,
      explain: 'En el A/B se comparan grupos de personas distintas; en el interleaving, la misma persona y el mismo momento juzgan los dos órdenes. Netflix contó unas 100 veces menos usuarios. La lista es del mismo largo y el umbral es el mismo. Vuelve a 49.5.' },
    { id: 'red', type: 'single',
      prompt: 'El feed nuevo hace que Ana (tratamiento) compre más, y eso llena la fuente "lo que compran tus contactos" de Luis (control). ¿Qué haces?',
      options: [
        'Nada: el azar reparte por igual a las Anas y los Luises entre los dos grupos y se cancela',
        'Aleatorizar por grupos, como barrios o comunidades del grafo, aunque haya menos unidades',
        'Sacar del experimento a quienes tienen contactos, para que el grafo no interfiera',
        'Duplicar la duración, para que el efecto de red se diluya con el tiempo'
      ],
      answer: 1,
      explain: 'El efecto de red contamina el control y casi siempre achica la diferencia medida; el azar no lo cancela. Por grupos, pocas aristas cruzan. Sacar a quien tiene contactos mide otra población, y más tiempo no lo diluye. Vuelve a 49.6.' },
    { id: 'ips', type: 'single',
      prompt: 'La política vieja nunca mostró el ítem C. ¿Qué dice IPS de una política nueva que siempre muestra C?',
      options: [
        'Una estimación con mucha varianza, que se arregla recortando los pesos a un tope razonable',
        'Nada útil: no hay ninguna fila con C, el estimador da 0 y ningún peso lo recupera',
        'El CTR promedio del log, porque IPS cae al estimador ingenuo cuando no hay coincidencias',
        'Una estimación correcta si el log es muy grande, porque los pesos compensan la falta de datos'
      ],
      answer: 1,
      explain: 'IPS solo cuenta lo que la vieja mostró y la nueva también mostraría; con probabilidad 0 no hay filas y ningún peso las crea. El recorte ayuda cuando la probabilidad es chica, no nula. Por eso la vieja tiene que explorar. Vuelve a 49.7.' },
    { id: 'trampas', type: 'multi',
      prompt: 'Un A/B se esperaba 50/50 y terminó con 1 000 000 contra 995 000 usuarios, χ² = 12.5. Además, de 20 métricas, dos salieron significativas. ¿Qué es cierto? Elige todas las que correspondan.',
      options: [
        'El SRM tiene un valor p de 0.0004: el experimento no se analiza',
        'Con 20 métricas, que alguna salga significativa por azar pasa el 64&#8239;% de las veces',
        'Las dos métricas significativas confirman el efecto, porque son dos y no una',
        'Una diferencia de 5 000 usuarios entre 2 millones es ruido y se puede ignorar'
      ],
      answer: [0, 1],
      explain: 'χ² = 12.5 con un grado de libertad da p ≈ 0.0004: algo se llevó usuarios de un grupo. Y 1 − 0.95²⁰ = 64&#8239;%. Dos métricas de veinte no confirman nada, y 5 000 de diferencia no es ruido a esa escala. Vuelve a 49.9.' }
  ]
});
