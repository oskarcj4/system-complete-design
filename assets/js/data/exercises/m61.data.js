SD.defineExercise('m61-dominio', {
  title: 'el dominio de correo de Tienda Norte',
  scenario: '<p>Un cliente reenvía a soporte un correo de <code>pedidos@tiendanorte.example</code> que pide pagar de nuevo un pedido en un enlace raro. La tienda no lo mandó. '
    + 'El dominio tiene un SPF con <code>~all</code>, ningún registro DMARC y manda unos <b>18 000 mensajes por día</b> desde tres lugares: Google Workspace, un proveedor transaccional y una plataforma de marketing. '
    + 'Te piden que nadie más pueda mandar como la tienda, sin que dejen de llegar las confirmaciones de pedido.</p>',
  steps: [
    {
      id: 'primero', type: 'single',
      prompt: '¿Qué publicas primero?',
      options: [
        'p=reject directamente, porque cada día sin política es un día más de phishing',
        'p=none con rua, para ver qué fuentes legítimas fallan antes de endurecer',
        'Cambiar el ~all del SPF por -all, que ya alcanza para frenar la suplantación',
        'p=quarantine con pct=10, para aplicar la política a una parte de los mensajes'
      ],
      answer: 1,
      explain: 'Sin mirar, p=reject habría rechazado el 67 % del correo legítimo de la tienda. -all no protege el From: visible. Y pct= se retiró en RFC 9989: el paso intermedio ahora es t=y.'
    },
    {
      id: 'proveedor', type: 'single',
      prompt: 'Los reportes muestran 9 000 mensajes por día del proveedor con SPF y DKIM en pass, pero para proveedor.example. ¿Cómo lo arreglas?',
      options: [
        'Agregando el include del proveedor al SPF de tiendanorte.example',
        'Cambiando la alineación a estricta para que el proveedor tenga que cumplirla',
        'Pidiéndole que firme con d=tiendanorte.example y use un sobre en un subdominio propio',
        'Excluyendo la IP del proveedor de la evaluación de DMARC con una etiqueta del registro'
      ],
      answer: 2,
      explain: 'El include no alcanza: el sobre sigue siendo de proveedor.example y SPF pasa sin alinear. Con un CNAME del selector, el proveedor firma con el dominio de la tienda y DKIM queda alineado. DMARC no tiene forma de excluir IP.'
    },
    {
      id: 'marketing', type: 'single',
      prompt: 'La plataforma de marketing pide un include más en el SPF principal, que ya va por 8 consultas. ¿Qué haces?',
      options: [
        'Mandar el marketing desde novedades.tiendanorte.example con sus propios registros',
        'Agregarlo igual, porque el límite de 10 es una recomendación y no una regla',
        'Reemplazar todos los includes por la lista de IP que tienen hoy los proveedores',
        'Sacar a Google del SPF, porque Workspace ya firma con DKIM alineado de todos modos'
      ],
      answer: 0,
      explain: 'Un subdominio separa las consultas y la reputación: si el marketing ensucia la suya, no arrastra a las confirmaciones de pedido. Aplanar a IP se rompe en silencio cuando el proveedor cambia de rangos, y pasar de 10 consultas da permerror.'
    },
    {
      id: 'subdominios', type: 'single',
      prompt: 'Alguien manda phishing desde <code>soporte.tiendanorte.example</code>, un subdominio que no existe. ¿Qué lo cubre?',
      options: [
        'Nada: DMARC solo protege el dominio exacto en el que se publica el registro',
        'Un SPF con -all en cada subdominio que se le pueda ocurrir a un atacante',
        'El np=reject de DMARC, la política para subdominios que no existen',
        'Un registro MX vacío en el dominio principal, que bloquea a los subdominios'
      ],
      answer: 2,
      explain: 'RFC 9989 agrega np= para los subdominios inexistentes (sp= cubre los que existen). No se puede publicar un SPF por cada nombre posible; para los subdominios reales que no mandan, v=spf1 -all sí.'
    },
    {
      id: 'parecido', type: 'single',
      prompt: 'Ya con p=reject, aparece phishing desde <code>tiendan0rte.example</code>, con un cero. ¿Qué haces?',
      options: [
        'Pasar la alineación a estricta, para que no alcance con parecerse al dominio',
        'Vigilar los certificados nuevos con nombres parecidos y pedir la baja al registrador',
        'Publicar un registro DMARC con p=reject también para tiendan0rte.example y sus subdominios',
        'Agregar tiendan0rte.example al SPF con -all para que los receptores lo rechacen'
      ],
      answer: 1,
      explain: 'El dominio parecido es del atacante: ni el DMARC ni el SPF de la tienda lo alcanzan, y no puedes publicar registros en un dominio ajeno. Se detecta (Certificate Transparency, dominios recién registrados) y se responde: baja y aviso a los clientes.'
    },
    {
      id: 'reportes', type: 'single',
      prompt: 'Con todo desplegado, ¿qué haces con los reportes rua?',
      options: [
        'Dejar de pedirlos, porque con p=reject ya no aportan nada que haga falta',
        'Leerlos a mano una vez por mes para revisar que todo siga en orden',
        'Guardarlos en el buzón por si algún día hace falta una auditoría del dominio',
        'Procesarlos y alertar en el SIEM si una IP nueva manda como la tienda'
      ],
      answer: 3,
      explain: 'Los reportes son una fuente de detección: avisan cuando el proveedor cambia su infraestructura y las confirmaciones empiezan a rebotar, y cuando alguien intenta suplantar. Son decenas de XML por día: se procesan, no se leen.'
    }
  ],
  solution: '<ul>'
    + '<li>Semana 1: <code>p=none</code> con <code>rua</code>. Los reportes muestran Workspace alineado, el proveedor y el marketing sin alinear (12 000 de 18 000, el 67 %) y unos 120 mensajes de IP desconocidas.</li>'
    + '<li>Semanas 2 a 8: DKIM del proveedor con <code>d=tiendanorte.example</code> (CNAME <code>tx1._domainkey</code>) y sobre en <code>envios.tiendanorte.example</code>; marketing en <code>novedades.tiendanorte.example</code> con SPF, DKIM y DMARC propios; <code>v=spf1 -all</code> en los subdominios que no mandan.</li>'
    + '<li>Semanas 9 a 14: <code>p=quarantine; t=y</code>, después <code>p=quarantine</code>. Desde la 15: <code>p=reject; np=reject</code>.</li>'
    + '<li>MTA-STS en <code>testing</code> un mes y después <code>enforce</code>, con TLS-RPT.</li>'
    + '<li>Detección: reportes DMARC al SIEM (IP nueva que manda más de 100 mensajes como la tienda), certificados nuevos con nombres parecidos a <code>tiendanorte</code> y un procedimiento de baja y aviso a los clientes.</li>'
    + '</ul>'
});
