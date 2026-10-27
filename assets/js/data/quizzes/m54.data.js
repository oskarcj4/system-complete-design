SD.defineQuiz('m54', {
  title: 'Quiz: threat modeling práctico', pass: 0.7,
  questions: [
    {
      id: 'preguntas', type: 'order',
      prompt: 'Ordena las cuatro preguntas del threat modeling.',
      items: ['¿En qué estamos trabajando?', '¿Qué puede salir mal?', '¿Qué vamos a hacer al respecto?', '¿Hicimos un buen trabajo?'],
      explain: 'Primero el dibujo del sistema, después las amenazas, después las decisiones y al final la revisión. Sin la primera, las demás se discuten en el aire. Ver 54.1.'
    },
    {
      id: 'frontera', type: 'single',
      prompt: '¿Por qué las amenazas se concentran en las fronteras de confianza de un DFD?',
      options: [
        'Porque lo que llega por ahí no se puede creer sin verificarlo',
        'Porque las fronteras son siempre los puntos de la red con más tráfico',
        'Porque el firewall solo inspecciona el tráfico que cruza una frontera',
        'Porque los procesos dentro de una misma frontera no pueden tener fallas'
      ],
      answer: 0,
      explain: 'Una frontera separa niveles de confianza: lo que la cruza puede venir de alguien que no es quien dice, estar alterado o ser más grande de lo esperado. Por eso un DFD sin fronteras es solo un diagrama de arquitectura. Ver 54.2.'
    },
    {
      id: 'letra', type: 'single',
      prompt: 'Una persona de soporte borra un pedido y después no hay forma de probar quién fue. ¿Qué letra de STRIDE es?',
      options: [
        'Tampering, porque se alteró el dato del pedido en la base',
        'Repudiation, porque se puede negar la acción sin rastro',
        'Elevation of privilege, porque soporte no debería poder borrar',
        'Spoofing, porque alguien pudo usar la cuenta de soporte'
      ],
      answer: 1,
      explain: 'Repudiation es poder hacer algo y negarlo porque no quedó un registro confiable. Se mitiga con un log de auditoría que quien actúa no pueda borrar. Si soporte tiene permiso de borrar, no hay elevación. Ver 54.3.'
    },
    {
      id: 'elemento', type: 'single',
      prompt: 'En STRIDE por elemento, ¿por qué a un flujo de datos no se le aplica spoofing?',
      options: [
        'Porque los flujos siempre van cifrados con TLS y eso impide suplantarlos',
        'Porque el spoofing solo existe en las entidades externas del diagrama, nunca en flujos',
        'Porque un flujo no tiene identidad propia: lo que se suplanta es su origen',
        'Porque un flujo dura muy poco y no da tiempo a suplantar a nadie'
      ],
      answer: 2,
      explain: 'Un flujo mueve datos entre dos elementos; quien se hace pasar por otro es un proceso o una entidad en un extremo. Por eso al flujo le tocan T, I y D, y la S se analiza en sus extremos. Ver 54.3.'
    },
    {
      id: 'arbol', type: 'single',
      prompt: 'En un árbol de ataque, la meta tiene cuatro ramas unidas por O. Arreglas una. ¿Qué pasa con la meta?',
      options: [
        'Queda protegida, porque una rama cortada alcanza en un nodo O',
        'Baja su probabilidad a la cuarta parte, porque queda una de cuatro',
        'Sigue alcanzable: en un O el atacante elige cualquiera de las otras',
        'Queda a medias: hay que recalcular el árbol con el costo de cada hoja'
      ],
      answer: 2,
      explain: 'En un nodo O alcanza con una rama, así que hay que cortarlas todas. En un nodo Y, en cambio, basta cortar una hoja. El atacante elige la rama más barata que quede. Ver 54.4.'
    },
    {
      id: 'dread', type: 'single',
      prompt: '¿Por qué el módulo propone una matriz de probabilidad por impacto en lugar de DREAD?',
      options: [
        'Porque DREAD solo sirve para amenazas de red y no para aplicaciones',
        'Porque los puntajes de DREAD cambiaban mucho según quién los ponía',
        'Porque DREAD exige una herramienta paga para calcular sus puntajes',
        'Porque la matriz da un número exacto de riesgo y DREAD no lo daba'
      ],
      answer: 1,
      explain: 'Microsoft dejó DREAD porque dos personas daban puntajes muy distintos a la misma amenaza. La matriz no pretende ser exacta: ordena y obliga a discutir por qué algo es probable. Ver 54.5.'
    },
    {
      id: 'respuestas', type: 'multi',
      prompt: 'La tienda decide no guardar tarjetas y que el PSP las tokenice. Además deja de pedir la fecha de nacimiento porque nada la usa. ¿Qué respuestas al riesgo son?',
      options: ['Transferir', 'Evitar', 'Aceptar', 'Mitigar'],
      answer: [0, 1],
      explain: 'Pasar el manejo de tarjetas al PSP es transferir el riesgo a quien lo maneja mejor. Dejar de pedir un dato que nada usa es evitar: el riesgo desaparece con el dato. Ver 54.5.'
    },
    {
      id: 'linddun', type: 'single',
      prompt: 'El formulario de registro responde "este correo ya está registrado". ¿Qué categoría de LINDDUN es?',
      options: [
        'Detecting: permite deducir que una persona es cliente de la tienda',
        'Data disclosure: entrega el correo de la persona a quien pregunta',
        'Non-compliance: incumple siempre la regulación de protección de datos',
        'Linking: une dos cuentas distintas de la misma persona en la base'
      ],
      answer: 0,
      explain: 'El sistema no entrega ningún dato, pero deja deducir que algo existe: que esa persona tiene cuenta. Eso es Detecting. La mitigación es responder igual en los dos casos y avisar por correo. Ver 54.6.'
    },
    {
      id: 'rehacer', type: 'multi',
      prompt: '¿Cuáles de estos cambios obligan a rehacer el threat model de la tienda?',
      options: [
        'Integrar un proveedor de envíos que recibe direcciones',
        'Cambiar el color y el texto del botón de comprar en la página del carrito',
        'Guardar por primera vez el teléfono del cliente',
        'Un incidente con una cuenta de soporte robada'
      ],
      answer: [0, 2, 3],
      explain: 'Un tercero nuevo, un dato sensible nuevo y un incidente son disparadores. Un cambio visual no cruza ninguna frontera ni toca datos. Ver 54.7.'
    }
  ]
});
