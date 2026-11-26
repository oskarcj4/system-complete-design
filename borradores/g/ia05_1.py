# IA05, parte 1: objetivos, excusa, antes, endpoints, dependencias e infraestructura.
add(objectives([
    'Partir páginas HTML en secciones citables y trocearlas de dos formas, por sección y por tamaño fijo con solape, sabiendo qué pierde cada una.',
    'Guardar embeddings en PostgreSQL con pgvector y un índice HNSW por variante, y buscar por palabras con <code>tsvector</code> en español, por significado y con las dos juntas fusionadas con RRF.',
    'Responder con citas que se comprueban sin modelo: cada cita es de un trozo recuperado y trae una frase copiada tal cual de ese trozo.',
    'Medir en dos capas: la recuperación con recall@5 y MRR contra secciones de oro, sin tokens, y la respuesta con un juez al que antes calibras contra tus propias etiquetas con el kappa de Cohen.',
    'Cambiar una sola cosa por vez (el troceado, el prefijo de los embeddings, el ' + RR + ' o el modelo) y saber por la tabla, no por intuición, si mejoró.',
]))

# ------------------------------------------------------------------ excusa
add('<h2 id="excusa">La excusa</h2>\n')
add('<p>Este curso tiene más de noventa páginas. Alguien que llega a M66 y no se acuerda de qué era pass^k tiene que adivinar en qué módulo se explicó, abrirlo y buscar. Quieres una caja donde escribir "¿qué es pass^k?" y recibir dos frases con un enlace a la sección exacta, <code>[m65#medir]</code>, para abrirla y comprobar.</p>\n')
add('<p>Armar eso lleva una tarde: trocear las páginas, calcular embeddings, buscar los más cercanos y pasárselos al modelo. Lo que no lleva una tarde es saber si funciona. Una respuesta que suena bien puede citar una sección que no dice eso, o una que dice lo contrario. Y cuando cambias algo (trozos más chicos, otra búsqueda, otro modelo), la única forma de saber si mejoró es tener preguntas con su respuesta y medir. Esa es la mitad de esta guía.</p>\n')
add('<p>El corpus son las páginas del curso: las bajas con un comando o apuntas a tu copia local. Es un corpus real, en español, con secciones que tienen id, y con una ventaja para aprender: las preguntas de los evals las puedes contestar tú mirando la página, así que puedes juzgar al juez.</p>\n')

arch = svg('fi05', 770, 430, 'La arquitectura de IA05',
    'Arriba, fuera de línea: las páginas del curso pasan por la ingesta, que las parte en secciones y trozos, pide un embedding por trozo a Ollama y los guarda en PostgreSQL con pgvector. Abajo, en línea: tú preguntas por la línea de comandos o por la API; el pipeline pide el embedding de la pregunta a Ollama, busca en PostgreSQL por palabras y por significado, le pasa los trozos al modelo y verifica las citas de la respuesta. A la izquierda, los evals llaman al mismo pipeline con cuarenta preguntas y le piden al juez que califique cada respuesta. Diez flechas numeradas.',
    '\n'.join([
        text(20, 22, 'Fuera de línea: cada vez que cambian las páginas', 'dg-group'),
        text(20, 196, 'En línea: cada pregunta', 'dg-group'),
        edge('fi05', 'M170 68 L208 68'),
        edge('fi05', 'M360 68 L398 68'),
        edge('fi05', 'M285 96 V150 H598'),
        edge('fi05', 'M170 238 L208 238'),
        edge('fi05', 'M330 210 L455 98'),
        edge('fi05', 'M360 230 C480 230 480 180 598 180'),
        edge('fi05', 'M360 256 C380 256 380 324 398 324'),
        edge('fi05', 'M285 266 V298'),
        edge('fi05', 'M150 300 L222 268'),
        edge('fi05', 'M95 356 V400 H675 V358'),
        box(20, 40, 150, 56, 'Páginas del curso', 'corpus/*.html', 'client', 'corpus'),
        box(210, 40, 150, 56, 'Ingesta', 'ingerir y trocear', 'service', 'ingesta'),
        box(400, 40, 150, 56, 'Embeddings', 'Ollama, 768 números', 'gpu', 'emb'),
        box(600, 124, 150, 72, 'PostgreSQL', 'pgvector, 55437', 'db', 'base'),
        box(20, 210, 150, 56, 'Tú', 'docs o POST :8005', 'client', 'cliente'),
        box(210, 210, 150, 56, 'Pipeline', 'buscar y responder', 'service', 'consulta'),
        box(20, 300, 150, 56, 'Evals', '40 preguntas', 'edge', 'evals'),
        box(210, 300, 150, 56, 'Verificador', 'sin modelo', 'service', 'verif'),
        box(400, 300, 150, 56, 'Modelo', 'Claude u Ollama', 'gpu', 'modelo'),
        box(600, 300, 150, 56, 'Juez', 'Claude u Ollama', 'gpu', 'juez'),
        pin(1, 189, 54), pin(2, 379, 54), pin(3, 440, 136), pin(4, 189, 224), pin(5, 380, 140),
        pin(6, 520, 220), pin(7, 392, 280), pin(8, 299, 282), pin(9, 172, 272), pin(10, 520, 386),
    ]))
add(figure(arch, '<b>Figura IA05.1.</b> Dos tuberías que comparten la base y el modelo de embeddings. La de arriba corre cuando cambian las páginas; la de abajo, en cada pregunta. Los evals no tienen un camino propio: usan el mismo pipeline que tú.', arch=True))
add(table(['#', 'De → a', 'Protocolo y formato', 'Ejemplo', 'Con qué permiso'], [
    ['1', 'páginas → ingesta', 'Archivos HTML en disco', '<code>corpus/m25-agentes.html</code>, leído con <code>html.parser</code>', 'Tu usuario, lectura'],
    ['2', 'ingesta → Ollama', 'HTTP, JSON', '<code>POST /api/embed</code> con 32 textos que empiezan con <code>search_document: </code>', 'Ninguno: Ollama escucha en <code>localhost:11434</code>'],
    ['3', 'ingesta → PostgreSQL', 'SQL sobre TCP, puerto 55437', '<code>DELETE</code> de la variante y un <code>INSERT</code> por trozo', '<code>docs_indexador</code>: SELECT, INSERT y DELETE'],
    ['4', 'tú → pipeline', 'Línea de comandos, o HTTP con JSON', '<code>uv run docs preguntar "¿Qué es pass^k?"</code>, o <code>POST /preguntar</code>', 'Ninguno: la API escucha solo en <code>127.0.0.1</code>'],
    ['5', 'pipeline → Ollama', 'HTTP, JSON', '<code>POST /api/embed</code> con <code>search_query: ¿Qué es pass^k?</code>', 'Ninguno'],
    ['6', 'pipeline → PostgreSQL', 'SQL', '<code>ORDER BY embedding &lt;=&gt; …</code> y <code>tsv @@ …</code>, 20 filas cada una', '<code>docs_lector</code>: solo SELECT'],
    ['7', 'pipeline → modelo', 'HTTPS a Anthropic, o HTTP a <code>localhost:11434</code>', 'Seis trozos en <code>&lt;trozo cita="m65#medir"&gt;</code> y la pregunta; vuelve un JSON con respuesta y citas', 'La clave de Anthropic, o ninguno con Ollama'],
    ['8', 'pipeline → verificador', 'Una llamada de función, en el mismo proceso', 'La respuesta y los seis trozos; vuelven las citas válidas y las que no', 'Ninguno: no hay red'],
    ['9', 'evals → pipeline', 'Una llamada de función', 'Las 40 preguntas, k veces cada una', 'Los mismos de 5, 6 y 7'],
    ['10', 'evals → juez', 'HTTPS a Anthropic, o HTTP a Ollama', 'Pregunta, referencia y respuesta; vuelve <code>correcta</code> o <code>incorrecta</code> con su motivo', 'La clave de Anthropic, o ninguno'],
]))
add('<p><b>Las fronteras.</b> Los embeddings son siempre locales: ni las páginas ni tus preguntas salen de tu máquina para indexar o buscar. Con Claude salen la pregunta y los seis trozos que la contestan, que son texto público del curso; con Ollama no sale nada. La base escucha en <code>127.0.0.1:55437</code> y tiene dos roles: el que indexa puede borrar y escribir, y el que contesta preguntas, el de la línea de comandos y el de la API, solo puede leer. Un bug en el pipeline, o un trozo que convenza al modelo de algo, no puede cambiar el índice.</p>\n')
add('<h3 id="excusa-viaje">El viaje, por adelantado</h3>\n')
add(figure(seq('fi05v', 'Una pregunta, de punta a punta', 'Tú preguntas. El pipeline pide el embedding de la pregunta a Ollama, busca en PostgreSQL por palabras y por significado, fusiona las dos listas, le manda seis trozos al modelo, recibe la respuesta con citas, las verifica y te muestra la respuesta con cada cita marcada como válida o no.',
    [('tu', 'Tú'), ('pi', 'Pipeline'), ('ol', 'Ollama'), ('pg', 'PostgreSQL'), ('mo', 'Modelo')],
    [('tu', 'pi', 'docs preguntar "¿Qué es pass^k?"', 'req'),
     ('pi', 'ol', 'embed "search_query: …"', 'req'),
     ('ol', 'pi', '768 números', 'res'),
     ('pi', 'pg', 'tsv @@ consulta, 20 filas', 'req'),
     ('pi', 'pg', 'embedding <=> vector, 20 filas', 'req'),
     ('pg', 'pi', 'dos listas de trozos', 'res'),
     ('pi', 'mo', 'seis trozos y la pregunta', 'req'),
     ('mo', 'pi', 'respuesta, citas y frases', 'res'),
     ('pi', 'tu', 'respuesta y citas verificadas', 'res')]),
    '<b>Figura IA05.2.</b> La versión corta. La fusión de las dos listas y la verificación de las citas pasan dentro del pipeline, sin red. La versión completa, con el ' + RR + ', está en <a href="#viaje">El viaje de un dato</a>.'))

# ------------------------------------------------------------------ antes
add('<h2 id="antes">Antes de empezar</h2>\n')
add('<h3 id="ae-repaso">Lo que viene de las guías anteriores</h3>\n')
add(figure(cards('fi05r', 'Lo que viene de las guías anteriores', 'Seis piezas de IA00 a IA04 que vuelven: los embeddings y el RAG chico de IA01, la salida estructurada, el sobre, los roles de PostgreSQL, el modelo falso y pass^k.', [
    ('Embeddings', 'IA01: doce trozos de runbooks y una búsqueda.', 'Mil trozos, dos búsquedas y una métrica.'),
    ('Salida estructurada', 'IA01: un formulario con casillas fijas.', 'La respuesta, sus citas y una frase por cita.'),
    ('El sobre', 'IA01 a IA04: lo de afuera va entre etiquetas.', 'Cada trozo en <trozo>, con < escapado.'),
    ('Los roles', 'IA02 a IA04: el GRANT es la barrera.', 'Uno indexa; el que contesta solo lee.'),
    ('El modelo falso', 'IA00: un guion en lugar del modelo.', 'El pipeline entero, sin red ni tokens.'),
    ('pass^k', 'IA00 a IA04: cada caso k veces.', 'Correcta y bien citada en las k corridas.'),
]), '<b>Figura IA05.3.</b> Seis cosas que vuelven. Si alguna no te suena, la tabla te lleva a donde se explicó.'))
add(table(['Qué', 'Dónde se vio'], [
    ['uv, la clave de Anthropic y Ollama', '<a href="' + IA0 + '#ae-uv">IA00, uv</a>, <a href="' + IA0 + '#ae-clave">la clave</a> y <a href="' + IA0 + '#ae-ollama">Ollama</a>'],
    ['Embeddings y búsqueda por significado', '<a href="' + IA1 + '#ae-rag">IA01, embeddings</a> y <a href="' + IA1 + '#paso-runbooks">los runbooks</a>'],
    ['Salida estructurada con Pydantic', '<a href="' + IA1 + '#ae-estructurada">IA01, salida estructurada</a> y <a href="' + IA0 + '#py-pydantic">IA00, Pydantic</a>'],
    ['El sobre y la injection indirecta', '<a href="' + IA1 + '#ae-injection">IA01, injection</a>'],
    ['Roles de PostgreSQL', '<a href="' + IA2 + '#ae-roles">IA02, los roles</a>'],
    ['Docker y Compose', '<a href="' + IA0 + '#ae-docker">IA00, Docker</a>'],
    ['El modelo falso', '<a href="' + IA0 + '#ae-pass-k">IA00, pass^k</a> y el guion de <a href="' + IA3 + '#comprueba-pruebas">IA03</a>'],
    ['Tipos y dataclasses en Python', '<a href="' + IA0 + '#py-tipos">IA00, los tipos</a>'],
]))
add(figure(plate('fi05p', 'Lámina IA05.A: un RAG que se mide', 'Doce piezas: trozo, embedding, HNSW, tsvector, RRF, re-ranker, cita, verificador, recall@5, MRR, juez y kappa.', [
    ('Trozo', 'm25#durable, parte 0'), ('Embedding', '768 números'), ('HNSW', 'm = 16'),
    ('tsvector', "configuración 'spanish'"), ('RRF', '1 / (60 + puesto)'), ('Re-ranker', 'puntaje de 0 a 3'),
    ('Cita', '[m65#medir]'), ('Verificador', 'la frase está'), ('Recall@5', 'oro entre los 5'),
    ('MRR', '1 / puesto'), ('Juez', 'correcta o no'), ('Kappa', 'acuerdo sin azar')]),
    '<b>Lámina IA05.A.</b> Las piezas, en el orden en que aparecen en el paso a paso: las seis primeras traen los trozos, las dos siguientes responden y las cuatro últimas miden.'))
add(plate_key([
    ('Trozo', 'Un pedazo de una página con su cita: la página y la sección donde empieza. Es lo que se indexa y lo que lee el modelo.', 'ae-troceado', 'Trocear'),
    ('Embedding', 'Una lista de 768 números que representa el significado de un trozo o de una pregunta. Dos textos parecidos quedan cerca.', 'ae-embeddings', 'Embeddings y coseno'),
    ('HNSW', 'El índice que encuentra los vectores más cercanos sin compararlos todos, a cambio de no ser exacto siempre.', 'ae-hnsw', 'Un índice aproximado'),
    ('tsvector', 'Las palabras de un trozo reducidas a su raíz, sin las palabras vacías, para buscar por palabras con un índice.', 'ae-lexica', 'Por palabras y por significado'),
    ('RRF', 'Reciprocal Rank Fusion: junta dos listas ordenadas sumando 1 / (60 + puesto) de cada una.', 'ae-rrf', 'Juntar dos listas'),
    ('Re-ranker', 'Un modelo que lee la pregunta con cada candidato y les pone un puntaje: ordena mejor y cuesta una llamada.', 'ae-rerank', 'Reordenar con el modelo'),
    ('Cita', 'La sección que sostiene una afirmación, entre corchetes, con una frase copiada tal cual del trozo.', 'ae-citas', 'Una cita que se comprueba'),
    ('Verificador', 'Código sin modelo que comprueba que cada cita es de un trozo recuperado y que su frase está en él.', 'ae-citas', 'Una cita que se comprueba'),
    ('Recall@5', 'Qué fracción de las secciones de oro de una pregunta aparece entre los cinco primeros resultados.', 'ae-capas', 'Dos capas de evals'),
    ('MRR', 'El promedio de 1 / el puesto de la primera sección de oro. Premia que la correcta esté arriba.', 'ae-capas', 'Dos capas de evals'),
    ('Juez', 'Un modelo que compara una respuesta con la de referencia y dice si es correcta. Se calibra antes de creerle.', 'ae-juez', 'Un juez calibrado'),
    ('Kappa', 'El kappa de Cohen: cuánto coinciden el juez y tú, descontado lo que coincidirían por azar.', 'ae-juez', 'Un juez calibrado'),
]))

add('<h3 id="ae-instalar">Qué tienes que tener</h3>\n')
add(table(['Qué', 'Para qué', 'Cómo compruebas que está'], [
    ['Docker con Compose', 'PostgreSQL con pgvector', '<code>docker compose version</code>; si no lo tienes, <a href="' + IA0 + '#ae-docker">IA00</a>'],
    ['uv y Python 3.13', 'La ingesta, el pipeline, la API, los evals y las pruebas', '<code>uv --version</code>; ver <a href="' + IA0 + '#ae-uv">IA00</a>'],
    ['Ollama con <code>nomic-embed-text</code>', 'Los embeddings, siempre', '<code>ollama list</code> muestra <code>nomic-embed-text</code>; ver <a href="' + IA0 + '#ae-ollama">IA00</a>'],
    ['Una clave de Anthropic, u Ollama con <code>qwen3:8b</code>', 'El modelo que responde y el juez', '<code>echo $ANTHROPIC_API_KEY | cut -c1-7</code> o <code>ollama list</code>; ver <a href="' + IA0 + '#ae-clave">IA00</a>'],
    ['Las páginas del curso', 'El corpus', 'Una copia local del curso, o la URL donde está publicado: el <a href="#paso-corpus">paso 1</a> sirve para las dos'],
]))
add(code('bash', 'ollama pull nomic-embed-text\nollama pull qwen3:8b        # solo si vas a responder o juzgar con el modelo local'))
add('<p>A diferencia de IA01 a IA04, esta guía no levanta un sistema que se rompe: lo que se rompe aquí es el índice. Un trozo viejo que contradice al nuevo, una página que no se indexó, un modelo de embeddings distinto al buscar que al indexar. <code>caos.py</code> provoca las tres en <a href="#comprueba-fallas">Cómo comprobar</a>, y los evals tienen que notarlas. El puerto 55437 no choca con los de las guías anteriores.</p>\n')

# ---------------- ae-workflow
add('<h3 id="ae-workflow">Un workflow, no un agente</h3>\n')
add(analogy('Una línea de montaje contra un artesano. En la línea, cada estación hace lo mismo con cada pieza y en el mismo orden: si algo sale mal, sabes en qué estación fue. El artesano decide qué hacer según lo que ve: hace piezas que la línea no puede, pero cada una sale distinta y no sabes de antemano cuánto va a tardar.'))
add('<p>IA01 a IA04 eran <b>agentes</b>: el modelo decidía qué herramienta llamar y cuándo terminar. Aquí no hace falta. Para contestar una pregunta sobre la documentación, el camino es siempre el mismo: buscar, responder, verificar. Cuando el camino se puede escribir de antemano, un <b>workflow</b> con pasos fijos es más barato, más rápido y más fácil de medir (<a href="' + M25 + '#patrones">25.3</a>). El modelo se llama una vez, o dos con el ' + RR + ', y nunca decide si busca.</p>\n')
add(figure(flow('fi05w', 'El pipeline', 'Cinco estaciones en fila: recuperar veinte candidatos con las dos búsquedas, fusionarlos con RRF, reordenarlos con el modelo si se pide, responder con seis trozos y verificar las citas sin modelo.', [
    ('Recuperar', 'por palabras y por significado'), ('Fusionar', 'RRF con k = 60'), ('Reordenar', 'opcional, con el modelo'),
    ('Responder', 'seis trozos en el sobre'), ('Verificar', 'sin modelo')]),
    '<b>Figura IA05.4.</b> Una tubería, no un grafo: no hay aristas condicionales ni bucles. Por eso no hace falta LangGraph; alcanza con funciones que se llaman en orden.'))
add(callout('tradeoff', 'Trade-off', '<p>Un agente que decide cuándo buscar sí ayuda con preguntas que piden juntar varias búsquedas ("compara cómo M04 y M45 tratan la frescura"). Cuesta varias llamadas al modelo por pregunta, una cantidad de pasos que no sabes de antemano, y evals de trayectoria además de los de respuesta (<a href="' + M72 + '#que-medir">72.2</a>). Empieza por el workflow, mide, y pasa a un agente solo si la tabla dice que las preguntas que fallan son de ese tipo.</p>'))

# ---------------- ae-troceado
add('<h3 id="ae-troceado">Trocear</h3>\n')
add(analogy('Cortar un libro en fichas para un fichero. Si cortas por capítulo, cada ficha cuenta una idea completa, pero algunas son enormes. Si cortas cada doscientas palabras, todas las fichas miden lo mismo, pero algunas empiezan a mitad de una frase y terminan a mitad de otra idea.'))
add('<p>Un embedding resume un texto en 768 números. Si el texto es una página entera, el resumen mezcla diez temas y no se parece a ninguna pregunta. Por eso se <dfn data-term="chunking">trocea</dfn>: cada trozo se indexa por separado y la búsqueda trae solo los que se parecen a la pregunta (<a href="' + M20 + '#archivos">M20</a>). Esta guía compara dos formas:</p>\n')
add('<ul>\n<li><b>Por sección.</b> Cada <code>h2</code> o <code>h3</code> con id es un trozo, con su id como cita. Las secciones de más de 350 palabras se parten entre párrafos. Los trozos respetan las ideas, pero miden distinto.</li>\n<li><b>Fijo.</b> Ventanas de 200 palabras que avanzan 160, así que cada una repite las últimas 40 de la anterior. No miran dónde termina una sección: un trozo puede empezar en una y terminar en la siguiente, y se cita con la sección de su primera palabra.</li>\n</ul>\n')

# ---------------- ae-embeddings
add('<h3 id="ae-embeddings">Embeddings y similitud coseno</h3>\n')
add(analogy('El mapa de una biblioteca ordenada por temas. Los libros de bases de datos quedan en un rincón y los de redes en otro; un libro sobre réplicas de PostgreSQL queda cerca de los dos. Buscar es pararte donde caería tu pregunta y mirar los libros más cercanos.'))
add('<p>Ya viste en <a href="' + IA1 + '#ae-rag">IA01</a> qué es un <dfn data-term="embedding">embedding</dfn> (<a href="' + M17 + '#embeddings">M17</a>). Lo nuevo aquí es medir la distancia. Dos vectores se comparan por el ángulo entre ellos: el <b>coseno</b> vale 1 si apuntan igual y 0 si no tienen nada en común. Con vectores de tres números en lugar de 768, la cuenta se hace a mano:</p>\n')
add(figure(svg('fi05c', 770, 250, 'El coseno entre tres vectores',
    'A la izquierda, tres flechas desde el origen: a y b apuntan casi igual, c apunta hacia otro lado. A la derecha, la cuenta: a = (1, 2, 0), b = (2, 3, 1) y c = (0, 1, 3). El coseno entre a y b es 8 dividido por 8.37, 0.956; entre a y c, 2 dividido por 7.07, 0.283. La distancia de pgvector es 1 menos el coseno: 0.044 y 0.717.',
    '\n'.join([
        '<path class="sim-axis" d="M40 220 H300 M40 220 V30"/>',
        '<path class="dg-edge" d="M40 220 L130 60" marker-end="url(#fi05ca)"/>',
        '<path class="dg-edge" d="M40 220 L200 80" marker-end="url(#fi05ca)"/>',
        '<path class="dg-feedback" d="M40 220 L270 190" marker-end="url(#fi05ca)"/>',
        text(118, 52, 'a', 'dg-label'), text(206, 76, 'b', 'dg-label'), text(276, 186, 'c', 'dg-label'),
        text(60, 150, 'ángulo chico', 'dg-tiny'), text(150, 214, 'ángulo grande', 'dg-tiny'),
        '<rect class="dg-box" x="340" y="20" width="410" height="210" rx="8"/>',
        text(356, 46, 'a = (1, 2, 0)   b = (2, 3, 1)   c = (0, 1, 3)', 'dg-small dg-mono'),
        text(356, 78, 'cos(a, b) = (1·2 + 2·3 + 0·1) / (|a| · |b|)', 'dg-small dg-mono'),
        text(356, 100, '          = 8 / (2.236 · 3.742) = 8 / 8.367 = 0.956', 'dg-small dg-mono'),
        text(356, 132, 'cos(a, c) = (1·0 + 2·1 + 0·3) / (2.236 · 3.162)', 'dg-small dg-mono'),
        text(356, 154, '          = 2 / 7.071 = 0.283', 'dg-small dg-mono'),
        text(356, 188, 'distancia <=> de pgvector = 1 − coseno', 'dg-small'),
        text(356, 210, 'a con b: 0.044          a con c: 0.717', 'dg-small dg-mono'),
    ])), '<b>Figura IA05.5.</b> El largo de cada vector no importa, solo hacia dónde apunta. Por eso <code>ORDER BY embedding &lt;=&gt; pregunta</code> trae primero los trozos que apuntan como la pregunta.'))
add('<p><code>nomic-embed-text</code> pide un prefijo según la tarea: <code>search_document: </code> delante de cada trozo al indexar y <code>search_query: </code> delante de la pregunta al buscar <span class="badge badge--doc">Documentado</span>. Lo entrenaron así, para que una pregunta corta quede cerca del párrafo largo que la contesta. Sin prefijos funciona igual, peor o mejor según el corpus: es uno de los experimentos del <a href="#paso-variantes">paso 7</a>. Indexar y buscar tienen que usar el mismo modelo, y el mismo criterio de prefijos.</p>\n')
add(callout('fail', 'Qué pasa si el texto es largo', '<p>Cada modelo de embeddings lee hasta cierta cantidad de tokens. La API de Ollama tiene una opción <code>truncate</code> que vale <code>true</code> por defecto: si un texto se pasa, lo corta sin avisar y calcula el embedding del principio <span class="badge badge--doc">Documentado</span>. Por eso el troceado por sección parte a 350 palabras: un trozo de dos mil palabras se indexaría como si fueran solo sus primeras.</p>'))

# ---------------- ae-lexica
add('<h3 id="ae-lexica">Por palabras y por significado</h3>\n')
add(analogy('Dos bibliotecarios. Uno se sabe el índice de cada libro y encuentra al instante dónde dice "FORCE ROW LEVEL SECURITY", pero si le preguntas "¿por qué mi política no filtra nada?" no sabe qué buscar. El otro entiende de qué le hablas y te lleva al estante correcto, pero cuando le das un nombre exacto te trae libros que hablan de algo parecido.'))
add('<p>La búsqueda por significado falla con lo que no tiene significado: nombres de funciones, flags, códigos de error. <code>pg_sleep</code>, <code>ON CONFLICT</code> o <code>FORCE ROW LEVEL SECURITY</code> son tokens raros para un modelo de embeddings, y su vector cae cerca de cualquier cosa de SQL. La búsqueda por palabras los encuentra por lo que son. Al revés, "el pool no da más" no comparte palabras con "conexiones agotadas", y ahí gana el significado.</p>\n')
add('<p>PostgreSQL busca por palabras con un <b>tsvector</b>: el texto reducido a raíces, sin las palabras vacías, con la posición de cada una. La configuración <code>spanish</code> sabe que "reintentos" y "reintento" tienen la misma raíz y que "los" o "se" no aportan nada <span class="badge badge--doc">Documentado</span>. La columna <code>tsv</code> de la tabla se calcula sola al insertar, con un índice GIN para buscarla rápido.</p>\n')
add(figure(compare('fi05l', 'Cuándo gana cada búsqueda', 'A la izquierda, la búsqueda por palabras: encuentra nombres exactos como FORCE ROW LEVEL SECURITY, pg_sleep o 3DS, y falla con paráfrasis. A la derecha, por significado: encuentra paráfrasis como el pool no da más, y falla con nombres raros y siglas.',
    ['Encuentra "FORCE ROW LEVEL SECURITY".', 'Encuentra pg_sleep, SameSite, 3DS.', 'Ordena por cuántas veces y qué tan juntas.', 'Falla: "el pool no da más".', 'Falla: la pregunta usa otras palabras.'],
    ['Encuentra "el pool no da más".', 'Encuentra la idea con otras palabras.', 'Ordena por el ángulo con la pregunta.', 'Falla: siglas y nombres de funciones.', 'Falla: dos temas con palabras parecidas.'],
    lt='Por palabras (tsvector)', rt='Por significado (embeddings)', bad_left=False),
    '<b>Figura IA05.6.</b> Cada una falla donde la otra acierta. Por eso se usan las dos y se juntan las listas: es la <dfn data-term="busqueda-hibrida">búsqueda híbrida</dfn>.'))

# ---------------- ae-hnsw
add('<h3 id="ae-hnsw">Un índice aproximado</h3>\n')
add(analogy('Encontrar la casa más cercana en una ciudad. Puedes medir la distancia a todas, o subir a una autopista, bajar en la salida que más se acerca, seguir por avenidas y terminar en las calles del barrio. El segundo camino es mucho más corto y casi siempre llega a la casa más cercana; a veces llega a la segunda.'))
add('<p>Comparar la pregunta con cada trozo es exacto y, con unos miles de trozos, rápido. Con millones no lo es. Un <dfn data-term="hnsw">HNSW</dfn> es un grafo de vecinos en pisos que se recorre de forma golosa, sin mirar todos los puntos (<a href="' + M45 + '#hnsw">45.4</a>). pgvector lo trae con dos parámetros al construir: <code>m</code>, cuántos vecinos guarda cada punto, 16 por defecto, y <code>ef_construction</code>, cuántos candidatos mira al construirlo, 64 por defecto. Al buscar, <code>hnsw.ef_search</code>, 40 por defecto, dice cuántos candidatos mira cada consulta <span class="badge badge--doc">Documentado</span>.</p>\n')
add('<p>La tabla guarda cuatro variantes: dos troceados, con y sin prefijo. Un índice sobre toda la tabla devolvería los 20 más cercanos de cualquier variante, y después el <code>WHERE</code> se quedaría con los de la tuya: con cuatro variantes, unos cinco de veinte. Es el problema de filtrar después de buscar (<a href="' + M45 + '#filtros">45.8</a>). Por eso hay un índice parcial por variante: cada uno contiene solo sus filas, y el filtro se aplica antes.</p>\n')
add(figure(svg('fi05h', 770, 180, 'Cuánto ocupa el índice',
    'Una cuenta en tres líneas. Cada embedding son 768 números de 4 bytes: 3 072 bytes. Con 2 000 trozos por variante, como supuesto, son 6 144 000 bytes, unos 6 MB por variante sin contar el grafo. Con cuatro variantes, unos 25 MB.',
    '\n'.join([
        '<rect class="dg-box" x="20" y="16" width="730" height="148" rx="8"/>',
        text(36, 44, 'un embedding     768 números × 4 bytes             = 3 072 bytes', 'dg-small dg-mono'),
        text(36, 72, 'una variante     2 000 trozos × 3 072 bytes        = 6 144 000 bytes, unos 6 MB', 'dg-small dg-mono'),
        text(36, 100, 'cuatro variantes 4 × 6 MB                         = unos 25 MB, más el grafo', 'dg-small dg-mono'),
        text(36, 138, 'Los 2 000 trozos son un supuesto: tu indexar imprime cuántos son en tu corpus.', 'dg-tiny'),
    ])), '<b>Figura IA05.7.</b> Cabe entero en la memoria de cualquier máquina. A esta escala, PostgreSQL puede preferir leer la tabla en lugar del índice, y está bien: el resultado es exacto.'))

# ---------------- ae-rrf
add('<h3 id="ae-rrf">Juntar dos listas: RRF</h3>\n')
add(analogy('Dos críticos de cine que hacen su lista de las diez mejores del año. Uno puntúa de 1 a 10 y el otro de 1 a 100, así que sus puntajes no se pueden sumar. Pero el tercer puesto es el tercer puesto en las dos listas: si juntas los puestos, la película que los dos pusieron arriba gana.'))
add('<p>La búsqueda por palabras ordena por <code>ts_rank_cd</code>; la de significado, por distancia coseno. Son escalas distintas y no se pueden sumar. <dfn data-term="rrf">Reciprocal Rank Fusion</dfn> usa solo los puestos: cada lista le da a cada trozo 1 / (k + puesto), y gana la suma más alta. Cormack, Clarke y Büttcher lo propusieron en 2009 con k = 60, y mostraron que le ganaba a métodos que sí usan los puntajes <span class="badge badge--doc">Documentado</span>. La k grande achata las diferencias: el primero no vale mucho más que el quinto, y un trozo que aparece en las dos listas le gana a uno que está primero en una sola.</p>\n')
add(figure(svg('fi05f', 770, 250, 'RRF con dos listas',
    'Dos listas. Por palabras: A, B, C, D. Por significado: C, A, E. La suma de 1 / (60 + puesto) da A 0.03252, C 0.03227, B 0.01613, E 0.01587 y D 0.01563. A y C aparecen en las dos listas y quedan arriba.',
    '\n'.join([
        text(20, 30, 'Por palabras', 'dg-group'), text(200, 30, 'Por significado', 'dg-group'), text(400, 30, 'Fusión: Σ 1 / (60 + puesto)', 'dg-group'),
        box(20, 44, 150, 34, '1. A', None, 'service'), box(20, 84, 150, 34, '2. B', None, cls='dg-box'),
        box(20, 124, 150, 34, '3. C', None, 'service'), box(20, 164, 150, 34, '4. D', None, cls='dg-box'),
        box(200, 44, 150, 34, '1. C', None, 'service'), box(200, 84, 150, 34, '2. A', None, 'service'),
        box(200, 124, 150, 34, '3. E', None, cls='dg-box'),
        text(400, 64, 'A   1/61 + 1/62   = 0.03252', 'dg-small dg-mono'),
        text(400, 94, 'C   1/63 + 1/61   = 0.03227', 'dg-small dg-mono'),
        text(400, 124, 'B   1/62          = 0.01613', 'dg-small dg-mono'),
        text(400, 154, 'E   1/63          = 0.01587', 'dg-small dg-mono'),
        text(400, 184, 'D   1/64          = 0.01563', 'dg-small dg-mono'),
        text(20, 232, 'A, C, B, E, D: los dos que están en las dos listas quedan arriba, aunque C estaba tercero por palabras.', 'dg-tiny'),
    ])), '<b>Figura IA05.8.</b> La cuenta de <code>fusionar()</code> en <code>buscar.py</code>, y de una de sus pruebas.'))

# ---------------- ae-rerank
add('<h3 id="ae-rerank">Reordenar con el modelo</h3>\n')
add(analogy('Una preselección y una entrevista. La preselección mira cada currículum por separado y en segundos, y deja veinte. La entrevista lee cada uno pensando en el puesto concreto: tarda más, pero ordena mejor a los veinte.'))
add('<p>Las dos búsquedas comparan la pregunta con cada trozo sin leerlos juntos: el embedding de la pregunta se calculó sin ver el trozo. Un ' + RRer + ' lee la pregunta y el trozo a la vez y decide cuánto lo contesta. Aquí el ' + RRer + ' es el mismo modelo que responde: recibe los 20 candidatos de la búsqueda híbrida, le pone a cada uno un puntaje de 0 a 3 con salida estructurada, y pasan los 6 mejores. En producción se usa un modelo chico entrenado para esto, más barato; con el LLM no hace falta instalar nada más, y el costo se ve en la tabla.</p>\n')
add('<p>Cuesta una llamada más por pregunta, con los 20 candidatos dentro (recortados a 800 caracteres cada uno). Como supuesto, con unos 4 caracteres por token, son 16 000 caracteres, unos 4 000 tokens de entrada: 0.008 USD por pregunta con Claude, que se suman a los de la respuesta. El <a href="#paso-pipeline">paso 10</a> lo deja apagado por defecto y los evals dicen si lo vale.</p>\n')

# ---------------- ae-citas
add('<h3 id="ae-citas">Una cita que se comprueba</h3>\n')
add(analogy('Un trabajo práctico con citas textuales. Si el alumno escribe "como dice el libro, página 40", el profesor puede abrir la página 40 y buscar la frase. Si la frase no está, o la página no existe, la cita no vale, aunque lo que dice sea cierto.'))
add('<p>El modelo devuelve la respuesta con citas entre corchetes, <code>[m65#medir]</code>, y por cada cita una frase de entre 5 y 30 palabras copiada del trozo. El verificador comprueba tres cosas sin modelo: que la cita sea de uno de los trozos que se le pasaron, que la frase esté en ese trozo (sin importar mayúsculas, comillas ni espacios) y que tenga al menos cinco palabras. Comprueba también que toda cita del texto tenga su frase.</p>\n')
add('<p>Lo que no comprueba es que la respuesta sea verdad. Si el trozo dice algo falso, la cita vale. Si la frase está en el trozo pero la respuesta dice otra cosa, la cita vale. Esa es la diferencia entre las dos capas de evals: el verificador corre en cada pregunta y no cuesta nada; el juez cuesta tokens y mira si la respuesta es correcta.</p>\n')
add(figure(ficha('fi05f1', 'el verificador de citas',
    'La respuesta del modelo, con sus citas y frases, y los trozos que se le pasaron.',
    'Busca cada cita entre los trozos y cada frase, sin mayúsculas ni comillas, dentro del texto de su trozo.',
    'Las citas válidas y las inválidas con su motivo.',
    ['cita:   m08#por-que-27', 'frase:  "a la base le llegan 27 intentos por request"', 'trozo:  "... tres veces, a la base le llegan 27 intentos ..."', 'veredicto: válida'],
    'Una respuesta puede citar una sección que no recuperó, o inventar una frase, y se ve igual de bien.',
    'docs/verificar.py, paso 9; lo usan el pipeline, la API y los evals.'),
    '<b>Ficha IA05.F1.</b> El verificador.'))

# ---------------- ae-capas
add('<h3 id="ae-capas">Dos capas de evals</h3>\n')
add(analogy('Revisar una receta que salió mal. Primero miras si compraste los ingredientes correctos; después, si cocinaste bien. Si faltaba la harina, no tiene sentido culpar al horno.'))
add('<p>Una respuesta mala puede venir de dos lugares: la búsqueda no trajo la sección que contesta, o la trajo y el modelo respondió mal. Se miden por separado (<a href="' + M22 + '#evals">22.3</a>). Para la primera, cada pregunta tiene sus <b>secciones de oro</b>, las que la contestan, escritas a mano. Con eso se calcula, sin modelo y sin tokens:</p>\n')
add('<ul>\n<li><dfn data-term="recall-at-k">recall@5</dfn>: qué fracción de las secciones de oro está entre los cinco primeros resultados.</li>\n<li><b>acierto@5</b>: si al menos una está entre los cinco. Para responder alcanza con una.</li>\n<li><b>MRR</b> (mean reciprocal rank): el promedio de 1 / el puesto de la primera de oro. Si está primera vale 1; tercera, 0.33; fuera de las diez, 0.</li>\n</ul>\n')
add(figure(svg('fi05e', 770, 230, 'Las dos capas de evals',
    'Arriba, la capa de recuperación: 36 preguntas con secciones de oro, la búsqueda, recall@5, acierto@5 y MRR; sin tokens, en segundos. Abajo, la capa de respuesta: 40 preguntas k veces, el pipeline entero, el verificador y el juez; con tokens. A la derecha, qué falla detecta cada una: la primera, un troceado o una búsqueda peor; la segunda, un modelo que inventa, que no se abstiene o que cita mal.',
    '\n'.join([
        box(20, 20, 220, 80, 'Recuperación', '36 preguntas con oro', 'edge'),
        box(270, 20, 200, 80, 'recall@5, MRR', 'sin tokens, segundos', 'service'),
        box(20, 130, 220, 80, 'Respuesta', '40 preguntas, k veces', 'edge'),
        box(270, 130, 200, 80, 'juez y verificador', 'con tokens, minutos', 'gpu'),
        edge('fi05e', 'M240 60 L268 60'), edge('fi05e', 'M240 170 L268 170'),
        '<rect class="dg-box" x="500" y="20" width="250" height="80" rx="8"/>',
        text(512, 44, 'Detecta', 'dg-group'), lines(512, 64, 'un troceado o una búsqueda peor; una página que no se indexó', 36)[0],
        '<rect class="dg-box" x="500" y="130" width="250" height="80" rx="8"/>',
        text(512, 154, 'Detecta', 'dg-group'), lines(512, 174, 'un modelo que inventa, que no se abstiene, que cita mal o que cree un trozo falso', 36)[0],
    ])), '<b>Figura IA05.9.</b> Corre la primera capa en cada cambio, porque es gratis. La segunda, cuando la primera ya está bien.'))
add('<p>Las cuatro preguntas sin respuesta en el curso (Django, shaders, Bluetooth, MikroTik) no tienen oro: no cuentan en la primera capa, y en la segunda miden si el sistema se abstiene. Con 36 preguntas, el margen de una tasa cerca del 80&#8239;% es de ±1.96 × √(0.8 × 0.2 / 36) = ±0.13, trece puntos (<a href="' + M22 + '#evals-barras">22.4</a>): una diferencia de cinco puntos entre dos variantes es ruido. La tabla lo muestra al lado de cada número.</p>\n')

# ---------------- ae-juez
add('<h3 id="ae-juez">Un juez calibrado</h3>\n')
add(analogy('Un corrector nuevo en una escuela. Antes de dejarlo corregir solo, la profesora le da treinta exámenes que ya corrigió ella y compara. Si coinciden en casi todos, le cree. Si él aprueba exámenes que ella reprobó, ya sabe hacia dónde se equivoca.'))
add('<p>Un <dfn data-term="llm-juez">LLM como juez</dfn> compara cada respuesta con la de referencia y dice si es correcta. Tiene sesgos conocidos: prefiere las respuestas largas, las del primer lugar y las suyas (<a href="' + M22 + '#juez">22.7</a>). Antes de creerle, se mide cuánto coincide con una persona: tú etiquetas 30 respuestas al azar sin ver lo que dijo el juez, y se comparan.</p>\n')
add('<p>El porcentaje de acuerdo engaña. Si el 80&#8239;% de las respuestas son correctas, un juez que dice siempre "correcta" coincide contigo el 80&#8239;% de las veces sin leer nada. El <dfn data-term="kappa-cohen">kappa de Cohen</dfn> descuenta ese acuerdo por azar: (acuerdo − azar) / (1 − azar). Vale 1 si coinciden en todo y 0 si coinciden lo mismo que una moneda cargada con las mismas proporciones.</p>\n')
add(figure(svg('fi05k', 770, 260, 'La matriz del juez contra la persona',
    'Una matriz de dos por dos con diez respuestas. El juez y la persona dicen correcta: 6. Solo el juez dice correcta: 2. Solo la persona: 0. Los dos dicen incorrecta: 2. Acuerdo 0.8. El juez dice correcta 8 de 10 y la persona 6 de 10, así que el azar da 0.8 × 0.6 + 0.2 × 0.4 = 0.56. Kappa = (0.8 − 0.56) / (1 − 0.56) = 0.55.',
    '\n'.join([
        text(170, 34, 'persona: correcta', 'dg-small', 'middle'), text(310, 34, 'persona: incorrecta', 'dg-small', 'middle'),
        text(90, 84, 'juez: correcta', 'dg-small', 'end'), text(90, 154, 'juez: incorrecta', 'dg-small', 'end'),
        box(100, 50, 140, 60, '6', 'los dos', 'service'), box(250, 50, 140, 60, '2', 'el juez aprueba de más', cls='dg-warnbox'),
        box(100, 120, 140, 60, '0', 'el juez reprueba de más', cls='dg-box'), box(250, 120, 140, 60, '2', 'los dos', 'service'),
        '<rect class="dg-box" x="420" y="50" width="330" height="190" rx="8"/>',
        text(436, 76, 'acuerdo = (6 + 2) / 10 = 0.80', 'dg-small dg-mono'),
        text(436, 104, 'juez sí = 8/10, persona sí = 6/10', 'dg-small dg-mono'),
        text(436, 132, 'azar = 0.8·0.6 + 0.2·0.4 = 0.56', 'dg-small dg-mono'),
        text(436, 160, 'kappa = (0.80 − 0.56) / 0.44', 'dg-small dg-mono'),
        text(436, 184, '      = 0.55', 'dg-small dg-mono'),
        text(436, 220, 'Mira la celda de 2: el juez es blando.', 'dg-tiny'),
        text(100, 214, 'diez respuestas, el ejemplo de test_metricas.py', 'dg-tiny'),
    ])), '<b>Figura IA05.10.</b> 80&#8239;% de acuerdo y un kappa de 0.55: buena parte del acuerdo era fácil. La matriz dice además hacia dónde se equivoca el juez, y eso cambia la rúbrica.'))
add('<p>No hay un umbral universal para el kappa. Una convención muy citada, la de Landis y Koch (1977), llama "moderado" a 0.41 a 0.60 y "sustancial" a 0.61 a 0.80 <span class="badge badge--doc">Documentado</span>; con 30 etiquetas, el kappa mismo tiene un margen amplio. Úsalo para comparar dos rúbricas sobre las mismas 30 respuestas, más que para aprobar al juez de una vez.</p>\n')

# ------------------------------------------------------------------ endpoints
add('<h2 id="endpoints">Los endpoints</h2>\n')
add('<p>Una API chica con dos rutas, en <code>127.0.0.1:8005</code>, sobre el mismo pipeline que la línea de comandos. Se conecta a la base con <code>docs_lector</code>. Las dos reciben el mismo cuerpo.</p>\n')
add(ep('POST', '/preguntar', 'Busca, responde y verifica. Lo llama cualquier cliente local; la línea de comandos hace lo mismo con <code>docs preguntar</code>.',
       'POST /preguntar HTTP/1.1\nHost: 127.0.0.1:8005\nContent-Type: application/json\n\n{"pregunta": "¿Qué es pass^k?", "modo": "hibrida", "estrategia": "seccion", "reordenar": false}',
       '{\n  "respuesta": "pass^k es la fracción de tareas que se resuelven en las k corridas [m65#medir] …",\n  "sin_respuesta": false,\n  "citas": [{"cita": "m65#medir", "frase": "…", "valida": true}],\n  "problemas": [],\n  "tokens": {"entrada": 0, "salida": 0},\n  "costo_usd": "0",\n  "segundos": 0\n}',
       [('200', 'La respuesta, con cada cita marcada. <code>problemas</code> lista las citas que no pasaron el verificador, con su motivo.'),
        ('422', 'La pregunta tiene menos de 3 o más de 500 caracteres, o un <code>modo</code> o <code>estrategia</code> que no existe.'),
        ('502', 'El modelo no devolvió el formato pedido.')]))
add('<p>Los números de la respuesta son de forma, no una medición: los tokens, el costo y los segundos los vas a ver en tu corrida. <code>modo</code> es <code>lexica</code>, <code>semantica</code> o <code>hibrida</code>; <code>estrategia</code>, <code>seccion</code> o <code>fijo</code>.</p>\n')
add(ep('POST', '/buscar', 'Solo la búsqueda: sin modelo de chat y sin tokens. Devuelve los seis trozos que llegarían al modelo, con los primeros 300 caracteres de cada uno.',
       'POST /buscar HTTP/1.1\nHost: 127.0.0.1:8005\nContent-Type: application/json\n\n{"pregunta": "¿Qué es pass^k?", "modo": "lexica"}',
       '{\n  "trozos": [\n    {"cita": "m65#medir", "titulo": "… · Medir", "texto": "…"}\n  ]\n}',
       [('200', 'Hasta seis trozos; ninguno si nada coincide.'), ('422', 'El mismo de <code>/preguntar</code>.')]))
add('<p>Lo que se usa de Ollama es <code>POST /api/embed</code>, con <code>model</code> e <code>input</code> (un texto o una lista), que devuelve <code>embeddings</code>, una lista de vectores <span class="badge badge--doc">Documentado</span>. No lo llamas a mano: lo llama <code>OllamaEmbeddings</code> de LangChain.</p>\n')

# ------------------------------------------------------------------ dependencias
add('<h2 id="dependencias">Las dependencias</h2>\n')
add('<p>Crea la carpeta del proyecto y entra:</p>\n')
add(code('bash', 'mkdir ia05-docs && cd ia05-docs\nmkdir -p db docs evals tests'))
add(table(['Paquete', 'Versión', 'Para qué'], [
    ['<code>langchain</code>', '1.4.3', '<code>init_chat_model</code> y la salida estructurada, la misma para los dos modelos'],
    ['<code>langchain-anthropic</code>', '1.7.5', 'Claude'],
    ['<code>langchain-ollama</code>', '1.1.0', 'El modelo local y <code>OllamaEmbeddings</code>'],
    ['<code>psycopg[binary]</code>', '3.3.6', 'PostgreSQL'],
    ['<code>pgvector</code>', '0.5.0', 'Registra el tipo <code>vector</code> en psycopg'],
    ['<code>httpx</code>', '0.28.1', 'Bajar las páginas del curso'],
    ['<code>fastapi</code>', '0.143.0', 'La API'],
    ['<code>uvicorn</code>', '0.54.0', 'El servidor de la API'],
    ['<code>pytest</code>', '9.1.1', 'Las pruebas (grupo <code>dev</code>)'],
], right=(1,)))
add('<p>No hay LangGraph: el pipeline no tiene estado que guardar ni pausas, así que no lo necesita. Pydantic llega con LangChain y con FastAPI.</p>\n')
add(Walk('toml', 'pyproject.toml', 'Declara el proyecto, sus dependencias fijas, los dos comandos y dónde están las pruebas.',
         'uv, cuando corres <code>uv sync</code> o <code>uv run</code>.', 'Nada.', 'Un <code>.venv</code> con todo instalado y los comandos <code>docs</code> y <code>docs-api</code>.', 'ingesta consulta',
         ['Nombra el proyecto y pide Python 3.13.', 'Fija cada dependencia con <code>==</code>.', 'Deja pytest como grupo de desarrollo.', 'Declara los dos comandos y el paquete.'])
    .from_file(rd('pyproject.toml'), [
        ('[project]', [('"langchain-ollama==1.1.0"', 'El mismo paquete da el modelo de chat local y los embeddings. Los embeddings son siempre de Ollama, aunque respondas con Claude.'),
                       ('"pgvector==0.5.0"', 'El paquete de Python de pgvector, no la extensión: la extensión viene en la imagen de PostgreSQL.')]),
        ('[dependency-groups]', [('docs = "docs.cli:main"', '<code>uv run docs indexar</code>, <code>buscar</code>, <code>preguntar</code>: la línea de comandos.'),
                                 ('packages = ["docs"]', 'Un solo paquete. <code>evals/</code> no se instala: se corre con <code>python -m</code> desde la carpeta del proyecto.')]),
    ]).html())
add(try_('uv sync\nuv run python -c "import langchain_ollama, psycopg, pgvector, fastapi; print(\'ok\')"', 'Tiene que imprimir <code>ok</code>. Si uv dice que no encuentra Python 3.13, instálalo con <code>uv python install 3.13</code>.'))

# ------------------------------------------------------------------ infraestructura
add('<h2 id="infraestructura">La infraestructura</h2>\n')
add('<p>Un solo contenedor: PostgreSQL con pgvector. Ollama corre en tu máquina, como en las guías anteriores. Empieza por los dos archivos chicos:</p>\n')
add(whole('text', '.gitignore', rd('.gitignore'), 'Deja fuera de git el entorno, las cachés, la clave, el corpus bajado y los resultados de los evals.', 'git.', 'Nada.', 'Un repositorio sin <code>.venv</code> ni copias de las páginas.', 'consulta'))
add(whole('ini', '.env.example', rd('.env.example'), 'La plantilla del archivo de entorno: la clave, el modelo que responde, el juez y la carpeta del corpus.', 'Tú, al copiarlo a <code>.env</code>.', 'Nada.', 'Las variables de <code>.env</code>, que lee <code>docs/config.py</code>.', 'consulta juez'))
add(code('bash', 'cp .env.example .env\n# escribe tu clave después de ANTHROPIC_API_KEY=, o pon DOCS_MODELO=ollama y DOCS_JUEZ=ollama'))
add(whole('text', '.python-version', rd('.python-version'), 'La versión de Python que usa uv.', 'uv.', 'Nada.', 'Python 3.13.', 'consulta'))
add(Walk('yaml', 'compose.yaml', 'Levanta PostgreSQL 17 con pgvector, solo en tu máquina, y corre <code>init.sql</code> la primera vez.',
         'Tú, con <code>docker compose up -d</code>.', '<code>db/init.sql</code>.', 'Un contenedor y un volumen.', 'base',
         ['Usa la imagen de PostgreSQL 17 que trae pgvector.', 'Publica el puerto solo en <code>127.0.0.1</code>.', 'Monta <code>init.sql</code> para la primera vez.', 'Espera a que acepte conexiones.'])
    .from_file(rd('compose.yaml'), [
        ('name: ia05-docs', [('image: pgvector/pgvector:pg17', 'La imagen oficial de pgvector: PostgreSQL 17 con la extensión compilada. La extensión no se instala con pip.'),
                             ('- "127.0.0.1:55437:5432"', '55437: IA01 a IA04 usan de 55433 a 55436.'),
                             ('- ./db/init.sql', 'La imagen corre lo que esté en <code>docker-entrypoint-initdb.d</code> una sola vez, con el volumen vacío.'),
                             ('healthcheck:', '<code>pg_isready</code> cada 2 segundos: <code>docker compose ps</code> dice <code>healthy</code> cuando ya acepta conexiones.')]),
    ]).html())
add('<h3 id="infra-tabla">La tabla, sus índices y sus dos roles</h3>\n')
add(figure(svg('fi05b', 770, 230, 'La tabla trozos y quién puede qué',
    'La tabla trozos tiene la variante (estrategia y prefijo), la cita (pagina y ancla), la parte, el título, el texto, el embedding de 768 números y el tsvector que se calcula solo. Tiene cuatro índices HNSW parciales, uno por variante, y uno GIN sobre el tsvector. docs_indexador puede leer, insertar y borrar; docs_lector solo leer.',
    '\n'.join([
        box(20, 20, 470, 120, '', None, 'db'),
        text(36, 44, 'trozos', 'dg-group'),
        text(36, 68, 'estrategia, prefijo        la variante: seccion o fijo, con o sin prefijo', 'dg-tiny dg-mono'),
        text(36, 86, 'pagina, ancla, parte       la cita: m25#durable, parte 0', 'dg-tiny dg-mono'),
        text(36, 104, 'titulo, texto              lo que lee el modelo', 'dg-tiny dg-mono'),
        text(36, 122, 'embedding vector(768)      tsv tsvector, se calcula solo', 'dg-tiny dg-mono'),
        box(510, 20, 240, 56, '4 índices HNSW', 'uno por variante', 'service'),
        box(510, 84, 240, 56, '1 índice GIN', 'sobre tsv', 'service'),
        box(20, 160, 230, 54, 'docs_indexador', 'SELECT, INSERT, DELETE', 'edge'),
        box(270, 160, 220, 54, 'docs_lector', 'solo SELECT', 'client'),
        lines(510, 176, 'La API y la línea de comandos usan el lector; solo indexar y caos.py usan el indexador.', 34)[0],
    ])), '<b>Figura IA05.11.</b> Como en <a href="' + IA2 + '#infra-roles">IA02</a>, el permiso lo da la base, no el código: aunque el pipeline tenga un bug, el lector no puede borrar un trozo.'))
add(Walk('sql', 'db/init.sql', 'Crea la base, la extensión, los dos roles, la tabla con su tsvector y los cinco índices.',
         'La imagen de PostgreSQL, una sola vez, como superusuario.', 'Nada.', 'La base <code>docs</code> lista para indexar.', 'base',
         ['Crea la base y entra en ella.', 'Crea la extensión y los dos roles.', 'Crea la tabla, con el tsvector calculado y una fila por trozo y variante.', 'Crea un índice HNSW por variante y uno GIN para las palabras.', 'Da los permisos: el indexador escribe y borra, el lector solo lee.'])
    .from_file(rd('db/init.sql'), [
        ('-- La base de la documentación', [('\\connect docs', 'Lo que sigue corre dentro de la base nueva, todavía como superusuario.'),
                                           ('CREATE EXTENSION IF NOT EXISTS vector', 'La extensión se crea una vez por base. Un rol sin privilegios no puede crearla, por eso va aquí.'),
                                           ('CREATE ROLE docs_lector', 'El rol que contesta preguntas. Las claves son del laboratorio: en producción van en un gestor de secretos.')]),
        ('-- Un trozo de una página', [('prefijo     boolean NOT NULL', 'Con o sin <code>search_document: </code>. Dos filas con el mismo texto y distinto prefijo tienen embeddings distintos.'),
                                      ('embedding   vector(768) NOT NULL', 'El tamaño va en el tipo. Un vector de otro largo da error al insertar, y comparar dos de largos distintos, también.'),
                                      ('tsv         tsvector GENERATED ALWAYS', 'Una columna generada: PostgreSQL la calcula al insertar con la configuración <code>spanish</code>. Nadie la escribe a mano.'),
                                      ('UNIQUE (estrategia', 'Un trozo existe una vez por variante. Si <code>indexar</code> se cortara y se repitiera sin borrar, chocaría aquí.')]),
        ('-- Un índice HNSW por variante', [('WITH (m = 16, ef_construction = 64) WHERE estrategia', 'Índice parcial: solo contiene las filas que cumplen el <code>WHERE</code>. Una consulta con ese mismo filtro puede usarlo y busca solo entre sus filas.'),
                                            ('USING gin (tsv)', 'GIN es un índice invertido: de cada raíz, la lista de filas que la tienen. Es el que usa <code>tsv @@ consulta</code>.')]),
        ('GRANT CONNECT ON DATABASE', [('GRANT SELECT, INSERT, DELETE ON trozos TO docs_indexador', 'Sin UPDATE: un trozo no se edita, se borra la variante y se vuelve a insertar.'),
                                       ('GRANT SELECT ON trozos TO docs_lector', 'Solo leer. Un <code>DELETE</code> como lector da <code>permission denied</code>: es la <a href="#comprueba-fallas">falla 4</a>.')]),
    ]).html())
add(try_('docker compose up -d\ndocker compose ps\ndocker compose exec postgres psql -U postgres -d docs -c "\\d trozos"',
         'El servicio en <code>running</code> y <code>healthy</code>. La última línea describe la tabla: la columna <code>embedding</code> de tipo <code>vector(768)</code>, <code>tsv</code> como <code>generated always as</code>, y abajo los cinco índices: cuatro <code>hnsw</code> con su <code>WHERE</code> y uno <code>gin</code>.'))
add(errs([
    ('psql: error: … database "docs" does not exist', 'El volumen ya existía cuando agregaste <code>init.sql</code> y la imagen no lo corrió. <code>docker compose down -v</code> y levántalo de nuevo.'),
    ('ERROR:  extension "vector" is not available', 'La imagen no es la de pgvector. Revisa que <code>compose.yaml</code> diga <code>pgvector/pgvector:pg17</code>, no <code>postgres:17</code>.'),
]))
