"""Comprados juntos: cuántos usuarios dieron positivo a cada par de películas, y cuatro maneras de medirlo."""
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse

from reco import config, matriz, partir


def coocurrencia(m: sparse.csr_array) -> tuple[sparse.csr_array, np.ndarray]:
    """C = Mᵀ M. En la celda (i, j), cuántos usuarios dieron positivo a i y a j."""
    c = sparse.csr_array(m.T @ m)
    n = c.diagonal().copy()
    c = sparse.csr_array(c - sparse.diags_array(n))
    c.eliminate_zeros()
    return c, n


def medir(c: sparse.csr_array, n: np.ndarray, usuarios: int, medida: str,
          soporte: int = config.SOPORTE_MIN) -> pd.DataFrame:
    coo = c.tocoo()
    juntos = coo.data.astype(float)
    ok = juntos >= soporte
    i, j, juntos = coo.row[ok], coo.col[ok], juntos[ok]
    ni, nj = n[i].astype(float), n[j].astype(float)
    if medida == "conteo":
        puntaje = juntos
    elif medida == "coseno":
        puntaje = juntos / np.sqrt(ni * nj)
    elif medida == "jaccard":
        puntaje = juntos / (ni + nj - juntos)
    elif medida == "lift":
        puntaje = juntos * usuarios / (ni * nj)
    else:
        raise ValueError(f"medida desconocida: {medida}")
    return pd.DataFrame({"i": i, "j": j, "juntos": juntos, "puntaje": puntaje})


def top_k(pares: pd.DataFrame, items: np.ndarray, k: int = config.VECINOS) -> pd.DataFrame:
    df = pares.sort_values(["i", "puntaje", "j"], ascending=[True, False, True])
    df = df.groupby("i").head(k)
    return pd.DataFrame({
        "movieId": items[df["i"].to_numpy()],
        "vecino": items[df["j"].to_numpy()],
        "juntos": df["juntos"].to_numpy().astype("int32"),
        "puntaje": df["puntaje"].to_numpy(),
    })


def calcular(train: pd.DataFrame, medida: str, soporte: int = config.SOPORTE_MIN,
             k: int = config.VECINOS) -> pd.DataFrame:
    m, _, items = matriz.construir(train)
    c, n = coocurrencia(m)
    return top_k(medir(c, n, m.shape[0], medida, soporte), items, k)


def ruta(modo: str, medida: str, soporte: int) -> Path:
    return config.VECINAS / modo / f"{medida}-s{soporte}.parquet"


def guardar(modo: str, medida: str, soporte: int = config.SOPORTE_MIN) -> pd.DataFrame:
    train, _ = partir.cargar(modo)
    tabla = calcular(train, medida, soporte)
    destino = ruta(modo, medida, soporte)
    destino.parent.mkdir(parents=True, exist_ok=True)
    tabla.to_parquet(destino, index=False)
    peliculas = train["movieId"].nunique()
    con = tabla["movieId"].nunique()
    print(f"{medida}, soporte {soporte}: {len(tabla)} filas")
    print(f"películas con vecinas: {con} de {peliculas} ({100 * con / peliculas:.1f} %)")
    print(f"memoria de la tabla: {tabla.memory_usage(index=False).sum() / 1e6:.2f} MB")
    print("guardado en", destino)
    return tabla
