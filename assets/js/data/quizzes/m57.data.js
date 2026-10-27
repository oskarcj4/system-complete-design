SD.defineQuiz('m57', {
  title: 'Quiz: seguridad de contenedores y Kubernetes', pass: 0.7,
  questions: [
    {
      id: 'kernel', type: 'single',
      prompt: '¿Qué es lo que un contenedor no aísla, y por qué importa?',
      options: [
        'La red, porque todos los contenedores del nodo usan la misma interfaz',
        'El kernel, que comparten todos los contenedores del nodo',
        'La memoria, porque los cgroups solo miden y no ponen topes',
        'Los procesos, porque cada contenedor ve el árbol completo del nodo'
      ],
      answer: 1,
      explain: 'Namespaces, cgroups, capabilities y seccomp recortan lo que ve, usa y pide el proceso, pero todos se apoyan en el mismo kernel. Una falla del kernel o del runtime cruza esas barreras; una máquina virtual tiene su propio kernel. Ver 57.1.'
    },
    {
      id: 'seccomp', type: 'single',
      prompt: 'Un pod no declara <code>seccompProfile</code> y el kubelet no tiene <code>seccompDefault</code>. ¿Con qué perfil corre?',
      options: [
        'Con el perfil por defecto del runtime, igual que en Docker',
        'Con RuntimeDefault, porque Kubernetes lo aplica desde 1.25',
        'Unconfined: con todas las syscalls del kernel disponibles',
        'Con Localhost, leyendo el perfil que haya en el nodo'
      ],
      answer: 2,
      explain: 'Kubernetes corre los pods Unconfined salvo que el kubelet tenga seccompDefault o el pod declare un perfil. Por eso restricted exige RuntimeDefault o Localhost. Ver 57.1 y 57.4.'
    },
    {
      id: 'distroless', type: 'single',
      prompt: '¿Cuál es la ganancia principal de una imagen distroless frente a una completa?',
      options: [
        'Que arranca más rápido porque no inicializa un sistema operativo',
        'Que cifra el sistema de archivos del contenedor por defecto',
        'Que impide por sí sola cualquier ejecución de código remoto',
        'Que quien entre no encuentra shell ni gestor, y hay menos CVE'
      ],
      answer: 3,
      explain: 'La app sigue pudiendo tener una falla, pero quien la explote no tiene herramientas a mano, y el escáner reporta casi solo lo que de verdad corre. Ver 57.2.'
    },
    {
      id: 'usuario', type: 'single',
      prompt: 'El pod tiene <code>runAsNonRoot: true</code> y la imagen dice <code>USER app</code>. ¿Qué pasa?',
      options: [
        'No arranca: el kubelet no sabe si ese nombre es root',
        'Arranca como root, porque runAsNonRoot solo es una recomendación',
        'Arranca con el usuario app, que Kubernetes resuelve en el nodo',
        'Arranca con el UID 1000, que Kubernetes asigna por defecto'
      ],
      answer: 0,
      explain: 'El kubelet necesita un UID numérico para verificar que no es 0. Por eso el Dockerfile declara USER 65532:65532. Ver 57.2.'
    },
    {
      id: 'escapes', type: 'multi',
      prompt: '¿Qué reduce el riesgo de escapes como los de runc de 2019 y 2024?',
      options: [
        'Actualizar runc y el kernel de los nodos con un SLA',
        'No correr como root dentro del contenedor',
        'Admitir solo imágenes firmadas por el pipeline propio',
        'Guardar los Secrets en base64 en lugar de en texto plano'
      ],
      answer: [0, 1, 2],
      explain: 'Las dos fallas se arreglan parcheando el runtime; la de 2019 necesitaba root dentro y las dos necesitaban una imagen elegida por el atacante. Base64 no cifra nada. Ver 57.3.'
    },
    {
      id: 'baseline', type: 'single',
      prompt: 'Un pod sin ningún <code>securityContext</code>, ¿qué nivel de Pod Security Standards cumple?',
      options: [
        'Ninguno: Pod Security Admission rechaza los pods sin securityContext',
        'Restricted, porque los valores por defecto ya son los seguros',
        'Baseline: no pide nada peligroso, pero no declara lo que exige restricted',
        'Solo privileged, porque corre con las capabilities del runtime'
      ],
      answer: 2,
      explain: 'Baseline prohíbe pedir cosas peligrosas (privileged, hostPath, namespaces del host); un pod vacío no las pide. Restricted exige declarar runAsNonRoot, allowPrivilegeEscalation, drop ALL y seccomp. Ver 57.4 y el widget.'
    },
    {
      id: 'createpods', type: 'single',
      prompt: 'Una persona tiene <code>create</code> sobre <code>pods</code> en <code>tienda</code>, pero no <code>get secrets</code>. ¿Puede leer los Secrets de ese namespace?',
      options: [
        'No, porque RBAC solo deja hacer lo que el rol lista de forma explícita',
        'Sí: puede crear un pod que monte el Secret y leerlo desde adentro',
        'Solo si además tiene el verbo exec sobre los pods que ya corren',
        'Solo los que no estén cifrados en reposo con el proveedor de KMS'
      ],
      answer: 1,
      explain: 'Crear pods en un namespace equivale a poder leer sus Secrets, también de forma indirecta con Deployments o Jobs. El cifrado en etcd no cambia nada: dentro del pod el valor está en claro. Ver 57.5 y 57.7.'
    },
    {
      id: 'netpol', type: 'single',
      prompt: 'El equipo aplicó una NetworkPolicy default-deny y el tráfico sigue pasando. ¿Qué es lo más probable?',
      options: [
        'Que falta una segunda política que permita el DNS del clúster',
        'Que las políticas solo se aplican a los pods creados después de ellas',
        'Que default-deny solo corta la entrada y nunca la salida',
        'Que el CNI del clúster no aplica NetworkPolicy y la acepta igual'
      ],
      answer: 3,
      explain: 'Kubernetes guarda la política, pero la aplica el plugin de red. Un CNI sin soporte la acepta en silencio. Por eso se prueba intentando la conexión prohibida. Ver 57.6.'
    },
    {
      id: 'vap', type: 'single',
      prompt: '¿Por qué una ValidatingAdmissionPolicy no alcanza para exigir que la imagen esté firmada?',
      options: [
        'Porque CEL solo evalúa el objeto y la firma vive en el registro y en Rekor',
        'Porque solo se aplica a Deployments, no a los pods que estos crean',
        'Porque todavía es beta y no se recomienda en producción',
        'Porque se ejecuta después de que el pod ya quedó guardado en etcd y corriendo'
      ],
      answer: 0,
      explain: 'La VAP corre dentro del API server, es estable desde 1.30 y sirve para reglas sobre el objeto (por ejemplo, imagen por digest). Consultar una firma necesita un webhook como Kyverno o el Policy Controller. Ver 57.8.'
    },
    {
      id: 'falco', type: 'single',
      prompt: 'Falco avisa "Shell en un contenedor de Tienda Norte" en un pod de la API a las 3 de la mañana. ¿Qué haces primero?',
      options: [
        'Borrar el pod para que el Deployment levante uno limpio enseguida',
        'Desactivar la regla hasta mañana, porque suele dar falsos positivos',
        'Aislar el pod con una NetworkPolicy y conservarlo para investigar',
        'Reiniciar el nodo para cortar cualquier proceso que haya quedado'
      ],
      answer: 2,
      explain: 'Con una imagen distroless no debería existir una shell. Borrar el pod o reiniciar el nodo destruye la evidencia; se corta la red, se captura y después se reemplaza. Ver 57.9; el incidente completo sigue en M60.'
    }
  ]
});
