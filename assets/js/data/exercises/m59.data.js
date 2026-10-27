SD.defineExercise('m59-reglas', {
  title: 'las primeras reglas de Tienda Norte',
  scenario: '<p>Tienda Norte contrató un SIEM. El primer día llegan las reglas que trae el proveedor activadas por defecto y salen <b>200 alertas por día</b>. '
    + 'El equipo de seguridad son dos personas de plataforma con medio día por semana cada una. El threat model de M54 dice que las amenazas que más preocupan son '
    + 'una cuenta de soporte que borra pedidos sin rastro y alguien que entra al panel con una cuenta robada.</p>',
  steps: [
    {
      id: 'ruido', type: 'single',
      prompt: 'Con 200 alertas por día y 10 minutos de triaje cada una, ¿qué haces primero?',
      options: [
        'Contratar a una persona más para que mire las alertas durante el día',
        'Medir la precisión de cada regla y apagar o mandar a un ticket las peores',
        'Subir la severidad de todas para que la guardia las mire más rápido',
        'Dejar todo como está un mes para conocer bien lo que es normal'
      ],
      answer: 1,
      explain: '200 × 10 = 2 000 minutos, 33 horas de analista por día: nadie lo sostiene. Pocas reglas suelen dar la mayoría del ruido; se miden, se afinan o se apagan, y las de severidad baja van a un ticket diario.'
    },
    {
      id: 'fuentes', type: 'single',
      prompt: 'Para las dos amenazas del threat model, ¿qué fuentes necesitas sí o sí?',
      options: [
        'El log de auditoría del panel y la autenticación del SSO y la VPN',
        'Los flujos de red de todo el clúster y los registros de DNS',
        'Los logs de acceso de la API pública, que son los más completos',
        'Un EDR en cada nodo, que ve todos los procesos de las máquinas'
      ],
      answer: 0,
      explain: 'Borrar pedidos es una acción de negocio: solo la ve el log de auditoría del panel. Una cuenta robada se ve en la autenticación. Las dos fuentes son chicas y de señal alta. El EDR y la red ayudan, pero no ven ninguna de las dos.'
    },
    {
      id: 'borrado', type: 'single',
      prompt: '¿Cómo escribes la regla para la cuenta de soporte que borra pedidos?',
      options: [
        'Una alerta por cada pedido borrado, para no perder ninguno de vista',
        'Una alerta cuando se borra un pedido de un cliente con muchas compras',
        'Una correlación event_count: más de 20 borrados por usuario en una hora',
        'Una búsqueda manual cada viernes sobre los borrados de la semana entera'
      ],
      answer: 2,
      explain: 'Soporte borra pedidos todos los días; uno solo no dice nada. El comportamiento raro es el volumen: event_count agrupado por usuario con una ventana. El umbral sale del backtest sobre el último mes.'
    },
    {
      id: 'probar', type: 'single',
      prompt: 'La regla de borrados está escrita. ¿Qué tiene que pasar antes de que llegue al SIEM?',
      options: [
        'Que la revise el proveedor del SIEM, que conoce mejor su lenguaje',
        'Que se active en modo silencioso una semana y después se mire qué dio',
        'Que se convierta a la consulta nativa y se pegue a mano en la consola',
        'Pruebas con eventos positivos y negativos, un backtest y una revisión'
      ],
      answer: 3,
      explain: 'Es detection as code: los eventos positivos demuestran que dispara, los negativos que no da falsos positivos conocidos, el backtest cuenta las alertas del último mes y otra persona revisa. Pegarla a mano en la consola deja una regla sin historia.'
    },
    {
      id: 'ioc', type: 'single',
      prompt: 'Un proveedor ofrece una lista diaria de 50 000 IP maliciosas como reglas. ¿Qué haces con ella?',
      options: [
        'Usarla para enriquecer los eventos, no como una regla por cada IP',
        'Crear una regla por IP, porque cuantas más reglas, más cobertura',
        'Ignorarla, porque las listas de IP nunca sirven para nada en un SOC',
        'Bloquear todas las IP en el firewall y apagar la regla de spraying'
      ],
      answer: 0,
      explain: 'Las IP están abajo en la pirámide del dolor: el atacante las cambia en minutos. Como contexto ayudan (una alerta de comportamiento desde una IP conocida sube de prioridad), pero las reglas que duran miran el comportamiento.'
    },
    {
      id: 'ciego', type: 'single',
      prompt: 'La regla de spraying da falsos positivos cada mañana desde la salida NAT de la oficina. ¿Cómo la afinas?',
      options: [
        'Excluir la red de la oficina y no anotarlo, porque desde ahí no hay ataques',
        'Subir el umbral a 40 cuentas para que la oficina ya no lo alcance nunca',
        'Excluir la IP de la oficina y escribir el punto ciego en el ADS de la regla',
        'Apagar la regla en horario de oficina y dejarla activa solo por la noche'
      ],
      answer: 2,
      explain: 'Una exclusión acotada limpia el ruido, pero un atacante dentro de la oficina queda invisible para esa regla. Va en la sección de puntos ciegos del ADS, y otra regla (inicio exitoso desde un dispositivo nuevo) lo cubre.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Ruido:</b> medir la precisión de cada regla del proveedor; apagar o mandar a un ticket diario las de menos del 10 %.</li>'
    + '<li><b>Fuentes:</b> el log de auditoría del panel y la autenticación primero, con su alerta de silencio.</li>'
    + '<li><b>Reglas:</b> borrados masivos con <code>event_count</code> por usuario; spraying con <code>value_count</code> de cuentas por IP; inicio exitoso desde un país o dispositivo nuevo.</li>'
    + '<li><b>Proceso:</b> todo en git con eventos de prueba, backtest de 30 días, revisión y despliegue automático; cada regla con su ADS.</li>'
    + '<li><b>IOC:</b> como enriquecimiento, no como reglas.</li>'
    + '<li><b>Exclusiones:</b> acotadas y escritas como puntos ciegos, con otra regla que los cubra.</li>'
    + '</ul>'
});
