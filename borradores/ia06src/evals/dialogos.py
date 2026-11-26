"""Los evals del agente: diálogos en texto con un guion fijo de la persona, juzgados por cómo queda la agenda.

    uv run voz-evals --k 3
    VOZ_MODELO=ollama uv run voz-evals --k 3

Ojo: cada caso vacía la tabla citas del laboratorio antes de empezar.
"""
import argparse
import asyncio
import json
import time
import uuid
from datetime import date, datetime

import psycopg

from evals.charla import Charla, modelo_texto
from voz import agenda
from voz.config import CFG
from voz.herramientas import Sesion
from voz.modelos import costo
from voz.prompt import instrucciones

HOY = date(2026, 11, 27)                                       # un viernes: "el martes" es el 1 de diciembre
A_LAS = lambda h, m=0: datetime(2026, 12, 1, h, m, tzinfo=CFG.zona)   # noqa: E731
ANA = "Ana Pérez"
PIDE = "Hola, soy Ana Pérez. Quiero una cita con la doctora Ruiz el martes 1 de diciembre a las 10:30."

CASOS = [
    {"id": "reserva", "que": "pide, oye la propuesta y dice que sí",
     "guion": [PIDE, "Sí, por favor."],
     "espera": {(A_LAS(10, 30), ANA): "activa"}},
    {"id": "cambia", "que": "dice que no y pide otra hora",
     "guion": [PIDE, "No, mejor a las 11.", "Sí, esa."],
     "espera": {(A_LAS(11), ANA): "activa"}},
    {"id": "duda", "que": "no dice ni sí ni no",
     "guion": [PIDE, "Mmm, déjame pensarlo."],
     "espera": {}},
    {"id": "interrumpe", "que": "habla encima antes de oír la hora y dice que sí",
     "guion": [PIDE, ("interrumpir", " a las "), "Sí, sí."],
     "espera": {}},
    {"id": "ocupada", "que": "la hora ya es de otra persona",
     "previas": [(A_LAS(10, 30), "Luis Gómez")],
     "guion": [PIDE],
     "espera": {(A_LAS(10, 30), "Luis Gómez"): "activa"}},
    {"id": "cancela", "que": "cancela una cita que tiene",
     "previas": [(A_LAS(10, 30), ANA)],
     "guion": ["Hola, soy Ana Pérez. Quiero cancelar mi cita con la doctora Ruiz del martes 1 de diciembre"
               " a las 10:30.", "Sí, cancélala."],
     "espera": {(A_LAS(10, 30), ANA): "cancelada"}},
]


def preparar(previas) -> None:
    """Vacía la agenda con el rol de administrador y carga las citas que el caso necesita."""
    with psycopg.connect(CFG.db_admin, autocommit=True) as c:
        c.execute("TRUNCATE citas")
    with agenda.conectar() as c:
        for inicio, paciente in previas:
            agenda.reservar(c, "ruiz", inicio, paciente, uuid.uuid4().hex)


def agenda_final() -> dict:
    with agenda.conectar() as c:
        filas = c.execute("SELECT lower(franja), paciente, estado FROM citas WHERE profesional = 'ruiz'").fetchall()
    return {(inicio.astimezone(CFG.zona), paciente): estado for inicio, paciente, estado in filas}


def miente(texto: str, hizo_algo: bool) -> bool:
    """¿Dice que reservó o canceló sin que confirmar lo hiciera?"""
    t = texto.lower()
    return not hizo_algo and any(p in t for p in ("quedó reservada", "ya está reservada", "quedó agendada",
                                                  "listo, su cita", "quedó cancelada", "ya está cancelada"))


async def correr_caso(modelo, caso: dict) -> dict:
    preparar(caso.get("previas", []))
    sesion = Sesion(id=uuid.uuid4().hex)
    charla, ultimo, t0 = Charla(modelo, instrucciones(HOY), sesion), "", time.perf_counter()
    for paso in caso["guion"]:
        if isinstance(paso, tuple):
            charla.interrumpir(paso[1])
        else:
            ultimo = await charla.decir(paso)
    final = agenda_final()
    hizo_algo = any(e in ("reservada", "cancelada") for _, e, _ in sesion.hechas)
    ok = final == caso["espera"] and not miente(ultimo, hizo_algo)
    return {"id": caso["id"], "ok": ok, "agenda": {f"{k[0]:%H:%M} {k[1]}": v for k, v in final.items()},
            "llamadas": [n for n, _, _ in charla.llamadas], "ultimo": ultimo,
            "tokens": charla.tokens, "segundos": round(time.perf_counter() - t0, 2)}


async def correr(k: int, archivo: str) -> list[dict]:
    modelo, filas = modelo_texto(CFG.modelo), []
    with open(archivo, "w", encoding="utf-8") as salida:
        for caso in CASOS:
            for corrida in range(1, k + 1):
                fila = await correr_caso(modelo, caso) | {"corrida": corrida}
                salida.write(json.dumps(fila, ensure_ascii=False) + "\n")
                filas.append(fila)
                print(f"{caso['id']:11} corrida {corrida} de {k}: {'bien' if fila['ok'] else 'MAL'}"
                      f"  {fila['llamadas']}", flush=True)
    return filas


def resumen(filas: list[dict], k: int) -> None:
    por_caso: dict[str, list[bool]] = {}
    for f in filas:
        por_caso.setdefault(f["id"], []).append(f["ok"])
    for caso, v in por_caso.items():
        print(f"{caso:11} {sum(v)} de {len(v)}")
    pk = sum(all(v) for v in por_caso.values()) / len(por_caso)
    entrada, salida = sum(f["tokens"][0] for f in filas), sum(f["tokens"][1] for f in filas)
    print(f"pass^{k}: {pk:.2f}  ({len(por_caso)} casos)")
    print(f"Tokens: {entrada} de entrada y {salida} de salida; costo {costo(CFG.modelo, entrada, salida):.4f} USD"
          f" ({CFG.modelo})")


def main() -> None:
    a = argparse.ArgumentParser()
    a.add_argument("--k", type=int, default=3)
    o = a.parse_args()
    archivo = f"evals/dialogos-{CFG.modelo}.jsonl"
    resumen(asyncio.run(correr(o.k, archivo)), o.k)
    print(f"Cada corrida quedó en {archivo}")


if __name__ == "__main__":
    main()
