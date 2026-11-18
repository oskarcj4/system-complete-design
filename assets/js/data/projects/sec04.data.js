/* Decisiones guiadas y predicciones de SEC04 (un clúster endurecido y vigilado). Formato en core/exercise.js. */

SD.defineExercise('sec04-cluster', {
  title: 'Tienda Norte en un clúster propio',
  scenario: '<p>Tienda Norte pasa a un clúster k3s de un nodo: la API firmada de SEC02 y su PostgreSQL, en el namespace <code>tienda</code>. Quieres que una imagen sin firma no arranque, que un pod no pueda pedir privilegios, que la base solo hable con la API y que alguien te avise si una persona abre una shell en un contenedor. Son seis decisiones.</p>',
  steps: [
    {
      id: 'donde', type: 'single',
      prompt: '¿Dónde se exige que la imagen de la API esté firmada por tu workflow?',
      options: [
        'En el pipeline de SEC02, que ya firma: si la firma existe, el clúster puede confiar.',
        'En la admisión del clúster, que verifica la firma antes de crear cada pod.',
        'En Falco, que mira los procesos y avisa si corre una imagen sin firma.',
        'En el registro, haciendo privado el paquete para que nadie más pueda subir.'
      ],
      answer: 1,
      explain: 'Firmar en el pipeline no impide que alguien despliegue otra cosa: la verificación tiene que estar donde se decide qué corre, y eso es la admisión. Falco ve procesos, no firmas, y un paquete privado sigue aceptando lo que suba cualquier token con permiso. Está en <a href="#paso-kyverno">el paso 5</a>.'
    },
    {
      id: 'nivel', type: 'single',
      prompt: '¿Qué nivel de Pod Security le pones al namespace <code>tienda</code>?',
      options: [
        'baseline, porque restricted rompe la imagen oficial de PostgreSQL y no se puede arreglar.',
        'privileged, y lo endureces después pod por pod con su securityContext.',
        'restricted en modo enforce: ni la API ni la base necesitan nada de lo que prohíbe.',
        'restricted solo en modo warn, para no frenar a nadie mientras aprenden.'
      ],
      answer: 2,
      explain: 'Las dos piezas corren sin root, sin escalar privilegios y sin capabilities; PostgreSQL arranca como el usuario 999 con <code>fsGroup</code>. Con restricted en enforce, un pod que pida más no se crea. El modo warn solo avisa. Está en <a href="#paso-namespaces">el paso 2</a>.'
    },
    {
      id: 'digest', type: 'single',
      prompt: '"Solo imágenes por digest en <code>tienda</code>". ¿Con qué la escribes?',
      options: [
        'Con Kyverno, porque es el único motor de políticas que entiende las imágenes de un pod.',
        'Con una ValidatingAdmissionPolicy nativa, escrita en CEL.',
        'Con una regla de Falco que avisa cuando arranca un contenedor con etiqueta.',
        'Con PSA restricted, que ya exige digest en todas las imágenes del namespace.'
      ],
      answer: 1,
      explain: 'La regla solo mira el texto de la imagen: el API server la evalúa con CEL, sin webhook y sin otro componente que se pueda caer. Kyverno hace falta para la firma, porque ahí hay que ir al registro y a Rekor. PSA no mira las imágenes. Está en <a href="#paso-digest">el paso 4</a>.'
    },
    {
      id: 'falla', type: 'single',
      prompt: 'Kyverno no responde (se cayó su pod). ¿Qué tiene que pasar con un pod nuevo en <code>tienda</code>?',
      options: [
        'Se crea igual, para que una caída de Kyverno no deje a la tienda sin desplegar.',
        'Se crea, y Kyverno lo revisa en segundo plano cuando vuelve.',
        'Se rechaza: si la firma no se puede verificar, la imagen no corre.',
        'Se crea con un aviso en los eventos, que alguien revisa por la mañana.'
      ],
      answer: 2,
      explain: 'Con <code>failurePolicy: Fail</code>, sin verificación no hay pod. Es un riesgo de disponibilidad que se acepta a propósito en el namespace de la tienda, y se limita con la réplica y la alerta sobre Kyverno. Con <code>Ignore</code>, tumbar a Kyverno sería la forma de saltar la firma. Está en <a href="#paso-kyverno">el paso 5</a>.'
    },
    {
      id: 'red', type: 'single',
      prompt: '¿Cómo armas las NetworkPolicy de <code>tienda</code>?',
      options: [
        'Una que niega todo, entrada y salida, y después una por cada conexión que hace falta.',
        'Una por pod que niega lo que sabes que es peligroso, como la salida a internet.',
        'Ninguna: los Services de tipo ClusterIP ya no se ven desde fuera del namespace.',
        'Una sola que deja entrar solo desde el namespace tienda, para todos los pods.'
      ],
      answer: 0,
      explain: 'Negar todo y abrir lo que hace falta es la única forma de que una conexión nueva sea una decisión. Un ClusterIP se alcanza desde cualquier namespace. Y cerrar solo la entrada deja la salida libre para sacar datos. Está en <a href="#paso-red">el paso 6</a>.'
    },
    {
      id: 'shell', type: 'single',
      prompt: 'La regla propia de Falco avisa cuando se abre una shell. ¿En qué contenedores?',
      options: [
        'En todos los del clúster, para no dejar ningún punto ciego.',
        'Solo en los de <code>tienda</code>, donde nadie tiene por qué abrir una shell.',
        'En ninguno: kubectl exec ya queda en el log de auditoría del API server.',
        'Solo en los que corren como root, porque sin root una shell no hace daño.'
      ],
      answer: 1,
      explain: 'En <code>kube-system</code> y en tus pods de prueba las shells son normales y la regla se volvería ruido. En <code>tienda</code> no hay ninguna razón, así que cada alerta merece mirarse. El log de auditoría ve el exec, pero no lo que corre adentro, y una shell sin root igual lee secretos. Está en <a href="#paso-falco">el paso 7</a>.'
    }
  ],
  solution: '<ul><li>La firma se verifica en la admisión, con Kyverno y <code>failurePolicy: Fail</code>.</li><li>El namespace <code>tienda</code> va en restricted, en enforce.</li><li>El digest se exige con una ValidatingAdmissionPolicy nativa.</li><li>Las NetworkPolicy niegan todo y abren cada conexión.</li><li>Falco avisa de cada shell en <code>tienda</code>.</li></ul>'
});

SD.defineExercise('sec04-p-deploy', {
  kind: 'predict', title: 'un Deployment privilegiado',
  scenario: '<p>Aplicas en <code>tienda</code> (restricted, enforce) un Deployment cuyo contenedor pide <code>privileged: true</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué ves después de <code>kubectl apply</code>?',
    options: [
      'El apply falla y el Deployment no existe.',
      'El Deployment se crea con un aviso, y sus pods nunca aparecen.',
      'El pod arranca, pero sin privilegios.',
      'El pod queda en CrashLoopBackOff.'
    ],
    answer: 1,
    explain: 'El modo enforce solo rechaza pods. Para un Deployment, PSA avisa (<code>Warning: would violate PodSecurity</code>) y lo deja crear; el que no puede crear el pod es el ReplicaSet, y el error está en sus eventos. Por eso la falla 1 se mira con <code>kubectl get events</code>.'
  }]
});

SD.defineExercise('sec04-p-usuario', {
  kind: 'predict', title: 'runAsNonRoot sin número',
  scenario: '<p>Quitas <code>runAsUser: 10001</code> del contenedor de la API y dejas <code>runAsNonRoot: true</code>. El Dockerfile de SEC00 termina con <code>USER tienda</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué pasa con el pod de la API?',
    options: [
      'Arranca como tienda, porque el Dockerfile ya cambió de usuario.',
      'Arranca como root, porque falta el número en el securityContext.',
      'No arranca: queda en CreateContainerConfigError.',
      'Lo rechaza PSA al crearlo.'
    ],
    answer: 2,
    explain: 'El kubelet tiene que comprobar que el usuario no es root, y con un nombre no puede: no lee el <code>/etc/passwd</code> de la imagen. El error dice <code>image has non-numeric user (tienda), cannot verify user is non-root</code>. PSA no lo rechaza, porque el campo que pide (<code>runAsNonRoot</code>) sigue ahí.'
  }]
});

SD.defineExercise('sec04-p-dns', {
  kind: 'predict', title: 'la salida sin DNS',
  scenario: '<p>En <code>red.yaml</code> borras la regla que deja a la API hablar con <code>kube-dns</code> en el puerto 53. La que la deja ir a la base en el 5432 sigue.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Qué le pasa a <code>GET /api/productos</code>?',
    options: [
      'Funciona: la regla del 5432 alcanza para llegar a la base.',
      'Falla al resolver el nombre <code>db</code>.',
      'Funciona solo la primera vez, mientras la IP está en caché.',
      'Falla con un error de clave incorrecta en PostgreSQL.'
    ],
    answer: 1,
    explain: 'El DSN dice <code>@db:5432</code>: antes de conectar hay que preguntarle a <code>kube-dns</code> la IP de <code>db</code>, y esa pregunta es tráfico de salida al 53 que ahora nadie permite. psycopg no llega a abrir la conexión. Las reglas de salida casi siempre necesitan la de DNS.'
  }]
});

SD.defineExercise('sec04-p-python', {
  kind: 'predict', title: 'exec sin shell',
  scenario: '<p>Corres <code>kubectl exec -n tienda deploy/api -- python -c "print(open(\'/etc/hostname\').read())"</code>.</p>',
  steps: [{
    id: 'que', type: 'single',
    prompt: '¿Dispara la regla propia de Falco del paso 7?',
    options: [
      'Sí: cualquier kubectl exec en tienda la dispara.',
      'Sí, porque leer un archivo de /etc es sospechoso.',
      'No: el proceso es python, que no está en shell_binaries.',
      'No, porque Falco no ve los procesos de kubectl exec.'
    ],
    answer: 2,
    explain: 'La regla pide <code>proc.name in (shell_binaries)</code>, y esa lista tiene <code>sh</code>, <code>bash</code>, <code>dash</code> y otras shells, no <code>python</code>. Falco sí ve el proceso; la regla no lo cubre. Es el límite de escribir reglas sobre un nombre de programa, y lo retoma <a href="#limitaciones">Limitaciones</a>.'
  }]
});
