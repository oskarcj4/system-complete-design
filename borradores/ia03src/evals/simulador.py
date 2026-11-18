"""Un modelo hace del cliente. Escribe el siguiente mensaje, o ###FIN cuando terminó (o se cansó)."""
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from soporte.grafo import texto_de

FIN = "###FIN"
SISTEMA = """Haces de cliente de una tienda en línea para probar a su soporte. {objetivo}
Escribe solo tu siguiente mensaje, corto, en español, como lo escribiría una persona.
No inventes números de pedido distintos de los de tu objetivo.
Cuando consigas lo que querías, o te digan que no dos veces, o una persona del equipo lo vaya a revisar,
responde exactamente {fin}."""


def siguiente(modelo, objetivo: str, conversacion: list[tuple[str, str]]) -> str:
    # Al revés que en el soporte: las respuestas del agente son lo que el simulador "oye".
    mensajes = [SystemMessage(SISTEMA.format(objetivo=objetivo, fin=FIN))]
    for autor, texto in conversacion:
        mensajes.append(AIMessage(texto) if autor == "cliente" else HumanMessage(texto))
    if len(mensajes) == 1:
        mensajes.append(HumanMessage("(El chat de soporte se abre. Escribe tu primer mensaje.)"))
    return texto_de(modelo.invoke(mensajes)).strip()
