"""Cuatro maneras de contar lo popular. Cada una devuelve un puntaje por película, de mayor a menor."""
import pandas as pd

from reco import config, evaluar


def ordenar(puntaje: pd.Series) -> pd.Series:
    df = puntaje.rename("puntaje").rename_axis("movieId").reset_index()
    df = df.sort_values(["puntaje", "movieId"], ascending=[False, True])
    return df.set_index("movieId")["puntaje"]


def conteo(train: pd.DataFrame, umbral: float = config.UMBRAL_POSITIVO) -> pd.Series:
    pos = train[train["rating"] >= umbral]
    return ordenar(pos.groupby("movieId").size().astype(float))
def peso(edad_dias, vida_media_dias: float):
    return 0.5 ** (edad_dias / vida_media_dias)


def decaimiento(train: pd.DataFrame, vida_media_dias: float = config.VIDA_MEDIA_DIAS,
                ahora: pd.Timestamp | None = None,
                umbral: float = config.UMBRAL_POSITIVO) -> pd.Series:
    ahora = train["ts"].max() if ahora is None else ahora
    pos = train[train["rating"] >= umbral]
    edad = (ahora - pos["ts"]).dt.total_seconds() / 86_400
    return ordenar(peso(edad, vida_media_dias).groupby(pos["movieId"]).sum())
def bayesiana(train: pd.DataFrame, votos_prior: int = config.VOTOS_PRIOR,
              prior: float | None = None) -> pd.Series:
    m = train["rating"].mean() if prior is None else prior
    g = train.groupby("movieId")["rating"].agg(["sum", "count"])
    return ordenar((votos_prior * m + g["sum"]) / (votos_prior + g["count"]))


def por_genero(puntaje: pd.Series, peliculas: pd.DataFrame, genero: str) -> pd.Series:
    ids = peliculas.loc[[genero in g for g in peliculas["generos"]], "movieId"]
    return puntaje[puntaje.index.isin(ids)]
def genero_favorito(train: pd.DataFrame, peliculas: pd.DataFrame,
                    umbral: float = config.UMBRAL_POSITIVO) -> dict:
    pos = train.loc[train["rating"] >= umbral, ["userId", "movieId"]]
    g = pos.merge(peliculas[["movieId", "generos"]], on="movieId").explode("generos")
    g = g.dropna(subset=["generos"])
    cuenta = g.groupby(["userId", "generos"]).size().reset_index(name="n")
    cuenta = cuenta.sort_values(["userId", "n", "generos"], ascending=[True, False, True])
    return cuenta.drop_duplicates("userId").set_index("userId")["generos"].to_dict()
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
def recomendador_por_genero(puntaje: pd.Series, peliculas: pd.DataFrame,
                            favorito: dict) -> evaluar.Recomendador:
    general = recomendador(puntaje)
    por_g = {}

    def recomendar(usuario: int, vistos: set, k: int) -> list:
        g = favorito.get(usuario)
        if g is None:
            return general(usuario, vistos, k)
        if g not in por_g:
            por_g[g] = recomendador(por_genero(puntaje, peliculas, g))
        lista = por_g[g](usuario, vistos, k)
        if len(lista) < k:
            lista += general(usuario, vistos | set(lista), k - len(lista))
        return lista

    return recomendar