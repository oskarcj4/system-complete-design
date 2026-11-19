"""Comprueba las citas sin modelo: que cada una sea de un trozo recuperado y que su frase esté en ese trozo.

No comprueba que la respuesta sea verdad: comprueba que lo citado existe. Una cita válida sobre un trozo
equivocado pasa. Eso lo mide el juez.
"""
import re
import unicodedata
from dataclasses import dataclass, field

from docs.responder import Respuesta

EN_TEXTO = re.compile(r"\[([a-z0-9-]+#[a-z0-9-]+)\]")
COMILLAS = str.maketrans({c: " " for c in "\"'“”‘’«»`"})
MIN_PALABRAS = 5


def normalizar(t: str) -> str:
    """Minúsculas, sin comillas ni espacios de más, con las letras en su forma compuesta (NFC)."""
    t = unicodedata.normalize("NFC", t).lower().translate(COMILLAS)
    return " ".join(t.split()).strip(" .,;:")


@dataclass
class Verificacion:
    validas: list[str] = field(default_factory=list)
    invalidas: list[tuple[str, str]] = field(default_factory=list)     # (cita, motivo)

    @property
    def ok(self) -> bool:
        return not self.invalidas


def verificar(r: Respuesta, trozos) -> Verificacion:
    v = Verificacion()
    textos: dict[str, list[str]] = {}
    for e in trozos:
        textos.setdefault(e.cita, []).append(normalizar(f"{e.titulo}\n{e.texto}"))
    if r.sin_respuesta:
        if r.citas:
            v.invalidas.append(("-", "dice que no hay respuesta y trae citas"))
        return v
    for c in r.citas:
        frase = normalizar(c.frase)
        if c.cita not in textos:
            v.invalidas.append((c.cita, "no es de ningún trozo recuperado"))
        elif len(frase.split()) < MIN_PALABRAS:
            v.invalidas.append((c.cita, f"la frase tiene menos de {MIN_PALABRAS} palabras"))
        elif not any(frase in t for t in textos[c.cita]):
            v.invalidas.append((c.cita, "la frase no aparece en el trozo"))
        else:
            v.validas.append(c.cita)
    declaradas = {c.cita for c in r.citas}
    for usada in dict.fromkeys(EN_TEXTO.findall(r.respuesta)):
        if usada not in declaradas:
            v.invalidas.append((usada, "está en la respuesta y no tiene frase"))
    if not r.citas:
        v.invalidas.append(("-", "responde sin ninguna cita"))
    return v
