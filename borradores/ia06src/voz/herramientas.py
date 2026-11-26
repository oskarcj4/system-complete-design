"""Las cuatro herramientas del agente, escritas una vez y sin Pipecat.

bot.py las conecta a Pipecat y evals/dialogos.py a LangChain. Cada una recibe la sesión, la historia de la
conversación (lista de mensajes con role y content) y los argumentos que mandó el modelo, y devuelve un dict.
"""
import asyncio
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime

from voz import agenda
from voz.config import CFG, PROFESIONALES
from voz.confirmar import puede_confirmar
from voz.fechas import en_palabras, leer_fecha, leer_inicio, piezas


@dataclass(frozen=True)
class Propuesta:
    accion: str                  # reservar o cancelar
    profesional: str
    inicio: datetime
    paciente: str
    piezas: tuple[str, ...]      # lo que tiene que sonar entero
    desde: int                   # cuántos mensajes había en la historia al proponer
    cita_id: int | None = None   # solo al cancelar


@dataclass
class Sesion:
    id: str
    propuesta: Propuesta | None = None
    hechas: list[tuple[str, str, int | None]] = field(default_factory=list)   # (acción, estado, cita)


async def _con_db(fn, *args):
    """Corre una función de agenda.py en otro hilo, con su conexión. psycopg síncrono no frena el audio así."""
    def correr():
        with agenda.conectar() as conn:
            return fn(conn, *args)
    return await asyncio.to_thread(correr)


def clave_de(sesion_id: str, p: Propuesta) -> str:
    """La clave de idempotencia: la misma sesión y la misma propuesta dan siempre la misma clave."""
    datos = [sesion_id, p.accion, p.profesional, p.inicio.isoformat(), p.paciente.strip().lower()]
    return hashlib.sha256(json.dumps(datos).encode()).hexdigest()[:32]


def _profesional(args: dict) -> str | None:
    p = str(args.get("profesional", "")).strip().lower()
    return p if p in PROFESIONALES else None


async def ver_disponibilidad(sesion: Sesion, mensajes: list[dict], args: dict) -> dict:
    p = _profesional(args)
    if p is None:
        return {"error": f"Profesional desconocido. Usa uno de: {', '.join(PROFESIONALES)}."}
    try:
        dia = leer_fecha(args["fecha"])
    except (KeyError, ValueError):
        return {"error": "La fecha va como AAAA-MM-DD, por ejemplo 2026-12-01."}
    libres = await _con_db(agenda.disponibles, p, dia)
    return {"profesional": p, "fecha": dia.isoformat(), "libres": [f"{f:%H:%M}" for f in libres]}


async def proponer_reserva(sesion: Sesion, mensajes: list[dict], args: dict) -> dict:
    p, paciente = _profesional(args), str(args.get("paciente", "")).strip()
    if p is None or not paciente:
        return {"error": "Faltan datos: profesional y nombre de la persona."}
    try:
        inicio = leer_inicio(args["inicio"], CFG.zona)
    except (KeyError, ValueError):
        return {"error": "El inicio va como AAAA-MM-DDTHH:MM, por ejemplo 2026-12-01T10:30."}
    if inicio not in await _con_db(agenda.disponibles, p, inicio.date()):
        return {"error": "Esa hora no está libre. Busca otra con ver_disponibilidad."}
    sesion.propuesta = Propuesta("reservar", p, inicio, paciente, piezas(inicio, PROFESIONALES[p]), len(mensajes))
    return {"leer": f"¿Le reservo con {PROFESIONALES[p]} {en_palabras(inicio)}, a nombre de {paciente}?",
            "despues": "Lee la pregunta tal cual y espera la respuesta. No llames a confirmar antes."}


async def proponer_cancelacion(sesion: Sesion, mensajes: list[dict], args: dict) -> dict:
    p, paciente = _profesional(args), str(args.get("paciente", "")).strip()
    if p is None or not paciente:
        return {"error": "Faltan datos: profesional y nombre de la persona."}
    try:
        inicio = leer_inicio(args["inicio"], CFG.zona)
    except (KeyError, ValueError):
        return {"error": "El inicio va como AAAA-MM-DDTHH:MM, por ejemplo 2026-12-01T10:30."}
    cita = await _con_db(agenda.buscar, p, inicio, paciente)
    if cita is None:
        return {"error": "No encuentro una cita activa con esos datos. Pregunta el día, la hora y el nombre."}
    sesion.propuesta = Propuesta("cancelar", p, inicio, paciente, piezas(inicio, PROFESIONALES[p]), len(mensajes), cita)
    return {"leer": f"¿Cancelo su cita con {PROFESIONALES[p]} {en_palabras(inicio)}?",
            "despues": "Lee la pregunta tal cual y espera la respuesta. No llames a confirmar antes."}


async def confirmar(sesion: Sesion, mensajes: list[dict], args: dict) -> dict:
    ok, motivo = puede_confirmar(mensajes, sesion.propuesta)
    if not ok:
        return {"hecho": False, "motivo": motivo}
    p = sesion.propuesta
    if p.accion == "reservar":
        r = await _con_db(agenda.reservar, p.profesional, p.inicio, p.paciente, clave_de(sesion.id, p))
    else:
        r = await _con_db(agenda.cancelar, p.cita_id)
    sesion.propuesta = None
    sesion.hechas.append((p.accion, r.estado, r.cita_id))
    if r.estado == "ocupada":
        return {"hecho": False, "motivo": "Otra persona tomó esa hora mientras tanto. Ofrece otra."}
    return {"hecho": r.estado in ("reservada", "repetida", "cancelada"), "estado": r.estado, "cita": r.cita_id}


_PROFESIONAL = {"type": "string", "enum": list(PROFESIONALES), "description": "El id del profesional."}
_INICIO = {"type": "string", "description": "Fecha y hora de inicio, AAAA-MM-DDTHH:MM, en la hora del consultorio."}
_PACIENTE = {"type": "string", "description": "Nombre y apellido de la persona, como lo dijo."}

HERRAMIENTAS = [
    {"name": "ver_disponibilidad", "fn": ver_disponibilidad, "efecto": False,
     "description": "Las horas libres de un profesional en un día. Úsala antes de proponer una hora.",
     "properties": {"profesional": _PROFESIONAL,
                    "fecha": {"type": "string", "description": "El día, AAAA-MM-DD."}},
     "required": ["profesional", "fecha"]},
    {"name": "proponer_reserva", "fn": proponer_reserva, "efecto": False,
     "description": "Prepara una reserva y devuelve la pregunta que hay que leerle a la persona. No reserva nada.",
     "properties": {"profesional": _PROFESIONAL, "inicio": _INICIO, "paciente": _PACIENTE},
     "required": ["profesional", "inicio", "paciente"]},
    {"name": "proponer_cancelacion", "fn": proponer_cancelacion, "efecto": False,
     "description": "Prepara la cancelación de una cita y devuelve la pregunta que hay que leer. No cancela nada.",
     "properties": {"profesional": _PROFESIONAL, "inicio": _INICIO, "paciente": _PACIENTE},
     "required": ["profesional", "inicio", "paciente"]},
    {"name": "confirmar", "fn": confirmar, "efecto": True,
     "description": "Hace lo propuesto, solo después de que la persona oyó la pregunta y respondió.",
     "properties": {}, "required": []},
]
