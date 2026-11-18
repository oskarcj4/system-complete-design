/* Decisiones guiadas y predicciones de SEC02 (SBOM, firma y verificación). Formato en core/exercise.js. */

SD.defineExercise('sec02-firma', {
  title: 'la imagen firmada de Tienda Norte',
  scenario: '<p>La API de Tienda Norte ya pasa el pipeline de SEC01. Ahora se publica como imagen en el registro de GitHub y se despliega desde ahí. Quieres saber qué tiene adentro cada imagen y que nadie pueda desplegar una que no salió de tu workflow. Son seis decisiones.</p>',
  steps: [
    {
      id: 'referencia', type: 'single',
      prompt: '¿Cómo nombra la imagen lo que se firma y lo que se despliega?',
      options: [
        'Por la etiqueta latest, que siempre apunta a la última versión publicada.',
        'Por el SHA del commit como etiqueta, que es único para cada build.',
        'Por su digest, el hash de su contenido: sha256 de lo que se subió.',
        'Por el número de versión semántica, que el equipo sube a mano en cada entrega.'
      ],
      answer: 2,
      explain: 'Una etiqueta, aunque sea el SHA del commit, es un nombre que se puede volver a empujar con otra imagen. El digest es el hash del manifiesto: si cambia un byte, cambia el digest. Por eso cosign firma el digest y <code>verificar.sh</code> rechaza una etiqueta. Está en <a href="#ae-digest">El digest</a>.'
    },
    {
      id: 'llaves', type: 'single',
      prompt: '¿Con qué se firma la imagen?',
      options: [
        'Con una llave privada de cosign guardada como secreto cifrado del repositorio en GitHub.',
        'Sin llaves: el token OIDC del workflow pide un certificado de diez minutos.',
        'Con la llave GPG de la persona que mezcla el pull request en main.',
        'Con la llave del registro, que firma todo lo que se sube automáticamente.'
      ],
      answer: 1,
      explain: 'Una llave de larga vida en un secreto es una cosa más que se puede robar y que hay que rotar. Con la firma sin llaves, Fulcio emite un certificado corto atado a la identidad del workflow, y la firma queda en el registro público Rekor. Está en <a href="#ae-sinllaves">Firmar sin llaves</a>.'
    },
    {
      id: 'orden', type: 'single',
      prompt: '¿Cuándo corre Grype sobre el SBOM?',
      options: [
        'Después de firmar, para que el SBOM firmado sea el que se revisa.',
        'Antes de subir la imagen: si corta, al registro no llega nada.',
        'Una vez por semana sobre todas las imágenes del registro, aparte del build.',
        'Solo en el despliegue, porque es ahí donde importa qué se ejecuta.'
      ],
      answer: 1,
      explain: 'Si Grype corta después de subir, en el registro queda una imagen sin firma que alguien puede tomar. Antes de subir, lo que no pasa no existe fuera del runner. Revisar de nuevo cada semana también sirve, porque salen vulnerabilidades nuevas, pero no reemplaza el gate. Está en <a href="#paso-workflow">el paso 5</a>.'
    },
    {
      id: 'identidad', type: 'single',
      prompt: '¿Qué comprueba <code>cosign verify</code> además de que la firma sea válida?',
      options: [
        'Nada más: si la firma es válida, la imagen es de confianza.',
        'Que la imagen se haya subido al registro en las últimas 24 horas, como el certificado.',
        'Que el certificado diga el workflow publicar.yml de main y el emisor de GitHub.',
        'Que el digest coincida con el del último commit que se mezcló en la rama main.'
      ],
      answer: 2,
      explain: 'Cualquiera puede firmar cualquier imagen con su propia cuenta y la firma va a ser válida. Lo que importa es quién firmó: la identidad del certificado tiene que ser tu workflow, desde <code>main</code>, con el emisor de GitHub Actions. Está en <a href="#paso-verificar">el paso 6</a> y en la falla 3.'
    },
    {
      id: 'dondesbom', type: 'single',
      prompt: '¿Dónde vive el SBOM de cada imagen?',
      options: [
        'Como attestation firmada, pegada al digest en el registro.',
        'Como archivo en la carpeta del repositorio, con un commit por build.',
        'Como artefacto del workflow, que GitHub guarda unos días.',
        'En una planilla del equipo, con una fila por dependencia de la imagen.'
      ],
      answer: 0,
      explain: 'Pegado al digest, el SBOM viaja con la imagen y se verifica igual que la firma: sabes que lo produjo tu workflow para esa imagen y no otra. Un artefacto vence, y un archivo en el repositorio no dice a qué imagen corresponde. Está en <a href="#ae-sbom">El SBOM</a>.'
    },
    {
      id: 'actualizar', type: 'single',
      prompt: 'Todo está fijado por versión y por digest. ¿Cómo se mantiene al día?',
      options: [
        'No se actualiza: lo fijado ya se revisó y cambiarlo es un riesgo.',
        'Con etiquetas móviles otra vez, una vez al mes, para traer los arreglos.',
        'Dependabot para acciones, Dockerfile y pip, y a mano lo que va en un run.',
        'Con un job que corre docker pull de todo cada noche y vuelve a fijar los digests solo.'
      ],
      answer: 2,
      explain: 'Fijar sin actualizar te deja con las vulnerabilidades de hace un año. Dependabot abre un pull request por cada cambio, que pasa por el pipeline de SEC01. Las imágenes de un <code>run:</code> no las ve, así que van en una lista que se revisa a mano. Está en <a href="#paso-dependabot">el paso 7</a>.'
    }
  ],
  solution: '<ul><li>Todo por digest; las etiquetas son solo nombres.</li><li>Firma sin llaves con el token OIDC del workflow.</li><li>Grype antes de subir.</li><li>La verificación comprueba la identidad del workflow y el emisor, no solo la firma.</li><li>El SBOM como attestation firmada en el registro.</li><li>Dependabot y una lista a mano para lo que no ve.</li></ul>'
});

SD.defineExercise('sec02-p-etiqueta', {
  kind: 'predict', title: 'verificar una etiqueta',
  scenario: '<p>Corres <code>seguridad/verificar.sh ghcr.io/ana/tienda-norte/api:latest</code> con <code>TIENDA_REPO=ana/tienda-norte</code>.</p>',
  steps: [{
    id: 'sale', type: 'single',
    prompt: '¿Qué pasa?',
    options: [
      'cosign verifica la firma de lo que hoy apunta latest y sale bien',
      'El script sale con 1 antes de llamar a cosign: pide el digest',
      'cosign resuelve la etiqueta al digest y verifica ese, con un aviso',
      'gh attestation verify falla, pero la firma y el SBOM salen bien'
    ],
    answer: 1,
    explain: 'La marca (1) de <code>verificar.sh</code> mira la referencia con un <code>case</code>: si no tiene <code>@sha256:</code>, imprime <code>usa el digest, no una etiqueta</code> y sale con 1. Es lo que se probó del script sin red.'
  }]
});

SD.defineExercise('sec02-p-grype', {
  kind: 'predict', title: 'una dependencia vulnerable en main',
  scenario: '<p>Alguien mezcla en <code>main</code> un cambio con <code>jinja2==2.10</code>, que tiene una vulnerabilidad alta con arreglo. Corre el workflow <code>publicar</code>.</p>',
  steps: [{
    id: 'registro', type: 'single',
    prompt: '¿Qué queda en el registro?',
    options: [
      'La imagen nueva, sin firma, porque cosign no llega a correr',
      'La imagen nueva, firmada, con el SBOM que muestra la vulnerabilidad',
      'Nada nuevo: Grype corta antes del paso que sube la imagen',
      'La imagen nueva y una attestation de provenance, sin firma de cosign'
    ],
    answer: 2,
    explain: 'La marca (2) del workflow construye la imagen, arma el SBOM y corre Grype con <code>--fail-on high --only-fixed</code> antes de la marca (3), que es la que sube. Con un paso en rojo, los siguientes no corren.'
  }]
});

SD.defineExercise('sec02-p-identidad', {
  kind: 'predict', title: 'una firma válida de otra persona',
  scenario: '<p>Alguien con acceso al registro sube una imagen y la firma sin llaves desde su máquina, con su cuenta de GitHub. La firma queda en Rekor y es válida.</p>',
  steps: [{
    id: 'verify', type: 'single',
    prompt: '¿Qué dice <code>verificar.sh</code> sobre esa imagen?',
    options: [
      'firma: ok, porque la firma es válida y está en el registro público',
      'firma: ok y sbom: ok, y falla recién la provenance',
      'Falla en la firma: la identidad del certificado no es la del workflow',
      'Falla antes, porque cosign no acepta firmas hechas fuera de CI'
    ],
    answer: 2,
    explain: 'La marca (3) pasa <code>--certificate-identity</code> con la URL de <code>publicar.yml@refs/heads/main</code> y el emisor de GitHub Actions. El certificado de esa firma dice el correo de la persona y otro emisor, así que <code>cosign verify</code> no encuentra una firma que cumpla y sale con error.'
  }]
});

SD.defineExercise('sec02-p-dependabot', {
  kind: 'predict', title: 'qué ve Dependabot',
  scenario: '<p>Con el <code>dependabot.yml</code> del paso 7, sale una versión nueva de <code>actions/checkout</code>, una de <code>python:3.13-slim</code>, una de FastAPI y una de la imagen de Semgrep que SEC01 corre en un <code>run:</code>.</p>',
  steps: [{
    id: 'prs', type: 'single',
    prompt: '¿Cuántos pull requests abre Dependabot?',
    options: ['Uno', 'Dos', 'Tres', 'Cuatro'],
    fixed: true,
    answer: 2,
    explain: 'Tres: la acción (ecosistema <code>github-actions</code>), la base del Dockerfile (<code>docker</code> en <code>/api</code>) y FastAPI (<code>pip</code> en <code>/api</code>). La imagen de Semgrep va dentro de un comando de shell, y Dependabot no lee los <code>run:</code>.'
  }]
});
