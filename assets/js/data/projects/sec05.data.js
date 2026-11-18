/* Decisiones guiadas y predicciones de SEC05 (detection as code). Formato en core/exercise.js. */

SD.defineExercise('sec05-deteccion', {
  title: 'Las reglas de Tienda Norte, en un repositorio',
  scenario: '<p>Tienda Norte tiene tres reglas en Wazuh, escritas a mano en SEC00, y Falco avisa de las shells en el clúster de SEC04. Nadie sabe si una regla sigue funcionando después de un cambio, y una fuente que deja de mandar logs no avisa. Quieres que las reglas vivan en Git, con pruebas, y que el silencio también sea una alerta. Son seis decisiones.</p>',
  steps: [
    {
      id: 'fuente', type: 'single',
      prompt: '¿Dónde vive la versión de referencia de cada regla?',
      options: [
        'En la interfaz del SIEM, que es donde corre y donde la ve el equipo.',
        'En un archivo Sigma en el repositorio, con sus casos de prueba al lado.',
        'En una planilla compartida con la técnica de ATT&CK y el umbral de cada regla.',
        'En el XML de Wazuh, que es el formato que el manager termina leyendo.'
      ],
      answer: 1,
      explain: 'Sigma no depende de un SIEM, se revisa en un pull request y se prueba sin el SIEM. El XML de Wazuh sigue existiendo, pero como el par de la regla, y una prueba comprueba que cada Sigma tiene el suyo. Una regla que solo vive en la interfaz no tiene historia ni pruebas. Está en <a href="#paso-sigma">el paso 2</a>.'
    },
    {
      id: 'casos', type: 'single',
      prompt: '¿Qué casos necesita la regla "8 logins fallidos desde una IP en 2 minutos"?',
      options: [
        'Uno positivo con 8 intentos rápidos, que es lo que la regla tiene que ver.',
        'Uno positivo y uno negativo con 7 intentos, el borde exacto del umbral.',
        'Uno positivo, y negativos que casi alertan: los mismos 8 más espaciados y repartidos entre dos IP.',
        'Ninguno a mano: se copian los logs reales de una semana y se mira si alertó.'
      ],
      answer: 2,
      explain: 'Un negativo que no se parece al ataque no prueba nada. Los que casi alertan prueban la ventana y el <code>group-by</code>, que son lo que se rompe al editar la regla. Los logs reales sirven, pero no sabes de antemano qué debería salir. Está en <a href="#paso-casos">el paso 3</a>.'
    },
    {
      id: 'motor', type: 'single',
      prompt: '¿Cómo pruebas la regla Sigma en el pipeline, sin un SIEM levantado?',
      options: [
        'Se convierte con pySigma a SQL de SQLite y se corre sobre los casos en una base en memoria.',
        'Se levanta Wazuh en el runner de GitHub y se le mandan los casos por el logcollector.',
        'Se valida solo la sintaxis con <code>sigma check</code>, que alcanza para saber que alerta.',
        'No se prueba en el pipeline: se prueba en el laboratorio antes de cada cambio grande.'
      ],
      answer: 0,
      explain: 'SQLite viene con Python, así que la prueba tarda segundos y no necesita red. Levantar Wazuh en cada pull request es lento y frágil, y la sintaxis no dice si la regla alerta con los casos. Está en <a href="#paso-pruebas">el paso 4</a>.'
    },
    {
      id: 'silencio', type: 'single',
      prompt: 'Falco deja de escribir porque su pod no arranca. ¿Cómo te enteras?',
      options: [
        'Por la ausencia de alertas de Falco en el dashboard, que alguien revisa cada mañana.',
        'Por una alerta propia: un comando cada 5 minutos mira si el archivo de Falco cambió.',
        'No hace falta: si Falco no corre, tampoco hay nada que detectar en el clúster.',
        'Por el log del API server, que registra cuando un DaemonSet queda sin pods.'
      ],
      answer: 1,
      explain: 'Un SIEM no distingue la calma del silencio: cero alertas puede ser un buen día o un sensor caído. La alerta de silencio convierte la ausencia en un evento, y con las métricas de Falco como latido no salta en un día tranquilo. Está en <a href="#paso-silencio">el paso 7</a>.'
    },
    {
      id: 'emular', type: 'single',
      prompt: '¿Contra qué corres las emulaciones de técnicas?',
      options: [
        'Contra el entorno de staging de la empresa, que es el más parecido a producción.',
        'Contra producción, con permiso por escrito y en un horario de poco tráfico.',
        'Solo contra tu laboratorio, con un script que se niega a hablar con otra dirección.',
        'Contra cualquier sistema propio, porque las técnicas de esta guía no rompen nada.'
      ],
      answer: 2,
      explain: 'Una emulación es tráfico de ataque. En esta guía va solo contra el laboratorio, y <code>provocar.py</code> se niega a salir de 127.0.0.1. Contra staging o producción hace falta un acuerdo y un equipo, y eso queda fuera de esta guía. Está en <a href="#paso-emular">el paso 8</a>.'
    },
    {
      id: 'par', type: 'single',
      prompt: 'La regla Sigma dice 8 intentos y alguien sube a 10 la del XML de Wazuh. ¿Qué lo detecta?',
      options: [
        'La prueba de pares: comprueba que cada Sigma tiene su regla en Wazuh y la misma técnica.',
        'Nada en el pipeline: la prueba de pares mira el id y la técnica, no el umbral.',
        'Las pruebas de los casos, porque el caso positivo tiene 8 intentos.',
        'Wazuh, que avisa al cargar una regla que no coincide con su Sigma.'
      ],
      answer: 1,
      explain: 'La prueba de pares compara el id y la técnica de ATT&amp;CK. Los casos corren contra la Sigma, no contra el XML. El umbral del XML solo se prueba con <code>wazuh-logtest</code> o con la emulación. Es la primera limitación de la guía, en <a href="#limitaciones">Limitaciones</a>.'
    }
  ],
  solution: '<ul><li>Las reglas son Sigma en el repositorio, y cada una tiene su par en el XML de Wazuh.</li><li>Cada regla tiene casos positivos y negativos que casi alertan.</li><li>El pipeline convierte las reglas a SQLite y las corre sobre los casos.</li><li>Cada fuente tiene su alerta de silencio.</li><li>Las emulaciones van solo contra el laboratorio.</li><li>El umbral del XML no lo cubre la prueba de pares: lo cubre la emulación.</li></ul>'
});

SD.defineExercise('sec05-p-ventana', {
  kind: 'predict', title: 'ocho intentos, cada 30 segundos',
  scenario: '<p>La regla cuenta 8 logins fallidos de la misma IP en una ventana deslizante de 2 minutos. El caso tiene 8 intentos de una IP, uno cada 30 segundos.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Alerta?',
    options: [
      'Sí: son 8 intentos de la misma IP.',
      'No: en ninguna ventana de 2 minutos hay más de 5.',
      'Sí, al llegar el octavo intento.',
      'No, porque los intentos no son consecutivos.'
    ],
    answer: 1,
    explain: 'Los intentos caen en 0, 30, 60… 210 segundos. La ventana que termina en cualquier intento mira los 120 segundos anteriores, incluido el borde: 0, 30, 60, 90 y 120 son 5. Es el primer negativo de <code>login_fallido/no.jsonl</code>.'
  }]
});

SD.defineExercise('sec05-p-grupo', {
  kind: 'predict', title: 'dos IP en el mismo minuto',
  scenario: '<p>La misma regla, con <code>group-by: [ip]</code>. El caso tiene 8 intentos en un minuto: 4 desde una IP y 4 desde otra, intercalados.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Alerta?',
    options: [
      'Sí: son 8 en menos de 2 minutos.',
      'Sí, pero con la IP del último intento.',
      'No: cada IP suma 4.',
      'No, porque intercalados no son una ráfaga.'
    ],
    answer: 2,
    explain: '<code>group-by</code> cuenta por separado para cada valor de <code>ip</code>. Si quitaras el <code>group-by</code>, contaría los 8 juntos y alertaría. Es el segundo negativo del mismo archivo.'
  }]
});

SD.defineExercise('sec05-p-silencio', {
  kind: 'predict', title: 'cuándo salta el silencio',
  scenario: '<p>El comando de silencio corre cada 5 minutos y dice <code>callada</code> si <code>events.json</code> no cambió en los últimos 12. Falco escribe su última línea y se cae.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Cuándo aparece la alerta 100130?',
    options: [
      'A los 5 minutos, en la primera vuelta del comando.',
      'A los 12 minutos exactos.',
      'Entre 12 y 17 minutos después de la última línea.',
      'Nunca: el comando no corre si Falco está caído.'
    ],
    answer: 2,
    explain: 'La condición se cumple a los 12 minutos, pero el comando solo mira cada 5: la primera vuelta después del minuto 12 puede llegar enseguida o hasta 5 minutos más tarde. El comando lo corre el manager de Wazuh, no Falco, así que corre igual.'
  }]
});

SD.defineExercise('sec05-p-par', {
  kind: 'predict', title: 'un umbral que cambia de un solo lado',
  scenario: '<p>En <code>wazuh/tienda_rules.xml</code> cambias <code>frequency="8"</code> por <code>frequency="10"</code> en la 100102. La regla Sigma sigue en 8.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué hace el job <code>deteccion</code> del pipeline?',
    options: [
      'Falla en la prueba de pares.',
      'Pasa: nada de lo que prueba cambió.',
      'Falla en el caso positivo de la regla.',
      'Falla al convertir la regla a SQL.'
    ],
    answer: 1,
    explain: 'La prueba de pares mira que el id exista y que la técnica coincida; los casos corren contra la Sigma, que no cambió. La diferencia la ve la emulación del paso 8: con 12 intentos sigue saliendo, con 9 ya no. Está en <a href="#limitaciones">Limitaciones</a>.'
  }]
});
