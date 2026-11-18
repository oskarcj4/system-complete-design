"""Un modelo con guion y unos servicios en memoria: el grafo corre entero sin red, sin bases y sin tokens.

Los servicios falsos usan la política de verdad (soporte.politica): lo que se prueba es el grafo y la política
juntos, con la tienda de semilla.py en un diccionario.
"""
import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from langchain_core.messages import AIMessage

from soporte import politica
from soporte.clasificar import Clasificacion

USO = {"input_tokens": 1000, "output_tokens": 50, "total_tokens": 1050}
HOY = date(2026, 3, 10)


def clase(intencion: str, confianza: float = 0.95, pedido: int | None = None, direccion: str | None = None):
    return Clasificacion(intencion=intencion, confianza=confianza, pedido_mencionado=pedido, direccion_nueva=direccion)


def llamada(nombre: str, args: dict, id_: str) -> AIMessage:
    return AIMessage("", tool_calls=[{"name": nombre, "args": args, "id": id_}], usage_metadata=USO)


def final(texto: str) -> AIMessage:
    return AIMessage(texto, usage_metadata=USO)


class ModeloFalso:
    """Devuelve, en orden, las respuestas del guion. Clasificar tiene su propio guion."""

    def __init__(self, guion: list[AIMessage], clases: list[Clasificacion]):
        self.guion, self.clases = list(guion), list(clases)
        self.vistos = []                       # lo que vio el agente en cada llamada
        self.vistos_clasificar = []

    def bind_tools(self, herramientas):
        return _ConHerramientas(self)

    def with_structured_output(self, esquema, **opciones):
        return _Estructurado(self)


class _ConHerramientas:
    def __init__(self, modelo):
        self.modelo = modelo

    def invoke(self, mensajes):
        self.modelo.vistos.append(list(mensajes))
        if not self.modelo.guion:
            raise AssertionError("El guion se acabó: el grafo llamó al agente más veces de las esperadas")
        return self.modelo.guion.pop(0)


class _Estructurado:
    def __init__(self, modelo):
        self.modelo = modelo

    def invoke(self, mensajes):
        self.modelo.vistos_clasificar.append(mensajes[-1].content)
        if not self.modelo.clases:
            raise AssertionError("Se acabaron las clasificaciones del guion")
        return {"raw": AIMessage("", usage_metadata=USO), "parsed": self.modelo.clases.pop(0), "parsing_error": None}


def entregado_hace(dias: int) -> datetime:
    return datetime.combine(HOY - timedelta(days=dias), datetime.min.time(), tzinfo=timezone.utc)


PEDIDOS = {
    1002: {"id": 1002, "cliente_id": 1, "estado": "entregado", "entregado_en": entregado_hace(3), "total_usd": Decimal("12.50")},
    1043: {"id": 1043, "cliente_id": 1, "estado": "entregado", "entregado_en": entregado_hace(10), "total_usd": Decimal("80.00")},
    1012: {"id": 1012, "cliente_id": 2, "estado": "pagado", "entregado_en": None, "total_usd": Decimal("30.00")},
    1031: {"id": 1031, "cliente_id": 4, "estado": "entregado", "entregado_en": entregado_hace(7), "total_usd": Decimal("35.00")},
}


class Servicios:
    """La base, el proveedor y los workflows, en memoria. Guarda qué se llamó y con qué cliente."""

    def __init__(self):
        self.acciones, self.cobros, self.leidos, self.direcciones = {}, [], [], []

    def _pedido(self, cliente_id: int, pedido_id: int):
        p = PEDIDOS.get(pedido_id)
        return p if p and p["cliente_id"] == cliente_id else None       # lo que haría la RLS

    def leer(self, nombre: str, args: dict, cliente_id: int) -> str:
        self.leidos.append((nombre, cliente_id))
        if nombre == "VerPedido":
            return json.dumps(self._pedido(cliente_id, args["pedido_id"]) or "No encuentro ese pedido.", default=str)
        if nombre == "VerPedidos":
            return json.dumps([p for p in PEDIDOS.values() if p["cliente_id"] == cliente_id], default=str)
        return json.dumps([{"seccion": "Plazo", "texto": "Hasta 30 días después de la entrega."}])

    def reservar(self, ticket_id, cliente_id, clave, p):
        if clave in self.acciones:
            return politica.Decision("automatico", "ya registrada")
        reservado = sum((a["monto"] for a in self.acciones.values()
                         if a["pedido_id"] == p.pedido_id and a["estado"] != "rechazada"), Decimal(0))
        d = politica.evaluar(self._pedido(cliente_id, p.pedido_id), reservado, Decimal(p.monto_usd), HOY)
        if d.resultado != "rechazar":
            self.acciones[clave] = {"pedido_id": p.pedido_id, "monto": Decimal(p.monto_usd), "quien": None,
                                    "estado": "aprobada" if d.resultado == "automatico" else "esperando"}
        return d

    def decidir(self, clave, aprobada, quien, nota=""):
        a = self.acciones[clave]
        if a["estado"] == "esperando":
            a["estado"], a["quien"] = ("aprobada" if aprobada else "rechazada"), quien
        return a["estado"]

    def ejecutar(self, clave):
        a = self.acciones[clave]
        if a["estado"] == "hecha":
            return {"repetida": True}
        self.cobros.append(clave)
        a["estado"] = "hecha"
        return {"id": f"re_falso_{len(self.cobros)}", "estado": "hecho"}

    def estado(self, cliente_id, pedido_id):
        return f"El pedido {pedido_id} va en camino."

    def direccion(self, ticket_id, cliente_id, pedido_id, direccion):
        self.direcciones.append((cliente_id, pedido_id, direccion))
        return f"Listo: el pedido {pedido_id} va a {direccion}."
