/* Decisiones guiadas de WEB10 (carreras y lógica de negocio). Formato en core/exercise.js. */

SD.defineExercise('web10-carreras', {
  title: 'las carreras del sistema de prácticas',
  scenario: '<p>Dos reclutadores revisan la misma oferta, y los estudiantes se postulan, se retiran y se vuelven a postular. Cada request por separado valida, autoriza y usa consultas preparadas. La re-auditoría encontró tres lugares donde el código lee, decide en PHP y después escribe. Son seis decisiones.</p>',
  steps: [
    {
      id: 'lock', type: 'single',
      prompt: '<code>changeState</code> ya abre una transacción antes de escribir. Si la lectura del estado se mueve dentro de esa transacción, sin cambiar el <code>SELECT</code>, ¿se cierra la carrera de dos cambios a la vez?',
      options: [
        'Sí: dentro de una transacción, la segunda request no puede leer la fila hasta que la primera confirme.',
        'No: en REPEATABLE READ un SELECT común lee una foto consistente y no espera; hace falta FOR UPDATE.',
        'Sí, pero solo si el aislamiento se sube a READ COMMITTED, que ve lo que las otras ya confirmaron.',
        'No: InnoDB no permite leer y escribir la misma fila dentro de una sola transacción sin un LOCK TABLES.'
      ],
      answer: 1,
      explain: 'Una lectura sin lock no espera a nadie: las dos requests leen <code>pendiente</code> y las dos escriben. READ COMMITTED no cambia eso, porque cuando las dos leen todavía nadie confirmó. Es la falla 1, y la explicación está en <a href="#paso-estado">el paso 3</a>.'
    },
    {
      id: 'reactivar', type: 'single',
      prompt: 'Diez requests reactivan a la vez la misma postulación retirada. ¿Qué cierra la carrera con menos piezas?',
      options: [
        'Volver a leer la fila justo antes del UPDATE y cortar con 409 si ya está activa.',
        'Un SELECT … FOR UPDATE en validarAlta, que se mantiene mientras se suben los archivos.',
        'Agregar AND estado = 0 al WHERE del UPDATE y responder 409 cuando cambia 0 filas.',
        'Una llave única nueva sobre (id, estado), para que la base rechace la segunda activa.'
      ],
      answer: 2,
      explain: 'La decisión es una sola condición, así que cabe en el <code>WHERE</code>: la base la evalúa y escribe en el mismo paso. Releer achica la ventana sin cerrarla, y el lock durante la subida hace esperar a todos. Está en <a href="#paso-reactivar">el paso 2</a>.'
    },
    {
      id: 'desde', type: 'single',
      prompt: 'Con el <code>FOR UPDATE</code> puesto, ¿para qué manda el frontend <code>desde</code>, el estado que tenía la postulación en pantalla?',
      options: [
        'Para que la segunda request, que ya lee el estado nuevo, no escriba sobre un estado que su reclutador no vio.',
        'Para que el backend no tenga que leer la fila: el estado anterior del historial sale directo del frontend.',
        'Para que el lock dure menos: con desde, la base sabe qué versión esperar y libera la fila antes del commit.',
        'Para validar el CSRF: desde viaja junto al token y prueba que el pedido salió de la pantalla del reclutador.'
      ],
      answer: 0,
      explain: 'El lock pone las requests en fila, pero no evita que la segunda rechace una postulación que la primera acaba de aceptar. Comparar con lo que vio el reclutador la convierte en un 409. El estado del historial sigue saliendo de la base. Está en <a href="#paso-reglas">el paso 1</a>.'
    },
    {
      id: 'join', type: 'single',
      prompt: 'La lectura original de <code>changeState</code> tenía un <code>JOIN</code> a <code>oportunidades</code> para el título. ¿Por qué el título se lee aparte en lugar de poner <code>FOR UPDATE</code> en la consulta con el <code>JOIN</code>?',
      options: [
        'Porque MariaDB no acepta FOR UPDATE en una consulta con JOIN y responde un error de sintaxis.',
        'Porque bloquearía también la fila de la oferta, y cambios a postulaciones distintas se esperarían.',
        'Porque con el JOIN el lock dura hasta que se cierra la conexión, y no hasta el commit de la request.',
        'Porque el título puede cambiar en medio, y una lectura aparte siempre trae el valor confirmado.'
      ],
      answer: 1,
      explain: 'Un <code>FOR UPDATE</code> bloquea las filas de todas las tablas que lee. Dos reclutadores que cambian postulaciones distintas de la misma oferta quedarían en fila sin motivo. Está en la decisión del <a href="#paso-estado">paso 3</a>.'
    },
    {
      id: 'cupos', type: 'single',
      prompt: 'Mañana la oferta tiene 3 cupos, y aceptar una postulación consume uno. ¿Dónde va el descuento del cupo?',
      options: [
        'En el frontend: el botón de aceptar se deshabilita cuando la lista ya tiene tres aceptadas.',
        'En un script nocturno que cuenta las aceptadas y rechaza las que pasaron del cupo.',
        'En un SELECT COUNT(*) de las aceptadas antes del UPDATE, comparado con el cupo en PHP.',
        'En un UPDATE … WHERE cupos &gt; 0 dentro de la misma transacción del cambio de estado.'
      ],
      answer: 3,
      explain: 'Contar y comparar en PHP es otra vez leer, decidir y escribir: dos aceptaciones a la vez ven dos cupos. El <code>UPDATE</code> condicional dentro de la transacción descuenta o no cambia nada, y si no cambia nada se deshace todo. Es el patrón de <a href="../modules/m83-otros-ataques.html#carreras">83.6</a>, en <a href="#limites">Limitaciones</a>.'
    },
    {
      id: 'pausa', type: 'single',
      prompt: '¿Por qué la guía deja la pausa de 300&#8239;ms puesta mientras compruebas el arreglo, y recién la borra después?',
      options: [
        'Porque sin la pausa el arreglo no funciona: el lock necesita unos milisegundos para tomarse.',
        'Porque la pausa simula la red de producción, y el arreglo solo vale si aguanta esa latencia.',
        'Porque con la ventana abierta a propósito la carrera pasa siempre, y el arreglo no gana por suerte.',
        'Porque Apache atiende una request por vez sin la pausa, y las carreras no se pueden provocar.'
      ],
      answer: 2,
      explain: 'Sin la pausa, que diez requests caigan en una ventana de microsegundos depende de tu máquina: un <code>Todo bien.</code> podría ser suerte. Con la ventana ancha, si el arreglo pasa, pasa con la ventana real. Está en <a href="#infra-pausa">Ensanchar la ventana</a>.'
    }
  ],
  solution: '<ul><li>Lectura con <code>SELECT … FOR UPDATE</code> dentro de la transacción: una transacción sola no espera a nadie.</li><li>Reactivación con <code>AND estado = 0</code> y <code>rowCount()</code>.</li><li><code>desde</code> en el cambio de estado, para no escribir sobre lo que no se vio.</li><li>El título fuera del lock, para no bloquear la oferta.</li><li>Un cupo, si llega, con <code>UPDATE … WHERE cupos &gt; 0</code> en la misma transacción.</li><li>La pausa puesta durante la comprobación, y borrada al final.</li></ul>'
});
