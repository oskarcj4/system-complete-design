/* Ejercicio guiado del M31 (Google Docs). Formato en core/exercise.js. */

SD.defineExercise('m31-clase', {
  title: 'una clase en vivo con 500 estudiantes en un documento',
  scenario: '<p>Una profesora da una clase en línea con <b>500 estudiantes</b>. Escribe los apuntes en vivo en un documento de tu clon, con tres ayudantes que corrigen y agregan ejemplos. Los estudiantes abren el documento con un enlace y siguen la clase leyendo; algunos quieren hacer preguntas sobre partes concretas del texto. La clase dura una hora y nadie puede perder lo que escribió.</p><p>Usa los números del clon: un servidor de sesión por documento, cursores agrupados cada 50&#8239;ms, caché de permisos de 30 segundos y snapshots cada 500 revisiones. Decide el diseño decisión por decisión.</p>',
  steps: [
    {
      id: 'editores', type: 'single',
      prompt: '¿Quién edita y cómo reciben el documento los estudiantes?',
      options: [
        'Todos como editores conectados a la sesión, para que cualquiera pueda corregir un error en el momento.',
        'Solo la profesora y los ayudantes editan; los estudiantes leen desde un nivel de difusión.',
        'Cinco copias del documento con 100 estudiantes cada una, sincronizadas por un proceso aparte.',
        'Todos conectados a la sesión como lectores, cada uno con su cursor visible para los demás.'
      ],
      answer: 1,
      explain: 'Con 504 conexiones en la sesión, la presencia sola son 504 × 503 = unos 253&#8239;500 mensajes por ronda. Docs, además, no deja editar desde más de 100 pestañas o dispositivos a la vez. Los lectores no necesitan cada tecla: reciben las revisiones agrupadas cada segundo desde un nivel que solo reparte. Cinco copias sincronizadas a mano vuelven a crear el problema que resuelve el servidor de sesión (31.8 y 31.17).'
    },
    {
      id: 'presencia', type: 'single',
      prompt: '¿Qué presencia muestra el documento?',
      options: [
        'La de todos, juntando los cursores cada 50&#8239;ms en un mensaje por destinatario.',
        'Los cursores de los cuatro editores para todos, y los lectores como un número.',
        'Ninguna: en una clase la presencia distrae y cuesta más de lo que aporta.',
        'Los cursores de todos guardados en el log, para poder repetir la clase después.'
      ],
      answer: 1,
      explain: 'Cuatro cursores que cambian, repartidos a 504 destinatarios, son unos 2&#8239;000 mensajes por ronda, y agrupados cada 50&#8239;ms son pocos. Juntar ayuda, pero no cambia que 500 cursores a 500 personas crecen con el cuadrado. La presencia nunca va al log: no se guarda y la corrige el mensaje siguiente (31.10).'
    },
    {
      id: 'preguntas', type: 'single',
      prompt: 'Los estudiantes quieren preguntar sobre un párrafo concreto. ¿Cómo?',
      options: [
        'Con permiso de comentar: comentarios anclados a un rango que se corre con cada revisión.',
        'Escribiendo la pregunta debajo del párrafo, con permiso de edición durante la clase.',
        'Con comentarios que guardan la posición absoluta del párrafo al momento de crearlos.',
        'En un chat aparte, junto al video de la clase, citando el número de línea del párrafo que no se entendió.'
      ],
      answer: 0,
      explain: 'Un comentario es un recurso aparte, no una op en el documento, así que no compite con la escritura de la profesora. Su rango se mueve con mover, con el inicio empujado y el fin no, y queda huérfano si se borra el texto. Una posición absoluta queda vieja con la primera tecla, igual que un número de línea (31.12).'
    },
    {
      id: 'caida', type: 'single',
      prompt: 'A las 10:30 se cae el servidor de sesión del documento. ¿Qué pasa?',
      options: [
        'Cada pestaña manda su copia entera al servidor nuevo, que se queda con la más reciente.',
        'Se reasigna con época mayor; el nuevo dueño carga snapshot y log, y los clientes reconectan con jitter.',
        'Las pestañas esperan a que el mismo servidor vuelva a arrancar, porque solo él tiene el documento en memoria.',
        'Todas las pestañas reconectan en el mismo segundo para no perder tiempo de clase.'
      ],
      answer: 1,
      explain: 'Lo confirmado está en el log, así que snapshot más log reconstruyen el documento exacto. Lo que la profesora escribió sin ack está en su buffer y se reenvía con el mismo (cliente, seq): no se pierde ni se duplica. El jitter evita que 504 reconexiones caigan juntas. Quedarse con la copia más reciente es gana el último, y pierde trabajo (31.8 y 31.17).'
    },
    {
      id: 'revocar', type: 'single',
      prompt: 'A las 10:20 un estudiante pega spam en los comentarios y la profesora lo quita del documento. ¿Cómo se aplica?',
      options: [
        'Se borra de la ACL y la caché de permisos lo deja afuera cuando venza, en 30 segundos como mucho.',
        'El watch avisa a la sesión, que olvida lo guardado, pregunta con el zookie del cambio y cierra su conexión.',
        'Se oculta el botón de comentar en su pantalla y la profesora borra a mano sus comentarios desde el editor, uno por uno.',
        'Se genera un enlace nuevo para la clase y se lo manda a los 499 estudiantes que quedan.'
      ],
      answer: 1,
      explain: 'Los 30 segundos son el respaldo si el watch falla, no el camino normal. El zookie hace que el check nuevo no lo responda una réplica que todavía no vio la revocación (new enemy). Ocultar un botón no impone nada: el permiso lo decide el servidor (31.13).'
    },
    {
      id: 'restaurar', type: 'single',
      prompt: 'A las 10:45 un ayudante borra por error media hora de apuntes, y la profesora sigue escribiendo. ¿Cómo se vuelve a la versión de las 10:05?',
      options: [
        'Se borran del log las revisiones posteriores a las 10:05 y se recarga a todos.',
        'Una op nueva, calculada con invertir y componer, que pasa por la sesión como cualquier otra.',
        'Se copia la versión de las 10:05 en un documento nuevo y se comparte otro enlace.',
        'Se bloquea el documento, se escribe encima la versión vieja y se desbloquea.'
      ],
      answer: 1,
      explain: 'Restaurar no reescribe el log: es un cambio más, transformado contra lo que la profesora escriba mientras tanto, y queda en el historial. Pero cuidado: también deshace lo escrito después de las 10:05 que sí servía. Si lo único malo fue el borrado del ayudante, alcanza con invertir solo esa revisión (31.11).'
    }
  ],
  solution: '<ul>' +
    '<li><b>Edición:</b> la profesora y los tres ayudantes son los únicos editores conectados a la sesión. Los 500 estudiantes leen desde un nivel de difusión que reparte las revisiones agrupadas cada segundo.</li>' +
    '<li><b>Presencia:</b> los cursores de los cuatro editores para todos, agrupados cada 50&#8239;ms; los lectores como un número.</li>' +
    '<li><b>Preguntas:</b> permiso de comentar, con comentarios anclados que siguen al texto y quedan huérfanos si se borra.</li>' +
    '<li><b>Caída:</b> reasignación con época mayor, snapshot más log, reconexión con backoff y jitter, y reenvío con el mismo (cliente, seq). El log condicional protege si el servidor viejo vuelve.</li>' +
    '<li><b>Revocar:</b> watch, olvidar con el zookie del cambio y cerrar la conexión; la caché de 30 segundos es el respaldo.</li>' +
    '<li><b>Restaurar:</b> una op nueva sobre la revisión actual, que queda en el historial. Si el error es una sola revisión, invertir solo esa.</li>' +
    '</ul>'
});
