# IA03, parte 2: hitos 1 y 2 (pasos 1 a 6).
def comparar(t):
    return callout('tradeoff', 'Claude y Ollama', f'<p>{t}</p>')


add('<h2 id="paso-a-paso">Paso a paso</h2>\n')
add('<p>Once pasos en tres hitos. Al final de cada hito hay algo que funciona y un comando que lo demuestra. Los archivos van en el orden en que los necesitas: ninguno importa algo que todavía no escribiste.</p>\n')

# ================================================================== hito 1
add(hito(1, 3, 60, 'La tienda, el proyecto y la identidad', 'Levantas la base con la semilla, configuras los dos modelos y compruebas que cada cliente ve solo lo suyo.', [
    ('paso-config', 'La configuración y los modelos'), ('paso-semilla', 'Una tienda con un caso por regla'), ('paso-identidad', 'El cliente de la sesión, hasta la base')]))

# ---------------- paso 1
add(step('paso-config', 'Paso 1. La configuración y los modelos',
    step_map('modelo', 'Variables de entorno, o ninguna.', 'Un objeto <code>CFG</code> y dos funciones que devuelven un modelo de chat y los embeddings.', 'Nada fuera del proyecto.', '<a href="' + IA0 + '#ae-uv">uv</a> y <a href="' + IA0 + '#ae-clave">la clave</a>, de IA00', '15 min'), ''))
add(whole('python', 'soporte/__init__.py', rd('soporte/__init__.py'), 'Marca la carpeta como paquete de Python.', 'Python, al importar <code>soporte.algo</code>.', 'Nada.', 'Nada.', 'api'))
add(Walk('python', 'soporte/config.py', 'Lee la configuración de variables de entorno, con valores por defecto que apuntan al compose de la guía.',
         'Todos los demás archivos.', 'Variables <code>SOPORTE_*</code>, si las defines.', 'Un objeto <code>CFG</code> inmutable.', 'api tienda soporte pagos',
         ['Arma las cuatro URL de PostgreSQL, una por rol.', 'Lee el modelo, el proveedor de pagos, Ollama y Phoenix.', 'Lee los números de la política y del grafo: umbral, plazo, confianza mínima y tope de pasos.'])
    .from_file(rd('soporte/config.py'), [
        ('"""La configuración', [('BASE = ', 'Una plantilla para las cuatro URL: mismo servidor y puerto, distinto rol y base.'),
                                 ('db_lector:', 'Una URL por rol. El código elige el rol según lo que va a hacer, nunca el modelo.')]),
        ('    pagos: str', [('umbral_usd: Decimal', '<code>Decimal</code> desde un texto: <code>Decimal("50.00")</code> es exacto; <code>Decimal(50.0)</code> también, pero <code>float</code> en general no lo es.'),
                           ('confianza_minima', 'Por debajo de 0.8, el mensaje va al agente aunque parezca simple.'),
                           ('max_pasos', 'El tope de vueltas del agente por mensaje: a las 8, pasa a una persona.')]),
    ]).html())
add(pydef('<code>@dataclass(frozen=True)</code> arma una clase con esos campos y sus valores por defecto, y <code>frozen</code> impide cambiarlos después: <code>CFG.umbral_usd = 0</code> da error. Los valores se leen una sola vez, al importar el módulo. Ver <a href="' + IA0 + '#py-decoradores">decoradores en IA00</a>.', 'Python de por medio: una dataclass congelada'))
add(Walk('python', 'soporte/modelos.py', 'Devuelve el modelo de chat elegido, los embeddings locales y el costo de una cantidad de tokens.',
         '<code>tickets.py</code>, <code>herramientas.py</code>, <code>indexar.py</code> y los evals.', 'El nombre del proveedor: <code>claude</code> u <code>ollama</code>.', 'Un modelo de LangChain, un objeto de embeddings o un <code>Decimal</code> en USD.', 'modelo',
         ['Guarda el precio por millón de tokens de cada proveedor.', 'Arma Claude Sonnet 5.5 o qwen3:8b con la misma interfaz.', 'Arma los embeddings con <code>nomic-embed-text</code>, siempre en Ollama.', 'Calcula el costo de un turno.'])
    .from_file(rd('soporte/modelos.py'), [
        ('"""Los dos modelos', [('PRECIOS = ', 'USD por millón de tokens de entrada y de salida. Son los de Sonnet 5.5 al escribir la guía <span class="badge badge--doc">Documentado</span>; revísalos antes de confiar en el costo.'),
                                ('return init_chat_model("claude-sonnet-5-5"', 'Sin <code>temperature</code>: Sonnet 5.5 rechaza valores distintos de los de fábrica. <code>max_retries=2</code> reintenta los 429 y 529 de la API.'),
                                ('num_ctx=16384', 'Ollama corta el contexto en 2048 tokens si no se lo pides, y el prompt con las herramientas, la política y la conversación no cabe.')]),
        ('def embeddings():', [('return OllamaEmbeddings', 'Los embeddings son siempre locales: si indexas con uno y buscas con otro, los vectores no se pueden comparar.')]),
    ]).html())
add(predict('ia03-p-config'))
add(try_('uv run python -c "from soporte.config import CFG; print(CFG.umbral_usd, CFG.max_pasos)"\nuv run python -c "from soporte.modelos import costo; print(costo(\'claude\', 10000, 500))"',
         'La primera línea imprime <code>50.00 8</code>. La segunda, el costo de 10 000 tokens de entrada y 500 de salida con los precios del archivo: 10 000 × 2 / 1 000 000 + 500 × 10 / 1 000 000 = <code>0.025</code>.'))
add(comparar('Aquí todavía no hay nada que comparar: los dos modelos se arman igual. La diferencia que importa ya está en el código: Claude cobra por token y viaja a Anthropic; qwen3:8b es gratis por token, corre en tu máquina y necesita que le pidas el contexto.'))

# ---------------- paso 2
add(step('paso-semilla', 'Paso 2. Una tienda con un caso por regla',
    step_map('tienda', '<code>semilla.py</code>, una caja negra.', 'Cinco clientes, doce pedidos y un reembolso viejo en la base <code>tienda</code>.', 'La base <code>tienda</code>; se puede correr de nuevo.', 'Ninguno', '10 min'), ''))
add('<p>La semilla carga una tienda chica en la que cada regla de la política tiene su pedido. Las fechas son relativas al momento en que la corres: un pedido "entregado hace 31 días" está fuera de plazo el día que la cargues, sea cual sea. No hace falta entenderla para seguir; su recorrido está en el <a href="#anexo-semilla">anexo</a>. Lo que importa es qué deja:</p>\n')
add(table(['Pedido', 'Cliente', 'Estado', 'Entregado hace', 'Total', 'Para qué está'], [
    ['1001', 'Ana (1)', 'entregado', '15 días', '24.50', 'Un pedido común de Ana'],
    ['1002', 'Ana (1)', 'entregado', '3 días', '12.50', 'Un reembolso chico: sale solo'],
    ['1043', 'Ana (1)', 'entregado', '10 días', '80.00', 'Un reembolso grande: lo aprueba una persona'],
    ['1011', 'Bruno (2)', 'enviado', 'en camino', '45.00', 'El estado de un pedido; no se reembolsa todavía'],
    ['1012', 'Bruno (2)', 'pagado', 'sin salir', '30.00', 'Cambiar la dirección'],
    ['1013', 'Bruno (2)', 'entregado', '20 días', '49.99', 'Un pedido común de Bruno'],
    ['1021', 'Carla (3)', 'entregado', '45 días', '38.00', 'Fuera de plazo'],
    ['1022', 'Carla (3)', 'entregado', '12 días', '30.00', 'Ya reembolsado entero, por fuera del agente'],
    ['1031', 'Diego (4)', 'entregado', '7 días', '35.00', 'El pedido que otro cliente intenta pedir'],
    ['1051', 'Elena (5)', 'entregado', '5 días', '50.00', 'Justo en el umbral: sale solo'],
    ['1052', 'Elena (5)', 'entregado', '5 días', '120.00', 'Un producto de 50.01: pide una persona'],
    ['1053', 'Elena (5)', 'entregado', '31 días', '20.00', 'Un día fuera de plazo'],
], right=(4,)))
add(figure(flow('fi03s', 'La semilla, como caja negra', 'semilla.py entra a la tienda con el rol dueño, borra lo que haya y carga clientes, pedidos con sus líneas y un reembolso viejo, con fechas relativas a hoy.', [
    ('semilla.py', 'con el rol tienda'), ('TRUNCATE', 'borra todo'), ('INSERT', 'clientes, pedidos y líneas'), ('reembolsos', 're_semilla_1022')]),
    '<b>Figura IA03.8.</b> Entra con el dueño de las tablas, que la RLS no filtra: es el único momento en que algo ve los pedidos de todos.'))
add(predict('ia03-p-semilla'))
add(try_('uv run python semilla.py\ndocker compose exec postgres psql -U tienda -d tienda -c "SELECT id, cliente_id, estado, total_usd FROM pedidos ORDER BY id"',
         'La primera línea imprime <code>5 clientes, 12 pedidos y 1 reembolso viejo</code>. La consulta, como dueño, lista los doce pedidos de la tabla de arriba.'))
add(errs([
    ('psycopg.OperationalError: connection failed: … port 55435 … Connection refused', 'PostgreSQL no está arriba. <code>docker compose up -d postgres</code> y espera a que <code>docker compose ps</code> diga <code>healthy</code>.'),
    ('psycopg.errors.UndefinedTable: relation "reembolsos" does not exist', 'El volumen existía antes de <code>init.sql</code>. <code>docker compose down -v</code> y levántalo de nuevo.'),
]))

# ---------------- paso 3
add(step('paso-identidad', 'Paso 3. El cliente de la sesión, hasta la base',
    step_map('tienda', 'Un id de cliente, entero y positivo.', 'Una conexión con <code>app.cliente_id</code> puesto, dentro de una transacción.', 'Nada: solo abre conexiones.', '<a href="#ae-sesion">El cliente sale de la sesión</a>', '20 min'), ''))
add(Walk('python', 'soporte/identidad.py', 'Abre una conexión a la tienda con el rol pedido y le dice a PostgreSQL quién es el cliente, solo por esa transacción.',
         '<code>herramientas.py</code> (lector) y <code>acciones.py</code> (actor).', 'El id del cliente que viene del estado del grafo.', 'Una conexión que la RLS filtra por ese cliente.', 'tienda',
         ['Guarda un pool de conexiones por URL.', 'Rechaza un id que no sea un entero positivo.', 'Abre una transacción y pone <code>app.cliente_id</code> con <code>set_config(…, true)</code>.', 'Ofrece dos puertas: <code>lector</code> y <code>actor</code>.'])
    .from_file(rd('soporte/identidad.py'), [
        ('"""Quién es el cliente', [('_pools: dict', 'Un pool por URL, creado la primera vez que se pide. <code>max_size=2</code>: hasta dos conexiones por proceso, que es el <code>CONNECTION LIMIT</code> del actor en la base.'),
                                    ('kwargs={"row_factory": dict_row}', 'Cada fila vuelve como diccionario: <code>p["estado"]</code> en vez de <code>p[3]</code>.')]),
        ('@contextmanager', [('if not isinstance(cliente_id, int)', 'Sin cliente no hay consulta. Un <code>0</code>, un <code>None</code> o un texto que se coló terminan aquí, antes de tocar la base.'),
                             ('with _pool(url).connection() as c, c.transaction():', 'Toma una conexión del pool y abre una transacción que se confirma al salir del <code>with</code>, o se deshace si hubo una excepción.'),
                             ('c.execute("SELECT set_config', 'El tercer argumento, <code>true</code>, es lo mismo que <code>SET LOCAL</code>: la variable muere con la transacción y la conexión vuelve limpia al pool.'),
                             ('def lector(', 'Dos puertas con nombre. Quien lee no puede pedir por error la conexión que escribe.')]),
    ]).html())
add(pydef('<code>@contextmanager</code> convierte una función con <code>yield</code> en algo que se usa con <code>with</code>: lo de antes del <code>yield</code> corre al entrar, lo que entrega el <code>yield</code> es la variable del <code>as</code>, y lo de después corre al salir, aunque haya una excepción. Ver <a href="' + IA0 + '#py-with">with en IA00</a> y <a href="' + IA0 + '#py-yield">yield</a>.', 'Python de por medio: with y yield'))
add(figure(flow('fi03i', 'Una consulta con la sesión de Ana', 'El estado del grafo dice cliente 1. identidad.lector abre una transacción como soporte_lector, pone app.cliente_id en 1 y la consulta de pedidos vuelve solo con los de Ana. Al cerrar la transacción, la variable desaparece.', [
    ('Estado', 'cliente_id = 1'), ('lector(1)', 'soporte_lector'), ('set_config', "app.cliente_id = '1'"), ('SELECT', 'solo 1001, 1002, 1043')]),
    '<b>Figura IA03.9.</b> El modelo no aparece en la figura: no hay ningún punto donde pueda cambiar el 1.'))
add(predict('ia03-p-identidad'))
add(try_('uv run python -c "\nfrom soporte import identidad\nwith identidad.lector(1) as c:\n    print([r[\'id\'] for r in c.execute(\'SELECT id FROM pedidos ORDER BY id\')])\nwith identidad.lector(4) as c:\n    print([r[\'id\'] for r in c.execute(\'SELECT id FROM pedidos ORDER BY id\')])\n"',
         'Tiene que imprimir <code>[1001, 1002, 1043]</code> y después <code>[1031]</code>. La misma consulta, sin <code>WHERE</code>, con dos sesiones distintas.'))
add(errs([
    ('psycopg.errors.InsufficientPrivilege: permission denied for table pedidos', 'Falta el <code>GRANT SELECT</code> de <code>init.sql</code>, o el volumen es de antes. Revisa el archivo y recrea el volumen.'),
    ('PermissionError: Sin cliente de sesión no se consulta nada', 'Es lo esperado si pasaste <code>0</code> o un texto. El id tiene que ser un <code>int</code> positivo.'),
]))
add(done(['La base <code>tienda</code> con doce pedidos que cubren cada regla.', 'La configuración y los dos modelos detrás de la misma interfaz.', 'Cada cliente ve solo sus pedidos, sin un <code>WHERE</code> en el código.'],
         'uv run python -c "\nfrom soporte import identidad\nwith identidad.lector(1) as c:\n    print(c.execute(\'SELECT * FROM pedidos WHERE id = 1031\').fetchone())\n"',
         'Imprime <code>None</code>: el 1031 existe, pero para la sesión de Ana no.'))

# ================================================================== hito 2
add(hito(2, 3, 90, 'Lo que decide y lo que actúa', 'Escribes la política como una función pura, las herramientas de lectura con la búsqueda en las políticas, y las acciones con su reserva, su candado y su clave.', [
    ('paso-politica', 'La política, en código'), ('paso-herramientas', 'Leer pedidos y políticas'), ('paso-acciones', 'Reservar, aprobar y pagar con una clave')]))

# ---------------- paso 4
add(step('paso-politica', 'Paso 4. La política, en código',
    step_map('grafo', 'Un pedido (o <code>None</code>), lo ya reembolsado, el monto y la fecha.', 'Una <code>Decision</code>: <code>automatico</code>, <code>aprobar</code> o <code>rechazar</code>, con su motivo.', 'Nada: no lee la base ni el reloj.', '<a href="#ae-politica">El modelo propone, la política decide</a>', '20 min'), ''))
add('<p>La política es la regla del dinero, y por eso es la pieza más simple del sistema: una función que recibe números y devuelve una decisión. No lee la base, no llama al modelo y no sabe qué hora es; quien la llama le pasa todo. Así se prueba con una tabla de casos, sin levantar nada.</p>\n')
add(figure(flow('fi03d', 'Las seis reglas, en orden', 'La primera regla que falla rechaza. Si el pedido no existe, no se entregó, pasaron más de 30 días, el monto no tiene centavos exactos o es cero, o supera lo que queda, se rechaza. Si pasa todo, hasta 50.00 USD es automático y desde 50.01 lo aprueba una persona.', [
    ('¿Existe?', 'si no: rechazar'), ('¿Entregado?', 'si no: rechazar'), ('¿30 días?', 'si pasó: rechazar'),
    ('¿Centavos?', 'si no: rechazar'), ('¿Queda saldo?', 'si no: rechazar'), ('¿Hasta 50.00?', 'sí: automático; no: persona')]),
    '<b>Figura IA03.10.</b> El orden importa: un pedido ajeno se rechaza en la primera regla, sin contar si existe o cuánto vale.'))
add(Walk('python', 'soporte/politica.py', 'Decide qué pasa con un reembolso propuesto: rechazarlo, hacerlo solo o pedir una persona.',
         '<code>acciones.reservar</code> y las pruebas.', 'El pedido leído con la RLS, lo ya reembolsado y reservado, el monto y la fecha de hoy.', 'Una <code>Decision</code> con resultado y motivo.', 'grafo',
         ['Define el centavo y la forma de la decisión.', 'Rechaza si no hay pedido, si no se entregó o si venció el plazo.', 'Rechaza un monto sin centavos exactos, cero o mayor que lo que queda.', 'Hasta el umbral, automático; por encima, una persona.'])
    .from_file(rd('soporte/politica.py'), [
        ('"""La política de reembolsos', [('CENTAVO = ', 'La unidad mínima. Un monto como 12.345 no es dinero válido.'),
                                          ('class Decision:', 'Un resultado de tres posibles y un motivo en texto, que el agente le explica al cliente.')]),
        ('def evaluar(', [('if pedido is None:', 'El mismo mensaje si no existe o si es de otra persona: la RLS no lo dejó ver, y no se lo contamos a quien pregunta.'),
                          ('pasaron = ', 'Días entre la entrega y hoy. El día 30 todavía vale; el 31, no.'),
                          ('if monto != monto.quantize(CENTAVO)', '<code>quantize</code> redondea a centavos: si cambia algo, tenía medio centavo.'),
                          ('queda = ', 'Lo que queda por devolver: el total menos lo reembolsado antes y lo reservado por otros tickets.'),
                          ('if monto <= umbral:', 'El umbral es inclusivo: 50.00 sale solo, 50.01 no.')]),
    ]).html())
add(pydef('<code>Decimal</code> guarda los números en base 10, como en un papel: <code>Decimal("0.1") + Decimal("0.2") == Decimal("0.3")</code> es <code>True</code>, y con <code>float</code> es <code>False</code>. Con dinero, siempre <code>Decimal</code> construido desde un texto.', 'Python de por medio: Decimal, no float'))
add(predict('ia03-p-politica'))
add(try_('uv run python -c "\nfrom datetime import date, datetime, timezone\nfrom decimal import Decimal as D\nfrom soporte.politica import evaluar\np = {\'id\': 1043, \'estado\': \'entregado\', \'entregado_en\': datetime(2026, 3, 1, tzinfo=timezone.utc), \'total_usd\': D(\'80.00\')}\nprint(evaluar(p, D(\'0\'), D(\'80.00\'), date(2026, 3, 10)))\nprint(evaluar(p, D(\'30.00\'), D(\'50.01\'), date(2026, 3, 10)))\n"',
         'La primera línea, <code>Decision(resultado=\'aprobar\', …)</code>: 80.00 entra en el pedido pero supera el umbral. La segunda, <code>rechazar</code> con <code>quedan 50.00 USD</code>: 30 ya se devolvieron.'))

# ---------------- paso 5
add(step('paso-herramientas', 'Paso 5. Leer pedidos y políticas',
    step_map('tienda soporte modelo', 'El nombre de una herramienta, sus argumentos y el cliente de la sesión.', 'Un texto JSON para el modelo.', 'La tabla <code>politicas</code>, al indexar.', '<a href="#ae-sesion">El cliente sale de la sesión</a>', '30 min'), ''))
add('<p>El agente tiene tres herramientas de lectura. Dos leen la tienda con la RLS de la sesión; la tercera busca en las políticas escritas de la tienda, por similitud, como en el RAG de <a href="' + IA1 + '#ae-rag">IA01</a>. Primero las políticas, tres archivos Markdown con una sección por <code>##</code>:</p>\n')
for f, q in (('politicas/reembolsos.md', 'El plazo, cuánto se devuelve, quién aprueba y cuándo llega el dinero.'),
             ('politicas/envios.md', 'Los estados de un pedido, cuándo se puede cambiar la dirección y el envío perdido.'),
             ('politicas/cambios.md', 'Cambiar un producto y lo que no se cambia.')):
    add(whole('text', f, rd(f), q, '<code>indexar.py</code>, que las parte y las guarda.', 'Nada.', 'Texto que el agente cita.', 'soporte'))
add('<p>El texto de <code>reembolsos.md</code> dice lo mismo que <code>politica.py</code>, con palabras. El agente lo lee para explicarle al cliente; el código lo aplica. Si un día cambias el umbral, cambias los dos.</p>\n')
add(Walk('python', 'soporte/indexar.py', 'Parte cada política por sección, calcula su embedding y la guarda en la base <code>soporte</code>.',
         'Tú, con <code>uv run soporte-indexar</code>, cada vez que cambies una política.', 'Los archivos de <code>politicas/</code>.', 'Una fila por sección en <code>politicas</code>.', 'soporte modelo',
         ['Parte el texto en trozos, uno por cada <code>##</code>.', 'Calcula el embedding de cada trozo con el prefijo de documento.', 'Borra las filas viejas y escribe las nuevas en una transacción.'])
    .from_file(rd('soporte/indexar.py'), [
        ('"""Parte las políticas', []),
        ('def trozos(', [('def trozos(', 'Un trozo por sección: el título del <code>##</code> y el texto hasta el siguiente.'),
                                    ('elif titulo:', 'Lo que va antes del primer <code>##</code> (el título <code>#</code> del archivo) no entra.')]),
        ('def main()', [('vectores = embeddings().embed_documents', '<code>nomic-embed-text</code> pide un prefijo según la tarea: <code>search_document:</code> al guardar, <code>search_query:</code> al buscar.'),
                        ('c.execute("DELETE FROM politicas")', 'Borrar e insertar en la misma transacción: si algo falla, quedan las filas viejas.')]),
    ]).html())
add(Walk('python', 'soporte/herramientas.py', 'Define las tres herramientas de lectura y las corre con el cliente de la sesión.',
         'El nodo <code>herramientas</code> del grafo, los workflows y <code>acciones.reservar</code>.', 'Un nombre, los argumentos que mandó el modelo y el id de la sesión.', 'JSON en texto, o un mensaje de "no encuentro".', 'tienda soporte',
         ['Describe cada herramienta con una clase de Pydantic: es lo que ve el modelo.', 'Lista los pedidos del cliente, y lee uno con sus líneas y lo ya reembolsado.', 'Busca las tres secciones de política más cercanas a una pregunta.', 'Valida los argumentos y corre la herramienta pedida.'])
    .from_file(rd('soporte/herramientas.py'), [
        ('"""Las herramientas de lectura', []),
        ('class VerPedidos(BaseModel):', [('class VerPedidos(BaseModel):', 'El docstring de la clase es la descripción que lee el modelo. Sin campos: lista lo de la sesión.'),
                                            ('pedido_id: int = Field', 'El único argumento de <code>VerPedido</code>. No hay <code>cliente_id</code>: el modelo no tiene dónde escribir otro cliente.')]),
        ('def ver_pedidos(', [('with identidad.lector(cliente_id) as c:', 'El lector, con la sesión. La consulta no tiene <code>WHERE cliente_id</code>: lo pone la RLS.'),
                              ('if pedido is None:', 'Un pedido ajeno y uno que no existe se ven igual: <code>None</code>.'),
                              ('pedido["reembolsado_antes"]', 'Lo devuelto por fuera del agente. La política lo resta del total.')]),
        ('def buscar_politica(', [('vector = embeddings().embed_query', 'El prefijo de consulta, el par del de <code>indexar.py</code>.'),
                                  ('"ORDER BY embedding <=> %s::vector LIMIT 3"', '<code>&lt;=&gt;</code> es la distancia coseno de pgvector: las tres secciones más parecidas a la pregunta.')]),
        ('LECTURA = ', [('a = LECTURA[nombre].model_validate(args)', 'El modelo puede mandar argumentos inválidos, como <code>"pedido_id": "el del termo"</code>. Pydantic falla aquí, y el grafo le devuelve el error al modelo.'),
                        ('return json.dumps(r, ensure_ascii=False, default=str)', '<code>default=str</code> convierte lo que JSON no conoce, como <code>Decimal</code> y fechas, en texto: <code>"80.00"</code>.')]),
    ]).html())
add(pydef('Una clase que hereda de <code>BaseModel</code> hace dos trabajos aquí: <code>bind_tools</code> la convierte en el esquema JSON que lee el modelo, y <code>model_validate(args)</code> comprueba que lo que el modelo mandó tenga esa forma. Ver <a href="' + IA0 + '#py-pydantic">Pydantic en IA00</a>.', 'Python de por medio: una clase, dos usos'))
add(predict('ia03-p-herramientas'))
add(try_('uv run soporte-indexar\nuv run python -c "\nfrom soporte.herramientas import ejecutar\nprint(ejecutar(\'VerPedido\', {\'pedido_id\': 1031}, 1))\nprint(ejecutar(\'BuscarPolitica\', {\'pregunta\': \'quién aprueba un reembolso grande\'}, 1)[:120])\n"',
         'El índice imprime <code>9 secciones indexadas de 3 archivos</code>. Después, la sesión de Ana no ve el 1031 de Diego: <code>"No encuentro ese pedido entre los del cliente."</code>. La búsqueda tendría que traer primero la sección <code>Quién lo aprueba</code>; anota cuál sale primera.'))
add(errs([
    ('httpx.ConnectError: [Errno 111] Connection refused', 'Ollama no está corriendo. Ábrelo, o <code>ollama serve</code> en otra terminal.'),
    ('ollama._types.ResponseError: model "nomic-embed-text" not found', 'Falta el modelo de embeddings: <code>ollama pull nomic-embed-text</code>.'),
    ('psycopg.errors.DataException: expected 768 dimensions, not 1024', 'Indexaste con otro modelo de embeddings. Este archivo usa <code>nomic-embed-text</code>, de 768.'),
]))

# ---------------- paso 6
add(step('paso-acciones', 'Paso 6. Reservar, aprobar y pagar con una clave',
    step_map('soporte pagos tienda', 'Una propuesta de reembolso con su clave, o una dirección nueva.', 'Una fila en <code>acciones</code> y, si corresponde, un reembolso en el proveedor.', 'Las tablas <code>acciones</code> y <code>pedidos</code>, y el proveedor de pagos.', '<a href="#ae-clave-pago">La clave de idempotencia con un proveedor</a>', '40 min'), ''))
add('<p>Las dos acciones con efecto viven en este archivo, y las dos siguen la misma regla: primero se anota la fila con su clave, después se hace el efecto, y al final se anota el resultado. Si el proceso se cae entre medio, la fila dice qué se intentó.</p>\n')
add(figure(svg('fi03e', 770, 200, 'Los estados de una acción',
    'Una acción de reembolso nace esperando, si la política pidió una persona, o aprobada, si salió sola. Desde esperando, una persona la pasa a aprobada o a rechazada. Desde aprobada, el proveedor la deja hecha si respondió o pendiente si no se supo. Desde pendiente, un reintento con la misma clave la deja hecha.',
    '\n'.join([
        box(20, 30, 120, 48, 'esperando', None, 'queue'),
        box(260, 30, 120, 48, 'aprobada', None, 'service'),
        box(500, 30, 120, 48, 'hecha', None, 'db'),
        box(260, 128, 120, 48, 'rechazada', None, cls='dg-warnbox'),
        box(500, 128, 120, 48, 'pendiente', None, 'queue'),
        edge('fi03e', 'M140 54 L258 54', label='aprueba', lx=199, ly=46),
        edge('fi03e', 'M140 70 C200 70 200 152 258 152', label='rechaza', lx=150, ly=140, anchor='start'),
        edge('fi03e', 'M380 54 L498 54', label='201', lx=439, ly=46),
        edge('fi03e', 'M380 70 C440 70 440 152 498 152', label='sin respuesta', lx=452, ly=108, anchor='start'),
        edge('fi03e', 'M560 128 L560 80', label='reintento con la misma clave', lx=570, ly=108, anchor='start'),
        text(260, 20, 'la política la deja aprobada si salió sola', 'dg-tiny'),
    ])), '<b>Figura IA03.11.</b> Rechazada es la única que libera el monto. Pendiente no lo libera: no sabes si el proveedor pagó.'))
add(Walk('python', 'soporte/acciones.py', 'Reserva un reembolso según la política, registra la decisión de una persona, le paga al proveedor con la clave y cambia direcciones.',
         'El grafo, por medio de <code>servicios_reales()</code>, y la línea de comandos para reintentar.', 'Una clave, la propuesta del modelo validada y el cliente de la sesión.', 'Una <code>Decision</code>, el estado de la acción o la respuesta del proveedor.', 'soporte pagos tienda',
         ['Define la herramienta <code>ProponerReembolso</code> con su forma.', 'Reserva: lee el pedido con la RLS, toma un candado por pedido, suma lo reservado, evalúa la política y anota la fila.', 'Decide: una persona cambia una fila que espera, y solo esa.', 'Llama al proveedor con la misma clave en cada intento, con esperas crecientes.', 'Ejecuta: no repite lo hecho y deja pendiente lo que no se supo.', 'Cambia una dirección con su propia clave, y deja que la base decida si se puede.'])
    .from_file(rd('soporte/acciones.py'), [
        ('"""Las acciones con efecto', []),
        ('class ProponerReembolso(BaseModel):', [('class ProponerReembolso(BaseModel):', 'La herramienta se llama proponer: el docstring le dice al modelo que la política decide y que le va a contar qué pasó.'),
                                         ('monto_usd: str = Field(pattern=', 'El monto viaja como texto con dos decimales: <code>"12.50"</code>. Un <code>float</code> como 12.499999 no pasa.')]),
        ('def reservar(', [('pedido = herramientas.ver_pedido(cliente_id, p.pedido_id)', 'El pedido se lee de nuevo con la RLS de la sesión. Lo que el modelo crea del pedido no cuenta.'),
                           ('g.execute("SELECT pg_advisory_xact_lock', 'Un candado por número de pedido, hasta el final de la transacción. Dos tickets del mismo pedido se evalúan uno después del otro.'),
                           ('if previa is not None:', 'Si la clave ya existe, el nodo se repitió después de un reinicio: se devuelve la misma decisión sin anotar otra fila.'),
                           ('reservado = g.execute', 'Lo reservado por otras acciones del mismo pedido que no se rechazaron, incluidas las que esperan a una persona.'),
                           ('if d.resultado != "rechazar":', 'Solo se anota lo que no se rechazó: <code>aprobada</code> por la política, o <code>esperando</code> a una persona.')]),
        ('def decidir(', [('"WHERE clave = %s AND estado = \'esperando\'"', 'El <code>UPDATE</code> solo toca una fila que espera. Una segunda decisión no cambia la primera.'),
                          ('return g.execute("SELECT estado', 'Devuelve cómo quedó, no si cambió: el grafo sabe qué hacer aunque la fila la haya resuelto otro.')]),
        ('def llamar_proveedor(', [('r = httpx.post(', 'La misma <code>Idempotency-Key</code> en cada intento. Con <code>timeout=3.0</code>, un proveedor que tarda 6 s corta el intento.'),
                                   ('if r.status_code in (400, 422):', 'Un 400 o un 422 es un error del pedido: reintentarlo da lo mismo. Se lanza para que alguien lo vea.'),
                                   ('except httpx.TransportError:', 'Un timeout o una conexión cortada: no sabemos si se hizo, y por eso se reintenta con la misma clave.'),
                                   ('time.sleep(0.5 * 2 ** i)', 'Esperas de 0.5, 1, 2 y 4 s entre intentos, como en <a href="../modules/m08-resiliencia.html">M08</a>.')]),
        ('def ejecutar_reembolso(', [('if estado == "hecha":', 'Lo hecho no se vuelve a pagar: se devuelve el resultado guardado.'),
                                     ('if respuesta is None:', 'Sin respuesta clara, la fila queda <code>pendiente</code>. <code>soporte reintentar</code> la retoma con la misma clave.')]),
        ('def cambiar_direccion(', [('clave = f"direccion:', 'La clave lleva una huella de la dirección: pedir dos veces la misma dirección en el ticket no repite nada; pedir otra es otra acción.'),
                                    ('"ON CONFLICT (clave) DO NOTHING RETURNING clave"', 'Si la clave ya estaba, <code>RETURNING</code> no devuelve fila y se contesta con el resultado guardado.'),
                                    ('n = c.execute("UPDATE pedidos', 'El actor, con la sesión. La política <code>direccion</code> de la base vuelve a mirar dueño y estado: 0 filas si no se puede.')]),
    ]).html())
add(pydef('<code>{"esperando": "aprobar", "rechazada": "rechazar"}.get(previa[0], "automatico")</code> busca la clave en el diccionario y, si no está, devuelve el segundo argumento. Es un <code>if</code> de tres ramas en una línea.', 'Python de por medio: get con un valor por defecto'))
add(callout('tradeoff', 'Trade-off', '<p><b>Un candado por pedido o una restricción en la base.</b> <code>pg_advisory_xact_lock</code> pone en fila a los tickets del mismo pedido sin bloquear la tabla, y se suelta solo al terminar la transacción. La alternativa es una restricción que haga imposible pasarse del total, pero una suma sobre varias filas no se expresa con un <code>CHECK</code>; haría falta un trigger o una tabla de saldos con <code>SELECT … FOR UPDATE</code>, como en <a href="' + M39 + '#concurrencia">M39</a>. Para un soporte con decenas de reembolsos por día, el candado alcanza.</p>'))
add(predict('ia03-p-acciones'))
add(try_('uv run python -c "\nfrom soporte.acciones import llamar_proveedor\nc = {\'pedido_id\': 999001, \'monto_usd\': \'1.00\', \'motivo\': \'prueba\'}\nprint(llamar_proveedor(c, \'prueba:paso6\'))\nprint(llamar_proveedor(c, \'prueba:paso6\'))\n"\ncurl -s "http://127.0.0.1:8013/v1/refunds?pedido_id=999001"',
         'Las dos líneas traen el mismo <code>id</code>; la primera con <code>\'repetida\': False</code> y la segunda con <code>True</code>. curl devuelve una lista con un solo reembolso.'))
add(errs([
    ('ValueError: El proveedor rechazó el pedido: 422 {"detail":"La clave ya se usó con otro cuerpo"}', 'Usaste la misma clave con otro monto. Es lo que el proveedor tiene que hacer: una clave es para un solo pedido.'),
    ('psycopg.errors.ForeignKeyViolation: … acciones_ticket_id_fkey', 'La acción necesita un ticket que exista. Desde el paso 9 los crea <code>tickets.crear</code>.'),
]))
add(done(['La política decide con seis reglas y se prueba sin base.', 'El agente puede leer pedidos con la RLS y buscar en las políticas.', 'Un reembolso se reserva con candado, espera a una persona si hace falta y se paga con una clave que no cobra dos veces.'],
         'uv run python -c "\nfrom soporte.acciones import llamar_proveedor\nc = {\'pedido_id\': 999002, \'monto_usd\': \'2.00\', \'motivo\': \'hito 2\'}\nprint([llamar_proveedor(c, \'hito2\')[\'repetida\'] for _ in range(3)])\n"',
         'Imprime <code>[False, True, True]</code>: tres llamadas, un solo reembolso.'))
