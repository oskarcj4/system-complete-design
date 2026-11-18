/* Decisiones guiadas y predicciones de SEC01 (un pipeline que falla el build). Formato en core/exercise.js. */

SD.defineExercise('sec01-pipeline', {
  title: 'el pipeline de Tienda Norte',
  scenario: '<p>Tienda Norte tiene su repositorio en GitHub y dos personas que revisan los pull requests. Quieres que un commit con una clave, una consulta armada a mano o una dependencia con una vulnerabilidad conocida no lleguen a <code>main</code>, sin frenar cada cambio con falsos positivos. Son seis decisiones.</p>',
  steps: [
    {
      id: 'herramientas', type: 'single',
      prompt: '¿Cómo corren Semgrep, Trivy y ZAP dentro del workflow?',
      options: [
        'Con la acción de cada proyecto en su rama principal, que siempre trae la última versión con sus arreglos.',
        'Con su imagen de Docker en una versión exacta, y la única acción, checkout, fijada por SHA.',
        'Instaladas con pip y apt en cada corrida, sin versión, para no mantener una lista de números.',
        'Desde un runner propio donde las instalaste una vez a mano, para que el pipeline sea más rápido.'
      ],
      answer: 1,
      explain: 'Una acción en una rama o una etiqueta móvil corre el código que alguien publique mañana: así entró el Trivy malicioso de 2026. Con una imagen en una versión exacta y checkout por SHA, lo que corre es lo que revisaste. Está en <a href="#ae-fijar">Fijar lo que corre</a> y en <a href="../modules/m56-supply-chain.html#ci">56.4</a>.'
    },
    {
      id: 'historia', type: 'single',
      prompt: '¿Sobre qué corre gitleaks?',
      options: [
        'Solo sobre los archivos del commit, porque lo viejo ya se revisó cuando entró.',
        'Sobre la carpeta de trabajo, que es lo que se despliega.',
        'Sobre toda la historia del repositorio, con fetch-depth: 0 en el checkout.',
        'Sobre el diff del pull request contra main, para no repetir hallazgos viejos.'
      ],
      answer: 2,
      explain: 'Un secreto que se borró en el commit siguiente sigue en la historia, y cualquiera que clone el repositorio lo tiene. Por eso se escanea todo, y por eso un secreto que entró se rota en lugar de borrarse. Está en <a href="#paso-secretos">el paso 3</a>.'
    },
    {
      id: 'reglas', type: 'single',
      prompt: '¿Con qué reglas corre Semgrep la primera vez?',
      options: [
        'Con tres reglas propias que cortan el build, sobre errores que la tienda ya tuvo.',
        'Con todos los paquetes del registro de Semgrep a la vez, para no dejar nada afuera.',
        'Con el paquete de Python en modo aviso, sin cortar, hasta que alguien lo revise.',
        'Con ninguna: Semgrep sin configuración elige solo las reglas que sirven al lenguaje.'
      ],
      answer: 0,
      explain: 'Un gate que corta con cientos de reglas en el primer día se apaga en la primera semana. Pocas reglas que cortan, cada una sobre un error real, se respetan; el paquete del registro se suma después, primero en modo aviso. Está en <a href="#paso-sast">el paso 4</a> y en <a href="../modules/m55-appsec.html#sast">55.4</a>.'
    },
    {
      id: 'unfixed', type: 'single',
      prompt: 'Trivy encuentra una vulnerabilidad HIGH en un paquete de Debian de la imagen base, sin versión arreglada todavía. ¿Qué hace el pipeline?',
      options: [
        'Corta, porque HIGH es el umbral y la severidad es la única regla que vale.',
        'No corta por ella, con --ignore-unfixed: no hay nada que actualizar hasta que salga el arreglo.',
        'Corta, y la persona cambia la imagen base por otra distribución en el mismo pull request.',
        'No corta por ninguna vulnerabilidad de la imagen base, porque no las escribió la tienda.'
      ],
      answer: 1,
      explain: 'Un gate que corta por algo que nadie puede arreglar enseña a saltearlo. <code>--ignore-unfixed</code> deja afuera solo lo que no tiene arreglo; cuando sale, el siguiente build corta y se actualiza la base. Está en <a href="#paso-imagen">el paso 5</a>.'
    },
    {
      id: 'excepcion', type: 'single',
      prompt: 'Un hallazgo es un falso positivo de verdad. ¿Cómo se deja pasar?',
      options: [
        'Se borra la regla que lo marca, porque una regla con falsos positivos no sirve.',
        'Con un comentario nosemgrep solo, que es lo que trae Semgrep para eso.',
        'Bajando el umbral del job a WARN hasta que alguien tenga tiempo de verlo.',
        'Con nosemgrep y una línea de excepción con motivo y fecha que vence en 90 días o menos.'
      ],
      answer: 3,
      explain: 'Una excepción sin fecha se queda para siempre y nadie recuerda por qué. Con motivo y vencimiento, <code>excepciones.py</code> la vuelve a poner en la mesa. Borrar la regla o bajar el umbral apaga la detección para todo el código. Está en <a href="#paso-pruebas">el paso 2</a>.'
    },
    {
      id: 'permisos', type: 'single',
      prompt: '¿Qué permisos tiene el token del workflow?',
      options: [
        'Los que trae GitHub por defecto, que alcanzan para comentar en el PR con los hallazgos.',
        'Escritura, para que una herramienta suba el arreglo sola.',
        'Solo lectura del contenido, y checkout sin dejar la credencial en el disco.',
        'Ninguno: el workflow corre sin token, y el checkout baja el código por HTTPS público.'
      ],
      answer: 2,
      explain: 'Un pipeline que corre código de un pull request es un blanco: si una herramienta se ve comprometida, solo puede leer. <code>persist-credentials: false</code> evita que el token quede en <code>.git/config</code> para los pasos siguientes. Está en <a href="#paso-workflow">el paso 7</a>.'
    }
  ],
  solution: '<ul><li>Cada herramienta en su imagen con versión exacta; checkout por SHA.</li><li>gitleaks sobre toda la historia, y un secreto que entró se rota.</li><li>Tres reglas propias de Semgrep que cortan.</li><li>Trivy con HIGH y CRITICAL y <code>--ignore-unfixed</code>.</li><li>Excepciones con motivo y vencimiento, revisadas por un script.</li><li>Token de solo lectura y credencial fuera del disco.</li></ul>'
});

SD.defineExercise('sec01-p-excepcion', {
  kind: 'predict', title: 'una excepción que vence en febrero',
  scenario: '<p>Hoy es 9 de noviembre de 2026. En el código hay una excepción con <code>hasta=2027-02-08</code> encima de su <code>nosemgrep</code>.</p>',
  steps: [{
    id: 'pasa', type: 'single',
    prompt: '¿Qué dice <code>excepciones.py</code>?',
    options: [
      'Nada: la fecha está en el futuro, así que la excepción vale',
      'Que vence a más de 90 días: del 9 de noviembre al 8 de febrero son 91',
      'Que la fecha no existe, porque febrero no se valida en el año siguiente',
      'Nada: el tope de 90 días se cuenta en meses, y son menos de tres'
    ],
    answer: 1,
    explain: 'Del 9 de noviembre al 9 de diciembre son 30 días, al 9 de enero 61, y al 8 de febrero 91. La marca (2) compara <code>fecha - hoy &gt; MAXIMO</code> con <code>timedelta(days=90)</code>: 91 es más. El 7 de febrero pasaría, y es lo que prueba <code>test_vencida_o_demasiado_lejos_falla</code>.'
  }]
});

SD.defineExercise('sec01-p-gitleaks', {
  kind: 'predict', title: 'qué líneas ve la regla propia',
  scenario: '<p>La regla <code>tienda-db-clave</code> de <code>gitleaks.toml</code> revisa estas cuatro líneas: <code>TIENDA_DB_CLAVE=cambia-esta-clave-larga</code> del <code>.env</code>; <code>POSTGRES_PASSWORD: ${TIENDA_DB_CLAVE:?Define…}</code> y <code>TIENDA_DSN: postgresql://tienda:${TIENDA_DB_CLAVE}@db…</code> del compose; y <code>echo "TIENDA_DB_CLAVE=$(openssl rand -hex 16)"</code> del workflow.</p>',
  steps: [{
    id: 'cuantas', type: 'single',
    prompt: '¿Cuántas coinciden?',
    options: ['Ninguna', 'Una', 'Dos', 'Las cuatro'],
    fixed: true,
    answer: 1,
    explain: 'La regla pide <code>TIENDA_DB_CLAVE</code>, un <code>=</code> y ocho caracteres que no sean espacio, comilla ni <code>$</code>. Las del compose no tienen <code>=</code> después del nombre, y la del workflow sigue con <code>$(</code>, que la clase excluye. Solo la del <code>.env</code>.'
  }]
});

SD.defineExercise('sec01-p-semgrep', {
  kind: 'predict', title: 'tres consultas contra la regla',
  scenario: '<p>Semgrep corre <code>tienda-sql-armado</code> sobre tres líneas: <code>db.execute(f"SELECT … WHERE nombre ILIKE \'%{q}%\'")</code>, <code>db.execute("SELECT … WHERE nombre ILIKE %s", (f"%{q}%",))</code> y <code>db.execute("SELECT … WHERE id = " + pid)</code>.</p>',
  steps: [{
    id: 'marca', type: 'single',
    prompt: '¿Cuáles marca?',
    options: [
      'La primera y la tercera',
      'Las tres, porque las tres tienen un f-string o un +',
      'Solo la primera, la única con un f-string',
      'Solo la tercera, porque el f-string es seguro en Python'
    ],
    answer: 0,
    explain: 'La marca (1) busca un f-string, un <code>+</code>, un <code>%</code> o un <code>.format</code> en el primer argumento de <code>execute</code>. En la segunda, el f-string arma el valor del parámetro, que va aparte: el driver lo manda separado de la consulta.'
  }]
});

SD.defineExercise('sec01-p-zap', {
  kind: 'predict', title: 'ZAP con solo avisos',
  scenario: '<p>ZAP corre con <code>-I</code> y <code>-c zap.conf</code>. En la tienda, el único hallazgo es la regla 10038, la de la cabecera CSP, que <code>zap.conf</code> deja en <code>WARN</code>.</p>',
  steps: [{
    id: 'job', type: 'single',
    prompt: '¿Cómo termina el job <code>dast</code>?',
    options: [
      'Verde: con -I, los WARN no cambian el código de salida',
      'Rojo: cualquier hallazgo de ZAP devuelve un código distinto de 0',
      'Rojo: -I hace que los WARN cuenten como FAIL para el pipeline',
      'Verde, pero solo porque 10038 no aplica a respuestas JSON'
    ],
    answer: 0,
    explain: 'zap-baseline.py devuelve 1 si hay algún FAIL y 2 si solo hay WARN; <code>-I</code> le dice que no devuelva error por los WARN. Lo que corta el build son las reglas que <code>zap.conf</code> sube a FAIL.'
  }]
});
