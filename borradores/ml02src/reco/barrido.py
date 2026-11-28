"""El soporte mínimo contra la cobertura: cuántas películas se quedan sin vecinas y qué pasa con el NDCG."""
import pandas as pd

from reco import comprados, config, evaluar, partir, vecinos

SOPORTES = (1, 2, 3, 5, 10, 20)


def barrido(modo: str = "por-usuario", medida: str = "lift", k: int = config.K) -> pd.DataFrame:
    train, test = partir.cargar(modo)
    peliculas = train["movieId"].nunique()
    filas = []
    for s in SOPORTES:
        tabla = vecinos.calcular(train, medida, s)
        t = evaluar.por_usuario(comprados.con_relleno(tabla, train), train, test, k)
        r = evaluar.resumen(t, peliculas, k)
        filas.append({
            "soporte": s, "filas": len(tabla),
            "con_vecinas": round(tabla["movieId"].nunique() / peliculas, 4),
            "ndcg": round(r["ndcg"], 4), "cobertura": round(r["cobertura"], 4),
        })
    out = pd.DataFrame(filas)
    print(f"\n== {medida}, modo {modo}, k = {k}")
    print(out.to_string(index=False))
    config.INFORME.mkdir(parents=True, exist_ok=True)
    out.to_csv(config.INFORME / f"barrido-{medida}-{modo}.csv", index=False)
    return out
