SD.defineExercise('m64-monorepo', {
  title: 'el harness de un monorepo grande',
  scenario: '<p>Tu equipo arma un harness interno para un monorepo de TypeScript: 2.4 millones de líneas, 180 paquetes, pruebas que tardan 9 minutos completas y un build que imprime unas 15&#8239;000 líneas. El modelo tiene una ventana de 200&#8239;000 tokens. El equipo conectó 6 servidores MCP (tickets, documentación, base de datos, observabilidad, CI, diseño) que suman 35&#8239;000 tokens de definiciones. Las sesiones típicas duran 60 a 100 turnos. Decide pieza por pieza.</p>',
  steps: [
    { id: 'buscar', type: 'single',
      prompt: 'El agente gasta 15 turnos en encontrar dónde se calcula un descuento. ¿Qué cambias primero?',
      options: [
        'Reemplazar grep por un índice de embeddings y quitar la búsqueda exacta, que en este tamaño ya no sirve',
        'Un mapa de paquetes corto en la memoria, para saber dónde mirar, y grep para lo exacto',
        'Subir la ventana del modelo para que pueda leer más archivos enteros en cada vuelta de búsqueda',
        'Lanzar un subagente por paquete en paralelo para que cada uno busque en su parte del árbol y devuelva lo que encontró'
      ],
      answer: 1,
      explain: 'Un mapa corto dice dónde mirar y grep encuentra lo exacto. Sacar grep pierde los nombres exactos; 180 subagentes cuestan 180 system prompts.' },
    { id: 'tests', type: 'single',
      prompt: 'El agente corre la suite completa (9 minutos) después de cada cambio y choca con el timeout de 2 minutos. ¿Qué haces?',
      options: [
        'En la memoria, el comando que prueba solo el paquete cambiado; la suite, al final',
        'Subir el timeout de bash a 15 minutos para que la suite completa pueda terminar en cada cambio',
        'Prohibir en la memoria que el agente corra pruebas, y dejarlas para el CI después del push',
        'Recortar la salida de las pruebas a 20 líneas para que el comando termine antes del timeout'
      ],
      answer: 0,
      explain: 'Recortar la salida no acelera el comando. Subir el timeout funciona pero gasta 9 minutos por iteración. Sin pruebas, el agente no sabe si terminó.' },
    { id: 'build', type: 'single',
      prompt: 'El build imprime 15&#8239;000 líneas y el error importa. ¿Qué recorte usa la herramienta de bash?',
      options: [
        'Las primeras 100 líneas, porque los errores de TypeScript se reportan al principio del build',
        'Ninguno: la ventana es grande y el modelo necesita todo el contexto para entender el error',
        'Cabeza y cola con un aviso de cuántas líneas se omitieron, y el exit code del comando siempre',
        'Un resumen del build escrito por un modelo chico antes de devolverlo al agente principal'
      ],
      answer: 2,
      explain: '15&#8239;000 líneas son decenas de miles de tokens por turno. La cola trae el error y el resumen; el exit code dice si falló. Un resumen con otro modelo puede perder justo la línea que importa.' },
    { id: 'mcp', type: 'single',
      prompt: '35&#8239;000 tokens de definiciones MCP en cada turno. ¿Qué haces?',
      options: [
        'Nada: con prompt caching esos tokens se leen a un décimo del precio y no molestan',
        'Mover las definiciones al final del system para que no rompan la caché del resto del prefijo estable',
        'Fusionar los 6 servidores en uno con una sola herramienta genérica que reciba el nombre de la acción',
        'Cargar servidores por tarea o herramientas bajo demanda; fijos, solo los de siempre'
      ],
      answer: 3,
      explain: 'La caché abarata, pero la ventana sigue ocupada y la compactación llega antes. Una herramienta genérica pierde el esquema de cada acción. Cargar bajo demanda es el tema de M67.' },
    { id: 'edit', type: 'single',
      prompt: 'Un cambio de API toca 40 archivos con el mismo patrón. ¿Cómo edita el agente?',
      options: [
        'Reescribe cada archivo entero, porque son muchos y así no hay errores de coincidencia',
        'Un codemod que el agente escribe, corre con bash y revisa con git diff antes de seguir',
        'Un único old_string con replace_all sobre todo el repositorio desde la herramienta de edición del harness',
        'Un subagente por archivo, para que cada uno edite sin el contexto de los demás'
      ],
      answer: 1,
      explain: 'Un cambio mecánico en muchos archivos es trabajo para un script (un codemod) revisado con git diff. replace_all es por archivo, y 40 subagentes repiten el mismo razonamiento 40 veces.' },
    { id: 'sesion', type: 'single',
      prompt: 'Después de 80 turnos y dos compactaciones, el agente vuelve a probar un arreglo que ya había fallado. ¿Qué pieza lo evita?',
      options: [
        'La lista de tareas con lo probado anotado, y compactar con instrucciones de qué conservar',
        'Desactivar la compactación automática para que el historial nunca se resuma',
        'Un subagente revisor que relea el transcript completo antes de cada edición',
        'Un archivo de memoria con todos los errores del proyecto, actualizado por el agente en cada turno'
      ],
      answer: 0,
      explain: 'El resumen pierde detalles; lo que importa para seguir tiene que vivir en estado visible. Sin compactar, la sesión choca con la ventana. Ver 64.7 y 64.8.' }
  ],
  solution: '<ul><li><b>Memoria corta y útil:</b> el mapa de paquetes en unas 40 líneas, el comando para probar un paquete, la regla de correr la suite completa solo al final y los lugares prohibidos.</li><li><b>Búsqueda:</b> grep y glob para lo exacto, guiados por el mapa; un índice solo si las vueltas siguen siendo muchas.</li><li><b>Bash:</b> timeout de 2 minutos, procesos largos en segundo plano, salida con cabeza y cola, exit code siempre.</li><li><b>Herramientas:</b> 1 o 2 servidores MCP fijos, el resto por tarea o bajo demanda (M67).</li><li><b>Edición:</b> reemplazo exacto para cambios puntuales y codemods para los mecánicos, revisados con <code>git diff</code>.</li><li><b>Contexto:</b> lista de tareas con lo probado, compactación con instrucciones, subagentes para explorar y devolver rutas y líneas.</li></ul>'
});
