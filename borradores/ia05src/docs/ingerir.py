"""Lee una página del curso y la parte en secciones: cada h2 o h3 con id es una sección, y su id es el ancla de la cita.

Se queda con el texto de <article class="content"> y salta lo que no es prosa: figuras SVG, scripts, menús y los
contenedores que llena JavaScript (quiz, ejercicios, widgets y mapas).
"""
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

SALTAR = {"svg", "script", "style", "nav", "button", "template"}
SALTAR_SI = ("data-quiz", "data-checkpoint", "data-exercise", "data-sim", "data-calc", "data-map")
VACIAS = {"br", "img", "input", "meta", "link", "hr", "wbr", "source", "col"}
BLOQUE = {"p", "li", "pre", "tr", "h4", "figcaption", "dt", "dd", "div", "summary", "blockquote", "table"}
NUMERO = re.compile(r"^\d+(\.\d+)*\s*")


@dataclass(frozen=True)
class Seccion:
    pagina: str          # m25
    ancla: str           # durable
    titulo: str          # Agentes y herramientas · Ejecución durable
    texto: str

    @property
    def cita(self) -> str:
        return f"{self.pagina}#{self.ancla}"


def id_de_pagina(archivo: str) -> str:
    """m25-agentes.html da m25; checkpoint-a.html da checkpoint-a."""
    raiz = Path(archivo).stem
    return raiz.split("-")[0] if re.match(r"m\d", raiz) else raiz


class _Lector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.en_articulo = 0          # profundidad dentro de <article class="content">
        self.saltando = None          # (etiqueta, profundidad) del bloque que se salta
        self.titulo_pagina, self.en_h1 = [], False
        self.encabezado = None        # el texto del h2 o h3 que se está leyendo
        self.secciones = []           # [ancla, titulo, [trozos de texto]]
        self.terminado = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.terminado:
            return
        if not self.en_articulo:
            if tag == "article" and "content" in (a.get("class") or "").split():
                self.en_articulo = 1
            return
        if tag in VACIAS:
            if tag == "br" and not self.saltando:
                self.handle_data(" ")          # "Retomar<br>sin repetir" no se pega
            return
        self.en_articulo += 1
        if self.saltando:
            if tag == self.saltando[0]:
                self.saltando = (tag, self.saltando[1] + 1)
            return
        clases = (a.get("class") or "").split()
        if tag in SALTAR or any(k in a for k in SALTAR_SI) or "level-switch" in clases:
            self.saltando = (tag, 1)
        elif tag == "h1":
            self.en_h1 = True
        elif tag in ("h2", "h3") and a.get("id"):
            if a["id"] == "comprueba":         # desde aquí: quiz, ejercicio y checkpoint
                self.terminado = True
                return
            self.encabezado = []
            self.secciones.append([a["id"], "", []])
        elif tag in BLOQUE and self.secciones:
            self.secciones[-1][2].append("\n")

    def handle_endtag(self, tag):
        if self.terminado or not self.en_articulo or tag in VACIAS:
            return
        self.en_articulo -= 1
        if self.saltando:
            if tag == self.saltando[0]:
                n = self.saltando[1] - 1
                self.saltando = (tag, n) if n else None
            return
        if tag == "h1":
            self.en_h1 = False
        elif tag in ("h2", "h3") and self.encabezado is not None:
            self.secciones[-1][1] = NUMERO.sub("", " ".join("".join(self.encabezado).split()))
            self.encabezado = None
        elif tag == "span" and self.encabezado is not None:
            self.encabezado.append(" ")         # "25.8" y "Ejecución durable" vienen pegados

    def handle_data(self, data):
        if self.terminado or not self.en_articulo or self.saltando:
            return
        data = data.replace("\n", " ")            # los saltos de línea los ponen los bloques, no el código fuente
        if self.en_h1:
            self.titulo_pagina.append(data)
        elif self.encabezado is not None:
            self.encabezado.append(data)
        elif self.secciones:
            self.secciones[-1][2].append(data)


def limpiar(partes: list[str]) -> str:
    lineas = (" ".join(linea.split()) for linea in "".join(partes).split("\n"))
    return "\n".join(linea for linea in lineas if linea)


def secciones(html: str, archivo: str) -> list[Seccion]:
    lector = _Lector()
    lector.feed(html)
    pagina = id_de_pagina(archivo)
    nombre = " ".join("".join(lector.titulo_pagina).split())
    salida = []
    for ancla, titulo, partes in lector.secciones:
        texto = limpiar(partes)
        if texto and ancla != "obj":             # "Al terminar podrás" no responde preguntas
            salida.append(Seccion(pagina, ancla, f"{nombre} · {titulo}", texto))
    return salida


def leer_corpus(carpeta: Path) -> list[Seccion]:
    archivos = sorted(carpeta.glob("*.html"))
    if not archivos:
        raise SystemExit(f"No hay páginas en {carpeta}: corre primero uv run docs bajar.")
    return [s for a in archivos for s in secciones(a.read_text(encoding="utf-8"), a.name)]
