"""Parte las políticas por sección (cada ## es un trozo) y guarda su embedding. Se puede correr de nuevo.

    uv run soporte-indexar
"""
from pathlib import Path

import psycopg
from pgvector.psycopg import register_vector

from soporte.config import CFG
from soporte.modelos import embeddings

CARPETA = Path(__file__).resolve().parent.parent / "politicas"


def trozos(texto: str) -> list[tuple[str, str]]:
    salida, titulo, lineas = [], None, []
    for linea in texto.splitlines():
        if linea.startswith("## "):
            if titulo:
                salida.append((titulo, "\n".join(lineas).strip()))
            titulo, lineas = linea[3:].strip(), []
        elif titulo:
            lineas.append(linea)
    if titulo:
        salida.append((titulo, "\n".join(lineas).strip()))
    return salida


def main() -> None:
    filas = [(a.name, s, t) for a in sorted(CARPETA.glob("*.md")) for s, t in trozos(a.read_text(encoding="utf-8"))]
    # El mismo prefijo de tarea que herramientas.buscar_politica, pero del lado de los documentos.
    vectores = embeddings().embed_documents([f"search_document: {s}. {t}" for _, s, t in filas])
    with psycopg.connect(CFG.db_app) as c:
        register_vector(c)
        c.execute("DELETE FROM politicas")
        c.cursor().executemany("INSERT INTO politicas VALUES (%s, %s, %s, %s)",
                               [(a, s, t, v) for (a, s, t), v in zip(filas, vectores)])
    print(f"{len(filas)} secciones indexadas de {len(set(a for a, _, _ in filas))} archivos")


if __name__ == "__main__":
    main()
