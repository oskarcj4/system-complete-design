"""La política de reembolsos, en código. Una función pura: no lee la base, no llama al modelo, no sabe la hora.

Quien la llama le pasa el pedido (leído con la RLS del cliente de la sesión), lo ya reembolsado o reservado
de ese pedido, el monto que propone el modelo y la fecha de hoy. tests/test_politica.py prueba cada rama.
"""
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal

CENTAVO = Decimal("0.01")


@dataclass(frozen=True)
class Decision:
    resultado: Literal["automatico", "aprobar", "rechazar"]
    motivo: str


def evaluar(pedido: dict | None, ya_reembolsado: Decimal, monto: Decimal, hoy: date,
            umbral: Decimal = Decimal("50.00"), dias: int = 30) -> Decision:
    if pedido is None:
        # El mismo mensaje si no existe o si es de otra persona: la RLS no lo dejó ver, y no se lo contamos.
        return Decision("rechazar", "No encuentro ese pedido entre los tuyos.")
    if pedido["estado"] != "entregado":
        return Decision("rechazar", f"El pedido {pedido['id']} todavía no se entregó; se puede reclamar al recibirlo.")
    pasaron = (hoy - pedido["entregado_en"].date()).days
    if pasaron > dias:
        return Decision("rechazar", f"Se entregó hace {pasaron} días; el plazo es de {dias}.")
    if monto != monto.quantize(CENTAVO) or monto <= 0:
        return Decision("rechazar", "El monto tiene que ser positivo y con centavos, como 12.50.")
    queda = pedido["total_usd"] - ya_reembolsado
    if monto > queda:
        return Decision("rechazar", f"Del pedido {pedido['id']} quedan {queda} USD por reembolsar.")
    if monto <= umbral:
        return Decision("automatico", f"{monto} USD, dentro del plazo y de lo que queda.")
    return Decision("aprobar", f"{monto} USD supera los {umbral} USD: lo aprueba una persona.")
