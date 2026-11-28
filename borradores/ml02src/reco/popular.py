"""La línea base de ML01, solo el conteo: cuántos positivos tiene cada película, de mayor a menor."""
import pandas as pd

from reco import config, evaluar


def ordenar(puntaje: pd.Series) -> pd.Series:
    df = puntaje.rename("puntaje").rename_axis("movieId").reset_index()
    df = df.sort_values(["puntaje", "movieId"], ascending=[False, True])
    return df.set_index("movieId")["puntaje"]


def conteo(train: pd.DataFrame, umbral: float = config.UMBRAL_POSITIVO) -> pd.Series:
    pos = train[train["rating"] >= umbral]
    return ordenar(pos.groupby("movieId").size().astype(float))


def recomendador(puntaje: pd.Series) -> evaluar.Recomendador:
    orden = [int(i) for i in puntaje.index]

    def recomendar(usuario: int, vistos: set, k: int) -> list:
        lista = []
        for item in orden:
            if item not in vistos:
                lista.append(item)
                if len(lista) == k:
                    break
        return lista

    return recomendar
