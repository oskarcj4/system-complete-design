from pathlib import Path
from lib import *

SRC = ROOT / 'borradores' / 'ml02src'
HERE = Path(__file__).resolve().parent


def rd(p):
    return (SRC / p).read_text(encoding='utf-8')


P = []
add = P.append
ML0 = 'ml00-laboratorio.html'
ML1 = 'ml01-linea-base.html'
M04 = '../modules/m04-cache.html'
M42 = '../modules/m42-ml-system-design.html'
M43 = '../modules/m43-datos-recomendacion.html'
M44 = '../modules/m44-modelos-clasicos.html'
REF = '<span class="badge badge--ref">Diseño de referencia</span>'
DOC = '<span class="badge badge--doc">Documentado</span>'


def contra(t):
    return callout('tradeoff', 'Contra la línea base', f'<p>{t}</p>')


for parte in ('ml02_1.py', 'ml02_2.py', 'ml02_3.py'):
    exec((HERE / parte).read_text(encoding='utf-8'))

body = ''.join(P)
check_ids(body)
build({"id": "ml02", "num": "ML02", "file": "ml02-comprados-juntos.html", "title": "«Comprados juntos» con filtrado colaborativo",
       "desc": "Filtrado colaborativo ítem a ítem sobre MovieLens: la matriz de co-ocurrencia con scipy, cuatro medidas (conteo, coseno, Jaccard y lift), el soporte mínimo, las 50 vecinas de cada película en Parquet y Redis, un recomendador que suma vecinas, y un informe contra la línea base de ML01 con intervalos por bootstrap.",
       "lead": "La página de una película dice «quienes vieron esta también vieron». Detrás hay una cuenta: cuántas personas tienen las dos en su lista. Construyes esa cuenta para todos los pares con una multiplicación de matrices dispersas, eliges cómo medirla, la guardas lista para servir y compruebas, con la partición por tiempo, si le gana a lo popular.",
       "block": "ML System Design", "time": "6 a 8 h", "mods": "M44, M53", "exercises": True}, body, 'ml02')
