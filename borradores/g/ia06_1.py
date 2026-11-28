# IA06, parte 1: objetivos, excusa, antes, endpoints, dependencias e infraestructura.
import math

add(objectives([
    'Armar una tubería de voz en cascada con Pipecat: el navegador por WebRTC, Silero para saber cuándo callaste, Whisper para oír, Claude u Ollama para pensar y Piper para hablar, todo en streaming.',
    'Explicar con una figura qué es un cuadro de audio, cuándo se da por terminado un turno y por qué el agente empieza a hablar antes de que el modelo termine de pensar.',
    'Hacer que una interrupción deje en la historia solo lo que llegó a sonar, y usar esa historia para decidir si la persona oyó la propuesta entera.',
    'Confirmar en voz alta antes de actuar, con la regla escrita en código y no en el prompt, y reservar con una clave de idempotencia.',
    'Impedir dos citas a la misma hora con una restricción de exclusión de PostgreSQL, y provocar la carrera para verlo.',
    'Medir cuánto tarda cada parte de cada turno, con Claude y con el modelo local, y comparar la mediana y el p95 con el presupuesto de 800 ms de M24.',
]))

# ------------------------------------------------------------------ excusa
add('<h2 id="excusa">La excusa</h2>\n')
add('<p>Un consultorio con dos profesionales pierde llamadas en la hora del almuerzo y los viernes por la tarde. Casi todas son para pedir, mover o cancelar una cita. Quieres que conteste una recepcionista que no se cansa: que escuche, mire la agenda, ofrezca dos o tres horas, repita la elegida en voz alta, espere el sí y reserve.</p>\n')
add('<p>Por dentro, es el mismo bucle de herramientas de <a href="' + IA0 + '#ae-tool-calling">IA00</a> con dos problemas que el texto no tiene. El primero es el tiempo: entre que la persona calla y oye una respuesta no puede pasar mucho más de un segundo, o la llamada se siente rota (<a href="' + M24 + '#presupuesto">24.8</a>). El segundo es que la persona habla encima. Si el agente estaba leyendo "el martes 1 de diciembre a las 10:30" y lo cortaron en "el martes", el sí que viene después no es un sí a las 10:30.</p>\n')
add('<p>No hay teléfono de verdad: el navegador hace de teléfono, con el micrófono y los parlantes de tu computadora, conectado por WebRTC a un proceso de Python en tu máquina. Oír y hablar son locales siempre; lo único que puede salir es el texto que va a Claude.</p>\n')


def _arch():
    f = 'fi06'
    return svg(f, 770, 450, 'La arquitectura de IA06',
        'A la izquierda, el navegador hace de teléfono. Le manda el audio del micrófono por WebRTC a bot.py, un proceso de Python con la tubería de Pipecat: el VAD de Silero decide cuándo calló la persona, Whisper transcribe el turno, el modelo, Claude u Ollama, decide qué decir y qué herramienta llamar, y Piper convierte el texto en voz, que vuelve al navegador. Abajo, las herramientas consultan la agenda en PostgreSQL y le preguntan a confirmar.py si la persona oyó la propuesta y dijo que sí. Un observador anota la latencia de cada turno en un CSV. Los evals llaman a las mismas herramientas sin audio. Diez flechas numeradas.',
        '\n'.join([
            f'<rect class="dg-frame" x="176" y="40" width="574" height="250" rx="10" style="fill:none"/>',
            text(190, 280, 'bot.py: la tubería de Pipecat, un proceso en tu máquina', 'dg-group'),
            edge(f, 'M150 156 C168 156 168 88 188 88'),
            edge(f, 'M310 88 L328 88'),
            edge(f, 'M450 88 L468 88'),
            edge(f, 'M590 88 L608 88'),
            edge(f, 'M700 60 V24 H85 V138'),
            edge(f, 'M530 116 V198'),
            edge(f, 'M470 228 L452 228'),
            edge(f, 'M530 256 V338'),
            edge(f, 'M250 350 V318 H500 V258'),
            edge(f, 'M670 116 V198', dashed=True),
            box(20, 140, 130, 64, 'Navegador', 'el teléfono', 'client', 'navegador'),
            box(190, 60, 120, 56, 'VAD', 'Silero', 'edge', 'vad'),
            box(330, 60, 120, 56, 'Oír', 'Whisper, local', 'gpu', 'stt'),
            box(470, 60, 120, 56, 'Pensar', 'Claude u Ollama', 'gpu', 'llm'),
            box(610, 60, 120, 56, 'Hablar', 'Piper, local', 'gpu', 'tts'),
            box(470, 200, 120, 56, 'Herramientas', 'cuatro', 'service', 'herramientas'),
            box(330, 200, 120, 56, 'La regla', 'confirmar.py', 'service', 'regla'),
            box(610, 200, 120, 56, 'Latencias', 'latencias.csv', 'queue', 'latencia'),
            box(455, 340, 150, 64, 'PostgreSQL', 'consultorio, 55438', 'db', 'base'),
            box(190, 352, 120, 56, 'Evals', 'diálogos en texto', 'edge', 'evals'),
            pin(1, 158, 126), pin(2, 319, 74), pin(3, 459, 74), pin(4, 599, 74), pin(5, 420, 14),
            pin(6, 546, 160), pin(7, 461, 214), pin(8, 546, 300), pin(9, 380, 330), pin(10, 686, 160),
        ]))


add(figure(_arch(), '<b>Figura IA06.1.</b> El camino del audio va por arriba, de izquierda a derecha, y vuelve al navegador por la flecha 5. El de los datos baja: el modelo llama a las herramientas, y las herramientas son las únicas que tocan la base. La flecha punteada no lleva datos de la llamada: es el observador que anota cuánto tardó cada parte.', arch=True))
add(table(['#', 'De → a', 'Protocolo y formato', 'Ejemplo', 'Con qué permiso'], [
    ['1', 'navegador → VAD', 'WebRTC: audio Opus sobre UDP; bot.py lo decodifica a PCM de 16 bits', 'Cuadros de 20 ms mientras hablas', 'El permiso de micrófono del navegador, para <code>localhost</code>'],
    ['2', 'VAD → oír', 'Cuadros de audio en memoria, dentro del proceso', 'El turno entero, cuando el VAD lleva 0.2 s sin oír voz', 'Ninguno: no hay red'],
    ['3', 'oír → pensar', 'Texto en memoria, que se agrega a la historia como mensaje de <code>user</code>', '<code>Quiero una cita con la doctora Ruiz el martes.</code>', 'Ninguno'],
    ['4', 'pensar → hablar', 'Texto en streaming, frase por frase', '<code>¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30?</code>', 'Con Claude, HTTPS a Anthropic con tu clave; con Ollama, HTTP a <code>localhost:11434</code>'],
    ['5', 'hablar → navegador', 'WebRTC: el audio de Piper, a Opus, de vuelta', 'La pregunta, en voz', 'Ninguno'],
    ['6', 'pensar → herramientas', 'Una llamada a herramienta: nombre y argumentos en JSON', '<code>ver_disponibilidad({"profesional": "ruiz", "fecha": "2026-12-01"})</code>', 'Las cuatro herramientas que declara <code>bot.py</code>, ninguna más'],
    ['7', 'herramientas → la regla', 'Una llamada de función con la historia de la conversación', 'La propuesta, lo que sonó y lo que dijo la persona; vuelve <code>(True, "ok")</code> o el motivo', 'Ninguno: es código'],
    ['8', 'herramientas → PostgreSQL', 'SQL sobre TCP, puerto 55438', '<code>INSERT INTO citas … ON CONFLICT (clave) DO NOTHING</code>', '<code>agenda_bot</code>: lee, agrega y cambia el estado; no borra'],
    ['9', 'evals → herramientas', 'Una llamada de función, sin audio', 'Seis diálogos escritos, k veces cada uno', 'Los mismos de 6, 7 y 8; antes, el administrador vacía la tabla'],
    ['10', 'Pipecat → latencias', 'Un evento por turno con el desglose; una fila de CSV por parte', '<code>s1,claude,1764…,transcription,0.150</code>', 'Tu usuario, escritura en la carpeta'],
]))
add('<p><b>Las fronteras.</b> El audio no sale de tu máquina: Silero, Whisper y Piper corren en el proceso de <code>bot.py</code>, y el navegador se conecta a <code>localhost:7860</code>. Con <code>VOZ_MODELO=claude</code> sale el texto de la conversación, las instrucciones y las definiciones de las herramientas; con <code>ollama</code> no sale nada. La base escucha solo en <code>127.0.0.1:55438</code>, y el agente entra con un rol que no puede borrar citas ni cambiarles la hora: lo peor que puede hacer un modelo confundido es reservar o cancelar, y las dos cosas pasan por la regla de la confirmación.</p>\n')
add('<h3 id="excusa-viaje">El viaje, por adelantado</h3>\n')
add(figure(seq('fi06v', 'Una reserva, de punta a punta', 'La persona pide una cita. Whisper transcribe cuando calla, el modelo consulta las horas libres, prepara la propuesta y la lee por Piper. La persona dice que sí, el modelo llama a confirmar y la herramienta inserta la cita con su clave.',
    [('pe', 'Persona'), ('oi', 'VAD y Whisper'), ('mo', 'Modelo'), ('he', 'Herramientas'), ('pg', 'PostgreSQL'), ('bo', 'Piper')],
    [('pe', 'oi', 'audio: quiero cita el martes', 'req'),
     ('oi', 'mo', 'texto, tras 0.2 s de silencio', 'req'),
     ('mo', 'he', 'ver_disponibilidad', 'req'),
     ('he', 'pg', 'SELECT ocupadas', 'req'),
     ('he', 'mo', 'libres: 09:00, 10:30…', 'res'),
     ('mo', 'he', 'proponer_reserva', 'req'),
     ('he', 'mo', 'leer: ¿Le reservo…?', 'res'),
     ('mo', 'bo', 'la pregunta, frase a frase', 'req'),
     ('bo', 'pe', 'audio de la pregunta', 'res'),
     ('pe', 'oi', 'audio: sí', 'req'),
     ('oi', 'mo', 'texto: Sí.', 'req'),
     ('mo', 'he', 'confirmar()', 'req'),
     ('he', 'pg', 'INSERT con la clave', 'req'),
     ('pg', 'he', 'id 1', 'res'),
     ('mo', 'bo', 'Listo, quedó reservada.', 'req')]),
    '<b>Figura IA06.2.</b> La versión corta. Dos turnos de la persona y seis llamadas a herramientas o a la base. La versión completa, con una interrupción, está en <a href="#viaje">El viaje de un dato</a>.'))

# ------------------------------------------------------------------ antes
add('<h2 id="antes">Antes de empezar</h2>\n')
add('<h3 id="ae-repaso">Lo que viene de las guías anteriores</h3>\n')
add(figure(cards('fi06r', 'Lo que viene de las guías anteriores', 'Seis piezas de IA00 a IA05 que vuelven: el bucle de herramientas, la aprobación antes de actuar, la clave de idempotencia, los roles de PostgreSQL, el modelo falso y pass^k.', [
    ('Herramientas', 'IA00: el modelo pide, el código ejecuta.', 'Cuatro, y una sola con efecto.'),
    ('Aprobar antes de actuar', 'IA01 a IA04: un interrupt y una persona.', 'La persona que llama aprueba con su voz.'),
    ('La clave', 'IA03: el mismo reembolso no se paga dos veces.', 'La misma confirmación no reserva dos veces.'),
    ('Los roles', 'IA02 a IA05: el GRANT es la barrera.', 'El agente no puede borrar ni cambiar la hora.'),
    ('El modelo falso', 'IA00: un guion en lugar del modelo.', 'Las herramientas, con una agenda en memoria.'),
    ('pass^k', 'IA00 a IA05: cada caso k veces.', 'Seis diálogos, juzgados por la agenda.'),
]), '<b>Figura IA06.3.</b> Lo nuevo de esta guía es el audio y el tiempo; casi todo lo demás ya lo hiciste. Si algo no te suena, la tabla te lleva a donde se explicó.'))
add(table(['Qué', 'Dónde se vio'], [
    ['uv, la clave de Anthropic y Ollama', '<a href="' + IA0 + '#ae-uv">IA00, uv</a>, <a href="' + IA0 + '#ae-clave">la clave</a> y <a href="' + IA0 + '#ae-ollama">Ollama</a>'],
    ['El bucle de herramientas', '<a href="' + IA0 + '#ae-tool-calling">IA00, tool calling</a>'],
    ['Aprobar antes de actuar', '<a href="' + IA0 + '#ae-interrupt">IA00, el interrupt</a> y <a href="' + IA3 + '#ae-aprobacion">IA03, la aprobación</a>'],
    ['La clave de idempotencia', '<a href="' + IA0 + '#ae-idempotencia">IA00</a> y <a href="' + IA3 + '#ae-clave-pago">IA03, la clave del pago</a>'],
    ['Roles de PostgreSQL', '<a href="' + IA2 + '#ae-roles">IA02, los roles</a>'],
    ['Docker y Compose', '<a href="' + IA0 + '#ae-docker">IA00, Docker</a>'],
    ['El modelo falso y pass^k', '<a href="' + IA0 + '#ae-pass-k">IA00, pass^k</a>'],
    ['<code>async</code> y <code>await</code>', '<a href="' + IA0 + '#py-async">IA00, async</a>'],
    ['Decoradores', '<a href="' + IA0 + '#py-decoradores">IA00, decoradores</a>'],
]))
add(figure(plate('fi06p', 'Lámina IA06.A: un agente que habla', 'Doce piezas: cuadro de audio, WebRTC, VAD, fin de turno, STT, primer token, TTS, barge-in, truncado, confirmación, restricción de exclusión y clave.', [
    ('Cuadro de audio', '20 ms, 320 muestras'), ('WebRTC', 'Opus sobre UDP'), ('VAD', 'Silero, 0.7'),
    ('Fin de turno', 'stop_secs = 0.2'), ('STT', 'Whisper small'), ('Primer token', 'TTFT del modelo'),
    ('TTS', 'Piper es_MX'), ('Barge-in', 'hablar encima'), ('Truncado', 'queda lo que sonó'),
    ('Confirmación', 'oyó todo y dijo sí'), ('Exclusión', 'franja WITH &&'), ('Clave', 'sha256 de la propuesta')]),
    '<b>Lámina IA06.A.</b> Las piezas en el orden en que las cruza un turno: las cuatro primeras llevan tu voz hasta el texto, las tres siguientes la respuesta hasta tus oídos, y las cinco últimas cuidan que lo que se reserva sea lo que oíste.'))
add(plate_key([
    ('Cuadro de audio', 'Un pedazo de 20 ms de sonido: 320 muestras de 16 bits a 16 kHz. Todo lo que viaja y se analiza, viaja de a cuadros.', 'ae-audio', 'El audio en números'),
    ('WebRTC', 'La forma en que el navegador manda y recibe audio en tiempo real, por UDP y con Opus.', 'ae-webrtc', 'El navegador como teléfono'),
    ('VAD', 'Un modelo chico que dice, cuadro por cuadro, si hay voz. Aquí, Silero.', 'ae-turnos', '¿Ya terminó de hablar?'),
    ('Fin de turno', 'La decisión de que la persona terminó y le toca al agente. Aquí, 0.2 s seguidos sin voz.', 'ae-turnos', '¿Ya terminó de hablar?'),
    ('STT', 'Speech to text: del audio del turno al texto. Aquí, Whisper en tu máquina.', 'ae-cascada', 'La cascada, en streaming'),
    ('Primer token', 'Lo que tarda el modelo en devolver la primera palabra. Es lo que más varía entre Claude y Ollama.', 'ae-presupuesto', 'El presupuesto'),
    ('TTS', 'Text to speech: del texto a la voz. Piper empieza con la primera frase, sin esperar la respuesta entera.', 'ae-cascada', 'La cascada, en streaming'),
    ('Barge-in', 'Que la persona hable mientras el agente habla. El agente se calla y escucha.', 'ae-interrupcion', 'Interrumpir y truncar'),
    ('Truncado', 'De lo que el modelo escribió, en la historia queda solo lo que alcanzó a sonar.', 'ae-interrupcion', 'Interrumpir y truncar'),
    ('Confirmación', 'La regla: solo se actúa si sonó la propuesta entera y después la persona dijo que sí.', 'ae-confirmar', 'Confirmar en voz alta'),
    ('Restricción de exclusión', 'Una regla de PostgreSQL que rechaza dos filas cuyos rangos se pisan.', 'ae-exclusion', 'Dos citas no se pisan'),
    ('Clave', 'Un hash de la sesión y la propuesta: la misma confirmación dos veces reserva una vez.', 'ae-confirmar', 'Confirmar en voz alta'),
]))

add('<h3 id="ae-instalar">Qué tienes que tener</h3>\n')
add(table(['Qué', 'Para qué', 'Cómo compruebas que está'], [
    ['Docker con Compose', 'PostgreSQL con la agenda', '<code>docker compose version</code>; si no lo tienes, <a href="' + IA0 + '#ae-docker">IA00</a>'],
    ['uv y Python 3.13', 'El agente, los evals y las pruebas', '<code>uv --version</code>; ver <a href="' + IA0 + '#ae-uv">IA00</a>'],
    ['Una clave de Anthropic, u Ollama con <code>qwen2.5:7b</code>', 'El modelo que piensa', '<code>ollama list</code>, o la clave en <code>.env</code>; ver <a href="' + IA0 + '#ae-clave">IA00</a>'],
    ['Chrome, Edge o Firefox, con micrófono y parlantes', 'El teléfono', 'Abre la configuración de sonido del sistema y habla: la barra del micrófono se mueve'],
    ['Auriculares, mejor que parlantes', 'Que el micrófono no oiga al agente', 'Sin auriculares, el agente puede oírse a sí mismo y cortarse solo: es la <a href="#comprueba-fallas">falla 4</a>'],
    ['Unos 2 GB libres en disco', 'Whisper <code>small</code>, la voz de Piper y las dependencias', 'Whisper y la voz se bajan solos la primera vez que corres <code>bot.py</code>'],
]))
add(code('bash', 'ollama pull qwen2.5:7b        # solo si vas a pensar con el modelo local'))
add('<p>No hace falta una GPU: Whisper <code>small</code> y Piper corren en la CPU de una laptop. Con una GPU de NVIDIA, Whisper la usa solo (<code>device="auto"</code>) y transcribe más rápido. Lo que sí cambia todo es la máquina: las latencias que midas son de la tuya, y por eso la guía no trae ninguna; trae la forma de medirlas.</p>\n')

# ---------------- ae-audio
add('<h3 id="ae-audio">El audio en números</h3>\n')
add(analogy('Una película es una fila de fotos fijas que pasan rápido. El sonido digital es una fila de números que dicen cuánto se movió la membrana del micrófono, dieciséis mil veces por segundo. Y como nadie manda las fotos de a una, el audio viaja en paquetes de 20 ms, como rollos cortos de película.'))
add('<p>El micrófono mide la presión del aire muchas veces por segundo. Cada medida es una <b>muestra</b>: un número entero de 16 bits, entre −32 768 y 32 767. A 16 kHz, que es lo que piden Silero y Whisper, son 16 000 muestras por segundo. Nadie procesa las muestras de a una: se juntan en <b>cuadros</b> de 20 ms.</p>\n')


def _audio():
    f = 'fi06a'
    b = [text(20, 24, 'Un segundo de voz, en cuadros de 20 ms', 'dg-group')]
    pts = []
    for i in range(0, 361):
        x = 20 + i * 2
        env = 0.35 + 0.65 * abs(math.sin(i / 60))
        y = 110 - 46 * env * math.sin(i / 3.1) * math.cos(i / 17)
        pts.append(f'{x:.1f},{y:.1f}')
    b.append(f'<path class="dg-edge" d="M{" L".join(pts)}" style="fill:none;stroke-width:1.2"/>')
    for k in range(9):
        x = 20 + k * 80
        b.append(f'<path class="dg-feedback" d="M{x} 52 V170"/>')
    b.append(f'<rect class="dg-layer" style="--c: var(--l-edge); fill-opacity:.25" x="100" y="52" width="80" height="118" rx="4"/>')
    b.append(text(140, 190, 'un cuadro: 20 ms', 'dg-tiny', 'middle'))
    b.append(edge(f, 'M140 196 C140 220 260 214 300 236'))
    b.append(f'<rect class="dg-box" x="300" y="222" width="450" height="96" rx="8"/>')
    for i in range(24):
        x = 318 + i * 18
        h = 30 * math.sin(i / 2.2) * (0.6 + 0.4 * math.cos(i / 5))
        b.append(f'<path class="dg-edge" d="M{x} 270 V{270 - h:.1f}" style="stroke-width:1"/>')
        b.append(f'<circle cx="{x}" cy="{270 - h:.1f}" r="2.6" class="dg-arrow"/>')
    b.append(text(316, 308, '320 muestras por cuadro; cada punto es un número de 16 bits', 'dg-tiny'))
    b.append(text(20, 236, '16 000 muestras por segundo', 'dg-small'))
    b.append(text(20, 256, '× 0.020 s = 320 muestras por cuadro', 'dg-small'))
    b.append(text(20, 276, '× 2 bytes = 640 bytes por cuadro', 'dg-small'))
    b.append(text(20, 296, '× 50 cuadros = 32 000 bytes por segundo', 'dg-small'))
    return svg(f, 770, 336, 'Muestras y cuadros',
        'Una onda de voz de un segundo, dividida por líneas punteadas en tramos. Uno de los tramos, de 20 milisegundos, aparece ampliado: son 320 puntos, cada uno un número de 16 bits. A la izquierda, la cuenta: 16 000 muestras por segundo por 0.020 segundos son 320 muestras; por 2 bytes, 640 bytes por cuadro; por 50 cuadros, 32 000 bytes por segundo.',
        '\n'.join(b))


add(figure(_audio(), '<b>Figura IA06.4.</b> La cuenta de abajo es la que hace Silero en cada cuadro y la que pagaría la red si el audio viajara sin comprimir. WebRTC lo comprime con Opus antes de mandarlo (<a href="' + M24 + '#transporte">24.4</a>), y bot.py lo descomprime al llegar. La figura muestra menos líneas de las que hay: un segundo tiene 50 cuadros.'))
add('<p>Dos números de la cuenta vuelven en toda la guía. Un cuadro de 20 ms es la unidad más chica de tiempo: el VAD decide de a cuadros, y 0.2 s de silencio son diez cuadros seguidos. Y 32 000 bytes por segundo es poco para una computadora: el problema del audio en tiempo real no es el volumen sino el ritmo, porque cada cuadro tiene que procesarse antes de que llegue el siguiente.</p>\n')

# ---------------- ae-webrtc
add('<h3 id="ae-webrtc">El navegador como teléfono</h3>\n')
add(analogy('Una carta y una llamada. Por HTTP, el navegador manda una carta y espera la respuesta: si una se pierde, se vuelve a mandar, y llega tarde pero entera. Por WebRTC, habla: si una palabra se corta, no se repite, porque cuando llegara ya no serviría. Prefiere perder 20 ms de voz a atrasar toda la conversación.'))
add('<p><dfn data-term="webrtc">WebRTC</dfn> es lo que usa el navegador para videollamadas. Manda el audio por UDP, comprimido con Opus, y tolera que se pierda algún paquete (<a href="' + M24 + '#transporte">24.4</a>). Para conectarse, las dos puntas intercambian una vez una descripción de lo que saben hacer, el <b>SDP</b>: el navegador manda su oferta por HTTP a <code>POST /api/offer</code>, bot.py responde con la suya, y desde ahí el audio va directo por UDP, sin pasar por HTTP.</p>\n')
add(figure(flow('fi06w', 'Cómo se conecta el teléfono', 'Cuatro pasos: abres la página del cliente, el navegador pide el micrófono, manda su oferta SDP por HTTP y recibe la respuesta, y desde ahí el audio va por UDP en las dos direcciones.', [
    ('Abrir /client', 'la página que trae Pipecat'), ('Micrófono', 'el navegador pide permiso'),
    ('POST /api/offer', 'oferta y respuesta SDP'), ('Audio por UDP', 'Opus, en las dos direcciones')], layer='client'),
    '<b>Figura IA06.5.</b> El paso 3 es la única vez que el audio usa HTTP, y solo para ponerse de acuerdo. Pipecat lo llama SmallWebRTC: una conexión directa entre el navegador y el proceso, sin un servidor de medios en el medio. Con muchas llamadas a la vez se usa uno (<a href="' + M24 + '#media">24.5</a>).'))
add('<p>Los navegadores dejan usar el micrófono en páginas con HTTPS o en <code>localhost</code>. Por eso la guía abre <code>http://localhost:7860/client</code> y no la IP de tu máquina: desde otra computadora de tu red, el navegador no te va a pedir permiso; directamente no lo da.</p>\n')

# ---------------- ae-turnos
add('<h3 id="ae-turnos">¿Ya terminó de hablar?</h3>\n')
add(analogy('Un intérprete en una conferencia. No traduce cada palabra apenas la oye ni espera a que termine el discurso: espera una pausa. Si la pausa es corta, corta al orador en medio de una idea; si es larga, el público se queda esperando.'))
add('<p>El <dfn data-term="vad">VAD</dfn> (voice activity detection) es un modelo chico que mira cada cuadro y dice qué tan probable es que haya voz. Silero lo hace en la CPU, en menos tiempo que lo que dura un cuadro. Con eso, Pipecat decide el <dfn data-term="fin-de-turno">fin de turno</dfn> con una regla simple: si la confianza pasa de 0.7 por 0.2 s, la persona empezó a hablar; si baja por 0.2 s, terminó. Son los valores por defecto de Pipecat 1.16.0 ' + DOC + ', y esta guía solo cambia el segundo, con <code>VOZ_SILENCIO</code>.</p>\n')


def _vad():
    f = 'fi06t'
    b = [text(20, 24, 'Probabilidad de voz, cuadro a cuadro', 'dg-group')]
    b.append('<path class="sim-axis" d="M60 150 H750"/>')
    b.append('<path class="sim-axis" d="M60 40 V150"/>')
    b.append('<path class="dg-feedback" d="M60 73 H750"/>')
    b.append(text(54, 77, '0.7', 'dg-tiny', 'end'))
    b.append(text(54, 154, '0', 'dg-tiny', 'end'))
    b.append(text(54, 46, '1', 'dg-tiny', 'end'))
    for i in range(0, 120):
        t = i * 0.02
        v = 0.06
        if 0.12 <= t < 0.98:
            v = 0.9 - 0.08 * math.sin(i)
        elif 0.98 <= t < 1.12:
            v = 0.3
        elif 1.12 <= t < 1.9:
            v = 0.88 - 0.07 * math.cos(i * 1.3)
        x = 60 + t * 285
        h = v * 110
        cls = 'dg-layer' if v >= 0.7 else 'dg-box'
        b.append(f'<rect class="{cls}" style="--c: var(--l-edge)" x="{x:.1f}" y="{150 - h:.1f}" width="4.6" height="{h:.1f}"/>')
    b.append(f'<path class="dg-edge" d="M339 166 H379" style="stroke:var(--warn)"/>')
    b.append(text(359, 184, 'pausa de 0.14 s', 'dg-tiny', 'middle'))
    b.append(text(359, 198, 'no llega a 0.2: sigue el turno', 'dg-tiny', 'middle'))
    b.append(f'<path class="dg-edge" d="M602 166 H659" style="stroke:var(--ok)"/>')
    b.append(text(630, 184, '0.2 s sin voz', 'dg-tiny', 'middle'))
    b.append(text(630, 198, 'fin de turno: va a Whisper', 'dg-tiny', 'middle'))
    b.append(edge(f, 'M659 120 V100 H730 V134'))
    b.append(text(60, 220, 'Más corto (0.1 s): te corta al pensar "a las… diez". Más largo (0.6 s): cada respuesta suma 0.4 s de espera.', 'dg-small'))
    return svg(f, 770, 236, 'El fin de turno con un umbral de silencio',
        'Barras de la probabilidad de voz cada 20 milisegundos durante unos dos segundos y medio. Una línea marca el umbral de 0.7. La persona habla, hace una pausa de 0.14 segundos que no llega a 0.2 y el turno sigue, vuelve a hablar y se calla: a los 0.2 segundos sin voz se declara el fin de turno y el audio va a Whisper. Abajo: un umbral más corto corta a la persona cuando piensa; uno más largo suma espera a cada respuesta.',
        '\n'.join(b))


add(figure(_vad(), '<b>Figura IA06.6.</b> Dibujo ilustrativo, no una medición. Las barras más oscuras pasan el umbral. Esperar silencio es lo más simple y lo más tosco: Pipecat también trae modelos que miran la forma de la frase para decidir si terminó (<a href="' + M24 + '#turnos">24.6</a>). Esta guía usa solo el silencio para que veas el compromiso con un número que puedes mover.'))
add(callout('tradeoff', 'Trade-off', '<p>El silencio de fin de turno entra entero en la latencia de cada respuesta: con 0.2 s, ninguna respuesta puede empezar antes de 0.2 s después de que callaste. Bajarlo a 0.1 s gana 0.1 s por turno y corta a quien duda. En <a href="#comprueba-fallas">la falla 3</a> lo subes a 0.8 s para sentir la diferencia.</p>'))

# ---------------- ae-cascada
add('<h3 id="ae-cascada">La cascada, en streaming</h3>\n')
add(analogy('Un mozo que anota el pedido, lo lleva a la cocina y vuelve con el plato. Si espera a que salgan los tres platos para traer el primero, comes tarde. Si trae cada uno apenas sale, empiezas a comer mientras se cocina el resto, y la cocina no fue más rápida.'))
add('<p>Una <b>cascada</b> son tres modelos en fila: <dfn data-term="stt">STT</dfn> (de voz a texto), el LLM y <dfn data-term="tts">TTS</dfn> (de texto a voz). La otra opción es un solo modelo que oye y habla, <span class="no-autolink">speech-to-speech</span> (<a href="' + M24 + '#arquitecturas">24.2</a>). La cascada es más lenta, pero puedes ver y medir cada etapa, cambiar cualquiera, y correr las tres en tu máquina. Para que no sea demasiado lenta, las etapas se solapan: Piper empieza a hablar con la primera frase del modelo, mientras el modelo sigue escribiendo la segunda.</p>\n')


def _cascada():
    f = 'fi06c'
    b = [text(20, 24, 'De a una', 'dg-group'), text(20, 132, 'En streaming', 'dg-group')]
    def bar(x, y, w, lab, layer):
        return (f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x}" y="{y}" width="{w}" height="30" rx="5"/>'
                + text(x + w / 2, y + 20, lab, 'dg-tiny', 'middle'))
    b += [bar(90, 40, 90, 'STT del turno', 'gpu'), bar(184, 40, 220, 'el modelo escribe todo', 'gpu'),
          bar(408, 40, 200, 'Piper sintetiza todo', 'gpu'), bar(612, 40, 130, 'suena', 'client')]
    b.append('<path class="dg-edge" d="M90 84 H612" style="stroke:var(--fail)"/>')
    b.append(text(351, 100, 'espera hasta el primer sonido', 'dg-tiny', 'middle'))
    b += [bar(90, 148, 90, 'STT del turno', 'gpu'), bar(184, 148, 70, 'frase 1', 'gpu'), bar(258, 148, 70, 'frase 2', 'gpu'),
          bar(332, 148, 70, 'frase 3', 'gpu'),
          bar(258, 184, 64, 'TTS 1', 'gpu'), bar(332, 184, 64, 'TTS 2', 'gpu'), bar(406, 184, 64, 'TTS 3', 'gpu'),
          bar(326, 220, 330, 'suena, sin cortes', 'client')]
    b.append('<path class="dg-edge" d="M90 262 H326" style="stroke:var(--ok)"/>')
    b.append(text(208, 278, 'espera hasta el primer sonido', 'dg-tiny', 'middle'))
    b.append(text(20, 300, 'Las barras son ilustrativas: los largos reales los mides en el paso 7.', 'dg-small'))
    return svg(f, 770, 312, 'La cascada de a una y en streaming',
        'Arriba, cada etapa espera a la anterior: el STT transcribe el turno, el modelo escribe toda la respuesta, Piper la sintetiza entera y recién entonces suena. Una línea roja marca la espera larga hasta el primer sonido. Abajo, el modelo escribe frase por frase, Piper sintetiza cada frase apenas llega y el audio empieza después de la primera; la línea verde de espera es mucho más corta. Las barras son ilustrativas.',
        '\n'.join(b))


add(figure(_cascada(), '<b>Figura IA06.7.</b> Las dos filas hacen el mismo trabajo, con los mismos modelos. Lo que cambia es cuándo empieza a sonar: abajo, después de la primera frase y no de la respuesta entera. Whisper, en cambio, transcribe el turno entero de una vez, después del fin de turno: por eso es una barra sola en las dos filas.'))
add('<p>Esa es también la razón de que las instrucciones pidan una o dos frases cortas y nada de listas: una respuesta larga no tarda más en empezar, pero tarda más en terminar, y la persona no puede saltar al final de un audio como salta al final de un texto. Y lo que Piper lee tiene que ser texto para leer en voz alta: un asterisco de markdown suena como "asterisco" o como nada.</p>\n')

# ---------------- ae-presupuesto
add('<h3 id="ae-presupuesto">El presupuesto</h3>\n')
add(analogy('El presupuesto de una casa. No alcanza con saber que la obra salió cara: necesitas cuánto se fue en materiales, cuánto en mano de obra y cuánto en permisos, para saber qué recortar.'))
add('<p>M24 reparte unos 800 ms entre las etapas de una cascada en streaming (<a href="' + M24 + '#presupuesto">24.8</a>). Esta guía no te va a decir cuánto tarda la tuya; te deja un CSV con cada parte de cada turno, para que lo compares con ese reparto. La figura usa los números de M24 como referencia, no los de tu máquina.</p>\n')


def _presu():
    f = 'fi06b'
    partes = [('captura', 30, 'client'), ('red', 25, 'edge'), ('jitter', 30, 'edge'), ('fin de turno', 250, 'edge'),
              ('STT', 50, 'gpu'), ('primer token', 150, 'gpu'), ('1.ª frase', 100, 'gpu'), ('TTS', 80, 'gpu'),
              ('red', 25, 'edge'), ('suena', 40, 'client')]
    esc = 700 / 900
    b = [text(20, 24, 'El reparto de M24, en ms', 'dg-group')]
    x = 40
    for i, (lab, ms, layer) in enumerate(partes):
        w = ms * esc
        b.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="{x:.1f}" y="44" width="{w:.1f}" height="40" rx="3"/>')
        if ms >= 80:
            b.append(text(x + w / 2, 62, lab, 'dg-tiny', 'middle'))
            b.append(text(x + w / 2, 77, str(ms), 'dg-tiny dg-mono', 'middle'))
        else:
            b.append(text(x + w / 2, 98 + (i % 3) * 14, f'{lab} {ms}', 'dg-tiny', 'middle'))
        x += w
    b.append(f'<path class="dg-feedback" d="M{40 + 800 * esc:.1f} 36 V132"/>')
    b.append(text(40 + 800 * esc, 146, '800 ms', 'dg-tiny', 'middle'))
    b.append(text(40 + 780 * esc, 36, '780', 'dg-tiny', 'middle'))
    x0 = 40 + 85 * esc
    b.append(f'<path class="dg-edge" d="M{x0:.1f} 160 H{40 + 715 * esc:.1f}" style="stroke:var(--link)"/>')
    b.append(text(20, 182, 'La línea azul es lo que mide Pipecat: desde que calla la persona hasta que sale el primer audio del agente.', 'dg-small'))
    rows = [('fin de turno', 'endpointing_wait, turn_detection'), ('STT', 'transcription'),
            ('primer token y 1.ª frase', 'llm_inference, sentence_aggregation'), ('TTS', 'speech_synthesis'),
            ('la salida', 'output_transport'), ('una herramienta', 'llm_tool_call, function_handler')]
    for j, (a, k) in enumerate(rows):
        yy = 206 + j * 18
        b.append(text(40, yy, a, 'dg-tiny'))
        b.append(text(250, yy, k, 'dg-tiny dg-mono'))
    return svg(f, 770, 320, 'El presupuesto de M24 y lo que mide Pipecat',
        'Una barra apilada de 780 milisegundos con las etapas de M24: captura 30, red 25, jitter buffer 30, fin de turno 250, STT 50, primer token 150, primera frase 100, TTS 80, red de vuelta 25 y reproducción 40. Una línea marca el objetivo de 800. Debajo, una línea azul muestra que Pipecat mide desde el fin de turno en el servidor hasta la salida, y una tabla une cada etapa con las claves que usa Pipecat: endpointing_wait y turn_detection, transcription, llm_inference y sentence_aggregation, speech_synthesis, output_transport, y llm_tool_call con function_handler cuando hay una herramienta.',
        '\n'.join(b))


add(figure(_presu(), '<b>Figura IA06.8.</b> La barra es la de M24 ' + REF + '. Lo que no ve bot.py: la captura y la red de ida pasan antes de que llegue el audio, y la red de vuelta y la reproducción, después de que sale. En localhost la red es casi nada; por teléfono, no. Las claves de abajo son las de <code>LatencyBreakdown</code> en Pipecat 1.16.0 ' + DOC + '.'))
add('<p>La diferencia que vas a ver es la herramienta. Un turno en el que el modelo llama a <code>ver_disponibilidad</code> son dos llamadas al modelo, una antes y otra después de la herramienta, más lo que tarde la base: el reparto de M24 no tiene lugar para eso. Por eso la tabla del paso 7 suma las dos llamadas de un turno: para la persona fue una sola espera.</p>\n')

# ---------------- ae-interrupcion
add('<h3 id="ae-interrupcion">Interrumpir y truncar</h3>\n')
add(analogy('Alguien te lee una lista por teléfono y lo cortas a la mitad para decir "esa". Si después revisa lo que leyó en su papel, va a creer que oíste la lista entera. Tiene que tachar lo que no llegó a decir.'))
add('<p>El modelo escribe más rápido de lo que Piper habla, así que cuando la persona interrumpe, el texto de la respuesta ya está entero y el audio va por la mitad. Pipecat hace dos cosas con el <dfn data-term="barge-in">barge-in</dfn>: corta el audio que falta y, en la historia de la conversación, guarda de esa respuesta solo lo que alcanzó a sonar (<a href="' + M24 + '#interrupciones">24.9</a>). El siguiente turno del modelo ve la versión truncada, que es la verdad de lo que la persona oyó.</p>\n')


def _corte():
    f = 'fi06i'
    b = []
    rows = [('Lo que escribió el modelo', 'gpu', 690), ('Lo que sonó', 'client', 380), ('Lo que queda en la historia', 'service', 380)]
    for j, (lab, layer, w) in enumerate(rows):
        y = 30 + j * 70
        b.append(text(20, y, lab, 'dg-group'))
        b.append(f'<rect class="dg-layer" style="--c: var(--l-{layer})" x="40" y="{y + 10}" width="{w}" height="34" rx="6"/>')
        b.append(text(52, y + 32, '¿Le reservo con la doctora Ruiz el martes 1 de diciembre', 'dg-tiny'))
        if w > 400:
            b.append(text(432, y + 32, 'a las 10:30, a nombre de Ana Pérez?', 'dg-tiny'))
    b.append('<path class="dg-edge" d="M420 22 V236" style="stroke:var(--fail);stroke-dasharray:5 4"/>')
    b.append(text(428, 130, 'la persona habla aquí', 'dg-tiny', style='fill:var(--fail-text)'))
    b.append('<rect class="dg-warnbox" x="440" y="176" width="310" height="56" rx="6"/>')
    b.append(text(452, 198, 'Falta la hora. Si ahora dice "sí",', 'dg-tiny'))
    b.append(text(452, 216, 'confirmar responde: no oyó la propuesta entera.', 'dg-tiny'))
    return svg(f, 770, 250, 'Lo que se generó contra lo que sonó',
        'Tres filas. Arriba, la respuesta completa que escribió el modelo: ¿Le reservo con la doctora Ruiz el martes 1 de diciembre a las 10:30, a nombre de Ana Pérez? Una línea roja marca dónde habló la persona, después de diciembre. En la fila del medio, lo que sonó llega hasta esa línea, y abajo lo que queda en la historia es lo mismo. Una nota dice que falta la hora, y que si la persona dice sí, confirmar responde que no oyó la propuesta entera.',
        '\n'.join(b))


add(figure(_corte(), '<b>Figura IA06.9.</b> El truncado lo hace Pipecat; la decisión de qué hacer con él es tuya. Esta guía la escribe en <code>confirmar.py</code>: antes de reservar, busca en la historia la propuesta entera. Si solo sonó la mitad, no reserva, y el modelo recibe el motivo para leerla de nuevo.'))

# ---------------- ae-confirmar
add('<h3 id="ae-confirmar">Confirmar en voz alta</h3>\n')
add(analogy('El mozo que repite el pedido antes de llevarlo a la cocina. No lo hace por cortesía: es la única forma de saber que entendió "sin cebolla" y no "con cebolla".'))
add('<p>En IA01 a IA04, una persona aprobaba cada acción con un botón, después de un <code>interrupt</code>. Aquí la persona que aprueba es la que llama, y aprueba con la voz. El riesgo es doble: Whisper puede oír "martes" donde dijiste "jueves", y la persona puede decir "sí" a algo que no terminó de oír. Por eso la reserva se parte en dos herramientas y una regla:</p>\n')
add('<ol>\n<li><code>proponer_reserva</code> no reserva nada: comprueba que la hora esté libre, guarda la propuesta en la sesión y devuelve la pregunta que hay que leer, con el día, la fecha, la hora, el profesional y el nombre.</li>\n<li>El modelo la lee y espera. La persona contesta.</li>\n<li><code>confirmar</code> le pregunta a <code>puede_confirmar</code>, una función sin modelo, si en la historia sonó la propuesta entera y si lo último que dijo la persona después es un sí. Solo entonces inserta, con una clave que sale de la sesión y de la propuesta.</li>\n</ol>\n')
add(figure(ficha('fi06f', 'la confirmación',
    'La historia de la conversación, con lo que sonó, y la propuesta guardada en la sesión.',
    'Busca la propuesta entera en lo que dijo el agente y mira si lo siguiente que dijo la persona es un sí sin ningún no.',
    'Permiso para reservar, o el motivo por el que no, que vuelve al modelo.',
    ['agente: «¿Le reservo con la doctora Ruiz el martes 1 de diciembre»   (cortado)',
     'persona: «Sí»',
     'puede_confirmar -> (False, "La persona no oyó la propuesta entera. Léela de nuevo…")'],
    'Un sí a medias reserva otra hora, y un modelo que se apura reserva sin que nadie diga nada: el prompt pide esperar, pero no lo garantiza.',
    'voz/confirmar.py (paso 3), llamada desde confirmar en voz/herramientas.py (paso 4).'),
    '<b>Figura IA06.10.</b> La ficha de la regla. Es la misma idea que el <code>interrupt</code> de las guías anteriores: lo que decide si una acción se hace está en el código y no en lo que el modelo diga.'))

# ---------------- ae-exclusion
add('<h3 id="ae-exclusion">Dos citas no se pisan</h3>\n')
add(analogy('Un estacionamiento con cajones pintados. El cartel "no estacione encima de otro auto" depende de que todos lo lean; los cajones pintados con un poste en cada uno no dejan meter dos autos aunque el conductor no lea nada.'))
add('<p>Dos personas llaman a la vez y piden el martes a las 12:00. Las dos consultan, las dos ven la hora libre, las dos dicen que sí. Si el código hace "si está libre, inserto", las dos insertan: entre que una mira y escribe, la otra también miró. Es la carrera de leer y escribir de <a href="' + M05 + '#transacciones">5.6</a>, y la cierra la base, no el código.</p>\n')
add('<p>Una <dfn data-term="exclusion-constraint">restricción de exclusión</dfn> es la generalización de <code>UNIQUE</code>: en lugar de rechazar dos filas con el mismo valor, rechaza dos filas para las que una lista de comparaciones da verdadero a la vez. Aquí: el mismo profesional (<code>=</code>) y franjas que se pisan (<code>&amp;&amp;</code>, el operador de solapamiento de rangos). Las franjas son <code>tstzrange</code>, un rango de dos instantes con zona horaria, cerrado al inicio y abierto al final: <code>[10:00, 10:30)</code> no se pisa con <code>[10:30, 11:00)</code>. La restricción necesita un índice GiST, y GiST no sabe comparar texto con <code>=</code> hasta que se instala la extensión <code>btree_gist</code>, que viene con PostgreSQL ' + DOC + '.</p>\n')


def _excl():
    f = 'fi06x'
    b = [text(20, 24, 'Franjas de la doctora Ruiz y del doctor Paz, el martes', 'dg-group')]
    x0, esc = 120, 600 / 120   # 9:30 a 11:30, 120 min
    b.append('<path class="sim-axis" d="M120 196 H720"/>')
    for k in range(5):
        x = x0 + k * 30 * esc
        b.append(f'<path class="sim-grid" d="M{x:.0f} 40 V196"/>')
        b.append(text(x, 212, f'{9 + (30 + 30 * k) // 60}:{(30 + 30 * k) % 60:02d}', 'dg-tiny', 'middle'))
    def fr(desde, hasta, y, lab, cls, nota):
        xa, xb = x0 + desde * esc, x0 + hasta * esc
        s = f'<rect class="{cls}" x="{xa:.0f}" y="{y}" width="{xb - xa:.0f}" height="26" rx="5"/>' + text((xa + xb) / 2, y + 17, lab, 'dg-tiny', 'middle')
        return s + text(xb + 10, y + 17, nota, 'dg-tiny')
    b.append(text(20, 62, 'ruiz', 'dg-small'))
    b.append(fr(30, 60, 46, 'Ana, activa', 'dg-ok', ''))
    b.append(text(20, 98, 'ruiz', 'dg-small'))
    b.append(fr(45, 75, 82, 'nueva 10:15', 'dg-bad', 'se pisa: 23P01'))
    b.append(text(20, 134, 'ruiz', 'dg-small'))
    b.append(fr(60, 90, 118, 'nueva 10:30', 'dg-ok', 'empieza donde la otra termina'))
    b.append(text(20, 170, 'paz', 'dg-small'))
    b.append(fr(30, 60, 154, 'nueva 10:00', 'dg-ok', 'otro profesional'))
    return svg(f, 770, 226, 'Qué rechaza la restricción de exclusión',
        'Una línea de tiempo de 9:30 a 11:30. La doctora Ruiz tiene una cita activa de Ana de 10:00 a 10:30. Una cita nueva de Ruiz de 10:15 a 10:45 se pisa con ella y PostgreSQL la rechaza con el error 23P01. Una nueva de Ruiz de 10:30 a 11:00 empieza donde la otra termina y se acepta, porque el rango es abierto al final. Una nueva del doctor Paz de 10:00 a 10:30 se acepta porque es otro profesional.',
        '\n'.join(b))


add(figure(_excl(), '<b>Figura IA06.11.</b> La regla en SQL es una línea: <code>EXCLUDE USING gist (profesional WITH =, franja WITH &amp;&amp;) WHERE (estado = \'activa\')</code>. El <code>WHERE</code> hace que una cita cancelada deje de contar, así que su hora vuelve a estar libre sin borrar la fila. Cuando dos inserciones llegan a la vez, la segunda espera a que la primera termine y recién entonces falla.'))
add(callout('def', 'Definición', '<p class="def-term">Restricción de exclusión <span class="def-en">exclusion constraint</span></p><p class="def-one">Una regla de la tabla que rechaza una fila si existe otra para la que todas las comparaciones indicadas dan verdadero.</p><dl class="def-rows"><dt>Intuición</dt><dd><code>UNIQUE</code> compara con <code>=</code>; esta puede comparar con <code>&amp;&amp;</code>, con <code>=</code> o con las dos.</dd><dt>Ejemplo</dt><dd>Ningún profesional con dos citas activas cuyas franjas se pisen.</dd><dt>Por qué importa en producción</dt><dd>Es la única forma de cerrar la carrera de dos reservas sin un lock en el código: la base la impide aunque haya veinte procesos insertando.</dd></dl>'))

# ------------------------------------------------------------------ endpoints
add('<h2 id="endpoints">Los endpoints</h2>\n')
add('<p>No escribes ninguna API. Los tres endpoints los pone el runner de Pipecat cuando corres <code>uv run bot.py</code>, en <code>localhost:7860</code>; los ves para saber qué pasa cuando abres la página y qué mirar si no conecta. Están en el código de Pipecat 1.16.0 ' + DOC + '.</p>\n')


def ep(m, path, desc, req, resp, codes, lang='json'):
    lis = '\n'.join(f'      <li><span class="st st--{c[0]}xx">{c}</span><span>{t}</span></li>' for c, t in codes)
    return ('<div class="endpoint">\n  <div class="ep-head">\n'
            f'    <span class="ep-method" data-m="{m}">{m}</span>\n    <code class="ep-path">{path}</code>\n    {DOC}\n  </div>\n'
            f'  <p class="ep-desc">{desc}</p>\n  <div class="ep-body">\n    <p class="ep-sec">Request</p>\n'
            + code('http', req) + '    <p class="ep-sec">Respuesta</p>\n' + code(lang, resp)
            + f'    <p class="ep-sec">Códigos de respuesta</p>\n    <ul class="ep-responses">\n{lis}\n    </ul>\n  </div>\n</div>\n')


add(ep('GET', '/client/', 'La página del teléfono: un cliente de Pipecat ya hecho, con un botón para conectar y la transcripción en pantalla. <code>GET /</code> redirige aquí.',
       'GET /client/ HTTP/1.1\nHost: localhost:7860', '<!doctype html> … la aplicación del cliente', [('200', 'La página.'), ('307', 'Si pides <code>/</code>: te manda a <code>/client/</code>.')], lang='html'))
add(ep('POST', '/api/offer', 'La oferta SDP del navegador. Responde con la de bot.py y, en segundo plano, arranca <code>bot(runner_args)</code> para esa conexión: una sesión nueva por cada vez que tocas conectar.',
       'POST /api/offer HTTP/1.1\nHost: localhost:7860\nContent-Type: application/json\n\n{"sdp": "v=0\\r\\no=- … (la descripción del navegador)", "type": "offer"}',
       '{"sdp": "v=0\\r\\no=- … (la de bot.py)", "type": "answer", "pc_id": "…"}',
       [('200', 'La respuesta SDP; desde ahí el audio va por UDP.'), ('422', 'El cuerpo no trae <code>sdp</code> o <code>type</code>: lo rechaza FastAPI antes de llegar a Pipecat.')]))
add(ep('PATCH', '/api/offer', 'Candidatos ICE que el navegador descubre después de la oferta: otras direcciones por las que puede llegar el audio. En localhost casi nunca hace falta.',
       'PATCH /api/offer HTTP/1.1\nContent-Type: application/json\n\n{"pc_id": "…", "candidates": [ … ]}', '{"status": "success"}', [('200', 'Anotados.')]))

# ------------------------------------------------------------------ dependencias
add('<h2 id="dependencias">Las dependencias</h2>\n')
add(Walk('toml', 'pyproject.toml', 'Declara el proyecto, sus dependencias con la versión fija, los dos comandos y dónde están las pruebas.',
         '<code>uv sync</code>, que instala todo en <code>.venv</code>.', 'Nada.', 'El entorno, y los comandos <code>voz-latencias</code> y <code>voz-evals</code>.', 'vad stt llm tts',
         ['Pide Python 3.13.', 'Fija Pipecat con cinco extras, el driver de PostgreSQL, las zonas horarias y LangChain para los evals.', 'Declara pytest como dependencia de desarrollo y los dos comandos.'])
    .from_file(rd('pyproject.toml'), [
        ('[project]', [('"pipecat-ai[', 'Un paquete y cinco extras. <code>anthropic</code> trae el cliente de Claude; <code>webrtc</code>, aiortc, el WebRTC de Python; <code>runner</code>, FastAPI, uvicorn y la página del cliente; <code>whisper</code>, faster-whisper; <code>piper</code>, piper-tts. Silero y Ollama no piden extra: el modelo de Silero viene dentro del paquete y Ollama se habla con el cliente de OpenAI, que Pipecat ya trae.'),
                       ('"tzdata==', 'Python lee las zonas horarias del sistema. Linux y macOS las traen; Windows no, y <code>ZoneInfo("America/Mexico_City")</code> fallaría sin este paquete.'),
                       ('"langchain==', 'LangChain no lo usa el bot: solo los evals en texto, con las mismas versiones de IA05.')]),
        ('[dependency-groups]', [('[project.scripts]', 'Dos comandos: el resumen de latencias y los evals. <code>bot.py</code> no es un comando: el runner de Pipecat lo busca como archivo.')]),
    ]).html())
add(table(['Paquete', 'Versión', 'Para qué'], [
    ['<code>pipecat-ai</code>', '1.16.0', 'La tubería, el VAD, los servicios y el runner. Licencia BSD-2-Clause ' + DOC],
    ['<code>faster-whisper</code> (por el extra)', '1.2.x', 'Whisper en la CPU o en la GPU, con CTranslate2'],
    ['<code>piper-tts</code> (por el extra)', 'la que fija el extra', 'La voz, con el modelo ONNX de cada voz'],
    ['<code>psycopg[binary]</code>', '3.3.6', 'PostgreSQL, sin compilar nada'],
    ['<code>tzdata</code>', '2026.6', 'Las zonas horarias en Windows'],
    ['<code>langchain</code>, <code>langchain-anthropic</code>, <code>langchain-ollama</code>', '1.4.3, 1.7.5, 1.1.0', 'Los evals en texto'],
    ['<code>pytest</code>', '9.1.1', 'Las pruebas'],
]))
add(errs([
    ('error: Distribution `pipecat-ai==1.16.0` can\'t be installed because it doesn\'t have a source distribution or wheel for the current platform', 'Casi siempre es otra versión de Python. Comprueba con <code>uv python list</code> y fija 3.13 con <code>uv python pin 3.13</code>.'),
    ('ZoneInfoNotFoundError: \'No time zone found with key America/Mexico_City\'', 'Falta <code>tzdata</code> en Windows: vuelve a correr <code>uv sync</code> con el <code>pyproject.toml</code> de arriba.'),
]))

# ------------------------------------------------------------------ infraestructura
add('<h2 id="infraestructura">La infraestructura</h2>\n')
add('<p>Solo la agenda corre en Docker. La voz necesita el micrófono, los parlantes y, si la tienes, la GPU de tu máquina: meterla en un contenedor complica las tres cosas sin ganar nada en un laboratorio.</p>\n')
add('<p>Arma la carpeta del proyecto así antes de seguir. Los archivos se escriben en el paso a paso, en este orden.</p>\n')
add(code('text', 'ia06-voz/\n├── pyproject.toml\n├── .env.example         → cópialo a .env\n├── compose.yaml\n├── db/init.sql\n├── bot.py               paso 6\n├── caos.py              cómo comprobar\n├── voz/\n│   ├── __init__.py\n│   ├── config.py        paso 1\n│   ├── fechas.py        paso 1\n│   ├── agenda.py        paso 2\n│   ├── confirmar.py     paso 3\n│   ├── herramientas.py  paso 4\n│   ├── prompt.py        paso 5\n│   ├── modelos.py       paso 5\n│   └── latencia.py      paso 7\n├── evals/\n│   ├── __init__.py\n│   ├── charla.py        paso 8\n│   └── dialogos.py      paso 8\n└── tests/\n    ├── falsos.py\n    └── test_*.py        cómo comprobar'))
add(whole('yaml', 'compose.yaml', rd('compose.yaml'), 'Levanta PostgreSQL 17 con la base <code>consultorio</code>, y corre <code>init.sql</code> la primera vez.', '<code>docker compose up -d</code>.', 'Nada.', 'Un PostgreSQL en <code>127.0.0.1:55438</code>.', 'base'))
add('<p>La imagen oficial de PostgreSQL ya trae <code>btree_gist</code> entre sus extensiones: no hace falta una imagen especial. <code>init.sql</code> corre solo cuando el volumen está vacío. Si lo cambias después de levantar la base, bórrala con <code>docker compose down -v</code> para que vuelva a correr.</p>\n')
add(Walk('sql', 'db/init.sql', 'Crea la extensión, las dos tablas con sus reglas, el rol del agente con sus permisos y los dos profesionales.',
         'PostgreSQL, una sola vez, al crear el volumen.', 'Nada.', 'La agenda vacía y el rol <code>agenda_bot</code>.', 'base',
         ['Instala <code>btree_gist</code>.', 'Crea <code>profesionales</code> y <code>citas</code>, con la franja de 30 minutos, la clave única y la restricción de exclusión.', 'Crea el rol del agente: lee, agrega y cambia solo el estado.', 'Carga los dos profesionales.'])
    .from_file(rd('db/init.sql'), [
        ('-- La agenda del consultorio', [('CREATE EXTENSION', 'Sin esta línea, el <code>EXCLUDE</code> de abajo falla con <code>data type text has no default operator class for access method "gist"</code>: GiST no sabe comparar texto con <code>=</code>.')]),
        ('CREATE TABLE citas (', [('franja      tstzrange', 'Un rango de instantes con zona horaria. Se guarda en UTC y se muestra en la zona de la sesión: <code>[2026-12-01 16:30+00, 2026-12-01 17:00+00)</code> son las 10:30 de Ciudad de México.'),
                                   ('clave       text NOT NULL UNIQUE', 'La clave de idempotencia. <code>UNIQUE</code> la indexa, y <code>ON CONFLICT (clave)</code> la usa para no insertar dos veces.'),
                                   ('CHECK (upper(franja)', 'Todas las citas miden 30 minutos. Una franja de una hora la rechaza la base, aunque el código tenga un bug.'),
                                   ('CONSTRAINT sin_choque', 'La restricción de exclusión de <a href="#ae-exclusion">la figura IA06.11</a>. <code>WHERE (estado = \'activa\')</code>: las canceladas no cuentan.')]),
        ('-- El rol con el que entra el agente', [('GRANT SELECT, INSERT ON citas', 'Leer y agregar. Ni <code>DELETE</code> ni <code>UPDATE</code> de la tabla entera.'),
                                                 ('GRANT UPDATE (estado)', 'Un permiso por columna: puede cambiar el estado y nada más. Mover una cita de hora es cancelarla y reservar otra, y las dos cosas pasan por la confirmación.'),
                                                 ('GRANT USAGE ON SEQUENCE', 'Para que <code>bigserial</code> le dé el siguiente id al insertar.')]),
        ('INSERT INTO profesionales', [('(\'ruiz\'', 'Los mismos ids y nombres que <code>PROFESIONALES</code> en <code>config.py</code>. El nombre es como lo dice el agente en voz alta.')]),
    ]).html())
add('<h3 id="infra-roles">Quién puede qué</h3>\n')
add(table(['Rol', 'Quién lo usa', 'profesionales', 'citas'], [
    ['<code>agenda_bot</code>', '<code>bot.py</code>, los evals y <code>caos.py</code> para reservar', 'SELECT', 'SELECT, INSERT, UPDATE del estado'],
    ['<code>postgres</code>', 'Solo para vaciar la tabla: los evals antes de cada caso, <code>caos.py vaciar</code> y las pruebas', 'Todo', 'Todo'],
]))
add(whole('bash', '.env.example', rd('.env.example'), 'Las variables que puedes cambiar, con sus valores por defecto.', 'Tú: lo copias a <code>.env</code>.', 'Nada.', 'La configuración que lee <code>config.py</code>.', 'llm stt tts'))
add(try_('cp .env.example .env\ndocker compose up -d\ndocker compose exec postgres psql -U postgres -d consultorio -c "\\d citas"',
         'La tabla con sus siete columnas y, abajo, los índices: <code>citas_pkey</code>, <code>citas_clave_key</code> y <code>sin_choque</code>, este último como <code>EXCLUDE USING gist (profesional WITH =, franja WITH &amp;&amp;) WHERE (estado = \'activa\'::text)</code>.'))
