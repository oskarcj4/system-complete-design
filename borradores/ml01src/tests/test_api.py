import pandas as pd
import pytest
from fastapi.testclient import TestClient

from reco import api


class CacheFalsa:
    """Un diccionario en lugar de Redis. Con caida=True se porta como un Redis que no contesta."""

    def __init__(self, caida: bool = False):
        self.caida, self.d, self.escrituras = caida, {}, 0

    def leer(self, clave):
        return (None, False) if self.caida else (self.d.get(clave), True)

    def guardar(self, clave, valor, ttl):
        if self.caida:
            return False
        self.d[clave], self.escrituras = valor, self.escrituras + 1
        return True
def datos_juguete() -> api.Datos:
    ts = pd.Timestamp("2018-01-01")
    ratings = pd.DataFrame({"userId": [1, 2, 3, 1], "movieId": [10, 10, 20, 30],
                            "rating": [5.0, 4.0, 4.5, 2.0], "ts": [ts] * 4})
    peliculas = pd.DataFrame({"movieId": [10, 20, 30], "titulo": ["A", "B", "C"],
                              "generos": [["Comedy"], ["Drama"], ["Drama"]]})
    return api.Datos(ratings, peliculas)


@pytest.fixture
def cliente():
    cache = CacheFalsa()
    api.app.dependency_overrides.update({api.datos: datos_juguete, api.cache: lambda: cache})
    yield TestClient(api.app), cache
    api.app.dependency_overrides.clear()
def test_primera_vez_calcula_y_despues_lee_de_la_cache(cliente):
    c, cache = cliente
    r1 = c.get("/v1/recs/popular", params={"k": 2}).json()
    assert r1["fuente"] == "calculado"
    assert [i["movieId"] for i in r1["items"]] == [10, 20]
    r2 = c.get("/v1/recs/popular", params={"k": 2}).json()
    assert r2["fuente"] == "cache" and r2["items"] == r1["items"]
    assert cache.escrituras == 1


def test_genero_filtra_y_genero_desconocido_da_404(cliente):
    c, _ = cliente
    r = c.get("/v1/recs/popular", params={"genero": "Drama"}).json()
    assert [i["movieId"] for i in r["items"]] == [20]
    assert c.get("/v1/recs/popular", params={"genero": "Western"}).status_code == 404
def test_k_fuera_de_rango_da_422(cliente):
    c, _ = cliente
    assert c.get("/v1/recs/popular", params={"k": 0}).status_code == 422
    assert c.get("/v1/recs/popular", params={"k": 101}).status_code == 422


def test_sin_redis_la_api_sigue_respondiendo():
    api.app.dependency_overrides.update({api.datos: datos_juguete,
                                         api.cache: lambda: CacheFalsa(caida=True)})
    try:
        c = TestClient(api.app)
        r = c.get("/v1/recs/popular").json()
        assert r["fuente"] == "calculado" and r["redis"] == "caido"
        assert c.get("/salud").json() == {"api": "ok", "redis": "caido"}
    finally:
        api.app.dependency_overrides.clear()