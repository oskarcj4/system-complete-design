import pandas as pd
import pytest

from reco import comprados

COSENOS = {(10, 20): 0.667, (10, 40): 0.577, (20, 30): 0.816, (10, 30): 0.408}


def vecinas() -> pd.DataFrame:
    filas = []
    for (a, b), p in COSENOS.items():
        filas += [(a, b, 1, p), (b, a, 1, p)]
    return pd.DataFrame(filas, columns=["movieId", "vecino", "juntos", "puntaje"])


def test_suma_el_parecido_con_cada_semilla_y_no_repite_lo_visto():
    r = comprados.recomendador(vecinas(), {7: {10, 30}})
    assert r(7, {10, 30}, 2) == [20, 40]
    puntos = dict(comprados.puntuar({10, 30}, comprados.por_pelicula(vecinas()), {10, 30}))
    assert puntos[20] == pytest.approx(0.667 + 0.816)
    assert puntos[40] == pytest.approx(0.577)


def test_sin_semillas_la_lista_sale_vacia_y_el_relleno_la_completa():
    sin = comprados.recomendador(vecinas(), {})
    assert sin(9, set(), 3) == []
    con = comprados.recomendador(vecinas(), {}, relleno=lambda u, vistos, k: [99, 98, 97][:k])
    assert con(9, set(), 3) == [99, 98, 97]


def test_el_relleno_no_repite_lo_que_ya_recomendo():
    pedidos = []

    def relleno(u, vistos, k):
        pedidos.append(set(vistos))
        return [x for x in (20, 99) if x not in vistos][:k]

    r = comprados.recomendador(vecinas(), {7: {40}}, relleno=relleno)
    assert r(7, {40}, 2) == [10, 20]
    assert pedidos == [{40, 10}]


def test_positivos_de_usa_el_umbral():
    train = pd.DataFrame({"userId": [1, 1, 2], "movieId": [10, 20, 10], "rating": [4.0, 3.5, 5.0]})
    assert comprados.positivos_de(train) == {1: {10}, 2: {10}}
