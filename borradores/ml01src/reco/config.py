"""Dónde viven los datos del laboratorio y las constantes que comparten los pasos."""
import os
from pathlib import Path

DATOS = Path(os.environ.get("RECO_DATOS", "datos"))
CRUDO = DATOS / "crudo"
PARQUET = DATOS / "parquet"
PARTICION = DATOS / "particion"
INFORME = DATOS / "informe"

URL_ZIP = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
URL_MD5 = URL_ZIP + ".md5"
MD5_ZIP = "31a303aabbc519bd33d025e44d6c2570"
CARPETA_ZIP = "ml-latest-small"

UMBRAL_POSITIVO = float(os.environ.get("RECO_UMBRAL", "4.0"))
FRACCION_PRUEBA = 0.10
K = 10
VIDA_MEDIA_DIAS = float(os.environ.get("RECO_VIDA_MEDIA", "365"))
VOTOS_PRIOR = 20

BOOTSTRAP_N = 1000

REDIS_URL = os.environ.get("RECO_REDIS", "redis://127.0.0.1:56379/0")
CACHE_TTL = int(os.environ.get("RECO_CACHE_TTL", "3600"))
TOP_N = 100