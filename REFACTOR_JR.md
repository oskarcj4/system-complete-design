# Refactor a nivel Jr de la Parte II

Registro de las secciones de la Parte II (M12–M26) que ya se volvieron amigables para un lector Jr. **Lo que está marcado como hecho no se vuelve a tocar.**

## El pedido (2026-10-25)

> "Asume un nivel Jr en toda la parte II. De hecho, quiero una refactorización, dado que muchas secciones, a excepción de la cuantización, algunas de M20, y M17 y M12 han quedado claras, muchas me han dado demasiada dificultad, quizás podrías hacerlas más amigables, lleva un registro de aquellas que has hecho amigables de ahora en adelante en un .md, aquellas que ya han sido cambiadas ya no se tocan."

Y sobre M21: el panel junto al mapa tiene que explicar qué está pasando y qué escenario se recorre; las descripciones de cada paso eran poco comprensibles, y los bloques de arquitectura no explicaban el porqué de cada pieza ("¿por qué Kafka, para qué?").

## Qué significa "amigable" aquí

- **El porqué antes que el qué.** Cada pieza de arquitectura dice qué pasaría sin ella. Cada paso de un escenario dice qué pasa en palabras simples y, aparte, por qué se hace así.
- **Sin jerga sin definir.** Los términos (spool, offset, marca de agua, ledger, failover…) se explican en la misma frase la primera vez, o se enlazan al módulo que los explica.
- **Una analogía por concepto abstracto** (`callout--analogy`).
- **Diagramas primero:** si una decisión se puede dibujar como "sin esto / con esto", se dibuja.
- **Mapas:** `stepPanel: true` y `pieces: true`, `why` en cada nodo, `goal` en cada escenario y `why` en los pasos que toman una decisión (ver `CLAUDE.md`, "Mapa explorable").
- No se cambian quizzes, glosario ni `course.data.js` salvo que haga falta para un término nuevo.

## Fuera del refactor (el usuario las dio por claras)

- M12 (LLM por dentro) completo.
- M14 (cuantización) completo.
- M17 (API y streaming) completo.
- M20: 20.4 (un turno), 20.5 (archivos y RAG), 20.6 (herramientas y sandbox), 20.7 (memoria) y 20.8 (moderación). Respuesta del usuario del 2026-10-26.

## Hecho

| Fecha | Módulo | Sección o pieza | Qué cambió |
|---|---|---|---|
| 2026-10-25 | M21 | Mapa `m21-metering` (`#mapa`) | `stepPanel` y `pieces`; el panel muestra el mapa y "Escenario N de M", "Qué vas a ver" de cada escenario y "De qué trata el mapa". Los 9 escenarios reescritos paso por paso en palabras simples, con "Por qué así" en los pasos que deciden algo, y sin pasos con título vacío. Los 19 nodos con `brief` y "Por qué existe" (Kafka explica las tres razones: amortigua, varios lectores, se puede releer). |
| 2026-10-25 | M21 | 21.2 `#arquitectura` | Intro en palabras simples, analogía del restaurante, la tabla de planos con "Qué hace" y "Qué pasaría sin ella", la subsección nueva `#por-que-kafka` con la figura 21.1b (sin cola contra con Kafka) y el párrafo del camino rápido y aproximado contra el lento y exacto. El texto de `#mapa` explica cómo leer el mapa. |

| 2026-10-26 | M21 | 21.1, 21.3 a 21.15 | "En simple" al inicio de cada sección (14). |
| 2026-10-26 | M12.1 | 12.1.1 a 12.1.11 | "En simple" en las 11 secciones. |
| 2026-10-26 | M13 | 13.1 a 13.6 | "En simple" en las 6 secciones. |
| 2026-10-26 | M15 | 15.1 a 15.9 | "En simple" en las 9 secciones. |
| 2026-10-26 | M16 | 16.1 a 16.6 | "En simple" en las 6 secciones. |
| 2026-10-26 | M18 | 18.1 a 18.9 | "En simple" en las 9 secciones (hotel y retención, alcancía del token bucket, patovica de la admisión, cajeros sin hablarse…). |
| 2026-10-26 | M19 | 19.1 a 19.10 | "En simple" en las 10 secciones. |
| 2026-10-26 | M19 | Mapa `m19-flota` | `stepPanel` y `pieces`; los 16 nodos con `brief` y `why`; los 8 escenarios con `goal`. |
| 2026-10-26 | M20 | 20.1 a 20.3 | "En simple" en las 3 secciones (20.4 a 20.8 quedan fuera, ver arriba). |
| 2026-10-26 | M22 | 22.1 a 22.14 | "En simple" en las 14 secciones. |
| 2026-10-26 | M23 | 23.1 a 23.14 | "En simple" en las 14 secciones. |
| 2026-10-26 | M24 | 24.1 a 24.14 | "En simple" en las 14 secciones. |
| 2026-10-26 | M24 | Mapa `m24-voz` | `stepPanel` y `pieces`; los 18 nodos con `brief` y `why`; los 10 escenarios con `goal`. |
| 2026-10-26 | M25 | 25.1 a 25.14 | "En simple" en las 14 secciones. |
| 2026-10-26 | M26 | 26.1 a 26.10 | "En simple" en las 10 secciones. |
| 2026-10-26 | Mapa de ChatGPT | `maps/chatgpt.html` | `pieces`; los 24 nodos con `brief` y `why` (con el módulo que explica cada pieza); los 9 escenarios con `goal`. |
Motor de mapas (vale para todos): `map-engine.js` dibuja `why` de los nodos; `flow-sim.js` dibuja el título del mapa, "Escenario N de M", `goal` y el `why` de los pasos; estilos `.sdm-why` y `.sdm-sp-map` en `map.css`.

Componente "En simple" (vale para todas las secciones): `aside.callout.callout--simple` justo después del `h2`, con un párrafo que dice de qué trata la sección en palabras simples, `p.jr-like` con "Es como" y una analogía, y `dl.jr-words` con los términos nuevos y su definición en una línea. No reemplaza el texto de la sección: lo anticipa. Estilos al final de `components.css`. Los generadores (`apply.py` y un `dNN.py` por módulo) quedaron en el scratchpad de la sesión cd949111 (`scratchpad/jr/`); las páginas son la fuente de verdad.

## Pendiente

Nada: la Parte II completa (salvo lo que el usuario dio por claro) está en "Hecho" desde el 2026-10-26. Si el usuario marca otra sección como difícil, se agrega una fila nueva en lugar de reescribir una que ya está hecha.
