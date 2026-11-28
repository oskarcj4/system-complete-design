"""El informe de la línea base: las cuatro popularidades y el azar, con las mismas métricas y sus intervalos."""
import numpy as np
import pandas as pd

from reco import azar, bootstrap, config, evaluar, partir, popular


def variantes(train: pd.DataFrame, base: pd.DataFrame, peliculas: pd.DataFrame) -> dict:
    catalogo = np.sort(train["movieId"].unique())
    cuenta = popular.conteo(base)
    return {
        "azar": azar.recomendador(catalogo, semilla=1),
        "conteo": popular.recomendador(cuenta),
        "por-genero": popular.recomendador_por_genero(
            cuenta, peliculas, popular.genero_favorito(train, peliculas)),
        "decaimiento": popular.recomendador(popular.decaimiento(base)),
        "bayesiana": popular.recomendador(popular.bayesiana(base)),
    }
def tablas(modo: str, k: int = config.K, fuga: bool = False) -> tuple[dict, int]:
    train, test = partir.cargar(modo)
    peliculas = pd.read_parquet(config.PARQUET / "peliculas.parquet")
    base = pd.concat([train, test], ignore_index=True) if fuga else train
    out = {nombre: evaluar.por_usuario(r, train, test, k)
           for nombre, r in variantes(train, base, peliculas).items()}
    usuarios = out["conteo"]["userId"].to_numpy()
    for nombre, t in out.items():
        assert (t["userId"].to_numpy() == usuarios).all(), f"{nombre}: otros usuarios"
    return out, train["movieId"].nunique()
def resumir(out: dict, n_items: int, k: int = config.K) -> pd.DataFrame:
    ref = out["conteo"]
    filas = []
    for nombre, t in out.items():
        r = evaluar.resumen(t, n_items, k)
        rlo, rhi = bootstrap.intervalo(t["recall"])
        nlo, nhi = bootstrap.intervalo(t["ndcg"])
        dif, dlo, dhi = bootstrap.diferencia(t["ndcg"], ref["ndcg"])
        filas.append({
            "variante": nombre, "usuarios": r["usuarios"],
            "recall": f"{r['recall']:.4f} [{rlo:.4f}, {rhi:.4f}]",
            "ndcg": f"{r['ndcg']:.4f} [{nlo:.4f}, {nhi:.4f}]",
            "ndcg_vs_conteo": f"{dif:+.4f} [{dlo:+.4f}, {dhi:+.4f}]",
            "cobertura": round(r["cobertura"], 4),
        })
    return pd.DataFrame(filas)
def informe(modo: str = "global", k: int = config.K, fuga: bool = False,
            guardar: bool = True) -> pd.DataFrame:
    out, n_items = tablas(modo, k, fuga)
    tabla = resumir(out, n_items, k)
    titulo = f"modo {modo}, k = {k}" + (", CON FUGA" if fuga else "")
    print(f"\n== {titulo}: media [intervalo del 95 %], {config.BOOTSTRAP_N} remuestreos")
    print(tabla.to_string(index=False))
    if guardar:
        config.INFORME.mkdir(parents=True, exist_ok=True)
        ruta = config.INFORME / f"{modo}-k{k}{'-fuga' if fuga else ''}.csv"
        tabla.to_csv(ruta, index=False)
        print("guardado en", ruta)
    return tabla