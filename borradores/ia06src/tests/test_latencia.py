import csv
from types import SimpleNamespace

from voz.latencia import anotar, percentil, resumen


def test_percentil_por_rango_mas_cercano():
    v = [0.1 * i for i in range(1, 21)]          # 0.1 a 2.0
    assert percentil(v, 50) == v[9]              # el 10.º de 20
    assert percentil(v, 95) == v[18]             # el 19.º de 20
    assert percentil([0.7], 95) == 0.7


def test_resumen_suma_partes_repetidas_del_mismo_turno():
    filas = [{"modelo": "claude", "parte": "llm_inference", "sesion": "s", "turno": "1", "segundos": "0.2"},
             {"modelo": "claude", "parte": "llm_inference", "sesion": "s", "turno": "1", "segundos": "0.3"},
             {"modelo": "claude", "parte": "llm_inference", "sesion": "s", "turno": "2", "segundos": "0.4"}]
    n, p50, _ = resumen(filas)[("claude", "llm_inference")]
    assert n == 2 and p50 == 0.4                  # turnos 0.5 y 0.4; la mediana por rango es 0.4


def test_el_saludo_no_se_anota(tmp_path):
    archivo = tmp_path / "l.csv"
    saludo = SimpleNamespace(measured_from="client_connected", contributions=[], total_secs=1.0,
                             user_turn_start_time=None)
    anotar("s", "claude", saludo, str(archivo))
    assert not archivo.exists()


def test_un_turno_deja_sus_partes_y_el_total(tmp_path):
    archivo = tmp_path / "l.csv"
    partes = [SimpleNamespace(key="transcription", duration_secs=0.15),
              SimpleNamespace(key="llm_inference", duration_secs=0.4)]
    turno = SimpleNamespace(measured_from="user_silence", contributions=partes, total_secs=0.9,
                            user_turn_start_time=12.5)
    anotar("s", "claude", turno, str(archivo))
    filas = list(csv.DictReader(open(archivo, encoding="utf-8")))
    assert [f["parte"] for f in filas] == ["transcription", "llm_inference", "total"]
