# IA06, parte 2: hitos 1 y 2 (pasos 1 a 6).
add('<h2 id="paso-a-paso">Paso a paso</h2>\n')
add('<p>Ocho pasos en tres hitos. El primero arma la agenda y la regla de la confirmación, sin audio ni modelo: es lo que tiene que ser correcto aunque todo lo demás falle. El segundo le pone voz. El tercero mide cuánto tarda cada turno y qué tan seguido el modelo hace lo correcto. Los archivos van en el orden en que los necesitas: ninguno importa algo que todavía no escribiste.</p>\n')
add(code('bash', 'mkdir -p ia06-voz/voz ia06-voz/evals ia06-voz/tests ia06-voz/db\ncd ia06-voz\n# copia aquí pyproject.toml, .env.example, compose.yaml y db/init.sql de las secciones anteriores\ntouch voz/__init__.py evals/__init__.py\nuv sync'))
add('<p><code>uv sync</code> crea <code>.venv</code> e instala todo. La primera vez tarda unos minutos: Pipecat trae onnxruntime, aiortc y faster-whisper, que son paquetes grandes.</p>\n')

# ================================================================== hito 1
add(hito(1, 3, 90, 'La agenda y la regla, sin voz', 'Escribes las fechas, la agenda sobre PostgreSQL y la regla que decide si se puede confirmar. Provocas la carrera de dos reservas y la confirmación repetida, y la base aguanta sola.', [
    ('paso-fechas', 'La configuración y las fechas'), ('paso-agenda', 'La agenda en PostgreSQL'), ('paso-regla', 'La regla de la confirmación')]))

# ---------------- paso 1
add(step('paso-fechas', 'Paso 1. La configuración y las fechas',
    step_map('regla', 'Las variables de <code>.env</code>.', '<code>CFG</code> y las funciones que pasan de una hora a palabras.', 'Nada fuera de Python.', 'Ninguno', '20 min'), ''))
add('<p>Dos archivos sin base, sin red y sin modelo. El primero lee la configuración una vez. El segundo sabe qué horas tiene la agenda y cómo se dice una hora en voz alta: es el texto que va a leer el agente y el que se va a buscar después en lo que sonó.</p>\n')
add(Walk('python', 'voz/config.py', 'Lee las variables de entorno, con valores por defecto que apuntan al <code>compose.yaml</code> de la guía.',
         'Todos los demás archivos, con <code>from voz.config import CFG</code>.', 'El archivo <code>.env</code>, o nada.', '<code>CFG</code> y <code>PROFESIONALES</code>.', 'regla herramientas',
         ['Carga <code>.env</code> en las variables de entorno.', 'Declara los dos profesionales con el nombre que se dice en voz alta.', 'Lee cada valor de una variable, con su valor por defecto, y deja un único objeto <code>CFG</code>.'])
    .from_file(rd('voz/config.py'), [
        ('"""La configuración', [('load_dotenv()', 'Lee <code>.env</code> de la carpeta donde corres el comando y copia sus líneas a las variables de entorno. Las que ya existen no se pisan: <code>VOZ_MODELO=ollama uv run …</code> gana sobre el archivo.'),
                                 ('PROFESIONALES = ', 'El id va a la base; el nombre, a la voz. "la doctora Ruiz" con el artículo, para que la frase suene natural: "¿Le reservo con la doctora Ruiz…?".')]),
        ('@dataclass(frozen=True)', [('db: str', 'Dos conexiones con dos roles. <code>db</code> es la del agente; <code>db_admin</code>, la de <code>postgres</code>, solo la usan los evals, <code>caos.py</code> y las pruebas para vaciar la tabla.'),
                                     ('zona: ZoneInfo', 'La hora del consultorio. Todo lo que el agente dice o entiende está en esta zona; la base guarda en UTC.'),
                                     ('silencio: float', 'Cuántos segundos sin voz cierran un turno. <code>float(...)</code>: las variables de entorno siempre son texto.'),
                                     ('CFG = Config()', 'Un solo objeto, que no se puede modificar después. Los valores se leen una vez, al importar el archivo.')]),
    ]).html())
add(pydef('<code>@dataclass(frozen=True)</code> genera el constructor a partir de los campos y prohíbe cambiarlos: <code>CFG.silencio = 1</code> da <code>FrozenInstanceError</code>. Los valores por defecto se calculan una vez, cuando Python lee la clase; por eso una variable de entorno se cambia antes de correr el comando, no durante. Más en <a href="' + IA0 + '#py-tipos">IA00</a>.'))
add(Walk('python', 'voz/fechas.py', 'Calcula las franjas de 30 minutos de un día y escribe una hora como se dice en voz alta.',
         '<code>agenda.py</code> para saber qué horas existen, y <code>herramientas.py</code> para armar la pregunta.', 'Un día, o el inicio de una cita.', 'Una lista de horas, o un texto como <code>el martes 1 de diciembre a las 10:30</code>.', 'regla herramientas',
         ['Declara los dos turnos del consultorio: de 9 a 13 y de 15 a 18.', 'Para un día de semana, avanza de 30 en 30 minutos dentro de cada turno.', 'Escribe el día, la fecha y la hora en palabras, y separa las piezas que tienen que sonar.', 'Lee las fechas que manda el modelo, en ISO.'])
    .from_file(rd('voz/fechas.py'), [
        ('"""Las franjas', [('TURNOS = ', 'Dos turnos. Una cita de 30 minutos entra si termina antes del cierre: la última de la mañana es a las 12:30.'),
                            ('DIAS = ', 'Python numera los días desde el lunes: <code>weekday()</code> da 0 el lunes y 6 el domingo. Los nombres van en ese orden.'),
                            ('if dia.weekday() >= 5:', 'Sábado y domingo no hay agenda: la lista vacía es la respuesta, no un error.')]),
        ('def en_palabras', [('return f"el {DIAS', '<code>{inicio:%H:%M}</code> formatea la hora con dos dígitos: <code>09:00</code>, no <code>9:0</code>. Whisper suele escribir "10:30" igual, y la regla lo compara con eso.'),
                             ('return (DIAS[inicio.weekday()]', 'Las piezas que la persona tiene que haber oído: el día, la fecha, la hora y el apellido del profesional. Si interrumpe antes de "10:30", falta una.'),
                             ('dt = datetime.fromisoformat(texto)', 'El modelo manda <code>2026-12-01T10:30</code>, sin zona: se entiende como la hora del consultorio. Si manda una zona, se convierte.')]),
    ]).html())
add(pydef('<code>datetime.combine(dia, desde, tzinfo=zona)</code> junta un día y una hora en un instante con zona. Dos instantes con zonas distintas se comparan bien: <code>16:30 UTC == 10:30 en Ciudad de México</code> da <code>True</code>. Eso es lo que permite comparar lo que devuelve PostgreSQL, en UTC, con las franjas, en la hora local.'))
add(predict('ia06-p-franjas'))
add(try_('cp .env.example .env\nuv run python -c "from datetime import date; from voz.config import CFG; from voz.fechas import franjas_del_dia, en_palabras; f = franjas_del_dia(date(2026, 12, 1), CFG.zona); print(len(f), en_palabras(f[3]))"',
         '<code>14 el martes 1 de diciembre a las 10:30</code>: ocho franjas por la mañana y seis por la tarde, y la cuarta es la de las 10:30.'))
add(errs([
    ('ZoneInfoNotFoundError: \'No time zone found with key America/Mexico_City\'', 'Falta <code>tzdata</code>: corre <code>uv sync</code> con el <code>pyproject.toml</code> de la guía.'),
    ('ModuleNotFoundError: No module named \'voz\'', 'Estás corriendo desde otra carpeta, o falta <code>voz/__init__.py</code>. Los comandos van desde <code>ia06-voz/</code>.'),
]))
add(why('Las horas viven en código, en <code>TURNOS</code>, y la base solo guarda las citas tomadas.',
        'Una tabla con una fila por franja libre. Hay que generarla por adelantado para cada día, y una reserva pasa a ser un <code>UPDATE</code> que también puede chocar.',
        'Si el consultorio cambia de horario o cierra un día feriado, hay que cambiar el código. En producción, los turnos y los feriados van en una tabla que lee <code>franjas_del_dia</code>.'))

# ---------------- paso 2
add(step('paso-agenda', 'Paso 2. La agenda en PostgreSQL',
    step_map('base herramientas', 'Un profesional, un día o un inicio, el nombre y una clave.', 'Las horas libres, o el resultado de reservar o cancelar.', 'La tabla <code>citas</code>.', '<a href="#ae-exclusion">Restricción de exclusión</a>', '30 min'), ''))
add('<p>Cuatro funciones, una por pregunta a la base. Ninguna decide nada: la base rechaza el choque y la clave repetida, y <code>agenda.py</code> traduce el error a una palabra que el agente entienda.</p>\n')
add(Walk('python', 'voz/agenda.py', 'Consulta las horas libres, reserva, busca y cancela citas, con el rol <code>agenda_bot</code>.',
         '<code>herramientas.py</code>, <code>caos.py</code>, los evals y las pruebas.', 'Una conexión y los datos de la cita.', 'Una lista de horas, un id o un <code>Resultado</code> con su estado.', 'base',
         ['Abre una conexión en la que cada sentencia es su propia transacción.', 'Para ver lo libre, pide las citas activas del día y las resta de las franjas.', 'Para reservar, inserta con la clave. Si la clave ya existe, devuelve la cita de antes; si la base rechaza el choque, devuelve <code>ocupada</code>.', 'Para cancelar, cambia el estado solo si la cita estaba activa.'])
    .from_file(rd('voz/agenda.py'), [
        ('"""La agenda en PostgreSQL', [('class Resultado:', 'Cinco estados posibles. Cada uno lleva al agente a una frase distinta, y ninguno es una excepción: que la hora esté ocupada es una respuesta normal.'),
                                       ('return psycopg.connect(url, autocommit=True)', '<code>autocommit=True</code>: cada <code>execute</code> se confirma solo. Sin eso, psycopg abre una transacción y la deja abierta hasta un <code>commit()</code>.')]),
        ('def disponibles', [('" WHERE profesional = %s AND estado', '<code>&amp;&amp;</code> pide las citas cuya franja se pisa con el día entero. Los <code>%s</code> los llena psycopg: nunca se arma SQL pegando texto.'),
                             ('return [f for f in franjas if f not in ocupadas]', 'Las franjas de <code>fechas.py</code> menos las tomadas. La comparación funciona aunque PostgreSQL devuelva la hora en UTC.')]),
        ('def reservar', [('" ON CONFLICT (clave) DO NOTHING RETURNING id"', 'Si la clave ya existe, no inserta y no da error; <code>RETURNING</code> no devuelve nada.'),
                          ('except errors.ExclusionViolation:', 'El error 23P01 de la restricción <code>sin_choque</code>. Llega aunque la otra cita se haya insertado una fracción de segundo antes, desde otro proceso.'),
                          ('previa = conn.execute', 'La clave existía: se devuelve el id de la cita que ya estaba. Para quien llama, reservar dos veces es lo mismo que reservar una.')]),
        ('def buscar', [('" AND lower(paciente) = lower(%s)', 'El nombre sin importar mayúsculas: Whisper puede escribir "ana pérez".'),
                        ('"UPDATE citas SET estado = \'cancelada\'', 'El único <code>UPDATE</code> que el rol puede hacer. <code>AND estado = \'activa\'</code> hace que cancelar dos veces no cambie nada la segunda.'),
                        ('return Resultado("repetida", cita_id) if existe', 'Si la cita existe pero ya estaba cancelada, es una repetición, no un error.')]),
    ]).html())
add(callout('fail', 'Qué pasa si falla', '<p>La versión ingenua de <code>reservar</code> pregunta primero si la hora está libre y después inserta. Dos llamadas a la vez ven la hora libre y las dos insertan. Con la restricción de exclusión, la base deja pasar una sola: la segunda espera a que la primera termine y falla con 23P01. No hay un lock en el código porque no hace falta: <code>caos.py carrera</code> lo comprueba.</p>'))
add(Walk('python', 'caos.py', 'Provoca la carrera de dos reservas a la misma hora y la confirmación repetida, sin modelo y sin audio.',
         'Tú, en este paso y en <a href="#comprueba-fallas">Cómo comprobar</a>.', 'Un subcomando: <code>carrera</code>, <code>repetir</code> o <code>vaciar</code>.', 'El estado de cada intento.', 'base',
         ['Fija una hora: el martes 1 de diciembre a las 12:00.', 'Carrera: dos hilos, cada uno con su conexión, esperan en una barrera y reservan la misma hora con claves distintas.', 'Repetir: la misma clave dos veces.', 'Vaciar: borra todas las citas con el rol de administrador.'])
    .from_file(rd('caos.py'), [
        ('"""Provoca', [('INICIO = datetime', 'Las 12:00, para no pisar las 10:30 que usan los evals y las pruebas.')]),
        ('def carrera', [('barrera.wait()', 'Los dos hilos llegan aquí y esperan al otro. Así las dos inserciones salen en el mismo instante, que es lo que pasa cuando dos personas dicen "sí" a la vez.'),
                         ('uuid.uuid4().hex)', 'Claves distintas: son dos personas, no un reintento. La clave no las frena; las frena la restricción.')]),
        ('def repetir', [('primera = agenda.reservar', 'La misma clave dos veces, como cuando una herramienta se reintenta después de un timeout.'),
                         ('c.execute("TRUNCATE citas")', 'Con <code>postgres</code>: el rol del agente no puede borrar. Si lo intenta, la base responde <code>permission denied</code>.')]),
    ]).html())
add(pydef('<code>threading.Barrier(2)</code> es un punto de encuentro: el primer hilo que llama a <code>wait()</code> se queda quieto hasta que llega el segundo, y entonces salen los dos. Sin la barrera, un hilo podría terminar antes de que el otro arranque, y la carrera no pasaría.'))
add(predict('ia06-p-repetir'))
add(try_('docker compose up -d\nuv run python caos.py repetir\nuv run python caos.py carrera',
         'Primero, <code>primera -&gt; reservada N</code> y <code>segunda -&gt; repetida N</code>, con el mismo número las dos veces. Después, una persona con <code>reservada</code> y la otra con <code>ocupada</code>. Cuál gana cambia de una corrida a otra; que gane una sola, no. Si corres <code>carrera</code> dos veces sin vaciar, la segunda da <code>ocupada</code> a las dos: la hora ya era de alguien.'))
add(errs([
    ('psycopg.OperationalError: connection failed: … port 55438 failed: Connection refused', 'La base no está arriba. <code>docker compose ps</code> tiene que mostrar el servicio <code>healthy</code>.'),
    ('psycopg.errors.InsufficientPrivilege: permission denied for table citas', 'Corriste <code>init.sql</code> sin los <code>GRANT</code>, o con otro nombre de rol. Bórralo todo con <code>docker compose down -v</code> y vuelve a levantar.'),
]))
add(why('Que la base impida el choque con una restricción, y que una clave única haga idempotente la reserva.',
        'Un <code>SELECT … FOR UPDATE</code> antes de insertar, o un lock en Python. El primero no bloquea filas que todavía no existen; el segundo solo funciona dentro de un proceso, y cada llamada es un proceso aparte.',
        'La restricción solo ve citas de 30 minutos que se pisan en la misma tabla. Si mañana hay dos sedes en dos bases, o citas de largo variable con un descanso entre ellas, la regla cambia y hay que volver a escribirla.'))

# ---------------- paso 3
add(step('paso-regla', 'Paso 3. La regla de la confirmación',
    step_map('regla', 'La historia de la conversación y la propuesta.', '<code>(True, "ok")</code>, o <code>(False, motivo)</code>.', 'Nada: son funciones puras.', '<a href="#ae-confirmar">Confirmar en voz alta</a>', '25 min'), ''))
add('<p>La regla de <a href="#ae-confirmar">la ficha</a>, en código. Todo es texto contra texto: no hay modelo, ni base, ni Pipecat. Por eso se prueba con veinte casos en un segundo, y por eso un modelo apurado no la puede saltar.</p>\n')
add(Walk('python', 'voz/confirmar.py', 'Decide si la persona oyó la propuesta entera y después dijo que sí.',
         '<code>confirmar</code>, en <code>herramientas.py</code>.', 'La historia, como lista de mensajes con <code>role</code> y <code>content</code>, y la propuesta.', 'Un permiso o el motivo, que vuelve al modelo.', 'regla',
         ['Normaliza el texto: minúsculas, sin tildes ni signos.', 'Busca frases enteras, palabra por palabra.', 'Un sí cuenta solo si no viene con ningún no.', 'Desde que se propuso, busca la última vez que el agente dijo todas las piezas, y mira la última respuesta de la persona después de eso.'])
    .from_file(rd('voz/confirmar.py'), [
        ('"""La regla', [('SI = (', 'Las formas de decir que sí que Whisper suele transcribir. "por favor" solo también cuenta: es lo que se contesta a "¿le reservo…?".'),
                         ('NO = (', '"otro" y "otra" son un no: "sí, pero otro día" no confirma la hora propuesta.'),
                         ('if unicodedata.category(c) != "Mn"', 'NFD separa cada letra de su tilde, y las tildes son de la categoría <code>Mn</code>: al quitarlas, "sí" queda "si" y "Pérez", "perez".')]),
        ('def contiene', [('return f" {normalizar(frase)} "', 'Con espacios a los lados: "no" no aparece dentro de "nombre", ni "si" dentro de "sido".'),
                          ('if any(contiene(texto, n) for n in NO):', 'Gana el no. "Sí… no, espera" es un no. Preguntar de nuevo cuesta una frase; una cita mal puesta, una persona que viene el día equivocado.'),
                          ('if isinstance(contenido, list):', 'Pipecat y LangChain a veces guardan el contenido como una lista de partes, cada una con su <code>text</code>.')]),
        ('def escucho', [('return all(contiene(dicho, p)', 'Todas las piezas en el mismo mensaje. Lo que sonó lo decide Pipecat al truncar (<a href="#ae-interrupcion">figura IA06.9</a>).'),
                         ('for i in range(propuesta.desde, len(mensajes)):', 'Desde el momento de la propuesta, no desde el principio: una lectura de una propuesta anterior no cuenta para esta.'),
                         ('respuestas = [texto_de(m)', 'Solo lo que dijo la persona después de oír la propuesta entera. Lo que dijo antes, mientras el agente hablaba, no es una respuesta a la pregunta.'),
                         ('if not es_si(respuestas[-1]):', 'La última respuesta. Si dijo "no" y después "bueno, sí", vale el sí.')]),
    ]).html())
add(pydef('<code>f"… {respuestas[-1]!r}"</code>: el <code>!r</code> pone el texto entre comillas, como lo escribe Python. El modelo recibe <code>dijo: \'mmm\'</code> y entiende que es una cita literal de la persona, no una instrucción.'))
add(predict('ia06-p-regla'))
add(try_('uv run python -c "from voz.confirmar import es_si; print([es_si(t) for t in [\'Sí, por favor.\', \'Sí... no, espera\', \'mmm\', \'Claro que sí\']])"',
         '<code>[True, False, False, True]</code>. El segundo tiene un sí, pero también un no, y gana el no.'))
add(why('Que la regla viva en una función sin modelo, llamada dentro de la herramienta que actúa.',
        'Pedirle al modelo que solo llame a <code>confirmar</code> después del sí, o pedirle a otro modelo que juzgue si hubo un sí. Lo primero ya está en las instrucciones y no alcanza; lo segundo suma latencia y otra cosa que puede fallar.',
        'Una lista de palabras no entiende todo: "ándale" o "va" no están, y la persona tiene que repetir. Es el error barato. El caro, un "no" que no reconoce, lo reduce la regla de que gana el no; no lo elimina. Agrega lo que oigas en tus llamadas, con una prueba por cada palabra.'))
add(done(['Las franjas de cada día y la hora en palabras.', 'La agenda: ver, reservar con clave, buscar y cancelar, con el rol que no borra.', 'Dos reservas a la vez: gana una. La misma clave dos veces: una cita.', 'La regla que decide si se puede confirmar.'],
         'uv run python caos.py vaciar\nuv run pytest tests/test_fechas.py tests/test_confirmar.py tests/test_agenda.py -q',
         'Primero escribe las pruebas de <a href="#comprueba-pruebas">Cómo comprobar</a>. Con la base arriba, todas pasan; sin la base, las de <code>test_agenda.py</code> aparecen como <code>skipped</code> y las demás pasan igual.'))

# ================================================================== hito 2
add(hito(2, 3, 150, 'Hablar', 'Escribes las herramientas una vez para la voz y para los evals, eliges los tres modelos de la cascada y armas la tubería de Pipecat. Al final hablas con el agente desde el navegador.', [
    ('paso-herramientas', 'Las cuatro herramientas'), ('paso-modelos', 'Las instrucciones y los tres modelos'), ('paso-bot', 'La tubería de voz')]))

# ---------------- paso 4
add(step('paso-herramientas', 'Paso 4. Las cuatro herramientas',
    step_map('herramientas regla base', 'La sesión, la historia y los argumentos que manda el modelo.', 'Un dict que vuelve al modelo como resultado de la herramienta.', 'La propuesta de la sesión y, solo en <code>confirmar</code>, la tabla.', '<a href="#ae-confirmar">La clave</a>', '35 min'), ''))
add('<p>Las herramientas no saben si hay audio. Reciben la historia como una lista de dicts, que es la forma en que Pipecat guarda el contexto, y devuelven dicts. Así las mismas funciones sirven para <code>bot.py</code> y para los evals en texto del paso 8.</p>\n')
add(Walk('python', 'voz/herramientas.py', 'Define las cuatro herramientas, la propuesta pendiente de cada sesión y la clave de idempotencia.',
         '<code>bot.py</code>, que las conecta a Pipecat, y <code>evals/charla.py</code>, que las conecta a LangChain.', 'La sesión, la historia y los argumentos de cada llamada.', 'Un dict: las horas libres, la pregunta para leer, el resultado o un error.', 'herramientas regla base',
         ['Guarda en la sesión la propuesta pendiente y lo que ya se hizo.', 'Corre cada consulta a la base en otro hilo, para no frenar el audio.', 'Ver disponibilidad y proponer solo leen; proponer guarda la propuesta y devuelve la pregunta.', 'Confirmar pregunta a la regla, actúa con la clave y limpia la propuesta.', 'Declara los nombres, las descripciones y los esquemas que ve el modelo.'])
    .from_file(rd('voz/herramientas.py'), [
        ('"""Las cuatro herramientas', [('from voz.confirmar import puede_confirmar', 'La regla del paso 3. Solo la llama <code>confirmar</code>.')]),
        ('@dataclass(frozen=True)', [('piezas: tuple[str, ...]', 'Lo que tiene que sonar, calculado una vez al proponer.'),
                                     ('desde: int', 'Cuántos mensajes tenía la historia al proponer. La regla busca la lectura desde aquí.'),
                                     ('propuesta: Propuesta | None = None', 'Una sola propuesta pendiente por sesión. Proponer otra la reemplaza: "no, mejor a las 11" deja sin efecto la de las 10:30.')]),
        ('async def _con_db', [('return await asyncio.to_thread(correr)', 'psycopg síncrono en otro hilo. El bucle de <code>asyncio</code> sigue moviendo audio mientras la base responde.'),
                               ('datos = [sesion_id, p.accion', 'La clave sale de la sesión y de lo propuesto. El nombre en minúsculas y sin espacios a los lados: "Ana Pérez" y " ana pérez " son la misma persona.'),
                               ('[:32]', '32 caracteres hexadecimales, 128 bits: más que suficiente para que dos propuestas distintas no compartan clave.')]),
        ('async def ver_disponibilidad', [('return {"error": f"Profesional desconocido', 'Un error es un resultado, no una excepción: el modelo lo lee y corrige. El texto le dice cómo.')]),
        ('async def proponer_reserva', [('if inicio not in await _con_db(agenda.disponibles', 'Proponer comprueba que la hora esté libre, para no ofrecer algo que no existe. Eso no reserva: entre proponer y confirmar, otra persona puede tomarla, y lo dice <code>confirmar</code>.'),
                                        ('sesion.propuesta = Propuesta("reservar"', '<code>len(mensajes)</code>: el lugar de la historia desde el que se va a buscar la lectura.'),
                                        ('return {"leer":', 'La pregunta exacta que tiene que sonar, escrita por el código y no por el modelo. Así contiene siempre las piezas que busca la regla.')]),
        ('async def proponer_cancelacion', [('cita = await _con_db(agenda.buscar', 'Para cancelar, la cita tiene que existir y estar activa, con ese nombre. El modelo no puede cancelar por id: no conoce ninguno.')]),
        ('async def confirmar', [('ok, motivo = puede_confirmar(mensajes, sesion.propuesta)', 'La barrera. Si no hubo un sí a la propuesta entera, no se toca la base.'),
                                 ('clave_de(sesion.id, p)', 'Si Pipecat reintenta la herramienta, o el modelo la llama dos veces seguidas, la base ve la misma clave.'),
                                 ('sesion.propuesta = None', 'Una propuesta se confirma una vez. Para otra cita hay que proponer de nuevo, y leerla de nuevo.'),
                                 ('if r.estado == "ocupada":', 'La carrera del paso 2, vista por la persona: otra persona dijo que sí primero.')]),
        ('_PROFESIONAL = ', [('"enum": list(PROFESIONALES)', 'Solo dos valores posibles. Con decodificación restringida, el modelo no puede escribir otro (<a href="../modules/m63-tool-calling.html">M63</a>); si lo hace igual, <code>_profesional</code> lo rechaza.')]),
        ('HERRAMIENTAS = [', [('"efecto": False', 'Tres herramientas sin efecto: se pueden llamar mil veces y la agenda no cambia.'),
                              ('{"name": "confirmar"', 'La única con efecto. No tiene argumentos: confirma lo que quedó propuesto, nunca otra cosa que el modelo invente en el momento.')]),
    ]).html())
add(pydef('<code>async def</code> declara una función que puede esperar sin frenar al resto. <code>await asyncio.to_thread(correr)</code> manda <code>correr</code> a otro hilo y deja que el bucle siga con el audio hasta que vuelva. Más en <a href="' + IA0 + '#py-async">IA00</a>.'))
add(callout('def', 'Por qué confirmar no tiene argumentos', '<p>Si <code>confirmar</code> recibiera la hora, el modelo podría confirmar las 11:00 después de leer las 10:30, y la regla miraría una propuesta y la base recibiría otra. Sin argumentos, lo que se confirma es lo que la persona oyó, porque es lo mismo que se guardó al proponer.</p>'))
add(predict('ia06-p-clave'))
add(try_('uv run python -c "import asyncio; from voz.herramientas import Sesion, proponer_reserva, confirmar; s = Sesion(\'s1\'); print(asyncio.run(proponer_reserva(s, [], {\'profesional\': \'ruiz\', \'inicio\': \'2026-12-01T10:30\', \'paciente\': \'Ana Pérez\'}))[\'leer\']); print(asyncio.run(confirmar(s, [], {})))"',
         'La pregunta, <code>¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30, a nombre de Ana Pérez?</code>, y después <code>{\'hecho\': False, \'motivo\': \'La persona no oyó la propuesta entera. …\'}</code>: la historia está vacía, así que nadie la oyó. La base sigue sin citas a las 10:30.'))
add(errs([
    ('{\'error\': \'Esa hora no está libre. Busca otra con ver_disponibilidad.\'}', 'Quedó una cita de una prueba anterior. <code>uv run python caos.py vaciar</code>.'),
]))
add(why('Partir la acción en proponer y confirmar, y que confirmar no reciba datos.',
        'Una sola herramienta <code>reservar(profesional, inicio, paciente)</code> detrás de un <code>interrupt</code>, como en IA03. Aquí no hay una pantalla donde aprobar: quien aprueba es la persona al teléfono, y su aprobación es una frase que ya está en la historia.',
        'Si la persona cuelga entre proponer y confirmar, la propuesta muere con la sesión y no queda nada a medias. Si el modelo nunca lee la pregunta, la regla no deja confirmar, y la persona oye un "le reservo…" que no termina en nada: lo ves en <code>los evals</code>, como un caso que no pasa.'))

# ---------------- paso 5
add(step('paso-modelos', 'Paso 5. Las instrucciones y los tres modelos',
    step_map('stt llm tts', 'La fecha de hoy y <code>VOZ_MODELO</code>.', 'Las instrucciones y los tres servicios de Pipecat.', 'Nada todavía: se arman, no corren.', '<a href="#ae-cascada">La cascada</a>', '25 min'), ''))
add('<p>Las instrucciones son cortas a propósito: cada token del prompt se paga en cada turno, y en una llamada hay muchos turnos. Dicen lo que el código no puede imponer, cómo hablar, y repiten lo que sí impone, cuándo confirmar, para que el modelo no choque contra la regla a cada rato.</p>\n')
add(Walk('python', 'voz/prompt.py', 'Arma las instrucciones del agente con la fecha de hoy y los profesionales.',
         '<code>bot.py</code>, y los evals con una fecha fija.', 'La fecha de hoy, o ninguna.', 'Un texto de nueve líneas.', 'llm',
         ['Calcula hoy en la hora del consultorio.', 'Dice cómo hablar: frases cortas, sin markdown.', 'Dice cuándo usar cada herramienta y qué no decir nunca.'])
    .from_file(rd('voz/prompt.py'), [
        ('"""Las instrucciones', [('hoy = hoy or datetime.now(CFG.zona).date()', 'Sin la fecha, "el martes" no significa nada para el modelo. Los evals pasan una fecha fija para que el caso sea el mismo cada vez.'),
                                  ('Todo lo que escribes se convierte en voz', 'Lo primero, porque es lo que más cambia la forma de las respuestas: Piper lee lo que reciba.'),
                                  ('Nunca digas que una cita quedó reservada', 'La regla impide reservar sin un sí, pero no impide que el modelo diga que reservó. Esta línea, y el chequeo <code>miente</code> de los evals, cubren eso.')]),
    ]).html())
add(Walk('python', 'voz/modelos.py', 'Crea los tres servicios de la cascada: Whisper para oír, Claude u Ollama para pensar, Piper para hablar.',
         '<code>bot.py</code>, y los evals para los nombres y los precios.', '<code>CFG</code> y las instrucciones.', 'Tres servicios de Pipecat, y el costo de una cantidad de tokens.', 'stt llm tts',
         ['Declara los nombres de los modelos y sus precios.', 'Whisper en español, en la CPU o en la GPU.', 'El modelo que piensa, según <code>VOZ_MODELO</code>.', 'Piper con la voz de <code>VOZ_PIPER</code>.'])
    .from_file(rd('voz/modelos.py'), [
        ('"""Las tres etapas', [('PRECIOS = ', 'Los precios de Haiku 5.5 por millón de tokens ' + DOC + '. Están aquí para que los evals digan cuánto costó una corrida; revísalos antes de confiar en el número.'),
                                ('MODELOS = ', 'Haiku, el modelo más rápido de Anthropic, porque el primer token pesa en cada turno. <code>qwen2.5:7b</code> en Ollama, el mismo de las guías anteriores.')]),
        ('def oido', [('device="auto"', 'La GPU si hay una de NVIDIA con CUDA; si no, la CPU. No hay que cambiar nada.'),
                      ('language=Language.ES', 'El idioma fijo. Sin esto, Whisper adivina el idioma en cada turno, y en una frase corta como "sí" se equivoca seguido.')]),
        ('def cerebro', [('max_tokens=300', 'Un tope corto. Una respuesta de voz no necesita más, y un tope bajo corta antes un modelo que se pone a dar listas.'),
                         ('base_url=f"{CFG.ollama}/v1"', 'Ollama habla el mismo protocolo que la API de OpenAI en <code>/v1</code>, y Pipecat lo usa así.'),
                         ('raise ValueError', 'Un nombre mal escrito falla al arrancar, no en mitad de la primera llamada.')]),
        ('def boca', [('voice=CFG.voz', 'Pipecat baja la voz la primera vez y la guarda. <code>es_MX-claude-high</code> es una voz de México de las que publica Piper; hay otras de España y de Argentina.'),
                      ('return (entrada * p_in', '<code>Decimal</code> y no <code>float</code>: los costos se suman muchas veces y un <code>float</code> acumula errores de redondeo.')]),
    ]).html())
add(comparar('Con <code>VOZ_MODELO=claude</code> sale de tu máquina el texto de la conversación, las instrucciones y las cuatro definiciones de herramientas, en cada turno. Con <code>ollama</code> no sale nada, pero el primer token depende de tu máquina: un modelo de 7B en una CPU puede tardar más que todo el reparto de M24. Lo vas a medir en el paso 7, con el mismo CSV para los dos.'))
add(predict('ia06-p-modelo'))
add(try_('uv run python -c "from datetime import date; from voz.prompt import instrucciones; print(instrucciones(date(2026, 11, 27)).splitlines()[2])"',
         '<code>Hoy es viernes 2026-11-27. Atienden la doctora Ruiz (id ruiz), el doctor Paz (id paz), de lunes a viernes, de 9:00 a 13:00 y de 15:00 a 18:00, en citas de 30 minutos.</code>'))
add(why('Una cascada de tres modelos locales y uno remoto opcional, con Haiku para pensar.',
        'Un modelo speech-to-speech, que oye y habla en una sola pieza. Tiene menos latencia, pero no corre en tu máquina, no deja ver el texto entre etapas y no se puede cambiar una pieza por otra (<a href="' + M24 + '#arquitecturas">24.2</a>).',
        'Whisper <code>small</code> se equivoca con nombres propios y con números dichos rápido. Un "trece" que sale "tres" pasa sin que nadie lo note, salvo porque la propuesta lo lee en voz alta: para eso está. Con más CPU o una GPU, <code>VOZ_WHISPER=medium</code> se equivoca menos y tarda más.'))

# ---------------- paso 6
add(step('paso-bot', 'Paso 6. La tubería de voz',
    step_map('navegador vad stt llm tts herramientas', 'El audio del navegador.', 'El audio del agente, y las herramientas llamadas.', 'La tabla <code>citas</code>, si confirmas.', '<a href="#ae-turnos">El fin de turno</a> y <a href="#ae-interrupcion">el truncado</a>', '50 min'), ''))
add('<p>Todo lo anterior se junta aquí. Pipecat arma una tubería de procesadores: cada uno recibe <b>frames</b>, pedazos de audio, de texto o de control, y los pasa al siguiente. El runner levanta el servidor web, recibe la oferta del navegador y llama a <code>bot()</code> una vez por cada conexión.</p>\n')


def _tuberia():
    f = 'fi06u'
    xs = [20, 120, 220, 320, 420, 520, 620]
    labs = [('entrada', 'transport.input'), ('oír', 'Whisper'), ('usuario', 'agregador'), ('pensar', 'el modelo'),
            ('hablar', 'Piper'), ('salida', 'transport.output'), ('agente', 'agregador')]
    layers = ['client', 'gpu', 'service', 'gpu', 'gpu', 'client', 'service']
    b = []
    for x, (l, s), ly in zip(xs, labs, layers):
        b.append(box(x, 40, 88, 54, l, s, ly))
    for x in xs[:-1]:
        b.append(edge(f, f'M{x + 88} 67 L{x + 98} 67'))
    b.append(f'<rect class="dg-layer" style="--c: var(--l-service)" x="220" y="150" width="488" height="44" rx="8"/>')
    b.append(text(464, 177, 'LLMContext: la historia, con lo que sonó', 'dg-small', 'middle'))
    b.append(edge(f, 'M264 94 V148'))
    b.append(edge(f, 'M664 94 V148'))
    b.append(edge(f, 'M364 148 V96', dashed=True))
    b.append(text(272, 124, 'agrega lo que dijo la persona', 'dg-tiny'))
    b.append(text(560, 124, 'agrega lo que sonó', 'dg-tiny', 'end'))
    b.append(text(372, 140, 'lo lee', 'dg-tiny'))
    b.append(text(20, 226, 'El VAD vive en el agregador del usuario: decide cuándo cierra el turno y cuándo la persona interrumpe.', 'dg-small'))
    return svg(f, 770, 240, 'La tubería de bot.py',
        'Siete procesadores en fila: la entrada del transporte, Whisper, el agregador del usuario, el modelo, Piper, la salida del transporte y el agregador del agente. Debajo, el contexto compartido: el agregador del usuario agrega lo que dijo la persona, el agregador del agente agrega lo que sonó, y el modelo lo lee. El VAD vive en el agregador del usuario.',
        '\n'.join(b))


add(figure(_tuberia(), '<b>Figura IA06.12.</b> El orden de la lista de <code>Pipeline([...])</code> es el de las cajas. El agregador del agente va después de la salida a propósito: solo ve el texto cuyo audio ya salió, y por eso puede guardar lo que sonó y no lo que se escribió.'))
add(Walk('python', 'bot.py', 'Arma la tubería de Pipecat con el transporte WebRTC, el VAD, los tres modelos y las herramientas, y anota las latencias.',
         'El runner de Pipecat, una vez por cada conexión del navegador.', 'Los argumentos del runner: el transporte y el id de sesión.', 'Una llamada de voz que dura hasta que el navegador se desconecta.', 'navegador vad stt llm tts herramientas latencia',
         ['Envuelve cada herramienta en el formato de Pipecat, con la historia del contexto.', 'Crea el transporte y una sesión.', 'Arma el contexto con las herramientas y el VAD con el silencio de <code>.env</code>.', 'Pone los procesadores en fila y un observador de latencias.', 'Saluda cuando el navegador está listo y cierra cuando se va.'])
    .from_file(rd('bot.py'), [
        ('"""El teléfono', [('from pipecat.runner.types import RunnerArguments', 'El runner es lo que levanta <code>localhost:7860</code> y los endpoints. <code>bot.py</code> solo define qué pasa en cada llamada.')]),
        ('from voz.config import CFG', [('mensajes = params.context.get_messages()', 'La historia que guarda Pipecat, con las respuestas truncadas. Es lo que lee la regla.'),
                                       ('await params.result_callback(resultado)', 'El resultado vuelve al modelo, que sigue con el turno: lee la pregunta o explica el error.'),
                                       ('manejar = tool_options(cancel_on_interruption=False)', 'Por defecto, si la persona interrumpe, Pipecat cancela la herramienta en curso. Una confirmación que ya pasó la regla no se cancela a la mitad: la base termina o no empieza.')]),
        ('async def bot', [('"webrtc": lambda: TransportParams', 'El transporte WebRTC con audio de entrada y de salida. El runner también sabe otros transportes; esta guía usa solo este.'),
                           ('sesion = Sesion(id=runner_args.session_id', 'Una sesión por conexión. El id entra en la clave: dos llamadas distintas que piden lo mismo son dos citas, y la restricción decide.'),
                           ('vad_analyzer=SileroVADAnalyzer', 'El VAD con el silencio de <code>VOZ_SILENCIO</code>. Los demás valores, los de Pipecat: confianza 0.7 y 0.2 s para empezar.'),
                           ('transport.input(), oido(), usuario', 'El orden de la <a href="#paso-bot">figura IA06.12</a>.')]),
        ('    latencia = UserBotLatencyObserver()', [('@latencia.event_handler("on_latency_breakdown")', 'Pipecat avisa una vez por turno con el desglose, y <code>anotar</code> lo escribe en el CSV del paso 7.'),
                                                    ('params=PipelineParams(enable_metrics=True', 'Sin las métricas encendidas, el observador no tiene qué medir.')]),
        ('    @worker.rtvi.event_handler("on_client_ready")', [('context.add_message({"role": "developer"', 'Una indicación para este turno, no un mensaje de la persona. El agente habla primero, como en un teléfono.'),
                                                              ('if message.interrupted:', 'El texto que quedó en la historia después de una interrupción. Es la forma más rápida de ver el truncado en vivo.')]),
        ('    runner = WorkerRunner', [('await runner.cancel()', 'Cuando cierras la pestaña o tocas desconectar, la tubería se detiene y la sesión se pierde con su propuesta.'),
                                     ('from pipecat.runner.run import main', 'El runner busca la función <code>bot</code> en este archivo y la llama con cada conexión.')]),
    ]).html())
add(pydef('<code>@latencia.event_handler("on_latency_breakdown")</code> es un decorador con argumento: registra la función de abajo para que Pipecat la llame cuando pase ese evento. La función no se llama en ningún lado del archivo; la llama Pipecat. Más en <a href="' + IA0 + '#py-decoradores">IA00</a>.'))
add(predict('ia06-p-silencio'))
add(try_('uv run python caos.py vaciar\nuv run bot.py',
         'La primera vez, Pipecat baja Whisper <code>small</code> y la voz de Piper: espera a que termine. Cuando el servidor queda escuchando en el puerto 7860, abre <code>http://localhost:7860/client</code>, toca conectar y permite el micrófono. El agente saluda. Pide una cita con la doctora Ruiz el martes 1 de diciembre a las 10:30, escucha la pregunta entera y di "sí". En la terminal aparecen las líneas de <code>logger.info</code> de las herramientas, como <code>proponer_reserva({…}) -&gt; {\'leer\': …}</code> y <code>confirmar({}) -&gt; {\'hecho\': True, \'estado\': \'reservada\', \'cita\': …}</code>.'))
add(errs([
    ('El navegador no pide el micrófono', 'Abriste la IP de tu máquina o un puerto distinto. Tiene que ser <code>http://localhost:7860/client</code>.'),
    ('anthropic.AuthenticationError: Error code: 401', 'Falta <code>ANTHROPIC_API_KEY</code> en <code>.env</code>, o tiene un espacio de más. Con <code>VOZ_MODELO=ollama</code> no hace falta.'),
    ('El agente se corta solo, sin que digas nada', 'El micrófono oye los parlantes y el VAD lo toma como una interrupción. Usa auriculares: es la <a href="#comprueba-fallas">falla 4</a>.'),
    ('httpx.ConnectError: [Errno 111] Connection refused (con Ollama)', 'Ollama no está corriendo. <code>ollama serve</code>, o abre la aplicación, y comprueba con <code>ollama list</code>.'),
]))
add(comparar('Habla con los dos. Haz la misma reserva con <code>VOZ_MODELO=claude</code> y con <code>VOZ_MODELO=ollama</code>, y fíjate en tres cosas: cuánto tarda en empezar a responder después de que callas, si lee la pregunta de <code>proponer_reserva</code> tal cual o la cambia, y si llama a <code>confirmar</code> antes de que contestes. Lo tercero no reserva nada, porque la regla lo frena, pero en la terminal ves <code>\'hecho\': False</code>.'))
add(why('Pipecat, con el transporte WebRTC sin servidor de medios, en el mismo proceso que las herramientas.',
        'Escribir la tubería a mano con aiortc, o usar un servicio de voz administrado. Lo primero es semanas de trabajo en el VAD, el truncado y el reparto de frames; lo segundo esconde las etapas que esta guía quiere que midas.',
        'Una llamada es un proceso con Whisper cargado en memoria. Diez llamadas a la vez en una laptop no entran. En producción, cada llamada va a un worker con su GPU, detrás de un servidor de medios (<a href="' + M24 + '#sesion-worker">24.10</a>).'))
add(done(['Las cuatro herramientas, que proponen sin actuar y confirman con la regla y la clave.', 'Las instrucciones con la fecha de hoy, y Claude u Ollama según <code>.env</code>.', 'Una llamada desde el navegador que oye, consulta, pregunta y reserva.', 'Una interrupción que deja en la historia solo lo que sonó.'],
         'uv run bot.py\n# en otra terminal, después de reservar por voz:\ndocker compose exec postgres psql -U postgres -d consultorio -c "SELECT profesional, lower(franja) AT TIME ZONE \'America/Mexico_City\' AS hora, paciente, estado FROM citas"',
         'Una fila con <code>ruiz</code>, <code>2026-12-01 10:30:00</code>, el nombre como lo transcribió Whisper, y <code>activa</code>.'))
