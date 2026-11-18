"""La línea de comandos: lo mismo que la API, sin servidor.

    soporte nuevo --cliente 1                              abre un ticket
    soporte escribir 7 "llegó roto el termo" --cliente 1    un mensaje del cliente en el ticket 7
    soporte aprobaciones                                   lo que espera a una persona
    soporte decidir CLAVE aprobar --quien marta [--nota]   aprueba o rechaza, y el agente responde
    soporte reintentar                                     vuelve a llamar al proveedor por lo pendiente
    soporte ver 7                                          los mensajes y las acciones de un ticket

El modelo sale de SOPORTE_MODELO (claude u ollama), o de --modelo.
"""
import argparse
import json

import psycopg
from psycopg.rows import dict_row

from soporte import acciones, tickets, trazas
from soporte.config import CFG


def mostrar(r: dict) -> None:
    print(f"[{r['camino']}] {r['respuesta']}")
    print(f"  pasos {r['pasos']}, tokens {r['tokens']['entrada']} de entrada y {r['tokens']['salida']} de salida")
    if r["estado"] == "esperando_aprobacion":
        print("  Espera una persona: soporte aprobaciones")


def ver(ticket_id: int) -> None:
    with psycopg.connect(CFG.db_app, row_factory=dict_row) as g:
        for m in g.execute("SELECT autor, texto, camino FROM mensajes WHERE ticket_id = %s ORDER BY id", (ticket_id,)):
            print(f"{m['autor']:>8}{' [' + m['camino'] + ']' if m['camino'] else ''}: {m['texto']}")
        for a in g.execute("SELECT clave, tipo, pedido_id, monto_usd, estado, aprobado_por, resultado "
                           "FROM acciones WHERE ticket_id = %s ORDER BY creada_en", (ticket_id,)):
            print(f"  acción {a['tipo']} {a['pedido_id']} {a['monto_usd'] or ''} {a['estado']} "
                  f"({a['aprobado_por'] or 'sin decidir'}) {json.dumps(a['resultado'], ensure_ascii=False)}")


def reintentar() -> None:
    with psycopg.connect(CFG.db_app) as g:
        claves = [c for (c,) in g.execute("SELECT clave FROM acciones WHERE estado = 'pendiente' ORDER BY creada_en")]
    for clave in claves:
        print(clave, acciones.ejecutar_reembolso(clave))     # la misma clave: el proveedor no cobra dos veces
    print(f"{len(claves)} pendientes revisadas")


def main() -> None:
    p = argparse.ArgumentParser(prog="soporte")
    p.add_argument("--modelo", default=CFG.modelo, choices=["claude", "ollama"])
    sub = p.add_subparsers(dest="orden", required=True)
    n = sub.add_parser("nuevo")
    n.add_argument("--cliente", type=int, required=True)
    e = sub.add_parser("escribir")
    e.add_argument("ticket", type=int)
    e.add_argument("texto")
    e.add_argument("--cliente", type=int, required=True)
    sub.add_parser("aprobaciones")
    d = sub.add_parser("decidir")
    d.add_argument("clave")
    d.add_argument("decision", choices=["aprobar", "rechazar"])
    d.add_argument("--quien", required=True)
    d.add_argument("--nota", default="")
    sub.add_parser("reintentar")
    v = sub.add_parser("ver")
    v.add_argument("ticket", type=int)
    a = p.parse_args()

    if a.orden == "nuevo":
        print(f"ticket {tickets.crear(a.cliente, 'cli', a.modelo)}")
    elif a.orden == "aprobaciones":
        for f in tickets.esperando():
            print(f"{f['clave']}  ticket {f['ticket_id']}  pedido {f['pedido_id']}  {f['monto_usd']} USD  {f['motivo']}")
    elif a.orden == "reintentar":
        reintentar()
    elif a.orden == "ver":
        ver(a.ticket)
    else:
        trazas.activar()
        with tickets.abrir(a.modelo) as grafo:
            if a.orden == "escribir":
                mostrar(tickets.atender(grafo, a.ticket, a.cliente, a.texto))
            else:
                mostrar(tickets.resolver(grafo, a.clave, a.decision == "aprobar", a.quien, a.nota))
