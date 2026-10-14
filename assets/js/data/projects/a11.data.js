/* Decisiones guiadas de A11: un álbum de fotos con subida directa al almacén. */
SD.defineExercise('a11-album', {
  title: 'el álbum que no toca los bytes',
  scenario: '<p>Un álbum compartido entre ana (dueña), beto (sube) y carla (solo mira). Fotos de 3 a 12&#8239;MB y videos de hasta 2&#8239;GiB. La api firma URLs que valen 5 minutos para subir y 15 para ver; el navegador sube directo al almacén, local o Cloudflare R2, y un worker hace las miniaturas. Decide cómo se comporta cada pieza.</p>',
  steps: [
    {
      id: 'firma',
      type: 'single',
      prompt: 'La URL para subir lleva <code>ct=image%2Fjpeg</code>, <code>max=3481234</code>, <code>exp</code>, <code>kid</code> y <code>sig</code>. Alguien cambia <code>max</code> a mil millones y hace el <code>PUT</code>. ¿Qué responde el almacén?',
      options: [
        '413, porque el almacén compara el cuerpo con el <code>max</code> que trae la URL',
        '403 <code>BAD_SIGNATURE</code>: <code>max</code> está en la cadena firmada, junto con el método y la ruta',
        '200, porque la firma cubre el método y la ruta, y la query solo la lee la api',
        '403 <code>EXPIRED</code>, porque al cambiar la query el almacén recalcula el vencimiento'
      ],
      answer: 1,
      explain: 'La cadena canónica lleva el método, la ruta y todos los parámetros ordenados, salvo <code>sig</code>. Cambiar cualquiera de ellos cambia el HMAC, y el almacén verifica la firma antes de mirar el vencimiento o el tamaño. Vuelve al paso 3.'
    },
    {
      id: 'confirmar',
      type: 'single',
      prompt: 'El <code>PUT</code> terminó y la página llama a <code>POST /v1/photos/{id}/complete</code>. ¿De dónde saca la api el tamaño y el tipo que va a comprobar?',
      options: [
        'Del cuerpo de <code>complete</code>, que la página llena con lo que vio en <code>file.size</code> y <code>file.type</code>',
        'De la fila <code>pending</code>, porque el tamaño y el tipo quedaron firmados en la URL y nadie los pudo cambiar',
        'De un <code>HEAD</code> al almacén y de los primeros 16 bytes del objeto',
        'Del ETag que devolvió el <code>PUT</code>, que la página reenvía y que codifica tamaño y tipo'
      ],
      answer: 2,
      explain: 'La fila tiene lo que se declaró, no lo que llegó: con R2 un <code>PUT</code> firmado no tiene tope de tamaño. La api compara lo declarado con lo que dice el almacén: tamaño y Content-Type con un <code>HEAD</code>, y el formato con la firma de los primeros bytes. Si no cuadra, borra el objeto y la foto queda <code>rejected</code>. Vuelve al paso 7.'
    },
    {
      id: 'cors',
      type: 'single',
      prompt: 'Una persona copia una URL firmada para subir y la usa con <code>curl</code> desde su terminal. El almacén tiene CORS solo para <code>http://localhost:8080</code>. ¿Qué pasa?',
      options: [
        'El almacén la rechaza con 403, porque <code>curl</code> no manda <code>Origin</code> y CORS exige uno conocido',
        'Sube: CORS lo impone el navegador, no el almacén, y la firma vale durante sus 5 minutos',
        'El almacén responde al preflight con 403, y sin preflight aprobado no acepta el <code>PUT</code>',
        'Sube, pero el archivo queda marcado y la api lo rechaza al confirmar por venir de otro origen'
      ],
      answer: 1,
      explain: 'CORS le dice al navegador qué páginas pueden leer las respuestas de otro origen; <code>curl</code> no es un navegador, no hace preflight y no mira esos headers. Lo que protege al almacén es la firma: quien tiene una URL válida puede usarla hasta que vence. Por eso las URLs de subida valen pocos minutos y llevan el tamaño y el tipo dentro. Vuelve al paso 4.'
    },
    {
      id: 'partes',
      type: 'single',
      prompt: 'Un video de 1.2&#8239;GB va en partes de 8&#8239;MiB. Al confirmar, ¿quién dice qué partes se juntan?',
      options: [
        'El almacén: la api lista las partes que llegaron y comprueba que estén todas, sus tamaños y la suma',
        'La página: manda la lista de números y ETag que fue juntando, como en <code>CompleteMultipartUpload</code>',
        'La base: cada <code>PUT</code> de una parte la registra en una tabla <code>photo_parts</code> con su ETag',
        'Nadie: el almacén junta solo las partes cuando llega la última, y la api se entera por el ETag con <code>-N</code>'
      ],
      answer: 0,
      explain: 'La página no avisa a la api de cada parte, y lo que diga sobre las partes es lo que el cliente afirma. La api le pide la lista al almacén y comprueba que no falte ninguna (si faltan, <code>409 PARTS_MISSING</code> con sus números), que todas menos la última midan <code>part_size</code> y que la suma sea el tamaño declarado. Vuelve al paso 8.'
    },
    {
      id: 'bomba',
      type: 'single',
      prompt: 'Llega un PNG de pocos KB que mide 15&#8239;000 × 15&#8239;000 píxeles. El worker tiene 512&#8239;MB. ¿Qué hace?',
      options: [
        'Lo decodifica con submuestreo de 1 en 18, que lo deja en 834 × 834 sin pasar por la imagen entera',
        'Lo rechaza en <code>complete</code>: la api lee la cabecera con los 16 bytes y ve las dimensiones',
        'Lee el ancho y el alto de la cabecera y lo rechaza con <code>too_many_pixels</code> sin decodificarlo',
        'Lo intenta, muere por falta de memoria, y al sexto intento la foto queda <code>failed</code>'
      ],
      answer: 2,
      explain: '<code>ImageReader.getWidth</code> y <code>getHeight</code> leen solo la cabecera. 225 millones de píxeles pasan de los 40 millones permitidos, y la foto queda <code>rejected</code> sin tocar los píxeles. El submuestreo es la segunda defensa, para fotos permitidas; no conviene apostar a que cada formato lo respete. Los 16 bytes de <code>complete</code> solo dicen el formato, no las dimensiones. Vuelve al paso 9.'
    },
    {
      id: 'cache',
      type: 'single',
      prompt: 'Cada vez que alguien abre el álbum, la api lista las fotos con URLs firmadas para las miniaturas. ¿Cómo evitas que el navegador las baje de nuevo en cada recarga?',
      options: [
        'Firmar URLs de 7 días, el máximo, para que el navegador las guarde una semana entera',
        'Servir las miniaturas desde la api con <code>ETag</code>, y que el navegador pregunte con <code>If-None-Match</code>',
        'Firmarlas con un <code>exp</code> fijo en el año 2100, porque si la URL no cambia el navegador la reutiliza siempre',
        'Reutilizar la misma URL mientras le quede un tercio de vida, servida con <code>private, max-age=900</code>'
      ],
      answer: 3,
      explain: 'Una URL nueva en cada listado cambia el <code>exp</code>, y para el navegador es otro recurso. Guardar la URL firmada y repetirla durante 10 de sus 15 minutos permite usar la caché sin alargar la vida de una URL filtrada. Una URL de 7 días o sin vencimiento es justo lo que la firma corta busca evitar; servir desde la api es volver a pasar los bytes por ella. Vuelve al paso 10.'
    },
    {
      id: 'borrar',
      type: 'single',
      prompt: 'Borrar una foto toca la base y el almacén, y no hay una transacción que abarque los dos. ¿En qué orden?',
      options: [
        'Primero la fila y después los objetos: un corte deja un objeto huérfano que la limpieza encuentra',
        'Primero los objetos y después la fila: un corte deja la fila, y la página reintenta el borrado',
        'Marcar la fila como <code>deleting</code>, borrar los objetos y recién entonces borrar la fila',
        'Los dos a la vez en hilos separados, y si uno falla se deshace el otro con una compensación'
      ],
      answer: 0,
      explain: 'La regla de todo el proyecto es "nunca una fila que apunta a nada". Si se corta después de borrar la fila, queda un objeto que nadie ve y que la limpieza borra pasadas 24&#8239;h. Al revés, el álbum mostraría una foto con la miniatura rota hasta que alguien la reintente. El estado <code>deleting</code> funciona, pero agrega un estado y un barrido para cubrir el mismo caso. Vuelve al paso 13.'
    },
    {
      id: 'r2',
      type: 'multi',
      prompt: 'Pasas de <code>ALBUM_STORAGE=local</code> a <code>r2</code>. ¿Qué cambia? Marca todas las que correspondan.',
      options: [
        'Un <code>PUT</code> firmado ya no tiene tope de tamaño, y lo frena la confirmación',
        'El CORS se configura en el bucket, con el mismo origen, métodos y headers',
        'La api deja de revisar los primeros 16 bytes, porque R2 valida el Content-Type firmado',
        'Las URLs se firman con SigV4 y siguen sin pasar por la api',
        'La limpieza de multipart abandonados la hace la regla de ciclo de vida del bucket'
      ],
      answer: [0, 1, 3, 4],
      explain: 'R2 no acepta un límite de tamaño en un <code>PUT</code> firmado, así que lo que antes cortaba el almacén lo rechaza la api al confirmar con <code>size_mismatch</code>. El Content-Type firmado obliga a mandar ese header, pero no prueba que los bytes sean una imagen: los 16 bytes siguen haciendo falta. CORS y ciclo de vida pasan a ser configuración del bucket. Vuelve al paso 12.'
    }
  ],
  solution: '<ul>' +
    '<li>La api no toca los bytes: decide quién sube qué, crea la fila <code>pending</code> y firma una URL con método, ruta, tipo, tamaño y vencimiento dentro del HMAC.</li>' +
    '<li>El almacén verifica la firma antes que nada, en tiempo constante, y con varias claves para rotar sin cortar. CORS solo le habla al navegador.</li>' +
    '<li>Confirmar pregunta al almacén: <code>HEAD</code> y 16 bytes. Lo que no cuadra se borra y queda <code>rejected</code>. Confirmar dos veces da lo mismo.</li>' +
    '<li>Los archivos grandes van en partes de 8&#8239;MiB con URLs por lotes, se retoman con la lista del almacén y se juntan con esa misma lista.</li>' +
    '<li>Las miniaturas las hace un worker con lease, que lee la cabecera antes de decodificar, submuestrea y no reintenta los archivos malos.</li>' +
    '<li>Ver usa URLs de 15 minutos reutilizadas; descargar, un 302 a una URL de 60&#8239;s con <code>attachment</code>.</li>' +
    '<li>Cada orden de escrituras deja una basura conocida, y la limpieza y el ciclo de vida del almacén la barren.</li>' +
    '</ul>'
});
