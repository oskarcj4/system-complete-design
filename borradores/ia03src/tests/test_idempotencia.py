"""Contra el proveedor del compose: la clave evita el doble cobro. Se salta si el proveedor no está levantado."""
import uuid

import httpx
import pytest

from soporte.acciones import llamar_proveedor
from soporte.config import CFG


def modo(m: str) -> None:
    httpx.post(f"{CFG.pagos}/admin/modo", json={"modo": m}, timeout=5).raise_for_status()


@pytest.fixture(autouse=True)
def proveedor():
    try:
        modo("normal")
    except httpx.HTTPError:
        pytest.skip("El proveedor de pagos no está levantado: docker compose up -d pagos")
    yield
    modo("normal")


def cobros(pedido_id: int) -> list[dict]:
    return httpx.get(f"{CFG.pagos}/v1/refunds", params={"pedido_id": pedido_id}, timeout=5).json()


def cuerpo(pedido_id: int, monto: str = "12.50") -> dict:
    return {"pedido_id": pedido_id, "monto_usd": monto, "motivo": "prueba"}


def test_misma_clave_mismo_reembolso():
    pid, clave = 900_000 + uuid.uuid4().int % 99_999, f"prueba:{uuid.uuid4()}"
    a = llamar_proveedor(cuerpo(pid), clave)
    b = llamar_proveedor(cuerpo(pid), clave)
    assert a["id"] == b["id"] and b["repetida"] is True and len(cobros(pid)) == 1


def test_misma_clave_otro_cuerpo_es_un_error():
    pid, clave = 900_000 + uuid.uuid4().int % 99_999, f"prueba:{uuid.uuid4()}"
    llamar_proveedor(cuerpo(pid), clave)
    with pytest.raises(ValueError, match="422"):
        llamar_proveedor(cuerpo(pid, "99.00"), clave)


def test_el_timeout_no_cobra_dos_veces():
    # lento: el proveedor reembolsa y tarda 6 s en contestar; el cliente corta a los 3 s y reintenta con la clave.
    pid, clave = 900_000 + uuid.uuid4().int % 99_999, f"prueba:{uuid.uuid4()}"
    modo("lento")
    r = llamar_proveedor(cuerpo(pid), clave)
    assert r is not None and r["repetida"] is True and len(cobros(pid)) == 1


def test_una_clave_nueva_por_intento_cobra_dos_veces():
    # La falla que la clave evita, provocada a propósito: reintentar con otra clave es como no tener clave.
    pid = 900_000 + uuid.uuid4().int % 99_999
    for _ in range(2):
        r = httpx.post(f"{CFG.pagos}/v1/refunds", json=cuerpo(pid), headers={"Idempotency-Key": str(uuid.uuid4())}, timeout=5)
        assert r.status_code == 201
    assert len(cobros(pid)) == 2


def test_caido_devuelve_none_y_no_cobra():
    pid, clave = 900_000 + uuid.uuid4().int % 99_999, f"prueba:{uuid.uuid4()}"
    modo("caido")
    assert llamar_proveedor(cuerpo(pid), clave, intentos=2) is None
    modo("normal")
    assert len(cobros(pid)) == 0
    assert llamar_proveedor(cuerpo(pid), clave)["repetida"] is False   # el reintento de más tarde cobra una vez
