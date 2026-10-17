# PLAN_ML_GUIAS.md: las guías prácticas de ML System Design (ML00–ML09)

> Plan de las guías de `proyectos/` que acompañan a la Parte VI (`PLAN_ML_SYSTEM_DESIGN.md`). Hoy existen solo como
> `status: 'proposed'` en `SD.data.projects.mlTracks` (`assets/js/data/projects.data.js`) y se ven como
> "Próximamente" en la sección `#ml-system-design` de `proyectos.html`. Ninguna guía está escrita.
>
> **Pedido (2026-10-16):** "Prepara también partes prácticas: diseñar un par de algoritmos para recomendar
> productos, qué modelos estadísticos considerar, trade-offs." Las guías se escriben después de sus módulos.

---

## 0. El prompt completo de la serie

```text
Escribe la guía MLNN de la serie "ML System Design en la práctica", siguiendo PLAN_ML_GUIAS.md, las reglas de
"De los tutoriales de AI Engineering" de CLAUDE.md (que esta serie hereda, salvo lo que cambia la sección 1) y
la guía publicada más parecida como plantilla (proyectos/ia02-analista.html para la forma; el módulo de la
Parte VI que la guía construye para el contenido).

Quién lee: nivel Jr en ML. Sabe Python lo que enseña ML00. No sabe numpy, pandas, scipy, PyTorch, LightGBM,
Neo4j ni estadística. Cada pieza nueva lleva su "Python de por medio" o "Matemática de por medio".

Reglas: todos los archivos completos; Claude escribe y no ejecuta; nunca se inventan métricas ni salidas: la
guía dice qué comando correr y qué forma tiene la salida, y deja una tabla vacía para que el lector anote sus
números; los datasets son públicos y los descarga el lector con un script; cada guía construye algo que se
mide contra una línea base (popularidad) con una partición por tiempo.
```

---

## 1. Lo que cambia respecto de las guías de IA

- **Sin LLM obligatorio.** No hay "dos modelos a la par" de Claude y Ollama. El "a la par" de esta serie es
  **modelo contra línea base**: cada guía compara su algoritmo con la popularidad (ML01) en las mismas métricas.
  Un LLM aparece solo donde suma (ML04: embeddings de texto con un modelo local por Ollama, opcional).
- **El sistema que se rompe** es el propio recomendador bajo carga y con datos que cambian: cada guía trae un
  script que provoca fallas (feature store caído, ítem viral, datos con fuga, índice viejo).
- **Las pruebas sin modelo** se mantienen: pytest con matrices de juguete calculadas a mano (las de los módulos,
  como la de 4 × 4 de M44), sin descargar nada.
- **Los evals** son métricas offline (recall@k, NDCG@k, cobertura, novedad) con intervalo por bootstrap, y un
  simulador de A/B para lo online. La guía pide repetir con varias semillas, como el pass^k de la serie IA.
- **Mismo orden de secciones** que las guías de IA (`#excusa`, `#antes`, endpoints, dependencias,
  infraestructura, paso a paso, `#viaje`, decisiones guiadas, cómo comprobar, `#limitaciones`, tu repositorio,
  cómo conectar), con la figura `[data-arch]`, `file-card`, `code-key` y `details.file-full`.
- **Mejoras de legibilidad de serie** (las mismas que se proponen para IA00–IA02): cada guía en tres hitos con
  "qué ya funciona" al final de cada uno; un "mapa del paso" arriba de cada paso; bloques de código de hasta 25
  líneas; una analogía por concepto; el viaje de un dato adelantado como vista previa después de la excusa.

## 2. Stack de la serie (versiones por verificar y fijar con `==` antes de escribir)

| Pieza | Para qué |
|---|---|
| Python 3.13 y uv | El lenguaje y el proyecto |
| numpy, pandas (o polars), scipy | Matrices, tablas y matrices dispersas (CSR) |
| DuckDB | Consultas SQL sobre Parquet sin servidor (los eventos) |
| implicit | ALS y BPR para feedback implícito (verificar soporte de Python 3.13; si no, fijar 3.12 en esa guía y decirlo) |
| PyTorch (CPU) | Two-tower y el ranker profundo chico |
| faiss-cpu y PostgreSQL + pgvector | Búsqueda de vecinos aproximados, comparadas |
| LightGBM | GBDT y LambdaMART |
| Neo4j Community + Graph Data Science | El grafo de amigos y Cypher |
| Redis | Feature store online y caché de candidatos |
| Redpanda o Kafka | Eventos en tiempo real (ML09) |
| FastAPI | La API de recomendaciones |
| pytest, hypothesis | Pruebas sin red |
| Locust o k6 | Carga contra el presupuesto de latencia |

## 3. Datasets (licencias por verificar; el lector los descarga, el repositorio no los redistribuye)

| Dataset | Qué trae | Guías |
|---|---|---|
| MovieLens (GroupLens): `ml-latest-small` para empezar, la versión grande vigente para escala | Calificaciones con timestamp, géneros, tags | ML01, ML03, ML04, ML05 |
| Online Retail II (UCI) | Facturas de una tienda real con productos por compra | ML02 |
| RetailRocket (Kaggle) | Eventos de e-commerce: vista, carrito, compra | ML05, ML09 |
| SNAP ego-Facebook y un grafo sintético generado con un modelo de mundo pequeño | Grafo social anonimizado | ML06 |
| Open Bandit Dataset (ZOZOTOWN) | Logs con propensión registrada | ML07, ML08 |
| Amazon Reviews 2023 (McAuley Lab), una categoría | Texto, metadatos e imágenes de productos | ML04 |

## 4. Mapa de la serie

| Id | Título | Horas | Módulos | Tier |
|---|---|---|---|---|
| ML00 | El laboratorio de recomendación | 3–4 | M42, M43 | core |
| ML01 | La línea base: lo popular, bien medido | 4–5 | M42, M44, M49 | core |
| ML02 | "Comprados juntos" con filtrado colaborativo | 6–8 | M44, M53 | core |
| ML03 | "Para ti" con factorización implícita (ALS y BPR) | 6–8 | M44, M53 | core |
| ML04 | Recuperación con two-tower y búsqueda vectorial | 8–10 | M45 | core |
| ML05 | Un ranker con LightGBM y features sin fugas | 8–10 | M43, M46 | core |
| ML06 | Personas que quizás conozcas, con Neo4j | 8–10 | M48 | core |
| ML07 | Explorar con bandits | 5–6 | M47 | core |
| ML08 | Un A/B y una evaluación contrafactual | 5–6 | M49 | extra |
| ML09 | Un feed de punta a punta en 200 ms | 10–12 | M50, M52 | extra |

---

## 5. Las guías

### ML00. El laboratorio de recomendación

- **Excusa:** antes del primer algoritmo, el lugar donde vas a medir todos.
- **Construye:** proyecto uv, script que descarga MovieLens pequeño con su checksum, conversión a Parquet,
  DuckDB para mirarlo, la matriz usuario-ítem en CSR (con la figura de los tres arreglos de M43), la partición por
  tiempo (último 10&#8239;% de cada usuario como prueba), y el módulo `metricas.py` (recall@k, NDCG@k, cobertura)
  probado con los ejemplos resueltos de los módulos (el NDCG 0.665 de M46 como test).
- **Antes de empezar:** terminal, uv, qué es un DataFrame, una matriz y una matriz dispersa, qué es una métrica
  offline, partición por tiempo contra al azar (con la figura de la fuga).
- **Decisiones guiadas:** 8, sobre la partición, la unidad de evaluación y qué cuenta como positivo.

### ML01. La línea base: lo popular, bien medido

- **Excusa:** si tu modelo no le gana a esto, no lo lances.
- **Construye:** popularidad global, por género, con decaimiento (vida media configurable) y bayesiana
  (con el prior de M44.1); la API `GET /v1/recs/popular?genero=&k=` con FastAPI y caché en Redis; un informe que
  compara las cuatro con recall@10, NDCG@10 y cobertura, con intervalo por bootstrap.
- **Fallas provocadas:** la fuga (calcular popularidad con todo el período) y cómo infla la métrica.

### ML02. "Comprados juntos" con filtrado colaborativo

- **Excusa:** la página de producto de una tienda real.
- **Algoritmo 1 (pedido explícito):** co-ocurrencia ítem a ítem sobre Online Retail II: matriz de co-compra
  `Cᵀ C` con scipy, normalización por coseno, Jaccard y lift (con la cuenta de la tabla 2 × 2), poda de pares
  raros (soporte mínimo), top-k por ítem precalculado a Parquet y cargado a Redis; la API
  `GET /v1/items/{id}/comprados-juntos`.
- **Trade-offs que mide el lector:** coseno contra lift (popularidad contra sorpresa), soporte mínimo contra
  cobertura, memoria del top-k (ítems × k × bytes, con la cuenta), cada cuánto recalcular.
- **Pruebas sin datos:** la matriz 4 × 4 de M44 con sus similitudes 0.667, 0.577, 0.408 y 0.816 como test.

### ML03. "Para ti" con factorización implícita (ALS y BPR)

- **Excusa:** el inicio personalizado de la misma tienda (o MovieLens con calificaciones como implícitas).
- **Algoritmo 2 (pedido explícito):** ALS implícito con confianza `1 + α · conteo` y BPR, con `implicit`; búsqueda
  de k, α y regularización con la partición por tiempo; "explicar" una recomendación con los ítems que más
  aportan; reranking final por diversidad (MMR de M47) y, en la tienda, por margen con un peso configurable.
- **Qué modelo estadístico considerar:** tabla final que el lector completa con sus números: popularidad,
  co-ocurrencia, ALS, BPR; métricas, tiempo de entrenamiento, memoria, arranque en frío.
- **Fallas provocadas:** usuario nuevo (sin fila en U), ítem nuevo, sobreajuste con k grande.

### ML04. Recuperación con two-tower y búsqueda vectorial

- **Construye:** two-tower en PyTorch (torre de usuario con su historia, torre de ítem con id, categoría y
  embedding de texto), negativos dentro del lote con corrección por frecuencia; exportar los vectores de ítems;
  índice FAISS HNSW e IVF-PQ y pgvector HNSW; comparar recall@100 contra búsqueda exacta y latencia p99; filtros
  por stock.
- **Fallas provocadas:** índice viejo (ítems nuevos invisibles), filtro muy selectivo.

### ML05. Un ranker con LightGBM y features sin fugas

- **Construye:** con RetailRocket, features de usuario, ítem y pareja con point-in-time join en DuckDB;
  candidatos de ML02/ML03 reconstruidos dentro de la guía (cada guía funciona sola); LightGBM binario y
  LambdaMART; calibración isotónica; NDCG@10 contra la línea base; importancia de features.
- **Fallas provocadas:** una feature con fuga que hace que la métrica offline suba de forma sospechosa; el
  training-serving skew con la zona horaria.

### ML06. Personas que quizás conozcas, con Neo4j

- **Construye:** Neo4j en Compose con el grafo de ego-Facebook y uno sintético más grande; Cypher para amigos de
  amigos con vecinos comunes y Adamic-Adar (la consulta en Cypher de M48, sección 48.8); PageRank personalizado y Node Similarity con
  GDS; tope del segundo salto para los nodos con mucho grado; evaluación ocultando 10&#8239;% de las aristas
  (link prediction) y comparando métodos; la misma consulta sin grafo (listas de adyacencia en Redis) para medir
  el trade-off.
- **Reglas de privacidad en código:** bloqueos, ya rechazados y cupos por día como filtros con pruebas.

### ML07. Explorar con bandits

- **Construye:** simulador de clics con CTR verdadero oculto; epsilon-greedy, UCB1 y Thompson con Beta; regret
  acumulado con varias semillas; bandit contextual simple; reproducir el bucle de retroalimentación de M47.7 con y
  sin exploración.

### ML08. Un A/B y una evaluación contrafactual

- **Construye:** calculadora de potencia (la regla 16 σ² / δ² y la exacta), simulador de A/B con efecto
  novedad y SRM, CUPED, y evaluación IPS y SNIPS sobre Open Bandit Dataset con su propensión registrada.

### ML09. Un feed de punta a punta en 200 ms

- **Construye:** eventos en Redpanda → consumidor que actualiza features en Redis → API del feed que llama a
  candidatos (popular, ítem a ítem, vectorial), filtros, ranker LightGBM y re-ranking; presupuesto de latencia con
  timeouts por etapa y degradación (si el ranker no responde, populares); traces con OpenTelemetry; carga con k6
  contra el p99.
- **Fallas provocadas:** Redis caído, ranker lento, ítem viral (clave caliente), modelo nuevo en canary.

---

## 6. Datos del sitio

- `SD.data.projects.mlTracks` (misma forma que `aiTracks`), dibujada por `projects.js` en `[data-ml-tracks]`.
- `project-state.js` marca estos proyectos con `series: 'ml'`; `project-guide.js` arma la ruta lateral y el
  anterior/siguiente dentro de la serie.
- Decisiones guiadas en `assets/js/data/projects/mlNN.data.js` con `SD.defineExercise('mlNN-…')`.
- Al publicar una guía: `status: 'ready'`, `href`, `repoName`, y la tabla de versiones de la sección
  `#ml-system-design` de `proyectos.html` con su fecha.
