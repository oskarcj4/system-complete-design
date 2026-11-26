"""La regla de la confirmación, en funciones puras.

El agente solo actúa si la persona oyó la propuesta entera y después dijo que sí. Las dos cosas se leen de la
historia de la conversación: en ella Pipecat guarda, de cada respuesta del agente, solo lo que llegó a sonar.
"""
import re
import unicodedata

SI = ("si", "claro", "confirmo", "dale", "correcto", "de acuerdo", "adelante", "esta bien",
      "perfecto", "hazlo", "ok", "okay", "por favor", "exacto", "eso es")
NO = ("no", "espera", "mejor no", "otro", "otra", "cambia", "cambiala", "todavia")


def normalizar(texto: str) -> str:
    """Minúsculas, sin tildes ni signos, con un espacio entre palabras. Conserva los dos puntos de '10:30'."""
    descompuesto = unicodedata.normalize("NFD", texto.lower())
    sin_tildes = "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")
    return " ".join(re.sub(r"[^a-z0-9:]+", " ", sin_tildes).split())


def contiene(texto: str, frase: str) -> bool:
    """¿Está la frase entera, palabra por palabra? 'no' no se encuentra dentro de 'nombre'."""
    return f" {normalizar(frase)} " in f" {normalizar(texto)} "


def es_si(texto: str) -> bool:
    """Un sí claro. Si hay cualquier señal de no, gana el no: preguntar de nuevo cuesta menos que una cita mal puesta."""
    if any(contiene(texto, n) for n in NO):
        return False
    return any(contiene(texto, s) for s in SI)


def texto_de(mensaje: dict) -> str:
    """El texto de un mensaje, venga como cadena o como lista de partes."""
    contenido = mensaje.get("content")
    if isinstance(contenido, str):
        return contenido
    if isinstance(contenido, list):
        return " ".join(p.get("text", "") for p in contenido if isinstance(p, dict))
    return ""


def escucho(dicho: str, piezas: tuple[str, ...]) -> bool:
    """¿Sonaron todas las piezas de la propuesta? Si la persona interrumpió a la mitad, falta alguna."""
    return all(contiene(dicho, p) for p in piezas)


def puede_confirmar(mensajes: list[dict], propuesta) -> tuple[bool, str]:
    """(True, 'ok') o (False, el motivo que vuelve al modelo para que sepa qué hacer)."""
    if propuesta is None:
        return False, "No hay nada que confirmar. Llama primero a proponer_reserva o a proponer_cancelacion."
    leida = None
    for i in range(propuesta.desde, len(mensajes)):
        m = mensajes[i]
        if m.get("role") == "assistant" and escucho(texto_de(m), propuesta.piezas):
            leida = i
    if leida is None:
        return False, "La persona no oyó la propuesta entera. Léela de nuevo, completa, y espera su respuesta."
    respuestas = [texto_de(m) for m in mensajes[leida + 1:] if m.get("role") == "user" and texto_de(m).strip()]
    if not respuestas:
        return False, "La persona todavía no respondió. Espera a que diga que sí."
    if not es_si(respuestas[-1]):
        return False, f"La persona no dijo que sí (dijo: {respuestas[-1]!r}). Pregúntale qué quiere cambiar."
    return True, "ok"
