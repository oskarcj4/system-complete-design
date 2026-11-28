"""El recomendador al azar: el piso. Si un modelo no le gana, algo está mal en la medición."""
import numpy as np
import pandas as pd

from reco import config, evaluar, partir


def recomendador(catalogo: np.ndarray, semilla: int) -> evaluar.Recomendador:
    rng = np.random.default_rng(semilla)

    def recomendar(usuario: int, vistos: set, k: int) -> list:
        candidatos = np.setdiff1d(catalogo, np.fromiter(vistos, dtype=catalogo.dtype))
        return rng.choice(candidatos, size=k, replace=False).tolist()

    return recomendar
def correr(modo: str, k: int = config.K, semillas: int = 5) -> pd.DataFrame:
    train, test = partir.cargar(modo)
    catalogo = np.sort(train["movieId"].unique())
    filas = []
    for s in range(1, semillas + 1):
        tabla = evaluar.por_usuario(recomendador(catalogo, s), train, test, k)
        filas.append({"semilla": s} | evaluar.resumen(tabla, len(catalogo), k))
    r = pd.DataFrame(filas)
    print(r.to_string(index=False))
    print(f"\nrecall@{k}: media {r['recall'].mean():.4f}, desvío {r['recall'].std():.4f}")
    print(f"del orden de k / catálogo = {k} / {len(catalogo)} = {k / len(catalogo):.4f}")
    return r