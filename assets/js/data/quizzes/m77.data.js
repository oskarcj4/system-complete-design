SD.defineQuiz('m77', {
  title: 'Quiz: XSS y el DOM', pass: 0.7,
  questions: [
    { id: 'dom', type: 'single',
      prompt: 'Un XSS toma el valor de <code>location.hash</code> y lo pone con <code>innerHTML</code>. ¿Por qué el WAF del servidor no lo ve?',
      options: [
        'Porque el WAF solo revisa los métodos POST y este ataque usa un GET',
        'Porque el fragmento después de # no viaja al servidor',
        'Porque innerHTML cifra el valor antes de insertarlo en la página',
        'Porque el navegador quita los caracteres especiales del hash antes de pedir'
      ],
      answer: 1,
      explain: 'El fragmento se queda en el navegador: el XSS basado en el DOM nunca pasa por el servidor. Repasa 77.1 y 77.5.' },
    { id: 'href', type: 'single',
      prompt: 'Imprimes el sitio web de una institución con <code>href="&lt;?= htmlspecialchars($url, ENT_QUOTES) ?&gt;"</code>. ¿Qué valor sigue ejecutando código?',
      options: [
        '<code>"&gt;&lt;script&gt;alert(1)&lt;/script&gt;</code>',
        '<code>javascript:alert(document.domain)</code>',
        '<code>\' onmouseover=\'alert(1)</code>',
        '<code>&lt;img src=x onerror=alert(1)&gt;</code>'
      ],
      answer: 1,
      explain: 'El escape HTML no cambia ningún carácter de javascript:. En un href hace falta además una lista de esquemas. Repasa 77.2 y 77.3.' },
    { id: 'php80', type: 'single',
      prompt: 'En PHP 8.0, ¿qué deja abierto <code>htmlspecialchars($v)</code> sin flags?',
      options: [
        'El cuerpo HTML, porque no escapa el signo menor que',
        'Los atributos con comillas dobles, porque no escapa la comilla doble',
        'Los atributos con comillas simples, porque usa ENT_COMPAT',
        'Nada: en PHP 8.0 los flags por defecto ya incluyen ENT_QUOTES'
      ],
      answer: 2,
      explain: 'Antes de PHP 8.1, el defecto era ENT_COMPAT, que no escapa la comilla simple. Pasa los flags siempre. Repasa 77.3.' },
    { id: 'guardar', type: 'single',
      prompt: '¿Cuándo se escapa un dato?',
      options: [
        'Al guardarlo en la base, así cada salida ya lo recibe limpio',
        'Al imprimirlo, con el escape del contexto donde cae',
        'Dos veces, al guardar y al imprimir, para tener defensa en profundidad',
        'Solo en el frontend, porque el servidor de una API nunca genera HTML'
      ],
      answer: 1,
      explain: 'Guardar escapado ata el dato a un contexto y termina en doble escape. La base guarda lo que escribió la persona. Repasa el trade-off de 77.3.' },
    { id: 'ctype', type: 'single',
      prompt: 'La API devuelve el JSON de una oportunidad sin cabecera Content-Type, y el título trae <code>&lt;img src=x onerror=…&gt;</code>. ¿Qué pasa al abrir la URL en el navegador?',
      options: [
        'Nada, porque json_encode escapa los signos menor y mayor que',
        'Nada, porque la consulta preparada ya limpió el texto al guardarlo',
        'Se ejecuta: PHP responde text/html y el navegador crea la etiqueta',
        'El navegador descarga el archivo, porque no sabe qué tipo de contenido es'
      ],
      answer: 2,
      explain: 'El tipo por defecto de PHP es text/html, json_encode no escapa &lt; sin JSON_HEX_TAG y la consulta preparada guarda el texto tal cual. Repasa 77.4.' },
    { id: 'sinks', type: 'multi',
      prompt: '¿Cuáles de estos son sumideros peligrosos si reciben un dato del usuario? Marca todos.',
      options: [
        '<code>el.innerHTML = v</code>',
        '<code>el.textContent = v</code>',
        '<code>setTimeout(v, 100)</code> con un string',
        '<code>a.href = v</code> sin validar el esquema'
      ],
      answer: [0, 2, 3],
      explain: 'innerHTML parsea HTML, setTimeout con string evalúa código y un href acepta javascript:. textContent siempre crea texto. Repasa 77.5.' },
    { id: 'mxss', type: 'single',
      prompt: '¿Qué es el mutation XSS?',
      options: [
        'Un XSS almacenado que el atacante modifica después de que se guarda en la base',
        'Un payload que cambia de forma en cada request para que el WAF no lo reconozca',
        'HTML que pasa el sanitizador y cambia al re-parsearse en otro contexto',
        'Un XSS que modifica el DOM sin usar ninguna etiqueta script'
      ],
      answer: 2,
      explain: 'Sanitizar, serializar y volver a parsear produce otro árbol. Por eso no se procesa la salida del sanitizador y no se sanitiza con regex. Repasa 77.6.' },
    { id: 'tt', type: 'single',
      prompt: 'Con <code>require-trusted-types-for \'script\'</code>, ¿qué pasa con <code>el.innerHTML = "texto"</code>?',
      options: [
        'Lanza un TypeError: el sumidero solo acepta TrustedHTML',
        'El navegador lo sanitiza solo con su sanitizador interno',
        'Funciona, porque el string no contiene ninguna etiqueta HTML',
        'Se convierte en textContent de forma automática'
      ],
      answer: 0,
      explain: 'El sumidero rechaza cualquier string, tenga o no etiquetas. Solo acepta objetos de una política con nombre. Repasa 77.8.' },
    { id: 'clobber', type: 'single',
      prompt: 'Un sanitizador deja pasar <code>&lt;a id="config" …&gt;</code>. ¿Qué código de la página corre riesgo?',
      options: [
        'Cualquiera que use addEventListener sobre un enlace',
        'El que lee un global opcional como <code>window.config</code>',
        'El que llama a fetch con una URL escrita a mano en el código',
        'Ninguno, porque sin script no se puede cambiar el comportamiento'
      ],
      answer: 1,
      explain: 'Los elementos con id se exponen en window. Un global que puede no existir lo define el HTML inyectado. Repasa 77.9.' },
    { id: 'httponly', type: 'single',
      prompt: 'La cookie de sesión es HttpOnly. ¿Qué puede hacer igual un XSS?',
      options: [
        'Nada importante, porque sin la cookie no tiene la sesión de la víctima',
        'Leer la cookie con document.cookie si la página la pidió antes',
        'Llamar a la API como la víctima: el navegador agrega la cookie',
        'Solo mostrar un alert, porque CORS le impide hacer fetch a la API'
      ],
      answer: 2,
      explain: 'HttpOnly impide llevarse la cookie, no usarla. El código corre en tu origen, así que su fetch va con la cookie y lee la respuesta. Repasa 77.10.' }
  ]
});
