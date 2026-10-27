SD.defineQuiz('m56', {
  title: 'Quiz: la cadena de suministro de software', pass: 0.7,
  questions: [
    {
      id: 'distinto', type: 'single',
      prompt: '¿Por qué un ataque a la cadena de suministro suele pasar los controles de M55?',
      options: [
        'Porque el código malicioso se escribe en un lenguaje que el SAST no lee',
        'Porque se mete a propósito y hace lo prometido además de otra cosa',
        'Porque los ataques de este tipo solo afectan a la infraestructura',
        'Porque el SCA no revisa las dependencias que llegan desde npm o Maven'
      ],
      answer: 1,
      explain: 'El SAST no busca puertas traseras escritas a propósito, el SCA no conoce un paquete publicado ayer y las pruebas pasan porque el código cumple su función. Ver 56.1.'
    },
    {
      id: 'xz', type: 'single',
      prompt: 'En el caso de xz-utils, ¿dónde estaba el código malicioso?',
      options: [
        'En los tarballs publicados, que no coincidían con el repositorio',
        'En una dependencia transitiva con un nombre parecido a xz-utils',
        'En una acción de GitHub que se usaba para compilar las versiones',
        'En el registro de paquetes de Debian, que había sido comprometido'
      ],
      answer: 0,
      explain: 'La puerta trasera de 5.6.0 y 5.6.1 venía en los tarballs de release, no en Git. Construir desde la fuente y compararlo con el tarball la habría delatado. Ver 56.2.'
    },
    {
      id: 'lock', type: 'single',
      prompt: '¿Qué protege un lockfile con hashes y qué no protege?',
      options: [
        'Protege de vulnerabilidades conocidas, no de paquetes maliciosos nuevos',
        'Protege de typosquatting, no de que se reemplace un paquete existente',
        'Protege de que cambien los bytes de lo elegido, no de elegir mal uno nuevo',
        'Protege solo las dependencias directas, no las transitivas del proyecto'
      ],
      answer: 2,
      explain: 'Fija versiones y hashes de todo el árbol: si alguien cambia un paquete, falla la instalación. Pero si en un PR se agrega un paquete malicioso, el lockfile lo fija igual. Ver 56.3.'
    },
    {
      id: 'confusion', type: 'multi',
      prompt: '¿Cuáles cortan la dependency confusion?',
      options: [
        'Resolver el scope propio solo contra el registro privado',
        'Reservar los nombres internos también en el registro público',
        'Subir la versión del paquete interno a un número muy alto',
        'Instalar en CI con el lockfile en modo estricto'
      ],
      answer: [0, 1, 3],
      explain: 'El ataque explota dos orígenes para el mismo nombre. Un solo origen, el nombre reservado o un lockfile estricto lo cortan; subir la versión solo cambia el número a superar. Ver 56.3.'
    },
    {
      id: 'sha', type: 'single',
      prompt: '¿Por qué fijar una acción por SHA habría evitado tj-actions?',
      options: [
        'Porque GitHub verifica la firma del autor cuando se usa un SHA completo',
        'Porque el SHA identifica el contenido y el tag es un puntero movible',
        'Porque las acciones fijadas por SHA no pueden leer los secretos del job',
        'Porque el SHA hace que la acción corra en un runner aislado del resto'
      ],
      answer: 1,
      explain: 'Los atacantes movieron los tags a un commit malicioso. Un SHA completo nombra bytes concretos; para cambiar el código tendría que cambiar el SHA del workflow. Ver 56.4.'
    },
    {
      id: 'prt', type: 'single',
      prompt: '¿Qué hace peligrosa la combinación de <code>pull_request_target</code> con checkout del código del PR?',
      options: [
        'Que el workflow tarda más porque baja dos veces el mismo repositorio',
        'Que el PR se mergea automáticamente sin pasar por la revisión de nadie',
        'Que el workflow ignora los permisos declarados para el GITHUB_TOKEN',
        'Que corre código de un fork con los secretos del repositorio'
      ],
      answer: 3,
      explain: 'pull_request_target corre en el contexto del repositorio, con secretos. Hacer checkout del código del fork le entrega esos secretos a quien abrió el PR. Ver 56.4.'
    },
    {
      id: 'oidc', type: 'single',
      prompt: 'Con OIDC en el CI, ¿qué obtiene alguien que logra imprimir la credencial en el log?',
      options: [
        'Una credencial que vence en minutos y solo vale con esas condiciones',
        'Acceso permanente a la nube, igual que con una llave de acceso común',
        'Nada, porque el token OIDC está cifrado y no se puede leer en el log',
        'Acceso al proveedor OIDC, que le permite emitir tokens para cualquiera'
      ],
      answer: 0,
      explain: 'El token y las credenciales que da la nube son de vida corta y atadas a repositorio y rama. Reducen el daño, no lo anulan: unos minutos de acceso siguen siendo un incidente. Ver 56.4.'
    },
    {
      id: 'vex', type: 'single',
      prompt: '¿Qué agrega un VEX a un SBOM?',
      options: [
        'La firma criptográfica de cada componente listado en el SBOM',
        'La declaración de si cada vulnerabilidad conocida afecta al producto',
        'El historial de versiones de cada dependencia desde que se agregó',
        'La lista de dependencias transitivas que el SBOM no puede incluir'
      ],
      answer: 1,
      explain: 'El SBOM dice qué hay; el VEX dice, por vulnerabilidad, affected, not_affected (con justificación), fixed o under_investigation. Ver 56.5.'
    },
    {
      id: 'slsa', type: 'order',
      prompt: 'Ordena los niveles de build de SLSA 1.1 de menor a mayor.',
      items: ['Existe la provenance', 'Una plataforma alojada firma la provenance', 'La plataforma está endurecida y aísla los builds'],
      explain: 'L1, L2 y L3. Cada escalón responde a un atacante más capaz: de errores a quien roba llaves a quien controla otro build. Ver 56.6.'
    },
    {
      id: 'verificar', type: 'single',
      prompt: 'La admisión acepta cualquier imagen con una firma de Sigstore válida. ¿Cuál es el problema?',
      options: [
        'Que Sigstore no se puede usar sin una llave privada guardada',
        'Que las firmas de Sigstore vencen a los diez minutos de crearse',
        'Que cualquiera puede firmar con Sigstore: hay que exigir la identidad',
        'Que Rekor es privado y la admisión no puede consultarlo'
      ],
      answer: 2,
      explain: 'Sigstore es público. Una firma válida solo dice que alguien firmó; hay que exigir el emisor del token y el workflow, repositorio y rama esperados. Ver 56.7 y 56.8.'
    }
  ]
});
