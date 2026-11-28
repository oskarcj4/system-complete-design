"""Evalúa un recomendador sobre la partición: una lista por usuario, contra sus positivos de prueba."""
from collections.abc import Callable

import pandas as pd

from reco import config, metricas

Recomendador = Callable[[int, set, int], list]


def relevantes_de(test: pd.DataFrame, umbral: float = config.UMBRAL_POSITIVO) -> dict:
    pos = test[test["rating"] >= umbral]
    return {u: set(g.tolist()) for u, g in pos.groupby("userId")["movieId"]}


def vistos_de(train: pd.DataFrame) -> dict:
    return {u: set(g.tolist()) for u, g in train.groupby("userId")["movieId"]}
def por_usuario(recomendar: Recomendador, train: pd.DataFrame, test: pd.DataFrame,
                k: int = config.K) -> pd.DataFrame:
    vistos = vistos_de(train)
    filas = []
    for u, rel in relevantes_de(test).items():
        lista = recomendar(u, vistos.get(u, set()), k)
        filas.append({
            "userId": u,
            "recall": metricas.recall_at_k(lista, rel, k),
            "ndcg": metricas.ndcg_at_k(lista, dict.fromkeys(rel, 1.0), k),
            "lista": lista,
        })
    return pd.DataFrame(filas)


def resumen(tabla: pd.DataFrame, n_items: int, k: int = config.K) -> dict:
    return {"usuarios": len(tabla), "recall": tabla["recall"].mean(), "ndcg": tabla["ndcg"].mean(),
            "cobertura": metricas.cobertura(tabla["lista"], n_items, k)}