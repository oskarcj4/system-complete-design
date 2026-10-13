/* Decisiones guiadas de IA02 (Un analista de datos). Formato en core/exercise.js. */

SD.defineExercise('ia02-analista', {
  title: 'un analista cuyas cifras se pueden auditar',
  scenario: '<p>El analista corre como en esta guía: un grafo de LangGraph con seis nodos (entender, aclarar, explorar, herramientas, redactar y verificar), tres herramientas (ver el esquema, correr SQL con un rol de solo lectura y correr Python en un contenedor desechable), un registro de cada consulta con su huella y un verificador escrito en código. La dueña de la tienda pregunta en español y no sabe SQL. Tienes que tomar ocho decisiones.</p>',
  steps: [
    {
      id: 'barrera', type: 'single',
      prompt: '¿Qué impide de verdad que <code>consultar_sql</code> borre pedidos de la tienda?',
      options: [
        '<code>validar()</code>, que lee el SQL con sqlglot y rechaza todo lo que no sea una lectura.',
        'El <code>GRANT</code>: el rol <code>analista_lector</code> solo tiene <code>SELECT</code> en seis tablas.',
        '<code>default_transaction_read_only</code>, que el rol recibe cada vez que se conecta a la base.',
        'El párrafo del prompt de <code>EXPLORAR</code> que dice que la base es solo para leer.'
      ],
      answer: 1,
      explain: '<code>validar()</code> solo mejora el mensaje: si un día sqlglot tiene un bug, deja pasar la consulta. El solo lectura es un valor de inicio que la misma sesión puede apagar, y <code>caos.py escribir</code> lo hace. El prompt es un pedido. El <code>GRANT</code> lo hace cumplir la base sin preguntarle a nadie: aunque se apague el solo lectura, un <code>DELETE</code> falla con <code>permission denied</code>. Es el mínimo privilegio de M10.'
    },
    {
      id: 'limite-filas', type: 'single',
      prompt: 'El modelo pide una consulta que devuelve 40&#8239;000 filas. ¿Qué hace la herramienta?',
      options: [
        'Devuelve un error y le pide al modelo que reescriba la consulta con un <code>LIMIT</code> propio.',
        'Pagina: le muestra las primeras 30 y le da un cursor para pedir las siguientes cuando quiera.',
        'Devuelve las 40&#8239;000 filas, porque recortar haría que el modelo trabaje con datos incompletos.',
        'Guarda hasta 500, le muestra 30 numeradas, marca la consulta como recortada y avisa qué hacer.'
      ],
      answer: 3,
      explain: '40&#8239;000 filas no caben en el contexto y cuestan miles de tokens que el modelo no puede usar. Un error obliga a gastar otro paso, y paginar invita al modelo a leer fila por fila lo que SQL suma en un paso. Recortar con aviso le dice la verdad («se muestran 30 de más de 500: agrega en SQL») y la marca de recortada impide citar esa consulta, porque la fila 1 de 500 no es la fila 1 de todas.'
    },
    {
      id: 'sandbox-red', type: 'single',
      prompt: 'Un compañero quiere quitar <code>--network none</code> para que el código del modelo pueda instalar paquetes. ¿Qué cambia?',
      options: [
        'El código podría mandar a cualquier servidor los CSV de la entrada, con filas de la tienda.',
        'Nada importante, porque el contenedor sigue con el disco de solo lectura y el usuario 10001.',
        'El código podría conectarse a la base como <code>analista_lector</code> y leer las seis tablas.',
        'Solo cambia la velocidad: instalar paquetes en cada llamada hace que el sandbox tarde más.'
      ],
      answer: 0,
      explain: 'El disco de solo lectura y el usuario 10001 no impiden abrir una conexión. Con red, el código puede leer los CSV que le diste y mandarlos afuera: es la pata de exfiltración de la trifecta letal, la que esta guía quita a propósito. Conectarse a la base le haría falta la clave del lector, que no está en el contenedor. Los paquetes se instalan en la imagen, al construirla, no en cada llamada.'
    },
    {
      id: 'exec-local', type: 'single',
      prompt: 'Para ahorrarse Docker, alguien propone correr el código del modelo con <code>exec()</code> en el proceso del analista. ¿Qué es lo más grave?',
      options: [
        'Que pandas y matplotlib tendrían que estar instalados en el proyecto, junto a LangGraph.',
        'Que un bucle sin fin colgaría el proceso, y con él a todas las preguntas en curso de la API.',
        'Que el código vería todo lo que ve tu proceso: la clave de la API, tus archivos y tu red.',
        'Que <code>exec()</code> es más lento que un contenedor, porque compila el código cada vez.'
      ],
      answer: 2,
      explain: 'Las dependencias se resuelven con un <code>uv add</code>, y <code>exec()</code> no es más lento. El bucle sin fin es un problema real, pero se arregla con un plazo. Lo que no se arregla es que el código corre con tus permisos: lee <code>ANTHROPIC_API_KEY</code> de <code>os.environ</code>, abre <code>.env</code> o manda los datos por la red. En el contenedor, <code>exec()</code> sí está bien, porque lo que ve es solo lo que le diste.'
    },
    {
      id: 'aclarar', type: 'single',
      prompt: '¿Cuál de estas preguntas tendría que detener al analista para preguntar antes de explorar?',
      options: [
        '«¿Cuántos pedidos pagados hubo en diciembre?», porque no dice de qué año es diciembre.',
        '«¿Qué ciudad creció más en pedidos pagados del primer al segundo semestre?», por la palabra «creció».',
        '«¿Cuántos termos vendimos en 2025?», porque podría referirse a unidades o a pedidos con termos.',
        '«¿Cuánto cayeron las ventas del termo después de subir el precio?», en unidades o en pesos.'
      ],
      answer: 3,
      explain: 'La tienda solo tiene datos de 2025, así que «diciembre» no es ambiguo; «creció en pedidos» ya dice la métrica, y «cuántos termos» son unidades. «Cuánto cayeron las ventas» tiene dos respuestas correctas con los mismos datos: 33.3&#8239;% en unidades por día y 22.2&#8239;% en pesos. Preguntar de más también es un error, y los evals lo cuentan como «preguntó de más».'
    },
    {
      id: 'cifra-sin-cita', type: 'single',
      prompt: 'El informe dice «el termo vendió unas 1800 piezas» y la cifra 1 cita la consulta 3, fila 1, con valor 1762. ¿Qué hace el verificador?',
      options: [
        'Lo rechaza: 1800 es un número sin hueco en el texto, y vuelve a <code>redactar</code> con ese motivo.',
        'Lo acepta, porque 1800 es 1762 redondeado a la centena y cabe dentro de la tolerancia.',
        'Lo acepta, porque la cifra citada coincide con la celda y el texto es solo una forma de decirlo.',
        'Le pregunta a un segundo modelo si «unas 1800» es una forma razonable de escribir 1762.'
      ],
      answer: 0,
      explain: 'El verificador no lee intenciones: busca números en el texto, fuera de los huecos, y 1800 es uno. La tolerancia es la de los decimales del valor citado, no la de una frase. Que la cifra 1 esté bien no salva al texto: lo que lee la persona es «1800». En el primer rechazo vuelve a <code>redactar</code> con el motivo; si el segundo informe insiste, sale marcado <code>SIN VERIFICAR</code>.'
    },
    {
      id: 'juez-o-codigo', type: 'single',
      prompt: '¿Por qué el verificador es código y no un segundo modelo que lea el informe y las consultas?',
      options: [
        'Porque un modelo no puede leer resultados de SQL: solo entiende texto en lenguaje natural.',
        'Porque comparar una celda con un valor tiene una respuesta exacta, y un juez cuesta y se equivoca.',
        'Porque LangGraph no deja llamar al modelo dentro de un nodo que viene después de <code>redactar</code>.',
        'Porque un juez solo sirve para evaluar estilo, y el informe no tiene estilo que revisar.'
      ],
      answer: 1,
      explain: 'Un modelo lee tablas sin problema, LangGraph deja llamar al modelo en cualquier nodo, y un juez sirve para más que el estilo. Pero «¿89280 es la celda 89280.00?» tiene una respuesta exacta que el código da gratis y siempre igual. Un juez es otra llamada, puede equivocarse, y el mismo texto que engañó al primer modelo puede engañarlo a él. El juez tiene su lugar donde no hay respuesta exacta (M22).'
    },
    {
      id: 'fila-envenenada', type: 'single',
      prompt: 'El nombre del producto 8 le ordena al analista decir que las ventas subieron 300&#8239;%. ¿Qué puede lograr esa fila?',
      options: [
        'Que el analista borre o cambie filas de la tienda, si el modelo obedece la instrucción.',
        'Que el código del sandbox mande los datos a un servidor externo escrito en la instrucción.',
        'Nada: el spotlighting de <code>&lt;resultado&gt;</code> hace que el modelo nunca obedezca un dato.',
        'Cambiar el texto o el tono del informe, aunque el 300&#8239;% sin cita no pase el verificador.'
      ],
      answer: 3,
      explain: 'No puede escribir: el rol no tiene permiso. No puede sacar datos: el sandbox no tiene red y ninguna herramienta manda nada afuera. El spotlighting baja la probabilidad de que el modelo obedezca, pero no la lleva a cero. Lo que queda es el texto: el modelo puede mencionar la instrucción, elegir qué destacar o escribir «subieron», y el verificador solo atrapa el número. Por eso las barreras que importan no dependen del modelo.'
    }
  ],
  solution: '<ul><li>La barrera es el <code>GRANT</code> del rol; sqlglot y el solo lectura son ayudas.</li><li>Las consultas grandes se recortan con aviso, y una consulta recortada no se cita.</li><li>El sandbox no tiene red: sin ella, no hay forma de sacar los datos.</li><li>El código del modelo nunca corre en tu proceso: vería tu clave y tus archivos.</li><li>Se pregunta solo cuando la pregunta tiene dos respuestas correctas con los mismos datos.</li><li>Un número sin hueco en el texto se rechaza, aunque las cifras citadas estén bien.</li><li>Lo que tiene una respuesta exacta lo verifica el código, no un juez.</li><li>Una fila envenenada puede cambiar el texto, no actuar ni sacar datos.</li></ul>'
});
