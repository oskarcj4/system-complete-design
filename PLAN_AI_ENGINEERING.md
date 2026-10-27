# Parte VIII: AI Engineering, modelos, harnesses y agentes

Plan de la Parte VIII (M62–M72 y el Checkpoint H) y de dos guías prácticas nuevas de la serie IA. Pedido del usuario (2026-10-26): "Añade todo esto, pero mejor, en una nueva sección de IA engineering, todos los conceptos a nivel pro de IA, nada de vibecoding, sino verdadera IA engineering", sobre un texto pegado que explicaba modelo, servidor de inferencia, harness e interfaz, Claude Code contra Codex, OpenCode y Cursor, extensiones (MCP, skills, hooks), orquestadores como DeepSec, permisos, modelos locales y un harness propio. Después sumó: "investigaciones sobre jailbreak, conceptualmente, como seguridad en IA engineering, cómo elegir el mejor harness, y profundiza en las aplicaciones agénticas u orquestadores, pero de verdad para entender cómo funcionan".

## Por qué una parte aparte

La Parte II explica cómo se sirve un LLM a millones de personas (del lado del proveedor). M25 explica qué es un agente y cómo se opera uno en producción. Lo que falta es el lado de quien **construye con** modelos y agentes: qué pieza hace qué en la pila, cómo funciona un harness por dentro, cómo se elige y se configura, cómo se le da autonomía sin riesgo, cómo se orquestan muchos agentes y cómo se ataca y defiende un modelo. Esta parte no repite M25: lo retoma con enlaces (`#bucle`, `#herramientas`, `#mcp`, `#sandbox`, `#injection`, `#contexto`, `#observabilidad-evals`) y lo extiende.

## Regla de seguridad de la parte

Los módulos de jailbreak y de autonomía son de ingeniería defensiva. Se explican las familias de ataque, por qué funcionan y cómo se defienden y se miden, con las fuentes publicadas. No se publican prompts de jailbreak que funcionen ni recetas para saltarse las salvaguardas de un proveedor. "Menos restricción" en esta parte significa menos preguntas del harness dentro de una caja aislada, nunca quitar las capas del modelo o del proveedor.

## Módulos

| Módulo | Título | Contenido | Estado |
|---|---|---|---|
| M62 | **La pila de un agente** | Pesos, servidor de inferencia, harness e interfaz; los dos dialectos de API (OpenAI y Anthropic) y los traductores; el bucle mensaje por mensaje; un harness de 40 líneas; los harnesses comparados; extensiones contra orquestadores (DeepSec como primer ejemplo); las cuatro capas de control; modelos locales | Publicado |
| M63 | **Tool calling por dentro** | Chat templates y tokens especiales, cómo se describe una herramienta (JSON Schema), qué emite el modelo, decodificación restringida, `tool_choice`, llamadas en paralelo, `stop_reason`, streaming de argumentos, por qué unos modelos son mejores agentes (entrenamiento con trayectorias), traducir entre dialectos sin perder nada | Propuesto |
| M64 | **Anatomía de un harness** | El system prompt por capas, el diseño de las herramientas de un agente de código (leer con números de línea, editar por reemplazo exacto o por diff, grep y glob contra RAG, bash con timeout), la lista de tareas, la gestión del contexto (recortar resultados, compactar, prompt caching), los archivos de memoria (`CLAUDE.md`, `AGENTS.md`), los subagentes; Claude Code, Codex CLI, OpenCode, Aider y Cursor leídos como decisiones de diseño | Propuesto |
| M65 | **Elegir un harness** | Criterios (modelos y dialectos, permisos y sandbox, extensibilidad, modo headless y SDK, gestión del contexto, privacidad y telemetría, licencia, costo), la matriz harness por modelo, cómo se evalúa con un set de tareas propio y pass^k, el árbol de decisión por caso (equipo, CI, datos sensibles, modelos locales, presupuesto) | Propuesto |
| M66 | **Permisos, sandbox y autonomía** | Las cuatro capas (pesos, proveedor, harness, sistema operativo); reglas allow, ask y deny y su orden; modos de permiso; Seatbelt, bubblewrap y Landlock; devcontainers y microVMs; egress con lista de dominios; credenciales fuera de la caja; autonomía total dentro de una caja desechable; hooks como política determinista | Propuesto |
| M67 | **Extender un harness** | MCP a fondo (stdio y HTTP, tools, resources y prompts, autorización), skills (carga progresiva), hooks (eventos, entrada y salida, bloquear), subagentes, plugins; cuándo conviene cada uno y cómo se combinan | Propuesto |
| M68 | **Context engineering y memoria** | Qué entra en la ventana y en qué orden, presupuesto de tokens por capa, búsqueda agéntica contra RAG, memoria entre sesiones, compactación y lo que se pierde, caché de prefijo y por qué el orden del prompt cambia la factura | Propuesto |
| M69 | **Orquestadores: agentes que lanzan agentes** | Modo headless (`claude -p`, `--output-format stream-json`, `codex exec`), el Agent SDK, el patrón candidatos, fan-out, revalidación y exportación; la cola de trabajo, el estado en disco y la reanudación; presupuesto por tarea y por corrida; aislamiento por tarea (contenedor o microVM) con la credencial fuera; deduplicar hallazgos; bots de CI y de code review; DeepSec a fondo como caso, con mapa explorable | Publicado |
| M70 | **Modelos open weights y serving propio** | Ollama, llama.cpp, vLLM y LM Studio; GGUF y cuantización (retoma M14); MoE (Kimi K2, DeepSeek, Qwen) y qué memoria pide de verdad; cuánta VRAM hace falta, con la cuenta; gateways (LiteLLM, OpenRouter) y routing por costo; cuándo conviene local | Propuesto |
| M71 | **Jailbreak, injection y red teaming** | Diferencia entre jailbreak (el usuario contra las reglas del modelo) y prompt injection (un tercero contra el usuario); familias documentadas (rol y persona, many-shot, crescendo en varios turnos, sufijos adversarios tipo GCG, codificación e idiomas con pocos datos); por qué funcionan; defensas por capas (entrenamiento, clasificadores de entrada y salida como Constitutional Classifiers o Llama Guard, spotlighting, diseño del sistema con la regla de dos); cómo se mide (tasa de éxito de ataque, falsos rechazos, conjuntos públicos como HarmBench); red teaming como proceso. Sin prompts que funcionen | Propuesto |
| M72 | **Evals de agentes** | Por qué un agente se evalúa por trayectoria y no por respuesta; SWE-bench Verified y Terminal-Bench; pass@k contra pass^k (retoma `ia-pass-k`); separar el efecto del harness del efecto del modelo; el set propio de tareas; LLM como juez de trayectorias (retoma M22) | Propuesto |
| CP-H | **Checkpoint H: la plataforma de agentes de un equipo** | Examen de la Parte VIII y diseño: qué harness, qué modelos, qué permisos y sandbox, qué extensiones, un orquestador para revisar PRs, evals y presupuesto | Propuesto |

## Guías prácticas nuevas (serie IA)

| Guía | Título | Contenido | Estado |
|---|---|---|---|
| IA07 | **Tu propio harness** | El harness de M62 crece paso a paso: herramientas `read_file` y `edit_file` por reemplazo exacto, permisos allow, ask y deny, recorte de resultados, compactación, los dos dialectos, todo dentro de un contenedor; probado con un modelo falso y medido con Claude y con un modelo de Ollama | Propuesto |
| IA08 | **Un mini-DeepSec** | Un orquestador: candidatos con regex, una cola en SQLite, un harness headless por candidato dentro de Docker, presupuesto, reanudación, revalidación y exportación a Markdown, sobre una víctima con vulnerabilidades sembradas | Propuesto |

## Fuentes verificadas (2026-10-26)

- DeepSec de Vercel: Apache 2.0; etapas `init`, `scan` (sin IA, matchers), `process` (agente), `revalidate`, `triage`, `report` y `export`; `--agent codex|claude`; `--max-cost-usd`, `--max-duration`, `--limit`; `sandbox process` reparte en microVMs de Vercel Sandbox y la credencial queda en el host. Fuente: flaviocopes.com/deepsec y devops.com. El build de CERIT-SC (e-INFRA CZ) exige `--model` (si se omite usa `claude-opus-4.7`, que su API no sirve) y sirve `kimi-k2.6`, `deepseek-v4-pro-thinking` y `qwen3.5`.
- Moonshot expone un endpoint con el dialecto de Anthropic en `https://api.moonshot.ai/anthropic`. El id del modelo varía entre guías (`kimi-k3`, `kimi-k3[1m]`): se verifica en la consola.
- Claude Code: orden de credenciales (proveedor de nube, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, `apiKeyHelper`, `CLAUDE_CODE_OAUTH_TOKEN`, perfiles, `/login`). Ojo: `ANTHROPIC_AUTH_TOKEN` gana sobre `ANTHROPIC_API_KEY`, al revés de lo que decía el texto pegado; el `unset` igual se recomienda. Reglas de permiso en orden deny, ask, allow; modos `default`, `acceptEdits`, `plan`, `auto`, `dontAsk` y `bypassPermissions`; las reglas las impone el harness, no el modelo.
- Codex CLI: `sandbox_mode` `read-only`, `workspace-write` o `danger-full-access`; `approval_policy` `on-request` o `never`; Seatbelt en macOS, bubblewrap en Linux, sandbox nativo en Windows.
- OpenCode: bloque `permission` con `allow`, `ask` o `deny` por herramienta y patrones de bash; es política, no sandbox.
- Ollama 0.14.0 o posterior habla el dialecto de Anthropic en `http://localhost:11434`, y el de OpenAI en `/v1`; llama.cpp (`llama-server`) también expone Messages.

## Pendiente de verificar para los módulos siguientes

M63: formatos de tool call en las chat templates de Qwen, Llama y Kimi; `tool_choice` en los dos dialectos. M66: documentación de sandboxing de Claude Code. M70: parámetros totales y activos de Kimi K2 y K3 en sus model cards. M71: many-shot jailbreaking (Anthropic, 2024), Crescendo (Microsoft, 2024), GCG (Zou y otros, 2023), Constitutional Classifiers (Anthropic, 2025), HarmBench. M72: SWE-bench Verified, Terminal-Bench.
