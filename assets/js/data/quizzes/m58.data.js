SD.defineQuiz('m58', {
  title: 'Quiz: gestión de vulnerabilidades', pass: 0.7,
  questions: [
    { id: 'ciclo', type: 'order', prompt: 'Ordena las etapas del ciclo de gestión de vulnerabilidades.',
      items: ['Descubrir activos y hallazgos', 'Priorizar por riesgo', 'Arreglar o mitigar', 'Verificar sobre lo que corre'],
      explain: 'Descubrir, priorizar, arreglar y verificar, alrededor del inventario. La verificación se hace sobre la imagen desplegada, no sobre el ticket (58.1).' },
    { id: 'cvecwe', type: 'single', prompt: '¿Qué diferencia hay entre un CVE y un CWE?',
      options: [
        'El CVE es una falla concreta en un producto; el CWE, el tipo de debilidad',
        'El CVE lo asigna la NVD y el CWE lo asigna el fabricante del producto',
        'El CVE mide qué tan grave es la falla y el CWE si ya se está explotando',
        'Son el mismo identificador en dos bases: MITRE usa CVE y NIST usa CWE'
      ], answer: 0,
      explain: 'CVE-2021-44228 es Log4Shell en Log4j; CWE-502 es "deserializar datos no confiables", una categoría que comparten miles de fallas. El CVE lo asigna una CNA (58.2).' },
    { id: 'backport', type: 'single', prompt: 'El escáner reporta una CVE de OpenSSL en una imagen de Ubuntu porque la versión es 3.0.2, pero el aviso de Ubuntu dice que su paquete 3.0.2-0ubuntu1.10 ya tiene el parche. ¿Qué pasó?',
      options: [
        'La imagen trae dos copias de OpenSSL y el escáner encontró la vieja',
        'Ubuntu retroportó el parche sin cambiar la versión de upstream',
        'El aviso de Ubuntu está desactualizado y la NVD tiene el dato bueno',
        'La CVE no aplica a Linux, solo a las compilaciones de OpenSSL en Windows'
      ], answer: 1,
      explain: 'Las distribuciones aplican el arreglo sobre la misma versión de upstream. Un escáner que compara solo el número da un falso positivo; uno que lee el aviso de la distro, no (58.2).' },
    { id: 'cvssb', type: 'single', prompt: 'Un hallazgo trae "CVSS 9.8". ¿Qué te dice ese número, en general?',
      options: [
        'Que hay un 98 % de probabilidad de que alguien la explote este mes',
        'Que la falla es grave en abstracto, sin saber nada de tu entorno',
        'Que ya se observó explotación real y CISA pide arreglarla pronto',
        'Que el fabricante ajustó el puntaje a los controles que tú tienes'
      ], answer: 1,
      explain: 'El número de un escáner suele ser CVSS-B, solo métricas base. No mide probabilidad (eso es EPSS) ni explotación confirmada (KEV) ni tu entorno (las métricas Environmental, que llenas tú) (58.3).' },
    { id: 'epss', type: 'single', prompt: 'Una CVE tiene EPSS 0.19 con percentil 0.97. ¿Cómo se lee?',
      options: [
        'Un 19 % de probabilidad de actividad de explotación en 30 días, más que el 97 % de las CVE',
        'Un 97 % de probabilidad de explotación en 30 días, con una confianza del 19 % en el modelo',
        'Un 19 % de las instancias expuestas en internet ya fueron atacadas en los últimos 30 días',
        'Una severidad de 1.9 sobre 10, que la deja por debajo del 97 % de las CVE publicadas'
      ], answer: 0, fixed: false,
      explain: 'EPSS es una probabilidad diaria de 0 a 1 para los próximos 30 días; el percentil la ubica contra las demás. Como la mayoría tiene EPSS muy bajo, 0.19 está arriba del 97 % (58.4).' },
    { id: 'kev', type: 'multi', prompt: '¿Qué condiciones pide CISA para agregar una vulnerabilidad al KEV? Marca todas.',
      options: [
        'Tener un identificador CVE asignado',
        'Evidencia confiable de explotación real',
        'Una forma clara de arreglarla o mitigarla',
        'Un puntaje CVSS base de 7.0 o más'
      ], answer: [0, 1, 2],
      explain: 'CVE, explotación confirmada y remediación clara. No hay un mínimo de CVSS: hay entradas de severidad media que se explotan mucho (58.5).' },
    { id: 'bod', type: 'single', prompt: '¿Qué cambió la BOD 26-04 de CISA respecto de la BOD 22-01?',
      options: [
        'Eliminó el catálogo KEV y lo reemplazó por los puntajes de EPSS de FIRST',
        'Bajó el plazo único de dos semanas a tres días para todo el catálogo KEV',
        'Combina KEV, exposición, automatización e impacto para fijar el plazo',
        'Obliga a las empresas privadas a seguir los mismos plazos que el gobierno'
      ], answer: 2,
      explain: 'La 22-01 daba un plazo fijo por estar en el KEV. La 26-04 (10 de junio de 2026) usa cuatro factores y da 3, 14 o 60 días o la próxima actualización; el KEV sigue siendo uno de los factores (58.5).' },
    { id: 'prio', type: 'single', prompt: 'Con capacidad para un solo arreglo hoy, ¿cuál va primero?',
      options: [
        'CVSS 9.8 en una librería del script de build, EPSS 0.01, no está en KEV',
        'CVSS 9.3 en el driver de la base del worker de pagos, no es alcanzable',
        'CVSS 7.5 en el ingress expuesto a internet, en KEV, da control total',
        'CVSS 8.1 en el servidor de archivos interno, en KEV, control parcial'
      ], answer: 2,
      explain: 'Explotación confirmada, exposición a internet e impacto total: es la celda Actuar de la matriz. El 9.8 del build no corre en producción ni se explota (58.6).' },
    { id: 'excepcion', type: 'multi', prompt: 'El arreglo de un hallazgo de clase Atender pide cambiar de versión mayor y no llega en 14 días. ¿Qué debe llevar la excepción? Marca todas.',
      options: [
        'Un dueño que la aprueba y responde por ella',
        'Un control compensatorio mientras tanto',
        'Una fecha de vencimiento en que se revisa',
        'Que el hallazgo se marque como falso positivo'
      ], answer: [0, 1, 2],
      explain: 'Dueño, motivo, control compensatorio y vencimiento. No es un falso positivo: la falla existe y el riesgo se acepta por un tiempo (58.7).' },
    { id: 'little', type: 'single', prompt: 'Llegan 60 hallazgos priorizados por semana y cada uno tarda en promedio 3 semanas en cerrarse. Si el sistema está estable, ¿cuántos hay abiertos?',
      options: ['20', '63', '180', '360'], answer: 2, fixed: true,
      explain: 'Ley de Little: L = λ × W = 60 × 3 = 180. Si llegan más de los que se cierran, no hay estado estable y el backlog crece sin tope (58.9).' }
  ]
});
