"""Trocea el corpus, calcula el embedding de cada trozo y lo guarda. Correrlo de nuevo reemplaza esa variante."""
import time

import psycopg
from pgvector.psycopg import register_vector

from docs.config import CFG
from docs.ingerir import leer_corpus
from docs.modelos import embeddings
from docs.trocear import Trozo, trocear

LOTE = 32


def texto_para_embedding(t: Trozo, prefijo: bool) -> str:
    # nomic-embed-text pide un prefijo por tarea: search_document al indexar, search_query al buscar.
    cuerpo = f"{t.titulo}\n{t.texto}"
    return f"search_document: {cuerpo}" if prefijo else cuerpo


def indexar(estrategia: str, prefijo: bool = True) -> None:
    inicio = time.monotonic()
    trozos = trocear(leer_corpus(CFG.corpus), estrategia, CFG.max_palabras, CFG.tamano, CFG.solape)
    modelo, vectores = embeddings(), []
    for i in range(0, len(trozos), LOTE):
        lote = trozos[i:i + LOTE]
        vectores += modelo.embed_documents([texto_para_embedding(t, prefijo) for t in lote])
        print(f"\r{min(i + LOTE, len(trozos))} de {len(trozos)} trozos", end="", flush=True)
    if vectores and len(vectores[0]) != 768:
        raise SystemExit(f"{CFG.embeddings} da {len(vectores[0])} números y la columna espera 768.")
    with psycopg.connect(CFG.db_indexador) as c:
        register_vector(c)
        c.execute("DELETE FROM trozos WHERE estrategia = %s AND prefijo = %s", (estrategia, prefijo))
        c.cursor().executemany(
            "INSERT INTO trozos (estrategia, prefijo, pagina, ancla, parte, titulo, texto, embedding)"
            " VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            [(estrategia, prefijo, t.pagina, t.ancla, t.parte, t.titulo, t.texto, v) for t, v in zip(trozos, vectores)])
    paginas = len({t.pagina for t in trozos})
    print(f"\n{len(trozos)} trozos de {paginas} páginas ({estrategia}, prefijo {'sí' if prefijo else 'no'}) "
          f"en {time.monotonic() - inicio:.0f} s")
