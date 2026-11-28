"""Pasa los CSV de MovieLens a Parquet, con tipos fijos y validados."""
import os
from pathlib import Path

import pandas as pd

from reco import config

TIPOS = {"userId": "int32", "movieId": "int32", "rating": "float32", "timestamp": "int64"}


def leer_ratings(carpeta: Path) -> pd.DataFrame:
    df = pd.read_csv(carpeta / "ratings.csv", dtype=TIPOS)
    df["ts"] = pd.to_datetime(df["timestamp"], unit="s")
    return df.drop(columns="timestamp")


def leer_peliculas(carpeta: Path) -> pd.DataFrame:
    df = pd.read_csv(carpeta / "movies.csv", dtype={"movieId": "int32"})
    df["generos"] = [[] if g == "(no genres listed)" else g.split("|") for g in df["genres"]]
    return df.rename(columns={"title": "titulo"}).drop(columns="genres")
def validar(ratings: pd.DataFrame, peliculas: pd.DataFrame) -> None:
    fuera = ~ratings["rating"].between(0.5, 5.0) | (ratings["rating"] * 2 % 1 != 0)
    if fuera.any():
        raise ValueError(f"{fuera.sum()} calificaciones fuera de la escala de 0.5 a 5 en medios")
    repetidas = ratings.duplicated(["userId", "movieId"]).sum()
    if repetidas:
        raise ValueError(f"{repetidas} pares usuario-película repetidos")
    huerfanas = ~ratings["movieId"].isin(peliculas["movieId"])
    if huerfanas.any():
        raise ValueError(f"{huerfanas.sum()} calificaciones de películas que no están en movies.csv")


def escribir(df: pd.DataFrame, ruta: Path) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    tmp = ruta.with_suffix(".tmp")
    df.to_parquet(tmp, index=False)
    os.replace(tmp, ruta)
def convertir() -> None:
    carpeta = config.CRUDO / config.CARPETA_ZIP
    ratings, peliculas = leer_ratings(carpeta), leer_peliculas(carpeta)
    validar(ratings, peliculas)
    escribir(ratings, config.PARQUET / "ratings.parquet")
    escribir(peliculas, config.PARQUET / "peliculas.parquet")
    print(f"ratings.parquet: {len(ratings)} filas; peliculas.parquet: {len(peliculas)} filas")