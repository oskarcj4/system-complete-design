"""Una conversación en texto con las mismas herramientas y las mismas instrucciones que el bot de voz.

Sirve para medir lo que hace el modelo sin micrófono: el audio no cambia qué herramienta llama, y en texto
cada caso se repite igual. Lleva dos historias a la par: la de LangChain, que va al modelo, y la de dicts,
que reciben las herramientas, con la misma forma que el contexto de Pipecat.
"""
import json

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from voz.config import CFG
from voz.herramientas import HERRAMIENTAS, Sesion
from voz.modelos import MODELOS

POR_NOMBRE = {h["name"]: h for h in HERRAMIENTAS}
MAX_PASOS = 6   # llamadas al modelo por turno de la persona; más que eso es un bucle


def modelo_texto(proveedor: str = CFG.modelo):
    """El mismo modelo que en bot.py, ahora por LangChain, con las cuatro herramientas atadas."""
    if proveedor == "claude":
        m = init_chat_model(MODELOS["claude"], model_provider="anthropic", max_tokens=300, timeout=30, max_retries=2)
    elif proveedor == "ollama":
        m = init_chat_model(MODELOS["ollama"], model_provider="ollama", base_url=CFG.ollama, temperature=0)
    else:
        raise ValueError(f"Modelo desconocido: {proveedor}. Usa claude u ollama.")
    esquemas = [{"type": "function", "function": {
        "name": h["name"], "description": h["description"],
        "parameters": {"type": "object", "properties": h["properties"], "required": h["required"]}}}
        for h in HERRAMIENTAS]
    return m.bind_tools(esquemas)


class Charla:
    def __init__(self, modelo, instrucciones: str, sesion: Sesion):
        self.modelo, self.sesion = modelo, sesion
        self.mensajes = [SystemMessage(instrucciones)]
        self.historia: list[dict] = []
        self.llamadas: list[tuple[str, dict, dict]] = []   # (herramienta, argumentos, resultado)
        self.tokens = [0, 0]

    async def decir(self, texto: str) -> str:
        """Un turno de la persona. Devuelve lo que contestó el agente al final del turno."""
        self.mensajes.append(HumanMessage(texto))
        self.historia.append({"role": "user", "content": texto})
        for _ in range(MAX_PASOS):
            r = await self.modelo.ainvoke(self.mensajes)
            u = r.usage_metadata or {}
            self.tokens[0] += u.get("input_tokens", 0)
            self.tokens[1] += u.get("output_tokens", 0)
            self.mensajes.append(r)
            self.historia.append({"role": "assistant", "content": r.text})
            if not r.tool_calls:
                return r.text
            for llamada in r.tool_calls:
                h = POR_NOMBRE.get(llamada["name"])
                resultado = (await h["fn"](self.sesion, self.historia, llamada["args"]) if h
                             else {"error": f"No existe la herramienta {llamada['name']}."})
                self.llamadas.append((llamada["name"], llamada["args"], resultado))
                contenido = json.dumps(resultado, ensure_ascii=False)
                self.mensajes.append(ToolMessage(contenido, tool_call_id=llamada["id"]))
                self.historia.append({"role": "tool", "content": contenido})
        return "(el agente no terminó el turno)"

    def interrumpir(self, hasta: str) -> str:
        """Lo que hace Pipecat cuando la persona habla encima: del último texto del agente queda solo lo que sonó.
        Aquí sonó hasta antes de `hasta`; si no aparece, la mitad."""
        dicho = ""
        for i in range(len(self.mensajes) - 1, -1, -1):
            m = self.mensajes[i]
            if isinstance(m, AIMessage) and m.text and not m.tool_calls:
                corte = m.text.find(hasta)
                dicho = m.text[:corte] if corte > 0 else m.text[: len(m.text) // 2]
                self.mensajes[i] = AIMessage(dicho)
                break
        for d in reversed(self.historia):
            if d["role"] == "assistant" and d["content"]:
                d["content"] = dicho
                break
        return dicho
