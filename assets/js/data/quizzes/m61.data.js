SD.defineQuiz('m61', {
  title: 'Quiz: seguridad de red y del correo', pass: 0.7,
  questions: [
    {
      id: 'zeek', type: 'single',
      prompt: 'Tienes Zeek y Suricata en el mismo sensor. ¿Qué te da Zeek que Suricata no?',
      options: [
        'Bloquear las conexiones maliciosas antes de que lleguen a los servidores de la tienda',
        'Un registro de cada conexión y consulta, coincida o no con alguna firma conocida',
        'Descifrar el tráfico TLS para poder ver las rutas y los cuerpos de las requests',
        'Firmas de ataques más actualizadas, porque su comunidad publica reglas todos los días'
      ],
      answer: 1,
      explain: 'Zeek escribe la historia de todo (conn.log, dns.log, ssl.log); Suricata solo habla cuando algo coincide con una firma. Para investigar un incidente se necesita la historia completa. Ninguno de los dos descifra TLS. Ver 61.1.'
    },
    {
      id: 'nxdomain', type: 'single',
      prompt: 'Un servidor del batch recibió 600 respuestas NXDOMAIN en una hora, para nombres como <code>kq3vzx81hd.example</code>. ¿Qué es lo más probable?',
      options: [
        'Un error de configuración del resolver interno, que no encuentra la zona de la tienda',
        'Un cliente que escribe mal una URL una y otra vez desde el navegador del servidor',
        'Un programa que genera nombres y prueba hasta dar con el de su centro de mando',
        'Un ataque de denegación de servicio contra el resolver público del proveedor'
      ],
      answer: 2,
      explain: 'Cientos de nombres al azar, casi todos inexistentes, desde una sola máquina, es el patrón de un algoritmo de generación de dominios. Un resolver mal configurado fallaría también con nombres normales. Ver 61.2.'
    },
    {
      id: 'tls13', type: 'multi',
      prompt: 'Sin descifrar una conexión TLS 1.3, ¿qué puede ver un sensor? Marca todas las que correspondan.',
      options: [
        'El SNI, si la conexión no usa Encrypted Client Hello',
        'La lista de cifrados y extensiones del ClientHello',
        'El certificado del servidor, con su nombre y su emisor',
        'La ruta de la request, por ejemplo /v1/pedidos'
      ],
      answer: [0, 1],
      explain: 'El ClientHello viaja en claro, con el SNI salvo que se use ECH. En TLS 1.3 el certificado ya va cifrado (en 1.2 se veía) y la ruta siempre viajó dentro del canal cifrado. Ver 61.3.'
    },
    {
      id: 'ja4', type: 'single',
      prompt: '¿Por qué JA3 dejó de servir para reconocer a Chrome y JA4 no tiene ese problema?',
      options: [
        'JA3 usaba MD5, y los navegadores empezaron a rechazar los hashes inseguros en TLS',
        'Chrome baraja el orden de sus extensiones y JA4 las ordena antes de calcular el hash',
        'Chrome dejó de mandar el SNI, y JA4 usa en su lugar la dirección IP del servidor',
        'JA4 incluye el certificado del servidor, que no cambia entre una conexión y otra'
      ],
      answer: 1,
      explain: 'JA3 dependía del orden de las extensiones. Desde 2023 Chrome lo cambia en cada conexión; JA4 ordena las listas antes del hash y la huella vuelve a ser estable. MD5 era solo el resumen, no lo que fallaba. Ver 61.3.'
    },
    {
      id: 'spfsobre', type: 'single',
      prompt: 'Un atacante manda desde su servidor con <code>MAIL FROM</code> en su propio dominio y <code>From: pedidos@tiendanorte.example</code>. Su dominio tiene SPF correcto. Sin DMARC, ¿qué pasa?',
      options: [
        'SPF falla, porque el From: visible no autoriza al servidor del atacante',
        'SPF pasa para el dominio del atacante y no dice nada sobre el From: visible',
        'El receptor rechaza el mensaje, porque los dos remitentes tienen que coincidir',
        'DKIM detecta la diferencia y marca el mensaje como suplantado ante el usuario'
      ],
      answer: 1,
      explain: 'SPF solo mira el dominio del sobre. Que pase para el dominio del atacante es correcto y no protege el From:. Lo que exige que coincidan es la alineación de DMARC. Ver 61.4 y 61.5.'
    },
    {
      id: 'diez', type: 'single',
      prompt: 'Marketing agrega un include más al SPF del dominio principal y el registro llega a 12 consultas al DNS. ¿Qué pasa?',
      options: [
        'Los receptores ignoran los dos últimos mecanismos y evalúan los diez primeros',
        'Funciona igual, pero cada receptor tarda un poco más en evaluar el registro',
        'El resultado es permerror y SPF deja de contar para todo el dominio',
        'Solo los mensajes de la plataforma de marketing dan softfail en el receptor'
      ],
      answer: 2,
      explain: 'El límite de 10 consultas de RFC 7208 no es un aviso: pasarlo da permerror. Por eso el marketing va a un subdominio con su propio SPF. Ver 61.5.'
    },
    {
      id: 'reenvio', type: 'single',
      prompt: 'Una clienta reenvía automáticamente su correo a otra cuenta. ¿Qué le pasa a una confirmación de pedido de la tienda en el segundo salto?',
      options: [
        'SPF falla, porque entrega el servidor de reenvío; DKIM sigue válido si nadie tocó el mensaje',
        'DKIM falla, porque la firma depende de la IP que entrega; SPF sigue pasando igual',
        'Los dos fallan, porque reenviar cambia el header From: por el de la cuenta que reenvía',
        'Los dos pasan, porque el reenvío conserva la conversación SMTP original del emisor'
      ],
      answer: 0,
      explain: 'SPF depende de la IP que entrega, y en el segundo salto es la del reenvío. DKIM va con el mensaje y sobrevive mientras nadie lo modifique; por eso DMARC pasa igual. Ver 61.5 y 61.6.'
    },
    {
      id: 'alineado', type: 'single',
      prompt: 'El proveedor transaccional firma con <code>d=proveedor.example</code> y usa su propio dominio en el sobre. SPF y DKIM pasan. ¿Qué dice DMARC de <code>tiendanorte.example</code>?',
      options: [
        'Pasa, porque SPF y DKIM pasaron y eso es lo que exige DMARC en los dos casos',
        'Pasa solo con alineación relajada, porque los dos dominios son del mismo proveedor',
        'Falla, porque ninguno de los dos dominios coincide con el del From: visible',
        'No se evalúa, porque DMARC solo se aplica a los mensajes que mandan las personas'
      ],
      answer: 2,
      explain: 'DMARC pide que SPF o DKIM pasen con un dominio alineado con el From:. proveedor.example no lo está, ni relajado ni estricto. El arreglo es DKIM con d=tiendanorte.example. Ver 61.7.'
    },
    {
      id: 'orden', type: 'order',
      prompt: 'Ordena el despliegue de DMARC de Tienda Norte.',
      items: [
        'Publicar p=none con rua y leer los reportes',
        'Alinear al proveedor y mudar el marketing a un subdominio',
        'Pasar a p=quarantine con t=y',
        'Pasar a p=quarantine',
        'Pasar a p=reject'
      ],
      explain: 'Primero mirar qué fuentes legítimas fallan (en la tienda, el 67 %), después arreglarlas, y endurecer de a un nivel con los reportes como guía. Con RFC 9989, t=y reemplaza al pct=. Ver 61.7.'
    },
    {
      id: 'mtasts', type: 'single',
      prompt: '¿Contra qué protege MTA-STS?',
      options: [
        'Contra alguien que, en el camino entre dos servidores, borra la oferta de STARTTLS',
        'Contra un atacante que manda correo con el dominio de la tienda en el From: visible',
        'Contra un proveedor de correo que lee los mensajes que guarda en sus servidores',
        'Contra los dominios parecidos que se registran para engañar a los clientes'
      ],
      answer: 0,
      explain: 'MTA-STS hace que el emisor exija TLS con un certificado válido para los MX del receptor. No es cifrado de punta a punta ni tiene que ver con quién mandó el mensaje. Ver 61.8.'
    }
  ]
});
