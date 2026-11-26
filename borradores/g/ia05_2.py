# IA05, parte 2: hitos 1 y 2 (pasos 1 a 7).
add('<h2 id="paso-a-paso">Paso a paso</h2>\n')
add('<p>Doce pasos en tres hitos. El primero llena la base: páginas, secciones, trozos y embeddings. El segundo busca y mide la búsqueda, sin gastar un token. El tercero responde, verifica las citas y mide las respuestas con un juez. Los archivos van en el orden en que los necesitas: ninguno importa algo que todavía no escribiste.</p>\n')

# ================================================================== hito 1
add(hito(1, 3, 120, 'Del HTML a la base', 'Bajas las páginas del curso, las partes en secciones y en trozos de dos formas, y guardas cada trozo con su embedding en PostgreSQL.', [
    ('paso-corpus', 'La configuración y las páginas'), ('paso-ingerir', 'Partir una página en secciones'),
    ('paso-trocear', 'Dos formas de trocear'), ('paso-indexar', 'Los embeddings y la base')]))

# ---------------- paso 1
add(step('paso-corpus', 'Paso 1. La configuración y las páginas',
    step_map('corpus consulta', 'La URL donde está publicado el curso, o tu copia local.', 'La carpeta <code>corpus/</code> con una página HTML por módulo.', 'Tu disco; la base todavía no.', 'Ninguno', '15 min'), ''))
add('<p>Tres archivos: la configuración, que leen todos los demás; la línea de comandos, que crece con cada paso; y el que baja las páginas. Empieza por el paquete vacío:</p>\n')
add(code('bash', 'touch docs/__init__.py evals/__init__.py'))
add(Walk('python', 'docs/config.py', 'Junta en un objeto todos los valores que se pueden cambiar por variable de entorno, con valores por defecto que apuntan al <code>compose.yaml</code> de la guía.',
         'Todos los módulos de <code>docs/</code>, con <code>from docs.config import CFG</code>.', 'Las variables de entorno, o nada.', '<code>CFG</code>, con el modelo, la carpeta del corpus, las dos conexiones y los tamaños de los trozos.', 'consulta ingesta',
         ['Arma las dos cadenas de conexión con el mismo molde.', 'Lee cada valor de una variable de entorno, con su valor por defecto.', 'Deja un único objeto, <code>CFG</code>, que no se puede modificar.'])
    .from_file(rd('docs/config.py'), [
        ('"""La configuración', [('BASE = "postgresql', 'Las dos conexiones solo cambian en el usuario y la clave. Las claves son las de <code>init.sql</code>, del laboratorio.')]),
        ('@dataclass(frozen=True)', [('modelo: str = os.environ.get("DOCS_MODELO"', 'El que responde. El juez es aparte: puedes responder con Ollama y juzgar con Claude.'),
                                     ('db_indexador: str', 'Dos cadenas, dos roles. Cada módulo elige la que necesita: solo <code>indexar.py</code> y <code>caos.py</code> usan la del indexador.'),
                                     ('embeddings: str', 'El modelo de embeddings tiene que dar 768 números, el largo de la columna. Cambiarlo es la <a href="#comprueba-fallas">falla 3</a>.'),
                                     ('max_palabras: int', '<code>int(...)</code>: las variables de entorno siempre son texto.')]),
    ]).html())
add(pydef('<code>@dataclass(frozen=True)</code> genera el constructor de la clase a partir de sus campos y prohíbe cambiarlos después: <code>CFG.modelo = "x"</code> da error. Los valores por defecto se calculan una vez, cuando Python lee el archivo; por eso hay que cambiar las variables antes de correr el comando, no durante. Más sobre los tipos en <a href="' + IA0 + '#py-tipos">IA00</a>.'))
add(Walk('python', 'docs/cli.py', 'Define los comandos <code>docs bajar</code>, <code>indexar</code>, <code>buscar</code> y <code>preguntar</code>, y llama a la función de cada uno.',
         'Tú, con <code>uv run docs …</code>.', 'Los argumentos de la línea de comandos.', 'Lo que imprime cada comando.', 'cliente consulta',
         ['Arma las opciones del pipeline a partir de los argumentos.', 'Cada comando importa su módulo recién cuando lo corres.', '<code>preguntar</code> imprime la respuesta, cada cita con su veredicto y el costo.', 'Declara los cuatro comandos y sus argumentos.'])
    .from_file(rd('docs/cli.py'), [
        ('"""La línea de comandos', [('from docs.pipeline import Opciones', 'Los <code>import</code> van dentro de las funciones. <code>docs bajar</code> funciona aunque todavía no hayas escrito <code>pipeline.py</code>, y no carga LangChain para bajar páginas.'),
                                     ('reordenar=getattr(a, "reordenar", False)', '<code>buscar</code> no tiene <code>--reordenar</code>; <code>getattr</code> con valor por defecto evita el error.')]),
        ('def cmd_bajar(a):', [('def cmd_buscar(a):', 'Solo la búsqueda, sin modelo: es lo que más vas a usar para entender por qué una respuesta salió mal.'),
                               ('print(f"{i}. [{e.cita}] {e.titulo}', '<code>!r</code> muestra el texto entre comillas y con los saltos de línea como <code>\\n</code>: ves dónde empieza y termina el trozo.')]),
        ('def cmd_preguntar(a):', [('estado = "ok" if cita.cita', 'Cada cita del modelo, con su veredicto. Las que no pasaron se listan abajo con su motivo.'),
                                   ("print(f\"\\n{' → '.join(r.pasos)}", 'Los pasos que corrió, los tokens y el costo: lo que vas a comparar entre Claude y Ollama.')]),
        ('def main() -> None:', [('sub = p.add_subparsers(required=True)', 'Un subcomando por función. Sin subcomando, argparse muestra la ayuda y sale con error.')]),
        ('    for nombre, funcion in', [('if nombre == "preguntar":', '<code>buscar</code> y <code>preguntar</code> comparten los argumentos de la búsqueda; solo <code>preguntar</code> puede reordenar.'),
                                     ('a.f(a)', 'Cada subcomando guardó su función en <code>f</code> con <code>set_defaults</code>.')]),
    ]).html())
add('<p>El corpus son las páginas publicadas del curso. Si tienes el curso en tu máquina, no bajes nada: apunta <code>DOCS_CORPUS</code> a su carpeta <code>modules</code> en <code>.env</code> y salta al <a href="#paso-ingerir">paso 2</a>. Si no, <code>bajar.py</code> lee la lista de módulos publicados del sitio y trae cada uno.</p>\n')
add(Walk('python', 'docs/bajar.py', 'Lee la lista de módulos del curso, se queda con los publicados y baja cada página a <code>corpus/</code>.',
         '<code>docs bajar --sitio …</code>, una sola vez.', 'La URL de la portada del curso.', 'Un archivo HTML por módulo publicado en <code>corpus/</code>.', 'corpus',
         ['Baja <code>course.data.js</code>, el archivo con la lista de módulos.', 'Busca los que están publicados.', 'Baja cada uno, con una pausa entre página y página.'])
    .from_file(rd('docs/bajar.py'), [
        ('"""Baja las páginas', [('PUBLICADA = re.compile', 'Cada módulo publicado aparece en <code>course.data.js</code> como <code>href: \'modules/m25-agentes.html\', status: \'ready\'</code>. Los que figuran como <code>soon</code> no tienen página.')]),
        ('def bajar(sitio: str)', [('follow_redirects=True', 'GitHub Pages y otros hostings redirigen de <code>http</code> a <code>https</code>, o agregan la barra final.'),
                                   ('raise SystemExit("No encontré', 'Una URL equivocada suele dar una página de error que no tiene la lista: mejor un mensaje claro que un corpus vacío.'),
                                   ('time.sleep(0.2)', 'Cinco páginas por segundo como mucho. Es el sitio de otro: no hay apuro.')]),
    ]).html())
add(predict('ia05-p-corpus'))
add(try_('uv run docs bajar --sitio https://TU-SITIO/\nls corpus | head -3\nls corpus | wc -l',
         'Cambia <code>https://TU-SITIO/</code> por la URL de la portada del curso. Mientras baja, el contador <code>N de M páginas</code> avanza en la misma línea, y termina con <code>Guardadas en corpus</code>. La lista empieza por los checkpoints (<code>checkpoint-a.html</code>…), que van antes que <code>m00</code> en orden alfabético, y la cuenta es la misma M que mostró el contador.'))
add(errs([
    ('httpx.HTTPStatusError: Client error \'404 Not Found\' for url \'…/assets/js/data/course.data.js\'', 'La URL no es la portada: el curso vive en una subcarpeta. Usa la dirección que abre <code>index.html</code>, con la barra final.'),
    ('No encontré páginas publicadas: ¿la URL es la portada del curso?', 'La URL respondió, pero no con la lista del curso. Ábrela en el navegador y comprueba que es la portada.'),
]))
add(why('Indexar las páginas tal como se publican, en HTML, y bajarlas una vez a disco.',
        'Leer el sitio en cada indexado, o convertirlo antes a Markdown. Lo primero carga al sitio cada vez que pruebas un troceado; lo segundo pierde los ids de las secciones, que son las citas.',
        'Si el curso cambia, tu <code>corpus/</code> queda viejo y los evals miden contra páginas que ya no son las publicadas. Vuelve a bajar antes de comparar con una medición anterior, o anota la fecha de la bajada.'))

# ---------------- paso 2
add(step('paso-ingerir', 'Paso 2. Partir una página en secciones',
    step_map('ingesta corpus', 'Las páginas de <code>corpus/</code>.', 'Una lista de secciones, cada una con su cita, su título y su texto.', 'Nada en disco: el resultado vive en memoria.', '<a href="#ae-troceado">Trocear</a>', '25 min'), ''))
add('<p>Cada página del curso tiene su contenido en <code>&lt;article class="content"&gt;</code> y un id en cada <code>h2</code> y <code>h3</code>. Ese id es la cita: <code>m25#durable</code> abre la sección exacta. <code>ingerir.py</code> lee el HTML con el parser que trae Python, se queda con la prosa y salta lo que no responde preguntas: las figuras SVG (su texto ya está en el pie y en la prosa), los scripts y los contenedores que llena JavaScript, que en el HTML están vacíos.</p>\n')
add(figure(svg('fi05i', 770, 230, 'Qué entra y qué sale de ingerir',
    'A la izquierda, un pedazo de HTML: un h2 con id durable y el número 25.8 en un span, un párrafo, una figura SVG y un div con data-quiz. A la derecha, la sección que sale: la cita m25#durable, el título Agentes y herramientas · Ejecución durable y el texto con el párrafo y el pie de la figura; el SVG y el quiz no están.',
    '\n'.join([
        '<rect class="dg-box" x="20" y="16" width="360" height="200" rx="8"/>',
        text(32, 40, '<h2 id="durable">', 'dg-tiny dg-mono'),
        text(44, 58, '<span>25.8</span>Ejecución durable</h2>', 'dg-tiny dg-mono'),
        text(32, 82, '<p>Guardar el estado después de', 'dg-tiny dg-mono'),
        text(44, 100, 'cada paso.</p>', 'dg-tiny dg-mono'),
        text(32, 124, '<figure><svg>…</svg>', 'dg-tiny dg-mono'),
        text(44, 142, '<figcaption>Figura 25.8. …', 'dg-tiny dg-mono'),
        text(32, 166, '<div data-quiz="m25"></div>', 'dg-tiny dg-mono'),
        text(32, 196, 'el SVG y el quiz se saltan', 'dg-tiny'),
        edge('fi05i', 'M384 116 H418'),
        box(420, 16, 330, 200, '', None, 'service'),
        text(436, 42, 'cita    m25#durable', 'dg-small dg-mono'),
        text(436, 72, 'título  Agentes y herramientas ·', 'dg-small dg-mono'),
        text(436, 92, '        Ejecución durable', 'dg-small dg-mono'),
        text(436, 122, 'texto   Guardar el estado después', 'dg-small dg-mono'),
        text(436, 142, '        de cada paso.', 'dg-small dg-mono'),
        text(436, 162, '        Figura 25.8. …', 'dg-small dg-mono'),
        text(436, 196, 'un párrafo por línea', 'dg-tiny'),
    ])), '<b>Figura IA05.12.</b> El número de la sección se quita del título: es parte del diseño de la página, no del tema. El nombre de la página va delante, para que el embedding sepa de qué módulo es.'))
add(Walk('python', 'docs/ingerir.py', 'Lee una página del curso y la parte en secciones, una por cada <code>h2</code> o <code>h3</code> con id, con el texto de la prosa y sin lo que no se lee.',
         '<code>indexar.py</code>, a través de <code>leer_corpus</code>, y las pruebas.', 'El HTML de una página y su nombre de archivo, o la carpeta del corpus.', 'Una lista de <code>Seccion</code>: página, ancla, título y texto.', 'ingesta corpus',
         ['Define qué etiquetas se saltan y cuáles separan párrafos.', 'Define la sección y cómo se arma su cita.', 'Recorre el HTML etiqueta por etiqueta: entra en el artículo, salta lo que no es prosa y abre una sección en cada encabezado con id.', 'Junta el texto de cada sección, un párrafo por línea, y le pone el nombre de la página al título.'])
    .from_file(rd('docs/ingerir.py'), [
        ('"""Lee una página', [('SALTAR = {"svg"', 'Etiquetas que se saltan enteras, con todo lo que tienen adentro. <code>nav</code> es el índice lateral; <code>button</code>, los botones de copiar.'),
                               ('SALTAR_SI = ("data-quiz"', 'Atributos que marcan un contenedor que llena JavaScript. En el HTML están vacíos o traen un texto de carga.'),
                               ('BLOQUE = {"p"', 'Las etiquetas que empiezan un párrafo nuevo. Sin esto, el último renglón de una lista quedaría pegado al párrafo siguiente.'),
                               ('NUMERO = re.compile', '"25.8 Ejecución durable" pasa a "Ejecución durable".')]),
        ('@dataclass(frozen=True)', [('def cita(self) -> str:', 'La cita es lo que el modelo escribe entre corchetes y lo que se busca en las secciones de oro.'),
                                     ('return raiz.split("-")[0] if re.match', '<code>m25-agentes.html</code> da <code>m25</code>; <code>m061-teoria-distribuida-a-fondo.html</code>, <code>m061</code>. Los checkpoints quedan enteros: <code>checkpoint-a</code>.')]),
        ('class _Lector(HTMLParser):', [('self.saltando = None', 'Mientras salta un bloque, recuerda la etiqueta y cuántas veces se abrió adentro: un <code>div</code> que tiene otro <code>div</code> termina en el segundo cierre.')]),
        ('    def handle_starttag', [('if not self.en_articulo:', 'Fuera del artículo no hay nada que leer: la barra superior, el sidebar y el pie se ignoran.'),
                                   ('if tag == "br" and not self.saltando:', 'Las etiquetas vacías no se cierran: no cuentan para la profundidad. Un <code>br</code> se vuelve un espacio.'),
                                   ('if tag == self.saltando[0]:', 'Otra etiqueta igual a la que se salta: un nivel más que esperar.')]),
        ('        clases = (a.get', [('or "level-switch" in clases', 'El aviso de "esta es la versión esencial" aparece en dos páginas y no contesta nada.'),
                                    ('if a["id"] == "comprueba":', 'Desde "Comprueba lo aprendido" solo vienen el quiz, el ejercicio y el checkpoint: se deja de leer.'),
                                    ('self.secciones.append([a["id"], "", []])', 'Una sección nueva: su ancla, el título que todavía no se leyó y los pedazos de texto.'),
                                    ('elif tag in BLOQUE and self.secciones:', 'Un salto de línea antes de cada bloque: después, <code>limpiar</code> lo vuelve un párrafo por línea.')]),
        ('    def handle_endtag', [('n = self.saltando[1] - 1', 'Se cerró un nivel del bloque saltado; cuando llega a cero, se vuelve a leer.'),
                                 ('self.secciones[-1][1] = NUMERO.sub', 'El título: los pedazos juntos, los espacios repetidos fuera y el número quitado.'),
                                 ('self.encabezado.append(" ")', 'El número va en un <code>span</code> pegado al texto: sin este espacio saldría "25.8Ejecución durable".')]),
        ('    def handle_data', [('data = data.replace("\\n", " ")', 'Los saltos de línea del código fuente no son párrafos: un párrafo largo puede ocupar tres líneas en el HTML.'),
                               ('elif self.secciones:', 'El texto que aparece antes del primer encabezado (la introducción) no tiene ancla y se descarta.')]),
        ('def limpiar(partes', [('if texto and ancla != "obj":', '"Al terminar podrás" tiene id, pero es una lista de objetivos: no contesta preguntas.'),
                                ('raise SystemExit(f"No hay páginas', 'Un mensaje que dice qué hacer en lugar de una lista vacía y un índice vacío.')]),
    ]).html())
add(pydef('<code>HTMLParser</code> no arma un árbol: llama a <code>handle_starttag</code>, <code>handle_data</code> y <code>handle_endtag</code> a medida que lee, como un lector que avisa "abre un párrafo", "texto", "cierra el párrafo". Por eso la clase lleva la cuenta de dónde está con atributos como <code>en_articulo</code> y <code>saltando</code>. <code>convert_charrefs=True</code> convierte <code>&amp;amp;</code> en <code>&amp;</code> antes de pasar el texto.'))
add(predict('ia05-p-ingerir'))
add(try_('uv run python -c "\nfrom docs.config import CFG\nfrom docs.ingerir import leer_corpus\ns = leer_corpus(CFG.corpus)\nprint(len(s), \'secciones\')\nm25 = [x for x in s if x.pagina == \'m25\']\nprint([x.cita for x in m25[:4]])\nprint(m25[0].titulo)\n"',
         'Primero, cuántas secciones tiene tu corpus. Después, las cuatro primeras de M25: <code>[\'m25#numeros\', \'m25#numeros-tarea\', \'m25#numeros-flota\', \'m25#numeros-requisitos\']</code>, los ids de sus primeros encabezados, sin <code>obj</code>. La última línea empieza con <code>Agentes y herramientas · </code> y sigue con el título de esa sección, sin número.'))
add(errs([
    ('No hay páginas en corpus: corre primero uv run docs bajar.', '<code>DOCS_CORPUS</code> apunta a una carpeta sin HTML. Si usas tu copia local, la ruta es la de <code>modules</code>, no la de la raíz del curso.'),
    ('0 secciones', 'Las páginas no tienen <code>&lt;article class="content"&gt;</code>: bajaste otra cosa, por ejemplo una página de error del hosting. Abre una con un editor.'),
]))
add(why('Partir por los encabezados con id y citar con ese id.',
        'Partir el texto plano de la página sin mirar el HTML. Es más simple, pero las citas serían números de trozo, que nadie puede abrir, y el modelo no podría decir de qué sección sale una frase.',
        'Una sección sin id no se puede citar: su texto queda pegado a la sección anterior. En este curso todos los <code>h2</code> y <code>h3</code> tienen id, pero en otra documentación no tiene por qué ser así.'))

# ---------------- paso 3
add(step('paso-trocear', 'Paso 3. Dos formas de trocear',
    step_map('ingesta', 'Las secciones del paso 2.', 'Una lista de trozos, cada uno con su cita y su número de parte.', 'Nada en disco.', '<a href="#ae-troceado">Trocear</a>', '20 min'), ''))
add('<p>Las dos estrategias de <a href="#ae-troceado">Trocear</a>, en un archivo. La figura muestra la que menos se ve a simple vista: las ventanas fijas cruzan de una sección a la otra.</p>\n')
add(figure(svg('fi05t', 770, 220, 'Ventanas fijas sobre dos secciones',
    'Doce palabras: siete de la sección colas y cinco de la sección breaker. Ventanas de cinco palabras que avanzan tres: la primera va de la palabra 1 a la 5, la segunda de la 4 a la 8, la tercera de la 7 a la 11 y la cuarta de la 10 a la 12. La tercera empieza en colas y termina en breaker, y se cita como colas.',
    '\n'.join(
        [text(20, 26, 'colas: 7 palabras', 'dg-group'), text(20 + 7 * 58, 26, 'breaker: 5 palabras', 'dg-group')]
        + [box(20 + i * 58, 36, 52, 34, str(i + 1), None, 'service' if i < 7 else 'queue') for i in range(12)]
        + [f'<rect class="dg-box" x="{20 + s * 58}" y="{84 + k * 30}" width="{(e - s) * 58 - 6}" height="22" rx="6"/>' + text(26 + s * 58, 99 + k * 30, f'trozo {k}: cita colas' if k < 3 else 'trozo 3: cita breaker', 'dg-tiny')
           for k, (s, e) in enumerate([(0, 5), (3, 8), (6, 11), (9, 12)])]
    )), '<b>Figura IA05.13.</b> <code>fijo(secciones, 5, 2)</code> sobre el ejemplo de <code>test_trocear.py</code>: cuatro trozos, y el tercero mezcla las dos secciones. Con 200 y 40 pasa lo mismo, a otra escala.'))
add(Walk('python', 'docs/trocear.py', 'Convierte las secciones en trozos, por sección o con ventanas fijas que se solapan.',
         '<code>indexar.py</code> y las pruebas.', 'Las secciones, la estrategia y sus tamaños.', 'Una lista de <code>Trozo</code>.', 'ingesta',
         ['Define el trozo: lo mismo que una sección, más el número de parte.', 'Por sección: junta párrafos mientras quepan en 350 palabras.', 'Fijo: pone todas las palabras de la página en fila, cada una con su sección, y corta ventanas que se solapan.', 'Elige la estrategia por nombre.'])
    .from_file(rd('docs/trocear.py'), [
        ('"""Dos formas', [('ancla: str', 'En el troceado fijo, la sección de la primera palabra. Una cita de un trozo fijo puede no contener la frase completa de la sección que nombra.')]),
        ('def por_seccion(', [('if actual and n + palabras > max_palabras:', 'Si el párrafo no cabe, cierra el grupo y empieza otro. <code>actual and</code>: un párrafo solo de más de 350 palabras va entero, sin partirse.'),
                              ('Trozo(s.pagina, s.ancla, i, s.titulo', 'Todas las partes de una sección tienen la misma cita y se distinguen por <code>parte</code>.')]),
        ('def fijo(', [('if not 0 <= solape < tamano:', 'Con un solape igual al tamaño, la ventana no avanzaría nunca.'),
                       ('for pagina in dict.fromkeys', 'Una página por vez, en el orden en que aparecen: una ventana no cruza de una página a otra.'),
                       ('palabras = [(p, s) for s in secciones', 'Cada palabra va con su sección: así la ventana sabe dónde empieza.'),
                       ('if inicio + tamano >= len(palabras):', 'La última ventana puede ser más corta; después de ella no hay otra.')]),
        ('def trocear(', [('raise ValueError(f"Estrategia desconocida', 'Un nombre mal escrito falla aquí, antes de calcular un solo embedding.')]),
    ]).html())
add(pydef('<code>dict.fromkeys(lista)</code> arma un diccionario con los elementos como claves y sin repetidos, en el orden en que aparecieron: es la forma corta de "los distintos, en orden". Un <code>set</code> no conserva el orden. <code>palabras[inicio:inicio + tamano]</code> no falla si se pasa del final: devuelve lo que haya.'))
add(predict('ia05-p-trocear'))
add(try_('uv run python -c "\nfrom docs.config import CFG\nfrom docs.ingerir import leer_corpus\nfrom docs.trocear import trocear\ns = leer_corpus(CFG.corpus)\nfor e in (\'seccion\', \'fijo\'):\n    t = trocear(s, e)\n    print(e, len(t), \'trozos\', max(len(x.texto.split()) for x in t), \'palabras el más largo\')\n"',
         'Dos líneas. En <code>fijo</code>, el más largo tiene exactamente 200 palabras. En <code>seccion</code>, el más largo puede pasar de 350 si alguna sección tiene un párrafo solo más largo (una tabla grande, por ejemplo). Anota cuántos trozos da cada una: el <a href="#paso-indexar">paso 4</a> los va a contar en la base.'))
add(why('Comparar dos estrategias con los mismos evals, en lugar de elegir una por intuición.',
        'Trocear por tokens con el tokenizer del modelo de embeddings. Es más preciso para no pasarse del límite, pero agrega una dependencia y no cambia lo que se compara: si respetar las secciones ayuda o no.',
        'Un trozo fijo cita la sección de su primera palabra. Si la respuesta está en la segunda mitad, la cita apunta a la sección anterior y el oro no coincide: el eval lo cuenta como fallo aunque el texto estuviera.'))

# ---------------- paso 4
add(step('paso-indexar', 'Paso 4. Los embeddings y la base',
    step_map('ingesta emb base', 'Los trozos del paso 3.', 'Una fila por trozo en <code>trozos</code>, con su embedding.', 'La base: borra y vuelve a escribir la variante que indexas.', '<a href="#ae-embeddings">Embeddings y coseno</a>', '25 min, más lo que tarde Ollama'), ''))
add('<p>Antes de indexar hace falta el archivo de los modelos. Tiene las tres cosas que salen de la máquina del pipeline: el modelo de chat, que vas a usar en el <a href="#paso-responder">paso 8</a>, los embeddings, que usas ya, y el precio para calcular el costo.</p>\n')
add(Walk('python', 'docs/modelos.py', 'Crea el modelo de chat (Claude u Ollama) y el de embeddings, y calcula el costo de una llamada.',
         '<code>indexar.py</code>, <code>buscar.py</code>, la línea de comandos, la API y los evals.', 'El nombre del proveedor y los tokens.', 'Un modelo de chat de LangChain, un modelo de embeddings y un costo en USD.', 'emb modelo juez',
         ['Fija el precio por millón de tokens de cada modelo.', 'Crea el modelo de chat según el proveedor.', 'Crea el de embeddings, siempre local.', 'Calcula el costo y lee los tokens de una respuesta.'])
    .from_file(rd('docs/modelos.py'), [
        ('"""Los dos modelos', [('PRECIOS = {"claude"', 'Los mismos de IA01 a IA04. Un <code>Decimal</code>, no un <code>float</code>: 0.1 + 0.2 da 0.3 exacto.')]),
        ('def modelo_chat(', [('return init_chat_model("claude-sonnet-5-5"', 'Una sola función para los dos: el resto del código no sabe cuál está usando. Ver <a href="' + IA0 + '#ae-clave">IA00</a>.'),
                              ('temperature=0, num_ctx=16384', 'Con 2 048 tokens, el valor por defecto de Ollama, seis trozos de 350 palabras más el prompt no caben, y Ollama recorta el principio sin avisar.')]),
        ('def embeddings():', [('return OllamaEmbeddings(model=CFG.embeddings', 'El mismo objeto para indexar y para buscar: si cambias el modelo, cambia en los dos lados.'),
                               ('u = getattr(raw, "usage_metadata", None) or {}', 'LangChain pone los tokens en <code>usage_metadata</code> con los mismos nombres para los dos proveedores.')]),
    ]).html())
add(Walk('python', 'docs/indexar.py', 'Trocea el corpus, calcula el embedding de cada trozo en lotes y reemplaza en la base la variante que se indexa.',
         '<code>docs indexar</code>.', 'La estrategia y si va el prefijo.', 'Las filas de esa variante en <code>trozos</code>, y una línea con cuántos trozos y cuánto tardó.', 'ingesta emb base',
         ['Arma el texto de cada trozo: título y texto, con el prefijo o sin él.', 'Calcula los embeddings de a 32 trozos.', 'Comprueba que son 768 números antes de tocar la base.', 'Borra la variante y la vuelve a insertar, en una transacción.'])
    .from_file(rd('docs/indexar.py'), [
        ('"""Trocea el corpus', [('LOTE = 32', 'Treinta y dos textos por pedido a Ollama: menos pedidos que uno por trozo, y un lote que falla no es todo el corpus.'),
                                 ('cuerpo = f"{t.titulo}\\n{t.texto}"', 'El título va dentro del embedding: "Agentes y herramientas · Ejecución durable" dice de qué trata el trozo aunque el texto no lo nombre.')]),
        ('def indexar(', [('vectores += modelo.embed_documents', '<code>embed_documents</code> recibe una lista y devuelve una lista de vectores, en el mismo orden.'),
                          ('if vectores and len(vectores[0]) != 768:', 'Antes de abrir la conexión: un modelo de otro tamaño no llega a borrar la variante vieja.'),
                          ('with psycopg.connect(CFG.db_indexador) as c:', 'El <code>with</code> de psycopg abre una transacción y hace COMMIT al salir. Si el INSERT falla, el DELETE se deshace y la variante vieja sigue ahí. Ver <a href="' + IA0 + '#py-with">IA00</a>.'),
                          ('c.execute("DELETE FROM trozos WHERE estrategia', 'Solo la variante que se indexa: las otras tres no se tocan.'),
                          ('c.cursor().executemany(', 'Un INSERT por trozo, con los parámetros separados del SQL: el texto de una página nunca se mezcla con la consulta.')]),
    ]).html())
add(predict('ia05-p-indexar'))
add(try_('uv run docs indexar\ndocker compose exec postgres psql -U postgres -d docs -c "SELECT estrategia, prefijo, count(*), count(DISTINCT pagina) AS paginas FROM trozos GROUP BY 1, 2"',
         'Mientras calcula, <code>N de M trozos</code> avanza en la misma línea; termina con <code>M trozos de P páginas (seccion, prefijo sí) en S s</code>. La M es la misma que el <a href="#paso-trocear">paso 3</a> contó para <code>seccion</code>. La consulta muestra una fila, <code>seccion | t</code>, con esa M y esa P. Córrelo otra vez: la cuenta no cambia, porque cada corrida borra la variante antes de insertar.'))
add(errs([
    ('httpx.ConnectError: [Errno 111] Connection refused', 'Ollama no está corriendo. <code>ollama serve</code>, o abre la aplicación.'),
    ('ollama._types.ResponseError: model "nomic-embed-text" not found, try pulling it first', '<code>ollama pull nomic-embed-text</code>.'),
    ('psycopg.OperationalError: connection failed: … port 55437 failed: Connection refused', 'La base no está levantada: <code>docker compose up -d</code>.'),
]))
add(comparar('Los embeddings son siempre de Ollama: este paso no cambia con <code>DOCS_MODELO</code> ni gasta tokens de Anthropic. Lo que tarda depende de tu máquina: anota los segundos que imprime, porque es lo que vas a pagar cada vez que cambies el troceado.'))
add(why('Embeddings locales con <code>nomic-embed-text</code> y una tabla en el mismo PostgreSQL de siempre.',
        'Una API de embeddings y una base de vectores aparte. Darían más calidad o más escala, pero cada indexado mandaría el corpus afuera y tendrías dos sistemas que mantener sincronizados. A esta escala, pgvector alcanza y los trozos quedan al lado de sus citas.',
        'Si cambias de modelo de embeddings, todo lo indexado deja de servir: los vectores de dos modelos no se comparan. No se mezclan en silencio porque la columna fija el largo, pero dos modelos de 768 números sí se mezclarían. Reindexa todas las variantes después de cambiarlo.'))
add(done(['Las páginas del curso en <code>corpus/</code>, o tu copia local apuntada con <code>DOCS_CORPUS</code>.',
          'Cada página partida en secciones con su cita, y cada sección en trozos.',
          'La variante <code>seccion</code> con prefijo en PostgreSQL, con su embedding y su tsvector.'],
         'docker compose exec postgres psql -U postgres -d docs -c "SELECT pagina || \'#\' || ancla AS cita, left(texto, 60) FROM trozos WHERE pagina = \'m25\' ORDER BY id LIMIT 3"',
         'Tres trozos de M25 con su cita, en el orden de la página, empezando por <code>m25#numeros</code>.'))

# ================================================================== hito 2
add(hito(2, 3, 120, 'Buscar y medir la búsqueda', 'Buscas por palabras, por significado y con las dos juntas, y mides cuál trae la sección correcta con 36 preguntas, sin gastar tokens.', [
    ('paso-buscar', 'Tres búsquedas'), ('paso-recuperacion', 'Medir la búsqueda'), ('paso-variantes', 'Cambiar una cosa y medir')]))

# ---------------- paso 5
add(step('paso-buscar', 'Paso 5. Tres búsquedas',
    step_map('consulta emb base', 'Una pregunta.', 'Hasta seis trozos, ordenados.', 'Nada: el lector solo lee.', '<a href="#ae-lexica">Por palabras y por significado</a> y <a href="#ae-rrf">RRF</a>', '25 min'), ''))
add(figure(svg('fi05q', 770, 200, 'Qué hace la búsqueda por palabras con la pregunta',
    'La pregunta, por qué mi política RLS no filtra nada, pasa por plainto_tsquery con la configuración spanish, que la reduce a raíces unidas con &, todas obligatorias. El código cambia cada & por |, alguna alcanza, y la vuelve a leer con simple para no recortar las raíces otra vez. ts_rank_cd ordena por cuántas aparecen y qué tan juntas.',
    '\n'.join([
        box(20, 20, 220, 60, 'La pregunta', 'texto libre', 'client'),
        box(275, 20, 220, 60, 'plainto_tsquery', "'spanish': raíz & raíz", 'db'),
        box(530, 20, 220, 60, '& por |', "to_tsquery('simple')", 'service'),
        edge('fi05q', 'M240 50 H273'), edge('fi05q', 'M495 50 H528'),
        lines(20, 110, 'plainto_tsquery quita las palabras vacías ("por", "mi", "no") y deja raíces unidas con &: todas tienen que estar en el trozo. Una pregunta casi nunca repite todas las palabras de la sección que la contesta.', 110)[0],
        lines(20, 160, 'Con |, alcanza con una; ts_rank_cd premia los trozos que tienen más, y más juntas. No hace falta que sepas a qué raíz exacta llega cada palabra: lo puedes ver con SELECT plainto_tsquery(\'spanish\', \'…\').', 110)[0],
    ])), '<b>Figura IA05.14.</b> La consulta <code>LEXICA</code>. El <code>&amp;</code> de <code>plainto_tsquery</code> es demasiado estricto para preguntas; el <code>|</code> con un ranking es lo que hace un buscador.'))
add(Walk('python', 'docs/buscar.py', 'Busca los trozos de una variante por palabras, por significado o con las dos, y fusiona las dos listas con RRF.',
         'La línea de comandos, la API, el pipeline y los evals de recuperación.', 'Una conexión de lector, la pregunta, el modo y la variante.', 'Una lista de <code>Encontrado</code>, el mejor primero.', 'consulta emb base',
         ['Define lo que devuelve una búsqueda: el id, la cita, el título y el texto.', 'Escribe las dos consultas: por palabras con OR y por distancia coseno.', 'Calcula el embedding de la pregunta con su prefijo.', 'Fusiona dos listas de ids por sus puestos.', 'En modo híbrido, pide 20 candidatos a cada búsqueda y devuelve los n primeros de la fusión.'])
    .from_file(rd('docs/buscar.py'), [
        ('"""Tres búsquedas', [('K_RRF = 60', 'La k del artículo original. No se ajusta: el atractivo de RRF es que funciona sin <span class="no-autolink">calibrar</span> nada.')]),
        ('@dataclass(frozen=True)', [('id: int', 'El id de la fila: la fusión lo usa para saber que el mismo trozo vino de las dos búsquedas.')]),
        ('# plainto_tsquery reduce', [("to_tsquery('simple', replace(", 'La raíz en español, el cambio de <code>&amp;</code> por <code>|</code> y la segunda lectura con <code>simple</code>, que no vuelve a recortar.'),
                                      ('ORDER BY ts_rank_cd(tsv, consulta) DESC, id', '<code>id</code> desempata: dos corridas devuelven el mismo orden, y los evals se pueden repetir.'),
                                      ('ORDER BY embedding <=> %(v)s::vector', '<code>&lt;=&gt;</code> es la distancia coseno de pgvector. Con el <code>WHERE</code> de la variante, PostgreSQL puede usar el índice parcial que le corresponde.')]),
        ('def conectar(', [('c = psycopg.connect(dsn, autocommit=True)', 'Con <code>autocommit</code>, cada consulta es su propia transacción: una conexión que solo lee no deja transacciones abiertas.'),
                           ('return embeddings().embed_query(f"search_query: {pregunta}"', '<code>embed_query</code> para una pregunta, con su prefijo. Al indexar fue <code>embed_documents</code> con <code>search_document</code>.'),
                           ('v = v if v is not None else vector_de', 'Las pruebas pueden pasar un vector armado a mano y no llamar a Ollama.')]),
        ('def fusionar(', [('puntos[id_] = puntos.get(id_, 0.0) + 1.0 / (k + puesto)', 'La fórmula de RRF. Un trozo que aparece en las dos listas suma dos veces.'),
                           ('return sorted(puntos, key=lambda i: -puntos[i])', '<code>sorted</code> es estable: con empate, queda primero el que entró antes al diccionario, el de la primera lista.')]),
        ('def buscar(', [('raise ValueError(f"Modo desconocido', 'La API valida el modo antes de llegar aquí; esto cuida a la línea de comandos y a las pruebas.'),
                         ('todos = {e.id: e for e in por_palabras + por_significado}', 'Un diccionario por id: si un trozo vino de las dos listas, queda una vez.')]),
    ]).html())
add(pydef('<code>%(q)s</code> en el SQL es un parámetro con nombre: psycopg manda la consulta y los valores por separado, y la pregunta nunca se pega en el texto del SQL. Por eso una pregunta con comillas o con <code>; DROP TABLE</code> no rompe nada. <code>lambda i: -puntos[i]</code> es una función de una línea: ordena por el puntaje, de mayor a menor.'))
add(predict('ia05-p-rrf'))
add(try_('uv run docs buscar "FORCE ROW LEVEL SECURITY" --modo lexica --n 3\nuv run docs buscar "FORCE ROW LEVEL SECURITY" --modo semantica --n 3\nuv run docs buscar "¿por qué mi política no filtra las filas del dueño de la tabla?" --modo hibrida --n 3',
         'Tres listas de tres trozos con su cita, su título y el comienzo del texto. En la primera, las citas son de páginas que nombran la cláusula: en este curso, M05 y M35 la usan. Compara la segunda: ¿trae las mismas o secciones que solo hablan de SQL en general? La tercera no usa la palabra FORCE: mira si la fusión trae igual la sección de M35. No hay una respuesta que tenga que salir: lo que ves es el punto de partida que el paso 6 convierte en números.'))
add(errs([
    ('psycopg.errors.DataException: different vector dimensions 384 and 768', 'Indexaste con un modelo y buscas con otro. <code>DOCS_EMBEDDINGS</code> tiene que ser el mismo en los dos lados: es la <a href="#comprueba-fallas">falla 3</a>.'),
    ('Ninguna línea en modo lexica', 'Ninguna raíz de la pregunta está en los trozos de esa variante. Prueba <code>--estrategia</code> con la que indexaste: si solo indexaste <code>seccion</code>, <code>fijo</code> está vacía.'),
]))
add(why('Las dos búsquedas siempre, fusionadas por sus puestos.',
        'Sumar los puntajes con un peso, como 0.7 × coseno + 0.3 × ts_rank. Necesita <span class="no-autolink">normalizar</span> dos escalas que no se parecen y ajustar el peso para tu corpus; RRF no tiene nada que ajustar.',
        'La fusión pide 20 a cada búsqueda. Una sección que no está entre las 20 primeras de ninguna no puede aparecer aunque sea la correcta: si el eval falla en una pregunta, mira primero si la sección aparece con <code>--n 20</code>.'))

# ---------------- paso 6
add(step('paso-recuperacion', 'Paso 6. Medir la búsqueda',
    step_map('evals consulta base', 'Las 40 preguntas, de las cuales 36 tienen secciones de oro.', 'Una tabla con recall@5, acierto@5 y MRR por modo, y un JSON.', 'Un archivo en <code>evals/</code>.', '<a href="#ae-capas">Dos capas de evals</a>', '30 min'), ''))
add('<p>Las preguntas son una caja negra: un archivo con 40 diccionarios, cada uno con su pregunta, sus secciones de oro y una respuesta de referencia. Las escribió una persona leyendo el curso, y no hace falta entenderlas para seguir: cópialo desde el <a href="#anexo-preguntas">anexo</a>, donde está entero con la lista de qué cubre.</p>\n')
add(figure(flow('fi05g', 'Las preguntas, como caja negra', 'evals/preguntas.py entra al eval de recuperación, que busca cada una de las 36 con oro y compara las citas con el oro, y al eval de respuesta, que pregunta las 40 y compara con la referencia.', [
    ('preguntas.py', '40 preguntas'), ('36 con oro', 'la sección que contesta'), ('4 sin respuesta', 'Django, GLSL, BLE, MikroTik'), ('Dos evals', 'recuperación y respuesta')]),
    '<b>Figura IA05.15.</b> El oro es una lista porque una pregunta puede tener la respuesta en varias secciones: la de pass^k está en M25, M65 y M72.'))
add(Walk('python', 'docs/metricas.py', 'Las cuentas de los evals: recall, acierto y rango recíproco en k, el intervalo de una proporción, pass^k, y la matriz y el kappa del juez.',
         'Los evals y sus pruebas.', 'Listas de citas, de oro o de veredictos.', 'Números.', 'evals',
         ['Recall y acierto: cuántas secciones de oro aparecen entre las k primeras.', 'Rango recíproco: 1 / el puesto de la primera de oro.', 'El margen del 95&#8239;% de una proporción y pass^k.', 'La matriz y el kappa entre el juez y la persona, que usa el <a href="#paso-juez">paso 12</a>.'])
    .from_file(rd('docs/metricas.py'), [
        ('"""Las métricas', [('raise ValueError("Una pregunta sin oro', 'Las cuatro sin respuesta no entran a esta capa: dividir por cero escondería el error.'),
                             ('return len(set(encontradas[:k]) & set(oro))', 'En el troceado por sección, dos partes de la misma sección tienen la misma cita: el <code>set</code> las cuenta una vez.'),
                             ]),
        ('def rango_reciproco(', [('for puesto, cita in enumerate(encontradas[:k], start=1):', 'Solo la primera de oro cuenta. Más allá de la décima vale 0.'),
('return 1.96 * math.sqrt(p * (1 - p) / n)', 'La aproximación normal de <a href="' + M22 + '#evals-barras">22.4</a>. Con 36 preguntas y p = 0.8 da 0.13.'),
                           ('return bool(corridas) and all(corridas)', '<code>all([])</code> da <code>True</code>: sin corridas, una pregunta no aprueba.')]),
        ('def matriz(', [('m["ambos_si" if j and p else', 'Cada par cae en una de las cuatro celdas de la <a href="#ae-juez">figura IA05.10</a>.'),
                         ('azar = si_juez * si_persona', 'La probabilidad de coincidir si cada uno dijera "sí" con su propia proporción, sin mirarse.'),
                         ('return 1.0 if azar == 1 else', 'Si los dos dicen siempre lo mismo, el azar es 1 y la fórmula dividiría por cero.')]),
    ]).html())
add(Walk('python', 'evals/recuperacion.py', 'Corre las 36 preguntas con oro por las tres búsquedas y mide si traen la sección que contesta.',
         'Tú, con <code>uv run python -m evals.recuperacion</code>.', 'La estrategia y si va el prefijo; las preguntas y la base.', 'Una tabla en la terminal y un JSON en <code>evals/</code>.', 'evals consulta base',
         ['Para cada pregunta con oro, busca diez trozos.', 'Calcula las tres métricas y anota las que fallan.', 'Repite con los tres modos, imprime la tabla y la guarda.'])
    .from_file(rd('evals/recuperacion.py'), [
        ('"""Primera capa', [('K = 5', 'Cinco, no seis: si el oro está en el sexto puesto, llega al modelo por poco. Medir con un margen avisa antes.')]),
        ('def medir(', [('buscar.buscar(c, p["pregunta"], modo, estrategia, prefijo, n=10)', 'Diez, para que el MRR vea hasta el décimo puesto.'),
                        ('fallos.append(p["id"])', 'Las que no traen ninguna sección de oro entre las cinco. Son las que vas a mirar una por una.'),
                        ('"margen": intervalo(a, len(con_oro))', 'El margen va al lado del número, siempre.')]),
        ('def main()', [('for modo in ("lexica", "semantica", "hibrida"):', 'Los tres modos sobre la misma variante: la tabla compara búsquedas, no troceados.'),
                        ('nombre = f"evals/resultados-recuperacion-', 'Un archivo por variante: el paso 7 los compara.')]),
    ]).html())
add(predict('ia05-p-recuperacion'))
add(try_('uv run python -m evals.recuperacion',
         'Una tabla con una fila por modo: <code>lexica</code>, <code>semantica</code> e <code>hibrida</code>, con <code>recall@5</code>, <code>acierto@5</code>, su <code>±</code> y <code>MRR@10</code>, y a la derecha los ids de las preguntas que fallan. Abajo, <code>Guardado en evals/resultados-recuperacion-seccion-con.json</code>. No gasta tokens y tarda lo que tarden 72 embeddings y 144 consultas. Anota los números en la tabla del paso 7.'))
add('<p>Mira la columna de las que fallan antes que los promedios. Para cada id que aparece, corre <code>uv run docs buscar</code> con su pregunta y <code>--n 10</code>: si la sección de oro aparece en el puesto 7, la búsqueda casi acierta; si no aparece nunca, mira la sección en la página, porque quizás la pregunta usa palabras que la sección no tiene, o el oro está mal.</p>\n')
add(errs([
    ('ModuleNotFoundError: No module named \'evals\'', 'Corre el comando desde la carpeta del proyecto, con <code>python -m</code>, y comprueba que existe <code>evals/__init__.py</code>.'),
    ('Todas las métricas en 0.00', 'La variante no está indexada, o el corpus no tiene las páginas del oro. Corre <code>docs buscar</code> con una pregunta y mira qué trae.'),
]))
add(why('Medir la búsqueda sola, contra secciones de oro escritas a mano, antes de gastar un token.',
        'Medir solo la respuesta final. Un juez te diría que el 70&#8239;% está bien, pero no si el 30&#8239;% restante falla porque no se encontró la sección o porque el modelo la leyó mal, y cada medición costaría dinero.',
        'El oro lo escribió una persona y puede estar incompleto: si otra sección también contesta, la búsqueda la trae y el eval la cuenta como fallo. Lo vas a ver en la falla 2.'))

# ---------------- paso 7
add(step('paso-variantes', 'Paso 7. Cambiar una cosa y medir',
    step_map('ingesta emb base evals', 'Las otras tres variantes del índice.', 'Una tabla tuya con las cuatro variantes por tres modos.', 'La base: tres variantes más.', 'Ninguno: es el método del eval.', '30 min, más lo que tarde Ollama'), ''))
add('<p>Ahora que la medición existe, cambia una sola cosa por vez. Indexa las otras tres variantes y corre el eval sobre cada una. Como la tabla guarda cada variante por separado, indexar una no borra las otras:</p>\n')
add(code('bash', 'uv run docs indexar --estrategia fijo\nuv run docs indexar --sin-prefijo\nuv run docs indexar --estrategia fijo --sin-prefijo\n\nuv run python -m evals.recuperacion --estrategia fijo\nuv run python -m evals.recuperacion --sin-prefijo\nuv run python -m evals.recuperacion --estrategia fijo --sin-prefijo'))
add(predict('ia05-p-variantes'))
add(try_('docker compose exec postgres psql -U postgres -d docs -c "SELECT estrategia, prefijo, count(*) FROM trozos GROUP BY 1, 2 ORDER BY 1, 2"',
         'Cuatro filas: <code>fijo</code> y <code>seccion</code>, cada una con <code>f</code> y <code>t</code>. Las dos de la misma estrategia tienen la misma cuenta: el prefijo cambia el embedding, no el troceado.'))
add('<p>Copia el acierto@5 y el MRR de cada corrida. La tabla queda vacía a propósito: los números son los de tu corpus y tu máquina.</p>\n')
add(table(['Estrategia', 'Prefijo', 'Modo', 'acierto@5', '±', 'MRR@10'], [
    ['seccion', 'sí', 'lexica', '', '', ''], ['seccion', 'sí', 'semantica', '', '', ''], ['seccion', 'sí', 'hibrida', '', '', ''],
    ['seccion', 'no', 'semantica', '', '', ''], ['seccion', 'no', 'hibrida', '', '', ''],
    ['fijo', 'sí', 'semantica', '', '', ''], ['fijo', 'sí', 'hibrida', '', '', ''],
    ['fijo', 'no', 'hibrida', '', '', ''],
], right=(3, 4, 5)))
add('<p>Tres preguntas para leerla. ¿La híbrida le gana a las dos por separado, o solo a una? ¿La diferencia entre dos filas es más grande que el margen? Con 36 preguntas, una diferencia de 0.05 casi nunca lo es. Y para la búsqueda léxica el prefijo no cambia nada, porque el tsvector se calcula del texto, sin prefijo: si sus dos filas dan distinto, algo está mal.</p>\n')
add(why('Una variable por vez, y las cuatro variantes guardadas en la misma tabla.',
        'Cambiar el troceado, el prefijo y el modo de búsqueda a la vez y quedarte con la mejor combinación. Con 36 preguntas, alguna combinación gana por azar, y no sabrías cuál de los tres cambios la hizo ganar.',
        'El troceado fijo pierde en la métrica también por cómo se cita: un trozo que contiene la respuesta con la cita de la sección anterior cuenta como fallo. Antes de descartarlo, mira dos o tres de sus fallos a mano.'))
add(done(['Tres búsquedas sobre la misma tabla, por palabras, por significado y fusionadas.',
          'Una medición de la búsqueda con recall@5, acierto@5 y MRR, sin tokens.',
          'Cuatro variantes del índice y tu tabla con sus números.'],
         'uv run python -m evals.recuperacion && ls evals/*.json',
         'La tabla de la variante <code>seccion</code> con prefijo, y los cuatro JSON de resultados, uno por variante.'))
