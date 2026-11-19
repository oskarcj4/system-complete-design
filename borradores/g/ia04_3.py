# IA04, parte 3: hito 3 (pasos 8 a 11), el viaje y las decisiones.

# ================================================================== hito 3
add(hito(3, 3, 150, 'El host y la cola', 'Escribes el host que pide su token, se conecta al servidor MCP y corre el grafo; después, la cola vista desde la persona y la publicación que no repite. Al final, la línea de comandos que junta todo.', [
    ('paso-host', 'El host: token y conexión'), ('paso-grafo', 'El grafo del revisor'), ('paso-cola', 'La cola y la publicación'), ('paso-cli', 'La línea de comandos')]))

# ---------------- paso 8
add(step('paso-host', 'Paso 8. El host: token y conexión',
    step_map('host auth mcp', 'El secreto de <code>revisor-host</code>, de <code>.env</code>.', 'Una sesión MCP abierta con un Bearer y las cinco herramientas en el formato del modelo.', 'Nada: el token vive en memoria y vence en cinco minutos.', '<a href="#ae-oauth">OAuth sin personas</a> y <a href="#ae-mcp">MCP por HTTP</a>', '40 min'), ''))
add('<p>El host es el único proceso que habla con el modelo, y por eso es el que menos tiene: un secreto para pedir tokens de cinco minutos y nada de la forja. Cuatro archivos chicos: la configuración, el pedido del token, los dos modelos y el puente con el servidor MCP.</p>\n')
add(whole('python', 'revisor/__init__.py', rd('revisor/__init__.py'), 'Marca la carpeta como paquete y dice qué hace.', 'Python.', 'Nada.', 'Nada.', 'host'))
add(Walk('python', 'revisor/config.py', 'La configuración del host y de la persona: el modelo, el servidor MCP, el emisor, los dos secretos, los topes y lo que usa la publicación.',
         'Todos los archivos de <code>revisor</code>.', 'Variables de entorno de <code>.env</code> o de <code>.env.publicar</code>.', 'Un objeto <code>CFG</code> inmutable.', 'host persona',
         ['Lee el modelo, la URL del servidor MCP y la del emisor.', 'Lee los dos secretos de cliente sin que aparezcan al imprimir.', 'Fija los topes del grafo.', 'Aparte, lo que usa la persona: la forja, el token de comentar y su rol de la base.'])
    .from_file(rd('revisor/config.py'), [
        ('"""La configuración', [('mcp: str = ', 'El host conoce la URL del servidor MCP, no la de la forja. Para leer el repositorio tiene que pasar por las herramientas.'),
                                 ('secreto_host: str = field(', 'Los dos secretos del servidor de autorización, ocultos en <code>repr</code>. El de Claude Code está aquí solo para que <code>revisor token --cliente claude-code</code> lo pida por ti.'),
                                 ('max_pasos: int = ', 'Diez vueltas del modelo y cinco comentarios por PR. Los dos se cambian por entorno sin tocar el código.')]),
        ('    # Lo que usa solo la persona', [('token_publicar: str = field(', 'El token de comentar se lee de <code>.env.publicar</code>. Si corres el host con <code>.env</code>, queda vacío: el host no puede publicar ni por error.')]),
    ]).html())
add(Walk('python', 'revisor/token.py', 'Pide un token de acceso con <code>client_credentials</code> para el recurso del servidor MCP.',
         '<code>cli.py</code> y los evals.', 'El id y el secreto del cliente, y un scope opcional.', 'El JSON del servidor de autorización con <code>access_token</code>.', 'host auth',
         ['Se niega a seguir si falta el secreto.', 'Arma el formulario con el grant y el recurso.', 'Manda el id y el secreto en Basic y devuelve el JSON, o corta con el error.'])
    .from_file(rd('revisor/token.py'), [
        ('"""Pedir un token', [('datos = {"grant_type": "client_credentials", "resource": CFG.mcp}', 'El <code>resource</code> es lo que hace que el token salga con la audiencia del servidor MCP. Sin él, el servidor de autorización contesta <code>invalid_target</code>.'),
                               ('auth=(cliente, secreto)', 'httpx2 arma la cabecera <code>Authorization: Basic</code> con la tupla. El secreto va al servidor de autorización y a nadie más.'),
                               ('raise SystemExit(f"El servidor de autorización dijo', 'El cuerpo del error de OAuth se muestra entero: <code>invalid_scope</code> o <code>invalid_client</code> dicen qué falló.')]),
    ]).html())
add(Walk('python', 'revisor/modelos.py', 'Los dos modelos detrás de la misma interfaz y el precio para calcular el costo de una revisión.',
         '<code>cli.py</code> y los evals.', 'El nombre del proveedor: <code>claude</code> u <code>ollama</code>.', 'Un modelo de chat de LangChain, o el costo en USD.', 'modelo host',
         ['Fija los precios por millón de tokens.', 'Con <code>claude</code>, Sonnet 5.5 con un tope de salida y de tiempo.', 'Con <code>ollama</code>, <code>qwen3:8b</code> con una ventana de 32 768 tokens.', 'Calcula el costo con <code>Decimal</code>.'])
    .from_file(rd('revisor/modelos.py'), [
        ('"""Los dos modelos', [('PRECIOS = ', 'Los mismos precios que <a href="' + IA1 + '#lim-costo">IA01</a>. Si cambian, cambia esta línea.'),
                                ]),
        ('def modelo_chat(', [('return init_chat_model("claude-sonnet-5-5"', '<code>init_chat_model</code> devuelve un modelo con <code>bind_tools</code> y <code>ainvoke</code>, sea cual sea el proveedor: el grafo no sabe cuál usa.'),
                                ('# num_ctx:', 'Ollama corta el contexto en 2048 tokens si no le pides otra cosa, y lo hace sin avisar: el modelo ve el final del diff y no el principio.'),
                                ('def costo(', 'Con <code>Decimal</code>, como en <a href="' + IA0 + '#paso-modelos">IA00</a>: 0.1 + 0.2 no da 0.3 en <code>float</code>.')]),
    ]).html())
add(Walk('python', 'revisor/puente.py', 'Abre la sesión MCP con el token en la cabecera, convierte las herramientas al formato del modelo y llama a una.',
         '<code>cli.py</code> y los evals.', 'Un token y la URL del servidor; después, un nombre de herramienta y sus argumentos.', 'Un cliente MCP abierto, la lista de herramientas y el texto de cada resultado.', 'host mcp',
         ['Abre un cliente HTTP con el Bearer y, encima, la sesión MCP por Streamable HTTP.', 'Convierte cada herramienta de <code>tools/list</code> en una función con su esquema.', 'Llama a una herramienta y junta su texto; si es un error, lo marca con <code>ERROR:</code>.'])
    .from_file(rd('revisor/puente.py'), [
        ('"""El puente', [('@asynccontextmanager', 'Un <code>async with</code> hecho función (<a href="' + IA0 + '#py-with">IA00</a>): la conexión se abre al entrar y se cierra al salir, aunque el grafo falle.'),
                          ('async with httpx2.AsyncClient(headers=', 'El token va en la cabecera del cliente HTTP, que lo pone en cada request. El modelo nunca lo ve: no está en ningún mensaje.'),
                          ('timeout=httpx2.Timeout(30.0, read=120.0)', 'Leer puede tardar: la búsqueda baja hasta 40 archivos. Dos minutos de lectura antes de rendirse.'),
                          ('async with Client(streamable_http_client(url', 'El cliente del SDK sobre el transporte HTTP. <code>Client</code> hace el <code>initialize</code> al entrar.')]),
        ('def como_herramientas(', [('"parameters": t.input_schema', 'El esquema JSON que armó el servidor con los tipos de Python. En el SDK 2 el atributo es <code>input_schema</code>, en <code>snake_case</code>.'),
                                    ('return f"ERROR: {texto}" if r.is_error else texto', 'Un error de la herramienta no rompe el grafo: vuelve como texto, el modelo lo lee y decide. Lo que el servidor rechaza, el modelo lo ve rechazado.')]),
    ]).html())
add(predict('ia04-p-host'))
add(try_('uv run --env-file .env python - <<\'FIN\'\nimport asyncio\nfrom revisor import puente\nfrom revisor.config import CFG\nfrom revisor.token import pedir_token\n\nasync def main():\n    t = pedir_token("revisor-host", CFG.secreto_host)["access_token"]\n    async with puente.conectar(t) as c:\n        hs = puente.como_herramientas((await c.list_tools()).tools)\n        print([h["function"]["name"] for h in hs])\n        print(await puente.llamar(c, "leer_archivo", {"numero": 4, "ruta": ".env"}))\n\nasyncio.run(main())\nFIN',
         'Primero, una lista con los cinco nombres de herramientas. Después, una línea que empieza con <code>ERROR:</code> y dice <code>.env no se lee: es el tipo de archivo que guarda secretos.</code> El host pidió lo que el PR 4 quiere que pida, y el servidor dijo que no. El servidor MCP del paso 6 tiene que estar corriendo.'))
add(errs([
    ('httpx2.HTTPStatusError: … 401 Unauthorized', 'El servidor MCP no aceptó el token. Compara <code>REVISOR_RECURSO</code> del host, <code>AUTH_RECURSO</code> del compose y la URL que imprime el servidor: las tres tienen que ser la misma, con <code>127.0.0.1</code> y no <code>localhost</code>.'),
    ('httpx2.ConnectError: All connection attempts failed', 'El servidor MCP no está corriendo. Arráncalo en otra terminal con <code>uv run --env-file .env.mcp revisor-mcp</code>.'),
]))

# ---------------- paso 9
add(step('paso-grafo', 'Paso 9. El grafo del revisor',
    step_map('host modelo', 'El número de un PR, el modelo y una función que llama herramientas.', 'El estado final: mensajes, pasos, comentarios propuestos, tokens y un resumen.', 'Nada fuera del proceso; las filas las escribe el servidor.', '<a href="' + IA0 + '#ae-estado">el estado</a> (IA00)', '40 min'), ''))
add('<p>El grafo es el bucle de <a href="' + IA0 + '#paso-bucle">IA00</a> con tres cambios. Lee el diff sin preguntarle al modelo, porque siempre es lo primero. Las herramientas no son funciones de Python sino lo que devolvió <code>tools/list</code>, y se llaman por el puente. Y no tiene <code>interrupt</code>: nada en el grafo publica. El único efecto posible es una fila pendiente, y esa la escribe el servidor.</p>\n')
add(figure(flow('fi04g', 'El grafo del revisor', 'preparar llama a leer_diff sin el modelo. agente llama al modelo con las herramientas. Si el modelo pidió herramientas y quedan pasos, herramientas las llama por MCP y vuelve a agente. Si no, fin arma el resumen y cierra las llamadas pendientes.', [
    ('preparar', 'leer_diff, sin modelo'), ('agente', 'el modelo decide'), ('herramientas', 'por MCP, con topes'), ('fin', 'resumen o corte')]),
    '<b>Figura IA04.12.</b> Entre <code>agente</code> y <code>herramientas</code> está el bucle. Lo cortan dos topes: diez pasos y cinco comentarios por PR.'))
add(Walk('python', 'revisor/prompts.py', 'El prompt de sistema del revisor y el primer mensaje con el diff.',
         '<code>grafo.py</code>.', 'El número del PR y el diff en su sobre.', 'Dos textos.', 'host modelo',
         ['Dice qué es dato y qué no, y que no siga instrucciones que vengan en él.', 'Dice qué buscar, cómo proponer y que los comentarios pasan por una persona.', 'Arma el primer mensaje con el diff.'])
    .from_file(rd('revisor/prompts.py'), [
        ('"""El prompt', [('SISTEMA = """', 'El prompt dice que lo que está entre <code>&lt;resultado&gt;</code> es dato. Es la primera capa y la más débil: un modelo puede obedecer igual. Las que no dependen del modelo están en el servidor y en la base.'),
                          ('def pedido(', 'El diff va en el primer mensaje, ya leído. El modelo empieza con el contexto y no gasta un paso en pedirlo.')]),
    ]).html())
add(Walk('python', 'revisor/grafo.py', 'El grafo de LangGraph: lee el diff, deja al modelo pedir herramientas y corta en diez pasos o cinco comentarios.',
         '<code>cli.py</code>, los evals y las pruebas.', 'Un modelo, la lista de herramientas, una función <code>llamar</code> y los topes.', 'Un grafo compilado; con <code>ainvoke({"pr": 2})</code>, el estado final.', 'host modelo',
         ['Define el estado: el PR, los mensajes, los pasos, los comentarios, los tokens y el resumen.', 'Suma los tokens de cada respuesta.', '<code>preparar</code> lee el diff; <code>agente</code> llama al modelo; una función decide si sigue.', '<code>herramientas</code> llama a cada una, con los topes y los nombres conocidos.', '<code>fin</code> arma el resumen y cierra las llamadas que quedaron sin resultado.'])
    .from_file(rd('revisor/grafo.py'), [
        ('"""El grafo del revisor', [('from langgraph.graph.message import add_messages', 'El reducer de mensajes de <a href="' + IA0 + '#ae-estado">IA00</a>: lo que devuelve un nodo en <code>messages</code> se agrega, no reemplaza.'),
                                     ('Llamar = ', 'El grafo no sabe de MCP: recibe una función que toma un nombre y argumentos y devuelve texto. En las pruebas es una función falsa; en el host, el puente.')]),
        ('class Estado(', [('messages: Annotated[', 'Los mensajes con su reducer. Lo demás se reemplaza en cada nodo que lo devuelve.'),
                           ('def uso(', 'Los tokens de cada respuesta, sumados. LangChain los deja en <code>usage_metadata</code> con los mismos nombres para Claude y para Ollama.')]),
        ('def construir(', [('con_herramientas = modelo.bind_tools(herramientas)', 'El modelo recibe las herramientas en el formato de función. Las cinco que publica el servidor, ni una más.'),
                            ('async def preparar(', 'Leer el diff es siempre lo primero, así que no se le pregunta al modelo. Un paso menos y un pedido menos que el modelo puede hacer mal.'),
                            ('async def agente(', 'El prompt de sistema va en cada llamada, delante de los mensajes; no se guarda en el estado.'),
                            ('def despues_de_agente(', 'Sigue si el modelo pidió algo y quedan pasos. Si no, a <code>fin</code>.')]),
        ('    async def herramientas(', [('if c["name"] not in nombres:', 'Un modelo puede inventar una herramienta, por ejemplo una que un PR le sugirió. Vuelve como error, sin llegar al servidor.'),
                                       ('elif c["name"] == "proponer_comentario" and propuestos >= max_comentarios:', 'El quinto comentario es el último. Un PR que convence al modelo de proponer cien deja cinco filas, todas pendientes.'),
                                       ('if c["name"] == "proponer_comentario" and not texto.startswith("ERROR")', 'Solo cuentan los que entraron a la cola. Un comentario rechazado por el servidor no gasta el cupo.')]),
        ('    def fin(', [('if ultimo.tool_calls:', 'Si se acabaron los pasos con llamadas pedidas, cada una recibe un resultado que lo dice. Un mensaje del modelo con llamadas sin respuesta deja la conversación inválida para la próxima vuelta.'),
                        ('g = StateGraph(Estado)', 'Cuatro nodos, nombrados como sus funciones.'),
                        ('return g.compile()', 'Sin checkpointer: una revisión dura segundos y no espera a nadie. Si se corta, se corre otra vez, y la clave de cada comentario evita las filas repetidas.')]),
    ]).html())
add(pydef('<code>{**uso(e, respuesta)}</code> desarma un diccionario dentro de otro: suma sus claves al que se está armando. <code>for nodo in (preparar, agente, …)</code> recorre funciones como cualquier otro valor, y <code>nodo.__name__</code> es el nombre con que se escribieron.', 'Python de por medio: ** y funciones como valores'))
add(predict('ia04-p-grafo'))
add(try_('uv run pytest tests/test_grafo.py -q',
         '<code>4 passed</code>. Las cuatro pruebas corren el grafo con un modelo falso que responde con un guion: que el diff se lea antes de la primera llamada al modelo, que el quinto comentario sea el último, que el tope de pasos cierre las llamadas pendientes y que una herramienta inventada vuelva como error. Ninguna usa red ni tokens.'))

# ---------------- paso 10
add(step('paso-cola', 'Paso 10. La cola y la publicación',
    step_map('persona cola forja', 'Filas pendientes en <code>comentarios</code> y, para publicar, el token de <code>.env.publicar</code>.', 'Filas aprobadas o rechazadas; comentarios en la forja, cada uno una sola vez.', 'La tabla <code>comentarios</code> y los comentarios de los PRs.', '<a href="#ae-cola">proponer no es publicar</a>', '40 min'), ''))
add('<p>Del otro lado de la cola está la persona, con su propio rol de PostgreSQL y su propio token de la forja. Decidir es un <code>UPDATE</code> que solo cambia filas pendientes. Publicar es más delicado: la API de comentarios de Forgejo no acepta una clave de idempotencia, así que un corte entre el POST y la marca en la base podría publicar dos veces el mismo comentario. La solución es la de <a href="' + IA3 + '#ae-clave-pago">IA03</a> con una vuelta: la clave viaja escondida dentro del comentario, en un comentario HTML, y antes de publicar se busca.</p>\n')
add(figure(compare('fi04x', 'Publicar con y sin la marca', 'A la izquierda, sin marca: se publica, el proceso se corta antes de marcar la fila, y la siguiente corrida publica el mismo comentario otra vez. A la derecha, con la marca: la siguiente corrida busca la marca en los comentarios del PR, la encuentra y solo marca la fila.',
    ['Marca la fila como publicando.', 'POST del comentario: la forja lo guarda.', 'El proceso se corta antes de marcar.', 'La siguiente corrida ve la fila igual.', 'POST otra vez: dos comentarios iguales.'],
    ['Marca la fila como publicando.', 'Busca <!-- revisor:clave --> en el PR.', 'No está: POST del comentario con la marca.', 'Se corta; la siguiente corrida busca.', 'La encuentra: marca publicado, sin POST.'],
    lt='Sin marca', rt='Con la marca escondida', bad_left=True),
    '<b>Figura IA04.13.</b> El estado <code>publicando</code> no evita el duplicado por sí solo: dice que hay que mirar antes de volver a publicar. Lo que se mira es la marca.'))
add(Walk('python', 'revisor/cola.py', 'La cola vista desde la persona: listar, ver, decidir y lo que necesita la publicación.',
         '<code>cli.py</code> y <code>publicar.py</code>.', 'Un estado, un id, una decisión con quién la tomó.', 'Filas de la tabla como objetos <code>Fila</code>, o el estado nuevo.', 'persona cola',
         ['Conecta con el rol <code>revisor_persona</code>.', 'Lista y muestra filas.', 'Decide solo sobre filas pendientes.', 'Entrega las aprobadas y las que quedaron a medias, y las marca.'])
    .from_file(rd('revisor/cola.py'), [
        ('"""La cola vista', [('COLUMNAS = ', 'Las mismas columnas en el mismo orden en todas las consultas, para armar cada <code>Fila</code> con <code>Fila(*r)</code>.'),
                              ('@dataclass', 'Una clase de datos (<a href="' + IA0 + '#py-tipos">IA00</a>): los campos con su tipo y un constructor que los recibe en orden.')]),
        ('class Cola:', [('self.conn = psycopg.connect(dsn, autocommit=True)', 'El DSN por defecto es el de <code>revisor_persona</code>. Esta conexión no puede insertar comentarios.'),
                         ('" WHERE id = %s AND estado = \'pendiente\' RETURNING estado"', 'Solo una fila pendiente cambia. Aprobar dos veces, o aprobar una que ya se rechazó, no hace nada y devuelve <code>None</code>.')]),
        ('    def por_publicar(', [('" WHERE estado IN (\'aprobado\', \'publicando\') ORDER BY id"', 'Las que quedaron en <code>publicando</code> también: una corrida que se cortó las dejó así.'),
                                 ('forja_id = coalesce(%s, forja_id)', 'Marcar <code>publicando</code> no borra un <code>forja_id</code> que ya estaba.')]),
    ]).html())
add(Walk('python', 'revisor/publicar.py', 'Publica cada comentario aprobado en la forja, con su marca, sin repetir uno que ya está.',
         '<code>cli.py</code>, en <code>revisor publicar</code>.', 'La cola y la forja con el token de comentar.', 'Una lista de (fila, id del comentario en la forja, si ya estaba).', 'persona forja cola',
         ['Arma la marca con la clave y el cuerpo del comentario con su atribución.', 'Arma un cliente de la forja que solo busca y comenta, y se niega a arrancar sin su token.', 'Por cada fila: marca <code>publicando</code>, busca la marca, comenta si no está y marca <code>publicado</code>.'])
    .from_file(rd('revisor/publicar.py'), [
        ('"""Publicar los comentarios', [('def marca(', 'Un comentario HTML: la forja lo guarda en el texto pero no lo muestra en la página.'),
                                        ('return f"**{etiqueta}**', 'El comentario dice que lo propuso una máquina y lo aprobó una persona. Quien lo lea sabe de dónde viene.')]),
        ('class ForjaEscritura:', [('if not token:', 'Sin el token de <code>.env.publicar</code>, no arranca. El host, que corre con <code>.env</code>, no lo tiene.'),
                                   ('def buscar(', 'Lee los comentarios del PR y busca la marca. Con el token de <code>write:issue</code> también se puede leer el PR, y el repositorio es público.'),
                                   ('def comentar(', 'El POST. Es lo único de todo el revisor que escribe en la forja.')]),
        ('def publicar_aprobados(', [('cola.marcar(f.id, "publicando")', 'Primero se anota que se va a publicar. Si el proceso se corta después, la fila dice que hay que mirar.'),
                                     ('existente = forja.buscar(', 'Se mira antes de publicar. Si la marca está, se usa ese comentario y no se crea otro.'),
                                     ('if os.environ.get("REVISOR_CORTAR_DESPUES_DE_PUBLICAR"):', 'La falla provocada de <a href="#comprueba-fallas">Cómo comprobar</a>: corta el proceso con el comentario ya en la forja y la fila en <code>publicando</code>.'),
                                     ('cola.marcar(f.id, "publicado", forja_id)', 'La fila queda con el id del comentario. Ya no vuelve a salir en <code>por_publicar</code>.')]),
    ]).html())
add(callout('tradeoff', 'Buscar antes de publicar no es atómico', '<p>Entre buscar la marca y publicar pasa tiempo. Si dos procesos de publicar corren a la vez sobre la misma fila, los dos pueden no encontrar la marca y publicar los dos. Aquí hay una sola persona que corre <code>revisor publicar</code>; si hubiera varias, se toma la fila con <code>SELECT … FOR UPDATE SKIP LOCKED</code> antes de buscar (<a href="' + M05 + '">M05</a>).</p>'))
add(predict('ia04-p-cola'))
add(try_('uv run pytest tests/test_publicar.py tests/test_base.py -q',
         '<code>9 passed</code>. Las cinco de <code>test_publicar.py</code> usan una cola y una forja falsas: publicar una vez, cortar después del POST y volver sin duplicar, y no publicar lo pendiente, lo rechazado ni lo publicado. Las cuatro de <code>test_base.py</code> usan el PostgreSQL del compose y prueban con cada rol lo que no puede hacer. Si la base no está levantada, esas cuatro salen como <code>skipped</code>.'))

# ---------------- paso 11
add(step('paso-cli', 'Paso 11. La línea de comandos',
    step_map('host persona mcp cola forja', 'Un subcomando y sus argumentos.', 'Un token, una revisión con su costo, la cola, una decisión o una publicación.', 'Lo que cambie cada subcomando.', 'Ninguno', '30 min'), ''))
add('<p>Siete subcomandos en un solo programa, pero con tres archivos de entorno según quién lo corre. El host corre <code>revisar</code> con <code>.env</code>. La persona corre <code>cola</code>, <code>ver</code>, <code>aprobar</code> y <code>rechazar</code> con cualquiera, porque su rol de la base está en la configuración, y <code>publicar</code> con <code>.env.publicar</code>. Cada subcomando importa solo lo que usa: <code>revisor cola</code> no carga LangChain.</p>\n')
add(Walk('python', 'revisor/cli.py', 'La línea de comandos: <code>token</code>, <code>revisar</code>, <code>cola</code>, <code>ver</code>, <code>aprobar</code>, <code>rechazar</code> y <code>publicar</code>.',
         'Tú, con <code>uv run --env-file … revisor …</code>.', 'Los argumentos y el entorno.', 'Texto en la terminal, o una salida con error.', 'host persona',
         ['<code>token</code> pide un token para el host o para Claude Code.', '<code>revisar</code> pide un token, abre la sesión MCP, corre el grafo e imprime el resumen, los pasos, los tokens y el costo.', '<code>cola</code>, <code>ver</code>, <code>aprobar</code> y <code>rechazar</code> usan la cola de la persona.', '<code>publicar</code> publica las aprobadas.', '<code>main</code> arma los subcomandos con argparse.'])
    .from_file(rd('revisor/cli.py'), [
        ('"""La línea de comandos', [('CLIENTES = ', 'Los dos clientes del servidor de autorización y en qué campo de la configuración está cada secreto.'),
                                     ('def cmd_token(', 'Imprime solo el <code>access_token</code>, para pegarlo en otro comando. Es una credencial: no lo dejes en el historial de un chat.')]),
        ('async def _revisar(', [('token = pedir_token("revisor-host"', 'Un token nuevo por revisión. Dura cinco minutos; una revisión, segundos.'),
                                 ('async with puente.conectar(token) as cliente:', 'La sesión MCP vive mientras corre el grafo y se cierra al terminar.'),
                                 ('{"recursion_limit": 4 * CFG.max_pasos + 10}', 'LangGraph corta un grafo que da demasiadas vueltas. Cada paso del modelo son dos nodos; el límite queda holgado sobre el tope propio de diez pasos, que es el que tiene que cortar.'),
                                 ('if fin["propuestos"]:', 'Si hubo comentarios, recuerda que nadie los publicó todavía.')]),
        ('def cmd_revisar(', [('asyncio.run(', 'El único subcomando asíncrono: el cliente MCP y el grafo son <code>async</code>.'),
                              ('def cmd_cola(', 'Una línea por fila: número, PR, estado, gravedad, dónde y el comienzo del texto.'),
                              ('def cmd_ver(', 'El texto entero y quién lo propuso. Léelo así antes de aprobar: la línea de <code>cola</code> corta en 60 caracteres.')]),
        ('def cmd_decidir(', [('estado = Cola().decidir(', 'Con <code>--quien</code>: la fila guarda quién decidió y cuándo.'),
                              ('def cmd_publicar(', 'Dice si cada comentario se publicó ahora o ya estaba.')]),
        ('def main():', [('sub = p.add_subparsers(required=True)', 'Sin subcomando, argparse muestra el uso y sale con error.'),
                         ('s.set_defaults(f=cmd_token)', 'Cada subcomando guarda su función en <code>a.f</code>; al final se llama la que tocó.')]),
        ('    for nombre, aprobar in', [('s.set_defaults(f=lambda a, aprobar=aprobar: cmd_decidir(a, aprobar))', '<code>aprobar=aprobar</code> fija el valor de cada vuelta. Sin eso, las dos lambdas verían el último, y <code>aprobar</code> rechazaría.'),
                                      ('a.f(a)', 'Llama a la función del subcomando con sus argumentos.')]),
    ]).html())
add(pydef('Una <code>lambda</code> es una función de una línea sin nombre. Lee las variables de afuera cuando se llama, no cuando se crea; por eso, dentro de un <code>for</code>, se pasa el valor como argumento por defecto (<code>aprobar=aprobar</code>) para que cada una guarde el suyo.', 'Python de por medio: lambda en un bucle'))
add('<p>Revisa el PR 2 con el servidor MCP corriendo en otra terminal:</p>\n')
add(predict('ia04-p-cli'))
add(try_('uv run --env-file .env revisor revisar 2\nuv run --env-file .env revisor cola',
         'La primera imprime el resumen del modelo, una línea <code>pasos …, comentarios propuestos …, tokens … de entrada y … de salida, … USD</code> y <code>Esperan a una persona: revisor cola</code>. Anota tus números. La segunda lista al menos una fila <code>pendiente</code> con <code>bloquea</code> sobre <code>tienda/precios.py</code>. Si no aparece ninguna, el modelo no encontró el bug: córrelo otra vez y mira la línea del resumen; en <a href="#comprueba-evals">los evals</a> eso se mide con k corridas.'))
add('<p>Ahora haz de persona. Lee el comentario entero, apruébalo y publícalo con el token de comentar:</p>\n')
add(code('bash', 'uv run --env-file .env revisor ver 1\nuv run --env-file .env revisor aprobar 1 --quien ana --nota "el caso de 98 y 10 unidades"\nuv run --env-file .env.publicar revisor publicar'))
add('<p>La última línea imprime <code>#1 publicado como comentario N</code>, con el id que le dio la forja. Abre <code>http://localhost:3004/tienda/tienda-norte/pulls/2</code>: el comentario aparece con su atribución y sin la marca, que es un comentario HTML. El autor es <code>revisor-bot</code>, el dueño del token de comentar.</p>\n')
add(comparar('Revisa el PR 2 con <code>REVISOR_MODELO=claude</code> y con <code>REVISOR_MODELO=ollama</code>, tres veces cada uno, vaciando la cola entre corridas con <code>revisor rechazar</code>. Anota de cada corrida si propuso un comentario que bloquea sobre <code>precios.py</code>, los pasos, los tokens de entrada y de salida, los segundos y el costo. El costo de Ollama es cero en la factura y no en la máquina: mira cuánto tarda.'))
add(errs([
    ('#1 no está pendiente: revisor ver 1', 'La fila ya se decidió. <code>revisor ver 1</code> te dice su estado.'),
    ('Falta REVISOR_FORJA_TOKEN_PUBLICAR: arranca con uv run --env-file .env.publicar.', 'Corriste <code>publicar</code> con <code>.env</code>. Es a propósito: el archivo del host no tiene ese token.'),
    ('psycopg.errors.InsufficientPrivilege: permission denied for table comentarios', 'Una consulta llegó con el rol equivocado. Revisa que <code>REVISOR_DB_PERSONA</code> no apunte a <code>revisor_mcp</code>.'),
]))
add(done(['Un host que pide un token de cinco minutos y revisa un PR por MCP, sin ningún token de la forja.', 'Un grafo con dos topes y pruebas sin modelo.', 'Una cola que solo una persona decide, y una publicación que no repite aunque se corte.'],
         'uv run --env-file .env revisor cola --estado publicado',
         'Una línea con <code>#1 PR 2 publicado bloquea tienda/precios.py:…</code> y el comienzo del texto.'))

# ------------------------------------------------------------------ viaje
add('<h2 id="viaje">El viaje de un dato</h2>\n')
add('<p>El caso principal de punta a punta: la revisión del PR 2, desde el token hasta el comentario en la forja. Las dos mitades no tienen por qué pasar seguidas; entre la fila pendiente y la aprobación puede haber un día.</p>\n')
add(figure(seq('fi04j', 'La revisión del PR 2, completa', 'El host pide un token con resource. El servidor MCP baja la llave pública la primera vez. El host abre la sesión MCP y llama a leer_diff; el servidor verifica el token, lee el PR y el diff en la forja y devuelve el sobre. El host manda el diff al modelo, que pide leer_archivo de precios.py; el servidor lo lee en el commit del PR. El modelo propone un comentario; el servidor comprueba el scope, la ruta y el texto e inserta la fila pendiente. El modelo responde con un resumen. Después, la persona aprueba la fila y publica: marca publicando, busca la marca en el PR, publica el comentario y marca publicado.',
    [('ho', 'Host'), ('au', 'Autorización'), ('mo', 'Modelo'), ('mc', 'Servidor MCP'), ('fo', 'Forja'), ('co', 'Cola'), ('pe', 'Persona')],
    [('ho', 'au', 'POST /token, resource = /mcp', 'req'),
     ('au', 'ho', 'JWT de 300 s', 'res'),
     ('mc', 'au', 'GET /jwks, la primera vez', 'async'),
     ('ho', 'mc', 'initialize y tools/list, con Bearer', 'req'),
     ('ho', 'mc', 'tools/call leer_diff 2', 'req'),
     ('mc', 'fo', 'GET pulls/2 y pulls/2.diff', 'req'),
     ('mc', 'ho', '<resultado> con el diff', 'res'),
     ('ho', 'mo', 'sistema, diff y 5 herramientas', 'req'),
     ('mo', 'ho', 'leer_archivo precios.py', 'res'),
     ('ho', 'mc', 'tools/call leer_archivo', 'req'),
     ('mc', 'fo', 'GET raw/tienda/precios.py?ref=sha', 'req'),
     ('ho', 'mo', 'el archivo numerado', 'req'),
     ('mo', 'ho', 'proponer_comentario, bloquea', 'res'),
     ('ho', 'mc', 'tools/call proponer_comentario', 'req'),
     ('mc', 'co', 'INSERT … ON CONFLICT DO NOTHING', 'req'),
     ('mc', 'ho', 'En la cola como #1', 'res'),
     ('pe', 'co', 'UPDATE estado = aprobado', 'req'),
     ('pe', 'fo', 'GET comments: busca la marca', 'req'),
     ('pe', 'fo', 'POST comments con la marca', 'req'),
     ('pe', 'co', 'UPDATE estado = publicado, forja_id', 'req')]),
    '<b>Figura IA04.14.</b> El token de acceso solo cruza entre el host y el servidor MCP; el de leer, entre el servidor MCP y la forja; el de comentar, entre la persona y la forja. Ninguna flecha lleva dos.'))
add(table(['Paso', 'De → a', 'Qué viaja', 'Dónde queda'], [
    ['1', 'host → autorización', 'El id y el secreto en Basic, <code>grant_type</code> y <code>resource</code>', 'En ningún lado: el servidor no guarda pedidos'],
    ['2', 'autorización → host', 'Un JWT con <code>aud</code>, <code>scope</code> y <code>exp</code>', 'En la memoria del host, cinco minutos'],
    ['3', 'servidor MCP → autorización', 'Un GET sin credenciales', 'La llave pública, en la memoria del servidor'],
    ['4', 'host → servidor MCP', 'JSON-RPC con el Bearer', 'En ningún lado: la sesión vive mientras dura la revisión'],
    ['5', 'servidor MCP → forja', 'GETs con el token de leer', 'En ningún lado: el servidor no guarda lo que lee'],
    ['6', 'servidor MCP → host', 'El diff dentro de <code>&lt;resultado&gt;</code>', 'En el estado del grafo, en memoria'],
    ['7', 'host → modelo', 'El prompt, el diff, el archivo y las cinco herramientas', 'Con Claude, en Anthropic según su política de retención; con Ollama, en tu máquina'],
    ['8', 'servidor MCP → cola', 'PR, commit, ruta, línea, gravedad, texto y cliente', 'Una fila <code>pendiente</code> en <code>comentarios</code>'],
    ['9', 'persona → cola', 'La decisión, quién y una nota', 'La misma fila, <code>aprobado</code>'],
    ['10', 'persona → forja', 'El cuerpo con la marca, con el token de comentar', 'Un comentario en el PR 2; la fila, <code>publicado</code> con su <code>forja_id</code>'],
]))

# ------------------------------------------------------------------ decisiones
add('<h2 id="decisiones">Las decisiones, guiadas</h2>\n')
add('<p>Ocho decisiones de esta guía, cada una con las alternativas que tenían sentido. Respóndelas antes de mirar la explicación: la mayoría tiene una opción que funciona en la demo y falla con el primer PR envenenado.</p>\n')
add('<div data-exercise="ia04-revisor"></div>\n')
