"""Intervalos por bootstrap: cuánto se movería una media si te hubieran tocado otros usuarios de prueba."""
import numpy as np

from reco import config


def intervalo(valores, n: int = config.BOOTSTRAP_N, nivel: float = 0.95,
              semilla: int = 0) -> tuple[float, float]:
    x = np.asarray(valores, dtype=float)
    if len(x) == 0:
        raise ValueError("sin valores no hay intervalo")
    rng = np.random.default_rng(semilla)
    idx = rng.integers(0, len(x), size=(n, len(x)))
    medias = x[idx].mean(axis=1)
    a = (1 - nivel) / 2
    return float(np.quantile(medias, a)), float(np.quantile(medias, 1 - a))
def diferencia(a, b, n: int = config.BOOTSTRAP_N, nivel: float = 0.95,
               semilla: int = 0) -> tuple[float, float, float]:
    """La media de a − b, usuario por usuario, con su intervalo. a y b van en el mismo orden de usuarios."""
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    if a.shape != b.shape:
        raise ValueError(f"a tiene {a.shape} valores y b {b.shape}: no son los mismos usuarios")
    d = a - b
    lo, hi = intervalo(d, n, nivel, semilla)
    return float(d.mean()), lo, hi