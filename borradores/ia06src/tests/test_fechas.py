from datetime import date, datetime
from zoneinfo import ZoneInfo

from voz.fechas import en_palabras, franjas_del_dia, leer_inicio, piezas

ZONA = ZoneInfo("America/Mexico_City")


def test_un_dia_habil_tiene_catorce_franjas():
    franjas = franjas_del_dia(date(2026, 12, 1), ZONA)
    assert len(franjas) == 14                     # 8 de 9 a 13 y 6 de 15 a 18
    assert f"{franjas[0]:%H:%M}" == "09:00"
    assert f"{franjas[7]:%H:%M}" == "12:30"
    assert f"{franjas[8]:%H:%M}" == "15:00"
    assert f"{franjas[-1]:%H:%M}" == "17:30"


def test_el_fin_de_semana_no_hay_franjas():
    assert franjas_del_dia(date(2026, 12, 5), ZONA) == []      # sábado


def test_en_palabras():
    assert en_palabras(datetime(2026, 12, 1, 10, 30, tzinfo=ZONA)) == "el martes 1 de diciembre a las 10:30"


def test_piezas_de_la_propuesta():
    assert piezas(datetime(2026, 12, 1, 10, 30, tzinfo=ZONA), "la doctora Ruiz") == \
        ("martes", "1 de diciembre", "10:30", "Ruiz")


def test_leer_inicio_sin_zona_usa_la_del_consultorio():
    assert leer_inicio("2026-12-01T10:30", ZONA) == datetime(2026, 12, 1, 10, 30, tzinfo=ZONA)


def test_leer_inicio_con_zona_la_convierte():
    assert leer_inicio("2026-12-01T16:30+00:00", ZONA) == datetime(2026, 12, 1, 10, 30, tzinfo=ZONA)
