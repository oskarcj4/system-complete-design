"""El grafo del soporte. Corre una vez por cada mensaje del cliente, en el hilo del ticket.

    START → clasificar ─┬→ wf_estado ───→ END                         (sin modelo)
                        ├→ wf_direccion → END                         (sin modelo, con efecto y clave)
                        └→ agente ─┬→ herramientas ─┬→ agente          (lectura, o la política decidió)
                                   │                └→ aprobar (interrupt) → agente
                                   └→ fin → END

Todo lo de afuera llega en servicios (la base, el proveedor, los workflows): las pruebas pasan unos falsos.
"""
from types import SimpleNamespace
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AIMessage, AnyMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.types import interrupt

from soporte import prompts
from soporte.acciones import ProponerReembolso
from soporte.clasificar import Clasificacion, camino
from soporte.herramientas import LECTURA

PASAME = "Te paso con una persona del equipo: ya tiene tu ticket y te escribe por aquí."


class Estado(TypedDict, total=False):
    ticket: int
    cliente_id: int                   # lo pone la API desde la sesión; ningún nodo lo cambia
    ultimo: str                       # el último mensaje del cliente, sin envolver
    messages: Annotated[list[AnyMessage], add_messages]
    clasificacion: dict
    camino: str
    pasos: int
    tokens_entrada: int
    tokens_salida: int
    pendiente: dict | None            # el reembolso que espera a una persona
    respuesta: str


def texto_de(m: AIMessage) -> str:
    if isinstance(m.content, str):
        return m.content
    return "".join(b.get("text", "") for b in m.content if isinstance(b, dict) and b.get("type") == "text")


def uso(e: Estado, raw: AIMessage) -> dict:
    u = raw.usage_metadata or {}
    return {"tokens_entrada": e.get("tokens_entrada", 0) + u.get("input_tokens", 0),
            "tokens_salida": e.get("tokens_salida", 0) + u.get("output_tokens", 0)}


def construir(modelo, servicios, checkpointer=None, max_pasos: int = 8):
    con_herramientas = modelo.bind_tools([*LECTURA.values(), ProponerReembolso])
    # json_schema: salida estructurada nativa. El método por defecto de Claude fuerza una herramienta,
    # y Sonnet 5.5 rechaza tool_choice forzado.
    para_clasificar = modelo.with_structured_output(Clasificacion, method="json_schema", include_raw=True)

    def clasificar(e: Estado):
        r = para_clasificar.invoke([SystemMessage(prompts.CLASIFICAR),
                                    HumanMessage(prompts.mensaje_cliente(e["ultimo"]))])
        c = r["parsed"] or Clasificacion(intencion="otro", confianza=0, pedido_mencionado=None,
                                         direccion_nueva=None)           # salida inválida: al agente
        return {"clasificacion": c.model_dump(), "camino": camino(c), "pasos": 0, "pendiente": None, **uso(e, r["raw"])}

    def wf_estado(e: Estado):
        texto = servicios.estado(e["cliente_id"], e["clasificacion"]["pedido_mencionado"])
        return {"respuesta": texto, "messages": [AIMessage(texto)]}

    def wf_direccion(e: Estado):
        c = e["clasificacion"]
        texto = servicios.direccion(e["ticket"], e["cliente_id"], c["pedido_mencionado"], c["direccion_nueva"])
        return {"respuesta": texto, "messages": [AIMessage(texto)]}

    def agente(e: Estado):
        respuesta = con_herramientas.invoke([SystemMessage(prompts.AGENTE), *e["messages"]])
        return {"messages": [respuesta], "pasos": e["pasos"] + 1, **uso(e, respuesta)}

    def despues_de_agente(e: Estado) -> Literal["herramientas", "fin"]:
        if e["messages"][-1].tool_calls and e["pasos"] < max_pasos:
            return "herramientas"
        return "fin"

    def herramientas(e: Estado):
        mensajes, pendiente = [], None
        for c in e["messages"][-1].tool_calls:
            if c["name"] in LECTURA:
                try:
                    texto = servicios.leer(c["name"], c["args"], e["cliente_id"])
                except Exception as error:                  # argumentos inválidos, base caída, plazo
                    texto = f"ERROR: {type(error).__name__}: {error}"
            elif c["name"] == "ProponerReembolso":
                texto, espera = proponer(e, c)
                if espera:                                  # sin ToolMessage todavía: lo escribe aprobar
                    pendiente = espera
                    continue
            else:
                texto = f"ERROR: no existe la herramienta {c['name']}."
            mensajes.append(ToolMessage(prompts.resultado(c["name"], texto), tool_call_id=c["id"], name=c["name"]))
        return {"messages": mensajes, "pendiente": pendiente}

    def proponer(e: Estado, c: dict) -> tuple[str, dict | None]:
        try:
            p = ProponerReembolso.model_validate(c["args"])
        except ValueError as error:
            return f"ERROR: argumentos inválidos: {error}", None
        # La clave sale del ticket y del id de la llamada, que quedó en el checkpoint: si el nodo se repite, es la misma.
        clave = f"reembolso:{e['ticket']}:{c['id']}"
        d = servicios.reservar(e["ticket"], e["cliente_id"], clave, p)
        if d.resultado == "rechazar":
            return f"RECHAZADO por la política: {d.motivo}", None
        if d.resultado == "aprobar":
            return "", {"clave": clave, "llamada": c["id"], "pedido_id": p.pedido_id, "monto_usd": p.monto_usd,
                        "motivo_cliente": p.motivo, "hechos": servicios.leer("VerPedido", {"pedido_id": p.pedido_id},
                                                                           e["cliente_id"])}
        return f"APROBADO por la política ({d.motivo}). Proveedor: {servicios.ejecutar(clave)}", None

    def despues_de_herramientas(e: Estado) -> Literal["aprobar", "agente"]:
        return "aprobar" if e.get("pendiente") else "agente"

    def aprobar(e: Estado):
        p = e["pendiente"]
        # Antes de interrupt no hay efectos: al reanudar, este nodo corre otra vez desde aquí.
        r = interrupt({"clave": p["clave"], "pedido_id": p["pedido_id"], "monto_usd": p["monto_usd"],
                       "hechos": p["hechos"], "motivo_cliente": p["motivo_cliente"]})
        # Si el nodo se repite, decidir no cambia nada: devuelve cómo quedó la primera vez.
        quedo = servicios.decidir(p["clave"], r["aprobada"], r["quien"], r.get("nota", ""))
        if quedo == "rechazada":
            texto = f"RECHAZADO por {r['quien']}: {r.get('nota') or 'sin nota'}"
        else:
            texto = f"APROBADO por {r['quien']}. Proveedor: {servicios.ejecutar(p['clave'])}"
        msg = ToolMessage(prompts.resultado("ProponerReembolso", texto), tool_call_id=p["llamada"],
                          name="ProponerReembolso")
        return {"messages": [msg], "pendiente": None}

    def fin(e: Estado):
        ultimo = e["messages"][-1]
        if ultimo.tool_calls:                               # se acabaron los pasos con llamadas pendientes
            return {"respuesta": PASAME, "messages": [AIMessage(PASAME)]}
        return {"respuesta": texto_de(ultimo) or PASAME}

    g = StateGraph(Estado)
    for nodo in (clasificar, wf_estado, wf_direccion, agente, herramientas, aprobar, fin):
        g.add_node(nodo.__name__, nodo)
    g.add_edge(START, "clasificar")
    g.add_conditional_edges("clasificar", lambda e: e["camino"], ["wf_estado", "wf_direccion", "agente"])
    g.add_conditional_edges("agente", despues_de_agente, ["herramientas", "fin"])
    g.add_conditional_edges("herramientas", despues_de_herramientas, ["aprobar", "agente"])
    g.add_edge("aprobar", "agente")
    for nodo in ("wf_estado", "wf_direccion", "fin"):
        g.add_edge(nodo, END)
    return g.compile(checkpointer=checkpointer)


def servicios_reales() -> SimpleNamespace:
    """Lo de afuera de verdad: la base con la RLS, el proveedor de pagos y los workflows."""
    from soporte import acciones, herramientas, workflows
    return SimpleNamespace(leer=herramientas.ejecutar, reservar=acciones.reservar, decidir=acciones.decidir,
                           ejecutar=acciones.ejecutar_reembolso, estado=workflows.estado_pedido,
                           direccion=workflows.cambiar_direccion)
