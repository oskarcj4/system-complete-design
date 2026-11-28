# IA06, parte 4: cómo comprobar, limitaciones, repositorio y conexiones.
add('<h2 id="comprueba">Cómo comprobar que funciona</h2>\n')
add('<p>Tres capas, de la más barata a la más cara. Las pruebas corren sin modelo y sin audio, en segundos. Las fallas provocadas rompen una pieza a propósito y miran que el resto aguante. Los evals del <a href="#paso-evals">paso 8</a> miden al modelo, repitiendo cada caso.</p>\n')

# ---------------- pruebas
add('<h3 id="comprueba-pruebas">Las pruebas, sin modelo</h3>\n')
add(step_map('regla herramientas base latencia', 'Funciones, una agenda en memoria y un modelo que responde con un guion.', 'Verde o rojo, en segundos.', 'Nada, salvo <code>test_agenda.py</code>, que vacía la tabla.', '<a href="' + IA0 + '#ae-pass-k">El modelo falso</a>', '30 min'))
add('<p>Seis archivos en <code>tests/</code>. Uno es de dobles: una agenda que vive en un dict y un modelo falso que devuelve, en orden, lo que dice su guion. Con los dos, las herramientas y la regla se prueban de punta a punta sin red y sin tokens.</p>\n')
add(Walk('python', 'tests/falsos.py', 'Una agenda en memoria con las mismas funciones que <code>agenda.py</code>, y un modelo que responde con un guion.',
         '<code>test_herramientas.py</code>.', 'Las mismas llamadas que la base y que el modelo.', 'Los mismos resultados, sin PostgreSQL y sin tokens.', 'herramientas',
         ['La agenda guarda las citas en un dict y reproduce la clave y el choque.', 'El modelo falso devuelve el siguiente paso del guion: un texto o una lista de llamadas.'])
    .from_file(rd('tests/falsos.py'), [
        ('"""Dobles', [('async def __call__(self, fn, *args):', 'Reemplaza a <code>_con_db</code>: recibe la función de <code>agenda.py</code> y llama a la suya con el mismo nombre.'),
]),
        ('    def reservar', [('if c[4] == clave:', 'La misma clave devuelve la misma cita, como <code>ON CONFLICT</code>.')]),
        ('class ModeloFalso:', [('class ModeloFalso:', 'Un guion por prueba. Si el código llama al modelo más veces de las previstas, la prueba falla con un mensaje claro.'),
                           ('llamadas = [{"name": n', 'Una lista de pares (nombre, argumentos) se vuelve un mensaje con <code>tool_calls</code>, como los que devuelve LangChain.')]),
    ]).html())
add(whole('python', 'tests/test_fechas.py', rd('tests/test_fechas.py'), 'Las franjas, la hora en palabras y la lectura de fechas.', 'pytest.', 'Nada.', 'Seis pruebas.', 'regla'))
add(whole('python', 'tests/test_confirmar.py', rd('tests/test_confirmar.py'), 'Qué es un sí y cuándo se puede confirmar, con historias escritas a mano.', 'pytest.', 'Nada.', 'Las pruebas de la regla.', 'regla'))
add(whole('python', 'tests/test_herramientas.py', rd('tests/test_herramientas.py'), 'Las herramientas con la agenda falsa y el modelo falso: proponer no reserva, el sí reserva una vez, la interrupción no reserva.', 'pytest.', 'Nada.', 'Siete pruebas.', 'herramientas regla'))
add(whole('python', 'tests/test_agenda.py', rd('tests/test_agenda.py'), 'La agenda contra la base de verdad: la clave, la carrera, cancelar y los permisos del rol.', 'pytest, con la base arriba.', 'Nada.', 'Seis pruebas, o <code>skipped</code> sin la base.', 'base'))
add(whole('python', 'tests/test_latencia.py', rd('tests/test_latencia.py'), 'El percentil, la suma de partes repetidas y que el saludo no se anote.', 'pytest.', 'Nada.', 'Cuatro pruebas.', 'latencia'))
add(try_('uv run pytest -q', 'Todas pasan. Con la base apagada, las seis de <code>test_agenda.py</code> salen como <code>skipped</code> con el motivo <code>PostgreSQL no está arriba</code>. Ninguna gasta tokens.'))
add(errs([('ModuleNotFoundError: No module named \'falsos\'', 'Corre pytest desde <code>ia06-voz/</code> y sin <code>tests/__init__.py</code>: pytest agrega la carpeta de cada prueba al camino de importación.')]))

# ---------------- fallas
add('<h3 id="comprueba-fallas">Las fallas, provocadas</h3>\n')
add(step_map('navegador vad stt base regla', 'Un cambio a propósito.', 'Lo que tiene que pasar, y por qué.', 'Lo que deshaces al final de cada una.', '<a href="#ae-turnos">El fin de turno</a>', '40 min'))
add(fail(1, 'dos personas, la misma hora',
    'Corre <code>uv run python caos.py vaciar</code> y después <code>uv run python caos.py carrera</code> cinco veces seguidas.',
    'La primera corrida da una persona <code>reservada</code> y la otra <code>ocupada</code>; las siguientes, <code>ocupada</code> a las dos, porque la hora ya es de alguien.',
    'Sin la restricción, las dos personas oirían "listo" y llegarían al consultorio a la misma hora. Para verlo, borra la línea <code>CONSTRAINT sin_choque</code> de <code>init.sql</code>, recrea la base con <code>docker compose down -v</code> y <code>up -d</code>, y corre <code>carrera</code>: las dos salen <code>reservada</code>.',
    'Vuelve a poner la línea y recrea la base.'))
add(fail(2, 'la confirmación llega dos veces',
    'Corre <code>uv run python caos.py repetir</code>.',
    'La segunda devuelve <code>repetida</code> con el mismo id que la primera, y en la tabla hay una sola cita.',
    'Un timeout entre la herramienta y la base hace que se reintente, y el reintento no puede crear otra cita.',
    'Nada que deshacer.'))
add(fail(3, 'un silencio de fin de turno largo',
    'Pon <code>VOZ_SILENCIO=0.8</code> en <code>.env</code>, reinicia <code>bot.py</code> y haz tres llamadas cortas.',
    'El agente tarda más en contestar, siempre: unos 0.6 s más que antes por turno. En <code>uv run voz-latencias</code>, la fila de <code>endpointing_wait</code> sube y arrastra al total. A cambio, puedes pensar a mitad de frase sin que te corte.',
    'El silencio es parte del presupuesto, no un detalle de configuración: está entero en cada turno.',
    'Vuelve a <code>0.2</code>.'))
add(fail(4, 'sin auriculares',
    'Quita los auriculares y usa los parlantes de la computadora a buen volumen. Pide una cita.',
    'Según tu micrófono y el volumen, el agente se corta solo: el VAD oye su propia voz y la toma como una interrupción. El navegador cancela parte del eco, pero no siempre alcanza. En la terminal aparece <code>Interrumpido. Llegó a sonar: …</code> sin que hayas hablado.',
    'Una llamada de verdad tiene ruido, eco y gente al lado. Por eso hay modelos de fin de turno y filtros de ruido además del VAD (<a href="' + M24 + '#interrupciones-falsas">24.9</a>).',
    'Vuelve a los auriculares.'))
add(fail(5, 'Whisper oye mal una fecha',
    'Pide una cita diciendo la hora rápido o con ruido de fondo: "el martes a las dos y media".',
    'A veces Whisper escribe otra hora o otro día. El agente propone lo que entendió y lo lee en voz alta: ahí lo oyes mal y dices que no. La agenda no cambia hasta que la pregunta suena bien y dices que sí.',
    'La confirmación hablada no es cortesía: es la única forma en que la persona ve lo que entendió la máquina.',
    'Nada que deshacer; si se reservó algo, <code>caos.py vaciar</code>.'))
add(fail(6, 'interrumpir la propuesta',
    'Cuando el agente empieza "¿Le reservo con la doctora Ruiz el martes…", di "sí" antes de la hora.',
    'El agente se calla. En la terminal: <code>Interrumpido. Llegó a sonar: \'¿Le reservo con la doctora Ruiz el martes…\'</code>, y si el modelo llama a <code>confirmar</code>, <code>\'hecho\': False</code> con el motivo. El agente vuelve a leer la pregunta completa.',
    'Es el caso <code>interrumpe</code> de los evals, ahora con audio. La regla lee lo que sonó, no lo que se escribió.',
    'Nada que deshacer.'))

# ---------------- evals
add('<h3 id="comprueba-evals">Los evals, con los dos modelos</h3>\n')
add(step_map('evals', 'Los seis casos y k.', 'pass^k, tokens y costo por modelo.', 'La tabla <code>citas</code>.', '<a href="' + IA0 + '#ae-pass-k">pass^k</a>', '20 min'))
add('<p>Corre los dos comandos del <a href="#paso-evals">paso 8</a> y llena esta tabla con tus números. Una fila por caso: cuántas de k salieron bien con cada modelo.</p>\n')
add(table(['Caso', 'Qué prueba', 'Claude, de 3', 'Ollama, de 3'], [
    ['reserva', 'El camino feliz', '', ''], ['cambia', 'Un no y otra hora', '', ''], ['duda', 'Ni sí ni no', '', ''],
    ['interrumpe', 'Un sí a algo que no oyó', '', ''], ['ocupada', 'La hora es de otro', '', ''], ['cancela', 'Cancelar con confirmación', '', ''],
    ['pass^3', '', '', ''],
]))
add(comparar('Un caso que sale mal con un modelo y bien con el otro no es suerte: abre el JSONL y compara las llamadas. Casi siempre la diferencia está en una de dos cosas: el modelo no lee la pregunta tal cual, o dice que reservó cuando <code>confirmar</code> devolvió <code>hecho: false</code>.'))

# ---------------- limitaciones
add('<h2 id="limitaciones">Limitaciones</h2>\n')
add('<h3 id="lim-no-hace">Lo que no hace</h3>\n')
add('<ul>\n<li>No atiende teléfono de verdad: el navegador hace de teléfono. Una línea real necesita un proveedor de telefonía y SIP o un servicio de medios (<a href="' + M24 + '#transporte-telefono">24.4</a>).</li>\n<li>No mueve citas: mover es cancelar y reservar, dos confirmaciones.</li>\n<li>No rechaza fechas pasadas ni feriados: <code>franjas_del_dia</code> solo mira si es fin de semana.</li>\n<li>No identifica a la persona: cualquiera que diga "soy Ana Pérez" puede cancelar la cita de Ana.</li>\n<li>No simula una red mala: en <code>localhost</code> no hay pérdida ni jitter.</li>\n</ul>\n')
add('<h3 id="lim-se-rompe">Dónde se rompe</h3>\n')
add('<ul>\n<li>Nombres y números que Whisper oye mal. La confirmación hablada lo hace visible, no lo arregla.</li>\n<li>Palabras de sí o de no que no están en las listas de <code>confirmar.py</code>: "ándale", "va", "nel".</li>\n<li>Eco sin auriculares (falla 4).</li>\n<li>Una llamada larga: el contexto crece con cada turno y cada turno paga todo el historial.</li>\n</ul>\n')
add('<h3 id="lim-riesgos">Riesgos que quedan</h3>\n')
add('<ul>\n<li>Datos personales: con Claude salen de tu máquina el nombre y la cita. En producción, el consultorio tiene que avisarlo al principio de la llamada.</li>\n<li>Suplantación: sin un segundo dato (teléfono, fecha de nacimiento), cancelar es fácil para otra persona.</li>\n<li>Prompt injection hablada: alguien puede decir "ignora tus instrucciones". Lo peor que logra es lo que permiten las herramientas y la regla: proponer y, con un sí a una propuesta entera, reservar o cancelar.</li>\n</ul>\n')
add('<h3 id="lim-costo">Costo y latencia, con la cuenta a mano</h3>\n')
add('<p>Supuestos, no mediciones: una llamada de 8 turnos de la persona, unas 2 llamadas al modelo por turno, unos 1 500 tokens de entrada por llamada (instrucciones, herramientas e historial) y 60 de salida.</p>\n')
add(table(['Cuenta', 'Resultado'], [
    ['Llamadas al modelo', '8 × 2 = 16'],
    ['Entrada', '16 × 1 500 = 24 000 tokens → 24 000 × 0.10 / 1 000 000 = 0.0024 USD'],
    ['Salida', '16 × 60 = 960 tokens → 960 × 0.50 / 1 000 000 = 0.00048 USD'],
    ['Por llamada, con Haiku 5.5 ' + DOC, 'unos 0.003 USD'],
    ['1 000 llamadas al mes', 'unos 3 USD de modelo; Whisper y Piper, en tu máquina'],
], right=(1,)))
add('<p>La latencia no se calcula a mano: depende de tu máquina. La tabla del <a href="#paso-latencia">paso 7</a> es la medición; el reparto de M24, la referencia.</p>\n')
add('<h3 id="lim-produccion">Qué cambia en producción</h3>\n')
add('<ul>\n<li>Un servidor de medios y workers con GPU, uno por llamada activa (<a href="' + M24 + '#sesion-worker">24.10</a>).</li>\n<li>Telefonía: SIP, números y grabación con consentimiento.</li>\n<li>Un modelo de fin de turno además del VAD, y cancelación de ruido.</li>\n<li>Identificar a la persona antes de cancelar.</li>\n<li>Los turnos, los feriados y los profesionales en tablas.</li>\n<li>Métricas por llamada en un sistema de observabilidad, no en un CSV.</li>\n</ul>\n')
add(done(['Pruebas sin modelo, fallas provocadas y evals con los dos modelos.', 'Las latencias medidas contra el presupuesto.', 'Los límites de la guía, escritos.'],
         'uv run pytest -q && uv run voz-latencias && uv run voz-evals --k 3',
         'Las pruebas pasan, la tabla de latencias y el <code>pass^3</code> salen con tus números.'))

add(repo_box('ia06', 'Lo que tiene que funcionar para darla por terminada:', [
    ('pruebas', '<code>uv run pytest -q</code> pasa, con la base arriba.'),
    ('carrera', '<code>caos.py carrera</code> deja una sola cita.'),
    ('llamada', 'Reservaste una cita por voz desde el navegador.'),
    ('interrupcion', 'Interrumpiste la propuesta y el agente no reservó hasta leerla entera.'),
    ('latencias', 'Llenaste la tabla del paso 7 con los dos modelos.'),
    ('evals', 'Corriste los evals con k = 3 con los dos modelos.'),
]))
add(connect([
    ('IA00, el laboratorio', 'El bucle de herramientas, el modelo falso y pass^k, que aquí vuelven sin cambios. <a href="' + IA0 + '">IA00</a>.'),
    ('IA03, soporte que reembolsa', 'La aprobación antes de actuar y la clave del pago. Aquí la aprobación es una frase de la persona y no un botón. <a href="' + IA3 + '">IA03</a>.'),
    ('IA02 e IA05', 'Los roles de PostgreSQL como barrera, y los evals con un set fijo. <a href="' + IA2 + '">IA02</a> y <a href="' + IA5 + '">IA05</a>.'),
    ('Los módulos', '<a href="' + M24 + '">M24</a> para la voz en tiempo real, <a href="' + M25 + '">M25</a> para los agentes y <a href="' + M72 + '">M72</a> para los evals. En el glosario, <a href="../glosario.html#t-exclusion-constraint">restricción de exclusión</a>.'),
]))
