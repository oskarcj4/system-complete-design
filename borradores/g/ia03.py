from pathlib import Path
from lib import *

SRC = ROOT / 'borradores' / 'ia03src'
HERE = Path(__file__).resolve().parent


def rd(p):
    return (SRC / p).read_text(encoding='utf-8')


P = []
add = P.append
IA0 = 'ia00-laboratorio.html'
IA1 = 'ia01-agente-guardia.html'
IA2 = 'ia02-analista.html'
M25 = '../modules/m25-agentes.html'
M27 = '../modules/m27-pagos-stripe.html'
M22 = '../modules/m22-operar-modelos.html'
M10 = '../modules/m10-seguridad.html'
M05 = '../modules/m05-bases-de-datos.html'
M18 = '../modules/m18-cuotas-tokens.html'
M39 = '../modules/m39-manejo-pagos.html'
M72 = '../modules/m72-evals-agentes.html'

for parte in ('ia03_1.py', 'ia03_2.py', 'ia03_3.py', 'ia03_4.py'):
    exec((HERE / parte).read_text(encoding='utf-8'))

body = ''.join(P)
check_ids(body)
build({"id": "ia03", "num": "IA03", "file": "ia03-soporte.html", "title": "Soporte que reembolsa",
       "desc": "Un soporte con LangGraph que clasifica cada mensaje, manda lo conocido a un workflow sin modelo y lo demás a un agente; lee los pedidos con row-level security, decide los reembolsos con una política escrita en código, pide aprobación por encima de 50 USD y le paga a un proveedor con una clave de idempotencia. Con Claude y un modelo local, pruebas sin modelo y evals con clientes simulados.",
       "lead": "Una tienda recibe cien mensajes al día: dónde está mi pedido, cambien la dirección, llegó roto. Construyes un soporte que contesta lo simple sin gastar un token, que deja al modelo lo que necesita leer y decidir, y que nunca reembolsa por decisión del modelo: la política está en código, la identidad sale de la sesión y el pago lleva una clave que impide cobrar dos veces.",
       "block": "AI Engineering", "time": "10 a 12 h", "mods": "M25, M27, M22, M10", "exercises": True}, body, 'ia03')
