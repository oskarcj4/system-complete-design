/* Decisiones guiadas y predicciones de SEC08 (un agente de triaje de alertas). Formato en core/exercise.js. */

SD.defineExercise('sec08-triaje', {
  title: 'El agente de guardia de Tienda Norte',
  scenario: '<p>Wazuh da unas decenas de alertas de nivel 10 o más por semana en el laboratorio, y la persona de guardia tarda en mirarlas. Quieres un agente que lea cada alerta, junte contexto, proponga la severidad y la acción, y que pausar la API (lo único que puede contener) siga dependiendo de una persona. Son seis decisiones.</p>',
  steps: [
    {
      id: 'quien', type: 'single',
      prompt: '¿Quién decide pausar la API?',
      options: [
        'El agente, si la severidad es crítica; si es menor, una persona, porque esperar a alguien en lo grave es lo que más cuesta.',
        'El agente propone y el grafo se detiene en un <code>interrupt</code> hasta que una persona responde.',
        'El agente, con una instrucción en el prompt que le pide confirmar antes de actuar.',
        'Nadie: el agente solo escribe informes, y pausar se hace a mano desde la terminal.'
      ],
      answer: 1,
      explain: 'Una instrucción en el prompt es una sugerencia que el modelo puede ignorar o que una inyección puede cambiar; el <code>interrupt</code> lo impone el grafo. Dejar lo crítico al agente es justo donde un error cuesta más. Sin acción, el agente no ahorra el paso más lento. Está en <a href="#paso-grafo">el paso 6</a>.'
    },
    {
      id: 'acciones', type: 'single',
      prompt: '¿Cómo le das al agente la acción de pausar?',
      options: [
        'Una herramienta <code>shell</code> que corre lo que el modelo escriba, aprobado por una persona.',
        'Un servidor MCP de Docker con todas sus herramientas, para que elija la que haga falta.',
        'Un campo <code>accion</code> con tres valores posibles; el comando vive en <code>acciones.py</code>.',
        'El modelo escribe el comando en el informe y la persona lo copia en la terminal.'
      ],
      answer: 2,
      explain: 'Con un valor cerrado, el modelo elige entre tres palabras y el código decide qué se corre. Una shell aprobada sigue mostrando un comando que la persona tiene que leer bien cada vez, y un servidor MCP entero da mucho más de lo que hace falta. Está en <a href="#paso-acciones">el paso 5</a>.'
    },
    {
      id: 'datos', type: 'single',
      prompt: 'El campo <code>usuario</code> de una alerta lo escribe quien ataca. ¿Qué haces con él?',
      options: [
        'Nada especial: los datos vienen de tu propio Wazuh, que ya los decodificó.',
        'Lo quitas de la alerta, para que el modelo no lea nada que controle el atacante.',
        'Se lo pasas antes a un segundo modelo que decida si es una inyección.',
        'Va entre etiquetas, escapado, y el prompt dice que lo de adentro es dato.'
      ],
      answer: 3,
      explain: 'Wazuh decodifica, no limpia: el texto sigue siendo del atacante. Quitarlo pierde evidencia (el usuario que se probó). Un segundo modelo se puede engañar igual. Las etiquetas escapadas no lo impiden todo, pero el permiso no depende del prompt: pausar sigue pidiendo a una persona. Está en <a href="#paso-prompt">el paso 4</a>.'
    },
    {
      id: 'invalida', type: 'single',
      prompt: 'El modelo devuelve algo que no valida contra <code>Propuesta</code>. ¿Qué hace el grafo?',
      options: [
        'Propone vigilar con severidad alta: la alerta va a una persona.',
        'Vuelve a llamar al modelo hasta que la respuesta valide, porque con temperatura cero suele salir bien a la segunda.',
        'Descarta la alerta y sigue con la siguiente, para no frenar la cola.',
        'Propone pausar la API por precaución, porque una alerta sin triaje puede ser grave.'
      ],
      answer: 0,
      explain: 'Reintentar sin límite puede quedar en un bucle y gastar tokens; descartar pierde la alerta; pausar por precaución corta la tienda por una falla del modelo. Ante la duda, una persona. Está en <a href="#paso-grafo">el paso 6</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '¿Qué clave de idempotencia usa la acción de pausar?',
      options: [
        'Un UUID nuevo por cada corrida del agente, para que cada pedido sea distinto.',
        'La hora de la aprobación, redondeada al minuto, para juntar clics repetidos.',
        'La alerta y la acción, anotadas antes del efecto con el resultado después.',
        'Ninguna: pausar algo pausado no cambia nada.'
      ],
      answer: 2,
      explain: 'Un UUID por corrida repite la acción si el proceso vuelve a empezar. La hora junta cosas distintas que caen en el mismo minuto. Sin clave, la segunda corrida no sabe que ya se hizo ni quién lo aprobó. Está en <a href="#paso-acciones">el paso 5</a>.'
    },
    {
      id: 'medir', type: 'single',
      prompt: '¿Cómo sabes si el modelo propone bien?',
      options: [
        'Con pytest y el modelo falso, que ya prueba cada camino del grafo.',
        'Corriendo el agente una vez con alertas reales y mirando los informes.',
        'Contando los tokens de cada triaje: si bajan, el modelo razona mejor.',
        'Con seis casos que incluyen una inyección, cada uno repetido k veces: pass^k.'
      ],
      answer: 3,
      explain: 'El modelo falso prueba el grafo, no el juicio del modelo. Una corrida no dice cuán seguido acierta, y los tokens miden costo, no acierto. pass^k exige acertar las k veces. Está en <a href="#paso-evals">el paso 9</a>.'
    }
  ],
  solution: '<ul><li>El agente propone y un <code>interrupt</code> espera a una persona.</li><li>La acción es un valor cerrado y el comando vive en el código.</li><li>Los datos de la alerta van entre etiquetas y escapados.</li><li>Una salida inválida va a una persona como vigilar.</li><li>La clave es la alerta y la acción, anotada antes del efecto.</li><li>Seis casos con pass^k, uno de ellos una inyección.</li></ul>'
});

SD.defineExercise('sec08-p-reanudar', {
  kind: 'predict', title: 'cuántas veces habla el modelo',
  scenario: '<p>Una alerta 100104 llega al grafo. El modelo propone <code>pausar_api</code>, el grafo se detiene en <code>aprobar</code> y una persona responde que sí.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Cuántas veces se llamó al modelo en total?',
    options: ['Una', 'Dos', 'Tres', 'Ninguna'],
    fixed: true,
    answer: 0,
    explain: 'Al reanudar, LangGraph vuelve a correr solo el nodo <code>aprobar</code>, desde el checkpoint; <code>proponer</code> ya terminó y su resultado está en el estado. <code>test_aprobar_actua_una_vez</code> lo comprueba.'
  }]
});

SD.defineExercise('sec08-p-dos', {
  kind: 'predict', title: 'la misma alerta, aprobada dos veces',
  scenario: '<p>Apruebas la pausa de la alerta <code>X</code>. Después borras su fila de <code>triajes</code>, corres <code>triaje</code> otra vez y vuelves a aprobar.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué dice el resultado la segunda vez?',
    options: [
      '<code>api pausada</code>, porque corre <code>docker compose pause</code> otra vez.',
      '<code>(ya se había aplicado) api pausada</code>',
      'Un error de clave duplicada en <code>acciones</code>.',
      '<code>la api ya estaba pausada</code>'
    ],
    answer: 1,
    explain: 'La clave <code>X:pausar_api</code> ya está en <code>acciones</code> con su resultado: <code>aplicar()</code> lo devuelve sin llamar a Docker. <code>la api ya estaba pausada</code> sale solo con una alerta distinta y la API pausada.'
  }]
});

SD.defineExercise('sec08-p-invalida', {
  kind: 'predict', title: 'una respuesta que no valida',
  scenario: '<p>El modelo local responde <code>{"accion": "bloquear_ip"}</code>, que no está entre los valores de <code>accion</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué propuesta queda en el estado?',
    options: [
      '<code>bloquear_ip</code>, que el nodo <code>actuar</code> rechaza más adelante.',
      '<code>pausar_api</code> con severidad crítica.',
      '<code>vigilar</code> con severidad alta.',
      'Ninguna: el grafo termina con un error.'
    ],
    answer: 2,
    explain: '<code>with_structured_output</code> valida contra <code>Propuesta</code> y lanza una excepción; <code>proponer</code> la atrapa y deja <code>A_UNA_PERSONA</code>: vigilar, severidad alta. <code>test_salida_invalida_va_a_una_persona</code> lo comprueba.'
  }]
});

SD.defineExercise('sec08-p-sin-ip', {
  kind: 'predict', title: 'relacionadas sin IP',
  scenario: '<p>La alerta es la 100131 (Nginx no escribe), que no tiene <code>data.ip</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué busca <code>relacionadas()</code>?',
    options: [
      'Las de la misma regla en los últimos 30 minutos.',
      'Todas las alertas de los últimos 30 minutos.',
      'Nada: devuelve una lista vacía sin consultar.',
      'Las de la misma IP, que queda vacía y no coincide con ninguna.'
    ],
    answer: 0,
    explain: 'Sin IP, la lista <code>mismas</code> tiene solo el <code>term</code> de <code>rule.id</code>, y <code>minimum_should_match: 1</code> exige que coincida. La consulta sigue corriendo, filtrada por la ventana de 30 minutos.'
  }]
});
