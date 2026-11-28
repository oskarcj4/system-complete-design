"""Los comandos del laboratorio: uv run reco <comando>."""
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
    partir.guardar(a.modo, a.fraccion)


def _matriz(a):
    from reco import matriz
    matriz.guardar(a.modo, a.umbral)


def _azar(a):
    from reco import azar
    azar.correr(a.modo, a.k, a.semillas)
def main(argv=None):
    p = argparse.ArgumentParser(prog="reco", description="El laboratorio de recomendación.")
    sub = p.add_subparsers(dest="comando", required=True)
    sub.add_parser("descargar", help="baja MovieLens small y comprueba su MD5").set_defaults(f=_descargar)
    sub.add_parser("convertir", help="pasa los CSV a Parquet").set_defaults(f=_convertir)
    e = sub.add_parser("explorar", help="mira los datos con DuckDB")
    e.add_argument("consulta", nargs="?", default=None, help="una sola consulta; sin nombre, todas")
    e.set_defaults(f=_explorar)
    for nombre, f in [("partir", _partir), ("matriz", _matriz), ("azar", _azar)]:
        s = sub.add_parser(nombre)
        s.add_argument("--modo", choices=["global", "por-usuario"], default="global")
        s.set_defaults(f=f)
        if nombre == "partir":
            s.add_argument("--fraccion", type=float, default=config.FRACCION_PRUEBA)
        if nombre == "matriz":
            s.add_argument("--umbral", type=float, default=config.UMBRAL_POSITIVO)
        if nombre == "azar":
            s.add_argument("--k", type=int, default=config.K)
            s.add_argument("--semillas", type=int, default=5)
    a = p.parse_args(argv)
    a.f(a)