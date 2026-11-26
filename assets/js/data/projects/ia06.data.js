/* Decisiones guiadas de IA06 (Un agente de voz). Formato en core/exercise.js. */

SD.defineExercise('ia06-voz', {
  "title": "la línea de voz de un consultorio",
  "scenario": "<p>Un consultorio tiene una recepcionista que pierde llamadas cuando atiende a alguien. Casi todas son \"quiero una cita\", \"quiero cambiarla\" o \"quiero cancelar\". Quiere una línea que las conteste con voz, agende en una base de datos y no cometa errores caros: ni citas duplicadas ni citas a nombre de quien no las pidió. El objetivo de respuesta es unos 800 ms desde que la persona deja de hablar.</p>",
  "steps": [
    {
      "id": "cascada-o-s2s",
      "type": "single",
      "prompt": "¿Cómo se arma la voz del agente?",
      "options": [
        "Un modelo speech-to-speech de punta a punta, porque baja la latencia y no hace falta transcribir nada.",
        "Una cascada de VAD, STT, modelo de texto y TTS, con el texto entre etapas para poder leerlo, confirmarlo y medirlo.",
        "Una cascada con el STT y el TTS en la nube, porque siempre son más rápidos que cualquier opción local.",
        "Un modelo de texto al que se le manda el audio codificado dentro del prompt y que devuelve la respuesta hablada."
      ],
      "answer": 1,
      "explain": "Lo que hace falta aquí (confirmar en voz alta, leer una fecha, registrar qué se entendió, medir cada etapa) necesita texto entre las etapas. El speech-to-speech baja la latencia pero esconde justo eso. Que la nube sea siempre más rápida no es cierto: depende de la red y de tu GPU, y se mide. Un modelo de texto no recibe ni produce audio por el prompt. Ver M24, 24.2."
    },
    {
      "id": "fin-de-turno",
      "type": "single",
      "prompt": "Nadie dice \"terminé\". ¿Cómo decide el agente que ya puede contestar?",
      "options": [
        "Un silencio del VAD de unos 0.5 s, configurable, y se mide cuánto corta a la persona y cuánto la hace esperar.",
        "Cuando el STT entrega una frase que termina en punto, porque eso indica que la oración está completa.",
        "Un silencio largo de 2 s, para no cortar nunca a nadie aunque dicte un número de teléfono con pausas.",
        "Cuando el modelo responde que la persona ya terminó, mandándole cada trozo de audio para que lo juzgue."
      ],
      "answer": 0,
      "explain": "El VAD solo cuenta silencio, y ese tiempo es un compromiso: más corto, contesta antes pero corta cuando respiras; más largo, todas las respuestas llegan tarde. Se fija con un valor y se ajusta midiendo. Los puntos del STT no son una señal confiable, 2 s se comen casi todo el presupuesto, y mandar audio al modelo en cada trozo sería carísimo y lento. Ver M24, 24.6."
    },
    {
      "id": "truncar",
      "type": "single",
      "prompt": "La persona interrumpe a mitad de una frase de cinco que el modelo ya había generado entera. ¿Qué queda en el historial?",
      "options": [
        "La frase completa, porque es lo que el modelo generó y el historial es el registro de lo generado.",
        "Nada: el turno interrumpido se descarta entero para que el modelo no trabaje con una respuesta a medias.",
        "Solo lo que sonó, con una marca de corte, para que el modelo sepa lo que la persona alcanzó a oír.",
        "La frase completa más una nota que avisa que la persona interrumpió en algún punto de la respuesta."
      ],
      "answer": 2,
      "explain": "El modelo escribe más rápido de lo que se habla. Si el historial guarda más de lo que sonó, el modelo cree que la persona oyó las cinco partes y la conversación deja de coincidir. Descartar el turno entero también miente: la persona sí oyó el principio. La nota sin la frase cortada no dice dónde fue el corte. Ver M24, 24.9."
    },
    {
      "id": "confirmar",
      "type": "single",
      "prompt": "\"Confirma en voz alta antes de reservar\". ¿Dónde se impone con garantía que no se reserve con algo inventado?",
      "options": [
        "En el prompt, con una instrucción clara y un ejemplo, porque los modelos actuales la siguen casi siempre.",
        "En el servicio de la agenda: la reserva se hace en dos pasos y el segundo exige una ficha que el servicio entregó y que vence.",
        "En un segundo modelo que revisa lo que respondió el primero y decide si la reserva puede avanzar.",
        "En un trigger de la base que rechaza el INSERT hasta que otra tabla tenga el texto de la confirmación guardado."
      ],
      "answer": 1,
      "explain": "Un prompt es una petición y \"casi siempre\" no alcanza cuando la acción cambia una agenda. Un segundo modelo repite el problema con otro modelo. Un trigger no sabe qué dijo la persona. Detectar un \"sí\" en el código del agente depende del STT y del modelo; en cambio, el servicio sí puede exigir una ficha que él mismo entregó, que no haya vencido y que el horario siga libre. Eso es lo que impide una reserva inventada. Ver IA03 y el paso 2."
    },
    {
      "id": "doble-reserva",
      "type": "single",
      "prompt": "Dos llamadas piden el mismo horario en el mismo instante. ¿Qué lo impide con seguridad?",
      "options": [
        "Un SELECT de los horarios libres y, si el pedido está libre, un INSERT, dentro de la misma función.",
        "Un diccionario en la memoria de la API con los horarios que se están reservando en este momento.",
        "Una restricción de exclusión de la base sobre el profesional y el rango de tiempo de cada cita activa.",
        "Pedirle al modelo que vuelva a consultar la disponibilidad justo antes de llamar a la herramienta."
      ],
      "answer": 2,
      "explain": "Entre el SELECT y el INSERT hay un hueco por donde pasan las dos llamadas. El diccionario en memoria funciona con un solo proceso y deja de funcionar con dos. Volver a consultar achica el hueco pero no lo cierra. La base decide dentro de la transacción y es la única que ve las dos. Ver A28, M39 y el paso 1 de esta guía."
    },
    {
      "id": "stt-local-o-api",
      "type": "single",
      "prompt": "¿Whisper en tu máquina o una API de STT en la nube?",
      "options": [
        "Local: la voz no sale de la máquina y no hay red en cada turno, y se mide si la GPU alcanza para el presupuesto.",
        "La API de la nube siempre, porque su latencia es menor que la de cualquier máquina de escritorio.",
        "Local con el modelo más grande aunque corra en CPU, porque la precisión importa más que la espera.",
        "La API de la nube, porque lo que dice la gente al pedir una cita ya es un dato que el proveedor trata con cuidado."
      ],
      "answer": 0,
      "explain": "Es una decisión de privacidad y de latencia a la vez: lo local quita la red del camino y no manda voces de pacientes a un tercero, a cambio de que tu máquina tiene que dar el presupuesto, y eso se mide con tu informe. \"Siempre más rápida\" y \"cuidado del proveedor\" son suposiciones que no sostienen ninguna decisión, y un modelo grande en CPU puede tardar segundos por turno."
    },
    {
      "id": "presupuesto",
      "type": "single",
      "prompt": "Medido, el total es de 1 400 ms y el objetivo es 800. ¿Qué haces primero?",
      "options": [
        "Cambiar a un modelo más grande, porque el modelo es la etapa más cara de la cascada completa.",
        "Bajar el silencio del VAD a 0.1 s, porque es el cambio más fácil y baja la espera de golpe.",
        "Mirar la tabla por etapa, atacar la que más pesa y medir de nuevo cambiando una sola cosa por vez.",
        "Pasar todo a speech-to-speech, porque quita dos etapas y la suma tiene que bajar sí o sí."
      ],
      "answer": 2,
      "explain": "Sin la tabla por etapa estás adivinando. Un modelo más grande suele subir la latencia, no bajarla. Un silencio de 0.1 s corta a la gente a mitad de una frase: baja el total y rompe la llamada. Cambiar de arquitectura es el último recurso, no el primero. Ver M24, 24.8."
    },
    {
      "id": "que-medir",
      "type": "single",
      "prompt": "Tienes los tiempos de 200 turnos. ¿Qué reportas de la latencia?",
      "options": [
        "El promedio de todos los turnos, porque usa todos los datos y es el número más fácil de comparar.",
        "El mejor turno, que muestra lo que el sistema puede dar cuando todo sale bien.",
        "El TTFB del modelo, porque es la etapa que más varía y las demás son casi constantes.",
        "La mediana y el p95 por etapa, y cuántas llamadas pasan del límite que tú mismo toleras."
      ],
      "answer": 3,
      "explain": "Un promedio mezcla los turnos buenos con los malos y esconde a quien tuvo una espera de tres segundos. El mejor turno no es lo que vive una persona. El TTFB del modelo es solo una etapa, y suponer que las demás no varían es lo que la tabla por etapa desmiente. La mediana dice lo típico; el p95, lo peor que le pasa a una de cada veinte llamadas."
    }
  ],
  "solution": "<ul><li>Cascada, no speech-to-speech: el texto entre etapas es donde confirmas, lees una fecha y mides.</li><li>El fin de turno es un compromiso medido, no un valor mágico.</li><li>Al interrumpir, el historial guarda lo que sonó y marca el corte.</li><li>La compuerta de la confirmación es el servicio, con una ficha que vence; el prompt guía la conversación y la doble reserva la impide la base.</li><li>STT local por privacidad y por quitar la red del camino, si tu GPU lo permite.</li><li>Ante un presupuesto roto, la tabla por etapa manda, con un cambio por vez.</li><li>La latencia se reporta como mediana y p95 por etapa.</li></ul>"
});

/* «Predice la salida» de cada paso (kind: 'predict'). Se responden antes de correr el comando del paso. */

SD.defineExercise('ia06-p-entorno', {
  "kind": "predict",
  "title": "los permisos del rol",
  "scenario": "<p><code>init.sql</code> da a <code>agenda_app</code> <code>SELECT, INSERT</code> sobre <code>citas</code> y <code>UPDATE (estado, vence_en)</code>. Con ese rol corres <code>DELETE FROM citas;</code>.</p>",
  "steps": [
    {
      "id": "borrar",
      "type": "single",
      "prompt": "¿Qué responde PostgreSQL?",
      "options": [
        "Borra todas las filas y dice DELETE con la cuenta",
        "ERROR: permission denied for table citas",
        "Borra solo las citas que están canceladas",
        "No hace nada y dice DELETE 0"
      ],
      "fixed": true,
      "answer": 1,
      "explain": "No tiene el privilegio <code>DELETE</code> sobre la tabla: no se le dio, y en PostgreSQL lo que no se da no existe. El error llega antes de mirar una sola fila."
    }
  ]
});

SD.defineExercise('ia06-p-agenda', {
  "kind": "predict",
  "title": "las franjas de un día",
  "scenario": "<p><code>horarios.py</code> define dos tramos, de 09:00 a 13:00 y de 15:00 a 18:00, con citas de 30 minutos. Pides <code>franjas</code> de un miércoles.</p>",
  "steps": [
    {
      "id": "cuantas",
      "type": "single",
      "prompt": "¿Cuántos inicios devuelve?",
      "options": [
        "12",
        "13",
        "14",
        "16"
      ],
      "fixed": true,
      "answer": 2,
      "explain": "El primer tramo son 4 horas, 8 citas de 30 minutos; el segundo, 3 horas, 6 citas. 8 + 6 = 14. El último inicio es 17:30, porque debe terminar a las 18:00."
    }
  ]
});

SD.defineExercise('ia06-p-reglas', {
  "kind": "predict",
  "title": "una hora dicha en voz alta",
  "scenario": "<p><code>como_se_dice</code> pasa la hora a formato de 12 horas con <code>d.hour % 12 or 12</code> y elige \"de la mañana\" si la hora es menor que 12.</p>",
  "steps": [
    {
      "id": "doce",
      "type": "single",
      "prompt": "¿Qué dice <code>como_se_dice(\"2026-12-02T12:00:00-06:00\")</code> al final de la frase, después del día y el mes?",
      "options": [
        "a las 12 en punto de la tarde",
        "a las 0 en punto de la mañana",
        "a las 12 en punto de la mañana",
        "a las 24 en punto de la tarde"
      ],
      "fixed": true,
      "answer": 0,
      "explain": "<code>12 % 12</code> es 0 y <code>0 or 12</code> da 12. Como <code>d.hour</code> es 12, no es menor que 12, así que la parte del día es \"de la tarde\". La función dice \"a las 12 en punto de la tarde\": para el mediodía conviene agregar un caso que diga \"del mediodía\", y puedes agregarlo a la prueba."
    }
  ]
});

SD.defineExercise('ia06-p-nucleo', {
  "kind": "predict",
  "title": "un modelo que inventa la ficha",
  "scenario": "<p>El modelo llama a <code>confirmar_reserva</code> con <code>token=\"ficha-inventada-123\"</code> sin haber llamado antes a <code>proponer_reserva</code>.</p>",
  "steps": [
    {
      "id": "citas",
      "type": "single",
      "prompt": "¿Qué devuelve la agenda y cuántas citas quedan?",
      "options": [
        "Devuelve <code>no_existe</code> y quedan 0 citas",
        "Reserva la cita más cercana y queda 1",
        "Devuelve <code>vencida</code> y queda 1 retenida",
        "Lanza una excepción que rompe la tubería"
      ],
      "fixed": true,
      "answer": 0,
      "explain": "La ficha no está entre las retenciones (en la API real, no está en la tabla <code>tokens</code>): el servicio responde <code>no_existe</code> (404). El núcleo lo devuelve como un diccionario con <code>error</code> y el modelo lo oye como cualquier resultado. Nada se reserva."
    }
  ]
});

SD.defineExercise('ia06-p-texto', {
  "kind": "predict",
  "title": "dos conexiones a la vez",
  "scenario": "<p><code>test_dos_conexiones_a_la_vez_dejan_una_sola_cita</code> lanza dos hilos que esperan en una barrera y después hacen un <code>INSERT</code> del mismo horario, cada uno con su conexión y en autocommit.</p>",
  "steps": [
    {
      "id": "resultados",
      "type": "single",
      "prompt": "¿Qué lista de resultados, ordenada, esperas?",
      "options": [
        "[\"ok\", \"ok\"]",
        "[\"choque\", \"ok\"]",
        "[\"choque\", \"choque\"]",
        "Un deadlock que cuelga la prueba"
      ],
      "fixed": true,
      "answer": 1,
      "explain": "La restricción de exclusión hace que el segundo <code>INSERT</code> espere el resultado del primero; cuando este confirma, el segundo ve el solape y lanza <code>ExclusionViolation</code>. Uno entra y el otro choca, siempre. No hay deadlock: es una sola fila en juego."
    }
  ]
});

SD.defineExercise('ia06-p-evals', {
  "kind": "predict",
  "title": "tres repeticiones",
  "scenario": "<p>Un caso se corrió tres veces con el mismo modelo. Resultados: salió bien, mal y bien.</p>",
  "steps": [
    {
      "id": "metricas",
      "type": "single",
      "prompt": "¿Cuánto valen pass@3 y pass^3 para ese caso?",
      "options": [
        "pass@3 verdadero y pass^3 falso",
        "Los dos verdaderos",
        "Los dos falsos",
        "pass@3 falso y pass^3 verdadero"
      ],
      "fixed": true,
      "answer": 0,
      "explain": "pass@3 pide que alguna de las tres salga bien, y salió. pass^3 pide que salgan bien las tres, y una falló. La diferencia entre las dos es la fiabilidad: una línea que atiende gente necesita la segunda."
    }
  ]
});

SD.defineExercise('ia06-p-voz', {
  "kind": "predict",
  "title": "un procesador que no empuja",
  "scenario": "<p>En <code>Oreja.process_frame</code> borras la última línea, <code>await self.push_frame(frame, direction)</code>.</p>",
  "steps": [
    {
      "id": "mudo",
      "type": "single",
      "prompt": "¿Qué pasa con la llamada?",
      "options": [
        "Sigue igual, solo se pierden las marcas",
        "Se queda muda: ningún frame llega a la pieza siguiente",
        "Pipecat lanza un error al arrancar",
        "Los frames se reenvían solos al terminar el turno"
      ],
      "fixed": true,
      "answer": 1,
      "explain": "Cada pieza de la tubería recibe un frame y decide qué empujar. Sin <code>push_frame</code>, el frame muere ahí: el audio, el texto o las marcas no avanzan. Nadie avisa; la llamada simplemente no responde."
    }
  ]
});

SD.defineExercise('ia06-p-medir', {
  "kind": "predict",
  "title": "un silencio más largo",
  "scenario": "<p><code>informe.py</code> calcula <code>total = habla − calla + parada_ms</code>. Cambias <code>VOZ_PARADA</code> de 0.5 a 1.0 y todo lo demás queda igual.</p>",
  "steps": [
    {
      "id": "sube",
      "type": "single",
      "prompt": "¿Cuánto sube el <code>total</code> de un turno, aproximadamente?",
      "options": [
        "Nada: la espera pasa antes de la marca calla",
        "Unos 500 ms",
        "Unos 1 000 ms",
        "Unos 50 ms"
      ],
      "fixed": true,
      "answer": 1,
      "explain": "El silencio que espera el VAD ocurre antes de que se marque <code>calla</code>, y el informe lo suma aparte con <code>parada_ms</code>: de 500 a 1 000 son 500 ms más en cada respuesta, aunque ninguna etapa cambie."
    }
  ]
});
