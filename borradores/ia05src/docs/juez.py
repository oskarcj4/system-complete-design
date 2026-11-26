"""El juez: compara una respuesta con la de referencia y dice si es correcta, con su motivo.

Un juez es otro modelo, con sus sesgos. Antes de creerle, se mide cuánto coincide con una persona (calibrar.py).
"""
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from docs.modelos import uso


class Veredicto(BaseModel):
    motivo: str = Field(description="Una o dos frases: qué tiene o qué le falta frente a la referencia.")
    veredicto: Literal["correcta", "incorrecta"]


RUBRICA = """Calificas la respuesta de un asistente a una pregunta sobre un curso, contra una respuesta de referencia.
Es correcta si dice la idea central de la referencia y no afirma nada que la contradiga. Puede decirlo con otras
palabras, ser más corta o agregar detalles, siempre que los detalles no contradigan la referencia.
Es incorrecta si le falta la idea central, si contradice la referencia o si dice que no hay respuesta cuando la hay.
Si la referencia es "No está en la documentación.", es correcta solo si la respuesta también dice que no está.
Primero escribe el motivo y después el veredicto. No premies el largo ni el tono."""


def juzgar(modelo, pregunta: str, referencia: str, respuesta: str) -> tuple[Veredicto, int, int]:
    pedido = (f"<pregunta>{pregunta}</pregunta>\n<referencia>{referencia}</referencia>\n"
              f"<respuesta>{respuesta}</respuesta>")
    r = modelo.with_structured_output(Veredicto, include_raw=True).invoke(
        [SystemMessage(RUBRICA), HumanMessage(pedido)])
    entrada, salida = uso(r["raw"])
    if r["parsed"] is None:
        raise ValueError(f"El juez no devolvió el formato pedido: {r['parsing_error']}")
    return r["parsed"], entrada, salida
