"""Los dos modelos detrás de la misma interfaz, los embeddings locales y el precio para calcular el costo."""
from decimal import Decimal

from langchain.chat_models import init_chat_model
from langchain_ollama import OllamaEmbeddings

from docs.config import CFG

# USD por millón de tokens de Sonnet 5.5, los mismos que usan IA01 a IA04. Revisa la página de precios antes de
# confiar en el costo. El modelo local no cobra por token: su costo es tu máquina.
PRECIOS = {"claude": (Decimal("2"), Decimal("10")), "ollama": (Decimal("0"), Decimal("0"))}


def modelo_chat(proveedor: str = CFG.modelo):
    if proveedor == "claude":
        # Sonnet 5.5 rechaza temperature, top_p y top_k distintos de los de fábrica: no se pasan.
        return init_chat_model("claude-sonnet-5-5", model_provider="anthropic",
                               max_tokens=2000, timeout=60, max_retries=2)
    if proveedor == "ollama":
        # num_ctx: Ollama usa 2048 si no se lo pides, y seis trozos más el prompt no caben.
        return init_chat_model("qwen3:8b", model_provider="ollama", base_url=CFG.ollama,
                               temperature=0, num_ctx=16384, reasoning=True)
    raise ValueError(f"Modelo desconocido: {proveedor}. Usa claude u ollama.")


def embeddings():
    """Siempre locales: los trozos se indexan y las preguntas se buscan con el mismo modelo."""
    return OllamaEmbeddings(model=CFG.embeddings, base_url=CFG.ollama)


def costo(proveedor: str, entrada: int, salida: int) -> Decimal:
    p_in, p_out = PRECIOS[proveedor]
    return (entrada * p_in + salida * p_out) / Decimal(1_000_000)


def uso(raw) -> tuple[int, int]:
    """Los tokens de entrada y de salida de una respuesta del modelo, o ceros si no los trae."""
    u = getattr(raw, "usage_metadata", None) or {}
    return u.get("input_tokens", 0), u.get("output_tokens", 0)
