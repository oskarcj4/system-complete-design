import math

import pytest
from hypothesis import given, strategies as st

from reco.metricas import cobertura, dcg, ndcg_at_k, recall_at_k


def test_ndcg_del_ejemplo_resuelto():
    relevancia = {"b": 3, "c": 2}
    assert dcg([0, 3, 2]) == pytest.approx(5.917, abs=1e-3)
    assert dcg([3, 2, 0]) == pytest.approx(8.893, abs=1e-3)
    assert ndcg_at_k(["a", "b", "c"], relevancia, 3) == pytest.approx(0.665, abs=1e-3)


def test_recall_cuenta_los_relevantes_dentro_de_k():
    assert recall_at_k([5, 1, 9], {1, 2}, 3) == 0.5
    assert recall_at_k([5, 1, 9], {1, 2}, 1) == 0.0
    assert recall_at_k([1, 2], {1, 2}, 10) == 1.0
def test_sin_relevantes_no_hay_metrica():
    with pytest.raises(ValueError):
        recall_at_k([1, 2], set(), 2)
    with pytest.raises(ValueError):
        ndcg_at_k([1, 2], {3: 0.0}, 2)


def test_una_lista_con_repetidos_se_rechaza():
    with pytest.raises(ValueError):
        ndcg_at_k([7, 7, 7], {7: 1.0}, 3)


def test_cobertura():
    assert cobertura([[1, 2], [2, 3]], n_items=10, k=2) == 0.3
    assert cobertura([[1, 2, 9], [2, 3, 8]], n_items=10, k=2) == 0.3
listas = st.lists(st.integers(0, 50), min_size=1, max_size=20, unique=True)
relevancias = st.dictionaries(st.integers(0, 50), st.integers(1, 3), min_size=1, max_size=10)


@given(listas, relevancias, st.integers(1, 20))
def test_ndcg_entre_cero_y_uno(lista, relevancia, k):
    assert 0.0 <= ndcg_at_k(lista, relevancia, k) <= 1.0 + 1e-12


@given(relevancias)
def test_el_orden_ideal_da_uno(relevancia):
    ideal = sorted(relevancia, key=relevancia.get, reverse=True)
    assert math.isclose(ndcg_at_k(ideal, relevancia, len(ideal)), 1.0)