"""Las acciones con efecto: el reembolso y el cambio de dirección. Cada una deja su fila en acciones con una
clave antes del efecto; la misma clave viaja al proveedor como Idempotency-Key.

    reservar()  la política decide y, si no rechaza, anota la fila (esperando o aprobada): el monto queda reservado
    decidir()   una persona aprueba o rechaza lo que quedó esperando
    ejecutar_reembolso()  llama al proveedor con la clave; si no contesta, la fila queda pendiente
"""
import hashlib
import time
from datetime import datetime, timezone
from decimal import Decimal

import httpx
import psycopg
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

from soporte import herramientas, identidad, politica
from soporte.config import CFG


class ProponerReembolso(BaseModel):
    """Propone reembolsar un monto de un pedido del cliente. No reembolsa: la política, en código, decide si
    sale solo, si lo aprueba una persona o si se rechaza, y te devuelve qué pasó."""
    pedido_id: int
    monto_usd: str = Field(pattern=r"^\d{1,6}\.\d{2}$", description="Con dos decimales, por ejemplo 12.50")
    motivo: str = Field(max_length=200, description="Qué le pasó al cliente, resumido")


def reservar(ticket_id: int, cliente_id: int, clave: str, p: ProponerReembolso, hoy=None) -> politica.Decision:
    hoy = hoy or datetime.now(timezone.utc).date()
    pedido = herramientas.ver_pedido(cliente_id, p.pedido_id)          # con la RLS de la sesión
    with psycopg.connect(CFG.db_app) as g:                              # una transacción
        # Dos tickets del mismo pedido se evalúan en fila: sin esto, los dos ven el mismo saldo y reservan.
        g.execute("SELECT pg_advisory_xact_lock(%s)", (p.pedido_id,))
        previa = g.execute("SELECT estado FROM acciones WHERE clave = %s", (clave,)).fetchone()
        if previa is not None:                                          # el nodo se repitió: misma decisión
            antes = {"esperando": "aprobar", "rechazada": "rechazar"}.get(previa[0], "automatico")
            return politica.Decision(antes, "ya registrada")
        reservado = g.execute("SELECT coalesce(sum(monto_usd), 0) FROM acciones WHERE pedido_id = %s "
                              "AND tipo = 'reembolso' AND estado <> 'rechazada'", (p.pedido_id,)).fetchone()[0]
        antes = pedido["reembolsado_antes"] if pedido else Decimal(0)
        d = politica.evaluar(pedido, antes + reservado, Decimal(p.monto_usd), hoy, CFG.umbral_usd, CFG.dias_reembolso)
        if d.resultado != "rechazar":
            solo = d.resultado == "automatico"
            g.execute("INSERT INTO acciones (clave, ticket_id, tipo, pedido_id, monto_usd, args, estado, aprobado_por) "
                      "VALUES (%s, %s, 'reembolso', %s, %s, %s, %s, %s)",
                      (clave, ticket_id, p.pedido_id, Decimal(p.monto_usd), Jsonb(p.model_dump()),
                       "aprobada" if solo else "esperando", "politica" if solo else None))
    return d


def decidir(clave: str, aprobada: bool, quien: str, nota: str = "") -> str:
    """Devuelve cómo quedó la acción. Solo cambia si estaba esperando: decidir dos veces no la cambia."""
    with psycopg.connect(CFG.db_app, autocommit=True) as g:
        g.execute("UPDATE acciones SET estado = %s, aprobado_por = %s, nota = %s, cambiada_en = now() "
                  "WHERE clave = %s AND estado = 'esperando'",
                  ("aprobada" if aprobada else "rechazada", quien, nota, clave))
        return g.execute("SELECT estado FROM acciones WHERE clave = %s", (clave,)).fetchone()[0]


def llamar_proveedor(cuerpo: dict, clave: str, intentos: int = 4, plazo: float = 3.0) -> dict | None:
    """POST /v1/refunds con la misma clave en cada intento. None si no hubo respuesta clara."""
    for i in range(intentos):
        try:
            r = httpx.post(f"{CFG.pagos}/v1/refunds", json=cuerpo, headers={"Idempotency-Key": clave}, timeout=plazo)
            if r.status_code == 201:
                return r.json() | {"repetida": r.headers.get("Idempotent-Replayed") == "true"}
            if r.status_code in (400, 422):
                raise ValueError(f"El proveedor rechazó el pedido: {r.status_code} {r.text}")   # un bug, no se reintenta
            # 409 (en curso), 500 o 503: se espera y se reintenta con la misma clave.
        except httpx.TransportError:                     # timeout o conexión: no sabemos si se hizo
            pass
        time.sleep(0.5 * 2 ** i)                         # 0.5, 1, 2 y 4 s
    return None


def ejecutar_reembolso(clave: str) -> dict:
    with psycopg.connect(CFG.db_app, autocommit=True) as g:
        pedido_id, monto, args, estado, resultado = g.execute(
            "SELECT pedido_id, monto_usd, args, estado, resultado FROM acciones WHERE clave = %s", (clave,)).fetchone()
        if estado == "hecha":
            return resultado | {"repetida": True}
        if estado not in ("aprobada", "pendiente"):
            raise ValueError(f"La acción {clave} está {estado}: no se ejecuta")
        cuerpo = {"pedido_id": pedido_id, "monto_usd": f"{monto:.2f}", "motivo": args["motivo"]}
        respuesta = llamar_proveedor(cuerpo, clave)
        if respuesta is None:
            g.execute("UPDATE acciones SET estado = 'pendiente', cambiada_en = now() WHERE clave = %s", (clave,))
            return {"estado": "pendiente"}
        g.execute("UPDATE acciones SET estado = 'hecha', resultado = %s, cambiada_en = now() WHERE clave = %s",
                  (Jsonb(respuesta), clave))
    return respuesta


def cambiar_direccion(ticket_id: int, cliente_id: int, pedido_id: int, direccion: str) -> str:
    huella = hashlib.sha256(direccion.encode()).hexdigest()[:12]
    clave = f"direccion:{ticket_id}:{pedido_id}:{huella}"
    with psycopg.connect(CFG.db_app, autocommit=True) as g:
        nueva = g.execute("INSERT INTO acciones (clave, ticket_id, tipo, pedido_id, args, estado, aprobado_por) "
                          "VALUES (%s, %s, 'direccion', %s, %s, 'aprobada', 'workflow') "
                          "ON CONFLICT (clave) DO NOTHING RETURNING clave",
                          (clave, ticket_id, pedido_id, Jsonb({"direccion": direccion}))).fetchone()
        if nueva is None:
            previo = g.execute("SELECT resultado FROM acciones WHERE clave = %s", (clave,)).fetchone()[0]
            if previo is not None:
                return previo["texto"]
        with identidad.actor(cliente_id) as c:
            # La base vuelve a mirar dueño y estado (la política direccion de init.sql): 0 filas si no se puede.
            n = c.execute("UPDATE pedidos SET direccion = %s WHERE id = %s", (direccion, pedido_id)).rowcount
        texto = (f"Listo: el pedido {pedido_id} va a {direccion}." if n
                 else f"No pude cambiar el pedido {pedido_id}: ya salió o no es tuyo.")
        g.execute("UPDATE acciones SET estado = %s, resultado = %s, cambiada_en = now() WHERE clave = %s",
                  ("hecha" if n else "rechazada", Jsonb({"texto": texto}), clave))
    return texto
