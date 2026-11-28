import pandas as pd
import pytest

from reco import popular


def calificaciones(filas) -> pd.DataFrame:
    """filas: (usuario, película, estrellas, día). El día 0 es el 1 de enero de 2018."""
    df = pd.DataFrame(filas, columns=["userId", "movieId", "rating", "dia"])
    df["ts"] = pd.Timestamp("2018-01-01") + pd.to_timedelta(df["dia"], unit="D")
    return df.drop(columns="dia")


def test_conteo_cuenta_solo_positivos_y_desempata_por_id():
    t = calificaciones([(1, 30, 5.0, 0), (2, 30, 4.0, 0), (1, 20, 4.5, 0), (2, 10, 4.0, 0),
                        (3, 40, 2.0, 0)])
    s = popular.conteo(t)
    assert s.index.tolist() == [30, 10, 20]
    assert s.tolist() == [2.0, 1.0, 1.0]
def test_peso_con_los_numeros_de_m44():
    assert popular.peso(3, 1) == 0.125
    assert popular.peso(2 / 24, 1) == pytest.approx(0.944, abs=1e-3)


def test_decaimiento_premia_lo_reciente():
    t = calificaciones([(1, 1, 5.0, 0), (2, 1, 5.0, 0), (3, 1, 5.0, 0),
                        (1, 2, 5.0, 30), (2, 2, 5.0, 30)])
    assert popular.conteo(t).index[0] == 1
    s = popular.decaimiento(t, vida_media_dias=7)
    assert s.index[0] == 2
    assert s[1] == pytest.approx(3 * 0.5 ** (30 / 7))
def test_bayesiana_con_el_ejemplo_de_m44():
    filas = [(1, 1, 5.0, 0)] + [(u, 2, 4.7, 0) for u in range(2, 2002)]
    s = popular.bayesiana(calificaciones(filas), votos_prior=20, prior=4.0)
    assert s[1] == pytest.approx(85 / 21)
    assert s[2] == pytest.approx(9480 / 2020)
    assert s.index.tolist() == [2, 1]


def test_recomendador_salta_lo_visto():
    s = pd.Series([4.0, 3.0, 2.0, 1.0], index=[10, 20, 30, 40])
    assert popular.recomendador(s)(1, {20}, 2) == [10, 30]
def test_por_genero_usa_el_favorito_y_rellena():
    peliculas = pd.DataFrame({"movieId": [10, 20, 30],
                              "generos": [["Comedy"], ["Drama"], ["Comedy", "Drama"]]})
    t = calificaciones([(1, 20, 5.0, 0), (1, 30, 4.0, 0), (2, 10, 4.0, 0), (3, 10, 5.0, 0)])
    fav = popular.genero_favorito(t, peliculas)
    assert fav == {1: "Drama", 2: "Comedy", 3: "Comedy"}
    cuenta = popular.conteo(t)
    rec = popular.recomendador_por_genero(cuenta, peliculas, fav)
    assert rec(1, {20}, 2) == [30, 10]
    assert rec(99, set(), 1) == [10]