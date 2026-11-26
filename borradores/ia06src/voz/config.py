"""La configuración, leída una vez del entorno y del archivo .env."""
import os
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

load_dotenv()

# Los mismos ids y nombres que inserta db/init.sql. El nombre es como lo dice el agente.
PROFESIONALES = {"ruiz": "la doctora Ruiz", "paz": "el doctor Paz"}


@dataclass(frozen=True)
class Config:
    modelo: str = os.getenv("VOZ_MODELO", "claude")
    db: str = os.getenv("VOZ_DB", "postgresql://agenda_bot:agenda_bot@127.0.0.1:55438/consultorio")
    db_admin: str = os.getenv("VOZ_DB_ADMIN", "postgresql://postgres:postgres@127.0.0.1:55438/consultorio")
    zona: ZoneInfo = ZoneInfo(os.getenv("VOZ_ZONA", "America/Mexico_City"))
    whisper: str = os.getenv("VOZ_WHISPER", "small")
    voz: str = os.getenv("VOZ_PIPER", "es_MX-claude-high")
    silencio: float = float(os.getenv("VOZ_SILENCIO", "0.2"))
    ollama: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    latencias: str = os.getenv("VOZ_LATENCIAS", "latencias.csv")


CFG = Config()
