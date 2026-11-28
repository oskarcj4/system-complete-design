"""Métricas offline de una lista de recomendaciones. No dependen del resto del paquete."""
import math
from collections.abc import Iterable, Mapping, Sequence


def _primeros(recomendados: Sequence, k: int) -> list:
    lista = list(recomendados[:k])
    if len(set(lista)) != len(lista):
        raise ValueError(f"la lista repite ítems: {lista}")
    return lista


def recall_at_k(recomendados: Sequence, relevantes: set, k: int) -> float:
    if not relevantes:
        raise ValueError("sin relevantes, el recall no está definido")
    return len(set(_primeros(recomendados, k)) & relevantes) / len(relevantes)
def dcg(ganancias: Sequence[float]) -> float:
    return sum((2**g - 1) / math.log2(i + 2) for i, g in enumerate(ganancias))


def ndcg_at_k(recomendados: Sequence, relevancia: Mapping, k: int) -> float:
    if not any(v > 0 for v in relevancia.values()):
        raise ValueError("sin relevantes, el NDCG no está definido")
    obtenidas = [relevancia.get(i, 0.0) for i in _primeros(recomendados, k)]
    ideales = sorted(relevancia.values(), reverse=True)[:k]
    return dcg(obtenidas) / dcg(ideales)


def cobertura(listas: Iterable[Sequence], n_items: int, k: int) -> float:
    vistos = set()
    for lista in listas:
        vistos.update(lista[:k])
    return len(vistos) / n_items