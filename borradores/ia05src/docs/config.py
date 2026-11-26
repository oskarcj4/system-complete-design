"""La configuración, desde variables de entorno, con valores que apuntan al compose de la guía."""
import os
from dataclasses import dataclass
from pathlib import Path

BASE = "postgresql://{}@localhost:55437/docs"


@dataclass(frozen=True)
class Config:
    modelo: str = os.environ.get("DOCS_MODELO", "claude")                 # claude | ollama: el que responde
    juez: str = os.environ.get("DOCS_JUEZ", "claude")                     # el que califica en los evals
    corpus: Path = Path(os.environ.get("DOCS_CORPUS", "corpus"))          # la carpeta con modules/*.html
    db_indexador: str = os.environ.get("DOCS_DB_INDEXADOR", BASE.format("docs_indexador:indexador"))
    db_lector: str = os.environ.get("DOCS_DB_LECTOR", BASE.format("docs_lector:lector"))
    ollama: str = os.environ.get("DOCS_OLLAMA", "http://localhost:11434")
    embeddings: str = os.environ.get("DOCS_EMBEDDINGS", "nomic-embed-text")   # tiene que dar 768 números
    max_palabras: int = int(os.environ.get("DOCS_MAX_PALABRAS", "350"))      # troceado por sección
    tamano: int = int(os.environ.get("DOCS_TAMANO", "200"))                  # troceado fijo, en palabras
    solape: int = int(os.environ.get("DOCS_SOLAPE", "40"))


CFG = Config()
