"""Los dos modelos detrás de la misma interfaz, los embeddings locales y el precio para calcular el costo."""
from decimal import Decimal

from langchain.chat_models import init_chat_model
from langchain_ollama import OllamaEmbeddings

from soporte.config import CFG

# USD por millón de tokens de Sonnet 5.5, los mismos que usa IA01. Revisa la página de precios antes de confiar en el costo.
# El modelo local no cobra por token: su costo es tu máquina.
PRECIOS = {"claude": (Decimal("2"), Decimal("10")), "ollama": (Decimal("0"), Decimal("0"))}


def modelo_chat(proveedor: str = CFG.modelo):
    if proveedor == "claude":
        # Sonnet 5.5 rechaza temperature, top_p y top_k distintos de los de fábrica: no se pasan.
        return init_chat_model("claude-sonnet-5-5", model_provider="anthropic",
                               max_tokens=4000, timeout=60, max_retries=2)
    if proveedor == "ollama":
        # num_ctx: Ollama usa 2048 si no se lo pides, y la política más la conversación no caben.
        return init_chat_model("qwen3:8b", model_provider="ollama", base_url=CFG.ollama,
                               temperature=0, num_ctx=16384, reasoning=True)
    raise ValueError(f"Modelo desconocido: {proveedor}. Usa claude u ollama.")


def embeddings():
    """Siempre locales: las políticas se indexan y se buscan con el mismo modelo, uses Claude u Ollama."""
    return OllamaEmbeddings(model="nomic-embed-text", base_url=CFG.ollama)


def costo(proveedor: str, entrada: int, salida: int) -> Decimal:
    p_in, p_out = PRECIOS[proveedor]
    return (entrada * p_in + salida * p_out) / Decimal(1_000_000)
