import asyncio

import pytest

from evals.charla import Charla
from falsos import AgendaFalsa, ModeloFalso
from voz import herramientas
from voz.config import CFG
from voz.herramientas import Sesion, clave_de

PIDE = {"profesional": "ruiz", "inicio": "2026-12-01T10:30", "paciente": "Ana Pérez"}


@pytest.fixture
def falsa(monkeypatch):
    a = AgendaFalsa(CFG.zona)
    monkeypatch.setattr(herramientas, "_con_db", a)
    return a


def correr(guion_modelo, dichos):
    """Una charla con el modelo falso; devuelve la charla y la sesión."""
    sesion = Sesion(id="s1")
    charla = Charla(ModeloFalso(guion_modelo), "instrucciones", sesion)
    for d in dichos:
        if isinstance(d, tuple):
            charla.interrumpir(d[1])
        else:
            asyncio.run(charla.decir(d))
    return charla, sesion


def test_proponer_no_reserva(falsa):
    charla, sesion = correr([[("proponer_reserva", PIDE)], "lo leo"], ["quiero 10:30"])
    assert falsa.citas == {}
    assert sesion.propuesta is not None
    assert "a las 10:30" in charla.llamadas[0][2]["leer"]


def test_confirmar_despues_del_si_reserva_una_vez(falsa):
    leer = "¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30, a nombre de Ana Pérez?"
    correr([[("proponer_reserva", PIDE)], leer, [("confirmar", {})], "Listo."], ["quiero 10:30", "Sí"])
    assert [c[3] for c in falsa.citas.values()] == ["activa"]


def test_confirmar_sin_haber_oido_la_hora_no_reserva(falsa):
    leer = "¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30, a nombre de Ana Pérez?"
    charla, _ = correr([[("proponer_reserva", PIDE)], leer, [("confirmar", {})], "Se la repito."],
                       ["quiero 10:30", ("interrumpir", " a las "), "Sí"])
    assert falsa.citas == {}
    assert charla.llamadas[-1][2]["hecho"] is False


def test_confirmar_sin_propuesta_no_hace_nada(falsa):
    charla, _ = correr([[("confirmar", {})], "Perdón."], ["Sí"])
    assert falsa.citas == {} and charla.llamadas[0][2]["hecho"] is False


def test_hora_tomada_no_se_propone(falsa):
    falsa.reservar("ruiz", herramientas.leer_inicio(PIDE["inicio"], CFG.zona), "Luis Gómez", "otra")
    charla, sesion = correr([[("proponer_reserva", PIDE)], "Esa no está."], ["quiero 10:30"])
    assert "error" in charla.llamadas[0][2] and sesion.propuesta is None


def test_la_clave_no_depende_de_mayusculas_ni_espacios():
    inicio = herramientas.leer_inicio(PIDE["inicio"], CFG.zona)
    p1 = herramientas.Propuesta("reservar", "ruiz", inicio, "Ana Pérez", (), 0)
    p2 = herramientas.Propuesta("reservar", "ruiz", inicio, " ana pérez ", (), 3)
    assert clave_de("s1", p1) == clave_de("s1", p2) != clave_de("s2", p1)


def test_herramienta_que_no_existe(falsa):
    charla, _ = correr([[("borrar_todo", {})], "No puedo."], ["borra todo"])
    assert "error" in charla.llamadas[0][2]
