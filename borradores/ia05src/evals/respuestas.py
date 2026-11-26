"""Segunda capa: ¿la respuesta es correcta y sus citas valen? Cada pregunta se corre k veces.

    uv run python -m evals.respuestas --k 3
    DOCS_MODELO=ollama uv run python -m evals.respuestas --k 3
    uv run python -m evals.respuestas --k 3 --reordenar
"""
import argparse
import json
from decimal import Decimal

from docs import buscar
from docs.config import CFG
from docs.juez import juzgar
from docs.metricas import intervalo, pass_k, promedio
from docs.modelos import costo, modelo_chat
from docs.pipeline import Opciones, preguntar, recuperador
from evals.preguntas import PREGUNTAS


def correr(o: Opciones, k: int, archivo: str) -> list[dict]:
    modelo, juez, filas = modelo_chat(CFG.modelo), modelo_chat(CFG.juez), []
    with buscar.conectar() as c, open(archivo, "w", encoding="utf-8") as salida:
        recuperar = recuperador(c)
        for p in PREGUNTAS:
            for corrida in range(1, k + 1):
                r = preguntar(p["pregunta"], o, modelo, recuperar)
                v, je, js = juzgar(juez, p["pregunta"], p["referencia"], r.respuesta.respuesta)
                fila = {"id": p["id"], "corrida": corrida, "con_oro": bool(p["oro"]),
                        "respuesta": r.respuesta.respuesta, "sin_respuesta": r.respuesta.sin_respuesta,
                        "citas": [x.cita for x in r.respuesta.citas], "validas": r.verificacion.validas,
                        "invalidas": r.verificacion.invalidas, "citas_ok": r.verificacion.ok,
                        "veredicto": v.veredicto, "motivo": v.motivo,
                        "costo_modelo": str(r.costo(CFG.modelo)), "costo_juez": str(costo(CFG.juez, je, js)),
                        "segundos": round(r.segundos, 2)}
                salida.write(json.dumps(fila, ensure_ascii=False) + "\n")
                filas.append(fila)
                print(f"\r{p['id']} corrida {corrida} de {k}: {v.veredicto:<10}", end="", flush=True)
    print()
    return filas


def resumen(filas: list[dict], k: int) -> None:
    con_oro = [f for f in filas if f["con_oro"]]
    sin_oro = [f for f in filas if not f["con_oro"]]
    bien = lambda f: f["veredicto"] == "correcta" and f["citas_ok"]          # noqa: E731
    correctas = promedio([f["veredicto"] == "correcta" for f in con_oro])
    citas = promedio([f["citas_ok"] for f in con_oro])
    abstiene = promedio([f["sin_respuesta"] for f in sin_oro])
    inventa = promedio([f["sin_respuesta"] for f in con_oro])
    por_pregunta: dict[str, list[bool]] = {}
    for f in filas:
        por_pregunta.setdefault(f["id"], []).append(bien(f))
    pk = promedio([pass_k(v) for v in por_pregunta.values()])
    gasto_m = sum(Decimal(f["costo_modelo"]) for f in filas)
    gasto_j = sum(Decimal(f["costo_juez"]) for f in filas)
    print(f"Correctas según el juez:      {correctas:.2f} ± {intervalo(correctas, len(con_oro)):.2f}"
          f"  ({len(con_oro)} respuestas)")
    print(f"Con todas las citas válidas:  {citas:.2f}")
    print(f"Se abstiene cuando no está:   {abstiene:.2f}  ({len(sin_oro)} respuestas)")
    print(f"Se abstiene cuando sí está:   {inventa:.2f}")
    print(f"pass^{k} (correcta y citada):  {pk:.2f}  ({len(por_pregunta)} preguntas)")
    print(f"Costo: {gasto_m:.4f} USD el modelo ({CFG.modelo}) y {gasto_j:.4f} USD el juez ({CFG.juez})")


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("--k", type=int, default=3)
    a.add_argument("--estrategia", choices=["seccion", "fijo"], default="seccion")
    a.add_argument("--sin-prefijo", action="store_true")
    a.add_argument("--reordenar", action="store_true")
    o = a.parse_args()
    opciones = Opciones(estrategia=o.estrategia, prefijo=not o.sin_prefijo, reordenar=o.reordenar)
    archivo = f"evals/respuestas-{CFG.modelo}-{o.estrategia}{'-rerank' if o.reordenar else ''}.jsonl"
    resumen(correr(opciones, o.k, archivo), o.k)
    print(f"Cada corrida quedó en {archivo}")


if __name__ == "__main__":
    main()
