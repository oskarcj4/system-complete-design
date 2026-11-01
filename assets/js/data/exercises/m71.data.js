SD.defineExercise('m71-defensa', {
  title: 'las defensas del asistente de una farmacia en línea',
  scenario: '<p>Una farmacia en línea lanza un asistente sobre la API de un proveedor. Responde dudas de productos, consulta el estado de los pedidos del usuario y puede iniciar devoluciones. Lee las reseñas de los productos, que escribe cualquiera. Recibe unas 200&#8239;000 conversaciones al mes. El equipo de seguridad tiene dos semanas antes del lanzamiento.</p>',
  steps: [
    { id: 'riesgo', type: 'single',
      prompt: '¿Cuál es el riesgo que más importa diseñar primero?',
      options: [
        'Que alguien logre que el asistente explique dosis peligrosas de un medicamento',
        'Que una reseña con instrucciones haga iniciar devoluciones o mostrar pedidos ajenos',
        'Que el asistente responda con un tono poco profesional a un usuario que llega molesto',
        'Que alguien descubra el system prompt completo y lo publique en una red social'
      ],
      answer: 1,
      explain: 'La injection por reseñas usa los permisos del asistente: devoluciones y datos de otros. El contenido peligroso importa y lo cubren en parte el proveedor y un clasificador; el diseño es tuyo. Ver 71.1 y 71.9.' },
    { id: 'regla', type: 'single',
      prompt: 'El asistente lee reseñas (A), ve pedidos del usuario (B) e inicia devoluciones (C). ¿Cómo lo acomodan?',
      options: [
        'Agregan al prompt que ignore cualquier instrucción que aparezca dentro de una reseña',
        'Separar: una sesión lee reseñas sin herramientas; otra, pedidos y devoluciones',
        'Dejan todo junto, pero limitan las devoluciones a tres por día para cada usuario',
        'Pasan las reseñas por un clasificador de injection y confían en lo que diga'
      ],
      answer: 1,
      explain: 'Cada sesión queda con dos propiedades como mucho. El clasificador y el prompt bajan la probabilidad; el límite por día acota pero no evita. Ver 71.7.' },
    { id: 'devolucion', type: 'single',
      prompt: 'La sesión de pedidos inicia devoluciones. ¿Qué control decide qué pedidos puede tocar?',
      options: [
        'El backend: la herramienta solo acepta pedidos del usuario autenticado',
        'El modelo: el prompt le dice que solo trabaje con los pedidos del usuario actual',
        'El clasificador de salida, que revisa si la respuesta menciona pedidos de otra persona',
        'Un log de devoluciones que alguien revisa una vez por semana en busca de casos raros'
      ],
      answer: 0,
      explain: 'Los permisos los impone el servicio, no el prompt. Es el control de acceso por objeto de M80, aplicado a una herramienta. Ver 71.4 y 71.9.' },
    { id: 'clasif', type: 'single',
      prompt: 'Quieren sumar un clasificador propio para dosis y combinaciones peligrosas. ¿Dónde lo ponen?',
      options: [
        'Solo en la entrada, porque es más barato y frena antes de gastar tokens del modelo',
        'En la entrada, con la conversación entera, y en la salida, por tramos del stream',
        'Solo en la salida, cuando termina la respuesta completa, antes de guardarla',
        'En ningún lado: el proveedor ya trae los suyos y uno propio solo suma latencia'
      ],
      answer: 1,
      explain: 'Entrada con historial para los ataques en varios turnos; salida para lo que llega codificado o en rol. El del proveedor no conoce las categorías de una farmacia. Ver 71.4 y 71.5.' },
    { id: 'umbral', type: 'single',
      prompt: 'Con el umbral elegido, el clasificador bloquea el 3&#8239;% de las preguntas legítimas sobre medicamentos. ¿Qué hacen?',
      options: [
        'Nada: en un tema de salud es preferible bloquear de más que de menos',
        'Bajar el umbral para bloquear todavía más, porque los ataques son raros pero graves',
        'Revisan una muestra de bloqueos, ajustan el umbral por categoría y miden de nuevo',
        'Apagar el clasificador y confiar solo en el entrenamiento del modelo del proveedor'
      ],
      answer: 2,
      explain: 'Con 200&#8239;000 conversaciones, el 3&#8239;% son 6&#8239;000 por mes sin respuesta. El umbral se elige por categoría y se revisa con datos reales. Ver 71.6.' },
    { id: 'redteam', type: 'single',
      prompt: '¿Cómo organizan el red teaming de las dos semanas?',
      options: [
        'Prueban ataques publicados contra la API del proveedor en producción, para ver qué pasa',
        'Contratan a alguien que intente romperlo sin alcance escrito, para que sea realista',
        'Alcance firmado en staging, cuentas de prueba, registro y los éxitos al set de regresión',
        'Corren una herramienta automática una vez y publican el reporte en el canal del equipo'
      ],
      answer: 2,
      explain: 'Sistema propio, autorización escrita, registro y regresión; el reporte se guarda con acceso restringido. La API del proveedor y producción quedan fuera. Ver 71.8.' }
  ],
  solution: '<ul><li>Riesgo principal: injection por reseñas con acceso a pedidos y devoluciones; secundario: contenido peligroso sobre medicamentos.</li><li>Regla de dos: la sesión que lee reseñas no tiene herramientas; la que maneja pedidos no lee reseñas. Si un caso necesita las tres, una persona aprueba.</li><li>Permisos en el backend: las herramientas solo aceptan pedidos del usuario autenticado; las devoluciones llevan clave de idempotencia y límite.</li><li>Clasificador propio de dosis y combinaciones en la entrada (con historial) y en la salida (por tramos), con umbral por categoría.</li><li>Medición: tasa de éxito de ataque y falsos rechazos con un set propio de ataques y de preguntas legítimas reales; revisión semanal de una muestra de bloqueos.</li><li>Red teaming: alcance firmado en staging, ataques manuales y automáticos, registro restringido y los éxitos al set de regresión que corre en CI.</li></ul>'
});
