SD.defineExercise('m56-cadena', {
  title: 'el día que se filtró el token de npm',
  scenario: '<p>Tienda Norte publica una librería interna, <code>@tienda-norte/precios</code>, que usan la API y el frontend. '
    + 'El lunes, un aviso de seguridad dice que un paquete popular de la cadena de herramientas del frontend tuvo una versión maliciosa durante seis horas el sábado: '
    + 'al instalarse buscaba tokens en la máquina y publicaba versiones infectadas de otros paquetes. El CI de Tienda Norte corrió builds el sábado.</p>',
  steps: [
    {
      id: 'saber', type: 'single',
      prompt: 'Primera pregunta: ¿algún build del sábado instaló la versión maliciosa?',
      options: [
        'Preguntar en el canal del equipo quién actualizó dependencias esa semana',
        'Buscar la versión en los lockfiles y los SBOM de los builds del sábado',
        'Correr el SCA de nuevo sobre el código de hoy y ver si la reporta',
        'Revisar el package.json, que es donde se declaran las versiones'
      ],
      answer: 1,
      explain: 'El lockfile y el SBOM de cada build dicen qué se instaló de verdad, incluidas las transitivas. El package.json solo tiene rangos, y el código de hoy puede ya no tenerla.'
    },
    {
      id: 'token', type: 'single',
      prompt: 'Un build del sábado la instaló. Ese job tenía un token de npm de larga vida para publicar <code>@tienda-norte/precios</code>. ¿Qué haces primero?',
      options: [
        'Esperar a ver si aparece una versión rara de la librería en npm',
        'Borrar el build del sábado y sus logs para que no quede el token',
        'Revocar el token de npm y revisar lo publicado desde el sábado',
        'Actualizar el paquete afectado a la versión arreglada y seguir'
      ],
      answer: 2,
      explain: 'El token se da por robado. Se revoca y se revisa si alguien publicó versiones nuevas de la librería; si las hay, se despublican o se marcan y se avisa a quien la usa.'
    },
    {
      id: 'scripts', type: 'single',
      prompt: 'El gusano se ejecutó con un script de instalación. ¿Qué cambias en el CI?',
      options: [
        'Instalar con npm ci --ignore-scripts y una lista permitida',
        'Instalar siempre la última versión para recibir antes los arreglos',
        'Correr npm install dos veces y comparar que salga lo mismo',
        'Quitar el lockfile para que cada build resuelva versiones nuevas'
      ],
      answer: 0,
      explain: 'Sin scripts de instalación esa vía se corta. La última versión es justamente la que puede estar infectada, y quitar el lockfile deja todo más expuesto.'
    },
    {
      id: 'publicar', type: 'single',
      prompt: '¿Cómo debería publicar el CI la librería a partir de ahora?',
      options: [
        'Con el mismo token de antes, pero guardado en un gestor de secretos',
        'Desde la laptop de una persona de confianza, nunca desde el CI',
        'Con un token nuevo que se rota a mano una vez por trimestre',
        'Con publicación por OIDC desde el workflow de main y provenance'
      ],
      answer: 3,
      explain: 'Sin un token guardado no hay nada que robar, y la provenance permite verificar que cada versión salió del workflow de main. Publicar desde una laptop pierde toda trazabilidad.'
    },
    {
      id: 'nuevos', type: 'single',
      prompt: 'La versión maliciosa duró seis horas en npm. ¿Qué control habría evitado instalarla?',
      options: [
        'Un SAST sobre el código del paquete antes de cada instalación',
        'Un proxy que pone en cuarentena las versiones nuevas',
        'Fijar las acciones de GitHub por SHA en todos los workflows',
        'Un WAF delante del registro de npm que bloquee scripts sospechosos'
      ],
      answer: 1,
      explain: 'La cuarentena de paquetes recién publicados da tiempo a que la comunidad detecte el problema. Un lockfile también, si la actualización no se hubiera aceptado justo ese día.'
    },
    {
      id: 'despliegue', type: 'single',
      prompt: '¿Cómo te aseguras de que ninguna imagen construida el sábado siga corriendo?',
      options: [
        'Reiniciar todos los pods para que bajen la imagen de nuevo',
        'Borrar los tags de las imágenes del sábado en el registro',
        'Que la admisión rechace los digests del sábado y reconstruir',
        'Esperar al próximo despliegue, que va a reemplazar las imágenes'
      ],
      answer: 2,
      explain: 'Los pods corren por digest; borrar un tag no cambia lo que corre, y reiniciar puede volver a bajar la misma imagen. Se identifican los digests, se reconstruye y la admisión rechaza los viejos.'
    }
  ],
  solution: '<ol>'
    + '<li>Saber: lockfiles y SBOM de los builds del sábado.</li>'
    + '<li>Contener: revocar el token de npm y revisar lo publicado desde el sábado.</li>'
    + '<li>Cortar la vía: <code>npm ci --ignore-scripts</code> con lista revisada y proxy con cuarentena de paquetes nuevos.</li>'
    + '<li>Quitar el secreto: publicar por OIDC desde main, con provenance.</li>'
    + '<li>Limpiar: reconstruir sin la versión maliciosa y rechazar en la admisión los digests del sábado.</li>'
    + '</ol>'
});
