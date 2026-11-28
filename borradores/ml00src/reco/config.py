"""Dónde viven los datos del laboratorio y las constantes que comparten los pasos."""
import os
from pathlib import Path

DATOS = Path(os.environ.get("RECO_DATOS", "datos"))
CRUDO = DATOS / "crudo"
PARQUET = DATOS / "parquet"
PARTICION = DATOS / "particion"
MATRIZ = DATOS / "matriz"

URL_ZIP = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
URL_MD5 = URL_ZIP + ".md5"
MD5_ZIP = "31a303aabbc519bd33d025e44d6c2570"
CARPETA_ZIP = "ml-latest-small"

UMBRAL_POSITIVO = float(os.environ.get("RECO_UMBRAL", "4.0"))
FRACCION_PRUEBA = 0.10
K = 10