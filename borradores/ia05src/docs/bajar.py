"""Baja las páginas publicadas del curso a corpus/: lee la lista de course.data.js y trae cada módulo.

Si ya tienes el curso en tu máquina, no hace falta: apunta DOCS_CORPUS a su carpeta modules/.
"""
import re
import time

import httpx

from docs.config import CFG

PUBLICADA = re.compile(r"href: '(modules/[^']+\.html)', status: 'ready'")


def bajar(sitio: str) -> None:
    base = sitio.rstrip("/") + "/"
    with httpx.Client(timeout=20.0, follow_redirects=True) as http:
        datos = http.get(base + "assets/js/data/course.data.js")
        datos.raise_for_status()
        paginas = PUBLICADA.findall(datos.text)
        if not paginas:
            raise SystemExit("No encontré páginas publicadas: ¿la URL es la portada del curso?")
        CFG.corpus.mkdir(parents=True, exist_ok=True)
        for i, ruta in enumerate(paginas, 1):
            r = http.get(base + ruta)
            r.raise_for_status()
            (CFG.corpus / ruta.split("/")[-1]).write_text(r.text, encoding="utf-8")
            print(f"\r{i} de {len(paginas)} páginas", end="", flush=True)
            time.sleep(0.2)                     # sin apuro: es el sitio de otro
    print(f"\nGuardadas en {CFG.corpus}")
