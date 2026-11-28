"""Los comandos de la línea base: uv run reco <comando>."""
import argparse

from reco import config


def _descargar(a):
    from reco import descargar
    print("datos en", descargar.descargar())


def _convertir(a):
    from reco import convertir
    convertir.convertir()


def _explorar(a):
    from reco import explorar
    explorar.explorar(a.consulta)


def _partir(a):
    from reco import partir
    partir.guardar(a.modo)
def _popular(a):
    import pandas as pd
    from reco import popular
    ratings = pd.read_parquet(config.PARQUET / "ratings.parquet")
    peliculas = pd.read_parquet(config.PARQUET / "peliculas.parquet")
    contar = {"conteo": popular.conteo, "decaimiento": popular.decaimiento,
              "bayesiana": popular.bayesiana}
    puntaje = contar[a.variante](ratings)
    if a.genero is not None:
        puntaje = popular.por_genero(puntaje, peliculas, a.genero)
    titulos = peliculas.set_index("movieId")["titulo"]
    for movie_id, p in puntaje.head(a.k).items():
        print(f"{p:>10.4f}  {movie_id:>6}  {titulos[movie_id]}")


def _informe(a):
    from reco import informe
    informe.informe(a.modo, a.k, a.fuga)


def _servir(a):
    import uvicorn
    uvicorn.run("reco.api:app", host="127.0.0.1", port=a.puerto)
def main(argv=None):
    p = argparse.ArgumentParser(prog="reco", description="La línea base: lo popular, bien medido.")
    sub = p.add_subparsers(dest="comando", required=True)
    sub.add_parser("descargar", help="baja MovieLens small y comprueba su MD5").set_defaults(f=_descargar)
    sub.add_parser("convertir", help="pasa los CSV a Parquet").set_defaults(f=_convertir)
    e = sub.add_parser("explorar", help="mira los datos con DuckDB")
    e.add_argument("consulta", nargs="?", default=None)
    e.set_defaults(f=_explorar)
    s = sub.add_parser("partir", help="separa entrenamiento y prueba por tiempo")
    s.add_argument("--modo", choices=["global", "por-usuario"], default="global")
    s.set_defaults(f=_partir)
    s = sub.add_parser("popular", help="muestra una lista de lo popular, con todos los datos")
    s.add_argument("--variante", choices=["conteo", "decaimiento", "bayesiana"], default="conteo")
    s.add_argument("--genero", default=None)
    s.add_argument("--k", type=int, default=config.K)
    s.set_defaults(f=_popular)
    s = sub.add_parser("informe", help="compara las variantes con intervalos por bootstrap")
    s.add_argument("--modo", choices=["global", "por-usuario"], default="global")
    s.add_argument("--k", type=int, default=config.K)
    s.add_argument("--fuga", action="store_true", help="cuenta lo popular con la prueba incluida")
    s.set_defaults(f=_informe)
    s = sub.add_parser("servir", help="levanta la API en 127.0.0.1")
    s.add_argument("--puerto", type=int, default=8000)
    s.set_defaults(f=_servir)
    a = p.parse_args(argv)
    a.f(a)