# IA05, parte 4: cómo comprobar, limitaciones, repositorio, conectar y el anexo de las preguntas.
add('<h2 id="comprueba">Cómo comprobar que funciona</h2>\n')
add('<p>Cuatro capas, de la más barata a la más cara. Las pruebas sin modelo no gastan un token. La base se prueba con sus roles de verdad. Las fallas rompen el índice a propósito y miran qué capa de los evals lo nota. Y los evals de respuesta ponen al modelo y al juez frente a las 40 preguntas.</p>\n')
add(table(['Capa', 'Qué prueba', 'Qué necesita', 'Cuánto tarda'], [
    ['<code>test_ingerir.py</code>, <code>test_trocear.py</code>', 'Secciones, títulos, lo que se salta, y las dos formas de trocear', 'Nada: HTML y secciones armadas en la prueba', 'Menos de un segundo'],
    ['<code>test_metricas.py</code>, <code>test_verificar.py</code>', 'RRF, recall, MRR, el intervalo, el kappa y las citas', 'Nada', 'Menos de un segundo'],
    ['<code>test_pipeline.py</code>', 'El orden de la tubería, los tokens, el ' + RRer + ' y el sobre', 'Nada: un modelo de guion y un recuperar falso', 'Menos de un segundo'],
    ['<code>test_base.py</code>', 'Que el lector no escribe, el tsvector y el largo del vector', 'El PostgreSQL del compose; si no está, se salta', 'Unos segundos'],
    ['<code>evals.recuperacion</code>', '36 preguntas contra la búsqueda', 'La base indexada y Ollama', 'Lo que tarden 72 embeddings'],
    ['<code>evals.respuestas</code>', '40 preguntas, k veces, con el juez', 'Todo, y un modelo de chat', 'Minutos; depende del modelo'],
]))

# ---------------- pruebas
add('<h3 id="comprueba-pruebas">Las pruebas, sin modelo ni red</h3>\n')
add(step_map('ingesta consulta verif', 'HTML, secciones y trozos armados en la prueba, y un guion de respuestas.', '31 pruebas que pasan o fallan.', 'Nada.', '<a href="' + IA0 + '#ae-pass-k">el modelo falso</a> de IA00', '35 min'))
add('<p>El modelo falso es el mismo de <a href="' + IA3 + '#comprueba-pruebas">IA03</a>, adaptado a la salida estructurada: cada <code>with_structured_output(...).invoke</code> devuelve el siguiente elemento de un guion, y anota con qué esquema se lo pidieron. Las pruebas importan <code>falsos</code> sin el prefijo <code>tests.</code>: pytest agrega la carpeta de cada prueba al camino de importación, y por eso <code>tests/</code> no lleva <code>__init__.py</code>.</p>\n')
add(Walk('python', 'tests/falsos.py', 'Un modelo de chat falso que contesta con un guion y anota cada pedido.', 'Las pruebas del pipeline.', 'Una lista de respuestas ya armadas.', 'Lo mismo que devuelve LangChain con <code>include_raw=True</code>.', 'modelo',
         ['Arma un mensaje crudo con 100 tokens de entrada y 10 de salida.', 'Cada pedido saca la siguiente respuesta del guion y anota el esquema.', 'Falla si el código no pide <code>include_raw</code>.'])
    .from_file(rd('tests/falsos.py'), [
        ('"""Un modelo falso', [('self.usage_metadata = {"input_tokens": entrada', 'Siempre 100 y 10: las pruebas pueden sumar los tokens de dos llamadas y saber cuánto tiene que dar.'),
                                ('raise AssertionError(f"El guion se terminó', 'Una llamada de más al modelo es un error de la prueba, no un <code>IndexError</code> difícil de leer.'),
                                ('"parsing_error": None if salida is not None', 'Un elemento <code>None</code> en el guion imita a un modelo que devolvió algo que no se pudo leer.')]),
        ('class ModeloFalso:', [('assert include_raw', 'Si alguien quita <code>include_raw=True</code>, el código dejaría de contar tokens sin que nada fallara. Aquí falla.')]),
    ]).html())
add(Walk('python', 'tests/test_ingerir.py', 'Prueba el parser con una página chica que tiene cada cosa que se salta.', 'pytest.', 'Una página de juguete.', 'Cinco pruebas.', 'ingesta',
         ['Arma una página con un menú, objetivos, una sección con figura, widget y aviso, otra con un <code>br</code> en el título, y "Comprueba".', 'Comprueba las citas, los títulos, el texto, el corte y los nombres de página.'])
    .from_file(rd('tests/test_ingerir.py'), [
        ('from docs.ingerir', [('<div data-sim="durable">', 'Un widget con texto adentro: no puede aparecer en la sección.')]),
        ('def test_cada_encabezado', [('assert texto.splitlines() == [', 'El párrafo y el pie de la figura, uno por línea. Ni el texto del SVG, ni el del widget, ni el del aviso.')]),
    ]).html())
add(Walk('python', 'tests/test_trocear.py', 'Prueba las dos formas de trocear con doce palabras en dos secciones.', 'pytest.', 'Dos secciones de juguete.', 'Cuatro pruebas.', 'ingesta',
         ['Dos secciones: siete palabras en dos párrafos y cinco en uno.', 'Por sección: no parte si cabe; si no cabe, parte entre párrafos.', 'Fijo: la tercera ventana cruza de sección y se cita por la primera.'])
    .from_file(rd('tests/test_trocear.py'), [
        ('import pytest', [('A = Seccion("m08", "colas"', 'El <code>\\n</code> separa dos párrafos: <code>por_seccion</code> puede partir ahí.')]),
        ('def test_fijo_cruza', [('assert trozos[2].texto == "siete ocho nueve diez once"', 'La <a href="#paso-trocear">figura IA05.13</a>: empieza en la última palabra de colas y sigue en breaker.')]),
    ]).html())
add(Walk('python', 'tests/test_metricas.py', 'Prueba RRF y las métricas con cuentas que se pueden hacer a mano.', 'pytest.', 'Listas cortas.', 'Siete pruebas.', 'evals',
         ['RRF con dos listas y con un empate.', 'Recall, acierto y rango sobre tres citas.', 'El intervalo, pass^k y el kappa de la figura IA05.10.'])
    .from_file(rd('tests/test_metricas.py'), [
        ('import pytest', [('assert fusionar([[1, 2, 3], [3, 1, 4]], k=60) == [1, 3, 2, 4]', 'La cuenta está en el comentario de arriba: es la misma de la <a href="#ae-rrf">figura IA05.8</a>, con números.')]),
        ('def test_intervalo', [('assert kappa(juez, persona) == pytest.approx(0.24 / 0.44)', '<code>pytest.approx</code> compara con tolerancia: dos cuentas de punto flotante casi nunca dan el mismo último decimal.')]),
    ]).html())
add(Walk('python', 'tests/test_verificar.py', 'Prueba cada regla del verificador con un trozo y una frase.', 'pytest.', 'Un trozo de M08 y respuestas armadas.', 'Siete pruebas.', 'verif',
         ['Un trozo y su frase.', 'Una prueba por regla: vale, normaliza, no es de un trozo, no está, es corta, falta la frase, no cita.'])
    .from_file(rd('tests/test_verificar.py'), [
        ('from docs.buscar', [('def respuesta(texto, *citas, sin=False):', 'Una ayuda para armar respuestas en una línea: <code>*citas</code> recibe cualquier cantidad de pares.')]),
        ('def test_una_cita_que_no_se_recupero', [('def test_responder_sin_citas_no_vale_pero_abstenerse_si', 'Las dos caras de la misma regla: sin citas solo vale si se abstiene.')]),
    ]).html())
add(Walk('python', 'tests/test_pipeline.py', 'Prueba la tubería con el modelo de guion y un recuperar que anota cuántos trozos le pidieron.', 'pytest.', 'Dos trozos de M25 y guiones.', 'Cinco pruebas.', 'consulta modelo verif',
         ['Dos trozos y una respuesta bien citada.', 'Un recuperar falso que anota los pedidos.', 'Sin reordenar, una llamada; con reordenar, veinte candidatos y dos llamadas.', 'Si el ' + RRer + ' falla, queda el orden; sin trozos, no hay llamada; un trozo no cierra su sobre.'])
    .from_file(rd('tests/test_pipeline.py'), [
        ('from docs.buscar', [('from falsos import ModeloFalso', 'Sin <code>tests.</code>: ver arriba.')]),
        ('class Recuperar:', [('self.pedidos.append(cuantos)', 'Lo que se prueba es cuántos le pidió el pipeline: 6 sin reordenar, 20 con.')]),
        ('def test_reordenar', [('assert recuperar.pedidos == [20] and r.trozos == [B]', 'B tenía puntaje 3 y A 1: B queda primero aunque la búsqueda trajo A antes.'),
                                ('modelo = ModeloFalso([None, BIEN])', 'El primer elemento del guion es la respuesta del ' + RRer + ': <code>None</code>, no se pudo leer.')]),
        ('def test_un_trozo_no_puede', [('assert pedido.count("</trozo>") == 2', 'Dos trozos, dos cierres: el del texto envenenado quedó como <code>\\u003c/trozo&gt;</code>.')]),
    ]).html())
add(Walk('python', 'tests/test_base.py', 'Prueba tres cosas que hace la base y no el código: el permiso, el tsvector y el largo del vector.', 'pytest, si la base está levantada.', 'El PostgreSQL del compose.', 'Tres pruebas, o tres saltadas.', 'base',
         ['Se conecta con cada rol; si la base no está, salta la prueba.', 'El lector no puede insertar.', 'El tsvector encuentra "reintento" en un texto con "reintentos", sin dejar la fila.', 'Un vector de 3 números no entra.'])
    .from_file(rd('tests/test_base.py'), [
        ('"""Pruebas contra PostgreSQL', [('pytest.skip("PostgreSQL no está levantado', 'Sin base, las tres se saltan: las otras 28 siguen corriendo en cualquier máquina.')]),
        ('def test_el_lector_no_puede_escribir', [('c.transaction(force_rollback=True)', 'La fila de prueba se deshace al salir: la tabla queda como estaba, aunque la prueba falle.'),
                                                 ('pytest.raises(psycopg.Error)', 'El error exacto depende de la versión de pgvector; lo que importa es que no entra.')]),
    ]).html())
add(try_('uv run pytest -q', 'Con la base levantada, <code>31 passed</code>. Sin la base, <code>28 passed, 3 skipped</code>. Ninguna gasta tokens ni llama a Ollama.'))

# ---------------- fallas
add('<h3 id="comprueba-fallas">Las fallas, provocadas</h3>\n')
add(step_map('base evals verif juez', 'El índice de la variante <code>seccion</code> con prefijo.', 'Cuatro fallas, cada una vista por una capa distinta, o por ninguna.', 'La base; cada falla dice cómo deshacerla.', '<a href="#ae-capas">Dos capas de evals</a>', '40 min'))
add('<p><code>caos.py</code> rompe el índice de tres formas que pasan en la vida real: un documento viejo que nadie borró, una página que no se indexó y un modelo de embeddings que cambió. Se conecta con el rol del indexador, como un proceso de ingesta con un bug.</p>\n')
add(Walk('python', 'caos.py', 'Agrega un trozo que contradice al curso, borra una página del índice o deshace lo primero.', 'Tú, en las fallas 1 y 2.', 'El nombre de la falla y, para olvidar, una página.', 'Filas agregadas o borradas en <code>trozos</code>.', 'base ingesta',
         ['Define un trozo viejo que define pass^k como si fuera pass@k.', 'Lo inserta en las dos variantes de <code>seccion</code>, con su embedding.', 'Borra todas las filas de una página, o el trozo viejo.'])
    .from_file(rd('caos.py'), [
        ('"""Rompe el índice', [('VIEJO = Trozo("notas", "pass-k"', 'Una página que no existe en el curso, <code>notas</code>, con una definición al revés: con k = 5 y p = 0.5, 1 − 0.5<sup>5</sup> = 0.97 es pass@k; pass^k sería 0.5<sup>5</sup> = 0.03.')]),
        ('def contradiccion(', [('ON CONFLICT DO NOTHING', 'Correrla dos veces no duplica el trozo: choca con la clave única y no hace nada.'),
                                ('n = c.execute("DELETE FROM trozos WHERE pagina = %s"', 'Todas las variantes de la página. Vuelve con <code>docs indexar</code>, una variante por vez.')]),
        ('if __name__ == "__main__":', [('with psycopg.connect(CFG.db_indexador) as conexion:', 'El indexador: el lector no podría hacer nada de esto, y es lo que prueba la falla 4.')]),
    ]).html())
add(fail(1, 'un documento viejo que contradice',
    '<code>uv run python caos.py contradiccion</code>, y después <code>uv run docs buscar "¿Qué es pass^k?" --n 10</code> y <code>uv run docs preguntar "¿Qué es pass^k?"</code>.',
    'La búsqueda trae <code>notas#pass-k</code> entre los diez: comparte las palabras de la pregunta. Si el modelo lo usa, la cita <code>[notas#pass-k]</code> pasa el verificador, porque la frase está en un trozo recuperado. Lo que tiene que notarlo es el juez: corre <code>evals.respuestas --k 3</code> y mira las corridas de <code>p33</code> en el JSONL. Si el modelo prefirió los trozos del curso, también es un dato: anótalo.',
    'El verificador comprueba que la cita existe, no que sea verdad. Un índice con documentos viejos da respuestas bien citadas y equivocadas, y solo un eval de respuesta lo ve.',
    'Deshazlo con <code>uv run python caos.py deshacer</code>.'))
add(fail(2, 'una página que no se indexó',
    '<code>uv run python caos.py olvidar m27</code> y <code>uv run python -m evals.recuperacion</code>.',
    'Las preguntas cuyo oro está en M27 (<code>p29</code> y <code>p30</code>, la idempotencia de Stripe y el ledger) aparecen en la columna de las que fallan, en los tres modos. Después pregúntalas con <code>docs preguntar</code>: el modelo puede contestar bien igual, con secciones de M39 o de las guías de pagos, que también hablan de idempotencia.',
    'Una caída en la primera capa avisa sin gastar un token. Y si la respuesta sale correcta con otra sección, el oro estaba incompleto: es el eval el que hay que arreglar, agregando esa sección al oro.',
    'Vuelve con <code>uv run docs indexar</code> y las otras variantes que tenías.'))
add(fail(3, 'otro modelo de embeddings',
    '<code>ollama pull all-minilm</code> y <code>DOCS_EMBEDDINGS=all-minilm uv run docs indexar</code>; después, <code>DOCS_EMBEDDINGS=all-minilm uv run docs buscar "¿Qué es pass^k?" --modo semantica</code>.',
    'El indexado termina con <code>all-minilm da 384 números y la columna espera 768.</code> antes de tocar la base: la variante vieja sigue entera. La búsqueda falla con <code>psycopg.errors.DataException: different vector dimensions …</code>: un vector de 384 contra una columna de 768.',
    'El error ruidoso es el bueno. Dos modelos con el mismo largo, en cambio, se mezclarían sin un error: los vectores se comparan, y la búsqueda devuelve trozos al azar. Guarda el nombre del modelo con el índice, o en una tabla aparte, si vas a cambiarlo.',
    'No hay nada que deshacer: sin la variable, todo vuelve a <code>nomic-embed-text</code>.'))
add(fail(4, 'el lector intenta borrar',
    '<code>docker compose exec postgres psql -U docs_lector -d docs -c "DELETE FROM trozos"</code>.',
    '<code>ERROR:  permission denied for table trozos</code>, y la cuenta de filas no cambia.',
    'El pipeline, la API y los evals usan este rol. Si un bug, o un trozo que convenció al modelo de algo, llegara a ejecutar SQL, lo peor que puede hacer es leer.',
    'No hay nada que deshacer.'))

# ---------------- evals
add('<h3 id="comprueba-evals">Los evals, en dos capas</h3>\n')
add(step_map('evals consulta modelo juez', 'Las 40 preguntas y tu juez calibrado.', 'Las dos tablas, por variante y por modelo.', 'Archivos en <code>evals/</code>.', '<a href="#ae-capas">Dos capas de evals</a> y <a href="' + IA0 + '#ae-pass-k">pass^k</a>', '1 h'))
add('<p>Ya corriste las dos capas en los pasos <a href="#paso-recuperacion">6</a> y <a href="#paso-juez">12</a>. Aquí se juntan en una sola lectura. Primero la recuperación de la variante que vas a usar; después, sobre esa misma, la respuesta con cada modelo. Si una pregunta falla en las dos capas, el problema es la búsqueda. Si solo falla en la segunda, es el modelo o el oro.</p>\n')
add(table(['Modelo', 'Correctas ± margen', 'Citas válidas', 'Se abstiene si no está', 'Se abstiene si está', 'pass^3', 'Costo'], [
    ['Claude', '', '', '', '', '', ''], ['Ollama', '', '', '', '', '', '—'], ['Claude, con reordenar', '', '', '', '', '', ''],
], right=(1, 2, 3, 4, 5, 6)))
add('<p>Tres cosas para mirar. La abstención va en las dos direcciones: un sistema que se abstiene siempre tiene 1.0 en la primera y es inútil. pass^3 pide correcta y bien citada en las tres corridas; es más bajo que las correctas y es el número que más se parece a "puedo confiar en esto". Y el costo del juez se suma al del modelo: los evals de respuesta cuestan más que una sesión de preguntas.</p>\n')
add('<h3 id="comprueba-experimentos">Experimentos para seguir</h3>\n')
add('<p>Cada uno cambia una sola cosa. Corre primero la recuperación, que es gratis; la respuesta, solo si la primera cambió.</p>\n')
add(table(['Experimento', 'Cómo', 'Qué mirar'], [
    ['Trozos más chicos', '<code>DOCS_MAX_PALABRAS=150 uv run docs indexar</code>', 'Más trozos por sección: ¿sube el MRR, o se pierde el contexto que hacía falta para responder?'],
    ['Más solape', '<code>DOCS_SOLAPE=100 uv run docs indexar --estrategia fijo</code>', 'Menos cortes a mitad de idea, más trozos repetidos entre los seis'],
    ['Menos trozos al modelo', '<code>docs preguntar … --n 3</code>', 'Menos tokens: ¿cuánto bajan las correctas?'],
    ['Una k distinta en RRF', 'Cambia <code>K_RRF</code> a 10', 'Con k chica, el primer puesto pesa mucho más que el quinto'],
    ['Otro juez', '<code>DOCS_JUEZ=ollama</code>, sobre las mismas respuestas y las mismas etiquetas', 'El kappa del juez local contra el de Claude'],
], right=()))

# ------------------------------------------------------------------ limitaciones
add('<h2 id="limitaciones">Limitaciones</h2>\n')
add('<h3 id="lim-no-hace">Lo que no hace</h3>\n')
add('<ul>\n<li>No recuerda la conversación. Cada pregunta va sola: "¿y en M45?" después de una pregunta sobre HNSW no sabe de qué hablas.</li>\n<li>No lee las figuras. El texto de los SVG se salta; lo que una figura dice y la prosa no, no se puede preguntar.</li>\n<li>No indexa de a poco. Cada <code>indexar</code> recalcula la variante entera, aunque haya cambiado una página.</li>\n<li>No junta varias búsquedas. Una pregunta que compara dos módulos depende de que una sola búsqueda traiga los dos.</li>\n</ul>\n')
add('<h3 id="lim-se-rompe">Dónde se rompe</h3>\n')
add('<ul>\n<li>Con un corpus en otro idioma, la configuración <code>spanish</code> del tsvector recorta mal las palabras, y la búsqueda léxica empeora sin dar un error.</li>\n<li>Con un modelo local chico, la salida estructurada falla más seguido, sobre todo con 20 candidatos en el ' + RRer + '. La API devuelve 502, y los evals se cortan en la pregunta donde pasó.</li>\n<li>Con un millón de trozos, el índice HNSW ya no entra en la memoria de una máquina chica y la construcción tarda horas. A esa escala se cuantizan los vectores o se usa otra base (<a href="' + M45 + '#donde">45.9</a>).</li>\n</ul>\n')
add('<h3 id="lim-riesgos">Riesgos que quedan</h3>\n')
add('<ul>\n<li><b>Una respuesta bien citada y falsa.</b> Lo muestra la falla 1: el verificador no la ve. En producción, el índice necesita un dueño que borre lo viejo.</li>\n<li><b>Un documento envenenado.</b> El sobre impide que un trozo cierre su etiqueta, y el prompt dice que no se obedece, pero un trozo puede convencer al modelo de responder algo falso, y la cita valdría. El corpus aquí es el curso; con documentos de cualquiera, la regla de dos de <a href="' + M25 + '#injection-regla">M25</a> pide que el sistema no pueda actuar, y este no puede.</li>\n<li><b>Permisos por documento.</b> Todos ven todo. Con documentos privados, el filtro por permiso va en el <code>WHERE</code> de la búsqueda, con los mismos problemas de filtrar que <a href="' + M45 + '#filtros">45.8</a>, nunca en el prompt.</li>\n<li><b>El juez se equivoca.</b> El kappa lo mide sobre 30 respuestas; en las otras 90 no sabes cuáles.</li>\n</ul>\n')
add('<h3 id="lim-costo">Lo que cuesta</h3>\n')
add('<p>Con supuestos que tienes que reemplazar por los tokens que imprimen tus corridas. <b>Supuestos:</b> seis trozos de unos 400 tokens y un prompt de 250, unos 2 650 tokens de entrada, y 300 de salida; el ' + RRer + ' lee 20 trozos de 800 caracteres, a 4 caracteres por token unos 4 000 tokens, más 100 de prompt, y escribe 300; el juez lee unos 400 y escribe 80. Con Sonnet 5.5 a 2 USD por millón de entrada y 10 USD por millón de salida:</p>\n')
add(code('text', 'una pregunta:   2 650 × 2 / 1 000 000 + 300 × 10 / 1 000 000 = 0.0053 + 0.0030 = 0.0083 USD\nreordenar:      4 100 × 2 / 1 000 000 + 300 × 10 / 1 000 000 = 0.0082 + 0.0030 = 0.0112 USD más\nel juez:          400 × 2 / 1 000 000 +  80 × 10 / 1 000 000 = 0.0008 + 0.0008 = 0.0016 USD\nlos evals:      40 preguntas × 3 corridas × (0.0083 + 0.0016) = 120 × 0.0099 ≈ 1.19 USD\ncon reordenar:  120 × (0.0083 + 0.0112 + 0.0016)               ≈ 2.53 USD'))
add('<p>El ' + RRer + ' más que duplica el costo de una pregunta: tiene que mejorar algo que se vea en la tabla para valerlo. Los embeddings no cuestan tokens, pero sí tiempo de tu máquina en cada indexado. La latencia no se puede calcular a mano: mídela con los segundos que imprime <code>docs preguntar</code>. Con Ollama no hay factura, y el costo es el tiempo.</p>\n')
add('<h3 id="lim-produccion">Lo que cambiaría en producción</h3>\n')
add(table(['Aquí', 'En producción', 'Por qué'], [
    ['Reindexar la variante entera', 'Ingesta incremental: una huella por sección, y solo se recalcula lo que cambió', 'Una página cambiada no debería costar el corpus entero'],
    ['Bajar las páginas a mano', 'Un trabajo que corre con cada publicación y borra lo que ya no existe', 'Los documentos viejos son la falla 1'],
    ['El LLM como ' + RRer, 'Un modelo chico entrenado para reordenar, en tu máquina o como servicio', 'Más barato y más rápido por pregunta, a cambio de otra pieza que operar'],
    ['Todos ven todo', 'El permiso de cada documento en una columna, filtrado en el <code>WHERE</code>', 'Lo que el usuario no puede leer no tiene que llegar al modelo'],
    ['Los evals a mano', 'La primera capa en cada cambio del índice, en CI; la segunda, antes de cambiar de modelo', 'Es gratis medir la búsqueda: no hay excusa para no hacerlo siempre'],
    ['Sin registro de preguntas', 'Las preguntas reales, con las citas que no pasaron, para agregar al eval', 'Las 40 de la guía son de una persona; las de los usuarios son otras (<a href="' + M22 + '#evals">M22</a>)'],
]))

# ------------------------------------------------------------------ repositorio y conectar
add(repo_box('ia05', 'Sube el proyecto a un repositorio propio, por ejemplo <code>ia05-docs</code>, y pega aquí el enlace. Antes del primer commit, revisa con <code>git status</code> que no aparezcan <code>.env</code>, <code>corpus/</code> ni los resultados de <code>evals/</code>. Marca cada comprobación cuando la veas.', [
    ('corpus', 'Tienes las páginas del curso en <code>corpus/</code> o apuntaste <code>DOCS_CORPUS</code> a tu copia.'),
    ('secciones', 'Las cuatro primeras secciones de M25 salieron con sus ids y el título sin número.'),
    ('indexar', 'Indexaste dos veces la misma variante y la cuenta de filas no cambió.'),
    ('buscar', 'Comparaste las tres búsquedas con "FORCE ROW LEVEL SECURITY".'),
    ('recuperacion', 'Corriste <code>evals.recuperacion</code> y miraste a mano las preguntas que fallan.'),
    ('variantes', 'Llenaste la tabla del paso 7 con las cuatro variantes.'),
    ('preguntar', 'Preguntaste con y sin <code>--reordenar</code> y comparaste los pasos y los tokens.'),
    ('api', 'La API respondió <code>/buscar</code>, y un 422 a una pregunta de dos letras.'),
    ('pytest', '<code>uv run pytest -q</code> da <code>31 passed</code> con la base arriba.'),
    ('calibrar', 'Etiquetaste 30 respuestas y anotaste el kappa del juez.'),
    ('fallas', 'Provocaste las cuatro fallas y anotaste qué capa notó cada una.'),
    ('evals', 'Llenaste la tabla de los evals con al menos un modelo.'),
]))
add(connect([
    ('Con IA00, el laboratorio', '<a href="' + IA0 + '">IA00</a> te dejó uv, Ollama, el modelo falso y pass^k. Aquí no hay bucle de herramientas: es la parte de IA00 que ya no hace falta cuando el camino es fijo.'),
    ('Con IA01, el agente de guardia', '<a href="' + IA1 + '">IA01</a> buscaba en doce runbooks con embeddings en memoria y un sobre para lo que leía. Aquí el mismo sobre protege mil trozos, la búsqueda vive en PostgreSQL con un índice, y se mide.'),
    ('Con IA02, el analista', '<a href="' + IA2 + '">IA02</a> separó los roles para que el agente no pudiera escribir. Aquí el que contesta usa el rol de solo lectura, y el que indexa es otro proceso con otro rol.'),
    ('Con IA03, el soporte', '<a href="' + IA3 + '">IA03</a> medía un agente con pass^k sobre casos con una respuesta esperada. Aquí la respuesta no se compara con un valor: la compara un juez, al que antes le tomas examen.'),
    ('Con IA04, el revisor', '<a href="' + IA4 + '">IA04</a> leía código de cualquiera y lo trataba como texto que no se obedece. Aquí pasa lo mismo con 20 candidatos en el ' + RRer + ', y la cita verificable es la forma de saber de dónde salió cada afirmación.'),
]))
add('<p>La teoría está en el curso: RAG y el contexto en <a href="' + M16 + '#rag">M16</a>; los embeddings en <a href="' + M17 + '#embeddings">M17</a>; los evals, sus barras de error y el juez en <a href="' + M22 + '#evals">M22</a>; los patrones de workflow y de agente en <a href="' + M25 + '#patrones">M25</a>; HNSW y los filtros en <a href="' + M45 + '#hnsw">M45</a>; las métricas en k en <a href="' + M46 + '#metricas-k">M46</a>; y el ruido de un eval en <a href="' + M72 + '#ruido">M72</a>. Los términos nuevos están en el <a href="../glosario.html#t-rrf">glosario</a>.</p>\n')

# ------------------------------------------------------------------ anexo
add('<h2 id="anexo-preguntas">Anexo: las preguntas por dentro</h2>\n')
add('<p>El archivo de las 40 preguntas, entero. No hace falta para entender los evals: está aquí para que lo copies, y para cuando quieras agregar una pregunta. Vuelve al <a href="#paso-recuperacion">paso 6</a> cuando lo tengas.</p>\n')
add(table(['Preguntas', 'Módulos', 'Qué cubren'], [
    ['p01 a p03', 'M00', 'Percentiles, SLO y disponibilidad compuesta'],
    ['p04 a p09', 'M04, M05', 'Caché, índices, RLS y MVCC'],
    ['p10 a p16', 'M07, M08, M10', 'Outbox, semánticas de entrega, reintentos, breaker, colas, PKCE y JWT'],
    ['p17 a p24', 'M16, M17, M18, M22', 'RAG, caché del prompt, embeddings, cancelación, cuotas, el juez y los evals'],
    ['p25 a p30', 'M25, M27', 'Agentes, ejecución durable, bucles, idempotencia y ledger'],
    ['p31 a p36', 'M45, M65, M75, M76', 'HNSW, filtros, pass^k, CORS y SameSite'],
    ['p37 a p40', 'ninguno', 'Sin respuesta en el curso: Django, GLSL, BLE y MikroTik'],
]))
_pq = rd('evals/preguntas.py')
_plan = [('"""Las preguntas del eval', [('NO_ESTA = "No está en la documentación."', 'La misma frase de <code>responder.py</code>: el juez compara la abstención con esta referencia.'),
                                       ('PREGUNTAS = [', 'Una lista de diccionarios: <code>id</code>, <code>pregunta</code>, <code>oro</code> y <code>referencia</code>.')])]
for pid in ('p01', 'p08', 'p15', 'p22', 'p29', 'p36'):
    marcas = []
    if pid == 'p29':
        marcas = [('"id": "p33"', 'Tres secciones de oro: pass^k se explica en M25, en M65 y en M72. Con que aparezca una entre las cinco, el acierto vale 1; el recall, un tercio por cada una.')]
    if pid == 'p36':
        marcas = [('"id": "p37"', 'Las cuatro sin respuesta: oro vacío y la referencia <code>NO_ESTA</code>. No entran a la primera capa.')]
    _plan.append((f'"id": "{pid}"', marcas))
add(Walk('python', 'evals/preguntas.py', 'Las 40 preguntas del eval, con sus secciones de oro y su respuesta de referencia.', 'Los dos evals y <code>etiquetar.py</code>.', 'Nada.', '<code>NO_ESTA</code> y <code>PREGUNTAS</code>.', 'evals',
         ['Define la frase de abstención.', 'Lista 36 preguntas con su oro y su referencia, escritas leyendo el curso.', 'Lista 4 preguntas que el curso no contesta.'])
    .from_file(_pq, _plan).html())
add('<p>Para agregar una pregunta: busca la sección que la contesta en el curso, copia su id como oro, y escribe la referencia en dos frases con lo que dice esa sección, no con lo que sabes tú. Si otra sección también la contesta, agrégala al oro. Después corre la primera capa: una pregunta nueva que falla en los tres modos casi siempre tiene el oro mal, no la búsqueda.</p>\n')
