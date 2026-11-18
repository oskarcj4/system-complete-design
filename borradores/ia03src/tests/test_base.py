"""Contra la base del compose, con semilla.py cargada: la RLS, los roles y el candado. Se salta sin base."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import psycopg
import pytest

from soporte import acciones, identidad, tickets
from soporte.acciones import ProponerReembolso
from soporte.config import CFG


@pytest.fixture(scope="module", autouse=True)
def base():
    try:
        psycopg.connect(CFG.db_app, connect_timeout=2).close()
    except psycopg.OperationalError:
        pytest.skip("La base no está levantada: docker compose up -d postgres y uv run python semilla.py")


def test_la_rls_solo_deja_ver_lo_propio():
    with identidad.lector(1) as c:                               # Ana
        ids = {r["id"] for r in c.execute("SELECT id FROM pedidos")}
        assert 1043 in ids and 1031 not in ids                  # el 1031 es de Diego
        assert c.execute("SELECT * FROM pedidos WHERE id = 1031").fetchone() is None


def test_el_lector_no_escribe():
    with pytest.raises(psycopg.errors.ReadOnlySqlTransaction):
        with identidad.lector(1) as c:
            c.execute("UPDATE pedidos SET direccion = 'x' WHERE id = 1043")


def test_el_actor_no_cambia_un_pedido_que_ya_salio():
    with identidad.actor(2) as c:                                # Bruno: el 1011 va en camino
        assert c.execute("UPDATE pedidos SET direccion = 'Otra 1' WHERE id = 1011").rowcount == 0


def test_sin_cliente_no_hay_consulta():
    with pytest.raises(PermissionError):
        with identidad.lector(0):
            pass


def test_dos_reembolsos_a_la_vez_no_pasan_el_total():
    # El 1043 vale 80.00. Dos tickets piden 60.00 al mismo tiempo: si los dos leyeran el saldo antes de que el
    # otro reserve, los dos pasarían. Con pg_advisory_xact_lock, el segundo espera y ve la reserva del primero.
    with psycopg.connect(CFG.db_app) as g:
        if g.execute("SELECT count(*) FROM acciones WHERE pedido_id = 1043 AND estado <> 'rechazada'").fetchone()[0]:
            pytest.skip("El 1043 ya tiene reembolsos reservados de tus pruebas: python evals/correr.py --limpiar")
    t1, t2 = tickets.crear(1, "eval"), tickets.crear(1, "eval")
    barrera = Barrier(2)

    def pedir(t: int):
        barrera.wait(timeout=5)
        p = ProponerReembolso(pedido_id=1043, monto_usd="60.00", motivo="prueba de carrera")
        return acciones.reservar(t, 1, f"reembolso:{t}:carrera", p).resultado

    try:
        with ThreadPoolExecutor(2) as hilos:
            resultados = sorted(hilos.map(pedir, [t1, t2]))
        assert resultados == ["aprobar", "rechazar"]             # 60 pide una persona; 60 + 60 > 80 se rechaza
    finally:
        with psycopg.connect(CFG.db_app) as g:
            g.execute("DELETE FROM acciones WHERE ticket_id IN (%s, %s)", (t1, t2))
