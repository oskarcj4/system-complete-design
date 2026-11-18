"""Cambia cómo se porta el proveedor de pagos y muestra lo que cobró. Solo contra el compose de esta guía.

    uv run python caos.py lento      reembolsa y tarda 6 s en responder: el agente corta a los 3 s y reintenta
    uv run python caos.py error      500 sin reembolsar
    uv run python caos.py caido      503 a todo
    uv run python caos.py normal
    uv run python caos.py cobros     los reembolsos que hizo el proveedor, por pedido
"""
import sys
from collections import Counter

import httpx

from soporte.config import CFG


def main() -> None:
    orden = sys.argv[1] if len(sys.argv) > 1 else "cobros"
    if orden in ("normal", "lento", "error", "caido"):
        r = httpx.post(f"{CFG.pagos}/admin/modo", json={"modo": orden}, timeout=5)
        r.raise_for_status()
        print(f"proveedor en modo {r.json()['actual']}")
        return
    if orden != "cobros":
        sys.exit(f"Orden desconocida: {orden}")
    cobros = httpx.get(f"{CFG.pagos}/v1/refunds", timeout=5).json()
    for c in cobros:
        print(f"{c['id']}  pedido {c['pedido_id']}  {c['monto_usd']} USD")
    repetidos = {p: n for p, n in Counter(c["pedido_id"] for c in cobros).items() if n > 1}
    print(f"{len(cobros)} reembolsos; pedidos con más de uno: {repetidos or 'ninguno'}")


if __name__ == "__main__":
    main()
