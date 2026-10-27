SD.defineExercise('m75-politica', {
  title: 'la política de CORS del sistema de prácticas',
  scenario: '<p>El sistema de prácticas se separa: el frontend pasa a <code>https://app.practicas.edu.gt</code> y la API a <code>https://api.practicas.edu.gt</code>. El frontend usa <code>fetch</code> con <code>credentials: "include"</code>, manda JSON y la cabecera <code>X-CSRF-Token</code>. El blog de la universidad, en <code>blog.practicas.edu.gt</code>, lo administra otro equipo. En el laboratorio, el frontend corre en <code>http://localhost:5173</code>. Decide la política.</p>',
  steps: [
    { id: 'origenes', type: 'single',
      prompt: '¿Qué orígenes acepta la API?',
      options: [
        'Todos los de <code>*.practicas.edu.gt</code>, comparando el final del Origin con el dominio',
        'Una lista exacta: el frontend de producción y el del laboratorio',
        'Cualquiera, reflejando el Origin, porque la cookie es Lax y no viaja desde otros sitios',
        'El comodín <code>*</code>, porque así funciona desde producción y desde el laboratorio sin tocar nada'
      ],
      answer: 1,
      explain: 'El blog es el mismo sitio, así que con Lax la cookie viaja desde él: confiar en todos los subdominios le da la API al equipo del blog y a cualquier XSS que tenga. Reflejar tiene el mismo problema. El comodín no funciona con credenciales.' },
    { id: 'preflight', type: 'single',
      prompt: '¿Habrá preflight en las requests del frontend?',
      options: [
        'No, porque el frontend y la API son el mismo sitio',
        'Solo en los PUT y DELETE; los POST nunca llevan preflight',
        'Sí: JSON y X-CSRF-Token lo disparan, también en un POST',
        'Solo la primera vez que se abre la página, porque el navegador recuerda el permiso para siempre'
      ],
      answer: 2,
      explain: 'El preflight depende del origen, no del sitio: app. y api. son orígenes distintos. application/json y una cabecera propia lo disparan en cualquier método. Max-Age guarda el permiso por un tiempo acotado, no para siempre.' },
    { id: 'orden', type: 'order',
      prompt: 'Ordena lo que hace cada endpoint, del primero al último.',
      items: [
        'Mandar Vary: Origin y, si el origen está en la lista, Allow-Origin y Allow-Credentials',
        'Si es OPTIONS, responder 204 con los métodos y cabeceras permitidos y terminar',
        'Comprobar la sesión con requireAuth()',
        'Si el método cambia datos, comprobar el token con requireCsrfToken()',
        'Ejecutar el modelo y responder'
      ],
      explain: 'El preflight no lleva cookies: si la sesión se comprueba antes, contesta 401 y la request real no sale. Las cabeceras CORS van antes de todo para que también los errores se puedan leer desde el frontend.' },
    { id: 'csrf', type: 'single',
      prompt: 'Con esta política, ¿hace falta el token anti-CSRF?',
      options: [
        'No: con una lista exacta ningún otro sitio puede mandar requests a la API',
        'No, porque el preflight frena todos los formularios de otros sitios',
        'Solo si el blog tiene un XSS, porque es el único origen del mismo sitio',
        'Sí: CORS decide quién lee, y una request simple de otro sitio llega y se ejecuta igual'
      ],
      answer: 3,
      explain: 'El preflight frena los formularios solo si la API rechaza los Content-Type de formulario, y PHP llena $_POST con cualquiera. CORS no impide que una request llegue. El token y SameSite son las defensas de CSRF (M76).' }
  ],
  solution: '<ul><li>Lista exacta: <code>https://app.practicas.edu.gt</code> y <code>http://localhost:5173</code>, comparada con <code>in_array(…, true)</code>.</li><li><code>Vary: Origin</code> siempre; <code>Allow-Credentials: true</code> solo para los orígenes de la lista.</li><li>El <code>OPTIONS</code> se responde con 204 antes de la sesión, con <code>Allow-Methods</code>, <code>Allow-Headers</code> (<code>Content-Type, X-CSRF-Token</code>) y <code>Max-Age</code>.</li><li>El token anti-CSRF sigue, en todo lo que cambia datos.</li><li>Alternativa más simple: frontend y API en el mismo origen, con un proxy en <code>/api</code>.</li></ul>'
});
