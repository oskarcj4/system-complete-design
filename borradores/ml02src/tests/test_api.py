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

    def guardar(self, clave, valor):
        if self.caida:
            return False
        self.d[clave], self.escrituras = valor, self.escrituras + 1
        return True


def datos_juguete() -> api.Datos:
    tabla = pd.DataFrame({"movieId": [10, 10, 20], "vecino": [20, 30, 10],
                          "juntos": [5, 3, 5], "puntaje": [0.9, 0.4, 0.9]})
    peliculas = pd.DataFrame({"movieId": [10, 20, 30, 40], "titulo": ["A", "B", "C", "D"]})
    return api.Datos(tabla, peliculas, "prueba")


@pytest.fixture
def cliente():
    cache = CacheFalsa()
    api.app.dependency_overrides.update({api.datos: datos_juguete, api.cache: lambda: cache})
    yield TestClient(api.app), cache
    api.app.dependency_overrides.clear()


def test_primera_vez_desde_memoria_y_despues_desde_redis(cliente):
    c, cache = cliente
    r1 = c.get("/v1/items/10/comprados-juntos", params={"k": 1}).json()
    assert r1["fuente"] == "memoria"
    assert [i["movieId"] for i in r1["items"]] == [20]
    r2 = c.get("/v1/items/10/comprados-juntos", params={"k": 1}).json()
    assert r2["fuente"] == "redis" and r2["items"] == r1["items"]
    assert cache.escrituras == 1


def test_pelicula_sin_vecinas_da_lista_vacia_y_desconocida_da_404(cliente):
    c, _ = cliente
    assert c.get("/v1/items/40/comprados-juntos").json()["items"] == []
    assert c.get("/v1/items/999/comprados-juntos").status_code == 404


def test_k_fuera_de_rango_da_422(cliente):
    c, _ = cliente
    assert c.get("/v1/items/10/comprados-juntos", params={"k": 0}).status_code == 422
    assert c.get("/v1/items/10/comprados-juntos", params={"k": 51}).status_code == 422


def test_sin_redis_responde_desde_memoria():
    api.app.dependency_overrides.update({api.datos: datos_juguete,
                                         api.cache: lambda: CacheFalsa(caida=True)})
    try:
        c = TestClient(api.app)
        r = c.get("/v1/items/10/comprados-juntos").json()
        assert r["fuente"] == "memoria" and r["redis"] == "caido"
        assert len(r["items"]) == 2
    finally:
        api.app.dependency_overrides.clear()
