import pandas as pd

from reco.partir import fugas, por_corte_global, por_usuario

EVENTOS = [  # usuario, película, día
    (1, 1, 1), (1, 2, 2), (1, 3, 9), (1, 4, 10),
    (2, 1, 3), (2, 5, 4), (2, 6, 5), (2, 7, 6),
    (3, 2, 7), (3, 8, 8),
]


def juguete() -> pd.DataFrame:
    df = pd.DataFrame(EVENTOS, columns=["userId", "movieId", "dia"])
    df["rating"] = 4.0
    df["ts"] = pd.Timestamp("2018-01-01") + pd.to_timedelta(df["dia"], unit="D")
    return df


def pares(df) -> set:
    return set(zip(df["userId"], df["movieId"]))
def test_corte_global():
    train, test, meta = por_corte_global(juguete(), fraccion=0.2)
    assert pares(test) == {(1, 3), (1, 4)}
    assert len(train) == 8
    assert fugas(train, test) == 0
    assert meta["fuera_por_usuario_nuevo"] == 0


def test_por_usuario_deja_el_ultimo_de_cada_uno():
    train, test, _ = por_usuario(juguete(), fraccion=0.2)
    assert pares(test) == {(1, 4), (2, 7), (3, 8)}
    assert fugas(train, test) == 2
def test_usuario_nuevo_queda_fuera_de_la_prueba():
    nuevo = pd.DataFrame({"userId": [4], "movieId": [9], "dia": [11], "rating": [5.0],
                          "ts": [pd.Timestamp("2018-01-12")]})
    df = pd.concat([juguete(), nuevo], ignore_index=True)
    _, test, meta = por_corte_global(df, fraccion=0.2)
    assert meta["fuera_por_usuario_nuevo"] == 1
    assert 4 not in set(test["userId"])