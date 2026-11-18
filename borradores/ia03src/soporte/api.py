"""La API del soporte. Escucha solo en 127.0.0.1.

    POST /tickets                       X-Cliente: 1                    -> 201 {"ticket": 7}
    POST /tickets/{id}/mensajes         X-Cliente: 1  {"texto": "..."}  -> 200 respondido | 202 esperando_aprobacion
    GET  /aprobaciones                  X-Soporte: marta                -> lo que espera una persona
    POST /aprobaciones/{clave}          X-Soporte: marta  {"decision": "aprobar", "nota": "..."}

X-Cliente hace de la sesión: en tu tienda lo pone el login (A12, A13), nunca el navegador a mano.
X-Soporte hace de la cuenta del equipo, con la misma salvedad. Esta API no autentica: es para tu máquina.
"""
from contextlib import asynccontextmanager
from typing import Literal

import uvicorn
from fastapi import FastAPI, Header, HTTPException, Request, Response
from pydantic import BaseModel, Field

from soporte import tickets, trazas
from soporte.config import CFG


@asynccontextmanager
async def vida(app: FastAPI):
    trazas.activar()
    with tickets.abrir(CFG.modelo) as grafo:       # un grafo y un checkpointer para todas las requests
        app.state.grafo = grafo
        yield


app = FastAPI(title="Soporte IA03", lifespan=vida)


class Mensaje(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)


class Decision(BaseModel):
    decision: Literal["aprobar", "rechazar"]
    nota: str = Field(default="", max_length=300)


@app.post("/tickets", status_code=201)
def nuevo(x_cliente: int = Header(gt=0)):
    return {"ticket": tickets.crear(x_cliente, "api", CFG.modelo)}


@app.post("/tickets/{ticket_id}/mensajes")
def escribir(ticket_id: int, m: Mensaje, request: Request, response: Response, x_cliente: int = Header(gt=0)):
    try:
        r = tickets.atender(request.app.state.grafo, ticket_id, x_cliente, m.texto)
    except tickets.NoEsTuyo:
        raise HTTPException(404, "no existe ese ticket")      # el mismo 404 si existe y es de otro cliente
    except tickets.EnEspera as e:
        raise HTTPException(409, str(e))
    if r["estado"] == "esperando_aprobacion":
        response.status_code = 202
    return r


@app.get("/aprobaciones")
def pendientes(x_soporte: str = Header(min_length=2, max_length=40)):
    return tickets.esperando()


@app.post("/aprobaciones/{clave}")
def decidir(clave: str, d: Decision, request: Request, x_soporte: str = Header(min_length=2, max_length=40)):
    try:
        return tickets.resolver(request.app.state.grafo, clave, d.decision == "aprobar", x_soporte, d.nota)
    except tickets.NoEsTuyo:
        raise HTTPException(404, "no existe esa acción")
    except tickets.EnEspera as e:
        raise HTTPException(409, str(e))


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=8003)
