SD.defineExercise('m65-elegir', {
  title: 'el harness de una fintech de 12 personas',
  scenario: '<p>Una fintech de 12 personas desarrolla en Go y TypeScript. El código de pagos está bajo auditoría y el contrato con un banco dice que no puede salir de su nube privada; el resto del código sí puede usar APIs comerciales con zero data retention. Quieren un agente para el trabajo diario y otro que corrija pruebas rotas en CI de noche. Tienen GPUs para servir un modelo abierto de tamaño medio. Decide paso a paso.</p>',
  steps: [
    { id: 'partir', type: 'single',
      prompt: 'El código de pagos no puede salir. ¿Cómo lo resuelves?',
      options: [
        'Un harness para todo, apuntado a la API comercial con ZDR, porque ZDR garantiza que los datos no se guardan',
        'Separar: el repositorio de pagos con un harness apuntado al modelo propio; el resto puede usar la API',
        'Prohibir el agente en todo el código hasta que exista un modelo propio tan bueno como el comercial',
        'Usar la API comercial también en pagos, con un filtro que borre del prompt los nombres de los clientes'
      ],
      answer: 1,
      explain: 'ZDR controla la retención, no que los datos salgan, y el contrato prohíbe que salgan. Un filtro de nombres no saca el código. Separar por repositorio respeta el contrato sin renunciar al resto.' },
    { id: 'elim', type: 'single',
      prompt: '¿Qué criterios son eliminatorios para el harness de pagos?',
      options: [
        'Que se integre con el IDE que usa el equipo y que tenga la mayor cantidad de extensiones disponibles',
        'Que tenga la licencia más permisiva disponible y una comunidad grande de usuarios',
        'Que encabece los rankings públicos con el modelo abierto que pueden servir',
        'Que hable con un servidor propio, sin telemetría que salga, y con transcript para la auditoría'
      ],
      answer: 3,
      explain: 'Esas tres cosas, si faltan, invalidan el harness para ese repositorio. El IDE y las extensiones suman puntos; la licencia y los rankings ordenan, no descartan.' },
    { id: 'ci', type: 'single',
      prompt: 'Para el agente nocturno de CI, ¿qué pesa más en la matriz?',
      options: [
        'Headless con salida JSON, permisos declarados en el repositorio y un sandbox que no deja salir a la red',
        'Que sea el mismo harness que usa el equipo de día, aunque no tenga modo headless',
        'La integración con el editor, para que el equipo pueda seguir en vivo lo que hace el agente durante la noche y frenarlo',
        'Que use el modelo más grande disponible, porque de noche la latencia no importa'
      ],
      answer: 0,
      explain: 'Sin nadie mirando, lo que importa es que corra solo, que sus permisos sean revisables y que no pueda sacar nada si lee algo malicioso. El modelo se elige midiendo.' },
    { id: 'set', type: 'single',
      prompt: 'Quedan dos harnesses y dos modelos para el trabajo diario. ¿Cómo arman el set?',
      options: [
        'Con SWE-bench, que tiene tareas reales verificadas y resultados publicados para comparar con otros',
        'Con 10 tareas inventadas por el líder técnico, que conoce bien el tipo de trabajo del equipo y sabe cuáles son difíciles de verdad',
        'Con 60 tareas de PR cerrados en Go y TypeScript, cada una con su commit base y la prueba que decide si se resolvió',
        'Con las tareas de la semana que viene, resueltas en vivo por el equipo con cada combinación'
      ],
      answer: 2,
      explain: 'Tareas reales del repo, con prueba que decide y en cantidad suficiente para que las diferencias se distingan. SWE-bench es Python ajeno; 10 tareas son puro ruido; el trabajo en vivo no se repite igual.' },
    { id: 'metrica', type: 'single',
      prompt: 'Para el agente de CI corren k = 4 por tarea. ¿Qué miran primero?',
      options: [
        'pass@4, porque si el agente lo logra alguna vez, CI puede reintentar hasta que salga',
        'El promedio de tokens por corrida, porque el costo es lo único que cambia entre combinaciones',
        'pass^4, y de a pares las tareas que una combinación resolvía siempre y la otra no',
        'Los minutos por tarea, porque de noche lo que importa es que termine antes de la mañana'
      ],
      answer: 2,
      explain: 'Un agente que abre PR solo tiene que ser consistente: pass^k. Y de a pares, para encontrar regresiones que el promedio esconde. Costo y minutos se miran después, entre las que aciertan parecido.' },
    { id: 'salida', type: 'single',
      prompt: 'Eligieron. ¿Qué dejan listo para poder cambiar en seis meses?',
      options: [
        'Un contrato de dos años con el proveedor del harness, que asegura soporte y precio estables',
        'AGENTS.md con las reglas, integraciones por MCP, el set de tareas versionado y el script de CI propio',
        'Una copia local congelada del harness elegido, para no depender de sus versiones nuevas ni de los cambios de su formato de configuración',
        'Toda la configuración en los formatos propios del harness, que son los que mejor documenta'
      ],
      answer: 1,
      explain: 'Con formatos abiertos y el set de tareas, comparar un candidato nuevo es una corrida de una noche. Congelar la versión o atarse por contrato encarece el cambio.' }
  ],
  solution: '<ul><li><b>Dos zonas:</b> pagos con un harness abierto apuntado al modelo propio, sin telemetría y con transcript; el resto, con API comercial y ZDR.</li><li><b>Eliminatorios primero:</b> servidor propio para pagos; headless, permisos versionados y sandbox sin red para CI.</li><li><b>Set propio:</b> unas 60 tareas de PR cerrados con commit base y prueba, en los dos lenguajes.</li><li><b>Medición:</b> 2 × 2 (harness × modelo), k = 4, pass^k para CI y pass@k para el trabajo con revisión, de a pares y buscando regresiones; tokens y minutos por tarea resuelta.</li><li><b>Salida:</b> AGENTS.md, MCP, set versionado y un script de CI que se cambia en un lugar.</li></ul>'
});
