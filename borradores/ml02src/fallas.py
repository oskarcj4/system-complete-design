"""Provoca las fallas de comprados juntos: uv run python fallas.py fuga | raras"""
import sys

import pandas as pd

from reco import config, informe, partir, vecinos


def fuga():
    honesto = informe.informe("por-usuario", fuga=False, guardar=False)
    con_fuga = informe.informe("por-usuario", fuga=True, guardar=False)
    print("\nNDCG@10 de cada variante, honesto contra con fuga:")
    for h, f in zip(honesto.itertuples(), con_fuga.itertuples()):
        print(f"  {h.variante:<18} {h.ndcg.split()[0]}  ->  {f.ndcg.split()[0]}")


def raras(n: int = 10):
    train, _ = partir.cargar("por-usuario")
    titulos = pd.read_parquet(config.PARQUET / "peliculas.parquet").set_index("movieId")["titulo"]
    for soporte in (1, config.SOPORTE_MIN):
        tabla = vecinos.calcular(train, "lift", soporte)
        arriba = tabla.sort_values(["puntaje", "movieId"], ascending=[False, True]).head(n)
        print(f"\n== lift con soporte {soporte}: los {n} pares más altos")
        for f in arriba.itertuples():
            print(f"{f.puntaje:>9.1f}  juntos {f.juntos:>3}  {titulos[f.movieId][:30]:<30}  {titulos[f.vecino][:30]}")
        print(f"pares con un solo usuario en común: {(tabla['juntos'] == 1).sum()} de {len(tabla)}")


ESCENARIOS = {"fuga": fuga, "raras": raras}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ESCENARIOS:
        sys.exit(f"uso: uv run python fallas.py {' | '.join(ESCENARIOS)}")
    ESCENARIOS[sys.argv[1]]()
