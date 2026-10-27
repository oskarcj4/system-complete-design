SD.defineQuiz('m60', {
  title: 'Quiz: respuesta a incidentes y forense', pass: 0.7,
  questions: [
    {
      id: 'r3', type: 'single',
      prompt: '¿Qué cambia en NIST SP 800-61 Rev. 3 respecto de la Rev. 2?',
      options: [
        'Reemplaza el ciclo de cuatro fases por una lista de herramientas recomendadas',
        'La reparte en las seis funciones de CSF 2.0, y la preparación pasa a ser parte de ella',
        'Elimina la preparación, porque ahora la cubre otra publicación distinta de NIST',
        'Agrega una quinta fase de notificación obligatoria a las autoridades de cada país'
      ],
      answer: 1,
      explain: 'Rev. 3 (abril de 2025) es un perfil de CSF 2.0: Govern, Identify y Protect como preparación; Detect, Respond y Recover como el incidente, y la mejora (ID.IM) vuelve al principio. Ver 60.1.'
    },
    {
      id: 'ic', type: 'single',
      prompt: '¿Por qué el incident commander no investiga?',
      options: [
        'Porque así alguien mantiene la vista del conjunto y decide sin quedar absorbido',
        'Porque suele no tener los permisos técnicos para leer los registros de la nube',
        'Porque la norma de NIST prohíbe que una misma persona tenga dos roles distintos',
        'Porque investigar le corresponde siempre a un forense externo contratado'
      ],
      answer: 0,
      explain: 'Quien está metido en un log pierde la vista general: nadie decide la contención, nadie avisa a legal. En un equipo chico una persona puede tener dos roles, pero el IC no investiga. Ver 60.2.'
    },
    {
      id: 'banda', type: 'single',
      prompt: 'Sospechas que el atacante tiene la cuenta de un administrador. ¿Dónde coordina el equipo?',
      options: [
        'En el canal de seguridad de siempre, que tiene acceso restringido al equipo',
        'Por correo de la empresa, que deja registro escrito de cada decisión tomada',
        'En un canal fuera de banda, preparado antes del incidente',
        'En un canal nuevo del chat de la empresa, creado en el momento para el caso'
      ],
      answer: 2,
      explain: 'Un administrador comprometido puede leer el chat y el correo, incluidos los canales nuevos. El canal fuera de banda existe antes del incidente y no usa las identidades sospechosas. Ver 60.2.'
    },
    {
      id: 'sev', type: 'single',
      prompt: 'Una llave de producción se usa desde una IP desconocida, pero aún no ves lectura de datos. ¿Qué severidad corresponde en la escala de 60.3?',
      options: [
        'SEV4, hasta confirmar que hubo algún daño concreto en los datos',
        'SEV3, porque solo se trata de una credencial y no hay datos afectados',
        'SEV1 siempre, porque toda credencial de producción es el peor caso',
        'SEV2, porque cuenta lo que podría estar pasando con lo que se sabe'
      ],
      answer: 3,
      explain: 'La severidad se fija por lo que puede estar pasando, no por lo ya confirmado, y se puede subir o bajar después. SEV1 queda para datos que salen o un ransomware cifrando. Ver 60.3.'
    },
    {
      id: 'pod', type: 'single',
      prompt: 'Un pod de la API corre un proceso de minería. ¿Cuál es la mejor primera contención?',
      options: [
        '<code>kubectl delete pod</code>, para que el ReplicaSet cree uno limpio enseguida',
        'Una NetworkPolicy de cuarentena y cambiarle la etiqueta <code>app</code>, sin borrarlo',
        '<code>kubectl rollout restart</code> del deployment, para renovar todas las réplicas',
        'Reiniciar el nodo, para cortar el proceso y cualquier persistencia que haya dejado'
      ],
      answer: 1,
      explain: 'La cuarentena corta la red y saca el pod del Service y del ReplicaSet, que crea un reemplazo; el pod sigue vivo con su memoria y sus archivos. Borrar o reiniciar destruye la evidencia. Ver 60.4.'
    },
    {
      id: 'llave', type: 'single',
      prompt: '¿Por qué una llave de IAM filtrada se desactiva en lugar de borrarse?',
      options: [
        'Porque una llave borrada se puede recuperar desde la papelera de IAM',
        'Porque borrar una llave tarda horas en propagarse a todas las regiones',
        'Porque inactiva ya no sirve y conserva el id para CloudTrail',
        'Porque IAM no permite borrar una llave mientras tenga sesiones abiertas'
      ],
      answer: 2,
      explain: 'Desactivarla corta el uso al instante y deja el identificador, que es la clave para cruzar CloudTrail. Borrarla no agrega seguridad y complica la investigación. Ver 60.4.'
    },
    {
      id: 'vol', type: 'order',
      prompt: 'Ordena, según RFC 3227, del más volátil al menos volátil.',
      items: ['Procesos, conexiones y memoria', 'Sistemas de archivos temporales', 'Disco', 'Logs remotos y monitoreo', 'Medios de archivo'],
      explain: 'Se recolecta primero lo que desaparece antes: lo que vive en memoria muere al apagar; el disco se reescribe con el uso; los logs remotos duran su retención; los archivos, años. Ver 60.5.'
    },
    {
      id: 'k8s', type: 'single',
      prompt: 'En un clúster recién instalado, ¿qué registra el audit log del API server?',
      options: [
        'Todo a nivel Metadata, que es el valor por defecto de Kubernetes',
        'Solo los pedidos fallidos, para no llenar el disco del plano de control',
        'Todo a nivel RequestResponse, salvo los Secrets, que van a nivel Metadata',
        'Nada, hasta que el API server recibe una política y un destino para el log'
      ],
      answer: 3,
      explain: 'Sin <code>--audit-policy-file</code> no se registra ningún evento, y sin <code>--audit-log-path</code> (o un webhook) no hay destino. En un servicio gestionado se activa en el proveedor. Ver 60.7.'
    },
    {
      id: 'linea', type: 'multi',
      prompt: '¿Qué hace que una línea de tiempo forense sirva? Marca todas las correctas.',
      options: [
        'Todas las fuentes normalizadas a UTC al cargarlas',
        'Cada fila con su fuente y el id del registro original',
        'Anotar también las ausencias, como "sin pushes fuera del pipeline"',
        'Quedarse solo con los eventos que ya se confirmaron como maliciosos'
      ],
      answer: [0, 1, 2],
      explain: 'UTC para poder ordenar, la fuente para poder verificar, y las ausencias porque reducen el alcance. Filtrar a lo confirmado esconde justo el primer evento, que es lo que se busca. Ver 60.8.'
    },
    {
      id: 'recon', type: 'single',
      prompt: '¿Por qué se reconstruye un servidor comprometido en lugar de limpiarlo?',
      options: [
        'Porque no hay forma de asegurar que no quedó otra persistencia sin encontrar',
        'Porque limpiarlo en el lugar suele romper la cadena de custodia de la evidencia',
        'Porque reconstruir es más rápido que limpiar en la mayoría de los incidentes',
        'Porque el seguro de ciberriesgo no cubre servidores que se limpiaron a mano'
      ],
      answer: 0,
      explain: 'Limpiar deja una duda que no se puede cerrar. Reconstruir desde una imagen firmada, rotar lo que el servidor vio y restaurar datos de antes del primer evento la cierra, aunque cueste más el primer día. Ver 60.9.'
    }
  ]
});
