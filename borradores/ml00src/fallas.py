"""Provoca las tres fallas del laboratorio: uv run python fallas.py zip-roto | reconvertir | fuga"""
import hashlib
import shutil
import sys
import tempfile
from pathlib import Path

import pandas as pd

from reco import config, convertir, descargar, partir


def zip_roto():
    original = config.CRUDO / "ml-latest-small.zip"
    with tempfile.TemporaryDirectory() as tmp:
        copia = Path(tmp) / "roto.zip"
        shutil.copy(original, copia)
        with copia.open("r+b") as f:
            f.seek(500_000)
            f.write(b"\x00" * 16)
        try:
            descargar.verificar(copia)
        except descargar.ChecksumInvalido as e:
            print("rechazado:", e)
def huella(df: pd.DataFrame) -> str:
    sin_listas = df.drop(columns=[c for c in df.columns if c == "generos"])
    filas = pd.util.hash_pandas_object(sin_listas, index=False).to_numpy()
    return hashlib.sha256(filas.tobytes()).hexdigest()[:16]


def reconvertir():
    huellas = []
    for vuelta in (1, 2):
        convertir.convertir()
        huellas.append({n: huella(pd.read_parquet(config.PARQUET / f"{n}.parquet"))
                        for n in ("ratings", "peliculas")})
        print(f"vuelta {vuelta}: {huellas[-1]}")
    print("iguales" if huellas[0] == huellas[1] else "DISTINTAS")
def fuga():
    for modo in ("global", "por-usuario"):
        meta = partir.guardar(modo)
        print(f"{modo}: {meta['fugas']} eventos de entrenamiento después del primer evento de prueba\n")


ESCENARIOS = {"zip-roto": zip_roto, "reconvertir": reconvertir, "fuga": fuga}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ESCENARIOS:
        sys.exit(f"uso: uv run python fallas.py {' | '.join(ESCENARIOS)}")
    ESCENARIOS[sys.argv[1]]()