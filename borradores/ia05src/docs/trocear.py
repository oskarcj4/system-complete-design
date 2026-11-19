"""Dos formas de partir las secciones en trozos: por sección y por tamaño fijo con solape."""
from dataclasses import dataclass

from docs.ingerir import Seccion


@dataclass(frozen=True)
class Trozo:
    pagina: str
    ancla: str           # la sección donde empieza el trozo: es lo que se cita
    parte: int
    titulo: str
    texto: str

    @property
    def cita(self) -> str:
        return f"{self.pagina}#{self.ancla}"


def por_seccion(secciones: list[Seccion], max_palabras: int = 350) -> list[Trozo]:
    """Una sección es un trozo. Si pasa de max_palabras, se parte entre párrafos, nunca a mitad de uno."""
    salida = []
    for s in secciones:
        grupos, actual, n = [], [], 0
        for parrafo in s.texto.split("\n"):
            palabras = len(parrafo.split())
            if actual and n + palabras > max_palabras:
                grupos.append(actual)
                actual, n = [], 0
            actual.append(parrafo)
            n += palabras
        if actual:
            grupos.append(actual)
        salida += [Trozo(s.pagina, s.ancla, i, s.titulo, "\n".join(g)) for i, g in enumerate(grupos)]
    return salida


def fijo(secciones: list[Seccion], tamano: int = 200, solape: int = 40) -> list[Trozo]:
    """Ventanas de `tamano` palabras que avanzan `tamano - solape`, sin mirar dónde termina una sección.

    Cada palabra recuerda de qué sección viene; el trozo se cita con la sección de su primera palabra.
    """
    if not 0 <= solape < tamano:
        raise ValueError("El solape tiene que ser menor que el tamaño.")
    salida = []
    for pagina in dict.fromkeys(s.pagina for s in secciones):
        palabras = [(p, s) for s in secciones if s.pagina == pagina for p in s.texto.split()]
        inicio, i = 0, 0
        while True:
            ventana = palabras[inicio:inicio + tamano]
            primera = ventana[0][1]
            salida.append(Trozo(pagina, primera.ancla, i, primera.titulo, " ".join(p for p, _ in ventana)))
            if inicio + tamano >= len(palabras):      # esta ventana ya llegó al final de la página
                break
            inicio, i = inicio + tamano - solape, i + 1
    return salida


def trocear(secciones: list[Seccion], estrategia: str, max_palabras: int = 350,
            tamano: int = 200, solape: int = 40) -> list[Trozo]:
    if estrategia == "seccion":
        return por_seccion(secciones, max_palabras)
    if estrategia == "fijo":
        return fijo(secciones, tamano, solape)
    raise ValueError(f"Estrategia desconocida: {estrategia}. Usa seccion o fijo.")
