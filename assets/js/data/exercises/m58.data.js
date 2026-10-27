SD.defineExercise('m58-backlog', {
  title: 'el primer escaneo de toda la tienda',
  scenario: '<p>Tienda Norte conecta por primera vez el escáner a sus 14 imágenes, al repositorio y a la cuenta de nube. '
    + 'El tablero muestra 2 300 hallazgos, 640 "críticos" por CVSS. El equipo tiene capacidad para unos 30 arreglos por semana '
    + 'y el gerente pide un plan para el lunes.</p>',
  steps: [
    {
      id: 'primero', type: 'single',
      prompt: '¿Qué haces antes de ordenar nada?',
      options: [
        'Abrir un ticket por cada hallazgo crítico y repartirlos entre los equipos',
        'Agrupar por CVE, paquete y versión, y quitar lo que no corre en producción',
        'Ordenar los 2 300 por CVSS y empezar por arriba con el primer equipo libre',
        'Silenciar todo lo que no sea crítico hasta terminar con los 640 críticos'
      ],
      answer: 1,
      explain: 'La mayor parte es ruido: la misma CVE en imágenes que comparten la base, imágenes viejas del registro y dependencias de build. Abrir 640 tickets antes de eso llena las colas de duplicados (58.8).'
    },
    {
      id: 'cual', type: 'single',
      prompt: 'Después del filtro quedan dos hallazgos para hoy y solo hay tiempo para uno. ¿Cuál?',
      options: [
        'SnakeYAML en el worker de pagos: CVSS 9.8, interno, EPSS 0.02, no está en el KEV',
        'El plugin del blog: CVSS 8.8, expuesto, en el KEV, pero el blog no tiene datos de clientes',
        'La VPN de la oficina: CVSS 9.8, expuesta a internet, en el KEV y da control total',
        'Los dos tienen el mismo CVSS, así que cualquiera de los dos según quién esté libre'
      ],
      answer: 2,
      explain: 'Explotación confirmada, expuesta e impacto total: Actuar. El worker de pagos es crítico pero interno y sin señal de explotación; el blog está en el KEV pero vale poco (58.6).'
    },
    {
      id: 'vex', type: 'single',
      prompt: 'Un desarrollador muestra que la API nunca llama a la función vulnerable de una librería. ¿Qué haces con el hallazgo?',
      options: [
        'Lo cierras como falso positivo en el escáner para que no vuelva a aparecer nunca',
        'Lo dejas abierto con su prioridad, porque el escáner sigue reportando la versión',
        'Subes la librería igual esta semana, por si el análisis del desarrollador falla',
        'Escribes un VEX not_affected con la justificación y quién lo analizó, a revisar'
      ],
      answer: 3,
      explain: 'El análisis queda escrito y el escáner deja de reportarlo, pero si el código cambia se repite. Silenciarlo para siempre esconde el día en que el camino aparece (58.8).'
    },
    {
      id: 'excepcion', type: 'single',
      prompt: 'Un hallazgo de clase Atender (14 días) se arregla con Spring Boot 4, una migración de tres semanas. ¿Qué propones?',
      options: [
        'Una excepción con dueño, regla del WAF mientras tanto y vencimiento en 30 días',
        'Dejarlo como está y anotar en el ticket que se arregla con la migración',
        'Bajar el hallazgo a la clase Seguir para que deje de contar como vencido',
        'Detener todo el trabajo del equipo hasta terminar la migración a Spring Boot 4'
      ],
      answer: 0,
      explain: 'El riesgo se acepta por escrito, con un control que lo baja y una fecha. Cambiar de clase para no ver el vencimiento es esconder la deuda (58.7).'
    },
    {
      id: 'metrica', type: 'single',
      prompt: '¿Qué le muestras al gerente cada mes para decir si el programa funciona?',
      options: [
        'El total de vulnerabilidades abiertas, que debería bajar cada mes',
        'El cumplimiento del plazo y el MTTR por clase, con las excepciones vencidas',
        'La cantidad de escaneos ejecutados y de tickets abiertos durante el mes',
        'El CVSS promedio de lo que queda abierto, que debería ir hacia abajo'
      ],
      answer: 1,
      explain: 'El total depende de cuántas CVE se publican y de la cobertura: si se escanean más activos, sube aunque el equipo trabaje mejor. Lo que dice si el programa cumple es el plazo por clase (58.9).'
    },
    {
      id: 'verificar', type: 'single',
      prompt: '¿Cuándo se da por cerrado un hallazgo de la clase Actuar?',
      options: [
        'Cuando el desarrollador mergea el PR con la versión nueva de la librería',
        'Cuando el escáner del CI pasa en verde sobre la rama principal del repositorio',
        'Cuando la imagen que corre en producción, por digest, ya no lo tiene',
        'Cuando el equipo dueño mueve el ticket a la columna de "Hecho" en el tablero'
      ],
      answer: 2,
      explain: 'El arreglo puede estar mergeado y no desplegado, o desplegado en un servicio y no en otro. Se verifica sobre lo que corre; en la clase Actuar, además, se busca si alguien entró antes del parche (58.1, 58.10).'
    }
  ],
  solution: '<ul>'
    + '<li>Quitar el ruido primero: duplicados, imágenes que no corren, dependencias de build y lo no alcanzable con VEX.</li>'
    + '<li>Priorizar con explotación (KEV, EPSS), exposición, impacto y criticidad del activo, con una matriz que todos aplican igual.</li>'
    + '<li>Plazos por clase; excepciones con dueño, control compensatorio y vencimiento.</li>'
    + '<li>Medir cumplimiento y MTTR por clase, y cobertura del inventario.</li>'
    + '<li>Cerrar sobre lo que corre, por digest; en Actuar, abrir además la búsqueda de compromiso previo.</li>'
    + '</ul>'
});
