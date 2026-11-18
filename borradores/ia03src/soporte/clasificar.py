"""Clasificar el mensaje y elegir el camino. El modelo clasifica; la regla que enruta es código."""
from typing import Literal

from pydantic import BaseModel, Field

from soporte.config import CFG


class Clasificacion(BaseModel):
    intencion: Literal["estado_pedido", "cambiar_direccion", "reembolso", "otro"]
    # Sin ge ni le: la salida estructurada de Claude no acepta mínimos ni máximos en el esquema.
    confianza: float = Field(description="De 0 a 1, qué tan seguro estás")
    pedido_mencionado: int | None = Field(description="El número de pedido si el cliente lo dice; si no, null")
    direccion_nueva: str | None = Field(description="Solo para cambiar_direccion: la dirección nueva completa; si no, null")


def camino(c: Clasificacion, minima: float = CFG.confianza_minima) -> Literal["wf_estado", "wf_direccion", "agente"]:
    """Lo conocido y seguro va a un workflow sin modelo. Todo lo demás, incluido cada reembolso, al agente."""
    if c.confianza < minima:
        return "agente"
    if c.intencion == "estado_pedido":
        return "wf_estado"
    if c.intencion == "cambiar_direccion" and c.pedido_mencionado and c.direccion_nueva:
        return "wf_direccion"
    return "agente"
