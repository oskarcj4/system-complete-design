"""Separa entrenamiento y prueba por tiempo, de dos maneras, y cuenta las fugas."""
import json

import numpy as np
import pandas as pd

from reco import config


def por_corte_global(df: pd.DataFrame, fraccion: float) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    orden = df["ts"].sort_values(ignore_index=True)
    corte = orden.iloc[int(len(orden) * (1 - fraccion))]
    train, test = df[df["ts"] < corte], df[df["ts"] >= corte]
    nuevos = ~test["userId"].isin(train["userId"])
    meta = {"corte": str(corte), "fuera_por_usuario_nuevo": int(nuevos.sum())}
    return train, test[~nuevos], meta
def por_usuario(df: pd.DataFrame, fraccion: float) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    df = df.sort_values(["userId", "ts", "movieId"])
    g = df.groupby("userId")
    desde_el_final = g.cumcount(ascending=False)
    cuantos = np.maximum(1, (g["ts"].transform("size") * fraccion).astype(int))
    en_prueba = desde_el_final < cuantos
    return df[~en_prueba], df[en_prueba], {}


def fugas(train: pd.DataFrame, test: pd.DataFrame) -> int:
    """Eventos de entrenamiento posteriores al primer evento de prueba: información del futuro."""
    if test.empty:
        return 0
    return int((train["ts"] > test["ts"].min()).sum())
MODOS = {"global": por_corte_global, "por-usuario": por_usuario}


def cargar(modo: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    carpeta = config.PARTICION / modo
    return pd.read_parquet(carpeta / "train.parquet"), pd.read_parquet(carpeta / "test.parquet")
def guardar(modo: str, fraccion: float = config.FRACCION_PRUEBA) -> dict:
    df = pd.read_parquet(config.PARQUET / "ratings.parquet")
    train, test, meta = MODOS[modo](df, fraccion)
    meta |= {"modo": modo, "fraccion": fraccion, "train": len(train), "test": len(test),
             "usuarios_prueba": int(test["userId"].nunique()), "fugas": fugas(train, test),
             "eventos_de_peliculas_nuevas": int((~test["movieId"].isin(train["movieId"])).sum())}
    carpeta = config.PARTICION / modo
    carpeta.mkdir(parents=True, exist_ok=True)
    train.to_parquet(carpeta / "train.parquet", index=False)
    test.to_parquet(carpeta / "test.parquet", index=False)
    texto = json.dumps(meta, indent=2, ensure_ascii=False)
    (carpeta / "meta.json").write_text(texto, encoding="utf-8")
    print(texto)
    return meta