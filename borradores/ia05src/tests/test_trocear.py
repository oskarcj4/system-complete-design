import pytest

from docs.ingerir import Seccion
from docs.trocear import fijo, por_seccion

A = Seccion("m08", "colas", "Resiliencia · Colas", "uno dos tres cuatro\ncinco seis siete")
B = Seccion("m08", "breaker", "Resiliencia · Breaker", "ocho nueve diez once doce")


def test_por_seccion_no_parte_si_cabe():
    assert [(t.ancla, t.parte) for t in por_seccion([A, B], max_palabras=10)] == [("colas", 0), ("breaker", 0)]


def test_por_seccion_parte_entre_parrafos():
    trozos = por_seccion([A], max_palabras=5)
    assert [t.texto for t in trozos] == ["uno dos tres cuatro", "cinco seis siete"]


def test_fijo_cruza_secciones_y_se_cita_por_la_primera_palabra():
    trozos = fijo([A, B], tamano=5, solape=2)
    # Empiezan en las palabras 0, 3, 6 y 9: la de 6 es "siete", la última de colas.
    assert [t.ancla for t in trozos] == ["colas", "colas", "colas", "breaker"]
    assert trozos[2].texto == "siete ocho nueve diez once"
    assert trozos[3].texto == "diez once doce"


def test_fijo_no_acepta_un_solape_tan_grande_como_el_trozo():
    with pytest.raises(ValueError):
        fijo([A], tamano=5, solape=5)
