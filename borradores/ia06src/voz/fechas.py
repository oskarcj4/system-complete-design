"""Las franjas de la agenda y cómo se dicen en voz alta. Funciones puras: sin base y sin reloj."""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

DURACION = timedelta(minutes=30)
TURNOS = ((time(9), time(13)), (time(15), time(18)))
DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre")


def franjas_del_dia(dia: date, zona: ZoneInfo) -> list[datetime]:
    """El inicio de cada cita posible ese día, en la hora del consultorio."""
    if dia.weekday() >= 5:
        return []
    franjas = []
    for desde, hasta in TURNOS:
        t = datetime.combine(dia, desde, tzinfo=zona)
        fin = datetime.combine(dia, hasta, tzinfo=zona)
        while t + DURACION <= fin:
            franjas.append(t)
            t += DURACION
    return franjas


def en_palabras(inicio: datetime) -> str:
    """'el martes 1 de diciembre a las 10:30': lo que el agente lee y lo que se busca en lo que sonó."""
    return f"el {DIAS[inicio.weekday()]} {inicio.day} de {MESES[inicio.month - 1]} a las {inicio:%H:%M}"


def piezas(inicio: datetime, nombre: str) -> tuple[str, ...]:
    """Lo que tiene que haber sonado para decir que la persona oyó la propuesta: día, fecha, hora y apellido."""
    return (DIAS[inicio.weekday()], f"{inicio.day} de {MESES[inicio.month - 1]}",
            f"{inicio:%H:%M}", nombre.split()[-1])


def leer_fecha(texto: str) -> date:
    """La fecha que manda el modelo, en ISO: 2026-12-01."""
    return date.fromisoformat(texto)


def leer_inicio(texto: str, zona: ZoneInfo) -> datetime:
    """'2026-12-01T10:30' en la hora del consultorio. Si trae zona, se convierte."""
    dt = datetime.fromisoformat(texto)
    return dt.replace(tzinfo=zona) if dt.tzinfo is None else dt.astimezone(zona)
