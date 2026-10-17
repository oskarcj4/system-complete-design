SD.defineQuiz('m43', {
  title: 'Quiz: datos, eventos y features',
  pass: 0.7,
  questions: [
    {
      id: 'impresiones', type: 'single',
      prompt: 'Una tienda registra cada clic y cada compra, pero no qué se mostró. ¿Qué le falta para entrenar un ranking?',
      options: [
        'Nada importante: los clics ya dicen qué gusta, y lo demás se puede deducir del catálogo completo',
        'Los negativos y el CTR: no sabe qué se vio y no se tocó, ni en qué posición estaba cada clic',
        'Solo la hora exacta de cada clic, para ordenar los eventos en el data lake',
        'Las features del usuario, porque sin impresiones el feature store no tiene de dónde calcularlas'
      ],
      answer: 1,
      explain: 'Un clic sin su impresión es un positivo sin contexto. Deducir negativos del catálogo mezcla lo que se vio y se descartó con millones de ítems que nadie vio. Las features del usuario salen de sus eventos, no de las impresiones. Repasa 43.1.'
    },
    {
      id: 'dedupe', type: 'single',
      prompt: 'La app manda un lote, la API lo publica en Kafka y la respuesta 202 se pierde. La app reintenta. ¿Qué permite descartar los duplicados?',
      options: [
        'Un id por evento que genera la app, igual en el envío y en el reintento',
        'Un id que asigna la API de eventos al recibir el lote, único para cada request',
        'El offset de Kafka, porque cada mensaje recibe uno distinto y no se repite',
        'La hora de llegada al servidor, que nunca se repite'
      ],
      answer: 0,
      explain: 'El id tiene que nacer donde nace el evento: el reintento trae el mismo event_id y el procesador lo reconoce. Un id de la API o un offset de Kafka son distintos en cada envío, así que el duplicado parece un evento nuevo. Es la misma idea que la dedupe del M21. Repasa 43.2.'
    },
    {
      id: 'densidad', type: 'single',
      prompt: 'Mercado Barrio tiene 50 millones de usuarios y 100 millones de ítems, con 10 000 millones de parejas con alguna interacción fuerte. ¿Qué densidad tiene la matriz usuario-ítem?',
      options: ['0.02&#8239;%', '0.002&#8239;%', '0.0002&#8239;%', '0.00002&#8239;%'],
      fixed: true,
      answer: 2,
      explain: '10<sup>10</sup> / (5 × 10<sup>7</sup> × 10<sup>8</sup>) = 10<sup>10</sup> / (5 × 10<sup>15</sup>) = 2 × 10<sup>−6</sup>, que es 0.0002&#8239;%: una celda de cada 500 000. Repasa 43.3 y la calculadora.'
    },
    {
      id: 'csr', type: 'single',
      prompt: 'En la figura 43.2, <code>indptr</code> empieza con <code>[0, 2, 3, 3, 5, …]</code>. ¿Cuántas celdas con dato tiene la fila 2?',
      options: ['Ninguna', 'Una', 'Dos', 'Tres'],
      fixed: true,
      answer: 0,
      explain: 'La fila 2 ocupa de indptr[2] = 3 a indptr[3] = 3: cero posiciones. Una fila vacía repite el número. La fila 3, en cambio, va de 3 a 5 y tiene dos celdas. Repasa la figura 43.2.'
    },
    {
      id: 'negativos', type: 'single',
      prompt: 'La API sirve 10 ítems; la app registra que 6 estuvieron en pantalla y el usuario toca uno. ¿Cómo se etiquetan los otros nueve?',
      options: [
        'Los nueve como negativos, porque el usuario tuvo la lista completa disponible y eligió uno',
        'Cinco negativos y cuatro sin etiqueta, porque esos cuatro nunca llegaron a la pantalla',
        'Ninguno como negativo, porque el feedback implícito no permite saber qué no le gustó',
        'Cinco negativos y los cuatro restantes como positivos débiles, con la mitad del peso'
      ],
      answer: 1,
      explain: 'Servido no es visto. Lo que nunca estuvo en pantalla no dice nada; marcarlo como negativo castiga a los ítems por su posición. Lo visto y no tocado sí es un negativo, aunque ruidoso. Repasa 43.4 y la figura 43.3.'
    },
    {
      id: 'dificiles', type: 'single',
      prompt: '¿Qué riesgo tienen los negativos difíciles, como los ítems mostrados y no tocados?',
      options: [
        'Son demasiado fáciles de separar, y el modelo deja de aprender a distinguir candidatos buenos',
        'Castigan a los ítems populares, porque los populares son los que más se muestran sin tocar',
        'Algunos son positivos que la persona no llegó a tocar, así que meten ruido en la etiqueta',
        'Solo existen para los usuarios con historia, y dejan sin negativos a los usuarios nuevos'
      ],
      answer: 2,
      explain: 'Los difíciles enseñan lo que hace el ranking, distinguir entre candidatos buenos, pero algunos los habría tocado otro día. Los demasiado fáciles son los del azar; castigar lo popular es el riesgo de exagerar el muestreo por popularidad. Repasa la tabla de 43.4.'
    },
    {
      id: 'skew', type: 'single',
      prompt: 'El lote calcula "compras de hoy" por fecha UTC y el servicio online por fecha local. ¿Qué pasa con el modelo?',
      options: [
        'Nada, porque las dos fechas coinciden la mayor parte del día y el error se compensa en promedio',
        'Falla al servir con un error de tipos, porque la feature llega con dos formatos de fecha distintos',
        'El feature store detecta la diferencia y rechaza la feature',
        'Aprendió con un valor y sirve con otro, y predice peor sin dar ningún error'
      ],
      answer: 3,
      explain: 'Es training-serving skew: en las horas en que las dos fechas difieren, el modelo ve en producción valores que no vio al entrenar. No hay error ni rechazo, por eso es silencioso; y no se compensa, porque afecta siempre a las mismas horas y regiones. Repasa 43.7.'
    },
    {
      id: 'fuga', type: 'single',
      prompt: 'Agregan "el CTR del ítem en el mes" como feature: el AUC offline sube de 0.74 a 0.84 y el A/B empeora. ¿Qué es lo más probable?',
      options: [
        'Una fuga del futuro: la feature incluye clics posteriores a cada impresión',
        'El A/B duró poco, y con más semanas va a confirmar la mejora que se ve offline',
        'El AUC no sirve para medir recomendadores offline',
        'El modelo está sobreajustado porque tiene demasiadas features para tan pocos datos'
      ],
      answer: 0,
      explain: 'El CTR del mes entero contiene el clic de la propia impresión y los posteriores, que al servir no existen. Por eso la métrica offline mejora mucho y producción empeora. Se arregla con un point-in-time join. Repasa 43.8 y el widget.'
    },
    {
      id: 'propension', type: 'single',
      prompt: 'Un ítem en la posición 8 tiene un CTR de 4.05&#8239;%, y la probabilidad de mirar esa posición es 0.27. ¿Qué atractivo estima la corrección por propensión?',
      options: ['1.09&#8239;%', '4.05&#8239;%', '10&#8239;%', '15&#8239;%'],
      fixed: true,
      answer: 3,
      explain: 'Atractivo = CTR / propensión = 4.05&#8239;% / 0.27 = 15&#8239;%. Es más que el 10&#8239;% del ítem de la posición 1, aunque tenga menos clics. Repasa 43.9 y la figura 43.9.'
    },
    {
      id: 'borrar', type: 'multi',
      prompt: 'Un usuario pide que borren sus datos. ¿Qué hace falta? Marca todas las que correspondan.',
      options: [
        'Borrar sus eventos del data lake y sus logs de features',
        'Borrar sus claves del feature store online',
        'Reentrenar el modelo sin sus datos, para que deje de influir en los pesos',
        'Solo borrar su cuenta de usuario'
      ],
      answer: [0, 1, 2],
      explain: 'Hay que encontrar sus datos en cada almacén por su id. Lo que el modelo aprendió de él no sale de los pesos hasta el próximo reentrenamiento sin sus datos, por eso el plazo de reentrenar también es de privacidad. Las features no se recalculan si los eventos siguen ahí. Repasa 43.10.'
    }
  ]
});
