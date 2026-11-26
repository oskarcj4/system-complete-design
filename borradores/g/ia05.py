from pathlib import Path
from lib import *

SRC = ROOT / 'borradores' / 'ia05src'
HERE = Path(__file__).resolve().parent


def rd(p):
    return (SRC / p).read_text(encoding='utf-8')


P = []
add = P.append
IA0 = 'ia00-laboratorio.html'
IA1 = 'ia01-agente-guardia.html'
IA2 = 'ia02-analista.html'
IA3 = 'ia03-soporte.html'
IA4 = 'ia04-revisor.html'
M16 = '../modules/m16-context-windows.html'
M17 = '../modules/m17-api-streaming.html'
M20 = '../modules/m20-producto-chatgpt.html'
M22 = '../modules/m22-operar-modelos.html'
M25 = '../modules/m25-agentes.html'
M45 = '../modules/m45-recuperacion.html'
M46 = '../modules/m46-ranking.html'
M72 = '../modules/m72-evals-agentes.html'
M05 = '../modules/m05-bases-de-datos.html'
RR = '<span class="no-autolink">re-ranking</span>'
RRer = '<span class="no-autolink">re-ranker</span>'


def ep(m, path, desc, req, resp, codes, lang='json'):
    lis = '\n'.join(f'      <li><span class="st st--{c[0]}xx">{c}</span><span>{t}</span></li>' for c, t in codes)
    return ('<div class="endpoint">\n  <div class="ep-head">\n'
            f'    <span class="ep-method" data-m="{m}">{m}</span>\n    <code class="ep-path">{path}</code>\n  </div>\n'
            f'  <p class="ep-desc">{desc}</p>\n  <div class="ep-body">\n    <p class="ep-sec">Request</p>\n'
            + code('http', req) + '    <p class="ep-sec">Respuesta</p>\n' + code(lang, resp)
            + f'    <p class="ep-sec">Códigos de respuesta</p>\n    <ul class="ep-responses">\n{lis}\n    </ul>\n  </div>\n</div>\n')


def comparar(t):
    return callout('tradeoff', 'Claude y Ollama', f'<p>{t}</p>')


for parte in ('ia05_1.py', 'ia05_2.py', 'ia05_3.py', 'ia05_4.py'):
    exec((HERE / parte).read_text(encoding='utf-8'))

body = ''.join(P)
check_ids(body)
build({"id": "ia05", "num": "IA05", "file": "ia05-docs.html", "title": "Preguntas a la documentación, con evals",
       "desc": "Un RAG sobre las páginas de este curso: troceado por sección y fijo, embeddings locales en pgvector con HNSW, búsqueda por palabras en español, fusión con RRF, re-ranking opcional, respuestas con citas que se comprueban sin modelo y evals en dos capas, con un juez calibrado contra tus etiquetas y el kappa de Cohen.",
       "lead": "Responder una pregunta con un LLM y unos trozos de documentación es fácil. Lo difícil es saber si responde bien, y qué pasa cuando cambias el troceado, la búsqueda o el modelo. Construyes un workflow que busca, responde con citas y las comprueba, y lo mides en dos capas: si la búsqueda trae la sección correcta, sin tokens, y si la respuesta es correcta, con un juez al que primero le tomas examen.",
       "block": "AI Engineering", "time": "8 a 10 h", "mods": "M16, M22, M17", "exercises": True}, body, 'ia05')
