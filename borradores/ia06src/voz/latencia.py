"""El presupuesto de latencia: cada turno, cuánto tardó cada parte, en un CSV; y el resumen, con mediana y p95."""
import csv
import math
import sys
from collections import defaultdict
from pathlib import Path

from voz.config import CFG

CAMPOS = ["sesion", "modelo", "turno", "parte", "segundos"]


def anotar(sesion: str, modelo: str, desglose, archivo: str = CFG.latencias) -> None:
    """Una fila por parte del turno y una con el total. El saludo no cuenta: no hubo una persona esperando."""
    if desglose.measured_from != "user_silence":
        return
    nuevo = not Path(archivo).exists()
    turno = f"{desglose.user_turn_start_time or 0:.3f}"
    with open(archivo, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if nuevo:
            w.writerow(CAMPOS)
        for c in desglose.contributions:
            w.writerow([sesion, modelo, turno, c.key, f"{c.duration_secs:.3f}"])
        w.writerow([sesion, modelo, turno, "total", f"{desglose.total_secs:.3f}"])


def percentil(valores: list[float], p: float) -> float:
    """Por rango más cercano: el valor que deja abajo al p % de los turnos."""
    orden = sorted(valores)
    return orden[max(1, math.ceil(p / 100 * len(orden))) - 1]


def resumen(filas: list[dict]) -> dict[tuple[str, str], tuple[int, float, float]]:
    """(modelo, parte) -> (turnos, p50, p95). Una parte que aparece dos veces en un turno se suma."""
    por_turno: dict[tuple[str, str, str, str], float] = defaultdict(float)
    for f in filas:
        por_turno[(f["modelo"], f["parte"], f["sesion"], f["turno"])] += float(f["segundos"])
    series: dict[tuple[str, str], list[float]] = defaultdict(list)
    for (modelo, parte, _, _), s in por_turno.items():
        series[(modelo, parte)].append(s)
    return {k: (len(v), percentil(v, 50), percentil(v, 95)) for k, v in sorted(series.items())}


def main() -> None:
    archivo = sys.argv[1] if len(sys.argv) > 1 else CFG.latencias
    with open(archivo, encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    print(f"{'modelo':8} {'parte':24} {'turnos':>6} {'p50 ms':>8} {'p95 ms':>8}")
    for (modelo, parte), (n, p50, p95) in resumen(filas).items():
        print(f"{modelo:8} {parte:24} {n:6d} {p50 * 1000:8.0f} {p95 * 1000:8.0f}")
