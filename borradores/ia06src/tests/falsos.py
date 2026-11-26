"""Dobles para probar sin base y sin modelo: una agenda en memoria y un modelo que responde con un guion."""
import itertools

from langchain_core.messages import AIMessage

from voz import agenda
from voz.fechas import franjas_del_dia


class AgendaFalsa:
    """Lo mismo que hace agenda.py, sobre un dict. Reemplaza a herramientas._con_db en las pruebas."""

    def __init__(self, zona):
        self.zona, self.citas, self.ids = zona, {}, itertools.count(1)   # id -> [prof, inicio, paciente, estado, clave]

    async def __call__(self, fn, *args):
        return getattr(self, fn.__name__)(*args)

    def disponibles(self, profesional, dia):
        tomadas = {c[1] for c in self.citas.values() if c[0] == profesional and c[3] == "activa"}
        return [f for f in franjas_del_dia(dia, self.zona) if f not in tomadas]

    def reservar(self, profesional, inicio, paciente, clave):
        for i, c in self.citas.items():
            if c[4] == clave:
                return agenda.Resultado("repetida", i)
        if inicio not in self.disponibles(profesional, inicio.date()):
            return agenda.Resultado("ocupada")
        i = next(self.ids)
        self.citas[i] = [profesional, inicio, paciente, "activa", clave]
        return agenda.Resultado("reservada", i)

    def buscar(self, profesional, inicio, paciente):
        return next((i for i, c in self.citas.items() if c[:3] == [profesional, inicio, paciente]
                     and c[3] == "activa"), None)

    def cancelar(self, cita_id):
        if cita_id not in self.citas:
            return agenda.Resultado("no_existe")
        if self.citas[cita_id][3] == "cancelada":
            return agenda.Resultado("repetida", cita_id)
        self.citas[cita_id][3] = "cancelada"
        return agenda.Resultado("cancelada", cita_id)


class ModeloFalso:
    """Cada ainvoke devuelve el siguiente mensaje del guion. Un elemento del guion es un texto o una lista de
    llamadas (nombre, argumentos)."""

    def __init__(self, guion):
        self.guion, self.vistos = list(guion), []

    async def ainvoke(self, mensajes):
        self.vistos.append(list(mensajes))
        assert self.guion, "El guion se terminó y el código volvió a llamar al modelo."
        paso = self.guion.pop(0)
        if isinstance(paso, str):
            return AIMessage(paso, usage_metadata={"input_tokens": 100, "output_tokens": 10, "total_tokens": 110})
        llamadas = [{"name": n, "args": a, "id": f"t{i}", "type": "tool_call"} for i, (n, a) in enumerate(paso)]
        return AIMessage("", tool_calls=llamadas,
                         usage_metadata={"input_tokens": 100, "output_tokens": 10, "total_tokens": 110})
