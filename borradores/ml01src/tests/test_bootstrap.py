import numpy as np
import pytest
from hypothesis import given, strategies as st

from reco.bootstrap import diferencia, intervalo


def test_sin_variacion_el_intervalo_es_un_punto():
    assert intervalo([0.3] * 50) == pytest.approx((0.3, 0.3))


def test_la_misma_semilla_da_el_mismo_intervalo():
    x = np.random.default_rng(7).random(200)
    assert intervalo(x, semilla=1) == intervalo(x, semilla=1)
    assert intervalo(x, semilla=1) != intervalo(x, semilla=2)
def test_la_diferencia_pareada():
    a = np.array([0.5, 0.2, 0.9, 0.0])
    assert diferencia(a, a) == (0.0, 0.0, 0.0)
    assert diferencia(a + 0.1, a) == pytest.approx((0.1, 0.1, 0.1))
    with pytest.raises(ValueError):
        diferencia(a, a[:3])


@given(st.lists(st.floats(0, 1), min_size=2, max_size=60))
def test_el_intervalo_queda_dentro_del_rango(valores):
    lo, hi = intervalo(valores, n=200)
    assert min(valores) - 1e-12 <= lo <= hi <= max(valores) + 1e-12


def test_mas_usuarios_angostan_el_intervalo():
    rng = np.random.default_rng(3)
    pocos, muchos = rng.random(50), rng.random(5000)
    ancho = lambda x: intervalo(x)[1] - intervalo(x)[0]
    assert ancho(muchos) < ancho(pocos)