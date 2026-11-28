"""Provoca las fallas de la línea base: uv run python fallas.py fuga | lenta"""
import sys
import time

from reco import api, informe


def fuga():
    honesto = informe.informe("global", fuga=False, guardar=False)
    con_fuga = informe.informe("global", fuga=True, guardar=False)
    print("\nNDCG@10 de cada variante, honesto contra con fuga:")
    for h, f in zip(honesto.itertuples(), con_fuga.itertuples()):
        print(f"  {h.variante:<12} {h.ndcg.split()[0]}  ->  {f.ndcg.split()[0]}")
def lenta(veces: int = 20):
    d, c = api.datos(), api.Cache()
    for variante in api.CALCULAR:
        t0 = time.perf_counter()
        for _ in range(veces):
            lista = d.calcular(variante, None)
        calcular = 1000 * (time.perf_counter() - t0) / veces
        if not c.guardar(f"falla:{variante}", lista, 60):
            sys.exit("Redis no contesta: docker compose up -d --wait")
        t0 = time.perf_counter()
        for _ in range(veces):
            c.leer(f"falla:{variante}")
        leer = 1000 * (time.perf_counter() - t0) / veces
        print(f"{variante:<12} calcular {calcular:8.2f} ms   leer de Redis {leer:6.2f} ms")
ESCENARIOS = {"fuga": fuga, "lenta": lenta}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ESCENARIOS:
        sys.exit(f"uso: uv run python fallas.py {' | '.join(ESCENARIOS)}")
    ESCENARIOS[sys.argv[1]]()