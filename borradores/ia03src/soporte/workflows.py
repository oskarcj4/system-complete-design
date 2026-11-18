"""Los workflows: pasos fijos, sin modelo. Mismo pedido, misma respuesta, cada vez, y sin tokens."""
from soporte import acciones, herramientas

ESTADOS = {"pagado": "lo estamos preparando; todavía puedes cambiar la dirección",
           "enviado": "va en camino", "entregado": "ya se entregó"}


def estado_pedido(cliente_id: int, pedido_id: int | None) -> str:
    if pedido_id is None:
        pedidos = herramientas.ver_pedidos(cliente_id)[:3]
        if not pedidos:
            return "No veo pedidos en tu cuenta."
        lineas = [f"- {p['id']} ({p['productos']}): {ESTADOS[p['estado']]}" for p in pedidos]
        return "Tus últimos pedidos:\n" + "\n".join(lineas)
    p = herramientas.ver_pedido(cliente_id, pedido_id)
    if p is None:
        return f"No encuentro el pedido {pedido_id} entre los tuyos. ¿Puedes revisar el número?"
    texto = f"El pedido {p['id']} {ESTADOS[p['estado']]}"
    if p["entregado_en"] is not None:
        texto += f", el {p['entregado_en']:%d/%m/%Y}"
    return texto + "."


def cambiar_direccion(ticket_id: int, cliente_id: int, pedido_id: int, direccion: str) -> str:
    p = herramientas.ver_pedido(cliente_id, pedido_id)
    if p is None:
        return f"No encuentro el pedido {pedido_id} entre los tuyos."
    if p["estado"] != "pagado":
        # La base también lo impide; aquí se rechaza antes, con un mensaje claro y sin anotar una acción.
        return f"El pedido {pedido_id} ya salió: no se puede cambiar la dirección."
    return acciones.cambiar_direccion(ticket_id, cliente_id, pedido_id, direccion.strip()[:200])
