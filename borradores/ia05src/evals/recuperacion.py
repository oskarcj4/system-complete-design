"""Primera capa: ¿la búsqueda trae la sección que contesta? Sin modelo de chat y sin tokens.

    uv run python -m evals.recuperacion                     # las tres búsquedas sobre seccion con prefijo
    uv run python -m evals.recuperacion --estrategia fijo   # la misma tabla con el troceado fijo
    uv run python -m evals.recuperacion --sin-prefijo
"""
import argparse
import json
import time

from docs import buscar
from docs.metricas import acierto_en_k, intervalo, promedio, rango_reciproco, recall_en_k
from evals.preguntas import PREGUNTAS

K = 5


def medir(c, modo: str, estrategia: str, prefijo: bool) -> dict:
    con_oro = [p for p in PREGUNTAS if p["oro"]]
    recall, acierto, rr, fallos = [], [], [], []
    inicio = time.monotonic()
    for p in con_oro:
        citas = [e.cita for e in buscar.buscar(c, p["pregunta"], modo, estrategia, prefijo, n=10)]
        recall.append(recall_en_k(citas, p["oro"], K))
        acierto.append(acierto_en_k(citas, p["oro"], K))
        rr.append(rango_reciproco(citas, p["oro"], 10))
        if not acierto[-1]:
            fallos.append(p["id"])
    a = promedio(acierto)
    return {"modo": modo, "estrategia": estrategia, "prefijo": prefijo, "preguntas": len(con_oro),
            "recall@5": promedio(recall), "acierto@5": a, "margen": intervalo(a, len(con_oro)),
            "mrr@10": promedio(rr), "fallos": fallos, "segundos": time.monotonic() - inicio}


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("--estrategia", choices=["seccion", "fijo"], default="seccion")
    a.add_argument("--sin-prefijo", action="store_true")
    o = a.parse_args()
    filas = []
    with buscar.conectar() as c:
        for modo in ("lexica", "semantica", "hibrida"):
            filas.append(medir(c, modo, o.estrategia, not o.sin_prefijo))
    print(f"{'modo':<10} {'recall@5':>9} {'acierto@5':>10} {'±':>6} {'MRR@10':>7}  fallan")
    for f in filas:
        print(f"{f['modo']:<10} {f['recall@5']:>9.2f} {f['acierto@5']:>10.2f} {f['margen']:>6.2f} "
              f"{f['mrr@10']:>7.2f}  {' '.join(f['fallos']) or '-'}")
    nombre = f"evals/resultados-recuperacion-{o.estrategia}-{'sin' if o.sin_prefijo else 'con'}.json"
    with open(nombre, "w", encoding="utf-8") as archivo:
        json.dump(filas, archivo, ensure_ascii=False, indent=2)
    print(f"\nGuardado en {nombre}")


if __name__ == "__main__":
    main()
