"""La configuración, desde variables de entorno, con valores que apuntan al compose de la guía."""
import os
from dataclasses import dataclass
from decimal import Decimal

BASE = "postgresql://{}@localhost:55435/{}"


@dataclass(frozen=True)
class Config:
    modelo: str = os.environ.get("SOPORTE_MODELO", "claude")                 # claude | ollama
    db_app: str = os.environ.get("SOPORTE_DB", BASE.format("soporte_app:app", "soporte"))
    db_lector: str = os.environ.get("SOPORTE_DB_LECTOR", BASE.format("soporte_lector:lector", "tienda"))
    db_actor: str = os.environ.get("SOPORTE_DB_ACTOR", BASE.format("soporte_actor:actor", "tienda"))
    db_duenio: str = os.environ.get("SOPORTE_DB_DUENIO", BASE.format("tienda:tienda", "tienda"))
    pagos: str = os.environ.get("SOPORTE_PAGOS", "http://localhost:8013")
    ollama: str = os.environ.get("SOPORTE_OLLAMA", "http://localhost:11434")
    phoenix: str | None = os.environ.get("SOPORTE_PHOENIX")                     # por ejemplo http://localhost:6003
    umbral_usd: Decimal = Decimal(os.environ.get("SOPORTE_UMBRAL", "50.00"))   # hasta aquí, sin persona
    dias_reembolso: int = int(os.environ.get("SOPORTE_DIAS", "30"))
    confianza_minima: float = float(os.environ.get("SOPORTE_CONFIANZA", "0.8"))
    max_pasos: int = int(os.environ.get("SOPORTE_MAX_PASOS", "8"))


CFG = Config()
