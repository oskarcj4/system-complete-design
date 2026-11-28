"""El informe de comprados juntos: el azar, el conteo de ML01 y cada medida, con las mismas métricas."""
import numpy as np
import pandas as pd

from reco import azar, bootstrap, comprados, config, evaluar, partir, popular, vecinos


def variantes(train: pd.DataFrame, base: pd.DataFrame, soporte: int) -> dict:
    catalogo = np.sort(train["movieId"].unique())
    out = {
        "azar": azar.recomendador(catalogo, semilla=1),
        "conteo": popular.recomendador(popular.conteo(train)),
    }
    for medida in ("coseno", "jaccard", "lift"):
        out[medida] = comprados.con_relleno(vecinos.calcular(base, medida, soporte), train)
    out["lift-sin-soporte"] = comprados.con_relleno(vecinos.calcular(base, "lift", 1), train)
    return out


def tablas(modo: str, k: int = config.K, fuga: bool = False,
           soporte: int = config.SOPORTE_MIN) -> tuple[dict, int]:
    train, test = partir.cargar(modo)
    base = pd.concat([train, test], ignore_index=True) if fuga else train
    out = {nombre: evaluar.por_usuario(r, train, test, k)
           for nombre, r in variantes(train, base, soporte).items()}
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


def informe(modo: str = "por-usuario", k: int = config.K, fuga: bool = False,
            soporte: int = config.SOPORTE_MIN, guardar: bool = True) -> pd.DataFrame:
    out, n_items = tablas(modo, k, fuga, soporte)
    tabla = resumir(out, n_items, k)
    titulo = f"modo {modo}, k = {k}, soporte {soporte}" + (", CON FUGA" if fuga else "")
    print(f"\n== {titulo}: media [intervalo del 95 %], {config.BOOTSTRAP_N} remuestreos")
    print(tabla.to_string(index=False))
    if guardar:
        config.INFORME.mkdir(parents=True, exist_ok=True)
        ruta = config.INFORME / f"{modo}-k{k}-s{soporte}{'-fuga' if fuga else ''}.csv"
        tabla.to_csv(ruta, index=False)
        print("guardado en", ruta)
    return tabla
