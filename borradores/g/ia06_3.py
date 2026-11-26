# IA06, parte 3: hito 3 (pasos 7 y 8), el viaje de un dato y las decisiones.

# ================================================================== hito 3
add(hito(3, 3, 120, 'Medir', 'Anotas cuánto tarda cada parte de cada turno y lo comparas con el presupuesto de M24. Después mides, sin audio y repitiendo cada caso, qué tan seguido el modelo hace lo correcto.', [
    ('paso-latencia', 'El presupuesto, medido'), ('paso-evals', 'Los evals en texto')]))

# ---------------- paso 7
add(step('paso-latencia', 'Paso 7. El presupuesto, medido',
    step_map('latencia', 'Un desglose por turno, que manda Pipecat.', 'Un CSV con una fila por parte, y una tabla con la mediana y el p95.', 'El archivo <code>latencias.csv</code>.', '<a href="#ae-presupuesto">El presupuesto</a>', '30 min'), ''))
add('<p>Pipecat ya mide. Lo que falta es guardar cada medición para poder contar: una llamada de prueba tiene diez o veinte turnos, y la mediana de diez turnos dice poco. El plan es hacer muchas llamadas cortas, con cada modelo, y mirar la tabla al final.</p>\n')
add(Walk('python', 'voz/latencia.py', 'Anota el desglose de cada turno en un CSV y lo resume con la mediana y el p95 de cada parte.',
         '<code>bot.py</code> para anotar, y tú con <code>uv run voz-latencias</code> para resumir.', 'El desglose de Pipecat, o el CSV.', 'Filas en el CSV, o una tabla en milisegundos.', 'latencia',
         ['Descarta el saludo: no hubo una persona esperando.', 'Escribe una fila por parte del turno y una con el total.', 'Suma las partes que aparecen dos veces en un mismo turno, como dos llamadas al modelo.', 'Calcula la mediana y el p95 por modelo y por parte.'])
    .from_file(rd('voz/latencia.py'), [
        ('"""El presupuesto', [('CAMPOS = ', 'Cinco columnas. <code>sesion</code> y <code>turno</code> juntos identifican un turno; <code>modelo</code> separa Claude de Ollama en la misma tabla.')]),
        ('def anotar', [('if desglose.measured_from != "user_silence":', 'Pipecat mide el saludo desde que el navegador se conectó, no desde que alguien calló. Mezclarlo con los turnos ensuciaría la mediana.'),
                        ('turno = f"{desglose.user_turn_start_time', 'El instante en que empezó a hablar la persona, como id del turno. Es único dentro de una sesión.'),
                        ('for c in desglose.contributions:', 'Cada parte con su clave: <code>transcription</code>, <code>llm_inference</code>, <code>speech_synthesis</code>… Son las de <a href="#ae-presupuesto">la figura IA06.8</a>.')]),
        ('def percentil', [('return orden[max(1, math.ceil', 'Por rango más cercano: con 20 turnos, el p95 es el turno 19 de menor a mayor. Sin interpolar, siempre es un valor que pasó de verdad.'),
                           ('por_turno[(f["modelo"], f["parte"], f["sesion"], f["turno"])] +=', 'Un turno con herramienta tiene dos <code>llm_inference</code>: antes y después de la herramienta. Para la persona fue una sola espera, así que se suman.')]),
        ('def main', [('print(f"{modelo:8} {parte:24}', 'Una fila por modelo y por parte, en milisegundos. La fila <code>total</code> es la que se compara con los 800 ms.')]),
    ]).html())
add(callout('def', 'Lo que no está en el CSV', '<p>Pipecat mide desde que su VAD decide que callaste hasta que sale el primer audio. La captura del micrófono, la red de ida y vuelta y lo que tarda tu parlante en sonar quedan afuera: en <code>localhost</code> la red es casi nada, y el resto son unas decenas de milisegundos según M24 ' + REF + '. Súmalos a mano antes de comparar con el presupuesto, o anota que no lo hiciste.</p>'))
add(predict('ia06-p-percentil'))
add(try_('# haz cinco o seis llamadas cortas con cada modelo, cambiando VOZ_MODELO en .env entre una tanda y otra\nuv run voz-latencias',
         'La cabecera <code>modelo    parte    turnos    p50 ms    p95 ms</code> y una fila por modelo y por parte. Los números son los de tu máquina: anótalos. Compara la fila <code>total</code> de cada modelo con los 800 ms, y mira qué fila pesa más en cada uno. Si <code>turnos</code> es menor que 10, haz más llamadas antes de sacar conclusiones.'))
add(table(['Modelo', 'Parte', 'Turnos', 'p50 ms', 'p95 ms', 'M24 ' + REF], [
    ['claude', 'endpointing_wait', '', '', '', '250, con el fin de turno'],
    ['claude', 'transcription', '', '', '', '50'],
    ['claude', 'llm_inference', '', '', '', '150 hasta el primer token'],
    ['claude', 'speech_synthesis', '', '', '', '80'],
    ['claude', 'total', '', '', '', '780 de punta a punta'],
    ['ollama', 'total', '', '', '', '780 de punta a punta'],
]))
add('<p>La tabla de arriba es para que la llenes. La última columna es el reparto de M24 para un turno sin herramienta. Si la fila de <code>llm_inference</code> es la más alta, el cambio que más rinde es el modelo; si es <code>transcription</code>, Whisper más chico o en la GPU; si es <code>endpointing_wait</code>, el silencio de fin de turno, y ya sabes lo que cuesta bajarlo.</p>\n')
add(comparar('El primer token es la diferencia grande. Con Claude depende de la red y de la carga del servicio; con Ollama, de tu CPU o tu GPU y de que el modelo ya esté cargado en memoria. La primera llamada a Ollama después de un rato sin usarlo carga el modelo, y ese turno sale mucho más lento: no lo borres del CSV, pero anótalo.'))
add(why('Medir por parte, por turno y por modelo, y resumir con la mediana y el p95.',
        'Medir solo el total, o el promedio. El total no dice qué cambiar; el promedio esconde los turnos lentos, que son los que la persona recuerda.',
        'Con pocas llamadas, el p95 es uno o dos turnos y cambia mucho entre una tanda y otra. Y lo que mides en <code>localhost</code> no es lo que pasa por teléfono: la red de verdad suma, y la pérdida de paquetes también (<a href="#limitaciones">Limitaciones</a>).'))

# ---------------- paso 8
add(step('paso-evals', 'Paso 8. Los evals en texto',
    step_map('evals herramientas regla base', 'Seis diálogos con un guion fijo de la persona.', 'Si la agenda quedó como tenía que quedar, k veces por caso, y pass^k.', 'La tabla <code>citas</code>: cada caso la vacía primero.', '<a href="' + IA0 + '#ae-pass-k">pass^k</a>', '50 min'), ''))
add('<p>Hablar con el agente es la prueba más fiel y la menos repetible: tu voz, el ruido y Whisper cambian cada vez. Para medir qué hace el modelo, los evals sacan el audio y dejan todo lo demás: las mismas instrucciones, las mismas cuatro herramientas, la misma regla y la misma base. La persona es un guion. La interrupción se simula cortando el texto del agente como lo cortaría Pipecat.</p>\n')
add(figure(compare('fi06e', 'La llamada contra el eval', 'A la izquierda, una llamada de voz: audio, VAD, Whisper, el modelo, Piper. A la derecha, un eval: el guion entra como texto, va al mismo modelo con las mismas herramientas, y se juzga la agenda al final.',
    ['El audio de tu voz', 'VAD y Whisper', 'El modelo y las herramientas', 'Piper y tus oídos', 'Juzgas tú, una vez'],
    ['Un guion de texto', 'Nada: ya es texto', 'El modelo y las herramientas', 'Nada: se lee el texto', 'Juzga la agenda, k veces'],
    lt='Una llamada', rt='Un eval', bad_left=False),
    '<b>Figura IA06.13.</b> Lo que no cambia está en el medio, y es lo que miden los evals: qué herramientas llama el modelo, en qué orden y si la agenda queda bien. Lo que el eval no mide, Whisper y el VAD, lo mides con las llamadas y con <a href="#comprueba-fallas">las fallas</a>.'))
add(Walk('python', 'evals/charla.py', 'Una conversación en texto con el modelo por LangChain y las mismas herramientas que el bot de voz.',
         '<code>evals/dialogos.py</code> y las pruebas, con un modelo falso.', 'Un modelo con las herramientas atadas, las instrucciones y una sesión.', 'Lo que contesta el agente a cada frase, las herramientas que llamó y los tokens.', 'evals herramientas',
         ['Crea el mismo modelo que <code>bot.py</code>, por LangChain, con las cuatro herramientas.', 'En cada frase de la persona, llama al modelo hasta que conteste sin herramientas, con un tope de seis vueltas.', 'Lleva dos historias a la par: la que va al modelo y la que ven las herramientas.', 'Para interrumpir, corta el último texto del agente en las dos historias.'])
    .from_file(rd('evals/charla.py'), [
        ('"""Una conversación', [('import json', 'Nada de Pipecat: los evals corren sin audio y sin servidor.')]),
        ('POR_NOMBRE = ', [('MAX_PASOS = 6', 'Seis llamadas al modelo por frase. Una reserva normal usa tres: ver, proponer y leer. Más de seis es un bucle, y el turno se corta.'),
                           ('m = init_chat_model(MODELOS["claude"]', 'El mismo modelo de <code>modelos.py</code>, ahora por LangChain. <code>max_retries=2</code>: un 529 de la API se reintenta, no hace fallar el caso.'),
                           ('esquemas = [{"type": "function"', 'Las definiciones de las herramientas en el formato que acepta <code>bind_tools</code>, armadas desde la misma lista que usa <code>bot.py</code>.')]),
        ('class Charla:', [('self.historia: list[dict] = []', 'La historia en dicts, como el contexto de Pipecat. Es la que recibe la regla.')]),
        ('    async def decir', [('r = await self.modelo.ainvoke(self.mensajes)', 'Una vuelta del bucle de <a href="' + IA0 + '#ae-tool-calling">IA00</a>: el modelo contesta o pide herramientas.'),
                                ('self.historia.append({"role": "assistant", "content": r.text})', 'Cada respuesta del modelo también va a la historia de dicts, aunque esté vacía porque solo pidió herramientas.'),
                                ('resultado = (await h["fn"](self.sesion, self.historia', 'La misma función que llama <code>bot.py</code>, con la misma forma de historia. Una herramienta que no existe es un error que vuelve al modelo.')]),
        ('    def interrumpir', [('if isinstance(m, AIMessage) and m.text and not m.tool_calls:', 'El último texto que el agente dijo en voz alta. Un mensaje que solo pide herramientas no suena, así que no se interrumpe.'),
                                ('dicho = m.text[:corte] if corte > 0', 'Sonó hasta antes de <code>hasta</code>. En el eval <code>interrumpe</code>, hasta antes de " a las ": la hora no llegó a sonar.'),
                                ('d["content"] = dicho', 'Las dos historias quedan iguales: el modelo y la regla ven lo mismo, como en Pipecat.')]),
    ]).html())
add(Walk('python', 'evals/dialogos.py', 'Seis diálogos con un guion de la persona, cada uno k veces, juzgados por cómo queda la agenda.',
         'Tú, con <code>uv run voz-evals --k 3</code>.', 'El modelo de <code>VOZ_MODELO</code> y <code>--k</code>.', 'Una línea por corrida, el resumen con pass^k y el costo, y un JSONL con cada corrida.', 'evals base',
         ['Fija hoy: el viernes 27 de noviembre de 2026.', 'Declara los seis casos con su guion, las citas que tienen que existir antes y cómo tiene que quedar la agenda.', 'Por cada corrida: vacía la tabla, carga las citas previas, corre el guion y compara la agenda.', 'Además, marca como mal un caso en el que el agente dice que reservó sin haberlo hecho.', 'Resume por caso y calcula pass^k y el costo.'])
    .from_file(rd('evals/dialogos.py'), [
        ('"""Los evals', [('Ojo: cada caso vacía la tabla', 'Los evals son destructivos: usan la base del laboratorio, no una aparte. No los corras con una cita que quieras conservar.')]),
        ('HOY = date(2026, 11, 27)', [('HOY = ', 'Un viernes. "El martes" es el 1 de diciembre, y el caso es el mismo cualquier día que lo corras.'),
                                     ('{"id": "reserva"', 'El camino feliz. Si este falla, los demás no importan todavía.'),
                                     ('{"id": "cambia"', 'Dice que no y pide otra hora. La agenda tiene que tener las 11:00 y no las 10:30.')]),
        ('    {"id": "duda"', [('"guion": [PIDE, "Mmm, déjame pensarlo."]', 'Ni sí ni no. Si el modelo confirma igual, la regla lo frena y la agenda queda vacía; el caso falla solo si el agente dice que reservó.'),
                                 ('("interrumpir", " a las ")', 'La persona habla encima antes de la hora y dice que sí. Con la regla, nada se reserva: el sí fue a una propuesta que no oyó entera.'),
                                 ('"previas": [(A_LAS(10, 30), "Luis Gómez")]', 'La hora ya es de otro. El agente tiene que decirlo, y la cita de Luis tiene que seguir igual.')]),
        ('def preparar', [('c.execute("TRUNCATE citas")', 'Con el rol de administrador, antes de cada corrida. Cada corrida empieza desde la misma agenda.'),
                          ('return {(inicio.astimezone(CFG.zona), paciente)', 'La agenda como un dict, para compararla de un golpe con lo que espera el caso.'),
                          ('return not hizo_algo and any(p in t', 'La segunda forma de fallar: la agenda está bien pero el agente le dijo a la persona que reservó. Por teléfono, eso es una persona que viene a una cita que no existe.')]),
        ('async def correr_caso', [('ok = final == caso["espera"] and not miente(ultimo, hizo_algo)', 'Se juzga el resultado, no el camino: no importa si el modelo llamó dos veces a <code>ver_disponibilidad</code>. El camino queda en el JSONL para mirarlo.')]),
        ('async def correr(', [('fila = await correr_caso(modelo, caso) | {"corrida": corrida}', '<code>|</code> junta dos dicts en uno nuevo: el resultado del caso más el número de corrida.')]),
        ('def resumen', [('pk = sum(all(v) for v in por_caso.values())', 'pass^k: la fracción de casos que salieron bien las k veces. Un caso que sale bien dos de tres no cuenta.'),
                         ('costo(CFG.modelo, entrada, salida)', 'El costo de toda la corrida con los precios de <code>modelos.py</code>. Con Ollama da cero; el costo es tu tiempo y tu luz.')]),
        ('def main', [('archivo = f"evals/dialogos-{CFG.modelo}.jsonl"', 'Un archivo por modelo. Así comparas Claude y Ollama sin pisar una corrida con la otra.')]),
    ]).html())
add(pydef('<code>A_LAS = lambda h, m=0: …</code> es una función de una línea, sin nombre propio, guardada en una variable. <code>A_LAS(10, 30)</code> da el martes a las 10:30 y <code>A_LAS(11)</code> el martes a las 11:00: el <code>m=0</code> es un valor por defecto. El comentario <code>noqa</code> le dice al linter que ya sabes que es una lambda.'))
add(predict('ia06-p-interrumpe'))
add(try_('uv run voz-evals --k 3\nVOZ_MODELO=ollama uv run voz-evals --k 3',
         'Una línea por corrida, como <code>reserva     corrida 1 de 3: bien  [\'ver_disponibilidad\', \'proponer_reserva\', \'confirmar\']</code>, dieciocho en total. Al final, cuántas de tres salió bien cada caso, <code>pass^3</code> sobre seis casos, los tokens y el costo. Anota los números de los dos modelos: son tuyos.'))
add(errs([
    ('psycopg.OperationalError: … port 55438 failed', 'La base no está arriba. Los evals la necesitan aunque no haya audio.'),
    ('(el agente no terminó el turno)', 'El modelo pidió herramientas seis veces seguidas sin contestar. Mira <code>llamadas</code> en el JSONL: suele ser <code>confirmar</code> una y otra vez después de un <code>hecho: False</code>.'),
]))
add(comparar('Mira dos columnas en los dos JSONL. Los casos: <code>interrumpe</code> y <code>duda</code> son los que más separan a los modelos, porque piden no hacer algo. Y las llamadas: si un modelo llama a <code>confirmar</code> en el mismo turno en que propone, la regla lo frena siempre, pero cada intento es una vuelta más del bucle, y en voz es una pausa más.'))
add(why('Evals en texto, con la persona como guion y la agenda como juez.',
        'Evals de voz con audio grabado, o un modelo que juzga la conversación. Lo primero mide Whisper y el VAD junto con el modelo, y no sabes cuál falló; lo segundo es otro modelo que puede equivocarse (<a href="' + M72 + '">M72</a>).',
        'Seis casos son pocos: un pass^3 de 1.00 con seis casos no dice que el agente no falle, dice que no falló en estos. Cada error que encuentres hablando con él es un caso nuevo para la lista.'))
add(done(['Un CSV con cada parte de cada turno, y la tabla con la mediana y el p95.', 'La comparación con el reparto de M24, parte por parte.', 'Seis diálogos repetidos k veces con cada modelo, juzgados por la agenda.', 'pass^k, los tokens y el costo de cada modelo, con el mismo comando.'],
         'uv run pytest -q\nuv run voz-latencias\nuv run voz-evals --k 3',
         'Las pruebas pasan, la tabla de latencias muestra tus dos modelos, y los evals terminan con su <code>pass^3</code>. Desde aquí, todo lo que cambies se mide con estos tres comandos.'))

# ------------------------------------------------------------------ viaje
add('<h2 id="viaje">El viaje de un dato</h2>\n')
add('<p>El caso principal con la parte difícil: la persona interrumpe la propuesta, oye la versión completa y recién entonces dice que sí. Sigue la hora de la cita, "10:30", desde que la persona la dice hasta que queda en la base.</p>\n')
add(figure(seq('fi06s', 'Una reserva con una interrupción', 'La persona pide las 10:30. El modelo consulta y propone; mientras Piper lee la pregunta, la persona dice que sí antes de oír la hora. Pipecat corta el audio y guarda la frase truncada. El modelo llama a confirmar, la regla dice que no oyó la propuesta entera, el modelo la lee completa, la persona dice que sí y confirmar inserta la cita con su clave.',
    [('pe', 'Persona'), ('pc', 'Pipecat'), ('mo', 'Modelo'), ('he', 'Herramientas'), ('re', 'La regla'), ('pg', 'PostgreSQL')],
    [('pe', 'pc', 'audio: el martes a las 10:30', 'req'),
     ('pc', 'mo', 'texto, tras el fin de turno', 'req'),
     ('mo', 'he', 'ver_disponibilidad', 'req'),
     ('he', 'pg', 'SELECT citas activas', 'req'),
     ('mo', 'he', 'proponer_reserva 10:30', 'req'),
     ('he', 'mo', 'leer: ¿Le reservo…?', 'res'),
     ('mo', 'pc', 'la pregunta completa', 'req'),
     ('pc', 'pe', 'audio hasta "diciembre"', 'res'),
     ('pe', 'pc', '"sí" encima', 'fail'),
     ('note', 'pc', 'corta el audio; guarda lo que sonó'),
     ('mo', 'he', 'confirmar()', 'req'),
     ('he', 're', 'historia y propuesta', 'req'),
     ('re', 'he', 'no oyó la propuesta entera', 'fail'),
     ('mo', 'pc', 'la lee de nuevo, completa', 'req'),
     ('pe', 'pc', '"sí"', 'req'),
     ('mo', 'he', 'confirmar()', 'req'),
     ('re', 'he', 'ok', 'res'),
     ('he', 'pg', 'INSERT … ON CONFLICT (clave)', 'req'),
     ('pg', 'he', 'id de la cita', 'res'),
     ('mo', 'pc', 'Listo, quedó reservada.', 'req')]),
    '<b>Figura IA06.14.</b> La regla aparece dos veces. La primera dice que no, porque en la historia la pregunta termina en "diciembre". La segunda dice que sí. La base no se entera de la primera.'))
add(table(['Paso', 'De → a', 'Qué viaja', 'Dónde queda'], [
    ['1', 'Persona → Pipecat', 'Audio Opus por UDP, en cuadros de 20 ms', 'En memoria, hasta el fin de turno'],
    ['2', 'Pipecat → modelo', '<code>Quiero una cita con la doctora Ruiz el martes a las diez y media</code>, o como lo escriba Whisper', 'En el contexto, como mensaje de <code>user</code>'],
    ['3 y 4', 'Modelo → herramientas → PostgreSQL', '<code>{"profesional": "ruiz", "fecha": "2026-12-01"}</code> y la consulta de las citas activas', 'Nada nuevo: solo se lee'],
    ['5 y 6', 'Modelo → herramientas', '<code>{"inicio": "2026-12-01T10:30", …}</code>; vuelve la pregunta', 'La propuesta, en la sesión'],
    ['7 a 9', 'Modelo → Pipecat → persona', 'La pregunta, frase por frase, a Piper y como audio', 'En el contexto, solo hasta "diciembre"'],
    ['10 a 12', 'Herramientas → la regla', 'La historia truncada y la propuesta', 'Nada: la regla dice que no y la base no se toca'],
    ['13 a 15', 'Modelo → persona → modelo', 'La pregunta entera, y el "sí"', 'En el contexto, completa y después la respuesta'],
    ['16 a 18', 'Herramientas → PostgreSQL', '<code>INSERT</code> con la franja <code>[16:30, 17:00)</code> en UTC y la clave', 'Una fila en <code>citas</code>, <code>activa</code>'],
    ['19', 'Modelo → persona', 'La confirmación, en voz', 'En el contexto'],
]))

# ------------------------------------------------------------------ decisiones
add('<h2 id="decisiones">Las decisiones, guiadas</h2>\n')
add('<p>Ocho decisiones de esta guía, como preguntas. Cada una dice por qué, y cuándo la otra opción sería mejor.</p>\n')
add('<div data-exercise="ia06-voz"></div>\n')
