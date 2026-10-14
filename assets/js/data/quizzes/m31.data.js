SD.defineQuiz('m31', {
  title: 'Quiz: Google Docs',
  pass: 0.7,
  questions: [
    {
      id: 'publicado', type: 'multi',
      prompt: '¿Qué partes del diseño de Docs publicó Google? Marca todo lo que corresponde.',
      options: [
        'El algoritmo de colaboración y el log de revisiones, en el blog de Drive de 2010.',
        'Cómo autoriza los accesos, en el paper de Zanzibar de 2019.',
        'Cómo reparte los documentos abiertos entre sus servidores y cómo los reasigna.',
        'El modelo del documento con índices UTF-16, en la documentación de la Docs API.',
        'El código fuente del editor web, publicado como proyecto abierto en 2018.'
      ],
      answer: [0, 1, 3],
      explain: 'Docs no es open source. Están publicados el blog de 2010, Zanzibar y las APIs; el reparto entre servidores es un diseño de referencia. Lo abierto alrededor (Wave, Closure, J2CL) no es el editor. Repasa 31.1 y la figura 31.1.'
    },
    {
      id: 'diff', type: 'single',
      prompt: '¿Por qué el Docs de 2010 dejó de comparar versiones del documento para fusionar los cambios?',
      options: [
        'Porque calcular la diferencia entre dos versiones era demasiado caro con documentos largos.',
        'Porque comparar el antes y el después admite varias fusiones válidas y hay que adivinar la intención.',
        'Porque comparar versiones obliga a bloquear el documento mientras se calcula la fusión.',
        'Porque las diferencias ocupaban más espacio en el log que las versiones completas.'
      ],
      answer: 1,
      explain: 'El ejemplo del blog: negrita sobre «The quick» y «fox» cambiado por «dog» admiten más de una fusión plausible. Una operación, en cambio, dice qué quiso hacer cada uno. Repasa 31.4.'
    },
    {
      id: 'easy', type: 'single',
      prompt: 'Sobre «EASY AS 123», John cambia «123» por «ABC» (retain 8, insert «ABC», delete 3) y Luiz escribe «IT\'S » al principio. ¿Cómo queda la op de John al aplicarla en la copia de Luiz?',
      options: [
        'Igual: retain 8, insert «ABC», delete 3, porque Luiz escribió antes de lo que toca John.',
        'retain 13, insert «ABC», delete 3: sus posiciones se corren los cinco caracteres de Luiz.',
        'retain 8, insert «IT\'S ABC», delete 3: la op de John absorbe el texto que agregó Luiz.',
        'Se descarta y John la vuelve a escribir, porque se escribió sobre una versión que ya no existe.'
      ],
      answer: 1,
      explain: 'En la copia de Luiz hay cinco caracteres más antes de «123», así que transformar corre el retain de 8 a 13. Sin ese ajuste, John borraría «Y A». Repasa 31.5 y la figura 31.6.'
    },
    {
      id: 'tp1', type: 'single',
      prompt: '¿Qué garantiza la propiedad TP1 de una función de transformación?',
      options: [
        'Que transformar dos veces contra la misma op devuelve la op original.',
        'Que aplicar a y luego b transformada da lo mismo que b y luego a transformada.',
        'Que tres copias convergen aunque reciban las ops en cualquier orden.',
        'Que una op transformada nunca es más larga que la original.'
      ],
      answer: 1,
      explain: 'TP1 cierra el diamante de dos ops. Que tres copias converjan con cualquier orden es TP2, que solo hace falta sin servidor central. Repasa 31.5 y 31.6.'
    },
    {
      id: 'empate', type: 'single',
      prompt: 'Ana escribe «s» y Beto «!» en la misma posición a la vez. ¿Qué tiene que garantizar el desempate?',
      options: [
        'Que gane el carácter de quien tenga más permisos sobre el documento.',
        'Que todas las copias elijan el mismo orden, cualquiera que sea.',
        'Que gane el que escribió primero según el reloj de cada navegador.',
        'Que se pregunte a las dos personas cuál de los dos va primero.'
      ],
      answer: 1,
      explain: 'No hay un orden «correcto» entre los dos inserts; lo que rompe todo es que dos copias elijan distinto. El clon usa el orden del servidor: lo que ya está en el log va primero (a_primero). Repasa 31.5.'
    },
    {
      id: 'central', type: 'single',
      prompt: '¿Qué gana Docs al tener un servidor que ordena los cambios, como Jupiter y Wave?',
      options: [
        'Que el cliente ya no necesita aplicar sus cambios antes de que el servidor los confirme.',
        'Que alcanza con TP1: hay un solo orden, el del log, y cada cliente transforma contra él.',
        'Que el servidor no necesita transformar nada, porque los clientes ya llegan de acuerdo.',
        'Que dos clientes nunca escriben sobre la misma revisión, porque el servidor los turna.'
      ],
      answer: 1,
      explain: 'Punto a punto, cada copia recibe las ops en otro orden y hace falta TP2. Con un servidor central hay un único orden; el cliente igual aplica lo suyo al instante. Repasa 31.6 y la figura 31.8.'
    },
    {
      id: 'uno-en-vuelo', type: 'single',
      prompt: '¿Por qué el cliente de Docs no manda un cambio nuevo hasta recibir el ack del anterior?',
      options: [
        'Para que cada cambio que llega esté escrito sobre una revisión que el servidor ya confirmó.',
        'Para no saturar la red: el cliente manda como mucho un mensaje por cada ida y vuelta.',
        'Porque el servidor solo puede tener una conexión abierta por documento y por persona.',
        'Porque lo escrito mientras tanto se descarta y se vuelve a pedir al servidor después.'
      ],
      answer: 0,
      explain: 'Con varios en vuelo, el segundo estaría escrito sobre el primero, que quizá todavía no se guardó. Lo escrito mientras tanto no se pierde: se compone en el buffer y sale después del ack. Repasa 31.6.'
    },
    {
      id: 'remota', type: 'single',
      prompt: 'Ana tiene un cambio enviado sin ack y otro en el buffer. Llega una op remota. ¿Qué hace su cliente?',
      options: [
        'La guarda en una cola y la aplica cuando llegue el ack de lo enviado.',
        'La transforma contra lo enviado y contra el buffer, la aplica y ajusta los dos.',
        'Descarta lo enviado y lo vuelve a mandar transformado contra la remota.',
        'La aplica tal cual, porque el servidor ya la transformó contra todo lo de Ana.'
      ],
      answer: 1,
      explain: 'El servidor no conoce lo pendiente de Ana, así que no pudo transformar contra eso. Cada transformación devuelve también lo propio ajustado, y así enviada y buffer quedan escritos sobre la revisión nueva. Repasa 31.6.'
    },
    {
      id: 'pasos', type: 'order',
      prompt: 'Ordena lo que hace el servidor de sesión con un cambio que llega escrito sobre una revisión vieja.',
      items: [
        'Buscar si el par (cliente, seq) ya está guardado, por si es un reenvío',
        'Transformar el cambio contra cada revisión que el cliente no vio',
        'Guardarlo como la revisión siguiente con un INSERT condicional',
        'Mandar el ack al autor y el cambio a los demás'
      ],
      explain: 'Detectar el reenvío primero evita guardarlo dos veces; avisar recién después de guardar evita confirmar algo que puede perderse. Repasa 31.6 y la figura 31.10.'
    },
    {
      id: 'dos-duenos', type: 'single',
      prompt: 'Un servidor de sesión se congela, el directorio da su documento a otro y después el primero despierta creyéndose dueño. ¿Qué evita que los dos escriban la revisión 43?',
      options: [
        'El lease del directorio, que el servidor congelado revisa antes de cada escritura.',
        'La clave primaria (doc_id, rev) del log: el segundo INSERT de la 43 falla.',
        'Los clientes, que rechazan las revisiones que llegan de un servidor viejo.',
        'Un lock distribuido por documento que se toma en cada escritura del log.'
      ],
      answer: 1,
      explain: 'Un servidor congelado no sabe que perdió el lease: puede revisarlo justo antes de la pausa. El número de revisión funciona como fencing token y la base lo hace cumplir. Repasa 31.8 y la figura 31.13.'
    },
    {
      id: 'directorio', type: 'single',
      prompt: 'En el clon, ¿qué papel cumple el directorio de sesiones?',
      options: [
        'Garantiza que nunca haya dos dueños, porque se escribe con compare-and-set.',
        'Dice adónde mandar los mensajes de cada documento y evita trabajo doble.',
        'Guarda el estado de cada documento abierto para que otro servidor lo retome.',
        'Decide qué usuarios pueden abrir cada documento y con qué permiso.'
      ],
      answer: 1,
      explain: 'El compare-and-set evita que dos gateways elijan dueños distintos, pero no protege de una pausa. La seguridad sale del log condicional; el directorio solo enruta. Repasa 31.8.'
    },
    {
      id: 'snapshot', type: 'single',
      prompt: 'Con un snapshot cada 500 revisiones, ¿qué hace falta para abrir un documento en la revisión 1&#8239;234?',
      options: [
        'El snapshot de la 1&#8239;000 y aplicar las 234 revisiones siguientes.',
        'Aplicar el log entero desde la revisión 1, para no confiar en un snapshot.',
        'El snapshot de la 1&#8239;500 y deshacer las 266 revisiones que sobran.',
        'Solo el snapshot de la 1&#8239;000, porque las revisiones siguientes son pocas.'
      ],
      answer: 0,
      explain: 'El snapshot es un atajo para no reproducir el log desde el principio; lo posterior sale del log. Repasa 31.9 y la figura 31.14.'
    },
    {
      id: 'cursor', type: 'single',
      prompt: '¿Por qué el cliente del clon no manda la posición de su cursor mientras tiene cambios sin ack?',
      options: [
        'Porque en ese momento su posición local no corresponde a ninguna revisión del servidor.',
        'Porque el canal solo admite un mensaje en vuelo por pestaña y lo ocupa el cambio enviado.',
        'Porque el servidor ignora los cursores de quien está escribiendo, para ahorrar mensajes.',
        'Porque el cursor viaja dentro de la op enviada y el servidor lo saca de ahí.'
      ],
      answer: 0,
      explain: 'Los cursores viajan en coordenadas del servidor. Con algo sin confirmar, la posición local incluye cambios que el servidor todavía no ordenó. Repasa 31.10.'
    },
    {
      id: 'presencia', type: 'multi',
      prompt: 'Un documento tiene 50 personas y cada una mueve el cursor una vez por segundo. ¿Qué medidas contienen los mensajes de presencia? Marca todo lo que corresponde.',
      options: [
        'Juntar los movimientos de cursor cada 50&#8239;ms en un mensaje por destinatario.',
        'Guardar cada movimiento en el log de revisiones, para reenviarlos juntos.',
        'Mostrar a quienes solo leen como un número, sin reenviar sus cursores.',
        'Mandar el cursor solo cuando cambia, no a intervalos fijos.',
        'Transformar cada cursor contra todos los demás antes de mandarlo.'
      ],
      answer: [0, 2, 3],
      explain: 'Con 50 personas son 50 × 49 = 2&#8239;450 mensajes por ronda. La presencia nunca toca el log, y mover un cursor no depende de los demás cursores. Repasa 31.10 y la figura 31.15.'
    },
    {
      id: 'crdt', type: 'single',
      prompt: '¿Qué usa un CRDT de texto, en lugar de posiciones, para decir dónde va un carácter?',
      options: [
        'La hora de escritura de cada carácter, según el reloj del servidor que lo recibe.',
        'Un id que no cambia, y cada insert dice después de qué id va.',
        'El número de revisión del log en el que se escribió cada carácter.',
        'La posición en la copia del autor, ajustada después por el servidor.'
      ],
      answer: 1,
      explain: 'Como el id no cambia aunque otros escriban antes, no hay nada que transformar. El costo son los metadatos por carácter y las lápidas de lo borrado. Repasa 31.7 y la figura 31.12.'
    },
    {
      id: 'intercalado', type: 'single',
      prompt: 'Ana escribe «gato» y Beto «perro» a la vez en el mismo lugar, y el resultado es «gpaetrroro». ¿Qué pasó?',
      options: [
        'La red entregó las letras desordenadas y el editor no las reordenó.',
        'El algoritmo intercala inserts concurrentes en el mismo lugar.',
        'Dos copias divergieron y el servidor eligió la versión equivocada.',
        'Faltó transformar el buffer de una de las dos personas.'
      ],
      answer: 1,
      explain: 'Las copias convergen, pero mal: es la anomalía de intercalado que Kleppmann y sus colegas mostraron en 2019 en Logoot y LSEQ, y que FugueMax evita. Repasa 31.7.'
    },
    {
      id: 'restaurar', type: 'single',
      prompt: '¿Cómo restaura el clon la versión de las 10:12 mientras otras personas tienen el documento abierto?',
      options: [
        'Borra las revisiones posteriores a las 10:12 del log y recarga a todos.',
        'Agrega una op nueva que lleva el documento de hoy a como estaba a las 10:12.',
        'Reemplaza el snapshot más reciente por el de las 10:12 y deja el log intacto.',
        'Bloquea el documento, copia la versión vieja encima y lo desbloquea.'
      ],
      answer: 1,
      explain: 'Se calcula con invertir y componer y pasa por el servidor como cualquier op: se transforma contra lo que llegue y queda en el historial. Nada se borra. Repasa 31.11 y la figura 31.16.'
    },
    {
      id: 'zookie', type: 'single',
      prompt: 'Ana quita a Beto del documento y después escribe los sueldos. ¿Qué evita que una réplica atrasada de Zanzibar le deje leerlos?',
      options: [
        'Que las réplicas de Zanzibar respondan solo después de sincronizarse con todas las demás.',
        'Un zookie guardado con el contenido, que exige permisos al menos así de nuevos.',
        'Que el servidor de sesión cierre todas las conexiones cada vez que cambia una ACL.',
        'Un TTL corto en la caché de permisos, de un segundo como mucho.'
      ],
      answer: 1,
      explain: 'Es el problema del new enemy. El zookie lleva un timestamp global; Spanner garantiza que un snapshot que ve los sueldos también ve la revocación. Repasa 31.13 y la figura 31.19.'
    },
    {
      id: 'rebac', type: 'single',
      prompt: '«Puede leer este documento quien pueda leer la carpeta donde está.» ¿Qué modelo de permisos expresa esto de forma natural?',
      options: [
        'RBAC: un rol de lector por carpeta, asignado a cada persona.',
        'ReBAC: el permiso sale de la relación entre el documento y su carpeta.',
        'Listas de control de acceso copiadas a cada documento al moverlo.',
        'Un atributo «carpeta» en el usuario, evaluado como en ABAC.'
      ],
      answer: 1,
      explain: 'Zanzibar lo escribe con tuple_to_userset: viewer incluye a los viewers del parent. Con roles no se expresa la herencia, y copiar ACL se desactualiza al mover el archivo. Repasa 31.13.'
    },
    {
      id: 'offline', type: 'single',
      prompt: 'Ana trabaja sin red, recarga la pestaña y vuelve. ¿Por qué el id de la pestaña y el último seq tienen que sobrevivir a la recarga?',
      options: [
        'Porque el servidor rechaza a un cliente nuevo mientras el anterior tenga cambios pendientes.',
        'Porque un cambio que sí llegó antes del corte se reenviaría con otra clave y quedaría dos veces.',
        'Porque el id de la pestaña es el que firma los cambios y prueba quién los escribió.',
        'Porque sin el seq el cliente no puede pedir al servidor las revisiones que se perdió.'
      ],
      answer: 1,
      explain: 'El par (cliente, seq) es la idempotency key del cambio. Si cambia entre reintentos, el servidor no reconoce el reenvío. Las revisiones perdidas se piden con la revisión, no con el seq. Repasa 31.14.'
    }
  ]
});
