from docs.ingerir import id_de_pagina, secciones

PAGINA = """<html><body><nav>Menú del sitio</nav>
<article class="content">
  <header class="title-block"><h1>Agentes y herramientas</h1><p class="lead">Lo que viene.</p></header>
  <section class="objectives"><h2 class="plain" id="obj">Al terminar podrás</h2><ul><li>Algo.</li></ul></section>
  <h2 id="durable"><span class="sec-num">25.8</span>Ejecución durable</h2>
  <p>Guardar el estado <b>después</b> de cada paso.</p>
  <figure><svg><text>Texto de la figura</text></svg><figcaption>Figura 25.8. El checkpoint.</figcaption></figure>
  <div data-sim="durable"><p>Se llena con JavaScript</p></div>
  <aside class="level-switch"><p>Ir a la versión a fondo</p></aside>
  <h3 id="durable-retomar">Retomar<br>sin repetir</h3>
  <ul><li>Uno.</li><li>Dos.</li></ul>
  <h2 id="comprueba">Comprueba lo aprendido</h2>
  <p>Esto ya no es documentación.</p>
</article><footer>Pie</footer></body></html>"""


def test_cada_encabezado_con_id_es_una_seccion():
    s = secciones(PAGINA, "m25-agentes.html")
    assert [x.cita for x in s] == ["m25#durable", "m25#durable-retomar"]


def test_el_titulo_lleva_la_pagina_y_no_el_numero():
    s = secciones(PAGINA, "m25-agentes.html")
    assert s[0].titulo == "Agentes y herramientas · Ejecución durable"
    assert s[1].titulo == "Agentes y herramientas · Retomar sin repetir"


def test_salta_figuras_widgets_y_avisos_pero_no_los_epigrafes():
    texto = secciones(PAGINA, "m25-agentes.html")[0].texto
    assert texto.splitlines() == ["Guardar el estado después de cada paso.", "Figura 25.8. El checkpoint."]


def test_corta_en_comprueba_y_no_lee_fuera_del_articulo():
    todo = " ".join(x.texto for x in secciones(PAGINA, "m25-agentes.html"))
    assert "ya no es documentación" not in todo and "Menú" not in todo and "Pie" not in todo


def test_id_de_pagina():
    assert id_de_pagina("m061-teoria-distribuida-a-fondo.html") == "m061"
    assert id_de_pagina("checkpoint-a.html") == "checkpoint-a"
