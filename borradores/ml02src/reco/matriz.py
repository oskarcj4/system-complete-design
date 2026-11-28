"""La matriz usuario-ítem del entrenamiento: dispersa, en formato CSR, con un 1 por cada positivo."""
import numpy as np
import pandas as pd
from scipy import sparse

from reco import config, partir


def construir(train: pd.DataFrame, umbral: float = config.UMBRAL_POSITIVO):
    usuarios = np.sort(train["userId"].unique())
    items = np.sort(train["movieId"].unique())
    pos = train[train["rating"] >= umbral]
    filas = np.searchsorted(usuarios, pos["userId"].to_numpy())
    columnas = np.searchsorted(items, pos["movieId"].to_numpy())
    m = sparse.csr_array(
        (np.ones(len(pos), dtype=np.float32), (filas, columnas)),
        shape=(len(usuarios), len(items)),
    )
    return m, usuarios, items
def guardar(modo: str, umbral: float = config.UMBRAL_POSITIVO):
    train, _ = partir.cargar(modo)
    m, usuarios, items = construir(train, umbral)
    carpeta = config.MATRIZ / modo
    carpeta.mkdir(parents=True, exist_ok=True)
    sparse.save_npz(carpeta / "positivos.npz", m)
    np.savez(carpeta / "ids.npz", usuarios=usuarios, items=items)
    celdas = m.shape[0] * m.shape[1]
    csr = m.data.nbytes + m.indices.nbytes + m.indptr.nbytes
    print(f"{m.shape[0]} usuarios × {m.shape[1]} películas, {m.nnz} positivos")
    print(f"densidad {100 * m.nnz / celdas:.2f} %")
    print(f"memoria: densa {celdas * 4 / 1e6:.1f} MB, CSR {csr / 1e6:.2f} MB")
    return m