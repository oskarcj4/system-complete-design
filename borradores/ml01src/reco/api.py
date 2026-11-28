"""La API de lo popular: GET /v1/recs/popular, con caché en Redis, que sigue respondiendo si Redis se cae."""
import json
import time
from functools import lru_cache
from typing import Annotated, Literal

import pandas as pd
import redis
from fastapi import Depends, FastAPI, HTTPException, Query
from redis.backoff import NoBackoff
from redis.retry import Retry

from reco import config, popular

Variante = Literal["conteo", "decaimiento", "bayesiana"]
CALCULAR = {
    "conteo": popular.conteo,
    "decaimiento": popular.decaimiento,
    "bayesiana": popular.bayesiana,
}

app = FastAPI(title="reco: lo popular")
class Datos:
    """Lo que la API carga una vez: todas las calificaciones y las películas."""

    def __init__(self, ratings: pd.DataFrame, peliculas: pd.DataFrame):
        self.ratings = ratings
        self.peliculas = peliculas
        self.titulos = peliculas.set_index("movieId")["titulo"].to_dict()
        self.generos = sorted({g for gs in peliculas["generos"] for g in gs})
        self.version = f"{len(ratings)}-{int(ratings['ts'].max().timestamp())}"

    def calcular(self, variante: str, genero: str | None) -> list[dict]:
        puntaje = CALCULAR[variante](self.ratings)
        if genero is not None:
            puntaje = popular.por_genero(puntaje, self.peliculas, genero)
        return [{"movieId": int(i), "titulo": self.titulos.get(int(i), ""), "puntaje": round(float(p), 4)}
                for i, p in puntaje.head(config.TOP_N).items()]
class Cache:
    """Redis con un timeout corto. Si no contesta, la API sigue sin caché."""

    def __init__(self, url: str = config.REDIS_URL):
        self.r = redis.Redis.from_url(url, socket_timeout=0.2, socket_connect_timeout=0.2,
                                      retry=Retry(NoBackoff(), 0), decode_responses=True)

    def leer(self, clave: str) -> tuple[list | None, bool]:
        try:
            valor = self.r.get(clave)
        except redis.RedisError:
            return None, False
        return (json.loads(valor) if valor is not None else None), True

    def guardar(self, clave: str, valor: list, ttl: int) -> bool:
        try:
            self.r.set(clave, json.dumps(valor), ex=ttl)
            return True
        except redis.RedisError:
            return False
@lru_cache(maxsize=1)
def datos() -> Datos:
    return Datos(pd.read_parquet(config.PARQUET / "ratings.parquet"),
                 pd.read_parquet(config.PARQUET / "peliculas.parquet"))


@lru_cache(maxsize=1)
def cache() -> Cache:
    return Cache()


@app.get("/salud")
def salud(c: Annotated[Cache, Depends(cache)]) -> dict:
    _, ok = c.leer("salud")
    return {"api": "ok", "redis": "ok" if ok else "caido"}
@app.get("/v1/recs/popular")
def recs_popular(
    d: Annotated[Datos, Depends(datos)],
    c: Annotated[Cache, Depends(cache)],
    k: Annotated[int, Query(ge=1, le=config.TOP_N)] = 10,
    genero: str | None = None,
    variante: Variante = "conteo",
) -> dict:
    if genero is not None and genero not in d.generos:
        raise HTTPException(status_code=404, detail=f"género desconocido: {genero}")
    clave = f"pop:{d.version}:{variante}:{genero or '*'}"
    t0 = time.perf_counter()
    lista, redis_ok = c.leer(clave)
    fuente = "cache"
    if lista is None:
        lista = d.calcular(variante, genero)
        fuente = "calculado"
        if redis_ok:
            c.guardar(clave, lista, config.CACHE_TTL)
    return {"variante": variante, "genero": genero, "k": k, "fuente": fuente,
            "redis": "ok" if redis_ok else "caido",
            "ms": round(1000 * (time.perf_counter() - t0), 2), "items": lista[:k]}