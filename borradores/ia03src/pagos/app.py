"""El proveedor de pagos, de mentira. Imita la idempotencia de un proveedor real:

    misma clave y mismo cuerpo   -> la misma respuesta, sin un reembolso nuevo (Idempotent-Replayed: true)
    misma clave y otro cuerpo    -> 422
    misma clave, todavía en curso -> 409
Modos (POST /admin/modo): normal, lento (reembolsa y tarda 6 s en responder), error (500 sin reembolsar), caido (503).
Todo vive en memoria: si el contenedor se reinicia, se pierden los reembolsos y las claves.
"""
import hashlib
import json
import threading
import time
import uuid
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Pagos de mentira")
CANDADO = threading.Lock()
CLAVES: dict[str, dict] = {}          # clave -> {"huella", "respuesta" | None}
REEMBOLSOS: dict[str, dict] = {}      # id -> reembolso
MODO = {"actual": "normal"}


class Reembolso(BaseModel):
    pedido_id: int
    monto_usd: str = Field(pattern=r"^\d{1,6}\.\d{2}$")     # texto con dos decimales: nada de float con dinero
    motivo: str = Field(max_length=200)


class Modo(BaseModel):
    modo: Literal["normal", "lento", "error", "caido"]


def huella(r: Reembolso) -> str:
    return hashlib.sha256(json.dumps(r.model_dump(), sort_keys=True).encode()).hexdigest()


@app.post("/v1/refunds", status_code=201)
def reembolsar(r: Reembolso, idempotency_key: str | None = Header(default=None, max_length=255)):
    if MODO["actual"] == "caido":
        raise HTTPException(503, "Servicio no disponible")
    if not idempotency_key:
        raise HTTPException(400, "Falta la cabecera Idempotency-Key")
    with CANDADO:
        previo = CLAVES.get(idempotency_key)
        if previo is not None:
            if previo["huella"] != huella(r):
                raise HTTPException(422, "La clave ya se usó con otro cuerpo")
            if previo["respuesta"] is None:
                raise HTTPException(409, "Hay un pedido con esta clave en curso")
            return JSONResponse(previo["respuesta"], status_code=201, headers={"Idempotent-Replayed": "true"})
        if MODO["actual"] == "error":
            raise HTTPException(500, "Error interno")   # antes de guardar la clave: el reintento empieza de cero
        CLAVES[idempotency_key] = {"huella": huella(r), "respuesta": None}
    reembolso = {"id": f"re_{uuid.uuid4().hex[:16]}", "pedido_id": r.pedido_id, "monto_usd": r.monto_usd,
                 "estado": "hecho", "creado_en": round(time.time())}
    with CANDADO:
        REEMBOLSOS[reembolso["id"]] = reembolso
        CLAVES[idempotency_key]["respuesta"] = reembolso
    if MODO["actual"] == "lento":
        time.sleep(6)            # el reembolso ya está hecho; el cliente deja de esperar a los 3 s
    return reembolso


@app.get("/v1/refunds")
def listar(pedido_id: int | None = None):
    return [x for x in REEMBOLSOS.values() if pedido_id is None or x["pedido_id"] == pedido_id]


@app.get("/v1/refunds/{rid}")
def ver(rid: str):
    if rid not in REEMBOLSOS:
        raise HTTPException(404, "No existe")
    return REEMBOLSOS[rid]


@app.post("/admin/modo")
def cambiar_modo(m: Modo):
    MODO["actual"] = m.modo
    return MODO
