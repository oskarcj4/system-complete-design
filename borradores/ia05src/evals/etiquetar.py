"""Tú eres la persona: lees 30 respuestas al azar y dices si son correctas, sin ver lo que dijo el juez.

    uv run python -m evals.etiquetar evals/respuestas-claude-seccion.jsonl
"""
import csv
import json
import random
import sys
from pathlib import Path

from evals.preguntas import PREGUNTAS

MUESTRA = 30
SALIDA = Path("evals/etiquetas.csv")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    filas = [json.loads(linea) for linea in open(sys.argv[1], encoding="utf-8")]
    referencia = {p["id"]: p for p in PREGUNTAS}
    random.seed(26)                              # la misma muestra para todos los que sigan la guía
    muestra = random.sample(filas, min(MUESTRA, len(filas)))
    hechas = []
    for i, f in enumerate(muestra, 1):
        p = referencia[f["id"]]
        print(f"\n--- {i} de {len(muestra)} · {f['id']} corrida {f['corrida']}")
        print(f"Pregunta:   {p['pregunta']}\nReferencia: {p['referencia']}\nRespuesta:  {f['respuesta']}")
        while (r := input("¿Correcta? [s/n] ").strip().lower()) not in ("s", "n"):
            pass
        hechas.append({"id": f["id"], "corrida": f["corrida"], "persona": r == "s",
                       "juez": f["veredicto"] == "correcta"})
    with SALIDA.open("w", newline="", encoding="utf-8") as archivo:
        w = csv.DictWriter(archivo, fieldnames=["id", "corrida", "persona", "juez"])
        w.writeheader()
        w.writerows(hechas)
    print(f"\n{len(hechas)} etiquetas en {SALIDA}")


if __name__ == "__main__":
    main()
