"""Carga clientes y pedidos que cubren cada rama de la política. Las fechas son relativas a hoy: los casos
valen el día que la corras. Se puede correr de nuevo: borra la tienda y la vuelve a cargar (también las direcciones).

    uv run python semilla.py
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import psycopg

from soporte.config import CFG

CLIENTES = [(1, "Ana Ruiz", "ana@ejemplo.test"), (2, "Bruno Díaz", "bruno@ejemplo.test"),
            (3, "Carla Soto", "carla@ejemplo.test"), (4, "Diego Paz", "diego@ejemplo.test"),
            (5, "Elena Vega", "elena@ejemplo.test")]

# id, cliente, estado, días desde la compra, días desde la entrega, líneas (producto, cantidad, precio)
PEDIDOS = [
    (1001, 1, "entregado", 20, 15, [("Taza azul", 1, "12.50"), ("Cuaderno", 2, "6.00")]),
    (1002, 1, "entregado", 6, 3, [("Taza de cerámica", 1, "12.50")]),          # chico: automático
    (1043, 1, "entregado", 12, 10, [("Termo de acero", 1, "80.00")]),          # grande: una persona
    (1011, 2, "enviado", 3, None, [("Mochila", 1, "45.00")]),                   # en camino
    (1012, 2, "pagado", 1, None, [("Lámpara", 1, "30.00")]),                    # se puede cambiar la dirección
    (1013, 2, "entregado", 25, 20, [("Audífonos", 1, "49.99")]),
    (1021, 3, "entregado", 50, 45, [("Sartén", 1, "38.00")]),                   # fuera de plazo
    (1022, 3, "entregado", 15, 12, [("Plato hondo", 4, "7.50")]),               # ya reembolsado entero
    (1031, 4, "entregado", 9, 7, [("Cuchara", 5, "7.00")]),
    (1051, 5, "entregado", 8, 5, [("Tetera", 1, "50.00")]),                     # 50.00 exacto
    (1052, 5, "entregado", 8, 5, [("Licuadora", 1, "50.01"), ("Jarra", 1, "69.99")]),
    (1053, 5, "entregado", 40, 31, [("Mantel", 1, "20.00")]),                   # un día fuera de plazo
]
REEMBOLSOS_VIEJOS = [("re_semilla_1022", 1022, "30.00", 11)]
DIRECCIONES = {1: "Calle Olmo 12", 2: "Avenida Sur 450", 3: "Pasaje Luna 8", 4: "Calle Río 77", 5: "Camino Alto 3"}


def main() -> None:
    ahora = datetime.now(timezone.utc).replace(microsecond=0)
    hace = lambda dias: ahora - timedelta(days=dias)
    with psycopg.connect(CFG.db_duenio) as c:       # el dueño de las tablas: la RLS no lo filtra
        c.execute("TRUNCATE reembolsos, lineas, pedidos, clientes")
        c.cursor().executemany("INSERT INTO clientes VALUES (%s, %s, %s)", CLIENTES)
        for pid, cliente, estado, compra, entrega, lineas in PEDIDOS:
            total = sum(Decimal(p) * n for _, n, p in lineas)
            c.execute("INSERT INTO pedidos VALUES (%s, %s, %s, %s, %s, %s, %s)",
                      (pid, cliente, hace(compra), estado, hace(entrega) if entrega is not None else None,
                       total, DIRECCIONES[cliente]))
            c.cursor().executemany("INSERT INTO lineas VALUES (%s, %s, %s, %s)",
                                   [(pid, prod, n, Decimal(p)) for prod, n, p in lineas])
        for rid, pid, monto, dias in REEMBOLSOS_VIEJOS:
            c.execute("INSERT INTO reembolsos VALUES (%s, %s, %s, %s)", (rid, pid, Decimal(monto), hace(dias)))
    print(f"{len(CLIENTES)} clientes, {len(PEDIDOS)} pedidos y {len(REEMBOLSOS_VIEJOS)} reembolso viejo")


if __name__ == "__main__":
    main()
