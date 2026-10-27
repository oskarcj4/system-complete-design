SD.defineQuiz('m59', {
  title: 'Quiz: detection engineering y el SOC', pass: 0.7,
  questions: [
    {
      id: 'silencio', type: 'single',
      prompt: 'El agente de un servidor dejó de mandar eventos hace dos horas después de una actualización. ¿Qué debería haber pasado?',
      options: [
        'Nada: si no llegan eventos, es porque no hubo actividad sospechosa',
        'Una alerta de silencio, porque esa fuente siempre manda eventos',
        'El SIEM debería reconstruir los eventos faltantes a partir de los vecinos',
        'Una alerta solo si además hay otra regla que haya disparado en esa máquina'
      ],
      answer: 1,
      explain: 'Un agente caído se parece mucho a "no pasó nada", y apagarlo es lo primero que intenta un atacante con oficio. Cada fuente necesita su alerta de silencio. Ver 59.2.'
    },
    {
      id: 'recortar', type: 'single',
      prompt: 'El presupuesto del SIEM obliga a recortar el volumen de Tienda Norte a la mitad. ¿Qué recortas?',
      options: [
        'Los logs de autenticación, que son muchos y casi siempre son normales',
        'El audit log de Kubernetes, porque el clúster ya tiene sus propias defensas',
        'El log de aplicación, con muestreo y solo las acciones de negocio completas',
        'CloudTrail, porque el proveedor de nube ya guarda una copia por su cuenta'
      ],
      answer: 2,
      explain: 'El log de aplicación es el 59 % del volumen (20 de 33.7 GB) con señal media. Autenticación, nube y Kubernetes suman poco y cuentan casi todos los ataques. Ver 59.2.'
    },
    {
      id: 'normalizar', type: 'single',
      prompt: '¿Por qué se normaliza en el pipeline (ECS u OCSF) y no dentro de cada regla?',
      options: [
        'Para que una regla de inicio de sesión fallido sirva igual en SSH, VPN y panel',
        'Porque los SIEM no aceptan eventos que no estén escritos en un formato propietario suyo',
        'Porque normalizar comprime los eventos y así el almacenamiento caliente cuesta menos',
        'Para poder borrar los eventos crudos y evitar guardar datos personales de las cuentas'
      ],
      answer: 0,
      explain: 'Con nombres comunes (user.name, source.ip, event.outcome) cada regla se escribe una vez. Si cada regla conociera el formato de cada fuente, habría que reescribirlas todas al sumar una. Ver 59.3.'
    },
    {
      id: 'enriquecer', type: 'single',
      prompt: '¿Por qué se enriquece un evento (país de la IP, rol de la cuenta) al ingresarlo y no al investigarlo?',
      options: [
        'Porque enriquecer después obliga a reindexar todo el almacenamiento frío',
        'Porque las reglas Sigma no pueden leer campos que se agregan más tarde',
        'Porque es más barato en CPU hacerlo en lote que evento por evento',
        'Porque meses después la IP puede ser de otro o la cuenta ya no existe'
      ],
      answer: 3,
      explain: 'El contexto cambia con el tiempo. Lo que importa es quién era esa IP y qué rol tenía esa cuenta en el momento del evento, y eso solo se sabe al ingresarlo. Ver 59.3.'
    },
    {
      id: 'ttp', type: 'single',
      prompt: 'En ATT&amp;CK, ¿qué es Credential Access y qué es T1110.003 Password Spraying?',
      options: [
        'Credential Access es una técnica y T1110.003 es el procedimiento de un grupo',
        'Credential Access es una táctica (el porqué); T1110.003, una subtécnica',
        'Las dos son tácticas: una general y otra específica para los paneles web',
        'Credential Access es un grupo de atacantes y T1110.003 su herramienta preferida'
      ],
      answer: 1,
      explain: 'Las tácticas son el objetivo del atacante en ese momento; las técnicas y subtécnicas, cómo lo logra; el procedimiento, lo que hizo un grupo concreto. Ver 59.5.'
    },
    {
      id: 'cobertura', type: 'single',
      prompt: 'Un proveedor ofrece reglas que "cubren el 80 % de las técnicas de ATT&amp;CK". ¿Qué preguntas antes de comprarlo?',
      options: [
        'Si el porcentaje se calcula sobre la versión vigente de la matriz Enterprise',
        'Si las reglas están escritas en Sigma o en el lenguaje nativo de tu SIEM',
        'Si cubren las técnicas probables para tu sistema y si cada una tiene prueba',
        'Si el 20 % que falta está en las tácticas de Reconnaissance y Resource Development'
      ],
      answer: 2,
      explain: 'Una celda verde puede ser una regla que solo ve la variante más obvia. Importa la cobertura de las técnicas que salieron de tu threat model y que haya eventos que demuestren que cada regla funciona. Ver 59.5.'
    },
    {
      id: 'spraying', type: 'single',
      prompt: 'Una regla alerta con 5 fallos por usuario en 10 minutos. ¿Por qué no ve un password spraying?',
      options: [
        'Porque el spraying prueba un intento por cuenta y hay que contar cuentas distintas por IP',
        'Porque el spraying usa contraseñas correctas y por eso no genera inicios de sesión fallidos',
        'Porque una ventana de 10 minutos es demasiado larga y diluye los intentos del ataque',
        'Porque el spraying ataca la base de datos directamente y no pasa por el panel de soporte'
      ],
      answer: 0,
      explain: 'El spraying está diseñado para no llegar al umbral de bloqueo por cuenta. Se ve agrupando por IP y contando valores distintos de user.name: la correlación value_count de 59.6.'
    },
    {
      id: 'tasabase', type: 'single',
      prompt: 'Un millón de eventos por día, diez de un ataque. La regla detecta el 99 % de los ataques y se equivoca en el 0.1 % de los eventos normales. ¿Qué precisión tiene?',
      options: ['Cerca del 99 %', 'Cerca del 50 %', 'Cerca del 10 %', 'Cerca del 1 %'],
      fixed: true,
      answer: 3,
      explain: 'Unas 10 verdaderas contra unas 1 000 falsas (999 990 × 0.001): 10 ÷ 1 010 ≈ 1 %. Con tan pocos ataques, hasta una regla buena da casi solo falsos positivos. Ver 59.8.'
    },
    {
      id: 'piramide', type: 'multi',
      prompt: '¿Cuáles de estas detecciones están arriba en la pirámide del dolor?',
      options: [
        'Una IP que prueba muchas cuentas distintas en pocos minutos',
        'El hash del binario que se usó en la campaña de la semana pasada',
        'Un proceso de la API que lanza una shell dentro del contenedor',
        'Una lista de dominios de comando y control publicada por un proveedor'
      ],
      answer: [0, 2],
      explain: 'La IP que prueba muchas cuentas y la shell dentro del contenedor describen comportamiento (TTP): siguen sirviendo con cualquier IP o herramienta. Hashes y dominios son IOC que el atacante cambia en minutos. Ver 59.8.'
    },
    {
      id: 'dac', type: 'order',
      prompt: 'Ordena el camino de una regla nueva hasta producción.',
      items: [
        'Pull request con la regla y sus eventos positivos y negativos',
        'Validar el formato con sigma check',
        'Correr las pruebas contra los eventos',
        'Backtest sobre 30 días de datos reales',
        'Revisión de otra persona y despliegue',
        'Medir alertas por día y precisión'
      ],
      explain: 'Es el ciclo de detection as code de 59.7. El backtest antes de desplegar evita una regla que da 400 alertas el primer día; la medición vuelve como un PR nuevo.'
    }
  ]
});
