"""Un modelo falso que contesta con un guion: sin red, sin tokens y siempre lo mismo."""


class _Raw:
    def __init__(self, entrada: int, salida: int):
        self.usage_metadata = {"input_tokens": entrada, "output_tokens": salida}


class _Estructurado:
    def __init__(self, padre, esquema):
        self.padre, self.esquema = padre, esquema

    def invoke(self, mensajes):
        self.padre.llamadas.append((self.esquema.__name__, mensajes))
        if not self.padre.guion:
            raise AssertionError(f"El guion se terminó y se pidió un {self.esquema.__name__}.")
        salida = self.padre.guion.pop(0)
        return {"raw": _Raw(100, 10), "parsed": salida,
                "parsing_error": None if salida is not None else "no es JSON"}


class ModeloFalso:
    """Cada with_structured_output(...).invoke devuelve el siguiente elemento del guion (None: no se pudo leer)."""

    def __init__(self, guion):
        self.guion, self.llamadas = list(guion), []

    def with_structured_output(self, esquema, include_raw=False):
        assert include_raw, "el código lee los tokens de raw: tiene que pedir include_raw=True"
        return _Estructurado(self, esquema)
