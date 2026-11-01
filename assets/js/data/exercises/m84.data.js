SD.defineExercise('m84-migrar', {
  title: 'migrar el feed de oportunidades a Next.js',
  scenario: '<p>La coordinación quiere migrar el frontend del sistema de prácticas a Next.js, empezando por el feed de oportunidades y el botón Postular. La API en PHP sigue igual por ahora. Un compañero arma el primer borrador; revisas cinco decisiones antes del merge.</p>',
  steps: [
    { id: 'props', type: 'single',
      prompt: 'La página lee la oportunidad y el usuario, y pasa <code>usuario={usuario}</code> a <code>&lt;BotonPostular&gt;</code>. ¿Qué pides?',
      options: [
        'Pasar oportunidadId y yaPostulado, armados en el servidor',
        'Marcar la página entera con use client para que no haya frontera',
        'Dejarlo, porque el botón no muestra la contraseña en ningún lado',
        'Borrar la columna contrasena del objeto en el Client Component'
      ],
      answer: 0,
      explain: 'Todo lo que cruza se serializa. Borrarla en el cliente es tarde: ya viajó. Con use client en la página, todo el código y los datos van al navegador.' },
    { id: 'env', type: 'single',
      prompt: 'El <code>.env.local</code> trae <code>NEXT_PUBLIC_API_URL</code> y <code>NEXT_PUBLIC_COOKIE_KEY</code>. ¿Qué haces?',
      options: [
        'Nada, porque las dos se usan en componentes del servidor',
        'Quitar el prefijo de COOKIE_KEY y rotarla, porque ya se publicó',
        'Cifrar COOKIE_KEY con una clave que va en otra variable pública',
        'Renombrarla a NEXT_PUBLIC_SECRET_KEY para que se note'
      ],
      answer: 1,
      explain: 'El prefijo la copia en el bundle sin importar dónde se use. Cifrarla con otra clave pública no cambia nada. Rotarla porque el bundle ya salió.' },
    { id: 'accion', type: 'single',
      prompt: 'La acción <code>postular(estudianteId, oportunidadId)</code> recibe los dos ids del formulario. ¿Qué cambias?',
      options: [
        'Validar que estudianteId sea un número entero positivo',
        'Esconder el campo estudianteId con type="hidden"',
        'Tomar el estudiante de la sesión y validar oportunidadId',
        'Comprobar que el identificador de la acción no haya cambiado'
      ],
      answer: 2,
      explain: 'Un campo escondido se cambia igual, y validar el tipo no dice de quién es. Es el mass assignment de M80: el dueño sale de la sesión.' },
    { id: 'mw', type: 'single',
      prompt: 'El borrador protege <code>/panel</code> solo con un middleware que mira si existe la cookie. ¿Qué pides?',
      options: [
        'Que el middleware consulte la base en cada request',
        'Quitar el middleware, porque no protege de verdad nada',
        'Mover el chequeo a un useEffect en el Client Component',
        'Mantenerlo y repetir la sesión en la capa de acceso a datos'
      ],
      answer: 3,
      explain: 'El middleware sirve para redirigir rápido; no es la última puerta (CVE-2025-29927). Un useEffect corre en el navegador y se salta.' },
    { id: 'version', type: 'single',
      prompt: 'El borrador fija <code>next@15.2.0</code> y <code>react@19.0.0</code>. ¿Qué pides?',
      options: [
        'Dejarlo fijo: cambiar de versión puede romper el build',
        'Actualizar y sumar SCA al pipeline con alerta por KEV',
        'Usar el rango latest para tener siempre lo último',
        'Bloquear la ruta de Server Actions en el WAF'
      ],
      answer: 1,
      explain: 'Las dos versiones tienen CVE críticos con parche. latest sin lockfile cambia el build sin revisión. El WAF no cubre la falla del decodificador.' }
  ],
  solution: '<ul><li>Props: un DTO con <code>oportunidadId</code> y <code>yaPostulado</code>, nunca la fila.</li><li>Variables: <code>COOKIE_KEY</code> sin prefijo, rotada; <code>grep</code> sobre <code>.next/static</code> en el CI.</li><li>Acción: estudiante desde la sesión, rol, <code>oportunidadId</code> validado con un esquema.</li><li>Middleware para redirigir, <code>verificarSesion()</code> en cada lectura y cada acción.</li><li>Versiones con parche, lockfile y SCA con alerta por KEV (M56, M58).</li></ul>'
});
