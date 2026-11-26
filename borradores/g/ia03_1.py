# IA03, parte 1: objetivos, excusa, antes, endpoints, dependencias e infraestructura.
add(objectives([
    'Separar lo que resuelve un workflow sin modelo de lo que necesita un agente, con un clasificador y una regla en código.',
    'Llevar el cliente de la sesión hasta PostgreSQL con <code>set_config</code> local y dejar que la row-level security filtre, sin que el modelo pueda elegir otro.',
    'Escribir la política de reembolsos como una función pura, reservar el monto con un candado y pedir aprobación con un <code>interrupt</code> que muestra los datos del pedido.',
    'Pagarle a un proveedor con una clave de idempotencia que sobrevive a timeouts y reintentos, y comprobar que no cobra dos veces.',
    'Probar el grafo sin modelo y medir el soporte con clientes simulados, juzgando por las filas que quedan y no por lo que dice el agente.',
]))

# ------------------------------------------------------------------ excusa
add('<h2 id="excusa">La excusa</h2>\n')
add('<p>Tienda Norte recibe unos cien mensajes de soporte al día. La mayoría son iguales: dónde está mi pedido, cambien la dirección de entrega. Unos pocos piden dinero: el termo llegó abollado, falta una cuchara, la licuadora no enciende. Los primeros tienen una respuesta exacta que está en la base. Los segundos piden leer el pedido, entender qué salió mal, decidir cuánto devolver y pagarle a un proveedor.</p>\n')
add('<p>Un agente que atiende todo con el modelo gasta tokens en preguntas que una consulta SQL contesta sola, y deja en manos del modelo la parte peligrosa: cuánto se devuelve y a quién. Esta guía hace lo contrario. Un clasificador decide el camino; lo conocido va a un <b>workflow</b> sin modelo, y lo demás a un <b>agente</b> que lee y propone. Quién es el cliente lo dice la sesión, la base filtra con row-level security, la política de reembolsos es código, lo grande lo aprueba una persona y el pago lleva una clave de idempotencia. Es la regla de <a href="' + M25 + '#aprobacion">25.9</a> llevada a un sistema que mueve dinero.</p>\n')

arch = svg('fi03', 770, 360, 'La arquitectura de IA03',
    'El cliente y el equipo de soporte llegan a la API o a la línea de comandos. La API corre el grafo de LangGraph, que tiene un nodo clasificar, los workflows sin modelo, el agente, las herramientas y el nodo aprobar con interrupt. A la derecha, el grafo habla con el modelo, Claude u Ollama; con la base tienda, con row-level security; con la base soporte, donde viven tickets, acciones y checkpoints; y con el proveedor de pagos. Abajo a la izquierda, Phoenix recibe las traces. Siete flechas numeradas.',
    '\n'.join([
        '<rect class="dg-frame" x="395" y="20" width="200" height="300" rx="10"/>',
        text(408, 38, 'soporte, un grafo de LangGraph', 'dg-group'),
        edge('fi03', 'M170 88 C190 88 190 168 208 168'),
        edge('fi03', 'M170 278 C190 278 190 188 208 188'),
        edge('fi03', 'M360 178 L393 178'),
        edge('fi03', 'M450 88 L450 110'),
        edge('fi03', 'M540 88 L540 110'),
        edge('fi03', 'M540 148 L540 186'),
        edge('fi03', 'M495 224 L495 262'),
        edge('fi03', 'M595 68 L628 68'),
        edge('fi03', 'M595 148 L628 148'),
        edge('fi03', 'M595 228 L628 228'),
        edge('fi03', 'M595 308 L628 308'),
        edge('fi03', 'M395 304 L362 304'),
        box(20, 60, 150, 56, 'Cliente', 'X-Cliente: 1', 'client', 'cliente'),
        box(20, 250, 150, 56, 'Equipo de soporte', 'más de 50 USD', 'client', 'equipo'),
        box(210, 150, 150, 56, 'API o CLI', '127.0.0.1:8003', 'edge', 'api'),
        box(210, 280, 150, 48, 'Phoenix', '6003', 'service', 'phoenix'),
        box(410, 52, 170, 36, 'clasificar', None, 'service', 'grafo'),
        box(410, 112, 80, 36, 'workflows', None, 'service', 'grafo'),
        box(500, 112, 80, 36, 'agente', None, 'service', 'grafo'),
        text(450, 168, 'sin modelo', 'dg-tiny', 'middle'),
        box(410, 188, 170, 36, 'herramientas', None, 'service', 'grafo'),
        box(410, 264, 170, 36, 'aprobar (interrupt)', None, 'service', 'grafo'),
        box(630, 40, 125, 56, 'Modelo', 'Claude u Ollama', 'gpu', 'modelo'),
        box(630, 120, 125, 56, 'tienda', 'RLS por cliente', 'db', 'tienda'),
        box(630, 200, 125, 56, 'soporte', 'acciones y hilos', 'db', 'soporte'),
        box(630, 280, 125, 56, 'Pagos', '8013', 'external', 'pagos'),
        pin(1, 196, 112), pin(6, 196, 250), pin(2, 611, 54), pin(3, 611, 134), pin(4, 611, 214), pin(5, 611, 294), pin(7, 378, 290),
    ]))
add(figure(arch, '<b>Figura IA03.1.</b> El modelo está a la derecha, arriba, y solo dos nodos lo llaman: clasificar y agente. Los workflows y la política no lo necesitan. Todo lo que tiene efecto pasa por la base soporte antes de salir.', arch=True))
add(table(['#', 'De → a', 'Protocolo y formato', 'Ejemplo', 'Con qué permiso'], [
    ['1', 'cliente → API', 'HTTP, JSON', '<code>POST /tickets/7/mensajes</code> con <code>{"texto": "llegó roto el termo"}</code>', 'La cabecera <code>X-Cliente</code>, que en tu tienda pone el login'],
    ['2', 'grafo → modelo', 'HTTPS a Anthropic, o HTTP a <code>localhost:11434</code>', 'El mensaje entre etiquetas; vuelve una clasificación o una llamada a herramienta', 'La clave de Anthropic, o ninguno con Ollama'],
    ['3', 'grafo → tienda', 'SQL sobre TCP, puerto 55435', '<code>SELECT … FROM pedidos WHERE id = 1043</code>', '<code>soporte_lector</code> (solo lectura) o <code>soporte_actor</code> (solo la dirección), con <code>app.cliente_id</code> de la sesión'],
    ['4', 'grafo → soporte', 'SQL sobre TCP, puerto 55435', 'Una fila en <code>acciones</code> con su clave', '<code>soporte_app</code>, dueño de esa base'],
    ['5', 'grafo → pagos', 'HTTP, JSON', '<code>POST /v1/refunds</code> con <code>Idempotency-Key: reembolso:7:toolu_…</code>', 'Ninguno: es el proveedor de mentira del compose'],
    ['6', 'equipo → API', 'HTTP, JSON', '<code>POST /aprobaciones/reembolso:7:toolu_…</code> con <code>{"decision": "aprobar"}</code>', 'La cabecera <code>X-Soporte</code>, que en tu tienda pone el login del equipo'],
    ['7', 'grafo → Phoenix', 'OTLP sobre HTTP', '<code>POST /v1/traces</code>', 'Ninguno, solo en tu máquina'],
]))
add('<p><b>Las fronteras.</b> Con Claude, cada mensaje del cliente y cada pedido que lee el agente sale de tu máquina hacia Anthropic: nombres de producto, montos, la dirección de entrega. Con Ollama no sale nada. Los embeddings de las políticas son siempre locales. El agente entra a la tienda con dos roles que no pueden ver un pedido ajeno ni cambiar uno que ya salió, aunque el modelo lo pida: el permiso lo impone PostgreSQL, no el prompt.</p>\n')
add('<h3 id="excusa-viaje">El viaje, por adelantado</h3>\n')
add(figure(seq('fi03v', 'Un reembolso de 80 USD', 'Ana escribe que el termo del pedido 1043 llegó abollado. El grafo clasifica, el agente lee el pedido con la RLS de Ana y propone 80.00 USD. La política pide una persona y el grafo se detiene. Marta aprueba, el grafo llama al proveedor con la clave y el agente le contesta a Ana.',
    [('cl', 'Ana'), ('ap', 'API'), ('gr', 'grafo'), ('mo', 'Modelo'), ('db', 'Bases'), ('eq', 'Marta'), ('pg', 'Pagos')],
    [('cl', 'ap', 'llegó abollado el termo', 'req'),
     ('gr', 'mo', 'clasificar y agente', 'req'),
     ('gr', 'db', 'VerPedido 1043 con la RLS de Ana', 'req'),
     ('mo', 'gr', 'ProponerReembolso 80.00', 'res'),
     ('gr', 'db', 'política: aprobar; fila esperando', 'req'),
     ('ap', 'cl', '202, espera a una persona', 'res'),
     ('eq', 'ap', 'aprobar', 'req'),
     ('gr', 'pg', 'POST /v1/refunds con la clave', 'req'),
     ('pg', 'gr', '201 re_…', 'res'),
     ('ap', 'cl', 'reembolsamos 80.00 USD', 'res')]),
    '<b>Figura IA03.2.</b> La versión corta. La completa está en <a href="#viaje">El viaje de un dato</a>.'))

# ------------------------------------------------------------------ antes
add('<h2 id="antes">Antes de empezar</h2>\n')
add('<h3 id="ae-repaso">Lo que viene de las guías anteriores</h3>\n')
add(figure(cards('fi03r', 'Lo que viene de las guías anteriores', 'Cuatro piezas de IA00 a IA02 que vuelven en el soporte: el grafo con interrupt y checkpoint, la idempotencia, los roles de PostgreSQL y el spotlighting.', [
    ('El grafo', 'IA00 e IA01: estado, nodos, checkpoint e interrupt.', 'El ticket es un hilo; aprobar se detiene con interrupt.'),
    ('La clave', 'IA00 e IA01: una acción con efecto lleva su clave.', 'La misma clave viaja al proveedor como Idempotency-Key.'),
    ('Los roles', 'IA02: el GRANT del rol es la barrera, no el prompt.', 'Dos roles más la RLS: cada cliente ve lo suyo.'),
    ('El spotlighting', 'IA01 e IA02: lo de afuera va entre etiquetas.', 'El mensaje del cliente y cada resultado, escapados.'),
    ('pass^k', 'IA00 a IA02: cada caso k veces seguidas.', 'Ahora con un cliente simulado que conversa.'),
    ('Phoenix', 'IA01: una trace por pregunta.', 'Una trace por mensaje del cliente.'),
]), '<b>Figura IA03.3.</b> Seis cosas que vuelven. Si alguna no te suena, la tabla te lleva a donde se explicó.'))
add(table(['Qué', 'Dónde se vio'], [
    ['uv, la clave de Anthropic y Ollama', '<a href="' + IA0 + '#ae-uv">IA00, uv</a> y <a href="' + IA0 + '#ae-clave">la clave</a>'],
    ['Estado, checkpoint e interrupt', '<a href="' + IA0 + '#ae-estado">IA00, el estado</a> y <a href="' + IA0 + '#ae-interrupt">el interrupt</a>'],
    ['Idempotencia de una acción', '<a href="' + IA0 + '#ae-idempotencia">IA00, idempotencia</a>'],
    ['Salida estructurada', '<a href="' + IA1 + '#ae-estructurada">IA01, salida estructurada</a>'],
    ['Spotlighting y prompt injection', '<a href="' + IA1 + '#ae-injection">IA01, injection</a>'],
    ['Roles de PostgreSQL para un agente', '<a href="' + IA2 + '#ae-roles">IA02, los roles</a>'],
    ['pass^k', '<a href="' + IA0 + '#ae-pass-k">IA00, pass^k</a>'],
]))
add(figure(plate('fi03p', 'Lámina IA03.A: un soporte que reembolsa', 'Nueve piezas: el ticket, la clasificación, el workflow, el agente, la RLS, la política, la reserva, la aprobación y la clave de idempotencia.', [
    ('Ticket', 'un hilo del grafo'), ('Clasificación', 'intención y confianza'), ('Workflow', 'pasos fijos, sin modelo'),
    ('Agente', 'lee y propone'), ('RLS', 'app.cliente_id'), ('Política', 'una función pura'),
    ('Reserva', 'fila antes del pago'), ('Aprobación', 'interrupt con datos'), ('Clave', 'Idempotency-Key')]),
    '<b>Lámina IA03.A.</b> Las piezas, en el orden en que aparecen en el paso a paso.'))
add(plate_key([
    ('Ticket', 'Una conversación con un cliente. En el grafo es un hilo, <code>ticket-7</code>, con su checkpoint en PostgreSQL.', 'paso-tickets', 'Paso 9'),
    ('Clasificación', 'Lo que el modelo dice del último mensaje: intención, confianza, pedido y dirección, con forma fija.', 'paso-clasificar', 'Paso 7'),
    ('Workflow', 'Pasos fijos en código para lo que siempre se resuelve igual. No llama al modelo.', 'paso-clasificar', 'Paso 7'),
    ('Agente', 'El modelo con herramientas en un bucle, para lo que hay que leer y decidir.', 'paso-grafo', 'Paso 8'),
    ('Row-level security', 'PostgreSQL filtra cada fila según <code>app.cliente_id</code>, que pone el código desde la sesión.', 'paso-identidad', 'Paso 3'),
    ('Política', 'La regla de reembolsos en una función pura: rechazar, automático o una persona.', 'paso-politica', 'Paso 4'),
    ('Reserva', 'La fila en <code>acciones</code> que se escribe antes de pagar, con un candado por pedido.', 'paso-acciones', 'Paso 6'),
    ('Aprobación', 'El grafo se detiene con un <code>interrupt</code> y le muestra a una persona el pedido, no el resumen del modelo.', 'paso-grafo', 'Paso 8'),
    ('Clave de idempotencia', 'El mismo texto en cada intento de pago; el proveedor no cobra dos veces.', 'paso-acciones', 'Paso 6'),
]))

add('<h3 id="ae-instalar">Qué tienes que tener</h3>\n')
add(table(['Qué', 'Para qué', 'Cómo compruebas que está'], [
    ['Docker con Compose', 'PostgreSQL, el proveedor de pagos y Phoenix', '<code>docker compose version</code>; si no lo tienes, <a href="' + IA0 + '#ae-docker">IA00</a>'],
    ['uv y Python 3.13', 'El proyecto del soporte', '<code>uv --version</code>; ver <a href="' + IA0 + '#ae-uv">IA00</a>'],
    ['Ollama con <code>nomic-embed-text</code>', 'Los embeddings de las políticas, siempre, uses el modelo que uses', '<code>ollama pull nomic-embed-text</code> y después <code>ollama list</code>'],
    ['Una clave de Anthropic, u Ollama con <code>qwen3:8b</code>', 'El modelo que clasifica y atiende', '<code>echo $ANTHROPIC_API_KEY | cut -c1-7</code> o <code>ollama list</code>; ver <a href="' + IA0 + '#ae-clave">IA00</a>'],
    ['curl', 'Probar la API', '<code>curl --version</code>'],
]))
add('<p>Con un solo modelo de chat alcanza. Si tienes los dos, cada paso dice qué comparar. Los puertos de esta guía (55435, 8013, 6003 y 8003) no chocan con los de IA01 ni IA02, así que puedes tener los tres laboratorios a la vez.</p>\n')

add('<h3 id="ae-router">Workflow o agente</h3>\n')
add(analogy('La recepción de un banco. Quien pide el saldo lo recibe de la máquina, sin hablar con nadie. Quien dice que le cobraron dos veces pasa con un ejecutivo, que mira la cuenta y decide. La recepcionista no resuelve nada: solo mira a cada persona y le indica la fila.'))
add('<p>Un <b>workflow</b> es una secuencia fija de pasos en código: consulta el pedido y arma la frase. Siempre hace lo mismo, cuesta cero tokens y se prueba con un <code>assert</code>. Un <b>agente</b> es el modelo en un bucle con herramientas (<a href="' + M25 + '#bucle">25.2</a>): elige qué leer y qué proponer, y por eso puede equivocarse. Anthropic recomienda empezar por lo más simple que funcione y sumar autonomía solo donde hace falta; este soporte lo aplica por mensaje. El modelo solo clasifica, y la regla que elige el camino es código:</p>\n')
add(figure(flow('fi03a', 'Del mensaje al camino', 'El mensaje llega, el modelo lo clasifica con una confianza, y una función en código elige: con confianza baja, al agente; si pregunta el estado, al workflow de estado; si cambia la dirección y trae pedido y dirección, al workflow de dirección; todo lo demás, incluido cada reembolso, al agente.', [
    ('Mensaje', 'entre etiquetas'), ('Clasificar', 'el modelo, forma fija'), ('camino()', 'una regla en código'),
    ('wf_estado', 'sin modelo'), ('wf_direccion', 'sin modelo, con clave'), ('agente', 'herramientas y política')]),
    '<b>Figura IA03.4.</b> El reembolso nunca va a un workflow aunque parezca simple: necesita leer qué salió mal, y eso es trabajo del agente. Lo que no cambia, la regla del dinero, está en la política.'))
add(figure(ficha('fi03f1', 'el router',
    'El último mensaje del cliente.',
    'El modelo devuelve una Clasificacion; camino() elige con reglas fijas y un umbral de confianza.',
    'Un nombre de nodo: wf_estado, wf_direccion o agente.',
    ['intencion:          estado_pedido', 'confianza:          0.95', 'pedido_mencionado:  1011', 'camino:             wf_estado'],
    'Cada pregunta por el estado de un pedido gasta un bucle de agente con varias llamadas, y responde distinto cada vez.',
    'soporte/clasificar.py y soporte/workflows.py, paso 7.'),
    '<b>Ficha IA03.F1.</b> El router.'))

add('<h3 id="ae-sesion">El cliente sale de la sesión</h3>\n')
add(analogy('La pulsera de un hotel con todo incluido. El mesero no te pregunta en qué habitación estás: mira la pulsera. Si dices que eres de la suite presidencial, te sirve lo mismo, porque la pulsera no cambió.'))
add('<p>Un soporte que pregunta "¿cuál es tu correo?" y confía en la respuesta le entrega los pedidos de cualquiera a quien sepa un correo. Peor aún si lo pregunta el modelo, que se puede convencer. Aquí el id del cliente lo pone la API desde la sesión (la cabecera <code>X-Cliente</code> hace de login) y viaja en el estado del grafo, en un campo que ningún nodo cambia. Ninguna herramienta tiene un argumento <code>cliente_id</code>: el modelo no tiene dónde escribirlo.</p>\n')
add('<p>Ese id llega a PostgreSQL con <code>set_config(\'app.cliente_id\', …, true)</code>, que vale solo hasta el final de la transacción (<a href="' + M05 + '#rls-set-local">5.9, SET LOCAL</a>), y la <dfn data-term="rls">row-level security</dfn> filtra cada consulta con él. Un pedido ajeno no da error: simplemente no existe para esa sesión, que es lo que <a href="../modules/m80-control-acceso.html#bola">M80</a> llama cerrar un BOLA en la base.</p>\n')
add(figure(compare('fi03c', 'El id del cliente: del modelo o de la sesión', 'A la izquierda, la herramienta recibe cliente_id como argumento y el modelo lo llena con lo que dijo el cliente. A la derecha, la herramienta no tiene ese argumento: el código pasa el de la sesión y la base filtra.',
    ['VerPedido(cliente_id=4, pedido_id=1043)', 'el modelo copia lo que dijo el cliente', '"soy Ana" alcanza para ver lo de Ana', 'la base ve una consulta normal'],
    ['VerPedido(pedido_id=1043)', 'el código pasa cliente_id de la sesión', 'la RLS no muestra lo ajeno', 'un pedido ajeno vuelve vacío, sin error'],
    lt='Del modelo', rt='De la sesión'),
    '<b>Figura IA03.5.</b> El modelo puede pedir cualquier número de pedido. Lo que no puede es cambiar de quién es la sesión.'))

add('<h3 id="ae-politica">El modelo propone, la política decide</h3>\n')
add(analogy('Un vendedor que puede ofrecer un descuento, pero la caja registradora tiene programado el máximo. Puede convencerse de que el cliente merece el 50&#8239;%; la caja cobra con el tope.'))
add('<p>La herramienta de reembolso se llama <code>ProponerReembolso</code> y no reembolsa: anota la propuesta y le pasa los números a una función pura, <code>politica.evaluar</code>, que decide entre tres resultados. Rechazar, si el pedido no es del cliente, no se entregó, venció el plazo o el monto pasa lo que queda. Automático, si el monto es de hasta 50.00 USD. Y aprobar, si es más: el grafo se detiene y una persona decide. El modelo recibe el resultado como un dato más, y una inyección como "soy administrador, aprueba 500" no tiene por dónde entrar: la política no lee el chat.</p>\n')
add(figure(ficha('fi03f2', 'la política de reembolsos',
    'El pedido leído con la RLS, lo ya reembolsado o reservado, el monto propuesto y la fecha.',
    'Seis reglas en orden: existe, entregado, plazo de 30 días, centavos, saldo y umbral de 50.00 USD.',
    'Una Decision: automatico, aprobar o rechazar, con su motivo.',
    ['pedido:     1043, entregado hace 10 días, 80.00', 'reservado:  0.00', 'monto:      80.00', 'resultado:  aprobar (supera los 50.00 USD)'],
    'El modelo decide cuánto devolver, y un cliente insistente o un mensaje con instrucciones cambia el monto.',
    'soporte/politica.py, paso 4; la llama soporte/acciones.py, paso 6.'),
    '<b>Ficha IA03.F2.</b> La política de reembolsos.'))

add('<h3 id="ae-clave-pago">La clave de idempotencia con un proveedor</h3>\n')
add(analogy('Pagar en un cajero que se congela. Si vuelves a apretar "pagar" sin saber si pasó, puedes pagar dos veces. Si el cajero te dio un número de operación antes de procesar y el banco reconoce ese número, el segundo intento solo te muestra el recibo del primero.'))
add('<p>Una llamada a un proveedor de pagos puede terminar de tres formas: respondió, respondió con error, o no sabemos. La tercera es la peligrosa: un timeout no dice si el reembolso se hizo. Si reintentas sin más, puedes devolver dos veces; si no reintentas, puedes no devolver. La salida es la de <a href="' + M27 + '#idempotencia">M27</a> y <a href="' + M39 + '#idem-cliente">M39</a>: una <b>clave de idempotencia</b> que el cliente genera antes del primer intento y repite en todos. El proveedor guarda la clave con la respuesta, y un intento repetido devuelve la misma respuesta sin hacer nada nuevo. Es la misma idea de <a href="' + IA0 + '#ae-idempotencia">IA00</a>, ahora del otro lado de una red.</p>\n')
add('<p>Dos detalles la hacen funcionar. La clave sale de algo estable, el ticket y el id de la llamada a la herramienta, que quedó guardado en el checkpoint: si el grafo repite el nodo, la clave es la misma. Y la fila en <code>acciones</code> se escribe antes de llamar al proveedor, así que siempre sabes qué intentaste aunque el proceso se caiga a mitad.</p>\n')
add(figure(seq('fi03k', 'Un timeout con y sin clave', 'El soporte pide un reembolso con la clave K. El proveedor lo hace pero tarda 6 segundos; el soporte corta a los 3. Reintenta con la misma clave K y el proveedor responde con el reembolso que ya hizo, marcado como repetido. Un solo cobro.',
    [('so', 'soporte'), ('pg', 'Pagos'), ('al', 'almacén de claves')],
    [('so', 'pg', 'POST, Idempotency-Key: K', 'req'),
     ('pg', 'al', 'K: en curso', 'req'),
     ('pg', 'al', 'K: re_a1', 'req'),
     ('note', 'so', 'corta a los 3 s: no sabe'),
     ('so', 'pg', 'POST, Idempotency-Key: K', 'req'),
     ('pg', 'so', '201 re_a1, Idempotent-Replayed', 'res')]),
    '<b>Figura IA03.6.</b> Con otra clave en el segundo intento, el proveedor habría hecho un segundo reembolso. Lo vas a provocar en <a href="#comprueba-pagos">Cómo comprobar</a>.'))

add('<h3 id="ae-aprobacion">Aprobar con los datos, no con el resumen</h3>\n')
add(analogy('Un gerente que firma lo que le trae el asistente. Si solo lee la nota del asistente ("el cliente tiene razón, devolvamos 80"), firma lo que el asistente creyó. Si mira la factura, ve la fecha, el monto y lo que ya se devolvió.'))
add('<p>El <a href="' + IA0 + '#ae-interrupt">interrupt</a> de este soporte no le muestra a la persona lo que el modelo dice del caso. Le muestra los <b>hechos</b>: el pedido leído de nuevo por el código con la RLS del cliente, con sus productos, fechas y lo ya reembolsado, más el monto propuesto y el motivo tal como lo escribió el agente. Si el modelo fue engañado, el engaño está en el motivo, pero los números son los de la base. Es lo que <a href="' + M25 + '#aprobacion-que">25.9</a> pide de una aprobación: que la persona pueda decidir sin confiar en el modelo.</p>\n')

add('<h3 id="ae-simulado">Un cliente simulado</h3>\n')
add(analogy('Un actor que hace de cliente difícil en la capacitación de un call center. Tiene un guion de lo que quiere, no de lo que dice: improvisa según lo que le contesten. Al final no se califica la amabilidad, sino si el sistema hizo lo correcto.'))
add('<p>Un soporte es una conversación de varios turnos, y un eval de una sola pregunta no la cubre. En los evals de esta guía, otro modelo hace de cliente: recibe un objetivo ("eres Ana, el termo llegó abollado, quieres tu dinero") y escribe un mensaje por turno. El soporte contesta como con cualquiera. Al final, el eval no lee la respuesta: mira las filas que quedaron en <code>acciones</code>. Una respuesta amable que reembolsó de más falla igual (<a href="../modules/m72-evals-agentes.html#trayectoria">M72</a>).</p>\n')

# ------------------------------------------------------------------ endpoints
add('<h2 id="endpoints">Los endpoints</h2>\n')
add('<p>La API del soporte escucha solo en <code>127.0.0.1:8003</code>. La línea de comandos hace lo mismo sin servidor. Las cabeceras <code>X-Cliente</code> y <code>X-Soporte</code> hacen de sesión: en una tienda de verdad las pone el login (<a href="a12-sesiones.html">A12</a>, <a href="a13-oauth.html">A13</a>), nunca el navegador a mano. Esta API no autentica, y por eso no sale de tu máquina.</p>\n')


def ep(m, path, desc, req, resp, codes):
    lis = '\n'.join(f'      <li><span class="st st--{c[0]}xx">{c}</span><span>{t}</span></li>' for c, t in codes)
    return ('<div class="endpoint">\n  <div class="ep-head">\n'
            f'    <span class="ep-method" data-m="{m}">{m}</span>\n    <code class="ep-path">{path}</code>\n  </div>\n'
            f'  <p class="ep-desc">{desc}</p>\n  <div class="ep-body">\n    <p class="ep-sec">Request</p>\n'
            + code('http', req) + '    <p class="ep-sec">Respuesta</p>\n' + code('json', resp)
            + f'    <p class="ep-sec">Códigos de respuesta</p>\n    <ul class="ep-responses">\n{lis}\n    </ul>\n  </div>\n</div>\n')


add(ep('POST', '/tickets', 'Abre un ticket para el cliente de la sesión. Lo llama el chat de la tienda cuando el cliente escribe por primera vez.',
       'POST /tickets HTTP/1.1\nHost: 127.0.0.1:8003\nX-Cliente: 1',
       '{"ticket": 7}',
       [('201', 'Ticket creado.'), ('422', 'Falta <code>X-Cliente</code> o no es un entero positivo.')]))
add(ep('POST', '/tickets/{id}/mensajes', 'Un mensaje del cliente. Corre el grafo una vez y devuelve la respuesta, o avisa que una persona tiene que aprobar.',
       'POST /tickets/7/mensajes HTTP/1.1\nHost: 127.0.0.1:8003\nX-Cliente: 1\nContent-Type: application/json\n\n{"texto": "el termo del pedido 1043 llegó abollado"}',
       '{\n  "ticket": 7,\n  "estado": "esperando_aprobacion",\n  "camino": "agente",\n  "respuesta": "Tu pedido de reembolso necesita la aprobación de una persona del equipo. …",\n  "pasos": 2,\n  "tokens": {"entrada": 0, "salida": 0}\n}',
       [('200', 'Respondido.'), ('202', 'Espera una aprobación; el cliente no puede escribir hasta que se resuelva.'),
        ('404', 'El ticket no existe o es de otro cliente: el mismo error en los dos casos.'), ('409', 'El ticket ya espera una aprobación.'),
        ('422', 'Texto vacío o de más de 2000 caracteres.')]))
add('<p>Los tokens del ejemplo están en cero a propósito: dependen del modelo y del mensaje, y los vas a anotar tú en el paso 9.</p>\n')
add(ep('GET', '/aprobaciones', 'Lo que espera a una persona del equipo, del más viejo al más nuevo.',
       'GET /aprobaciones HTTP/1.1\nHost: 127.0.0.1:8003\nX-Soporte: marta',
       '[\n  {\n    "clave": "reembolso:7:toolu_…",\n    "ticket_id": 7,\n    "cliente_id": 1,\n    "pedido_id": 1043,\n    "monto_usd": "80.00",\n    "motivo": "llegó abollado y no cierra",\n    "creada_en": "…"\n  }\n]',
       [('200', 'La lista, vacía si no hay nada.'), ('422', 'Falta <code>X-Soporte</code>.')]))
add(ep('POST', '/aprobaciones/{clave}', 'Una persona aprueba o rechaza. El grafo del ticket sigue desde el interrupt, paga si corresponde y el agente le contesta al cliente.',
       'POST /aprobaciones/reembolso:7:toolu_… HTTP/1.1\nHost: 127.0.0.1:8003\nX-Soporte: marta\nContent-Type: application/json\n\n{"decision": "aprobar", "nota": "foto del termo revisada"}',
       '{\n  "ticket": 7,\n  "estado": "respondido",\n  "camino": "agente",\n  "respuesta": "Listo, Ana: …",\n  "pasos": 3,\n  "tokens": {"entrada": 0, "salida": 0}\n}',
       [('200', 'Resuelto; el agente contestó.'), ('404', 'La clave no tiene la forma <code>reembolso:N:…</code>.'),
        ('409', 'Esa acción no está esperando una decisión: ya se resolvió o es de otro paso.')]))
add('<p>El proveedor de pagos tiene sus propios endpoints (<code>POST /v1/refunds</code>, <code>GET /v1/refunds</code> y <code>POST /admin/modo</code>); están en el <a href="#anexo-pagos">anexo</a>.</p>\n')

# ------------------------------------------------------------------ dependencias
add('<h2 id="dependencias">Las dependencias</h2>\n')
add('<p>Crea la carpeta del proyecto y entra:</p>\n')
add(code('bash', 'mkdir ia03-soporte && cd ia03-soporte\nmkdir -p db pagos politicas soporte tests evals'))
add(table(['Paquete', 'Versión', 'Para qué'], [
    ['<code>langgraph</code>', '1.2.13', 'El grafo, <code>interrupt</code> y <code>Command</code>'],
    ['<code>langgraph-checkpoint-postgres</code>', '3.1.2', 'El checkpoint de cada ticket en PostgreSQL: un ticket que espera sobrevive a un reinicio'],
    ['<code>langchain</code>', '1.4.3', '<code>init_chat_model</code>, la misma interfaz para los dos modelos'],
    ['<code>langchain-anthropic</code>', '1.7.5', 'Claude'],
    ['<code>langchain-ollama</code>', '1.1.0', 'El modelo local y los embeddings'],
    ['<code>psycopg[binary,pool]</code>', '3.3.6', 'PostgreSQL, con un pool por rol'],
    ['<code>pgvector</code>', '0.5.0', 'El tipo <code>vector</code> en psycopg'],
    ['<code>httpx</code>', '0.28.1', 'El proveedor de pagos, con timeout'],
    ['<code>fastapi</code> y <code>uvicorn</code>', '0.143.0 y 0.54.0', 'La API de tickets'],
    ['<code>arize-phoenix-otel</code> y <code>openinference-instrumentation-langchain</code>', '0.17.2 y 0.1.78', 'Las traces, opcionales (extra <code>trazas</code>)'],
    ['<code>pytest</code>', '9.1.1', 'Las pruebas (grupo <code>dev</code>)'],
], right=(1,)))
add(Walk('toml', 'pyproject.toml', 'Declara el proyecto, sus dependencias fijas, los tres comandos y dónde están las pruebas.',
         'uv, cuando corres <code>uv sync</code> o <code>uv run</code>.', 'Nada.', 'Un <code>.venv</code> con todo instalado y los comandos <code>soporte</code>, <code>soporte-api</code> y <code>soporte-indexar</code>.', 'api',
         ['Nombra el proyecto y pide Python 3.13.', 'Fija cada dependencia con <code>==</code>.', 'Deja las traces como extra y pytest como grupo de desarrollo.', 'Declara los tres comandos y el paquete <code>soporte</code>.'])
    .from_file(rd('pyproject.toml'), [
        ('[project]', [('dependencies = [', 'Cada versión fija con <code>==</code>: el código de la guía se escribió contra ellas, y una versión nueva de LangGraph puede cambiar una firma.'),
                       ('"langgraph-checkpoint-postgres', 'El checkpointer de PostgreSQL. En IA00 usaste SQLite; aquí el checkpoint va a la misma base que las acciones.')]),
        ('[project.optional-dependencies]', [('trazas = [', 'Un extra: se instala con <code>uv sync --extra trazas</code>. Sin él, el soporte funciona igual y no manda traces.'),
                                             ('[project.scripts]', 'Tres comandos de terminal, cada uno con su función <code>main</code>.'),
                                             ('packages = ["soporte"]', 'Le dice a hatchling qué carpeta es el paquete.')]),
    ]).html())
add(try_('uv sync --extra trazas\nuv run python -c "import langgraph, psycopg; print(\'ok\')"', 'Tiene que imprimir <code>ok</code>. Si uv dice que no encuentra Python 3.13, instálalo con <code>uv python install 3.13</code>.'))

# ------------------------------------------------------------------ infraestructura
add('<h2 id="infraestructura">La infraestructura</h2>\n')
add('<p>Tres contenedores: PostgreSQL con pgvector (dos bases en la misma instancia), el proveedor de pagos de mentira y Phoenix. Empieza por los dos archivos chicos del proyecto:</p>\n')
add(whole('text', '.python-version', rd('.python-version'), 'Fija la versión de Python del proyecto.', 'uv.', 'Nada.', 'Que <code>uv run</code> use 3.13.', 'api'))
add(whole('text', '.gitignore', rd('.gitignore'), 'Deja fuera de git el entorno, las cachés, las variables y los resultados de los evals.', 'git.', 'Nada.', 'Un repositorio sin <code>.venv</code> ni claves.', 'api'))
add(Walk('yaml', 'compose.yaml', 'Levanta PostgreSQL con dos bases, el proveedor de pagos y Phoenix, todo en puertos de tu máquina.',
         'Tú, con <code>docker compose up -d --build</code>.', '<code>db/init.sql</code> y la carpeta <code>pagos/</code>.', 'Tres contenedores y un volumen.', 'tienda soporte pagos phoenix',
         ['Levanta PostgreSQL 17 con pgvector y corre <code>init.sql</code> la primera vez.', 'Construye el proveedor de pagos desde <code>pagos/</code>.', 'Levanta Phoenix.', 'Publica todo solo en <code>127.0.0.1</code>.'])
    .from_file(rd('compose.yaml'), [
        ('name: ia03-soporte', [('image: pgvector/pgvector:pg17', 'PostgreSQL 17 con la extensión pgvector ya compilada: la necesita la tabla de políticas.'),
                                ('- "127.0.0.1:55435:5432"', 'Solo tu máquina llega al puerto. 55435 para no chocar con IA01 (55433) ni IA02 (55434).'),
                                ('- ./db/init.sql', 'La imagen corre lo que esté en <code>docker-entrypoint-initdb.d</code> una sola vez, con el volumen vacío. Si cambias <code>init.sql</code>, borra el volumen.'),
                                ('healthcheck:', 'El estado <code>healthy</code> dice que la base acepta conexiones.')]),
        ('  # El proveedor de pagos', [('build: ./pagos', 'El proveedor se construye desde su carpeta. Su código está en el <a href="#anexo-pagos">anexo</a>.'),
                                       ('image: arizephoenix/phoenix', 'Phoenix, la misma imagen de IA01, en el 6003 de tu máquina.')]),
    ]).html())

add('<h3 id="infra-roles">Dos bases y cuatro roles</h3>\n')
add('<p>La base <code>tienda</code> es la de la tienda: clientes, pedidos, líneas y reembolsos ya conciliados. Su dueño es el rol <code>tienda</code>. La base <code>soporte</code> es del agente: tickets, mensajes, acciones, políticas y los checkpoints del grafo. Su dueño es <code>soporte_app</code>. El agente entra a la tienda con dos roles más, cada uno con lo mínimo:</p>\n')
add(figure(svg('fi03b', 770, 250, 'Quién puede qué en cada base',
    'Cuatro roles. tienda es dueño de la base tienda y la semilla entra con él. soporte_lector solo lee la tienda, en transacciones de solo lectura con un plazo de 3 segundos, y la RLS le muestra solo lo del cliente de la sesión. soporte_actor lee lo mismo y solo puede cambiar la columna direccion de un pedido propio que esté pagado. soporte_app es dueño de la base soporte y no entra a la tienda.',
    '\n'.join([
        box(20, 20, 170, 56, 'tienda', 'dueño de tienda', 'db'),
        box(205, 20, 170, 56, 'soporte_lector', 'SELECT, solo lectura', 'service'),
        box(390, 20, 170, 56, 'soporte_actor', 'UPDATE (direccion)', 'service'),
        box(575, 20, 175, 56, 'soporte_app', 'dueño de soporte', 'db'),
        lines(28, 104, 'Crea las tablas y carga la semilla. La RLS no lo filtra: es el dueño.', 26)[0],
        lines(213, 104, 'Ve solo los pedidos del cliente de la sesión. No escribe. Corta a los 3 s. Hasta 5 conexiones.', 26)[0],
        lines(398, 104, 'Cambia solo la dirección, solo de un pedido propio y pagado. Hasta 2 conexiones.', 26)[0],
        lines(583, 104, 'Tickets, mensajes, acciones, políticas y checkpoints. No entra a la tienda.', 26)[0],
        '<rect class="dg-warnbox" x="20" y="186" width="730" height="48" rx="8"/>',
        text(32, 206, 'Ninguno de los dos roles del agente puede ver un pedido ajeno, escribir un reembolso', 'dg-small'),
        text(32, 224, 'ni cambiar un pedido que salió. Eso vale aunque el modelo lo pida con las mejores palabras.', 'dg-small'),
    ])), '<b>Figura IA03.7.</b> La barrera es el rol con el que entra cada consulta, como en <a href="' + IA2 + '#infra-roles">IA02</a>. La novedad es la RLS: dos clientes usan el mismo rol y ven filas distintas.'))
add(Walk('sql', 'db/init.sql', 'Crea los cuatro roles, las dos bases, las tablas de la tienda con su RLS y las tablas del soporte.',
         'La imagen de PostgreSQL, una sola vez, como superusuario.', 'Nada.', 'Dos bases listas para la semilla y para el agente.', 'tienda soporte',
         ['Crea los roles y las bases, y cierra la conexión a quien no la necesita.', 'Hace de <code>soporte_lector</code> un rol de solo lectura con plazo.', 'En <code>tienda</code>, crea clientes, pedidos, líneas y reembolsos.', 'Activa la RLS con una política de lectura por tabla y otra de escritura solo para la dirección.', 'Da los permisos de tabla y de columna.', 'En <code>soporte</code>, crea pgvector y las tablas del agente.'])
    .from_file(rd('db/init.sql'), [
        ('-- Corre una sola vez', [('CREATE ROLE soporte_lector', 'Dos roles para el agente, cada uno con un tope de conexiones: un bucle que abre conexiones sin cerrar choca contra el tope y no contra la base entera.'),
                                  ('REVOKE CONNECT', 'Por defecto, cualquier rol se puede conectar a cualquier base. Se lo quitas a todos y se lo das a quien lo necesita.'),
                                  ('ALTER ROLE soporte_lector SET default_transaction_read_only', 'Cada transacción de este rol empieza en solo lectura. Un <code>UPDATE</code> falla con <code>ReadOnlySqlTransaction</code> aunque el GRANT lo permitiera.'),
                                  ('statement_timeout', 'Una consulta del lector que tarda más de 3 s se cancela.'),
                                  ('SET ROLE tienda;', 'Las tablas se crean como el rol <code>tienda</code>, que queda de dueño.')]),
        ('CREATE TABLE clientes (', [('estado       text', 'Tres estados. La política y la RLS de escritura los leen.'),
                                    ('total_usd    numeric(10,2)', '<code>numeric</code>, nunca <code>float</code>, para dinero: 0.1 + 0.2 da exacto.')]),
        ('-- Reembolsos ya conciliados', [('CREATE TABLE reembolsos (', 'Lo que ya se devolvió por fuera del agente. Los reembolsos del agente viven en <code>soporte.acciones</code> hasta que alguien los concilie.')]),
        ('-- Row-level security', [('current_setting(..., true)', 'Con el segundo argumento en <code>true</code>, una variable que no está puesta devuelve NULL en vez de error. NULL no es igual a nada: sin cliente, cero filas.'),
                                   ('CREATE POLICY propio ON pedidos', 'La política de lectura: un pedido se ve si su <code>cliente_id</code> es el de la sesión.'),
                                   ('CREATE POLICY propio ON lineas', 'Las líneas no tienen <code>cliente_id</code>: se ven si su pedido se ve. La subconsulta también pasa por la RLS de <code>pedidos</code>.')]),
        ('-- Las de arriba son solo para SELECT', [('CREATE POLICY direccion', 'La única escritura: el actor cambia un pedido propio y <code>pagado</code>. <code>WITH CHECK</code> impide que el UPDATE deje el pedido en otro estado.'),
                                                   ('GRANT UPDATE (direccion)', 'Permiso de columna: aunque la RLS dejara pasar la fila, el actor solo puede tocar <code>direccion</code>.')]),
        ('\\connect soporte', [('CREATE EXTENSION IF NOT EXISTS vector', 'La extensión la crea el superusuario, antes de cambiar de rol: un rol común no puede instalarla.'),
                               ('CREATE TABLE tickets (', 'Un ticket por conversación, con su modelo, sus tokens y su costo.')]),
        ('CREATE TABLE mensajes (', [('camino    text', 'Por dónde pasó cada respuesta del agente: <code>wf_estado</code>, <code>wf_direccion</code> o <code>agente</code>. Los evals lo leen.')]),
        ('-- Cada efecto, con su clave', [('clave        text', 'La clave de idempotencia es la llave primaria: la misma acción no se anota dos veces.'),
                                         ('estado       text', 'Cinco estados. <code>pendiente</code> es "no sé si se hizo": se reintenta con la misma clave.'),
                                         ('CREATE INDEX acciones_pedido', 'Un índice parcial para sumar lo reservado de un pedido sin leer las rechazadas.')]),
        ('CREATE TABLE politicas (', [('embedding vector(768)', 'El vector de cada sección de política: <code>nomic-embed-text</code> da 768 dimensiones.')]),
    ]).html())
add(errs([
    ('ERROR:  permission denied to create extension "vector"', 'La extensión se creó después de <code>SET ROLE soporte_app</code>. Muévela antes, como en el archivo, y borra el volumen: <code>docker compose down -v</code>.'),
    ('psql: error: … role "soporte_lector" does not exist', 'El volumen ya existía cuando agregaste <code>init.sql</code> y la imagen no lo corrió. <code>docker compose down -v</code> y levántalo de nuevo.'),
]))
add(try_('docker compose up -d --build\ndocker compose ps\ndocker compose exec postgres psql -U postgres -d tienda -c "\\dp pedidos"',
         'Los tres servicios en <code>running</code> y PostgreSQL en <code>healthy</code>. La última línea lista los permisos de <code>pedidos</code>: tiene que aparecer <code>soporte_actor</code> con <code>direccion</code> en los privilegios de columna y las dos políticas, <code>propio</code> y <code>direccion</code>.'))
