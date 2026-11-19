"""La línea de comandos: bajar, indexar, buscar y preguntar."""
import argparse

from docs.config import CFG


def opciones_de(a):
    from docs.pipeline import Opciones
    return Opciones(modo=a.modo, estrategia=a.estrategia, prefijo=not a.sin_prefijo, n=a.n,
                    reordenar=getattr(a, "reordenar", False))


def cmd_bajar(a):
    from docs.bajar import bajar
    bajar(a.sitio)


def cmd_indexar(a):
    from docs.indexar import indexar
    indexar(a.estrategia, prefijo=not a.sin_prefijo)


def cmd_buscar(a):
    """Solo la búsqueda: sin modelo de chat y sin tokens. Sirve para ver qué llega antes de responder."""
    from docs import buscar
    o = opciones_de(a)
    with buscar.conectar() as c:
        for i, e in enumerate(buscar.buscar(c, a.pregunta, o.modo, o.estrategia, o.prefijo, o.n), 1):
            print(f"{i}. [{e.cita}] {e.titulo}\n   {e.texto[:140]!r}")


def cmd_preguntar(a):
    from docs import buscar
    from docs.modelos import modelo_chat
    from docs.pipeline import preguntar, recuperador
    o = opciones_de(a)
    with buscar.conectar() as c:
        r = preguntar(a.pregunta, o, modelo_chat(), recuperador(c))
    print(r.respuesta.respuesta, "\n")
    for cita in r.respuesta.citas:
        estado = "ok" if cita.cita in r.verificacion.validas else "NO VALE"
        print(f"  [{cita.cita}] {estado}: «{cita.frase}»")
    for cita, motivo in r.verificacion.invalidas:
        print(f"  {cita}: {motivo}")
    print(f"\n{' → '.join(r.pasos)}. Tokens {r.tokens_entrada} de entrada y {r.tokens_salida} de salida, "
          f"{r.costo(CFG.modelo):.4f} USD con {CFG.modelo}, {r.segundos:.1f} s")


def main() -> None:
    p = argparse.ArgumentParser(prog="docs")
    sub = p.add_subparsers(required=True)
    s = sub.add_parser("bajar", help="baja las páginas del curso a corpus/")
    s.add_argument("--sitio", required=True, help="la URL de la portada del curso")
    s.set_defaults(f=cmd_bajar)
    s = sub.add_parser("indexar", help="trocea, calcula embeddings y guarda una variante")
    s.add_argument("--estrategia", choices=["seccion", "fijo"], default="seccion")
    s.add_argument("--sin-prefijo", action="store_true")
    s.set_defaults(f=cmd_indexar)
    for nombre, funcion in (("buscar", cmd_buscar), ("preguntar", cmd_preguntar)):
        s = sub.add_parser(nombre)
        s.add_argument("pregunta")
        s.add_argument("--modo", choices=["lexica", "semantica", "hibrida"], default="hibrida")
        s.add_argument("--estrategia", choices=["seccion", "fijo"], default="seccion")
        s.add_argument("--sin-prefijo", action="store_true")
        s.add_argument("--n", type=int, default=6)
        if nombre == "preguntar":
            s.add_argument("--reordenar", action="store_true")
        s.set_defaults(f=funcion)
    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
