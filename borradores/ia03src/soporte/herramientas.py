"""Las herramientas de lectura. Lo que ve el modelo son los esquemas; lo que corre son las funciones de abajo,
que reciben el cliente de la sesión aparte: el modelo no tiene cómo pasar otro.
"""
import json

import psycopg
from pgvector.psycopg import register_vector
from pydantic import BaseModel, Field

from soporte import identidad
from soporte.config import CFG
from soporte.modelos import embeddings


class VerPedidos(BaseModel):
    """Lista los pedidos del cliente de este ticket, del más nuevo al más viejo, con estado y total."""


class VerPedido(BaseModel):
    """Un pedido del cliente con sus productos, fechas y lo ya reembolsado. Si no es suyo, no aparece."""
    pedido_id: int = Field(description="El número de pedido, por ejemplo 1043")


class BuscarPolitica(BaseModel):
    """Busca en las políticas de la tienda (reembolsos, envíos y cambios) los tres párrafos más cercanos."""
    pregunta: str = Field(description="Qué quieres saber, en una frase")


def ver_pedidos(cliente_id: int) -> list[dict]:
    with identidad.lector(cliente_id) as c:
        return c.execute("SELECT id, estado, creado_en::date AS fecha, total_usd, "
                         "(SELECT string_agg(producto, ', ') FROM lineas l WHERE l.pedido_id = p.id) AS productos "
                         "FROM pedidos p ORDER BY creado_en DESC LIMIT 20").fetchall()


def ver_pedido(cliente_id: int, pedido_id: int) -> dict | None:
    with identidad.lector(cliente_id) as c:
        pedido = c.execute("SELECT id, estado, creado_en, entregado_en, total_usd, direccion FROM pedidos "
                           "WHERE id = %s", (pedido_id,)).fetchone()
        if pedido is None:
            return None
        pedido["lineas"] = c.execute("SELECT producto, cantidad, precio_usd FROM lineas WHERE pedido_id = %s",
                                     (pedido_id,)).fetchall()
        pedido["reembolsado_antes"] = c.execute("SELECT coalesce(sum(monto_usd), 0) AS s FROM reembolsos "
                                                "WHERE pedido_id = %s", (pedido_id,)).fetchone()["s"]
    return pedido


def buscar_politica(pregunta: str) -> list[dict]:
    # nomic-embed-text pide un prefijo por tarea: search_document al indexar, search_query al buscar.
    vector = embeddings().embed_query(f"search_query: {pregunta}")
    with psycopg.connect(CFG.db_app) as c:
        register_vector(c)
        filas = c.execute("SELECT archivo, seccion, texto FROM politicas "
                          "ORDER BY embedding <=> %s::vector LIMIT 3", (vector,)).fetchall()
    return [{"archivo": a, "seccion": s, "texto": t} for a, s, t in filas]


LECTURA = {"VerPedidos": VerPedidos, "VerPedido": VerPedido, "BuscarPolitica": BuscarPolitica}


def ejecutar(nombre: str, args: dict, cliente_id: int) -> str:
    """Corre una herramienta de lectura con el cliente de la sesión. Devuelve texto para el modelo."""
    a = LECTURA[nombre].model_validate(args)          # el modelo pudo mandar argumentos inválidos
    if nombre == "VerPedidos":
        r = ver_pedidos(cliente_id)
    elif nombre == "VerPedido":
        r = ver_pedido(cliente_id, a.pedido_id) or "No encuentro ese pedido entre los del cliente."
    else:
        r = buscar_politica(a.pregunta)
    return json.dumps(r, ensure_ascii=False, default=str)
