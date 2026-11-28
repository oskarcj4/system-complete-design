"""Baja MovieLens small, comprueba su MD5 y lo descomprime en datos/crudo."""
import hashlib
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path

from reco import config


class ChecksumInvalido(Exception):
    """El archivo no es el que se esperaba: está corrupto, incompleto o cambió."""
def md5_de(ruta: Path) -> str:
    h = hashlib.md5()
    with ruta.open("rb") as f:
        for trozo in iter(lambda: f.read(1 << 20), b""):
            h.update(trozo)
    return h.hexdigest()


def verificar(ruta: Path, esperado: str = config.MD5_ZIP) -> None:
    obtenido = md5_de(ruta)
    if obtenido != esperado:
        raise ChecksumInvalido(f"{ruta.name}: MD5 {obtenido}, se esperaba {esperado}")


def md5_publicado() -> str:
    with urllib.request.urlopen(config.URL_MD5, timeout=30) as r:
        texto = r.read().decode("ascii")
    m = re.search(r"\b([0-9a-f]{32})\b", texto)
    if m is None:
        raise ChecksumInvalido(f"no hay un MD5 en {config.URL_MD5}: {texto!r}")
    return m.group(1)
def bajar(destino: Path) -> None:
    publicado = md5_publicado()
    if publicado != config.MD5_ZIP:
        raise ChecksumInvalido(
            f"GroupLens publica el MD5 {publicado} y config.MD5_ZIP dice {config.MD5_ZIP}: "
            "el dataset cambió. Revisa qué cambió antes de actualizar config.py."
        )
    parcial = destino.with_suffix(".parcial")
    with urllib.request.urlopen(config.URL_ZIP, timeout=60) as r, parcial.open("wb") as f:
        shutil.copyfileobj(r, f)
    verificar(parcial)
    parcial.replace(destino)
def descargar() -> Path:
    config.CRUDO.mkdir(parents=True, exist_ok=True)
    zip_ = config.CRUDO / "ml-latest-small.zip"
    if zip_.exists():
        try:
            verificar(zip_)
        except ChecksumInvalido as e:
            raise ChecksumInvalido(f"{e}. Borra {zip_} y vuelve a correr reco descargar.") from e
        print(f"ya estaba: {zip_}, MD5 correcto")
    else:
        bajar(zip_)
        print(f"bajado: {zip_}, MD5 {config.MD5_ZIP}")
    with zipfile.ZipFile(zip_) as z:
        z.extractall(config.CRUDO)
    return config.CRUDO / config.CARPETA_ZIP