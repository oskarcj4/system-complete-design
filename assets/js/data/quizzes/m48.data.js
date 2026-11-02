SD.defineQuiz('m48', {
  title: 'Quiz: grafos y recomendación de amigos', pass: 0.7,
  questions: [
    { id: 'lista', type: 'single',
      prompt: 'Mercado Barrio tiene 20 000 000 de personas con 200 contactos de promedio. ¿Por qué guarda el grafo como listas de adyacencia y no como matriz?',
      options: [
        'Porque la matriz tendría 4 × 10¹⁴ celdas, casi todas cero, y la lista guarda solo las aristas',
        'Porque la matriz no puede representar aristas con dirección, y seguir a un vendedor es una arista dirigida',
        'Porque las listas permiten calcular PageRank y la matriz solo sirve para contar vecinos comunes',
        'Porque las listas se pueden partir por hash y una matriz solo se puede guardar entera en una máquina'
      ],
      answer: 0,
      explain: '20 000 000² = 4 × 10¹⁴ celdas para 4 000 000 000 de entradas reales. Una matriz sí representa dirección (no es simétrica), PageRank se define sobre la matriz y una matriz también se parte. Vuelve a 48.1.' },
    { id: 'etiqueta', type: 'single',
      prompt: '¿Qué etiqueta usa el ranker de PYMK para aprender?',
      options: [
        'Que la persona hizo clic en "Enviar invitación", porque es la señal con más volumen',
        'Que la invitación se acepta: crea la arista y es lo que la otra persona quería',
        'Que la persona miró el perfil sugerido, porque mide interés antes de decidir si invitar',
        'Que las dos personas se escribieron en la primera semana, porque mide si la amistad es real'
      ],
      answer: 1,
      explain: 'Optimizar invitaciones enviadas premia a quien da curiosidad invitar (exparejas, gente famosa) y no a quien va a aceptar. Mirar perfiles es aún más débil, y escribirse es una señal útil pero escasa y tardía. Vuelve a 48.2.' },
    { id: 'aa', type: 'single', fixed: true,
      prompt: 'Ana y Luis comparten a Carla (3 amigos) y a Diego (50 amigos). ¿Cuánto vale Adamic-Adar?',
      options: ['0.355', '0.910', '1.166', '2'],
      answer: 2,
      explain: '1 / ln 3 + 1 / ln 50 = 0.910 + 0.256 = 1.166. 2 son los vecinos comunes, 0.355 usa 1 / grado (0.333 + 0.020) y 0.910 se olvida de Diego. Vuelve a 48.3.' },
    { id: 'log', type: 'single',
      prompt: '¿Por qué Adamic-Adar divide por el logaritmo del grado y no por el grado?',
      options: [
        'Porque el logaritmo es más rápido de calcular que una división cuando el grado es de millones',
        'Porque 1 / grado castiga de más a los amigos sociables; el logaritmo los pesa menos sin anularlos',
        'Porque sin el logaritmo la medida daría números mayores que 1 y no se podría usar como probabilidad',
        'Porque el grado de un nodo siempre está sesgado por las cuentas falsas y el logaritmo lo corrige'
      ],
      answer: 1,
      explain: 'Con 1 / grado, un amigo con 3 amigos pesa 16 veces lo que uno con 50; con el logaritmo, 3.6 veces. Adamic-Adar tampoco es una probabilidad (puede pasar de 1), y el logaritmo no corrige cuentas falsas. Vuelve a 48.3.' },
    { id: 'explosion', type: 'single', fixed: true,
      prompt: 'Una persona tiene 200 amigos: 198 con 200 amigos cada uno y 2 vendedores con 1 000 000 de seguidores. Sin tope, ¿cuántas aristas lee el segundo salto?',
      options: ['40 000', '41 600', '2 000 000', '2 039 600'],
      answer: 3,
      explain: '198 × 200 + 2 × 1 000 000 = 39 600 + 2 000 000 = 2 039 600. 40 000 ignora a los vendedores, 2 000 000 olvida a los demás y 41 600 es con un tope de 1 000 por amigo. Vuelve a 48.4.' },
    { id: 'tope', type: 'single',
      prompt: '¿Por qué un tope de 1 000 aristas por amigo casi no empeora las recomendaciones?',
      options: [
        'Porque los seguidores de una cuenta enorme son malos candidatos: nadie conoce a un millón de personas',
        'Porque el ranker después vuelve a leer las aristas que faltan para los candidatos que quedaron',
        'Porque las amistades de más de 1 000 se marcan como spam y no entran al grafo de PYMK',
        'Porque el PageRank personalizado ya recorre esas mismas aristas y recupera lo que el tope deja afuera'
      ],
      answer: 0,
      explain: 'Compartir una cuenta con un millón de seguidores casi no dice nada (Adamic-Adar le daría 1 / ln 1 000 000 ≈ 0.07). El ranker no relee aristas, las cuentas grandes no son spam y el PPR es otra fuente, no un parche del tope. Vuelve a 48.4.' },
    { id: 'alfa', type: 'single',
      prompt: 'En el PageRank personalizado, ¿qué pasa al subir α de 0.15 a 0.5?',
      options: [
        'Vuelve a casa más seguido, se queda cerca y casi no llega a personas a tres saltos',
        'La caminata se aleja más, porque α es la probabilidad de seguir caminando en cada paso',
        'El cálculo converge más lento, porque cada paso tiene más probabilidad de reiniciar',
        'Nada en el orden: α solo escala los puntajes y el ranking queda igual'
      ],
      answer: 0,
      explain: 'α es la probabilidad de volver a casa: con 0.5, en promedio 2 pasos por caminata; con 0.15, unos 6.7. En el simulador, Vera cae al subir α. Converge más rápido, no más lento, y el orden sí cambia. Vuelve a 48.5.' },
    { id: 'vera', type: 'single',
      prompt: 'Vera no tiene ningún amigo en común con Ana y aun así, con α = 0.15, el PPR la pone por encima de los amigos de Diego. ¿Por qué?',
      options: [
        'Porque el PPR premia a quien tiene más amigos, y Vera tiene más que los amigos de Diego',
        'Diego reparte su paso entre 7 amigos; la zona de Vera, por Eva y Tere, es densa',
        'Porque el PPR pone un bono a las personas lejanas, para que la lista tenga diversidad',
        'Porque Vera está a dos saltos de Ana por Eva, y el PPR no cuenta los amigos en común'
      ],
      answer: 1,
      explain: 'Desde Diego, la caminata tiene 1 / 7 de chance de ir a cada amigo; desde Eva y Tere, la probabilidad se concentra en pocas personas, Vera entre ellas. Vera tiene 3 amigos, como los de Diego, está a tres saltos y el PPR no tiene un bono de diversidad. Vuelve a 48.5.' },
    { id: 'gnn', type: 'single',
      prompt: '¿Qué ventaja tiene una GNN como GraphSAGE sobre node2vec para una persona que se registró hoy?',
      options: [
        'Ninguna: las dos necesitan que la persona aparezca en las caminatas del entrenamiento',
        'Aprende cómo juntar vecinos, así arma el vector de un nodo nuevo sin reentrenar',
        'Es explicable: puede decir "tienen 12 amigos en común" igual que Adamic-Adar',
        'No necesita GPU, porque usa solo las features de los nodos y no la estructura del grafo'
      ],
      answer: 1,
      explain: 'node2vec aprende un vector por nodo: uno nuevo no tiene. GraphSAGE aprende cómo juntar vecinos y features, y lo aplica al nodo nuevo. No es más explicable ni más barata, y sí usa la estructura. Vuelve a 48.6.' },
    { id: 'senal', type: 'single',
      prompt: 'Un candidato solo comparte con la persona un contacto subido: la agenda de su psiquiatra. ¿Qué hace el sistema?',
      options: [
        'Lo sugiere con un puntaje bajo, porque una señal débil igual es mejor que ninguna para alguien nuevo',
        'No lo sugiere: una señal sensible sola nunca alcanza, y lo decide una regla, no un peso del modelo',
        'Lo sugiere sin explicación, para no revelar de dónde salió la recomendación',
        'Le pide permiso a la psiquiatra antes de usar su agenda para sugerir pacientes entre sí'
      ],
      answer: 1,
      explain: 'Sugerir pacientes entre sí revela algo que nadie dijo, con o sin explicación. Un peso del modelo lo bajaría en promedio; una regla lo impide siempre. Pedirle permiso a un tercero no protege a los pacientes. Vuelve a 48.7 y 48.11.' },
    { id: 'tao', type: 'single',
      prompt: '¿Qué hace TAO y qué deja al servicio de PYMK?',
      options: [
        'Guarda el grafo en una base de grafos y resuelve en ella las consultas de dos saltos con Cypher',
        'Guarda objetos y asociaciones en MySQL con caché delante; los saltos los hace el servicio',
        'Guarda solo los candidatos precalculados de cada persona, y el grafo vive en otro sistema',
        'Guarda el grafo entero en la memoria de una máquina para hacer caminatas aleatorias rápidas'
      ],
      answer: 1,
      explain: 'TAO responde "las asociaciones de tipo amigo de 42" a escala de mil millones de lecturas por segundo, pero no recorre caminos. Cypher es de Neo4j, y el grafo en la memoria de una máquina es lo de WTF y Pixie. Vuelve a 48.8.' },
    { id: 'hash', type: 'single', fixed: true,
      prompt: 'Con 64 particiones por hash y 200 amigos, ¿cuántas particiones distintas toca, en promedio, leer los amigos de Ana?',
      options: ['3.1', '36', '61', '64'],
      answer: 2,
      explain: '64 × (1 − (1 − 1/64)²⁰⁰) ≈ 61.3: casi todas, pero algunos amigos caen en la misma. 64 supone que nunca se repiten, 36 es con 75&#8239;% de aristas locales por comunidad y 3.1 es 200 / 64. Vuelve a 48.9.' }
  ]
});
