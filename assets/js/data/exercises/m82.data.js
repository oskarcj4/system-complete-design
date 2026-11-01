SD.defineExercise('m82-vista', {
  title: 'la vista previa de una oportunidad',
  scenario: '<p>Los reclutadores pegan la URL de la oferta original y el sistema muestra una vista previa con el título y la imagen de la página. El servidor corre en una máquina virtual en la nube, con IMDSv1 y un rol que puede leer el bucket de CVs. Además, piden que el reclutador pueda subir el logo de la empresa. Decide cada pieza.</p>',
  steps: [
    { id: 'url', type: 'single',
      prompt: '¿Cómo validas la URL de la oferta antes de visitarla?',
      options: [
        'Una lista negra de textos: localhost, 127.0.0.1 y 169.254.169.254',
        'Que sea https, porque los servicios internos no tienen certificado',
        'Resolver, validar la IP y conectar a esa IP, sin seguir redirecciones',
        'Que la respuesta tenga Content-Type text/html antes de mostrarla'
      ],
      answer: 2,
      explain: 'La lista negra se elude con 127.1, decimales o un dominio propio. Un servicio interno puede tener https. El Content-Type llega después de la request. Hay que validar la IP resuelta y conectarse a ella.' },
    { id: 'nube', type: 'single',
      prompt: '¿Qué cambias en la máquina, además del código?',
      options: [
        'Mover el servidor a una subred privada sin acceso a internet',
        'IMDSv2 obligatorio y quitar al rol permisos que no necesita',
        'Cambiar el puerto del servicio de metadatos por uno no estándar',
        'Bloquear 169.254.169.254 en el WAF de la entrada'
      ],
      answer: 1,
      explain: 'Sin internet no hay vista previa. El IMDS no cambia de puerto. El WAF mira lo que entra, no lo que tu servidor pide. IMDSv2 frena la SSRF típica y el rol mínimo limita el daño si algo pasa.' },
    { id: 'imagen', type: 'single',
      prompt: 'La vista previa trae la imagen de la oferta. ¿Cómo la muestras?',
      options: [
        'Descargarla en el servidor, volver a codificarla y servirla desde tu dominio',
        'Poner la URL original en un <img> para no descargar nada en el servidor',
        'Guardarla tal cual en public/previews con el nombre original',
        'Guardarla en base64 dentro del JSON y pintarla con innerHTML'
      ],
      answer: 0,
      explain: 'Con la URL original, cada visitante le avisa al otro sitio que vio la oferta y la imagen puede cambiar. Guardarla tal cual con su nombre es una subida sin controles. innerHTML abre un XSS. Volver a codificar descarta lo que no son píxeles.' },
    { id: 'logo', type: 'single',
      prompt: '¿Qué formatos aceptas para el logo?',
      options: [
        'Cualquier imagen, incluido SVG, porque se ve nítido en cualquier tamaño',
        'PNG, JPEG y SVG, este último servido como descarga',
        'Solo los formatos cuya extensión termine en .png o .jpg',
        'PNG y JPEG por finfo, vueltos a codificar con GD'
      ],
      answer: 3,
      explain: 'SVG es un documento con script; servido como descarga no sirve de logo. La extensión la elige el usuario. Tipo real por finfo y una nueva codificación dejan una imagen y nada más.' },
    { id: 'volver', type: 'single',
      prompt: 'Después de publicar, el reclutador vuelve con <code>?next=</code>. ¿Qué acepta <code>next</code>?',
      options: [
        'Cualquier URL que empiece con https://practicas.edu.gt',
        'El nombre de una pantalla de una lista fija',
        'Cualquier valor que empiece con /',
        'La URL de la oferta original, para que el reclutador la revise'
      ],
      answer: 1,
      explain: 'El prefijo se elude con practicas.edu.gt.example. Empezar con / deja pasar //otro-sitio. La URL externa convierte la pantalla en una redirección abierta.' }
  ],
  solution: '<ul><li>La URL de la oferta pasa por <code>obtenerExterna()</code>: http o https, puertos 80 y 443, IP global, <code>CURLOPT_RESOLVE</code>, sin redirecciones, 3 s y 1 MB.</li><li>IMDSv2 obligatorio con límite de un salto, y un rol sin lectura del bucket de CVs si la vista previa no lo necesita.</li><li>La imagen se descarga con la misma función, se vuelve a codificar y se guarda con nombre aleatorio.</li><li>Logo: PNG o JPEG por finfo, vuelto a codificar con GD.</li><li><code>next</code>: nombre de una pantalla de una lista.</li></ul>'
});
