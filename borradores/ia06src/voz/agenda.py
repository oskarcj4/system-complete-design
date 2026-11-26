"""La agenda en PostgreSQL. La base impide el choque y la doble reserva; este archivo pregunta y traduce."""
from dataclasses import dataclass
from datetime import date, datetime

import psycopg
from psycopg import errors

from voz.config import CFG
from voz.fechas import DURACION, franjas_del_dia


@dataclass(frozen=True)
class Resultado:
    estado: str                  # reservada, repetida, ocupada, cancelada o no_existe
    cita_id: int | None = None


def conectar(url: str = CFG.db) -> psycopg.Connection:
    """Una conexión con el rol agenda_bot. autocommit: cada sentencia es su propia transacción."""
    return psycopg.connect(url, autocommit=True)


def disponibles(conn: psycopg.Connection, profesional: str, dia: date) -> list[datetime]:
    """Las franjas del día que no tienen una cita activa de ese profesional."""
    franjas = franjas_del_dia(dia, CFG.zona)
    if not franjas:
        return []
    ocupadas = {
        fila[0] for fila in conn.execute(
            "SELECT lower(franja) FROM citas"
            " WHERE profesional = %s AND estado = 'activa' AND franja && tstzrange(%s, %s)",
            (profesional, franjas[0], franjas[-1] + DURACION),
        )
    }
    return [f for f in franjas if f not in ocupadas]


def reservar(conn: psycopg.Connection, profesional: str, inicio: datetime, paciente: str, clave: str) -> Resultado:
    """Inserta la cita. La misma clave dos veces devuelve la primera; una franja tomada, 'ocupada'."""
    try:
        fila = conn.execute(
            "INSERT INTO citas (profesional, franja, paciente, clave)"
            " VALUES (%s, tstzrange(%s, %s), %s, %s)"
            " ON CONFLICT (clave) DO NOTHING RETURNING id",
            (profesional, inicio, inicio + DURACION, paciente, clave),
        ).fetchone()
    except errors.ExclusionViolation:
        return Resultado("ocupada")
    if fila:
        return Resultado("reservada", fila[0])
    previa = conn.execute("SELECT id FROM citas WHERE clave = %s", (clave,)).fetchone()
    return Resultado("repetida", previa[0])


def buscar(conn: psycopg.Connection, profesional: str, inicio: datetime, paciente: str) -> int | None:
    """El id de la cita activa de esa persona a esa hora, o None."""
    fila = conn.execute(
        "SELECT id FROM citas WHERE profesional = %s AND lower(franja) = %s"
        " AND lower(paciente) = lower(%s) AND estado = 'activa'",
        (profesional, inicio, paciente),
    ).fetchone()
    return fila[0] if fila else None


def cancelar(conn: psycopg.Connection, cita_id: int) -> Resultado:
    """Marca la cita como cancelada. Cancelar dos veces devuelve 'repetida', no un error."""
    fila = conn.execute(
        "UPDATE citas SET estado = 'cancelada' WHERE id = %s AND estado = 'activa' RETURNING id",
        (cita_id,),
    ).fetchone()
    if fila:
        return Resultado("cancelada", cita_id)
    existe = conn.execute("SELECT estado FROM citas WHERE id = %s", (cita_id,)).fetchone()
    return Resultado("repetida", cita_id) if existe else Resultado("no_existe")
