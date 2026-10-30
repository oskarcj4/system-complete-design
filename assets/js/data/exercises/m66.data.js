SD.defineExercise('m66-noche', {
  title: 'un agente que trabaja solo de noche',
  scenario: '<p>Un equipo de 6 personas mantiene una API en TypeScript. Quieren que un agente actualice de noche las dependencias con vulnerabilidades, deje las pruebas en verde y proponga los cambios, sin nadie mirando. Hoy cada persona usa Claude Code en su laptop con el modo default. El repositorio tiene un <code>.env</code> de desarrollo con credenciales de una base de staging, y el CI publica con un token de GitHub con permiso de escritura. Decide paso a paso.</p>',
  steps: [
    { id: 'modo', type: 'single',
      prompt: 'Nadie va a contestar preguntas durante la noche. ¿Con qué modo corre el agente?',
      options: [
        'default, y si pregunta algo se cancela la tarea y se reintenta la noche siguiente',
        'bypassPermissions, dentro de una caja donde lo peor que puede pasar es tirarla',
        'acceptEdits en la laptop de quien se va último, con la tapa abierta y la sesión bloqueada',
        'auto en la máquina del CI, confiando en que el clasificador frene lo peligroso'
      ],
      answer: 1,
      explain: 'Sin persona, preguntar es fallar. La autonomía total es segura solo si la caja la contiene. auto ayuda, pero el clasificador puede equivocarse y el runner de CI tiene tokens.' },
    { id: 'caja', type: 'single',
      prompt: '¿Qué caja usas?',
      options: [
        'El sandbox del proceso en una laptop, porque ya limita escritura y red sin montar nada',
        'Un contenedor con el socket de Docker, para que el agente pueda levantar la base de pruebas',
        'Un contenedor sin privilegios con el repositorio en un worktree y la base como servicio aparte',
        'Una VM en la nube con el rol de administrador, para que pueda instalar lo que haga falta'
      ],
      answer: 2,
      explain: 'Es tu propio repositorio, así que un contenedor bien configurado alcanza. La base va como otro servicio del compose, no levantada desde dentro con el socket de Docker. Un rol de administrador es una credencial que se puede robar.' },
    { id: 'red', type: 'single',
      prompt: '¿Qué salida a la red tiene la caja?',
      options: [
        'Ninguna: si no hay red, no hay forma de que una injection saque nada de la caja',
        'Toda, porque npm resuelve dependencias en muchos dominios y una lista se rompe sola',
        'Toda menos los dominios de una lista negra de servidores conocidos por robar datos',
        'Solo por un proxy con el registro de npm, el servidor del modelo y lectura de GitHub'
      ],
      answer: 3,
      explain: 'Sin red no hay npm install ni modelo. Una lista negra no alcanza: el atacante usa un dominio nuevo. La lista de permitidos es corta y se amplía cuando algo falla.' },
    { id: 'env', type: 'single',
      prompt: '¿Qué haces con el .env de staging?',
      options: [
        'La caja lleva un .env con credenciales de un entorno de prueba que no importa perder',
        'Un deny de Read(./.env) en el proyecto, que impide leerlo de cualquier forma',
        'Se deja como está, porque la red de la caja no llega a la base de staging de todos modos',
        'Se cifra el archivo y la clave para descifrarlo se pasa como variable de entorno'
      ],
      answer: 0,
      explain: 'El deny frena la forma habitual, no un script que abre el archivo. Que la red no llegue hoy no protege la credencial. Una clave en la caja descifra el archivo. Lo único que resuelve es que la credencial no esté.' },
    { id: 'push', type: 'single',
      prompt: '¿Cómo llegan los cambios al repositorio?',
      options: [
        'El agente hace push a main con el token del CI, porque las pruebas ya pasaron en la caja',
        'El agente abre un PR con un token de escritura propio, con permisos sobre un solo repositorio',
        'La caja deja un diff; un job fuera de la caja corre las pruebas y abre el PR para revisión',
        'El agente manda el diff por correo al equipo, para que alguien lo aplique por la mañana'
      ],
      answer: 2,
      explain: 'Un token de escritura dentro de la caja convierte github.com en un canal y le da al agente una acción con efecto afuera. El correo es otra salida. El diff lo publica algo que no es el agente.' },
    { id: 'hook', type: 'single',
      prompt: 'Además de la caja, quieren un hook que bloquee <code>git push --force</code>. ¿Qué tienen que saber?',
      options: [
        'Que el hook no sirve dentro de bypassPermissions, porque ese modo salta también los hooks',
        'Que es política sobre el texto: ordena, y el límite sigue siendo que no haya token',
        'Que con el hook ya no hace falta la caja, porque corre siempre y el modelo no lo negocia',
        'Que tiene que salir con código 1 para bloquear y con 0 para dejar pasar la llamada'
      ],
      answer: 1,
      explain: 'Los hooks corren en todos los modos y bloquean con código 2, no con 1. Pero ven el mismo texto que las reglas: otra forma del mismo push puede pasar. La caja sin token es el límite.' }
  ],
  solution: '<ul><li>Modo <code>bypassPermissions</code> con <code>claude -p</code>, límites de turnos y de presupuesto, y el transcript guardado.</li><li>Contenedor sin privilegios, sin capabilities ni socket de Docker, con el repositorio en un worktree propio; la base de pruebas como servicio del compose.</li><li>Red interna; salida por un proxy con el registro de npm, el servidor del modelo y lectura de GitHub.</li><li>Clave del modelo propia con tope de gasto; <code>.env</code> de prueba; ningún token de escritura en la caja.</li><li>El resultado sale como diff; un job fuera de la caja corre las pruebas y abre el PR; una persona lo revisa por la mañana.</li><li>Un hook que bloquea force push como orden, no como límite.</li></ul>'
});
