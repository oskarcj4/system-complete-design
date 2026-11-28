"""Sube las vecinas de cada película a Redis, todas de una vez, antes de que lleguen las requests."""
import json
import sys

import redis

from reco import api


def publicar(lote: int = 500) -> int:
    d, c = api.datos(), api.cache()
    try:
        antes = c.r.info("memory")["used_memory"]
        tubo = c.r.pipeline(transaction=False)
        for n, (movie_id, lista) in enumerate(d.listas.items(), start=1):
            tubo.set(d.clave(movie_id), json.dumps(lista))
            if n % lote == 0:
                tubo.execute()
        tubo.execute()
        despues = c.r.info("memory")["used_memory"]
    except redis.RedisError as e:
        sys.exit(f"Redis no contesta ({e}): docker compose up -d --wait")
    print(f"versión {d.version}: {len(d.listas)} películas publicadas")
    print(f"memoria de Redis: {(despues - antes) / 1e6:+.2f} MB")
    return len(d.listas)
