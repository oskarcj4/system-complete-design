"""Recomendar con las vecinas: sumar, para cada película candidata, su parecido con las que te gustaron."""
import pandas as pd

from reco import config, evaluar, popular


def por_pelicula(vecinas: pd.DataFrame) -> dict:
    return {int(i): list(zip(g["vecino"].tolist(), g["puntaje"].tolist()))
            for i, g in vecinas.groupby("movieId")}


def positivos_de(train: pd.DataFrame, umbral: float = config.UMBRAL_POSITIVO) -> dict:
    pos = train[train["rating"] >= umbral]
    return {u: set(g.tolist()) for u, g in pos.groupby("userId")["movieId"]}


def puntuar(semillas, tabla: dict, vistos: set) -> list[tuple[int, float]]:
    puntaje = {}
    for s in semillas:
        for v, p in tabla.get(s, ()):
            if v not in vistos:
                puntaje[v] = puntaje.get(v, 0.0) + p
    return sorted(puntaje.items(), key=lambda t: (-t[1], t[0]))


def recomendador(vecinas: pd.DataFrame, positivos: dict,
                 relleno: evaluar.Recomendador | None = None) -> evaluar.Recomendador:
    tabla = por_pelicula(vecinas)

    def recomendar(usuario: int, vistos: set, k: int) -> list:
        lista = [v for v, _ in puntuar(positivos.get(usuario, ()), tabla, vistos)[:k]]
        if relleno is not None and len(lista) < k:
            lista += relleno(usuario, vistos | set(lista), k - len(lista))
        return lista

    return recomendar


def con_relleno(vecinas: pd.DataFrame, train: pd.DataFrame) -> evaluar.Recomendador:
    return recomendador(vecinas, positivos_de(train), popular.recomendador(popular.conteo(train)))
