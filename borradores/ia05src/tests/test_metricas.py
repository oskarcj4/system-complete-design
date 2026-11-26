import pytest

from docs.buscar import fusionar
from docs.metricas import acierto_en_k, intervalo, kappa, matriz, pass_k, rango_reciproco, recall_en_k


def test_rrf_suma_los_puestos_de_las_dos_listas():
    # 1: 1/61 + 1/62 = 0.03252; 3: 1/63 + 1/61 = 0.03227; 2: 1/62; 4: 1/63.
    assert fusionar([[1, 2, 3], [3, 1, 4]], k=60) == [1, 3, 2, 4]


def test_rrf_con_empate_queda_el_que_aparecio_antes():
    assert fusionar([[7], [8]]) == [7, 8]


def test_recall_acierto_y_rango():
    encontradas = ["m08#colas", "m08#breaker", "m25#durable"]
    assert recall_en_k(encontradas, ["m25#durable", "m25#patrones"], k=5) == 0.5
    assert acierto_en_k(encontradas, ["m25#durable", "m25#patrones"], k=5) == 1.0
    assert acierto_en_k(encontradas, ["m25#durable"], k=2) == 0.0
    assert rango_reciproco(encontradas, ["m25#durable"]) == pytest.approx(1 / 3)
    assert rango_reciproco(encontradas, ["m10#pkce"]) == 0.0


def test_intervalo_de_80_por_ciento_con_100():
    assert intervalo(0.8, 100) == pytest.approx(0.0784)


def test_pass_k_pide_todas_las_corridas():
    assert pass_k([True, True, True]) and not pass_k([True, False, True]) and not pass_k([])


def test_kappa_a_mano():
    # 6 los dos dicen sí, 2 solo el juez, 2 los dos dicen no. Acuerdo 0.8.
    juez = [True] * 8 + [False] * 2
    persona = [True] * 6 + [False] * 4
    assert matriz(juez, persona) == {"ambos_si": 6, "solo_juez": 2, "solo_persona": 0, "ambos_no": 2}
    # Azar: 0.8 × 0.6 + 0.2 × 0.4 = 0.56. Kappa: (0.8 − 0.56) / (1 − 0.56) = 0.545.
    assert kappa(juez, persona) == pytest.approx(0.24 / 0.44)


def test_un_juez_que_siempre_dice_si_tiene_kappa_cero():
    persona = [True] * 7 + [False] * 3
    assert kappa([True] * 10, persona) == pytest.approx(0.0)
