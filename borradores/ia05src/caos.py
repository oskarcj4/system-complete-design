"""Rompe el índice a propósito, para ver qué capa de los evals lo nota.

    uv run python caos.py contradiccion   # un trozo viejo que define pass^k al revés
    uv run python caos.py olvidar m27     # borra una página del índice, como si nunca se hubiera indexado
    uv run python caos.py deshacer        # borra el trozo viejo; lo olvidado vuelve con docs indexar
"""
import sys

import psycopg
from pgvector.psycopg import register_vector

from docs.config import CFG
from docs.indexar import texto_para_embedding
from docs.modelos import embeddings
from docs.trocear import Trozo

VIEJO = Trozo("notas", "pass-k", 0, "Notas viejas del equipo · pass^k",
              "pass^k es la probabilidad de que al menos uno de k intentos pase. Con k = 5, un agente que acierta "
              "la mitad de las veces tiene un pass^k de casi 97 %, y por eso pass^k es la métrica que conviene "
              "mostrar cuando el agente todavía falla seguido.")


def contradiccion(c) -> None:
    for prefijo in (True, False):
        v = embeddings().embed_documents([texto_para_embedding(VIEJO, prefijo)])[0]
        c.execute("INSERT INTO trozos (estrategia, prefijo, pagina, ancla, parte, titulo, texto, embedding)"
                  " VALUES ('seccion', %s, %s, %s, %s, %s, %s, %s) ON CONFLICT DO NOTHING",
                  (prefijo, VIEJO.pagina, VIEJO.ancla, VIEJO.parte, VIEJO.titulo, VIEJO.texto, v))
    print("Agregado notas#pass-k, con la definición de pass@k en lugar de la de pass^k.")


def olvidar(c, pagina: str) -> None:
    n = c.execute("DELETE FROM trozos WHERE pagina = %s", (pagina,)).rowcount
    print(f"Borrados {n} trozos de {pagina}. Vuelven con uv run docs indexar.")


def deshacer(c) -> None:
    n = c.execute("DELETE FROM trozos WHERE pagina = %s", (VIEJO.pagina,)).rowcount
    print(f"Borrados {n} trozos de {VIEJO.pagina}.")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("contradiccion", "olvidar", "deshacer"):
        raise SystemExit(__doc__)
    with psycopg.connect(CFG.db_indexador) as conexion:
        register_vector(conexion)
        if sys.argv[1] == "contradiccion":
            contradiccion(conexion)
        elif sys.argv[1] == "olvidar":
            olvidar(conexion, sys.argv[2] if len(sys.argv) > 2 else "m27")
        else:
            deshacer(conexion)
