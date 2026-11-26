from docs.buscar import Encontrado
from docs.responder import Cita, Respuesta
from docs.verificar import verificar

TROZOS = [Encontrado(1, "m08", "por-que-27", "Resiliencia · Por qué 27",
                     "Si cada una de tres capas reintenta tres veces, a la base le llegan 27 intentos por request.")]
FRASE = "a la base le llegan 27 intentos por request"


def respuesta(texto, *citas, sin=False):
    return Respuesta(respuesta=texto, citas=[Cita(cita=c, frase=f) for c, f in citas], sin_respuesta=sin)


def test_una_cita_con_su_frase_vale():
    v = verificar(respuesta("Se multiplican [m08#por-que-27].", ("m08#por-que-27", FRASE)), TROZOS)
    assert v.ok and v.validas == ["m08#por-que-27"]


def test_mayusculas_comillas_y_espacios_no_importan():
    frase = "«A la base   le llegan 27 intentos por request»."
    assert verificar(respuesta("[m08#por-que-27]", ("m08#por-que-27", frase)), TROZOS).ok


def test_una_cita_que_no_se_recupero_no_vale():
    v = verificar(respuesta("[m08#breaker]", ("m08#breaker", FRASE)), TROZOS)
    assert v.invalidas == [("m08#breaker", "no es de ningún trozo recuperado")]


def test_una_frase_parafraseada_no_vale():
    v = verificar(respuesta("[m08#por-que-27]", ("m08#por-que-27", "la base recibe 27 llamadas por cada request")), TROZOS)
    assert v.invalidas == [("m08#por-que-27", "la frase no aparece en el trozo")]


def test_una_frase_de_dos_palabras_no_alcanza():
    v = verificar(respuesta("[m08#por-que-27]", ("m08#por-que-27", "27 intentos")), TROZOS)
    assert not v.ok


def test_una_cita_en_el_texto_sin_frase_no_vale():
    v = verificar(respuesta("Se multiplican [m08#por-que-27] [m08#colas].", ("m08#por-que-27", FRASE)), TROZOS)
    assert v.invalidas == [("m08#colas", "está en la respuesta y no tiene frase")]


def test_responder_sin_citas_no_vale_pero_abstenerse_si():
    assert not verificar(respuesta("Se multiplican."), TROZOS).ok
    assert verificar(respuesta("No está en la documentación.", sin=True), TROZOS).ok
