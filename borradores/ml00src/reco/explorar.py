"""Mira los Parquet con DuckDB: SQL sobre archivos, sin servidor."""
import duckdb

from reco import config

CONSULTAS = {
    "tamano": """
        SELECT count(*) AS calificaciones,
               count(DISTINCT userId) AS usuarios,
               count(DISTINCT movieId) AS peliculas,
               round(100.0 * count(*) / (count(DISTINCT userId) * count(DISTINCT movieId)), 2) AS densidad_pct,
               min(ts) AS primera, max(ts) AS ultima
        FROM ratings""",
    "estrellas": "SELECT rating, count(*) AS n FROM ratings GROUP BY rating ORDER BY rating",
    "por_usuario": """
        SELECT min(n) AS minimo, quantile_cont(n, 0.5) AS mediana,
               quantile_cont(n, 0.9) AS p90, max(n) AS maximo
        FROM (SELECT userId, count(*) AS n FROM ratings GROUP BY userId)""",
    "por_anio": "SELECT year(ts) AS anio, count(*) AS n FROM ratings GROUP BY anio ORDER BY anio",
    "cola_larga": """
        WITH c AS (SELECT movieId, count(*) AS n FROM ratings GROUP BY movieId),
             r AS (SELECT n, row_number() OVER (ORDER BY n DESC) AS puesto,
                          count(*) OVER () AS total, sum(n) OVER () AS suma FROM c)
        SELECT round(100.0 * sum(n) FILTER (WHERE puesto <= total * 0.01) / any_value(suma), 1) AS pct_top_1,
               round(100.0 * sum(n) FILTER (WHERE puesto <= total * 0.10) / any_value(suma), 1) AS pct_top_10,
               count(*) FILTER (WHERE n = 1) AS con_una_sola
        FROM r""",
    "generos": """
        SELECT genero, count(*) AS peliculas
        FROM (SELECT unnest(generos) AS genero FROM peliculas)
        GROUP BY genero ORDER BY peliculas DESC""",
}
def conectar() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    for nombre in ("ratings", "peliculas"):
        ruta = (config.PARQUET / f"{nombre}.parquet").as_posix().replace("'", "''")
        con.execute(f"CREATE VIEW {nombre} AS SELECT * FROM read_parquet('{ruta}')")
    return con


def explorar(solo: str | None = None) -> None:
    con = conectar()
    for nombre, sql in CONSULTAS.items():
        if solo is None or solo == nombre:
            print(f"\n== {nombre}")
            con.sql(sql).show()