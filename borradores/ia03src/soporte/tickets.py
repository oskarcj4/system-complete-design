"""Un turno de soporte, igual para la API, la línea de comandos y los evals.

    crear()     abre un ticket para un cliente de sesión
    atender()   guarda el mensaje del cliente, corre el grafo y guarda la respuesta
    resolver()  una persona aprueba o rechaza lo que quedó esperando, y el grafo sigue
"""
import re
from contextlib import contextmanager

import psycopg
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command
from psycopg.rows import dict_row

from soporte import prompts
from soporte.config import CFG
from soporte.grafo import construir, servicios_reales
from soporte.modelos import costo, modelo_chat

CLAVE = re.compile(r"reembolso:(\d+):[A-Za-z0-9_-]{1,64}")   # reembolso:{ticket}:{id de la llamada}
ESPERA = "Tu pedido de reembolso necesita la aprobación de una persona del equipo. Te escribimos aquí apenas lo revise."


class NoEsTuyo(LookupError):
    pass


class EnEspera(RuntimeError):
    pass


@contextmanager
def abrir(proveedor: str = CFG.modelo, servicios=None):
    with PostgresSaver.from_conn_string(CFG.db_app) as checkpointer:
        checkpointer.setup()                       # crea o migra sus tablas; se puede correr siempre
        yield construir(modelo_chat(proveedor), servicios or servicios_reales(), checkpointer, CFG.max_pasos)


def hilo(ticket_id: int) -> dict:
    return {"configurable": {"thread_id": f"ticket-{ticket_id}"}}


def _db():
    return psycopg.connect(CFG.db_app, autocommit=True, row_factory=dict_row)


def crear(cliente_id: int, origen: str = "api", proveedor: str = CFG.modelo) -> int:
    with _db() as g:
        return g.execute("INSERT INTO tickets (cliente_id, origen, modelo) VALUES (%s, %s, %s) RETURNING id",
                         (cliente_id, origen, proveedor)).fetchone()["id"]


def _ticket(g, ticket_id: int, cliente_id: int | None = None) -> dict:
    t = g.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,)).fetchone()
    if t is None or (cliente_id is not None and t["cliente_id"] != cliente_id):
        raise NoEsTuyo(f"No existe el ticket {ticket_id} para ese cliente")   # el mismo error en los dos casos
    return t


def _cerrar_turno(grafo, ticket_id: int) -> dict:
    """Lee cómo quedó el hilo después de correr el grafo y lo deja en las tablas de soporte."""
    estado = grafo.get_state(hilo(ticket_id))
    v = estado.values
    espera = estado.next == ("aprobar",)
    respuesta = ESPERA if espera else v["respuesta"]
    with _db() as g:
        t = _ticket(g, ticket_id)
        g.execute("INSERT INTO mensajes (ticket_id, autor, texto, camino) VALUES (%s, 'agente', %s, %s)",
                  (ticket_id, respuesta, v.get("camino")))
        g.execute("UPDATE tickets SET estado = %s, tokens_entrada = %s, tokens_salida = %s, costo_usd = %s "
                  "WHERE id = %s", ("esperando_aprobacion" if espera else "abierto", v.get("tokens_entrada", 0),
                                    v.get("tokens_salida", 0), costo(t["modelo"], v.get("tokens_entrada", 0),
                                                                     v.get("tokens_salida", 0)), ticket_id))
    return {"ticket": ticket_id, "estado": "esperando_aprobacion" if espera else "respondido",
            "camino": v.get("camino"), "respuesta": respuesta, "pasos": v.get("pasos", 0),
            "tokens": {"entrada": v.get("tokens_entrada", 0), "salida": v.get("tokens_salida", 0)}}


def atender(grafo, ticket_id: int, cliente_id: int, texto: str) -> dict:
    with _db() as g:
        if _ticket(g, ticket_id, cliente_id)["estado"] == "esperando_aprobacion":
            raise EnEspera("Este ticket espera una aprobación; el cliente no puede escribir hasta que se resuelva")
        g.execute("INSERT INTO mensajes (ticket_id, autor, texto) VALUES (%s, 'cliente', %s)", (ticket_id, texto))
    entrada = {"ticket": ticket_id, "cliente_id": cliente_id, "ultimo": texto,
               "messages": [HumanMessage(prompts.mensaje_cliente(texto))]}
    grafo.invoke(entrada, hilo(ticket_id), durability="sync")
    return _cerrar_turno(grafo, ticket_id)


def esperando() -> list[dict]:
    with _db() as g:
        return g.execute("SELECT a.clave, a.ticket_id, t.cliente_id, a.pedido_id, a.monto_usd, a.args->>'motivo' AS motivo, "
                         "a.creada_en FROM acciones a JOIN tickets t ON t.id = a.ticket_id "
                         "WHERE a.estado = 'esperando' ORDER BY a.creada_en").fetchall()


def resolver(grafo, clave: str, aprobada: bool, quien: str, nota: str = "") -> dict:
    m = CLAVE.fullmatch(clave)
    if m is None:
        raise NoEsTuyo(f"No existe la acción {clave}")
    ticket_id = int(m.group(1))
    estado = grafo.get_state(hilo(ticket_id))
    if estado.next != ("aprobar",) or estado.values["pendiente"]["clave"] != clave:
        raise EnEspera(f"La acción {clave} no está esperando una decisión")
    with _db() as g:
        g.execute("INSERT INTO mensajes (ticket_id, autor, texto) VALUES (%s, 'soporte', %s)",
                  (ticket_id, f"{quien}: {'aprueba' if aprobada else 'rechaza'}. {nota}".strip()))
    grafo.invoke(Command(resume={"aprobada": aprobada, "quien": quien, "nota": nota}), hilo(ticket_id),
                 durability="sync")
    return _cerrar_turno(grafo, ticket_id)
