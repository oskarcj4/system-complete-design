SD.defineQuiz('m73', {
  title: 'Quiz: el navegador por dentro', pass: 0.7,
  questions: [
    { id: 'ver-php', type: 'single',
      prompt: 'Abres DevTools en una página hecha con PHP y miras la respuesta en Network. ¿Qué ves?',
      options: [
        'El script PHP completo, porque Apache lo manda junto al HTML para que el navegador lo interprete',
        'El HTML que imprimió PHP con echo; el script y sus consultas se quedan en el servidor',
        'Una versión compilada de PHP en bytecode, que el navegador traduce a HTML al recibirla',
        'Solo las variables de PHP que se marcaron como públicas en el script del servidor'
      ],
      answer: 1,
      explain: 'PHP corre en el servidor y lo que imprime es la respuesta. El navegador recibe ese resultado; el script, el .env y las consultas se quedan en el servidor, salvo que una mala configuración los sirva como archivos (WEB01). Repasa 73.7.' },
    { id: 'title', type: 'single',
      prompt: 'El parser recibe <code>&lt;title&gt;&lt;b&gt;Ofertas&lt;/b&gt;&lt;/title&gt;</code>. ¿Qué queda dentro de <code>title</code>?',
      options: [
        'Un elemento b con el texto Ofertas, que el navegador muestra en negrita en la pestaña',
        'Nada: el parser descarta el contenido porque title no admite elementos hijos',
        'Un nodo de texto con los signos de menor y mayor tal cual, porque ahí el tokenizer no reconoce etiquetas',
        'Un error de parseo que detiene la construcción del documento hasta que se corrija el HTML'
      ],
      answer: 2,
      explain: 'Dentro de title y textarea el tokenizer está en un modo donde todo es texto (RCDATA). El mismo string sería marcado dentro de un div. Eso es un contexto, y escapar bien es escapar para el contexto. Repasa 73.2.' },
    { id: 'inner', type: 'single',
      prompt: 'Un frontend pinta la descripción de una oferta, escrita por un reclutador. ¿Cuál de estas líneas no deja que esa descripción agregue elementos a la página?',
      options: [
        '<code>el.innerHTML = o.descripcion</code>, porque el navegador escapa solo lo que viene de un JSON',
        '<code>el.insertAdjacentHTML("beforeend", o.descripcion)</code>, porque agrega al final sin reemplazar',
        '<code>el.textContent = o.descripcion</code>',
        '<code>el.outerHTML = o.descripcion</code>, porque reemplaza el nodo completo y descarta lo anterior'
      ],
      answer: 2,
      explain: 'textContent crea un nodo de texto y no llama al parser. innerHTML, insertAdjacentHTML y outerHTML le pasan el string al parser, que crea los elementos que describa: así entra un XSS almacenado. Repasa 73.3.' },
    { id: 'orden', type: 'single', fixed: true,
      prompt: '<code>console.log(1); setTimeout(() =&gt; console.log(2), 0); Promise.resolve().then(() =&gt; console.log(3)); console.log(4);</code> ¿Qué se imprime?',
      options: ['1, 2, 3, 4', '1, 4, 2, 3', '1, 4, 3, 2', '1, 3, 4, 2'],
      answer: 2,
      explain: 'Primero termina la tarea actual (1 y 4). Después se vacían las microtareas (el then: 3). El setTimeout es una tarea nueva y espera a la siguiente vuelta del event loop (2). Repasa 73.5.' },
    { id: 'congela', type: 'single',
      prompt: 'Al filtrar el feed, un clic corre un bucle que tarda 3 segundos. ¿Qué pasa durante esos 3 segundos?',
      options: [
        'La página responde a otros clics, porque cada evento corre en su propio hilo del navegador',
        'Nada se pinta ni responde: el JavaScript de la página y el render comparten un hilo',
        'El navegador mueve el bucle a un Web Worker automáticamente cuando detecta que tarda mucho',
        'Solo se congela el elemento que recibió el clic'
      ],
      answer: 1,
      explain: 'El event loop corre una tarea entera antes de pintar o atender otra. Una tarea larga congela todo; el ReDoS de M83 usa justamente eso. La salida es partir el trabajo o moverlo a un Web Worker a mano. Repasa 73.5.' },
    { id: 'isolation', type: 'single',
      prompt: '¿De qué te protege Site Isolation?',
      options: [
        'De que un script ajeno que logró correr en tu página lea tu DOM o tus cookies sin HttpOnly',
        'De que cualquier request de otro sitio llegue a tu servidor con las cookies del usuario',
        'De que una página comprometida de otro sitio tenga en su memoria los datos de tu sitio',
        'De que un atacante cambie el JavaScript de tu página con DevTools en su propia máquina'
      ],
      answer: 2,
      explain: 'Site Isolation separa sitios en procesos distintos: lo que un renderer comprometido puede leer de su memoria es solo de su sitio. No protege a tu página de un script que corre dentro de ella (XSS), ni decide qué requests salen (CSRF). Repasa 73.6.' },
    { id: 'controla', type: 'multi',
      prompt: '¿Qué puede cambiar a voluntad quien usa el navegador? Marca todas.',
      options: [
        'Un campo oculto <code>creado_por</code> en el formulario',
        'La consulta SQL que ejecuta el modelo <code>Oportunidades</code>',
        'Las cabeceras y el body de una request a la API',
        'El valor de <code>COOKIE_KEY</code> con el que el servidor firma la sesión',
        'El DOM de la página y el JavaScript que corre en ella'
      ],
      answer: [0, 2, 4],
      explain: 'Todo lo que llegó al navegador, y toda request que sale de él, lo controla quien lo usa. La consulta y la clave que firma la cookie viven en el servidor. Por eso creado_por tiene que salir de la sesión firmada. Repasa 73.8.' },
    { id: 'validar', type: 'single',
      prompt: 'El formulario de una oferta valida que la fecha de cierre no esté en el pasado. ¿Hace falta validarla también en PHP?',
      options: [
        'Sí: la validación del navegador es comodidad, y una request hecha a mano no pasa por ella',
        'No, si el input es de tipo date',
        'No, si el JavaScript está minificado, porque entonces nadie puede leer ni cambiar la regla',
        'Solo si la API acepta requests de otros orígenes; desde el mismo origen la regla ya se cumplió'
      ],
      answer: 0,
      explain: 'Con curl o con Copy as cURL se manda cualquier body sin pasar por el formulario. Minificar no esconde nada y el origen no cambia quién escribe la request. El servidor valida siempre; el navegador valida para avisar antes. Repasa 73.8 y 73.9.' },
    { id: 'wasm', type: 'single',
      prompt: 'Un equipo compila una librería de C a WebAssembly para usarla en el navegador. ¿Con qué permisos corre?',
      options: [
        'Con los permisos del sistema operativo, porque es código nativo compilado y no JavaScript',
        'Con los mismos de la página: corre en el motor del renderer, con su sandbox y sus reglas',
        'Con permiso de leer el disco, para cargar sus datos',
        'En un proceso propio con más privilegios, separado del renderer de la página que lo cargó'
      ],
      answer: 1,
      explain: 'Wasm corre dentro del motor de JavaScript del renderer, con la misma caja y la misma Same-Origin Policy. No suma permisos; lo que sí puede traer son los errores de memoria de C dentro de su propia memoria (M85). Repasa 73.7.' }
  ]
});
