SD.defineExercise('m57-cluster', {
  title: 'llevar Tienda Norte a un clúster endurecido',
  scenario: '<p>Tienda Norte migra a Kubernetes: la API, el panel, el worker de pagos, PostgreSQL y Redis en el namespace <code>tienda</code>, '
    + 'y un agente de logs que necesita leer <code>/var/log</code> de cada nodo. Hoy los manifiestos no declaran ningún <code>securityContext</code>, '
    + 'no hay NetworkPolicy y los Secrets están en etcd sin cifrar. Las imágenes ya salen firmadas del pipeline de M56. '
    + 'Tienes dos semanas y el equipo no puede frenar los despliegues.</p>',
  steps: [
    {
      id: 'psa', type: 'single',
      prompt: '¿Cómo empiezas con Pod Security Admission en <code>tienda</code>?',
      options: [
        '<code>enforce: restricted</code> desde el primer día, para no dejar huecos',
        '<code>enforce: baseline</code>, y <code>warn</code> y <code>audit</code> en restricted',
        'Solo <code>warn: restricted</code>, sin <code>enforce</code>, para no romper nada',
        'Esperar a tener Kyverno instalado y hacer todo con sus políticas'
      ],
      answer: 1,
      explain: 'Baseline casi nunca rompe una app común y corta ya lo que regala el nodo. Warn y audit en restricted muestran lo que falta; cuando el audit log queda limpio, se sube enforce. Restricted de entrada frena despliegues; solo warn no protege nada.'
    },
    {
      id: 'root', type: 'single',
      prompt: 'El audit log muestra que la API viola restricted porque su imagen corre como root. ¿Qué arreglo eliges?',
      options: [
        'Agregar <code>runAsUser: 0</code> explícito para que la violación quede documentada',
        'Excluir la API del namespace y moverla a uno con nivel baseline',
        'Agregar la capability <code>SETUID</code> para que cambie de usuario al arrancar',
        'Declarar <code>USER 65532:65532</code> en el Dockerfile y <code>runAsNonRoot: true</code>'
      ],
      answer: 3,
      explain: 'El usuario numérico deja que el kubelet compruebe que no es root. Bajar el nivel o documentar el root no cambia lo que gana quien entre; SETUID es una capability más, no menos.'
    },
    {
      id: 'agente', type: 'single',
      prompt: 'El agente de logs necesita un <code>hostPath</code> a <code>/var/log</code>, que baseline prohíbe. ¿Dónde lo pones?',
      options: [
        'En su propio namespace, con hostPath de solo lectura y su propia identidad',
        'En <code>tienda</code>, bajando su nivel a privileged para que todo siga en el mismo lugar',
        'En <code>kube-system</code>, que ya tiene permisos amplios y nadie mira',
        'En cualquier namespace, con <code>privileged: true</code> para no pelear con permisos'
      ],
      answer: 0,
      explain: 'La excepción se aísla: un namespace propio con la etiqueta que necesita, el montaje de solo lectura y una identidad aparte que se revisa. Bajar el nivel de tienda abre la puerta a todos los pods de ahí.'
    },
    {
      id: 'metadata', type: 'single',
      prompt: 'Una prueba muestra que desde el pod de la API se llega a <code>169.254.169.254</code>. ¿Qué haces?',
      options: [
        'Nada: la metadata solo entrega datos públicos de la instancia',
        'Bloquear la IP en el código de la API con una lista negra de destinos internos',
        'Default-deny de salida en <code>tienda</code> y además IMDSv2 con un salto en los nodos',
        'Mover la API a otro nodo, donde la metadata devuelve un rol distinto'
      ],
      answer: 2,
      explain: 'La metadata entrega las credenciales del rol del nodo. La NetworkPolicy corta la salida no declarada y IMDSv2 con límite de un salto la corta en la nube, aunque falle la red. Una lista en el código es la defensa que el SSRF de M55 ya saltó.'
    },
    {
      id: 'rbac', type: 'single',
      prompt: 'Alguien de desarrollo pide <code>get secrets</code> en todos los namespaces para depurar. ¿Qué respondes?',
      options: [
        'Se lo das en un ClusterRole, con un recordatorio de quitarlo en un mes',
        'Un Role en su namespace sin secrets y acceso de emergencia auditado',
        'Se lo das, pero solo con <code>list</code> y no <code>get</code>, que es menos peligroso',
        'Le das <code>create pods</code> en lugar de <code>get secrets</code>, que parece menos'
      ],
      answer: 1,
      explain: 'Depurar casi nunca necesita leer secretos. List de secrets devuelve los valores igual que get, y create pods equivale a leerlos montándolos. Lo excepcional va por un acceso de emergencia que queda en el audit log.'
    },
    {
      id: 'firma', type: 'single',
      prompt: 'Las imágenes salen firmadas con cosign. ¿Cómo haces que el clúster solo acepte las tuyas?',
      options: [
        'Una ValidatingAdmissionPolicy con CEL que compruebe la firma de la imagen',
        'Kyverno o el Policy Controller, que exigen firma, emisor y workflow',
        'Un webhook que acepte cualquier imagen con una firma válida de Sigstore',
        'Etiquetar las imágenes firmadas con <code>-signed</code> y permitir solo ese tag'
      ],
      answer: 1,
      explain: 'La firma no está en el objeto, así que CEL no la ve; hace falta un webhook. Y tiene que exigir la identidad esperada: cualquiera con una cuenta puede firmar con Sigstore. Un tag lo pone quien quiera.'
    },
    {
      id: 'detectar', type: 'single',
      prompt: 'Con todo lo anterior, ¿qué regla de Falco propia tiene más valor para empezar?',
      options: [
        'Alertar por cada conexión saliente de cualquier pod de todo el clúster',
        'Alertar cuando un proceso lee archivos dentro de <code>/app</code>',
        'Alertar por cada syscall que no esté en el perfil RuntimeDefault',
        'Shell en un pod de <code>tienda</code>, cuyas imágenes distroless no traen ninguna'
      ],
      answer: 3,
      explain: 'Es casi imposible que dispare por error y, cuando dispara, algo pasó. Las otras generan cientos de alertas por día (la app lee su propio jar, todos los pods hablan con alguien) y el equipo deja de mirarlas, el problema que trata M59.'
    }
  ],
  solution: '<ul>'
    + '<li><b>Semana 1:</b> <code>tienda</code> con <code>enforce: baseline</code> y <code>warn</code>/<code>audit</code> en restricted; imágenes con usuario numérico y el securityContext de 57.4; el agente de logs en su namespace con hostPath de solo lectura.</li>'
    + '<li><b>Red:</b> default-deny de entrada y salida, una política por servicio y el DNS; IMDSv2 con un salto en los nodos; una prueba que intenta API → metadata y panel → base.</li>'
    + '<li><b>Identidades:</b> una service account por servicio, sin token salvo la que habla con el API server; personas con roles por namespace, sin secrets, y acceso de emergencia auditado.</li>'
    + '<li><b>Secrets:</b> cifrado en reposo con KMS v2 y los existentes reescritos; a mediano plazo, el gestor de la nube con el driver CSI.</li>'
    + '<li><b>Semana 2:</b> <code>enforce: restricted</code> cuando el audit log queda limpio; Kyverno o el Policy Controller exigiendo firma e identidad del workflow, con <code>failurePolicy: Fail</code> y réplicas; una VAP para imágenes por digest; Falco con la regla de shell hacia el SIEM.</li>'
    + '</ul>'
});
