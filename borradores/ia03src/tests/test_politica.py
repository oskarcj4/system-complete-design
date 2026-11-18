"""Cada rama de la política, con números de borde. Sin base, sin modelo y sin red."""
from decimal import Decimal

import pytest

from falsos import HOY, entregado_hace
from soporte.politica import evaluar

D = Decimal


def pedido(estado="entregado", dias=10, total="80.00"):
    return {"id": 1043, "estado": estado, "entregado_en": entregado_hace(dias) if dias is not None else None,
            "total_usd": D(total)}


@pytest.mark.parametrize("p, previo, monto, esperado", [
    (None, "0", "10.00", "rechazar"),                        # no existe o es de otra persona
    (pedido(estado="enviado", dias=None), "0", "10.00", "rechazar"),
    (pedido(dias=31), "0", "10.00", "rechazar"),             # un día fuera de plazo
    (pedido(dias=30), "0", "10.00", "automatico"),           # el día 30 todavía vale
    (pedido(), "0", "0.00", "rechazar"),
    (pedido(), "0", "12.345", "rechazar"),                   # medio centavo
    (pedido(), "0", "50.00", "automatico"),                  # el umbral es inclusivo
    (pedido(), "0", "50.01", "aprobar"),
    (pedido(), "0", "80.00", "aprobar"),
    (pedido(), "0", "80.01", "rechazar"),                    # más que el pedido
    (pedido(), "30.00", "50.00", "automatico"),              # 30 + 50 = 80: justo lo que queda
    (pedido(), "30.00", "50.01", "rechazar"),
    (pedido(total="12.50"), "12.50", "0.01", "rechazar"),    # ya reembolsado entero
])
def test_cada_rama(p, previo, monto, esperado):
    assert evaluar(p, D(previo), D(monto), HOY).resultado == esperado


def test_el_mismo_mensaje_si_no_existe_o_es_ajeno():
    # La política no recibe el pedido ajeno: la RLS no se lo dejó ver. El texto no cuenta si existe.
    assert evaluar(None, D(0), D("10.00"), HOY).motivo == "No encuentro ese pedido entre los tuyos."


def test_el_umbral_se_configura():
    assert evaluar(pedido(), D(0), D("20.00"), HOY, umbral=D("19.99")).resultado == "aprobar"
