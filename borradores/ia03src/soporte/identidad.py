"""Quién es el cliente lo dice la sesión, nunca el modelo. Este archivo lleva ese id hasta la base.

El id sale del estado del grafo (lo puso la API con la cabecera de la sesión) y llega a PostgreSQL con
SET LOCAL dentro de una transacción. La RLS de init.sql filtra con él. Las herramientas no tienen un
argumento cliente_id que el modelo pueda llenar.
"""
from collections.abc import Iterator
from contextlib import contextmanager

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from soporte.config import CFG

_pools: dict[str, ConnectionPool] = {}


def _pool(url: str) -> ConnectionPool:
    if url not in _pools:
        _pools[url] = ConnectionPool(url, min_size=1, max_size=2, open=True,
                                     kwargs={"row_factory": dict_row})
    return _pools[url]


@contextmanager
def _como_cliente(url: str, cliente_id: int) -> Iterator[Connection]:
    if not isinstance(cliente_id, int) or cliente_id <= 0:
        raise PermissionError("Sin cliente de sesión no se consulta nada")
    with _pool(url).connection() as c, c.transaction():
        # SET LOCAL vive hasta el final de esta transacción. Con SET a secas, la conexión volvería al pool
        # con el cliente puesto, y la próxima consulta de otro ticket vería los pedidos de este.
        c.execute("SELECT set_config('app.cliente_id', %s, true)", (str(cliente_id),))
        yield c


def lector(cliente_id: int):
    return _como_cliente(CFG.db_lector, cliente_id)


def actor(cliente_id: int):
    return _como_cliente(CFG.db_actor, cliente_id)
