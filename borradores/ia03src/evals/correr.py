"""Corre cada persona k veces contra el soporte de verdad (base, proveedor y modelo) y calcula pass^k.

    uv run python evals/correr.py                       10 personas, k = 4, con SOPORTE_MODELO
    uv run python evals/correr.py --k 2 --solo ana-chico
    uv run python evals/correr.py --limpiar             borra los tickets, mensajes y acciones del laboratorio

El cliente lo hace otro modelo: SOPORTE_SIMULADOR (claude por defecto). Su costo no entra en el del ticket.
"""
import argparse
import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from personas import PERSONAS                          # noqa: E402
from simulador import FIN, siguiente                   # noqa: E402

from soporte import tickets                            # noqa: E402
from soporte.config import CFG                         # noqa: E402
from soporte.modelos import modelo_chat                # noqa: E402

MAX_TURNOS = 6


def limpiar() -> None:
    with psycopg.connect(CFG.db_app) as g:
        # Sin RESTART IDENTITY: los checkpoints viejos son del hilo ticket-N, y los tickets nuevos no los pisan.
        g.execute("TRUNCATE acciones, mensajes, tickets")
    print("tickets, mensajes y acciones borrados")


def leer(ticket: int) -> tuple[list[tuple], set[str], Decimal]:
    with psycopg.connect(CFG.db_app) as g:
        filas = g.execute("SELECT tipo, pedido_id, monto_usd, estado FROM acciones WHERE ticket_id = %s "
                          "ORDER BY creada_en", (ticket,)).fetchall()
        caminos = {c for (c,) in g.execute("SELECT camino FROM mensajes WHERE ticket_id = %s AND camino IS NOT NULL",
                                           (ticket,))}
        costo = g.execute("SELECT costo_usd FROM tickets WHERE id = %s", (ticket,)).fetchone()[0]
        # Cada intento empieza sin reservas: si no, el segundo ana-termo vería los 80.00 del primero.
        g.execute("DELETE FROM acciones WHERE ticket_id = %s", (ticket,))
    return [(t, p, None if m is None else f"{m:.2f}", e) for t, p, m, e in filas], caminos, costo


def una_vez(grafo, simulador, persona: dict) -> dict:
    ticket = tickets.crear(persona["cliente"], "eval", CFG.modelo)
    conversacion, inicio = [], time.monotonic()
    for _ in range(MAX_TURNOS):
        texto = siguiente(simulador, persona["objetivo"], conversacion)
        if not texto or FIN in texto:
            break
        conversacion.append(("cliente", texto))
        r = tickets.atender(grafo, ticket, persona["cliente"], texto)
        conversacion.append(("agente", r["respuesta"]))
        if r["estado"] == "esperando_aprobacion":            # el cliente ya no puede escribir: se juzga aquí
            break
    obtenido, caminos, costo = leer(ticket)
    ok = obtenido == list(persona["esperado"]) and ("camino" not in persona or persona["camino"] in caminos)
    return {"ticket": ticket, "ok": ok, "obtenido": obtenido, "caminos": sorted(caminos), "costo_usd": str(costo),
            "segundos": round(time.monotonic() - inicio, 1), "conversacion": conversacion}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--k", type=int, default=4)
    p.add_argument("--solo", nargs="*")
    p.add_argument("--limpiar", action="store_true")
    a = p.parse_args()
    if a.limpiar:
        return limpiar()
    personas = [x for x in PERSONAS if not a.solo or x["id"] in a.solo]
    simulador = modelo_chat(os.environ.get("SOPORTE_SIMULADOR", "claude"))
    resultados = {}
    with tickets.abrir(CFG.modelo) as grafo:
        for persona in personas:
            intentos = [una_vez(grafo, simulador, persona) for _ in range(a.k)]
            resultados[persona["id"]] = intentos
            marcas = "".join("✓" if i["ok"] else "✗" for i in intentos)
            print(f"{persona['id']:<16} {marcas}  {sum(i['ok'] for i in intentos)}/{a.k}  "
                  f"último: {intentos[-1]['obtenido'] or 'sin acciones'}")
    todos = [i for v in resultados.values() for i in v]
    pasa_k = sum(all(i["ok"] for i in v) for v in resultados.values())
    costo = sum(Decimal(i["costo_usd"]) for i in todos)
    print(f"\n{CFG.modelo}: pass^{a.k} = {pasa_k}/{len(resultados)}; aciertos sueltos {sum(i['ok'] for i in todos)}/{len(todos)}")
    print(f"costo del soporte {costo:.4f} USD en {len(todos)} conversaciones; "
          f"{sum(i['segundos'] for i in todos) / len(todos):.1f} s por conversación")
    salida = Path(__file__).resolve().parent / f"resultados-{CFG.modelo}.json"
    salida.write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"detalle en {salida}")


if __name__ == "__main__":
    main()
