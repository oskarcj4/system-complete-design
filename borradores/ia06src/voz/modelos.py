"""Las tres etapas de la cascada: oír (Whisper), pensar (Claude u Ollama) y hablar (Piper).

Whisper y Piper corren en tu máquina siempre; lo único que puede salir de ella es el texto que va a Claude.
"""
import os
from decimal import Decimal

from pipecat.services.anthropic.llm import AnthropicLLMService
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.services.piper.tts import PiperTTSService
from pipecat.services.whisper.stt import WhisperSTTService
from pipecat.transcriptions.language import Language

from voz.config import CFG

# USD por millón de tokens de entrada y de salida de Haiku 5.5 (prompts de hasta 100 000 tokens).
# Revisa la página de precios antes de confiar en el costo. El modelo local no cobra por token.
PRECIOS = {"claude": (Decimal("0.10"), Decimal("0.50")), "ollama": (Decimal("0"), Decimal("0"))}
MODELOS = {"claude": "claude-haiku-5-5", "ollama": "qwen2.5:7b"}


def oido() -> WhisperSTTService:
    """Whisper local. Transcribe cada turno entero cuando el VAD dice que la persona calló."""
    return WhisperSTTService(
        device="auto",
        settings=WhisperSTTService.Settings(model=CFG.whisper, language=Language.ES),
    )


def cerebro(instrucciones: str, proveedor: str = CFG.modelo):
    """El modelo que decide qué decir y qué herramienta llamar. max_tokens corto: es una llamada telefónica."""
    if proveedor == "claude":
        return AnthropicLLMService(
            api_key=os.getenv("ANTHROPIC_API_KEY"),
            settings=AnthropicLLMService.Settings(
                model=MODELOS["claude"], system_instruction=instrucciones, max_tokens=300),
        )
    if proveedor == "ollama":
        return OLLamaLLMService(
            base_url=f"{CFG.ollama}/v1",
            settings=OLLamaLLMService.Settings(
                model=MODELOS["ollama"], system_instruction=instrucciones, max_tokens=300),
        )
    raise ValueError(f"Modelo desconocido: {proveedor}. Usa claude u ollama.")


def boca() -> PiperTTSService:
    """Piper local, con una voz en español. Empieza a hablar con la primera frase, sin esperar la respuesta entera."""
    return PiperTTSService(settings=PiperTTSService.Settings(voice=CFG.voz))


def costo(proveedor: str, entrada: int, salida: int) -> Decimal:
    p_in, p_out = PRECIOS[proveedor]
    return (entrada * p_in + salida * p_out) / Decimal(1_000_000)
