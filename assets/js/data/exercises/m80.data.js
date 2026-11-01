SD.defineExercise('m80-matriz', {
  title: 'cerrar el acceso de solicitudes_publicacion.php',
  scenario: '<p>Un reclutador pide publicar una oportunidad con <code>solicitudes_publicacion.php</code>, y la coordinación (administradores) las aprueba o rechaza. Hoy el endpoint no llama a <code>requireAuth</code>: <code>GET</code> lista todas, <code>POST</code> toma <code>usuario_id</code> del body y <code>PUT</code> cambia <code>estado_solicitud</code> por id. Decide cada control.</p>',
  steps: [
    { id: 'get', type: 'single',
      prompt: 'Un reclutador abre "mis solicitudes". ¿Qué consulta usa?',
      options: [
        'La lista de todas, y el frontend filtra las suyas por usuario_id',
        'WHERE usuario_id = ? con el id que manda el frontend en la URL',
        'WHERE usuario_id = ? con el id que guarda la sesión del servidor',
        'La lista de todas, porque las solicitudes no tienen datos sensibles'
      ],
      answer: 2,
      explain: 'Filtrar en el frontend manda todas por la red. El id de la URL es un BOLA: se cambia. La sesión dice quién es.' },
    { id: 'post', type: 'single',
      prompt: '¿Qué hace el POST con <code>usuario_id</code> del body?',
      options: [
        'Lo usa si coincide con la sesión, y si no, responde 403',
        'Lo ignora: el id del que pide sale siempre de la sesión',
        'Lo usa, porque un reclutador puede pedir a nombre de su institución',
        'Lo usa solo si el que pide es administrador'
      ],
      answer: 1,
      explain: 'No hay ningún caso en que haga falta: quién pide es quien tiene la sesión. Comparar y responder 403 funciona, pero suma código que alguien quitará. Si el admin necesita pedir por otro, es otra función con su propio rol.' },
    { id: 'put', type: 'single',
      prompt: '¿Quién puede cambiar <code>estado_solicitud</code>?',
      options: [
        'Solo el rol de administrador, por la política del método PUT del endpoint',
        'El reclutador dueño y el administrador, con el dueño en el WHERE',
        'Cualquier usuario con sesión, porque el cambio queda en la auditoría',
        'El reclutador dueño, para retirar su propia solicitud con el mismo PUT'
      ],
      answer: 0,
      explain: 'Aprobar es una función de la coordinación: el problema es el rol (BFLA). Retirar la propia es otra acción, con su método o su ruta, y ahí sí entra el dueño. La auditoría registra, no impide.' },
    { id: 'respuesta', type: 'single',
      prompt: 'Diego pide la solicitud 33, que es de Carla. ¿Qué responde?',
      options: [
        '403 con el mensaje "esta solicitud es de otro reclutador"',
        '200 con la solicitud, porque los dos son reclutadores',
        '404, exactamente igual que una solicitud que no existe',
        '401, porque su sesión no corresponde a esa solicitud'
      ],
      answer: 2,
      explain: 'Mismo rol no es mismo objeto. 403 con mensaje confirma que la 33 existe. 401 es para "no sé quién eres".' },
    { id: 'prueba', type: 'single',
      prompt: '¿Cómo compruebas que esto sigue cerrado dentro de seis meses?',
      options: [
        'Un escaneo DAST semanal contra el entorno de pruebas',
        'Revisar los logs de auditoría cada mes buscando cambios raros',
        'Un comentario en el código que explica qué roles pueden usarlo',
        'Una matriz de persona por acción en PHPUnit, que corre en el CI'
      ],
      answer: 3,
      explain: 'El DAST no sabe de quién es cada solicitud. Los logs encuentran el problema después. La matriz falla el build el día que alguien rompe un control.' }
  ],
  solution: '<ul><li><code>POLITICA</code>: <code>GET</code> y <code>POST</code> para reclutador y admin; <code>PUT</code> (aprobar o rechazar) solo admin; <code>DELETE</code> (retirar) para reclutador.</li><li><code>GET</code>: el reclutador ve <code>WHERE usuario_id = ?</code> con la sesión; el admin ve todas.</li><li><code>POST</code>: <code>usuario_id</code> de la sesión; los campos del body con lista.</li><li><code>DELETE</code>: <code>WHERE id = ? AND usuario_id = ? AND estado_solicitud = \'pendiente\'</code>.</li><li>Ajenas y no existentes: 404. Matriz con anónimo, Carla, Diego, Ana y admin contra las cuatro acciones.</li></ul>'
});
