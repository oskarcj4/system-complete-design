/* Decisiones guiadas y predicciones de SEC06 (un incidente de punta a punta). Formato en core/exercise.js. */

SD.defineExercise('sec06-incidente', {
  title: 'El incidente de Tienda Norte',
  scenario: '<p>Son las 15:04 UTC. Wazuh muestra una fuerza bruta contra el login, después pedidos ajenos pedidos por beto y, minutos más tarde, un usuario nuevo en el servidor. La tienda sigue respondiendo. Eres la persona de guardia y tienes que decidir qué hacer, en orden. Son seis decisiones.</p>',
  steps: [
    {
      id: 'severidad', type: 'single',
      prompt: '¿Con qué severidad abres el incidente?',
      options: [
        'Baja: la tienda responde y ninguna alerta dice que salieron datos.',
        'Alta: hay un usuario nuevo en el servidor, y eso es alguien con acceso a la máquina.',
        'Media, hasta confirmar que el usuario nuevo no lo creó alguien del equipo.',
        'Ninguna todavía: primero se revisa si son falsos positivos, uno por uno.'
      ],
      answer: 1,
      explain: 'La fuerza bruta y los pedidos ajenos son de la aplicación; el usuario nuevo es persistencia en el servidor, y eso cambia el alcance. Se abre alta y se baja si alguien del equipo confirma que fue suyo. Está en <a href="#paso-triaje">el paso 5</a> y en <a href="../modules/m60-respuesta-forense.html#triaje">60.3</a>.'
    },
    {
      id: 'contener', type: 'single',
      prompt: '¿Cómo contienes el contenedor de la API?',
      options: [
        'Lo borras con <code>docker compose rm -sf api</code> y lo levantas limpio desde la imagen.',
        'Lo detienes con <code>docker compose stop api</code>, que guarda el disco del contenedor.',
        'Lo pausas con <code>docker compose pause api</code>: deja de atender y conserva procesos y memoria.',
        'No lo tocas hasta terminar la evidencia, para no cambiar nada de lo que hay.'
      ],
      answer: 2,
      explain: 'Pausar congela los procesos sin matarlos: la evidencia más volátil sigue ahí y el contenedor deja de atender. Detenerlo pierde los procesos; borrarlo pierde todo. No tocarlo deja al atacante trabajando mientras juntas evidencia. Está en <a href="#paso-contener">el paso 6</a>.'
    },
    {
      id: 'orden', type: 'order',
      prompt: 'Ordena la evidencia, de la más volátil a la menos volátil.',
      items: [
        'Los procesos del contenedor (<code>docker top</code>)',
        'Los cambios en su sistema de archivos (<code>docker diff</code>)',
        'El sistema de archivos entero (<code>docker export</code>)',
        'Los logs de la tienda, de auditd y las alertas de Wazuh'
      ],
      explain: 'Los procesos desaparecen al despausar o reiniciar; los cambios del disco, al recrear el contenedor; los logs quedan en volúmenes y en el host. Es el orden de <a href="../modules/m60-respuesta-forense.html#evidencia">60.5</a> y el de <code>evidencia.sh</code> en <a href="#paso-evidencia">el paso 7</a>.'
    },
    {
      id: 'hash', type: 'single',
      prompt: '¿Cuándo calculas el hash de la evidencia?',
      options: [
        'Al final del incidente, cuando sabes qué archivos sirvieron.',
        'Apenas la copias, y anotas el hash del archivo de hashes en la cadena de custodia.',
        'Solo para el <code>.tar</code> del contenedor, que es el archivo más grande y el único que alguien podría querer cambiar.',
        'No hace falta si la carpeta queda de solo lectura con <code>chmod</code>.'
      ],
      answer: 1,
      explain: 'El hash prueba que el archivo no cambió desde que lo copiaste; calculado después, no prueba nada de lo que pasó antes. <code>chmod</code> lo puede deshacer cualquiera con permisos. Está en <a href="#paso-evidencia">el paso 7</a>.'
    },
    {
      id: 'reloj', type: 'single',
      prompt: 'auditd escribe segundos desde 1970, Wazuh escribe <code>+0000</code> y la tienda, <code>+00:00</code>. ¿Cómo los juntas?',
      options: [
        'Cada fuente se lee en su formato y se pasa a UTC antes de ordenar.',
        'Se ordena por la hora de llegada al SIEM, que es la misma para todas.',
        'Se ordena como texto: los formatos ISO ya quedan en orden.',
        'Se usa solo Wazuh, que ya trae todo en un formato.'
      ],
      answer: 0,
      explain: 'La hora de llegada no es la hora del hecho, y un texto ISO no se compara con un número de segundos. <code>linea_de_tiempo.py</code> tiene un lector por fuente y ordena en UTC. Wazuh no tiene todo: el <code>docker diff</code> no está en ningún log. Está en <a href="#paso-linea">el paso 8</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: 'El atacante leyó las variables de entorno de la API. ¿Rotas la clave de la base?',
      options: [
        'No: ningún log muestra una conexión a la base desde fuera.',
        'Solo si el postmortem confirma que la usó.',
        'Sí, ahora: la leyó, y no tienes cómo probar que no la usó.',
        'No hace falta: la base no tiene puerto publicado en el host.'
      ],
      answer: 2,
      explain: 'Un secreto leído es un secreto filtrado. Que la base no esté publicada reduce el riesgo, pero quien tuvo un exec en la API está en su red. Está en <a href="#paso-erradicar">el paso 9</a>.'
    }
  ],
  solution: '<ul><li>Severidad alta por la persistencia en el servidor.</li><li>La API se pausa, no se borra.</li><li>La evidencia se junta de lo más volátil a lo menos, con su hash al copiarla.</li><li>Cada fuente se pasa a UTC antes de ordenar.</li><li>La clave de la base se rota aunque no haya prueba de uso.</li></ul>'
});

SD.defineExercise('sec06-p-pausa', {
  kind: 'predict', title: 'pausar o detener',
  scenario: '<p>El atacante dejó un proceso corriendo dentro de la API y un archivo en <code>/tmp</code>. Comparas <code>docker compose pause api</code> con <code>docker compose stop api</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué conserva la pausa que la detención pierde?',
    options: [
      'El archivo de <code>/tmp</code>.',
      'Los procesos y su memoria.',
      'Los logs del volumen.',
      'Nada: las dos conservan lo mismo.'
    ],
    answer: 1,
    explain: 'La pausa congela los procesos con el freezer de cgroups y los deja en memoria. Detener los termina. El archivo de <code>/tmp</code> sigue en el disco del contenedor con las dos, hasta que el contenedor se borra o se recrea; los logs están en un volumen.'
  }]
});

SD.defineExercise('sec06-p-diff', {
  kind: 'predict', title: 'lo que dice docker diff',
  scenario: '<p>El paso 5 del incidente corrió <code>echo prueba &gt; /tmp/.sec06</code> dentro de la API. Con la API pausada, corres <code>docker diff</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué línea muestra el archivo?',
    options: [
      '<code>C /tmp/.sec06</code>',
      '<code>A /tmp/.sec06</code>',
      '<code>D /tmp/.sec06</code>',
      'Ninguna: <code>/tmp</code> no se compara.'
    ],
    answer: 1,
    explain: '<code>docker diff</code> marca con <code>A</code> lo agregado, con <code>C</code> lo cambiado (aquí, la carpeta <code>/tmp</code>) y con <code>D</code> lo borrado, siempre contra las capas de la imagen.'
  }]
});

SD.defineExercise('sec06-p-hora', {
  kind: 'predict', title: 'la hora de auditd',
  scenario: '<p>Una línea de <code>audit.log</code> empieza con <code>type=SYSCALL msg=audit(1795014252.318:812)</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿A qué hora pasó, en UTC?',
    options: [
      '2026-11-18 15:04:12 UTC',
      '2026-11-18 12:04:12 UTC',
      'Depende de la zona horaria del servidor.',
      'No se sabe sin el número de serie 812.'
    ],
    fixed: true,
    answer: 0,
    explain: 'El número antes del punto son segundos desde el 1 de enero de 1970 en UTC, sin zona: 1795014252 es el 18 de noviembre de 2026 a las 15:04:12. El 812 es el número de serie que junta las líneas del mismo evento. La zona del servidor solo cambia cómo lo muestra <code>ausearch -i</code>.'
  }]
});
