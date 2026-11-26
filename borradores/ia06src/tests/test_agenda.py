"""Contra la base de verdad. Si el contenedor no está arriba, estas pruebas se saltan."""
import threading
import uuid
from datetime import date, datetime

import psycopg
import pytest

from voz import agenda
from voz.config import CFG

INICIO = datetime(2026, 12, 2, 9, 0, tzinfo=CFG.zona)


@pytest.fixture
def conn():
    try:
        admin = psycopg.connect(CFG.db_admin, autocommit=True, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("PostgreSQL no está arriba: docker compose up -d")
    admin.execute("TRUNCATE citas")
    with agenda.conectar() as c:
        yield c
    admin.close()


def test_reservar_y_ver_que_ya_no_esta_libre(conn):
    assert agenda.reservar(conn, "ruiz", INICIO, "Ana Pérez", "k1").estado == "reservada"
    assert INICIO not in agenda.disponibles(conn, "ruiz", date(2026, 12, 2))
    assert INICIO in agenda.disponibles(conn, "paz", date(2026, 12, 2))


def test_la_misma_clave_devuelve_la_misma_cita(conn):
    a = agenda.reservar(conn, "ruiz", INICIO, "Ana Pérez", "k1")
    b = agenda.reservar(conn, "ruiz", INICIO, "Ana Pérez", "k1")
    assert (b.estado, b.cita_id) == ("repetida", a.cita_id)


def test_dos_a_la_vez_solo_una_gana(conn):
    barrera, estados = threading.Barrier(2), []

    def reservar(p):
        with agenda.conectar() as c:
            barrera.wait()
            estados.append(agenda.reservar(c, "ruiz", INICIO, p, uuid.uuid4().hex).estado)

    hilos = [threading.Thread(target=reservar, args=(p,)) for p in ("Ana", "Luis")]
    [h.start() for h in hilos]
    [h.join(timeout=10) for h in hilos]
    assert sorted(estados) == ["ocupada", "reservada"]


def test_cancelar_libera_la_hora_y_dos_veces_no_falla(conn):
    r = agenda.reservar(conn, "ruiz", INICIO, "Ana Pérez", "k1")
    assert agenda.cancelar(conn, r.cita_id).estado == "cancelada"
    assert agenda.cancelar(conn, r.cita_id).estado == "repetida"
    assert agenda.reservar(conn, "ruiz", INICIO, "Luis Gómez", "k2").estado == "reservada"


def test_el_bot_no_puede_borrar(conn):
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        conn.execute("DELETE FROM citas")


def test_el_bot_no_puede_cambiar_la_hora(conn):
    r = agenda.reservar(conn, "ruiz", INICIO, "Ana Pérez", "k1")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        conn.execute("UPDATE citas SET paciente = 'otro' WHERE id = %s", (r.cita_id,))
