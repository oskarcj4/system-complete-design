from dataclasses import dataclass

import pytest

from voz.confirmar import es_si, puede_confirmar, texto_de


@dataclass
class P:
    piezas: tuple = ("martes", "1 de diciembre", "10:30", "Ruiz")
    desde: int = 0


LEIDA = "¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30, a nombre de Ana Pérez?"
CORTADA = "¿Le reservo con la doctora Ruiz el martes 1 de diciembre"


@pytest.mark.parametrize("texto", ["Sí", "sí, por favor", "Claro que sí.", "Dale", "Correcto", "ok"])
def test_si(texto):
    assert es_si(texto)


@pytest.mark.parametrize("texto", ["No", "no, mejor no", "Sí... no, espera", "¿A qué hora?", "mmm", "",
                                   "Sí, pero otro día"])
def test_no_es_si(texto):
    assert not es_si(texto)


def test_texto_de_partes():
    assert texto_de({"content": [{"type": "text", "text": "hola"}, {"type": "text", "text": "mundo"}]}) == "hola mundo"
    assert texto_de({"content": None}) == ""


def test_oyo_y_dijo_que_si():
    m = [{"role": "assistant", "content": LEIDA}, {"role": "user", "content": "Sí"}]
    assert puede_confirmar(m, P()) == (True, "ok")


def test_lo_interrumpieron_antes_de_la_hora():
    m = [{"role": "assistant", "content": CORTADA}, {"role": "user", "content": "Sí"}]
    ok, motivo = puede_confirmar(m, P())
    assert not ok and "no oyó" in motivo


def test_todavia_no_responde():
    ok, motivo = puede_confirmar([{"role": "assistant", "content": LEIDA}], P())
    assert not ok and "todavía" in motivo


def test_sin_propuesta():
    assert puede_confirmar([], None)[0] is False


def test_vale_la_ultima_lectura_y_la_ultima_respuesta():
    m = [{"role": "assistant", "content": LEIDA}, {"role": "user", "content": "No"},
         {"role": "assistant", "content": LEIDA}, {"role": "user", "content": "Ahora sí"}]
    assert puede_confirmar(m, P())[0]


def test_una_lectura_anterior_a_la_propuesta_no_cuenta():
    m = [{"role": "assistant", "content": LEIDA}, {"role": "user", "content": "Sí"}]
    assert not puede_confirmar(m, P(desde=2))[0]
