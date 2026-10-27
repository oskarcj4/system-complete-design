SD.defineExercise('m55-pipeline', {
  title: 'el pipeline de seguridad de un equipo nuevo',
  scenario: '<p>Un equipo de seis personas mantiene la API de reservas de un gimnasio (Java y Spring, PostgreSQL, GitHub Actions). '
    + 'Hoy el pipeline solo compila y corre las pruebas en <b>4 minutos</b>. La semana pasada encontraron un token de su PSP en un archivo de configuración '
    + 'subido hace ocho meses. Te piden armar el pipeline de seguridad sin que el PR pase de <b>8 minutos</b>.</p>',
  steps: [
    {
      id: 'token', type: 'single',
      prompt: 'Primero, el token del PSP que está en el historial desde hace ocho meses. ¿Qué haces?',
      options: [
        'Reescribir el historial para sacarlo y obligar a todos a clonar de nuevo',
        'Revocarlo en el PSP, emitir uno nuevo y revisar en los logs si alguien lo usó',
        'Dejarlo: el repositorio es privado y nadie de afuera tiene acceso a él',
        'Agregar el archivo al .gitignore para que no se vuelva a subir nunca'
      ],
      answer: 1,
      explain: 'Ocho meses en el historial es tiempo de sobra para que esté en clones, forks y copias. Se revoca, se rota y se revisa si hubo uso. Reescribir el historial es opcional y no reemplaza la rotación.'
    },
    {
      id: 'commit', type: 'single',
      prompt: '¿Qué pones para que no vuelva a pasar con un secreto nuevo?',
      options: [
        'Un hook de pre-commit con gitleaks y push protection en el servidor',
        'Un escaneo semanal del historial completo con un informe por correo',
        'Una regla en el WAF que bloquee respuestas con formato de token',
        'Una revisión manual de cada archivo de configuración en los PR'
      ],
      answer: 0,
      explain: 'Las dos barreras tempranas paran el secreto antes de que exista en el servidor. El escaneo del historial llega tarde y la revisión manual se olvida.'
    },
    {
      id: 'sast', type: 'single',
      prompt: 'El primer escaneo de SAST sobre todo el repositorio da 640 hallazgos. ¿Cómo lo metes en el PR?',
      options: [
        'Bloquear el merge hasta que el equipo arregle los 640 hallazgos',
        'Apagar el SAST hasta tener tiempo de revisar todos los hallazgos',
        'Bloquear con reglas de alta precisión, solo sobre el código nuevo',
        'Correrlo completo en cada PR y que avise, pero sin bloquear nada'
      ],
      answer: 2,
      explain: 'El código nuevo se mantiene limpio con reglas precisas; los 640 del histórico son una deuda que se prioriza aparte (M58). Bloquear todo frena al equipo y avisar todo genera ruido que nadie lee.'
    },
    {
      id: 'reservas', type: 'single',
      prompt: 'El riesgo más serio del threat model es que un socio cancele reservas de otro. ¿Qué lo atrapa?',
      options: [
        'Un DAST activo contra staging que pruebe todos los endpoints',
        'Una prueba de abuso: el socio A intenta cancelar una reserva de B',
        'El SCA, porque revisa las librerías de autorización del proyecto',
        'Un SAST con la regla de autorización faltante en los controladores'
      ],
      answer: 1,
      explain: 'Es una BOLA sobre reservas. Los escáneres no saben de quién es cada reserva; una prueba con dos usuarios sí, y corre en segundos en cada PR.'
    },
    {
      id: 'sca', type: 'single',
      prompt: 'El SCA reporta 23 vulnerabilidades: 1 crítica con exploit público, 4 altas y 18 medias. ¿Qué bloquea?',
      options: [
        'Las 23, porque cualquier vulnerabilidad conocida es un riesgo abierto',
        'Ninguna, porque las dependencias no son código del equipo',
        'Las críticas y las altas, y las medias quedan para el próximo sprint',
        'La crítica con exploit público; el resto entra a la cola'
      ],
      answer: 3,
      explain: 'Lo que casi seguro se va a explotar bloquea; el resto se prioriza con el contexto (si el código usa la función vulnerable, si está expuesto), que es el tema de M58.'
    },
    {
      id: 'dast', type: 'single',
      prompt: '¿Dónde pones el DAST?',
      options: [
        'Baseline pasivo tras cada despliegue a staging y activo cada noche',
        'Activo en cada PR, porque es la única forma de probar la app real',
        'Contra producción, porque es donde está la configuración verdadera',
        'En ningún lado: el SAST ya cubre lo mismo que encontraría el DAST'
      ],
      answer: 0,
      explain: 'El activo tarda y manda ataques: solo contra un entorno propio, fuera del camino del merge. El baseline es rápido y atrapa headers, cookies y errores que filtran datos.'
    }
  ],
  solution: '<ul>'
    + '<li><b>El token:</b> revocar, rotar al gestor de secretos y revisar los logs del PSP.</li>'
    + '<li><b>Commit:</b> gitleaks en pre-commit y push protection.</li>'
    + '<li><b>Pull request (bloquea):</b> Semgrep con reglas de alta precisión sobre el diff, pruebas de abuso de autorización, revisión con la lista corta.</li>'
    + '<li><b>Build:</b> SCA que bloquea solo críticas con exploit público; el resto a la cola.</li>'
    + '<li><b>Staging:</b> ZAP baseline tras cada despliegue y activo cada noche.</li>'
    + '<li><b>Tiempo:</b> el PR queda cerca de los 8 minutos porque el SAST mira el diff y lo lento corre fuera del merge.</li>'
    + '</ul>'
});
