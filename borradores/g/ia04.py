from pathlib import Path
from lib import *

SRC = ROOT / 'borradores' / 'ia04src'
HERE = Path(__file__).resolve().parent


def rd(p):
    return (SRC / p).read_text(encoding='utf-8')


P = []
add = P.append
IA0 = 'ia00-laboratorio.html'
IA1 = 'ia01-agente-guardia.html'
IA2 = 'ia02-analista.html'
IA3 = 'ia03-soporte.html'
M25 = '../modules/m25-agentes.html'
M10 = '../modules/m10-seguridad.html'
M67 = '../modules/m67-extender-harness.html'
M66 = '../modules/m66-permisos-sandbox.html'
M71 = '../modules/m71-jailbreak-red-teaming.html'
M72 = '../modules/m72-evals-agentes.html'
M63 = '../modules/m63-tool-calling.html'
M05 = '../modules/m05-bases-de-datos.html'
M56 = '../modules/m56-supply-chain.html'


def ep(m, path, desc, req, resp, codes, lang='json'):
    lis = '\n'.join(f'      <li><span class="st st--{c[0]}xx">{c}</span><span>{t}</span></li>' for c, t in codes)
    return ('<div class="endpoint">\n  <div class="ep-head">\n'
            f'    <span class="ep-method" data-m="{m}">{m}</span>\n    <code class="ep-path">{path}</code>\n  </div>\n'
            f'  <p class="ep-desc">{desc}</p>\n  <div class="ep-body">\n    <p class="ep-sec">Request</p>\n'
            + code('http', req) + '    <p class="ep-sec">Respuesta</p>\n' + code(lang, resp)
            + f'    <p class="ep-sec">Códigos de respuesta</p>\n    <ul class="ep-responses">\n{lis}\n    </ul>\n  </div>\n</div>\n')


def comparar(t):
    return callout('tradeoff', 'Claude y Ollama', f'<p>{t}</p>')


for parte in ('ia04_1.py', 'ia04_2.py', 'ia04_3.py', 'ia04_4.py'):
    exec((HERE / parte).read_text(encoding='utf-8'))

body = ''.join(P)
check_ids(body)
build({"id": "ia04", "num": "IA04", "file": "ia04-revisor.html", "title": "Revisor de pull requests por MCP",
       "desc": "Un revisor de código que corre como host de MCP: un servidor MCP por Streamable HTTP con OAuth, que verifica la audiencia y el scope de cada token, lee una forja local con su propio token de solo lectura y deja comentarios en una cola que una persona aprueba antes de publicarlos. Seis pull requests, tres envenenados, con Claude y un modelo local, pruebas sin modelo y evals con pass^k.",
       "lead": "Un equipo quiere que un agente revise cada pull request. El agente lee código que escribió cualquiera, y ese código puede traer instrucciones. Construyes el revisor separado en tres procesos con tres credenciales distintas: el host habla con el modelo y no tiene ningún token de la forja; el servidor MCP lee con un token que no puede escribir y solo propone; y lo que se publica lo decide una persona con un token que solo comenta.",
       "block": "AI Engineering", "time": "10 a 12 h", "mods": "M25, M10, M67, M71", "exercises": True}, body, 'ia04')
