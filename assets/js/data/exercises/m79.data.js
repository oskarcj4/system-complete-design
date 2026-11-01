SD.defineExercise('m79-exportar', {
  title: 'exportar postulaciones sin abrir siete intérpretes',
  scenario: '<p>La coordinación pide una función nueva: exportar las postulaciones de una oportunidad, ordenadas por la columna que elija la persona, a un PDF que se genera con <code>wkhtmltopdf</code> y se manda por correo con un texto que cada institución personaliza. Cada exportación queda registrada en el log. Decide cómo se escribe cada parte.</p>',
  steps: [
    { id: 'orden', type: 'single',
      prompt: 'La persona elige ordenar por fecha, nombre o estado. ¿Cómo llega eso a la consulta?',
      options: [
        'Con ORDER BY ? y el nombre de la columna como parámetro',
        'Una lista que traduce cada clave a un fragmento fijo',
        'Concatenado, después de comprobar que la columna existe en la tabla',
        'Concatenado con PDO::quote, que escapa cualquier valor'
      ],
      answer: 1,
      explain: 'Un parámetro es un valor, no una columna. Comprobar que existe deja ordenar por columnas que no quieres exponer. quote produce un literal. La lista decide qué SQL corre.' },
    { id: 'pdf', type: 'single',
      prompt: '¿Cómo llamas a wkhtmltopdf con la ruta del HTML y la del PDF?',
      options: [
        'exec con escapeshellarg en cada argumento',
        'shell_exec con las rutas validadas por una regex de caracteres seguros',
        'proc_open con un arreglo de argumentos y -- antes de las rutas',
        'system, porque las rutas las genera el servidor y no el usuario'
      ],
      answer: 2,
      explain: 'Sin shell no hay nada que escapar. escapeshellarg funciona si nadie lo olvida; la regex y el "lo genera el servidor" fallan cuando alguien cambia el código. El -- evita que una ruta se lea como opción.' },
    { id: 'texto', type: 'single',
      prompt: 'El texto del correo lo escribe cada institución y menciona al estudiante. ¿Cómo lo armas?',
      options: [
        'Con createTemplate de Twig, para que puedan usar {{ estudiante.nombre }}',
        'Con Twig en modo sandbox y todas las funciones permitidas',
        'Con eval de un heredoc, porque PHP ya interpola las variables',
        'Con marcadores fijos como [nombre], reemplazados con strtr'
      ],
      answer: 3,
      explain: 'Compilar el texto del usuario es SSTI, y un sandbox con todo permitido no es un sandbox. eval es peor. strtr reemplaza marcadores sin evaluar nada.' },
    { id: 'correo', type: 'single',
      prompt: 'El correo va a la dirección que la institución configuró. ¿Con qué lo mandas?',
      options: [
        'Con una librería de correo que valida cada dirección',
        'Con mail() y la dirección en las cabeceras adicionales',
        'Con mail(), quitando los espacios de la dirección antes',
        'Con un comando sendmail armado con la dirección'
      ],
      answer: 0,
      explain: 'Un salto de línea en las cabeceras de mail() agrega destinatarios; quitar espacios no quita \\r\\n. sendmail por shell suma una inyección de comandos. La librería valida y arma las cabeceras.' },
    { id: 'log', type: 'single',
      prompt: '¿Cómo registras la exportación?',
      options: [
        'error_log con el nombre de la oportunidad pegado en el mensaje',
        'Un JSON por línea con el usuario, la oportunidad y el número de filas',
        'Un archivo por exportación, con el nombre que eligió la persona',
        'En la tabla de auditoría, armando el INSERT con los valores'
      ],
      answer: 1,
      explain: 'El título de la oportunidad puede traer saltos de línea. Un nombre de archivo elegido por el usuario es path traversal. Un INSERT armado es SQLi. JSON por línea separa los campos.' }
  ],
  solution: '<ul><li><code>ORDER BY</code> desde una lista de claves (<code>fecha</code>, <code>nombre</code>, <code>estado</code>) a fragmentos fijos; el resto con parámetros.</li><li>HTML del reporte armado con <code>e()</code> de M77, escrito en un archivo temporal con nombre aleatorio.</li><li><code>proc_open([\'wkhtmltopdf\', \'--\', $html, $pdf], …)</code>, sin shell.</li><li>Texto del correo con marcadores fijos y <code>strtr</code>; envío con Symfony Mailer o PHPMailer.</li><li>Registro con un JSON por línea y la fila en <code>AuditLog</code> con parámetros.</li></ul>'
});
