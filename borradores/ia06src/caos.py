"""Provoca las dos fallas que la base tiene que aguantar sola, sin el modelo y sin audio.

    uv run python caos.py carrera     # dos personas confirman la misma hora en el mismo instante
    uv run python caos.py repetir     # la misma confirmación llega dos veces, como un reintento
    uv run python caos.py vaciar      # borra todas las citas del laboratorio
"""
import sys
import threading
import uuid
from datetime import datetime

import psycopg

from voz import agenda
from voz.config import CFG

INICIO = datetime(2026, 12, 1, 12, 0, tzinfo=CFG.zona)


def carrera() -> None:
    barrera, resultados = threading.Barrier(2), {}

    def confirmar(paciente: str) -> None:
        with agenda.conectar() as c:
            barrera.wait()                  # las dos salen juntas
            resultados[paciente] = agenda.reservar(c, "ruiz", INICIO, paciente, uuid.uuid4().hex)

    hilos = [threading.Thread(target=confirmar, args=(p,)) for p in ("Ana Pérez", "Luis Gómez")]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()
    for paciente, r in resultados.items():
        print(f"{paciente:11} -> {r.estado} {r.cita_id or ''}")


def repetir() -> None:
    clave = uuid.uuid4().hex
    with agenda.conectar() as c:
        primera = agenda.reservar(c, "paz", INICIO, "Ana Pérez", clave)
        segunda = agenda.reservar(c, "paz", INICIO, "Ana Pérez", clave)
    print(f"primera -> {primera.estado} {primera.cita_id}")
    print(f"segunda -> {segunda.estado} {segunda.cita_id}")


def vaciar() -> None:
    with psycopg.connect(CFG.db_admin, autocommit=True) as c:
        c.execute("TRUNCATE citas")
    print("Agenda vacía.")


if __name__ == "__main__":
    {"carrera": carrera, "repetir": repetir, "vaciar": vaciar}[sys.argv[1]]()
