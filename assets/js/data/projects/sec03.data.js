/* Decisiones guiadas y predicciones de SEC03 (infraestructura como código revisada). Formato en core/exercise.js. */

SD.defineExercise('sec03-iac', {
  title: 'la nube de Tienda Norte, revisada en el pull request',
  scenario: '<p>Tienda Norte va a pasar a AWS: un bucket para las fotos, PostgreSQL administrado, tres security groups y una política de IAM para la API. Todo en Terraform, en el mismo repositorio. Quieres que un error de configuración se vea en el pull request y no en el incidente. Son seis decisiones.</p>',
  steps: [
    {
      id: 'cuenta', type: 'single',
      prompt: '¿Con qué credenciales corre el plan en cada pull request?',
      options: [
        'Con las llaves de un usuario de IAM administrador, guardadas como secreto del repositorio.',
        'Con ninguna: credenciales falsas y los skip del provider; estos recursos no leen la cuenta.',
        'Con las de la persona que abre el pull request, que las pega en un comentario del workflow.',
        'Con un rol de solo lectura y el token OIDC de GitHub, que es lo único que funciona desde un fork.'
      ],
      answer: 1,
      explain: 'Un pull request corre código que todavía no revisó nadie. Si el plan no necesita la cuenta, darle credenciales es un riesgo sin beneficio. Cuando el código use data sources que leen la cuenta, el paso siguiente es un rol de solo lectura con OIDC, nunca llaves de administrador. Está en <a href="#ae-plan">El plan</a>.'
    },
    {
      id: 'checkov', type: 'single',
      prompt: '¿Qué reglas de Checkov cortan el build?',
      options: [
        'Una lista corta de reglas sobre errores graves, y el resto corre como aviso.',
        'Todas: Checkov trae cientos de reglas y cada una es una buena práctica de AWS.',
        'Ninguna: Checkov solo informa, y la decisión la toma la persona que revisa.',
        'Las que tengan severidad alta, que Checkov calcula solo para cada recurso.'
      ],
      answer: 0,
      explain: 'Con todas, el primer pull request ya falla por registros de acceso, réplicas y llaves propias que el laboratorio no necesita. Una lista corta que corta y el resto en aviso es el mismo criterio que el gate de SEC01. La severidad de Checkov necesita la plataforma de pago. Está en <a href="#paso-checkov">el paso 4</a>.'
    },
    {
      id: 'propias', type: 'single',
      prompt: 'La región y las clases de base permitidas son reglas de Tienda Norte. ¿Dónde se escriben?',
      options: [
        'Como validaciones de las variables de Terraform, que fallan antes del plan.',
        'Como un comentario en el README, para que cada persona lo tenga en cuenta.',
        'Como una regla de Checkov escrita en Python, que se carga con un flag al correrlo.',
        'En Rego, con Conftest sobre el plan en JSON, que ve los valores ya resueltos.'
      ],
      answer: 3,
      explain: 'El plan tiene los valores finales y las acciones (crear, cambiar, borrar), que el HCL no tiene. Una validación de variable no ve que un recurso se borra, y un README no corta. Rego también se prueba con <code>conftest verify</code>. Está en <a href="#paso-conftest">el paso 5</a>.'
    },
    {
      id: 'clave', type: 'single',
      prompt: '¿Cómo se define la clave de la base de RDS?',
      options: [
        'Como una variable con default, para que el plan funcione sin pedir nada.',
        'Como una variable marcada sensitive, que Terraform no imprime en el plan.',
        'Con manage_master_user_password: la genera AWS y la guarda en Secrets Manager.',
        'Con el mismo valor de TIENDA_DB_CLAVE del .env, para que coincida con el laboratorio.'
      ],
      answer: 2,
      explain: 'Una variable, aunque sea sensitive, termina en el state de Terraform en texto claro. Con <code>manage_master_user_password</code>, la clave no pasa por Terraform: AWS la crea, la rota y la guarda en Secrets Manager. Está en la marca (4) de <a href="#paso-recursos">el paso 2</a>.'
    },
    {
      id: 'nombre', type: 'single',
      prompt: 'Cambias el nombre del recurso de la base en el HCL, de <code>tienda</code> a <code>principal</code>. ¿Qué haces?',
      options: [
        'Nada: Terraform entiende que es el mismo recurso por su identifier.',
        'Un bloque moved, para que el plan diga mover y no borrar y crear.',
        'Aplicar igual, porque deletion_protection impide que se borre de verdad.',
        'Borrar el state y volver a importar todo desde la cuenta de AWS.'
      ],
      answer: 1,
      explain: 'Para Terraform, la dirección del recurso es su identidad: sin <code>moved</code>, el plan borra <code>aws_db_instance.tienda</code> y crea otra. <code>deletion_protection</code> hace fallar el apply a mitad de camino. La regla (4) de Conftest lo corta en el pull request. Está en la falla 6.'
    },
    {
      id: 'lock', type: 'single',
      prompt: '¿Qué pasa con <code>.terraform.lock.hcl</code>?',
      options: [
        'Va en el repositorio y el pipeline corre init con -lockfile=readonly.',
        'Va en .gitignore, porque lo genera terraform init en cada máquina.',
        'Se borra antes de cada plan, para traer siempre el provider más nuevo.',
        'Se guarda como secreto del repositorio, porque tiene hashes del provider.'
      ],
      answer: 0,
      explain: 'El lock file fija la versión y los hashes del provider que se baja: es el checksum de SEC01 aplicado a Terraform. Con <code>-lockfile=readonly</code>, el pipeline falla si alguien cambia el provider sin actualizarlo en un pull request. Está en <a href="#paso-plan">el paso 3</a>.'
    }
  ],
  solution: '<ul><li>Plan sin cuenta: credenciales falsas y los <code>skip_*</code> del provider.</li><li>Checkov con una lista corta que corta y el resto en aviso.</li><li>Las reglas propias en Rego con Conftest sobre el plan, con sus pruebas.</li><li>La clave de RDS la maneja AWS.</li><li>Un cambio de nombre con <code>moved</code>.</li><li>El lock file en el repositorio, en solo lectura.</li></ul>'
});

SD.defineExercise('sec03-p-comodin', {
  kind: 'predict', title: 's3:* en la política de la API',
  scenario: '<p>Alguien cambia la acción de <code>aws_iam_policy.api</code> a <code>["s3:*"]</code>. Corren Checkov con la lista del paso 4 y Conftest con <code>tienda.rego</code>.</p>',
  steps: [{
    id: 'quien', type: 'single',
    prompt: '¿Quién lo corta?',
    options: [
      'Checkov, con CKV_AWS_63 sobre el comodín, y Conftest también con su regla (5)',
      'Solo Checkov, con CKV_AWS_62, que mira la administración total',
      'Solo Conftest: CKV_AWS_63 mira el * solo, y la regla (5) mira el final',
      'Ninguno: s3:* queda acotado al bucket de fotos por el Resource de la política'
    ],
    answer: 2,
    explain: 'CKV_AWS_63 marca una acción que es exactamente <code>*</code>, y CKV_AWS_62 el par <code>*</code> en acción y recurso. La marca (5) de <code>tienda.rego</code> usa <code>endswith(accion, "*")</code>, así que <code>s3:*</code> también cae. Es la razón de tener reglas propias.'
  }]
});

SD.defineExercise('sec03-p-region', {
  kind: 'predict', title: 'otra región',
  scenario: '<p>El plan se corre con <code>-var region=us-east-1</code>. Ningún otro cambio.</p>',
  steps: [{
    id: 'msg', type: 'single',
    prompt: '¿Cuántos mensajes de <code>deny</code> da Conftest?',
    options: ['Ninguno', 'Uno', 'Uno por recurso del plan', 'Dos: la región y la clase de la base'],
    fixed: true,
    answer: 1,
    explain: 'La marca (2) lee <code>input.variables.region.value</code>, que es una sola, y da un mensaje: <code>la región us-east-1 no está permitida</code>. La clase de la base sigue siendo <code>db.t4g.micro</code>. Si la región se escribiera fija en el provider en lugar de la variable, esta regla no la vería.'
  }]
});

SD.defineExercise('sec03-p-moved', {
  kind: 'predict', title: 'renombrar con moved',
  scenario: '<p>Cambias <code>aws_db_instance.tienda</code> por <code>aws_db_instance.principal</code> y agregas el bloque <code>moved</code> del paso de la falla 6.</p>',
  steps: [{
    id: 'acciones', type: 'single',
    prompt: '¿Qué hace la regla (4) de Conftest con ese plan?',
    options: [
      'Corta, porque el recurso viejo deja de estar en el HCL',
      'Pasa: el recurso se mueve, y sus acciones no incluyen delete',
      'Corta, porque moved también cuenta como delete y create en el JSON',
      'Pasa, pero solo porque deletion_protection está en true'
    ],
    answer: 1,
    explain: 'La regla mira si <code>"delete"</code> está en <code>change.actions</code>. Con <code>moved</code>, Terraform registra el cambio de dirección y las acciones del recurso no incluyen <code>delete</code>. <code>deletion_protection</code> no aparece en la regla.'
  }]
});

SD.defineExercise('sec03-p-aviso', {
  kind: 'predict', title: 'el Checkov que avisa',
  scenario: '<p>El segundo paso de Checkov corre todas las reglas con <code>--soft-fail</code>, y sobre <code>infra/</code> varias fallan: registros de acceso del bucket, llave propia de KMS, monitoreo de RDS.</p>',
  steps: [{
    id: 'job', type: 'single',
    prompt: '¿Cómo termina el paso?',
    options: [
      'Rojo, porque hay reglas que fallan y Checkov devuelve el código 1',
      'Verde: con --soft-fail, Checkov sale con 0 aunque haya fallas',
      'Rojo solo si alguna de las que fallan es de severidad alta',
      'Verde, porque esas reglas no aplican sin una cuenta de AWS'
    ],
    answer: 1,
    explain: '<code>--soft-fail</code> hace que Checkov imprima todo y salga con 0. Lo que corta es el primer paso, con <code>--check</code> y la lista corta. Las demás quedan en el log para revisarlas y pasar al gate las que valgan la pena.'
  }]
});
