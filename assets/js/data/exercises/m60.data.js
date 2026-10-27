SD.defineExercise('m60-incidente', {
  title: 'la madrugada del token de la service account',
  scenario: '<p>Son las 03:10 UTC de un sábado. El sensor de runtime de Tienda Norte alerta: en un pod del worker de pagos se ejecutó una shell que nunca corre en ese contenedor. '
    + 'Diez minutos después, el audit log de Kubernetes muestra que el token de la service account de ese pod se usó para listar Secrets del namespace <code>tienda</code>, algo que el worker no hace nunca. '
    + 'Estás de guardia, con una persona más disponible por teléfono.</p>',
  steps: [
    {
      id: 'primero', type: 'single',
      prompt: '¿Qué haces antes que nada?',
      options: [
        'Borrar el pod para cortar la shell, y después mirar los registros con calma',
        'Declarar el incidente, fijar una severidad y llamar a la segunda persona',
        'Investigar sola una hora para confirmar que es real antes de despertar a nadie',
        'Rotar todos los Secrets del namespace por si alguno ya fue leído por el atacante'
      ],
      answer: 1,
      explain: 'Una shell inesperada más un token usado para listar Secrets es real y grave: SEV2 o más. Declarar primero ordena todo lo demás: quién decide, quién anota, quién investiga. Rotar o borrar sin plan destruye evidencia o avisa al atacante.'
    },
    {
      id: 'contener', type: 'multi',
      prompt: 'Contención. Marca las acciones que corresponden ahora.',
      options: [
        'NetworkPolicy de cuarentena y sacar el pod del ReplicaSet cambiando su etiqueta',
        'Quitar al rol de la service account el permiso de leer Secrets',
        'Hacer cordon del nodo para que no reciba pods nuevos',
        'Reiniciar el nodo para matar cualquier proceso que haya quedado'
      ],
      answer: [0, 1, 2],
      explain: 'Las tres primeras cortan el daño y conservan el pod, la memoria y el nodo para investigar. Reiniciar el nodo borra todo lo volátil antes de copiarlo. Ver 60.4.'
    },
    {
      id: 'orden', type: 'order',
      prompt: 'Ordena la recolección de evidencia del pod y del nodo.',
      items: ['Procesos y conexiones del pod', 'Archivos temporales del contenedor', 'Snapshot del volumen del nodo', 'Exportar el audit log y el log del sensor'],
      explain: 'Orden de volatilidad: lo que muere con el pod, después lo temporal, después el disco. Los registros remotos ya están fuera del alcance del atacante y pueden esperar unos minutos. Ver 60.5.'
    },
    {
      id: 'alcance', type: 'single',
      prompt: 'El audit log muestra que el token listó los Secrets y leyó dos: la contraseña de la base y la llave del PSP. ¿Cómo queda el alcance?',
      options: [
        'Solo el pod, porque el token de la service account ya quedó sin permisos',
        'El pod y la base de datos, porque la llave del PSP vive en otro proveedor',
        'El pod, los dos secretos leídos y todo lo que se pueda hacer con ellos desde afuera',
        'Todo el clúster, porque un token comprometido equivale a perder el plano de control'
      ],
      answer: 2,
      explain: 'Lo leído se da por robado, y una credencial robada se puede usar desde cualquier lugar: el alcance incluye lo que permiten esos dos secretos, también fuera del clúster. Sin pedidos de otros recursos en el audit log, no hace falta suponer el clúster entero.'
    },
    {
      id: 'erradicar', type: 'single',
      prompt: '¿Cuál es la erradicación correcta?',
      options: [
        'Rotar los dos secretos, reconstruir desde la imagen firmada y revisar su uso',
        'Matar la shell dentro del pod, borrar los archivos de /tmp y devolverlo al Service',
        'Rotar todos los secretos de la empresa y reinstalar el clúster desde cero esa misma noche',
        'Cambiar la contraseña de la base y dejar la llave del PSP, que tiene su propia detección de fraude'
      ],
      answer: 0,
      explain: 'Rotar lo que se vio, reconstruir en lugar de limpiar y buscar en la base y en el PSP qué se hizo con esas credenciales entre las 03:20 y la rotación. Limpiar en el lugar deja dudas; reinstalar todo esa noche es desproporcionado. Ver 60.9.'
    },
    {
      id: 'post', type: 'single',
      prompt: 'En el postmortem, ¿qué acción cambia más la próxima vez?',
      options: [
        'Recordar al equipo en la próxima reunión que revise mejor las dependencias',
        'Que el worker no tenga permiso de leer Secrets y una regla para ese uso del token',
        'Agregar una página al wiki con la descripción completa de este incidente',
        'Pedir al proveedor del clúster un informe de por qué permitió la shell'
      ],
      answer: 1,
      explain: 'Una acción tiene que cambiar un control o una detección. Quitar el permiso que no se usaba (mínimo privilegio) y detectar ese patrón cierran el camino; un recordatorio o una página no cambian nada. Ver 60.11.'
    }
  ],
  solution: '<ul><li><b>Declarar:</b> SEV2, IC y escriba, canal fuera de banda si hay dudas sobre las identidades.</li>'
    + '<li><b>Contener sin destruir:</b> cuarentena de red, sacar el pod del ReplicaSet, quitar el permiso sobre Secrets, cordon del nodo.</li>'
    + '<li><b>Evidencia en orden:</b> procesos y conexiones, archivos temporales, snapshot, registros remotos, todo con hash y ficha de custodia.</li>'
    + '<li><b>Alcance:</b> los dos secretos leídos y lo que se puede hacer con ellos desde afuera; revisar la base y el PSP.</li>'
    + '<li><b>Erradicar y recuperar:</b> rotar lo leído, reconstruir desde la imagen firmada, parchear la entrada.</li>'
    + '<li><b>Postmortem:</b> mínimo privilegio del worker, una detección para listar Secrets con su token, y el runbook de "token de service account comprometido".</li></ul>'
});
