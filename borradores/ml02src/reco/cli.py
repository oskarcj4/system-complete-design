"""Los comandos de comprados juntos: uv run reco <comando>."""
import argparse

from reco import config

MODOS = ["global", "por-usuario"]


def _descargar(a):
    from reco import descargar
    print("datos en", descargar.descargar())


def _convertir(a):
    from reco import convertir
    convertir.convertir()


def _partir(a):
    from reco import partir
    partir.guardar(a.modo)


def _matriz(a):
    from reco import matriz
    matriz.guardar(a.modo)


def _azar(a):
    from reco import azar
    azar.correr(a.modo)


def _vecinos(a):
    from reco import vecinos
    for medida in config.MEDIDAS if a.medida == "todas" else [a.medida]:
        vecinos.guardar(a.modo, medida, a.soporte)


def _comprados(a):
    import pandas as pd
    from reco import vecinos
    tabla = pd.read_parquet(vecinos.ruta(a.modo, a.medida, a.soporte))
    titulos = pd.read_parquet(config.PARQUET / "peliculas.parquet").set_index("movieId")["titulo"]
    print(f"{a.pelicula}  {titulos[a.pelicula]}\n")
    for f in tabla[tabla["movieId"] == a.pelicula].head(a.k).itertuples():
        print(f"{f.puntaje:>10.4f}  {f.juntos:>4}  {f.vecino:>6}  {titulos[f.vecino]}")


def _informe(a):
    from reco import informe
    informe.informe(a.modo, a.k, a.fuga, a.soporte)


def _barrido(a):
    from reco import barrido
    barrido.barrido(a.modo, a.medida)


def _publicar(a):
    from reco import publicar
    publicar.publicar()


def _servir(a):
    import uvicorn
    uvicorn.run("reco.api:app", host="127.0.0.1", port=a.puerto)


def _modo(s, por_defecto="por-usuario"):
    s.add_argument("--modo", choices=MODOS, default=por_defecto)


def main(argv=None):
    p = argparse.ArgumentParser(prog="reco", description="Comprados juntos, medido contra la línea base.")
    sub = p.add_subparsers(dest="comando", required=True)
    sub.add_parser("descargar", help="baja MovieLens small y comprueba su MD5").set_defaults(f=_descargar)
    sub.add_parser("convertir", help="pasa los CSV a Parquet").set_defaults(f=_convertir)
    for nombre, f, ayuda in [("partir", _partir, "separa entrenamiento y prueba por tiempo"),
                             ("matriz", _matriz, "arma la matriz de positivos en CSR"),
                             ("azar", _azar, "mide el recomendador al azar")]:
        s = sub.add_parser(nombre, help=ayuda)
        _modo(s)
        s.set_defaults(f=f)
    s = sub.add_parser("vecinos", help="calcula las vecinas de cada película")
    _modo(s)
    s.add_argument("--medida", choices=[*config.MEDIDAS, "todas"], default="todas")
    s.add_argument("--soporte", type=int, default=config.SOPORTE_MIN)
    s.set_defaults(f=_vecinos)
    s = sub.add_parser("comprados", help="muestra las vecinas de una película")
    _modo(s)
    s.add_argument("pelicula", type=int)
    s.add_argument("--medida", choices=config.MEDIDAS, default="coseno")
    s.add_argument("--soporte", type=int, default=config.SOPORTE_MIN)
    s.add_argument("--k", type=int, default=config.K)
    s.set_defaults(f=_comprados)
    s = sub.add_parser("informe", help="compara las medidas con la línea base, con intervalos")
    _modo(s)
    s.add_argument("--k", type=int, default=config.K)
    s.add_argument("--soporte", type=int, default=config.SOPORTE_MIN)
    s.add_argument("--fuga", action="store_true", help="calcula los pares con la prueba incluida")
    s.set_defaults(f=_informe)
    s = sub.add_parser("barrido", help="prueba varios soportes mínimos")
    _modo(s)
    s.add_argument("--medida", choices=config.MEDIDAS, default="lift")
    s.set_defaults(f=_barrido)
    sub.add_parser("publicar", help="sube las vecinas a Redis").set_defaults(f=_publicar)
    s = sub.add_parser("servir", help="levanta la API en 127.0.0.1")
    s.add_argument("--puerto", type=int, default=8000)
    s.set_defaults(f=_servir)
    a = p.parse_args(argv)
    a.f(a)
