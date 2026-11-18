/* Decisiones guiadas de WEB05 (XSS en el feed). Formato en core/exercise.js. */

SD.defineExercise('web05-xss', {
  title: 'dónde se cierra un XSS en el sistema de prácticas',
  scenario: '<p>Un reclutador puede escribir lo que quiera en la descripción de una oferta, y la ven todos los estudiantes. Las URL de los documentos llegan de la base a un <code>href</code>. Vas a decidir dónde se neutraliza cada cosa. Son seis decisiones.</p>',
  steps: [
    {
      id: 'donde', type: 'single',
      prompt: '¿Dónde se neutraliza el HTML de la descripción de una oferta?',
      options: [
        'Al guardar: PHP le pasa htmlspecialchars antes del INSERT, y así la base solo tiene texto seguro.',
        'Al guardar: PHP borra las etiquetas con strip_tags, porque una descripción nunca necesita HTML.',
        'Al pintarlo, con el escape del contexto donde cae; la base guarda el texto tal cual.',
        'En los dos lados a la vez, para que si uno falla quede el otro como respaldo.'
      ],
      answer: 2,
      explain: 'El escape depende del contexto de salida: HTML, atributo, URL, un PDF o una app móvil. Escapar al guardar rompe los demás destinos (se ven <code>&amp;lt;</code> en un PDF) y escapar dos veces muestra basura en la web. <code>strip_tags</code> rompe textos legítimos como "a &lt; b". Está en <a href="#excusa-viaje">la figura WEB05.3</a>.'
    },
    {
      id: 'react', type: 'single',
      prompt: 'La descripción trae <code>&lt;img src=x onerror="console.log(1)"&gt;</code> y el componente la pinta con <code>{oportunidad.descripcion}</code>. ¿Qué pasa?',
      options: [
        'Se ve la etiqueta escrita como texto, porque React la pone en un nodo de texto.',
        'Corre el onerror, porque React solo escapa las etiquetas script y deja pasar los atributos.',
        'React lanza un error en Console y no pinta la tarjeta, porque detecta HTML en un string.',
        'Se ve una imagen rota sin ejecutar nada, porque React quita los atributos on* del HTML.'
      ],
      answer: 0,
      explain: 'Las llaves de JSX crean un nodo de texto: el navegador nunca interpreta ese string como HTML, así que no hay imagen ni atributos. React no filtra ni avisa; escapa. Lo compruebas en <a href="#paso-carga">el paso 1</a>.'
    },
    {
      id: 'react19', type: 'single',
      prompt: 'React 19 ya bloquea <code>javascript:</code> en un <code>href</code>. ¿Por qué agregar <code>enlaceSeguro()</code> igual?',
      options: [
        'Porque el bloqueo de React solo funciona en modo desarrollo y desaparece en el build de producción.',
        'Porque React no frena data: ni los sumideros que no son atributos, como window.open o location.',
        'Porque React bloquea el clic pero igual descarga la URL al pintar, y eso alcanza para ejecutarla.',
        'Porque el bloqueo de React no reconoce javascript: con mayúsculas ni con espacios adelante.'
      ],
      answer: 1,
      explain: 'La red de React es buena y vale en producción, pero cubre un esquema en atributos que React pinta. Una lista permitida de dos esquemas, comprobada con <code>new URL()</code>, cubre cualquier esquema y sirve también para <code>window.open</code>. Está en <a href="#paso-enlaces">el paso 2</a> y en la falla 2.'
    },
    {
      id: 'regex', type: 'single',
      prompt: '¿Por qué <code>enlaceSeguro</code> usa <code>new URL()</code> y no <code>/^javascript:/i</code>?',
      options: [
        'Porque new URL() es más rápida que una expresión regular cuando se llama en cada render.',
        'Porque la regex no puede reconocer el esquema de una URL que trae parámetros o un fragmento.',
        'Porque el navegador limpia la URL antes de leer el esquema, y la regex ve otra cosa que él.',
        'Porque new URL() descarga el destino y comprueba que sea un PDF real antes de aceptarlo.'
      ],
      answer: 2,
      explain: 'El parser quita espacios del principio y tabulaciones y saltos de línea de adentro: <code>"java\\tscript:"</code> es <code>javascript:</code> para el navegador. Con <code>new URL()</code>, la función ve lo mismo que el navegador. La prueba del <a href="#paso-prueba">paso 5</a> trae esos casos.'
    },
    {
      id: 'formato', type: 'single',
      prompt: 'Producto pide que la descripción respete los saltos de línea y, más adelante, negritas. ¿Qué haces hoy?',
      options: [
        'Pasar la descripción por una regex que deja solo <b>, <i> y <br>, y pintarla con dangerouslySetInnerHTML.',
        'Convertir Markdown a HTML en PHP al guardar, y pintarlo con dangerouslySetInnerHTML en el feed.',
        'Escapar con htmlspecialchars en PHP, cambiar los saltos por <br> y pintarlo como HTML en React.',
        'white-space: pre-line ahora; si piden formato, un sanitizador con lista permitida en un solo componente.'
      ],
      answer: 3,
      explain: 'Los saltos de línea se resuelven con CSS, sin interpretar nada. Si de verdad hace falta HTML, un sanitizador que use el parser (DOMPurify) en un único lugar, con la excepción de lint a la vista. Una regex pierde contra el parser (mutation XSS, M77), y el HTML generado al guardar vuelve a abrir la puerta. Está en <a href="#paso-formato">el paso 7</a>.'
    },
    {
      id: 'consecuencia', type: 'multi',
      prompt: 'Si a pesar de todo corre un script en <code>localhost:5173</code>, ¿qué puede hacer? Marca todas las correctas.',
      options: [
        'Llamar a la API como la víctima, también para escribir, porque apiFetch agrega el token.',
        'Leer la cookie de sesión con document.cookie y mandarla a otro servidor para usarla allá.',
        'Pasar la comprobación de Origin de WEB03, porque la request sale del origen permitido.',
        'Actuar como administrador aunque la víctima sea estudiante, porque el script corre con otros permisos.'
      ],
      answer: [0, 2],
      explain: 'El script es la persona para la API: usa su cookie sin leerla y su token desde la memoria, y sale del origen que WEB03 permite. No lee la cookie (<code>HttpOnly</code>) ni sube de rol: la API sigue aplicando los roles de la víctima. Está en <a href="#excusa">la figura WEB05.2</a>.'
    }
  ],
  solution: '<ul><li>El texto se escapa al pintarlo; React lo hace con las llaves de JSX y la base guarda el texto tal cual.</li><li>Las URL que vienen de datos pasan por <code>enlaceSeguro()</code>: absolutas, con <code>http</code> o <code>https</code>, comprobadas con <code>new URL()</code>.</li><li><code>react/no-danger</code> y <code>react/jsx-no-script-url</code> en <code>error</code> hacen que abrir la puerta rompa el lint.</li><li>La API responde <code>application/json</code> con <code>nosniff</code> desde WEB01, así que abierta como página no interpreta nada.</li><li>La segunda capa, si todo eso falla, es la CSP de WEB09.</li></ul>'
});
