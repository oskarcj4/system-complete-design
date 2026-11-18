/* Decisiones guiadas de WEB06 (control de acceso). Formato en core/exercise.js. */

SD.defineExercise('web06-acceso', {
  title: 'cerrar dos huecos de una API que ya autoriza',
  scenario: '<p>La API del sistema de prácticas pide sesión en todo y comprueba el dueño en cada rama. Aun así, <code>GET usuarios.php?q=</code> le devuelve a una estudiante la lista entera de usuarios, y una oferta cancelada por un administrador vuelve al feed con el botón "Reabrir". Son seis decisiones.</p>',
  steps: [
    {
      id: 'causa', type: 'single',
      prompt: '¿Por qué <code>?q=</code>, sin término, llega a <code>findAll()</code>?',
      options: [
        'Porque PHP convierte un parámetro vacío en null y el switch lo toma como si no hubiera filtros.',
        'Porque la regla decide con isset y el switch con el término no vacío: leen la request distinto.',
        'Porque el término vacío hace que el LIKE de search() coincida con todas las filas de la tabla.',
        'Porque requireAuth deja pasar las búsquedas sin revisar la sesión para que la lupa responda rápido.'
      ],
      answer: 1,
      explain: '<code>isset($_GET[\'q\'])</code> es verdadero con <code>q</code> vacío, así que la regla ve una búsqueda; el <code>switch</code> pregunta <code>$termino !== \'\'</code>, no busca, y cae hasta <code>findAll()</code>. La sesión sí se revisa. Está en <a href="#excusa">la figura WEB06.1</a>.'
    },
    {
      id: 'arreglo', type: 'single',
      prompt: '¿Cuál es el arreglo que no se vuelve a abrir con el próximo parámetro?',
      options: [
        'Cambiar el isset de la regla por una comparación con la cadena vacía, igual que el switch.',
        'Que el frontend nunca mande q vacío, validando el campo de búsqueda antes de llamar a la API.',
        'Decidir la acción una vez en una función y que la regla y el switch usen ese mismo valor.',
        'Quitar findAll() del endpoint para que, sin filtros, la API responda siempre una lista vacía.'
      ],
      answer: 2,
      explain: 'Igualar los dos <code>if</code> arregla este caso y deja dos lecturas de la request que mantener a mano. Con <code>accionGetUsuarios()</code> hay una sola, y el <code>match</code> del <code>switch</code> usa lo mismo que se autorizó. El frontend no es una defensa, y el admin sí necesita la lista. Está en <a href="#paso-reglas">el paso 1</a>.'
    },
    {
      id: 'default', type: 'single',
      prompt: 'En <code>puedeGetUsuarios</code>, ¿qué debe devolver una acción que nadie nombró en el <code>match</code>?',
      options: [
        'Solo el administrador: lo que nadie permitió a propósito queda cerrado hasta que alguien escriba su regla.',
        'Cualquier sesión, porque si nadie la nombró es una consulta nueva y todavía no tiene datos sensibles.',
        'Un error 500, para que quien agregó la acción se entere en las pruebas de que le falta la regla.',
        'El dueño del id que viene en la URL, porque es la regla más común en el resto de los endpoints.'
      ],
      answer: 0,
      explain: 'Fallar cerrado: una lista de lo permitido, no de lo prohibido. Si mañana aparece una acción sin regla, queda solo para el admin hasta que alguien decida otra cosa. La falla 1 lo prueba cambiando el <code>default</code>. Está en <a href="#paso-reglas">el paso 1</a>.'
    },
    {
      id: 'reabrir', type: 'single',
      prompt: 'Un admin le quitó el permiso de publicar a una estudiante y canceló sus ofertas. ¿Qué tiene que pedir el <code>PUT</code> que deja una oferta activa?',
      options: [
        'Que sea la creadora de la oferta, porque la oferta es suya y la regla de dueño ya está en el endpoint.',
        'Que la oferta no haya sido cancelada por un admin, guardando quién la canceló en una columna nueva.',
        'Nada más: alcanza con esconder el botón Reabrir en Mis ofertas a quien no tiene el permiso.',
        'El mismo permiso que publicar, con la misma función, porque el efecto es el mismo: una oferta en el feed.'
      ],
      answer: 3,
      explain: 'Reabrir es publicar por otra puerta. Ser la creadora no cambió, así que la regla de dueño sigue dejando pasar. Una columna nueva resuelve un caso y no la regla, y el botón es interfaz. Está en <a href="#paso-reabrir">el paso 4</a> y en la falla 3.'
    },
    {
      id: 'bajar', type: 'single',
      prompt: 'Y si la misma estudiante, sin permiso, quiere cerrar o cancelar una oferta suya que sigue activa, ¿qué responde la API?',
      options: [
        '403, porque sin el permiso de publicar ya no puede tocar ninguna de las ofertas que creó.',
        '200: cerrar o cancelar reduce lo que se expone, y tiene que poder bajar lo suyo.',
        '409, porque una oferta de alguien sin permiso solo la puede cambiar el administrador.',
        '200 solo si ninguna persona se postuló todavía, para no dejar postulaciones sin oferta.'
      ],
      answer: 1,
      explain: 'El permiso se pide según el efecto: dejar una oferta activa. Bajarla es lo contrario de lo que el permiso protege, y bloquearlo dejaría ofertas en el feed que su creadora quiere sacar. Está en <a href="#paso-reabrir">el paso 4</a>.'
    },
    {
      id: 'matriz', type: 'multi',
      prompt: 'Para que la matriz de <code>curl</code> pruebe autorización y no otra cosa, ¿qué hace el script? Marca todas las correctas.',
      options: [
        'Manda el token CSRF de cada sesión en las escrituras, para que un 403 no sea del token.',
        'Usa al admin para probar el acceso ajeno, porque es la cuenta que ve todos los recursos.',
        'Usa dos cuentas del mismo rol, para ver que una no lee lo de la otra.',
        'Desactiva requireAuth mientras corre, para medir solo las reglas de cada rama.'
      ],
      answer: [0, 2],
      explain: 'Con el token en regla, un 403 solo puede venir de la autorización. La BOLA se ve entre dos cuentas del mismo rol; un 200 del admin no prueba nada, porque puede todo. Y la matriz prueba la API como corre, con su sesión. Está en <a href="#comprueba-matriz">la matriz</a>.'
    }
  ],
  solution: '<ul><li>La acción de un <code>GET</code> a <code>usuarios.php</code> se decide una vez con <code>accionGetUsuarios()</code>; la regla y el <code>switch</code> usan ese valor.</li><li><code>puedeGetUsuarios()</code> falla cerrado: lo que no está nombrado es solo del admin.</li><li>"Puede publicar" es una función, <code>puedePublicar()</code>, en <code>permisos.php</code>, y la piden publicar y el <code>PUT</code> que deja una oferta activa.</li><li>Cerrar o cancelar no la pide.</li><li>La matriz de <code>web06.ps1</code> prueba 18 combinaciones con cuatro sesiones y el token CSRF de cada una.</li></ul>'
});
