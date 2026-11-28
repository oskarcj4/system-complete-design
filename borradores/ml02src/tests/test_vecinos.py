import math

import numpy as np
import pandas as pd
import pytest

from reco import matriz, vecinos

# Cuatro usuarios y cuatro películas: A = 10, B = 20, C = 30, D = 40.
# A la vieron u1, u2 y u4; B, u1, u2 y u3; C, u2 y u3; D, solo u4.
VIERON = {10: [1, 2, 4], 20: [1, 2, 3], 30: [2, 3], 40: [4]}


def train_juguete() -> pd.DataFrame:
    filas = [(u, m, 5.0) for m, us in VIERON.items() for u in us]
    filas.append((1, 30, 2.0))  # una calificación baja no es positivo
    return pd.DataFrame(filas, columns=["userId", "movieId", "rating"])


def pares(medida, soporte=1):
    m, _, items = matriz.construir(train_juguete())
    c, n = vecinos.coocurrencia(m)
    t = vecinos.medir(c, n, m.shape[0], medida, soporte)
    return {(int(items[i]), int(items[j])): p for i, j, p in zip(t["i"], t["j"], t["puntaje"])}


def test_la_coocurrencia_cuenta_usuarios_en_comun_y_no_tiene_diagonal():
    m, _, _ = matriz.construir(train_juguete())
    c, n = vecinos.coocurrencia(m)
    assert n.tolist() == [3, 3, 2, 1]
    assert c.toarray().tolist() == [[0, 2, 1, 1], [2, 0, 2, 0], [1, 2, 0, 0], [1, 0, 0, 0]]


def test_los_cosenos_del_ejemplo():
    p = pares("coseno")
    assert p[(10, 20)] == pytest.approx(2 / 3)
    assert p[(10, 40)] == pytest.approx(1 / math.sqrt(3))
    assert p[(10, 30)] == pytest.approx(1 / math.sqrt(6))
    assert p[(20, 30)] == pytest.approx(2 / math.sqrt(6))
    assert p[(10, 20)] == p[(20, 10)]
    assert (20, 40) not in p


def test_jaccard_y_lift_del_par_a_b():
    assert pares("jaccard")[(10, 20)] == pytest.approx(2 / (3 + 3 - 2))
    assert pares("lift")[(10, 20)] == pytest.approx(2 * 4 / (3 * 3))
    assert pares("lift")[(10, 40)] == pytest.approx(1 * 4 / (3 * 1))


def test_el_soporte_quita_los_pares_con_un_solo_usuario():
    assert set(pares("lift", soporte=2)) == {(10, 20), (20, 10), (20, 30), (30, 20)}


def test_top_k_ordena_por_puntaje_y_desempata_por_id():
    t = vecinos.calcular(train_juguete(), "coseno", soporte=1, k=2)
    a = t[t["movieId"] == 10]
    assert a["vecino"].tolist() == [20, 40]
    assert t.groupby("movieId").size().max() <= 2
    assert np.issubdtype(t["juntos"].dtype, np.integer)


def test_medida_desconocida():
    m, _, _ = matriz.construir(train_juguete())
    c, n = vecinos.coocurrencia(m)
    with pytest.raises(ValueError, match="medida desconocida"):
        vecinos.medir(c, n, 4, "pearson")
