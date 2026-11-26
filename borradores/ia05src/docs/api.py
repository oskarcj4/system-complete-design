"""La API: una ruta para preguntar y otra para buscar sin modelo. Se conecta a la base con el rol que solo lee."""
from typing import Literal

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from docs import buscar
from docs.config import CFG
from docs.modelos import modelo_chat
from docs.pipeline import Opciones, preguntar, recuperador

app = FastAPI(title="ia05-docs")


class Pedido(BaseModel):
    pregunta: str = Field(min_length=3, max_length=500)
    modo: Literal["lexica", "semantica", "hibrida"] = "hibrida"
    estrategia: Literal["seccion", "fijo"] = "seccion"
    reordenar: bool = False


def opciones(p: Pedido) -> Opciones:
    return Opciones(modo=p.modo, estrategia=p.estrategia, reordenar=p.reordenar)


@app.post("/buscar")
def ruta_buscar(p: Pedido):
    o = opciones(p)
    with buscar.conectar() as c:
        trozos = buscar.buscar(c, p.pregunta, o.modo, o.estrategia, o.prefijo, o.n)
    return {"trozos": [{"cita": e.cita, "titulo": e.titulo, "texto": e.texto[:300]} for e in trozos]}


@app.post("/preguntar")
def ruta_preguntar(p: Pedido):
    with buscar.conectar() as c:
        try:
            r = preguntar(p.pregunta, opciones(p), modelo_chat(), recuperador(c))
        except ValueError as e:                  # el modelo no devolvió el formato
            raise HTTPException(502, str(e)) from None
    return {
        "respuesta": r.respuesta.respuesta,
        "sin_respuesta": r.respuesta.sin_respuesta,
        "citas": [{"cita": c.cita, "frase": c.frase, "valida": c.cita in r.verificacion.validas}
                  for c in r.respuesta.citas],
        "problemas": [{"cita": c, "motivo": m} for c, m in r.verificacion.invalidas],
        "tokens": {"entrada": r.tokens_entrada, "salida": r.tokens_salida},
        "costo_usd": str(r.costo(CFG.modelo)),
        "segundos": round(r.segundos, 2),
    }


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=8005)
