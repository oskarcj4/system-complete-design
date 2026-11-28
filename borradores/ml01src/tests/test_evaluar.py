import pandas as pd

from reco import evaluar


def test_un_oraculo_saca_uno():
    train = pd.DataFrame({"userId": [1, 1, 2], "movieId": [10, 11, 10], "rating": [5.0, 4.0, 4.0]})
    test = pd.DataFrame({"userId": [1, 1, 2, 2], "movieId": [12, 13, 11, 14], "rating": [5.0, 2.0, 4.5, 3.0]})
    relevantes = evaluar.relevantes_de(test, umbral=4.0)
    assert relevantes == {1: {12}, 2: {11}}

    def oraculo(usuario, vistos, k):
        return sorted(relevantes[usuario]) + [99, 98][: k - 1]

    tabla = evaluar.por_usuario(oraculo, train, test, k=2)
    r = evaluar.resumen(tabla, n_items=5, k=2)
    assert r["recall"] == 1.0 and r["ndcg"] == 1.0
    assert r["cobertura"] == 3 / 5