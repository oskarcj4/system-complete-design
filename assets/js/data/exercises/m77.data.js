SD.defineExercise('m77-feed', {
  title: 'cerrar el XSS del feed de oportunidades',
  scenario: '<p>El frontend del sistema muestra un feed de oportunidades. Hoy arma cada fila con <code>lista.innerHTML += `&lt;li&gt;${o.titulo}&lt;/li&gt;`</code>, enlaza el sitio web de la institución con un <code>href</code> y la API responde sin <code>Content-Type</code>. Los reclutadores quieren poder escribir la descripción con negritas y listas. Decide cada arreglo.</p>',
  steps: [
    { id: 'titulo', type: 'single',
      prompt: '¿Cómo muestras el título de cada oportunidad?',
      options: [
        'Con innerHTML, después de quitar las etiquetas script con una regex',
        'Con createElement y textContent, porque el título es solo texto',
        'Con innerHTML, porque la API lo guardó con una consulta preparada',
        'Con DOMPurify, para permitir negritas también en el título'
      ],
      answer: 1,
      explain: 'El título no necesita formato: es texto. La regex no reproduce el parser y la consulta preparada no cambia el texto. DOMPurify sobra donde no hace falta HTML.' },
    { id: 'desc', type: 'single',
      prompt: '¿Y la descripción con negritas y listas?',
      options: [
        'DOMPurify en el navegador, con pocas etiquetas, justo antes de insertar',
        'htmlspecialchars en el servidor al guardarla, y innerHTML en el frontend',
        'Una regex que deja solo b, i, ul y li, aplicada en PHP antes de guardar',
        'DOMPurify en el servidor, y después reemplazar los saltos de línea con un string'
      ],
      answer: 0,
      explain: 'Se sanitiza con el parser del navegador que muestra el resultado, y sin procesar la salida (mutation XSS). Escapar al guardar borra el formato; una regex no sanitiza HTML.' },
    { id: 'sitio', type: 'single',
      prompt: 'El campo <code>sitio_web</code> de la institución va en un <code>href</code>. ¿Qué haces?',
      options: [
        'Escapar con htmlspecialchars y ENT_QUOTES; con eso basta en un atributo',
        'Ponerlo con textContent dentro del enlace en lugar de usarlo en el href',
        'Aceptar solo los esquemas http y https, al guardarlo y otra vez al imprimirlo',
        'Agregar rel="noopener", que impide que el enlace ejecute JavaScript'
      ],
      answer: 2,
      explain: 'El escape HTML no cambia javascript:. Hace falta una lista de esquemas: al guardar, para no aceptar basura, y al imprimir, porque la base puede traer datos viejos. noopener corta window.opener, no los esquemas.' },
    { id: 'api', type: 'single',
      prompt: '¿Qué cambia en <code>Response::json</code>?',
      options: [
        'Nada: la API solo devuelve JSON y el XSS es asunto del frontend',
        'Declarar Content-Type: application/json, sumar nosniff y JSON_HEX_TAG',
        'Escapar cada campo con htmlspecialchars antes de json_encode',
        'Envolver el JSON en un comentario HTML para que no se ejecute'
      ],
      answer: 1,
      explain: 'Sin Content-Type, PHP responde text/html y abrir la URL ejecuta el título. Escapar con HTML en el JSON corrompe los datos para todo cliente que no sea HTML.' },
    { id: 'tt', type: 'single',
      prompt: '¿Cómo despliegas Trusted Types sin romper el feed?',
      options: [
        'Directo en modo bloqueo: lo que se rompa era inseguro de todos modos',
        'No hace falta: con textContent y DOMPurify ya no queda ningún sumidero',
        'Solo en desarrollo, porque en producción ralentiza cada innerHTML',
        'En report-only primero, hasta que no quede un sumidero con string'
      ],
      answer: 3,
      explain: 'Report-only muestra cada sumidero que recibe un string sin romper la página. Trusted Types protege del innerHTML que alguien agregue mañana, no solo del de hoy.' }
  ],
  solution: '<ul><li>Título e institución con <code>createElement</code> y <code>textContent</code>.</li><li>Descripción con <code>DOMPurify.sanitize</code> en el navegador, etiquetas <code>b, i, ul, ol, li, p</code> y ningún atributo.</li><li><code>sitio_web</code> validado con lista de esquemas al guardar y con <code>url()</code> al imprimir.</li><li><code>Response::json</code> con <code>Content-Type: application/json</code>, <code>nosniff</code> y <code>JSON_HEX_TAG</code>.</li><li>Trusted Types en report-only con una política <code>feed</code>, y después en bloqueo (M78).</li></ul>'
});
