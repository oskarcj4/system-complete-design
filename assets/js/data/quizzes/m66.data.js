SD.defineQuiz('m66', {
  title: 'Quiz: permisos, sandbox y autonomía', pass: 0.7,
  questions: [
    { id: 'orden', type: 'single',
      prompt: 'En Claude Code hay un allow <code>Bash(aws s3 ls)</code> y un deny <code>Bash(aws *)</code>. El agente pide <code>aws s3 ls</code>. ¿Qué pasa?',
      options: [
        'Se ejecuta, porque la regla allow es más específica y la más específica siempre gana',
        'Se bloquea: los deny se evalúan primero y ninguna regla más específica abre una excepción',
        'Pregunta, porque dos reglas que se contradicen se resuelven siempre preguntándole a la persona',
        'Depende del archivo: gana la regla del archivo más cercano al proyecto, sea allow o deny'
      ],
      answer: 1,
      explain: 'El orden es deny, ask, allow, y decide la primera que coincide; la especificidad no cambia el orden. Ver 66.2.' },
    { id: 'texto', type: 'single',
      prompt: 'Tienes un deny <code>Bash(curl *)</code>. ¿Por qué no alcanza para impedir que el agente saque datos por la red?',
      options: [
        'Porque los deny solo se aplican en el modo default y el agente suele trabajar en acceptEdits',
        'Porque Claude Code no separa los comandos compuestos y curl dentro de un && no se detecta',
        'Porque la regla compara el texto: /usr/bin/curl, sh -c o un script de Python hacen lo mismo y no coinciden',
        'Porque curl usa HTTPS y las reglas de permisos no pueden ver el contenido de una conexión cifrada'
      ],
      answer: 2,
      explain: 'Claude Code separa compuestos y aplica deny en todos los modos, pero compara el texto del comando. El límite que no depende del texto es el sandbox con lista de dominios. Ver 66.2 y 66.4.' },
    { id: 'bypass', type: 'single',
      prompt: '¿Qué sigue funcionando en <code>bypassPermissions</code>?',
      options: [
        'Nada: el modo apaga todas las reglas y todas las preguntas, por eso solo se usa en una caja',
        'Las reglas allow, que pasan a ser la única lista de lo que el agente puede hacer en ese modo',
        'Solo las reglas de la organización; las del proyecto y las del usuario dejan de leerse',
        'Las reglas deny y ask, y unos pocos borrados críticos; los allow dejan de importar'
      ],
      answer: 3,
      explain: 'Los deny bloquean y los ask preguntan en todos los modos. Los allow no cambian nada porque todo está permitido. Ver 66.3.' },
    { id: 'ci', type: 'single',
      prompt: 'Un agente de revisión en CI no tiene a nadie que conteste preguntas. ¿Qué modo conviene?',
      options: [
        'dontAsk, para que lo que preguntaría se niegue y solo corra lo aprobado por reglas',
        'default, porque sin persona las preguntas expiran y la llamada se cancela de forma segura',
        'bypassPermissions, porque en CI la máquina es efímera y nada de lo que haga persiste',
        'plan, porque un revisor nunca necesita ejecutar comandos ni leer fuera del repositorio'
      ],
      answer: 0,
      explain: 'dontAsk convierte cada pregunta en una negación y deja correr solo lo aprobado. Un runner de CI suele tener tokens y red, así que no es una caja desechable por sí solo. Ver 66.3.' },
    { id: 'ssh', type: 'single',
      prompt: 'Encendiste el sandbox de Claude Code sin más configuración. ¿Puede un comando leer <code>~/.ssh/id_ed25519</code>?',
      options: [
        'No, porque el sandbox solo deja leer dentro del directorio de trabajo y del temporal',
        'Sí: por defecto el sandbox deja leer casi toda la máquina; hay que negarlo con denyRead',
        'No, porque las rutas con llaves privadas están en la lista de rutas protegidas',
        'Sí, pero no puede mandarla a ningún lado, así que leerla no tiene consecuencias'
      ],
      answer: 1,
      explain: 'La escritura se limita al directorio y al temporal; la lectura no, salvo denyRead. Y la red puede tener dominios permitidos que sirvan de canal. Ver 66.4.' },
    { id: 'escape', type: 'single',
      prompt: 'Un comando falla dentro del sandbox y el agente lo reintenta con <code>dangerouslyDisableSandbox</code>. ¿Cómo se cierra esa vía?',
      options: [
        'Con un deny de Bash(*) en la configuración del proyecto, que impide cualquier comando fuera',
        'Con failIfUnavailable, que hace que Claude Code no arranque si el sandbox no puede iniciarse',
        'Con allowUnsandboxedCommands en false, que hace que ese parámetro se ignore y todo corra dentro',
        'Con excludedCommands vacío, que deja sin entradas la lista de comandos fuera del sandbox'
      ],
      answer: 2,
      explain: 'Con la opción en false, todo comando corre dentro o falla. failIfUnavailable cubre otro caso: que el sandbox no pueda arrancar. Ver 66.4.' },
    { id: 'cajas', type: 'single',
      prompt: 'Un orquestador va a revisar PRs de personas ajenas a la empresa. ¿Qué caja conviene para cada tarea?',
      options: [
        'El sandbox del proceso en la máquina del orquestador, porque ya limita archivos y red',
        'Un contenedor con el socket de Docker montado, para que la tarea levante sus servicios',
        'Ninguna: con dontAsk y reglas que solo permiten leer, el código ajeno no puede hacer nada',
        'Una microVM por tarea, porque el código no es tuyo y un contenedor comparte el kernel'
      ],
      answer: 3,
      explain: 'Con código ajeno, un error del kernel compartido es una salida. Con el socket de Docker, la caja crea otra sin límites. Ver 66.5 y M69.10.' },
    { id: 'canal', type: 'single',
      prompt: 'La caja sale solo por un proxy que permite <code>github.com</code>. ¿Cuál es el riesgo que queda?',
      options: [
        'Con un token de escritura en la caja, el agente puede publicar en github.com lo que leyó',
        'Ninguno: un proxy con lista de dominios cierra todas las salidas que no sean las de la lista',
        'Que el proxy descifre el tráfico y vea las credenciales que manda la caja a GitHub',
        'Que GitHub bloquee el proxy por recibir demasiadas conexiones desde una sola IP'
      ],
      answer: 0,
      explain: 'Un dominio permitido es un canal. Por eso van juntos la lista corta y que no haya tokens de escritura. Ver 66.6.' },
    { id: 'hook', type: 'single',
      prompt: 'Un hook PreToolUse en Python tiene un error y termina con una excepción. ¿Qué pasa con la llamada?',
      options: [
        'Se bloquea, porque cualquier código distinto de 0 se interpreta como un rechazo del hook',
        'Queda en pausa hasta que el hook vuelva a correr sin errores y devuelva una decisión',
        'Sigue: solo el código 2 bloquea; un error no bloquea, así que la política falla abierta',
        'Se le pregunta a la persona, porque el harness no puede decidir sin la respuesta del hook'
      ],
      answer: 2,
      explain: 'Exit 2 bloquea y devuelve stderr al modelo; cualquier otro código distinto de 0 es un error no bloqueante. Un hook de política captura los errores y sale con 2. Ver 66.9.' },
    { id: 'trifecta', type: 'multi',
      prompt: 'Para que una injection no pueda robar desde un agente en <code>bypassPermissions</code>, ¿qué cortan las prácticas de 66.5 a 66.7? Marca todas las que correspondan.',
      options: [
        'El acceso a datos privados: sin $HOME, sin credenciales reales, con un .env de prueba',
        'La comunicación hacia afuera: salida por proxy con lista corta y sin tokens de escritura',
        'El contenido no confiable: el agente deja de leer issues, dependencias y READMEs',
        'La obediencia del modelo: deja de seguir instrucciones que encuentra en archivos ajenos'
      ],
      answer: [0, 1],
      explain: 'Leer contenido no confiable es el trabajo del agente y no se corta. Cambiar lo que aprendió el modelo no está en tus manos. La caja corta las otras dos patas. Ver 66.8.' }
  ]
});
