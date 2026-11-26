"""La tubería entera: recuperar, reordenar si se pide, responder y verificar. Es un workflow, no un agente.

Los pasos son siempre los mismos y en el mismo orden: el modelo no decide si busca ni cuántas veces.
"""
import time
from dataclasses import dataclass, field
from decimal import Decimal

from docs import rerank
from docs.modelos import costo
from docs.responder import Respuesta, responder
from docs.verificar import Verificacion, verificar


@dataclass(frozen=True)
class Opciones:
    modo: str = "hibrida"          # lexica | semantica | hibrida
    estrategia: str = "seccion"    # seccion | fijo
    prefijo: bool = True
    n: int = 6                     # los trozos que llegan al modelo
    reordenar: bool = False        # re-ranking con el modelo
    candidatos: int = 20           # los que lee el re-ranker


@dataclass
class Resultado:
    pregunta: str
    trozos: list
    respuesta: Respuesta
    verificacion: Verificacion
    tokens_entrada: int = 0
    tokens_salida: int = 0
    segundos: float = 0.0
    pasos: list[str] = field(default_factory=list)

    def costo(self, proveedor: str) -> Decimal:
        return costo(proveedor, self.tokens_entrada, self.tokens_salida)


def preguntar(pregunta: str, opciones: Opciones, modelo, recuperar) -> Resultado:
    """`recuperar(pregunta, opciones, cuantos)` devuelve los trozos; en las pruebas es una función falsa."""
    inicio, entrada, salida, pasos = time.monotonic(), 0, 0, []
    if opciones.reordenar:
        candidatos = recuperar(pregunta, opciones, opciones.candidatos)
        trozos, e, s = rerank.reordenar(modelo, pregunta, candidatos, opciones.n)
        entrada, salida = entrada + e, salida + s
        pasos += [f"recuperar {len(candidatos)}", f"reordenar a {len(trozos)}"]
    else:
        trozos = recuperar(pregunta, opciones, opciones.n)
        pasos.append(f"recuperar {len(trozos)}")
    r, e, s = responder(modelo, pregunta, trozos)
    pasos += ["responder", "verificar"]
    return Resultado(pregunta, trozos, r, verificar(r, trozos), entrada + e, salida + s,
                     time.monotonic() - inicio, pasos)


def recuperador(conexion):
    """El recuperar de verdad, sobre la base: buscar.buscar con las opciones del pedido."""
    from docs import buscar

    def recuperar(pregunta: str, opciones: Opciones, cuantos: int):
        return buscar.buscar(conexion, pregunta, opciones.modo, opciones.estrategia, opciones.prefijo, cuantos)
    return recuperar
