"""Traces en Phoenix por OpenTelemetry, si SOPORTE_PHOENIX está definida y el extra trazas está instalado."""
from soporte.config import CFG


def activar(proyecto: str = "ia03-soporte") -> None:
    if not CFG.phoenix:
        return
    try:
        from phoenix.otel import register
    except ImportError:
        print("Sin traces: instala el extra con uv sync --extra trazas")
        return
    # Una trace por mensaje, con un span por nodo, por llamada al modelo y por herramienta.
    register(project_name=proyecto, endpoint=f"{CFG.phoenix}/v1/traces", auto_instrument=True, batch=True)
