SD.defineQuiz('m55', {
  title: 'Quiz: seguridad en el ciclo de vida del software', pass: 0.7,
  questions: [
    {
      id: 'shift', type: 'single',
      prompt: '¿Qué significa bien "shift left" en un ciclo de vida seguro?',
      options: [
        'Mover todos los controles al pull request y quitar los de producción',
        'Sumar controles tempranos y rápidos sin quitar los de la derecha',
        'Que el equipo de seguridad revise cada pull request antes del merge',
        'Escribir primero las pruebas de seguridad y después el código de la API'
      ],
      answer: 1,
      explain: 'Shift left suma controles donde arreglar es barato; los de la derecha (DAST, WAF, alertas) siguen haciendo falta porque ven cosas que el código no muestra. Ver 55.1.'
    },
    {
      id: 'top10', type: 'single',
      prompt: '¿Qué cambio trae el OWASP Top 10:2025 respecto de la edición 2021?',
      options: [
        'SSRF pasa a ser la categoría más importante de toda la lista',
        'La inyección desaparece porque los frameworks ya la evitan siempre',
        'La cadena de suministro gana categoría propia y aparece A10 nueva',
        'Se reemplaza por el API Security Top 10 para todas las aplicaciones'
      ],
      answer: 2,
      explain: 'A03 Software Supply Chain Failures crece desde los componentes vulnerables, A10 Mishandling of Exceptional Conditions es nueva y SSRF queda dentro de A01. Ver 55.2.'
    },
    {
      id: 'asvs', type: 'single',
      prompt: '¿Para qué sirve el ASVS frente al Top 10?',
      options: [
        'Da requisitos verificables con id, en niveles, para exigir y comprobar',
        'Es la lista actualizada de las vulnerabilidades más explotadas del año',
        'Es un escáner de OWASP que corre contra la aplicación en staging',
        'Reemplaza al threat model porque ya trae todas las amenazas posibles'
      ],
      answer: 0,
      explain: 'El Top 10 es un mapa de dónde suelen estar los problemas; el ASVS es un estándar con requisitos citables en tickets y pruebas, en tres niveles. Ver 55.3.'
    },
    {
      id: 'bola', type: 'single',
      prompt: 'Una API tiene BOLA en <code>GET /pedidos/{id}</code>. ¿Qué la atrapa de forma fiable?',
      options: [
        'Un SAST con reglas de Spring, porque ve el parámetro id del path',
        'Una prueba de abuso que pide el pedido de otra cuenta y espera 404',
        'Un DAST en modo baseline, porque recorre todos los endpoints públicos',
        'El WAF con las reglas del OWASP CRS, porque conoce el patrón de BOLA'
      ],
      answer: 1,
      explain: 'Ningún escáner sabe que el pedido 1043 es de otra persona. Hace falta escribir esa expectativa: dos usuarios y una prueba. Ver 55.3 y 55.8.'
    },
    {
      id: 'taint', type: 'single',
      prompt: 'En el análisis de taint de un SAST, ¿qué es un sumidero?',
      options: [
        'El lugar del código donde se descartan los datos que no se usan',
        'Un parámetro de la request que trae datos controlados desde afuera',
        'Una función que limpia el dato antes de usarlo en otra parte',
        'Una operación peligrosa si recibe un dato de afuera sin controlar'
      ],
      answer: 3,
      explain: 'Fuente es lo que viene de afuera, sumidero es la consulta, la ruta, el comando o la URL donde el dato se interpreta, y sanitizador es lo que corta el camino. Ver 55.4.'
    },
    {
      id: 'sca', type: 'single',
      prompt: 'Nadie declaró <code>log4j-core</code> en el <code>pom.xml</code>, pero el SCA la reporta. ¿Por qué?',
      options: [
        'Porque es una dependencia transitiva que trae otra librería',
        'Porque el SCA reporta todas las librerías populares de Java por defecto',
        'Porque Maven la agrega a todo proyecto que usa Spring Boot para logs',
        'Porque el SCA lee los imports del código y encontró una clase de log4j'
      ],
      answer: 0,
      explain: 'El SCA trabaja sobre el árbol resuelto (lockfile o dependency:tree), con las dependencias de tus dependencias. Ahí estaba Log4Shell en muchos equipos. Ver 55.5.'
    },
    {
      id: 'secreto', type: 'single',
      prompt: 'Una llave de AWS llegó al repositorio. ¿Cuál es el paso imprescindible?',
      options: [
        'Borrar el archivo con un commit nuevo y avisar al equipo por el chat',
        'Reescribir el historial con un force push para que no quede rastro',
        'Revocar y rotar la llave, y revisar en los logs si alguien la usó',
        'Volver privado el repositorio para que nadie más pueda clonarlo'
      ],
      answer: 2,
      explain: 'Borrar o reescribir no la saca de los clones ni de las copias ya hechas. La llave se da por comprometida: se revoca, se rota y se busca su uso. Ver 55.6.'
    },
    {
      id: 'dast', type: 'multi',
      prompt: '¿Cuáles son ciertas sobre DAST e IAST?',
      options: [
        'El DAST no necesita el código: ataca la aplicación corriendo',
        'El IAST solo ve fallas en el código que recorren las pruebas',
        'El DAST activo conviene correrlo en cada pull request, antes del merge',
        'El IAST reporta con pocos falsos positivos porque ve el camino real'
      ],
      answer: [0, 1, 3],
      explain: 'El DAST activo es lento y necesita un entorno; va contra staging, no en el PR. El IAST confirma caminos reales pero depende de la cobertura de las pruebas. Ver 55.7.'
    },
    {
      id: 'bloquear', type: 'single',
      prompt: '¿Qué conviene que bloquee el merge en el pipeline?',
      options: [
        'Todo hallazgo de cualquier herramienta, para no dejar pasar nada',
        'Solo lo que el equipo de seguridad marque a mano en cada revisión',
        'Nada: los bloqueos frenan al equipo y es mejor revisar después',
        'Lo que casi nunca da falso positivo, como un secreto o una crítica'
      ],
      answer: 3,
      explain: 'Bloquear con herramientas ruidosas enseña a ignorarlas o saltarlas. Se bloquea lo preciso y el resto avisa y entra a la cola de hallazgos (M58). Ver 55.8.'
    },
    {
      id: 'traversal', type: 'single',
      prompt: '¿Por qué hay que normalizar la ruta antes de comprobar que empieza con la carpeta base?',
      options: [
        'Porque normalizar convierte la ruta a minúsculas y evita duplicados',
        'Porque "/srv/facturas/../../etc" empieza con la base sin estar dentro',
        'Porque Java no permite comparar rutas que no estén normalizadas',
        'Porque normalizar borra los caracteres especiales del nombre del archivo'
      ],
      answer: 1,
      explain: 'Antes de normalizar, el texto empieza con la base aunque apunte afuera. normalize() resuelve los ../ y recién ahí la comparación dice la verdad. Ver 55.9.'
    }
  ]
});
