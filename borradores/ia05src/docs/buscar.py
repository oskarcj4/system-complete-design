"""Tres búsquedas sobre la misma tabla: por palabras, por significado y la fusión de las dos con RRF."""
from dataclasses import dataclass

import psycopg
from pgvector.psycopg import register_vector

from docs.config import CFG
from docs.modelos import embeddings

K_RRF = 60          # la constante de Cormack, Clarke y Büttcher (2009)


@dataclass(frozen=True)
class Encontrado:
    id: int
    pagina: str
    ancla: str
    titulo: str
    texto: str

    @property
    def cita(self) -> str:
        return f"{self.pagina}#{self.ancla}"


COLUMNAS = "id, pagina, ancla, titulo, texto"

# plainto_tsquery une las palabras con & (todas tienen que estar). Una pregunta casi nunca usa todas las palabras
# del trozo que la contesta, así que se cambian por | (alcanza con alguna) y el puntaje premia las que tienen más.
LEXICA = f"""
SELECT {COLUMNAS} FROM trozos,
       to_tsquery('spanish', replace(plainto_tsquery('spanish', %(q)s)::text, ' & ', ' | ')) AS consulta
WHERE estrategia = %(estrategia)s AND prefijo = %(prefijo)s AND tsv @@ consulta
ORDER BY ts_rank_cd(tsv, consulta) DESC, id
LIMIT %(n)s
"""

SEMANTICA = f"""
SELECT {COLUMNAS} FROM trozos
WHERE estrategia = %(estrategia)s AND prefijo = %(prefijo)s
ORDER BY embedding <=> %(v)s::vector
LIMIT %(n)s
"""


def conectar(dsn: str = CFG.db_lector) -> psycopg.Connection:
    c = psycopg.connect(dsn, autocommit=True)
    register_vector(c)
    return c


def lexica(c, pregunta: str, estrategia: str, prefijo: bool, n: int) -> list[Encontrado]:
    filas = c.execute(LEXICA, {"q": pregunta, "estrategia": estrategia, "prefijo": prefijo, "n": n}).fetchall()
    return [Encontrado(*f) for f in filas]


def vector_de(pregunta: str, prefijo: bool) -> list[float]:
    return embeddings().embed_query(f"search_query: {pregunta}" if prefijo else pregunta)


def semantica(c, pregunta: str, estrategia: str, prefijo: bool, n: int, v: list[float] | None = None) -> list[Encontrado]:
    v = v if v is not None else vector_de(pregunta, prefijo)
    filas = c.execute(SEMANTICA, {"v": v, "estrategia": estrategia, "prefijo": prefijo, "n": n}).fetchall()
    return [Encontrado(*f) for f in filas]


def fusionar(listas: list[list[int]], k: int = K_RRF) -> list[int]:
    """Reciprocal Rank Fusion: cada lista le da 1 / (k + puesto) a cada id; gana la suma más alta.

    Solo usa los puestos, no los puntajes: un ts_rank y una distancia coseno no se pueden sumar, pero un
    tercer puesto es un tercer puesto en las dos listas. Con empate, queda primero el que apareció antes.
    """
    puntos: dict[int, float] = {}
    for lista in listas:
        for puesto, id_ in enumerate(lista, start=1):
            puntos[id_] = puntos.get(id_, 0.0) + 1.0 / (k + puesto)
    return sorted(puntos, key=lambda i: -puntos[i])


def buscar(c, pregunta: str, modo: str = "hibrida", estrategia: str = "seccion", prefijo: bool = True,
           n: int = 6, candidatos: int = 20) -> list[Encontrado]:
    if modo == "lexica":
        return lexica(c, pregunta, estrategia, prefijo, n)
    if modo == "semantica":
        return semantica(c, pregunta, estrategia, prefijo, n)
    if modo != "hibrida":
        raise ValueError(f"Modo desconocido: {modo}. Usa lexica, semantica o hibrida.")
    por_palabras = lexica(c, pregunta, estrategia, prefijo, candidatos)
    por_significado = semantica(c, pregunta, estrategia, prefijo, candidatos)
    todos = {e.id: e for e in por_palabras + por_significado}
    orden = fusionar([[e.id for e in por_palabras], [e.id for e in por_significado]])
    return [todos[i] for i in orden[:n]]
