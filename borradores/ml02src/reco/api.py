"""La API de comprados juntos: GET /v1/items/{id}/comprados-juntos, desde Redis o desde memoria."""
import json
import time
from functools import lru_cache
from typing import Annotated

import pandas as pd
import redis
from fastapi import Depends, FastAPI, HTTPException, Query
from redis.backoff import NoBackoff
from redis.retry import Retry

from reco import config, vecinos

app = FastAPI(title="reco: comprados juntos")


class Datos:
    """Las vecinas de cada película y sus títulos, cargados una vez desde el Parquet."""

    def __init__(self, tabla: pd.DataFrame, peliculas: pd.DataFrame, version: str):
        self.titulos = peliculas.set_index("movieId")["titulo"].to_dict()
        self.version = version
        self.listas = {}
        for movie_id, g in tabla.groupby("movieId"):
            self.listas[int(movie_id)] = [
                {"movieId": int(v), "titulo": self.titulos.get(int(v), ""),
                 "juntos": int(j), "puntaje": round(float(p), 4)}
                for v, j, p in zip(g["vecino"], g["juntos"], g["puntaje"])]

    def clave(self, movie_id: int) -> str:
        return f"cj:{self.version}:{movie_id}"


class Cache:
    """Redis con un timeout corto. Si no contesta, la API sigue desde memoria."""

    def __init__(self, url: str = config.REDIS_URL):
        self.r = redis.Redis.from_url(url, socket_timeout=0.2, socket_connect_timeout=0.2,
                                      retry=Retry(NoBackoff(), 0), decode_responses=True)

    def leer(self, clave: str) -> tuple[list | None, bool]:
        try:
            valor = self.r.get(clave)
        except redis.RedisError:
            return None, False
        return (json.loads(valor) if valor is not None else None), True

    def guardar(self, clave: str, valor: list) -> bool:
        try:
            self.r.set(clave, json.dumps(valor))
            return True
        except redis.RedisError:
            return False


@lru_cache(maxsize=1)
def datos() -> Datos:
    ruta = vecinos.ruta("por-usuario", config.MEDIDA_API, config.SOPORTE_MIN)
    if not ruta.exists():
        raise HTTPException(status_code=503, detail=f"falta {ruta}: corre uv run reco vecinos")
    version = f"{config.MEDIDA_API}-s{config.SOPORTE_MIN}-{int(ruta.stat().st_mtime)}"
    return Datos(pd.read_parquet(ruta), pd.read_parquet(config.PARQUET / "peliculas.parquet"), version)


@lru_cache(maxsize=1)
def cache() -> Cache:
    return Cache()


@app.get("/salud")
def salud(c: Annotated[Cache, Depends(cache)]) -> dict:
    _, ok = c.leer("salud")
    return {"api": "ok", "redis": "ok" if ok else "caido"}


@app.get("/v1/items/{movie_id}/comprados-juntos")
def comprados_juntos(
    movie_id: int,
    d: Annotated[Datos, Depends(datos)],
    c: Annotated[Cache, Depends(cache)],
    k: Annotated[int, Query(ge=1, le=config.VECINOS)] = 10,
) -> dict:
    if movie_id not in d.titulos:
        raise HTTPException(status_code=404, detail=f"película desconocida: {movie_id}")
    t0 = time.perf_counter()
    lista, redis_ok = c.leer(d.clave(movie_id))
    fuente = "redis"
    if lista is None:
        lista = d.listas.get(movie_id, [])
        fuente = "memoria"
        if redis_ok:
            c.guardar(d.clave(movie_id), lista)
    return {"movieId": movie_id, "titulo": d.titulos[movie_id], "version": d.version,
            "k": k, "fuente": fuente, "redis": "ok" if redis_ok else "caido",
            "ms": round(1000 * (time.perf_counter() - t0), 2), "items": lista[:k]}
