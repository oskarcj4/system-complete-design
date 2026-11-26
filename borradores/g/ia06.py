from pathlib import Path
from lib import *

SRC = ROOT / 'borradores' / 'ia06src'
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
IA5 = 'ia05-docs.html'
M05 = '../modules/m05-bases-de-datos.html'
M08 = '../modules/m08-resiliencia.html'
M24 = '../modules/m24-voz-tiempo-real.html'
M25 = '../modules/m25-agentes.html'
M72 = '../modules/m72-evals-agentes.html'
REF = '<span class="badge badge--ref">Diseño de referencia</span>'
DOC = '<span class="badge badge--doc">Documentado</span>'


def comparar(t):
    return callout('tradeoff', 'Claude y Ollama', f'<p>{t}</p>')


for parte in ('ia06_1.py', 'ia06_2.py', 'ia06_3.py', 'ia06_4.py'):
    exec((HERE / parte).read_text(encoding='utf-8'))

body = ''.join(P)
check_ids(body)
build({"id": "ia06", "num": "IA06", "file": "ia06-voz.html", "title": "Un agente de voz",
       "desc": "Un agente que agenda citas por voz: el navegador hace de teléfono por WebRTC, Pipecat une Silero, Whisper, Claude u Ollama y Piper en una tubería en streaming, las interrupciones dejan en la historia solo lo que sonó, la reserva se confirma en voz alta y la base impide dos citas a la misma hora.",
       "lead": "Un agente de voz tiene el mismo bucle de herramientas que uno de texto, con dos problemas que el texto no tiene. Todo tiene que pasar en menos de un segundo, y la persona puede hablar encima. Construyes la recepción de un consultorio que oye, consulta la agenda, propone una hora, la confirma en voz alta y reserva, y mides en cada turno cuánto tardó cada parte.",
       "block": "AI Engineering", "time": "10 a 12 h", "mods": "M24, M25", "exercises": True}, body, 'ia06')
