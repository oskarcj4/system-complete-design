"""Pruebas contra PostgreSQL: se saltan si la base no está levantada."""
import psycopg
import pytest

from docs.config import CFG

INSERTAR = ("INSERT INTO trozos (estrategia, prefijo, pagina, ancla, parte, titulo, texto, embedding)"
            " VALUES ('seccion', true, 'prueba', 'a', 0, 'Prueba', %s, %s)")


def conectar(dsn):
    try:
        return psycopg.connect(dsn, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("PostgreSQL no está levantado: docker compose up -d")


def test_el_lector_no_puede_escribir():
    with conectar(CFG.db_lector) as c, pytest.raises(psycopg.errors.InsufficientPrivilege):
        c.execute(INSERTAR, ("texto", [0.1] * 768))


def test_el_tsvector_se_calcula_solo_y_entiende_plurales():
    with conectar(CFG.db_indexador) as c, c.transaction(force_rollback=True):
        c.execute(INSERTAR, ("Los reintentos se multiplican en cada capa.", [0.1] * 768))
        encontrado = c.execute("SELECT tsv @@ plainto_tsquery('spanish', 'reintento') FROM trozos"
                               " WHERE pagina = 'prueba'").fetchone()[0]
    assert encontrado


def test_la_columna_pide_768_numeros():
    with conectar(CFG.db_indexador) as c, pytest.raises(psycopg.Error):
        c.execute(INSERTAR, ("texto", [0.1] * 3))
