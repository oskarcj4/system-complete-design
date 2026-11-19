/* Decisiones guiadas de IA03 (Soporte que reembolsa). Formato en core/exercise.js. */

SD.defineExercise('ia03-soporte', {
  title: 'un soporte que no reembolsa por decisión del modelo',
  scenario: '<p>El soporte corre como en esta guía: un grafo de LangGraph que clasifica cada mensaje, manda el estado de un pedido y el cambio de dirección a workflows sin modelo, y lo demás a un agente con tres herramientas de lectura y una que propone reembolsos. La tienda recibe unos cien mensajes por día; el umbral para pedir una persona es 50.00 USD y el proveedor de pagos acepta una <code>Idempotency-Key</code>. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'router-o-agente', type: 'single',
      prompt: 'Seis de cada diez mensajes preguntan dónde está un pedido. ¿Cómo los atiende el soporte?',
      options: [
        'Con el agente, que lee el pedido con <code>VerPedido</code> y contesta con sus propias palabras.',
        'Con un workflow: el modelo solo clasifica, y el código lee el pedido y arma la frase.',
        'Con un prompt más corto para el agente, que salta las herramientas de reembolso en ese caso.',
        'Con un caché de respuestas por número de pedido, que se llena la primera vez que alguien pregunta.'
      ],
      answer: 1,
      explain: 'Una pregunta con una sola respuesta no necesita un agente: clasificar cuesta unos 0.0014 USD y un turno del agente unos 0.0179, trece veces más, y además el agente puede variar la respuesta o gastar pasos. Un prompt más corto sigue pagando el bucle. Un caché de respuestas se queda viejo cuando el pedido cambia de estado. Es el router de M25: workflows para lo conocido, agente para lo que hay que leer y decidir.'
    },
    {
      id: 'quien-es-el-cliente', type: 'single',
      prompt: '¿De dónde saca <code>VerPedido</code> el cliente cuyos pedidos puede ver?',
      options: [
        'Del argumento <code>cliente_id</code> de la herramienta, que el modelo llena con lo que dijo el cliente.',
        'Del prompt de sistema, donde el grafo escribe el id del cliente al principio de cada turno.',
        'Del estado del grafo, que lo recibe de la sesión, y de <code>set_config</code> en la transacción.',
        'De un <code>WHERE cliente_id = %s</code> que el código agrega a cada consulta antes de correrla.'
      ],
      answer: 2,
      explain: 'Si el id es un argumento, el modelo lo puede cambiar: basta con que el cliente diga «soy Ana». En el prompt, el modelo lo lee pero no es una barrera. Un <code>WHERE</code> en el código funciona hasta que alguien escribe una consulta nueva y lo olvida. Con el id en el estado y <code>app.cliente_id</code> en la transacción, la RLS de la base filtra cada consulta, la escriba quien la escriba.'
    },
    {
      id: 'politica-donde', type: 'single',
      prompt: '¿Quién decide si un reembolso propuesto se hace solo, espera a una persona o se rechaza?',
      options: [
        'El modelo, que leyó la política con <code>BuscarPolitica</code> y conoce el pedido entero.',
        'Una segunda llamada al modelo, que hace de juez y revisa la propuesta antes de aceptarla.',
        'La persona del equipo, que revisa todos los reembolsos sin importar el monto que tengan.',
        '<code>politica.evaluar</code>, una función pura que recibe el pedido leído con la RLS de la sesión.'
      ],
      answer: 3,
      explain: 'El modelo propone; la decisión del dinero está en código, que se prueba con una tabla de casos y no cambia con un mensaje bien escrito. Un juez es otro modelo y se puede convencer igual. Que una persona revise todo funciona con diez reembolsos al día, no con cien, y termina en aprobar por reflejo. La función recibe el pedido leído de nuevo con la RLS, no lo que el modelo crea del pedido.'
    },
    {
      id: 'umbral', type: 'single',
      prompt: 'El umbral es 50.00 USD. Elena pide 50.00 por la tetera del pedido 1051. ¿Qué pasa?',
      options: [
        'Sale solo: el umbral es inclusivo y 50.00 no lo supera.',
        'Espera a una persona: 50.00 ya llega al umbral fijado.',
        'Se rechaza: un monto igual al total pide revisar el caso.',
        'Depende de la confianza con que el modelo clasificó el mensaje.'
      ],
      answer: 0,
      explain: '<code>if monto &lt;= umbral</code>: hasta 50.00 inclusive es automático, desde 50.01 pide una persona. Pedir el total no es motivo de rechazo si el pedido se entregó hace menos de 30 días y no se devolvió nada antes. La confianza del clasificador elige el camino, no el resultado de la política. <code>test_politica.py</code> prueba 50.00 y 50.01 uno al lado del otro.'
    },
    {
      id: 'timeout-proveedor', type: 'single',
      prompt: 'El proveedor tarda 6 s y el soporte corta a los 3 s. ¿Qué hace <code>llamar_proveedor</code>?',
      options: [
        'Marca el reembolso como fallido y le dice al cliente que lo intente de nuevo más tarde.',
        'Reintenta con una clave nueva, porque la anterior quedó asociada a un pedido que falló.',
        'Reintenta con la misma clave, y el proveedor le devuelve el reembolso que ya había hecho.',
        'Espera sin plazo hasta que el proveedor conteste, porque cortar podría dejar un cobro a medias.'
      ],
      answer: 2,
      explain: 'Un timeout no dice si el reembolso se hizo. Darlo por fallido deja al cliente sin dinero aunque el proveedor pagó. Una clave nueva es un pedido nuevo: dos reembolsos, que es lo que prueba <code>test_una_clave_nueva_por_intento_cobra_dos_veces</code>. Esperar sin plazo deja el turno colgado. Con la misma clave, el segundo intento recibe la respuesta guardada con <code>Idempotent-Replayed: true</code>.'
    },
    {
      id: 'clave-de-que', type: 'single',
      prompt: '¿De qué sale la clave de idempotencia de un reembolso?',
      options: [
        'Del pedido y el monto: <code>1043:80.00</code>, para que un mismo reembolso nunca se repita.',
        'Del ticket y del id de la llamada del modelo, que queda guardado en el checkpoint del hilo.',
        'De un <code>uuid4()</code> que se genera en el nodo <code>herramientas</code> cada vez que corre.',
        'De la hora en que el modelo propuso el reembolso, redondeada al segundo más cercano.'
      ],
      answer: 1,
      explain: 'Un <code>uuid4()</code> nuevo cada vez que corre el nodo da otra clave si el nodo se repite después de un reinicio, y eso es un cobro doble. Pedido y monto juntan dos reembolsos legítimos distintos (dos tickets del mismo pedido) y le niegan el segundo al cliente. La hora cambia entre intentos. El id de la llamada quedó en el checkpoint con el mensaje del modelo: si el nodo se repite, la clave es la misma.'
    },
    {
      id: 'que-ve-quien-aprueba', type: 'single',
      prompt: 'El grafo se detiene en <code>aprobar</code>. ¿Qué le muestra a la persona del equipo?',
      options: [
        'El resumen que escribió el modelo, que explica el caso en dos líneas fáciles de leer.',
        'Solo el monto y el número de pedido, para que la decisión sea rápida y no lleve tiempo.',
        'La conversación entera del ticket, con todos los mensajes del cliente y del agente.',
        'Los hechos del pedido leídos de nuevo con la RLS, el monto, la clave y el motivo del cliente.'
      ],
      answer: 3,
      explain: 'El resumen del modelo es justo lo que no hay que creer: si el modelo se equivocó o lo convencieron, el resumen también. Solo el monto no alcanza para ver que Elena pide 120.00 por un producto de 50.01. La conversación entera sirve, pero esconde los números en el texto. Los hechos vienen de la base: total, líneas, fecha de entrega y lo ya devuelto. Es lo que M25 llama aprobar con los datos.'
    },
    {
      id: 'usuario-simulado', type: 'single',
      prompt: '¿Cómo juzga <code>evals/correr.py</code> si una conversación con un cliente simulado salió bien?',
      options: [
        'Con las filas que quedaron en <code>acciones</code>, comparadas con las esperadas de la persona.',
        'Con un modelo juez que lee la conversación y decide si el agente atendió bien al cliente.',
        'Con la última respuesta del agente, que tiene que coincidir con una respuesta de referencia.',
        'Con la marca de fin del simulador, que la escribe cuando consiguió lo que quería en la charla.'
      ],
      answer: 0,
      explain: 'Una respuesta amable que reembolsa de más tiene que fallar, y un juez o una respuesta de referencia la pueden aprobar. La marca de fin dice que el simulador se cansó o se conformó, no que el soporte hizo lo correcto. Las filas son el efecto: lo que se cobró, lo que espera a una persona y lo que no pasó. Es el grader de resultado de M72, con pass^k sobre k intentos.'
    }
  ],
  solution: '<ul><li>Lo que tiene una sola respuesta va a un workflow; el agente queda para lo que hay que leer y decidir.</li><li>El cliente sale de la sesión y llega a la base con <code>set_config</code>; la RLS filtra.</li><li>El modelo propone y <code>politica.evaluar</code> decide, con el pedido leído de nuevo.</li><li>El umbral es inclusivo: 50.00 sale solo, 50.01 pide una persona.</li><li>Un timeout se reintenta con la misma clave.</li><li>La clave sale del ticket y del id de la llamada, que sobrevive en el checkpoint.</li><li>La persona aprueba con los hechos de la base, no con el resumen del modelo.</li><li>Los evals juzgan las filas de <code>acciones</code>, no el texto.</li></ul>'
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia03-p-config', {
  kind: 'predict', title: 'la configuración',
  scenario: '<p>No definiste ninguna variable <code>SOPORTE_*</code>. Corres <code>uv run python -c "from soporte.config import CFG; print(CFG.umbral_usd, CFG.db_lector)"</code>.</p>',
  steps: [{
    id: 'umbral', type: 'single',
    prompt: '¿Qué imprime?',
    options: [
      '<code>50.0 postgresql://soporte_lector:lector@localhost:55435/tienda</code>',
      '<code>50.00 postgresql://soporte_lector:lector@localhost:55435/tienda</code>',
      '<code>50.00 postgresql://soporte_lector:lector@localhost:55435/soporte</code>',
      '<code>None None</code>'
    ],
    answer: 1,
    explain: '<code>Decimal("50.00")</code> conserva los dos decimales del texto: imprime <code>50.00</code>, no <code>50.0</code> como un <code>float</code>. El lector entra a la base <code>tienda</code>, la de los pedidos; <code>soporte</code> es la base de los tickets y las acciones. Sin variables, cada campo usa su valor por defecto, no <code>None</code>.'
  }]
});

SD.defineExercise('ia03-p-semilla', {
  kind: 'predict', title: 'la semilla',
  scenario: '<p>Corres <code>uv run python semilla.py</code> y después, como dueño, <code>SELECT total_usd FROM pedidos WHERE id = 1052</code>.</p>',
  steps: [{
    id: 'total', type: 'single',
    prompt: '¿Qué número sale?',
    options: ['50.01', '69.99', '120.00', '120.01'],
    fixed: true,
    answer: 2,
    explain: 'El 1052 tiene dos líneas: la licuadora de 50.01 y la jarra de 69.99. La semilla calcula el total con <code>Decimal</code>: 50.01 + 69.99 = 120.00, exacto. 50.01 es lo que Elena va a pedir, no el total.'
  }]
});

SD.defineExercise('ia03-p-identidad', {
  kind: 'predict', title: 'la RLS sin sesión',
  scenario: '<p>Entras a la base directamente como el lector, sin pasar por <code>identidad.py</code>: <code>docker compose exec postgres psql -U soporte_lector -d tienda -c "SELECT count(*) FROM pedidos"</code>.</p>',
  steps: [{
    id: 'cuenta', type: 'single',
    prompt: '¿Qué devuelve?',
    options: ['0', '3', '12', '<code>permission denied for table pedidos</code>'],
    fixed: true,
    answer: 0,
    explain: 'El lector tiene <code>SELECT</code>, así que no hay error de permiso. Pero la política <code>propio</code> compara <code>cliente_id</code> con <code>current_setting(\'app.cliente_id\', true)</code>, que sin <code>set_config</code> es <code>NULL</code>, y <code>NULL</code> no es igual a nada: ninguna fila pasa. 12 es lo que ve el dueño; 3, lo que ve la sesión de Ana.'
  }]
});

SD.defineExercise('ia03-p-politica', {
  kind: 'predict', title: 'la política',
  scenario: '<p>El pedido 1043 vale 80.00, se entregó hace 10 días y ya se devolvieron 30.00. El agente propone 50.00. Corres <code>evaluar(p, Decimal("30.00"), Decimal("50.00"), hoy)</code>.</p>',
  steps: [{
    id: 'resultado', type: 'single',
    prompt: '¿Qué <code>resultado</code> devuelve?',
    options: ['<code>automatico</code>', '<code>aprobar</code>', '<code>rechazar</code>'],
    fixed: true,
    answer: 0,
    explain: 'Quedan 80.00 − 30.00 = 50.00, y 50.00 no supera lo que queda. Después, 50.00 no supera el umbral, que es inclusivo: automático. Con 50.01 sería <code>rechazar</code>, porque pasaría de lo que queda antes de llegar a la regla del umbral.'
  }]
});

SD.defineExercise('ia03-p-herramientas', {
  kind: 'predict', title: 'leer un pedido ajeno',
  scenario: '<p>Con la sesión de Ana (cliente 1) corres <code>ejecutar("VerPedido", {"pedido_id": 1031}, 1)</code>. El 1031 existe y es de Diego.</p>',
  steps: [{
    id: 'texto', type: 'single',
    prompt: '¿Qué devuelve?',
    options: [
      '<code>null</code>, porque <code>ver_pedido</code> devolvió <code>None</code> y <code>json.dumps</code> lo convierte',
      '<code>"No encuentro ese pedido entre los del cliente."</code>, entre comillas, como texto JSON',
      'Un <code>PermissionError</code>, porque la sesión no es la dueña del pedido que pidió',
      'El JSON del pedido 1031, porque el lector tiene <code>SELECT</code> sobre toda la tabla'
    ],
    answer: 1,
    explain: 'La RLS no deja ver el 1031 con <code>app.cliente_id = 1</code>, así que <code>ver_pedido</code> devuelve <code>None</code>. Pero <code>ejecutar</code> lo reemplaza con <code>or "No encuentro…"</code> antes de serializar, y <code>json.dumps</code> de un texto lo devuelve entre comillas. No hay error: un pedido ajeno se ve igual que uno que no existe.'
  }]
});

SD.defineExercise('ia03-p-acciones', {
  kind: 'predict', title: 'el proveedor lento',
  scenario: '<p>Corres <code>uv run python caos.py lento</code> y después una sola llamada a <code>llamar_proveedor(cuerpo, "prueba:lento")</code> con un pedido nuevo. En modo lento, el proveedor reembolsa y tarda 6 s en contestar; el plazo del cliente es 3 s.</p>',
  steps: [{
    id: 'resultado', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'Devuelve <code>None</code> después de cuatro timeouts, y el proveedor hizo cuatro reembolsos',
      'Devuelve el reembolso con <code>repetida</code> en <code>True</code> a los 3.5 s, y hay uno solo',
      'Devuelve el reembolso con <code>repetida</code> en <code>False</code> a los 6 s, al esperar',
      'Lanza <code>ValueError</code> porque el segundo intento recibe 409 por la clave en curso'
    ],
    answer: 1,
    explain: 'El primer intento se corta a los 3 s, pero el proveedor ya guardó el reembolso y su respuesta antes de dormir. Después de 0.5 s, el segundo intento con la misma clave recibe la respuesta guardada con <code>Idempotent-Replayed: true</code>. No hay 409 porque la respuesta ya estaba guardada, y un 409 tampoco lanza: se reintenta.'
  }]
});

SD.defineExercise('ia03-p-clasificar', {
  kind: 'predict', title: 'el camino',
  scenario: '<p>Bruno escribe «quiero cambiar la dirección del 1012». El modelo devuelve <code>Clasificacion(intencion="cambiar_direccion", confianza=0.95, pedido_mencionado=1012, direccion_nueva=None)</code>.</p>',
  steps: [{
    id: 'camino', type: 'single',
    prompt: '¿Qué devuelve <code>camino()</code>?',
    options: ['<code>"wf_direccion"</code>', '<code>"agente"</code>', '<code>"wf_estado"</code>', 'Un error de validación de Pydantic'],
    fixed: true,
    answer: 1,
    explain: 'La confianza pasa el mínimo de 0.8, pero el workflow de dirección necesita el pedido y la dirección nueva, y falta la dirección. Va al agente, que se la pregunta. <code>None</code> es un valor válido para <code>direccion_nueva</code>: no hay error de validación.'
  }]
});

SD.defineExercise('ia03-p-grafo', {
  kind: 'predict', title: 'el grafo detenido',
  scenario: '<p>En <code>test_reembolso_grande_espera_a_una_persona</code>, el guion propone 80.00 del pedido 1043. Después del primer <code>invoke</code>, la prueba lee <code>g.get_state(HILO).next</code>.</p>',
  steps: [{
    id: 'next', type: 'single',
    prompt: '¿Qué vale?',
    options: ['<code>()</code>', '<code>("aprobar",)</code>', '<code>("agente",)</code>', '<code>("herramientas",)</code>'],
    fixed: true,
    answer: 1,
    explain: 'La política devolvió <code>aprobar</code>, así que <code>herramientas</code> dejó el reembolso en <code>pendiente</code> y la arista fue a <code>aprobar</code>, que llamó a <code>interrupt</code>. El grafo queda detenido con ese nodo como el próximo. <code>()</code> sería un grafo que terminó; el agente sigue recién al reanudar.'
  }]
});

SD.defineExercise('ia03-p-tickets', {
  kind: 'predict', title: 'escribir mientras espera',
  scenario: '<p>El ticket 2 de Ana espera la aprobación del termo. Ana vuelve a escribir: <code>uv run soporte escribir 2 "¿ya está?" --cliente 1</code>.</p>',
  steps: [{
    id: 'error', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'El agente contesta que el reembolso está esperando a una persona del equipo',
      'Falla con <code>tickets.EnEspera</code>; por la API sería un 409',
      'Falla con <code>tickets.NoEsTuyo</code>; por la API sería un 404',
      'El grafo se reanuda y el reembolso se aprueba solo con el mensaje nuevo'
    ],
    answer: 1,
    explain: '<code>atender</code> mira el estado del ticket antes de correr el grafo: <code>esperando_aprobacion</code> lanza <code>EnEspera</code>, y la API la traduce a 409. Si dejara correr el grafo, un mensaje nuevo entraría encima del <code>interrupt</code>. El ticket sí es de Ana, así que no es <code>NoEsTuyo</code>.'
  }]
});

SD.defineExercise('ia03-p-api', {
  kind: 'predict', title: 'un ticket ajeno por la API',
  scenario: '<p>El ticket 2 es de Ana. Diego manda <code>POST /tickets/2/mensajes</code> con <code>X-Cliente: 4</code>.</p>',
  steps: [{
    id: 'codigo', type: 'single',
    prompt: '¿Qué código devuelve la API?',
    options: ['401', '403', '404', '409'],
    fixed: true,
    answer: 2,
    explain: '<code>_ticket</code> lanza <code>NoEsTuyo</code> si el ticket no existe o es de otro cliente, y la API lo traduce a 404. Un 403 le diría a Diego que el ticket 2 existe. 409 sería si el ticket estuviera esperando una aprobación y fuera suyo; 401 no aparece porque la cabecera vino.'
  }]
});

SD.defineExercise('ia03-p-trazas', {
  kind: 'predict', title: 'sin Phoenix',
  scenario: '<p>No definiste <code>SOPORTE_PHOENIX</code> y corres <code>uv run soporte escribir …</code>.</p>',
  steps: [{
    id: 'trazas', type: 'single',
    prompt: '¿Qué pasa con las traces?',
    options: [
      'Falla al arrancar: no encuentra Phoenix en el puerto 6003',
      'Imprime <code>Sin traces: instala el extra…</code> y sigue',
      'No se envían traces y no aparece ningún mensaje',
      'Las manda a <code>localhost:6006</code>, el puerto por defecto'
    ],
    answer: 2,
    explain: '<code>activar</code> sale en la primera línea si <code>CFG.phoenix</code> está vacío: no importa nada ni imprime nada. El aviso del extra aparece solo si la variable está definida y falta el paquete. No hay un puerto por defecto en <code>config.py</code>.'
  }]
});
