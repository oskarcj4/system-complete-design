# PLAN_ML_SYSTEM_DESIGN.md: Parte VI, ML System Design (sistemas de recomendación)

> Plan autosuficiente de los módulos de la Parte VI. Una sesión futura debería poder escribir cada módulo leyendo
> **solo** este archivo, `CLAUDE.md`, el módulo publicado más parecido (`modules/m30-twitter.html` para los
> casos con mapa, `modules/m22-operar-modelos.html` para los de método) y las fuentes que se listan. Las guías
> prácticas de esta parte están en `PLAN_ML_GUIAS.md`. Lo que cambie (qué está hecho) va a `PROGRESO.md`.
>
> **Pedido (2026-10-16):** "Prepara una sección de IA System Design, un gran dive in en diseñar sistemas de
> recomendación de contenido, sistemas de recomendación de amigos, algoritmos adictivos; si quieres usa bases de
> datos de grafos. Quiero una sección completa de diagramas, diseño y que prepares también partes prácticas:
> diseñar un par de algoritmos para recomendar productos, qué modelos estadísticos considerar, trade-offs, etc.
> Literalmente un curso de diseño de sistemas de recomendación. Únicamente escribe los planos para el ML system
> design; las guías van como próximamente, con su título."
>
> **Estado al escribir este plan:** ningún módulo escrito. En el sitio existen como `status: 'soon'` en la parte
> `p6` de `assets/js/data/course.data.js`, y las guías como `status: 'proposed'` en `SD.data.projects.mlTracks`.

---

## 0. El prompt completo de la Parte VI

Copia este bloque como pedido cuando empieces a escribir la parte. Resume todo lo que sigue.

```text
Escribe la Parte VI del curso, "ML System Design: sistemas de recomendación", módulos M42 a M53, el
Checkpoint F y las guías ML00 a ML09, siguiendo PLAN_ML_SYSTEM_DESIGN.md y PLAN_ML_GUIAS.md.

Quién lee: habla español, tiene nivel backend intermedio (REST, SQL, Docker) y ya hizo las Partes I y II.
Sabe qué es un LLM, un embedding y un RAG a nivel básico. NO sabe estadística más allá del promedio, no
sabe qué es una matriz dispersa, una factorización, un gradiente, una pérdida, AUC, NDCG, un bandit, un
test de hipótesis ni un grafo como estructura de datos. Todo eso se explica desde cero, con un dibujo.

Qué se construye: un curso completo de diseño de sistemas de recomendación, de punta a punta:
  1. el método (del objetivo de negocio a la métrica, y por qué la métrica que optimizas te cambia el producto);
  2. los datos (eventos, impresiones, la matriz usuario-ítem, features, fugas y sesgos);
  3. los modelos clásicos (popularidad, contenido, filtrado colaborativo, factorización de matrices);
  4. la recuperación a escala (two-tower, embeddings, ANN con HNSW e IVF-PQ);
  5. el ranking (regresión logística, GBDT, modelos profundos, multi-tarea, calibración);
  6. el re-ranking (diversidad, frescura, reglas, exploración con bandits, bucles de retroalimentación);
  7. los grafos (recomendación de amigos, vecinos comunes, Adamic-Adar, PageRank personalizado,
     caminatas aleatorias, GNN, Neo4j contra un grafo en un key-value como TAO);
  8. evaluar y experimentar (métricas offline, A/B con potencia, CUPED, interleaving, efectos de red, IPS);
  9. servir y operar (presupuesto de latencia, features en tiempo real, entrenamiento continuo, deriva,
     degradación elegante, costo);
 10. los algoritmos de engagement: por qué enganchan, cómo se mide el daño y cómo se diseñan con
     responsabilidad (refuerzo variable, scroll infinito, notificaciones, menores, DSA);
 11. dos casos de estudio con mapa explorable: un feed de video corto tipo TikTok/YouTube y la
     recomendación de productos de una tienda tipo Amazon;
 12. el Checkpoint F: diseñar el recomendador de un marketplace con amigos y productos.

Reglas que no se rompen (además de CLAUDE.md):
- Diagramas primero: cada concepto es una "ficha completa" (sección 2.2 de este plan): qué entra, qué
  hace, qué sale, un ejemplo con números de verdad, qué falla sin él y dónde vive en la arquitectura.
- Cada fórmula aparece tres veces: en palabras, con un ejemplo numérico resuelto a mano (verificado con
  un cálculo) y en una línea de Python. Nunca una fórmula sola.
- Cada módulo empieza por la Lámina del módulo y termina con el embudo de la Lámina 42.A con su pieza
  resaltada: el lector siempre sabe en qué parte del recomendador está.
- Toda afirmación sobre una empresa lleva badge--doc con fuente (paper, blog de ingeniería, código
  abierto) o badge--ref si es reconstrucción. Las cifras se verifican.
- El módulo de engagement explica los mecanismos para diseñar con responsabilidad: no es un manual
  para explotar a nadie. Cada mecanismo va con su costo humano medido y su contramedida.
- Quiz de 9 a 12 preguntas por módulo (16 a 20 en los casos de estudio), ejercicio guiado por módulo,
  checkpoint, y la revisión de quiz-bias.mjs, links.mjs y test-page.mjs.
```

---

## 1. Encaje en el curso

### 1.1. Numeración y lugar

- **Parte VI**, id `p6`, la última parte de `course.data.js`, después de la Fase 2 (ver 1.3). Los números M40 y M41 están reservados para la Parte V (`PLAN.md`), así que la Parte VI empieza en
  **M42**. Cuenta para el progreso.
- Línea de color: `--line-p6: var(--l-external)` en `tokens.css`. Es un tono que ya está validado en la paleta
  `--l-*`; no se agregan tonos nuevos.
- En la portada, la ruta dibuja la Parte VI en una cuarta fila (`home.js`, `renderRouteMap`): la tercera fila ya
  tiene 17 paradas.

### 1.2. Lo que la parte retoma (enlazar, no repetir)

| Concepto | Dónde ya está | Cómo se retoma |
|---|---|---|
| Embedding | [M17 `#embeddings`](modules/m17-api-streaming.html) y el glosario `embedding` | M45 lo extiende de "significado de un texto" a "gustos de un usuario" y "qué es un ítem" |
| Base de datos vectorial, HNSW, IVF | [M20 `#archivos`](modules/m20-producto-chatgpt.html#archivos), glosario `vector-db` | M45 lo abre por dentro: cómo se arma el grafo de HNSW y qué pierde PQ |
| RAG como recuperación + generación | [M16 `#rag`](modules/m16-context-windows.html#rag) | M45: "un recomendador es un RAG sin LLM: recuperar candidatos y ordenarlos" |
| Fan-out en escritura y en lectura, timeline | [M30 `#fanout`](modules/m30-twitter.html#fanout) y `#hibrido` | M50 y M52: el feed precalculado contra el armado al leer |
| For You: de cronológico a ranking | [M30 `#ranking`](modules/m30-twitter.html#ranking) | **Promesa principal**: M46 y M52 la cumplen a fondo; la sección 30.10 pasa a enlazar a M46 |
| El grafo social | [M30 `#almacenamiento`](modules/m30-twitter.html#almacenamiento) | M48 lo convierte en la fuente de la recomendación de amigos |
| Trending con streaming, count-min sketch | [M30 `#trending`](modules/m30-twitter.html#trending) | M44 (popularidad con decaimiento) y M50 (features en streaming) |
| A/B tests, evals offline con barras de error | [M22 `#ab`](modules/m22-operar-modelos.html#ab) y `#evals` | M49 los lleva a la recomendación: potencia, CUPED, interleaving, efectos de red |
| Regresiones silenciosas, deriva | [M22 `#deriva`](modules/m22-operar-modelos.html#deriva) | M50: la deriva de un recomendador y el bucle que se alimenta solo |
| Canary y shadow | [M22 `#canary`](modules/m22-operar-modelos.html#canary), `#shadow` | M50: el canary de un modelo de ranking |
| Kafka, particiones, consumer groups | [M07 `#kafka`](modules/m07-mensajeria.html#kafka) | M43 (el log de eventos) y M50 (features en tiempo real) |
| Caché, claves calientes | [M04 `#hot-keys`](modules/m04-cache.html#hot-keys) | M50: ítems virales y el caché de candidatos |
| Sharding | [M05 `#sharding`](modules/m05-bases-de-datos.html#sharding) | M48: partir un grafo social sin cortar todas las aristas |
| Percentiles, back-of-envelope, SLO | [M00 `#percentiles`, `#estimaciones`, `#slo`](modules/m00-metodo.html) | M42 y M50: el presupuesto de 200 ms y cuántas puntuaciones por segundo |
| Entrenamiento, GPUs | [M26](modules/m26-entrenamiento.html), [M13](modules/m13-gpus.html) | M50: entrenar un DLRM con tablas de embeddings que no caben en una GPU |
| Moderación, datos de usuarios | [M20 `#moderacion`](modules/m20-producto-chatgpt.html#moderacion), [M22 `#datos`](modules/m22-operar-modelos.html#datos) | M51: integridad y privacidad del recomendador |

### 1.3. Orden en la ruta

`p1 → p2 → p3 → p4 → p5 → f2 → p6`. La Parte VI va al final porque se apoya en M30 (Fase 2), ya
publicado. En la portada ocupa su propia fila.

Prerrequisitos de la parte: M00, M04, M05, M07, M17 (embeddings), M22 (A/B) y M30. Se recomiendan M16 y M20.

---

## 2. Parámetros de nivel: cómo se hace masticable

Esta parte nace con las mejoras de legibilidad que se sugirieron para las guías de IA (2026-10-16). Valen para
los doce módulos y el checkpoint.

### 2.1. Lo que se asume y lo que no

- **Se asume:** qué es un LLM, un token, un embedding como "vector que representa significado", RAG como "buscar
  y después responder", SQL, REST, Docker, una caché, Kafka a nivel de M07, percentiles a nivel de M00.
- **No se asume (se explica desde cero, con figura):** vector y producto punto, similitud coseno, matriz y matriz
  dispersa, probabilidad condicional, distribución Beta, varianza, intervalo de confianza, test de hipótesis,
  potencia estadística, gradiente, función de pérdida, sobreajuste, regularización, árbol de decisión, boosting,
  red neuronal más allá de "capas", softmax, entropía cruzada, AUC, log loss, NDCG, grafo y sus partes (nodo,
  arista, grado, vecindario, camino), caminata aleatoria, PageRank, bandit, causalidad contra correlación.
- Un recuadro `callout--def` **"Matemática de por medio"** (como el "Python de por medio" de las guías) explica
  cada pieza matemática la primera vez, con un dibujo y una cuenta de tres números.

### 2.2. La ficha completa de un concepto

Cada concepto nuevo ocupa una figura con seis zonas fijas. Es la forma de "diagrama con información completa":

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ NOMBRE (en inglés)          En una frase: qué resuelve.                    │
├──────────────┬───────────────────────────────┬─────────────────────────────┤
│ Qué entra    │ Qué hace (el mecanismo, en    │ Qué sale                    │
│ (con un      │ 3 a 5 pasos dibujados)        │ (con el mismo ejemplo)      │
│ ejemplo real)│                               │                             │
├──────────────┴───────────────┬───────────────┴─────────────────────────────┤
│ Ejemplo con números (la      │ Qué falla sin esto / cuándo no sirve        │
│ cuenta hecha a mano)         │                                             │
├──────────────────────────────┴─────────────────────────────────────────────┤
│ Dónde vive: miniatura del embudo de la Lámina 42.A con la pieza resaltada  │
└────────────────────────────────────────────────────────────────────────────┘
```

- Se genera con un helper `ficha()` en un script de Python del scratchpad, con las clases de figuras del curso.
- A 390 px se desplaza en su marco (`min-width: 640px`).
- Debajo, un `callout--analogy` (una analogía por concepto abstracto) y, si el concepto tiene números que se
  pueden mover, un widget.

### 2.3. Ritmo de cada sección

1. Pregunta de producto ("¿por qué te recomienda lo que ya compraste?").
2. Analogía.
3. Ficha completa.
4. Ejemplo resuelto con números (verificado con un cálculo; la cuenta se muestra).
5. El código mínimo en Python (diez a veinte líneas, `numpy` o `pandas`).
6. Trade-off (`callout--tradeoff`) y qué pasa si falla (`callout--fail`).
7. Cierre: "lo que ahora sabes", una línea, y la miniatura del embudo.

### 2.4. Hitos de lectura

Cada módulo marca con `<p class="more-link">` (o un chip equivalente) qué secciones son **núcleo** y cuáles son
**a fondo** (opcionales). No se divide ningún módulo en dos páginas (regla de `CLAUDE.md`): el lector que va por
el núcleo lee unos 60 minutos y el que va a fondo, el tiempo total.

### 2.5. El caso que se encadena

Todos los módulos usan **la misma empresa ficticia**, para reutilizar números:

**Mercado Barrio**, un marketplace con red social:

- 20 millones de usuarios activos al día (DAU), 50 millones registrados.
- 100 millones de ítems: 80 millones de productos de vendedores y 20 millones de videos cortos de reseña.
- Tres superficies: el feed de inicio (videos y productos mezclados), "comprados juntos" en la página de producto
  y "personas que quizás conozcas".
- Cada usuario abre el feed 20 veces al día: 20 000 000 × 20 = 400 000 000 requests al día, unas 4 630 por
  segundo en promedio (400 000 000 / 86 400) y unas 13 900 en el pico, con un factor de 3.
- Presupuesto de latencia del feed: 200 ms p99 en el servidor.

Cada módulo saca de aquí sus cuentas (M44: la matriz; M45: el índice; M48: el grafo; M50: la flota).

### 2.6. La Lámina 42.A: el embudo que se repite en todo

```text
 100 000 000 ítems
      │  Recuperación (varias fuentes: two-tower, ítem-ítem, grafo, popular, seguidos)
      ▼
   10 000 candidatos ──── Filtros (ya visto, bloqueado, sin stock, política)
      ▼
    1 000 ───────────────── Ranking liviano (modelo chico, barato por ítem)
      ▼
      500 ───────────────── Ranking pesado (modelo grande, multi-tarea)
      ▼
       50 ───────────────── Re-ranking (diversidad, frescura, reglas, exploración)
      ▼
       10 en pantalla ───── Registro de impresiones ──► log de eventos ──► entrenamiento
```

Cada módulo la reutiliza con su pieza resaltada. Es la figura que ancla toda la parte.

---

## 3. Mapa de la parte

| # | Id | Archivo | Título | Min | Prerreq |
|---|---|---|---|---|---|
| M42 | `m42` | `m42-ml-system-design.html` | El método de ML System Design | 90 | M00, M22 |
| M43 | `m43` | `m43-datos-recomendacion.html` | Datos, eventos y features | 120 | M42, M07 |
| M44 | `m44` | `m44-modelos-clasicos.html` | Modelos clásicos: popularidad, contenido y filtrado colaborativo | 150 | M43 |
| M45 | `m45` | `m45-recuperacion.html` | Recuperación a escala: two-tower y búsqueda vectorial | 120 | M44, M17 |
| M46 | `m46` | `m46-ranking.html` | Ranking: del modelo lineal al multi-tarea | 150 | M45 |
| M47 | `m47` | `m47-reranking-exploracion.html` | Re-ranking, exploración y bucles de retroalimentación | 120 | M46 |
| M48 | `m48` | `m48-grafos-amigos.html` | Grafos y recomendación de amigos | 150 | M44, M30 |
| M49 | `m49` | `m49-experimentos.html` | Evaluar y experimentar | 120 | M46, M22 |
| M50 | `m50` | `m50-serving-recomendacion.html` | Servir y operar un recomendador | 150 | M46, M49 |
| M51 | `m51` | `m51-engagement.html` | Algoritmos de engagement: por qué enganchan y cómo diseñarlos con responsabilidad | 120 | M47, M49 |
| M52 | `m52` | `m52-feed-video.html` | Caso de estudio: un feed de video corto | 180 | M42–M51 |
| M53 | `m53` | `m53-recomendar-productos.html` | Caso de estudio: recomendar productos | 150 | M42–M50 |
| CP-F | `cpf` | `checkpoint-f.html` | Checkpoint F: el recomendador de Mercado Barrio | 120 | todo |

Widgets nuevos (todos en `assets/js/widgets/`, con la lógica en un `SD.*Core` probable sin DOM, como `SD.quotaCore`):

| Archivo | Selectores | Módulo |
|---|---|---|
| `sim-recsys.js` | `data-sim="funnel"`, `data-sim="itemcf"`, `data-sim="mf"`, `data-calc="sparsity"` | M42, M44 |
| `sim-events.js` | `data-sim="leakage"`, `data-sim="posbias"` | M43 |
| `sim-ann.js` | `data-sim="hnsw"`, `data-calc="annsize"` | M45 |
| `sim-rank.js` | `data-sim="ndcg"`, `data-sim="calib"`, `data-calc="multiobj"` | M46 |
| `sim-bandit.js` | `data-sim="bandit"`, `data-sim="mmr"`, `data-sim="feedbackloop"` | M47 |
| `sim-graph.js` | `data-sim="fof"`, `data-sim="ppr"`, `data-calc="graphshard"` | M48 |
| `sim-exp.js` | `data-calc="abpower"`, `data-sim="cuped"`, `data-sim="interleave"`, `data-sim="ips"` | M49 |
| `sim-serve.js` | `data-calc="recbudget"`, `data-sim="freshness"` | M50 |
| `sim-engage.js` | `data-sim="engage"` | M51 |

Mapas nuevos: `assets/js/data/maps/m52-feed.data.js` (M52) y `m53-tienda.data.js` (M53), con `stepPanel: true` y
`pieces: true`, como M27.

---

## 4. M42. El método de ML System Design

**Ficha.** `m42`, `m42-ml-system-design.html`, 90 min, prereq M00 y M22. Lead: "Antes del primer modelo: qué
quieres que pase, cómo lo vas a medir y por qué la métrica que elijas te cambia el producto."

**Al terminar podrás:** convertir un objetivo de negocio en una etiqueta y una métrica; distinguir la métrica
norte, las proxies y las de protección; dibujar el embudo de un recomendador y estimar cuántos ítems pasan por
cada etapa; decidir cuándo no hace falta ML; escribir el design doc de un recomendador.

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `distinto` | 42.1 | Qué tiene de distinto diseñar con ML | El sistema aprende de los datos que él mismo genera; el código es correcto y el sistema falla igual. Figura: software clásico (reglas → salida) contra ML (datos + objetivo → modelo → salida → nuevos datos). |
| `recomendador` | 42.2 | Qué es un recomendador | Un problema de ordenar: dado un usuario y un contexto, ordenar millones de ítems. Tipos: feed, "más como esto", "comprados juntos", personas, búsqueda personalizada, notificaciones. Lámina 42.A (el embudo). |
| `lamina` | 42.3 | La lámina: las piezas de un recomendador | Lámina 42.B con 14 piezas numeradas: cliente, API del feed, fuentes de candidatos, filtros, feature store, ranking liviano, ranking pesado, re-ranking, registro de impresiones, log de eventos, entrenamiento, registro de modelos, índice vectorial, experimentos. Cada una con su sección. |
| `objetivo` | 42.4 | Del objetivo a la etiqueta | "Que compren más" no se entrena. Se entrena "¿hará clic?", "¿mirará más de 10 s?", "¿comprará en 7 días?". Ficha: objetivo → comportamiento observable → etiqueta → modelo. Feedback explícito (estrellas, me gusta) contra implícito (clics, tiempo, compras): el implícito abunda y miente, el explícito escasea. |
| `metricas` | 42.5 | La métrica norte, las proxies y las de protección | North star (compras por usuario a 28 días), proxies que se mueven rápido (CTR, tiempo visto), guardrails (latencia, quejas, "no me interesa", devoluciones). Ley de Goodhart con un ejemplo: optimizar CTR premia los títulos engañosos. Figura: árbol de métricas. |
| `sin-ml` | 42.6 | Cuándo no hace falta ML | La línea base: lo más popular de la semana, por categoría y país. Reglas a mano. Cuándo el ML gana (mucho catálogo, mucha gente, gustos distintos) y cuándo no (catálogo de 200 ítems). Regla: nunca un modelo sin una línea base medida. |
| `numeros` | 42.7 | Los números de Mercado Barrio | El caso de la sección 2.5 con sus cuentas: requests por segundo, ítems por etapa, puntuaciones por segundo (13 900 × 500 = 6 950 000 puntuaciones por segundo en el ranking pesado en el pico). `data-sim="funnel"`. |
| `restricciones` | 42.8 | Requisitos no funcionales de un recomendador | Latencia, frescura (¿en cuánto aparece un video nuevo?), costo por request, privacidad, explicabilidad ("¿por qué veo esto?"), equidad entre vendedores. |
| `design-doc` | 42.9 | El design doc de un recomendador | Plantilla en nueve partes (problema, métricas, datos, línea base, modelo, serving, experimento, riesgos, plan de lanzamiento). Retoma [M00 `#design-doc`](modules/m00-metodo.html#design-doc). |
| `entrevista` | 42.10 | Cómo se razona en voz alta (y en una entrevista) | El orden: aclarar → métricas → datos → línea base → embudo → modelos por etapa → serving → evaluación → riesgos. |

### Figuras

- **42.1** software clásico contra ML (dos carriles; el de ML con la flecha de vuelta datos → modelo).
- **Lámina 42.A** el embudo (sección 2.6), con los números a la derecha y la latencia acumulada a la izquierda.
- **Lámina 42.B** la arquitectura completa, 14 marcas con `ol.plate-key`.
- **42.2** ficha completa de "etiqueta": objetivo → comportamiento → etiqueta → modelo, con el ejemplo "comprar en
  7 días" y su trampa (la etiqueta llega una semana tarde: lo que eso significa para el entrenamiento).
- **42.3** árbol de métricas: norte arriba, proxies en el medio, protección al costado, con flechas de "mueve".
- **42.4** feedback explícito contra implícito: dos columnas con volumen (1 de cada 1 000 usuarios califica, todos
  hacen clic: <span class="badge badge--ref">Diseño de referencia</span> si no se encuentra la cifra).
- **42.5** línea base: barras de "popular global", "popular por categoría", "modelo"; dibujo, no medición.

### Widget

`data-sim="funnel"` (`sim-recsys.js`): sliders de DAU, aperturas por día, factor de pico, tamaño de cada etapa y
milisegundos por ítem en cada modelo. Muestra requests por segundo, puntuaciones por segundo por etapa, latencia
acumulada contra el presupuesto de 200 ms y en qué etapa se pasa.

### Quiz, ejercicio y glosario

- Quiz `m42`, 10 preguntas: etiqueta contra objetivo, Goodhart, guardrails, cuándo no usar ML, el orden del
  embudo, por qué el ranking pesado no puede ver 100 millones.
- Ejercicio guiado `m42-metricas`: elegir etiqueta y métricas para "personas que quizás conozcas" de Mercado
  Barrio (8 decisiones).
- Términos candidatos (ids nuevos, revisados contra los existentes: no existen): `recomendador`,
  `embudo-recomendacion` (alias "pipeline de recomendación"), `feedback-implicito`, `feedback-explicito`,
  `north-star`, `metrica-proxy`, `guardrail-metric` (cuidado: `guardrails` de M22 es otra cosa; `noauto` en el
  alias "guardrail"), `ley-goodhart`, `linea-base`.

### Fuentes por verificar

- Covington, Adams, Sargin (2016), *Deep Neural Networks for YouTube Recommendations*, RecSys: el embudo de dos
  etapas (candidatos y ranking) y la etiqueta "tiempo visto esperado".
- Gomez-Uribe y Hunt (2015), *The Netflix Recommender System: Algorithms, Business Value, and Innovation*, ACM TMIS:
  cifras de valor de negocio del recomendador.
- Chip Huyen (2022), *Designing Machine Learning Systems*, O'Reilly: el marco de framing, métricas y datos.
- Ley de Goodhart (Goodhart 1975; formulación de Strathern 1997).

### Promesas que cumple y secciones que retoma

- Cumple: ninguna directa. Retoma M00 (`#requisitos`, `#estimaciones`, `#design-doc`), M22 (`#senales`).
- Deja indicios: "(M43)" en etiquetas que llegan tarde, "(M49)" en guardrails, "(M51)" en Goodhart.

---

## 5. M43. Datos, eventos y features

**Ficha.** `m43`, `m43-datos-recomendacion.html`, 120 min, prereq M42 y M07. Lead: "Un recomendador es tan bueno
como su registro de lo que la gente vio y no tocó."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `eventos` | 43.1 | Qué se registra: impresiones, clics, tiempo, compras | El esquema de un evento (usuario, ítem, superficie, posición, request_id, modelo, versión, timestamp, contexto). Por qué **la impresión** (lo que se mostró) importa tanto como el clic: sin ella no hay negativos. Esquema de tabla `impressions` y `interactions`. |
| `log` | 43.2 | El viaje de un evento | Cliente → API de eventos → Kafka → stream (dedupe, enriquecer) → data lake (Parquet por hora) y → feature store online. Diagrama de secuencia (`seqdiag.py`). Retoma [M07 `#kafka`](modules/m07-mensajeria.html#kafka) y la dedupe de [M21](modules/m21-metering.html). |
| `matriz` | 43.3 | La matriz usuario-ítem | Matemática de por medio: qué es una matriz y una matriz dispersa. Mercado Barrio: 50 000 000 × 100 000 000 = 5 × 10^15 celdas; con 10 000 000 000 interacciones en un año, la densidad es 10^10 / 5 × 10^15 = 0.0002&#8239;%. Formato CSR: solo se guardan las celdas con dato. `data-calc="sparsity"`. |
| `negativos` | 43.4 | Los negativos: lo que no se tocó | Mostrado y no tocado no es "no le gusta". Muestreo de negativos: aleatorio, por popularidad, difíciles. Ficha con el ejemplo de 10 impresiones, 1 clic. |
| `features` | 43.5 | Features: qué sabe el modelo | Tres familias: del usuario (país, edad de la cuenta, categorías vistas en 7 días), del ítem (precio, categoría, edad, CTR histórico), de la pareja usuario-ítem (¿compró del mismo vendedor?, similitud de embeddings). Contexto (hora, dispositivo). Cuáles se calculan en lote y cuáles en tiempo real. |
| `feature-store` | 43.6 | El feature store | Online (Redis o un KV, lectura en 1 a 5 ms) y offline (Parquet, para entrenar). La misma definición para los dos. Figura con las dos mitades y la definición en el medio. |
| `skew` | 43.7 | Training-serving skew | El modelo entrenó con una feature calculada de una forma y en producción se calcula de otra. Ejemplo: "compras en 30 días" con zona horaria UTC en lote y local en línea. Defensa: registrar las features en el momento de servir (log de features) y entrenar con ese log. |
| `fugas` | 43.8 | Fugas del futuro (data leakage) | Point-in-time join: para cada impresión, el valor de cada feature **en ese instante**. Ejemplo: "CTR del ítem" calculado con todo el mes incluye los clics posteriores. `data-sim="leakage"`: la métrica offline sube y la online cae. |
| `sesgos` | 43.9 | Los sesgos de los datos | Sesgo de posición (lo de arriba recibe más clics por estar arriba), de popularidad, de selección (solo ves reacciones a lo que mostraste), de supervivencia. `data-sim="posbias"`: mismo ítem en las posiciones 1 y 8, con una curva de examen dibujada. |
| `privacidad` | 43.10 | Privacidad y retención | Qué no se guarda (búsquedas sensibles), retención por tipo de evento, borrado de un usuario (el modelo ya aprendió de él: qué se puede y qué no), consentimiento. Retoma [M22 `#datos`](modules/m22-operar-modelos.html#datos). |

### Figuras

- **Lámina 43.A** las 10 piezas del camino de un evento.
- **43.1** esquema `impressions` (`figure.schema`, con `request_id` como clave de unión).
- **43.2** diagrama de secuencia del viaje de un evento, con la dedupe por `event_id`.
- **43.3** matriz dispersa: una rejilla de 12 × 12 con 9 celdas llenas, y al lado su representación CSR con los
  tres arreglos (`data`, `indices`, `indptr`) dibujados.
- **43.4** ficha completa de "negativo".
- **43.5** las tres familias de features en tres columnas, con su frecuencia de actualización.
- **43.6** feature store online y offline.
- **43.7** dos líneas de tiempo lado a lado: entrenamiento y servicio, con la feature que diverge.
- **43.8** point-in-time join: una línea de tiempo con la impresión en t y los valores válidos a la izquierda.
- **43.9** curva de sesgo de posición (probabilidad de examinar por posición; dibujo, no medición).

### Quiz, ejercicio, glosario y fuentes

- Quiz `m43`, 10 preguntas. Ejercicio guiado `m43-eventos`: diseñar el registro de "comprados juntos".
- Términos: `impresion` (alias "impression"; cuidado con "impresión" como opinión: `noauto` en frases sueltas,
  revisar con `links.mjs`), `matriz-dispersa`, `muestreo-negativos`, `feature-store`, `training-serving-skew`,
  `data-leakage`, `point-in-time-join`, `sesgo-posicion`.
- Fuentes: Joachims et al. (2005/2017) sobre sesgo de posición; documentación de Feast (feature store de código
  abierto); Uber Michelangelo (blog 2017); Sculley et al. (2015), *Hidden Technical Debt in Machine Learning
  Systems*, NeurIPS.

---

## 6. M44. Modelos clásicos: popularidad, contenido y filtrado colaborativo

**Ficha.** `m44`, `m44-modelos-clasicos.html`, 150 min, prereq M43. Lead: "Cuatro ideas viejas que todavía
recomiendan la mitad de lo que ves."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `popularidad` | 44.1 | Lo popular, bien hecho | Conteo con decaimiento exponencial (vida media de 24 h), por segmento. Popularidad bayesiana: el promedio de estrellas con prior (un ítem con 1 voto de 5 estrellas no le gana a uno con 2 000 de 4.7). La cuenta: con prior de 20 votos de 4.0, el de 1 voto queda en (20 × 4.0 + 5) / 21 = 4.05. Retoma [M30 `#trending`](modules/m30-twitter.html#trending). |
| `contenido` | 44.2 | Basado en contenido | Describir ítems (texto, categoría, imagen) con un vector; el usuario es el promedio de lo que le gustó. TF-IDF (matemática de por medio) y embeddings de texto (retoma [M17](modules/m17-api-streaming.html)). Fuerte en arranque en frío del ítem, débil en sorpresa. |
| `coseno` | 44.3 | Similitud: coseno y Jaccard | Matemática de por medio: producto punto, norma, coseno, con dos vectores de tres números dibujados como flechas. Jaccard para conjuntos. |
| `item-item` | 44.4 | Filtrado colaborativo ítem a ítem | "Quienes compraron esto también compraron". Ejemplo resuelto (4 usuarios × 4 ítems, sección 6.1). Por qué ítem a ítem escala mejor que usuario a usuario (los ítems cambian menos). `data-sim="itemcf"`. |
| `usuario-usuario` | 44.5 | Usuario a usuario y por qué casi no se usa | Vecinos parecidos; costo O(usuarios²); inestable. |
| `factorizacion` | 44.6 | Factorización de matrices | La matriz dispersa ≈ U × Vᵀ con k factores. Qué es un factor (dibujo: "comedia ↔ drama", "barato ↔ premium"). La pérdida (error al cuadrado + regularización) y el gradiente explicados con una bajada en una colina. Cuenta: 50 000 000 + 100 000 000 = 150 000 000 filas × 64 factores × 4 B = 38.4 GB. `data-sim="mf"`. |
| `implicito` | 44.7 | Feedback implícito: ALS con confianza | Hu, Koren y Volinsky: preferencia 0 o 1 con confianza c = 1 + α · conteo. Por qué ALS (alternar: fijar U, resolver V) se paraleliza bien. |
| `bpr` | 44.8 | Aprender a ordenar: BPR | Pares (ítem que tocó, ítem que no) y la pérdida que premia ordenar bien. Primera aparición de "pérdida por pares" (vuelve en M46). |
| `frio` | 44.9 | Arranque en frío | Usuario nuevo (onboarding, popular por país, contexto), ítem nuevo (contenido, exploración en M47), sistema nuevo. Ficha completa. |
| `comparar` | 44.10 | Cuál usar | Tabla: datos que necesita, costo de entrenar, costo de servir, arranque en frío, diversidad, explicabilidad. |

### 6.1. El ejemplo resuelto de ítem a ítem (verificado)

Usuarios y compras: u1 {A, B}, u2 {A, B, C}, u3 {B, C}, u4 {A, D}. Vectores por ítem sobre los usuarios
(u1, u2, u3, u4): A = (1, 1, 0, 1), B = (1, 1, 1, 0), C = (0, 1, 1, 0), D = (0, 0, 0, 1).

- cos(A, B) = 2 / (√3 · √3) = 0.667
- cos(A, D) = 1 / (√3 · 1) = 0.577
- cos(A, C) = 1 / (√3 · √2) = 0.408
- cos(B, C) = 2 / (√3 · √2) = 0.816

Quien mira A ve primero B, después D, después C. Quien mira B ve primero C. La figura dibuja la matriz, los
vectores y la tabla de similitudes; el widget deja agregar compras y recalcula.

### Figuras

Lámina 44.A (las cuatro familias), ficha de popularidad con decaimiento (curva de vida media), ficha de contenido,
coseno con flechas, matriz → tabla de similitudes, factorización como dos matrices finas que multiplicadas
rellenan la grande, la colina del gradiente, ALS alternando (dos pasos), BPR con un par, arranque en frío (tres
casos), tabla comparativa.

### Widgets

- `data-sim="itemcf"`: la matriz 4 × 4 editable con clics, las similitudes recalculadas y el top-3 por ítem.
- `data-sim="mf"`: una matriz chica (6 usuarios × 6 películas) con huecos; botón "un paso de entrenamiento" que
  baja la pérdida y rellena las predicciones; slider de k y de regularización; muestra sobreajuste con k grande.

### Quiz, ejercicio, glosario y fuentes

- Quiz `m44`, 12 preguntas. Ejercicio guiado `m44-comprados`: elegir el algoritmo de "comprados juntos" para
  Mercado Barrio con sus números.
- Términos: `popularidad-decaimiento`, `contenido-recomendacion` (alias "content-based"), `similitud-coseno`,
  `jaccard`, `filtrado-colaborativo`, `item-item`, `factorizacion-matrices`, `als`, `bpr`, `arranque-frio`
  (revisar contra `cold-start`, que existe con el sentido de M19: un contenedor nuevo; usar id nuevo y
  `noauto` en "cold start" para no pisarlo).
- Fuentes: Linden, Smith y York (2003), *Amazon.com Recommendations: Item-to-Item Collaborative Filtering*, IEEE
  Internet Computing; Koren, Bell y Volinsky (2009), *Matrix Factorization Techniques for Recommender Systems*,
  IEEE Computer; Hu, Koren y Volinsky (2008), *Collaborative Filtering for Implicit Feedback Datasets*, ICDM;
  Rendle et al. (2009), *BPR*, UAI; Smith y Linden (2017), *Two Decades of Recommender Systems at Amazon.com*.

---

## 7. M45. Recuperación a escala: two-tower y búsqueda vectorial

**Ficha.** `m45`, `m45-recuperacion.html`, 120 min, prereq M44 y M17. Lead: "De 100 millones a 10 000 en 20 ms."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `problema` | 45.1 | El problema: 100 millones en 20 ms | Puntuar todo es imposible: 100 000 000 × 13 900 req/s. Un recomendador es un RAG sin LLM. Retoma [M16 `#rag`](modules/m16-context-windows.html#rag). |
| `two-tower` | 45.2 | El modelo de dos torres | Una torre convierte al usuario en un vector, otra al ítem; el puntaje es el producto punto. Por qué separarlas permite precalcular los ítems. Ficha completa con las dos torres y sus entradas. |
| `entrenar-torres` | 45.3 | Cómo aprende: negativos dentro del lote | Softmax sobre el lote (matemática de por medio: softmax con tres números). Corrección por frecuencia (los populares aparecen demasiado como negativos). |
| `fuentes` | 45.4 | Varias fuentes de candidatos | Two-tower, ítem a ítem, grafo (M48), seguidos, popular, "volver a ver". Cuota por fuente y mezcla. Figura: cinco fuentes en abanico hacia el conjunto de 10 000. |
| `ann` | 45.5 | Vecinos aproximados | Por qué exacto es caro. Recall contra latencia. Ficha. |
| `hnsw` | 45.6 | HNSW por dentro | El grafo de varios pisos, la búsqueda golosa, M y efSearch. `data-sim="hnsw"`: 60 puntos en 2D, la búsqueda paso a paso. Retoma [M20 `#archivos`](modules/m20-producto-chatgpt.html#archivos). |
| `ivfpq` | 45.7 | IVF y cuantización por productos | Particiones (k-means) y PQ: 128 dimensiones × 4 B = 512 B por vector contra 64 B con PQ. 100 000 000 × 512 B = 51.2 GB; con PQ, 6.4 GB. `data-calc="annsize"`. |
| `filtros` | 45.8 | Filtrar sin perder recall | Filtro antes, después o dentro de la búsqueda; el problema del filtro muy selectivo (solo ítems con stock en tu ciudad). |
| `frescura-indice` | 45.9 | Un índice que cambia | Ítems nuevos cada segundo: índice principal + delta, reconstrucción nocturna, borrados (lápidas). |
| `donde` | 45.10 | Dónde vive el índice | FAISS en el servicio, pgvector, un motor dedicado; shards por ítem y fan-out a todos (retoma [M00 `#percentiles`](modules/m00-metodo.html#percentiles) para la cola). |

### Figuras, widgets, quiz, glosario y fuentes

- Lámina 45.A, ficha two-tower, softmax del lote como rejilla lote × lote con la diagonal positiva, abanico de
  fuentes, curva recall-latencia (dibujo), pisos de HNSW, IVF como celdas de Voronoi con PQ por subvector.
- Widgets `hnsw`, `annsize`. Quiz `m45`, 10. Ejercicio `m45-indice`: dimensionar el índice de videos.
- Términos: `two-tower`, `in-batch-negatives`, `generacion-candidatos`, `ann`, `hnsw`, `ivf`, `pq`
  (revisar si `vector-db` ya define HNSW/IVF en su `short`; los nuevos llevan `deep` a M45 y `vector-db` suma
  `related`).
- Fuentes: Yi et al. (2019), *Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations*,
  RecSys (YouTube); Malkov y Yashunin (2016/2018), HNSW; Jégou, Douze y Schmid (2011), *Product Quantization for
  Nearest Neighbor Search*; documentación de FAISS; Huang et al. (2020), *Embedding-based Retrieval in Facebook
  Search*, KDD.

---

## 8. M46. Ranking: del modelo lineal al multi-tarea

**Ficha.** `m46`, `m46-ranking.html`, 150 min, prereq M45. Lead: "De 1 000 candidatos a los 50 que importan:
qué predice el modelo, cómo se combina y cómo se mide."

**Cumple la promesa** de [M30 `#ranking`](modules/m30-twitter.html#ranking): al publicar, la sección 30.10 enlaza
a 46.6 (multi-tarea) y 46.8 (combinar objetivos).

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `que-predice` | 46.1 | Qué predice un ranker | Probabilidades por acción: p(clic), p(compra), p(ver > 10 s), p(ocultar). Ficha. |
| `logistica` | 46.2 | Regresión logística: el primer ranker | Matemática de por medio: la sigmoide, el peso por feature, log loss con un ejemplo de tres impresiones. Features cruzadas a mano. |
| `arboles` | 46.3 | Árboles y boosting (GBDT) | Un árbol de decisión dibujado; boosting como "cada árbol corrige al anterior". LightGBM. Por qué gana con features tabulares. |
| `ltr` | 46.4 | Aprender a ordenar | Pointwise, pairwise, listwise. LambdaMART. Cuándo importa el orden y no la probabilidad. |
| `profundo` | 46.5 | Modelos profundos | Wide & Deep, DLRM (tablas de embeddings + interacciones), DCN. Tablas de embeddings enormes: 100 000 000 ítems × 64 × 4 B = 25.6 GB solo para el id del ítem. |
| `multitarea` | 46.6 | Multi-tarea | Un modelo, varias cabezas; MMoE; compartir sin que una tarea se coma a la otra. |
| `secuencias` | 46.7 | La historia del usuario como secuencia | Atención sobre los últimos 100 ítems (retoma la atención de [M12](modules/m12-llm-por-dentro.html)); transformers en recomendación. |
| `combinar` | 46.8 | Combinar objetivos en un puntaje | puntaje = Σ wᵢ · pᵢ; quién elige los pesos (producto, no ML); `data-calc="multiobj"` con cinco pesos y el orden resultante. Vínculo con M51. |
| `calibracion` | 46.9 | Calibración | Un 0.1 debe significar 10&#8239;%. Por qué importa al combinar y al cobrar anuncios. Diagrama de fiabilidad; `data-sim="calib"`. Platt e isotónica. |
| `metricas-rank` | 46.10 | Medir un ranking | AUC (con una rejilla de pares), log loss, precisión@k, recall@k, MAP, NDCG con el ejemplo resuelto (8.1). `data-sim="ndcg"`. |
| `cascada` | 46.11 | Liviano y pesado en cascada | Por qué dos rankers; destilación; presupuesto por etapa (retoma la Lámina 42.A). |

### 8.1. NDCG resuelto (verificado)

Relevancias del orden que devolvió el modelo: [0, 3, 2]. Ganancia 2^rel − 1: [0, 7, 3]. Descuento log₂(posición + 1).

- DCG = 0/1 + 7/log₂3 + 3/log₂4 = 0 + 4.417 + 1.5 = 5.917
- Orden ideal [3, 2, 0]: IDCG = 7/1 + 3/log₂3 + 0 = 7 + 1.893 = 8.893
- NDCG@3 = 5.917 / 8.893 = 0.665

### Figuras, quiz, glosario y fuentes

- Lámina 46.A, sigmoide, árbol, boosting como suma de escalones, pointwise/pairwise/listwise lado a lado, DLRM por
  bloques, MMoE con expertos y compuertas, secuencia con atención, diagrama de fiabilidad, rejilla de AUC, NDCG.
- Quiz `m46`, 12. Ejercicio `m46-pesos`: elegir pesos y métricas del ranker del feed con un guardrail.
- Términos: `ranker`, `regresion-logistica`, `log-loss`, `gbdt`, `learning-to-rank`, `lambdamart`, `dlrm`,
  `multi-tarea` (alias "multi-task"), `mmoe`, `calibracion`, `auc`, `ndcg`, `precision-at-k`, `recall-at-k`.
- Fuentes: Burges (2010), *From RankNet to LambdaRank to LambdaMART*; Cheng et al. (2016), *Wide & Deep*; Naumov
  et al. (2019), *DLRM*; Wang et al. (2017/2021), *DCN* y *DCN V2*; Ma et al. (2018), *MMoE*, KDD; Zhou et al.
  (2018), *Deep Interest Network*; Kang y McAuley (2018), *SASRec*; Twitter `the-algorithm` (2023, heavy
  ranker y pesos publicados); Meta (2023), *Instagram ranking explained*.

---

## 9. M47. Re-ranking, exploración y bucles de retroalimentación

**Ficha.** `m47`, `m47-reranking-exploracion.html`, 120 min, prereq M46. Lead: "El mejor orden ítem por ítem
casi nunca es la mejor lista."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `lista` | 47.1 | De ítems a una lista | Diez zapatillas iguales arriba: cada una tiene buen puntaje, la lista es mala. |
| `diversidad` | 47.2 | Diversidad con MMR | Puntaje − λ · similitud con lo ya elegido; `data-sim="mmr"` con λ. DPP como mención a fondo. |
| `reglas` | 47.3 | Reglas de negocio y de política | No más de dos del mismo vendedor, sin repetir lo visto, cupos para lo nuevo, contenido bloqueado. Dónde viven (capa de reglas versionada, no en el modelo). |
| `frescura` | 47.4 | Frescura | Impulso a lo reciente; lo nuevo no tiene historia. |
| `exploracion` | 47.5 | Explorar o explotar | El dilema con una tragamonedas de varios brazos (la analogía es literal). Epsilon-greedy, UCB y Thompson con la distribución Beta (matemática de por medio: Beta(1 + clics, 1 + no clics) dibujada para tres ítems). `data-sim="bandit"`. |
| `contextual` | 47.6 | Bandits contextuales | LinUCB a nivel de concepto; dónde se usan (miniaturas, notificaciones, ítems nuevos). |
| `bucle` | 47.7 | El bucle de retroalimentación | Lo que muestras es lo que aprendes: el popular se hace más popular. `data-sim="feedbackloop"`: 20 ítems de igual calidad, con y sin exploración, en 30 días simulados. |
| `sesgo-posicion` | 47.8 | Corregir el sesgo de posición | Propensión por posición; feature de posición en entrenamiento y constante al servir; aleatorizar un poco para medir. Retoma 43.9. |
| `equidad` | 47.9 | Exposición justa entre vendedores | Lo que pierde un vendedor nuevo; cupos de exposición; equidad para quién. |

### Quiz, glosario y fuentes

- Quiz `m47`, 10. Ejercicio `m47-explorar`: política de exploración para videos nuevos con un presupuesto de
  impresiones.
- Términos: `reranking`, `mmr`, `explorar-explotar`, `bandit`, `thompson-sampling`, `ucb`, `epsilon-greedy`,
  `bandit-contextual`, `bucle-retroalimentacion`, `propension`.
- Fuentes: Carbonell y Goldstein (1998), MMR; Li et al. (2010), *A Contextual-Bandit Approach to Personalized
  News Article Recommendation* (LinUCB, Yahoo!); Chapelle y Li (2011), *An Empirical Evaluation of Thompson
  Sampling*; Netflix TechBlog sobre miniaturas personalizadas (2017); Chaney, Stewart y Engelhardt (2018), *How
  Algorithmic Confounding in Recommendation Systems Increases Homogeneity*.

---

## 10. M48. Grafos y recomendación de amigos

**Ficha.** `m48`, `m48-grafos-amigos.html`, 150 min, prereq M44 y M30. Lead: "Personas que quizás conozcas: un
problema de grafos con mil millones de aristas, privacidad y una explosión en el segundo salto."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `grafo` | 48.1 | Qué es un grafo | Matemática de por medio: nodo, arista, dirigido o no, grado, vecindario, camino, lista de adyacencia contra matriz. Seguir (dirigido) contra amistad (no dirigido). Retoma [M30 `#almacenamiento`](modules/m30-twitter.html#almacenamiento). |
| `pymk` | 48.2 | El problema de PYMK | Predecir aristas que todavía no existen (link prediction). Cierre triádico: los amigos de tus amigos. Métrica: invitaciones aceptadas, no enviadas. |
| `vecinos` | 48.3 | Vecinos comunes, Jaccard y Adamic-Adar | Ejemplo resuelto (10.1). Por qué un amigo en común con 50 amigos vale menos que uno con 3. |
| `explosion` | 48.4 | La explosión del segundo salto | 200 amigos → hasta 40 000 amigos de amigos; un nodo con 5 000 → 25 000 000. Topes, muestreo, precálculo por lotes. Ficha. `data-sim="fof"`. |
| `ppr` | 48.5 | PageRank personalizado y caminatas aleatorias | La caminata que vuelve a casa con probabilidad α; Pixie de Pinterest. `data-sim="ppr"` en un grafo de 15 nodos. |
| `embeddings-grafo` | 48.6 | Embeddings de grafo y GNN | node2vec (caminatas como frases), GraphSAGE y PinSage (agregar vecinos). Cuándo valen lo que cuestan. |
| `otras-senales` | 48.7 | Señales fuera del grafo | Contactos subidos, misma escuela o trabajo, ubicación, grupos; cada una con su riesgo de privacidad (el caso de recomendar a un terapeuta o a un ex). |
| `almacenar` | 48.8 | Dónde guardar un grafo | Neo4j y Cypher (con la consulta de amigos de amigos), contra un grafo en un KV con caché (TAO de Facebook: objetos y asociaciones), contra listas de adyacencia en Redis. Tabla de trade-offs. |
| `particionar` | 48.9 | Partir un grafo | Hash por usuario corta casi todas las aristas; particionado por comunidad; réplicas de nodos calientes. `data-calc="graphshard"`. Retoma [M05 `#sharding`](modules/m05-bases-de-datos.html#sharding). |
| `pipeline-pymk` | 48.10 | El pipeline de PYMK | Candidatos (2 saltos, contactos, PPR) → features (vecinos comunes, AA, interacciones) → ranker → filtros (bloqueos, privacidad, ya rechazado) → cupos por día. Diagrama completo. |
| `danos` | 48.11 | Cuando recomendar amigos hace daño | Revelar relaciones, acosadores, menores con adultos. Reglas que no se negocian. |

### 10.1. Adamic-Adar resuelto (verificado)

Ana y Luis tienen dos amigos en común: Carla (3 amigos) y Diego (50 amigos).

- Vecinos comunes = 2.
- Adamic-Adar = 1/ln 3 + 1/ln 50 = 0.910 + 0.256 = 1.166.

Carla aporta 3.6 veces lo que aporta Diego (0.910 / 0.256): es más raro compartir a alguien con pocos amigos.

### 10.2. La consulta en Cypher

```cypher
// Amigos de amigos de Ana que no son sus amigos, con los amigos en común
MATCH (a:Persona {id: $ana})-[:AMIGO]-(c:Persona)-[:AMIGO]-(x:Persona)
WHERE x <> a AND NOT (a)-[:AMIGO]-(x)
RETURN x.id AS candidato, count(c) AS en_comun,
       sum(1.0 / log(COUNT { (c)-[:AMIGO]-() })) AS adamic_adar
ORDER BY adamic_adar DESC
LIMIT 50
```

La sintaxis se verifica contra la documentación de Cypher de la versión que se fije (el subquery `COUNT { }`
es de Neo4j 5). Va con su explicación línea por línea.

### Figuras, quiz, glosario y fuentes

- Lámina 48.A, grafo dirigido y no dirigido, cierre triádico, la tabla de vecinos con AA, la explosión como
  abanico, la caminata con reinicio, node2vec, señales con su riesgo, Neo4j contra TAO por bloques, cortes de
  partición, el pipeline de PYMK.
- Quiz `m48`, 12. Ejercicio guiado `m48-pymk`: diseñar PYMK de Mercado Barrio (20 000 000 DAU, 200 amigos de
  promedio, celebridades con 1 000 000 de seguidores).
- Términos: `grafo`, `grado-nodo`, `link-prediction`, `cierre-triadico`, `adamic-adar`, `pagerank-personalizado`,
  `caminata-aleatoria`, `node2vec`, `gnn`, `neo4j`, `cypher`, `tao`, `particionado-grafo`.
- Fuentes: Liben-Nowell y Kleinberg (2003/2007), *The Link-Prediction Problem for Social Networks*; Adamic y Adar
  (2003); Gupta et al. (2013), *WTF: The Who to Follow Service at Twitter*; Eksombatchai et al. (2018), *Pixie*;
  Ying et al. (2018), *PinSage*; Grover y Leskovec (2016), *node2vec*; Hamilton et al. (2017), *GraphSAGE*;
  Bronson et al. (2013), *TAO: Facebook's Distributed Data Store for the Social Graph*, USENIX ATC; documentación
  de Neo4j y de su Graph Data Science library; Ugander y Backstrom (2013), *Balanced Label Propagation for
  Partitioning Massive Graphs*.

---

## 11. M49. Evaluar y experimentar

**Ficha.** `m49`, `m49-experimentos.html`, 120 min, prereq M46 y M22. Lead: "La métrica offline subió 3&#8239;%.
¿Lo lanzas?"

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `offline` | 49.1 | Evaluación offline bien hecha | Partición por tiempo (nunca al azar), leave-last-out, cuidado con la fuga. Por qué offline y online no coinciden. |
| `ab-rec` | 49.2 | El A/B de un recomendador | Retoma [M22 `#ab`](modules/m22-operar-modelos.html#ab). Unidad de aleatorización, duración, efecto novedad. |
| `potencia` | 49.3 | Cuántos usuarios hacen falta | Matemática de por medio: varianza, intervalo, potencia. Regla 16 σ² / δ²: CTR de 5&#8239;%, detectar +0.1 punto: 16 × 0.0475 / 0.000001 = 760 000 usuarios por grupo. `data-calc="abpower"`. |
| `cuped` | 49.4 | Reducir la varianza: CUPED | Usar el comportamiento previo del usuario; menos usuarios para la misma potencia. `data-sim="cuped"`. |
| `interleaving` | 49.5 | Interleaving | Mezclar dos rankers en la misma lista; mucho más sensible para comparar órdenes. `data-sim="interleave"`. |
| `red` | 49.6 | Efectos de red | En una red social, tratar a Ana cambia lo que ve Luis. Aleatorizar por grupos (clusters) o por mercado. |
| `contrafactual` | 49.7 | Evaluar sin lanzar: IPS | Con los logs de la política vieja, estimar la nueva pesando por propensión. Varianza y recorte. `data-sim="ips"`. |
| `largo-plazo` | 49.8 | Métricas de largo plazo | Retención a 28 días, holdouts de largo plazo, métricas sustitutas. |
| `trampas` | 49.9 | Trampas comunes | Mirar todos los días y frenar cuando conviene, muchas métricas a la vez, SRM (sample ratio mismatch). |

- Quiz `m49`, 10. Ejercicio guiado `m49-lanzar`: decidir si se lanza un ranker con resultados mixtos.
- Términos: `particion-temporal`, `potencia-estadistica`, `cuped`, `interleaving`, `efecto-novedad`,
  `efecto-red`, `ips`, `srm`, `holdout`. `ab-test` existente suma `related`.
- Fuentes: Kohavi, Tang y Xu (2020), *Trustworthy Online Controlled Experiments*; Deng et al. (2013), *CUPED*;
  Chapelle et al. (2012), *Large-Scale Validation and Analysis of Interleaved Search Evaluation*; Netflix TechBlog
  sobre interleaving (2017); Saito et al. (2020), *Open Bandit Dataset and Pipeline*; Gilotte et al. (2018),
  *Offline A/B testing for Recommender Systems*.

---

## 12. M50. Servir y operar un recomendador

**Ficha.** `m50`, `m50-serving-recomendacion.html`, 150 min, prereq M46 y M49. Lead: "Doscientos milisegundos,
seis servicios y un modelo que se vuelve viejo cada hora."

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `request` | 50.1 | Una request del feed de punta a punta | Diagrama de secuencia con las seis llamadas y sus tiempos. |
| `presupuesto` | 50.2 | El presupuesto de latencia | Recuperación 20 ms, features 15 ms, liviano 15 ms, pesado 60 ms, re-ranking 10 ms, red y margen. `data-calc="recbudget"`. Retoma [M00 `#percentiles`](modules/m00-metodo.html#percentiles). |
| `precalcular` | 50.3 | Precalcular o calcular al pedir | Feed listo en caché (fan-out en escritura) contra armado al leer. Retoma [M30 `#fanout`](modules/m30-twitter.html#fanout). |
| `features-online` | 50.4 | Features en tiempo real | Kafka → stream → feature store online; "lo que viste hace 30 segundos". |
| `flota` | 50.5 | La flota del ranker | 6 950 000 puntuaciones por segundo; CPU contra GPU; batching por request. |
| `entrenamiento` | 50.6 | Entrenar cada día o continuamente | Lote diario, incremental, en línea (Monolith); tablas de embeddings sin colisiones. Retoma [M26](modules/m26-entrenamiento.html). |
| `registro` | 50.7 | Registro de modelos y despliegue | Versión del modelo y de las features juntas; shadow y canary, retoma [M22 `#canary`](modules/m22-operar-modelos.html#canary). |
| `deriva` | 50.8 | Deriva y regresiones silenciosas | Distribución de features, de puntajes, de la calibración. Retoma [M22 `#deriva`](modules/m22-operar-modelos.html#deriva). |
| `degradar` | 50.9 | Degradar con elegancia | Si cae el ranker: populares en caché; si cae el feature store: valores por defecto; si cae todo: el feed de ayer. Retoma [M08](modules/m08-resiliencia.html). |
| `viral` | 50.10 | El ítem viral | Clave caliente en el feature store y en la caché, retoma [M04 `#hot-keys`](modules/m04-cache.html#hot-keys). |
| `costo` | 50.11 | Cuánto cuesta | Factura de referencia con `data-calc="bom" data-preset="m50"` (nuevo preset en `sim-infra.js`). |

- Quiz `m50`, 10. Ejercicio guiado `m50-incidente`: el CTR cae 8&#8239;% un martes; diagnosticar.
- Términos: `presupuesto-latencia`, `feature-online`, `entrenamiento-continuo`, `registro-modelos`,
  `deriva-features`, `degradacion-elegante` (revisar contra `estabilidad-estatica`).
- Fuentes: Liu et al. (2022), *Monolith: Real Time Recommendation System With Collisionless Embedding Table*
  (ByteDance); Uber Michelangelo; documentación de Feast; Pinterest Engineering sobre su serving de ranking.

---

## 13. M51. Algoritmos de engagement: por qué enganchan y cómo diseñarlos con responsabilidad

**Ficha.** `m51`, `m51-engagement.html`, 120 min, prereq M47 y M49. Lead: "Optimizar tiempo visto funciona.
Ese es el problema."

**Encuadre.** El módulo explica los mecanismos con la precisión de cualquier otro módulo, porque quien diseña un
recomendador los produce aunque no quiera: basta con optimizar tiempo visto. Cada mecanismo va con tres cosas
fijas: **cómo funciona**, **qué costo humano tiene (con fuente)** y **qué contramedida de diseño existe**. No es un
manual para enganchar a menores ni para esquivar regulación.

### Secciones

| Id | Núm | Título | Qué enseña |
|---|---|---|---|
| `por-que` | 51.1 | Por qué un recomendador engancha | La métrica es el diseño: si el objetivo es tiempo, el sistema aprende lo que retiene. Retoma Goodhart (42.5) y la combinación de objetivos (46.8). |
| `refuerzo` | 51.2 | El refuerzo variable | Recompensa impredecible (Skinner); el feed como tragamonedas: tirar para actualizar. Figura: programa fijo contra variable. |
| `mecanismos` | 51.3 | Los mecanismos de producto | Scroll infinito (sin punto de parada), autoplay, notificaciones optimizadas por apertura, rachas, contadores sociales, reciprocidad. Tabla mecanismo → qué optimiza → costo → contramedida. |
| `aprende-solo` | 51.4 | Lo que el modelo aprende solo | Sin que nadie lo pida: contenido extremo retiene, el indignado comenta. Bucle con M47.7. `data-sim="engage"`: objetivo con peso en tiempo, en satisfacción declarada y en "no me interesa"; muestra cómo cambia la mezcla del feed simulado. |
| `medir-dano` | 51.5 | Medir el daño | Encuestas en el producto, "tiempo bien usado", arrepentimiento, uso nocturno, sesiones compulsivas. Métricas de protección (retoma 42.5). |
| `alternativas` | 51.6 | Objetivos alternativos | Interacciones significativas, satisfacción declarada como etiqueta, valor a largo plazo, topes de dosis. |
| `control` | 51.7 | Control para el usuario | "No me interesa", reiniciar el feed, feed cronológico, explicar "por qué veo esto", límites de tiempo. |
| `menores` | 51.8 | Menores | Sin personalización por perfil, sin notificaciones de noche, verificación de edad y sus límites. |
| `regulacion` | 51.9 | Lo que exige la ley | DSA de la UE (transparencia de recomendadores, opción sin perfilado para plataformas muy grandes, protección de menores), con cada artículo verificado. |
| `diseno-responsable` | 51.10 | Una checklist de diseño responsable | La lista que se lleva a un design doc. |

- Quiz `m51`, 10. Ejercicio guiado `m51-objetivo`: rediseñar el objetivo del feed de Mercado Barrio sin perder la
  métrica norte.
- Términos: `engagement`, `refuerzo-variable`, `scroll-infinito`, `dark-pattern`, `tiempo-bien-usado`, `dsa`.
- Fuentes por verificar (todas): Skinner y Ferster (1957), *Schedules of Reinforcement*; Eyal (2014), *Hooked*;
  Reglamento (UE) 2022/2065, Digital Services Act, artículos 27, 28 y 38; TikTok Newsroom (2020), *How TikTok
  recommends videos #ForYou*; Meta, *Meaningful Social Interactions* (2018); YouTube Blog sobre "valued
  watchtime" y encuestas de satisfacción; Center for Humane Technology; Kleinberg, Mullainathan y Raghavan (2022),
  *The Challenge of Understanding What Users Want*; Milli et al. (2023) sobre engagement contra preferencias
  declaradas en Twitter.

---

## 14. M52. Caso de estudio: un feed de video corto

**Ficha.** `m52`, `m52-feed-video.html`, 180 min, prereq M42–M51. Lead: "Un video de 15 segundos, mil millones de
veces al día: el For You de punta a punta, con mapa." Formato de caso de estudio (copiar `m30-twitter.html`).

Secciones: `numeros` (qué se construye y los números), `arquitectura` (reconstrucción documentada donde haya
fuente), `api` (endpoints `GET /v1/feed`, `POST /v1/events`), `senales` (vistas completas, repeticiones,
compartidos, "no me interesa"), `nuevo-video` (cómo un video nuevo consigue sus primeras impresiones: tandas de
exploración), `candidatos`, `ranking` (multi-tarea), `tiempo-real` (Monolith), `reranking` (diversidad,
repetición), `integridad` (moderación antes de distribuir), `engagement` (retoma M51 con este producto),
`fallas`, `flota`, `implementalo` (tu clon en AWS con `bom`).

Mapa `m52-feed`: nodos cliente, CDN de video, API del feed, servicio de candidatos, índice vectorial, grafo de
seguidos, feature store, ranker liviano, ranker pesado (GPU), re-ranker, servicio de reglas, Kafka de eventos,
stream de features, data lake, entrenamiento, registro de modelos, moderación, experimentos. Escenarios: pedir el
feed; ver un video entero (evento → feature en tiempo real → el siguiente feed cambia); subir un video nuevo y su
primera tanda; un video viral (clave caliente); cae el ranker pesado (degradación); un modelo nuevo en canary;
"no me interesa". Cada salto usa una arista real.

Quiz `m52`, 18. Ejercicio guiado `m52-nuevo`. Fuentes: TikTok Newsroom 2020; Monolith 2022; Covington 2016;
YouTube Blog *On YouTube's recommendation system* (2021).

---

## 15. M53. Caso de estudio: recomendar productos

**Ficha.** `m53`, `m53-recomendar-productos.html`, 150 min, prereq M42–M50. Lead: "Comprados juntos, más como
esto y tu inicio: tres algoritmos para una tienda, con sus trade-offs."

Secciones: `numeros`, `superficies` (página de producto, carrito, inicio, correo), `comprados-juntos` (ítem a ítem
con co-ocurrencia y su normalización; lift contra conteo; ejemplo resuelto), `similares` (contenido + embeddings
de imagen y texto), `inicio` (two-tower + ranker con p(compra) y margen), `sesion` (recomendación por sesión para
anónimos: secuencias), `stock-precio` (filtros duros: sin stock, fuera de zona; precio como feature y no como
regla), `negocio` (margen, patrocinados y su etiqueta, equidad entre vendedores), `estadistica` (qué modelo según
los datos: tabla con co-ocurrencia, ALS, BPR, two-tower, GBDT; cuántos datos pide cada uno), `evaluar` (ingresos
por sesión, conversión; interleaving), `fallas`, `implementalo`.

**Los algoritmos que se diseñan en detalle** (pedido explícito): (1) "comprados juntos" con co-ocurrencia
normalizada y lift, y (2) "para ti" con ALS implícito + reranking por margen y diversidad. Cada uno con
pseudocódigo, complejidad, memoria, cuándo se recalcula y su trade-off. Son los que implementan las guías ML02 y
ML03 (`PLAN_ML_GUIAS.md`).

Mapa `m53-tienda`. Quiz `m53`, 16. Ejercicio guiado `m53-catalogo`. Fuentes: Linden 2003; Smith y Linden 2017;
Hidasi et al. (2016), *GRU4Rec*; Amazon Personalize (documentación, como referencia de producto gestionado).

---

## 16. Checkpoint F: el recomendador de Mercado Barrio

`cpf`, `checkpoint-f.html`, 120 min. Examen de 20 preguntas de M42–M53 y un diseño completo: el feed de inicio,
"comprados juntos" y PYMK de Mercado Barrio, con métricas, datos, embudo, modelos por etapa, grafo, serving,
experimento, riesgos de engagement y factura. Solución de referencia en `details.solution`.

---

## 17. Cambios en el sitio al publicar cada módulo

1. Fragmento con `<!--META-->` → `python tools/mkpage.py`.
2. Quiz, glosario (bloque `/* ---------- MNN: … ---------- */`), ejercicio guiado.
3. `course.data.js`: `status: 'soon'` → `'ready'`.
4. Widgets nuevos registrados en la tabla de `CLAUDE.md`.
5. Pruebas: `test-page.mjs`, `links.mjs`, `quiz-bias.mjs`, `map-lint.mjs` (M52, M53), capturas en claro, oscuro
   y 390 px.
6. Promesas: M30.10 (`#ranking`) enlaza a M46; las menciones "(M4N)" en texto plano pasan a enlaces.
7. `PROGRESO.md` con el bloque "Siguiente".

## 18. Checklist de la parte

- [ ] Cada concepto de la lista 2.1 tiene su "Matemática de por medio" y su ficha.
- [ ] Cada fórmula: palabras, ejemplo resuelto verificado, una línea de Python.
- [ ] Cada módulo abre con su lámina y cierra cada sección con la miniatura del embudo.
- [ ] Mercado Barrio con los mismos números en todos los módulos.
- [ ] Badges en toda afirmación sobre empresas; fuentes verificadas.
- [ ] M51 con mecanismo, costo y contramedida en cada fila.
- [ ] Cero errores de consola, cero términos faltantes, cero problemas de enlaces, sin desborde a 390 px.
