"""Las métricas de los evals, sin modelo y sin base: se pueden comprobar a mano."""
import math


def recall_en_k(encontradas: list[str], oro: list[str], k: int) -> float:
    """Qué fracción de las secciones de oro aparece entre las k primeras."""
    if not oro:
        raise ValueError("Una pregunta sin oro no tiene recall.")
    return len(set(encontradas[:k]) & set(oro)) / len(set(oro))


def acierto_en_k(encontradas: list[str], oro: list[str], k: int) -> float:
    """1 si al menos una sección de oro está entre las k primeras: alcanza con una para responder."""
    return 1.0 if set(encontradas[:k]) & set(oro) else 0.0


def rango_reciproco(encontradas: list[str], oro: list[str], k: int = 10) -> float:
    """1 / el puesto de la primera sección de oro, o 0 si no aparece en las k primeras. Su promedio es el MRR."""
    for puesto, cita in enumerate(encontradas[:k], start=1):
        if cita in oro:
            return 1.0 / puesto
    return 0.0


def promedio(valores: list[float]) -> float:
    return sum(valores) / len(valores) if valores else 0.0


def intervalo(p: float, n: int) -> float:
    """El margen del 95 % de una proporción: ±1.96 × √(p(1 − p)/n), en la misma escala que p."""
    return 1.96 * math.sqrt(p * (1 - p) / n) if n else 0.0


def pass_k(corridas: list[bool]) -> bool:
    """pass^k de una pregunta: aprueba solo si aprueban las k corridas."""
    return bool(corridas) and all(corridas)


def matriz(juez: list[bool], persona: list[bool]) -> dict[str, int]:
    """La matriz 2 × 2 entre el juez y la persona, con True como correcta."""
    if len(juez) != len(persona):
        raise ValueError("Las dos listas tienen que tener el mismo largo.")
    m = {"ambos_si": 0, "solo_juez": 0, "solo_persona": 0, "ambos_no": 0}
    for j, p in zip(juez, persona):
        m["ambos_si" if j and p else "solo_juez" if j else "solo_persona" if p else "ambos_no"] += 1
    return m


def kappa(juez: list[bool], persona: list[bool]) -> float:
    """El kappa de Cohen: el acuerdo observado descontado el que saldría por azar con las mismas proporciones.

    kappa = (acuerdo − azar) / (1 − azar). 1 es acuerdo perfecto; 0, lo mismo que tirar una moneda cargada.
    """
    m, n = matriz(juez, persona), len(juez)
    if n == 0:
        raise ValueError("Sin etiquetas no hay kappa.")
    acuerdo = (m["ambos_si"] + m["ambos_no"]) / n
    si_juez = (m["ambos_si"] + m["solo_juez"]) / n
    si_persona = (m["ambos_si"] + m["solo_persona"]) / n
    azar = si_juez * si_persona + (1 - si_juez) * (1 - si_persona)
    return 1.0 if azar == 1 else (acuerdo - azar) / (1 - azar)
