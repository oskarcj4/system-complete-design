"""¿Cuánto se le puede creer al juez? La matriz contra tus etiquetas, el acuerdo y el kappa de Cohen.

    uv run python -m evals.calibrar
"""
import csv

from docs.metricas import kappa, matriz
from evals.etiquetar import SALIDA


def main() -> None:
    filas = list(csv.DictReader(SALIDA.open(encoding="utf-8")))
    if not filas:
        raise SystemExit(f"{SALIDA} está vacío: corre primero evals.etiquetar.")
    juez = [f["juez"] == "True" for f in filas]
    persona = [f["persona"] == "True" for f in filas]
    m = matriz(juez, persona)
    acuerdo = (m["ambos_si"] + m["ambos_no"]) / len(filas)
    print("                   persona: correcta   persona: incorrecta")
    print(f"juez: correcta     {m['ambos_si']:>17}   {m['solo_juez']:>19}")
    print(f"juez: incorrecta   {m['solo_persona']:>17}   {m['ambos_no']:>19}")
    print(f"\nAcuerdo {acuerdo:.0%} en {len(filas)} respuestas, kappa {kappa(juez, persona):.2f}")
    if m["solo_juez"] > m["solo_persona"]:
        print("El juez aprueba respuestas que tú no: es más blando que tú. Revisa esas filas antes que las otras.")
    for f in filas:
        if (f["juez"] == "True") != (f["persona"] == "True"):
            print(f"  desacuerdo: {f['id']} corrida {f['corrida']} (juez {f['juez']}, tú {f['persona']})")


if __name__ == "__main__":
    main()
